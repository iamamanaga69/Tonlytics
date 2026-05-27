import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowLeft, BarChart3, Clock, LineChart } from 'lucide-react';
import TonTickerWidget from '@/components/editorial/TonTickerWidget';
import { dbService } from 'database';
import { matchesSignal, rankBriefings } from '@/lib/editorial-utils';

export const revalidate = 60;

export const metadata: Metadata = {
  title: 'TON Coin Market Page',
  description: 'Dedicated TON market context with Toncoin price, liquidity, TradingView chart, and related ecosystem coverage.',
  alternates: { canonical: '/ton' },
};

export default async function TonMarketPage() {
  const stories = rankBriefings(await dbService.getBriefings())
    .filter((briefing) => matchesSignal(briefing, ['toncoin', 'ton', 'market', 'liquidity', 'usdt', 'defi', 'wallet']))
    .slice(0, 6);

  return (
    <main className="min-h-screen bg-editorial-bg text-foreground">
      <header className="border-b border-editorial-border bg-editorial-card/70">
        <div className="mx-auto grid max-w-7xl gap-6 px-4 py-8 md:px-6 lg:grid-cols-[minmax(0,1fr)_360px] lg:items-end lg:px-8">
          <div>
            <Link href="/" className="inline-flex items-center gap-2 text-sm font-black text-editorial-accent">
              <ArrowLeft className="h-4 w-4" />
              Back to newsroom
            </Link>
            <p className="mt-6 text-xs font-black uppercase tracking-[0.18em] text-editorial-accent">TON market page</p>
            <h1 className="serif-title mt-3 max-w-4xl text-4xl font-black leading-[1.02] md:text-6xl">
              Toncoin market context
            </h1>
            <p className="mt-5 max-w-2xl text-lg leading-8 text-editorial-text-subtle">
              Price belongs here: inside a dedicated market view, separate from the editorial homepage hierarchy.
            </p>
          </div>
          <TonTickerWidget />
        </div>
      </header>

      <section className="mx-auto grid max-w-7xl gap-6 px-4 py-8 md:px-6 lg:grid-cols-[minmax(0,1fr)_340px] lg:px-8">
        <div className="overflow-hidden rounded-lg border border-editorial-border bg-editorial-card shadow-sm">
          <div className="flex items-center justify-between gap-4 border-b border-editorial-border px-5 py-4">
            <div>
              <p className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.16em] text-editorial-text-subtle">
                <LineChart className="h-4 w-4 text-editorial-accent" />
                TON / USDT
              </p>
              <h2 className="serif-title mt-1 text-2xl font-black">TradingView market chart</h2>
            </div>
          </div>
          <iframe
            title="TON price chart"
            src="https://www.tradingview.com/widgetembed/?symbol=BINANCE%3ATONUSDT&interval=240&hidesidetoolbar=1&symboledit=1&saveimage=0&toolbarbg=F7F9FC&studies=%5B%5D&theme=light&style=1&timezone=Etc%2FUTC&withdateranges=1&hideideas=1"
            className="h-[520px] w-full border-0"
            loading="lazy"
          />
        </div>

        <aside className="grid content-start gap-5">
          <section className="rounded-lg border border-editorial-border bg-editorial-card p-5 shadow-sm">
            <p className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.16em] text-editorial-text-subtle">
              <BarChart3 className="h-4 w-4 text-editorial-accent" />
              Investor view
            </p>
            <p className="mt-3 text-sm leading-6 text-editorial-text-subtle">
              Tonlytics uses market data as context for ecosystem coverage, not as a trading prompt.
            </p>
          </section>

          <section className="rounded-lg border border-editorial-border bg-editorial-card p-5 shadow-sm">
            <p className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.16em] text-editorial-text-subtle">
              <Clock className="h-4 w-4 text-editorial-accent" />
              Related TON coverage
            </p>
            <div className="mt-4 grid gap-3">
              {stories.map((story) => (
                <Link key={story.id} href={`/briefing/${story.slug}`} className="group border-t border-editorial-border pt-3 first:border-t-0 first:pt-0">
                  <h3 className="serif-title text-lg font-black leading-tight group-hover:text-editorial-accent">{story.title}</h3>
                  <p className="mt-1 line-clamp-2 text-sm leading-6 text-editorial-text-subtle">{story.why_it_matters}</p>
                </Link>
              ))}
            </div>
          </section>
        </aside>
      </section>
    </main>
  );
}
