export type FontFamily = 
  | 'OpenDyslexic'
  | 'Lexend'
  | 'Atkinson Hyperlegible'
  | 'Comic Neue'
  | 'System Sans';

export interface DyslexiaSettings {
  // Typography
  fontFamily: FontFamily;
  fontSize: number; // in px: 16 to 34
  lineHeight: number; // multiplier: 1.4 to 2.4 (default 1.75)
  letterSpacing: number; // in em: 0 to 0.4 (default 0.14)
  wordSpacing: number; // in em: 0 to 0.5 (default 0.28)
  paragraphSpacing: number; // in em: 1.0 to 3.0 (default 1.8)
  
  // Layout & Alignment
  maxCharactersPerLine: number; // 45 to 80 (default 65, corresponds to 50-75 chars / 11-15 words)
  textAlign: 'left' | 'center'; // Left-aligned with ragged right edge (default 'left')
  
  // Colors (avoiding pure black #000000 on stark white #ffffff)
  backgroundColor: string; // e.g., '#FAF4E8' soft warm cream
  textColor: string; // e.g., '#2D3142' dark charcoal
  
  // Assistive Reading Tools
  readingRuler: boolean;
  rulerHeight: number; // in px
  rulerColor: string;
  rulerOpacity: number;
  readingMask: boolean; // dims text outside ruler
  bionicReading: boolean; // bold fixation points on first letters of words
  alternatingLines: boolean; // subtle tint on alternate lines to avoid line jumps
  
  // Text to speech
  speechRate: number; // 0.6 to 1.5 (default 0.9)
  speechPitch: number; // default 1.0
  voiceName: string;
}

export interface ColorPreset {
  id: string;
  name: string;
  description: string;
  bgColor: string;
  textColor: string;
  accentColor: string;
  badge?: string;
}

export interface ScannedDocument {
  id: string;
  title: string;
  content: string;
  originalText: string;
  enhancedText?: string;
  activeView: 'standard' | 'simplified' | 'bullets' | 'syllables' | 'summary';
  scannedAt: number;
  source: 'camera' | 'upload' | 'paste' | 'sample';
  imagePreview?: string;
  wordCount: number;
  charCount: number;
}

export const COLOR_PRESETS: ColorPreset[] = [
  {
    id: 'warm-cream',
    name: 'Soft Warm Cream',
    description: 'Gold standard for dyslexia. Softens harsh white glare and stabilizes letter forms.',
    bgColor: '#FAF4E8',
    textColor: '#2D3142',
    accentColor: '#2563EB',
    badge: 'Recommended',
  },
  {
    id: 'pastel-peach',
    name: 'Pastel Peach',
    description: 'Warm soothing apricot tint. Reduces ocular fatigue during extended reading.',
    bgColor: '#FFF1E6',
    textColor: '#2E282A',
    accentColor: '#3B82F6',
  },
  {
    id: 'mint-sage',
    name: 'Sage & Mint Dew',
    description: 'Cool pastel green tint. Often chosen for Scotopic Sensitivity (Irlen syndrome).',
    bgColor: '#EBF5EE',
    textColor: '#1E2C24',
    accentColor: '#0EA5E9',
  },
  {
    id: 'muted-sky',
    name: 'Muted Sky Blue',
    description: 'Calming soft blue. Known to alleviate optical vibration and visual distortion.',
    bgColor: '#EDF4F9',
    textColor: '#1F2D3D',
    accentColor: '#2563EB',
  },
  {
    id: 'buttercup-yellow',
    name: 'Buttercup Soft Yellow',
    description: 'Gentle low-intensity yellow. Enhances letter edge definition without glare.',
    bgColor: '#FEF9E7',
    textColor: '#2E2B22',
    accentColor: '#2563EB',
  },
  {
    id: 'lavender-whisper',
    name: 'Lavender Whisper',
    description: 'Subtle lilac pastel. Relaxes focus tension for visual tracking difficulties.',
    bgColor: '#F5F0FA',
    textColor: '#2B2338',
    accentColor: '#3B82F6',
  },
  {
    id: 'paper-parchment',
    name: 'Classic Parchment',
    description: 'Natural unbleached book paper texture tone. Organic and gentle on the eyes.',
    bgColor: '#F5EEDB',
    textColor: '#262420',
    accentColor: '#1D4ED8',
  },
  {
    id: 'slate-charcoal',
    name: 'Low-Glare Dark Mode',
    description: 'Deep warm charcoal with muted linen text. Ideal for low-light without eye strain.',
    bgColor: '#202227',
    textColor: '#E8E5DD',
    accentColor: '#3B82F6',
  },
];

export const DEFAULT_SETTINGS: DyslexiaSettings = {
  fontFamily: 'OpenDyslexic',
  fontSize: 20,
  lineHeight: 1.75, // ~1.5x - 1.8x line spacing
  letterSpacing: 0.14, // increased character spacing
  wordSpacing: 0.28, // increased word spacing
  paragraphSpacing: 1.8,
  maxCharactersPerLine: 62, // 50-75 characters / 11-15 words
  textAlign: 'left', // left-align with ragged right edge
  backgroundColor: '#FAF4E8', // soft warm cream
  textColor: '#2D3142', // dark charcoal / off-black
  readingRuler: false,
  rulerHeight: 46,
  rulerColor: '#2563EB',
  rulerOpacity: 0.22,
  readingMask: false,
  bionicReading: false,
  alternatingLines: false,
  speechRate: 0.9,
  speechPitch: 1.0,
  voiceName: '',
};

export interface FontOption {
  value: FontFamily;
  label: string;
  description: string;
}

export const FONT_OPTIONS: FontOption[] = [
  {
    value: 'OpenDyslexic',
    label: 'OpenDyslexic',
    description: 'Weighted bottoms prevent letter rotation and swaps',
  },
  {
    value: 'Lexend',
    label: 'Lexend',
    description: 'Clinically proven to reduce visual crowding',
  },
  {
    value: 'Atkinson Hyperlegible',
    label: 'Atkinson',
    description: 'Distinct unambiguous character shapes',
  },
  {
    value: 'Comic Neue',
    label: 'Comic Neue',
    description: 'Friendly informal letterforms',
  },
];
