import type { MetadataRoute } from 'next';
import { dbService } from 'database';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://tonlytics.xyz';
  const staticRoutes = ['', '/trending', '/ton', '/ecosystem', '/mini-apps', '/builders', '/analytics'].map((path) => ({
    url: `${baseUrl}${path}`,
    lastModified: new Date(),
    changeFrequency: 'hourly' as const,
    priority: path === '' ? 1 : 0.8,
  }));

  const briefings = await dbService.getBriefings();
  const briefingRoutes = briefings.map((briefing) => ({
    url: `${baseUrl}/briefing/${briefing.slug}`,
    lastModified: new Date(briefing.published_at),
    changeFrequency: 'daily' as const,
    priority: 0.7,
  }));

  return [...staticRoutes, ...briefingRoutes];
}
