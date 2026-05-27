import type { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://tonlytics.xyz';

  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: ['/api/', '/moderation/'],
    },
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}
