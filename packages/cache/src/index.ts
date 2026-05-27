import Redis from 'ioredis';

const REDIS_URL = process.env.REDIS_URL || 'redis://127.0.0.1:6379';

let redisClient: Redis | null = null;

/**
 * Get or initialize a singleton Redis client connection pool.
 */
export function getRedisClient(): Redis {
  if (!redisClient) {
    redisClient = new Redis(REDIS_URL, {
      maxRetriesPerRequest: 3
    });
    
    redisClient.on('error', (err) => {
      console.error('[CACHE] Redis error:', err);
    });
  }
  return redisClient;
}

/**
 * Store a serialized JSON item inside Redis with an optional TTL (Time To Live).
 */
export async function setCacheItem(key: string, value: unknown, ttlSeconds?: number): Promise<void> {
  const client = getRedisClient();
  const serialized = JSON.stringify(value);
  
  if (ttlSeconds && ttlSeconds > 0) {
    await client.set(key, serialized, 'EX', ttlSeconds);
  } else {
    await client.set(key, serialized);
  }
}

/**
 * Retrieve and deserialize a JSON cached item from Redis.
 */
export async function getCacheItem<T>(key: string): Promise<T | null> {
  const client = getRedisClient();
  const value = await client.get(key);
  
  if (!value) return null;
  
  try {
    return JSON.parse(value) as T;
  } catch (error) {
    console.error(`[CACHE] Failed to deserialize cached key "${key}":`, error);
    return null;
  }
}

/**
 * Invalidate a specific cache key.
 */
export async function deleteCacheItem(key: string): Promise<void> {
  const client = getRedisClient();
  await client.del(key);
}

/**
 * Flush cache entries matching a prefix pattern.
 */
export async function deleteCachePattern(pattern: string): Promise<void> {
  const client = getRedisClient();

  let cursor = '0';
  do {
    const [nextCursor, keys] = await client.scan(cursor, 'MATCH', pattern, 'COUNT', 100);
    cursor = nextCursor;
    if (keys.length > 0) {
      await client.del(...keys);
    }
  } while (cursor !== '0');
}
