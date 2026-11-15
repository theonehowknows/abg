import React, { useRef, useState } from 'react';
import {
  Copy,
  Printer,
  Edit3,
  Check,
  ClipboardPaste,
  Trash2,
  Square,
  Camera,
  Upload,
  BookOpen,
  Eye,
  Minimize2,
  Play,
  Pause,
  FileDown,
  Globe,
  Loader2,
} from 'lucide-react';
import { DyslexiaSettings } from '../types';
import {
  formatBionicText,
  countWords,
  countCharacters,
  estimateReadingTimeMinutes,
} from '../utils/textParser';
import { ReadingRuler } from './ReadingRuler';
import { TextEnhancerBar } from './TextEnhancerBar';

interface ReadingAreaProps {
  text: string;
  originalText: string;
  activeView: 'standard' | 'simplified' | 'bullets' | 'syllables' | 'summary';
  onApplyEnhancedText: (
    enhanced: string,
    viewType: 'standard' | 'simplified' | 'bullets' | 'syllables' | 'summary'
  ) => void;
  onRestoreOriginal: () => void;
  settings: DyslexiaSettings;
  activeWordHighlight?: { charIndex: number; length: number };
  onUpdateText: (newText: string) => void;
  onClearText: () => void;
  title?: string;
  sourceType?: string;
  isAudioPlaying?: boolean;
  isAudioPaused?: boolean;
  onToggleAudio?: () => void;
  onStopAudio?: () => void;
  onOpenScanner?: () => void;
  onOpenUpload?: () => void;
  onOpenBrowser?: () => void;
  onExportPdf?: () => void;
  isExportingPdf?: boolean;
  onOpenSamples?: () => void;
  onOpenCalibration?: () => void;
  isFocusMode?: boolean;
  onToggleFocusMode?: () => void;
  onExitFocusMode?: () => void;
  isDarkSurface?: boolean;
}

export const ReadingArea: React.FC<ReadingAreaProps> = ({
  text,
  originalText,
  activeView,
  onApplyEnhancedText,
  onRestoreOriginal,
  settings,
  activeWordHighlight,
  onUpdateText,
  onClearText,
  title = 'Reading Workspace',
  sourceType,
  isAudioPlaying = false,
  isAudioPaused = false,
  onToggleAudio,
  onStopAudio,
  onOpenScanner,
  onOpenUpload,
  onOpenBrowser,
  onExportPdf,
  isExportingPdf = false,
  onOpenSamples,
  onOpenCalibration,
  isFocusMode = false,
  onToggleFocusMode,
  onExitFocusMode,
  isDarkSurface = false,
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [copied, setCopied] = useState(false);
  const [pastedFeedback, setPastedFeedback] = useState(false);
  const [pasteError, setPasteError] = useState<string | null>(null);

  const wordCount = countWords(text);
  const charCount = countCharacters(text);
  const readingTime = estimateReadingTimeMinutes(wordCount);
  const hasText = Boolean(text && text.trim().length > 0);
  const isAudioActive = isAudioPlaying || isAudioPaused;

  const getFontFamilyClass = () => {
    switch (settings.fontFamily) {
      case 'OpenDyslexic':
        return 'font-opendyslexic';
      case 'Lexend':
        return 'font-lexend';
      case 'Atkinson Hyperlegible':
        return 'font-atkinson';
      case 'Comic Neue':
        return 'font-comic';
      default:
        return 'font-system';
    }
  };

  const handleCopy = async () => {
    if (!text || !text.trim()) return;
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2200);
    } catch {
      const el = document.createElement('textarea');
      el.value = text;
      document.body.appendChild(el);
      el.select();
      document.execCommand('copy');
      document.body.removeChild(el);
      setCopied(true);
      setTimeout(() => setCopied(false), 2200);
    }
  };

  const handlePasteFromClipboard = async () => {
    setPasteError(null);
    try {
      if (!navigator.clipboard || !navigator.clipboard.readText) {
        throw new Error('Clipboard API not permitted');
      }
      const clipboardText = await navigator.clipboard.readText();
      if (!clipboardText || !clipboardText.trim()) {
        setPasteError('Clipboard is currently empty. Copy some text first, then paste.');
        setTimeout(() => setPasteError(null), 4000);
        return;
      }
      onUpdateText(clipboardText.trim());
      setPastedFeedback(true);
      setTimeout(() => setPastedFeedback(false), 2500);
    } catch {
      setIsEditing(true);
      setTimeout(() => {
        textareaRef.current?.focus();
      }, 50);
      setPasteError('Press Ctrl+V (or Cmd+V on Mac) to paste directly into the reading box.');
      setTimeout(() => setPasteError(null), 5000);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const renderFormattedContent = () => {
    if (activeWordHighlight && activeWordHighlight.charIndex >= 0) {
      const idx = activeWordHighlight.charIndex;
      const len = activeWordHighlight.length;
      const before = text.slice(0, idx);
      const highlighted = text.slice(idx, idx + len);
      const after = text.slice(idx + len);

      return (
        <div className="whitespace-pre-wrap select-text">
          {before}
          <mark className="bg-blue-500/25 text-current rounded px-1 py-0.5 font-bold underline decoration-blue-600 decoration-2 underline-offset-4">
            {highlighted}
          </mark>
          {after}
        </div>
      );
    }

    if (settings.bionicReading) {
      const bionicHtml = formatBionicText(text);
      return (
        <div
          className="whitespace-pre-wrap select-text [&_b]:font-black [&_b]:opacity-100 opacity-90"
          dangerouslySetInnerHTML={{ __html: bionicHtml }}
        />
      );
    }

    const paragraphs = text.split(/\n\s*\n/);
    return (
      <div>
        {paragraphs.map((para, i) => (
          <p
            key={i}
            className="select-text hyphens-none"
            style={{
              marginBottom: `${settings.paragraphSpacing}em`,
            }}
          >
            {para}
          </p>
        ))}
      </div>
    );
  };

  // Surface contrast styling matching Variation 6 (.content-shell & .btn-glass)
  const shellBorder = isDarkSurface ? 'border-white/10' : 'border-black/[0.08]';
  const glassBtnClass = isDarkSurface
    ? 'border-white/15 bg-white/[0.06] hover:bg-white/[0.12] text-[#E8E5DD] hover:border-white/40'
    : 'border-black/[0.08] bg-white/80 hover:bg-white text-[#151517] hover:border-[#151517]';

  return (
    <div
      ref={containerRef}
      className={`relative flex flex-col justify-between transition-all duration-300 ${
        isFocusMode
          ? 'min-h-screen py-10 sm:py-16 px-4 sm:px-12 md:px-20 border-none shadow-none rounded-none'
          : `min-h-[540px] lg:min-h-[640px] p-5 sm:p-8 lg:p-12 rounded-[28px] lg:rounded-[40px] border ${shellBorder} shadow-[0_30px_60px_rgba(0,0,0,0.03)]`
      } ${getFontFamilyClass()}`}
      style={{
        backgroundColor: settings.backgroundColor,
        color: settings.textColor,
      }}
    >
      {/* Interactive Reading Ruler Overlay */}
      <ReadingRuler
        enabled={settings.readingRuler}
        maskEnabled={settings.readingMask}
        height={settings.rulerHeight}
        color={settings.rulerColor}
        opacity={settings.rulerOpacity}
        containerRef={containerRef}
      />

      {/* Floating Exit Focus Mode Trigger */}
      {isFocusMode && (
        <div className="fixed top-5 right-5 z-50 flex items-center gap-2 px-3.5 py-2 rounded-full bg-black/15 hover:bg-black/30 backdrop-blur-md border border-current/15 text-current text-xs shadow-md transition-all opacity-50 hover:opacity-100 no-print">
          <button
            onClick={onExitFocusMode}
            className="flex items-center gap-1.5 font-semibold cursor-pointer"
            title="Exit Focus Mode (Esc)"
          >
            <Minimize2 className="w-3.5 h-3.5" />
            <span>Exit Focus</span>
            <span className="hidden sm:inline text-[10px] font-mono-label opacity-70 ml-0.5">
              Esc
            </span>
          </button>
          {isAudioActive && onStopAudio && (
            <button
              onClick={onStopAudio}
              className="ml-1 px-2.5 py-1 rounded-full bg-red-600 hover:bg-red-700 text-white text-[11px] font-bold flex items-center gap-1 cursor-pointer"
            >
              <Square className="w-3 h-3 fill-current" />
              <span>Stop</span>
            </button>
          )}
        </div>
      )}

      {/* Top Section: Quiet Document Header + Format Strip */}
      <div>
        {!isFocusMode && (
          <div className="flex flex-wrap items-center justify-between gap-3 pb-4 mb-5 border-b border-current/10 no-print">
            <div className="min-w-0">
              <div className="flex items-baseline gap-2.5 flex-wrap">
                <h2 className="text-base sm:text-lg font-semibold tracking-tight break-words">
                  {hasText ? title : 'Reading Box'}
                </h2>
                {sourceType && (
                  <span className="font-mono-label text-[10px] uppercase tracking-[0.12em] opacity-45">
                    / {sourceType}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2.5 text-[11px] opacity-50 font-mono-label tabular-nums mt-0.5">
                <span>{wordCount} words</span>
                <span aria-hidden="true">·</span>
                <span>{charCount} chars</span>
                {hasText && (
                  <>
                    <span aria-hidden="true">·</span>
                    <span>~{readingTime} min read</span>
                  </>
                )}
              </div>
            </div>

            {/* Quiet inline utilities (unboxed) */}
            <div className="flex flex-wrap items-center gap-1 sm:gap-2">
              <button
                onClick={handlePasteFromClipboard}
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg hover:bg-current/10 text-xs font-medium opacity-75 hover:opacity-100 transition cursor-pointer whitespace-nowrap"
                title="Paste text from clipboard"
              >
                {pastedFeedback ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Pasted</span>
                  </>
                ) : (
                  <>
                    <ClipboardPaste className="w-3.5 h-3.5" />
                    <span>Paste</span>
                  </>
                )}
              </button>

              {onOpenUpload && (
                <button
                  onClick={onOpenUpload}
                  className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg hover:bg-current/10 text-xs font-medium opacity-75 hover:opacity-100 transition cursor-pointer whitespace-nowrap"
                  title="Upload photo or file"
                >
                  <Upload className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Upload</span>
                </button>
              )}

              {hasText && (
                <>
                  <button
                    onClick={handleCopy}
                    className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg hover:bg-current/10 text-xs font-medium opacity-75 hover:opacity-100 transition cursor-pointer whitespace-nowrap"
                    title="Copy text"
                  >
                    {copied ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-600" />
                        <span>Copied</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        <span className="hidden sm:inline">Copy</span>
                      </>
                    )}
                  </button>

                  <button
                    onClick={() => setIsEditing(!isEditing)}
                    className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg hover:bg-current/10 text-xs font-medium opacity-75 hover:opacity-100 transition cursor-pointer whitespace-nowrap"
                    title={isEditing ? 'Switch to reading layout' : 'Edit text'}
                  >
                    {isEditing ? (
                      <>
                        <Eye className="w-3.5 h-3.5" />
                        <span>Reading View</span>
                      </>
                    ) : (
                      <>
                        <Edit3 className="w-3.5 h-3.5" />
                        <span>Edit</span>
                      </>
                    )}
                  </button>

                  <button
                    onClick={handlePrint}
                    className="hidden sm:flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg hover:bg-current/10 text-xs font-medium opacity-75 hover:opacity-100 transition cursor-pointer whitespace-nowrap"
                    title="Print handout"
                  >
                    <Printer className="w-3.5 h-3.5" />
                    <span>Print</span>
                  </button>

                  {onExportPdf && (
                    <button
                      onClick={onExportPdf}
                      disabled={isExportingPdf}
                      className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg hover:bg-blue-600/15 text-blue-600 dark:text-blue-400 text-xs font-semibold transition cursor-pointer whitespace-nowrap disabled:opacity-50"
                      title="Download as dyslexia-friendly PDF preserving font, tint, and spacing"
                    >
                      {isExportingPdf ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <FileDown className="w-3.5 h-3.5" />
                      )}
                      <span>{isExportingPdf ? 'Exporting...' : 'PDF'}</span>
                    </button>
                  )}

                  <button
                    onClick={onClearText}
                    className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg hover:bg-red-500/10 hover:text-red-600 text-xs font-medium opacity-65 hover:opacity-100 transition cursor-pointer whitespace-nowrap"
                    title="Clear text"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">Clear</span>
                  </button>
                </>
              )}
            </div>
          </div>
        )}

        {/* Inline AI Text Enhancer Strip */}
        {!isFocusMode && (
          <TextEnhancerBar
            currentText={text}
            originalText={originalText}
            activeView={activeView}
            onApplyEnhancedText={onApplyEnhancedText}
            onRestoreOriginal={onRestoreOriginal}
            isDarkSurface={isDarkSurface}
          />
        )}

        {pasteError && (
          <div className="mb-4 p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-xs font-medium flex items-center justify-between gap-2">
            <span>{pasteError}</span>
            <button
              onClick={() => setPasteError(null)}
              className="text-xs font-bold underline cursor-pointer shrink-0"
            >
              Dismiss
            </button>
          </div>
        )}
      </div>

      {/* Central Reading Surface */}
      <div
        className={`flex-1 w-full ${isFocusMode ? 'mx-auto' : ''}`}
        style={{
          maxWidth: isFocusMode || (hasText && !isEditing) ? `${settings.maxCharactersPerLine}ch` : '100%',
          textAlign: settings.textAlign,
          fontSize: `${settings.fontSize}px`,
          lineHeight: settings.lineHeight,
          letterSpacing: `${settings.letterSpacing}em`,
          wordSpacing: `${settings.wordSpacing}em`,
        }}
      >
        {!hasText ? (
          <div className="flex flex-col h-full justify-between min-h-[300px]">
            <textarea
              ref={textareaRef}
              value={text}
              onChange={(e) => onUpdateText(e.target.value)}
              placeholder="The text you enter here will be transformed to reduce visual stress..."
              rows={9}
              className="w-full flex-1 border-none outline-none bg-transparent text-current font-inherit resize-none placeholder:opacity-35"
              style={{
                fontSize: `${settings.fontSize}px`,
                lineHeight: settings.lineHeight,
                letterSpacing: `${settings.letterSpacing}em`,
                wordSpacing: `${settings.wordSpacing}em`,
              }}
            />

            {/* Subtle unboxed quick-import prompts */}
            <div className="pt-4 mt-4 flex flex-wrap items-center gap-x-5 gap-y-2 text-xs opacity-60 no-print">
              <button
                onClick={handlePasteFromClipboard}
                className="hover:opacity-100 hover:text-blue-600 transition flex items-center gap-1.5 cursor-pointer"
              >
                <ClipboardPaste className="w-3.5 h-3.5" />
                <span>Paste from clipboard</span>
              </button>
              {onOpenUpload && (
                <button
                  onClick={onOpenUpload}
                  className="hover:opacity-100 hover:text-blue-600 transition flex items-center gap-1.5 cursor-pointer"
                >
                  <Upload className="w-3.5 h-3.5" />
                  <span>Upload photo</span>
                </button>
              )}
              {onOpenBrowser && (
                <button
                  onClick={onOpenBrowser}
                  className="hover:opacity-100 hover:text-blue-600 transition flex items-center gap-1.5 cursor-pointer"
                >
                  <Globe className="w-3.5 h-3.5" />
                  <span>Browse the web</span>
                </button>
              )}
              {onOpenSamples && (
                <button
                  onClick={onOpenSamples}
                  className="hover:opacity-100 hover:text-blue-600 transition flex items-center gap-1.5 cursor-pointer"
                >
                  <BookOpen className="w-3.5 h-3.5" />
                  <span>Try sample text</span>
                </button>
              )}
              {onOpenCalibration && (
                <button
                  onClick={onOpenCalibration}
                  className="hover:opacity-100 hover:text-blue-600 transition cursor-pointer"
                >
                  Run 45s reading calibration →
                </button>
              )}
            </div>
          </div>
        ) : isEditing ? (
          <textarea
            ref={textareaRef}
            value={text}
            onChange={(e) => onUpdateText(e.target.value)}
            rows={14}
            className="w-full min-h-[340px] border-none outline-none bg-transparent text-current font-inherit resize-y"
            style={{
              fontSize: `${settings.fontSize}px`,
              lineHeight: settings.lineHeight,
              letterSpacing: `${settings.letterSpacing}em`,
              wordSpacing: `${settings.wordSpacing}em`,
            }}
            placeholder="Type or paste text here..."
          />
        ) : (
          <div className="py-1">{renderFormattedContent()}</div>
        )}
      </div>

      {/* Bottom Variation 6 Action Bar */}
      {!isFocusMode && (
        <div className="mt-8 pt-6 border-t border-current/10 flex flex-col sm:flex-row items-stretch sm:items-center gap-3 no-print">
          {/* Primary Glass Action: Read Aloud / Pause */}
          <div className="flex items-center gap-2 flex-1">
            <button
              onClick={onToggleAudio}
              disabled={!hasText}
              className={`flex-1 py-4 px-5 rounded-[20px] sm:rounded-[24px] text-xs font-bold uppercase tracking-[0.1em] transition-all cursor-pointer flex items-center justify-center gap-2 whitespace-nowrap active:scale-[0.99] ${
                !hasText
                  ? 'bg-blue-600/45 text-white/80 cursor-not-allowed'
                  : 'bg-blue-600 hover:bg-blue-700 text-white shadow-sm'
              }`}
              title={
                !hasText
                  ? 'Enter or scan text first to read aloud'
                  : isAudioPlaying && !isAudioPaused
                  ? 'Pause reading aloud'
                  : 'Read aloud with Cornish voice'
              }
            >
              {isAudioPlaying && !isAudioPaused ? (
                <>
                  <Pause className="w-4 h-4 fill-current" />
                  <span>Pause Reading</span>
                </>
              ) : (
                <>
                  <Play className="w-4 h-4 fill-current" />
                  <span>{isAudioPaused ? 'Resume Reading' : 'Start Reading Aloud'}</span>
                </>
              )}
            </button>

            {isAudioActive && onStopAudio && (
              <button
                onClick={onStopAudio}
                className="py-4 px-5 rounded-[20px] sm:rounded-[24px] bg-red-600 hover:bg-red-700 text-white text-xs font-bold uppercase tracking-[0.1em] transition-all cursor-pointer flex items-center justify-center gap-1.5 whitespace-nowrap shadow-sm active:scale-[0.98]"
                title="Stop reading immediately (Esc)"
              >
                <Square className="w-3.5 h-3.5 fill-current" />
                <span>Stop</span>
              </button>
            )}
          </div>

          {/* Glass Button: Focus View */}
          {onToggleFocusMode && (
            <button
              onClick={onToggleFocusMode}
              className={`flex-1 py-4 px-5 rounded-[20px] sm:rounded-[24px] border backdrop-blur-md text-xs font-bold uppercase tracking-[0.1em] transition-all cursor-pointer flex items-center justify-center gap-2 whitespace-nowrap active:scale-[0.99] ${glassBtnClass}`}
              title="Enter distraction-free Focus View (Press F or Esc to exit)"
            >
              <span>Focus View</span>
            </button>
          )}

          {/* Glass Button: Scan Page */}
          {onOpenScanner && (
            <button
              onClick={onOpenScanner}
              className={`flex-1 py-4 px-5 rounded-[20px] sm:rounded-[24px] border backdrop-blur-md text-xs font-bold uppercase tracking-[0.1em] transition-all cursor-pointer flex items-center justify-center gap-2 whitespace-nowrap active:scale-[0.99] ${glassBtnClass}`}
              title="Scan printed page or book using camera"
            >
              <Camera className="w-4 h-4 opacity-75" />
              <span>Scan Page</span>
            </button>
          )}
        </div>
      )}
    </div>
  );
};
