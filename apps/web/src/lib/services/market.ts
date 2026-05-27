export interface TonMarketData {
  priceUsd: number;
  change24h: number;
  volume24h: number;
  marketCap: number;
  lastUpdated: string;
  source: 'coingecko' | 'fallback-cache' | 'mock-preset';
}

// Module-level caching variables (persists in-memory during Next.js runtime)
let cachedMarketData: TonMarketData | null = null;
let lastFetchTime = 0;
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes cache lifetime

// Hardcoded mock values as safety net
const MOCK_MARKET_DATA: TonMarketData = {
  priceUsd: 7.38,
  change24h: 3.84,
  volume24h: 312050900,
  marketCap: 18510420900,
  lastUpdated: new Date().toISOString(),
  source: 'mock-preset'
};

export const market = {
  /**
   * Fetches the latest TON market analytics, utilizing the in-memory cache
   * to guarantee rapid responses and preserve CoinGecko API rate limits.
   */
  async getMarketData(): Promise<TonMarketData> {
    const now = Date.now();
    
    // Return cache if it is still fresh
    if (cachedMarketData && (now - lastFetchTime < CACHE_TTL_MS)) {
      return {
        ...cachedMarketData,
        source: 'fallback-cache'
      };
    }

    try {
      // CoinGecko endpoint for TON coin metrics
      const response = await fetch(
        'https://api.coingecko.com/api/v3/simple/price?ids=the-open-network&vs_currencies=usd&include_market_cap=true&include_24hr_vol=true&include_24hr_change=true',
        {
          headers: {
            'Accept': 'application/json',
            'User-Agent': 'Tonlytics-Market-Ticker/1.0'
          },
          signal: AbortSignal.timeout(5000)
        }
      );

      if (!response.ok) {
        throw new Error(`CoinGecko API returned status ${response.status}`);
      }

      const json = await response.json();
      const tonData = json['the-open-network'];

      if (tonData && typeof tonData.usd === 'number') {
        const newData: TonMarketData = {
          priceUsd: tonData.usd,
          change24h: tonData.usd_24h_change || 0,
          volume24h: tonData.usd_24h_vol || 0,
          marketCap: tonData.usd_market_cap || 0,
          lastUpdated: new Date().toISOString(),
          source: 'coingecko'
        };

        // Update local memory cache
        cachedMarketData = newData;
        lastFetchTime = now;
        return newData;
      }

      throw new Error('CoinGecko response was missing TON data structure');
    } catch (error) {
      console.warn('[SERVICES/MARKET] Fetching CoinGecko TON price failed. Fallback triggered:', error);
      
      // If we have stale cache, serve it
      if (cachedMarketData) {
        return {
          ...cachedMarketData,
          source: 'fallback-cache'
        };
      }

      // Final backup: mock stats
      return {
        ...MOCK_MARKET_DATA,
        lastUpdated: new Date().toISOString()
      };
    }
  }
};
