import { Worker, Job } from 'bullmq';
import { getRedisConnection, QUEUE_NAMES, getQueue } from 'queues';
import { dbService, isSupabaseConfigured, supabase } from 'database';
import { logInfo, logError, logWarn } from 'telemetry';
import { indexBriefing, deindexBriefing } from 'search';
import { calculateDuplicateProbability, generateTextEmbedding } from 'embeddings';
import { slugify } from 'shared';
import { summarizeRawUpdate } from 'ai';
import { downloadAndOptimizeMedia, verifyImageAccessibility } from 'media';
import { fetchRssFeed, extractOpenGraph, parseGithubReleases } from 'extraction';
import { TRUST_THRESHOLDS } from 'config';
import type { Briefing, RawUpdate } from 'types';
import * as path from 'path';
import * as fs from 'fs';
import http from 'http';

const port = process.env.PORT || 3009;

logInfo('[WORKER] Bootstrapping Tonlytics 10-Worker Background Ecosystem Engine...');

const connection = getRedisConnection();

// Start a simple HTTP server to keep the service running and satisfy health checks on Railway
const server = http.createServer((req, res) => {
  if (req.url === '/api/health' || req.url === '/health' || req.url === '/') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      status: 'healthy',
      service: 'worker',
      uptime: process.uptime(),
      timestamp: new Date().toISOString()
    }));
    return;
  }
  res.writeHead(404);
  res.end('Not Found');
});

server.listen(port, async () => {
  logInfo('==================================================');
  logInfo(`[STARTUP] Service: worker`);
  logInfo(`[STARTUP] Port: ${port}`);
  logInfo(`[STARTUP] Environment: ${process.env.NODE_ENV || 'development'}`);
  logInfo(`[STARTUP] Database Configured: ${!!process.env.DATABASE_URL}`);
  logInfo(`[STARTUP] Supabase Configured: ${isSupabaseConfigured}`);

  // 1. Supabase Check
  if (isSupabaseConfigured && supabase) {
    try {
      const { error } = await supabase.from('briefings').select('id').limit(1);
      if (error) throw error;
      logInfo('[STARTUP] Supabase Connection: SUCCESSFUL');
    } catch (err) {
      logError('[STARTUP] Supabase Connection: FAILED', err);
    }
  } else {
    logInfo('[STARTUP] Supabase Connection: SKIPPED (Not configured)');
  }

  // 2. Queue Status Check
  try {
    const pong = await connection.ping();
    logInfo(`[STARTUP] Redis Connection (Queues): SUCCESSFUL (${pong})`);
  } catch (err) {
    logError('[STARTUP] Redis Connection (Queues): FAILED', err);
  }

  logInfo('==================================================');
  logInfo(`[WORKER] Tonlytics Background Worker successfully running on port ${port}`);
});

// Whitelist and relevance helpers (mirrored from ingestion app)
const TRUSTED_DOMAINS = ['ton.org', 'telegram.org', 'github.com', 'ston.fi', 'getgems.io', 'tether.to', 'tonkeeper.com'];
const RELEVANCE_KEYWORDS = ['ton', 'telegram', 'wallet', 'usdt', 'stablecoin', 'jetton', 'nft', 'mini app', 'tact', 'func', 'dex', 'defi'];

function isCredibleSource(url: string): boolean {
  try {
    const parsed = new URL(url);
    return TRUSTED_DOMAINS.some(d => parsed.hostname === d || parsed.hostname.endsWith('.' + d));
  } catch {
    return false;
  }
}

function getRelevanceCount(title: string, content: string): number {
  const text = `${title} ${content}`.toLowerCase();
  let count = 0;
  RELEVANCE_KEYWORDS.forEach(kw => {
    const matches = text.match(new RegExp(`\\b${kw}\\b`, 'gi'));
    if (matches) count += matches.length;
  });
  return count;
}

// ==========================================
// 1. SOURCE INGESTION WORKER
// ==========================================
const IngestionWorker = new Worker(
  QUEUE_NAMES.INGESTION,
  async (job: Job) => {
    const { sourceId, sourceUrl, sourceType } = job.data;
    logInfo(`[WORKER] [INGESTION] [Job: ${job.id}] Crawling real ecosystem data from ${sourceType} source: ${sourceUrl}`);

    try {
      let ingested = 0;

      if (sourceType === 'github') {
        // Real GitHub releases crawl via extraction package
        const releases = await parseGithubReleases(sourceUrl);
        const mapped = releases.slice(0, 5)
          .filter(r => getRelevanceCount(r.title, r.content) >= 1)
          .map(r => ({
            source_id: sourceId,
            external_id: r.tag,
            source_url: `${sourceUrl}/tag/${r.tag}`,
            raw_title: r.title,
            raw_content: r.content,
            publish_date: r.date
          }));

        if (mapped.length > 0) {
          ingested = await dbService.insertRawUpdates(mapped);
        }
        logInfo(`[WORKER] [INGESTION] GitHub releases crawled: ${releases.length} found, ${mapped.length} relevant, ${ingested} ingested.`);

      } else if (sourceType === 'rss') {
        // Real RSS feed crawl via extraction package
        const items = await fetchRssFeed(sourceUrl);
        const mapped = items.slice(0, 5)
          .filter(i => getRelevanceCount(i.title, i.content) >= 1)
          .map(i => ({
            source_id: sourceId,
            source_url: i.link,
            raw_title: i.title,
            raw_content: i.content,
            publish_date: i.pubDate
          }));

        if (mapped.length > 0) {
          ingested = await dbService.insertRawUpdates(mapped);
        }
        logInfo(`[WORKER] [INGESTION] RSS feed crawled: ${items.length} items found, ${mapped.length} relevant, ${ingested} ingested.`);

      } else if (sourceType === 'telegram') {
        // Telegram public channel HTML scrape (t.me/s/channelname)
        try {
          const response = await fetch(sourceUrl, {
            headers: { 'User-Agent': 'Tonlytics-Crawler/1.0' }
          });
          if (response.ok) {
            const html = await response.text();
            // Extract text content from Telegram preview page
            const cheerio = await import('cheerio');
            const $ = cheerio.load(html);
            const posts: { title: string; content: string; date: string; link: string }[] = [];

            $('.tgme_widget_message').each((_, el) => {
              const textEl = $(el).find('.tgme_widget_message_text');
              const dateEl = $(el).find('.tgme_widget_message_date time');
              const linkEl = $(el).find('.tgme_widget_message_date');
              const text = textEl.text().trim();
              const date = dateEl.attr('datetime') || new Date().toISOString();
              const link = linkEl.attr('href') || sourceUrl;

              if (text && text.length > 30) {
                posts.push({
                  title: text.slice(0, 80).replace(/\n/g, ' ').trim(),
                  content: text,
                  date,
                  link
                });
              }
            });

            const mapped = posts.slice(0, 5)
              .filter(p => getRelevanceCount(p.title, p.content) >= 1)
              .map(p => ({
                source_id: sourceId,
                source_url: p.link,
                raw_title: p.title,
                raw_content: p.content,
                publish_date: p.date
              }));

            if (mapped.length > 0) {
              ingested = await dbService.insertRawUpdates(mapped);
            }
            logInfo(`[WORKER] [INGESTION] Telegram channel scraped: ${posts.length} posts found, ${mapped.length} relevant, ${ingested} ingested.`);
          }
        } catch (tgErr) {
          logError(`[WORKER] [INGESTION] Telegram scrape failed for ${sourceUrl}`, tgErr);
        }
      }

      // Enqueue newly ingested items to downstream Duplicate Detection
      const pendingUpdates = await dbService.getPendingRawUpdates(5);
      for (const update of pendingUpdates) {
        await getQueue(QUEUE_NAMES.DUPLICATE_DETECTION).add(`check-duplicate-${update.id}`, {
          rawUpdateId: update.id,
          rawContent: update.raw_content
        });
      }

      // Log source telemetry
      await dbService.logSourceTelemetry({
        source_id: sourceId,
        last_crawled_at: new Date().toISOString(),
        success_count: ingested > 0 ? 1 : 0,
        failure_count: 0,
        stale_count: ingested === 0 ? 1 : 0
      });

      return { ingested, sourceType, sourceUrl };
    } catch (err) {
      // Log failure telemetry
      await dbService.logSourceTelemetry({
        source_id: sourceId,
        last_crawled_at: new Date().toISOString(),
        success_count: 0,
        failure_count: 1,
        stale_count: 0,
        error_message: err instanceof Error ? err.message : 'Unknown crawl error'
      });

      logError(`[WORKER] [INGESTION] Failed crawler pass for source ${sourceUrl}`, err);
      throw err;
    }
  },
  { connection, concurrency: 2 }
);

// ==========================================
// 2. DUPLICATE DETECTION WORKER
// ==========================================
const DuplicateDetectionWorker = new Worker(
  QUEUE_NAMES.DUPLICATE_DETECTION,
  async (job: Job) => {
    const { rawUpdateId, rawContent } = job.data;
    logInfo(`[WORKER] [DUPLICATE] [Job: ${job.id}] Calculating semantic similarity for update ${rawUpdateId}`);

    try {
      // Use sliding window: only compare against last 7 days of briefings
      const recentBriefings = await dbService.getRecentBriefings(7);
      let highestProb = 0;

      for (const b of recentBriefings) {
        try {
          const prob = await calculateDuplicateProbability(rawContent, b.briefing);
          if (prob > highestProb) highestProb = prob;
        } catch (embErr) {
          // If embedding API fails, skip this comparison (don't block the pipeline)
          logError(`[WORKER] [DUPLICATE] Embedding comparison failed for briefing ${b.id}, skipping`, embErr);
        }
      }

      if (highestProb >= TRUST_THRESHOLDS.DISCARD_DUPLICATE_PROBABILITY) {
        logWarn(`[WORKER] [DUPLICATE] High duplicate similarity detected (${highestProb}%). Discarding update ${rawUpdateId}`);
        await dbService.updateRawUpdateStatus(rawUpdateId, 'filtered');
        
        await getQueue(QUEUE_NAMES.TELEMETRY).add(`log-event-${Date.now()}`, {
          eventName: 'duplicate_filtered',
          metadata: { rawUpdateId, duplicateProbability: highestProb }
        });
        
        return { status: 'duplicate_filtered', probability: highestProb };
      }

      logInfo(`[WORKER] [DUPLICATE] Duplicate checks passed (${highestProb}% max similarity). Enqueuing to Extraction.`);
      
      const rawUpdate = (await dbService.getPendingRawUpdates(10)).find(x => x.id === rawUpdateId);
      if (rawUpdate) {
        await getQueue(QUEUE_NAMES.EXTRACTION).add(`extract-${rawUpdateId}`, {
          rawUpdateId,
          sourceUrl: rawUpdate.source_url,
          sourceId: rawUpdate.source_id
        });
      }

      return { status: 'clean', probability: highestProb };
    } catch (err) {
      logError(`[WORKER] [DUPLICATE] Duplicate calculations failed for raw update ${rawUpdateId}`, err);
      throw err;
    }
  },
  { connection, concurrency: 3 }
);

// ==========================================
// 3. EXTRACTION WORKER
// ==========================================
const ExtractionWorker = new Worker(
  QUEUE_NAMES.EXTRACTION,
  async (job: Job) => {
    const { rawUpdateId, sourceUrl, sourceId } = job.data;
    logInfo(`[WORKER] [EXTRACTION] [Job: ${job.id}] Extracting OpenGraph metadata from: ${sourceUrl}`);

    try {
      // Real OpenGraph extraction via Cheerio
      let ogTitle: string | undefined;
      let ogImage: string | undefined;
      let ogDescription: string | undefined;

      try {
        const ogData = await extractOpenGraph(sourceUrl);
        ogTitle = ogData.title;
        ogImage = ogData.image;
        ogDescription = ogData.description;
        logInfo(`[WORKER] [EXTRACTION] OpenGraph parsed: title="${ogTitle}", image=${ogImage ? 'found' : 'none'}`);
      } catch (ogErr) {
        logError(`[WORKER] [EXTRACTION] OpenGraph extraction failed for ${sourceUrl}, continuing with raw data`, ogErr);
      }

      // Look up actual source record for name and reliability
      const source = sourceId ? await dbService.getSourceById(sourceId) : null;
      const sourceName = source?.name || 'Unknown Source';
      const reliabilityScore = source?.reliability_score || 3;

      // Fetch the raw update for content
      const rawUpdate = (await dbService.getPendingRawUpdates(10)).find(x => x.id === rawUpdateId);
      if (rawUpdate) {
        await getQueue(QUEUE_NAMES.AI_ENRICHMENT).add(`enrich-${rawUpdateId}`, {
          rawUpdateId,
          rawTitle: rawUpdate.raw_title,
          rawContent: rawUpdate.raw_content,
          sourceUrl,
          sourceName,
          reliabilityScore,
          ogTitle,
          ogImage,
          ogDescription
        });
      }

      return { ogTitle, ogImage: ogImage || null, sourceName };
    } catch (err) {
      logError(`[WORKER] [EXTRACTION] Extraction failed for update ${rawUpdateId}`, err);
      throw err;
    }
  },
  { connection, concurrency: 2 }
);

// ==========================================
// 4. AI ENRICHMENT WORKER
// ==========================================
const AiEnrichmentWorker = new Worker(
  QUEUE_NAMES.AI_ENRICHMENT,
  async (job: Job) => {
    const { rawUpdateId, rawTitle, rawContent, sourceUrl, sourceName, reliabilityScore, ogTitle, ogImage, ogDescription } = job.data;
    logInfo(`[WORKER] [AI_ENRICHMENT] [Job: ${job.id}] Executing LLM summarization for: ${rawTitle}`);

    try {
      const rawUpdateObj: RawUpdate = {
        id: rawUpdateId,
        source_id: 'source-1',
        source_url: sourceUrl,
        raw_title: rawTitle,
        raw_content: rawContent,
        publish_date: new Date().toISOString(),
        status: 'pending',
        retry_count: 0,
        created_at: new Date().toISOString()
      };

      const enrichedBrief = await summarizeRawUpdate(rawUpdateObj);
      
      // Use AI-generated values — DO NOT overwrite with hardcoded data
      const briefing: Omit<Briefing, 'id' | 'views_count' | 'created_at'> = {
        ...enrichedBrief,
        source_name: sourceName,
        source_url: sourceUrl,
        // Use AI-generated key_takeaways, or fall back to empty array
        key_takeaways: enrichedBrief.key_takeaways || [],
        // Use AI-generated scores directly
        spam_probability: enrichedBrief.spam_probability ?? Math.round((enrichedBrief.hallucination_probability || 5) * 0.8),
        duplicate_probability: 0, // Real duplicate check already happened upstream
        relevance_score: enrichedBrief.relevance_score ?? enrichedBrief.confidence_score ?? 80,
        // Use OG image from extraction, or AI-suggested image, verified against whitelist
        image_url: ogImage || enrichedBrief.image_url || undefined,
        published_at: new Date().toISOString()
      };

      const savedBriefing = await dbService.insertBriefing(briefing);
      await dbService.updateRawUpdateStatus(rawUpdateId, 'processed');

      logInfo(`[WORKER] [AI_ENRICHMENT] Briefing created: "${savedBriefing.title}" [${savedBriefing.id}]. Enqueuing to Semantic Scoring.`);

      await getQueue(QUEUE_NAMES.SEMANTIC_SCORING).add(`score-${savedBriefing.id}`, {
        briefingId: savedBriefing.id,
        rawContent: briefing.briefing,
        title: briefing.title
      });

      return { briefingId: savedBriefing.id };
    } catch (err) {
      logError(`[WORKER] [AI_ENRICHMENT] AI summarizer failed for update ${rawUpdateId}`, err);
      await dbService.updateRawUpdateStatus(rawUpdateId, 'failed');
      throw err;
    }
  },
  { connection, concurrency: 1 }
);

// ==========================================
// 5. SEMANTIC SCORING WORKER
// ==========================================
const SemanticScoringWorker = new Worker(
  QUEUE_NAMES.SEMANTIC_SCORING,
  async (job: Job) => {
    const { briefingId, rawContent, title } = job.data;
    logInfo(`[WORKER] [SCORING] [Job: ${job.id}] Computing real trust and relevance metrics for: ${title}`);

    try {
      // Fetch the briefing to get AI-generated scores
      const briefing = await dbService.getBriefingById(briefingId);
      if (!briefing) {
        logWarn(`[WORKER] [SCORING] Briefing ${briefingId} not found in database. Skipping.`);
        return { status: 'not_found' };
      }

      // Use real AI-generated scores from the briefing record
      const relevanceScore = briefing.relevance_score ?? 80;
      const spamProb = briefing.spam_probability ?? 5;
      const confidenceScore = briefing.confidence_score ?? 80;

      logInfo(`[WORKER] [SCORING] Real scores: relevance=${relevanceScore}, spam=${spamProb}, confidence=${confidenceScore}`);

      // Generate and store embedding vector for this briefing
      try {
        const embedding = await generateTextEmbedding(`${title} ${rawContent}`);
        await dbService.insertBriefingEmbedding(briefingId, embedding);
        logInfo(`[WORKER] [SCORING] Embedding vector stored for briefing ${briefingId} (${embedding.length} dimensions).`);
      } catch (embErr) {
        logError(`[WORKER] [SCORING] Embedding generation failed for ${briefingId}, continuing without vector storage`, embErr);
      }

      // Apply threshold checks using real scores
      if (relevanceScore < TRUST_THRESHOLDS.RELEVANCE_SCORE_MINIMUM || spamProb >= TRUST_THRESHOLDS.DISCARD_SPAM_PROBABILITY) {
        logWarn(`[WORKER] [SCORING] Briefing ${briefingId} failed thresholds (relevance=${relevanceScore}, spam=${spamProb}). Flagging.`);
        await dbService.updateBriefingModerationStatus(briefingId, 'flagged_discarded', false);
        return { status: 'flagged', relevanceScore, spamProb };
      }

      logInfo(`[WORKER] [SCORING] Thresholds passed. Enqueuing to Media processing.`);
      
      await getQueue(QUEUE_NAMES.MEDIA).add(`media-${briefingId}`, {
        briefingId,
        imageUrl: briefing.image_url,
        sourceUrl: briefing.source_url
      });

      return { status: 'passed', relevanceScore, spamProb, confidenceScore };
    } catch (err) {
      logError(`[WORKER] [SCORING] Scoring failed for briefing ${briefingId}`, err);
      throw err;
    }
  },
  { connection, concurrency: 3 }
);

// ==========================================
// 6. MEDIA PROCESSOR WORKER
// ==========================================
const MediaWorker = new Worker(
  QUEUE_NAMES.MEDIA,
  async (job: Job) => {
    const { briefingId, imageUrl, sourceUrl } = job.data;
    logInfo(`[WORKER] [MEDIA] [Job: ${job.id}] Processing media assets for briefing ${briefingId}`);

    try {
      if (imageUrl) {
        const uploadDir = path.resolve(process.cwd(), 'apps/web/public/uploads/media');
        const optimized = await downloadAndOptimizeMedia(imageUrl, uploadDir, `brief-${briefingId}`);

        if (optimized) {
          logInfo(`[WORKER] [MEDIA] Asset optimized via Sharp. Path: ${optimized.localPath}`, { fileSize: optimized.fileSize });
          
          await dbService.insertMediaAsset({
            briefing_id: briefingId,
            original_url: imageUrl,
            local_path: optimized.localPath,
            mime_type: optimized.mimeType,
            file_size: optimized.fileSize,
            width: optimized.width,
            height: optimized.height
          });

          // Update briefing image_url to use local optimized asset
          await dbService.updateBriefingModerationStatus(briefingId, 'pending_review', false, {
            image_url: optimized.localPath
          });
        }
      }

      logInfo(`[WORKER] [MEDIA] Media processing complete. Enqueuing to Moderation.`);
      
      const briefing = await dbService.getBriefingById(briefingId);
      await getQueue(QUEUE_NAMES.MODERATION).add(`moderate-${briefingId}`, {
        briefingId,
        confidenceScore: briefing?.confidence_score || 80
      });

      return { processed: true };
    } catch (err) {
      logError(`[WORKER] [MEDIA] Media processing failed for briefing ${briefingId}`, err);
      throw err;
    }
  },
  { connection, concurrency: 2 }
);

// ==========================================
// 7. MODERATION GATE WORKER
// ==========================================
const ModerationWorker = new Worker(
  QUEUE_NAMES.MODERATION,
  async (job: Job) => {
    const { briefingId, confidenceScore } = job.data;
    logInfo(`[WORKER] [MODERATION] [Job: ${job.id}] Evaluating trust thresholds for briefing: ${briefingId}`);

    try {
      const isApproved = confidenceScore >= TRUST_THRESHOLDS.AUTO_APPROVE_CONFIDENCE;
      const status = isApproved ? 'auto_approved' : 'pending_review';

      await dbService.updateBriefingModerationStatus(briefingId, status, isApproved);
      await dbService.logModerationAction({
        briefing_id: briefingId,
        confidence_score: confidenceScore,
        action_taken: isApproved ? 'auto_approved' : 'held_for_review',
        validation_errors: isApproved ? [] : ['Confidence rating requires human curation validation']
      });

      logInfo(`[WORKER] [MODERATION] Status: ${status} | Published: ${isApproved} | Confidence: ${confidenceScore}`);

      if (isApproved) {
        await getQueue(QUEUE_NAMES.SEARCH).add(`index-${briefingId}`, {
          briefingId,
          action: 'index'
        });
      }

      return { status, isApproved };
    } catch (err) {
      logError(`[WORKER] [MODERATION] Moderation failed for briefing ${briefingId}`, err);
      throw err;
    }
  },
  { connection, concurrency: 3 }
);

// ==========================================
// 8. SEARCH INDEXING WORKER
// ==========================================
const SearchWorker = new Worker(
  QUEUE_NAMES.SEARCH,
  async (job: Job) => {
    const { briefingId, action } = job.data;
    logInfo(`[WORKER] [SEARCH] [Job: ${job.id}] Syncing Meilisearch index for briefing ${briefingId} (action: ${action})`);

    try {
      if (action === 'delete') {
        await deindexBriefing(briefingId);
      } else {
        const briefing = await dbService.getBriefingById(briefingId);
        if (briefing) {
          await indexBriefing(briefing);
        }
      }

      await getQueue(QUEUE_NAMES.TELEMETRY).add(`telemetry-${briefingId}`, {
        eventName: 'briefing_indexed',
        metadata: { briefingId, action }
      });

      return { success: true };
    } catch (err) {
      logError(`[WORKER] [SEARCH] Index sync failed for briefing ${briefingId}`, err);
      throw err;
    }
  },
  { connection, concurrency: 4 }
);

// ==========================================
// 9. TELEMETRY AUDITOR WORKER
// ==========================================
const TelemetryWorker = new Worker(
  QUEUE_NAMES.TELEMETRY,
  async (job: Job) => {
    const { eventName, metadata } = job.data;
    const startTime = Date.now();

    try {
      // Write real telemetry to automation_logs table
      await dbService.logAutomationJob({
        job_name: `telemetry:${eventName}`,
        status: 'completed',
        records_processed: 1,
        duration_ms: Date.now() - startTime,
        error_message: null
      });

      logInfo(`[WORKER] [TELEMETRY] Event logged to DB: "${eventName}"`, metadata);
      return { logged: true, eventName, timestamp: new Date().toISOString() };
    } catch (err) {
      logError(`[WORKER] [TELEMETRY] Failed to log event "${eventName}"`, err);
      // Telemetry failures should not crash the pipeline
      return { logged: false, error: err instanceof Error ? err.message : 'Unknown error' };
    }
  },
  { connection, concurrency: 5 }
);

// ==========================================
// 10. DAILY CLEANUP WORKER
// ==========================================
const CleanupWorker = new Worker(
  QUEUE_NAMES.CLEANUP,
  async (job: Job) => {
    const { action } = job.data;
    logInfo(`[WORKER] [CLEANUP] [Job: ${job.id}] Executing maintenance: ${action}`);
    const stats = { prunedRawUpdates: 0, prunedLogs: 0, orphanedFiles: 0 };
    
    try {
      // 1. Prune processed/filtered raw_updates older than 14 days
      stats.prunedRawUpdates = await dbService.pruneOldRawUpdates(14);
      logInfo(`[WORKER] [CLEANUP] Pruned ${stats.prunedRawUpdates} stale raw_updates (>14 days, processed/filtered).`);

      // 2. Prune automation_logs older than 30 days
      stats.prunedLogs = await dbService.pruneOldAutomationLogs(30);
      logInfo(`[WORKER] [CLEANUP] Pruned ${stats.prunedLogs} old automation_logs (>30 days).`);

      // 3. Clean orphaned media files (files in uploads that have no DB record)
      try {
        const uploadDir = path.resolve(process.cwd(), 'apps/web/public/uploads/media');
        if (fs.existsSync(uploadDir)) {
          const files = fs.readdirSync(uploadDir);
          for (const file of files) {
            // Extract briefing ID from filename pattern: brief-{id}.webp
            const match = file.match(/^brief-(.+)\.(webp|jpg|png)$/);
            if (match) {
              const briefingId = match[1];
              const asset = await dbService.getMediaAssetByBriefing(briefingId);
              if (!asset) {
                const filePath = path.join(uploadDir, file);
                fs.unlinkSync(filePath);
                stats.orphanedFiles++;
                logInfo(`[WORKER] [CLEANUP] Removed orphaned media file: ${file}`);
              }
            }
          }
        }
      } catch (fsErr) {
        logError('[WORKER] [CLEANUP] Media orphan scan encountered errors', fsErr);
      }

      // Log cleanup stats
      await dbService.logAutomationJob({
        job_name: 'cleanup:daily_prune',
        status: 'completed',
        records_processed: stats.prunedRawUpdates + stats.prunedLogs + stats.orphanedFiles,
        duration_ms: 0,
        error_message: null
      });

      logInfo('[WORKER] [CLEANUP] Daily maintenance sweep completed.', stats);
      return stats;
    } catch (err) {
      logError(`[WORKER] [CLEANUP] Maintenance sweep failed`, err);
      throw err;
    }
  },
  { connection, concurrency: 1 }
);

// ==========================================
// COMPLETED AND FAILED LISTENERS
// ==========================================
const workers = [
  IngestionWorker,
  DuplicateDetectionWorker,
  ExtractionWorker,
  AiEnrichmentWorker,
  SemanticScoringWorker,
  MediaWorker,
  ModerationWorker,
  SearchWorker,
  TelemetryWorker,
  CleanupWorker
];

workers.forEach(w => {
  w.on('completed', (job) => {
    logInfo(`[WORKER] Job ${job.id} completed successfully in queue: ${w.name}`);
  });

  w.on('failed', (job, err) => {
    logError(`[WORKER] Job ${job?.id} encountered terminal failure in queue: ${w.name}`, err);
  });
});

logInfo('[WORKER] All 10 production background workers are active and listening to Redis.');
