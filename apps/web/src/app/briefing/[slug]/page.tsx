import type { Metadata } from 'next';
import type { ComponentType } from 'react';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Calendar, Clock, ExternalLink, Eye, ShieldCheck } from 'lucide-react';
import ImageWithFallback from '@/components/terminal/ImageWithFallback';
import ArticleControls, { ArticleViewBeacon } from '@/components/editorial/ArticleControls';
import { dbService } from 'database';
import type { Briefing } from '@/types';
import {
  formatShortDate,
  getCredibilityLabel,
  getReadingTime,
  getSourceHost,
  matchesSignal,
  scoreBriefing,
} from '@/lib/editorial-utils';

export const revalidate = 60;

type Props = {
  params: Promise<{ slug: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const briefing = await dbService.getBriefingBySlug(slug);

  if (!briefing) {
    return {
      title: 'Story not found',
    };
  }

  return {
    title: briefing.title,
    description: briefing.why_it_matters || briefing.briefing,
    alternates: {
      canonical: `/briefing/${briefing.slug}`,
    },
    openGraph: {
      title: briefing.title,
      description: briefing.why_it_matters || briefing.briefing,
      type: 'article',
      publishedTime: briefing.published_at,
      section: briefing.category,
      tags: briefing.tags,
      images: briefing.image_url ? [briefing.image_url] : ['/images/tonlytics_logo.png'],
    },
    twitter: {
      card: 'summary_large_image',
      title: briefing.title,
      description: briefing.why_it_matters || briefing.briefing,
      images: briefing.image_url ? [briefing.image_url] : ['/images/tonlytics_logo.png'],
    },
  };
}

export default async function ArticleDetail({ params }: Props) {
  const { slug } = await params;
  const [briefing, allBriefings] = await Promise.all([
    dbService.getBriefingBySlug(slug),
    dbService.getBriefings(),
  ]);

  if (!briefing) notFound();

  const sourceHost = getSourceHost(briefing.source_url);
  const related = getRelatedBriefings(briefing, allBriefings).slice(0, 4);
  const paragraphs = briefing.briefing.split('\n\n').filter(Boolean);
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'NewsArticle',
    headline: briefing.title,
    description: briefing.why_it_matters || briefing.briefing,
    datePublished: briefing.published_at,
    dateModified: briefing.created_at,
    author: {
      '@type': 'Organization',
      name: 'Tonlytics',
    },
    publisher: {
      '@type': 'Organization',
      name: 'Tonlytics',
      logo: {
        '@type': 'ImageObject',
        url: 'https://tonlytics.xyz/images/tonlytics_logo.png',
      },
    },
    articleSection: briefing.category,
    keywords: briefing.tags.join(', '),
    image: briefing.image_url || 'https://tonlytics.xyz/images/tonlytics_logo.png',
    mainEntityOfPage: `https://tonlytics.xyz/briefing/${briefing.slug}`,
  };

  return (
    <div className="min-h-screen bg-editorial-bg text-foreground">
      <ArticleControls briefingId={briefing.id} />
      <ArticleViewBeacon briefingId={briefing.id} />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <main className="mx-auto max-w-6xl px-4 py-8 md:px-6 md:py-12">
        <article>
          <header className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_310px] lg:items-end">
            <div>
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs font-bold text-editorial-text-subtle">
                <span className="font-black uppercase tracking-[0.16em] text-editorial-accent">{briefing.category}</span>
                <span>{briefing.source_name || sourceHost || 'Verified source'}</span>
                <span className="flex items-center gap-1"><Calendar className="h-3.5 w-3.5" /> {formatShortDate(briefing.published_at)}</span>
              </div>
              <h1 className="serif-title mt-4 max-w-4xl text-4xl font-black leading-[1.02] md:text-6xl">
                {briefing.title}
              </h1>
              <p className="mt-5 max-w-3xl text-xl leading-8 text-editorial-text md:text-2xl md:leading-9">
                {briefing.why_it_matters}
              </p>
            </div>

            <aside className="rounded-lg border border-editorial-border bg-editorial-card p-5 shadow-sm">
              <div className="grid gap-3 text-sm font-semibold text-editorial-text-subtle">
                <MetaRow icon={Clock} label={`${getReadingTime(briefing)} min read`} />
                <MetaRow icon={Eye} label={`${(briefing.views_count || 0).toLocaleString()} reads`} />
                <MetaRow icon={ShieldCheck} label={getCredibilityLabel(briefing)} />
              </div>
              <div className="mt-4 flex flex-wrap gap-2 border-t border-editorial-border pt-4">
                {briefing.tags.map((tag) => (
                  <span key={tag} className="rounded-md bg-editorial-muted px-2.5 py-1 text-[11px] font-bold text-editorial-text-subtle">
                    {tag}
                  </span>
                ))}
              </div>
            </aside>
          </header>

          <div className="mt-8 overflow-hidden rounded-lg border border-editorial-border bg-editorial-card shadow-sm">
            {briefing.image_url ? (
              <div className="aspect-[16/9] md:aspect-[21/9]">
                <ImageWithFallback
                  src={briefing.image_url}
                  alt={briefing.title}
                  fallbackLabel={briefing.category}
                  className="h-full w-full object-cover"
                />
              </div>
            ) : (
              <div className="tone-grid flex aspect-[16/9] items-end p-6 md:aspect-[21/9]">
                <span className="serif-title text-7xl font-black text-editorial-accent md:text-9xl">TON</span>
              </div>
            )}
          </div>

          <div className="mt-9 grid gap-8 lg:grid-cols-[minmax(0,720px)_280px] lg:items-start">
            <div className="article-prose text-[18px] leading-9 text-editorial-text">
              {paragraphs.map((paragraph) => (
                <p key={paragraph}>{paragraph}</p>
              ))}

              {briefing.key_takeaways && briefing.key_takeaways.length > 0 && (
                <section className="my-9 rounded-lg border border-editorial-border bg-editorial-card p-5 shadow-sm md:p-6">
                  <h2 className="text-xs font-black uppercase tracking-[0.16em] text-editorial-text-subtle">Key Takeaways</h2>
                  <ol className="mt-4 grid gap-4">
                    {briefing.key_takeaways.map((takeaway, index) => (
                      <li key={takeaway} className="grid grid-cols-[34px_1fr] gap-3">
                        <span className="serif-title text-2xl font-black text-editorial-accent">{index + 1}</span>
                        <span>{takeaway}</span>
                      </li>
                    ))}
                  </ol>
                </section>
              )}

              <section className="my-9 border-y border-editorial-border py-7">
                <p className="text-xs font-black uppercase tracking-[0.16em] text-editorial-text-subtle">Ecosystem context</p>
                <blockquote className="serif-title mt-2 text-2xl font-black leading-snug text-foreground">
                  {briefing.ecosystem_context || briefing.why_it_matters}
                </blockquote>
              </section>
            </div>

            <aside className="grid gap-4 lg:sticky lg:top-24">
              {briefing.source_url && (
                <a
                  href={`/api/redirect?id=${briefing.id}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-between rounded-lg border border-editorial-border bg-editorial-card p-4 text-sm font-black shadow-sm transition hover:border-editorial-accent/40 hover:text-editorial-accent"
                >
                  Read original source
                  <ExternalLink className="h-4 w-4" />
                </a>
              )}

              <div className="rounded-lg border border-editorial-border bg-editorial-card p-5 shadow-sm">
                <h2 className="text-xs font-black uppercase tracking-[0.16em] text-editorial-text-subtle">Source credibility</h2>
                <div className="mt-4 grid gap-3 text-sm font-semibold text-editorial-text-subtle">
                  <p>{briefing.source_name || sourceHost || 'Verified source'}</p>
                  <p>Quality score: {briefing.source_quality_score}%</p>
                  <p>Confidence score: {briefing.confidence_score}%</p>
                </div>
              </div>

              <div className="rounded-lg border border-editorial-border bg-editorial-card p-5 shadow-sm">
                <h2 className="text-xs font-black uppercase tracking-[0.16em] text-editorial-text-subtle">Project context</h2>
                <div className="mt-3 grid gap-2">
                  {(briefing.related_protocols || []).length > 0 ? (
                    briefing.related_protocols?.map((protocol) => (
                      <a key={protocol.name} href={protocol.url} className="rounded-md bg-editorial-muted px-3 py-2 text-sm font-bold text-editorial-text-subtle transition hover:text-editorial-accent">
                        {protocol.name}
                      </a>
                    ))
                  ) : (
                    briefing.tags.slice(0, 5).map((tag) => (
                      <span key={tag} className="rounded-md bg-editorial-muted px-3 py-2 text-sm font-bold text-editorial-text-subtle">
                        {tag}
                      </span>
                    ))
                  )}
                </div>
              </div>
            </aside>
          </div>

          <section className="mt-12 border-t border-editorial-border pt-8">
            <div className="flex items-end justify-between gap-4">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.16em] text-editorial-accent">Related coverage</p>
                <h2 className="serif-title mt-2 text-3xl font-black">More from this ecosystem lane</h2>
              </div>
              <Link href="/trending" className="hidden text-sm font-black text-editorial-accent sm:block">Trending</Link>
            </div>
            <div className="mt-5 grid gap-4 md:grid-cols-2">
              {related.map((item) => (
                <Link key={item.id} href={`/briefing/${item.slug}`} className="group rounded-lg border border-editorial-border bg-editorial-card p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-editorial-accent/40">
                  <p className="text-xs font-black uppercase tracking-[0.16em] text-editorial-accent">{item.category}</p>
                  <h3 className="serif-title mt-2 text-2xl font-black leading-tight group-hover:text-editorial-accent">{item.title}</h3>
                  <p className="mt-3 line-clamp-2 text-sm leading-6 text-editorial-text-subtle">{item.why_it_matters}</p>
                </Link>
              ))}
            </div>
          </section>
        </article>
      </main>
    </div>
  );
}

function MetaRow({ icon: Icon, label }: { icon: ComponentType<{ className?: string }>; label: string }) {
  return (
    <div className="flex items-center gap-2">
      <Icon className="h-4 w-4 text-editorial-accent" />
      <span>{label}</span>
    </div>
  );
}

function getRelatedBriefings(current: Briefing, all: Briefing[]): Briefing[] {
  const signals = [current.category, ...(current.tags || [])];
  return all
    .filter((briefing) => briefing.id !== current.id)
    .filter((briefing) => briefing.category === current.category || matchesSignal(briefing, signals))
    .sort((a, b) => scoreBriefing(b) - scoreBriefing(a));
}
