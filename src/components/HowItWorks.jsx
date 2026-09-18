import React from 'react';
import { Search, Link2, SlidersHorizontal, Download } from 'lucide-react';

export default function HowItWorks() {
  const steps = [
    {
      number: '01',
      title: 'Find & Copy',
      desc: 'Open YouTube and copy the URL link of the video or music track you want to convert.',
      icon: Search,
    },
    {
      number: '02',
      title: 'Paste Link',
      desc: 'Paste the YouTube link into the search box above. The video details and thumbnail will load automatically.',
      icon: Link2,
    },
    {
      number: '03',
      title: 'Choose Format',
      desc: 'Select either MP3 (audio) or MP4 (video) and pick your preferred quality (up to 320kbps audio or 1080p video).',
      icon: SlidersHorizontal,
    },
    {
      number: '04',
      title: 'Convert & Download',
      desc: 'Click the Convert button and in moments your converted file will be ready to download for free.',
      icon: Download,
    },
  ];

  return (
    <section id="how-it-works" className="py-16 border-t border-slate-850">
      <div className="text-center mb-12">
        <span className="text-xs font-bold uppercase tracking-wider px-3 py-1 rounded-full bg-red-500/10 text-red-400 border border-red-500/20 mb-3 inline-block">
          Simple 4-Step Process
        </span>
        <h2 className="text-2xl sm:text-3xl font-extrabold text-white">
          How to Use YTMP3 Converter
        </h2>
        <p className="text-sm text-slate-400 max-w-lg mx-auto mt-2">
          Converting YouTube videos into MP3 audio or MP4 video files has never been faster or easier.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {steps.map((step) => {
          const Icon = step.icon;
          return (
            <div
              key={step.number}
              className="relative p-6 rounded-2xl bg-slate-900/40 border border-slate-800 hover:border-slate-700 backdrop-blur-sm transition-all group hover:-translate-y-1"
            >
              {/* Step number badge */}
              <div className="flex items-center justify-between mb-4">
                <span className="text-2xl font-black font-mono text-slate-700 group-hover:text-red-500/60 transition-colors">
                  {step.number}
                </span>
                <div className="w-10 h-10 rounded-xl bg-slate-850 border border-slate-800 flex items-center justify-center text-slate-300 group-hover:text-red-400 group-hover:border-red-500/30 transition-all">
                  <Icon className="w-5 h-5" />
                </div>
              </div>

              <h3 className="text-lg font-bold text-white mb-2">{step.title}</h3>
              <p className="text-xs text-slate-400 leading-relaxed">{step.desc}</p>
            </div>
          );
        })}
      </div>
    </section>
  );
}
