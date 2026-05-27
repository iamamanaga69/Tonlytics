import * as fs from 'fs';
import * as path from 'path';

/**
 * Verified domain whitelist for official assets only.
 * We strictly exclude synthetic AI generators or generic placeholder hosts.
 */
export const OFFICIAL_MEDIA_WHITELIST = [
  'ton.org',
  'telegram.org',
  'github.com',
  'githubusercontent.com',
  'tether.to',
  'ston.fi',
  'getgems.io',
  'fragment.com',
  'tonkeeper.com',
  'mytonwallet.io',
  'tonhub.com'
];

/**
 * Validates whether a media URL is authentic and points to an official ecosystem source.
 */
export function isOfficialMediaUrl(url: string): boolean {
  if (!url) return false;
  try {
    const parsed = new URL(url);
    const hostname = parsed.hostname.toLowerCase();
    
    return OFFICIAL_MEDIA_WHITELIST.some(domain => 
      hostname === domain || hostname.endsWith('.' + domain)
    );
  } catch {
    return false;
  }
}

/**
 * Normalizes malformed media URLs, resolving relative paths and protocol-less strings.
 */
export function normalizeMediaUrl(url: string, baseUrl?: string): string {
  if (!url) return '';
  let trimmed = url.trim();

  // 1. Prepend https: to protocol-relative URLs (e.g., //ton.org/blog/hero.png)
  if (trimmed.startsWith('//')) {
    trimmed = 'https:' + trimmed;
  }

  // 2. Resolve relative URLs using baseUrl if provided (e.g. /assets/hero.jpg -> https://ton.org/assets/hero.jpg)
  if (trimmed.startsWith('/') && baseUrl) {
    try {
      const parsedBase = new URL(baseUrl);
      trimmed = parsedBase.origin + trimmed;
    } catch {
      // Bypassed if baseUrl is invalid
    }
  }

  // 3. Fix missing protocol in generic URLs (e.g., blog.ton.org/assets/image.jpg)
  if (!/^https?:\/\//i.test(trimmed)) {
    trimmed = 'https://' + trimmed;
  }

  return trimmed;
}

/**
 * Executes a lightweight HTTP HEAD fetch request to verify that the image is online
 * and returns a valid image content-type before database commits.
 */
export async function verifyImageAccessibility(url: string): Promise<boolean> {
  if (!url) return false;
  
  const normalized = normalizeMediaUrl(url);
  
  try {
    const response = await fetch(normalized, {
      method: 'HEAD',
      headers: {
        'User-Agent': 'Tonlytics-Crawler-ImageValidator/1.0'
      },
      // 5-second connection timeout
      signal: AbortSignal.timeout(5000)
    });

    if (response.ok) {
      const contentType = response.headers.get('content-type');
      if (contentType && contentType.startsWith('image/')) {
        return true;
      }
    }
    
    // Fallback: If HEAD fails with 405 Method Not Allowed, retry with a GET slice
    if (response.status === 405 || response.status === 403) {
      const getResponse = await fetch(normalized, {
        method: 'GET',
        headers: {
          'User-Agent': 'Tonlytics-Crawler-ImageValidator/1.0',
          'Range': 'bytes=0-1024' // request only first kilobyte to save bandwidth
        },
        signal: AbortSignal.timeout(5000)
      });
      
      if (getResponse.ok) {
        const contentType = getResponse.headers.get('content-type');
        return !!(contentType && contentType.startsWith('image/'));
      }
    }

    return false;
  } catch (error) {
    // Gracefully catch timeout and CORS/socket connection failures
    return false;
  }
}

/**
 * Filter and resolve an extracted thumbnail URL.
 * If the URL is not official, returns undefined to trigger typography-first layouts.
 */
export function resolveOfficialThumbnail(imageUrl?: string): string | undefined {
  if (!imageUrl) return undefined;
  
  const normalized = normalizeMediaUrl(imageUrl);
  if (isOfficialMediaUrl(normalized)) {
    return normalized;
  }
  
  return undefined;
}

/**
 * Preparation for CDN image optimization pipeline settings.
 */
export interface CdnOptimizeOptions {
  width?: number;
  quality?: number;
  format?: 'webp' | 'avif' | 'jpeg';
}

/**
 * Generates an optimized asset URL.
 */
export function getOptimizedAssetUrl(imageUrl: string, options: CdnOptimizeOptions = {}): string {
  if (!isOfficialMediaUrl(imageUrl)) {
    return imageUrl;
  }
  
  const width = options.width || 800;
  const quality = options.quality || 85;
  const format = options.format || 'webp';
  
  return `https://cdn.tonlytics.com/cdn-cgi/image/width=${width},quality=${quality},format=${format}/${imageUrl}`;
}

/**
 * Downloads a media asset from a URL and optimizes it locally using Sharp.
 * Falls back gracefully to raw binary writes if Sharp is not available.
 */
export async function downloadAndOptimizeMedia(
  url: string,
  outputDir: string,
  fileName: string
): Promise<{ localPath: string; fileSize: number; mimeType: string; width?: number; height?: number } | null> {
  const normalized = normalizeMediaUrl(url);
  const isValid = await verifyImageAccessibility(normalized);
  if (!isValid) return null;

  try {
    const response = await fetch(normalized, {
      headers: {
        'User-Agent': 'Tonlytics-Crawler-ImageDownloader/1.0'
      },
      signal: AbortSignal.timeout(10000)
    });

    if (!response.ok) return null;

    const buffer = Buffer.from(await response.arrayBuffer());
    
    // Ensure output directory exists
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    const mimeType = response.headers.get('content-type') || 'image/webp';
    const outputFileName = `${fileName}.webp`; // standardise on webp
    const outputPath = path.join(outputDir, outputFileName);

    let finalBuffer: any = buffer;
    let width: number | undefined;
    let height: number | undefined;

    // Dynamic try-import for Sharp
    try {
      // @ts-ignore
      const sharp = (await import('sharp')).default;
      const img = sharp(buffer);
      const meta = await img.metadata();
      width = meta.width;
      height = meta.height;

      finalBuffer = await img
        .resize({ width: 800, withoutEnlargement: true })
        .webp({ quality: 85 })
        .toBuffer();
    } catch {
      // Fallback: raw write
      console.warn('[MEDIA] sharp import failed or not found, downloading raw image');
    }

    fs.writeFileSync(outputPath, finalBuffer);

    return {
      localPath: `/uploads/media/${outputFileName}`,
      fileSize: finalBuffer.length,
      mimeType: 'image/webp',
      width,
      height
    };
  } catch (error) {
    console.error('[MEDIA] Failed to download or optimize media:', error);
    return null;
  }
}
