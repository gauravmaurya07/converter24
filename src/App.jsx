import React from 'react';
import Navbar from './components/Navbar';
import YTConverterCard from './components/YTConverterCard';
import HowItWorks from './components/HowItWorks';
import FeaturesGrid from './components/FeaturesGrid';
import FAQSection from './components/FAQSection';
import Footer from './components/Footer';

export default function App() {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-between selection:bg-red-500 selection:text-white relative overflow-x-hidden">
      {/* Background ambient lights */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[700px] h-[350px] bg-red-600/10 blur-[140px] rounded-full pointer-events-none -z-10" />
      <div className="absolute top-1/3 right-1/4 w-[500px] h-[300px] bg-amber-500/5 blur-[120px] rounded-full pointer-events-none -z-10" />

      {/* Modern Sticky Navigation */}
      <Navbar />

      {/* Main Container */}
      <main className="max-w-5xl mx-auto px-4 sm:px-6 w-full flex-1 pt-10 pb-16 space-y-12">
        {/* Main YouTube to MP3 & MP4 Converter (The YTMP3 Centerpiece) */}
        <section id="converter" className="animate-fadeIn">
          <YTConverterCard />
        </section>

        {/* How It Works Section (4-step guide matching reference site) */}
        <HowItWorks />

        {/* Features Highlights Grid */}
        <FeaturesGrid />

        {/* Frequently Asked Questions */}
        <FAQSection />
      </main>

      {/* Footer */}
      <Footer />
    </div>
  );
}
