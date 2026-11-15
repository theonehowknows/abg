import React, { useState, useEffect, useRef } from 'react';
import { Play, Pause, Square, Volume2, Gauge, Sparkles, Feather, HelpCircle } from 'lucide-react';
import { buildCornishSegments, CornishSentenceSegment } from '../utils/cornishSpeech';

interface AudioPlayerProps {
  text: string;
  speechRate: number;
  onRateChange: (rate: number) => void;
  onHighlightWordIndex?: (charIndex: number, charLength: number) => void;
  onPlaybackEnd?: () => void;
  onPlayStateChange?: (isPlaying: boolean) => void;
  themeTextColor?: string;
  themeBgColor?: string;
  stopSignal?: number; // Increment to force stop from parent
  playSignal?: number; // Increment to force start from parent
}

export const AudioPlayer: React.FC<AudioPlayerProps> = ({
  text,
  speechRate,
  onRateChange,
  onHighlightWordIndex,
  onPlaybackEnd,
  onPlayStateChange,
  stopSignal,
  playSignal,
}) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [cornishAccentMode, setCornishAccentMode] = useState<boolean>(true);
  const [activeVoiceName, setActiveVoiceName] = useState<string>('Cornish Female');

  // References
  const cornishVoiceRef = useRef<SpeechSynthesisVoice | null>(null);
  const segmentQueueRef = useRef<CornishSentenceSegment[]>([]);
  const currentSegmentIndexRef = useRef<number>(0);
  const isPlayingRef = useRef<boolean>(false);
  const isPausedRef = useRef<boolean>(false);
  const pauseTimerRef = useRef<NodeJS.Timeout | null>(null);
  const activeUtteranceRef = useRef<SpeechSynthesisUtterance | null>(null);

  // Keep refs in sync with state
  useEffect(() => {
    isPlayingRef.current = isPlaying;
    isPausedRef.current = isPaused;
    onPlayStateChange?.(isPlaying && !isPaused);
  }, [isPlaying, isPaused, onPlayStateChange]);

  // Comprehensive stop function that halts all speech immediately across all browsers
  const forceStopAllSpeech = () => {
    if (pauseTimerRef.current) {
      clearTimeout(pauseTimerRef.current);
      pauseTimerRef.current = null;
    }

    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      if (activeUtteranceRef.current) {
        activeUtteranceRef.current.onboundary = null;
        activeUtteranceRef.current.onend = null;
        activeUtteranceRef.current.onerror = null;
        activeUtteranceRef.current = null;
      }

      try {
        window.speechSynthesis.pause();
      } catch (_) {}

      try {
        window.speechSynthesis.cancel();
      } catch (_) {}

      // Multi-phase cancels to flush internal mobile audio buffers
      setTimeout(() => {
        try {
          window.speechSynthesis.cancel();
        } catch (_) {}
      }, 25);
      setTimeout(() => {
        try {
          window.speechSynthesis.cancel();
        } catch (_) {}
      }, 90);
    }

    segmentQueueRef.current = [];
    currentSegmentIndexRef.current = 0;
    setIsPlaying(false);
    setIsPaused(false);
    onHighlightWordIndex?.(-1, 0);
    onPlaybackEnd?.();
  };

  // Stop immediately if external stopSignal triggers
  useEffect(() => {
    if (stopSignal && stopSignal > 0) {
      forceStopAllSpeech();
    }
  }, [stopSignal]);

  // Stop when text content changes
  useEffect(() => {
    forceStopAllSpeech();
  }, [text]);

  // Stop on component unmount
  useEffect(() => {
    return () => {
      forceStopAllSpeech();
    };
  }, []);

  // Keyboard shortcut: Escape immediately stops speech
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && (isPlaying || isPaused)) {
        forceStopAllSpeech();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isPlaying, isPaused]);

  // Resolve best UK voice with priority for natural British female voices
  useEffect(() => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;

    const resolveCornishVoice = () => {
      const availableVoices = window.speechSynthesis.getVoices();
      if (!availableVoices || availableVoices.length === 0) return;

      // 1. Natural / Neural British English Female voices (Edge, Chrome, Safari)
      const naturalUkFemale = availableVoices.find(
        (v) =>
          v.lang.toLowerCase().startsWith('en-gb') &&
          /natural|neural/i.test(v.name) &&
          /libby|sonia|mia|female/i.test(v.name)
      );

      // 2. High-quality Google UK English Female (Chromium standard)
      const googleUkFemale = availableVoices.find(
        (v) =>
          v.name.includes('Google UK English Female') ||
          (v.lang.toLowerCase() === 'en-gb' && /google/i.test(v.name) && /female/i.test(v.name))
      );

      // 3. Apple UK Female voices (Siri Voice 2, Serena, Stephanie, Martha, Fiona)
      const appleUkFemale = availableVoices.find(
        (v) =>
          v.lang.toLowerCase().startsWith('en-gb') &&
          /serena|stephanie|martha|fiona|kate|hazel|victoria|siri/i.test(v.name)
      );

      // 4. Any en-GB female voice
      const anyUkFemale = availableVoices.find(
        (v) =>
          v.lang.toLowerCase().startsWith('en-gb') &&
          /female|woman/i.test(v.name)
      );

      // 5. Any en-GB voice
      const anyUk = availableVoices.find((v) => v.lang.toLowerCase().startsWith('en-gb'));

      // 6. Any English female voice
      const anyEnFemale = availableVoices.find(
        (v) =>
          v.lang.toLowerCase().startsWith('en') &&
          /libby|sonia|mia|serena|stephanie|martha|fiona|samantha|female/i.test(v.name)
      );

      const chosen = naturalUkFemale || googleUkFemale || appleUkFemale || anyUkFemale || anyUk || anyEnFemale || availableVoices[0];
      cornishVoiceRef.current = chosen || null;
      if (chosen) {
        setActiveVoiceName(chosen.name.replace(/\(Natural\)/gi, 'Natural').trim());
      }
    };

    resolveCornishVoice();
    window.speechSynthesis.addEventListener('voiceschanged', resolveCornishVoice);

    return () => {
      window.speechSynthesis.removeEventListener('voiceschanged', resolveCornishVoice);
    };
  }, []);

  // Play next segment in the human breath queue
  const playSegment = (index: number) => {
    if (!isPlayingRef.current || isPausedRef.current) return;
    if (index >= segmentQueueRef.current.length) {
      // Completed reading all segments
      setIsPlaying(false);
      setIsPaused(false);
      onHighlightWordIndex?.(-1, 0);
      onPlaybackEnd?.();
      return;
    }

    currentSegmentIndexRef.current = index;
    const segment = segmentQueueRef.current[index];

    // Use spokenText with Cornish rhotic phonetics
    const utterance = new SpeechSynthesisUtterance(segment.spokenText);
    
    // Cornish pacing: relaxed, friendly tempo optimized for dyslexia
    utterance.rate = Math.max(0.7, Math.min(1.25, speechRate * 0.94));
    
    // Cornish melodic sing-song pitch curve
    utterance.pitch = cornishAccentMode ? segment.pitch : 1.0;

    if (cornishVoiceRef.current) {
      utterance.voice = cornishVoiceRef.current;
    }

    // High precision word boundary mapping back to original text
    utterance.onboundary = (event) => {
      if (event.name === 'word') {
        const spokenCharIndex = event.charIndex;
        // Find which word token corresponds to this character index in spoken text
        let charCounter = 0;
        let matchedTokenIndex = -1;

        for (let i = 0; i < segment.tokenMap.length; i++) {
          const token = segment.tokenMap[i];
          const tokenLen = token.spokenWord.length;
          if (spokenCharIndex >= charCounter && spokenCharIndex <= charCounter + tokenLen) {
            matchedTokenIndex = i;
            break;
          }
          charCounter += tokenLen + 1; // plus space
        }

        if (matchedTokenIndex !== -1) {
          const matchedToken = segment.tokenMap[matchedTokenIndex];
          onHighlightWordIndex?.(matchedToken.originalStart, matchedToken.originalLength);
        } else if (segment.tokenMap.length > 0) {
          const firstToken = segment.tokenMap[0];
          onHighlightWordIndex?.(firstToken.originalStart, firstToken.originalLength);
        }
      }
    };

    utterance.onend = () => {
      if (!isPlayingRef.current || isPausedRef.current) return;

      // Natural human breath pause between sentences (220ms–320ms)
      pauseTimerRef.current = setTimeout(() => {
        playSegment(index + 1);
      }, segment.pauseAfterMs);
    };

    utterance.onerror = (e) => {
      if (e.error !== 'interrupted' && e.error !== 'canceled') {
        console.warn('Speech segment notice:', e);
      }
      if (isPlayingRef.current && !isPausedRef.current) {
        playSegment(index + 1);
      }
    };

    activeUtteranceRef.current = utterance;
    window.speechSynthesis.speak(utterance);
  };

  // Start natural Cornish reading aloud
  const startAudio = () => {
    if (!text || !text.trim() || typeof window === 'undefined' || !('speechSynthesis' in window)) {
      return;
    }

    forceStopAllSpeech();
    setIsPlaying(true);
    setIsPaused(false);

    // Build segments with Cornish phonetic adaptation and token alignment
    const segments = buildCornishSegments(text, cornishAccentMode);
    if (segments.length === 0) return;

    segmentQueueRef.current = segments;
    currentSegmentIndexRef.current = 0;

    // Small 25ms tick to ensure browser speech pipeline is ready
    setTimeout(() => {
      playSegment(0);
    }, 25);
  };

  // Start speech when external playSignal triggers (e.g. from mobile bottom dock)
  useEffect(() => {
    if (playSignal && playSignal > 0) {
      if (!isPlayingRef.current) {
        startAudio();
      } else if (isPausedRef.current) {
        if ('speechSynthesis' in window) {
          window.speechSynthesis.resume();
        }
        setIsPaused(false);
      }
    }
  }, [playSignal]);

  const togglePlay = () => {
    if (!text || !text.trim()) return;

    if (!isPlaying) {
      startAudio();
    } else if (isPaused) {
      if ('speechSynthesis' in window) {
        window.speechSynthesis.resume();
      }
      setIsPaused(false);
    } else {
      if ('speechSynthesis' in window) {
        window.speechSynthesis.pause();
      }
      setIsPaused(true);
    }
  };

  const handleRateChange = (newRate: number) => {
    onRateChange(newRate);
    if (isPlaying) {
      startAudio();
    }
  };

  const handleToggleCornishAccent = () => {
    const nextMode = !cornishAccentMode;
    setCornishAccentMode(nextMode);
    if (isPlaying) {
      forceStopAllSpeech();
      setTimeout(() => {
        setIsPlaying(true);
        const segments = buildCornishSegments(text, nextMode);
        segmentQueueRef.current = segments;
        playSegment(0);
      }, 50);
    }
  };

  // Preview quick Cornish greeting
  const handlePreviewGreeting = () => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
    forceStopAllSpeech();

    const sample = "Proper job! Welcome to Cornwall, let's have a lovely read together.";
    const segments = buildCornishSegments(sample, true);
    setIsPlaying(true);
    segmentQueueRef.current = segments;
    playSegment(0);
  };

  const hasText = Boolean(text && text.trim().length > 0);
  const isAudioActive = isPlaying || isPaused;

  return (
    <>
      {/* Standard In-Page Audio Control Bar */}
      <div className="flex flex-wrap items-center justify-between gap-2.5 px-3.5 sm:px-4 py-2 sm:py-2.5 rounded-2xl border border-black/10 bg-white/40 backdrop-blur-sm shadow-xs transition-colors no-print">
        {/* Play and Dedicated Instant Stop Controls */}
        <div className="flex items-center gap-2">
          {/* Play / Pause Button */}
          <button
            onClick={togglePlay}
            disabled={!hasText}
            className={`flex items-center gap-1.5 px-3.5 sm:px-4 py-2 rounded-xl font-bold text-xs sm:text-sm shadow-sm transition active:scale-95 cursor-pointer touch-manipulation focus:outline-none focus:ring-2 focus:ring-blue-500/40 ${
              !hasText
                ? 'bg-blue-600/40 text-white/70 cursor-not-allowed'
                : isPlaying && !isPaused
                ? 'bg-blue-700 text-white hover:bg-blue-800'
                : 'bg-blue-600 hover:bg-blue-700 text-white'
            }`}
            title={
              !hasText
                ? 'Paste or scan text to read aloud'
                : isPlaying && !isPaused
                ? 'Pause reading aloud'
                : 'Read aloud with authentic Cornish female accent'
            }
            aria-label={isPlaying && !isPaused ? 'Pause reading aloud' : 'Read text aloud with Cornish female accent'}
          >
            {isPlaying && !isPaused ? (
              <>
                <Pause className="w-4 h-4 fill-current" />
                <span>Pause</span>
              </>
            ) : (
              <>
                <Play className="w-4 h-4 fill-current ml-0.5" />
                <span>{isPaused ? 'Resume' : 'Read Aloud'}</span>
              </>
            )}
          </button>

          {/* Dedicated Always-Working Instant STOP Button */}
          <button
            onClick={forceStopAllSpeech}
            onTouchEnd={(e) => {
              e.preventDefault();
              forceStopAllSpeech();
            }}
            className={`flex items-center gap-1.5 px-3 sm:px-3.5 py-2 rounded-xl font-bold text-xs sm:text-sm transition active:scale-95 cursor-pointer touch-manipulation border shadow-2xs ${
              isAudioActive
                ? 'bg-red-600 hover:bg-red-700 text-white border-red-700 shadow-sm ring-2 ring-red-400/40 animate-pulse'
                : 'bg-black/5 hover:bg-black/10 text-current border-black/10 opacity-75 hover:opacity-100'
            }`}
            title="Stop reading immediately and return to beginning (Esc)"
            aria-label="Stop reading aloud"
          >
            <Square className={`w-3.5 h-3.5 fill-current ${isAudioActive ? 'text-white' : 'text-red-600'}`} />
            <span>Stop</span>
          </button>
        </div>

        {/* Cornish Voice Badge & Accent Controls */}
        <div className="flex items-center gap-1.5 sm:gap-2">
          {/* Accent Toggle: Cornish vs Standard */}
          <button
            onClick={handleToggleCornishAccent}
            className={`flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-xl border text-[11px] sm:text-xs font-semibold shadow-2xs transition cursor-pointer select-none ${
              cornishAccentMode
                ? 'bg-blue-600/15 border-blue-600/35 text-blue-950 font-bold'
                : 'bg-black/5 border-black/10 text-current opacity-80'
            }`}
            title="Toggle between authentic Cornish accent and standard voice"
          >
            <span
              className={`w-2 h-2 rounded-full ${
                isPlaying && !isPaused ? 'bg-emerald-500 animate-pulse' : 'bg-blue-600'
              }`}
            />
            <Volume2 className="w-3.5 h-3.5 text-blue-700 shrink-0" />
            <span className="truncate">
              {cornishAccentMode ? 'Cornish Accent (Kernow)' : 'Standard British'}
            </span>
          </button>

          {/* Quick Sound Test Greeting */}
          <button
            onClick={handlePreviewGreeting}
            className="hidden md:flex items-center gap-1 px-2 py-1.5 rounded-xl bg-black/5 hover:bg-black/10 border border-black/10 text-[11px] font-semibold text-current opacity-75 hover:opacity-100 transition cursor-pointer"
            title="Hear greeting: 'Proper job! Welcome to Cornwall.'"
          >
            <Sparkles className="w-3 h-3 text-amber-600" />
            <span>Sample Voice</span>
          </button>
        </div>

        {/* Reading Speed Selector (Optimized for Dyslexia Comprehension) */}
        <div className="flex items-center gap-1.5 sm:gap-2 text-xs">
          <Gauge className="w-3.5 h-3.5 opacity-60 hidden xs:inline" />
          <span className="opacity-70 hidden md:inline">Speed:</span>
          <div className="flex items-center bg-black/5 rounded-lg p-0.5 border border-black/5">
            {[0.75, 0.88, 1.0, 1.15].map((rate) => (
              <button
                key={rate}
                onClick={() => handleRateChange(rate)}
                className={`px-1.5 sm:px-2 py-1 rounded-md text-[11px] sm:text-xs font-medium transition cursor-pointer touch-manipulation ${
                  Math.abs(speechRate - rate) < 0.05
                    ? 'bg-blue-600 text-white shadow-xs font-bold'
                    : 'hover:bg-black/10 opacity-75'
                }`}
                title={rate === 0.88 ? '0.88x (Recommended pace for dyslexia reading)' : `${rate}x speed`}
              >
                {rate === 0.88 ? '0.88x' : `${rate}x`}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Floating Sticky Mobile Audio Bar with Instant Thumb STOP */}
      {isAudioActive && (
        <div className="fixed bottom-3 left-3 right-3 sm:hidden z-50 p-2.5 rounded-2xl bg-stone-900/95 text-white backdrop-blur-md shadow-2xl border border-white/20 flex items-center justify-between gap-2 animate-in slide-in-from-bottom-3 duration-150 no-print">
          <div className="flex items-center gap-2 min-w-0 pl-1">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse shrink-0" />
            <div className="min-w-0">
              <span className="text-xs font-bold block truncate">
                {isPaused ? 'Paused' : 'Reading Aloud'}
              </span>
              <span className="text-[10px] text-white/70 block truncate">
                Cornish Voice ({cornishAccentMode ? 'Kernow Lilt' : 'Standard'}) • {speechRate}x
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {/* Play / Pause Toggle */}
            <button
              onClick={togglePlay}
              className="p-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white cursor-pointer active:scale-95 touch-manipulation"
              title={isPlaying && !isPaused ? 'Pause reading' : 'Resume reading'}
              aria-label={isPlaying && !isPaused ? 'Pause reading' : 'Resume reading'}
            >
              {isPlaying && !isPaused ? (
                <Pause className="w-4 h-4 fill-current" />
              ) : (
                <Play className="w-4 h-4 fill-current ml-0.5" />
              )}
            </button>

            {/* Prominent High-Visibility STOP Button */}
            <button
              onClick={forceStopAllSpeech}
              onTouchEnd={(e) => {
                e.preventDefault();
                forceStopAllSpeech();
              }}
              className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 active:scale-90 text-white font-extrabold text-xs shadow-lg cursor-pointer touch-manipulation ring-2 ring-red-400/50"
              title="Stop reading aloud immediately"
              aria-label="Stop reading aloud"
            >
              <Square className="w-3.5 h-3.5 fill-current" />
              <span>STOP</span>
            </button>
          </div>
        </div>
      )}
    </>
  );
};
