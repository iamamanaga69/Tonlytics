import { NextResponse } from 'next/server';
import { fetchRssFeed } from 'extraction';
import { summarizeRawUpdate, generateSlug } from 'ai';
import { dbService, isSupabaseConfigured } from 'database';

const TEST_RSS_URL = 'https://ton.org/en/blog/rss';

export async function GET() {
  const steps: { step: string; status: string; detail?: string }[] = [];

  try {
    // Step 1: Fetch RSS feed
    let rssItems: Awaited<ReturnType<typeof fetchRssFeed>>;
    try {
      rssItems = await fetchRssFeed(TEST_RSS_URL);
      steps.push({
        step: 'fetch_rss',
        status: 'ok',
        detail: `Fetched ${rssItems.length} items from ${TEST_RSS_URL}`,
      });
    } catch (err) {
      steps.push({
        step: 'fetch_rss',
        status: 'error',
        detail: err instanceof Error ? err.message : 'Unknown fetch error',
      });
      return NextResponse.json({ success: false, steps }, { status: 502 });
    }

    if (rssItems.length === 0) {
      steps.push({ step: 'select_item', status: 'error', detail: 'RSS feed returned 0 items' });
      return NextResponse.json({ success: false, steps }, { status: 404 });
    }

    // Step 2: Pick the first RSS item as the test candidate
    const item = rssItems[0];
    steps.push({
      step: 'select_item',
      status: 'ok',
      detail: `Selected: "${item.title}" (${item.link})`,
    });

    // Step 3: Construct a synthetic RawUpdate for the AI summarizer
    const rawUpdate = {
      id: `test-${Date.now()}`,
      source_id: 'test-source',
      source_url: item.link,
      raw_title: item.title,
      raw_content: item.content || item.title,
      publish_date: item.pubDate,
      status: 'pending' as const,
      retry_count: 0,
      created_at: new Date().toISOString(),
    };

    // Step 4: Run AI summarizer (will use real API if keys are set, otherwise mock)
    let briefingPayload: Awaited<ReturnType<typeof summarizeRawUpdate>>;
    try {
      briefingPayload = await summarizeRawUpdate(rawUpdate);
      steps.push({
        step: 'ai_summarize',
        status: 'ok',
        detail: `Generated briefing: "${briefingPayload.title}" (moderation: ${briefingPayload.moderation_status})`,
      });
    } catch (err) {
      steps.push({
        step: 'ai_summarize',
        status: 'error',
        detail: err instanceof Error ? err.message : 'AI summarization failed',
      });
      return NextResponse.json({ success: false, steps }, { status: 500 });
    }

    // Step 5: Insert into Supabase
    if (!isSupabaseConfigured) {
      steps.push({
        step: 'db_insert',
        status: 'skipped',
        detail: 'Supabase is not configured. Briefing was generated but not persisted.',
      });
      return NextResponse.json({
        success: true,
        persisted: false,
        briefing: briefingPayload,
        steps,
      });
    }

    try {
      const inserted = await dbService.insertBriefing({
        ...briefingPayload,
        source_name: 'TON Foundation Blog',
        source_url: item.link,
        key_takeaways: [],
        spam_probability: 0,
        duplicate_probability: 0,
        relevance_score: 90,
      });
      steps.push({
        step: 'db_insert',
        status: 'ok',
        detail: `Persisted briefing id=${inserted.id}, slug=${inserted.slug}`,
      });

      return NextResponse.json({
        success: true,
        persisted: true,
        briefing: inserted,
        steps,
      });
    } catch (err) {
      steps.push({
        step: 'db_insert',
        status: 'error',
        detail: err instanceof Error ? err.message : 'Database insert failed',
      });
      return NextResponse.json({ success: false, briefing: briefingPayload, steps }, { status: 500 });
    }
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unexpected pipeline error',
        steps,
      },
      { status: 500 }
    );
  }
}
