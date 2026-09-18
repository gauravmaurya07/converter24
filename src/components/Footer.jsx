import React from 'react';
import { Shield } from 'lucide-react';

export default function Footer() {
  return (
    <footer className="border-t border-slate-850 bg-slate-950/60 pt-12 pb-8 text-slate-400 text-xs">
      <div className="max-w-5xl mx-auto px-4 sm:px-6">
        {/* Top footer row */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-6 pb-8 border-b border-slate-850">
          <a href="#" className="flex items-center gap-2" aria-label="converter24.store home">
            <img
              src="/converter24-logo.png"
              alt="converter24.store"
              className="h-11 w-auto max-w-[250px] object-contain"
            />
          </a>

          {/* Links matching reference YTMP3 site */}
          <div className="flex flex-wrap justify-center gap-6 text-slate-400">
            <a href="#" className="hover:text-white transition-colors">Home</a>
            <a href="#how-it-works" className="hover:text-white transition-colors">How to Use</a>
            <a href="#faq" className="hover:text-white transition-colors">FAQ</a>
            <a href="#terms" className="hover:text-white transition-colors">Terms of Use</a>
            <a href="#privacy" className="hover:text-white transition-colors">Privacy Policy</a>
            <a href="#dmca" className="hover:text-white transition-colors">Copyright Claims</a>
            <a href="#contact" className="hover:text-white transition-colors">Contact</a>
          </div>
        </div>

        {/* Legal Disclaimer & Attribution */}
        <div className="pt-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-slate-500 text-[11px] text-center sm:text-left">
          <p>
            &copy; {new Date().getFullYear()} converter24.store. For personal and educational use only.
          </p>
          <div className="flex items-center gap-2">
            <Shield className="w-3.5 h-3.5 text-slate-500" />
            <span>SSL Secured • WebAssembly transcode engine</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
