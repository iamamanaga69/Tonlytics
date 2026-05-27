import http from 'http';
import { getQueue, getRedisConnection } from 'queues';
import { dbService, isSupabaseConfigured, supabase } from 'database';
import { logInfo, logError } from 'telemetry';
import { VERIFIED_SOURCES } from 'config';

const port = process.env.PORT || 3008;

logInfo('[SCHEDULER] Starting Tonlytics Cron and Job Scheduler...');

/**
 * Sync and seed whitelisted verified sources into the Database.
 */
async function seedVerifiedSources(): Promise<void> {
  try {
    const existingSources = await dbService.getSources();
    
    // Convert verified config seeds into Database records if not exist
    const sourcesToInsert = VERIFIED_SOURCES.filter(v => 
      !existingSources.some(e => e.url === v.url)
    );

    if (sourcesToInsert.length > 0) {
      logInfo(`[SCHEDULER] Seeding ${sourcesToInsert.length} verified ecosystem sources...`);
      const inserted = await dbService.insertSources(sourcesToInsert);
      logInfo(`[SCHEDULER] Successfully seeded ${inserted} new sources into database.`);
    } else {
      logInfo('[SCHEDULER] All verified sources already exist in database. No seeding required.');
    }
  } catch (error) {
    logError('[SCHEDULER] Failed to seed verified sources:', error);
  }
}

/**
 * Schedule periodic crawls for all active sources.
 * Sets up cron repetitions for BullMQ queues.
 */
async function scheduleEcosystemCrawlers(): Promise<void> {
  try {
    const ingestionQueue = getQueue('INGESTION');
    const sources = await dbService.getSources();
    logInfo(`[SCHEDULER] Scheduling crawler tasks for ${sources.length} active sources.`);

    for (const source of sources) {
      const jobId = `crawl-${source.id}`;
      
      // Determine frequency depending on source type
      // RSS: every 15 mins. GitHub/Telegram: every hour.
      const cronPattern = source.source_type === 'rss' 
        ? '*/15 * * * *' // Every 15 minutes
        : '0 * * * *';   // Every hour

      logInfo(`[SCHEDULER] Registering crawler cron for "${source.name}" | Type: ${source.source_type} | Cron: ${cronPattern}`);

      await ingestionQueue.add(
        'crawl-source',
        {
          sourceId: source.id,
          sourceUrl: source.url,
          sourceType: source.source_type
        },
        {
          jobId,
          repeat: { pattern: cronPattern }
        }
      );
    }
  } catch (error) {
    logError('[SCHEDULER] Failed to schedule crawlers:', error);
  }
}

/**
 * Schedule daily maintenance sweeps and cache cleanups.
 */
async function scheduleCleanupTrigger(): Promise<void> {
  try {
    const cleanupQueue = getQueue('CLEANUP');
    const cronPattern = '0 0 * * *'; // Every night at midnight

    logInfo(`[SCHEDULER] Registering daily cleanup maintenance cron | Cron: ${cronPattern}`);

    await cleanupQueue.add(
      'prune-stale-data',
      { action: 'daily_prune' },
      { repeat: { pattern: cronPattern } }
    );
  } catch (error) {
    logError('[SCHEDULER] Failed to schedule cleanup task:', error);
  }
}

// Start orchestration
const orchestrate = async () => {
  try {
    await seedVerifiedSources();
    await scheduleEcosystemCrawlers();
    await scheduleCleanupTrigger();
    logInfo('[SCHEDULER] All cron orchestrations registered successfully. Scheduler running.');
  } catch (err) {
    logError('[SCHEDULER] Orchestration registration failed:', err);
  }
};

// Start a simple HTTP server to keep the service running and satisfy health checks on Railway
const server = http.createServer(async (req, res) => {
  if (req.url === '/api/health' || req.url === '/health' || req.url === '/') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      status: 'healthy',
      service: 'scheduler',
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
  logInfo(`[STARTUP] Service: scheduler`);
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
  logInfo(`[SCHEDULER] Tonlytics Scheduler Server successfully running on port ${port}`);

  // Run orchestration registration
  await orchestrate();
});
