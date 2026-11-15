import { jsPDF } from 'jspdf';
import { DyslexiaSettings, FontFamily } from '../types';

interface ExportPdfOptions {
  text: string;
  title: string;
  settings: DyslexiaSettings;
}

// Map app FontFamily names to actual CSS font-family stack for Canvas rendering
function resolveCanvasFontFamily(fontFamily: FontFamily): string {
  switch (fontFamily) {
    case 'OpenDyslexic':
      return "'OpenDyslexic', 'Comic Neue', 'Atkinson Hyperlegible', sans-serif";
    case 'Lexend':
      return "'Lexend', 'Atkinson Hyperlegible', sans-serif";
    case 'Atkinson Hyperlegible':
      return "'Atkinson Hyperlegible', sans-serif";
    case 'Comic Neue':
      return "'Comic Neue', 'Comic Sans MS', sans-serif";
    default:
      return "'Plus Jakarta Sans', system-ui, sans-serif";
  }
}

function getBionicSplitIndex(word: string): number {
  const lettersOnly = word.replace(/[^a-zA-Z0-9]/g, '');
  const len = lettersOnly.length;
  if (len <= 1) return word.length;
  if (len <= 3) return 1;
  return Math.ceil(len * 0.45);
}

// Measure string width with explicit letter spacing so all browsers behave identically
function measureSpacedText(
  ctx: CanvasRenderingContext2D,
  str: string,
  letterSpacingPx: number
): number {
  if (!str) return 0;
  if (letterSpacingPx <= 0.01) {
    return ctx.measureText(str).width;
  }
  let width = 0;
  for (let i = 0; i < str.length; i++) {
    width += ctx.measureText(str[i]).width;
    if (i < str.length - 1) width += letterSpacingPx;
  }
  return width;
}

// Draw string with explicit letter spacing
function drawSpacedText(
  ctx: CanvasRenderingContext2D,
  str: string,
  startX: number,
  y: number,
  letterSpacingPx: number
): number {
  if (!str) return startX;
  if (letterSpacingPx <= 0.01) {
    ctx.fillText(str, startX, y);
    return startX + ctx.measureText(str).width;
  }
  let cursorX = startX;
  for (let i = 0; i < str.length; i++) {
    const ch = str[i];
    ctx.fillText(ch, cursorX, y);
    cursorX += ctx.measureText(ch).width + letterSpacingPx;
  }
  return cursorX;
}

interface PositionedLine {
  words: string[];
  width: number;
  isParagraphEnd: boolean;
}

export async function exportDyslexiaPdf({
  text,
  title,
  settings,
}: ExportPdfOptions): Promise<void> {
  const cleanText = text.trim();
  if (!cleanText) {
    throw new Error('Cannot export an empty document.');
  }

  // Ensure selected web fonts (regular + bold) are loaded into document.fonts before Canvas draws
  if (typeof document !== 'undefined' && 'fonts' in document) {
    try {
      const targetFamily =
        settings.fontFamily === 'System Sans' ? 'Plus Jakarta Sans' : settings.fontFamily;
      await Promise.allSettled([
        document.fonts.ready,
        document.fonts.load(`400 ${settings.fontSize}px "${targetFamily}"`),
        document.fonts.load(`700 ${settings.fontSize}px "${targetFamily}"`),
      ]);
    } catch {
      // Proceed cleanly with loaded fallback fonts if offline
    }
  }

  // 150 DPI A4 dimensions (sharp typography, compact file size)
  const PAGE_W = 1240;
  const PAGE_H = 1754;
  const MARGIN_X = 96;
  const MARGIN_TOP = 96;
  const MARGIN_BOTTOM = 104;
  const SCALE = 1.5; // scales CSS px to crisp 150 DPI canvas units

  const fontStack = resolveCanvasFontFamily(settings.fontFamily);
  const fontPx = Math.round(settings.fontSize * SCALE);
  const lineAdvance = fontPx * settings.lineHeight;
  const letterSpacingPx = settings.letterSpacing * fontPx;
  const wordSpacingPx =
    fontPx * 0.28 + settings.wordSpacing * fontPx;
  const paragraphGapPx = fontPx * settings.paragraphSpacing * 0.65;

  const measureCanvas = document.createElement('canvas');
  measureCanvas.width = PAGE_W;
  measureCanvas.height = PAGE_H;
  const mCtx = measureCanvas.getContext('2d');
  if (!mCtx) {
    throw new Error('Could not initialize PDF canvas renderer.');
  }

  mCtx.font = `400 ${fontPx}px ${fontStack}`;

  // Respect user's maxCharactersPerLine measure within page margins
  const avgCharWidth =
    measureSpacedText(mCtx, 'abcdefghijklmnopqrstuvwxyz0123456789', letterSpacingPx) / 36;
  const desiredMeasureWidth = settings.maxCharactersPerLine * avgCharWidth;
  const maxContentWidth = PAGE_W - MARGIN_X * 2;
  const contentWidth = Math.min(
    maxContentWidth,
    Math.max(460, desiredMeasureWidth)
  );
  const contentLeft =
    settings.textAlign === 'center'
      ? (PAGE_W - contentWidth) / 2
      : Math.max(MARGIN_X, (PAGE_W - contentWidth) / 2);

  const measureWord = (word: string): number => {
    if (!settings.bionicReading) {
      mCtx.font = `400 ${fontPx}px ${fontStack}`;
      return measureSpacedText(mCtx, word, letterSpacingPx);
    }
    const split = getBionicSplitIndex(word);
    const boldPart = word.slice(0, split);
    const restPart = word.slice(split);

    mCtx.font = `700 ${fontPx}px ${fontStack}`;
    const w1 = measureSpacedText(mCtx, boldPart, letterSpacingPx);
    mCtx.font = `400 ${fontPx}px ${fontStack}`;
    const w2 = restPart ? measureSpacedText(mCtx, restPart, letterSpacingPx) : 0;
    return w1 + w2 + (boldPart && restPart ? letterSpacingPx : 0);
  };

  // Word-wrap paragraphs cleanly
  const paragraphs = cleanText.split(/\n\s*\n/);
  const lines: PositionedLine[] = [];

  for (let pIdx = 0; pIdx < paragraphs.length; pIdx++) {
    const para = paragraphs[pIdx].replace(/\s*\n\s*/g, ' ').trim();
    if (!para) continue;

    const words = para.split(/\s+/);
    let currentWords: string[] = [];
    let currentWidth = 0;

    for (const word of words) {
      const wWidth = measureWord(word);
      const nextWidth =
        currentWords.length === 0 ? wWidth : currentWidth + wordSpacingPx + wWidth;

      if (currentWords.length > 0 && nextWidth > contentWidth) {
        lines.push({
          words: currentWords,
          width: currentWidth,
          isParagraphEnd: false,
        });
        currentWords = [word];
        currentWidth = wWidth;
      } else {
        currentWords.push(word);
        currentWidth = nextWidth;
      }
    }

    if (currentWords.length > 0) {
      lines.push({
        words: currentWords,
        width: currentWidth,
        isParagraphEnd: true,
      });
    }
  }

  // Paginate lines across A4 pages
  const HEADER_BLOCK_H = 128;
  const pages: Array<{ lines: PositionedLine[]; hasHeader: boolean }> = [];
  let currentPageLines: PositionedLine[] = [];
  let isFirstPage = true;
  let yCursor = MARGIN_TOP + HEADER_BLOCK_H;

  for (const line of lines) {
    const neededHeight = lineAdvance;
    if (yCursor + neededHeight > PAGE_H - MARGIN_BOTTOM && currentPageLines.length > 0) {
      pages.push({ lines: currentPageLines, hasHeader: isFirstPage });
      isFirstPage = false;
      currentPageLines = [];
      yCursor = MARGIN_TOP;
    }

    currentPageLines.push(line);
    yCursor += lineAdvance;
    if (line.isParagraphEnd) {
      yCursor += paragraphGapPx;
    }
  }

  if (currentPageLines.length > 0 || pages.length === 0) {
    pages.push({ lines: currentPageLines, hasHeader: isFirstPage });
  }

  // Create jsPDF document (A4 pt)
  const pdf = new jsPDF({
    orientation: 'portrait',
    unit: 'pt',
    format: 'a4',
    compress: true,
  });
  const pdfW = pdf.internal.pageSize.getWidth();
  const pdfH = pdf.internal.pageSize.getHeight();

  const renderCanvas = document.createElement('canvas');
  renderCanvas.width = PAGE_W;
  renderCanvas.height = PAGE_H;
  const ctx = renderCanvas.getContext('2d');
  if (!ctx) {
    throw new Error('Could not obtain canvas context for PDF export.');
  }

  const safeTitle = (title || 'Dyslexia Document').trim();

  for (let pageIdx = 0; pageIdx < pages.length; pageIdx++) {
    const pageData = pages[pageIdx];

    // 1. Full-bleed anti-glare background fill
    ctx.fillStyle = settings.backgroundColor;
    ctx.fillRect(0, 0, PAGE_W, PAGE_H);

    // 2. Document Title Header on Page 1
    let y = MARGIN_TOP;
    if (pageData.hasHeader) {
      ctx.fillStyle = settings.textColor;
      ctx.textBaseline = 'top';
      ctx.font = `700 ${Math.round(fontPx * 1.25)}px ${fontStack}`;

      const clippedTitle =
        safeTitle.length > 55 ? `${safeTitle.slice(0, 52)}...` : safeTitle;
      drawSpacedText(ctx, clippedTitle, contentLeft, y, letterSpacingPx * 0.5);

      ctx.globalAlpha = 0.6;
      ctx.font = `400 18px 'Plus Jakarta Sans', system-ui, sans-serif`;
      ctx.fillText(
        `${settings.fontFamily} · ${settings.fontSize}px · ${settings.lineHeight}x line height · Anti-glare tint`,
        contentLeft,
        y + Math.round(fontPx * 1.5)
      );

      // Subtle hairline divider
      ctx.globalAlpha = 0.16;
      ctx.fillRect(contentLeft, y + HEADER_BLOCK_H - 32, contentWidth, 2);
      ctx.globalAlpha = 1;

      y += HEADER_BLOCK_H;
    }

    // 3. Render Text Lines
    ctx.textBaseline = 'top';
    ctx.fillStyle = settings.textColor;

    for (const line of pageData.lines) {
      let x =
        settings.textAlign === 'center'
          ? contentLeft + Math.max(0, (contentWidth - line.width) / 2)
          : contentLeft;

      for (let wIdx = 0; wIdx < line.words.length; wIdx++) {
        const word = line.words[wIdx];

        if (!settings.bionicReading) {
          ctx.font = `400 ${fontPx}px ${fontStack}`;
          x = drawSpacedText(ctx, word, x, y, letterSpacingPx);
        } else {
          const split = getBionicSplitIndex(word);
          const boldPart = word.slice(0, split);
          const restPart = word.slice(split);

          if (boldPart) {
            ctx.font = `700 ${fontPx}px ${fontStack}`;
            x = drawSpacedText(ctx, boldPart, x, y, letterSpacingPx);
            if (restPart) x += letterSpacingPx;
          }
          if (restPart) {
            ctx.font = `400 ${fontPx}px ${fontStack}`;
            x = drawSpacedText(ctx, restPart, x, y, letterSpacingPx);
          }
        }

        if (wIdx < line.words.length - 1) {
          x += wordSpacingPx;
        }
      }

      y += lineAdvance;
      if (line.isParagraphEnd) {
        y += paragraphGapPx;
      }
    }

    // 4. Clean Page Footer
    ctx.globalAlpha = 0.5;
    ctx.font = `400 16px 'Plus Jakarta Sans', system-ui, sans-serif`;
    ctx.fillText(
      `ABG Inclusive Reader · ${settings.fontFamily}`,
      MARGIN_X,
      PAGE_H - 58
    );
    const pageNumText = `Page ${pageIdx + 1} of ${pages.length}`;
    const pageNumWidth = ctx.measureText(pageNumText).width;
    ctx.fillText(pageNumText, PAGE_W - MARGIN_X - pageNumWidth, PAGE_H - 58);
    ctx.globalAlpha = 1;

    // 5. Embed page into PDF
    if (pageIdx > 0) {
      pdf.addPage();
    }
    const imgData = renderCanvas.toDataURL('image/jpeg', 0.94);
    pdf.addImage(imgData, 'JPEG', 0, 0, pdfW, pdfH, undefined, 'FAST');
  }

  const filenameBase = safeTitle
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 48);

  pdf.save(`${filenameBase || 'reading-document'}-dyslexia.pdf`);
}
