'use client';

import { useEffect, useState } from 'react';
import type { ComponentType } from 'react';
import Link from 'next/link';
import { ArrowUpRight, TrendingDown, TrendingUp } from 'lucide-react';
import { apiFetch } from '@/lib/api-client';

interface TonMarketData {
  priceUsd: number;
  change24h: number;
  volume24h: number;
  marketCap: number;
  lastUpdated: string;
  source: 'coingecko' | 'fallback-cache';
}

export default function TonTickerWidget({ compact = false }: { compact?: boolean }) {
  const [marketData, setMarketData] = useState<TonMarketData | null>(null);
  const [isUnavailable, setIsUnavailable] = useState(false);

  useEffect(() => {
    let isMounted = true;

    async function fetchMarket() {
      try {
        const data = await apiFetch<TonMarketData>('/api/market', { timeoutMs: 10_000 });
        if (isMounted) {
          setMarketData(data);
          setIsUnavailable(false);
        }
      } catch {
        if (isMounted) setIsUnavailable(true);
      }
    }

    fetchMarket();
    const interval = window.setInterval(fetchMarket, 90_000);
    return () => {
      isMounted = false;
      window.clearInterval(interval);
    };
  }, []);

  const isPositive = (marketData?.change24h || 0) >= 0;
  const Icon = isPositive ? TrendingUp : TrendingDown;

  return (
    <Link
      href="/ton"
      className={`group inline-grid rounded-lg border border-editorial-border bg-editorial-card/90 shadow-sm transition duration-200 hover:-translate-y-0.5 hover:border-editorial-accent/45 hover:shadow-md ${
        compact ? 'px-3 py-2' : 'p-4'
      }`}
      aria-label="Open TON market page"
    >
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-md bg-[#0098EA] text-sm font-black text-white">
            TON
          </span>
          <span>
            <span className="block text-[10px] font-extrabold uppercase tracking-[0.16em] text-editorial-text-subtle">
              Toncoin
            </span>
            <span className="block text-lg font-black leading-none text-foreground">
              {marketData ? `$${marketData.priceUsd.toFixed(2)}` : isUnavailable ? 'Offline' : '...'}
            </span>
          </span>
        </div>
        <ArrowUpRight className="h-4 w-4 text-editorial-text-subtle transition group-hover:text-editorial-accent" />
      </div>

      {!compact && (
        <div className="mt-4 grid grid-cols-3 gap-2 text-xs">
          <TickerMetric label="24h" value={marketData ? `${isPositive ? '+' : ''}${marketData.change24h.toFixed(2)}%` : '...'} active={isPositive} icon={Icon} />
          <TickerMetric label="Cap" value={marketData ? formatCurrency(marketData.marketCap) : '...'} />
          <TickerMetric label="Vol" value={marketData ? formatCurrency(marketData.volume24h) : '...'} />
        </div>
      )}
    </Link>
  );
}

function TickerMetric({
  label,
  value,
  active,
  icon: Icon,
}: {
  label: string;
  value: string;
  active?: boolean;
  icon?: ComponentType<{ className?: string }>;
}) {
  return (
    <span className="rounded-md border border-editorial-border bg-editorial-muted px-2 py-1.5">
      <span className="block text-[9px] font-bold uppercase tracking-[0.14em] text-editorial-text-subtle">{label}</span>
      <span className={`mt-0.5 flex items-center gap-1 font-black ${active === undefined ? 'text-foreground' : active ? 'text-emerald-600' : 'text-rose-600'}`}>
        {Icon && <Icon className="h-3 w-3" />}
        {value}
      </span>
    </span>
  );
}

function formatCurrency(value: number): string {
  if (value >= 1_000_000_000) return `$${(value / 1_000_000_000).toFixed(2)}B`;
  if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(1)}M`;
  return `$${value.toLocaleString('en-US', { maximumFractionDigits: 0 })}`;
}
