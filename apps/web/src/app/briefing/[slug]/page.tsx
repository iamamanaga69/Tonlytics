'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  ArrowLeft,
  Bookmark,
  Calendar,
  ChevronLeft,
  ChevronRight,
  Clock,
  ExternalLink,
  Eye,
  Link as LinkIcon,
  MessageCircle,
  PlayCircle,
  Share2,
  ShieldCheck,
} from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import { useTelegram } from '@/hooks/useTelegram';
import type { Briefing } from '@/types';
import ImageWithFallback from '@/components/terminal/ImageWithFallback';
import { getReadingTime } from '@/components/terminal/BriefingCard';

export default function ArticleDetail() {
  const params = useParams();
  const router = useRouter();
  const { triggerHaptic } = useTelegram();
  const [isImageBroken, setIsImageBroken] = useState(false);
  const [briefing, setBriefing] = useState<Briefing | null>(null);
  const [adjacent, setAdjacent] = useState<{ prev: Briefing | null; next: Briefing | null }>({ prev: null, next: null });
  const [isLoading, setIsLoading] = useState(true);
  const [isCopied, setIsCopied] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const slug = params.slug as string;
    if (!slug) return;

    async function fetchArticleDetails() {
      setIsLoading(true);
      try {
        const response = await fetch(`/api/briefings`);
        const data = await response.json();
        if (data.success && data.briefings) {
          const allBriefs = data.briefings as Briefing[];
          const current = allBriefs.find((b) => b.slug === slug);

          if (current) {
            setBriefing(current);
            fetch(`/api/briefings/view?id=${current.id}`, { method: 'POST' }).catch(() => {});
            current.views_count += 1;

            const index = allBriefs.findIndex((b) => b.id === current.id);
            setAdjacent({
              prev: index > 0 ? allBriefs[index - 1] : null,
              next: index < allBriefs.length - 1 ? allBriefs[index + 1] : null,
            });
          }
        }
      } finally {
        setIsLoading(false);
      }
    }

    fetchArticleDetails();
  }, [params.slug]);

  useEffect(() => {
    const onScroll = () => {
      const scrollTop = window.scrollY;
      const docHeight = document.documentElement.scrollHeight - window.innerHeight;
      setProgress(docHeight > 0 ? Math.min(100, Math.max(0, (scrollTop / docHeight) * 100)) : 0);
    };

    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const paragraphs = useMemo(() => briefing?.briefing.split('\n\n').filter(Boolean) || [], [briefing]);

  const handleShare = () => {
    triggerHaptic('light');
    if (typeof window !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(window.location.href);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 1800);
    }
  };

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-editorial-bg px-6 text-center">
        <div>
          <div className="mx-auto h-10 w-10 animate-spin rounded-full border border-editorial-border border-t-editorial-accent" />
          <p className="mt-4 text-sm font-bold text-editorial-text-subtle">Loading story</p>
        </div>
      </div>
    );
  }

  if (!briefing) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-editorial-bg px-6 text-center">
        <div className="max-w-sm">
          <h1 className="serif-title text-3xl font-black">Story not found</h1>
          <p className="mt-2 text-sm text-editorial-text-subtle">This briefing may have been unpublished or moved.</p>
          <button
            onClick={() => router.push('/')}
            className="mt-5 rounded-sm border border-editorial-border px-4 py-2 text-sm font-bold hover:border-editorial-border-hover"
          >
            Back to homepage
          </button>
        </div>
      </div>
    );
  }

  const readingTime = getReadingTime(briefing);
  const sourceHost = getHost(briefing.source_url);

  return (
    <div className="min-h-screen bg-editorial-bg text-foreground">
      <div className="fixed left-0 top-0 z-50 h-1 bg-editorial-accent transition-all" style={{ width: `${progress}%` }} />

      <nav className="sticky top-0 z-40 border-b border-editorial-border bg-editorial-card/95 backdrop-blur-xl">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3 md:px-6">
          <button
            onClick={() => {
              triggerHaptic('light');
              router.push('/');
            }}
            className="flex items-center gap-2 text-sm font-bold text-editorial-text-subtle hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Back to Tonlytics</span>
          </button>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsSaved((saved) => !saved)}
              className="flex h-9 w-9 items-center justify-center rounded-sm border border-editorial-border hover:border-editorial-border-hover"
              aria-label="Save story"
            >
              <Bookmark className={`h-4 w-4 ${isSaved ? 'fill-editorial-accent text-editorial-accent' : 'text-editorial-text-subtle'}`} />
            </button>
            <button
              onClick={handleShare}
              className="relative flex h-9 w-9 items-center justify-center rounded-sm border border-editorial-border hover:border-editorial-border-hover"
              aria-label="Share story"
            >
              <Share2 className="h-4 w-4 text-editorial-text-subtle" />
              <AnimatePresence>
                {isCopied && (
                  <motion.span
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    className="absolute right-0 top-11 rounded-sm border border-editorial-border bg-editorial-card px-2 py-1 text-xs font-bold text-editorial-accent shadow-xl"
                  >
                    Copied
                  </motion.span>
                )}
              </AnimatePresence>
            </button>
          </div>
        </div>
      </nav>

      <main className="mx-auto max-w-6xl px-4 py-7 md:px-6 md:py-10">
        <article>
          <header className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_300px] lg:items-end">
            <div>
              <div className="flex flex-wrap items-center gap-3 text-sm font-semibold text-editorial-text-subtle">
                <span className="font-extrabold text-editorial-accent">{briefing.category}</span>
                <span>{briefing.source_name || sourceHost || 'Verified source'}</span>
                <span className="flex items-center gap-1"><Calendar className="h-4 w-4" /> {formatDate(briefing.published_at)}</span>
              </div>
              <h1 className="serif-title mt-4 max-w-4xl text-4xl font-black leading-none md:text-6xl">
                {briefing.title}
              </h1>
              <p className="mt-5 max-w-3xl text-lg leading-relaxed text-editorial-text-subtle md:text-xl">
                {briefing.why_it_matters}
              </p>
            </div>

            <aside className="editorial-card rounded-sm p-4">
              <div className="grid gap-3 text-sm text-editorial-text-subtle">
                <MetaRow icon={Clock} label={`${readingTime} min read`} />
                <MetaRow icon={Eye} label={`${briefing.views_count} reads`} />
                <MetaRow icon={ShieldCheck} label={`Source quality ${briefing.source_quality_score}%`} />
              </div>
              <div className="mt-4 flex flex-wrap gap-2 border-t border-editorial-border pt-4">
                {briefing.tags.map((tag) => (
                  <span key={tag} className="rounded-sm bg-editorial-muted px-2 py-1 text-xs font-semibold text-editorial-text-subtle">
                    {tag}
                  </span>
                ))}
              </div>
            </aside>
          </header>

          <div className="mt-8 overflow-hidden rounded-sm border border-editorial-border bg-editorial-card">
            {briefing.image_url && !isImageBroken ? (
              <div className="aspect-[16/9] md:aspect-[21/9]">
                <ImageWithFallback
                  src={briefing.image_url}
                  alt={briefing.title}
                  className="h-full w-full object-cover"
                  onFallbackTriggered={() => setIsImageBroken(true)}
                />
              </div>
            ) : (
              <div className="tone-grid flex aspect-[16/9] items-end p-6 md:aspect-[21/9]">
                <span className="serif-title text-7xl font-black text-editorial-accent md:text-9xl">TON</span>
              </div>
            )}
          </div>

          <div className="mt-8 grid gap-8 lg:grid-cols-[minmax(0,720px)_260px] lg:items-start">
            <div className="article-prose text-[17px] leading-8 text-foreground">
              {paragraphs.map((paragraph, index) => (
                <p key={index}>{paragraph}</p>
              ))}

              {briefing.key_takeaways && briefing.key_takeaways.length > 0 && (
                <section className="my-8 rounded-sm border border-editorial-border bg-editorial-card p-5">
                  <h2 className="text-sm font-extrabold uppercase text-editorial-text-subtle">Key Takeaways</h2>
                  <ol className="mt-4 grid gap-3">
                    {briefing.key_takeaways.map((takeaway, index) => (
                      <li key={takeaway} className="grid grid-cols-[34px_1fr] gap-3 text-base leading-relaxed">
                        <span className="serif-title text-2xl font-black text-editorial-accent">{index + 1}</span>
                        <span>{takeaway}</span>
                      </li>
                    ))}
                  </ol>
                </section>
              )}

              <section className="my-8 border-y border-editorial-border py-6">
                <p className="text-sm font-extrabold uppercase text-editorial-text-subtle">Why it matters</p>
                <blockquote className="serif-title mt-2 text-2xl font-bold leading-snug">
                  {briefing.why_it_matters}
                </blockquote>
              </section>

              <EmbeddedReferences briefing={briefing} />
            </div>

            <aside className="grid gap-4 lg:sticky lg:top-24">
              {briefing.source_url && (
                <a
                  href={`/api/redirect?id=${briefing.id}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => triggerHaptic('light')}
                  className="editorial-card flex items-center justify-between rounded-sm p-4 text-sm font-bold hover:border-editorial-border-hover"
                >
                  <span>Read original source</span>
                  <ExternalLink className="h-4 w-4 text-editorial-accent" />
                </a>
              )}

              <div className="editorial-card rounded-sm p-4">
                <h2 className="text-sm font-extrabold uppercase text-editorial-text-subtle">Protocol References</h2>
                <div className="mt-3 grid gap-2">
                  {(briefing.related_protocols || []).length > 0 ? (
                    briefing.related_protocols?.map((protocol) => (
                      <a key={protocol.name} href={protocol.url} className="rounded-sm border border-editorial-border px-3 py-2 text-sm font-semibold hover:border-editorial-border-hover">
                        {protocol.name}
                      </a>
                    ))
                  ) : (
                    briefing.tags.slice(0, 4).map((tag) => (
                      <span key={tag} className="rounded-sm border border-editorial-border px-3 py-2 text-sm font-semibold">
                        {tag}
                      </span>
                    ))
                  )}
                </div>
              </div>
            </aside>
          </div>

          <nav className="mt-10 grid gap-3 border-t border-editorial-border pt-6 md:grid-cols-2">
            <AdjacentLink direction="Previous" briefing={adjacent.prev} icon={ChevronLeft} />
            <AdjacentLink direction="Next" briefing={adjacent.next} icon={ChevronRight} alignRight />
          </nav>
        </article>
      </main>
    </div>
  );
}

function MetaRow({ icon: Icon, label }: { icon: React.ComponentType<{ className?: string }>; label: string }) {
  return (
    <div className="flex items-center gap-2">
      <Icon className="h-4 w-4 text-editorial-accent" />
      <span>{label}</span>
    </div>
  );
}

function EmbeddedReferences({ briefing }: { briefing: Briefing }) {
  const isTelegram = briefing.source_url?.includes('t.me/');
  const isX = briefing.discussion_url?.includes('x.com') || briefing.discussion_url?.includes('twitter.com');

  return (
    <section className="my-8 grid gap-3">
      <h2 className="text-sm font-extrabold uppercase text-editorial-text-subtle">Ecosystem References</h2>
      {briefing.video_url && (
        <a href={briefing.video_url} target="_blank" rel="noopener noreferrer" className="editorial-card flex items-center gap-3 rounded-sm p-4 text-sm font-bold">
          <PlayCircle className="h-5 w-5 text-editorial-accent" />
          Related video
        </a>
      )}
      {isTelegram && (
        <a href={briefing.source_url} target="_blank" rel="noopener noreferrer" className="editorial-card flex items-center gap-3 rounded-sm p-4 text-sm font-bold">
          <MessageCircle className="h-5 w-5 text-editorial-accent" />
          Telegram source post
        </a>
      )}
      {isX && briefing.discussion_url && (
        <a href={briefing.discussion_url} target="_blank" rel="noopener noreferrer" className="editorial-card flex items-center gap-3 rounded-sm p-4 text-sm font-bold">
          <LinkIcon className="h-5 w-5 text-editorial-accent" />
          Public discussion
        </a>
      )}
      {!briefing.video_url && !isTelegram && !isX && (
        <p className="rounded-sm border border-editorial-border bg-editorial-muted p-4 text-sm text-editorial-text-subtle">
          No official embedded media is attached to this briefing yet.
        </p>
      )}
    </section>
  );
}

function AdjacentLink({
  direction,
  briefing,
  icon: Icon,
  alignRight = false,
}: {
  direction: string;
  briefing: Briefing | null;
  icon: React.ComponentType<{ className?: string }>;
  alignRight?: boolean;
}) {
  if (!briefing) return <div />;

  return (
    <a
      href={`/briefing/${briefing.slug}`}
      className={`rounded-sm border border-editorial-border p-4 hover:border-editorial-border-hover ${alignRight ? 'text-right' : ''}`}
    >
      <div className={`flex items-center gap-2 text-xs font-extrabold uppercase text-editorial-text-subtle ${alignRight ? 'justify-end' : ''}`}>
        {!alignRight && <Icon className="h-4 w-4" />}
        {direction}
        {alignRight && <Icon className="h-4 w-4" />}
      </div>
      <p className="serif-title mt-2 line-clamp-2 text-xl font-black leading-tight">{briefing.title}</p>
    </a>
  );
}

function formatDate(isoString: string): string {
  try {
    return new Date(isoString).toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    });
  } catch {
    return 'Recently';
  }
}

function getHost(url?: string): string {
  if (!url) return '';
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return '';
  }
}
