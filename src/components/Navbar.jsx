import React from 'react';
import { HelpCircle, BookOpen } from 'lucide-react';

export default function Navbar() {
  return (
    <nav className="sticky top-0 z-50 backdrop-blur-xl bg-slate-950/80 border-b border-slate-850">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
        {/* Converter24.store Brand Logo */}
        <a href="#" className="flex items-center group" aria-label="converter24.store home">
          <img
            src="/converter24-logo.png"
            alt="converter24.store"
            className="h-12 sm:h-13 w-auto max-w-[270px] sm:max-w-[300px] object-contain group-hover:scale-[1.02] transition-transform"
          />
        </a>

        {/* Navigation Links */}
        <div className="flex items-center gap-5 sm:gap-7 text-xs font-semibold text-slate-400">
          <a
            href="#converter"
            className="text-white hover:text-red-400 transition-colors"
          >
            Converter
          </a>
          <a
            href="#how-it-works"
            className="flex items-center gap-1.5 hover:text-white transition-colors"
          >
            <BookOpen className="w-3.5 h-3.5" />
            <span>How to Use</span>
          </a>
          <a
            href="#faq"
            className="flex items-center gap-1.5 hover:text-white transition-colors"
          >
            <HelpCircle className="w-3.5 h-3.5" />
            <span>FAQ</span>
          </a>
        </div>
      </div>
    </nav>
  );
}
