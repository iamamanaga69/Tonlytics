import Link from 'next/link';
import type { ComponentType } from 'react';
import { ArrowLeft, ArrowUpRight, Eye, Flame, ShieldCheck, TrendingUp } from 'lucide-react';
import { dbService } from 'database';
import type { Briefing } from '@/types';

function scoreBriefing(briefing: Briefing): number {
  const publishedAt = new Date(briefing.published_at).getTime();
  const ageHours = Math.max(1, (Date.now() - publishedAt) / 3_600_000);
  const recencyBoost = Math.max(0, 80 - ageHours);
  const engagement = Math.log10((briefing.views_count || 0) + 10) * 18;
  const trust = ((briefing.confidence_score || 0) + (briefing.source_quality_score || 0)) / 8;
  const relevance = (briefing.relevance_score || 0) / 4;
  return Math.round(recencyBoost + engagement + trust + relevance);
}

export default async function TrendingPage() {
  const briefings = await dbService.getBriefings();
  const trending = [...briefings]
    .sort((a, b) => scoreBriefing(b) - scoreBriefing(a))
    .slice(0, 24);
  const lead = trending[0];
  const rest = trending.slice(1);

  return (
    <main className="min-h-screen bg-editorial-bg text-foreground">
      <header className="border-b border-[#ffffff]/10 bg-[#060B14]/85 backdrop-blur-md">
        <div className="mx-auto flex max-w-7xl flex-col gap-5 px-4 py-6 md:px-6 lg:px-8">
          <Link href="/" className="flex w-fit items-center gap-2 text-sm font-bold text-[#AAB3C5] hover:text-[#F5F7FA]">
            <ArrowLeft className="h-4 w-4" />
            Back to Tonlytics
          </Link>
          <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_330px] lg:items-end">
            <div>
              <p className="flex items-center gap-2 text-xs font-extrabold uppercase tracking-wider text-[#0098EA]">
                <Flame className="h-4 w-4" />
                Trending in TON
              </p>
              <h1 className="serif-title mt-2 max-w-4xl text-4xl font-black leading-none text-[#F5F7FA] md:text-6xl">
                Stories gaining the most ecosystem attention
              </h1>
            </div>
            <p className="text-sm leading-relaxed text-[#AAB3C5]">
              Ranked by recency, source quality, relevance, and reader activity. This page is separate from the live feed so trending coverage has its own editorial surface.
            </p>
          </div>
        </div>
      </header>

      <section className="mx-auto grid max-w-7xl gap-6 px-4 py-8 md:px-6 lg:px-8">
        {lead && (
          <Link href={`/briefing/${lead.slug}`} className="group editorial-card grid overflow-hidden rounded-2xl lg:grid-cols-[minmax(0,1fr)_360px]">
            <div className="p-6 md:p-8">
              <div className="flex flex-wrap items-center gap-3 text-xs font-bold text-[#AAB3C5]">
                <span className="rounded-full bg-[#0098EA]/10 px-3 py-1 text-[#38BDF8]">Top Trend</span>
                <span>{lead.category}</span>
                <span>{lead.source_name || 'Verified source'}</span>
              </div>
              <h2 className="serif-title mt-4 text-3xl font-black leading-tight text-[#F5F7FA] group-hover:text-[#0098EA] md:text-5xl">
                {lead.title}
              </h2>
              <p className="mt-4 max-w-3xl text-base leading-relaxed text-[#CBD5E1]">{lead.briefing}</p>
              <div className="mt-6 grid gap-3 sm:grid-cols-3">
                <TrendStat icon={TrendingUp} label="Trend Score" value={scoreBriefing(lead).toString()} />
                <TrendStat icon={Eye} label="Reads" value={(lead.views_count || 0).toLocaleString()} />
                <TrendStat icon={ShieldCheck} label="Source Quality" value={`${lead.source_quality_score || 0}%`} />
              </div>
            </div>
            <div className="tone-grid flex min-h-[260px] items-end border-t border-[#ffffff]/10 bg-[#111827]/45 p-6 lg:border-l lg:border-t-0">
              <span className="serif-title text-8xl font-black text-[#0098EA]">TON</span>
            </div>
          </Link>
        )}

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {rest.map((briefing, index) => (
            <Link
              key={briefing.id}
              href={`/briefing/${briefing.slug}`}
              className="group editorial-card flex min-h-[260px] flex-col rounded-2xl p-5 hover:border-[#0098EA]/35"
            >
              <div className="flex items-center justify-between gap-3 text-xs font-bold text-[#7D8597]">
                <span>#{index + 2}</span>
                <span>{briefing.category}</span>
              </div>
              <h3 className="serif-title mt-4 text-2xl font-black leading-tight text-[#F5F7FA] group-hover:text-[#0098EA]">
                {briefing.title}
              </h3>
              <p className="mt-3 line-clamp-3 text-sm leading-relaxed text-[#AAB3C5]">{briefing.why_it_matters}</p>
              <div className="mt-auto flex items-center justify-between border-t border-[#ffffff]/10 pt-4 text-xs font-semibold text-[#7D8597]">
                <span>{scoreBriefing(briefing)} score</span>
                <span className="flex items-center gap-1 text-[#38BDF8]">
                  Open
                  <ArrowUpRight className="h-3.5 w-3.5" />
                </span>
              </div>
            </Link>
          ))}
        </div>
      </section>
    </main>
  );
}

function TrendStat({
  icon: Icon,
  label,
  value,
}: {
  icon: ComponentType<{ className?: string }>;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-xl border border-[#ffffff]/10 bg-[#060B14]/45 p-4">
      <Icon className="h-4 w-4 text-[#0098EA]" />
      <p className="mt-2 text-[10px] font-extrabold uppercase tracking-wider text-[#7D8597]">{label}</p>
      <p className="mt-1 text-2xl font-black text-[#F5F7FA]">{value}</p>
    </div>
  );
}
