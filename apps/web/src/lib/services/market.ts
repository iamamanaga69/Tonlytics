import { logWarn } from 'telemetry';
import { dbService } from 'database';

export interface TonMarketData {
  priceUsd: number;
  change24h: number;
  volume24h: number;
  marketCap: number;
  high24h: number | null;
  low24h: number | null;
  athUsd: number | null;
  athDate: string | null;
  atlUsd: number | null;
  atlDate: string | null;
  lastUpdated: string;
  source: 'coingecko' | 'fallback-cache';
}

interface CoinGeckoMarketData {
  current_price?: { usd?: number };
  price_change_percentage_24h?: number;
  total_volume?: { usd?: number };
  market_cap?: { usd?: number };
  high_24h?: { usd?: number };
  low_24h?: { usd?: number };
  ath?: { usd?: number };
  ath_date?: { usd?: string };
  atl?: { usd?: number };
  atl_date?: { usd?: string };
}

interface CoinGeckoCoinResponse {
  market_data?: CoinGeckoMarketData;
  last_updated?: string;
}

let cachedMarketData: TonMarketData | null = null;
let lastFetchTime = 0;
const CACHE_TTL_MS = 60 * 1000;

function readNumber(value: number | undefined): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

export const market = {
  async getMarketData(): Promise<TonMarketData> {
    const now = Date.now();

    if (cachedMarketData && now - lastFetchTime < CACHE_TTL_MS) {
      return {
        ...cachedMarketData,
        source: 'fallback-cache',
      };
    }

    const headers: Record<string, string> = {
      Accept: 'application/json',
      'User-Agent': 'Tonlytics-Market-Ticker/1.0',
    };

    if (process.env.COINGECKO_API_KEY) {
      headers['x-cg-demo-api-key'] = process.env.COINGECKO_API_KEY;
    }

    try {
      const response = await fetch(
        'https://api.coingecko.com/api/v3/coins/the-open-network?localization=false&tickers=false&market_data=true&community_data=false&developer_data=false&sparkline=false',
        {
          headers,
          signal: AbortSignal.timeout(7000),
        }
      );

      if (!response.ok) {
        throw new Error(`CoinGecko API returned status ${response.status}`);
      }

      const json = (await response.json()) as CoinGeckoCoinResponse;
      const marketData = json.market_data;
      const priceUsd = readNumber(marketData?.current_price?.usd);
      const volume24h = readNumber(marketData?.total_volume?.usd);
      const marketCap = readNumber(marketData?.market_cap?.usd);

      if (priceUsd === null || volume24h === null || marketCap === null) {
        throw new Error('CoinGecko response did not include required TON market fields');
      }

      const nextData: TonMarketData = {
        priceUsd,
        change24h: readNumber(marketData?.price_change_percentage_24h) ?? 0,
        volume24h,
        marketCap,
        high24h: readNumber(marketData?.high_24h?.usd),
        low24h: readNumber(marketData?.low_24h?.usd),
        athUsd: readNumber(marketData?.ath?.usd),
        athDate: marketData?.ath_date?.usd || null,
        atlUsd: readNumber(marketData?.atl?.usd),
        atlDate: marketData?.atl_date?.usd || null,
        lastUpdated: json.last_updated || new Date().toISOString(),
        source: 'coingecko',
      };

      cachedMarketData = nextData;
      lastFetchTime = now;

      // Persist to Supabase in the background (fire and forget)
      dbService.persistMarketData({
        price_usd: priceUsd,
        volume_24h: volume24h ?? undefined,
        market_cap: marketCap ?? undefined,
        change_24h: nextData.change24h,
        last_updated: nextData.lastUpdated
      }).catch(err => {
        logWarn('[SERVICES/MARKET] Failed to persist market data to Supabase:', err);
      });

      return nextData;
    } catch (error) {
      logWarn('[SERVICES/MARKET] CoinGecko market fetch failed', {
        reason: error instanceof Error ? error.message : 'unknown_error',
      });

      if (cachedMarketData) {
        return {
          ...cachedMarketData,
          source: 'fallback-cache',
        };
      }

      throw error;
    }
  },
};
