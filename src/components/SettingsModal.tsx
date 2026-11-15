import React, { useState } from 'react';
import {
  X,
  RotateCcw,
  Sliders,
  Palette,
  AlignLeft,
  Check,
  ShieldCheck,
  AlertTriangle,
  Type,
  BookOpen,
  Zap,
} from 'lucide-react';
import {
  DyslexiaSettings,
  FontFamily,
  COLOR_PRESETS,
  DEFAULT_SETTINGS,
} from '../types';
import { evaluateDyslexiaGlare } from '../utils/contrast';
import { PWAInstallButton } from './PWAInstallButton';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: DyslexiaSettings;
  onUpdateSettings: (newSettings: DyslexiaSettings) => void;
  onResetDefaults: () => void;
  onOpenCalibration?: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  settings,
  onUpdateSettings,
  onResetDefaults,
  onOpenCalibration,
}) => {
  const [activeTab, setActiveTab] = useState<'spacing' | 'colors' | 'tools' | 'typography'>('spacing');

  if (!isOpen) return null;

  const glareAssessment = evaluateDyslexiaGlare(
    settings.backgroundColor,
    settings.textColor
  );

  const applyPreset = (presetId: string) => {
    const preset = COLOR_PRESETS.find((p) => p.id === presetId);
    if (!preset) return;

    onUpdateSettings({
      ...settings,
      backgroundColor: preset.bgColor,
      textColor: preset.textColor,
    });
  };

  return (
    <div
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-150"
    >
      <div className="relative w-full max-w-2xl bg-[#FAF4E8] text-[#2D3142] rounded-3xl shadow-2xl border border-stone-300 overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-stone-200 bg-[#F5EEDB]">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-blue-600/15 text-blue-800 flex items-center justify-center font-bold">
              <Sliders className="w-5 h-5 text-blue-700" />
            </div>
            <div>
              <h3 className="font-semibold text-lg text-stone-900 tracking-tight">
                Dyslexia Reading Settings
              </h3>
              <p className="text-xs text-stone-600">
                Scientifically tuned typography, glare reduction, and spacing
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={onResetDefaults}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-stone-200/80 hover:bg-stone-300 text-stone-700 text-xs font-medium transition cursor-pointer"
              title="Reset to recommended dyslexia settings"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Reset Defaults</span>
            </button>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-stone-200 hover:bg-stone-300 text-stone-700 flex items-center justify-center transition cursor-pointer"
              aria-label="Close settings"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-stone-200 px-6 bg-[#FAF4E8] overflow-x-auto gap-4">
          <button
            onClick={() => setActiveTab('spacing')}
            className={`py-3 text-xs sm:text-sm font-semibold flex items-center gap-1.5 border-b-2 whitespace-nowrap transition cursor-pointer ${
              activeTab === 'spacing'
                ? 'border-blue-600 text-blue-900'
                : 'border-transparent text-stone-500 hover:text-stone-800'
            }`}
          >
            <AlignLeft className="w-4 h-4" />
            <span>Spacing & Layout</span>
          </button>
          <button
            onClick={() => setActiveTab('colors')}
            className={`py-3 text-xs sm:text-sm font-semibold flex items-center gap-1.5 border-b-2 whitespace-nowrap transition cursor-pointer ${
              activeTab === 'colors'
                ? 'border-blue-600 text-blue-900'
                : 'border-transparent text-stone-500 hover:text-stone-800'
            }`}
          >
            <Palette className="w-4 h-4" />
            <span>Colors & Anti-Glare</span>
          </button>
          <button
            onClick={() => setActiveTab('typography')}
            className={`py-3 text-xs sm:text-sm font-semibold flex items-center gap-1.5 border-b-2 whitespace-nowrap transition cursor-pointer ${
              activeTab === 'typography'
                ? 'border-blue-600 text-blue-900'
                : 'border-transparent text-stone-500 hover:text-stone-800'
            }`}
          >
            <Type className="w-4 h-4" />
            <span>Font & Text Size</span>
          </button>
          <button
            onClick={() => setActiveTab('tools')}
            className={`py-3 text-xs sm:text-sm font-semibold flex items-center gap-1.5 border-b-2 whitespace-nowrap transition cursor-pointer ${
              activeTab === 'tools'
                ? 'border-blue-600 text-blue-900'
                : 'border-transparent text-stone-500 hover:text-stone-800'
            }`}
          >
            <BookOpen className="w-4 h-4" />
            <span>Reading Ruler & Mask</span>
          </button>
        </div>

        {/* Tab Body */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1">
          {/* PWA App Installation Option */}
          <PWAInstallButton variant="settings" />

          {/* Dyslexia Reading Calibration Banner */}
          {onOpenCalibration && (
            <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex flex-wrap items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-amber-500/20 text-amber-800 flex items-center justify-center shrink-0">
                  <Zap className="w-4 h-4 fill-current" />
                </div>
                <div>
                  <h4 className="font-bold text-sm text-amber-950">
                    Not sure which color and font works best for your eyes?
                  </h4>
                  <p className="text-amber-900/80 mt-0.5">
                    Run the comprehensive calibration assessment to identify your symptoms, optimal anti-glare tint, and font fluency speed.
                  </p>
                </div>
              </div>
              <button
                onClick={() => {
                  onClose();
                  onOpenCalibration();
                }}
                className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs transition active:scale-95 cursor-pointer shadow-xs whitespace-nowrap ml-auto sm:ml-0"
              >
                Run Calibration →
              </button>
            </div>
          )}

          {/* 1. SPACING AND LAYOUT */}
          {activeTab === 'spacing' && (
            <div className="space-y-6">
              {/* Line Length (50-75 characters / 11-15 words) */}
              <div className="bg-white/60 p-4 rounded-2xl border border-stone-200">
                <div className="flex justify-between items-center mb-1">
                  <label htmlFor="line-length-slider" className="text-sm font-semibold text-stone-900">
                    Line Length (Characters Per Line)
                  </label>
                  <span className="text-xs font-mono px-2 py-0.5 rounded bg-blue-100 text-blue-900 font-bold">
                    {settings.maxCharactersPerLine} chars (~{Math.round(settings.maxCharactersPerLine / 5)} words)
                  </span>
                </div>
                <p className="text-xs text-stone-600 mb-3">
                  Dyslexia research recommends keeping lines between 50–75 characters (11–15 words) so eyes do not lose their place when returning to the start of the next line.
                </p>
                <input
                  id="line-length-slider"
                  type="range"
                  min={48}
                  max={75}
                  step={1}
                  value={settings.maxCharactersPerLine}
                  onChange={(e) =>
                    onUpdateSettings({
                      ...settings,
                      maxCharactersPerLine: Number(e.target.value),
                    })
                  }
                  className="w-full accent-blue-600 cursor-pointer"
                />
                <div className="flex justify-between text-[11px] text-stone-500 mt-1">
                  <span>50 chars (Short / Focused)</span>
                  <span className="font-semibold text-blue-700">62 chars (Optimal)</span>
                  <span>75 chars (Standard Max)</span>
                </div>
              </div>

              {/* Line Spacing (~1.5x) */}
              <div className="bg-white/60 p-4 rounded-2xl border border-stone-200">
                <div className="flex justify-between items-center mb-1">
                  <label htmlFor="line-height-slider" className="text-sm font-semibold text-stone-900">
                    Line Spacing (Height)
                  </label>
                  <span className="text-xs font-mono px-2 py-0.5 rounded bg-blue-100 text-blue-900 font-bold">
                    {settings.lineHeight.toFixed(2)}x
                  </span>
                </div>
                <p className="text-xs text-stone-600 mb-3">
                  Generous vertical line spacing (around 1.5x – 1.8x) prevents lines from blurring together or overlapping in visual perception.
                </p>
                <input
                  id="line-height-slider"
                  type="range"
                  min={1.4}
                  max={2.3}
                  step={0.05}
                  value={settings.lineHeight}
                  onChange={(e) =>
                    onUpdateSettings({
                      ...settings,
                      lineHeight: Number(e.target.value),
                    })
                  }
                  className="w-full accent-blue-600 cursor-pointer"
                />
                <div className="flex justify-between text-[11px] text-stone-500 mt-1">
                  <span>1.4x</span>
                  <span className="font-semibold text-blue-700">1.75x (Recommended)</span>
                  <span>2.3x (Extra Spaced)</span>
                </div>
              </div>

              {/* Character & Word Spacing */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Character Spacing */}
                <div className="bg-white/60 p-4 rounded-2xl border border-stone-200">
                  <div className="flex justify-between items-center mb-1">
                    <label htmlFor="char-spacing-slider" className="text-sm font-semibold text-stone-900">
                      Character Spacing
                    </label>
                    <span className="text-xs font-mono px-2 py-0.5 rounded bg-blue-100 text-blue-900 font-bold">
                      {settings.letterSpacing.toFixed(2)}em
                    </span>
                  </div>
                  <p className="text-[11px] text-stone-600 mb-3">
                    Increasing letter spacing prevents letter crowding.
                  </p>
                  <input
                    id="char-spacing-slider"
                    type="range"
                    min={0.0}
                    max={0.35}
                    step={0.02}
                    value={settings.letterSpacing}
                    onChange={(e) =>
                      onUpdateSettings({
                        ...settings,
                        letterSpacing: Number(e.target.value),
                      })
                    }
                    className="w-full accent-blue-600 cursor-pointer"
                  />
                </div>

                {/* Word Spacing */}
                <div className="bg-white/60 p-4 rounded-2xl border border-stone-200">
                  <div className="flex justify-between items-center mb-1">
                    <label htmlFor="word-spacing-slider" className="text-sm font-semibold text-stone-900">
                      Word Spacing
                    </label>
                    <span className="text-xs font-mono px-2 py-0.5 rounded bg-blue-100 text-blue-900 font-bold">
                      {settings.wordSpacing.toFixed(2)}em
                    </span>
                  </div>
                  <p className="text-[11px] text-stone-600 mb-3">
                    Expands space between words to define word boundaries.
                  </p>
                  <input
                    id="word-spacing-slider"
                    type="range"
                    min={0.05}
                    max={0.5}
                    step={0.03}
                    value={settings.wordSpacing}
                    onChange={(e) =>
                      onUpdateSettings({
                        ...settings,
                        wordSpacing: Number(e.target.value),
                      })
                    }
                    className="w-full accent-blue-600 cursor-pointer"
                  />
                </div>
              </div>

              {/* Text Alignment: Left-aligned with ragged right edge */}
              <div className="bg-white/60 p-4 rounded-2xl border border-stone-200">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-sm font-semibold text-stone-900">
                      Alignment: Left with Ragged Right Edge
                    </h4>
                    <p className="text-xs text-stone-600 mt-0.5">
                      Never justified. Fully justified text creates irregular gaps called &quot;rivers of white&quot; that confuse word tracking. Left alignment provides an uneven ragged right edge that anchors reading rhythm.
                    </p>
                  </div>
                  <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 text-xs font-semibold shrink-0">
                    <Check className="w-3.5 h-3.5" />
                    <span>Ragged Right Active</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* 2. COLORS & GLARE REDUCTION */}
          {activeTab === 'colors' && (
            <div className="space-y-6">
              {/* Glare and Contrast Assessment Card */}
              <div
                className={`p-4 rounded-2xl border flex items-start gap-3 ${
                  glareAssessment.isStarkWhiteBlack
                    ? 'bg-amber-100/80 border-amber-300 text-amber-900'
                    : 'bg-emerald-50 border-emerald-300 text-emerald-900'
                }`}
              >
                {glareAssessment.isStarkWhiteBlack ? (
                  <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                ) : (
                  <ShieldCheck className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                )}
                <div>
                  <div className="flex items-center gap-2">
                    <h4 className="font-semibold text-sm">
                      {glareAssessment.glareRating} Anti-Glare Rating
                    </h4>
                    <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-black/10 font-bold">
                      Contrast {glareAssessment.contrastRatio}:1 ({glareAssessment.wcagLevel})
                    </span>
                  </div>
                  <p className="text-xs mt-1 opacity-90">{glareAssessment.message}</p>
                </div>
              </div>

              {/* Pre-configured Dyslexia Color Profiles */}
              <div>
                <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-2.5">
                  Recommended Dyslexia Color Palettes
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {COLOR_PRESETS.map((preset) => {
                    const isSelected =
                      settings.backgroundColor.toLowerCase() === preset.bgColor.toLowerCase();

                    return (
                      <button
                        key={preset.id}
                        type="button"
                        onClick={() => applyPreset(preset.id)}
                        className={`p-3.5 rounded-2xl border text-left transition relative cursor-pointer flex flex-col justify-between ${
                          isSelected
                            ? 'border-blue-600 ring-2 ring-blue-500/30 shadow-sm'
                            : 'border-stone-200 hover:border-stone-400 bg-white/40'
                        }`}
                        style={{ backgroundColor: preset.bgColor, color: preset.textColor }}
                      >
                        <div className="flex items-center justify-between w-full mb-1">
                          <span className="font-semibold text-sm flex items-center gap-1.5">
                            {preset.name}
                            {preset.badge && (
                              <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-blue-600 text-white font-bold">
                                {preset.badge}
                              </span>
                            )}
                          </span>
                          {isSelected && <Check className="w-4 h-4 text-blue-600" />}
                        </div>
                        <p className="text-xs opacity-80 leading-relaxed">
                          {preset.description}
                        </p>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Custom Color Pickers */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-stone-200">
                <div>
                  <label htmlFor="bg-color-picker" className="block text-xs font-semibold text-stone-800 mb-1.5">
                    Background Color (Soft / Pastel)
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      id="bg-color-picker"
                      type="color"
                      value={settings.backgroundColor}
                      onChange={(e) =>
                        onUpdateSettings({ ...settings, backgroundColor: e.target.value })
                      }
                      className="w-10 h-10 rounded-xl border border-stone-300 cursor-pointer p-0.5"
                    />
                    <input
                      type="text"
                      value={settings.backgroundColor}
                      onChange={(e) =>
                        onUpdateSettings({ ...settings, backgroundColor: e.target.value })
                      }
                      className="px-3 py-2 rounded-xl border border-stone-300 bg-white text-xs font-mono w-28 uppercase"
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="text-color-picker" className="block text-xs font-semibold text-stone-800 mb-1.5">
                    Text Color (Dark Grey / Off-Black)
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      id="text-color-picker"
                      type="color"
                      value={settings.textColor}
                      onChange={(e) =>
                        onUpdateSettings({ ...settings, textColor: e.target.value })
                      }
                      className="w-10 h-10 rounded-xl border border-stone-300 cursor-pointer p-0.5"
                    />
                    <input
                      type="text"
                      value={settings.textColor}
                      onChange={(e) =>
                        onUpdateSettings({ ...settings, textColor: e.target.value })
                      }
                      className="px-3 py-2 rounded-xl border border-stone-300 bg-white text-xs font-mono w-28 uppercase"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* 3. TYPOGRAPHY */}
          {activeTab === 'typography' && (
            <div className="space-y-6">
              {/* Font Family Selector */}
              <div>
                <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-2.5">
                  Dyslexia-Optimized Typeface
                </label>
                <div className="space-y-2.5">
                  {[
                    {
                      id: 'OpenDyslexic' as FontFamily,
                      name: 'OpenDyslexic (Default)',
                      desc: 'Bottom-weighted letter shapes prevent rotating, flipping, and confusing mirror letters (b/d, p/q).',
                      fontClass: 'font-opendyslexic',
                      badge: 'Primary',
                    },
                    {
                      id: 'Lexend' as FontFamily,
                      name: 'Lexend',
                      desc: 'Empirically engineered font shown to reduce visual crowding and increase reading fluency.',
                      fontClass: 'font-lexend',
                    },
                    {
                      id: 'Atkinson Hyperlegible' as FontFamily,
                      name: 'Atkinson Hyperlegible',
                      desc: 'Created by the Braille Institute for unambiguous character shape distinction.',
                      fontClass: 'font-atkinson',
                    },
                    {
                      id: 'Comic Neue' as FontFamily,
                      name: 'Comic Neue',
                      desc: 'Asymmetric informal letterforms often preferred by younger dyslexic students.',
                      fontClass: 'font-comic',
                    },
                    {
                      id: 'System Sans' as FontFamily,
                      name: 'System Sans-Serif',
                      desc: 'Clean modern humanist sans-serif without serif clutter.',
                      fontClass: 'font-system',
                    },
                  ].map((font) => (
                    <button
                      key={font.id}
                      type="button"
                      onClick={() => onUpdateSettings({ ...settings, fontFamily: font.id })}
                      className={`w-full p-3.5 rounded-2xl border text-left transition flex items-center justify-between cursor-pointer ${
                        settings.fontFamily === font.id
                          ? 'border-blue-600 bg-blue-50/70 ring-2 ring-blue-500/20'
                          : 'border-stone-200 bg-white/50 hover:bg-white'
                      }`}
                    >
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-2">
                          <span className={`text-base font-semibold ${font.fontClass}`}>
                            {font.name}
                          </span>
                          {font.badge && (
                            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-blue-600 text-white font-bold">
                              {font.badge}
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-stone-600">{font.desc}</p>
                      </div>
                      {settings.fontFamily === font.id && (
                        <Check className="w-5 h-5 text-blue-600 shrink-0 ml-3" />
                      )}
                    </button>
                  ))}
                </div>
              </div>

              {/* Font Size */}
              <div className="bg-white/60 p-4 rounded-2xl border border-stone-200">
                <div className="flex justify-between items-center mb-1">
                  <label htmlFor="font-size-slider" className="text-sm font-semibold text-stone-900">
                    Font Size
                  </label>
                  <span className="text-xs font-mono px-2 py-0.5 rounded bg-blue-100 text-blue-900 font-bold">
                    {settings.fontSize}px
                  </span>
                </div>
                <input
                  id="font-size-slider"
                  type="range"
                  min={16}
                  max={34}
                  step={1}
                  value={settings.fontSize}
                  onChange={(e) =>
                    onUpdateSettings({ ...settings, fontSize: Number(e.target.value) })
                  }
                  className="w-full accent-blue-600 cursor-pointer"
                />
                <div className="flex justify-between text-[11px] text-stone-500 mt-1">
                  <span>16px (Small)</span>
                  <span className="font-semibold text-blue-700">20px (Default)</span>
                  <span>34px (Extra Large)</span>
                </div>
              </div>
            </div>
          )}

          {/* 4. READING RULER & ASSISTIVE TOOLS */}
          {activeTab === 'tools' && (
            <div className="space-y-6">
              {/* Reading Ruler Toggle */}
              <div className="bg-white/60 p-4 rounded-2xl border border-stone-200 space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-sm font-semibold text-stone-900">
                      Reading Ruler / Focus Highlight
                    </h4>
                    <p className="text-xs text-stone-600">
                      Displays a movable horizontal strip that follows your cursor to keep your place.
                    </p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={settings.readingRuler}
                      onChange={(e) =>
                        onUpdateSettings({ ...settings, readingRuler: e.target.checked })
                      }
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-stone-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600" />
                  </label>
                </div>

                {settings.readingRuler && (
                  <div className="pt-3 border-t border-stone-200 space-y-3">
                    <div>
                      <div className="flex justify-between text-xs mb-1">
                        <label htmlFor="ruler-height-slider" className="font-medium text-stone-700">Ruler Height</label>
                        <span className="font-mono">{settings.rulerHeight}px</span>
                      </div>
                      <input
                        id="ruler-height-slider"
                        type="range"
                        min={30}
                        max={80}
                        value={settings.rulerHeight}
                        onChange={(e) =>
                          onUpdateSettings({
                            ...settings,
                            rulerHeight: Number(e.target.value),
                          })
                        }
                        className="w-full accent-blue-600 cursor-pointer"
                      />
                    </div>

                    <div>
                      <div className="flex justify-between text-xs mb-1">
                        <label htmlFor="ruler-opacity-slider" className="font-medium text-stone-700">Highlight Tint Intensity</label>
                        <span className="font-mono">{Math.round(settings.rulerOpacity * 100)}%</span>
                      </div>
                      <input
                        id="ruler-opacity-slider"
                        type="range"
                        min={0.1}
                        max={0.5}
                        step={0.02}
                        value={settings.rulerOpacity}
                        onChange={(e) =>
                          onUpdateSettings({
                            ...settings,
                            rulerOpacity: Number(e.target.value),
                          })
                        }
                        className="w-full accent-blue-600 cursor-pointer"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Reading Mask Toggle */}
              <div className="bg-white/60 p-4 rounded-2xl border border-stone-200">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-sm font-semibold text-stone-900">
                      Reading Mask (Dim Outer Text)
                    </h4>
                    <p className="text-xs text-stone-600">
                      Gently dims lines above and below your active reading ruler to eliminate visual distraction.
                    </p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={settings.readingMask}
                      onChange={(e) =>
                        onUpdateSettings({
                          ...settings,
                          readingMask: e.target.checked,
                          readingRuler: e.target.checked ? true : settings.readingRuler,
                        })
                      }
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-stone-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600" />
                  </label>
                </div>
              </div>

              {/* Bionic Reading Fixation Mode */}
              <div className="bg-white/60 p-4 rounded-2xl border border-stone-200">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-sm font-semibold text-stone-900">
                      Bionic Reading Fixation Points
                    </h4>
                    <p className="text-xs text-stone-600">
                      Emphasizes the first letters of each word in bold, guiding the eye through the sentence smoothly.
                    </p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={settings.bionicReading}
                      onChange={(e) =>
                        onUpdateSettings({
                          ...settings,
                          bionicReading: e.target.checked,
                        })
                      }
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-stone-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600" />
                  </label>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-stone-200 bg-[#F5EEDB] flex justify-end">
          <button
            onClick={onClose}
            className="px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm shadow-sm transition cursor-pointer"
          >
            Apply & Close
          </button>
        </div>
      </div>
    </div>
  );
};
