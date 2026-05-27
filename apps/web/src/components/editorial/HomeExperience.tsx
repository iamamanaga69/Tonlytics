'use client';

import { useEffect, useMemo, useState } from 'react';
import type { ComponentType } from 'react';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import { clsx } from 'clsx';
import {
  Bookmark,
  Building2,
  ChevronRight,
  Flame,
  Layers,
  Menu,
  Moon,
  Newspaper,
  Search,
  Send,
  ShieldCheck,
  Sparkles,
  Sun,
  Users,
  Zap,
} from 'lucide-react';
import ImageWithFallback from '@/components/terminal/ImageWithFallback';
import { useTelegram } from '@/hooks/useTelegram';
import { useBriefings } from '@/hooks/useBriefings';
import { useTerminalStore } from '@/store/terminalStore';
import type { Briefing, BriefingCategory } from '@/types';
import {
  getCategoryCounts,
  getCredibilityLabel,
  getReadingTime,
  getRelativeTime,
  getSourceHost,
  getTopicCounts,
  matchesSignal,
  rankBriefings,
  scoreBriefing,
  uniqueById,
} from '@/lib/editorial-utils';
import TonTickerWidget from './TonTickerWidget';

const WalletConnectButton = dynamic(
  () => import('@/components/terminal/WalletConnectButton'),
  { ssr: false }
);

const NAV_CATEGORIES: { id: BriefingCategory | 'All'; label: string }[] = [
  { id: 'All', label: 'Top Stories' },
  { id: 'Telegram Apps', label: 'Telegram Apps' },
  { id: 'Mini Apps', label: 'Mini Apps' },
  { id: 'Infrastructure', label: 'Infrastructure' },
  { id: 'Funding', label: 'Funding' },
  { id: 'Governance', label: 'Governance' },
];

const SECTION_DEFS: {
  title: string;
  eyebrow: string;
  signals?: string[];
  categories?: BriefingCategory[];
  icon: ComponentType<{ className?: string }>;
}[] = [
  {
    title: 'Telegram Apps',
    eyebrow: 'Native distribution',
    categories: ['Telegram Apps', 'Mini Apps', 'Integration'],
    signals: ['telegram app', 'mini app', 'bot', 'wallet', 'telegram'],
    icon: Send,
  },
  {
    title: 'Builder Spotlight',
    eyebrow: 'Developers and tooling',
    categories: ['Builders', 'Infrastructure'],
    signals: ['github', 'sdk', 'tact', 'func', 'developer', 'builder', 'release'],
    icon: Users,
  },
  {
    title: 'Funding & Partnerships',
    eyebrow: 'Capital and alliances',
    categories: ['Funding', 'Ecosystem', 'Integration'],
    signals: ['funding', 'grant', 'partner', 'partnership', 'launch', 'foundation'],
    icon: Building2,
  },
  {
    title: 'TON Governance',
    eyebrow: 'Protocol coordination',
    categories: ['Governance', 'Infrastructure'],
    signals: ['governance', 'validator', 'proposal', 'dao', 'vote', 'protocol'],
    icon: ShieldCheck,
  },
  {
    title: 'Mini Apps Ecosystem',
    eyebrow: 'Consumer surface area',
    categories: ['Mini Apps', 'Telegram Apps'],
    signals: ['game', 'mini app', 'tap', 'nft', 'social', 'user'],
    icon: Layers,
  },
  {
    title: 'Infrastructure Updates',
    eyebrow: 'Core network layer',
    categories: ['Infrastructure'],
    signals: ['core', 'wallet', 'contract', 'node', 'ton connect', 'tooling'],
    icon: Zap,
  },
];

export default function HomeExperience({ initialBriefings }: { initialBriefings: Briefing[] }) {
  const { isTelegram, triggerHaptic } = useTelegram();
  const { selectedCategory, setSelectedCategory, searchQuery, setSearchQuery } = useTerminalStore();
  const { briefings, isLoading, error } = useBriefings({ initialBriefings });
  const [localSearch, setLocalSearch] = useState(searchQuery);
  const [bookmarks, setBookmarks] = useState<string[]>(readStoredBookmarks);
  const [theme, setTheme] = useState<'light' | 'dark'>(readStoredTheme);
  const [navOpen, setNavOpen] = useState(false);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark');
  }, [theme]);

  useEffect(() => {
    const timer = window.setTimeout(() => setSearchQuery(localSearch), 220);
    return () => window.clearTimeout(timer);
  }, [localSearch, setSearchQuery]);

  const ranked = useMemo(() => rankBriefings(briefings), [briefings]);
  const leadStory = ranked[0] || null;
  const breakingStories = useMemo(() => briefings.slice(0, 5), [briefings]);
  const topicCounts = useMemo(() => getTopicCounts(briefings, 8), [briefings]);
  const categoryCounts = useMemo(() => getCategoryCounts(briefings), [briefings]);

  const sections = useMemo(() => {
    return SECTION_DEFS.map((section) => {
      const items = briefings.filter((briefing) => {
        const categoryMatch = section.categories?.includes(briefing.category);
        const signalMatch = section.signals ? matchesSignal(briefing, section.signals) : false;
        return categoryMatch || signalMatch;
      });

      return {
        ...section,
        items: uniqueById(items).slice(0, 3),
      };
    });
  }, [briefings]);

  const aiSignals = useMemo(() => {
    return ranked
      .filter((briefing) => (briefing.confidence_score || 0) >= 90 && (briefing.relevance_score || 0) >= 80)
      .slice(0, 4);
  }, [ranked]);

  const toggleTheme = () => {
    triggerHaptic('light');
    const nextTheme = theme === 'dark' ? 'light' : 'dark';
    setTheme(nextTheme);
    document.documentElement.classList.toggle('dark', nextTheme === 'dark');
    window.localStorage.setItem('theme', nextTheme);
  };

  const toggleBookmark = (id: string) => {
    triggerHaptic('light');
    setBookmarks((current) => {
      const next = current.includes(id) ? current.filter((item) => item !== id) : [...current, id];
      window.localStorage.setItem('tonlytics-bookmarks', JSON.stringify(next));
      return next;
    });
  };

  const selectCategory = (category: BriefingCategory | 'All') => {
    setSelectedCategory(category);
    triggerHaptic('light');
    setNavOpen(false);
  };

  return (
    <div className="min-h-screen bg-editorial-bg text-foreground">
      <header className="sticky top-0 z-40 border-b border-editorial-border bg-editorial-bg/92 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center gap-3 px-4 py-3 md:px-6 lg:px-8">
          <Link href="/" className="flex shrink-0 items-center gap-3" aria-label="Tonlytics home">
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#0098EA] text-sm font-black text-white">
              T
            </span>
            <span className="leading-none">
              <span className="serif-title block text-2xl font-black tracking-tight">Tonlytics</span>
              <span className="hidden text-[10px] font-extrabold uppercase tracking-[0.18em] text-editorial-text-subtle sm:block">
                TON ecosystem intelligence
              </span>
            </span>
          </Link>

          <nav className="ml-3 hidden min-w-0 flex-1 items-center gap-1 lg:flex">
            {NAV_CATEGORIES.map((category) => (
              <button
                key={category.id}
                onClick={() => selectCategory(category.id)}
                className={clsx(
                  'rounded-md px-3 py-2 text-sm font-bold transition',
                  selectedCategory === category.id
                    ? 'bg-editorial-accent-bg text-editorial-accent'
                    : 'text-editorial-text-subtle hover:bg-editorial-muted hover:text-foreground'
                )}
              >
                {category.label}
              </button>
            ))}
          </nav>

          <div className="ml-auto hidden w-full max-w-xs items-center gap-2 rounded-lg border border-editorial-border bg-editorial-card px-3 py-2 md:flex">
            <Search className="h-4 w-4 text-editorial-text-subtle" />
            <input
              value={localSearch}
              onChange={(event) => setLocalSearch(event.target.value)}
              placeholder="Search TON sources"
              className="min-w-0 flex-1 bg-transparent text-sm font-semibold outline-none placeholder:text-editorial-text-subtle"
            />
          </div>

          <TonTickerWidget compact />

          <button
            onClick={toggleTheme}
            className="flex h-10 w-10 items-center justify-center rounded-lg border border-editorial-border bg-editorial-card text-editorial-text-subtle transition hover:border-editorial-accent/45 hover:text-editorial-accent"
            aria-label="Toggle color theme"
          >
            {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </button>

          <div className="hidden sm:block">
            <WalletConnectButton />
          </div>

          <button
            onClick={() => setNavOpen((open) => !open)}
            className="flex h-10 w-10 items-center justify-center rounded-lg border border-editorial-border bg-editorial-card text-editorial-text-subtle lg:hidden"
            aria-label="Open navigation"
          >
            <Menu className="h-4 w-4" />
          </button>
        </div>

        <div className="border-t border-editorial-border px-4 py-2 md:hidden">
          <div className="flex items-center gap-2 rounded-lg border border-editorial-border bg-editorial-card px-3 py-2">
            <Search className="h-4 w-4 text-editorial-text-subtle" />
            <input
              value={localSearch}
              onChange={(event) => setLocalSearch(event.target.value)}
              placeholder="Search TON sources"
              className="min-w-0 flex-1 bg-transparent text-sm font-semibold outline-none placeholder:text-editorial-text-subtle"
            />
          </div>
        </div>

        {navOpen && (
          <div className="border-t border-editorial-border px-4 py-3 lg:hidden">
            <div className="grid grid-cols-2 gap-2">
              {NAV_CATEGORIES.map((category) => (
                <button
                  key={category.id}
                  onClick={() => selectCategory(category.id)}
                  className={clsx(
                    'rounded-md border px-3 py-2 text-left text-sm font-bold',
                    selectedCategory === category.id
                      ? 'border-editorial-accent/40 bg-editorial-accent-bg text-editorial-accent'
                      : 'border-editorial-border bg-editorial-card text-editorial-text-subtle'
                  )}
                >
                  {category.label}
                </button>
              ))}
            </div>
          </div>
        )}
      </header>

      <BreakingStrip stories={breakingStories} />

      <main className="mx-auto grid max-w-7xl gap-10 px-4 py-6 md:px-6 lg:px-8 lg:py-10">
        <section className="grid gap-6 lg:grid-cols-[minmax(0,1.24fr)_minmax(320px,0.76fr)] lg:items-stretch">
          <LeadStory briefing={leadStory} isLoading={isLoading} isBookmarked={leadStory ? bookmarks.includes(leadStory.id) : false} onBookmark={toggleBookmark} />
          <aside className="grid gap-4">
            <NewsBriefingStack stories={breakingStories.slice(1, 5)} isLoading={isLoading} />
            <TrendPanel topics={topicCounts} onPick={setLocalSearch} />
          </aside>
        </section>

        {error && briefings.length === 0 && (
          <section className="rounded-lg border border-rose-200 bg-rose-50 p-5 text-sm font-semibold text-rose-800 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-100">
            Live briefing data is temporarily unavailable. The feed will reconnect automatically.
          </section>
        )}

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <MetricTile label="Published briefings" value={briefings.length.toString()} />
          <MetricTile label="Tracked sources" value={countSources(briefings).toString()} />
          <MetricTile label="Median credibility" value={`${medianScore(briefings)}%`} />
          <MetricTile label="Saved for later" value={bookmarks.length.toString()} />
        </section>

        <section>
          <SectionHeader
            eyebrow="Trending on TON"
            title="Stories moving through Telegram-native crypto"
            actionHref="/trending"
          />
          <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {ranked.slice(0, 6).map((briefing) => (
              <StoryCard
                key={briefing.id}
                briefing={briefing}
                isBookmarked={bookmarks.includes(briefing.id)}
                onBookmark={toggleBookmark}
              />
            ))}
          </div>
        </section>

        <section className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_340px]">
          <div className="grid gap-5 md:grid-cols-2">
            {sections.map((section) => (
              <EditorialSection key={section.title} {...section} bookmarks={bookmarks} onBookmark={toggleBookmark} />
            ))}
          </div>
          <aside className="grid content-start gap-5">
            <EcosystemHeatmap categoryCounts={categoryCounts} />
            <AiSignals stories={aiSignals} />
            <MarketOverview />
          </aside>
        </section>
      </main>

      {!isTelegram && (
        <footer className="border-t border-editorial-border">
          <div className="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-7 text-sm text-editorial-text-subtle md:flex-row md:items-center md:justify-between md:px-6 lg:px-8">
            <p>Tonlytics is an independent editorial intelligence layer for TON and Telegram-native crypto.</p>
            <div className="flex flex-wrap gap-4 font-bold">
              <Link href="/ecosystem" className="hover:text-editorial-accent">Projects</Link>
              <Link href="/mini-apps" className="hover:text-editorial-accent">Mini Apps</Link>
              <Link href="/builders" className="hover:text-editorial-accent">Builders</Link>
              <Link href="/analytics" className="hover:text-editorial-accent">Analytics</Link>
            </div>
          </div>
        </footer>
      )}
    </div>
  );
}

function BreakingStrip({ stories }: { stories: Briefing[] }) {
  if (!stories.length) return null;
  const items = [...stories, ...stories];

  return (
    <div className="overflow-hidden border-b border-editorial-border bg-editorial-card">
      <div className="mx-auto flex max-w-7xl items-center gap-4 px-4 py-2 md:px-6 lg:px-8">
        <span className="shrink-0 rounded-md bg-editorial-accent-bg px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.16em] text-editorial-accent">
          Breaking TON News
        </span>
        <div className="mask-gradient-right min-w-0 flex-1 overflow-hidden">
          <div className="flex min-w-max animate-marquee items-center gap-8 text-xs font-bold text-editorial-text-subtle">
            {items.map((story, index) => (
              <Link key={`${story.id}-${index}`} href={`/briefing/${story.slug}`} className="flex items-center gap-2 hover:text-editorial-accent">
                <span className="h-1.5 w-1.5 rounded-full bg-editorial-accent" />
                {story.title}
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function LeadStory({
  briefing,
  isLoading,
  isBookmarked,
  onBookmark,
}: {
  briefing: Briefing | null;
  isLoading: boolean;
  isBookmarked: boolean;
  onBookmark: (id: string) => void;
}) {
  if (isLoading && !briefing) {
    return <div className="min-h-[560px] animate-pulse rounded-lg bg-editorial-muted" />;
  }

  if (!briefing) {
    return (
      <div className="grid min-h-[420px] place-items-center rounded-lg border border-editorial-border bg-editorial-card p-8 text-center">
        <div>
          <Newspaper className="mx-auto h-8 w-8 text-editorial-accent" />
          <h1 className="serif-title mt-4 text-4xl font-black">Live TON newsroom</h1>
          <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-editorial-text-subtle">
            Connect Supabase or run ingestion to populate the editorial feed.
          </p>
        </div>
      </div>
    );
  }

  return (
    <article className="group grid overflow-hidden rounded-lg border border-editorial-border bg-editorial-card shadow-sm transition hover:-translate-y-0.5 hover:border-editorial-accent/35 hover:shadow-md">
      <Link href={`/briefing/${briefing.slug}`} className="grid lg:grid-rows-[minmax(260px,0.72fr)_auto]">
        <div className="relative min-h-[280px] overflow-hidden bg-editorial-muted">
          {briefing.image_url ? (
            <ImageWithFallback
              src={briefing.image_url}
              alt={briefing.title}
              fallbackLabel={briefing.category}
              className="h-full min-h-[280px] w-full object-cover transition duration-700 group-hover:scale-[1.03]"
            />
          ) : (
            <div className="tone-grid flex h-full min-h-[280px] items-end p-6">
              <span className="serif-title text-8xl font-black text-editorial-accent">TON</span>
            </div>
          )}
          <div className="absolute left-4 top-4 rounded-md bg-editorial-bg/90 px-3 py-1 text-[10px] font-black uppercase tracking-[0.16em] text-editorial-accent shadow-sm">
            Lead intelligence
          </div>
        </div>

        <div className="grid gap-5 p-5 md:p-7">
          <StoryMeta briefing={briefing} />
          <h1 className="serif-title max-w-4xl text-4xl font-black leading-[0.98] tracking-tight text-foreground transition group-hover:text-editorial-accent md:text-6xl">
            {briefing.title}
          </h1>
          <p className="max-w-3xl text-lg leading-8 text-editorial-text">{briefing.briefing}</p>
          <div className="grid gap-3 border-l-2 border-editorial-accent pl-4">
            <span className="text-[10px] font-black uppercase tracking-[0.16em] text-editorial-text-subtle">Why it matters</span>
            <p className="text-lg font-black leading-7 text-foreground">{briefing.why_it_matters}</p>
          </div>
        </div>
      </Link>

      <div className="flex items-center justify-between gap-4 border-t border-editorial-border px-5 py-3 md:px-7">
        <div className="flex flex-wrap gap-2">
          {briefing.tags.slice(0, 4).map((tag) => (
            <span key={tag} className="rounded-md bg-editorial-muted px-2.5 py-1 text-[11px] font-bold text-editorial-text-subtle">
              {tag}
            </span>
          ))}
        </div>
        <button
          type="button"
          onClick={() => onBookmark(briefing.id)}
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-editorial-border text-editorial-text-subtle transition hover:border-editorial-accent/45 hover:text-editorial-accent"
          aria-label="Save story"
        >
          <Bookmark className={clsx('h-4 w-4', isBookmarked && 'fill-editorial-accent text-editorial-accent')} />
        </button>
      </div>
    </article>
  );
}

function NewsBriefingStack({ stories, isLoading }: { stories: Briefing[]; isLoading: boolean }) {
  return (
    <section className="rounded-lg border border-editorial-border bg-editorial-card p-4 shadow-sm">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-xs font-black uppercase tracking-[0.16em] text-editorial-text-subtle">Breaking TON ecosystem stories</h2>
        <Flame className="h-4 w-4 text-editorial-accent" />
      </div>
      <div className="grid gap-3">
        {isLoading && stories.length === 0 ? (
          [0, 1, 2].map((item) => <div key={item} className="h-20 animate-pulse rounded-md bg-editorial-muted" />)
        ) : stories.length ? (
          stories.map((story) => <CompactStory key={story.id} briefing={story} />)
        ) : (
          <p className="rounded-md bg-editorial-muted p-4 text-sm font-semibold text-editorial-text-subtle">
            No live stories in this view yet.
          </p>
        )}
      </div>
    </section>
  );
}

function TrendPanel({ topics, onPick }: { topics: [string, number][]; onPick: (topic: string) => void }) {
  return (
    <section className="rounded-lg border border-editorial-border bg-editorial-card p-4 shadow-sm">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-xs font-black uppercase tracking-[0.16em] text-editorial-text-subtle">Trending topics</h2>
        <Sparkles className="h-4 w-4 text-editorial-accent" />
      </div>
      <div className="flex flex-wrap gap-2">
        {topics.length ? (
          topics.map(([topic, count]) => (
            <button
              key={topic}
              onClick={() => onPick(topic)}
              className="rounded-md border border-editorial-border bg-editorial-muted px-3 py-1.5 text-xs font-black text-editorial-text-subtle transition hover:border-editorial-accent/40 hover:text-editorial-accent"
            >
              {topic} <span className="font-mono opacity-70">{count}</span>
            </button>
          ))
        ) : (
          <span className="text-sm font-semibold text-editorial-text-subtle">Topics appear as live stories are ingested.</span>
        )}
      </div>
    </section>
  );
}

function SectionHeader({ eyebrow, title, actionHref }: { eyebrow: string; title: string; actionHref?: string }) {
  return (
    <div className="flex flex-col gap-3 border-b border-editorial-border pb-4 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <p className="text-xs font-black uppercase tracking-[0.18em] text-editorial-accent">{eyebrow}</p>
        <h2 className="serif-title mt-2 max-w-3xl text-3xl font-black leading-tight md:text-5xl">{title}</h2>
      </div>
      {actionHref && (
        <Link href={actionHref} className="flex w-fit items-center gap-1 text-sm font-black text-editorial-accent">
          Open view
          <ChevronRight className="h-4 w-4" />
        </Link>
      )}
    </div>
  );
}

function StoryCard({
  briefing,
  isBookmarked,
  onBookmark,
}: {
  briefing: Briefing;
  isBookmarked: boolean;
  onBookmark: (id: string) => void;
}) {
  return (
    <article className="group grid overflow-hidden rounded-lg border border-editorial-border bg-editorial-card shadow-sm transition hover:-translate-y-0.5 hover:border-editorial-accent/35 hover:shadow-md">
      <Link href={`/briefing/${briefing.slug}`} className="grid">
        <div className="relative aspect-[16/10] overflow-hidden bg-editorial-muted">
          {briefing.image_url ? (
            <ImageWithFallback
              src={briefing.image_url}
              alt={briefing.title}
              fallbackLabel={briefing.category}
              className="h-full w-full object-cover transition duration-700 group-hover:scale-[1.035]"
            />
          ) : (
            <div className="tone-grid flex h-full items-end p-4">
              <span className="serif-title text-5xl font-black text-editorial-accent">{briefing.category.slice(0, 3)}</span>
            </div>
          )}
        </div>
        <div className="grid gap-3 p-4">
          <StoryMeta briefing={briefing} />
          <h3 className="serif-title text-2xl font-black leading-tight transition group-hover:text-editorial-accent">{briefing.title}</h3>
          <p className="line-clamp-3 text-sm leading-6 text-editorial-text-subtle">{briefing.why_it_matters}</p>
        </div>
      </Link>
      <div className="flex items-center justify-between border-t border-editorial-border px-4 py-3 text-xs font-bold text-editorial-text-subtle">
        <span>{scoreBriefing(briefing)} signal score</span>
        <button
          onClick={() => onBookmark(briefing.id)}
          className="rounded-md p-1.5 transition hover:bg-editorial-muted hover:text-editorial-accent"
          aria-label="Save story"
        >
          <Bookmark className={clsx('h-4 w-4', isBookmarked && 'fill-editorial-accent text-editorial-accent')} />
        </button>
      </div>
    </article>
  );
}

function CompactStory({ briefing }: { briefing: Briefing }) {
  return (
    <Link href={`/briefing/${briefing.slug}`} className="group grid gap-2 border-t border-editorial-border pt-3 first:border-t-0 first:pt-0">
      <StoryMeta briefing={briefing} compact />
      <h3 className="serif-title text-xl font-black leading-tight transition group-hover:text-editorial-accent">{briefing.title}</h3>
      <p className="line-clamp-2 text-sm leading-6 text-editorial-text-subtle">{briefing.why_it_matters}</p>
    </Link>
  );
}

function EditorialSection({
  title,
  eyebrow,
  icon: Icon,
  items,
  bookmarks,
  onBookmark,
}: {
  title: string;
  eyebrow: string;
  icon: ComponentType<{ className?: string }>;
  items: Briefing[];
  bookmarks: string[];
  onBookmark: (id: string) => void;
}) {
  return (
    <section className="rounded-lg border border-editorial-border bg-editorial-card p-4 shadow-sm">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.16em] text-editorial-accent">{eyebrow}</p>
          <h2 className="serif-title mt-1 text-2xl font-black">{title}</h2>
        </div>
        <span className="rounded-md bg-editorial-accent-bg p-2 text-editorial-accent">
          <Icon className="h-4 w-4" />
        </span>
      </div>
      <div className="grid gap-3">
        {items.length ? (
          items.map((item) => (
            <div key={item.id} className="grid grid-cols-[1fr_auto] gap-3 border-t border-editorial-border pt-3 first:border-t-0 first:pt-0">
              <CompactStory briefing={item} />
              <button
                onClick={() => onBookmark(item.id)}
                className="mt-1 h-8 w-8 rounded-md text-editorial-text-subtle transition hover:bg-editorial-muted hover:text-editorial-accent"
                aria-label="Save story"
              >
                <Bookmark className={clsx('mx-auto h-4 w-4', bookmarks.includes(item.id) && 'fill-editorial-accent text-editorial-accent')} />
              </button>
            </div>
          ))
        ) : (
          <p className="rounded-md bg-editorial-muted p-4 text-sm font-semibold text-editorial-text-subtle">
            No live updates in this segment yet.
          </p>
        )}
      </div>
    </section>
  );
}

function EcosystemHeatmap({ categoryCounts }: { categoryCounts: [string, number][] }) {
  const total = categoryCounts.reduce((sum, [, count]) => sum + count, 0) || 1;

  return (
    <section className="rounded-lg border border-editorial-border bg-editorial-card p-4 shadow-sm">
      <h2 className="text-xs font-black uppercase tracking-[0.16em] text-editorial-text-subtle">Ecosystem Heatmap</h2>
      <div className="mt-4 grid gap-3">
        {categoryCounts.length ? (
          categoryCounts.map(([category, count]) => (
            <div key={category}>
              <div className="mb-1 flex items-center justify-between text-xs font-black">
                <span>{category}</span>
                <span className="font-mono text-editorial-text-subtle">{count}</span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-editorial-muted">
                <div className="h-full rounded-full bg-editorial-accent" style={{ width: `${Math.max(8, (count / total) * 100)}%` }} />
              </div>
            </div>
          ))
        ) : (
          <p className="text-sm font-semibold text-editorial-text-subtle">Heatmap data appears after ingestion.</p>
        )}
      </div>
    </section>
  );
}

function AiSignals({ stories }: { stories: Briefing[] }) {
  return (
    <section className="rounded-lg border border-editorial-border bg-editorial-card p-4 shadow-sm">
      <h2 className="text-xs font-black uppercase tracking-[0.16em] text-editorial-text-subtle">TON AI Signals</h2>
      <div className="mt-4 grid gap-3">
        {stories.length ? (
          stories.map((story) => (
            <Link key={story.id} href={`/briefing/${story.slug}`} className="group grid gap-1 border-t border-editorial-border pt-3 first:border-t-0 first:pt-0">
              <span className="text-[10px] font-black uppercase tracking-[0.14em] text-editorial-accent">
                {story.confidence_score}% confidence
              </span>
              <span className="serif-title text-lg font-black leading-tight group-hover:text-editorial-accent">{story.title}</span>
            </Link>
          ))
        ) : (
          <p className="text-sm font-semibold text-editorial-text-subtle">Signals appear when enough verified stories are live.</p>
        )}
      </div>
    </section>
  );
}

function MarketOverview() {
  return (
    <section className="rounded-lg border border-editorial-border bg-editorial-card p-4 shadow-sm">
      <h2 className="mb-3 text-xs font-black uppercase tracking-[0.16em] text-editorial-text-subtle">Market overview</h2>
      <TonTickerWidget />
    </section>
  );
}

function MetricTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-editorial-border bg-editorial-card p-4 shadow-sm">
      <p className="text-[10px] font-black uppercase tracking-[0.16em] text-editorial-text-subtle">{label}</p>
      <p className="mt-2 text-3xl font-black text-foreground">{value}</p>
    </div>
  );
}

function StoryMeta({ briefing, compact = false }: { briefing: Briefing; compact?: boolean }) {
  const source = briefing.source_name || getSourceHost(briefing.source_url) || 'Verified source';

  return (
    <div className={clsx('flex flex-wrap items-center gap-x-3 gap-y-1 font-bold text-editorial-text-subtle', compact ? 'text-[11px]' : 'text-xs')}>
      <span className="font-black uppercase tracking-[0.14em] text-editorial-accent">{briefing.category}</span>
      <span>{source}</span>
      <span>{getRelativeTime(briefing.published_at)}</span>
      <span>{getReadingTime(briefing)} min read</span>
      {!compact && <span>{getCredibilityLabel(briefing)}</span>}
    </div>
  );
}

function countSources(briefings: Briefing[]): number {
  return new Set(briefings.map((briefing) => briefing.source_name || briefing.source_url || briefing.category)).size;
}

function medianScore(briefings: Briefing[]): number {
  if (!briefings.length) return 0;
  const scores = briefings
    .map((briefing) => Math.round(((briefing.confidence_score || 0) + (briefing.source_quality_score || 0)) / 2))
    .sort((a, b) => a - b);
  return scores[Math.floor(scores.length / 2)] || 0;
}

function readStoredTheme(): 'light' | 'dark' {
  if (typeof window === 'undefined') return 'light';
  return window.localStorage.getItem('theme') === 'dark' ? 'dark' : 'light';
}

function readStoredBookmarks(): string[] {
  if (typeof window === 'undefined') return [];
  try {
    const parsed = JSON.parse(window.localStorage.getItem('tonlytics-bookmarks') || '[]');
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}
