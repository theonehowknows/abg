/**
 * Real-time lightweight document and text sharpness detector for auto-trigger scanning.
 * Analyzes video frames on a tiny 160x120 offscreen canvas at minimal CPU overhead (<2ms/frame).
 * Evaluates document presence, text edge energy, and motion stability.
 */

export interface FrameAnalysisResult {
  hasDocument: boolean;
  isSharp: boolean;
  isSteady: boolean;
  confidence: number; // 0 to 1
  message: string;
}

export class DocumentDetector {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D | null;
  private prevLuma: Float32Array | null = null;
  private sampleWidth: number;
  private sampleHeight: number;

  constructor(width = 160, height = 120) {
    this.sampleWidth = width;
    this.sampleHeight = height;
    this.canvas = document.createElement('canvas');
    this.canvas.width = width;
    this.canvas.height = height;
    this.ctx = this.canvas.getContext('2d', { willReadFrequently: true });
  }

  public analyzeFrame(video: HTMLVideoElement): FrameAnalysisResult {
    if (!this.ctx || video.readyState < 2 || video.videoWidth === 0) {
      return {
        hasDocument: false,
        isSharp: false,
        isSteady: false,
        confidence: 0,
        message: 'Initializing camera...',
      };
    }

    const sw = this.sampleWidth;
    const sh = this.sampleHeight;

    // Draw central target area (65% of frame) to focus strictly on the document
    const vw = video.videoWidth;
    const vh = video.videoHeight;
    const cropW = vw * 0.70;
    const cropH = vh * 0.70;
    const cropX = (vw - cropW) / 2;
    const cropY = (vh - cropH) / 2;

    this.ctx.drawImage(video, cropX, cropY, cropW, cropH, 0, 0, sw, sh);

    let imgData: ImageData;
    try {
      imgData = this.ctx.getImageData(0, 0, sw, sh);
    } catch (_) {
      return {
        hasDocument: false,
        isSharp: false,
        isSteady: false,
        confidence: 0,
        message: 'Camera frame unavailable',
      };
    }

    const data = imgData.data;
    const numPixels = sw * sh;
    const currentLuma = new Float32Array(numPixels);

    let sumLuma = 0;
    for (let i = 0, p = 0; i < data.length; i += 4, p++) {
      // Relative perceived luminance
      const y = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
      currentLuma[p] = y;
      sumLuma += y;
    }

    const meanLuma = sumLuma / numPixels;

    // 1. Contrast / Luminance standard deviation (Text on paper produces high variance)
    let varianceSum = 0;
    for (let p = 0; p < numPixels; p++) {
      const diff = currentLuma[p] - meanLuma;
      varianceSum += diff * diff;
    }
    const stdDev = Math.sqrt(varianceSum / numPixels);

    // 2. High-frequency Edge Energy (Measures text focus vs motion blur)
    let edgeSum = 0;
    let edgeCount = 0;
    // Sample step 2 for ultra-fast processing
    for (let y = 1; y < sh - 1; y += 2) {
      const row = y * sw;
      for (let x = 1; x < sw - 1; x += 2) {
        const idx = row + x;
        const gx = Math.abs(currentLuma[idx + 1] - currentLuma[idx - 1]);
        const gy = Math.abs(currentLuma[idx + sw] - currentLuma[idx - sw]);
        edgeSum += gx + gy;
        edgeCount++;
      }
    }
    const edgeDensity = edgeCount > 0 ? edgeSum / edgeCount : 0;

    // 3. Frame-to-frame motion delta (Measures device steadiness)
    let motionDelta = 999;
    if (this.prevLuma) {
      let diffSum = 0;
      const step = 3;
      let count = 0;
      for (let p = 0; p < numPixels; p += step) {
        diffSum += Math.abs(currentLuma[p] - this.prevLuma[p]);
        count++;
      }
      motionDelta = count > 0 ? diffSum / count : 999;
    }
    this.prevLuma = currentLuma;

    // Decision boundaries:
    // Well-lit: not pitch black and not blown out
    const isWellLit = meanLuma >= 60 && meanLuma <= 245;
    // Document present: standard deviation > 24 indicates paper with printed content
    const hasGoodContrast = stdDev >= 24;
    const hasDocument = isWellLit && hasGoodContrast;

    // Sharpness: edgeDensity >= 13 indicates text is in focus and not motion blurred
    const isSharp = edgeDensity >= 13;

    // Steadiness: motionDelta < 7.5 indicates the user is holding the device still
    const isSteady = motionDelta < 7.5;

    // Calculate confidence score (0 to 1)
    let confidence = 0;
    if (hasDocument) confidence += 0.35;
    if (isSharp) confidence += 0.35;
    if (isSteady) confidence += 0.30;

    let message = 'Align document in box';
    if (!hasDocument) {
      message = meanLuma < 60 ? 'More light needed' : 'Align text inside box';
    } else if (!isSharp) {
      message = 'Adjust distance for sharp text';
    } else if (!isSteady) {
      message = 'Hold steady...';
    } else {
      message = 'Document in focus • Hold steady';
    }

    return {
      hasDocument,
      isSharp,
      isSteady,
      confidence: Math.min(1, Math.max(0, confidence)),
      message,
    };
  }

  public reset(): void {
    this.prevLuma = null;
  }
}
