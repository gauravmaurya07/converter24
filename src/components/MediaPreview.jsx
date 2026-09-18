import React, { useState, useEffect } from 'react';
import { Play, Pause, Film, Music, Clock } from 'lucide-react';

export default function MediaPreview({ file, onDurationDetected }) {
  const [mediaUrl, setMediaUrl] = useState(null);
  const [duration, setDuration] = useState(0);

  const isVideo = file?.type?.startsWith('video') || /\.(mp4|webm|mkv|mov|avi|flv|wmv)$/i.test(file?.name || '');

  useEffect(() => {
    if (!file) {
      setMediaUrl(null);
      return;
    }
    const url = URL.createObjectURL(file);
    setMediaUrl(url);

    return () => {
      URL.revokeObjectURL(url);
    };
  }, [file]);

  const handleLoadedMetadata = (e) => {
    const dur = e.target.duration;
    if (dur && !isNaN(dur) && dur !== Infinity) {
      setDuration(dur);
      if (onDurationDetected) {
        onDurationDetected(dur);
      }
    }
  };

  const formatSeconds = (sec) => {
    if (!sec || isNaN(sec)) return '0:00';
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  if (!file || !mediaUrl) return null;

  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900/50 overflow-hidden p-4 sm:p-5 backdrop-blur-sm">
      <div className="flex items-center justify-between mb-3 text-xs text-slate-400">
        <span className="flex items-center gap-1.5 font-medium text-slate-300">
          {isVideo ? <Film className="w-4 h-4 text-sky-400" /> : <Music className="w-4 h-4 text-emerald-400" />}
          Input Preview
        </span>
        {duration > 0 && (
          <span className="flex items-center gap-1 bg-slate-800/80 px-2 py-1 rounded text-slate-300 font-mono">
            <Clock className="w-3.5 h-3.5 text-slate-400" />
            {formatSeconds(duration)}
          </span>
        )}
      </div>

      <div className="relative rounded-xl overflow-hidden bg-slate-950 flex items-center justify-center border border-slate-850">
        {isVideo ? (
          <video
            src={mediaUrl}
            controls
            onLoadedMetadata={handleLoadedMetadata}
            className="w-full max-h-[340px] object-contain rounded-xl"
            preload="metadata"
          />
        ) : (
          <div className="w-full py-8 px-4 flex flex-col items-center justify-center gap-4">
            <div className="w-16 h-16 rounded-full bg-brand-500/10 border border-brand-500/20 flex items-center justify-center text-brand-400">
              <Music className="w-8 h-8 animate-pulse" />
            </div>
            <audio
              src={mediaUrl}
              controls
              onLoadedMetadata={handleLoadedMetadata}
              className="w-full max-w-md rounded-lg"
              preload="metadata"
            />
          </div>
        )}
      </div>
    </div>
  );
}
