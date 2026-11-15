import React from 'react';
import { PWAInstallButton } from './PWAInstallButton';

interface NavbarProps {
  onOpenScanner: () => void;
  onOpenBrowser: () => void;
  onOpenSamples: () => void;
  onOpenSettings: () => void;
  onOpenSavedDocs: () => void;
  onOpenCalibration: () => void;
  savedCount: number;
  isDarkSurface: boolean;
}

export const Navbar: React.FC<NavbarProps> = ({
  onOpenScanner,
  onOpenBrowser,
  onOpenSamples,
  onOpenSettings,
  onOpenSavedDocs,
  onOpenCalibration,
  savedCount,
  isDarkSurface,
}) => {
  return (
    <header className="w-full max-w-[1360px] mx-auto px-4 sm:px-8 lg:px-14 py-5 sm:py-7 flex items-end justify-between gap-6 no-print">
      {/* Brand Lockup — Variation 6 JetBrains Mono minimalist identity */}
      <div className="select-none shrink-0">
        <h1 className="font-mono-label text-lg sm:text-xl font-bold tracking-[-0.05em] leading-none">
          ABG
        </h1>
        <p className="text-[11px] italic tracking-wide opacity-65 mt-1.5 whitespace-nowrap">
          Impossible is just an opinion.
        </p>
      </div>

      {/* Desktop / Tablet Editorial Text Navigation */}
      <nav
        className="hidden sm:flex items-center gap-6 lg:gap-8"
        aria-label="Primary Navigation"
      >
        <button
          onClick={onOpenBrowser}
          className="text-xs font-semibold uppercase tracking-[0.1em] opacity-60 hover:opacity-100 hover:text-blue-600 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
        >
          Browse
        </button>

        <button
          onClick={onOpenSamples}
          className="text-xs font-semibold uppercase tracking-[0.1em] opacity-60 hover:opacity-100 hover:text-blue-600 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
        >
          Samples
        </button>

        <button
          onClick={onOpenSavedDocs}
          className="text-xs font-semibold uppercase tracking-[0.1em] opacity-60 hover:opacity-100 hover:text-blue-600 transition-colors whitespace-nowrap shrink-0 cursor-pointer tabular-nums"
        >
          {savedCount > 0 ? `Saved (${savedCount})` : 'Saved'}
        </button>

        <button
          onClick={onOpenCalibration}
          className="text-xs font-semibold uppercase tracking-[0.1em] opacity-60 hover:opacity-100 hover:text-blue-600 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
        >
          Calibrate
        </button>

        <PWAInstallButton variant="minimal" />

        <button
          onClick={onOpenSettings}
          className="text-xs font-semibold uppercase tracking-[0.1em] opacity-60 hover:opacity-100 hover:text-blue-600 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
        >
          Settings
        </button>
      </nav>

      {/* Mobile Compact Action Trigger (when top nav links collapse) */}
      <div className="flex sm:hidden items-center gap-3 shrink-0">
        <button
          onClick={onOpenCalibration}
          className={`text-[11px] font-semibold uppercase tracking-[0.1em] px-3 py-1.5 rounded-xl border transition cursor-pointer whitespace-nowrap ${
            isDarkSurface
              ? 'border-white/15 bg-white/5 text-white/85'
              : 'border-black/10 bg-white/70 text-[#151517]'
          }`}
        >
          Calibrate
        </button>
        <button
          onClick={onOpenScanner}
          className="text-[11px] font-semibold uppercase tracking-[0.1em] px-3.5 py-1.5 rounded-xl bg-blue-600 text-white shadow-xs transition cursor-pointer whitespace-nowrap"
        >
          Scan
        </button>
      </div>
    </header>
  );
};
