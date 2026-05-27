import { NextResponse } from 'next/server';
import { getQueue } from 'queues';
import { dbService } from 'database';
import { logInfo, logError } from 'telemetry';
import { news } from '@/lib/services/news';

const CRON_SECRET = process.env.CRON_SECRET || 'dev_secret_token';

export async function GET(request: Request) {
  const startTime = Date.now();
  
  // Enforce Bearer Token authorization to prevent public invocation
  const authHeader = request.headers.get('Authorization');
  const isDev = process.env.NODE_ENV === 'development';
  const expectedAuth = `Bearer ${CRON_SECRET}`;
  
  if (!isDev && authHeader !== expectedAuth) {
    return NextResponse.json(
      { error: 'Unauthorized access header missing or invalid' },
      { status: 401 }
    );
  }

  try {
    const activeSources = await dbService.getSources();
    
    if (activeSources.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No active trusted sources configured. Ingestion idle.'
      });
    }

    // Run inline if REDIS_URL is not configured (Vercel serverless / low-memory local)
    const hasRedis = !!process.env.REDIS_URL;
    if (!hasRedis) {
      console.log('[API CRON INGEST] REDIS_URL not configured. Executing inline crawler sweep...');
      const inlineResult = await news.runInlineCrawler();
      const duration = Date.now() - startTime;
      return NextResponse.json({
        success: true,
        mode: 'inline',
        records_processed: inlineResult.processed,
        records_skipped: inlineResult.skipped,
        records_failed: inlineResult.failed,
        duration_ms: duration
      });
    }

    const ingestionQueue = getQueue('INGESTION');
    let enqueuedCount = 0;

    for (const source of activeSources) {
      if (!source.is_active) continue;
      
      // Push ingestion crawling job to the queue
      await ingestionQueue.add('crawl-source', {
        sourceId: source.id,
        sourceUrl: source.url,
        sourceType: source.source_type
      });
      
      enqueuedCount++;
    }

    const duration = Date.now() - startTime;
    
    logInfo(`[API CRON INGEST] Enqueued ${enqueuedCount} crawler jobs in BullMQ in ${duration}ms`);

    return NextResponse.json({
      success: true,
      job: 'ingestion_enqueue',
      sources_enqueued: enqueuedCount,
      duration_ms: duration
    });
  } catch (error) {
    const duration = Date.now() - startTime;
    const errorMsg = error instanceof Error ? error.message : 'Unknown cron trigger failure';
    
    logError('[API CRON INGEST] Failed to enqueue crawler triggers:', error, { duration_ms: duration });
    
    return NextResponse.json(
      { error: errorMsg, duration_ms: duration },
      { status: 500 }
    );
  }
}
