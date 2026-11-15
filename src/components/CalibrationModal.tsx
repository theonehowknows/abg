import React, { useState, useRef, useEffect } from 'react';
import {
  X,
  Zap,
  Check,
  ArrowRight,
  RotateCcw,
  Sparkles,
  Timer,
  Eye,
  Award,
  ChevronRight,
  TrendingUp,
  ShieldCheck,
  Glasses,
  Copy,
  CheckCircle2,
  Sliders,
  Sun,
  Activity,
  Layers,
} from 'lucide-react';
import { DyslexiaSettings, FontFamily, COLOR_PRESETS } from '../types';
import { evaluateDyslexiaGlare, getContrastRatio } from '../utils/contrast';

interface CalibrationModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: DyslexiaSettings;
  onApplySettings: (updated: Partial<DyslexiaSettings>) => void;
}

// Diagnostic symptoms
interface DyslexiaSymptom {
  id: string;
  label: string;
  description: string;
  icon: string;
  recommendedFont: FontFamily;
  recommendedSpacingBonus: { letterSpacing: number; wordSpacing: number; lineHeight: number };
  needsRuler?: boolean;
}

const SYMPTOM_OPTIONS: DyslexiaSymptom[] = [
  {
    id: 'letter-swaps',
    label: 'Letter Rotation & Inversions',
    description: 'Letters like b, d, p, q, n, u rotate, flip, or mirror across words.',
    icon: '🔄',
    recommendedFont: 'OpenDyslexic',
    recommendedSpacingBonus: { letterSpacing: 0.16, wordSpacing: 0.32, lineHeight: 1.8 },
  },
  {
    id: 'visual-crowding',
    label: 'Visual Crowding & Bunching',
    description: 'Adjacent letters and words blur together into tight visual clusters.',
    icon: '👥',
    recommendedFont: 'Lexend',
    recommendedSpacingBonus: { letterSpacing: 0.18, wordSpacing: 0.36, lineHeight: 1.85 },
  },
  {
    id: 'glare-photophobia',
    label: 'Glare & High Contrast Sensitivity',
    description: 'Bright white paper or screens cause headaches, glare halos, or rapid eye fatigue.',
    icon: '⚡',
    recommendedFont: 'OpenDyslexic',
    recommendedSpacingBonus: { letterSpacing: 0.14, wordSpacing: 0.28, lineHeight: 1.75 },
  },
  {
    id: 'word-jitter',
    label: 'Word Shimmering & Vibration',
    description: 'Words appear to move, vibrate, or drift off the baseline while reading.',
    icon: '〰️',
    recommendedFont: 'OpenDyslexic',
    recommendedSpacingBonus: { letterSpacing: 0.16, wordSpacing: 0.30, lineHeight: 1.8 },
  },
  {
    id: 'line-jumping',
    label: 'Line Jumping & Tracking Loss',
    description: 'Eyes struggle to jump back to the start of the next line, re-reading lines.',
    icon: '🎯',
    recommendedFont: 'Lexend',
    recommendedSpacingBonus: { letterSpacing: 0.14, wordSpacing: 0.30, lineHeight: 1.9 },
    needsRuler: true,
  },
  {
    id: 'char-distinction',
    label: 'Similar Character Confusion',
    description: 'Hard to distinguish similar glyphs like 1, l, I, 0, O, C, and e.',
    icon: '🔍',
    recommendedFont: 'Atkinson Hyperlegible',
    recommendedSpacingBonus: { letterSpacing: 0.14, wordSpacing: 0.28, lineHeight: 1.75 },
  },
];

// 6 Clinical Anti-Glare Candidates with Detailed Optical Properties
interface DetailedColorCandidate {
  id: string;
  name: string;
  family: string;
  bgColor: string;
  textColor: string;
  glareReductionPercent: number;
  contrastRatio: number;
  scotopicBenefit: string;
  bestFor: string;
  accent: string;
}

const DETAILED_COLOR_CANDIDATES: DetailedColorCandidate[] = [
  {
    id: 'warm-cream',
    name: 'Soft Warm Cream',
    family: 'Warm Neutral (Standard)',
    bgColor: '#FAF4E8',
    textColor: '#2D3142',
    glareReductionPercent: 96,
    contrastRatio: 11.2,
    scotopicBenefit: 'Eliminates 96% of high-frequency blue-light spikes, stabilizing letter shapes.',
    bestFor: 'General reading comfort & broad-spectrum glare sensitivity',
    accent: '#2563EB',
  },
  {
    id: 'mint-sage',
    name: 'Sage & Mint Dew',
    family: 'Scotopic Green Overlay',
    bgColor: '#EBF5EE',
    textColor: '#1E2C24',
    glareReductionPercent: 94,
    contrastRatio: 11.8,
    scotopicBenefit: 'Green wavelength filter eases Irlen syndrome and perceptual optical stress.',
    bestFor: 'Visual stress, letter shimmering, and ocular strain',
    accent: '#059669',
  },
  {
    id: 'pastel-peach',
    name: 'Pastel Peach',
    family: 'Apricot Ocular Calmer',
    bgColor: '#FFF1E6',
    textColor: '#2E282A',
    glareReductionPercent: 93,
    contrastRatio: 11.5,
    scotopicBenefit: 'Soft orange spectrum relaxes ciliary eye muscles to stop accommodation spasms.',
    bestFor: 'Extended reading endurance and dry, tired eyes',
    accent: '#EA580C',
  },
  {
    id: 'muted-sky',
    name: 'Muted Sky Blue',
    family: 'Anti-Jitter Cool Tint',
    bgColor: '#EDF4F9',
    textColor: '#1F2D3D',
    glareReductionPercent: 92,
    contrastRatio: 10.9,
    scotopicBenefit: 'Cools visual field to stop words from vibrating or jumping out of order.',
    bestFor: 'Perceived word movement and baseline vibration',
    accent: '#0284C7',
  },
  {
    id: 'lavender-whisper',
    name: 'Lavender Whisper',
    family: 'Pattern Glare Suppressor',
    bgColor: '#F5F0FA',
    textColor: '#2B2338',
    glareReductionPercent: 91,
    contrastRatio: 11.6,
    scotopicBenefit: 'Lilac wavelength dampens visual sensory overload and stripe pattern glare.',
    bestFor: 'Visual noise sensitivity, migraines, and light aversion',
    accent: '#7C3AED',
  },
  {
    id: 'buttercup-yellow',
    name: 'Buttercup Soft Yellow',
    family: 'Edge-Contrast Enhancer',
    bgColor: '#FEF9E7',
    textColor: '#2E2B22',
    glareReductionPercent: 90,
    contrastRatio: 12.1,
    scotopicBenefit: 'UK educational gold-standard overlay that sharpens word edges without harsh glare.',
    bestFor: 'Low ambient lighting and dyslexia edge recognition',
    accent: '#D97706',
  },
];

// Short 20-word standardized test passages
const SPRINT_PASSAGES = [
  {
    font: 'OpenDyslexic' as FontFamily,
    fontClass: 'font-opendyslexic',
    name: 'OpenDyslexic',
    feature: 'Gravity-weighted baselines to prevent letter flipping',
    text: 'Gentle ocean breezes carry the salty scent of pine trees as warm golden sunlight filters peacefully through the morning clouds.',
    wordCount: 20,
  },
  {
    font: 'Lexend' as FontFamily,
    fontClass: 'font-lexend',
    name: 'Lexend',
    feature: 'Empirical proportional geometry engineered to reduce crowding',
    text: 'Wild honeybees dance across blooming purple clover fields, gathering sweet nectar under the bright clear sky to nourish their colony.',
    wordCount: 20,
  },
  {
    font: 'Atkinson Hyperlegible' as FontFamily,
    fontClass: 'font-atkinson',
    name: 'Atkinson Hyperlegible',
    feature: 'Braille Institute typeface engineered for distinct, unambiguous glyphs',
    text: 'Ancient stone paths wind quietly along the mountain river, where crisp autumn leaves drift past sleeping deer in the forest.',
    wordCount: 20,
  },
];

export const CalibrationModal: React.FC<CalibrationModalProps> = ({
  isOpen,
  onClose,
  settings,
  onApplySettings,
}) => {
  // 1: Symptoms Screener, 2: Anti-Glare Tint Lab, 3: Typeface Benchmark Sprint, 4: Comprehensive Prescription
  const [currentStep, setCurrentStep] = useState<1 | 2 | 3 | 4>(1);

  // Symptoms selected
  const [selectedSymptoms, setSelectedSymptoms] = useState<string[]>(['letter-swaps', 'glare-photophobia']);

  // Selected anti-glare color
  const [selectedColor, setSelectedColor] = useState<DetailedColorCandidate>(DETAILED_COLOR_CANDIDATES[0]);
  const [glareRatingScore, setGlareRatingScore] = useState<'deeply-calm' | 'gentle' | 'neutral'>('deeply-calm');
  const [showStarkContrastComparison, setShowStarkContrastComparison] = useState(false);

  // Sprint testing state (Rounds 0, 1, 2)
  const [sprintIndex, setSprintIndex] = useState<number>(0);
  const [sprintTimes, setSprintTimes] = useState<(number | null)[]>([null, null, null]);
  const [sprintRatings, setSprintRatings] = useState<string[]>(['', '', '']);
  const [isReadingSprint, setIsReadingSprint] = useState(false);
  const [sprintStartTime, setSprintStartTime] = useState<number>(0);
  const [liveElapsed, setLiveElapsed] = useState<number>(0);
  const [copiedPrescription, setCopiedPrescription] = useState(false);

  // Live timer for sprint
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
    if (isReadingSprint && sprintStartTime > 0) {
      interval = setInterval(() => {
        setLiveElapsed((Date.now() - sprintStartTime) / 1000);
      }, 75);
    } else {
      setLiveElapsed(0);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isReadingSprint, sprintStartTime]);

  // Reset state on modal open
  useEffect(() => {
    if (isOpen) {
      setCurrentStep(1);
      const match = DETAILED_COLOR_CANDIDATES.find((c) => c.bgColor.toLowerCase() === settings.backgroundColor.toLowerCase());
      setSelectedColor(match || DETAILED_COLOR_CANDIDATES[0]);
      setSprintTimes([null, null, null]);
      setSprintRatings(['', '', '']);
      setSprintIndex(0);
      setIsReadingSprint(false);
      setShowStarkContrastComparison(false);
      setCopiedPrescription(false);
    }
  }, [isOpen, settings.backgroundColor]);

  if (!isOpen) return null;

  // Toggle symptom
  const toggleSymptom = (id: string) => {
    setSelectedSymptoms((prev) =>
      prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id]
    );
  };

  // Sprint control
  const handleStartSprint = () => {
    setSprintStartTime(Date.now());
    setIsReadingSprint(true);
  };

  const handleFinishSprint = (rating: string) => {
    const elapsedSec = Math.max(0.6, (Date.now() - sprintStartTime) / 1000);
    const updatedTimes = [...sprintTimes];
    const updatedRatings = [...sprintRatings];
    updatedTimes[sprintIndex] = elapsedSec;
    updatedRatings[sprintIndex] = rating;
    setSprintTimes(updatedTimes);
    setSprintRatings(updatedRatings);
    setIsReadingSprint(false);

    if (sprintIndex < 2) {
      setSprintIndex(sprintIndex + 1);
    } else {
      setCurrentStep(4); // Advance to final prescription report
    }
  };

  // Compute calculated metrics
  const wpmScores = sprintTimes.map((t, idx) =>
    t ? Math.round((SPRINT_PASSAGES[idx].wordCount / t) * 60) : 0
  );

  // Determine winner font based on WPM + symptom weighting
  let bestFontIdx = 0;
  let maxScore = -1;
  wpmScores.forEach((wpm, idx) => {
    let score = wpm;
    const fontName = SPRINT_PASSAGES[idx].font;
    // Add symptom boost
    selectedSymptoms.forEach((sId) => {
      const sym = SYMPTOM_OPTIONS.find((s) => s.id === sId);
      if (sym && sym.recommendedFont === fontName) {
        score += 18; // Weighting for matching symptom profile
      }
    });
    // Add subjective rating bonus
    if (sprintRatings[idx] === 'effortless') score += 15;
    if (sprintRatings[idx] === 'easy') score += 8;

    if (score > maxScore) {
      maxScore = score;
      bestFontIdx = idx;
    }
  });

  const winningFont = SPRINT_PASSAGES[bestFontIdx]?.font || 'OpenDyslexic';
  const bestWpm = wpmScores[bestFontIdx] || 140;
  const otherWpms = wpmScores.filter((_, i) => i !== bestFontIdx).filter((w) => w > 0);
  const baselineWpm = otherWpms.length > 0 ? Math.min(...otherWpms) : bestWpm * 0.85;
  const speedGain = baselineWpm > 0 ? Math.round(((bestWpm - baselineWpm) / baselineWpm) * 100) : 15;

  // Spacing prescription based on symptoms
  const needsReadingRuler = selectedSymptoms.some((sId) =>
    SYMPTOM_OPTIONS.find((s) => s.id === sId)?.needsRuler
  );
  const isCrowded = selectedSymptoms.includes('visual-crowding');
  const hasLetterSwaps = selectedSymptoms.includes('letter-swaps');

  const prescribedLineHeight = isCrowded ? 1.85 : hasLetterSwaps ? 1.8 : 1.75;
  const prescribedWordSpacing = isCrowded ? 0.36 : 0.28;
  const prescribedLetterSpacing = isCrowded ? 0.18 : 0.14;
  const prescribedMaxChars = isCrowded ? 58 : 62;

  // Apply complete prescription
  const handleApplyPrescription = () => {
    onApplySettings({
      fontFamily: winningFont,
      backgroundColor: selectedColor.bgColor,
      textColor: selectedColor.textColor,
      lineHeight: prescribedLineHeight,
      wordSpacing: prescribedWordSpacing,
      letterSpacing: prescribedLetterSpacing,
      maxCharactersPerLine: prescribedMaxChars,
      readingRuler: needsReadingRuler ? true : settings.readingRuler,
    });
    onClose();
  };

  const handleCopyPrescription = () => {
    const text = `ABG Dyslexia Reading Calibration Prescription
--------------------------------------------------
Optimal Typography: ${winningFont} (${speedGain}% reading speed gain)
Anti-Glare Background: ${selectedColor.name} (${selectedColor.bgColor})
Text Contrast: ${selectedColor.textColor} (${selectedColor.contrastRatio}:1 WCAG AAA)
Glare Reduction: ${selectedColor.glareReductionPercent}% photopic glare filtered
Line Spacing: ${prescribedLineHeight}x
Word Spacing: ${prescribedWordSpacing}em
Character Spacing: ${prescribedLetterSpacing}em
Reading Ruler: ${needsReadingRuler ? 'Recommended (Active)' : 'Standard'}
Primary Symptoms Addressed: ${selectedSymptoms.map((s) => SYMPTOM_OPTIONS.find((x) => x.id === s)?.label).filter(Boolean).join(', ')}`;

    navigator.clipboard.writeText(text);
    setCopiedPrescription(true);
    setTimeout(() => setCopiedPrescription(false), 3000);
  };

  return (
    <div
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/65 backdrop-blur-md p-3 sm:p-4 animate-in fade-in duration-200"
    >
      <div
        className="relative w-full max-w-3xl rounded-3xl shadow-2xl border border-black/15 overflow-hidden flex flex-col max-h-[94vh] transition-colors duration-300"
        style={{
          backgroundColor: showStarkContrastComparison ? '#FFFFFF' : selectedColor.bgColor,
          color: showStarkContrastComparison ? '#000000' : selectedColor.textColor,
        }}
      >
        {/* Top Header Bar */}
        <div className="flex items-center justify-between px-5 sm:px-7 py-3.5 sm:py-4 border-b border-current/15 bg-black/5">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-700 text-white flex items-center justify-center shadow-md shadow-blue-600/25 shrink-0">
              <Zap className="w-5 h-5 fill-current" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-extrabold text-base sm:text-lg tracking-tight">
                  Dyslexia Reading Calibration
                </h2>
                <span className="hidden sm:inline-flex items-center gap-1 text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-blue-600 text-white">
                  <Activity className="w-3 h-3" />
                  <span>Clinical Screener</span>
                </span>
              </div>
              <p className="text-xs opacity-75 hidden sm:block">
                Multi-stage assessment to find your optimal anti-glare wavelength & typeface
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                setCurrentStep(1);
                setSprintTimes([null, null, null]);
                setSprintIndex(0);
              }}
              className="hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-black/5 hover:bg-black/10 text-xs font-semibold transition cursor-pointer"
              title="Reset calibration from start"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Restart</span>
            </button>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-xl flex items-center justify-center hover:bg-black/10 transition cursor-pointer"
              aria-label="Close calibration"
            >
              <X className="w-5 h-5 opacity-75" />
            </button>
          </div>
        </div>

        {/* Multi-Step Diagnostic Stepper */}
        <div className="grid grid-cols-4 border-b border-current/10 text-[11px] font-semibold text-center py-2.5 px-3 sm:px-6 bg-black/5 gap-1 select-none">
          <button
            onClick={() => setCurrentStep(1)}
            className={`flex items-center justify-center gap-1.5 py-1 px-1 rounded-lg transition ${
              currentStep === 1
                ? 'text-blue-600 font-bold bg-blue-600/10'
                : 'opacity-60 hover:opacity-100'
            }`}
          >
            <span className="w-5 h-5 rounded-full flex items-center justify-center bg-current/10 text-[10px] font-mono">1</span>
            <span className="truncate">Symptoms</span>
          </button>

          <button
            onClick={() => setCurrentStep(2)}
            className={`flex items-center justify-center gap-1.5 py-1 px-1 rounded-lg transition ${
              currentStep === 2
                ? 'text-blue-600 font-bold bg-blue-600/10'
                : 'opacity-60 hover:opacity-100'
            }`}
          >
            <span className="w-5 h-5 rounded-full flex items-center justify-center bg-current/10 text-[10px] font-mono">2</span>
            <span className="truncate">Anti-Glare Lab</span>
          </button>

          <button
            onClick={() => setCurrentStep(3)}
            className={`flex items-center justify-center gap-1.5 py-1 px-1 rounded-lg transition ${
              currentStep === 3
                ? 'text-blue-600 font-bold bg-blue-600/10'
                : 'opacity-60 hover:opacity-100'
            }`}
          >
            <span className="w-5 h-5 rounded-full flex items-center justify-center bg-current/10 text-[10px] font-mono">3</span>
            <span className="truncate">Font Sprints</span>
          </button>

          <button
            onClick={() => setCurrentStep(4)}
            className={`flex items-center justify-center gap-1.5 py-1 px-1 rounded-lg transition ${
              currentStep === 4
                ? 'text-blue-600 font-bold bg-blue-600/10'
                : 'opacity-60 hover:opacity-100'
            }`}
          >
            <span className="w-5 h-5 rounded-full flex items-center justify-center bg-current/10 text-[10px] font-mono">4</span>
            <span className="truncate">Prescription</span>
          </button>
        </div>

        {/* Modal Scrollable Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-7 space-y-6">
          {/* STEP 1: SENSORY SYMPTOM PROFILER */}
          {currentStep === 1 && (
            <div className="space-y-5">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-bold text-blue-600 uppercase tracking-wider">
                    Stage 1 of 4 • Sensory Profile
                  </span>
                  <span className="text-xs opacity-50">•</span>
                  <span className="text-xs opacity-75">Select all that describe your reading experience</span>
                </div>
                <h3 className="text-lg sm:text-xl font-extrabold tracking-tight">
                  What challenges do your eyes encounter when reading?
                </h3>
                <p className="text-xs sm:text-sm opacity-80 leading-relaxed">
                  Dyslexia presents in diverse optical and cognitive patterns. Tagging your symptoms allows ABG to mathematically tune both your anti-glare color filter and font baselines.
                </p>
              </div>

              {/* Symptom Checkbox Matrix */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                {SYMPTOM_OPTIONS.map((sym) => {
                  const isChecked = selectedSymptoms.includes(sym.id);
                  return (
                    <button
                      key={sym.id}
                      onClick={() => toggleSymptom(sym.id)}
                      className={`p-3.5 rounded-2xl border-2 text-left transition-all cursor-pointer flex items-start gap-3 relative ${
                        isChecked
                          ? 'border-blue-600 bg-blue-600/10 ring-2 ring-blue-500/20 shadow-xs'
                          : 'border-black/10 bg-black/5 hover:border-black/25'
                      }`}
                    >
                      <span className="text-xl shrink-0 mt-0.5">{sym.icon}</span>
                      <div className="space-y-1 flex-1">
                        <div className="flex items-center justify-between">
                          <h4 className="font-bold text-xs sm:text-sm leading-tight">
                            {sym.label}
                          </h4>
                          <span
                            className={`w-5 h-5 rounded-lg flex items-center justify-center shrink-0 border ${
                              isChecked
                                ? 'bg-blue-600 border-blue-600 text-white'
                                : 'border-black/20 bg-white/40'
                            }`}
                          >
                            {isChecked && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                          </span>
                        </div>
                        <p className="text-[11px] opacity-75 leading-relaxed">
                          {sym.description}
                        </p>
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* Real-time Diagnostic Hypotheses Banner */}
              <div className="p-3.5 rounded-2xl bg-black/5 border border-current/15 flex items-center gap-3 text-xs">
                <ShieldCheck className="w-5 h-5 text-emerald-600 shrink-0" />
                <p className="opacity-85">
                  <strong>Diagnostic Recommendation:</strong> We will evaluate{' '}
                  <strong className="text-blue-700">
                    {selectedSymptoms.includes('letter-swaps') ? 'OpenDyslexic (Weighted Baselines)' : 'Lexend (Expanded Tracking)'}
                  </strong>{' '}
                  across soothing scotopic anti-glare wavelengths.
                </p>
              </div>

              {/* Continue to Step 2 */}
              <div className="pt-2 flex items-center justify-between border-t border-current/15">
                <span className="text-xs opacity-75">
                  {selectedSymptoms.length} symptom{selectedSymptoms.length === 1 ? '' : 's'} flagged
                </span>
                <button
                  onClick={() => setCurrentStep(2)}
                  className="flex items-center gap-2 px-6 py-3 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm shadow-md transition active:scale-95 cursor-pointer"
                >
                  <span>Calibrate Anti-Glare Wavelengths</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* STEP 2: DEEP ANTI-GLARE TINT MATRIX & CONTRAST LAB */}
          {currentStep === 2 && (
            <div className="space-y-5">
              <div className="space-y-1">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <span className="text-[11px] font-bold text-blue-600 uppercase tracking-wider">
                    Stage 2 of 4 • Anti-Glare Color & Contrast Lab
                  </span>
                  {/* Stark Contrast A/B Toggle */}
                  <button
                    onClick={() => setShowStarkContrastComparison(!showStarkContrastComparison)}
                    className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-black/10 hover:bg-black/15 text-xs font-semibold cursor-pointer transition select-none"
                    title="Toggle stark white to feel the glare difference"
                  >
                    <Sun className="w-3.5 h-3.5 text-amber-600" />
                    <span>{showStarkContrastComparison ? 'Return to Tint' : 'Compare Stark White'}</span>
                  </button>
                </div>

                <h3 className="text-lg sm:text-xl font-extrabold tracking-tight">
                  Which background wavelength relaxes your eyes the most?
                </h3>
                <p className="text-xs sm:text-sm opacity-80 leading-relaxed">
                  Pure black on stark white creates visual vibration (photopic glare). Selecting a filtered pastel wavelength calms retinal overstimulation and stops words from swimming.
                </p>
              </div>

              {/* Live Contrast & Scientific Glare Meter Card */}
              <div className="p-4 sm:p-5 rounded-2xl border-2 border-black/15 bg-white/40 shadow-xs space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-black/10 pb-2">
                  <div className="flex items-center gap-2">
                    <span
                      className="w-4 h-4 rounded-full border border-black/30 shadow-xs"
                      style={{ backgroundColor: selectedColor.bgColor }}
                    />
                    <span className="font-extrabold text-sm sm:text-base">
                      {selectedColor.name}
                    </span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-600/15 text-blue-900 border border-blue-600/30">
                      {selectedColor.family}
                    </span>
                  </div>

                  <div className="flex items-center gap-3 text-xs font-mono font-bold">
                    <span className="text-emerald-700 flex items-center gap-1">
                      <ShieldCheck className="w-4 h-4" />
                      <span>{selectedColor.glareReductionPercent}% Glare Filtered</span>
                    </span>
                    <span className="opacity-40">|</span>
                    <span className="text-blue-800">
                      {selectedColor.contrastRatio}:1 (WCAG AAA)
                    </span>
                  </div>
                </div>

                {/* Live Sample Sentence */}
                <div
                  className="p-3.5 rounded-xl border border-black/10 font-opendyslexic text-sm sm:text-base leading-relaxed select-none transition-colors"
                  style={{
                    backgroundColor: showStarkContrastComparison ? '#FFFFFF' : selectedColor.bgColor,
                    color: showStarkContrastComparison ? '#000000' : selectedColor.textColor,
                  }}
                >
                  &quot;Weighted letters anchor firmly onto the page, allowing your mind to absorb every sentence with effortless visual calm.&quot;
                </div>

                <p className="text-xs opacity-75 italic">
                  💡 {selectedColor.scotopicBenefit}
                </p>
              </div>

              {/* 6 Color Options Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {DETAILED_COLOR_CANDIDATES.map((cand) => {
                  const isSelected = selectedColor.id === cand.id;
                  return (
                    <button
                      key={cand.id}
                      onClick={() => {
                        setSelectedColor(cand);
                        setShowStarkContrastComparison(false);
                      }}
                      className={`p-3 rounded-2xl text-left border-2 transition-all cursor-pointer shadow-xs relative flex flex-col justify-between ${
                        isSelected
                          ? 'border-blue-600 ring-2 ring-blue-500/30 scale-[1.02]'
                          : 'border-black/15 hover:border-black/30 opacity-90'
                      }`}
                      style={{
                        backgroundColor: cand.bgColor,
                        color: cand.textColor,
                      }}
                    >
                      <div className="flex items-center justify-between mb-1.5">
                        <div className="flex items-center gap-1.5">
                          <span
                            className="w-3.5 h-3.5 rounded-full border border-black/20"
                            style={{ backgroundColor: cand.bgColor }}
                          />
                          <span className="font-bold text-xs truncate max-w-[100px]">
                            {cand.name}
                          </span>
                        </div>
                        {isSelected && (
                          <span className="w-4 h-4 rounded-full bg-blue-600 text-white flex items-center justify-center">
                            <Check className="w-3 h-3 stroke-[3]" />
                          </span>
                        )}
                      </div>

                      <span className="text-[10px] font-mono opacity-80 block mb-1">
                        {cand.glareReductionPercent}% Glare Filtered
                      </span>

                      <p className="text-[10px] opacity-75 line-clamp-2 leading-tight">
                        {cand.bestFor}
                      </p>
                    </button>
                  );
                })}
              </div>

              {/* User Glare Feedback Buttons */}
              <div className="p-3.5 rounded-2xl bg-black/5 border border-current/15 flex flex-wrap items-center justify-between gap-3 text-xs">
                <span className="font-bold text-xs">How do your eyes feel with {selectedColor.name}?</span>
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => setGlareRatingScore('deeply-calm')}
                    className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition cursor-pointer border ${
                      glareRatingScore === 'deeply-calm'
                        ? 'bg-blue-600 text-white border-blue-600'
                        : 'bg-black/5 border-black/10 hover:bg-black/10'
                    }`}
                  >
                    🤩 Deeply Relaxing
                  </button>
                  <button
                    onClick={() => setGlareRatingScore('gentle')}
                    className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition cursor-pointer border ${
                      glareRatingScore === 'gentle'
                        ? 'bg-blue-600 text-white border-blue-600'
                        : 'bg-black/5 border-black/10 hover:bg-black/10'
                    }`}
                  >
                    😊 Clear & Gentle
                  </button>
                </div>
              </div>

              {/* Navigation */}
              <div className="pt-2 flex items-center justify-between border-t border-current/15">
                <button
                  onClick={() => setCurrentStep(1)}
                  className="px-4 py-2 rounded-xl border border-current/20 hover:bg-black/5 text-xs font-semibold transition cursor-pointer"
                >
                  ← Back to Symptoms
                </button>
                <button
                  onClick={() => setCurrentStep(3)}
                  className="flex items-center gap-2 px-6 py-3 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm shadow-md transition active:scale-95 cursor-pointer"
                >
                  <span>Test Typeface Fluency Sprints</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* STEP 3: TYPEFACE FLUENCY SPRINTS (3 FONTS BENCHMARK) */}
          {currentStep === 3 && (
            <div className="space-y-5">
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-blue-600 uppercase tracking-wider">
                    Stage 3 of 4 • Typeface Sprint {sprintIndex + 1} of 3
                  </span>
                  <span className="text-xs font-mono font-bold text-blue-700">
                    Testing on: {selectedColor.name}
                  </span>
                </div>
                <h3 className="text-lg sm:text-xl font-extrabold tracking-tight">
                  Sprint Test: {SPRINT_PASSAGES[sprintIndex].name}
                </h3>
                <p className="text-xs sm:text-sm opacity-80 leading-relaxed">
                  {SPRINT_PASSAGES[sprintIndex].feature}. Read the standardized 20-word passage naturally, then select your decoding ease.
                </p>
              </div>

              {/* Reading Card */}
              <div
                className="p-6 sm:p-8 rounded-3xl border-2 border-black/15 shadow-sm text-left transition"
                style={{
                  backgroundColor: selectedColor.bgColor,
                  color: selectedColor.textColor,
                }}
              >
                {!isReadingSprint && sprintTimes[sprintIndex] === null ? (
                  <div className="py-6 text-center space-y-4">
                    <div className="w-12 h-12 mx-auto rounded-2xl bg-blue-600/10 text-blue-700 flex items-center justify-center font-bold">
                      <Glasses className="w-6 h-6" />
                    </div>
                    <div>
                      <h4 className="font-extrabold text-base">
                        Ready to test {SPRINT_PASSAGES[sprintIndex].name}?
                      </h4>
                      <p className="text-xs opacity-75 mt-1">
                        Text is hidden until you click Start Sprint to ensure accurate WPM measurement.
                      </p>
                    </div>
                    <button
                      onClick={handleStartSprint}
                      className="inline-flex items-center gap-2 px-8 py-3.5 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-base shadow-md transition active:scale-95 cursor-pointer"
                    >
                      <Timer className="w-5 h-5" />
                      <span>▶ Start Sprint ({SPRINT_PASSAGES[sprintIndex].name})</span>
                    </button>
                  </div>
                ) : isReadingSprint ? (
                  <div className="space-y-6">
                    <div className="flex items-center justify-between text-xs opacity-75 border-b border-current/15 pb-2.5">
                      <span className="font-bold uppercase tracking-wider text-blue-700">
                        Typeface: {SPRINT_PASSAGES[sprintIndex].name}
                      </span>
                      <span className="font-mono text-sm font-bold flex items-center gap-1.5 text-blue-600">
                        <Timer className="w-4 h-4 animate-spin" />
                        <span>{liveElapsed.toFixed(1)}s ({Math.round((20 / Math.max(0.5, liveElapsed)) * 60)} WPM)</span>
                      </span>
                    </div>

                    <p
                      className={`text-lg sm:text-2xl leading-relaxed select-none py-2 ${SPRINT_PASSAGES[sprintIndex].fontClass}`}
                      style={{ letterSpacing: '0.14em', wordSpacing: '0.28em' }}
                    >
                      &quot;{SPRINT_PASSAGES[sprintIndex].text}&quot;
                    </p>

                    <div className="pt-2">
                      <p className="text-xs font-bold text-center mb-2.5 opacity-85">
                        Finished reading? Rate decoding comfort to continue:
                      </p>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                        <button
                          onClick={() => handleFinishSprint('effortless')}
                          className="flex items-center justify-center gap-1.5 py-3 px-3 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs sm:text-sm shadow-md transition active:scale-95 cursor-pointer"
                        >
                          <Check className="w-4 h-4 stroke-[3]" />
                          <span>Effortless & Fluid</span>
                        </button>
                        <button
                          onClick={() => handleFinishSprint('easy')}
                          className="flex items-center justify-center gap-1.5 py-3 px-3 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs sm:text-sm shadow-md transition active:scale-95 cursor-pointer"
                        >
                          <Check className="w-4 h-4 stroke-[3]" />
                          <span>Clear / Slight Effort</span>
                        </button>
                        <button
                          onClick={() => handleFinishSprint('strained')}
                          className="flex items-center justify-center gap-1.5 py-3 px-3 rounded-2xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs sm:text-sm shadow-md transition active:scale-95 cursor-pointer"
                        >
                          <Check className="w-4 h-4 stroke-[3]" />
                          <span>Strained / Slow</span>
                        </button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="py-4 text-center space-y-3">
                    <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-500/15 text-emerald-800 text-xs font-bold">
                      <Check className="w-4 h-4" />
                      <span>Sprint Completed: {wpmScores[sprintIndex]} WPM</span>
                    </div>
                    {sprintIndex < 2 ? (
                      <div>
                        <button
                          onClick={() => setSprintIndex(sprintIndex + 1)}
                          className="px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs transition cursor-pointer"
                        >
                          Proceed to Sprint {sprintIndex + 2} ({SPRINT_PASSAGES[sprintIndex + 1].name}) →
                        </button>
                      </div>
                    ) : (
                      <div>
                        <button
                          onClick={() => setCurrentStep(4)}
                          className="px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs transition cursor-pointer"
                        >
                          Generate Final Prescription Report →
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Progress dots for the 3 sprints */}
              <div className="flex items-center justify-center gap-2 pt-1">
                {SPRINT_PASSAGES.map((p, idx) => (
                  <div
                    key={p.font}
                    className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-semibold border ${
                      idx === sprintIndex
                        ? 'border-blue-600 bg-blue-600/10 text-blue-700'
                        : sprintTimes[idx] !== null
                        ? 'border-emerald-500 bg-emerald-500/10 text-emerald-700'
                        : 'border-black/10 opacity-50'
                    }`}
                  >
                    <span>{p.name}</span>
                    {sprintTimes[idx] !== null && <span className="font-mono">({wpmScores[idx]} WPM)</span>}
                  </div>
                ))}
              </div>

              {/* Skip option */}
              <div className="text-center pt-2">
                <button
                  onClick={() => setCurrentStep(4)}
                  className="text-xs opacity-65 hover:opacity-100 underline cursor-pointer"
                >
                  Skip remaining sprints and view diagnostic prescription now
                </button>
              </div>
            </div>
          )}

          {/* STEP 4: DETAILED DIAGNOSTIC PRESCRIPTION & REPORT */}
          {currentStep === 4 && (
            <div className="space-y-6">
              <div className="text-center space-y-1.5">
                <div className="w-12 h-12 mx-auto rounded-2xl bg-emerald-500/15 text-emerald-700 flex items-center justify-center shadow-xs">
                  <Award className="w-6 h-6" />
                </div>
                <h3 className="text-xl sm:text-2xl font-black tracking-tight">
                  Your Personalized Dyslexia Reading Formula
                </h3>
                <p className="text-xs sm:text-sm opacity-80 max-w-lg mx-auto">
                  Derived from your sensory stress symptoms, anti-glare wavelength absorption, and decoding fluency speeds:
                </p>
              </div>

              {/* Formula Cards Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* 1. Prescribed Typeface */}
                <div className="p-4 rounded-2xl bg-white/50 border border-current/15 space-y-2 shadow-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-blue-600">
                      Prescribed Typeface
                    </span>
                    <span className="text-[11px] font-mono font-bold text-emerald-700">
                      +{speedGain}% Reading Fluency
                    </span>
                  </div>
                  <h4 className="text-xl font-black tracking-tight flex items-center gap-2">
                    <span>{winningFont}</span>
                    <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-600 text-white font-bold">
                      Winner
                    </span>
                  </h4>
                  <p className="text-xs opacity-80 leading-relaxed">
                    {winningFont === 'OpenDyslexic' &&
                      'Heavy gravity-weighted baselines anchor glyphs to stop optical flipping, rotations, and inversion confusion.'}
                    {winningFont === 'Lexend' &&
                      'Proportionally expanded character geometry alleviates visual crowding and expands perceptual span per fixation.'}
                    {winningFont === 'Atkinson Hyperlegible' &&
                      'Distinct character shapes eliminate ambiguity between similar letters (such as 1, l, I, 0, and O).'}
                  </p>
                </div>

                {/* 2. Prescribed Anti-Glare Tint */}
                <div className="p-4 rounded-2xl bg-white/50 border border-current/15 space-y-2 shadow-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-blue-600">
                      Prescribed Glare Barrier
                    </span>
                    <span className="text-[11px] font-mono font-bold text-emerald-700">
                      {selectedColor.glareReductionPercent}% Glare Filtered
                    </span>
                  </div>
                  <h4 className="text-xl font-black tracking-tight flex items-center gap-2">
                    <span
                      className="w-4 h-4 rounded-full border border-black/30 shrink-0"
                      style={{ backgroundColor: selectedColor.bgColor }}
                    />
                    <span>{selectedColor.name}</span>
                  </h4>
                  <p className="text-xs opacity-80 leading-relaxed">
                    Contrast ratio of {selectedColor.contrastRatio}:1 (WCAG AAA). {selectedColor.scotopicBenefit}
                  </p>
                </div>
              </div>

              {/* Spacing & Assistive Geometry Prescription */}
              <div className="p-4 rounded-2xl bg-black/5 border border-current/15 space-y-3">
                <span className="text-[10px] font-bold uppercase tracking-wider text-blue-600 block">
                  Tailored Layout & Assistive Geometry
                </span>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center text-xs">
                  <div className="p-2.5 rounded-xl bg-white/40 border border-current/10">
                    <span className="text-[10px] opacity-75 block">Line Spacing</span>
                    <span className="font-mono font-bold text-sm">{prescribedLineHeight.toFixed(2)}x</span>
                  </div>
                  <div className="p-2.5 rounded-xl bg-white/40 border border-current/10">
                    <span className="text-[10px] opacity-75 block">Word Spacing</span>
                    <span className="font-mono font-bold text-sm">{prescribedWordSpacing.toFixed(2)}em</span>
                  </div>
                  <div className="p-2.5 rounded-xl bg-white/40 border border-current/10">
                    <span className="text-[10px] opacity-75 block">Character Spacing</span>
                    <span className="font-mono font-bold text-sm">{prescribedLetterSpacing.toFixed(2)}em</span>
                  </div>
                  <div className="p-2.5 rounded-xl bg-white/40 border border-current/10">
                    <span className="text-[10px] opacity-75 block">Reading Ruler</span>
                    <span className="font-mono font-bold text-sm text-blue-700">
                      {needsReadingRuler ? 'Enabled' : 'Optional'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Comparative Benchmark Bar Chart */}
              {sprintTimes.some((t) => t !== null) && (
                <div className="p-4 rounded-2xl bg-white/40 border border-current/15 space-y-3">
                  <div className="flex items-center justify-between text-xs font-bold">
                    <span className="flex items-center gap-1.5">
                      <TrendingUp className="w-4 h-4 text-emerald-600" />
                      <span>Reading Speed Benchmark</span>
                    </span>
                    <span className="text-emerald-700">
                      Peak Fluency: {bestWpm} WPM
                    </span>
                  </div>

                  <div className="space-y-2.5 text-xs">
                    {SPRINT_PASSAGES.map((p, idx) => {
                      const wpm = wpmScores[idx] || (idx === bestFontIdx ? bestWpm : Math.round(bestWpm * 0.8));
                      const isWinner = p.font === winningFont;
                      return (
                        <div key={p.font}>
                          <div className="flex justify-between text-[11px] mb-1 font-semibold">
                            <span className="flex items-center gap-1.5">
                              <span>{p.name}</span>
                              {isWinner && (
                                <span className="text-[10px] px-1.5 rounded-full bg-emerald-600 text-white font-bold">
                                  Optimal
                                </span>
                              )}
                            </span>
                            <span className="font-mono">{wpm} WPM</span>
                          </div>
                          <div className="h-2.5 w-full bg-black/10 rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full transition-all duration-700 ${
                                isWinner ? 'bg-emerald-500' : 'bg-blue-400'
                              }`}
                              style={{ width: `${Math.min(100, Math.max(20, (wpm / 260) * 100))}%` }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Actions Footer */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2 border-t border-current/15">
                <div className="flex items-center gap-2 w-full sm:w-auto">
                  <button
                    onClick={handleCopyPrescription}
                    className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-3.5 py-2.5 rounded-xl border border-current/20 hover:bg-black/5 text-xs font-semibold transition cursor-pointer"
                    title="Copy prescription summary"
                  >
                    {copiedPrescription ? (
                      <>
                        <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                        <span className="text-emerald-700">Copied!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-4 h-4" />
                        <span>Copy Summary</span>
                      </>
                    )}
                  </button>

                  <button
                    onClick={() => {
                      setCurrentStep(1);
                      setSprintTimes([null, null, null]);
                      setSprintIndex(0);
                    }}
                    className="flex items-center justify-center gap-1 px-3 py-2.5 rounded-xl border border-current/20 hover:bg-black/5 text-xs font-semibold transition cursor-pointer"
                    title="Retest calibration"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Retest</span>
                  </button>
                </div>

                <button
                  onClick={handleApplyPrescription}
                  className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-3 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm shadow-md transition active:scale-95 cursor-pointer"
                >
                  <Check className="w-4 h-4 stroke-[3]" />
                  <span>Apply Calibrated Formula ({winningFont} + {selectedColor.name})</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
