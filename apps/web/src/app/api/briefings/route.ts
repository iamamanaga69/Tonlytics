import { NextResponse } from 'next/server';
import { dbService } from '@/lib/db/supabase';
import type { BriefingCategory } from '@/types';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const category = searchParams.get('category') as BriefingCategory | null;
    const search = searchParams.get('search') || undefined;

    // Fetch briefings from dbService with dynamic filter/search params
    const briefings = await dbService.getBriefings({
      category: category || undefined,
      search: search || undefined
    });

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
