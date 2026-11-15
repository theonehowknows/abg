// Helper to parse hex color to RGB
export function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const clean = hex.replace('#', '').trim();
  if (clean.length === 3) {
    return {
      r: parseInt(clean[0] + clean[0], 16),
      g: parseInt(clean[1] + clean[1], 16),
      b: parseInt(clean[2] + clean[2], 16),
    };
  }
  if (clean.length === 6) {
    return {
      r: parseInt(clean.substring(0, 2), 16),
      g: parseInt(clean.substring(2, 4), 16),
      b: parseInt(clean.substring(4, 6), 16),
    };
  }
  return null;
}

// Relative luminance for sRGB
function getRelativeLuminance(r: number, g: number, b: number): number {
  const a = [r, g, b].map((v) => {
    const s = v / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * a[0] + 0.7152 * a[1] + 0.0722 * a[2];
}

// WCAG Contrast Ratio
export function getContrastRatio(colorA: string, colorB: string): number {
  const rgbA = hexToRgb(colorA);
  const rgbB = hexToRgb(colorB);

  if (!rgbA || !rgbB) return 4.5;

  const lumA = getRelativeLuminance(rgbA.r, rgbA.g, rgbA.b);
  const lumB = getRelativeLuminance(rgbB.r, rgbB.g, rgbB.b);

  const brighter = Math.max(lumA, lumB);
  const darker = Math.min(lumA, lumB);

  return (brighter + 0.05) / (darker + 0.05);
}

// Assess Dyslexia Glare & Readability
export interface GlareAssessment {
  contrastRatio: number;
  wcagLevel: 'AAA' | 'AA' | 'Fail';
  isStarkWhiteBlack: boolean;
  glareRating: 'Optimal' | 'Gentle' | 'High Glare (Avoid)';
  message: string;
}

export function evaluateDyslexiaGlare(bgColor: string, textColor: string): GlareAssessment {
  const ratio = getContrastRatio(bgColor, textColor);
  const bgRgb = hexToRgb(bgColor);
  const textRgb = hexToRgb(textColor);

  const isPureWhiteBg = bgRgb && bgRgb.r > 250 && bgRgb.g > 250 && bgRgb.b > 250;
  const isPureBlackText = textRgb && textRgb.r < 10 && textRgb.g < 10 && textRgb.b < 10;
  const isStarkWhiteBlack = Boolean(isPureWhiteBg && isPureBlackText);

  let wcagLevel: 'AAA' | 'AA' | 'Fail' = 'Fail';
  if (ratio >= 7.0) {
    wcagLevel = 'AAA';
  } else if (ratio >= 4.5) {
    wcagLevel = 'AA';
  }

  let glareRating: 'Optimal' | 'Gentle' | 'High Glare (Avoid)' = 'Optimal';
  let message = 'Excellent glare reduction and soft contrast for relaxed reading.';

  if (isStarkWhiteBlack) {
    glareRating = 'High Glare (Avoid)';
    message = 'Warning: Pure #000000 on stark #FFFFFF creates maximum optical glare and "visual vibration" for readers with dyslexia.';
  } else if (ratio < 4.5) {
    glareRating = 'Gentle';
    message = 'Contrast is lower than standard WCAG AA (4.5:1). Increase difference slightly for better clarity.';
  } else {
    glareRating = 'Optimal';
    message = 'Soft cream/pastel background with dark charcoal text cuts down glare while maintaining crisp letter legibility.';
  }

  return {
    contrastRatio: Number(ratio.toFixed(2)),
    wcagLevel,
    isStarkWhiteBlack,
    glareRating,
    message,
  };
}
