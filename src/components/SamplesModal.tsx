import React from 'react';
import { X, BookOpen, ArrowRight, Sparkles } from 'lucide-react';
import { SAMPLE_DOCUMENTS, SampleDocument } from '../data/samples';

interface SamplesModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectSample: (sample: SampleDocument) => void;
}

export const SamplesModal: React.FC<SamplesModalProps> = ({
  isOpen,
  onClose,
  onSelectSample,
}) => {
  if (!isOpen) return null;

  return (
    <div
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-150"
    >
      <div className="relative w-full max-w-2xl bg-[#FAF4E8] text-[#2D3142] rounded-3xl shadow-2xl border border-stone-300 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-stone-200 bg-[#F5EEDB]">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-blue-600/15 text-blue-800 flex items-center justify-center font-bold">
              <BookOpen className="w-5 h-5 text-blue-700" />
            </div>
            <div>
              <h3 className="font-semibold text-lg text-stone-900 tracking-tight">
                Sample Texts Library
              </h3>
              <p className="text-xs text-stone-600">
                Explore how OpenDyslexic and anti-glare spacing transform various document styles
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-stone-200 hover:bg-stone-300 text-stone-700 flex items-center justify-center transition cursor-pointer"
            aria-label="Close samples"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Samples List */}
        <div className="p-6 overflow-y-auto space-y-3.5">
          {SAMPLE_DOCUMENTS.map((sample) => (
            <div
              key={sample.id}
              onClick={() => {
                onSelectSample(sample);
                onClose();
              }}
              className="p-4 rounded-2xl border border-stone-200 bg-white/60 hover:bg-white hover:border-blue-600/60 hover:shadow-md transition cursor-pointer group flex items-center justify-between gap-4"
            >
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-blue-100 text-blue-900 border border-blue-200">
                    {sample.category}
                  </span>
                  <h4 className="font-semibold text-stone-900 group-hover:text-blue-800 transition">
                    {sample.title}
                  </h4>
                </div>
                <p className="text-xs text-stone-600 leading-relaxed">
                  {sample.description}
                </p>
              </div>

              <div className="w-9 h-9 rounded-xl bg-stone-100 group-hover:bg-blue-600 group-hover:text-white text-stone-500 flex items-center justify-center transition shrink-0">
                <ArrowRight className="w-4 h-4" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
