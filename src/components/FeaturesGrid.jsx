import React from 'react';
import { Zap, DollarSign, Music, Smartphone, Image as ImageIcon, Sparkles } from 'lucide-react';

export default function FeaturesGrid() {
  const features = [
    {
      icon: DollarSign,
      title: '100% Free Forever',
      desc: 'No subscriptions, no hidden charges, and no registration required. Enjoy unlimited YouTube conversions completely free.',
      color: 'text-emerald-400',
      border: 'border-emerald-500/20',
    },
    {
      icon: Music,
      title: '320 kbps Hi-Fi Audio',
      desc: 'Experience studio-quality audio with crystal-clear high bitrates (128kbps, 192kbps, and 320kbps MP3 or studio WAV).',
      color: 'text-red-400',
      border: 'border-red-500/20',
    },
    {
      icon: ImageIcon,
      title: 'Extract HD Thumbnails',
      desc: 'Instantly download original full-resolution 1080p and 720p video cover artwork with a single click.',
      color: 'text-amber-400',
      border: 'border-amber-500/20',
    },
    {
      icon: Smartphone,
      title: 'All Devices Supported',
      desc: 'Seamlessly works across all platforms including iPhone, iPad, Android smartphones, Mac, Windows, and Linux.',
      color: 'text-sky-400',
      border: 'border-sky-500/20',
    },
  ];

  return (
    <section className="pt-12 pb-16 border-t border-slate-850">
      <div className="text-center mb-10">
        <span className="text-xs font-bold uppercase tracking-wider px-3 py-1 rounded-full bg-red-500/10 text-red-400 border border-red-500/20 mb-3 inline-block">
          Why Choose YTMP3
        </span>
        <h3 className="text-2xl sm:text-3xl font-extrabold text-white mb-2">
          The Premier YouTube Converter
        </h3>
        <p className="text-sm text-slate-400 max-w-xl mx-auto">
          Designed for simplicity, speed, and uncompromising audio, video, and image extraction.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {features.map((feat, idx) => {
          const Icon = feat.icon;
          return (
            <div
              key={idx}
              className={`p-5 rounded-2xl bg-slate-900/40 border ${feat.border} backdrop-blur-sm flex flex-col items-start hover:border-slate-700 transition-all`}
            >
              <div className={`p-2.5 rounded-xl bg-slate-850 mb-3.5 ${feat.color}`}>
                <Icon className="w-5 h-5" />
              </div>
              <h4 className="text-base font-semibold text-white mb-1.5">{feat.title}</h4>
              <p className="text-xs text-slate-400 leading-relaxed">{feat.desc}</p>
            </div>
          );
        })}
      </div>
    </section>
  );
}
