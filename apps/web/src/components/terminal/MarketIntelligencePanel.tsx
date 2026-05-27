'use client';

import { useEffect, useState } from 'react';
import { Activity, BarChart3, CircleAlert, TrendingDown, TrendingUp } from 'lucide-react';
import { apiFetch } from '@/lib/api-client';

interface TonMarketData {
  priceUsd: number;
  change24h: number;
  volume24h: number;
  marketCap: number;
  high24h: number | null;
  low24h: number | null;
  athUsd: number | null;
  athDate: string | null;
  atlUsd: number | null;
  atlDate: string | null;
  lastUpdated: string;
  source: 'coingecko' | 'fallback-cache';
}

export default function MarketIntelligencePanel() {
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
        if (isMounted) {
          setIsUnavailable(true);
        }
      }
    }

    fetchMarket();
    const interval = window.setInterval(fetchMarket, 60_000);
    return () => {
      isMounted = false;
      window.clearInterval(interval);
    };
  }, []);

  return (
    <section className="mx-auto w-full max-w-7xl px-4 pt-6 md:px-6 lg:px-8">
      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_420px]">
        <div className="editorial-card overflow-hidden rounded-2xl">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#ffffff]/10 px-5 py-4">
            <div>
              <p className="flex items-center gap-2 text-[11px] font-extrabold uppercase tracking-wider text-[#7D8597]">
                <Activity className="h-4 w-4 text-[#0098EA]" />
                TON Market Intelligence
              </p>
              <h2 className="serif-title mt-1 text-2xl font-black text-[#F5F7FA] md:text-3xl">
                Price, liquidity, and historical context
              </h2>
            </div>
            <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-wider text-[#AAB3C5]">
              <span className="h-2 w-2 rounded-full bg-[#38BDF8] shadow-[0_0_12px_rgba(56,189,248,0.9)]" />
              TradingView Chart
            </div>
          </div>

          <div className="grid gap-0 lg:grid-cols-[minmax(0,1fr)_250px]">
            <div className="min-h-[360px] border-b border-[#ffffff]/10 lg:border-b-0 lg:border-r">
              <iframe
                title="TON price chart"
                src="https://www.tradingview.com/widgetembed/?symbol=BINANCE%3ATONUSDT&interval=240&hidesidetoolbar=1&symboledit=1&saveimage=0&toolbarbg=060B14&studies=%5B%5D&theme=dark&style=1&timezone=Etc%2FUTC&withdateranges=1&hideideas=1"
                className="h-[360px] w-full border-0"
                loading="lazy"
              />
            </div>

            <div className="grid gap-3 p-4">
              {marketData ? (
                <>
                  <MetricCard
                    label="TON"
                    value={`$${marketData.priceUsd.toFixed(2)}`}
                    detail={`${marketData.change24h >= 0 ? '+' : ''}${marketData.change24h.toFixed(2)}% 24h`}
                    positive={marketData.change24h >= 0}
                    primary
                  />
                  <MetricCard label="Market Cap" value={formatCurrency(marketData.marketCap)} detail="CoinGecko" />
                  <MetricCard label="24h Volume" value={formatCurrency(marketData.volume24h)} detail="Spot liquidity" />
                  <MetricCard label="24h Range" value={formatRange(marketData.low24h, marketData.high24h)} detail="Intraday" />
                </>
              ) : (
                <div className="rounded-xl border border-[#ffffff]/10 bg-[#111827]/45 p-4">
                  <div className="h-8 w-28 animate-pulse rounded-lg bg-[#ffffff]/10" />
                  <div className="mt-3 h-4 w-40 animate-pulse rounded-lg bg-[#ffffff]/10" />
                  <p className="mt-4 text-sm text-[#AAB3C5]">
                    {isUnavailable ? 'Market data is temporarily unavailable.' : 'Loading TON market data...'}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="grid gap-4">
          <div className="editorial-card rounded-2xl p-5">
            <div className="mb-4 flex items-center gap-2 text-[11px] font-extrabold uppercase tracking-wider text-[#7D8597]">
              <BarChart3 className="h-4 w-4 text-[#0098EA]" />
              Historical Levels
            </div>
            {marketData ? (
              <div className="grid gap-3">
                <HistoryLevel
                  icon="up"
                  label="All-Time High"
                  value={formatNullableCurrency(marketData.athUsd)}
                  date={formatDate(marketData.athDate)}
                />
                <HistoryLevel
                  icon="down"
                  label="All-Time Low"
                  value={formatNullableCurrency(marketData.atlUsd)}
                  date={formatDate(marketData.atlDate)}
                />
                <div className="rounded-xl border border-[#ffffff]/10 bg-[#060B14]/45 p-4 text-sm leading-relaxed text-[#CBD5E1]">
                  Tonlytics uses market context as an editorial layer, not a trading prompt. Price data is included to help readers judge ecosystem momentum around major protocol, DeFi, and Telegram distribution stories.
                </div>
              </div>
            ) : (
              <div className="rounded-xl border border-[#ffffff]/10 bg-[#060B14]/45 p-4 text-sm text-[#AAB3C5]">
                Historical levels will appear when CoinGecko data is available.
              </div>
            )}
          </div>

          <div className="editorial-card rounded-2xl p-5">
            <div className="flex items-start gap-3">
              <CircleAlert className="mt-0.5 h-5 w-5 shrink-0 text-[#0098EA]" />
              <div>
                <h3 className="text-sm font-extrabold text-[#F5F7FA]">Editorial Signal Stack</h3>
                <p className="mt-2 text-sm leading-relaxed text-[#AAB3C5]">
                  The homepage now combines verified briefings, source quality, TON market context, and Telegram-native coverage so it feels like a working ecosystem publication instead of an empty dashboard shell.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function MetricCard({
  label,
  value,
  detail,
  positive,
  primary = false,
}: {
  label: string;
  value: string;
  detail: string;
  positive?: boolean;
  primary?: boolean;
}) {
  return (
    <div className={`rounded-xl border border-[#ffffff]/10 bg-[#060B14]/45 p-4 ${primary ? 'ring-1 ring-[#0098EA]/25' : ''}`}>
      <div className="text-[10px] font-extrabold uppercase tracking-wider text-[#7D8597]">{label}</div>
      <div className="mt-1 text-2xl font-black text-[#F5F7FA]">{value}</div>
      <div className={`mt-1 text-xs font-bold ${positive === undefined ? 'text-[#AAB3C5]' : positive ? 'text-[#38BDF8]' : 'text-red-400'}`}>
        {detail}
      </div>
    </div>
  );
}

function HistoryLevel({
  icon,
  label,
  value,
  date,
}: {
  icon: 'up' | 'down';
  label: string;
  value: string;
  date: string;
}) {
  const Icon = icon === 'up' ? TrendingUp : TrendingDown;
  return (
    <div className="flex items-center justify-between gap-4 rounded-xl border border-[#ffffff]/10 bg-[#060B14]/45 p-4">
      <div className="flex items-center gap-3">
        <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#0098EA]/10">
          <Icon className="h-5 w-5 text-[#38BDF8]" />
        </span>
        <div>
          <p className="text-xs font-extrabold uppercase tracking-wider text-[#7D8597]">{label}</p>
          <p className="text-xl font-black text-[#F5F7FA]">{value}</p>
        </div>
      </div>
      <p className="text-right text-xs font-semibold text-[#AAB3C5]">{date}</p>
    </div>
  );
}

function formatCurrency(value: number): string {
  if (value >= 1_000_000_000) return `$${(value / 1_000_000_000).toFixed(2)}B`;
  if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(1)}M`;
  return `$${value.toLocaleString('en-US', { maximumFractionDigits: 0 })}`;
}

function formatNullableCurrency(value: number | null): string {
  if (value === null) return 'Unavailable';
  return `$${value.toFixed(2)}`;
}

function formatRange(low: number | null, high: number | null): string {
  if (low === null || high === null) return 'Unavailable';
  return `$${low.toFixed(2)} - $${high.toFixed(2)}`;
}

function formatDate(value: string | null): string {
  if (!value) return 'Date unavailable';
  try {
    return new Date(value).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  } catch {
    return 'Date unavailable';
  }
}
