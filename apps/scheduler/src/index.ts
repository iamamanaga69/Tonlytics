import { getQueue } from 'queues';
import { dbService } from 'database';
import { logInfo, logError } from 'telemetry';
import { VERIFIED_SOURCES } from 'config';

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
  const ingestionQueue = getQueue('INGESTION');

  try {
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
  const cleanupQueue = getQueue('CLEANUP');
  const cronPattern = '0 0 * * *'; // Every night at midnight

  logInfo(`[SCHEDULER] Registering daily cleanup maintenance cron | Cron: ${cronPattern}`);

  await cleanupQueue.add(
    'prune-stale-data',
    { action: 'daily_prune' },
    { repeat: { pattern: cronPattern } }
  );
}

// Start orchestration
(async () => {
  await seedVerifiedSources();
  await scheduleEcosystemCrawlers();
  await scheduleCleanupTrigger();
  logInfo('[SCHEDULER] All cron orchestrations registered successfully. Scheduler running.');
})();
