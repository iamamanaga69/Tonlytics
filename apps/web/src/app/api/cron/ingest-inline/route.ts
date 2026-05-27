import { NextResponse } from 'next/server';
import { news } from '@/lib/services/news';
import { logError, logInfo } from 'telemetry';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const secret = searchParams.get('secret');
    const cronSecret = process.env.CRON_SECRET || 'dev_secret_token';

    if (!secret || secret !== cronSecret) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    logInfo('[CRON/INGEST] Starting inline crawler sweep via API endpoint');
    const result = await news.runInlineCrawler();
    
    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      ...result
    });
  } catch (error) {
    logError('[CRON/INGEST] Crawler route trigger failed', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Crawler route execution failed' },
      { status: 500 }
    );
  }
}
