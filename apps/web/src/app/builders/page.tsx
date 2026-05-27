import type { Metadata } from 'next';
import { ArchiveGrid, ArchiveHero, SignalStats } from '@/components/editorial/ArchiveGrid';
import { dbService } from 'database';
import { matchesSignal, rankBriefings } from '@/lib/editorial-utils';

export const revalidate = 60;

export const metadata: Metadata = {
  title: 'TON Builders Directory',
  description: 'Builder-focused coverage for TON infrastructure, SDKs, smart contracts, releases, and developer tooling.',
  alternates: { canonical: '/builders' },
};

export default async function BuildersPage() {
  const briefings = rankBriefings(await dbService.getBriefings())
    .filter((briefing) =>
      ['Builders', 'Infrastructure'].includes(briefing.category) ||
      matchesSignal(briefing, ['github', 'sdk', 'tact', 'func', 'developer', 'contract', 'tooling', 'release'])
    )
    .slice(0, 36);

  return (
    <main className="min-h-screen bg-editorial-bg text-foreground">
      <ArchiveHero
        eyebrow="Builder spotlight"
        title="TON developers, releases, tooling, and infrastructure teams"
        description="A practical builder directory powered by live coverage of SDKs, smart contracts, protocol releases, and ecosystem tooling."
        lead={briefings[0]}
      />
      <section className="mx-auto grid max-w-7xl gap-6 px-4 py-8 md:px-6 lg:px-8">
        <SignalStats briefings={briefings} />
        <ArchiveGrid briefings={briefings} />
      </section>
    </main>
  );
}
