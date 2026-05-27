'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { useTelegram } from '@/hooks/useTelegram';
import type { Briefing } from '@/types';
import { Bookmark, Clock, Eye, ShieldCheck } from 'lucide-react';
import ImageWithFallback from './ImageWithFallback';

interface BriefingCardProps {
  briefing: Briefing;
  compact?: boolean;
}

export default function BriefingCard({ briefing, compact = false }: BriefingCardProps) {
  const router = useRouter();
  const { triggerHaptic } = useTelegram();
  const [isImageBroken, setIsImageBroken] = React.useState(false);

  const href = `/briefing/${briefing.slug}`;
  const trustLabel = getTrustLabel(briefing);
  const sourceHost = getHost(briefing.source_url);

  const handleCardClick = () => {
    triggerHaptic('light');
    router.push(href);
  };

  return (
    <article
      onClick={handleCardClick}
      className="group grid cursor-pointer gap-4 rounded-sm border border-editorial-border bg-editorial-card p-3 transition-colors hover:border-editorial-border-hover sm:grid-cols-[190px_minmax(0,1fr)] sm:p-4"
    >
      {briefing.image_url && !isImageBroken ? (
        <div className="relative aspect-[16/10] overflow-hidden rounded-sm bg-editorial-muted sm:aspect-[4/3]">
          <ImageWithFallback
            src={briefing.image_url}
            alt={briefing.title}
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.02]"
            onFallbackTriggered={() => setIsImageBroken(true)}
          />
        </div>
      ) : (
        <div className="tone-grid flex aspect-[16/10] items-end rounded-sm border border-editorial-border bg-editorial-muted p-3 sm:aspect-[4/3]">
          <span className="serif-title text-4xl font-black text-editorial-accent">{briefing.category.slice(0, 1)}</span>
        </div>
      )}

      <div className="flex min-w-0 flex-col gap-3">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs font-semibold text-editorial-text-subtle">
          <span className="font-extrabold text-editorial-accent">{briefing.category}</span>
          <span>{briefing.source_name || sourceHost || 'Verified source'}</span>
          <span>{getRelativeTime(briefing.published_at)}</span>
          <span className="flex items-center gap-1"><Clock className="h-3.5 w-3.5" /> {getReadingTime(briefing)} min read</span>
        </div>

        <h2 className={compact ? 'serif-title text-lg font-black leading-tight text-foreground group-hover:text-editorial-accent' : 'serif-title text-xl font-black leading-tight text-foreground group-hover:text-editorial-accent md:text-2xl'}>
          {briefing.title}
        </h2>

        <p className="line-clamp-2 text-sm leading-relaxed text-editorial-text-subtle md:text-[15px]">
          {briefing.briefing}
        </p>

        <div className="border-l-2 border-editorial-border pl-3">
          <p className="text-xs font-extrabold text-editorial-text-subtle">Why it matters</p>
          <p className="line-clamp-2 text-sm font-semibold leading-relaxed text-foreground">
            {briefing.why_it_matters}
          </p>
        </div>

        <div className="mt-auto flex flex-wrap items-center justify-between gap-3 border-t border-editorial-border pt-3 text-xs text-editorial-text-subtle">
          <div className="flex flex-wrap gap-2">
            {briefing.tags.slice(0, 4).map((tag) => (
              <span key={tag} className="rounded-sm bg-editorial-muted px-2 py-1 font-semibold">
                {tag}
              </span>
            ))}
          </div>

          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1" title={trustLabel}>
              <ShieldCheck className="h-3.5 w-3.5 text-editorial-accent" />
              {trustLabel}
            </span>
            <span className="flex items-center gap-1"><Eye className="h-3.5 w-3.5" /> {briefing.views_count}</span>
            <button
              type="button"
              onClick={(event) => event.stopPropagation()}
              className="rounded-sm border border-editorial-border p-1.5 hover:border-editorial-border-hover hover:text-foreground"
              aria-label="Save story"
            >
              <Bookmark className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </div>
    </article>
  );
}

export function getRelativeTime(isoString: string): string {
  try {
    const past = new Date(isoString).getTime();
    const diffMs = Date.now() - past;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays === 1) return 'Yesterday';
    return `${diffDays}d ago`;
  } catch {
    return 'Recent';
  }
}

export function getReadingTime(briefing: Briefing): number {
  const words = `${briefing.title} ${briefing.briefing} ${briefing.why_it_matters} ${(briefing.key_takeaways || []).join(' ')}`.split(/\s+/).length;
  return Math.max(1, Math.ceil(words / 220));
}

function getTrustLabel(briefing: Briefing): string {
  const score = Math.round((briefing.confidence_score + briefing.source_quality_score) / 2);
  if (score >= 95) return 'High trust';
  if (score >= 85) return 'Verified';
  return 'Review noted';
}

function getHost(url?: string): string {
  if (!url) return '';
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return '';
  }
}
