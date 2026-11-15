import { useState, useEffect, useRef, useCallback } from 'react';
import { buildCornishSegments, CornishSentenceSegment } from '../utils/cornishSpeech';

interface UseCornishSpeechOptions {
  text: string;
  speechRate: number;
  onRateChange: (rate: number) => void;
  onHighlightWordIndex?: (charIndex: number, charLength: number) => void;
  onPlaybackEnd?: () => void;
  onPlayStateChange?: (isPlaying: boolean) => void;
  stopSignal?: number;
  playSignal?: number;
}

export function useCornishSpeech({
  text,
  speechRate,
  onRateChange,
  onHighlightWordIndex,
  onPlaybackEnd,
  onPlayStateChange,
  stopSignal,
  playSignal,
}: UseCornishSpeechOptions) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [cornishAccentMode, setCornishAccentMode] = useState<boolean>(true);
  const [activeVoiceName, setActiveVoiceName] = useState<string>('Cornish Female');

  const cornishVoiceRef = useRef<SpeechSynthesisVoice | null>(null);
  const segmentQueueRef = useRef<CornishSentenceSegment[]>([]);
  const currentSegmentIndexRef = useRef<number>(0);
  const isPlayingRef = useRef<boolean>(false);
  const isPausedRef = useRef<boolean>(false);
  const pauseTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const activeUtteranceRef = useRef<SpeechSynthesisUtterance | null>(null);

  useEffect(() => {
    isPlayingRef.current = isPlaying;
    isPausedRef.current = isPaused;
    onPlayStateChange?.(isPlaying && !isPaused);
  }, [isPlaying, isPaused, onPlayStateChange]);

  const forceStopAllSpeech = useCallback(() => {
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
  }, [onHighlightWordIndex, onPlaybackEnd]);

  useEffect(() => {
    if (stopSignal && stopSignal > 0) {
      forceStopAllSpeech();
    }
  }, [stopSignal, forceStopAllSpeech]);

  useEffect(() => {
    forceStopAllSpeech();
  }, [text]);

  useEffect(() => {
    return () => {
      forceStopAllSpeech();
    };
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && (isPlaying || isPaused)) {
        forceStopAllSpeech();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isPlaying, isPaused, forceStopAllSpeech]);

  useEffect(() => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;

    const resolveCornishVoice = () => {
      const availableVoices = window.speechSynthesis.getVoices();
      if (!availableVoices || availableVoices.length === 0) return;

      const naturalUkFemale = availableVoices.find(
        (v) =>
          v.lang.toLowerCase().startsWith('en-gb') &&
          /natural|neural/i.test(v.name) &&
          /libby|sonia|mia|female/i.test(v.name)
      );

      const googleUkFemale = availableVoices.find(
        (v) =>
          v.name.includes('Google UK English Female') ||
          (v.lang.toLowerCase() === 'en-gb' && /google/i.test(v.name) && /female/i.test(v.name))
      );

      const appleUkFemale = availableVoices.find(
        (v) =>
          v.lang.toLowerCase().startsWith('en-gb') &&
          /serena|stephanie|martha|fiona|kate|hazel|victoria|siri/i.test(v.name)
      );

      const anyUkFemale = availableVoices.find(
        (v) =>
          v.lang.toLowerCase().startsWith('en-gb') &&
          /female|woman/i.test(v.name)
      );

      const anyUk = availableVoices.find((v) => v.lang.toLowerCase().startsWith('en-gb'));

      const anyEnFemale = availableVoices.find(
        (v) =>
          v.lang.toLowerCase().startsWith('en') &&
          /libby|sonia|mia|serena|stephanie|martha|fiona|samantha|female/i.test(v.name)
      );

      const chosen =
        naturalUkFemale ||
        googleUkFemale ||
        appleUkFemale ||
        anyUkFemale ||
        anyUk ||
        anyEnFemale ||
        availableVoices[0];

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

  const playSegment = useCallback(
    (index: number) => {
      if (!isPlayingRef.current || isPausedRef.current) return;
      if (index >= segmentQueueRef.current.length) {
        setIsPlaying(false);
        setIsPaused(false);
        onHighlightWordIndex?.(-1, 0);
        onPlaybackEnd?.();
        return;
      }

      currentSegmentIndexRef.current = index;
      const segment = segmentQueueRef.current[index];
      const utterance = new SpeechSynthesisUtterance(segment.spokenText);

      utterance.rate = Math.max(0.65, Math.min(1.3, speechRate * 0.94));
      utterance.pitch = cornishAccentMode ? segment.pitch : 1.0;

      if (cornishVoiceRef.current) {
        utterance.voice = cornishVoiceRef.current;
      }

      utterance.onboundary = (event) => {
        if (event.name === 'word') {
          const spokenCharIndex = event.charIndex;
          let charCounter = 0;
          let matchedTokenIndex = -1;

          for (let i = 0; i < segment.tokenMap.length; i++) {
            const token = segment.tokenMap[i];
            const tokenLen = token.spokenWord.length;
            if (spokenCharIndex >= charCounter && spokenCharIndex <= charCounter + tokenLen) {
              matchedTokenIndex = i;
              break;
            }
            charCounter += tokenLen + 1;
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
        pauseTimerRef.current = setTimeout(() => {
          playSegment(index + 1);
        }, segment.pauseAfterMs);
      };

      utterance.onerror = () => {
        if (isPlayingRef.current && !isPausedRef.current) {
          playSegment(index + 1);
        }
      };

      activeUtteranceRef.current = utterance;
      window.speechSynthesis.speak(utterance);
    },
    [speechRate, cornishAccentMode, onHighlightWordIndex, onPlaybackEnd]
  );

  const startAudio = useCallback(() => {
    if (!text || !text.trim() || typeof window === 'undefined' || !('speechSynthesis' in window)) {
      return;
    }

    forceStopAllSpeech();
    setIsPlaying(true);
    setIsPaused(false);
    isPlayingRef.current = true;
    isPausedRef.current = false;

    const segments = buildCornishSegments(text, cornishAccentMode);
    if (segments.length === 0) return;

    segmentQueueRef.current = segments;
    currentSegmentIndexRef.current = 0;

    setTimeout(() => {
      playSegment(0);
    }, 25);
  }, [text, cornishAccentMode, forceStopAllSpeech, playSegment]);

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
  }, [playSignal, startAudio]);

  const togglePlay = useCallback(() => {
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
  }, [text, isPlaying, isPaused, startAudio]);

  const handleRateChange = useCallback(
    (newRate: number) => {
      onRateChange(newRate);
      if (isPlaying) {
        setTimeout(() => startAudio(), 20);
      }
    },
    [onRateChange, isPlaying, startAudio]
  );

  const handleToggleCornishAccent = useCallback(() => {
    const nextMode = !cornishAccentMode;
    setCornishAccentMode(nextMode);
    if (isPlaying) {
      forceStopAllSpeech();
      setTimeout(() => {
        setIsPlaying(true);
        isPlayingRef.current = true;
        isPausedRef.current = false;
        const segments = buildCornishSegments(text, nextMode);
        segmentQueueRef.current = segments;
        playSegment(0);
      }, 50);
    }
  }, [cornishAccentMode, isPlaying, forceStopAllSpeech, text, playSegment]);

  const handlePreviewGreeting = useCallback(() => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
    forceStopAllSpeech();

    const sample = "Proper job! Welcome to Cornwall, let's have a lovely read together.";
    const segments = buildCornishSegments(sample, true);
    setIsPlaying(true);
    setIsPaused(false);
    isPlayingRef.current = true;
    isPausedRef.current = false;
    segmentQueueRef.current = segments;
    setTimeout(() => {
      playSegment(0);
    }, 25);
  }, [forceStopAllSpeech, playSegment]);

  return {
    isPlaying,
    isPaused,
    isAudioActive: isPlaying || isPaused,
    cornishAccentMode,
    activeVoiceName,
    togglePlay,
    forceStopAllSpeech,
    handleRateChange,
    handleToggleCornishAccent,
    handlePreviewGreeting,
  };
}
