import React, { useState } from 'react';
import { ChevronDown, HelpCircle } from 'lucide-react';

export default function FAQSection() {
  const [openIndex, setOpenIndex] = useState(0);

  const faqs = [
    {
      q: 'Is this YouTube Converter really free to use?',
      a: 'Yes, YTMP3 is 100% free with unlimited conversions. You do not need to register, create an account, or provide any payment details.',
    },
    {
      q: 'What is the difference between converting to MP3 vs MP4?',
      a: 'MP3 is an audio-only format perfect for listening to music, podcasts, and speeches on any media player or phone with low file size. MP4 preserves the complete video with synchronized audio for watching offline.',
    },
    {
      q: 'Does it work on iPhone, Android, and tablets?',
      a: 'Yes! YTMP3 is fully responsive and optimized for all devices including iOS (iPhone/iPad), Android smartphones, Windows, Mac, and Linux. No apps or browser extensions required.',
    },
    {
      q: 'What audio bitrates are available for MP3?',
      a: 'We provide multiple bitrate options: 128 kbps (compact standard), 192 kbps (high quality), and up to 320 kbps (studio-grade Hi-Fi lossless quality).',
    },
    {
      q: 'Is there any limit on how many YouTube videos I can convert?',
      a: 'No! There is no daily limit or conversion cap. You can convert as many YouTube videos to MP3 or MP4 as you wish, completely free.',
    },
  ];

  return (
    <section id="faq" className="py-16 border-t border-slate-850">
      <div className="text-center mb-10">
        <span className="text-xs font-bold uppercase tracking-wider px-3 py-1 rounded-full bg-red-500/10 text-red-400 border border-red-500/20 mb-3 inline-block">
          Got Questions?
        </span>
        <h2 className="text-2xl sm:text-3xl font-extrabold text-white">
          Frequently Asked Questions
        </h2>
        <p className="text-sm text-slate-400 max-w-lg mx-auto mt-2">
          Everything you need to know about our YouTube and media conversion service.
        </p>
      </div>

      <div className="max-w-2xl mx-auto space-y-3">
        {faqs.map((faq, idx) => {
          const isOpen = openIndex === idx;
          return (
            <div
              key={idx}
              className="rounded-2xl border border-slate-800 bg-slate-900/40 backdrop-blur-sm overflow-hidden transition-colors"
            >
              <button
                type="button"
                onClick={() => setOpenIndex(isOpen ? -1 : idx)}
                className="w-full p-5 text-left flex items-center justify-between gap-4 text-sm sm:text-base font-semibold text-white hover:text-red-400 transition-colors"
              >
                <span>{faq.q}</span>
                <ChevronDown
                  className={`w-4 h-4 text-slate-400 transition-transform duration-200 flex-shrink-0 ${
                    isOpen ? 'rotate-180 text-red-400' : ''
                  }`}
                />
              </button>

              {isOpen && (
                <div className="px-5 pb-5 text-xs sm:text-sm text-slate-400 leading-relaxed border-t border-slate-850/60 pt-3">
                  {faq.a}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}
