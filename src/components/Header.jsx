import React from 'react';
import { Sparkles, ShieldCheck, Zap, Cpu } from 'lucide-react';

export default function Header() {
  return (
    <header className="pt-8 pb-6 text-center relative z-10">
      {/* Top pill badge */}
      <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-slate-900/80 border border-slate-800 text-xs font-medium text-brand-400 mb-5 shadow-inner">
        <ShieldCheck className="w-4 h-4 text-brand-500" />
        <span>100% Private & In-Browser</span>
        <span className="w-1 h-1 rounded-full bg-slate-700" />
        <span className="text-slate-400">Zero Server Uploads</span>
        <span className="w-1 h-1 rounded-full bg-slate-700" />
        <span className="text-emerald-400 font-semibold">$0 Free Forever</span>
      </div>

      {/* Main Title */}
      <h1 className="text-4xl sm:text-5xl md:text-6xl font-extrabold tracking-tight text-white mb-4">
        Convert Any Video to{' '}
        <span className="text-transparent bg-clip-text bg-gradient-to-r from-brand-400 via-emerald-300 to-teal-200">
          MP3 & MP4
        </span>
      </h1>

      {/* Subtitle */}
      <p className="max-w-2xl mx-auto text-base sm:text-lg text-slate-400 px-4">
        Lightning-fast media conversion powered entirely by <strong className="text-slate-200">WebAssembly</strong> inside your browser. Your files never leave your computer.
      </p>

      {/* Quick stats / features pills */}
      <div className="flex flex-wrap justify-center gap-4 mt-6 text-xs text-slate-400">
        <div className="flex items-center gap-1.5 bg-slate-900/60 px-3 py-1.5 rounded-lg border border-slate-800/80">
          <Zap className="w-3.5 h-3.5 text-amber-400" />
          <span>No File Size Waiting</span>
        </div>
        <div className="flex items-center gap-1.5 bg-slate-900/60 px-3 py-1.5 rounded-lg border border-slate-800/80">
          <Cpu className="w-3.5 h-3.5 text-sky-400" />
          <span>Local Device Processing</span>
        </div>
        <div className="flex items-center gap-1.5 bg-slate-900/60 px-3 py-1.5 rounded-lg border border-slate-800/80">
          <Sparkles className="w-3.5 h-3.5 text-brand-400" />
          <span>320kbps Hi-Fi Audio</span>
        </div>
      </div>
    </header>
  );
}
