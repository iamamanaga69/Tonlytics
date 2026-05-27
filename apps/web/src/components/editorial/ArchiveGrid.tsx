import Link from 'next/link';
import type { ComponentType } from 'react';
import { ArrowUpRight, Eye, ShieldCheck, TrendingUp } from 'lucide-react';
import ImageWithFallback from '@/components/terminal/ImageWithFallback';
import type { Briefing } from '@/types';
import { getCredibilityLabel, getReadingTime, getRelativeTime, scoreBriefing } from '@/lib/editorial-utils';

export function ArchiveHero({
  eyebrow,
  title,
  description,
  lead,
}: {
  eyebrow: string;
  title: string;
  description: string;
  lead?: Briefing;
}) {
  return (
    <header className="border-b border-editorial-border bg-editorial-card/70">
      <div className="mx-auto grid max-w-7xl gap-6 px-4 py-8 md:px-6 lg:grid-cols-[minmax(0,1fr)_360px] lg:items-end lg:px-8">
        <div>
          <Link href="/" className="text-sm font-black text-editorial-accent">Tonlytics</Link>
          <p className="mt-6 text-xs font-black uppercase tracking-[0.18em] text-editorial-accent">{eyebrow}</p>
          <h1 className="serif-title mt-3 max-w-4xl text-4xl font-black leading-[1.02] md:text-6xl">{title}</h1>
          <p className="mt-5 max-w-2xl text-lg leading-8 text-editorial-text-subtle">{description}</p>
        </div>
        {lead && (
          <Link href={`/briefing/${lead.slug}`} className="group rounded-lg border border-editorial-border bg-editorial-card p-4 shadow-sm transition hover:border-editorial-accent/40">
            <p className="text-xs font-black uppercase tracking-[0.16em] text-editorial-accent">Lead story</p>
            <h2 className="serif-title mt-2 text-2xl font-black leading-tight group-hover:text-editorial-accent">{lead.title}</h2>
            <p className="mt-3 line-clamp-3 text-sm leading-6 text-editorial-text-subtle">{lead.why_it_matters}</p>
          </Link>
        )}
      </div>
    </header>
  );
}

export function ArchiveGrid({ briefings }: { briefings: Briefing[] }) {
  if (!briefings.length) {
    return (
      <div className="rounded-lg border border-editorial-border bg-editorial-card p-8 text-center shadow-sm">
        <h2 className="serif-title text-3xl font-black">No live stories yet</h2>
        <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-editorial-text-subtle">
          This section will populate as ingestion publishes verified TON ecosystem coverage.
        </p>
      </div>
    );
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      {briefings.map((briefing) => (
        <Link
          key={briefing.id}
          href={`/briefing/${briefing.slug}`}
          className="group grid overflow-hidden rounded-lg border border-editorial-border bg-editorial-card shadow-sm transition hover:-translate-y-0.5 hover:border-editorial-accent/40 hover:shadow-md"
        >
          <div className="relative aspect-[16/10] overflow-hidden bg-editorial-muted">
            {briefing.image_url ? (
              <ImageWithFallback
                src={briefing.image_url}
                alt={briefing.title}
                fallbackLabel={briefing.category}
                className="h-full w-full object-cover transition duration-700 group-hover:scale-[1.03]"
              />
            ) : (
              <div className="tone-grid flex h-full items-end p-4">
                <span className="serif-title text-5xl font-black text-editorial-accent">{briefing.category.slice(0, 3)}</span>
              </div>
            )}
          </div>
          <div className="grid gap-3 p-5">
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs font-bold text-editorial-text-subtle">
              <span className="font-black uppercase tracking-[0.14em] text-editorial-accent">{briefing.category}</span>
              <span>{getRelativeTime(briefing.published_at)}</span>
              <span>{getReadingTime(briefing)} min read</span>
            </div>
            <h2 className="serif-title text-2xl font-black leading-tight group-hover:text-editorial-accent">{briefing.title}</h2>
            <p className="line-clamp-3 text-sm leading-6 text-editorial-text-subtle">{briefing.why_it_matters}</p>
            <div className="mt-2 flex items-center justify-between border-t border-editorial-border pt-3 text-xs font-bold text-editorial-text-subtle">
              <span className="flex items-center gap-1"><ShieldCheck className="h-3.5 w-3.5" /> {getCredibilityLabel(briefing)}</span>
              <span className="flex items-center gap-1"><ArrowUpRight className="h-3.5 w-3.5" /> Open</span>
            </div>
          </div>
        </Link>
      ))}
    </div>
  );
}

export function SignalStats({ briefings }: { briefings: Briefing[] }) {
  const totalReads = briefings.reduce((sum, briefing) => sum + (briefing.views_count || 0), 0);
  const medianTrust = briefings.length
    ? Math.round(
        briefings.reduce((sum, briefing) => sum + ((briefing.confidence_score || 0) + (briefing.source_quality_score || 0)) / 2, 0) /
          briefings.length
      )
    : 0;
  const topScore = briefings.length ? Math.max(...briefings.map(scoreBriefing)) : 0;

  return (
    <div className="grid gap-4 md:grid-cols-3">
      <Stat icon={TrendingUp} label="Top signal" value={topScore.toString()} />
      <Stat icon={ShieldCheck} label="Median trust" value={`${medianTrust}%`} />
      <Stat icon={Eye} label="Total reads" value={totalReads.toLocaleString()} />
    </div>
  );
}

function Stat({
  icon: Icon,
  label,
  value,
}: {
  icon: ComponentType<{ className?: string }>;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-lg border border-editorial-border bg-editorial-card p-4 shadow-sm">
      <Icon className="h-4 w-4 text-editorial-accent" />
      <p className="mt-2 text-[10px] font-black uppercase tracking-[0.16em] text-editorial-text-subtle">{label}</p>
      <p className="mt-1 text-3xl font-black">{value}</p>
    </div>
  );
}
