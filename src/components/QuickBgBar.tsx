import React from 'react';
import { Palette, Check } from 'lucide-react';
import { COLOR_PRESETS, DyslexiaSettings } from '../types';

interface QuickBgBarProps {
  settings: DyslexiaSettings;
  onUpdateSettings: (newSettings: DyslexiaSettings) => void;
}

export const QuickBgBar: React.FC<QuickBgBarProps> = ({
  settings,
  onUpdateSettings,
}) => {
  const selectPreset = (bgColor: string, textColor: string) => {
    onUpdateSettings({
      ...settings,
      backgroundColor: bgColor,
      textColor: textColor,
    });
  };

  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 px-3.5 sm:px-4 py-2 sm:py-2.5 rounded-2xl bg-black/5 border border-black/5 text-xs transition-colors no-print">
      <div className="flex items-center gap-2 shrink-0">
        <div className="w-5 h-5 rounded-full bg-blue-600/20 text-blue-700 flex items-center justify-center">
          <Palette className="w-3 h-3" />
        </div>
        <span className="font-semibold text-xs opacity-90">
          Anti-Glare Tint:
        </span>
      </div>

      {/* Quick Swatch Pills (horizontally scrollable on mobile) */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 max-w-full scrollbar-none touch-manipulation">
        {COLOR_PRESETS.map((preset) => {
          const isSelected =
            settings.backgroundColor.toLowerCase() === preset.bgColor.toLowerCase();

          return (
            <button
              key={preset.id}
              onClick={() => selectPreset(preset.bgColor, preset.textColor)}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border text-xs font-medium transition cursor-pointer active:scale-95 shadow-2xs ${
                isSelected
                  ? 'border-blue-600 ring-2 ring-blue-500/40 font-semibold'
                  : 'border-black/10 hover:border-black/25 opacity-85 hover:opacity-100'
              }`}
              style={{
                backgroundColor: preset.bgColor,
                color: preset.textColor,
              }}
              title={`${preset.name}: ${preset.description}`}
            >
              <span
                className="w-3 h-3 rounded-full border border-black/20 shrink-0"
                style={{ backgroundColor: preset.bgColor }}
              />
              <span>{preset.name.split(' ')[0]}</span>
              {isSelected && <Check className="w-3 h-3 text-blue-600 shrink-0" />}
            </button>
          );
        })}

        {/* Custom Color Input Shortcut */}
        <div className="flex items-center gap-1 pl-1 border-l border-black/10 ml-0.5">
          <label
            htmlFor="quick-custom-bg"
            className="flex items-center gap-1 px-2 py-1 rounded-xl border border-black/10 hover:bg-black/5 text-xs cursor-pointer opacity-75 hover:opacity-100 transition"
            title="Choose custom background hex color"
          >
            <input
              id="quick-custom-bg"
              type="color"
              value={settings.backgroundColor}
              onChange={(e) =>
                onUpdateSettings({
                  ...settings,
                  backgroundColor: e.target.value,
                })
              }
              className="sr-only"
            />
            <span
              className="w-3.5 h-3.5 rounded-full border border-black/30 shadow-xs"
              style={{ backgroundColor: settings.backgroundColor }}
            />
            <span className="hidden sm:inline">Custom</span>
          </label>
        </div>
      </div>
    </div>
  );
};
