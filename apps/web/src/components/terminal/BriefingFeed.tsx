'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTerminalStore } from '@/store/terminalStore';
import { useBriefings } from '@/hooks/useBriefings';
import BriefingCard, { getReadingTime, getRelativeTime } from './BriefingCard';
import { AlertCircle, ArrowUpRight, BarChart3, Clock, RefreshCw, Search, ShieldCheck, Sparkles } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTelegram } from '@/hooks/useTelegram';
import ImageWithFallback from './ImageWithFallback';
import type { Briefing, BriefingCategory } from '@/types';

const SEARCH_SUGGESTIONS = ['Wallet v5', 'USDT', 'Mini Apps', 'TON Connect', 'Tact', 'STON.fi'];

const CURATED_SECTIONS: { title: string; category?: BriefingCategory; note: string }[] = [
  { title: 'TON Infrastructure', category: 'Infrastructure', note: 'Core protocol, wallets, tooling' },
  { title: 'Mini Apps', category: 'Mini Apps', note: 'Telegram-native products and distribution' },
  { title: 'DeFi & Stablecoins', category: 'DeFi', note: 'Liquidity, payments, market structure' },
  { title: 'Telegram Integrations', category: 'Integration', note: 'Partnerships and platform surface area' },
];

export default function BriefingFeed() {
  const router = useRouter();
  const { triggerHaptic } = useTelegram();
  const { searchQuery, setSearchQuery } = useTerminalStore();
  const { briefings, isLoading, error, refresh } = useBriefings();
  const [localSearch, setLocalSearch] = useState<string>(searchQuery);
  const [isHeroImageBroken, setIsHeroImageBroken] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setSearchQuery(localSearch);
    }, 240);
    return () => clearTimeout(timer);
  }, [localSearch, setSearchQuery]);

  const spotlightBriefing = briefings[0] || null;
  const feedBriefings = searchQuery || briefings.length <= 1 ? briefings : briefings.slice(1);

  const topicCounts = useMemo(() => {
    const counts = new Map<string, number>();
    briefings.forEach((briefing) => {
      briefing.tags.slice(0, 4).forEach((tag) => {
        counts.set(tag, (counts.get(tag) || 0) + 1);
      });
    });
    return Array.from(counts.entries()).sort((a, b) => b[1] - a[1]).slice(0, 8);
  }, [briefings]);

  return (
    <div className="flex min-w-0 flex-col gap-7">
      <section className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_300px]">
        <div className="editorial-card rounded-sm p-3 sm:p-4">
          <div className="relative flex items-center gap-3">
            <Search className="absolute left-3 h-4 w-4 text-editorial-text-subtle" />
            <input
              type="text"
              value={localSearch}
              onChange={(e) => setLocalSearch(e.target.value)}
              placeholder="Search protocols, projects, topics, or sources"
              className="h-12 w-full rounded-sm border border-editorial-border bg-editorial-bg pl-10 pr-4 text-base text-foreground outline-none transition-colors placeholder:text-editorial-text-subtle focus:border-editorial-accent"
            />
            <button
              onClick={() => {
                triggerHaptic('light');
                refresh();
              }}
              disabled={isLoading}
              className="flex h-12 shrink-0 items-center gap-2 rounded-sm border border-editorial-border bg-editorial-card px-3 text-sm font-bold text-editorial-text-subtle transition-colors hover:border-editorial-border-hover hover:text-foreground disabled:opacity-60"
            >
              <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">Refresh</span>
            </button>
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            {SEARCH_SUGGESTIONS.map((suggestion) => (
              <button
                key={suggestion}
                onClick={() => setLocalSearch(suggestion)}
                className="rounded-sm bg-editorial-muted px-2.5 py-1 text-xs font-semibold text-editorial-text-subtle hover:text-foreground"
              >
                {suggestion}
              </button>
            ))}
          </div>
        </div>

        <div className="editorial-card rounded-sm p-4">
          <div className="flex items-center gap-2 text-sm font-extrabold">
            <BarChart3 className="h-4 w-4 text-editorial-accent" />
            Ecosystem Market Pulse
          </div>
          <div className="mt-3 grid grid-cols-3 gap-2 text-center">
            <PulseStat label="Stories" value={briefings.length.toString()} />
            <PulseStat label="Sources" value={countSources(briefings).toString()} />
            <PulseStat label="Trust" value={`${averageTrust(briefings)}%`} />
          </div>
        </div>
      </section>

      {isLoading && briefings.length === 0 && <LoadingFrontPage />}

      {error && briefings.length === 0 && (
        <div className="editorial-card rounded-sm p-8 text-center">
          <AlertCircle className="mx-auto h-8 w-8 text-red-500" />
          <h3 className="mt-3 text-lg font-extrabold text-foreground">Live briefings are unavailable</h3>
          <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-editorial-text-subtle">
            The publication could not reach the briefing database. Recent local coverage may still be available after refreshing.
          </p>
          <button
            onClick={() => refresh()}
            className="mt-4 rounded-sm border border-editorial-border px-4 py-2 text-sm font-bold hover:border-editorial-border-hover"
          >
            Try again
          </button>
        </div>
      )}

      {!isLoading && !searchQuery && spotlightBriefing && (
        <FeaturedStory
          briefing={spotlightBriefing}
          isHeroImageBroken={isHeroImageBroken}
          setIsHeroImageBroken={setIsHeroImageBroken}
          onOpen={() => {
            triggerHaptic('medium');
            router.push(`/briefing/${spotlightBriefing.slug}`);
          }}
        />
      )}

      {!isLoading && briefings.length > 0 && (
        <section id="live-feed" className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_310px]">
          <div className="flex min-w-0 flex-col gap-4">
            <div className="flex items-end justify-between gap-4 border-b border-editorial-border pb-3">
              <div>
                <p className="text-xs font-extrabold uppercase text-editorial-text-subtle">Latest Developments</p>
                <h2 className="serif-title text-3xl font-black">Live TON Feed</h2>
              </div>
              <p className="hidden max-w-xs text-right text-sm text-editorial-text-subtle sm:block">
                Curated briefings ranked by source quality, recency, and ecosystem relevance.
              </p>
            </div>

            <AnimatePresence mode="popLayout">
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="grid gap-4"
              >
                {feedBriefings.map((briefing) => (
                  <motion.div key={briefing.id} layout>
                    <BriefingCard briefing={briefing} />
                  </motion.div>
                ))}
              </motion.div>
            </AnimatePresence>
          </div>

          <aside className="grid content-start gap-4">
            <TopicPanel topics={topicCounts} onPick={setLocalSearch} />
            <SourcePanel briefings={briefings} />
          </aside>
        </section>
      )}

      {!isLoading && !searchQuery && briefings.length > 0 && (
        <section className="grid gap-4 border-t border-editorial-border pt-6 md:grid-cols-2">
          {CURATED_SECTIONS.map((section) => {
            const items = briefings.filter((briefing) => !section.category || briefing.category === section.category).slice(0, 2);
            if (items.length === 0) return null;
            return (
              <div key={section.title} className="editorial-card rounded-sm p-4">
                <div className="mb-4 flex items-start justify-between gap-4">
                  <div>
                    <h3 className="serif-title text-2xl font-black">{section.title}</h3>
                    <p className="text-sm text-editorial-text-subtle">{section.note}</p>
                  </div>
                  <ArrowUpRight className="h-4 w-4 text-editorial-text-subtle" />
                </div>
                <div className="grid gap-3">
                  {items.map((item) => (
                    <a key={item.id} href={`/briefing/${item.slug}`} className="group border-t border-editorial-border pt-3">
                      <p className="text-xs font-bold text-editorial-accent">{item.source_name || item.category}</p>
                      <h4 className="serif-title mt-1 text-lg font-black leading-tight group-hover:text-editorial-accent">{item.title}</h4>
                      <p className="mt-1 line-clamp-2 text-sm text-editorial-text-subtle">{item.why_it_matters}</p>
                    </a>
                  ))}
                </div>
              </div>
            );
          })}
        </section>
      )}

      {!isLoading && briefings.length === 0 && !error && (
        <div className="editorial-card rounded-sm p-10 text-center">
          <Sparkles className="mx-auto h-7 w-7 text-editorial-accent" />
          <h3 className="mt-3 text-lg font-extrabold">No stories match this view</h3>
          <p className="mt-2 text-sm text-editorial-text-subtle">Try a different category or search term.</p>
        </div>
      )}
    </div>
  );
}

function FeaturedStory({
  briefing,
  isHeroImageBroken,
  setIsHeroImageBroken,
  onOpen,
}: {
  briefing: Briefing;
  isHeroImageBroken: boolean;
  setIsHeroImageBroken: (broken: boolean) => void;
  onOpen: () => void;
}) {
  return (
    <section onClick={onOpen} className="group cursor-pointer overflow-hidden rounded-sm border border-editorial-border bg-editorial-card">
      <div className="grid lg:grid-cols-[minmax(0,1.25fr)_minmax(360px,0.75fr)]">
        <div className="relative min-h-[300px] bg-editorial-muted">
          {briefing.image_url && !isHeroImageBroken ? (
            <ImageWithFallback
              src={briefing.image_url}
              alt={briefing.title}
              className="h-full min-h-[300px] w-full object-cover transition-transform duration-700 group-hover:scale-[1.02]"
              onFallbackTriggered={() => setIsHeroImageBroken(true)}
            />
          ) : (
            <div className="tone-grid flex h-full min-h-[300px] items-end p-6">
              <span className="serif-title text-8xl font-black text-editorial-accent">TON</span>
            </div>
          )}
          <div className="absolute left-4 top-4 rounded-sm bg-editorial-accent px-3 py-1.5 text-xs font-extrabold text-white dark:text-[#101722]">
            Featured Story
          </div>
        </div>

        <div className="flex flex-col gap-5 p-5 md:p-7">
          <div className="flex flex-wrap items-center gap-3 text-sm font-semibold text-editorial-text-subtle">
            <span className="text-editorial-accent">{briefing.category}</span>
            <span>{briefing.source_name || 'Verified source'}</span>
            <span>{getRelativeTime(briefing.published_at)}</span>
            <span className="flex items-center gap-1"><Clock className="h-4 w-4" /> {getReadingTime(briefing)} min read</span>
          </div>

          <h1 className="serif-title text-4xl font-black leading-none text-foreground group-hover:text-editorial-accent md:text-5xl">
            {briefing.title}
          </h1>

          <p className="text-base leading-relaxed text-editorial-text-subtle">{briefing.briefing}</p>

          <div className="border-l-4 border-editorial-accent pl-4">
            <p className="text-xs font-extrabold uppercase text-editorial-text-subtle">Why it matters</p>
            <p className="mt-1 text-lg font-bold leading-snug text-foreground">{briefing.why_it_matters}</p>
          </div>

          <div className="mt-auto grid gap-3 border-t border-editorial-border pt-4 text-sm text-editorial-text-subtle sm:grid-cols-2">
            <div className="flex items-center gap-2"><ShieldCheck className="h-4 w-4 text-editorial-accent" /> Source quality {briefing.source_quality_score}%</div>
            <div className="flex flex-wrap gap-2">
              {briefing.tags.slice(0, 3).map((tag) => (
                <span key={tag} className="rounded-sm bg-editorial-muted px-2 py-1 text-xs font-semibold">{tag}</span>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function PulseStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-sm bg-editorial-muted px-2 py-3">
      <div className="text-lg font-black text-foreground">{value}</div>
      <div className="text-[11px] font-bold text-editorial-text-subtle">{label}</div>
    </div>
  );
}

function TopicPanel({ topics, onPick }: { topics: [string, number][]; onPick: (topic: string) => void }) {
  const visibleTopics = topics.length ? topics : SEARCH_SUGGESTIONS.map((topic) => [topic, 1] as [string, number]);
  return (
    <div className="editorial-card rounded-sm p-4">
      <h3 className="text-xs font-extrabold uppercase text-editorial-text-subtle">Trending Topics</h3>
      <div className="mt-3 grid gap-2">
        {visibleTopics.map(([topic, count]) => (
          <button
            key={topic}
            onClick={() => onPick(topic)}
            className="flex items-center justify-between rounded-sm border border-editorial-border px-3 py-2 text-left text-sm font-semibold hover:border-editorial-border-hover"
          >
            <span>{topic}</span>
            <span className="text-xs text-editorial-text-subtle">{count}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

function SourcePanel({ briefings }: { briefings: Briefing[] }) {
  const sources = Array.from(new Set(briefings.map((b) => b.source_name).filter(Boolean))).slice(0, 6);
  return (
    <div className="editorial-card rounded-sm p-4">
      <h3 className="text-xs font-extrabold uppercase text-editorial-text-subtle">Source Watch</h3>
      <div className="mt-3 grid gap-2">
        {sources.length ? sources.map((source) => (
          <div key={source} className="flex items-center justify-between border-b border-editorial-border py-2 text-sm">
            <span className="font-semibold">{source}</span>
            <span className="text-xs text-editorial-text-subtle">active</span>
          </div>
        )) : <p className="text-sm text-editorial-text-subtle">Sources will appear as stories load.</p>}
      </div>
    </div>
  );
}

function LoadingFrontPage() {
  return (
    <div className="grid gap-4">
      {[1, 2, 3].map((item) => (
        <div key={item} className="editorial-card grid animate-pulse gap-4 rounded-sm p-4 sm:grid-cols-[190px_1fr]">
          <div className="aspect-[4/3] rounded-sm bg-editorial-muted" />
          <div className="grid content-start gap-3">
            <div className="h-3 w-32 rounded-sm bg-editorial-muted" />
            <div className="h-7 w-4/5 rounded-sm bg-editorial-muted" />
            <div className="h-16 rounded-sm bg-editorial-muted" />
          </div>
        </div>
      ))}
    </div>
  );
}

function countSources(briefings: Briefing[]): number {
  return new Set(briefings.map((briefing) => briefing.source_name || briefing.source_url || briefing.category)).size;
}

function averageTrust(briefings: Briefing[]): number {
  if (!briefings.length) return 0;
  const total = briefings.reduce((sum, briefing) => sum + (briefing.confidence_score || 0), 0);
  return Math.round(total / briefings.length);
}
