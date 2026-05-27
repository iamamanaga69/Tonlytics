import http from 'http';
import { dbService, isSupabaseConfigured, supabase } from 'database';
import { logInfo, logError, logWarn } from 'telemetry';
import { fetchRssFeed, extractOpenGraph, parseGithubReleases } from 'extraction';
import { VERIFIED_SOURCES, TRUST_THRESHOLDS } from 'config';
import { getRedisConnection } from 'queues';

const port = process.env.PORT || 3006;

logInfo('[INGESTION] Bootstrapping Tonlytics crawler playground...');

// Whitelist and relevance helpers
const TRUSTED_DOMAINS = ['ton.org', 'telegram.org', 'github.com', 'ston.fi', 'getgems.io', 'tether.to', 'tonkeeper.com'];
const RELEVANCE_KEYWORDS = ['ton', 'telegram', 'wallet', 'usdt', 'stablecoin', 'jetton', 'nft', 'mini app'];

/**
 * Validate domain credibility.
 */
function isCredibleSource(url: string): boolean {
  try {
    const parsed = new URL(url);
    return TRUSTED_DOMAINS.some(d => parsed.hostname === d || parsed.hostname.endsWith('.' + d));
  } catch {
    return false;
  }
}

/**
 * Calculate keyword relevance count.
 */
function getRelevanceCount(title: string, content: string): number {
  const text = `${title} ${content}`.toLowerCase();
  let count = 0;
  RELEVANCE_KEYWORDS.forEach(kw => {
    const matches = text.match(new RegExp(`\\b${kw}\\b`, 'gi'));
    if (matches) count += matches.length;
  });
  return count;
}

/**
 * Run a crawler pass across all active whitelisted sources.
 */
export async function runIngestionPass(): Promise<number> {
  logInfo('[INGESTION] Launching active sources ingestion pass...');
  let totalIngested = 0;

  try {
    const sources = await dbService.getSources();
    
    for (const source of sources) {
      try {
        if (source.reliability_score < 3) {
          logWarn(`[INGESTION] Skipping source ${source.name} due to low reliability score (${source.reliability_score})`);
          continue;
        }

        logInfo(`[INGESTION] Crawling source "${source.name}" (${source.source_type})...`);

        if (source.source_type === 'github') {
          const releases = await parseGithubReleases(source.url);
          const mapped = releases.slice(0, 3).filter(r => isCredibleSource(source.url) && getRelevanceCount(r.title, r.content) >= 1).map(r => ({
            source_id: source.id,
            external_id: r.tag,
            source_url: `${source.url}/tag/${r.tag}`,
            raw_title: `${source.name}: ${r.title}`,
            raw_content: r.content,
            publish_date: r.date
          }));

          if (mapped.length > 0) {
            const added = await dbService.insertRawUpdates(mapped);
            totalIngested += added;
          }
        } else {
          const items = await fetchRssFeed(source.url);
          const mapped = items.slice(0, 3).filter(i => isCredibleSource(i.link) && getRelevanceCount(i.title, i.content) >= 1).map(i => ({
            source_id: source.id,
            source_url: i.link,
            raw_title: i.title,
            raw_content: i.content,
            publish_date: i.pubDate
          }));

          if (mapped.length > 0) {
            const added = await dbService.insertRawUpdates(mapped);
            totalIngested += added;
          }
        }
      } catch (sourceError) {
        // Individual source failures are logged and caught so they don't break the entire ingestion run
        logError(`[INGESTION] Error processing source "${source.name}" (${source.url}):`, sourceError);
      }
    }

    logInfo(`[INGESTION] Ingestion pass completed. Ingested ${totalIngested} new updates.`);
  } catch (error) {
    logError('[INGESTION] Ingestion pass encountered critical failures:', error);
  }

  return totalIngested;
}

// Start a simple HTTP server to keep the service running and satisfy health checks on Railway
const server = http.createServer(async (req, res) => {
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
  
  if (req.url === '/api/ingest' && req.method === 'POST') {
    logInfo('[INGESTION] Manual ingestion trigger received via HTTP endpoint...');
    runIngestionPass().then((count) => {
      logInfo(`[INGESTION] HTTP-triggered pass finished. Ingested: ${count}`);
    }).catch(err => {
      logError('[INGESTION] Manual trigger error:', err);
    });
    res.writeHead(202, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ success: true, message: 'Ingestion pass triggered asynchronously' }));
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
    const redis = getRedisConnection();
    const pong = await redis.ping();
    logInfo(`[STARTUP] Redis Connection (Queues): SUCCESSFUL (${pong})`);
  } catch (err) {
    logError('[STARTUP] Redis Connection (Queues): FAILED', err);
  }

  logInfo('==================================================');
  logInfo(`[INGESTION] Tonlytics Ingestion Server successfully running on port ${port}`);

  // Run initial pass
  runIngestionPass().then((count) => {
    logInfo(`[INGESTION] Initial startup pass finished. Ingested: ${count}`);
  }).catch(err => {
    logError('[INGESTION] Initial startup pass error:', err);
  });

  // Periodically run ingestion pass
  setInterval(() => {
    runIngestionPass().then((count) => {
      logInfo(`[INGESTION] Scheduled pass finished. Ingested: ${count}`);
    }).catch(err => {
      logError('[INGESTION] Scheduled pass error:', err);
    });
  }, 30 * 60 * 1000); // Every 30 minutes
});
