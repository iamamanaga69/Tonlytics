import { NextResponse } from 'next/server';
import { dbService } from '@/lib/db/supabase';

export async function POST(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Briefing ID parameter is required' }, { status: 400 });
    }

    // Call database manager to increment views telemetry
    await dbService.incrementBriefingViews(id);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[API VIEW LOG] Telemetry update failed:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Telemetry logging failed' },
      { status: 500 }
    );
  }
}
