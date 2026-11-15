import React, { useState, useEffect } from 'react';
import {
  DyslexiaSettings,
  ScannedDocument,
  DEFAULT_SETTINGS,
  COLOR_PRESETS,
} from './types';
import { SAMPLE_DOCUMENTS, SampleDocument } from './data/samples';
import { countWords, countCharacters } from './utils/textParser';
import { useCornishSpeech } from './hooks/useCornishSpeech';
import { Navbar } from './components/Navbar';
import { ReadingArea } from './components/ReadingArea';
import { SettingsSidebar } from './components/SettingsSidebar';
import { CameraScanner } from './components/CameraScanner';
import { UploadModal } from './components/UploadModal';
import { SamplesModal } from './components/SamplesModal';
import { SettingsModal } from './components/SettingsModal';
import { SavedDocsModal } from './components/SavedDocsModal';
import { CalibrationModal } from './components/CalibrationModal';
import { OfflineIndicator } from './components/OfflineIndicator';
import { MobileNavDock } from './components/MobileNavDock';
import { MobileVisualsDrawer } from './components/MobileVisualsDrawer';
import { MobileMoreDrawer } from './components/MobileMoreDrawer';
import { WebBrowserModal } from './components/WebBrowserModal';
import { exportDyslexiaPdf } from './utils/pdfExporter';
import { CheckCircle2, AlertCircle, Play, Pause, Square } from 'lucide-react';

export default function App() {
  const [settings, setSettings] = useState<DyslexiaSettings>(() => {
    try {
      const saved = localStorage.getItem('lexiease_settings');
      if (saved) return { ...DEFAULT_SETTINGS, ...JSON.parse(saved) };
    } catch (e) {
      console.warn('Could not load settings from localStorage', e);
    }
    return DEFAULT_SETTINGS;
  });

  const [currentText, setCurrentText] = useState<string>('');
  const [originalText, setOriginalText] = useState<string>('');
  const [docTitle, setDocTitle] = useState<string>('Reading Box');
  const [sourceType, setSourceType] = useState<string>('');
  const [activeView, setActiveView] = useState<
    'standard' | 'simplified' | 'bullets' | 'syllables' | 'summary'
  >('standard');

  const [stopSignal, setStopSignal] = useState(0);
  const [playSignal, setPlaySignal] = useState(0);
  const [activeWordHighlight, setActiveWordHighlight] = useState<{
    charIndex: number;
    length: number;
  }>({
    charIndex: -1,
    length: 0,
  });

  const [savedDocs, setSavedDocs] = useState<ScannedDocument[]>(() => {
    try {
      const saved = localStorage.getItem('lexiease_docs');
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.warn('Could not load saved docs', e);
    }
    return [];
  });

  const [isFocusMode, setIsFocusMode] = useState(false);

  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [isBrowserOpen, setIsBrowserOpen] = useState(false);
  const [isExportingPdf, setIsExportingPdf] = useState(false);
  const [isSamplesOpen, setIsSamplesOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isSavedDocsOpen, setIsSavedDocsOpen] = useState(false);
  const [isCalibrationOpen, setIsCalibrationOpen] = useState(false);
  const [isMobileVisualsOpen, setIsMobileVisualsOpen] = useState(false);
  const [isMobileMoreOpen, setIsMobileMoreOpen] = useState(false);

  const [toast, setToast] = useState<{
    message: string;
    type: 'success' | 'info' | 'error';
  } | null>(null);

  const showToast = (
    message: string,
    type: 'success' | 'info' | 'error' = 'success'
  ) => {
    setToast({ message, type });
    setTimeout(() => {
      setToast((prev) => (prev?.message === message ? null : prev));
    }, 3500);
  };

  // Detect dark tint theme so outer canvas & UI surfaces adapt cleanly with high contrast
  const isDarkSurface =
    settings.backgroundColor.toLowerCase() === '#202227' ||
    settings.backgroundColor.toLowerCase() === '#151517';
  const outerBg = isDarkSurface ? '#16171A' : '#F5F2EE';
  const outerInk = isDarkSurface ? '#E8E5DD' : '#151517';

  // Cornish Speech Engine Hook
  const {
    isPlaying,
    isPaused,
    isAudioActive,
    cornishAccentMode,
    togglePlay,
    forceStopAllSpeech,
    handleRateChange,
    handleToggleCornishAccent,
    handlePreviewGreeting,
  } = useCornishSpeech({
    text: currentText,
    speechRate: settings.speechRate,
    onRateChange: (rate) => setSettings((prev) => ({ ...prev, speechRate: rate })),
    onHighlightWordIndex: (charIndex, length) =>
      setActiveWordHighlight({ charIndex, length }),
    onPlaybackEnd: () => setActiveWordHighlight({ charIndex: -1, length: 0 }),
    stopSignal,
    playSignal,
  });

  // Keep body synced with outer Variation 6 canvas
  useEffect(() => {
    if (typeof document !== 'undefined') {
      document.body.style.backgroundColor = outerBg;
      document.body.style.color = outerInk;
    }
  }, [outerBg, outerInk]);

  useEffect(() => {
    try {
      localStorage.setItem('lexiease_settings', JSON.stringify(settings));
    } catch (e) {
      console.warn('Could not persist settings', e);
    }
  }, [settings]);

  useEffect(() => {
    try {
      localStorage.setItem('lexiease_docs', JSON.stringify(savedDocs));
    } catch (e) {
      console.warn('Could not persist saved docs', e);
    }
  }, [savedDocs]);

  const handleScanSuccess = (
    text: string,
    imagePreview?: string,
    sourceName: 'Camera Scan' | 'Uploaded Document' | 'Direct Paste' = 'Camera Scan'
  ) => {
    const trimmed = text.trim();
    if (!trimmed) return;

    setCurrentText(trimmed);
    setOriginalText(trimmed);
    setActiveView('standard');
    setSourceType(sourceName);

    const firstLine = trimmed.split('\n')[0].replace(/[#*_-]/g, '').trim();
    const generatedTitle =
      firstLine.length > 40
        ? firstLine.slice(0, 37) + '...'
        : firstLine || 'Scanned Document';
    setDocTitle(generatedTitle);

    const newDoc: ScannedDocument = {
      id: `doc-${Date.now()}`,
      title: generatedTitle,
      content: trimmed,
      originalText: trimmed,
      activeView: 'standard',
      scannedAt: Date.now(),
      source:
        sourceName === 'Camera Scan'
          ? 'camera'
          : sourceName === 'Uploaded Document'
          ? 'upload'
          : 'paste',
      imagePreview,
      wordCount: countWords(trimmed),
      charCount: countCharacters(trimmed),
    };

    setSavedDocs((prev) => [newDoc, ...prev.slice(0, 24)]);
    showToast(
      `Text scanned and formatted in ${settings.fontFamily}!`,
      'success'
    );
  };

  const handleSelectSample = (sample: SampleDocument) => {
    setCurrentText(sample.text);
    setOriginalText(sample.text);
    setDocTitle(sample.title);
    setSourceType('Sample');
    setActiveView('standard');
    showToast(`Loaded "${sample.title}"`, 'info');
  };

  const handleSelectSavedDoc = (doc: ScannedDocument) => {
    setCurrentText(doc.content);
    setOriginalText(doc.originalText);
    setDocTitle(doc.title);
    setSourceType(
      doc.source === 'camera'
        ? 'Camera Scan'
        : doc.source === 'upload'
        ? 'Upload'
        : 'Saved'
    );
    setActiveView('standard');
    showToast(`Opened "${doc.title}"`, 'info');
  };

  const handleDeleteSavedDoc = (id: string) => {
    setSavedDocs((prev) => prev.filter((d) => d.id !== id));
    showToast('Document removed from history', 'info');
  };

  const handleResetDefaults = () => {
    setSettings(DEFAULT_SETTINGS);
    showToast('Reset to dyslexia gold-standard defaults', 'info');
  };

  const handleApplyCalibratedSettings = (
    calibrated: Partial<DyslexiaSettings>
  ) => {
    setSettings((prev) => ({ ...prev, ...calibrated }));
    showToast(
      `Calibrated: applied ${calibrated.fontFamily || settings.fontFamily} on ${
        COLOR_PRESETS.find((c) => c.bgColor === calibrated.backgroundColor)
          ?.name || 'custom tint'
      }`,
      'success'
    );
  };

  const handleApplyEnhancedText = (
    enhanced: string,
    viewType: 'standard' | 'simplified' | 'bullets' | 'syllables' | 'summary'
  ) => {
    setCurrentText(enhanced);
    setActiveView(viewType);
    showToast(`Applied ${viewType} view`, 'success');
  };

  const handleRestoreOriginal = () => {
    setCurrentText(originalText);
    setActiveView('standard');
  };

  const handleClearText = () => {
    setStopSignal((s) => s + 1);
    setCurrentText('');
    setOriginalText('');
    setDocTitle('Reading Box');
    setSourceType('');
    setActiveView('standard');
    showToast('Cleared text box', 'info');
  };

  const handleToggleAudioFromMobile = () => {
    if (isPlaying && !isPaused) {
      forceStopAllSpeech();
    } else if (currentText.trim()) {
      setPlaySignal((s) => s + 1);
    } else {
      showToast('Scan or paste text first to read aloud', 'info');
    }
  };

  const handleScrollToReading = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleUpdateText = (newText: string) => {
    setCurrentText(newText);
    setOriginalText(newText);
    if (newText.trim()) {
      const firstLine = newText.split('\n')[0].replace(/[#*_-]/g, '').trim();
      const generatedTitle =
        firstLine.length > 40
          ? firstLine.slice(0, 37) + '...'
          : firstLine || 'My Document';
      if (!docTitle || docTitle === 'Reading Box' || docTitle === 'My Reading Document') {
        setDocTitle(generatedTitle);
      }
      if (!sourceType) {
        setSourceType('Direct Input');
      }
    }
  };

  const handleToggleFocusMode = () => {
    if (!isFocusMode) {
      if (!settings.readingRuler) {
        setSettings((prev) => ({ ...prev, readingRuler: true }));
      }
      setIsFocusMode(true);
      showToast('Focus View enabled — press Esc to exit', 'info');
    } else {
      setIsFocusMode(false);
      showToast('Exited Focus View', 'info');
    }
  };

  const handleExitFocusMode = () => {
    setIsFocusMode(false);
    showToast('Exited Focus View', 'info');
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const activeTag = document.activeElement?.tagName?.toLowerCase();
      const isInput = activeTag === 'input' || activeTag === 'textarea';

      if (e.key === 'Escape' && isFocusMode) {
        e.preventDefault();
        setIsFocusMode(false);
        showToast('Exited Focus View', 'info');
        return;
      }

      if (
        (e.key === 'f' || e.key === 'F') &&
        !isInput &&
        !e.ctrlKey &&
        !e.metaKey &&
        !e.altKey
      ) {
        e.preventDefault();
        handleToggleFocusMode();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isFocusMode, settings.readingRuler]);

  const handleExportPdf = async (customTitle?: string, customText?: string) => {
    const targetText = (customText ?? currentText).trim();
    const targetTitle = customTitle ?? docTitle;
    if (!targetText) {
      showToast('Add or scan some text first to export a PDF', 'info');
      return;
    }

    try {
      setIsExportingPdf(true);
      await exportDyslexiaPdf({
        text: targetText,
        title: targetTitle,
        settings,
      });
      showToast(
        `Exported PDF in ${settings.fontFamily} with glare tint & spacing!`,
        'success'
      );
    } catch (err: unknown) {
      showToast(
        (err as Error)?.message || 'Could not export PDF. Please try again.',
        'error'
      );
    } finally {
      setIsExportingPdf(false);
    }
  };

  const handleImportFromWeb = (title: string, text: string, _sourceUrl: string) => {
    const trimmed = text.trim();
    if (!trimmed) return;
    setCurrentText(trimmed);
    setOriginalText(trimmed);
    setDocTitle(title || 'Web Article');
    setSourceType('Web Browser');
    setActiveView('standard');

    const newDoc: ScannedDocument = {
      id: `doc-${Date.now()}`,
      title: title || 'Web Article',
      content: trimmed,
      originalText: trimmed,
      activeView: 'standard',
      scannedAt: Date.now(),
      source: 'paste',
      wordCount: countWords(trimmed),
      charCount: countCharacters(trimmed),
    };
    setSavedDocs((prev) => [newDoc, ...prev.slice(0, 24)]);
    showToast(`Imported "${title}" into ${settings.fontFamily} reader`, 'success');
  };

  return (
    <div
      className="min-h-screen flex flex-col transition-colors duration-200"
      style={{
        backgroundColor: outerBg,
        color: outerInk,
      }}
    >
      {/* Top Minimal Gallery Navigation */}
      {!isFocusMode && (
        <Navbar
          onOpenScanner={() => setIsScannerOpen(true)}
          onOpenBrowser={() => setIsBrowserOpen(true)}
          onOpenSamples={() => setIsSamplesOpen(true)}
          onOpenSettings={() => setIsSettingsOpen(true)}
          onOpenSavedDocs={() => setIsSavedDocsOpen(true)}
          onOpenCalibration={() => setIsCalibrationOpen(true)}
          savedCount={savedDocs.length}
          isDarkSurface={isDarkSurface}
        />
      )}

      {/* Main Two-Column Atelier Grid (Variation 6) */}
      <main
        className={`flex-1 w-full transition-all duration-300 ${
          isFocusMode
            ? 'p-0 max-w-none flex flex-col justify-center'
            : 'max-w-[1360px] mx-auto px-4 sm:px-8 lg:px-14 pb-28 sm:pb-8 grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-6 lg:gap-12 items-start'
        }`}
      >
        {/* Left Main Content Shell */}
        <ReadingArea
          text={currentText}
          originalText={originalText}
          activeView={activeView}
          onApplyEnhancedText={handleApplyEnhancedText}
          onRestoreOriginal={handleRestoreOriginal}
          settings={settings}
          activeWordHighlight={activeWordHighlight}
          onUpdateText={handleUpdateText}
          onClearText={handleClearText}
          title={docTitle}
          sourceType={sourceType}
          isAudioPlaying={isPlaying}
          isAudioPaused={isPaused}
          onToggleAudio={togglePlay}
          onStopAudio={forceStopAllSpeech}
          onOpenScanner={() => setIsScannerOpen(true)}
          onOpenUpload={() => setIsUploadOpen(true)}
          onOpenBrowser={() => setIsBrowserOpen(true)}
          onExportPdf={() => handleExportPdf()}
          isExportingPdf={isExportingPdf}
          onOpenSamples={() => setIsSamplesOpen(true)}
          onOpenCalibration={() => setIsCalibrationOpen(true)}
          isFocusMode={isFocusMode}
          onToggleFocusMode={handleToggleFocusMode}
          onExitFocusMode={handleExitFocusMode}
          isDarkSurface={isDarkSurface}
        />

        {/* Right Settings Pane (Variation 6 Lateral Rail) */}
        {!isFocusMode && (
          <SettingsSidebar
            settings={settings}
            onUpdateSettings={setSettings}
            onOpenSettings={() => setIsSettingsOpen(true)}
            onOpenCalibration={() => setIsCalibrationOpen(true)}
            cornishAccentMode={cornishAccentMode}
            onToggleCornishAccent={handleToggleCornishAccent}
            onPreviewGreeting={handlePreviewGreeting}
            speechRate={settings.speechRate}
            onRateChange={handleRateChange}
            isDarkSurface={isDarkSurface}
          />
        )}
      </main>

      {/* Clean Minimal Editorial Footer (Variation 6) */}
      {!isFocusMode && (
        <footer className="hidden sm:flex w-full max-w-[1360px] mx-auto px-4 sm:px-8 lg:px-14 py-6 text-xs opacity-45 items-center justify-between gap-4 no-print">
          <span>Inclusive Reading Experience</span>
          <span>{settings.fontFamily} Optimization Active</span>
        </footer>
      )}

      {/* Mobile Floating Audio Controller when reading aloud */}
      {isAudioActive && !isFocusMode && (
        <div className="fixed bottom-20 left-3 right-3 sm:hidden z-50 p-2.5 rounded-2xl bg-[#151517]/95 text-white backdrop-blur-md shadow-2xl border border-white/15 flex items-center justify-between gap-2 no-print">
          <div className="min-w-0 pl-2">
            <span className="text-xs font-bold block truncate">
              {isPaused ? 'Paused' : 'Reading Aloud'}
            </span>
            <span className="text-[10px] text-white/65 block truncate">
              {cornishAccentMode ? 'Cornish Female' : 'British'} · {settings.speechRate.toFixed(2)}x
            </span>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={togglePlay}
              className="p-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white cursor-pointer"
              aria-label={isPlaying && !isPaused ? 'Pause reading' : 'Resume reading'}
            >
              {isPlaying && !isPaused ? (
                <Pause className="w-4 h-4 fill-current" />
              ) : (
                <Play className="w-4 h-4 fill-current ml-0.5" />
              )}
            </button>
            <button
              onClick={forceStopAllSpeech}
              className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-xs cursor-pointer"
              aria-label="Stop reading aloud"
            >
              <Square className="w-3.5 h-3.5 fill-current" />
              <span>Stop</span>
            </button>
          </div>
        </div>
      )}

      {/* Mobile Bottom Ergonomic Dock */}
      {!isFocusMode && (
        <MobileNavDock
          onOpenScanner={() => setIsScannerOpen(true)}
          onToggleVisuals={() => setIsMobileVisualsOpen(true)}
          onToggleMore={() => setIsMobileMoreOpen(true)}
          onToggleAudio={handleToggleAudioFromMobile}
          isAudioPlaying={isPlaying && !isPaused}
          hasText={currentText.trim().length > 0}
          settings={settings}
          savedCount={savedDocs.length}
          onScrollToReading={handleScrollToReading}
        />
      )}

      {/* Drawers & Modals */}
      <MobileVisualsDrawer
        isOpen={isMobileVisualsOpen}
        onClose={() => setIsMobileVisualsOpen(false)}
        settings={settings}
        onUpdateSettings={setSettings}
        onResetDefaults={handleResetDefaults}
      />

      <MobileMoreDrawer
        isOpen={isMobileMoreOpen}
        onClose={() => setIsMobileMoreOpen(false)}
        onOpenBrowser={() => setIsBrowserOpen(true)}
        onExportPdf={() => handleExportPdf()}
        hasText={currentText.trim().length > 0}
        onOpenSavedDocs={() => setIsSavedDocsOpen(true)}
        onOpenUpload={() => setIsUploadOpen(true)}
        onOpenSamples={() => setIsSamplesOpen(true)}
        onOpenCalibration={() => setIsCalibrationOpen(true)}
        onOpenSettings={() => setIsSettingsOpen(true)}
        onToggleFocusMode={handleToggleFocusMode}
        savedCount={savedDocs.length}
        settings={settings}
      />

      <WebBrowserModal
        isOpen={isBrowserOpen}
        onClose={() => setIsBrowserOpen(false)}
        settings={settings}
        onUpdateSettings={setSettings}
        isDarkSurface={isDarkSurface}
        onImportToReader={handleImportFromWeb}
        onExportPdf={handleExportPdf}
      />

      <CameraScanner
        isOpen={isScannerOpen}
        onClose={() => setIsScannerOpen(false)}
        onScanComplete={(text, imagePreview) =>
          handleScanSuccess(text, imagePreview, 'Camera Scan')
        }
        onOpenUploadFallback={() => {
          setIsScannerOpen(false);
          setIsUploadOpen(true);
        }}
      />

      <UploadModal
        isOpen={isUploadOpen}
        onClose={() => setIsUploadOpen(false)}
        onScanComplete={(text, imagePreview) =>
          handleScanSuccess(
            text,
            imagePreview,
            imagePreview ? 'Uploaded Document' : 'Direct Paste'
          )
        }
        onOpenSample={() => {
          setIsUploadOpen(false);
          setIsSamplesOpen(true);
        }}
      />

      <SamplesModal
        isOpen={isSamplesOpen}
        onClose={() => setIsSamplesOpen(false)}
        onSelectSample={handleSelectSample}
      />

      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        settings={settings}
        onUpdateSettings={setSettings}
        onResetDefaults={handleResetDefaults}
        onOpenCalibration={() => setIsCalibrationOpen(true)}
      />

      <CalibrationModal
        isOpen={isCalibrationOpen}
        onClose={() => setIsCalibrationOpen(false)}
        settings={settings}
        onApplySettings={handleApplyCalibratedSettings}
      />

      <SavedDocsModal
        isOpen={isSavedDocsOpen}
        onClose={() => setIsSavedDocsOpen(false)}
        documents={savedDocs}
        onSelectDocument={handleSelectSavedDoc}
        onDeleteDocument={handleDeleteSavedDoc}
      />

      <OfflineIndicator />

      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 animate-in fade-in slide-in-from-bottom-3 duration-200 pointer-events-none">
          <div
            className={`flex items-center gap-2.5 px-4 py-2.5 rounded-2xl shadow-xl text-xs font-semibold backdrop-blur-md border ${
              toast.type === 'error'
                ? 'bg-red-900/90 text-white border-red-500/40'
                : 'bg-[#151517]/90 text-white border-white/15'
            }`}
          >
            {toast.type === 'error' ? (
              <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
            ) : (
              <CheckCircle2 className="w-4 h-4 text-blue-400 shrink-0" />
            )}
            <span>{toast.message}</span>
          </div>
        </div>
      )}
    </div>
  );
}
