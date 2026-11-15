import React from 'react';
import {
  BookOpen,
  Camera,
  Play,
  Square,
  Sliders,
  Menu,
  Volume2,
  Sparkles,
} from 'lucide-react';
import { DyslexiaSettings } from '../types';

interface MobileNavDockProps {
  onOpenScanner: () => void;
  onToggleVisuals: () => void;
  onToggleMore: () => void;
  onToggleAudio: () => void;
  isAudioPlaying: boolean;
  hasText: boolean;
  settings: DyslexiaSettings;
  savedCount: number;
  onScrollToReading: () => void;
}

export const MobileNavDock: React.FC<MobileNavDockProps> = ({
  onOpenScanner,
  onToggleVisuals,
  onToggleMore,
  onToggleAudio,
  isAudioPlaying,
  hasText,
  settings,
  savedCount,
  onScrollToReading,
}) => {
  return (
    <nav
      className="fixed bottom-0 inset-x-0 z-40 sm:hidden border-t border-black/10 backdrop-blur-md px-2 pt-2 shadow-[0_-4px_20px_rgba(0,0,0,0.06)] pb-[max(0.6rem,env(safe-area-inset-bottom))] transition-colors select-none no-print"
      style={{
        backgroundColor: `${settings.backgroundColor}fa`,
        color: settings.textColor,
      }}
      aria-label="Mobile Navigation"
    >
      <div className="flex items-center justify-around max-w-md mx-auto">
        {/* 1. Read Button */}
        <button
          onClick={onScrollToReading}
          className="flex flex-col items-center justify-center min-w-[56px] py-1 px-2 rounded-xl hover:bg-current/10 active:scale-95 transition cursor-pointer touch-manipulation"
          aria-label="Reading canvas"
        >
          <BookOpen className="w-5 h-5 opacity-85" />
          <span className="text-[10px] font-bold tracking-tight mt-1 opacity-90">Read</span>
        </button>

        {/* 2. Visuals & Anti-Glare Tint */}
        <button
          onClick={onToggleVisuals}
          className="flex flex-col items-center justify-center min-w-[56px] py-1 px-2 rounded-xl hover:bg-current/10 active:scale-95 transition cursor-pointer touch-manipulation"
          aria-label="Vision and anti-glare tint controls"
        >
          <div className="relative">
            <Sliders className="w-5 h-5 text-blue-600" />
            <span
              className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full border border-black/20"
              style={{ backgroundColor: settings.backgroundColor }}
            />
          </div>
          <span className="text-[10px] font-bold tracking-tight mt-1 opacity-90">Vision</span>
        </button>

        {/* 3. CENTER HIGHLIGHT: Instant Camera Scan */}
        <div className="relative -top-3">
          <button
            onClick={onOpenScanner}
            className="flex flex-col items-center justify-center w-14 h-14 rounded-full bg-gradient-to-tr from-blue-700 to-blue-500 text-white shadow-lg shadow-blue-600/35 hover:shadow-xl active:scale-90 transition cursor-pointer ring-4 ring-white/60 touch-manipulation"
            aria-label="Open Camera Scanner"
          >
            <Camera className="w-6 h-6 drop-shadow-xs" />
          </button>
        </div>

        {/* 4. Listen / Cornish Voice */}
        <button
          onClick={onToggleAudio}
          disabled={!hasText}
          className={`flex flex-col items-center justify-center min-w-[56px] py-1 px-2 rounded-xl active:scale-95 transition cursor-pointer touch-manipulation disabled:opacity-30 ${
            isAudioPlaying
              ? 'bg-red-600 text-white shadow-xs animate-pulse ring-2 ring-red-400/50'
              : 'hover:bg-current/10'
          }`}
          aria-label={isAudioPlaying ? 'Stop Cornish voice narration' : 'Listen with Cornish voice'}
        >
          {isAudioPlaying ? (
            <Square className="w-5 h-5 fill-current" />
          ) : (
            <Volume2 className="w-5 h-5 text-emerald-600" />
          )}
          <span className="text-[10px] font-bold tracking-tight mt-1">
            {isAudioPlaying ? 'Stop' : 'Listen'}
          </span>
        </button>

        {/* 5. Tools / More */}
        <button
          onClick={onToggleMore}
          className="relative flex flex-col items-center justify-center min-w-[56px] py-1 px-2 rounded-xl hover:bg-current/10 active:scale-95 transition cursor-pointer touch-manipulation"
          aria-label="Tools and navigation menu"
        >
          <div className="relative">
            <Menu className="w-5 h-5 opacity-85" />
            {savedCount > 0 && (
              <span className="absolute -top-1 -right-2 w-4 h-4 rounded-full bg-blue-600 text-white text-[9px] font-bold flex items-center justify-center">
                {savedCount}
              </span>
            )}
          </div>
          <span className="text-[10px] font-bold tracking-tight mt-1 opacity-90">Tools</span>
        </button>
      </div>
    </nav>
  );
};
