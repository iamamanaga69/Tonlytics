import { NextResponse } from 'next/server';
import { dbService } from '@/lib/db/supabase';
import type { BriefingCategory } from '@/types';

const RAILWAY_API_URL = process.env.NEXT_PUBLIC_API_URL || '';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const category = searchParams.get('category') as BriefingCategory | null;
    const search = searchParams.get('search') || undefined;

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
        console.warn('[API BRIEFINGS] Railway backend fallback failed:', railwayErr);
      }
    }

    return NextResponse.json({
      success: true,
      count: briefings.length,
      briefings
    });
  } catch (error) {
    console.error('[API BRIEFINGS] Retrieval crashed:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Database query crashed' },
      { status: 500 }
    );
  }
}
