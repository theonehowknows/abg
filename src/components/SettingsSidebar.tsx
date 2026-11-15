import React from 'react';
import { Eye, Sparkles, Sliders, Volume2 } from 'lucide-react';
import { DyslexiaSettings, FONT_OPTIONS, FontFamily } from '../types';

interface SettingsSidebarProps {
  settings: DyslexiaSettings;
  onUpdateSettings: (newSettings: DyslexiaSettings) => void;
  onOpenSettings: () => void;
  onOpenCalibration: () => void;
  cornishAccentMode: boolean;
  onToggleCornishAccent: () => void;
  onPreviewGreeting: () => void;
  speechRate: number;
  onRateChange: (rate: number) => void;
  isDarkSurface: boolean;
}

const FEATURED_TINTS = [
  {
    id: 'warm-cream',
    name: 'Parchment Cream',
    bgColor: '#FAF4E8',
    textColor: '#2D3142',
  },
  {
    id: 'mint-sage',
    name: 'Morning Sage',
    bgColor: '#EBF5EE',
    textColor: '#1E2C24',
  },
  {
    id: 'muted-sky',
    name: 'Steel Mist',
    bgColor: '#EDF4F9',
    textColor: '#1F2D3D',
  },
  {
    id: 'slate-charcoal',
    name: 'Deep Charcoal',
    bgColor: '#202227',
    textColor: '#E8E5DD',
  },
];

export const SettingsSidebar: React.FC<SettingsSidebarProps> = ({
  settings,
  onUpdateSettings,
  onOpenSettings,
  onOpenCalibration,
  cornishAccentMode,
  onToggleCornishAccent,
  onPreviewGreeting,
  speechRate,
  onRateChange,
  isDarkSurface,
}) => {
  const cardBase = isDarkSurface
    ? 'bg-[#26282e] border-white/10 text-[#E8E5DD] hover:border-white/30'
    : 'bg-white border-black/[0.08] text-[#151517] hover:border-[#151517]';

  const cardActive = isDarkSurface
    ? 'bg-blue-500/15 border-blue-400 text-white font-semibold'
    : 'bg-[#f0f7ff] border-blue-600 text-[#151517] font-semibold';

  const decreaseFontSize = () => {
    onUpdateSettings({
      ...settings,
      fontSize: Math.max(16, settings.fontSize - 1),
    });
  };

  const increaseFontSize = () => {
    onUpdateSettings({
      ...settings,
      fontSize: Math.min(34, settings.fontSize + 1),
    });
  };

  const handleSelectFont = (fontFamily: FontFamily) => {
    onUpdateSettings({ ...settings, fontFamily });
  };

  return (
    <aside
      className="hidden sm:grid sm:grid-cols-3 lg:flex lg:flex-col gap-6 lg:gap-9 no-print"
      aria-label="Reading Controls Sidebar"
    >
      {/* 1. Glare Protection */}
      <div>
        <div className="flex items-center justify-between mb-3.5">
          <span className="font-mono-label text-[10px] uppercase tracking-[0.15em] opacity-50 block">
            Glare Protection
          </span>
          <button
            onClick={onOpenCalibration}
            className="text-[11px] font-medium text-blue-600 dark:text-blue-400 hover:underline cursor-pointer"
          >
            Calibrate
          </button>
        </div>

        <div className="flex flex-col gap-2.5">
          {FEATURED_TINTS.map((tint) => {
            const isActive =
              settings.backgroundColor.toLowerCase() === tint.bgColor.toLowerCase();
            return (
              <button
                key={tint.id}
                onClick={() =>
                  onUpdateSettings({
                    ...settings,
                    backgroundColor: tint.bgColor,
                    textColor: tint.textColor,
                  })
                }
                className={`flex items-center gap-3 px-4 py-3 rounded-2xl border text-[13px] transition-all duration-150 cursor-pointer text-left hover:translate-x-1 ${
                  isActive ? cardActive : cardBase
                }`}
              >
                <span
                  className="w-5 h-5 rounded-[6px] border border-black/15 shrink-0"
                  style={{ backgroundColor: tint.bgColor }}
                />
                <span className="whitespace-nowrap">{tint.name}</span>
              </button>
            );
          })}
        </div>

        <button
          onClick={onOpenSettings}
          className="mt-3 text-[11px] opacity-55 hover:opacity-100 hover:text-blue-600 transition cursor-pointer flex items-center gap-1.5"
        >
          <Sliders className="w-3 h-3" />
          <span>More tints &amp; spacing options</span>
        </button>
      </div>

      {/* 2. Ocular Controls */}
      <div>
        <div className="flex items-center justify-between mb-3.5">
          <span className="font-mono-label text-[10px] uppercase tracking-[0.15em] opacity-50 block">
            Ocular Controls
          </span>
          <span className="font-mono-label text-[11px] opacity-60 tabular-nums">
            {settings.fontSize}px
          </span>
        </div>

        {/* Font Size + / - */}
        <div className="grid grid-cols-2 gap-2.5 mb-2.5">
          <button
            onClick={increaseFontSize}
            disabled={settings.fontSize >= 34}
            className={`px-4 py-3 rounded-2xl border text-[13px] font-medium transition-all duration-150 cursor-pointer flex items-center justify-center disabled:opacity-35 ${cardBase}`}
            title="Increase font size"
          >
            Font +
          </button>
          <button
            onClick={decreaseFontSize}
            disabled={settings.fontSize <= 16}
            className={`px-4 py-3 rounded-2xl border text-[13px] font-medium transition-all duration-150 cursor-pointer flex items-center justify-center disabled:opacity-35 ${cardBase}`}
            title="Decrease font size"
          >
            Font −
          </button>
        </div>

        {/* Font Family Selector */}
        <div className="grid grid-cols-2 gap-2 mb-2.5">
          {FONT_OPTIONS.map((font) => {
            const isSelected = settings.fontFamily === font.value;
            return (
              <button
                key={font.value}
                onClick={() => handleSelectFont(font.value)}
                className={`px-3 py-2.5 rounded-xl border text-xs transition-all duration-150 cursor-pointer text-center whitespace-nowrap ${
                  isSelected ? cardActive : cardBase
                }`}
                title={font.description}
              >
                {font.label}
              </button>
            );
          })}
        </div>

        {/* Ruler & Bionic Quick Toggles */}
        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={() =>
              onUpdateSettings({ ...settings, readingRuler: !settings.readingRuler })
            }
            className={`px-3 py-2.5 rounded-xl border text-xs transition-all duration-150 cursor-pointer flex items-center justify-center gap-1.5 ${
              settings.readingRuler ? cardActive : cardBase
            }`}
            title="Toggle horizontal reading guide strip"
          >
            <Eye className="w-3.5 h-3.5 shrink-0" />
            <span>Ruler</span>
          </button>

          <button
            onClick={() =>
              onUpdateSettings({ ...settings, bionicReading: !settings.bionicReading })
            }
            className={`px-3 py-2.5 rounded-xl border text-xs transition-all duration-150 cursor-pointer flex items-center justify-center gap-1.5 ${
              settings.bionicReading ? cardActive : cardBase
            }`}
            title="Bold opening letters of words to anchor eye fixation"
          >
            <Sparkles className="w-3.5 h-3.5 shrink-0" />
            <span>Bionic</span>
          </button>
        </div>
      </div>

      {/* 3. Voice & Speed */}
      <div>
        <span className="font-mono-label text-[10px] uppercase tracking-[0.15em] opacity-50 mb-3.5 block">
          Voice &amp; Speed
        </span>

        <button
          onClick={onToggleCornishAccent}
          className={`w-full flex items-center justify-between gap-3 px-4 py-3 rounded-2xl border text-[13px] transition-all duration-150 cursor-pointer mb-2.5 ${
            cornishAccentMode ? cardActive : cardBase
          }`}
          title="Click to switch between Cornish Female voice and Standard British"
        >
          <span className="flex items-center gap-2.5 whitespace-nowrap">
            <Volume2 className="w-4 h-4 text-blue-500 shrink-0" />
            <span>
              {cornishAccentMode ? 'Cornish (Female)' : 'Standard British'}
            </span>
          </span>
          <span className="text-[10px] font-mono-label opacity-65 shrink-0">
            {cornishAccentMode ? 'Kernow' : 'UK'}
          </span>
        </button>

        <div className="space-y-2.5 pt-1">
          <div className="flex items-center justify-between text-xs opacity-70">
            <span className="tabular-nums">Speed: {speechRate.toFixed(2)}x</span>
            <button
              onClick={onPreviewGreeting}
              className="text-[11px] font-medium hover:text-blue-500 hover:underline cursor-pointer"
            >
              Sample Voice
            </button>
          </div>

          <input
            type="range"
            min={0.65}
            max={1.35}
            step={0.01}
            value={speechRate}
            onChange={(e) => onRateChange(parseFloat(e.target.value))}
            aria-label="Reading speech speed"
            className={`w-full accent-blue-500 cursor-pointer h-1.5 rounded-lg appearance-none ${
              isDarkSurface ? 'bg-white/20' : 'bg-black/15'
            }`}
          />
        </div>
      </div>
    </aside>
  );
};
