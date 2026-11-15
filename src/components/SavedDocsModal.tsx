import React from 'react';
import { X, Trash2, BookOpen, Clock, FileText, ArrowRight } from 'lucide-react';
import { ScannedDocument } from '../types';

interface SavedDocsModalProps {
  isOpen: boolean;
  onClose: () => void;
  documents: ScannedDocument[];
  onSelectDocument: (doc: ScannedDocument) => void;
  onDeleteDocument: (id: string) => void;
}

export const SavedDocsModal: React.FC<SavedDocsModalProps> = ({
  isOpen,
  onClose,
  documents,
  onSelectDocument,
  onDeleteDocument,
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
                Saved Reading Documents
              </h3>
              <p className="text-xs text-stone-600">
                Your previously scanned book pages and imported texts
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-stone-200 hover:bg-stone-300 text-stone-700 flex items-center justify-center transition cursor-pointer"
            aria-label="Close saved documents"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Documents List */}
        <div className="p-6 overflow-y-auto space-y-3 flex-1">
          {documents.length === 0 ? (
            <div className="py-16 text-center text-stone-500">
              <FileText className="w-10 h-10 mx-auto mb-2 opacity-40" />
              <p className="text-sm font-medium">No saved documents yet</p>
              <p className="text-xs mt-1">
                When you scan or paste text, it will be automatically saved here for quick return.
              </p>
            </div>
          ) : (
            documents.map((doc) => (
              <div
                key={doc.id}
                className="p-4 rounded-2xl border border-stone-200 bg-white/60 hover:bg-white hover:border-blue-600/50 hover:shadow-sm transition flex items-center justify-between gap-4 group"
              >
                <div
                  className="flex-1 cursor-pointer space-y-1"
                  onClick={() => {
                    onSelectDocument(doc);
                    onClose();
                  }}
                >
                  <div className="flex items-center gap-2">
                    <h4 className="font-semibold text-stone-900 group-hover:text-blue-800 transition">
                      {doc.title}
                    </h4>
                    <span className="text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full bg-stone-200 text-stone-700">
                      {doc.source}
                    </span>
                  </div>
                  <p className="text-xs text-stone-600 line-clamp-2">
                    {doc.content}
                  </p>
                  <div className="flex items-center gap-3 text-[11px] text-stone-500 font-mono pt-1">
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {new Date(doc.scannedAt).toLocaleDateString()}
                    </span>
                    <span>•</span>
                    <span>{doc.wordCount} words</span>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => {
                      onSelectDocument(doc);
                      onClose();
                    }}
                    className="p-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white transition cursor-pointer"
                    title="Open document"
                  >
                    <ArrowRight className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => onDeleteDocument(doc.id)}
                    className="p-2 rounded-xl hover:bg-red-100 text-stone-400 hover:text-red-700 transition cursor-pointer"
                    title="Delete document"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
