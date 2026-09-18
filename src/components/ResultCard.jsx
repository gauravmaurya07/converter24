import React from 'react';
import { Download, CheckCircle, RefreshCcw, Film, Music, HardDrive } from 'lucide-react';

export default function ResultCard({ result, onReset }) {
  if (!result) return null;

  const isVideo = result.mimeType.startsWith('video') || result.format === 'mp4' || result.format === 'webm';

  const formatFileSize = (bytes) => {
    if (!bytes) return '0 B';
    const units = ['B', 'KB', 'MB', 'GB'];
    let i = 0;
    let size = bytes;
    while (size >= 1024 && i < units.length - 1) {
      size /= 1024;
      i++;
    }
    return `${size.toFixed(2)} ${units[i]}`;
  };

  return (
    <div className="rounded-3xl border border-brand-500/40 bg-gradient-to-b from-slate-900 via-slate-900/90 to-slate-950 p-6 sm:p-8 backdrop-blur-md shadow-2xl space-y-6 glow-brand">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row items-center sm:items-start justify-between gap-4 text-center sm:text-left">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-brand-500/20 border border-brand-500/50 flex items-center justify-center text-brand-400 shadow-inner flex-shrink-0">
            <CheckCircle className="w-6 h-6 text-brand-400" />
          </div>
          <div>
            <h3 className="text-xl font-bold text-white">Conversion Successful!</h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Processed 100% locally with high fidelity
            </p>
          </div>
        </div>

        <span className="px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-brand-500/20 text-brand-400 border border-brand-500/40 font-mono">
          {result.format.toUpperCase()}
        </span>
      </div>

      {/* File Info Card */}
      <div className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className="p-2.5 rounded-xl bg-slate-850 text-slate-300 border border-slate-750">
            {isVideo ? <Film className="w-5 h-5 text-sky-400" /> : <Music className="w-5 h-5 text-emerald-400" />}
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-white truncate max-w-[280px] sm:max-w-md">
              {result.filename}
            </p>
            <div className="flex items-center gap-2 text-xs text-slate-400 mt-0.5">
              <HardDrive className="w-3.5 h-3.5" />
              <span>{formatFileSize(result.size)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Converted Preview Player */}
      <div className="rounded-2xl border border-slate-800 bg-slate-950 p-4 flex flex-col items-center justify-center">
        <span className="text-xs font-semibold text-slate-400 mb-3 self-start">
          Preview Converted Output
        </span>
        {isVideo ? (
          <video
            src={result.url}
            controls
            className="w-full max-h-72 object-contain rounded-xl"
          />
        ) : (
          <audio
            src={result.url}
            controls
            className="w-full rounded-lg"
          />
        )}
      </div>

      {/* Action Buttons */}
      <div className="flex flex-col sm:flex-row gap-3 pt-2">
        <a
          href={result.url}
          download={result.filename}
          className="flex-1 py-4 px-6 rounded-2xl bg-gradient-to-r from-brand-500 to-emerald-400 hover:from-brand-400 hover:to-emerald-300 text-slate-950 font-extrabold text-base flex items-center justify-center gap-2.5 shadow-lg shadow-brand-500/20 active:scale-[0.99] transition-all text-center"
        >
          <Download className="w-5 h-5 stroke-[2.5]" />
          <span>Download {result.format.toUpperCase()}</span>
        </a>

        <button
          type="button"
          onClick={onReset}
          className="py-4 px-6 rounded-2xl bg-slate-800 hover:bg-slate-750 text-slate-200 hover:text-white font-semibold text-sm flex items-center justify-center gap-2 border border-slate-700 transition-all active:scale-[0.99]"
        >
          <RefreshCcw className="w-4 h-4" />
          <span>Convert Another</span>
        </button>
      </div>
    </div>
  );
}
