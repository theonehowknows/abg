import React, { useState } from 'react';
import { Download, Share2, PlusSquare, Smartphone, Check, X, Sparkles } from 'lucide-react';
import { usePWAInstall } from '../hooks/usePWAInstall';

interface PWAInstallButtonProps {
  variant?: 'navbar' | 'settings' | 'banner' | 'minimal';
  className?: string;
}

export const PWAInstallButton: React.FC<PWAInstallButtonProps> = ({
  variant = 'navbar',
  className = '',
}) => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showGuideModal, setShowGuideModal] = useState(false);
  const [isInstalling, setIsInstalling] = useState(false);

  // If already installed and running standalone, do not show in Navbar
  if (isInstalled) {
    if (variant === 'settings') {
      return (
        <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-800 text-xs font-semibold">
          <Check className="w-4 h-4 text-emerald-600" />
          <span>App installed & ready offline</span>
        </div>
      );
    }
    return null;
  }

  const handleInstallClick = async () => {
    if (isInstallable) {
      setIsInstalling(true);
      try {
        await install();
      } finally {
        setIsInstalling(false);
      }
    } else {
      setShowGuideModal(true);
    }
  };

  return (
    <>
      {variant === 'minimal' && (
        <button
          onClick={handleInstallClick}
          disabled={isInstalling}
          className={`text-xs font-semibold uppercase tracking-[0.1em] opacity-60 hover:opacity-100 hover:text-blue-600 transition-colors whitespace-nowrap shrink-0 cursor-pointer ${className}`}
          title="Install ABG as an App on your device"
        >
          Install
        </button>
      )}

      {variant === 'navbar' && (
        <button
          onClick={handleInstallClick}
          disabled={isInstalling}
          className={`group flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 sm:py-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 active:scale-95 text-white font-semibold text-xs sm:text-sm shadow-sm transition cursor-pointer touch-manipulation ${className}`}
          title="Install ABG as an App on your phone or computer"
          aria-label="Install App"
        >
          <Download className="w-3.5 h-3.5 sm:w-4 sm:h-4 group-hover:translate-y-0.5 transition-transform" />
          <span>Install App</span>
        </button>
      )}

      {variant === 'settings' && (
        <div className={`p-4 rounded-2xl bg-gradient-to-br from-blue-500/10 via-indigo-500/10 to-blue-500/5 border border-blue-500/30 flex flex-wrap items-center justify-between gap-3 ${className}`}>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center font-bold shadow-sm shrink-0">
              <Smartphone className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h4 className="font-bold text-sm text-stone-900">
                  Install ABG as an App
                </h4>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-600 text-white font-bold tracking-wide uppercase">
                  PWA
                </span>
              </div>
              <p className="text-xs text-stone-600 mt-0.5">
                Add to your home screen or desktop. Works offline with fast instant launch and no browser URL bar.
              </p>
            </div>
          </div>
          <button
            onClick={handleInstallClick}
            disabled={isInstalling}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 active:scale-95 text-white font-bold text-xs transition cursor-pointer shadow-sm ml-auto sm:ml-0"
          >
            <Download className="w-3.5 h-3.5" />
            <span>{isInstallable ? 'Install Now' : 'How to Install'}</span>
          </button>
        </div>
      )}

      {variant === 'banner' && (
        <div className={`flex items-center justify-between p-3 rounded-2xl bg-blue-600 text-white shadow-md ${className}`}>
          <div className="flex items-center gap-2.5">
            <Sparkles className="w-4 h-4 text-amber-300" />
            <span className="text-xs font-semibold">Install ABG on your home screen for instant camera OCR and full offline reading</span>
          </div>
          <button
            onClick={handleInstallClick}
            className="px-3 py-1.5 rounded-xl bg-white text-blue-900 font-bold text-xs shadow-xs hover:bg-blue-50 transition cursor-pointer shrink-0 ml-3"
          >
            Install
          </button>
        </div>
      )}

      {/* Guide Modal for iOS Safari / Manual Installation */}
      {showGuideModal && (
        <div
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowGuideModal(false);
          }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-150"
        >
          <div className="w-full max-w-md rounded-3xl bg-[#FAF4E8] text-[#2D3142] p-6 shadow-2xl border border-stone-300 space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-stone-200">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-blue-600 text-white flex items-center justify-center font-bold">
                  <Smartphone className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-base text-stone-900">
                    Install ABG App
                  </h3>
                  <p className="text-xs text-stone-600">
                    Run full-screen on your home screen
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowGuideModal(false)}
                className="w-8 h-8 rounded-full bg-stone-200 hover:bg-stone-300 text-stone-700 flex items-center justify-center transition cursor-pointer"
                aria-label="Close modal"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {isIOS ? (
              // iOS Safari instructions
              <div className="space-y-4 text-xs text-stone-700">
                <p className="font-medium text-stone-900">
                  Follow these 2 quick steps in Apple Safari on your iPhone or iPad:
                </p>
                <div className="space-y-3">
                  <div className="flex items-start gap-3 p-3 rounded-2xl bg-white/70 border border-stone-200">
                    <div className="w-7 h-7 rounded-lg bg-blue-100 text-blue-800 flex items-center justify-center shrink-0 mt-0.5">
                      <Share2 className="w-4 h-4" />
                    </div>
                    <div>
                      <span className="font-bold text-stone-900 block">1. Tap the Share button</span>
                      <span className="text-stone-600">In Safari&apos;s bottom toolbar (or top right on iPad), tap the Share icon.</span>
                    </div>
                  </div>

                  <div className="flex items-start gap-3 p-3 rounded-2xl bg-white/70 border border-stone-200">
                    <div className="w-7 h-7 rounded-lg bg-blue-100 text-blue-800 flex items-center justify-center shrink-0 mt-0.5">
                      <PlusSquare className="w-4 h-4" />
                    </div>
                    <div>
                      <span className="font-bold text-stone-900 block">2. Tap &quot;Add to Home Screen&quot;</span>
                      <span className="text-stone-600">Scroll down the share sheet options and tap <strong>Add to Home Screen</strong>, then tap <strong>Add</strong> in the top right.</span>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              // Android Chrome / Edge / Desktop instructions
              <div className="space-y-4 text-xs text-stone-700">
                <p className="font-medium text-stone-900">
                  Install ABG onto your device launcher or desktop:
                </p>
                <div className="space-y-3">
                  <div className="flex items-start gap-3 p-3 rounded-2xl bg-white/70 border border-stone-200">
                    <div className="w-7 h-7 rounded-lg bg-blue-100 text-blue-800 flex items-center justify-center shrink-0 mt-0.5">
                      <Download className="w-4 h-4" />
                    </div>
                    <div>
                      <span className="font-bold text-stone-900 block">In Chrome or Edge</span>
                      <span className="text-stone-600">Click the install icon in the right side of the address bar, or open the browser menu (⋮) and select <strong>&quot;Install ABG&quot;</strong>.</span>
                    </div>
                  </div>

                  <div className="flex items-start gap-3 p-3 rounded-2xl bg-white/70 border border-stone-200">
                    <div className="w-7 h-7 rounded-lg bg-emerald-100 text-emerald-800 flex items-center justify-center shrink-0 mt-0.5">
                      <Check className="w-4 h-4" />
                    </div>
                    <div>
                      <span className="font-bold text-stone-900 block">Offline & Standalone</span>
                      <span className="text-stone-600">Once added, ABG launches in its own dedicated app window with your custom dyslexia reading settings saved.</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            <button
              onClick={() => setShowGuideModal(false)}
              className="w-full py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs transition cursor-pointer shadow-xs"
            >
              Got it
            </button>
          </div>
        </div>
      )}
    </>
  );
};
