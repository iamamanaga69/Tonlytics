import * as cheerio from 'cheerio';
import { normalizeMediaUrl, verifyImageAccessibility, downloadAndOptimizeMedia } from 'media';
import * as path from 'path';
import { logError } from 'telemetry';

export interface ExtractedMetadata {
  canonicalUrl: string;
  title: string;
  description: string;
  imageUrl: string | null;
  siteName: string | null;
}

export const scraping = {
  /**
   * Resolves a URL to its final destination (handling redirect chains)
   * and extracts metadata (canonical URL, OG, Twitter, Fallback Image).
   */
  async extractMetadata(url: string): Promise<ExtractedMetadata> {
    const cleanUrl = url.trim();
    try {
      // Fetch with redirect tracking
      const response = await fetch(cleanUrl, {
        headers: {
          'User-Agent': 'Tonlytics-Crawler-Scraper/1.0 (Mozilla/5.0; TON Ecosystem Intelligence)'
        },
        redirect: 'follow',
        signal: AbortSignal.timeout(10000)
      });

      if (!response.ok) {
        throw new Error(`Failed to load page: ${response.statusText}`);
      }

      // The final redirected URL
      const finalUrl = response.url;
      const html = await response.text();
      const $ = cheerio.load(html);

      // 1. Canonical URL
      const canonicalTag = $('link[rel="canonical"]').attr('href');
      const ogUrl = $('meta[property="og:url"]').attr('content');
      const canonicalUrl = canonicalTag 
        ? this.normalizeUrl(canonicalTag, finalUrl) 
        : (ogUrl ? this.normalizeUrl(ogUrl, finalUrl) : finalUrl);

      // 2. Title
      const ogTitle = $('meta[property="og:title"]').attr('content');
      const twitterTitle = $('meta[name="twitter:title"]').attr('content');
      const pageTitle = $('title').text().trim();
      const title = ogTitle || twitterTitle || pageTitle || 'TON Ecosystem Update';

      // 3. Description
      const ogDesc = $('meta[property="og:description"]').attr('content');
      const twitterDesc = $('meta[name="twitter:description"]').attr('content');
      const metaDesc = $('meta[name="description"]').attr('content');
      const description = ogDesc || twitterDesc || metaDesc || '';

      // 4. Image Extraction
      let extractedImage: string | null = null;

      // Priority A: OpenGraph images
      const ogImg = $('meta[property="og:image"]').attr('content');
      // Priority B: Twitter card images
      const twitterImg = $('meta[name="twitter:image"]').attr('content') || 
                         $('meta[property="twitter:image"]').attr('content') || 
                         $('meta[name="twitter:image:src"]').attr('content');

      const targetImg = ogImg || twitterImg;

      if (targetImg) {
        extractedImage = this.normalizeUrl(targetImg, finalUrl);
      } else {
        // Priority C: Fallback scraping (Scan article body for images)
        const bodyImages: string[] = [];
        $('article img, main img, #content img, .post img, body img').each((_, el) => {
          const src = $(el).attr('src');
          if (src) {
            const absSrc = this.normalizeUrl(src, finalUrl);
            // Skip tracking pixels, tiny icons, or avatars
            const isLikelyIcon = /avatar|logo|icon|tracking|pixel|spinner|loader|wp-content\/plugins/i.test(absSrc);
            const widthAttr = $(el).attr('width');
            const heightAttr = $(el).attr('height');
            const isTooSmall = (widthAttr && parseInt(widthAttr) < 100) || (heightAttr && parseInt(heightAttr) < 100);

            if (!isLikelyIcon && !isTooSmall) {
              bodyImages.push(absSrc);
            }
          }
        });

        if (bodyImages.length > 0) {
          extractedImage = bodyImages[0];
        }
      }

      // Validate image accessibility if we found one
      if (extractedImage) {
        const isValid = await verifyImageAccessibility(extractedImage);
        if (!isValid) {
          extractedImage = null; // Discard invalid/broken image URLs
        }
      }

      const siteName = $('meta[property="og:site_name"]').attr('content') || null;

      return {
        canonicalUrl,
        title: title.slice(0, 255),
        description: description.slice(0, 1000),
        imageUrl: extractedImage,
        siteName
      };
    } catch (error) {
      logError(`[SERVICES/SCRAPING] Metadata extraction failed for ${cleanUrl}`, error);
      // Fallback metadata if scrape fails completely
      return {
        canonicalUrl: cleanUrl,
        title: 'TON Ecosystem Update',
        description: 'TON ecosystem coverage and news updates.',
        imageUrl: null,
        siteName: null
      };
    }
  },

  /**
   * Resolves relative URLs into absolute ones.
   */
  normalizeUrl(url: string, baseUrl: string): string {
    try {
      return normalizeMediaUrl(url, baseUrl);
    } catch {
      return url;
    }
  },

  /**
   * Downloads a validated image from an external source and saves it locally in the public folder.
   * Returns a local path suitable for public consumption (e.g. /uploads/media/uuid.webp).
   */
  async saveImageLocally(url: string, prefix: string): Promise<string | null> {
    const webPublicDir = path.resolve(process.cwd(), 'public');
    const outputDir = path.join(webPublicDir, 'uploads', 'media');
    const fileName = `${prefix}-${Date.now()}`;

    try {
      const result = await downloadAndOptimizeMedia(url, outputDir, fileName);
      if (result) {
        return result.localPath; // e.g. /uploads/media/filename.webp
      }
      return null;
    } catch (error) {
      logError(`[SERVICES/SCRAPING] Failed to save image locally from ${url}`, error);
      return null;
    }
  }
};
