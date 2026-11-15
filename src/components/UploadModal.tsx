import React, { useState, useRef, useEffect } from 'react';
import { Upload, FileText, X, RotateCw, Sparkles, AlertCircle, ClipboardCheck, ArrowRight } from 'lucide-react';
import { optimizeImageForOcr } from '../utils/imageOptimizer';

interface UploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onScanComplete: (text: string, imagePreview?: string) => void;
  onOpenSample: () => void;
}

export const UploadModal: React.FC<UploadModalProps> = ({
  isOpen,
  onClose,
  onScanComplete,
  onOpenSample,
}) => {
  const [activeTab, setActiveTab] = useState<'upload' | 'paste'>('upload');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [rotationDegrees, setRotationDegrees] = useState<number>(0);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [pastedText, setPastedText] = useState<string>('');
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Handle clipboard paste of image while modal is open
  useEffect(() => {
    if (!isOpen) return;

    const handleWindowPaste = (e: ClipboardEvent) => {
      const items = e.clipboardData?.items;
      if (!items) return;

      for (let i = 0; i < items.length; i++) {
        if (items[i].type.indexOf('image') !== -1) {
          const blob = items[i].getAsFile();
          if (blob) {
            handleFileSelect(blob);
            setActiveTab('upload');
            break;
          }
        }
      }
    };

    window.addEventListener('paste', handleWindowPaste);
    return () => window.removeEventListener('paste', handleWindowPaste);
  }, [isOpen]);

  const handleFileSelect = (file: File) => {
    if (!file.type.startsWith('image/')) {
      setErrorMessage('Please upload a valid image file (PNG, JPG, WebP).');
      return;
    }
    setErrorMessage(null);
    setSelectedFile(file);
    setRotationDegrees(0);

    const reader = new FileReader();
    reader.onload = () => {
      setPreviewUrl(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileSelect(e.dataTransfer.files[0]);
    }
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const rotateImage = () => {
    setRotationDegrees((prev) => (prev + 90) % 360);
  };

  const getRotatedDataUrl = async (sourceDataUrl: string, degrees: number): Promise<string> => {
    if (degrees === 0) return sourceDataUrl;

    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(sourceDataUrl);
          return;
        }

        if (degrees === 90 || degrees === 270) {
          canvas.width = img.height;
          canvas.height = img.width;
        } else {
          canvas.width = img.width;
          canvas.height = img.height;
        }

        ctx.translate(canvas.width / 2, canvas.height / 2);
        ctx.rotate((degrees * Math.PI) / 180);
        ctx.drawImage(img, -img.width / 2, -img.height / 2);

        resolve(canvas.toDataURL('image/jpeg', 0.92));
      };
      img.src = sourceDataUrl;
    });
  };

  const processImageScan = async () => {
    if (!previewUrl || isLoading) return;

    const abortController = new AbortController();
    const abortTimeout = setTimeout(() => abortController.abort(), 20000);

    try {
      setIsLoading(true);
      setErrorMessage(null);

      // Rotate if necessary, then downscale with high-definition text preservation
      const rotated = await getRotatedDataUrl(previewUrl, rotationDegrees);
      const optimizedImage = await optimizeImageForOcr(rotated, 1600);

      const response = await fetch('/api/scan-ocr', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          image: optimizedImage,
          mimeType: 'image/jpeg',
        }),
        signal: abortController.signal,
      });

      clearTimeout(abortTimeout);

      const data = await response.json();

      if (!response.ok || data.error) {
        throw new Error(data.error || 'Failed to extract text from image.');
      }

      if (!data.text) {
        throw new Error(data.warning || 'No readable text was detected in the photo.');
      }

      onScanComplete(data.text, optimizedImage);
      handleClose();
    } catch (err: unknown) {
      clearTimeout(abortTimeout);
      const error = err as Error;
      if (error.name === 'AbortError') {
        setErrorMessage('Document processing took too long. Please try a clearer, cropped photo.');
      } else {
        setErrorMessage(error.message || 'Scanning failed. Please try a clearer photo.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handlePasteSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!pastedText.trim()) {
      setErrorMessage('Please paste or type some text first.');
      return;
    }
    onScanComplete(pastedText.trim());
    handleClose();
  };

  const handleClose = () => {
    setSelectedFile(null);
    setPreviewUrl(null);
    setErrorMessage(null);
    setPastedText('');
    setRotationDegrees(0);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div
      onClick={(e) => {
        if (e.target === e.currentTarget) handleClose();
      }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200"
    >
      <div className="relative w-full max-w-xl bg-[#FAF4E8] text-[#2D3142] rounded-3xl shadow-2xl border border-stone-300 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Modal Top Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-stone-200 bg-[#F5EEDB]">
          <div>
            <h3 className="font-semibold text-lg tracking-tight text-stone-900">
              Import Text for Dyslexia Reading
            </h3>
            <p className="text-xs text-stone-600">
              Upload a photo/screenshot, or paste written text directly
            </p>
          </div>
          <button
            onClick={handleClose}
            className="w-8 h-8 rounded-full bg-stone-200 hover:bg-stone-300 text-stone-700 flex items-center justify-center transition cursor-pointer"
            aria-label="Close dialog"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="flex border-b border-stone-200 px-6 pt-3 bg-[#FAF4E8] gap-4">
          <button
            onClick={() => setActiveTab('upload')}
            className={`pb-3 text-sm font-semibold flex items-center gap-2 border-b-2 transition cursor-pointer ${
              activeTab === 'upload'
                ? 'border-blue-600 text-blue-900'
                : 'border-transparent text-stone-500 hover:text-stone-800'
            }`}
          >
            <Upload className="w-4 h-4" />
            <span>Upload Document Photo</span>
          </button>
          <button
            onClick={() => setActiveTab('paste')}
            className={`pb-3 text-sm font-semibold flex items-center gap-2 border-b-2 transition cursor-pointer ${
              activeTab === 'paste'
                ? 'border-blue-600 text-blue-900'
                : 'border-transparent text-stone-500 hover:text-stone-800'
            }`}
          >
            <FileText className="w-4 h-4" />
            <span>Paste / Type Text</span>
          </button>
        </div>

        {/* Tab Content */}
        <div className="p-6 overflow-y-auto flex-1">
          {activeTab === 'upload' ? (
            <div className="space-y-4">
              {!previewUrl ? (
                <div
                  onDrop={handleDrop}
                  onDragOver={handleDragOver}
                  onClick={() => fileInputRef.current?.click()}
                  className="border-2 border-dashed border-blue-600/40 hover:border-blue-600 rounded-2xl p-8 text-center bg-[#FFFBF2] hover:bg-[#F0F7FF] transition cursor-pointer flex flex-col items-center justify-center group"
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      if (e.target.files && e.target.files[0]) {
                        handleFileSelect(e.target.files[0]);
                      }
                    }}
                  />
                  <div className="w-14 h-14 rounded-full bg-blue-100 group-hover:bg-blue-200 text-blue-800 flex items-center justify-center mb-3 transition">
                    <Upload className="w-6 h-6" />
                  </div>
                  <h4 className="font-semibold text-stone-900 text-base mb-1">
                    Drag and drop book photo or document
                  </h4>
                  <p className="text-xs text-stone-600 max-w-sm mb-3">
                    Supports PNG, JPG, WebP. You can also press <kbd className="px-1.5 py-0.5 rounded bg-stone-200 font-mono text-[11px]">Ctrl+V</kbd> to paste an image from clipboard.
                  </p>
                  <span className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-blue-600 text-white text-xs font-semibold shadow-xs">
                    Browse File
                  </span>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="relative rounded-2xl overflow-hidden border border-stone-300 bg-stone-900 flex items-center justify-center max-h-[300px]">
                    <img
                      src={previewUrl}
                      alt="Uploaded preview"
                      style={{ transform: `rotate(${rotationDegrees}deg)` }}
                      className="max-h-[300px] w-auto object-contain transition-transform duration-200"
                    />
                    <div className="absolute bottom-3 right-3 flex items-center gap-2">
                      <button
                        onClick={rotateImage}
                        type="button"
                        className="px-3 py-1.5 rounded-lg bg-black/75 hover:bg-black text-white text-xs font-medium flex items-center gap-1.5 backdrop-blur-sm cursor-pointer shadow-md"
                        title="Rotate 90 degrees"
                      >
                        <RotateCw className="w-3.5 h-3.5" />
                        <span>Rotate</span>
                      </button>
                      <button
                        onClick={() => {
                          setSelectedFile(null);
                          setPreviewUrl(null);
                        }}
                        type="button"
                        className="px-3 py-1.5 rounded-lg bg-black/75 hover:bg-red-800 text-white text-xs font-medium flex items-center gap-1.5 backdrop-blur-sm cursor-pointer shadow-md"
                      >
                        Change
                      </button>
                    </div>
                  </div>

                  <button
                    onClick={processImageScan}
                    disabled={isLoading}
                    className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl bg-blue-600 hover:bg-blue-700 active:scale-[0.99] text-white font-semibold text-sm shadow-md transition cursor-pointer disabled:opacity-50"
                  >
                    {isLoading ? (
                      <>
                        <Sparkles className="w-4 h-4 animate-spin" />
                        <span>Analyzing Text & Converting to OpenDyslexic...</span>
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-4 h-4" />
                        <span>Extract Text & Convert to OpenDyslexic</span>
                      </>
                    )}
                  </button>
                </div>
              )}

              {/* Sample Document Shortcut */}
              <div className="pt-2 text-center">
                <button
                  type="button"
                  onClick={() => {
                    handleClose();
                    onOpenSample();
                  }}
                  className="text-xs font-medium text-blue-800 hover:text-blue-950 underline decoration-blue-600/40 inline-flex items-center gap-1 cursor-pointer"
                >
                  <span>Or load a pre-written sample story or recipe</span>
                  <ArrowRight className="w-3 h-3" />
                </button>
              </div>
            </div>
          ) : (
            <form onSubmit={handlePasteSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1.5">
                  Paste Your Text Here
                </label>
                <textarea
                  value={pastedText}
                  onChange={(e) => setPastedText(e.target.value)}
                  placeholder="Paste article, homework reading, email, or any dense text here..."
                  rows={8}
                  className="w-full p-4 rounded-xl border border-stone-300 bg-white text-stone-900 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 resize-y"
                  required
                />
              </div>

              <button
                type="submit"
                className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm shadow-md transition cursor-pointer"
              >
                <ClipboardCheck className="w-4 h-4" />
                <span>Format in OpenDyslexic</span>
              </button>
            </form>
          )}

          {errorMessage && (
            <div className="mt-4 p-3 rounded-xl bg-red-100 border border-red-300 flex items-start gap-2.5 text-xs text-red-900">
              <AlertCircle className="w-4 h-4 text-red-700 shrink-0 mt-0.5" />
              <span>{errorMessage}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
