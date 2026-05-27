import type { Briefing } from '@/types';

export const ECOSYSTEM_CATEGORIES = [
  'All',
  'Breaking TON News',
  'Trending on TON',
  'Telegram Apps',
  'Mini Apps',
  'Infrastructure',
  'Builders',
  'Funding',
  'Governance',
  'DeFi',
  'Integration',
  'Ecosystem',
] as const;

export function getReadingTime(briefing: Pick<Briefing, 'title' | 'briefing' | 'why_it_matters' | 'key_takeaways'>): number {
  const text = `${briefing.title} ${briefing.briefing} ${briefing.why_it_matters} ${(briefing.key_takeaways || []).join(' ')}`;
  const words = text.trim().split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.ceil(words / 220));
}

export function getRelativeTime(isoString: string): string {
  try {
    const published = new Date(isoString).getTime();
    const diffMs = Date.now() - published;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 30) return `${diffDays}d ago`;
    return formatShortDate(isoString);
  } catch {
    return 'Recent';
  }
}

export function formatShortDate(isoString: string): string {
  try {
    return new Date(isoString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  } catch {
    return 'Recent';
  }
}

export function getSourceHost(url?: string): string {
  if (!url) return '';
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return '';
  }
}

export function getCredibilityLabel(briefing: Pick<Briefing, 'confidence_score' | 'source_quality_score'>): string {
  const score = Math.round(((briefing.confidence_score || 0) + (briefing.source_quality_score || 0)) / 2);
  if (score >= 95) return 'Primary source';
  if (score >= 88) return 'Verified source';
  if (score >= 78) return 'Editorial review';
  return 'Needs context';
}

export function scoreBriefing(briefing: Briefing): number {
  const publishedAt = new Date(briefing.published_at).getTime();
  const ageHours = Math.max(1, (Date.now() - publishedAt) / 3_600_000);
  const recencyBoost = Math.max(0, 72 - ageHours);
  const engagement = Math.log10((briefing.views_count || 0) + 10) * 16;
  const trust = ((briefing.confidence_score || 0) + (briefing.source_quality_score || 0)) / 8;
  const relevance = (briefing.relevance_score || 0) / 5;
  return Math.round(recencyBoost + engagement + trust + relevance);
}

export function rankBriefings(briefings: Briefing[]): Briefing[] {
  return [...briefings].sort((a, b) => scoreBriefing(b) - scoreBriefing(a));
}

export function matchesSignal(briefing: Briefing, signals: string[]): boolean {
  const haystack = [
    briefing.title,
    briefing.briefing,
    briefing.why_it_matters,
    briefing.category,
    briefing.source_name || '',
    ...(briefing.tags || []),
  ].join(' ').toLowerCase();

  return signals.some((signal) => haystack.includes(signal.toLowerCase()));
}

export function uniqueById(briefings: Briefing[]): Briefing[] {
  const seen = new Set<string>();
  return briefings.filter((briefing) => {
    if (seen.has(briefing.id)) return false;
    seen.add(briefing.id);
    return true;
  });
}

export function getTopicCounts(briefings: Briefing[], limit = 10): [string, number][] {
  const counts = new Map<string, number>();
  briefings.forEach((briefing) => {
    briefing.tags?.slice(0, 6).forEach((tag) => {
      counts.set(tag, (counts.get(tag) || 0) + 1);
    });
  });

  return Array.from(counts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit);
}

export function getCategoryCounts(briefings: Briefing[]): [string, number][] {
  const counts = new Map<string, number>();
  briefings.forEach((briefing) => {
    counts.set(briefing.category, (counts.get(briefing.category) || 0) + 1);
  });

  return Array.from(counts.entries()).sort((a, b) => b[1] - a[1]);
}
