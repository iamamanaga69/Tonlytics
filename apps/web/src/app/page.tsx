'use client';

import React, { useState, useEffect } from 'react';
import BreakingBanner from '@/components/terminal/BreakingBanner';
import CategorySidebar from '@/components/terminal/CategorySidebar';
import BriefingFeed from '@/components/terminal/BriefingFeed';
import { useTelegram } from '@/hooks/useTelegram';
import { Send, Globe, Shield, Terminal, ArrowUpRight } from 'lucide-react';

export default function Home() {
  const { isTelegram, tgUser, triggerHaptic } = useTelegram();
  const [logoLoaded, setLogoLoaded] = useState(false);

  useEffect(() => {
    // Small timeout to simulate brand initial loading state for fluid micro-motion
    const timer = setTimeout(() => setLogoLoaded(true), 600);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="flex-1 flex flex-col w-full relative min-h-screen bg-[#040609] selection:bg-sky-500/20 selection:text-sky-300">
      
      {/* Dynamic Background Glow Layer */}
      <div className="absolute top-0 right-1/4 w-[500px] h-[500px] bg-sky-500/5 rounded-full filter blur-3xl pointer-events-none z-0" />
      <div className="absolute bottom-1/4 left-1/4 w-[400px] h-[400px] bg-indigo-500/5 rounded-full filter blur-3xl pointer-events-none z-0" />

      {/* 1. TOP HEADER NAVIGATION BAR (Redesigned with Logo System) */}
      <header className="w-full bg-[#080b11]/30 backdrop-blur-md border-b border-slate-900/40 py-4 px-4 md:px-8 flex items-center justify-between z-45 shrink-0 relative">
        
        {/* Animated Brand Logo and Typographic Tag */}
        <div className="flex items-center gap-3 group">
          <div className="relative w-8 h-8 rounded-lg overflow-hidden border border-slate-900 bg-slate-950 flex items-center justify-center transition-all duration-300 group-hover:border-sky-500/30">
            {/* Animated Logo Image */}
            <img
              src="/images/tonlytics_logo.png"
              alt="Tonlytics"
              className={`w-full h-full object-cover transition-all duration-700 ${
                logoLoaded ? 'opacity-85 scale-100' : 'opacity-0 scale-90'
              }`}
            />
            {/* Loading Indicator Spinner Overlay */}
            {!logoLoaded && (
              <div className="absolute inset-0 border-2 border-slate-900 border-t-sky-500 animate-spin rounded-lg" />
            )}
          </div>
          
          <div className="flex flex-col gap-0.5">
            <span className="font-extrabold text-sm md:text-base tracking-widest font-display text-slate-200 uppercase group-hover:text-slate-100 transition-colors">
              Tonlytics
            </span>
            <span className="text-[8px] font-bold text-slate-500 font-mono tracking-widest uppercase">
              Ecosystem Intelligence
            </span>
          </div>
        </div>

        {/* Action Controls & Admin Entry */}
        <div className="flex items-center gap-3">
          
          {/* Curation Desk (Admin Access Portal Link) */}
          <a
            href="/moderation"
            onClick={() => triggerHaptic('light')}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-[#080c12]/50 border border-slate-900 hover:border-sky-500/20 text-[9px] font-mono font-bold text-slate-400 hover:text-sky-400 uppercase tracking-wider rounded-lg transition-all duration-200 cursor-pointer"
          >
            <Shield className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Curation Desk</span>
          </a>

          {/* Join telegram channel button */}
          <a
            href="https://t.me/tonlytics"
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => triggerHaptic('light')}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-sky-500/10 border border-sky-500/20 hover:bg-sky-500/15 text-[9px] font-mono font-bold text-sky-400 uppercase tracking-widest rounded-lg transition-all duration-200 cursor-pointer"
          >
            <Send className="w-3 h-3 text-sky-400" />
            <span>Join Broadcast</span>
          </a>
        </div>
      </header>

      {/* 2. BREAKING NEWS SCROLLER TICKER */}
      <BreakingBanner />

      {/* 3. MAIN TERMINAL CONTEXT BODY (Sidebar + Feed Layout Grid) */}
      <main className="flex-1 max-w-6xl w-full mx-auto flex flex-col md:flex-row gap-8 py-5 md:py-8 px-4 md:px-8 relative z-10">
        
        {/* Adaptive Categories navigation */}
        <CategorySidebar />

        {/* Live briefings stream feed with Hero Spotlight */}
        <BriefingFeed />

      </main>

      {/* 5. MINIMAL DIGITAL TERMINAL FOOTER */}
      {!isTelegram && (
        <footer className="w-full py-6 px-4 md:px-8 border-t border-slate-950/50 bg-[#040609] text-center text-xs text-slate-500 font-medium shrink-0 flex flex-col md:flex-row gap-3 items-center justify-between max-w-6xl mx-auto relative z-10">
          <div className="flex items-center gap-2 font-mono text-[9px] tracking-wider uppercase text-slate-550">
            <Globe className="w-3.5 h-3.5 text-slate-650" />
            <span>Tonlytics Platform © 2026. Verified Ecosystem Intelligence.</span>
          </div>
          
          <div className="flex items-center gap-4 text-slate-500 font-mono text-[9px] tracking-wider uppercase">
            <a href="/moderation" className="hover:text-slate-450 transition-colors flex items-center gap-1">
              <span>Admin Gateway</span>
              <ArrowUpRight className="w-2.5 h-2.5" />
            </a>
            <span>•</span>
            <a href="/disclaimer" className="hover:text-slate-450 transition-colors">Disclaimer</a>
          </div>
        </footer>
      )}
    </div>
  );
}
