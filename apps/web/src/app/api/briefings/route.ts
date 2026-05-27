import { NextResponse } from 'next/server';
import { dbService } from '@/lib/db/supabase';
import type { BriefingCategory } from '@/types';
import { logError, logInfo, logWarn } from 'telemetry';

const RAILWAY_API_URL = process.env.NEXT_PUBLIC_API_URL || '';
const FEED_CACHE_TTL_SECONDS = 90;

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const category = searchParams.get('category') as BriefingCategory | null;
    const search = searchParams.get('search') || undefined;
    const cacheKey = `briefings:v2:${category || 'all'}:${search || 'none'}`;

    const cached = await dbService.getFeedCache<{
      success: true;
      count: number;
      briefings: unknown[];
      cached_at: string;
    }>(cacheKey);

    if (cached) {
      return NextResponse.json(
        { ...cached, cache: 'hit' },
        {
          headers: {
            'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300',
          },
        }
      );
    }

    // Try primary data source (Supabase via dbService)
    let briefings = await dbService.getBriefings({
      category: category || undefined,
      search: search || undefined
    });

    // If dbService returned empty and Railway backend is configured, try it
    if (briefings.length === 0 && RAILWAY_API_URL) {
      try {
        const railwayUrl = new URL('/api/briefings', RAILWAY_API_URL);
        if (category) railwayUrl.searchParams.set('category', category);
        if (search) railwayUrl.searchParams.set('search', search);

        const response = await fetch(railwayUrl.toString(), {
          headers: { Accept: 'application/json' },
          signal: AbortSignal.timeout(8000),
        });

        if (response.ok) {
          const railwayData = await response.json();
          if (railwayData.success && Array.isArray(railwayData.data)) {
            briefings = railwayData.data;
          }
        }
      } catch (railwayErr) {
        logWarn('[API BRIEFINGS] Railway backend fallback failed', {
          reason: railwayErr instanceof Error ? railwayErr.message : 'unknown_error',
        });
      }
    }

    const payload = {
      success: true,
      count: briefings.length,
      briefings,
      cached_at: new Date().toISOString(),
    };

    await dbService.setFeedCache(cacheKey, payload, FEED_CACHE_TTL_SECONDS);
    logInfo('[API BRIEFINGS] Served live briefing feed', {
      count: briefings.length,
      category: category || 'all',
      search: search || '',
    });

    return NextResponse.json(
      { ...payload, cache: 'miss' },
      {
        headers: {
          'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300',
        },
      }
    );
  } catch (error) {
    logError('[API BRIEFINGS] Retrieval crashed', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Database query crashed' },
      { status: 500 }
    );
  }
}
