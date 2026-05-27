import type { Metadata } from 'next';
import { ArchiveGrid, ArchiveHero, SignalStats } from '@/components/editorial/ArchiveGrid';
import { dbService } from 'database';
import { rankBriefings } from '@/lib/editorial-utils';

export const revalidate = 60;

export const metadata: Metadata = {
  title: 'TON Ecosystem Projects',
  description: 'Live editorial intelligence across TON ecosystem projects, launches, integrations, and partnerships.',
  alternates: { canonical: '/ecosystem' },
};

export default async function EcosystemPage() {
  const briefings = rankBriefings(await dbService.getBriefings())
    .filter((briefing) => ['Ecosystem', 'Funding', 'Integration', 'DeFi'].includes(briefing.category))
    .slice(0, 36);

  return (
    <main className="min-h-screen bg-editorial-bg text-foreground">
      <ArchiveHero
        eyebrow="Ecosystem discovery terminal"
        title="TON projects, launches, funding, and partnerships"
        description="A live project discovery surface built from verified TON ecosystem reporting, source quality, and editorial relevance."
        lead={briefings[0]}
      />
      <section className="mx-auto grid max-w-7xl gap-6 px-4 py-8 md:px-6 lg:px-8">
        <SignalStats briefings={briefings} />
        <ArchiveGrid briefings={briefings} />
      </section>
    </main>
  );
}
