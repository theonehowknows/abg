import React, { useState, useRef, useEffect } from 'react';
import { Loader2 } from 'lucide-react';

interface TextEnhancerBarProps {
  currentText: string;
  originalText: string;
  activeView: 'standard' | 'simplified' | 'bullets' | 'syllables' | 'summary';
  onApplyEnhancedText: (
    enhanced: string,
    viewType: 'standard' | 'simplified' | 'bullets' | 'syllables' | 'summary'
  ) => void;
  onRestoreOriginal: () => void;
  isDarkSurface?: boolean;
}

export const TextEnhancerBar: React.FC<TextEnhancerBarProps> = ({
  originalText,
  activeView,
  onApplyEnhancedText,
  onRestoreOriginal,
  isDarkSurface = false,
}) => {
  const [loadingAction, setLoadingAction] = useState<string | null>(null);
  const cacheRef = useRef<Map<string, string>>(new Map());

  const viewMapping: Record<'simplify' | 'bullets' | 'syllables' | 'summarize', 'simplified' | 'bullets' | 'syllables' | 'summary'> = {
    simplify: 'simplified',
    bullets: 'bullets',
    syllables: 'syllables',
    summarize: 'summary',
  };

  // Pre-fetch common enhancements silently for instant responsiveness
  useEffect(() => {
    if (!originalText || originalText.trim().length < 20) return;

    const timer = setTimeout(() => {
      const actionsToPreload: ('simplify' | 'bullets')[] = ['simplify', 'bullets'];
      actionsToPreload.forEach(async (act) => {
        const cacheKey = `${act}:${originalText}`;
        if (cacheRef.current.has(cacheKey)) return;
        try {
          const resp = await fetch('/api/enhance-text', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ text: originalText, action: act }),
          });
          if (resp.ok) {
            const data = await resp.json();
            if (data.result) {
              cacheRef.current.set(cacheKey, data.result);
            }
          }
        } catch {
          // Best-effort background warmup
        }
      });
    }, 800);

    return () => clearTimeout(timer);
  }, [originalText]);

  const handleEnhance = async (action: 'simplify' | 'bullets' | 'syllables' | 'summarize') => {
    if (!originalText || loadingAction) return;

    const cacheKey = `${action}:${originalText}`;
    if (cacheRef.current.has(cacheKey)) {
      const cachedResult = cacheRef.current.get(cacheKey)!;
      onApplyEnhancedText(cachedResult, viewMapping[action]);
      return;
    }

    try {
      setLoadingAction(action);
      const response = await fetch('/api/enhance-text', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: originalText,
          action,
        }),
      });

      const data = await response.json();
      if (!response.ok || data.error) {
        throw new Error(data.error || 'Failed to enhance text.');
      }

      cacheRef.current.set(cacheKey, data.result);
      onApplyEnhancedText(data.result, viewMapping[action]);
    } catch (err: unknown) {
      console.warn('Enhancement error:', err);
    } finally {
      setLoadingAction(null);
    }
  };

  const hasText = Boolean(originalText && originalText.trim().length > 0);
  if (!hasText) return null;

  const inactiveTab = isDarkSurface
    ? 'text-white/60 hover:text-white hover:bg-white/10'
    : 'text-[#151517]/60 hover:text-[#151517] hover:bg-black/[0.04]';

  const activeTab = 'bg-blue-600 text-white shadow-2xs';

  return (
    <div className="flex items-center gap-2 pb-4 mb-5 border-b border-current/10 overflow-x-auto scrollbar-none no-print">
      <span className="font-mono-label text-[10px] uppercase tracking-[0.14em] opacity-45 shrink-0 mr-1">
        Format
      </span>

      <div className="flex items-center gap-1 p-1 rounded-xl bg-current/[0.04]">
        <button
          onClick={onRestoreOriginal}
          className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
            activeView === 'standard' ? activeTab : inactiveTab
          }`}
        >
          Original
        </button>

        <button
          onClick={() => handleEnhance('simplify')}
          disabled={!!loadingAction}
          className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors whitespace-nowrap shrink-0 cursor-pointer flex items-center gap-1.5 disabled:opacity-45 ${
            activeView === 'simplified' ? activeTab : inactiveTab
          }`}
          title="Rewrite complex phrasing into plain, direct language"
        >
          {loadingAction === 'simplify' && <Loader2 className="w-3 h-3 animate-spin" />}
          <span>Simplify</span>
        </button>

        <button
          onClick={() => handleEnhance('bullets')}
          disabled={!!loadingAction}
          className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors whitespace-nowrap shrink-0 cursor-pointer flex items-center gap-1.5 disabled:opacity-45 ${
            activeView === 'bullets' ? activeTab : inactiveTab
          }`}
          title="Break dense walls of text into scannable bullet points"
        >
          {loadingAction === 'bullets' && <Loader2 className="w-3 h-3 animate-spin" />}
          <span>Bullet Chunks</span>
        </button>

        <button
          onClick={() => handleEnhance('syllables')}
          disabled={!!loadingAction}
          className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors whitespace-nowrap shrink-0 cursor-pointer flex items-center gap-1.5 disabled:opacity-45 ${
            activeView === 'syllables' ? activeTab : inactiveTab
          }`}
          title="Hyphenate complex multisyllabic words"
        >
          {loadingAction === 'syllables' && <Loader2 className="w-3 h-3 animate-spin" />}
          <span>Syllables</span>
        </button>

        <button
          onClick={() => handleEnhance('summarize')}
          disabled={!!loadingAction}
          className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors whitespace-nowrap shrink-0 cursor-pointer flex items-center gap-1.5 disabled:opacity-45 ${
            activeView === 'summary' ? activeTab : inactiveTab
          }`}
          title="Generate a concise dyslexia-friendly summary"
        >
          {loadingAction === 'summarize' && <Loader2 className="w-3 h-3 animate-spin" />}
          <span>Summary</span>
        </button>
      </div>
    </div>
  );
};
