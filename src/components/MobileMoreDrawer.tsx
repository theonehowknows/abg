import React from 'react';
import {
  X,
  Bookmark,
  Upload,
  BookOpen,
  Zap,
  Settings as SettingsIcon,
  Maximize2,
  Download,
  Info,
  Globe,
  FileDown,
} from 'lucide-react';
import { DyslexiaSettings } from '../types';
import { PWAInstallButton } from './PWAInstallButton';

interface MobileMoreDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenBrowser: () => void;
  onExportPdf: () => void;
  hasText: boolean;
  onOpenSavedDocs: () => void;
  onOpenUpload: () => void;
  onOpenSamples: () => void;
  onOpenCalibration: () => void;
  onOpenSettings: () => void;
  onToggleFocusMode: () => void;
  savedCount: number;
  settings: DyslexiaSettings;
}

export const MobileMoreDrawer: React.FC<MobileMoreDrawerProps> = ({
  isOpen,
  onClose,
  onOpenBrowser,
  onExportPdf,
  hasText,
  onOpenSavedDocs,
  onOpenUpload,
  onOpenSamples,
  onOpenCalibration,
  onOpenSettings,
  onToggleFocusMode,
  savedCount,
  settings,
}) => {
  if (!isOpen) return null;

  const handleAction = (cb: () => void) => {
    onClose();
    cb();
  };

  return (
    <div className="fixed inset-0 z-50 sm:hidden flex flex-col justify-end">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-xs transition-opacity"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Drawer */}
      <div
        className="relative z-10 w-full max-h-[85vh] overflow-y-auto rounded-t-3xl shadow-2xl border-t border-black/10 p-5 space-y-4 animate-in slide-in-from-bottom duration-250 pb-[max(1.5rem,env(safe-area-inset-bottom))]"
        style={{
          backgroundColor: settings.backgroundColor,
          color: settings.textColor,
        }}
      >
        <div className="w-12 h-1.5 bg-current/25 rounded-full mx-auto" />

        <div className="flex items-center justify-between pb-2 border-b border-current/10">
          <div className="flex items-center gap-2">
            <h3 className="font-bold text-base tracking-tight">Navigation & Tools</h3>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-current/10 flex items-center justify-center hover:bg-current/15 transition cursor-pointer"
            aria-label="Close menu"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Menu Grid */}
        <div className="grid grid-cols-1 gap-2.5">
          {/* Dyslexia Web Browser */}
          <button
            onClick={() => handleAction(onOpenBrowser)}
            className="flex items-center justify-between p-3.5 rounded-2xl bg-current/5 hover:bg-current/10 border border-current/10 text-left transition active:scale-98 cursor-pointer touch-manipulation"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-600/15 text-blue-600 flex items-center justify-center">
                <Globe className="w-5 h-5" />
              </div>
              <div>
                <p className="font-bold text-sm">Dyslexia Web Browser</p>
                <p className="text-[11px] opacity-70">Read websites without glare, clutter, or small fonts</p>
              </div>
            </div>
          </button>

          {/* Export PDF (when document has text) */}
          {hasText && (
            <button
              onClick={() => handleAction(onExportPdf)}
              className="flex items-center justify-between p-3.5 rounded-2xl bg-current/5 hover:bg-current/10 border border-current/10 text-left transition active:scale-98 cursor-pointer touch-manipulation"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-indigo-600/15 text-indigo-600 flex items-center justify-center">
                  <FileDown className="w-5 h-5" />
                </div>
                <div>
                  <p className="font-bold text-sm">Export Dyslexia PDF</p>
                  <p className="text-[11px] opacity-70">Preserves {settings.fontFamily}, glare tint &amp; spacing</p>
                </div>
              </div>
            </button>
          )}

          {/* Saved Documents */}
          <button
            onClick={() => handleAction(onOpenSavedDocs)}
            className="flex items-center justify-between p-3.5 rounded-2xl bg-current/5 hover:bg-current/10 border border-current/10 text-left transition active:scale-98 cursor-pointer touch-manipulation"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-600/10 text-blue-600 flex items-center justify-center">
                <Bookmark className="w-5 h-5" />
              </div>
              <div>
                <p className="font-bold text-sm">Saved Documents</p>
                <p className="text-[11px] opacity-70">Browse your scanned book pages &amp; history</p>
              </div>
            </div>
            {savedCount > 0 && (
              <span className="px-2 py-0.5 rounded-full bg-blue-600 text-white text-xs font-bold">
                {savedCount}
              </span>
            )}
          </button>

          {/* Upload / Paste File */}
          <button
            onClick={() => handleAction(onOpenUpload)}
            className="flex items-center justify-between p-3.5 rounded-2xl bg-current/5 hover:bg-current/10 border border-current/10 text-left transition active:scale-98 cursor-pointer touch-manipulation"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-600/10 text-emerald-600 flex items-center justify-center">
                <Upload className="w-5 h-5" />
              </div>
              <div>
                <p className="font-bold text-sm">Upload Photo / Paste Text</p>
                <p className="text-[11px] opacity-70">Import images or documents directly</p>
              </div>
            </div>
          </button>

          {/* Reading Calibration */}
          <button
            onClick={() => handleAction(onOpenCalibration)}
            className="flex items-center justify-between p-3.5 rounded-2xl bg-amber-500/10 hover:bg-amber-500/15 border border-amber-500/30 text-left transition active:scale-98 cursor-pointer touch-manipulation"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-600 flex items-center justify-center">
                <Zap className="w-5 h-5 fill-current" />
              </div>
              <div>
                <p className="font-bold text-sm text-amber-900">45s Reading Calibration Test</p>
                <p className="text-[11px] opacity-75">Find your personal anti-glare tint & font</p>
              </div>
            </div>
          </button>

          {/* Sample Articles */}
          <button
            onClick={() => handleAction(onOpenSamples)}
            className="flex items-center justify-between p-3.5 rounded-2xl bg-current/5 hover:bg-current/10 border border-current/10 text-left transition active:scale-98 cursor-pointer touch-manipulation"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-purple-600/10 text-purple-600 flex items-center justify-center">
                <BookOpen className="w-5 h-5" />
              </div>
              <div>
                <p className="font-bold text-sm">Sample Reading Articles</p>
                <p className="text-[11px] opacity-70">Curated stories & literature tests</p>
              </div>
            </div>
          </button>

          {/* Focus Mode */}
          <button
            onClick={() => handleAction(onToggleFocusMode)}
            className="flex items-center justify-between p-3.5 rounded-2xl bg-current/5 hover:bg-current/10 border border-current/10 text-left transition active:scale-98 cursor-pointer touch-manipulation"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-indigo-600/10 text-indigo-600 flex items-center justify-center">
                <Maximize2 className="w-5 h-5" />
              </div>
              <div>
                <p className="font-bold text-sm">Distraction-Free Focus Mode</p>
                <p className="text-[11px] opacity-70">Hides all menus for uninterrupted reading</p>
              </div>
            </div>
          </button>

          {/* Comprehensive Settings */}
          <button
            onClick={() => handleAction(onOpenSettings)}
            className="flex items-center justify-between p-3.5 rounded-2xl bg-current/5 hover:bg-current/10 border border-current/10 text-left transition active:scale-98 cursor-pointer touch-manipulation"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-current/10 text-current flex items-center justify-center">
                <SettingsIcon className="w-5 h-5" />
              </div>
              <div>
                <p className="font-bold text-sm">All Dyslexia Settings</p>
                <p className="text-[11px] opacity-70">Cornish speech speed, contrast ratios, and margins</p>
              </div>
            </div>
          </button>
        </div>

        {/* PWA Install Button inside Drawer */}
        <div className="pt-2">
          <PWAInstallButton variant="banner" />
        </div>
      </div>
    </div>
  );
};
