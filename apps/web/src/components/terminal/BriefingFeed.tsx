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
        <div className="editorial-card rounded-2xl p-4 sm:p-5">
          <div className="relative flex items-center gap-3">
            <Search className="absolute left-3.5 h-4 w-4 text-[#7D8597]" />
            <input
              type="text"
              value={localSearch}
              onChange={(e) => setLocalSearch(e.target.value)}
              placeholder="Search protocols, projects, topics, or sources"
              className="h-12 w-full rounded-xl border border-[#ffffff]/10 bg-[#060B14]/80 pl-11 pr-4 text-base text-[#F5F7FA] outline-none transition-all duration-300 placeholder:text-[#7D8597] focus:border-[#0098EA] focus:ring-1 focus:ring-[#0098EA] focus:shadow-[0_0_15px_rgba(0,152,234,0.25)]"
            />
            <button
              onClick={() => {
                triggerHaptic('light');
                refresh();
              }}
              disabled={isLoading}
              className="flex h-12 shrink-0 items-center gap-2 rounded-xl border border-editorial-border bg-[#111827]/60 px-4 text-sm font-bold text-[#AAB3C5] transition-all duration-300 hover:border-[#0098EA]/60 hover:text-[#F5F7FA] hover:bg-[#0098EA]/10 disabled:opacity-60 cursor-pointer"
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
                className="rounded-lg border border-[#ffffff]/08 bg-[#111827]/40 px-3 py-1.5 text-xs font-semibold text-[#AAB3C5] hover:border-[#0098EA]/40 hover:bg-[#0098EA]/10 hover:text-[#F5F7FA] transition-all duration-300 cursor-pointer"
              >
                {suggestion}
              </button>
            ))}
          </div>
        </div>

        <div className="editorial-card rounded-2xl p-5">
          <div className="flex items-center gap-2 text-xs font-extrabold uppercase tracking-wider text-[#7D8597]">
            <BarChart3 className="h-4 w-4 text-[#0098EA]" />
            Ecosystem Market Pulse
          </div>
          <div className="mt-4 grid grid-cols-3 gap-2.5 text-center">
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
            <div className="flex items-end justify-between gap-4 border-b border-[#ffffff]/10 pb-3">
              <div>
                <p className="text-xs font-extrabold uppercase tracking-wider text-[#7D8597]">Latest Developments</p>
                <h2 className="serif-title text-3xl font-black text-[#F5F7FA]">Live TON Feed</h2>
              </div>
              <p className="hidden max-w-xs text-right text-sm text-[#AAB3C5] sm:block">
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
        <section className="grid gap-4 border-t border-[#ffffff]/10 pt-6 md:grid-cols-2">
          {CURATED_SECTIONS.map((section) => {
            const items = briefings.filter((briefing) => !section.category || briefing.category === section.category).slice(0, 2);
            if (items.length === 0) return null;
            return (
              <div key={section.title} className="editorial-card rounded-2xl p-5">
                <div className="mb-4 flex items-start justify-between gap-4">
                  <div>
                    <h3 className="serif-title text-2xl font-black text-[#F5F7FA]">{section.title}</h3>
                    <p className="text-sm text-[#AAB3C5]">{section.note}</p>
                  </div>
                  <ArrowUpRight className="h-4 w-4 text-[#7D8597]" />
                </div>
                <div className="grid gap-3">
                  {items.map((item) => (
                    <a key={item.id} href={`/briefing/${item.slug}`} className="group border-t border-[#ffffff]/10 pt-3 block">
                      <p className="text-xs font-bold uppercase tracking-wider text-[#0098EA]">{item.source_name || item.category}</p>
                      <h4 className="serif-title mt-1.5 text-lg font-black leading-tight text-[#F5F7FA] group-hover:text-[#0098EA] transition-colors duration-300">{item.title}</h4>
                      <p className="mt-1.5 line-clamp-2 text-sm leading-relaxed text-[#AAB3C5]">{item.why_it_matters}</p>
                    </a>
                  ))}
                </div>
              </div>
            );
          })}
        </section>
      )}

      {!isLoading && briefings.length === 0 && !error && (
        <div className="editorial-card rounded-2xl p-10 text-center">
          <Sparkles className="mx-auto h-7 w-7 text-[#0098EA]" />
          <h3 className="mt-3 text-lg font-extrabold text-[#F5F7FA]">No stories match this view</h3>
          <p className="mt-2 text-sm text-[#AAB3C5]">Try a different category or search term.</p>
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
    <section onClick={onOpen} className="group cursor-pointer overflow-hidden rounded-2xl border border-[#ffffff]/10 bg-[#111827]/40 backdrop-blur-md transition-all duration-300 hover:border-[#0098EA]/40 hover:shadow-[0_20px_50px_rgba(0,152,234,0.15)] hover:-translate-y-0.5">
      <div className="grid lg:grid-cols-[minmax(0,1.25fr)_minmax(360px,0.75fr)]">
        <div className="relative min-h-[300px] bg-editorial-muted">
          {briefing.image_url && !isHeroImageBroken ? (
            <>
              <ImageWithFallback
                src={briefing.image_url}
                alt={briefing.title}
                className="h-full min-h-[300px] w-full object-cover transition-transform duration-700 group-hover:scale-[1.02]"
                onFallbackTriggered={() => setIsHeroImageBroken(true)}
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[#060B14] via-transparent to-transparent opacity-80" />
            </>
          ) : (
            <div className="tone-grid flex h-full min-h-[300px] items-end p-6">
              <span className="serif-title text-8xl font-black text-editorial-accent">TON</span>
            </div>
          )}
          <div className="absolute left-4 top-4 rounded-lg bg-gradient-to-r from-[#0098EA] to-[#38BDF8] px-3.5 py-1.5 text-[10px] font-extrabold tracking-wider uppercase text-white shadow-[0_0_15px_rgba(0,152,234,0.5)]">
            Featured Story
          </div>
        </div>

        <div className="flex flex-col gap-5 p-5 md:p-7 bg-[#0b1120]/40">
          <div className="flex flex-wrap items-center gap-3 text-xs font-semibold text-[#AAB3C5]">
            <span className="text-[#0098EA] font-extrabold uppercase tracking-wider">{briefing.category}</span>
            <span className="text-[#7D8597]">{briefing.source_name || 'Verified source'}</span>
            <span className="text-[#7D8597]">{getRelativeTime(briefing.published_at)}</span>
            <span className="flex items-center gap-1"><Clock className="h-3.5 w-3.5" /> {getReadingTime(briefing)} min read</span>
          </div>

          <h1 className="serif-title text-3xl font-black leading-tight text-[#F5F7FA] group-hover:text-[#0098EA] transition-colors duration-300 md:text-4xl">
            {briefing.title}
          </h1>

          <p className="text-sm leading-relaxed text-[#CBD5E1]">{briefing.briefing}</p>

          <div className="border-l-4 border-[#0098EA] pl-4">
            <p className="text-[10px] font-extrabold uppercase tracking-wider text-[#7D8597]">Why it matters</p>
            <p className="mt-1 text-base font-bold leading-snug text-[#F5F7FA]">{briefing.why_it_matters}</p>
          </div>

          <div className="mt-auto grid gap-3 border-t border-[#ffffff]/10 pt-4 text-xs text-[#7D8597] sm:grid-cols-2">
            <div className="flex items-center gap-2"><ShieldCheck className="h-4 w-4 text-[#0098EA]" /> Source quality {briefing.source_quality_score}%</div>
            <div className="flex flex-wrap gap-2">
              {briefing.tags.slice(0, 3).map((tag) => (
                <span key={tag} className="rounded-lg border border-[#ffffff]/08 bg-[#111827]/40 px-2 py-1 text-[10px] font-semibold text-[#AAB3C5]">{tag}</span>
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
    <div className="rounded-xl border border-[#ffffff]/06 bg-[#111827]/40 px-2 py-3 transition-colors duration-300 hover:border-[#0098EA]/30">
      <div className="text-xl font-black text-[#F5F7FA]">{value}</div>
      <div className="text-[9px] font-semibold tracking-wider text-[#7D8597] uppercase mt-0.5">{label}</div>
    </div>
  );
}

function TopicPanel({ topics, onPick }: { topics: [string, number][]; onPick: (topic: string) => void }) {
  const visibleTopics = topics.length ? topics : SEARCH_SUGGESTIONS.map((topic) => [topic, 1] as [string, number]);
  return (
    <div className="editorial-card rounded-2xl p-4">
      <h3 className="text-xs font-extrabold uppercase tracking-wider text-[#7D8597]">Trending Topics</h3>
      <div className="mt-3 grid gap-2">
        {visibleTopics.map(([topic, count]) => (
          <button
            key={topic}
            onClick={() => onPick(topic)}
            className="flex items-center justify-between rounded-lg border border-editorial-border bg-[#111827]/30 px-3 py-2 text-left text-sm font-semibold text-[#AAB3C5] hover:border-[#0098EA]/40 hover:bg-[#0098EA]/10 hover:text-[#F5F7FA] transition-all duration-300 cursor-pointer"
          >
            <span>{topic}</span>
            <span className="text-xs text-[#7D8597] font-mono">{count}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

function SourcePanel({ briefings }: { briefings: Briefing[] }) {
  const sources = Array.from(new Set(briefings.map((b) => b.source_name).filter(Boolean))).slice(0, 6);
  return (
    <div className="editorial-card rounded-2xl p-4">
      <h3 className="text-xs font-extrabold uppercase tracking-wider text-[#7D8597]">Source Watch</h3>
      <div className="mt-3 grid gap-1.5">
        {sources.length ? sources.map((source) => (
          <div key={source} className="flex items-center justify-between border-b border-[#ffffff]/06 py-2 text-sm text-[#CBD5E1]">
            <span className="font-semibold">{source}</span>
            <span className="text-[10px] font-mono text-[#38BDF8] uppercase tracking-wider bg-[#38BDF8]/10 px-1.5 py-0.5 rounded">active</span>
          </div>
        )) : <p className="text-sm text-[#7D8597]">Sources will appear as stories load.</p>}
      </div>
    </div>
  );
}

function LoadingFrontPage() {
  return (
    <div className="grid gap-4">
      {[1, 2, 3].map((item) => (
        <div key={item} className="editorial-card grid animate-pulse gap-4 rounded-2xl p-4 sm:grid-cols-[190px_1fr]">
          <div className="aspect-[4/3] rounded-xl bg-editorial-muted" />
          <div className="grid content-start gap-3">
            <div className="h-3 w-32 rounded-lg bg-editorial-muted" />
            <div className="h-7 w-4/5 rounded-lg bg-editorial-muted" />
            <div className="h-16 rounded-lg bg-editorial-muted" />
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
