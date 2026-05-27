import { NextResponse } from 'next/server';
import { market } from '@/lib/services/market';

export async function GET() {
  try {
    const data = await market.getMarketData();
    return NextResponse.json(data);
  } catch (error) {
    console.error('[API/MARKET] Failed to fetch market telemetry:', error);
    return NextResponse.json(
      { error: 'Failed to fetch market data' },
      { status: 500 }
    );
  }
}
export const dynamic = 'force-dynamic';
