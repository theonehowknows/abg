import React, { useRef, useState, useEffect, useCallback } from 'react';
import { Camera, X, RefreshCw, Sparkles, Image as ImageIcon, AlertCircle, Zap, CheckCircle2 } from 'lucide-react';
import { optimizeImageForOcr } from '../utils/imageOptimizer';
import { DocumentDetector, FrameAnalysisResult } from '../utils/documentDetector';

interface CameraScannerProps {
  isOpen: boolean;
  onClose: () => void;
  onScanComplete: (extractedText: string, imagePreview: string) => void;
  onOpenUploadFallback: () => void;
}

export const CameraScanner: React.FC<CameraScannerProps> = ({
  isOpen,
  onClose,
  onScanComplete,
  onOpenUploadFallback,
}) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const detectorRef = useRef<DocumentDetector | null>(null);
  const autoTriggerFiredRef = useRef<boolean>(false);

  const [hasCameraPermission, setHasCameraPermission] = useState<boolean | null>(null);
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');
  const [isScanning, setIsScanning] = useState(false);
  const [scanStatus, setScanStatus] = useState<string>('Reading document...');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);

  // Auto-Trigger States
  const [isAutoTrigger, setIsAutoTrigger] = useState<boolean>(true);
  const [autoProgress, setAutoProgress] = useState<number>(0);
  const [analysis, setAnalysis] = useState<FrameAnalysisResult | null>(null);
  const [shutterFlash, setShutterFlash] = useState<boolean>(false);

  // Initialize detector instance
  useEffect(() => {
    detectorRef.current = new DocumentDetector(160, 120);
    return () => {
      detectorRef.current = null;
    };
  }, []);

  // Start camera stream when opened
  useEffect(() => {
    if (!isOpen) {
      stopCamera();
      return;
    }

    startCamera();

    return () => {
      stopCamera();
    };
  }, [isOpen, facingMode]);

  const startCamera = async () => {
    stopCamera();
    setErrorMessage(null);
    setCapturedImage(null);
    setAutoProgress(0);
    autoTriggerFiredRef.current = false;
    detectorRef.current?.reset();

    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Camera access is not supported by your browser.');
      }

      // Fast, memory-safe camera constraints (avoids 4K memory spikes on mobile)
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: facingMode },
          width: { ideal: 1280, max: 1920 },
          height: { ideal: 720, max: 1080 },
        },
        audio: false,
      });

      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play().catch((err) => {
          console.warn('Video play error:', err);
        });
      }
      setHasCameraPermission(true);
    } catch (err: unknown) {
      const error = err as Error;
      console.warn('Camera initiation failed:', error);
      setHasCameraPermission(false);
      setErrorMessage(
        error.name === 'NotAllowedError'
          ? 'Camera permission was denied. Please allow camera access in your browser or upload a picture.'
          : 'Could not connect to camera device. You can upload an image file instead.'
      );
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  };

  const toggleCameraFacing = () => {
    setFacingMode((prev) => (prev === 'environment' ? 'user' : 'environment'));
  };

  // Main capture function (can be triggered manually or automatically)
  const captureAndScan = useCallback(async () => {
    if (!videoRef.current || isScanning) return;
    const video = videoRef.current;

    if (video.readyState < 2 || video.videoWidth === 0) {
      setErrorMessage('Camera is still focusing frames. Please wait a moment and try again.');
      return;
    }

    // Trigger visual shutter flash and haptic vibration
    setShutterFlash(true);
    setTimeout(() => setShutterFlash(false), 260);
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      try {
        navigator.vibrate(35);
      } catch (_) {}
    }

    const abortController = new AbortController();
    const abortTimeout = setTimeout(() => abortController.abort(), 20000);

    try {
      setIsScanning(true);
      setErrorMessage(null);
      setScanStatus('Optimizing image & contrast...');

      // Freeze frame immediately for smooth user feedback
      try {
        video.pause();
      } catch (_) {}

      // Fast, lightweight image downscale & contrast boost with 1600px resolution
      const optimizedDataUrl = await optimizeImageForOcr(video, 1600);
      setCapturedImage(optimizedDataUrl);

      setScanStatus('Converting text to OpenDyslexic...');

      // Send optimized payload to server OCR endpoint with race abort protection
      const response = await fetch('/api/scan-ocr', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          image: optimizedDataUrl,
          mimeType: 'image/jpeg',
        }),
        signal: abortController.signal,
      });

      clearTimeout(abortTimeout);

      const data = await response.json();

      if (!response.ok || data.error) {
        throw new Error(data.error || 'Failed to extract text from snapshot.');
      }

      const extracted = (data.text || '').trim();

      if (!extracted) {
        throw new Error('No readable text detected. Please hold the camera closer to the page.');
      }

      setScanStatus('Formatting in OpenDyslexic...');

      // Stop camera hardware immediately to free device resources
      stopCamera();

      // Send to main reading view
      onScanComplete(extracted, optimizedDataUrl);
      onClose();
    } catch (err: unknown) {
      clearTimeout(abortTimeout);
      const error = err as Error;
      console.warn('Camera scan error:', error);

      if (error.name === 'AbortError') {
        setErrorMessage('Scan took longer than expected. Please hold closer to the text and try again.');
      } else {
        setErrorMessage(error.message || 'Scanning encountered an issue. Please try again or upload a photo.');
      }
      setCapturedImage(null);
      autoTriggerFiredRef.current = false;
      setAutoProgress(0);
      // Resume video feed
      try {
        video.play();
      } catch (_) {}
    } finally {
      setIsScanning(false);
    }
  }, [isScanning, onScanComplete, onClose]);

  // Real-time document detection & auto-trigger sampling loop (~9 FPS, <2ms CPU cost)
  useEffect(() => {
    if (!isOpen || isScanning || !hasCameraPermission || capturedImage) {
      return;
    }

    const intervalId = setInterval(() => {
      if (!videoRef.current || !detectorRef.current) return;
      const video = videoRef.current;
      if (video.readyState < 2 || video.paused) return;

      const result = detectorRef.current.analyzeFrame(video);
      setAnalysis(result);

      if (isAutoTrigger && !autoTriggerFiredRef.current) {
        // Document is clearly present, in focus, and held steady
        if (result.hasDocument && result.isSharp && result.isSteady) {
          setAutoProgress((prev) => {
            const next = prev + 25; // Reaches 100% in ~440ms of steady focus
            if (next >= 100 && !autoTriggerFiredRef.current) {
              autoTriggerFiredRef.current = true;
              captureAndScan();
              return 100;
            }
            return next;
          });
        } else if (!result.isSteady) {
          // Rapid device movement - reset progress quickly so it doesn't snap a blurry motion frame
          setAutoProgress((prev) => Math.max(0, prev - 35));
        } else {
          // Document lost or out of focus - gradual decay
          setAutoProgress((prev) => Math.max(0, prev - 20));
        }
      } else if (!isAutoTrigger) {
        setAutoProgress(0);
      }
    }, 110);

    return () => clearInterval(intervalId);
  }, [isOpen, isScanning, hasCameraPermission, capturedImage, isAutoTrigger, captureAndScan]);

  if (!isOpen) return null;

  const isDocumentLocked = Boolean(analysis?.hasDocument && analysis?.isSharp);

  return (
    <div
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          stopCamera();
          onClose();
        }
      }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-0 sm:p-6 animate-in fade-in duration-200"
    >
      <div className="relative w-full max-w-2xl bg-[#202227] text-white h-full sm:h-auto sm:max-h-[92vh] rounded-none sm:rounded-3xl overflow-hidden shadow-2xl border-0 sm:border border-white/10 flex flex-col">
        {/* Header Bar */}
        <div className="flex items-center justify-between px-4 sm:px-6 py-3 sm:py-3.5 border-b border-white/10 bg-[#1A1C20] pt-[max(0.75rem,env(safe-area-inset-top))]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-blue-500/20 text-blue-400 flex items-center justify-center">
              <Camera className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-semibold text-base sm:text-lg tracking-wide leading-none">
                  Scan Book Page or Document
                </h3>
              </div>
              <p className="text-xs text-white/60 mt-0.5">
                Point at printed text to convert into OpenDyslexic font
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Auto-Trigger Mode Toggle Button */}
            <button
              onClick={() => {
                setIsAutoTrigger(!isAutoTrigger);
                setAutoProgress(0);
                autoTriggerFiredRef.current = false;
              }}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition active:scale-95 cursor-pointer touch-manipulation shadow-xs ${
                isAutoTrigger
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 hover:bg-emerald-500/30'
                  : 'bg-white/10 text-white/70 border border-white/10 hover:bg-white/20'
              }`}
              title={
                isAutoTrigger
                  ? 'Auto-Trigger is active: automatically captures when document is clear and steady'
                  : 'Auto-Trigger is off: click to enable automatic capture'
              }
              aria-label="Toggle Auto-Trigger mode"
            >
              <Zap className={`w-3.5 h-3.5 ${isAutoTrigger ? 'text-emerald-400 fill-current' : 'opacity-60'}`} />
              <span className="hidden xs:inline">Auto-Trigger:</span>
              <span className="font-bold">{isAutoTrigger ? 'ON' : 'OFF'}</span>
            </button>

            <button
              onClick={() => {
                stopCamera();
                onClose();
              }}
              className="w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition cursor-pointer"
              aria-label="Close camera scanner"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Viewfinder Area */}
        <div className="relative flex-1 sm:aspect-4/3 w-full bg-black overflow-hidden flex items-center justify-center min-h-[280px]">
          {capturedImage ? (
            <img
              src={capturedImage}
              alt="Captured document snapshot"
              className="w-full h-full object-cover filter brightness-95"
            />
          ) : (
            <video
              ref={videoRef}
              playsInline
              muted
              autoPlay
              className="w-full h-full object-cover"
            />
          )}

          {/* Shutter Flash Animation */}
          {shutterFlash && (
            <div className="absolute inset-0 bg-white/80 pointer-events-none z-30 animate-out fade-out duration-250" />
          )}

          {/* Dynamic Targeting Guides & Framing Box */}
          <div
            className={`pointer-events-none absolute inset-6 sm:inset-10 border-2 rounded-2xl flex flex-col justify-between p-4 transition-colors duration-200 ${
              isDocumentLocked
                ? 'border-emerald-400/80 shadow-[0_0_20px_rgba(52,211,153,0.3)]'
                : 'border-dashed border-blue-400/60'
            }`}
          >
            {/* Top Corners */}
            <div className="flex justify-between items-start">
              <div
                className={`w-7 h-7 border-t-4 border-l-4 rounded-tl-md transition-colors duration-200 ${
                  isDocumentLocked
                    ? 'border-emerald-400 drop-shadow-[0_0_6px_#34d399]'
                    : 'border-blue-400'
                }`}
              />
              <div
                className={`w-7 h-7 border-t-4 border-r-4 rounded-tr-md transition-colors duration-200 ${
                  isDocumentLocked
                    ? 'border-emerald-400 drop-shadow-[0_0_6px_#34d399]'
                    : 'border-blue-400'
                }`}
              />
            </div>

            {/* Central Auto-Trigger HUD Pill */}
            <div className="text-center">
              <div
                className={`inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full backdrop-blur-md text-xs font-semibold border shadow-lg transition-all duration-200 ${
                  autoProgress > 0
                    ? 'bg-emerald-950/80 text-emerald-200 border-emerald-500/50'
                    : isDocumentLocked
                    ? 'bg-blue-950/80 text-blue-200 border-blue-500/40'
                    : 'bg-black/70 text-white/90 border-white/15'
                }`}
              >
                {/* Status Dot / Progress */}
                {autoProgress > 0 ? (
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse shrink-0" />
                ) : isDocumentLocked ? (
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                ) : (
                  <span className="w-2 h-2 rounded-full bg-amber-400 shrink-0" />
                )}

                <span>
                  {autoProgress >= 100
                    ? 'Capturing snapshot...'
                    : autoProgress > 0
                    ? `Auto-Capturing: Hold steady...`
                    : analysis?.message || 'Align document inside box'}
                </span>

                {/* Live Progress Bar when Auto-Trigger is holding steady */}
                {isAutoTrigger && autoProgress > 0 && (
                  <div className="w-14 h-1.5 rounded-full bg-white/20 overflow-hidden ml-1">
                    <div
                      className="h-full bg-emerald-400 transition-all duration-100 ease-out rounded-full"
                      style={{ width: `${autoProgress}%` }}
                    />
                  </div>
                )}
              </div>
            </div>

            {/* Bottom Corners */}
            <div className="flex justify-between items-end">
              <div
                className={`w-7 h-7 border-b-4 border-l-4 rounded-bl-md transition-colors duration-200 ${
                  isDocumentLocked
                    ? 'border-emerald-400 drop-shadow-[0_0_6px_#34d399]'
                    : 'border-blue-400'
                }`}
              />
              <div
                className={`w-7 h-7 border-b-4 border-r-4 rounded-br-md transition-colors duration-200 ${
                  isDocumentLocked
                    ? 'border-emerald-400 drop-shadow-[0_0_6px_#34d399]'
                    : 'border-blue-400'
                }`}
              />
            </div>
          </div>

          {/* Laser Scanning Animation when processing */}
          {isScanning && (
            <div className="absolute inset-0 bg-black/60 backdrop-blur-xs flex flex-col items-center justify-center z-20">
              <div className="relative w-full h-1 bg-gradient-to-r from-transparent via-blue-400 to-transparent shadow-[0_0_15px_#3b82f6] animate-pulse" />
              <div className="mt-6 flex items-center gap-2.5 px-5 py-2.5 rounded-full bg-black/85 border border-blue-500/50 shadow-2xl">
                <Sparkles className="w-5 h-5 text-blue-400 animate-spin shrink-0" />
                <span className="text-sm font-medium text-blue-100">
                  {scanStatus}
                </span>
              </div>
            </div>
          )}

          {/* Error notice if permission or device fail */}
          {errorMessage && (
            <div className="absolute bottom-4 left-4 right-4 bg-red-950/95 border border-red-500/50 rounded-xl p-3.5 flex items-start gap-2.5 z-25 text-xs text-red-100 shadow-xl">
              <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="font-medium">{errorMessage}</p>
              </div>
              <button
                onClick={() => startCamera()}
                className="underline hover:text-white shrink-0 font-medium cursor-pointer"
              >
                Retry
              </button>
            </div>
          )}
        </div>

        {/* Scanner Controls Footer */}
        <div className="p-4 sm:p-5 bg-[#1A1C20] border-t border-white/10 flex flex-col sm:flex-row items-center justify-between gap-3 pb-[max(1rem,env(safe-area-inset-bottom))]">
          <button
            onClick={() => {
              stopCamera();
              onClose();
              onOpenUploadFallback();
            }}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-xs font-medium text-white/90 transition cursor-pointer touch-manipulation"
          >
            <ImageIcon className="w-4 h-4" />
            <span>Upload Photo / Document</span>
          </button>

          {/* Main Shutter & Flip Controls */}
          <div className="flex items-center gap-3">
            <button
              onClick={toggleCameraFacing}
              disabled={isScanning}
              className="w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition cursor-pointer disabled:opacity-40 touch-manipulation"
              title="Flip camera (front / back)"
              aria-label="Flip camera direction"
            >
              <RefreshCw className="w-4 h-4" />
            </button>

            {/* Manual Shutter Button with Auto-Trigger Progress Radial Ring */}
            <button
              onClick={captureAndScan}
              disabled={isScanning || hasCameraPermission === false}
              className={`relative flex items-center gap-2.5 px-6 py-3 rounded-full font-semibold text-sm shadow-lg transition active:scale-95 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed touch-manipulation overflow-hidden ${
                autoProgress > 0
                  ? 'bg-emerald-600 hover:bg-emerald-500 text-white ring-2 ring-emerald-400/60'
                  : 'bg-blue-600 hover:bg-blue-500 text-white'
              }`}
              title="Snap & scan text immediately"
              aria-label="Snap and scan text"
            >
              {/* Radial or Fill Progress Backdrop for Auto-Trigger */}
              {autoProgress > 0 && (
                <div
                  className="absolute inset-0 bg-emerald-500/40 transition-all duration-100 ease-out"
                  style={{ width: `${autoProgress}%` }}
                />
              )}

              <Camera className="w-5 h-5 relative z-10" />
              <span className="relative z-10">
                {isScanning
                  ? 'Processing...'
                  : autoProgress > 0
                  ? `Hold Steady... (${Math.round(autoProgress)}%)`
                  : 'Snap & Scan'}
              </span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

