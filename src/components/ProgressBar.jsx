import React, { useState, useRef, useEffect } from 'react';
import { Loader2, Terminal, ChevronDown, ChevronUp, Cpu } from 'lucide-react';

export default function ProgressBar({ progress, statusMessage, logs }) {
  const [showLogs, setShowLogs] = useState(false);
  const logContainerRef = useRef(null);

  useEffect(() => {
    if (logContainerRef.current && showLogs) {
      logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight;
    }
  }, [logs, showLogs]);

  return (
    <div className="rounded-2xl border border-brand-500/30 bg-slate-900/90 p-6 backdrop-blur-md shadow-2xl space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-brand-500/20 border border-brand-500/40 flex items-center justify-center text-brand-400">
            <Loader2 className="w-5 h-5 animate-spin" />
          </div>
          <div>
            <h4 className="text-base font-bold text-white">
              {statusMessage || 'Converting Media...'}
            </h4>
            <p className="text-xs text-slate-400 flex items-center gap-1.5 mt-0.5">
              <Cpu className="w-3 h-3 text-sky-400" />
              <span>WebAssembly multi-core encoding active</span>
            </p>
          </div>
        </div>
        <div className="text-2xl font-black font-mono text-brand-400">
          {progress}%
        </div>
      </div>

      {/* Progress Bar Track */}
      <div className="relative w-full h-3.5 bg-slate-950 rounded-full overflow-hidden border border-slate-800 p-0.5">
        <div
          className="h-full bg-gradient-to-r from-brand-600 via-emerald-400 to-teal-400 rounded-full transition-all duration-300 shadow-sm shadow-brand-500/50"
          style={{ width: `${Math.max(5, progress)}%` }}
        />
      </div>

      {/* Expandable Live Logs Drawer */}
      <div className="pt-2 border-t border-slate-800/80">
        <button
          type="button"
          onClick={() => setShowLogs(!showLogs)}
          className="flex items-center justify-between w-full text-xs text-slate-400 hover:text-slate-200 transition-colors py-1"
        >
          <span className="flex items-center gap-1.5 font-mono">
            <Terminal className="w-3.5 h-3.5 text-brand-400" />
            Live FFmpeg Terminal Logs ({logs.length} events)
          </span>
          {showLogs ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>

        {showLogs && (
          <div
            ref={logContainerRef}
            className="mt-3 p-3 bg-slate-950 rounded-xl border border-slate-800 font-mono text-[11px] text-slate-300 max-h-48 overflow-y-auto space-y-1 select-text"
          >
            {logs.length === 0 ? (
              <p className="text-slate-500 italic">Initializing engine logs...</p>
            ) : (
              logs.map((log, idx) => (
                <div key={idx} className="leading-relaxed border-b border-slate-900/50 pb-0.5 last:border-0">
                  <span className="text-slate-500 select-none mr-2">[{idx + 1}]</span>
                  <span className={log.toLowerCase().includes('error') ? 'text-rose-400' : ''}>
                    {log}
                  </span>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
}
