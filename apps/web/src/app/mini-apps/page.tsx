import type { Metadata } from 'next';
import { ArchiveGrid, ArchiveHero, SignalStats } from '@/components/editorial/ArchiveGrid';
import { dbService } from 'database';
import { matchesSignal, rankBriefings } from '@/lib/editorial-utils';

export const revalidate = 60;

export const metadata: Metadata = {
  title: 'Telegram Mini Apps Ecosystem',
  description: 'Coverage of Telegram Mini Apps, wallet integrations, consumer crypto products, and native TON distribution.',
  alternates: { canonical: '/mini-apps' },
};

export default async function MiniAppsPage() {
  const briefings = rankBriefings(await dbService.getBriefings())
    .filter((briefing) =>
      ['Mini Apps', 'Telegram Apps', 'Integration'].includes(briefing.category) ||
      matchesSignal(briefing, ['mini app', 'telegram app', 'bot', 'game', 'wallet'])
    )
    .slice(0, 36);

  return (
    <main className="min-h-screen bg-editorial-bg text-foreground">
      <ArchiveHero
        eyebrow="Telegram-native products"
        title="Mini Apps, wallets, bots, games, and embedded crypto"
        description="A focused editorial feed for the products bringing TON into Telegram-native user flows."
        lead={briefings[0]}
      />
      <section className="mx-auto grid max-w-7xl gap-6 px-4 py-8 md:px-6 lg:px-8">
        <SignalStats briefings={briefings} />
        <ArchiveGrid briefings={briefings} />
      </section>
    </main>
  );
}
