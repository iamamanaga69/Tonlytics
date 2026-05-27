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
    const pendingUpdates = await dbService.getPendingRawUpdates(5);
    
    if (pendingUpdates.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No pending updates found. Processing idle.'
      });
    }

    const processingQueue = getQueue('PROCESSING');
    let enqueuedCount = 0;

    for (const rawUpdate of pendingUpdates) {
      // Find source to retrieve reliability score
      const sources = await dbService.getSources();
      const source = sources.find(s => s.id === rawUpdate.source_id);

      await processingQueue.add('process-update', {
        rawUpdateId: rawUpdate.id,
        rawTitle: rawUpdate.raw_title,
        rawContent: rawUpdate.raw_content,
        sourceUrl: rawUpdate.source_url,
        sourceName: source?.name || 'Unknown Source',
        reliabilityScore: source?.reliability_score || 3
      });

      enqueuedCount++;
    }

    const duration = Date.now() - startTime;
    logInfo(`[API CRON PROCESS] Enqueued ${enqueuedCount} AI enrichment tasks in BullMQ in ${duration}ms`);

    return NextResponse.json({
      success: true,
      job: 'processing_enqueue',
      updates_enqueued: enqueuedCount,
      duration_ms: duration
    });
  } catch (error) {
    const duration = Date.now() - startTime;
    const errorMsg = error instanceof Error ? error.message : 'Unknown cron trigger failure';
    
    logError('[API CRON PROCESS] Failed to enqueue AI tasks:', error);
    
    return NextResponse.json(
      { error: errorMsg },
      { status: 500 }
    );
  }
}
