'use client';

import { useTerminalStore } from '@/store/terminalStore';
import { AlertCircle } from 'lucide-react';

export default function BreakingBanner() {
  const { breakingNews } = useTerminalStore();

  if (!breakingNews) return null;

  return (
    <div className="w-full bg-[#0a0d14]/40 border-b border-slate-900/40 text-slate-400 py-2 px-4 overflow-hidden relative flex items-center gap-3">
      {/* Muted Indicating Tag */}
      <div className="flex items-center gap-1.5 bg-slate-950/50 border border-slate-900 px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-widest text-slate-400 shrink-0 z-10 font-mono">
        <AlertCircle className="w-3 h-3 text-slate-500" />
        <span>Signal</span>
      </div>
      
      {/* Continuous Marquee Ticker */}
      <div className="w-full overflow-hidden relative flex items-center">
        <div className="whitespace-nowrap animate-marquee inline-block font-semibold text-xs tracking-wider text-slate-400 font-mono uppercase">
          <span className="mx-8">{breakingNews}</span>
          <span className="mx-8">•</span>
          <span className="mx-8">Tether Native USDt launches directly inside Telegram interface.</span>
          <span className="mx-8">•</span>
          <span className="mx-8">STON.fi decentralized liquidity pools cross $100M TVL threshold.</span>
          <span className="mx-8">•</span>
          <span className="mx-8">{breakingNews}</span>
        </div>
      </div>
    </div>
  );
}
