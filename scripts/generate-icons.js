import fs from 'fs';
import path from 'path';
import zlib from 'zlib';

const publicDir = path.resolve(process.cwd(), 'public');
if (!fs.existsSync(publicDir)) {
  fs.mkdirSync(publicDir, { recursive: true });
}

// 1. Write public/icon.svg
const svgContent = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">
  <defs>
    <linearGradient id="bgGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#2563EB" />
      <stop offset="50%" stop-color="#1D4ED8" />
      <stop offset="100%" stop-color="#1E40AF" />
    </linearGradient>
    <filter id="shadow" x="-10%" y="-10%" width="120%" height="120%">
      <feDropShadow dx="0" dy="12" stdDeviation="16" flood-color="#0F172A" flood-opacity="0.35" />
    </filter>
  </defs>
  <!-- Background with smooth squircle -->
  <rect width="512" height="512" rx="112" fill="url(#bgGrad)" />
  
  <!-- Outer subtle glowing border -->
  <rect x="6" y="6" width="500" height="500" rx="106" fill="none" stroke="#FFFFFF" stroke-width="6" stroke-opacity="0.2" />

  <!-- Central Symbol Group with shadow -->
  <g filter="url(#shadow)">
    <!-- Left open book page -->
    <path d="M256 360 C190 328 120 328 72 350 V130 C120 110 190 110 256 138 Z" fill="#FFFFFF" fill-opacity="0.95" />
    <!-- Right open book page -->
    <path d="M256 360 C322 328 392 328 440 350 V130 C392 110 322 110 256 138 Z" fill="#FFFFFF" />
    
    <!-- Central Book Spine -->
    <line x1="256" y1="120" x2="256" y2="370" stroke="#1D4ED8" stroke-width="18" stroke-linecap="round" />
    
    <!-- Reading Ruler Optical Focus Guideline (Dyslexia signature feature) -->
    <rect x="56" y="218" width="400" height="52" rx="26" fill="#F59E0B" fill-opacity="0.96" />
    <!-- Focus optical slit line -->
    <line x1="90" y1="244" x2="422" y2="244" stroke="#FFFFFF" stroke-width="8" stroke-linecap="round" />
  </g>

  <!-- Typography Monogram "ABG" at bottom -->
  <text x="256" y="442" text-anchor="middle" font-family="system-ui, -apple-system, sans-serif" font-weight="900" font-size="44" fill="#FFFFFF" letter-spacing="4">ABG</text>
</svg>`;

fs.writeFileSync(path.join(publicDir, 'icon.svg'), svgContent, 'utf-8');
console.log('Created public/icon.svg');

// Simple PNG encoder using Node's zlib & CRC32 table
function createCRC32Table() {
  let c;
  const table = [];
  for (let n = 0; n < 256; n++) {
    c = n;
    for (let k = 0; k < 8; k++) {
      c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    }
    table[n] = c;
  }
  return table;
}

const crcTable = createCRC32Table();

function crc32(buf) {
  let crc = 0 ^ -1;
  for (let i = 0; i < buf.length; i++) {
    crc = (crc >>> 8) ^ crcTable[(crc ^ buf[i]) & 0xff];
  }
  return (crc ^ -1) >>> 0;
}

function makeChunk(type, data) {
  const len = data.length;
  const buf = Buffer.alloc(4 + 4 + len + 4);
  buf.writeUInt32BE(len, 0);
  buf.write(type, 4, 4, 'ascii');
  data.copy(buf, 8);
  const typeAndData = buf.subarray(4, 8 + len);
  const crc = crc32(typeAndData);
  buf.writeUInt32BE(crc, 8 + len);
  return buf;
}

function generatePngBuffer(width, height, drawFn) {
  // 8-byte PNG signature
  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  // IHDR chunk: 13 bytes
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // 8 bits per channel
  ihdr[9] = 6; // Color type 6: RGBA
  ihdr[10] = 0; // compression
  ihdr[11] = 0; // filter
  ihdr[12] = 0; // interlace

  // Raw image data with 1 filter byte (0) per row
  const rowSize = 1 + width * 4;
  const rawData = Buffer.alloc(rowSize * height);

  for (let y = 0; y < height; y++) {
    const rowOffset = y * rowSize;
    rawData[rowOffset] = 0; // filter 0 (None)
    for (let x = 0; x < width; x++) {
      const pixelOffset = rowOffset + 1 + x * 4;
      const [r, g, b, a] = drawFn(x, y, width, height);
      rawData[pixelOffset] = r;
      rawData[pixelOffset + 1] = g;
      rawData[pixelOffset + 2] = b;
      rawData[pixelOffset + 3] = a;
    }
  }

  const compressedData = zlib.deflateSync(rawData, { level: 9 });
  const idatChunk = makeChunk('IDAT', compressedData);
  const ihdrChunk = makeChunk('IHDR', ihdr);
  const iendChunk = makeChunk('IEND', Buffer.alloc(0));

  return Buffer.concat([sig, ihdrChunk, idatChunk, iendChunk]);
}

// Drawing function for standard PWA icons (with nice rounded corner or square for maskable)
function renderIconPixel(x, y, width, height, isMaskable = false) {
  // Normalize coordinates to 0..1
  const nx = x / width;
  const ny = y / height;

  // Background gradient: from (0,0) #2563EB to (1,1) #1E40AF
  const gradT = (nx + ny) / 2;
  const rBg = Math.round(37 * (1 - gradT) + 30 * gradT);
  const gBg = Math.round(99 * (1 - gradT) + 64 * gradT);
  const bBg = Math.round(235 * (1 - gradT) + 175 * gradT);

  // If not maskable, give nice rounded corners (radius ~ 22%)
  if (!isMaskable) {
    const cornerR = 0.22;
    let distCorner = 0;
    const cx = nx < cornerR ? cornerR : nx > 1 - cornerR ? 1 - cornerR : nx;
    const cy = ny < cornerR ? cornerR : ny > 1 - cornerR ? 1 - cornerR : ny;
    const dx = nx - cx;
    const dy = ny - cy;
    distCorner = Math.sqrt(dx * dx + dy * dy);
    if (distCorner > cornerR) {
      return [0, 0, 0, 0]; // Transparent outside squircle
    }
  }

  // Book & Ruler icon geometry
  // For maskable, safe zone is central 70%, so scale down slightly
  const scale = isMaskable ? 0.72 : 0.82;
  // Centered normalized coordinates (-0.5 to 0.5)
  const px = (nx - 0.5) / scale;
  const py = (ny - 0.5) / scale;

  // Reading ruler strip (Golden amber): horizontal bar at py between -0.05 and 0.08
  if (py >= -0.05 && py <= 0.08 && Math.abs(px) <= 0.42) {
    // Focus slit line in center of ruler
    if (Math.abs(py - 0.015) <= 0.012 && Math.abs(px) <= 0.36) {
      return [255, 255, 255, 255]; // Pure white focus line
    }
    return [245, 158, 11, 255]; // Amber #F59E0B
  }

  // Book pages
  // Book spine at px = 0
  if (Math.abs(px) < 0.02 && py >= -0.32 && py <= 0.26) {
    return [29, 78, 216, 255]; // Dark blue spine line
  }

  // Left page: px in [-0.38, -0.01], py in [-0.28, 0.24]
  if (px >= -0.38 && px <= -0.01 && py >= -0.28 && py <= 0.24) {
    // Page curve simulation
    const curveTop = -0.28 + 0.05 * Math.sin((px + 0.38) * 8);
    const curveBottom = 0.20 + 0.04 * Math.sin((px + 0.38) * 8);
    if (py >= curveTop && py <= curveBottom) {
      return [248, 250, 252, 250]; // Crisp white left page
    }
  }

  // Right page: px in [0.01, 0.38], py in [-0.28, 0.24]
  if (px >= 0.01 && px <= 0.38 && py >= -0.28 && py <= 0.24) {
    const curveTop = -0.28 + 0.05 * Math.sin((px - 0.01) * 8);
    const curveBottom = 0.20 + 0.04 * Math.sin((px - 0.01) * 8);
    if (py >= curveTop && py <= curveBottom) {
      return [255, 255, 255, 255]; // Crisp white right page
    }
  }

  // Bottom "ABG" indicator bar (stylized)
  if (py >= 0.30 && py <= 0.36 && Math.abs(px) <= 0.25) {
    return [255, 255, 255, 230];
  }

  // Default to background
  return [rBg, gBg, bBg, 255];
}

console.log('Generating PNG icons...');

// 2. pwa-192x192.png
const pwa192 = generatePngBuffer(192, 192, (x, y, w, h) => renderIconPixel(x, y, w, h, false));
fs.writeFileSync(path.join(publicDir, 'pwa-192x192.png'), pwa192);
console.log('Created public/pwa-192x192.png (192x192)');

// 3. pwa-512x512.png
const pwa512 = generatePngBuffer(512, 512, (x, y, w, h) => renderIconPixel(x, y, w, h, false));
fs.writeFileSync(path.join(publicDir, 'pwa-512x512.png'), pwa512);
console.log('Created public/pwa-512x512.png (512x512)');

// 4. pwa-maskable-512x512.png (full bleed square background with 15% safe zone)
const pwaMaskable = generatePngBuffer(512, 512, (x, y, w, h) => renderIconPixel(x, y, w, h, true));
fs.writeFileSync(path.join(publicDir, 'pwa-maskable-512x512.png'), pwaMaskable);
console.log('Created public/pwa-maskable-512x512.png (512x512 maskable)');

// 5. apple-touch-icon.png (180x180 for iOS Safari home screen)
const appleIcon = generatePngBuffer(180, 180, (x, y, w, h) => renderIconPixel(x, y, w, h, true));
fs.writeFileSync(path.join(publicDir, 'apple-touch-icon.png'), appleIcon);
console.log('Created public/apple-touch-icon.png (180x180)');

console.log('All PWA icon assets generated successfully.');
