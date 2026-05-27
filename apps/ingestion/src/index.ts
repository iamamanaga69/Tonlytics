import http from 'http';
import { dbService, isSupabaseConfigured, supabase, supabaseAdmin, runDbMigrations } from 'database';
import { logInfo, logError, logWarn } from 'telemetry';
import { fetchRssFeed, extractOpenGraph, parseGithubReleases } from 'extraction';
import { VERIFIED_SOURCES, TRUST_THRESHOLDS } from 'config';
import { summarizeRawUpdate } from 'ai';
import type { RawUpdate } from 'types';

const port = process.env.PORT || 3006;

logInfo('[INGESTION] Bootstrapping Tonlytics crawler engine...');

// Relevance helpers
const RELEVANCE_KEYWORDS = ['ton', 'telegram', 'wallet', 'usdt', 'stablecoin', 'jetton', 'nft', 'mini app', 'tact', 'func', 'dex', 'defi', 'toncoin', 'blockchain', 'crypto', 'web3', 'sdk', 'bot', 'channel', 'validator', 'governance'];

/**
 * Calculate keyword relevance count.
 */
function getRelevanceCount(title: string, content: string): number {
  const text = `${title} ${content}`.toLowerCase();
  let count = 0;
  RELEVANCE_KEYWORDS.forEach(kw => {
    if (text.includes(kw)) count++;
  });
  return count;
}

/**
 * Seed verified ecosystem sources into Supabase if they don't already exist.
 */
async function seedVerifiedSources(): Promise<void> {
  logInfo(`[INGESTION] Seeding ${VERIFIED_SOURCES.length} verified ecosystem sources...`);
  try {
    const inserted = await dbService.insertSources(VERIFIED_SOURCES);
    logInfo(`[INGESTION] Source seeding complete. Inserted ${inserted} new sources.`);
  } catch (error) {
    logError('[INGESTION] Source seeding failed:', error);
  }
}

/**
 * Run a crawler pass across all active whitelisted sources.
 * Filters are relaxed — the source itself is already whitelisted,
 * so we only check keyword relevance (not domain credibility of each link).
 */
export async function runIngestionPass(): Promise<number> {
  logInfo('[INGESTION] ========== STARTING INGESTION PASS ==========');
  let totalIngested = 0;

  try {
    const sources = await dbService.getSources();
    logInfo(`[INGESTION] Found ${sources.length} active sources in database.`);

    if (sources.length === 0) {
      logWarn('[INGESTION] No sources found! Attempting to re-seed verified sources...');
      await seedVerifiedSources();
      // Try again
      const retriedSources = await dbService.getSources();
      logInfo(`[INGESTION] After re-seed: ${retriedSources.length} sources found.`);
      if (retriedSources.length === 0) {
        logError('[INGESTION] Still no sources after re-seed. Check Supabase connection.');
        return 0;
      }
      // Continue with retried sources
      return runIngestionPassForSources(retriedSources);
    }

    return runIngestionPassForSources(sources);
  } catch (error) {
    logError('[INGESTION] Ingestion pass encountered critical failures:', error);
    return 0;
  }
}

async function runIngestionPassForSources(sources: any[]): Promise<number> {
  let totalIngested = 0;

  for (const source of sources) {
    try {
      if (source.reliability_score < 3) {
        logWarn(`[INGESTION] Skipping "${source.name}" — reliability score too low (${source.reliability_score})`);
        continue;
      }

      logInfo(`[INGESTION] Crawling: "${source.name}" | Type: ${source.source_type} | URL: ${source.url}`);

      if (source.source_type === 'github') {
        try {
          const releases = await parseGithubReleases(source.url);
          logInfo(`[INGESTION]   → GitHub: ${releases.length} releases fetched`);

          // Relaxed filter: only check keyword relevance, NOT domain credibility
          const relevant = releases.slice(0, 5).filter(r => {
            const score = getRelevanceCount(r.title, r.content);
            return score >= 1;
          });
          logInfo(`[INGESTION]   → GitHub: ${relevant.length}/${releases.slice(0, 5).length} passed relevance filter`);

          if (relevant.length > 0) {
            const mapped = relevant.map(r => ({
              source_id: source.id,
              external_id: r.tag,
              source_url: `${source.url}/tag/${r.tag}`,
              raw_title: `${source.name}: ${r.title}`,
              raw_content: r.content,
              publish_date: r.date
            }));
            const added = await dbService.insertRawUpdates(mapped);
            totalIngested += added;
            logInfo(`[INGESTION]   → GitHub: ${added} new raw_updates inserted`);
          }
        } catch (githubErr) {
          logError(`[INGESTION]   → GitHub crawl FAILED for "${source.name}":`, githubErr);
        }

      } else if (source.source_type === 'rss') {
        try {
          const items = await fetchRssFeed(source.url);
          logInfo(`[INGESTION]   → RSS: ${items.length} items fetched`);

          // Relaxed filter: only check keyword relevance
          const relevant = items.slice(0, 5).filter(i => {
            const score = getRelevanceCount(i.title, i.content);
            return score >= 1;
          });
          logInfo(`[INGESTION]   → RSS: ${relevant.length}/${items.slice(0, 5).length} passed relevance filter`);

          // If ZERO items passed relevance filter but we have items, ingest them anyway
          // (the source itself is verified/whitelisted, so all content is relevant)
          const toIngest = relevant.length > 0 ? relevant : items.slice(0, 3);
          logInfo(`[INGESTION]   → RSS: Ingesting ${toIngest.length} items (${relevant.length > 0 ? 'filtered' : 'unfiltered fallback'})`);

          if (toIngest.length > 0) {
            const mapped = toIngest.map(i => ({
              source_id: source.id,
              source_url: i.link,
              raw_title: i.title,
              raw_content: i.content || i.title,
              publish_date: i.pubDate || new Date().toISOString()
            }));
            const added = await dbService.insertRawUpdates(mapped);
            totalIngested += added;
            logInfo(`[INGESTION]   → RSS: ${added} new raw_updates inserted`);
          }
        } catch (rssErr) {
          logError(`[INGESTION]   → RSS crawl FAILED for "${source.name}":`, rssErr);
        }

      } else if (source.source_type === 'telegram') {
        try {
          const response = await fetch(source.url, {
            headers: { 'User-Agent': 'Tonlytics-Crawler/1.0' }
          });

          if (response.ok) {
            const html = await response.text();
            const cheerio = await import('cheerio');
            const $ = cheerio.load(html);
            const posts: { title: string; content: string; date: string; link: string }[] = [];

            $('.tgme_widget_message').each((_, el) => {
              const textEl = $(el).find('.tgme_widget_message_text');
              const dateEl = $(el).find('.tgme_widget_message_date time');
              const linkEl = $(el).find('.tgme_widget_message_date');
              const text = textEl.text().trim();
              const date = dateEl.attr('datetime') || new Date().toISOString();
              const link = linkEl.attr('href') || source.url;

              if (text && text.length > 20) {
                posts.push({
                  title: text.slice(0, 100).replace(/\n/g, ' ').trim(),
                  content: text,
                  date,
                  link
                });
              }
            });

            logInfo(`[INGESTION]   → Telegram: ${posts.length} posts scraped from "${source.name}"`);

            // Relaxed filter — Telegram posts from verified channels are all relevant
            const toIngest = posts.slice(0, 5);

            if (toIngest.length > 0) {
              const mapped = toIngest.map(p => ({
                source_id: source.id,
                source_url: p.link,
                raw_title: p.title,
                raw_content: p.content,
                publish_date: p.date
              }));
              const added = await dbService.insertRawUpdates(mapped);
              totalIngested += added;
              logInfo(`[INGESTION]   → Telegram: ${added} new raw_updates inserted`);
            }
          } else {
            logWarn(`[INGESTION]   → Telegram: HTTP ${response.status} for "${source.name}"`);
          }
        } catch (tgErr) {
          logError(`[INGESTION]   → Telegram crawl FAILED for "${source.name}":`, tgErr);
        }
      }
    } catch (sourceError) {
      logError(`[INGESTION] Error processing source "${source.name}" (${source.url}):`, sourceError);
    }
  }

  logInfo(`[INGESTION] ========== INGESTION PASS COMPLETE: ${totalIngested} new raw updates ==========`);
  return totalIngested;
}

/**
 * DIRECT PROCESSING PIPELINE
 * Converts pending raw_updates into published briefings WITHOUT requiring
 * Redis/BullMQ. This is the critical missing link in the pipeline.
 */
async function processRawUpdatesToBriefings(): Promise<number> {
  logInfo('[PROCESSING] ========== STARTING DIRECT PROCESSING PASS ==========');
  let processed = 0;

  try {
    const pendingUpdates = await dbService.getPendingRawUpdates(10);
    logInfo(`[PROCESSING] Found ${pendingUpdates.length} pending raw_updates to process`);

    if (pendingUpdates.length === 0) {
      logInfo('[PROCESSING] No pending updates to process.');
      return 0;
    }

    for (const rawUpdate of pendingUpdates) {
      try {
        logInfo(`[PROCESSING] Processing raw_update: "${rawUpdate.raw_title}" (${rawUpdate.id})`);

        // Step 1: Run AI summarization (uses Gemini/OpenAI if configured, otherwise mock)
        const enriched = await summarizeRawUpdate(rawUpdate);
        logInfo(`[PROCESSING]   → AI enriched: title="${enriched.title}", category="${enriched.category}", confidence=${enriched.confidence_score}`);

        // Step 2: Insert the briefing into Supabase
        const briefing = await dbService.insertBriefing({
          ...enriched,
          source_name: rawUpdate.source_id ? (await dbService.getSourceById(rawUpdate.source_id))?.name || 'Unknown' : 'Unknown',
          source_url: rawUpdate.source_url,
          key_takeaways: enriched.key_takeaways || [],
          spam_probability: enriched.spam_probability || 0,
          duplicate_probability: 0,
          relevance_score: enriched.relevance_score || enriched.confidence_score || 80,
          image_url: enriched.image_url || undefined,
          published_at: new Date().toISOString()
        });

        logInfo(`[PROCESSING]   → Briefing created: "${briefing.title}" (${briefing.id})`);

        // Step 3: Mark the raw_update as processed
        await dbService.updateRawUpdateStatus(rawUpdate.id, 'processed');
        processed++;

        logInfo(`[PROCESSING]   → Raw update marked as processed. Total processed: ${processed}`);
      } catch (updateError) {
        logError(`[PROCESSING] Failed to process raw_update "${rawUpdate.raw_title}" (${rawUpdate.id}):`, updateError);
        
        // Increment retry count but don't block the pipeline
        try {
          await dbService.updateRawUpdateStatus(
            rawUpdate.id,
            'failed',
            (rawUpdate.retry_count || 0) + 1
          );
        } catch (statusErr) {
          logError('[PROCESSING] Failed to update retry status:', statusErr);
        }
      }
    }
  } catch (error) {
    logError('[PROCESSING] Direct processing pipeline encountered critical failure:', error);
  }

  logInfo(`[PROCESSING] ========== PROCESSING PASS COMPLETE: ${processed} briefings created ==========`);
  return processed;
}

/**
 * Full pipeline: ingest + process
 */
async function runFullPipeline(): Promise<{ ingested: number; processed: number }> {
  const ingested = await runIngestionPass();
  const processed = await processRawUpdatesToBriefings();
  return { ingested, processed };
}

// ==========================================
// HTTP SERVER WITH HEALTH + DEBUG ENDPOINTS
// ==========================================
const server = http.createServer(async (req, res) => {
  // Health check
  if (req.url === '/api/health' || req.url === '/health' || req.url === '/') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      status: 'healthy',
      service: 'ingestion',
      uptime: process.uptime(),
      timestamp: new Date().toISOString()
    }));
    return;
  }
  
  // Manual ingestion trigger
  if (req.url === '/api/ingest' && req.method === 'POST') {
    logInfo('[INGESTION] Manual ingestion trigger received via HTTP endpoint...');
    runFullPipeline().then(({ ingested, processed }) => {
      logInfo(`[INGESTION] HTTP-triggered pipeline finished. Ingested: ${ingested}, Processed: ${processed}`);
    }).catch(err => {
      logError('[INGESTION] Manual trigger error:', err);
    });
    res.writeHead(202, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ success: true, message: 'Full pipeline triggered asynchronously' }));
    return;
  }

  // Test ingestion — runs a single RSS source synchronously and returns results
  if (req.url === '/api/test-ingestion') {
    logInfo('[INGESTION] Test ingestion endpoint triggered...');
    try {
      const testUrl = 'https://ton.org/en/blog/rss';
      logInfo(`[INGESTION] Test: Fetching RSS from ${testUrl}`);
      
      const items = await fetchRssFeed(testUrl);
      logInfo(`[INGESTION] Test: Got ${items.length} RSS items`);

      const results: any[] = [];
      for (const item of items.slice(0, 2)) {
        try {
          // Create a mock RawUpdate for AI processing
          const mockRawUpdate: RawUpdate = {
            id: `test-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
            source_id: 'test-source',
            source_url: item.link,
            raw_title: item.title,
            raw_content: item.content || item.title,
            publish_date: item.pubDate || new Date().toISOString(),
            status: 'pending',
            retry_count: 0,
            created_at: new Date().toISOString()
          };

          const enriched = await summarizeRawUpdate(mockRawUpdate);
          results.push({
            original_title: item.title,
            enriched_title: enriched.title,
            category: enriched.category,
            confidence: enriched.confidence_score,
            moderation_status: enriched.moderation_status,
            tags: enriched.tags,
            briefing_preview: enriched.briefing?.slice(0, 200)
          });
        } catch (procErr) {
          results.push({
            original_title: item.title,
            error: procErr instanceof Error ? procErr.message : 'Processing failed'
          });
        }
      }

      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        success: true,
        source: testUrl,
        items_fetched: items.length,
        items_processed: results.length,
        results,
        timestamp: new Date().toISOString()
      }, null, 2));
    } catch (err) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        success: false,
        error: err instanceof Error ? err.message : 'Test ingestion failed',
        timestamp: new Date().toISOString()
      }));
    }
    return;
  }

  // Debug endpoint — diagnostic info
  if (req.url === '/api/debug') {
    logInfo('[INGESTION] Debug endpoint triggered...');
    try {
      const diagnostics: any = {
        service: 'ingestion',
        uptime: process.uptime(),
        timestamp: new Date().toISOString(),
        environment: {
          NODE_ENV: process.env.NODE_ENV || 'development',
          SUPABASE_URL: process.env.SUPABASE_URL ? 'SET' : 'NOT SET',
          SUPABASE_ANON_KEY: process.env.SUPABASE_ANON_KEY ? 'SET' : 'NOT SET',
          SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY ? 'SET' : 'NOT SET',
          DATABASE_URL: process.env.DATABASE_URL ? 'SET' : 'NOT SET',
          REDIS_URL: process.env.REDIS_URL ? 'SET' : 'NOT SET',
          GEMINI_API_KEY: process.env.GEMINI_API_KEY ? 'SET' : 'NOT SET',
          OPENAI_API_KEY: process.env.OPENAI_API_KEY ? 'SET' : 'NOT SET',
          isSupabaseConfigured
        },
        database: {
          sources: 0,
          raw_updates_pending: 0,
          briefings: 0
        }
      };

      // Query database stats
      try {
        const sources = await dbService.getSources();
        diagnostics.database.sources = sources.length;
        diagnostics.database.source_names = sources.map((s: any) => `${s.name} (${s.source_type})`);
      } catch (e) {
        diagnostics.database.sources_error = e instanceof Error ? e.message : 'Query failed';
      }

      try {
        const pending = await dbService.getPendingRawUpdates(100);
        diagnostics.database.raw_updates_pending = pending.length;
      } catch (e) {
        diagnostics.database.raw_updates_error = e instanceof Error ? e.message : 'Query failed';
      }

      try {
        const briefings = await dbService.getBriefings();
        diagnostics.database.briefings = briefings.length;
        if (briefings.length > 0) {
          diagnostics.database.latest_briefing = {
            title: briefings[0].title,
            category: briefings[0].category,
            published_at: briefings[0].published_at,
            moderation_status: briefings[0].moderation_status
          };
        }
      } catch (e) {
        diagnostics.database.briefings_error = e instanceof Error ? e.message : 'Query failed';
      }

      // Check Supabase direct connection
      if (isSupabaseConfigured && supabaseAdmin) {
        try {
          const { count, error } = await supabaseAdmin.from('briefings').select('*', { count: 'exact', head: true });
          diagnostics.database.supabase_briefing_count = count;
          if (error) diagnostics.database.supabase_error = error.message;
        } catch (e) {
          diagnostics.database.supabase_connection = 'FAILED';
        }
      }

      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(diagnostics, null, 2));
    } catch (err) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: err instanceof Error ? err.message : 'Debug check failed' }));
    }
    return;
  }

  res.writeHead(404);
  res.end('Not Found');
});

server.listen(port, async () => {
  logInfo('==================================================');
  logInfo(`[STARTUP] Service: ingestion`);
  logInfo(`[STARTUP] Port: ${port}`);
  logInfo(`[STARTUP] Environment: ${process.env.NODE_ENV || 'development'}`);
  logInfo(`[STARTUP] Database Configured: ${!!process.env.DATABASE_URL}`);
  logInfo(`[STARTUP] Supabase Configured: ${isSupabaseConfigured}`);
  logInfo(`[STARTUP] Supabase URL: ${process.env.SUPABASE_URL ? 'SET' : 'NOT SET'}`);
  logInfo(`[STARTUP] Service Role Key: ${process.env.SUPABASE_SERVICE_ROLE_KEY ? 'SET' : 'NOT SET'}`);
  logInfo(`[STARTUP] AI (Gemini): ${process.env.GEMINI_API_KEY ? 'SET' : 'NOT SET'}`);
  logInfo(`[STARTUP] AI (OpenAI): ${process.env.OPENAI_API_KEY ? 'SET' : 'NOT SET'}`);

  // Run database migrations
  if (process.env.DATABASE_URL) {
    try {
      await runDbMigrations();
      logInfo('[STARTUP] Database migrations: COMPLETED');
    } catch (migErr) {
      logError('[STARTUP] Database migrations: FAILED', migErr);
    }
  }

  // Supabase connection check
  if (isSupabaseConfigured && supabase) {
    try {
      const { error } = await supabase.from('sources').select('id').limit(1);
      if (error) throw error;
      logInfo('[STARTUP] Supabase Connection: SUCCESSFUL');
    } catch (err) {
      logError('[STARTUP] Supabase Connection: FAILED', err);
    }
  } else {
    logWarn('[STARTUP] Supabase Connection: SKIPPED (Not configured)');
  }

  // Redis check (non-fatal)
  try {
    const { getRedisConnection } = await import('queues');
    const redis = getRedisConnection();
    const pong = await redis.ping();
    logInfo(`[STARTUP] Redis Connection: SUCCESSFUL (${pong})`);
  } catch (err) {
    logWarn('[STARTUP] Redis Connection: NOT AVAILABLE (queues will use direct processing)');
  }

  logInfo('==================================================');
  logInfo(`[INGESTION] Tonlytics Ingestion Server running on port ${port}`);

  // Step 1: Seed verified sources
  await seedVerifiedSources();

  // Step 2: Run initial full pipeline (ingest + process)
  logInfo('[STARTUP] Running initial full pipeline...');
  runFullPipeline().then(({ ingested, processed }) => {
    logInfo(`[STARTUP] Initial pipeline complete. Ingested: ${ingested}, Processed: ${processed}`);
  }).catch(err => {
    logError('[STARTUP] Initial pipeline error:', err);
  });

  // Step 3: Schedule periodic pipeline runs
  setInterval(() => {
    logInfo('[SCHEDULER] Starting scheduled pipeline run...');
    runFullPipeline().then(({ ingested, processed }) => {
      logInfo(`[SCHEDULER] Scheduled pipeline complete. Ingested: ${ingested}, Processed: ${processed}`);
    }).catch(err => {
      logError('[SCHEDULER] Scheduled pipeline error:', err);
    });
  }, 15 * 60 * 1000); // Every 15 minutes
});
