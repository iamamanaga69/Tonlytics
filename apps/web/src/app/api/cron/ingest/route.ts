import { NextResponse } from 'next/server';
import { getQueue } from 'queues';
import { dbService } from 'database';
import { logInfo, logError } from 'telemetry';

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
    
    logError('[API CRON INGEST] Failed to enqueue crawler triggers:', error);
    
    return NextResponse.json(
      { error: errorMsg },
      { status: 500 }
    );
  }
}
