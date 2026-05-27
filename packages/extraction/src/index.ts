import * as cheerio from 'cheerio';

export interface RssItem {
  title: string;
  link: string;
  content: string;
  pubDate: string;
  guid?: string;
}

export interface OpenGraphMeta {
  title?: string;
  description?: string;
  image?: string;
  url?: string;
  siteName?: string;
}

/**
 * Fetch and parse an RSS feed.
 * Uses a clean XML parser approach via Cheerio to extract items safely.
 */
export async function fetchRssFeed(feedUrl: string): Promise<RssItem[]> {
  const response = await fetch(feedUrl, {
    headers: {
      'User-Agent': 'Tonlytics-Crawler/1.0'
    }
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch RSS feed: ${response.statusText}`);
  }

  const xmlText = await response.text();
  const $ = cheerio.load(xmlText, { xmlMode: true });
  const items: RssItem[] = [];

  $('item').each((_, elem) => {
    const title = $(elem).find('title').text().trim();
    const link = $(elem).find('link').text().trim();
    const content = $(elem).find('description').text().trim() || $(elem).find('content\\:encoded').text().trim();
    const pubDate = $(elem).find('pubDate').text().trim();
    const guid = $(elem).find('guid').text().trim();

    if (title && link) {
      items.push({
        title,
        link,
        content,
        pubDate: pubDate ? new Date(pubDate).toISOString() : new Date().toISOString(),
        guid
      });
    }
  });

  return items;
}

/**
 * Scrape a webpage to extract standard OpenGraph metadata.
 * Strictly checks tags to grab titles, summaries, and canonical thumbnails.
 */
export async function extractOpenGraph(url: string): Promise<OpenGraphMeta> {
  const response = await fetch(url, {
    headers: {
      'User-Agent': 'Tonlytics-Crawler/1.0'
    }
  });

  if (!response.ok) {
    throw new Error(`Failed to load URL for OG extraction: ${response.statusText}`);
  }

  const html = await response.text();
  const $ = cheerio.load(html);
  const meta: OpenGraphMeta = {};

  meta.title = $('meta[property="og:title"]').attr('content') || $('title').text().trim();
  meta.description = $('meta[property="og:description"]').attr('content') || $('meta[name="description"]').attr('content');
  meta.image = $('meta[property="og:image"]').attr('content');
  meta.url = $('meta[property="og:url"]').attr('content') || url;
  meta.siteName = $('meta[property="og:site_name"]').attr('content');

  return meta;
}

/**
 * Parse public GitHub release updates from standard release URLs.
 */
export async function parseGithubReleases(repoUrl: string): Promise<{ title: string; content: string; date: string; tag: string }[]> {
  // Convert standard github repo URL to API url
  // Example: https://github.com/ton-blockchain/ton/releases -> https://api.github.com/repos/ton-blockchain/ton/releases
  const match = repoUrl.match(/github\.com\/([^\/]+)\/([^\/]+)/);
  if (!match) {
    throw new Error(`Invalid GitHub repository URL: ${repoUrl}`);
  }

  const [, owner, repo] = match;
  const apiUrl = `https://api.github.com/repos/${owner}/${repo}/releases`;

  const response = await fetch(apiUrl, {
    headers: {
      'User-Agent': 'Tonlytics-Crawler/1.0',
      'Accept': 'application/vnd.github.v3+json'
    }
  });

  if (!response.ok) {
    throw new Error(`GitHub API request failed: ${response.statusText}`);
  }

  const releases = await response.json();
  if (!Array.isArray(releases)) return [];

  return releases.map((rel: any) => ({
    title: rel.name || rel.tag_name,
    content: rel.body || '',
    date: rel.published_at || new Date().toISOString(),
    tag: rel.tag_name
  }));
}
