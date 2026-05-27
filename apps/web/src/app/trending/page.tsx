import type { Metadata } from 'next';
import { ArchiveGrid, ArchiveHero, SignalStats } from '@/components/editorial/ArchiveGrid';
import { dbService } from 'database';
import { rankBriefings } from '@/lib/editorial-utils';

export const revalidate = 60;

export const metadata: Metadata = {
  title: 'Trending on TON',
  description: 'TON ecosystem stories ranked by recency, trust, reader activity, and editorial relevance.',
  alternates: {
    canonical: '/trending',
  },
};

export default async function TrendingPage() {
  const briefings = await dbService.getBriefings();
  const trending = rankBriefings(briefings).slice(0, 24);

  return (
    <main className="min-h-screen bg-editorial-bg text-foreground">
      <ArchiveHero
        eyebrow="Trending on TON"
        title="Stories gaining the most ecosystem attention"
        description="A newsroom view of TON and Telegram-native crypto coverage, ranked by recency, source quality, reader activity, and ecosystem relevance."
        lead={trending[0]}
      />
      <section className="mx-auto grid max-w-7xl gap-6 px-4 py-8 md:px-6 lg:px-8">
        <SignalStats briefings={trending} />
        <ArchiveGrid briefings={trending} />
      </section>
    </main>
  );
}
