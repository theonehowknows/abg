import React from 'react';
import { X, Check, Eye, BookOpen, Sliders, Sparkles, RefreshCw } from 'lucide-react';
import { DyslexiaSettings, COLOR_PRESETS, FONT_OPTIONS, FontOption } from '../types';

interface MobileVisualsDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  settings: DyslexiaSettings;
  onUpdateSettings: (newSettings: DyslexiaSettings) => void;
  onResetDefaults?: () => void;
}

export const MobileVisualsDrawer: React.FC<MobileVisualsDrawerProps> = ({
  isOpen,
  onClose,
  settings,
  onUpdateSettings,
  onResetDefaults,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 sm:hidden flex flex-col justify-end">
      {/* Dimmed backdrop */}
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-xs transition-opacity"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Slide-up Sheet */}
      <div
        className="relative z-10 w-full max-h-[85vh] overflow-y-auto rounded-t-3xl shadow-2xl border-t border-black/10 p-5 space-y-5 animate-in slide-in-from-bottom duration-250 pb-[max(1.5rem,env(safe-area-inset-bottom))]"
        style={{
          backgroundColor: settings.backgroundColor,
          color: settings.textColor,
        }}
      >
        {/* Handle bar */}
        <div className="w-12 h-1.5 bg-current/25 rounded-full mx-auto" />

        {/* Header */}
        <div className="flex items-center justify-between pb-2 border-b border-current/10">
          <div className="flex items-center gap-2">
            <Sliders className="w-5 h-5 text-blue-600" />
            <h3 className="font-bold text-base tracking-tight">
              Mobile Vision & Reading Comfort
            </h3>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-current/10 flex items-center justify-center hover:bg-current/15 transition cursor-pointer"
            aria-label="Close vision drawer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Anti-Glare Tint Swatches (1-Tap Selection) */}
        <div>
          <label className="block text-xs font-bold uppercase tracking-wider opacity-70 mb-2">
            Anti-Glare Tint (Reduces Visual Stress)
          </label>
          <div className="grid grid-cols-2 gap-2">
            {COLOR_PRESETS.map((preset) => {
              const isSelected =
                settings.backgroundColor.toLowerCase() === preset.bgColor.toLowerCase();

              return (
                <button
                  key={preset.id}
                  onClick={() => {
                    onUpdateSettings({
                      ...settings,
                      backgroundColor: preset.bgColor,
                      textColor: preset.textColor,
                    });
                  }}
                  className={`flex items-center justify-between p-2.5 rounded-2xl border text-xs font-semibold transition active:scale-95 cursor-pointer touch-manipulation ${
                    isSelected
                      ? 'border-blue-600 ring-2 ring-blue-500 shadow-sm'
                      : 'border-black/15 hover:border-black/30'
                  }`}
                  style={{
                    backgroundColor: preset.bgColor,
                    color: preset.textColor,
                  }}
                >
                  <div className="flex items-center gap-2">
                    <span
                      className="w-4 h-4 rounded-full border border-black/25 shrink-0"
                      style={{ backgroundColor: preset.bgColor }}
                    />
                    <span className="truncate">{preset.name}</span>
                  </div>
                  {isSelected && <Check className="w-4 h-4 text-blue-600 shrink-0" />}
                </button>
              );
            })}
          </div>
        </div>

        {/* Font Selection */}
        <div>
          <label className="block text-xs font-bold uppercase tracking-wider opacity-70 mb-2">
            Dyslexia-Friendly Font
          </label>
          <div className="grid grid-cols-2 gap-2">
            {FONT_OPTIONS.map((f: FontOption) => {
              const isSelected = settings.fontFamily === f.value;
              return (
                <button
                  key={f.value}
                  onClick={() => onUpdateSettings({ ...settings, fontFamily: f.value })}
                  className={`p-2.5 rounded-2xl text-left border text-xs transition active:scale-95 cursor-pointer touch-manipulation ${
                    isSelected
                      ? 'bg-blue-600 text-white border-blue-600 font-bold shadow-sm'
                      : 'bg-current/5 border-current/15 hover:bg-current/10 font-medium'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="truncate">{f.label}</span>
                    {isSelected && <Check className="w-3.5 h-3.5 shrink-0" />}
                  </div>
                  <span className="text-[10px] opacity-75 block truncate mt-0.5">
                    {f.description}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Font Size & Line Spacing Steppers */}
        <div className="grid grid-cols-2 gap-3">
          {/* Font Size */}
          <div className="p-3 rounded-2xl bg-current/5 border border-current/10 space-y-1.5">
            <span className="text-[11px] font-bold opacity-70 block">Font Size</span>
            <div className="flex items-center justify-between">
              <button
                onClick={() =>
                  onUpdateSettings({ ...settings, fontSize: Math.max(16, settings.fontSize - 1) })
                }
                disabled={settings.fontSize <= 16}
                className="w-9 h-9 rounded-xl bg-current/10 hover:bg-current/15 font-bold flex items-center justify-center disabled:opacity-30 active:scale-95 cursor-pointer touch-manipulation"
              >
                -
              </button>
              <span className="font-mono font-bold text-sm">{settings.fontSize}px</span>
              <button
                onClick={() =>
                  onUpdateSettings({ ...settings, fontSize: Math.min(34, settings.fontSize + 1) })
                }
                disabled={settings.fontSize >= 34}
                className="w-9 h-9 rounded-xl bg-current/10 hover:bg-current/15 font-bold flex items-center justify-center disabled:opacity-30 active:scale-95 cursor-pointer touch-manipulation"
              >
                +
              </button>
            </div>
          </div>

          {/* Line Height */}
          <div className="p-3 rounded-2xl bg-current/5 border border-current/10 space-y-1.5">
            <span className="text-[11px] font-bold opacity-70 block">Line Spacing</span>
            <div className="flex items-center justify-between">
              <button
                onClick={() =>
                  onUpdateSettings({
                    ...settings,
                    lineHeight: Math.max(1.3, Number((settings.lineHeight - 0.1).toFixed(1))),
                  })
                }
                disabled={settings.lineHeight <= 1.3}
                className="w-9 h-9 rounded-xl bg-current/10 hover:bg-current/15 font-bold flex items-center justify-center disabled:opacity-30 active:scale-95 cursor-pointer touch-manipulation"
              >
                -
              </button>
              <span className="font-mono font-bold text-sm">{settings.lineHeight.toFixed(1)}x</span>
              <button
                onClick={() =>
                  onUpdateSettings({
                    ...settings,
                    lineHeight: Math.min(2.5, Number((settings.lineHeight + 0.1).toFixed(1))),
                  })
                }
                disabled={settings.lineHeight >= 2.5}
                className="w-9 h-9 rounded-xl bg-current/10 hover:bg-current/15 font-bold flex items-center justify-center disabled:opacity-30 active:scale-95 cursor-pointer touch-manipulation"
              >
                +
              </button>
            </div>
          </div>
        </div>

        {/* Assistive Visual Toggles */}
        <div className="space-y-2 pt-1">
          {/* Reading Ruler Toggle */}
          <button
            onClick={() => onUpdateSettings({ ...settings, readingRuler: !settings.readingRuler })}
            className={`w-full flex items-center justify-between p-3 rounded-2xl border text-xs font-semibold transition active:scale-98 cursor-pointer touch-manipulation ${
              settings.readingRuler
                ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                : 'bg-current/5 border-current/10 hover:bg-current/10'
            }`}
          >
            <div className="flex items-center gap-2.5">
              <Eye className="w-4 h-4 shrink-0" />
              <div className="text-left">
                <p className="font-bold">Reading Ruler Guide</p>
                <p className={`text-[10px] ${settings.readingRuler ? 'text-white/80' : 'opacity-65'}`}>
                  Follows your finger/scroll to lock focus on the active sentence
                </p>
              </div>
            </div>
            <span className="font-bold uppercase text-[11px] ml-2">
              {settings.readingRuler ? 'ON' : 'OFF'}
            </span>
          </button>

          {/* Bionic Reading Toggle */}
          <button
            onClick={() => onUpdateSettings({ ...settings, bionicReading: !settings.bionicReading })}
            className={`w-full flex items-center justify-between p-3 rounded-2xl border text-xs font-semibold transition active:scale-98 cursor-pointer touch-manipulation ${
              settings.bionicReading
                ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                : 'bg-current/5 border-current/10 hover:bg-current/10'
            }`}
          >
            <div className="flex items-center gap-2.5">
              <Sparkles className="w-4 h-4 shrink-0" />
              <div className="text-left">
                <p className="font-bold">Bionic Word Guidance</p>
                <p className={`text-[10px] ${settings.bionicReading ? 'text-white/80' : 'opacity-65'}`}>
                  Bolds first letters of words to anchor optical saccades
                </p>
              </div>
            </div>
            <span className="font-bold uppercase text-[11px] ml-2">
              {settings.bionicReading ? 'ON' : 'OFF'}
            </span>
          </button>
        </div>

        {/* Reset Button */}
        {onResetDefaults && (
          <div className="pt-2 text-center">
            <button
              onClick={() => {
                onResetDefaults();
                onClose();
              }}
              className="text-xs font-semibold opacity-75 hover:opacity-100 flex items-center justify-center gap-1.5 mx-auto cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Reset to Dyslexia Best Practices</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
