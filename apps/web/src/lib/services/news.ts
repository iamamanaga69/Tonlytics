import { db } from './db';
import { scraping } from './scraping';
import { ai } from './ai';
import { supabaseAdmin, isSupabaseConfigured } from 'database';
import { fetchRssFeed, parseGithubReleases } from 'extraction';
import type { Briefing, RawUpdate } from 'types';
import { logError, logInfo, logWarn } from 'telemetry';

export interface IngestionResult {
  status: 'inserted' | 'skipped' | 'failed';
  reason?: string;
  briefingId?: string;
  title?: string;
}

export const news = {
  /**
   * Processes a single raw update through the entire pipeline:
   * 1. Duplicate check.
   * 2. Spam & Relevance filtering.
   * 3. Web scraping (OpenGraph / Fallback metadata & images).
   * 4. AI summary / categorization.
   * 5. Local thumbnail download & save.
   * 6. Save raw update and final briefing to DB.
   */
  async processRawUpdate(raw: {
    sourceId?: string;
    sourceUrl: string;
    rawTitle: string;
    rawContent: string;
    publishDate?: string;
    sourceName?: string;
    overrideImageUrl?: string;
  }): Promise<IngestionResult> {
    const sourceUrl = raw.sourceUrl.trim();
    const title = raw.rawTitle.trim();
    const content = raw.rawContent.trim();
    const publishDate = raw.publishDate || new Date().toISOString();
    const sourceName = raw.sourceName || 'Verified TON Source';

    try {
      // 1. Duplicate check (title or exact URL matches)
      const isDup = await db.checkDuplicate(sourceUrl, title);
      if (isDup) {
        return { status: 'skipped', reason: 'duplicate_article', title };
      }

      // 2. Spam & Relevance Check
      const fullText = `${title} ${content}`;
      if (ai.isSpam(fullText)) {
        return { status: 'skipped', reason: 'spam_detected', title };
      }
      if (!ai.isEcosystemRelevant(fullText)) {
        return { status: 'skipped', reason: 'not_relevant_to_ton', title };
      }

      const isTelegramPost = sourceUrl.includes('t.me/');

      // 3. Web Scraping & Canonical Link Resolution
      logInfo('[SERVICES/NEWS] Preparing source metadata', { sourceUrl, isTelegramPost });
      const webMetadata = isTelegramPost
        ? {
            canonicalUrl: sourceUrl,
            title,
            description: content.slice(0, 500),
            imageUrl: raw.overrideImageUrl || null,
            siteName: sourceName,
          }
        : await scraping.extractMetadata(sourceUrl);
      const canonicalUrl = webMetadata.canonicalUrl || sourceUrl;

      // 4. Double check duplicate for the canonical URL
      if (canonicalUrl !== sourceUrl) {
        const isCanonicalDup = await db.checkDuplicate(canonicalUrl, title);
        if (isCanonicalDup) {
          return { status: 'skipped', reason: 'duplicate_canonical_url', title };
        }
      }

      // 5. Ingest Raw Update into DB first
      let rawUpdateId: string | null = null;
      if (isSupabaseConfigured && supabaseAdmin) {
        const { data: rawUpdate, error: rawError } = await supabaseAdmin
          .from('raw_updates')
          .insert([{
            source_id: raw.sourceId || null,
            source_url: canonicalUrl,
            raw_title: title,
            raw_content: content,
            publish_date: publishDate,
            status: 'processed'
          }])
          .select()
          .single();

        if (!rawError && rawUpdate) {
          rawUpdateId = rawUpdate.id;
        } else {
          logWarn('[SERVICES/NEWS] Failed to save raw_update record', {
            reason: rawError?.message || 'unknown_error',
          });
        }
      }

      // 6. AI Enrichment / Summarization
      const mockRawUpdate: RawUpdate = {
        id: rawUpdateId || 'temp-raw-id',
        source_id: raw.sourceId || '',
        source_url: canonicalUrl,
        raw_title: title,
        raw_content: content,
        publish_date: publishDate,
        status: 'pending',
        retry_count: 0,
        created_at: new Date().toISOString()
      };

      logInfo('[SERVICES/NEWS] Summarizing article content');
      const enriched = await ai.processContent(mockRawUpdate);

      // Overwrite the title and date with scraped values if available
      const finalTitle = webMetadata.title || enriched.title || title;
      const finalSlug = enriched.slug || title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

      // 7. Local Thumbnail Optimization
      let localImageUrl: string | null = null;
      const sourceImage = raw.overrideImageUrl || webMetadata.imageUrl;
      if (sourceImage) {
        logInfo('[SERVICES/NEWS] Downloading thumbnail locally', { sourceImage });
        localImageUrl = await scraping.saveImageLocally(sourceImage, finalSlug.slice(0, 50));
      }

      // 8. Insert Briefing into Database
      const briefingPayload: Omit<Briefing, 'id' | 'views_count' | 'created_at'> = {
        raw_update_id: rawUpdateId || undefined,
        title: finalTitle,
        slug: finalSlug,
        briefing: enriched.briefing,
        why_it_matters: enriched.why_it_matters,
        category: enriched.category,
        tags: enriched.tags,
        is_published: true,
        telegram_posted: false,
        telegram_message_id: undefined,
        confidence_score: enriched.confidence_score,
        readability_score: enriched.readability_score,
        hallucination_probability: enriched.hallucination_probability,
        source_quality_score: enriched.source_quality_score,
        moderation_status: enriched.moderation_status || 'auto_approved',
        image_url: localImageUrl || sourceImage || undefined,
        video_url: undefined,
        ecosystem_context: undefined,
        discussion_url: undefined,
        timeline: [],
        related_protocols: [],
        source_name: webMetadata.siteName || sourceName,
        source_url: canonicalUrl,
        key_takeaways: enriched.key_takeaways || [],
        spam_probability: 0,
        duplicate_probability: 0,
        relevance_score: enriched.relevance_score || 80,
        published_at: publishDate
      };

      const finalBrief = await db.insertBriefing(briefingPayload);

      // Log media asset connection if applicable
      if (localImageUrl && finalBrief.id) {
        await db.insertMediaAsset({
          briefingId: finalBrief.id,
          originalUrl: sourceImage!,
          localPath: localImageUrl,
          mimeType: 'image/webp',
          fileSize: 0 // Will default to 0 if size check bypassed
        });
      }

      logInfo('[SERVICES/NEWS] Successfully ingested briefing', {
        briefingId: finalBrief.id,
        title: finalTitle,
      });
      return {
        status: 'inserted',
        briefingId: finalBrief.id,
        title: finalTitle
      };
    } catch (error) {
      logError(`[SERVICES/NEWS] Failed to process update for ${sourceUrl}`, error);
      return { status: 'failed', reason: error instanceof Error ? error.message : 'Unknown error', title };
    }
  },

  /**
   * Scrapes and crawls all active RSS and GitHub sources inline.
   */
  async runInlineCrawler(): Promise<{ processed: number; skipped: number; failed: number; details: IngestionResult[] }> {
    logInfo('[SERVICES/NEWS] Launching active sources inline crawler sweeps');
    let processed = 0;
    let skipped = 0;
    let failed = 0;
    const details: IngestionResult[] = [];

    try {
      const sources = await db.getSources();
      logInfo('[SERVICES/NEWS] Found active sources to crawl', { count: sources.length });

      for (const source of sources) {
        if (!source.is_active || source.reliability_score < 3) {
          logInfo('[SERVICES/NEWS] Skipping low-confidence source', {
            sourceName: source.name,
            active: source.is_active,
            reliabilityScore: source.reliability_score,
          });
          continue;
        }

        logInfo('[SERVICES/NEWS] Crawling source', {
          sourceName: source.name,
          sourceType: source.source_type,
          sourceUrl: source.url,
        });

        try {
          if (source.source_type === 'github') {
            const releases = await parseGithubReleases(source.url);
            // Process the latest 2 releases
            for (const r of releases.slice(0, 2)) {
              const res = await this.processRawUpdate({
                sourceId: source.id,
                sourceUrl: `${source.url}/tag/${r.tag}`,
                rawTitle: `${source.name}: Release ${r.title}`,
                rawContent: r.content,
                publishDate: r.date,
                sourceName: source.name
              });

              details.push(res);
              if (res.status === 'inserted') processed++;
              else if (res.status === 'skipped') skipped++;
              else failed++;
            }
          } else if (source.source_type === 'rss') {
            const items = await fetchRssFeed(source.url);
            // Process the latest 2 RSS items
            for (const item of items.slice(0, 2)) {
              const res = await this.processRawUpdate({
                sourceId: source.id,
                sourceUrl: item.link,
                rawTitle: item.title,
                rawContent: item.content,
                publishDate: item.pubDate,
                sourceName: source.name
              });

              details.push(res);
              if (res.status === 'inserted') processed++;
              else if (res.status === 'skipped') skipped++;
              else failed++;
            }
          }
        } catch (sourceErr) {
          logError(`[SERVICES/NEWS] Failed crawling source "${source.name}"`, sourceErr);
        }
      }
    } catch (err) {
      logError('[SERVICES/NEWS] Inline crawler pass failed', err);
    }

    return { processed, skipped, failed, details };
  }
};
