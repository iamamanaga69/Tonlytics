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
      <div className="flex min-h-screen items-center justify-center bg-[#060B14] px-6 text-center">
        <div>
          <div className="mx-auto h-10 w-10 animate-spin rounded-full border border-[#ffffff]/10 border-t-[#0098EA]" />
          <p className="mt-4 text-sm font-bold text-[#AAB3C5]">Loading story</p>
        </div>
      </div>
    );
  }

  if (!briefing) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#060B14] px-6 text-center">
        <div className="max-w-sm">
          <h1 className="serif-title text-3xl font-black text-[#F5F7FA]">Story not found</h1>
          <p className="mt-2 text-sm text-[#AAB3C5]">This briefing may have been unpublished or moved.</p>
          <button
            onClick={() => router.push('/')}
            className="mt-5 rounded-xl border border-editorial-border bg-[#111827]/40 px-4 py-2 text-sm font-bold text-[#F5F7FA] hover:border-[#0098EA]/40 hover:bg-[#0098EA]/10 transition-all duration-300 cursor-pointer"
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
    <div className="min-h-screen bg-editorial-bg text-[#F5F7FA]">
      <div className="fixed left-0 top-0 z-50 h-1 bg-gradient-to-r from-[#0098EA] to-[#38BDF8] shadow-[0_0_8px_rgba(0,152,234,0.6)] transition-all" style={{ width: `${progress}%` }} />

      <nav className="sticky top-0 z-40 border-b border-[#ffffff]/10 bg-[#060B14]/85 backdrop-blur-md shadow-[0_4px_30px_rgba(0,0,0,0.4)]">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3 md:px-6">
          <button
            onClick={() => {
              triggerHaptic('light');
              router.push('/');
            }}
            className="flex items-center gap-2 text-sm font-bold text-[#AAB3C5] hover:text-[#0098EA] transition-colors cursor-pointer"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Back to Tonlytics</span>
          </button>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsSaved((saved) => !saved)}
              className="flex h-9 w-9 items-center justify-center rounded-lg border border-editorial-border bg-[#111827]/60 hover:border-[#0098EA]/60 hover:text-[#F5F7FA] transition-all duration-300 cursor-pointer"
              aria-label="Save story"
            >
              <Bookmark className={`h-4 w-4 ${isSaved ? 'fill-[#0098EA] text-[#0098EA]' : 'text-[#AAB3C5]'}`} />
            </button>
            <button
              onClick={handleShare}
              className="relative flex h-9 w-9 items-center justify-center rounded-lg border border-editorial-border bg-[#111827]/60 text-[#AAB3C5] hover:border-[#0098EA]/60 hover:text-[#F5F7FA] transition-all duration-300 cursor-pointer"
              aria-label="Share story"
            >
              <Share2 className="h-4 w-4 text-[#AAB3C5]" />
              <AnimatePresence>
                {isCopied && (
                  <motion.span
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    className="absolute right-0 top-11 rounded-lg border border-[#ffffff]/10 bg-[#111827] px-2 py-1 text-xs font-bold text-[#0098EA] shadow-xl"
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
              <div className="flex flex-wrap items-center gap-3 text-xs font-semibold text-[#7D8597]">
                <span className="font-extrabold uppercase tracking-wider text-[#0098EA]">{briefing.category}</span>
                <span>{briefing.source_name || sourceHost || 'Verified source'}</span>
                <span className="flex items-center gap-1"><Calendar className="h-3.5 w-3.5" /> {formatDate(briefing.published_at)}</span>
              </div>
              <h1 className="serif-title mt-4 max-w-4xl text-4xl font-black leading-none text-[#F5F7FA] md:text-5xl lg:text-6xl">
                {briefing.title}
              </h1>
              <p className="mt-5 max-w-3xl text-lg leading-relaxed text-[#CBD5E1] md:text-xl">
                {briefing.why_it_matters}
              </p>
            </div>

            <aside className="editorial-card rounded-2xl p-5 bg-[#111827]/40">
              <div className="grid gap-3 text-sm text-[#AAB3C5]">
                <MetaRow icon={Clock} label={`${readingTime} min read`} />
                <MetaRow icon={Eye} label={`${briefing.views_count} reads`} />
                <MetaRow icon={ShieldCheck} label={`Source quality ${briefing.source_quality_score}%`} />
              </div>
              <div className="mt-4 flex flex-wrap gap-2 border-t border-[#ffffff]/10 pt-4">
                {briefing.tags.map((tag) => (
                  <span key={tag} className="rounded-lg border border-[#ffffff]/08 bg-[#111827]/40 px-2.5 py-1 text-[10px] font-semibold text-[#AAB3C5]">
                    {tag}
                  </span>
                ))}
              </div>
            </aside>
          </header>

          <div className="mt-8 overflow-hidden rounded-2xl border border-[#ffffff]/10 bg-[#111827]/40 shadow-[0_15px_40px_rgba(0,0,0,0.6)]">
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
            <div className="article-prose text-[17px] leading-8 text-[#CBD5E1]">
              {paragraphs.map((paragraph, index) => (
                <p key={index}>{paragraph}</p>
              ))}

              {briefing.key_takeaways && briefing.key_takeaways.length > 0 && (
                <section className="my-8 rounded-2xl border border-[#ffffff]/10 bg-[#111827]/30 p-5 md:p-6 shadow-md">
                  <h2 className="text-xs font-extrabold uppercase tracking-wider text-[#7D8597]">Key Takeaways</h2>
                  <ol className="mt-4 grid gap-3">
                    {briefing.key_takeaways.map((takeaway, index) => (
                      <li key={takeaway} className="grid grid-cols-[34px_1fr] gap-3 text-base leading-relaxed">
                        <span className="serif-title text-2xl font-black text-[#0098EA]">{index + 1}</span>
                        <span>{takeaway}</span>
                      </li>
                    ))}
                  </ol>
                </section>
              )}

              <section className="my-8 border-y border-[#ffffff]/10 bg-[#0098EA]/05 rounded-xl px-5 py-6">
                <p className="text-xs font-extrabold uppercase tracking-wider text-[#7D8597]">Why it matters</p>
                <blockquote className="serif-title mt-2 text-2xl font-bold leading-snug text-[#F5F7FA]">
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
                  className="editorial-card editorial-card-hover flex items-center justify-between rounded-xl p-4 text-sm font-bold bg-[#111827]/40 hover:border-[#0098EA]/40 text-[#F5F7FA]"
                >
                  <span>Read original source</span>
                  <ExternalLink className="h-4 w-4 text-[#0098EA]" />
                </a>
              )}

              <div className="editorial-card rounded-2xl p-5 bg-[#111827]/40">
                <h2 className="text-xs font-extrabold uppercase tracking-wider text-[#7D8597]">Protocol References</h2>
                <div className="mt-3 grid gap-2">
                  {(briefing.related_protocols || []).length > 0 ? (
                    briefing.related_protocols?.map((protocol) => (
                      <a key={protocol.name} href={protocol.url} className="rounded-lg border border-[#ffffff]/08 bg-[#111827]/40 px-3 py-2 text-sm font-semibold text-[#AAB3C5] hover:border-[#0098EA]/40 hover:text-[#F5F7FA] transition-all">
                        {protocol.name}
                      </a>
                    ))
                  ) : (
                    briefing.tags.slice(0, 4).map((tag) => (
                      <span key={tag} className="rounded-lg border border-[#ffffff]/08 bg-[#111827]/40 px-3 py-2 text-sm font-semibold text-[#AAB3C5]">
                        {tag}
                      </span>
                    ))
                  )}
                </div>
              </div>
            </aside>
          </div>

          <nav className="mt-10 grid gap-3 border-t border-[#ffffff]/10 pt-6 md:grid-cols-2">
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
      <Icon className="h-4 w-4 text-[#0098EA]" />
      <span>{label}</span>
    </div>
  );
}

function EmbeddedReferences({ briefing }: { briefing: Briefing }) {
  const isTelegram = briefing.source_url?.includes('t.me/');
  const isX = briefing.discussion_url?.includes('x.com') || briefing.discussion_url?.includes('twitter.com');

  return (
    <section className="my-8 grid gap-3">
      <h2 className="text-xs font-extrabold uppercase tracking-wider text-[#7D8597]">Ecosystem References</h2>
      {briefing.video_url && (
        <a href={briefing.video_url} target="_blank" rel="noopener noreferrer" className="editorial-card editorial-card-hover flex items-center gap-3 rounded-xl p-4 text-sm font-bold bg-[#111827]/40 hover:border-[#0098EA]/40 text-[#F5F7FA]">
          <PlayCircle className="h-5 w-5 text-[#0098EA]" />
          Related video
        </a>
      )}
      {isTelegram && (
        <a href={briefing.source_url} target="_blank" rel="noopener noreferrer" className="editorial-card editorial-card-hover flex items-center gap-3 rounded-xl p-4 text-sm font-bold bg-[#111827]/40 hover:border-[#0098EA]/40 text-[#F5F7FA]">
          <MessageCircle className="h-5 w-5 text-[#0098EA]" />
          Telegram source post
        </a>
      )}
      {isX && briefing.discussion_url && (
        <a href={briefing.discussion_url} target="_blank" rel="noopener noreferrer" className="editorial-card editorial-card-hover flex items-center gap-3 rounded-xl p-4 text-sm font-bold bg-[#111827]/40 hover:border-[#0098EA]/40 text-[#F5F7FA]">
          <LinkIcon className="h-5 w-5 text-[#0098EA]" />
          Public discussion
        </a>
      )}
      {!briefing.video_url && !isTelegram && !isX && (
        <p className="rounded-xl border border-[#ffffff]/08 bg-[#111827]/30 p-4 text-sm text-[#AAB3C5]">
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
      className={`editorial-card editorial-card-hover p-4 bg-[#111827]/40 hover:border-[#0098EA]/40 ${alignRight ? 'text-right' : ''}`}
    >
      <div className={`flex items-center gap-2 text-xs font-extrabold uppercase text-[#7D8597] ${alignRight ? 'justify-end' : ''}`}>
        {!alignRight && <Icon className="h-4 w-4 text-[#0098EA]" />}
        {direction}
        {alignRight && <Icon className="h-4 w-4 text-[#0098EA]" />}
      </div>
      <p className="serif-title mt-2 line-clamp-2 text-xl font-black leading-tight text-[#F5F7FA]">{briefing.title}</p>
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
