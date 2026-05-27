import { NextResponse } from 'next/server';
import { market } from '@/lib/services/market';
import { logError } from 'telemetry';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const data = await market.getMarketData();
    return NextResponse.json(data);
  } catch (error) {
    logError('[API/MARKET] Failed to fetch TON market telemetry', error);
    return NextResponse.json(
      { error: 'TON market data is temporarily unavailable' },
      { status: 503 }
    );
  }
}
