'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import BreakingBanner from '@/components/terminal/BreakingBanner';
import CategorySidebar from '@/components/terminal/CategorySidebar';
import BriefingFeed from '@/components/terminal/BriefingFeed';
import { useTelegram } from '@/hooks/useTelegram';
import {
  Bookmark,
  Moon,
  Search,
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

  interface MarketData {
    priceUsd: number;
    change24h: number;
    volume24h: number;
    marketCap: number;
  }

  const [marketData, setMarketData] = useState<MarketData | null>(null);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark');
    localStorage.setItem('theme', theme);
  }, [theme]);

  useEffect(() => {
    const fetchMarket = async () => {
      try {
        const res = await fetch('/api/market');
        if (res.ok) {
          const data = await res.json();
          setMarketData(data);
        }
      } catch (err) {
        console.error('Failed to fetch market data:', err);
      }
    };

    fetchMarket();
    const interval = setInterval(fetchMarket, 3 * 60 * 1000); // 3 mins poll
    return () => clearInterval(interval);
  }, []);

  const toggleTheme = () => {
    triggerHaptic('light');
    const newTheme = theme === 'dark' ? 'light' : 'dark';
    setTheme(newTheme);
    document.documentElement.classList.toggle('dark', newTheme === 'dark');
    localStorage.setItem('theme', newTheme);
  };

  return (
    <div className="min-h-screen w-full bg-editorial-bg text-foreground">
      <header className="sticky top-0 z-40 border-b border-editorial-border bg-editorial-card/95 backdrop-blur-xl">
        <div className="mx-auto flex w-full max-w-7xl flex-col gap-4 px-4 py-4 md:px-6 lg:px-8">
          <div className="flex items-center justify-between gap-4">
            <Link href="/" className="flex items-center gap-3" aria-label="Tonlytics home">
              <span className="flex h-10 w-10 items-center justify-center rounded-sm bg-editorial-accent text-sm font-black text-white dark:text-[#101722]">
                T
              </span>
              <span className="flex flex-col">
                <span className="serif-title text-2xl font-black leading-none md:text-3xl">Tonlytics</span>
                <span className="mt-1 text-[11px] font-semibold text-editorial-text-subtle">
                  Independent TON ecosystem coverage
                </span>
              </span>
            </Link>

            <nav className="hidden items-center gap-6 text-sm font-semibold text-editorial-text-subtle lg:flex">
              <a href="#coverage" className="hover:text-foreground">Coverage</a>
              <a href="#live-feed" className="hover:text-foreground">Live Feed</a>
              <a href="#trending" className="hover:text-foreground">Trending</a>
              <a href="/moderation" className="hover:text-foreground">Editorial Desk</a>
            </nav>

            <div className="flex items-center gap-2">
              <button
                onClick={toggleTheme}
                className="flex h-10 w-10 items-center justify-center rounded-sm border border-editorial-border bg-editorial-card text-editorial-text-subtle transition-colors hover:border-editorial-border-hover hover:text-foreground"
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
                className="flex h-10 items-center gap-2 rounded-sm bg-editorial-accent px-3 text-sm font-extrabold text-white transition-opacity hover:opacity-90 dark:text-[#101722]"
              >
                <Send className="h-4 w-4" />
                <span className="hidden sm:inline">Telegram</span>
              </a>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-editorial-border pt-3 text-xs text-editorial-text-subtle">
            <div className="flex items-center gap-3">
              <span className="font-extrabold text-foreground">TON ecosystem newsroom</span>
              <span className="hidden h-1 w-1 rounded-full bg-editorial-border-hover sm:block" />
              <span>{new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</span>
            </div>
            <div className="flex items-center gap-3">
              <span className="flex items-center gap-1.5"><Search className="h-3.5 w-3.5" /> Research-grade search</span>
              <span className="flex items-center gap-1.5"><Bookmark className="h-3.5 w-3.5" /> Optional saved feeds</span>
            </div>
          </div>

          {marketData && (
            <div className="flex flex-wrap items-center gap-x-6 gap-y-1 border-t border-editorial-border pt-3 text-xs font-mono">
              <div className="flex items-center gap-2">
                <span className="text-editorial-text-subtle">TON:</span>
                <span className="font-extrabold text-foreground">${marketData.priceUsd.toFixed(2)}</span>
                <span className={`font-extrabold ${marketData.change24h >= 0 ? 'text-green-600 dark:text-green-500' : 'text-red-600 dark:text-red-500'}`}>
                  {marketData.change24h >= 0 ? '+' : ''}{marketData.change24h.toFixed(2)}%
                </span>
              </div>
              <div className="hidden items-center gap-2 sm:flex">
                <span className="text-editorial-text-subtle">VOL 24H:</span>
                <span className="font-extrabold text-foreground">${(marketData.volume24h / 1e6).toFixed(1)}M</span>
              </div>
              <div className="hidden items-center gap-2 md:flex">
                <span className="text-editorial-text-subtle">MCAP:</span>
                <span className="font-extrabold text-foreground">${(marketData.marketCap / 1e9).toFixed(2)}B</span>
              </div>
              <div className="ml-auto flex items-center gap-1 text-[10px] text-editorial-text-subtle uppercase">
                <span className="h-1.5 w-1.5 rounded-full bg-green-500 animate-pulse" />
                Live Telemetry
              </div>
            </div>
          )}
        </div>
      </header>

      <BreakingBanner />

      <main className="mx-auto grid w-full max-w-7xl gap-6 px-4 py-6 md:px-6 lg:grid-cols-[245px_minmax(0,1fr)] lg:px-8 lg:py-8">
        <CategorySidebar />
        <BriefingFeed />
      </main>

      {!isTelegram && (
        <footer className="mx-auto w-full max-w-7xl border-t border-editorial-border px-4 py-7 text-sm text-editorial-text-subtle md:px-6 lg:px-8">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <p>Tonlytics, 2026. Independent coverage for the TON and Telegram ecosystem.</p>
            <div className="flex gap-4">
              <a href="/moderation" className="hover:text-foreground">Editorial Desk</a>
              <a href="/disclaimer" className="hover:text-foreground">Disclaimer</a>
            </div>
          </div>
        </footer>
      )}
    </div>
  );
}
