import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  X,
  ArrowLeft,
  ArrowRight,
  RotateCw,
  Home,
  Search,
  Globe,
  ExternalLink,
  BookOpen,
  FileDown,
  Loader2,
  Palette,
  ZoomIn,
  ZoomOut,
} from 'lucide-react';
import { DyslexiaSettings, FontFamily, FONT_OPTIONS } from '../types';

interface SearchResult {
  title: string;
  url: string;
  snippet: string;
  source: string;
}

type HistoryEntry =
  | { type: 'browse'; url: string }
  | { type: 'search'; query: string };

type SpacingLevel = 'standard' | 'wide' | 'extra';

const SPACING_PRESETS: Record<
  SpacingLevel,
  { label: string; ls: number; ws: number; lh: number }
> = {
  standard: { label: 'Normal', ls: 0.05, ws: 0.14, lh: 1.55 },
  wide: { label: 'Wide', ls: 0.1, ws: 0.24, lh: 1.75 },
  extra: { label: 'Extra Wide', ls: 0.16, ws: 0.34, lh: 1.95 },
};

interface WebBrowserModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: DyslexiaSettings;
  onUpdateSettings?: React.Dispatch<React.SetStateAction<DyslexiaSettings>>;
  isDarkSurface: boolean;
  onImportToReader: (title: string, text: string, sourceUrl: string) => void;
  onExportPdf?: (title: string, text: string) => Promise<void>;
}

const QUICK_SITES = [
  {
    label: 'BBC News',
    url: 'https://www.bbc.co.uk/news',
    desc: 'Full news feed & pictures in dyslexia-friendly font',
  },
  {
    label: 'Wikipedia — Cornwall',
    url: 'https://en.wikipedia.org/wiki/Cornwall',
    desc: 'Full encyclopedia article with images & sidebar',
  },
  {
    label: 'Simple English Wikipedia',
    url: 'https://simple.wikipedia.org/wiki/Dyslexia',
    desc: 'Clear, accessible explanations with original layout',
  },
  {
    label: 'CBBC Newsround',
    url: 'https://www.bbc.co.uk/newsround',
    desc: 'Illustrated news feed with clearer spacing',
  },
];

function isUrlLike(input: string): boolean {
  return (
    /^https?:\/\//i.test(input) ||
    (!/\s/.test(input) && /\.[a-z]{2,}(\/|$|\?)/i.test(input))
  );
}

function normalizeUrl(input: string): string {
  return /^https?:\/\//i.test(input) ? input : `https://${input}`;
}

function buildClientBrowseCss(opts: {
  font: FontFamily;
  ls: number;
  ws: number;
  lh: number;
  scale: number;
  tint: boolean;
  bg: string;
  fg: string;
}): string {
  const fontMap: Record<string, string> = {
    OpenDyslexic: "'OpenDyslexic', 'Lexend', sans-serif",
    Lexend: "'Lexend', sans-serif",
    'Atkinson Hyperlegible': "'Atkinson Hyperlegible', sans-serif",
    'Comic Neue': "'Comic Neue', cursive, sans-serif",
    'System Sans': "system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif",
  };
  const fontStack = fontMap[opts.font] || fontMap.OpenDyslexic;
  const isDarkBg =
    opts.bg.toLowerCase() === '#202227' || opts.bg.toLowerCase() === '#151517';
  const linkColor = isDarkBg ? '#93C5FD' : '#1D4ED8';

  const tintCss = opts.tint
    ? `
      html, body, main, article, section, [role="main"], #content, .mw-body, .mw-page-container {
        background-color: ${opts.bg} !important;
        color: ${opts.fg} !important;
      }
      p, li, h1, h2, h3, h4, h5, h6, blockquote, figcaption, td, th, dt, dd, span:not([class*="icon"]):not([class*="Icon"]):not([aria-hidden="true"]) {
        color: ${opts.fg} !important;
      }
      a, a span {
        color: ${linkColor} !important;
      }
    `
    : '';

  return `
    html {
      zoom: ${opts.scale};
    }
    body, p, li, a, h1, h2, h3, h4, h5, h6, article, section, main, blockquote, figcaption, td, th, dt, dd, label, input, button, textarea, select,
    span:not([class*="icon"]):not([class*="Icon"]):not([class*="mw-ui-icon"]):not([aria-hidden="true"]):not(.fa):not(.fas):not(.far):not(.fab):not(.material-icons):not(.material-symbols-outlined) {
      font-family: ${fontStack} !important;
      letter-spacing: ${opts.ls}em !important;
      word-spacing: ${opts.ws}em !important;
    }
    p, li, blockquote, figcaption, td, th, dt, dd, h1, h2, h3, h4, h5, h6 {
      line-height: ${opts.lh} !important;
    }
    img, picture img {
      opacity: 1 !important;
      visibility: visible !important;
    }
    ${tintCss}
  `;
}

export const WebBrowserModal: React.FC<WebBrowserModalProps> = ({
  isOpen,
  onClose,
  settings,
  onUpdateSettings,
  isDarkSurface,
  onImportToReader,
  onExportPdf,
}) => {
  const iframeRef = useRef<HTMLIFrameElement | null>(null);

  const [addressInput, setAddressInput] = useState('');
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [historyIdx, setHistoryIdx] = useState<number>(-1);

  const [viewMode, setViewMode] = useState<'home' | 'search' | 'browse'>('home');
  const [browseSrc, setBrowseSrc] = useState<string>('');
  const [currentUrl, setCurrentUrl] = useState<string>('');
  const [currentTitle, setCurrentTitle] = useState<string>('');

  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);

  const [isLoading, setIsLoading] = useState(false);
  const [isExtracting, setIsExtracting] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Browser-specific visual controls (live-synced into iframe without reloading)
  const [browserFont, setBrowserFont] = useState<FontFamily>(settings.fontFamily);
  const [spacingLevel, setSpacingLevel] = useState<SpacingLevel>('wide');
  const [textScale, setTextScale] = useState<number>(1);
  const [applyTint, setApplyTint] = useState<boolean>(false);

  // Keep local browserFont synced when modal opens or external settings change
  useEffect(() => {
    setBrowserFont(settings.fontFamily);
  }, [settings.fontFamily]);

  const activeSpacing = SPACING_PRESETS[spacingLevel];

  const buildCurrentCss = useCallback(() => {
    return buildClientBrowseCss({
      font: browserFont,
      ls: activeSpacing.ls,
      ws: activeSpacing.ws,
      lh: activeSpacing.lh,
      scale: textScale,
      tint: applyTint,
      bg: settings.backgroundColor,
      fg: settings.textColor,
    });
  }, [
    browserFont,
    activeSpacing.ls,
    activeSpacing.ws,
    activeSpacing.lh,
    textScale,
    applyTint,
    settings.backgroundColor,
    settings.textColor,
  ]);

  // Push font/spacing/tint changes straight into the loaded iframe without reloading
  const pushLiveStyleToIframe = useCallback(() => {
    const win = iframeRef.current?.contentWindow;
    if (!win) return;
    try {
      win.postMessage(
        {
          type: 'abg-update-style',
          css: buildCurrentCss(),
        },
        '*'
      );
    } catch {
      // Ignore transient frame attach states
    }
  }, [buildCurrentCss]);

  useEffect(() => {
    if (viewMode === 'browse') {
      pushLiveStyleToIframe();
    }
  }, [viewMode, pushLiveStyleToIframe]);

  const buildProxyUrl = useCallback(
    (targetUrl: string) => {
      const params = new URLSearchParams({
        url: targetUrl,
        font: browserFont,
        ls: String(activeSpacing.ls),
        ws: String(activeSpacing.ws),
        lh: String(activeSpacing.lh),
        scale: String(textScale),
        tint: applyTint ? '1' : '0',
        bg: settings.backgroundColor,
        fg: settings.textColor,
      });
      return `/api/browse?${params.toString()}`;
    },
    [
      browserFont,
      activeSpacing.ls,
      activeSpacing.ws,
      activeSpacing.lh,
      textScale,
      applyTint,
      settings.backgroundColor,
      settings.textColor,
    ]
  );

  const openBrowseUrl = useCallback(
    (rawUrl: string, pushHistory = true) => {
      const targetUrl = normalizeUrl(rawUrl.trim());
      setErrorMsg(null);
      setIsLoading(true);
      setViewMode('browse');
      setCurrentUrl(targetUrl);
      setCurrentTitle(targetUrl);
      setAddressInput(targetUrl);
      setBrowseSrc(buildProxyUrl(targetUrl));

      if (pushHistory) {
        setHistory((prev) => {
          const next = prev.slice(0, historyIdx + 1);
          next.push({ type: 'browse', url: targetUrl });
          setHistoryIdx(next.length - 1);
          return next;
        });
      }
    },
    [buildProxyUrl, historyIdx]
  );

  const runSearch = useCallback(
    async (query: string, pushHistory = true) => {
      const cleanQuery = query.trim();
      if (!cleanQuery) return;

      setIsLoading(true);
      setErrorMsg(null);
      setAddressInput(cleanQuery);
      setSearchQuery(cleanQuery);
      setViewMode('search');

      try {
        const resp = await fetch('/api/fetch-web', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ url: cleanQuery }),
        });
        const data = await resp.json();
        if (!resp.ok || data.error) {
          throw new Error(data.error || 'Search failed.');
        }

        setSearchResults(data.results || []);

        if (pushHistory) {
          setHistory((prev) => {
            const next = prev.slice(0, historyIdx + 1);
            next.push({ type: 'search', query: cleanQuery });
            setHistoryIdx(next.length - 1);
            return next;
          });
        }
      } catch (err: unknown) {
        setErrorMsg((err as Error).message || 'Could not perform search.');
      } finally {
        setIsLoading(false);
      }
    },
    [historyIdx]
  );

  const navigate = useCallback(
    (input: string, pushHistory = true) => {
      const clean = input.trim();
      if (!clean) return;
      if (isUrlLike(clean)) {
        openBrowseUrl(clean, pushHistory);
      } else {
        runSearch(clean, pushHistory);
      }
    },
    [openBrowseUrl, runSearch]
  );

  // Listen for link clicks & page load events from inside the proxied iframe
  useEffect(() => {
    if (!isOpen) return;

    const onMessage = (ev: MessageEvent) => {
      const msg = ev.data;
      if (!msg || typeof msg !== 'object') return;

      if (msg.type === 'abg-navigate' && typeof msg.url === 'string') {
        openBrowseUrl(msg.url, true);
      } else if (msg.type === 'abg-loaded') {
        setIsLoading(false);
        if (typeof msg.url === 'string' && msg.url) {
          setCurrentUrl(msg.url);
          setAddressInput(msg.url);
        }
        if (typeof msg.title === 'string' && msg.title) {
          setCurrentTitle(msg.title);
        }
      }
    };

    window.addEventListener('message', onMessage);
    return () => window.removeEventListener('message', onMessage);
  }, [isOpen, openBrowseUrl]);

  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) onClose();
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    navigate(addressInput, true);
  };

  const handleBack = () => {
    if (historyIdx <= 0) {
      setViewMode('home');
      setBrowseSrc('');
      setCurrentUrl('');
      setCurrentTitle('');
      setAddressInput('');
      setHistoryIdx(-1);
      setErrorMsg(null);
      setIsLoading(false);
      return;
    }
    const prevIdx = historyIdx - 1;
    const prevEntry = history[prevIdx];
    setHistoryIdx(prevIdx);
    if (prevEntry.type === 'browse') {
      openBrowseUrl(prevEntry.url, false);
    } else {
      runSearch(prevEntry.query, false);
    }
  };

  const handleForward = () => {
    if (historyIdx >= history.length - 1) return;
    const nextIdx = historyIdx + 1;
    const nextEntry = history[nextIdx];
    setHistoryIdx(nextIdx);
    if (nextEntry.type === 'browse') {
      openBrowseUrl(nextEntry.url, false);
    } else {
      runSearch(nextEntry.query, false);
    }
  };

  const handleHome = () => {
    setViewMode('home');
    setBrowseSrc('');
    setCurrentUrl('');
    setCurrentTitle('');
    setAddressInput('');
    setErrorMsg(null);
    setIsLoading(false);
  };

  const handleRefresh = () => {
    if (viewMode === 'browse' && currentUrl) {
      setIsLoading(true);
      setBrowseSrc(buildProxyUrl(currentUrl) + `&_r=${Date.now()}`);
    } else if (viewMode === 'search' && searchQuery) {
      runSearch(searchQuery, false);
    } else if (addressInput.trim()) {
      navigate(addressInput, false);
    }
  };

  const handleSelectFont = (font: FontFamily) => {
    setBrowserFont(font);
    if (onUpdateSettings) {
      onUpdateSettings((prev) => ({ ...prev, fontFamily: font }));
    }
  };

  const extractReadableArticle = async (): Promise<{
    title: string;
    text: string;
    url: string;
  } | null> => {
    // 1. Try reading directly from the same-origin iframe DOM
    try {
      const doc = iframeRef.current?.contentDocument;
      if (doc && doc.body) {
        const headingTitle =
          doc.querySelector('h1')?.textContent?.replace(/\s+/g, ' ').trim() ||
          doc.title ||
          currentTitle ||
          currentUrl;

        const root =
          doc.querySelector('.mw-parser-output') ||
          doc.querySelector('article') ||
          doc.querySelector('main') ||
          doc.querySelector('[role="main"]') ||
          doc.body;

        const seen = new Set<string>();
        const paragraphs: string[] = [];
        root.querySelectorAll('h1, h2, h3, p, li, blockquote').forEach((el) => {
          if (el.closest('nav, footer, aside, [role="navigation"]')) return;
          const t = (el.textContent || '').replace(/\s+/g, ' ').trim();
          if (!t || t.length < 18 || seen.has(t)) return;
          seen.add(t);
          paragraphs.push(el.tagName.toLowerCase() === 'li' ? `• ${t}` : t);
        });

        const combined = paragraphs.join('\n\n').slice(0, 35000);
        if (combined.length >= 120) {
          return { title: headingTitle, text: combined, url: currentUrl };
        }
      }
    } catch {
      // Fallback below
    }

    // 2. Fallback to backend clean text extractor
    if (!currentUrl) return null;
    const resp = await fetch('/api/fetch-web', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url: currentUrl }),
    });
    const data = await resp.json();
    if (resp.ok && data.type === 'page' && data.text) {
      return {
        title: data.title || currentTitle || currentUrl,
        text: data.text,
        url: data.url || currentUrl,
      };
    }
    return null;
  };

  const handleImport = async () => {
    if (viewMode !== 'browse' || !currentUrl) return;
    try {
      setIsExtracting(true);
      const extracted = await extractReadableArticle();
      if (extracted && extracted.text) {
        onImportToReader(extracted.title, extracted.text, extracted.url);
        onClose();
      }
    } finally {
      setIsExtracting(false);
    }
  };

  const handleExportCurrentPdf = async () => {
    if (viewMode !== 'browse' || !currentUrl || !onExportPdf) return;
    try {
      setIsExporting(true);
      const extracted = await extractReadableArticle();
      if (extracted && extracted.text) {
        await onExportPdf(extracted.title, extracted.text);
      }
    } finally {
      setIsExporting(false);
    }
  };

  const borderClass = isDarkSurface ? 'border-white/12' : 'border-black/10';
  const subtleBg = isDarkSurface ? 'bg-white/[0.05]' : 'bg-black/[0.04]';
  const cardBg = isDarkSurface
    ? 'bg-white/[0.04] hover:bg-white/[0.09] border-white/12'
    : 'bg-white/80 hover:bg-white border-black/[0.08]';

  const browserFontClass =
    browserFont === 'OpenDyslexic'
      ? 'font-opendyslexic'
      : browserFont === 'Lexend'
      ? 'font-lexend'
      : browserFont === 'Atkinson Hyperlegible'
      ? 'font-atkinson'
      : browserFont === 'Comic Neue'
      ? 'font-comic'
      : 'font-system';

  return (
    <div
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-1.5 sm:p-4 animate-in fade-in duration-150"
    >
      <div
        className={`w-full max-w-6xl h-[93vh] rounded-[24px] sm:rounded-[28px] border ${borderClass} shadow-2xl flex flex-col overflow-hidden`}
        style={{
          backgroundColor: settings.backgroundColor,
          color: settings.textColor,
        }}
      >
        {/* Top Browser Chrome */}
        <div className={`px-3 sm:px-5 py-2.5 border-b ${borderClass} space-y-2 shrink-0`}>
          {/* Title & Action Bar */}
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <Globe className="w-4 h-4 text-blue-600 shrink-0" />
              <span className="font-mono-label text-[11px] sm:text-xs font-bold uppercase tracking-[0.12em] shrink-0">
                Dyslexia Browser
              </span>
              {viewMode === 'browse' && currentTitle && (
                <span className="hidden md:inline text-xs opacity-55 truncate max-w-[300px]">
                  · {currentTitle}
                </span>
              )}
            </div>

            <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
              {viewMode === 'browse' && currentUrl && (
                <>
                  {onExportPdf && (
                    <button
                      onClick={handleExportCurrentPdf}
                      disabled={isExporting || isExtracting}
                      className={`hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl border ${borderClass} ${subtleBg} text-xs font-semibold transition cursor-pointer disabled:opacity-50`}
                      title="Export current web page as dyslexia-friendly PDF"
                    >
                      {isExporting ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <FileDown className="w-3.5 h-3.5 text-blue-600" />
                      )}
                      <span>Export PDF</span>
                    </button>
                  )}

                  <button
                    onClick={handleImport}
                    disabled={isExtracting || isExporting}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-xs transition cursor-pointer whitespace-nowrap disabled:opacity-50"
                    title="Extract page text into ABG Reading Box for Cornish voice & ruler"
                  >
                    {isExtracting ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <BookOpen className="w-3.5 h-3.5" />
                    )}
                    <span>Open in Reader</span>
                  </button>
                </>
              )}

              <button
                onClick={onClose}
                className={`w-8 h-8 rounded-full ${subtleBg} hover:opacity-80 flex items-center justify-center transition cursor-pointer`}
                aria-label="Close Web Browser"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Row 2: Browser Navigation + Omnibox */}
          <div className="flex items-center gap-1.5 sm:gap-2">
            <div className="flex items-center gap-1 shrink-0">
              <button
                onClick={handleBack}
                disabled={historyIdx < 0 && viewMode === 'home'}
                className={`p-2 rounded-xl ${subtleBg} hover:opacity-85 disabled:opacity-30 transition cursor-pointer`}
                title="Back"
                aria-label="Back"
              >
                <ArrowLeft className="w-4 h-4" />
              </button>
              <button
                onClick={handleForward}
                disabled={historyIdx >= history.length - 1}
                className={`p-2 rounded-xl ${subtleBg} hover:opacity-85 disabled:opacity-30 transition cursor-pointer`}
                title="Forward"
                aria-label="Forward"
              >
                <ArrowRight className="w-4 h-4" />
              </button>
              <button
                onClick={handleRefresh}
                disabled={viewMode === 'home' && !addressInput.trim()}
                className={`p-2 rounded-xl ${subtleBg} hover:opacity-85 disabled:opacity-30 transition cursor-pointer`}
                title="Reload"
                aria-label="Reload"
              >
                <RotateCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
              </button>
              <button
                onClick={handleHome}
                className={`p-2 rounded-xl ${subtleBg} hover:opacity-85 transition cursor-pointer`}
                title="Browser Home"
                aria-label="Browser Home"
              >
                <Home className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="flex-1 flex items-center gap-1.5 min-w-0">
              <div
                className={`flex-1 flex items-center gap-2 px-3 py-1.5 sm:py-2 rounded-xl border ${borderClass} ${subtleBg} focus-within:ring-2 focus-within:ring-blue-500/40 min-w-0`}
              >
                <Search className="w-3.5 h-3.5 opacity-55 shrink-0" />
                <input
                  type="text"
                  value={addressInput}
                  onChange={(e) => setAddressInput(e.target.value)}
                  placeholder="Enter any website (bbc.co.uk/news, wikipedia.org) or search topic..."
                  className="w-full bg-transparent outline-none text-xs sm:text-sm font-medium placeholder:opacity-45"
                />
              </div>
              <button
                type="submit"
                disabled={!addressInput.trim()}
                className="px-3.5 sm:px-4 py-1.5 sm:py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold uppercase tracking-wider transition cursor-pointer disabled:opacity-45 shrink-0"
              >
                Go
              </button>
            </form>
          </div>

          {/* Row 3: Live Dyslexia Font, Spacing & Tint Bar */}
          <div className="flex flex-wrap items-center justify-between gap-2 pt-0.5">
            {/* Quick Font Switcher */}
            <div className="flex items-center gap-1 overflow-x-auto no-scrollbar">
              <span className="font-mono-label text-[10px] uppercase tracking-wider opacity-45 mr-1 hidden sm:inline">
                Font:
              </span>
              {FONT_OPTIONS.map((opt) => {
                const active = browserFont === opt.value;
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => handleSelectFont(opt.value)}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition cursor-pointer whitespace-nowrap border ${
                      active
                        ? 'bg-blue-600 text-white border-blue-600'
                        : `${subtleBg} ${borderClass} hover:opacity-85`
                    }`}
                  >
                    {opt.label}
                  </button>
                );
              })}
            </div>

            {/* Spacing, Zoom & Glare Tint Controls */}
            <div className="flex items-center gap-1.5 flex-wrap">
              {/* Spacing Presets */}
              <div className={`flex items-center rounded-lg border ${borderClass} p-0.5 ${subtleBg}`}>
                {(Object.keys(SPACING_PRESETS) as SpacingLevel[]).map((lvl) => {
                  const active = spacingLevel === lvl;
                  return (
                    <button
                      key={lvl}
                      type="button"
                      onClick={() => setSpacingLevel(lvl)}
                      className={`px-2 py-0.5 rounded-md text-[10px] font-semibold transition cursor-pointer ${
                        active ? 'bg-blue-600 text-white' : 'opacity-70 hover:opacity-100'
                      }`}
                      title={`Text spacing: ${SPACING_PRESETS[lvl].label}`}
                    >
                      {SPACING_PRESETS[lvl].label}
                    </button>
                  );
                })}
              </div>

              {/* Zoom */}
              <div className={`flex items-center rounded-lg border ${borderClass} ${subtleBg}`}>
                <button
                  type="button"
                  onClick={() => setTextScale((s) => Math.max(0.85, Number((s - 0.1).toFixed(2))))}
                  className="p-1 px-1.5 hover:opacity-75 cursor-pointer"
                  title="Smaller text"
                  aria-label="Smaller text"
                >
                  <ZoomOut className="w-3.5 h-3.5" />
                </button>
                <span className="text-[10px] font-mono-label px-1 opacity-70">
                  {Math.round(textScale * 100)}%
                </span>
                <button
                  type="button"
                  onClick={() => setTextScale((s) => Math.min(1.4, Number((s + 0.1).toFixed(2))))}
                  className="p-1 px-1.5 hover:opacity-75 cursor-pointer"
                  title="Larger text"
                  aria-label="Larger text"
                >
                  <ZoomIn className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Original Site Colors vs Anti-Glare Tint */}
              <button
                type="button"
                onClick={() => setApplyTint((v) => !v)}
                className={`flex items-center gap-1 px-2.5 py-1 rounded-lg border text-[11px] font-semibold transition cursor-pointer ${
                  applyTint
                    ? 'bg-blue-600 text-white border-blue-600'
                    : `${subtleBg} ${borderClass} hover:opacity-85`
                }`}
                title="Keep website's normal colors or overlay your anti-glare tint"
              >
                <Palette className="w-3 h-3" />
                <span>{applyTint ? 'Tint On' : 'Original Colors'}</span>
              </button>
            </div>
          </div>
        </div>

        {/* Loading Bar */}
        {isLoading && (
          <div className="h-0.5 w-full bg-blue-600/20 overflow-hidden shrink-0">
            <div className="h-full w-1/3 bg-blue-600 animate-pulse" />
          </div>
        )}

        {/* Browser Viewport Body */}
        <div className="flex-1 relative overflow-hidden">
          {viewMode === 'browse' ? (
            <iframe
              ref={iframeRef}
              src={browseSrc}
              title={currentTitle || 'Dyslexia Web Browser'}
              onLoad={() => {
                setIsLoading(false);
                pushLiveStyleToIframe();
              }}
              className="w-full h-full border-0 bg-white"
            />
          ) : (
            <div className={`w-full h-full overflow-y-auto p-4 sm:p-8 ${browserFontClass}`}>
              {errorMsg ? (
                <div className="max-w-xl mx-auto mt-10 p-6 rounded-2xl border border-red-500/30 bg-red-500/10 space-y-3 text-center">
                  <p className="font-bold text-sm">{errorMsg}</p>
                  <button
                    onClick={handleHome}
                    className="px-4 py-2 rounded-xl bg-blue-600 text-white text-xs font-bold cursor-pointer"
                  >
                    Back to Home
                  </button>
                </div>
              ) : viewMode === 'search' ? (
                <div
                  className="max-w-3xl mx-auto space-y-5"
                  style={{
                    lineHeight: activeSpacing.lh,
                    letterSpacing: `${activeSpacing.ls}em`,
                    wordSpacing: `${activeSpacing.ws}em`,
                  }}
                >
                  <div className={`pb-3 border-b ${borderClass}`}>
                    <span className="font-mono-label text-[11px] uppercase tracking-[0.14em] opacity-50">
                      Search Results · {searchResults.length} found
                    </span>
                    <h3 className="text-lg font-bold mt-1">&ldquo;{searchQuery}&rdquo;</h3>
                  </div>

                  {isLoading ? (
                    <div className="py-12 flex items-center justify-center gap-3 opacity-70">
                      <Loader2 className="w-5 h-5 animate-spin text-blue-600" />
                      <span className="text-sm">Searching Wikipedia...</span>
                    </div>
                  ) : searchResults.length === 0 ? (
                    <p className="text-sm opacity-75">
                      No topics matched. Try entering a website address like bbc.co.uk/news.
                    </p>
                  ) : (
                    <div className="space-y-3">
                      {searchResults.map((item) => (
                        <button
                          key={item.url}
                          onClick={() => openBrowseUrl(item.url, true)}
                          className={`w-full p-4 rounded-2xl border text-left transition cursor-pointer block ${cardBg}`}
                        >
                          <div className="text-xs font-mono-label opacity-50 mb-1">
                            {item.source}
                          </div>
                          <div className="font-bold text-blue-600 dark:text-blue-400">
                            {item.title}
                          </div>
                          {item.snippet && (
                            <p className="text-sm opacity-80 mt-1 leading-relaxed">
                              {item.snippet}...
                            </p>
                          )}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                /* Browser Home Screen */
                <div
                  className="max-w-3xl mx-auto py-4 sm:py-8 space-y-8"
                  style={{
                    lineHeight: activeSpacing.lh,
                    letterSpacing: `${activeSpacing.ls}em`,
                    wordSpacing: `${activeSpacing.ws}em`,
                  }}
                >
                  <div className="space-y-2">
                    <h3 className="text-xl sm:text-2xl font-bold tracking-tight">
                      Normal Web Browsing — Easier to Read
                    </h3>
                    <p className="text-sm opacity-75 leading-relaxed">
                      Browse websites like BBC News or Wikipedia with their full layout, feeds, and pictures intact — automatically switched into{' '}
                      <strong>{browserFont}</strong> with extra letter and line spacing.
                    </p>
                  </div>

                  <div>
                    <span className="font-mono-label text-[11px] uppercase tracking-[0.14em] opacity-50 block mb-3">
                      Popular Sites
                    </span>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {QUICK_SITES.map((site) => (
                        <button
                          key={site.url}
                          onClick={() => openBrowseUrl(site.url, true)}
                          className={`p-4 rounded-2xl border text-left transition cursor-pointer flex items-start justify-between gap-3 ${cardBg}`}
                        >
                          <div className="min-w-0">
                            <div className="font-bold text-sm truncate">{site.label}</div>
                            <div className="text-xs opacity-65 mt-1">{site.desc}</div>
                          </div>
                          <ExternalLink className="w-4 h-4 opacity-40 shrink-0 mt-0.5" />
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
