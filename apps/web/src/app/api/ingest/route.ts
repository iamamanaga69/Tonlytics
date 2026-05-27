import { NextResponse } from 'next/server';
import { news } from '@/lib/services/news';
import { logError } from 'telemetry';

export async function POST(request: Request) {
  try {
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET || 'dev_secret_token';

    if (!authHeader || authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const messages: Array<{
      text: string;
      channel_name: string;
      channel: string;
      date: string;
      category?: string;
      media?: { type: string; path?: string; filename?: string } | null;
      message_id: number;
      views?: number;
      source_url?: string;
    }> = body.messages || [];

    if (!messages.length) {
      return NextResponse.json({ success: true, inserted: 0, message: 'No messages to ingest' });
    }

    let inserted = 0;
    let skipped = 0;
    let failed = 0;
    const details = [];

    for (const msg of messages) {
      const text = msg.text?.trim();
      if (!text || text.length < 20) {
        skipped++;
        continue;
      }

      // Generate a canonical source URL for the Telegram channel post
      const sourceUrl = msg.source_url || (msg.channel 
        ? `https://t.me/${msg.channel}/${msg.message_id}` 
        : `https://t.me/unknown_channel/${msg.message_id}`);

      const sourceName = msg.channel_name || msg.channel || 'Verified Telegram Source';

      // Parse override image URL from local python monitor FastAPI static content path if available
      let overrideImageUrl: string | undefined;
      if (msg.media?.type === 'photo' && msg.media.path) {
        // Example: http://localhost:3010/data/media/filename.jpg
        overrideImageUrl = `http://localhost:3010${msg.media.path}`;
      }

      const firstLine = text.split('\n')[0].replace(/\*\*/g, '').replace(/[#_~`]/g, '').trim();
      const rawTitle = firstLine.length > 15 ? firstLine.slice(0, 120) : text.slice(0, 120);

      const result = await news.processRawUpdate({
        sourceUrl,
        rawTitle,
        rawContent: text,
        publishDate: msg.date || new Date().toISOString(),
        sourceName,
        overrideImageUrl
      });

      details.push(result);
      if (result.status === 'inserted') {
        inserted++;
      } else if (result.status === 'skipped') {
        skipped++;
      } else {
        failed++;
      }
    }

    return NextResponse.json({
      success: true,
      inserted,
      skipped,
      failed,
      details
    });
  } catch (error) {
    logError('[INGEST] Webhook route handler failed', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Ingestion route failed' },
      { status: 500 }
    );
  }
}
