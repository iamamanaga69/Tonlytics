import type { Metadata } from 'next';
import Link from 'next/link';
import { ArchiveHero, SignalStats } from '@/components/editorial/ArchiveGrid';
import TonTickerWidget from '@/components/editorial/TonTickerWidget';
import { dbService } from 'database';
import { getCategoryCounts, getTopicCounts, rankBriefings } from '@/lib/editorial-utils';

export const revalidate = 60;

export const metadata: Metadata = {
  title: 'TON Ecosystem Analytics',
  description: 'Editorial analytics for TON ecosystem categories, source quality, topics, and market context.',
  alternates: { canonical: '/analytics' },
};

export default async function AnalyticsPage() {
  const briefings = rankBriefings(await dbService.getBriefings());
  const categories = getCategoryCounts(briefings);
  const topics = getTopicCounts(briefings, 12);
  const total = categories.reduce((sum, [, count]) => sum + count, 0) || 1;

  return (
    <main className="min-h-screen bg-editorial-bg text-foreground">
      <ArchiveHero
        eyebrow="Ecosystem analytics"
        title="Signal density across the TON ecosystem"
        description="A secondary intelligence view for coverage velocity, category concentration, source credibility, and TON market context."
        lead={briefings[0]}
      />
      <section className="mx-auto grid max-w-7xl gap-6 px-4 py-8 md:px-6 lg:px-8">
        <SignalStats briefings={briefings} />
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
          <section className="rounded-lg border border-editorial-border bg-editorial-card p-5 shadow-sm">
            <h2 className="text-xs font-black uppercase tracking-[0.16em] text-editorial-text-subtle">Ecosystem Heatmap</h2>
            <div className="mt-5 grid gap-4">
              {categories.map(([category, count]) => (
                <Link key={category} href={`/?category=${encodeURIComponent(category)}`} className="group">
                  <div className="mb-1 flex items-center justify-between text-sm font-black">
                    <span className="group-hover:text-editorial-accent">{category}</span>
                    <span className="font-mono text-editorial-text-subtle">{count}</span>
                  </div>
                  <div className="h-3 overflow-hidden rounded-full bg-editorial-muted">
                    <div className="h-full rounded-full bg-editorial-accent" style={{ width: `${Math.max(8, (count / total) * 100)}%` }} />
                  </div>
                </Link>
              ))}
            </div>
          </section>
          <aside className="grid gap-6">
            <section className="rounded-lg border border-editorial-border bg-editorial-card p-5 shadow-sm">
              <h2 className="text-xs font-black uppercase tracking-[0.16em] text-editorial-text-subtle">Topic velocity</h2>
              <div className="mt-4 flex flex-wrap gap-2">
                {topics.map(([topic, count]) => (
                  <span key={topic} className="rounded-md border border-editorial-border bg-editorial-muted px-3 py-1.5 text-xs font-black text-editorial-text-subtle">
                    {topic} <span className="font-mono opacity-70">{count}</span>
                  </span>
                ))}
              </div>
            </section>
            <section className="rounded-lg border border-editorial-border bg-editorial-card p-5 shadow-sm">
              <h2 className="mb-3 text-xs font-black uppercase tracking-[0.16em] text-editorial-text-subtle">TON market context</h2>
              <TonTickerWidget />
            </section>
          </aside>
        </div>
      </section>
    </main>
  );
}
