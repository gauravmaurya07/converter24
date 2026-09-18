import React, { useState, useRef } from 'react';
import { UploadCloud, FileVideo, FileAudio, CheckCircle2, RefreshCw } from 'lucide-react';

export default function DropZone({ file, onFileSelect, onClearFile, disabled }) {
  const [isDragOver, setIsDragOver] = useState(false);
  const inputRef = useRef(null);

  const handleDragOver = (e) => {
    e.preventDefault();
    if (disabled) return;
    setIsDragOver(true);
  };

  const handleDragLeave = () => {
    setIsDragOver(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragOver(false);
    if (disabled) return;

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const selected = e.dataTransfer.files[0];
      onFileSelect(selected);
    }
  };

  const handleChange = (e) => {
    if (e.target.files && e.target.files.length > 0) {
      onFileSelect(e.target.files[0]);
    }
  };

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

  const isVideo = file?.type?.startsWith('video') || /\.(mp4|webm|mkv|mov|avi|flv|wmv)$/i.test(file?.name || '');

  return (
    <div className="w-full">
      <input
        ref={inputRef}
        type="file"
        accept="video/*,audio/*,.mp4,.webm,.mkv,.mov,.avi,.flv,.mp3,.wav,.aac,.m4a,.ogg,.opus"
        onChange={handleChange}
        className="hidden"
        disabled={disabled}
      />

      {!file ? (
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => !disabled && inputRef.current?.click()}
          className={`relative group cursor-pointer rounded-2xl border-2 border-dashed transition-all duration-300 p-8 sm:p-12 text-center bg-slate-900/40 backdrop-blur-sm ${
            isDragOver
              ? 'border-brand-500 bg-brand-500/10 scale-[1.01]'
              : 'border-slate-800 hover:border-slate-600 hover:bg-slate-900/70'
          } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
        >
          {/* Animated Background glow */}
          <div className="absolute inset-0 -z-10 rounded-2xl bg-gradient-to-b from-brand-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

          <div className="w-16 h-16 sm:w-20 sm:h-20 mx-auto mb-5 rounded-2xl bg-slate-850 border border-slate-750 flex items-center justify-center text-brand-400 group-hover:scale-110 group-hover:border-brand-500/50 transition-all duration-300 shadow-lg">
            <UploadCloud className="w-8 h-8 sm:w-10 sm:h-10 text-brand-400 animate-bounce" />
          </div>

          <h3 className="text-xl sm:text-2xl font-bold text-white mb-2">
            Drag & drop your video or audio file
          </h3>
          <p className="text-sm text-slate-400 mb-4 max-w-md mx-auto">
            Supports MP4, WebM, MKV, MOV, AVI, MP3, WAV, and more. Processed 100% locally in your browser.
          </p>

          <button
            type="button"
            className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-500 text-white font-medium text-sm transition-all shadow-md hover:shadow-brand-500/20 active:scale-95"
          >
            Browse Files from Computer
          </button>
        </div>
      ) : (
        <div className="rounded-2xl border border-slate-800 bg-slate-900/70 backdrop-blur-sm p-5 sm:p-6 transition-all">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-4 min-w-0">
              <div className="w-14 h-14 rounded-xl bg-brand-500/10 border border-brand-500/30 flex items-center justify-center flex-shrink-0 text-brand-400">
                {isVideo ? (
                  <FileVideo className="w-7 h-7" />
                ) : (
                  <FileAudio className="w-7 h-7" />
                )}
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <h4 className="text-base font-semibold text-white truncate max-w-[260px] sm:max-w-md">
                    {file.name}
                  </h4>
                  <CheckCircle2 className="w-4 h-4 text-brand-400 flex-shrink-0" />
                </div>
                <div className="flex items-center gap-3 text-xs text-slate-400 mt-1">
                  <span>{formatFileSize(file.size)}</span>
                  <span className="w-1 h-1 rounded-full bg-slate-700" />
                  <span className="uppercase font-mono text-slate-300">
                    {file.name.split('.').pop() || 'MEDIA'}
                  </span>
                  <span className="w-1 h-1 rounded-full bg-slate-700" />
                  <span className="text-brand-400 font-medium">Ready to convert</span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 self-end sm:self-center">
              <button
                type="button"
                onClick={() => !disabled && inputRef.current?.click()}
                disabled={disabled}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-medium transition-colors"
                title="Select another file"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                Change File
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
