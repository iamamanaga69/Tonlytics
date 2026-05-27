'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import BreakingBanner from '@/components/terminal/BreakingBanner';
import CategorySidebar from '@/components/terminal/CategorySidebar';
import BriefingFeed from '@/components/terminal/BriefingFeed';
import MarketIntelligencePanel from '@/components/terminal/MarketIntelligencePanel';
import { useTelegram } from '@/hooks/useTelegram';
import {
  Moon,
  Send,
  Sun,
} from 'lucide-react';
import dynamic from 'next/dynamic';

const WalletConnectButton = dynamic(
  () => import('@/components/terminal/WalletConnectButton'),
  { ssr: false }
);

export default function Home() {
  const { isTelegram, triggerHaptic } = useTelegram();
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    if (typeof document === 'undefined') return 'dark';
    return document.documentElement.classList.contains('dark') ? 'dark' : 'light';
  });

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark');
    localStorage.setItem('theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    triggerHaptic('light');
    const newTheme = theme === 'dark' ? 'light' : 'dark';
    setTheme(newTheme);
    document.documentElement.classList.toggle('dark', newTheme === 'dark');
    localStorage.setItem('theme', newTheme);
  };

  return (
    <div className="min-h-screen w-full bg-editorial-bg text-foreground">
      <header className="sticky top-0 z-40 border-b border-[#ffffff]/10 bg-[#060B14]/85 backdrop-blur-md shadow-[0_4px_30px_rgba(0,0,0,0.4)]">
        <div className="mx-auto flex w-full max-w-7xl flex-col gap-4 px-4 py-4 md:px-6 lg:px-8">
          <div className="flex items-center justify-between gap-4">
            <Link href="/" className="flex items-center gap-3 group" aria-label="Tonlytics home">
              <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-[#0098EA] to-[#38BDF8] text-base font-black text-white shadow-[0_0_15px_rgba(0,152,234,0.35)] transition-transform duration-300 group-hover:scale-105">
                T
              </span>
              <span className="flex flex-col">
                <span className="serif-title text-2xl font-black leading-none tracking-tight text-[#F5F7FA] md:text-3xl transition-colors duration-300 group-hover:text-[#0098EA]">Tonlytics</span>
                <span className="mt-1 text-[10px] font-semibold tracking-wider text-[#7D8597] uppercase">
                  Independent TON ecosystem coverage
                </span>
              </span>
            </Link>

            <nav className="hidden items-center gap-6 text-sm font-semibold text-[#AAB3C5] lg:flex">
              <a href="#coverage" className="transition-colors hover:text-[#0098EA]">Coverage</a>
              <a href="#live-feed" className="transition-colors hover:text-[#0098EA]">Live Feed</a>
              <Link href="/trending" className="transition-colors hover:text-[#0098EA]">Trending</Link>
              <a href="#market" className="transition-colors hover:text-[#0098EA]">Market</a>
              <a href="#coverage" className="transition-colors hover:text-[#0098EA]">Ecosystem</a>
            </nav>

            <div className="flex items-center gap-2">
              <button
                onClick={toggleTheme}
                className="flex h-10 w-10 items-center justify-center rounded-lg border border-editorial-border bg-[#111827]/60 text-[#AAB3C5] transition-all duration-300 hover:border-[#0098EA]/60 hover:text-[#F5F7FA] hover:shadow-[0_0_15px_rgba(0,152,234,0.2)]"
                aria-label="Toggle color theme"
              >
                {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
              </button>

              <WalletConnectButton />

              <a
                href="https://t.me/tonlytics"
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => triggerHaptic('light')}
                className="flex h-10 items-center gap-2 rounded-lg bg-[#0098EA] px-4 text-sm font-bold text-white transition-all duration-300 hover:bg-[#38BDF8] hover:shadow-[0_0_15px_rgba(0,152,234,0.35)]"
              >
                <Send className="h-4 w-4" />
                <span className="hidden sm:inline">Telegram</span>
              </a>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-editorial-border pt-3 text-xs text-[#7D8597]">
            <div className="flex items-center gap-3">
              <span className="font-extrabold text-[#F5F7FA]">TON ECOSYSTEM NEWSROOM</span>
              <span className="hidden h-1 w-1 rounded-full bg-[#7D8597]/40 sm:block" />
              <span className="text-[#AAB3C5] font-semibold">{new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</span>
            </div>
            <div className="flex items-center gap-4 text-[#AAB3C5]">
              <span>Verified sources</span>
              <span className="hidden h-1 w-1 rounded-full bg-[#7D8597]/40 sm:block" />
              <span>TON market context</span>
              <span className="hidden h-1 w-1 rounded-full bg-[#7D8597]/40 sm:block" />
              <span>Telegram-native coverage</span>
            </div>
          </div>
        </div>
      </header>

      <BreakingBanner />
      <div id="market">
        <MarketIntelligencePanel />
      </div>

      <main className="mx-auto grid w-full max-w-7xl gap-6 px-4 py-6 md:px-6 lg:grid-cols-[245px_minmax(0,1fr)] lg:px-8 lg:py-8">
        <CategorySidebar />
        <BriefingFeed />
      </main>

      {!isTelegram && (
        <footer className="mx-auto w-full max-w-7xl border-t border-editorial-border px-4 py-7 text-sm text-editorial-text-subtle md:px-6 lg:px-8">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <p>Tonlytics, 2026. Independent coverage for the TON and Telegram ecosystem.</p>
            <div className="flex gap-4">
              <Link href="/trending" className="hover:text-foreground">Trending</Link>
              <a href="#market" className="hover:text-foreground">Market</a>
            </div>
          </div>
        </footer>
      )}
    </div>
  );
}
