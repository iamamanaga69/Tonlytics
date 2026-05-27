import { createClient } from '@supabase/supabase-js';
import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import type { Briefing, BriefingCategory, RawUpdate, Source, AutomationLog, ModerationLog, MediaAsset, SourceTelemetry, RedirectTelemetry, BriefingEmbedding } from 'types';
import * as schema from './schema';

export * from './schema';
export { runDbMigrations } from './run-migrations';

const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const databaseUrl = process.env.DATABASE_URL || '';

// Determine if we should use the real Supabase client
export const isSupabaseAnonConfigured = !!(supabaseUrl && supabaseAnonKey);
export const isSupabaseAdminConfigured = !!(supabaseUrl && serviceRoleKey);
export const isSupabaseConfigured = !!(supabaseUrl && (supabaseAnonKey || serviceRoleKey));

export const supabase = isSupabaseConfigured
  ? createClient(supabaseUrl, supabaseAnonKey || serviceRoleKey)
  : null;

// Administrative client for background cron workers (bypasses RLS if needed)
export const supabaseAdmin = isSupabaseAdminConfigured
  ? createClient(supabaseUrl, serviceRoleKey)
  : null;

const supabaseReader = supabaseAdmin || supabase;

function canUseLocalFallback(): boolean {
  return process.env.ALLOW_MOCK_DATA === 'true' || (!isSupabaseConfigured && process.env.NODE_ENV !== 'production');
}

function logDbError(message: string, error?: unknown): void {
  console.error(message, error || '');
}

// Initialize Drizzle ORM Pool
let pgPool: Pool | null = null;
let drizzleDb: any = null;

export function getDrizzleDb() {
  if (!drizzleDb && databaseUrl) {
    try {
      pgPool = new Pool({ connectionString: databaseUrl });
      drizzleDb = drizzle(pgPool, { schema });
    } catch (error) {
      console.error('[DATABASE] Failed to initialize Drizzle pg pool:', error);
    }
  }
  return drizzleDb;
}

// ==========================================
// HIGH-SIGNAL SEED MOCK DATA
// ==========================================
const MOCK_SOURCES: Source[] = [
  {
    id: 'source-1',
    name: 'TON Foundation Blog',
    url: 'https://ton.org/en/blog/rss',
    source_type: 'rss',
    reliability_score: 5,
    is_active: true,
    created_at: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()
  },
  {
    id: 'source-2',
    name: 'TON Core Releases',
    url: 'https://github.com/ton-blockchain/ton/releases',
    source_type: 'github',
    reliability_score: 5,
    is_active: true,
    created_at: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()
  },
  {
    id: 'source-3',
    name: 'Telegram Apps SDK Updates',
    url: 'https://github.com/telegram-apps/sdk/releases',
    source_type: 'github',
    reliability_score: 5,
    is_active: true,
    created_at: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()
  }
];

const MOCK_BRIEFINGS: Briefing[] = [
  {
    id: 'brief-1',
    title: 'TON Core Deploys Wallet v5 Standard to Mainnet Production',
    slug: 'ton-core-deploys-wallet-v5',
    briefing: 'The TON Core development team has officially finalized the deployment of the Wallet v5 smart contract standard across the TON mainnet. The upgrade introduces the W5 specification, enabling native gasless transfers (where jetton transaction fees can be paid in the jetton itself, such as USDT) and multi-transaction batching support in a single on-chain execution.',
    why_it_matters: 'Removes the primary user friction in Telegram Mini Apps by allowing gasless transactions, eliminating the requirement for users to hold native TON to cover network fees during checkout.',
    category: 'Infrastructure',
    tags: ['wallet-v5', 'core-dev', 'smart-contracts', 'gasless'],
    is_published: true,
    telegram_posted: true,
    telegram_message_id: 1245,
    views_count: 532,
    confidence_score: 98,
    readability_score: 95,
    hallucination_probability: 1,
    source_quality_score: 99,
    moderation_status: 'auto_approved',
    
    // Aggregation elements
    source_name: 'TON Foundation Blog',
    source_url: 'https://blog.ton.org/ton-wallet-v5-deployment',
    key_takeaways: [
      'Introduces Wallet v5 (W5) standard natively on TON mainnet.',
      'Supports gasless transactions, allowing USDT to pay for its own gas fees.',
      'Supports batching up to 255 token transfers in a single on-chain transaction.'
    ],
    spam_probability: 2,
    duplicate_probability: 4,
    relevance_score: 99,
    
    image_url: 'https://ton.org/en/logo.png', // Official logo link
    published_at: new Date(Date.now() - 15 * 60 * 1000).toISOString(),
    created_at: new Date(Date.now() - 15 * 60 * 1000).toISOString()
  },
  {
    id: 'brief-2',
    title: 'Tether Launches Native USDT on TON to Propel P2P Telegram Payments',
    slug: 'tether-launches-native-usdt-on-ton',
    briefing: 'Tether has officially launched its dollar-pegged stablecoin, USDt, natively on the TON blockchain with direct integrations into Telegram Messenger settings. This allows users to send stablecoin payments peer-to-peer within chat frames instantly, with zero separate wallet setups, leveraging the built-in Telegram Wallet portal.',
    why_it_matters: 'Enables Web2-like peer-to-peer retail payments for Telegram\'s 900M users, bypassing typical EVM bridge latencies and establishing a highly scalable crypto settlement layer.',
    category: 'DeFi',
    tags: ['tether', 'usdt', 'stablecoins', 'payments'],
    is_published: true,
    telegram_posted: true,
    telegram_message_id: 1246,
    views_count: 1045,
    confidence_score: 99,
    readability_score: 94,
    hallucination_probability: 0,
    source_quality_score: 99,
    moderation_status: 'auto_approved',
    
    // Aggregation elements
    source_name: 'Tether Newsroom',
    source_url: 'https://tether.to/en/tether-launches-native-usdt-on-ton',
    key_takeaways: [
      'Native USDt stablecoin launched natively on the TON blockchain.',
      'Fully integrated peer-to-peer in Telegram Messenger settings.',
      'Eliminates external bridge layers and associated EVM latency.'
    ],
    spam_probability: 1,
    duplicate_probability: 2,
    relevance_score: 100,
    
    image_url: undefined,
    published_at: new Date(Date.now() - 2 * 60 * 65 * 1000).toISOString(),
    created_at: new Date(Date.now() - 2 * 60 * 65 * 1000).toISOString()
  },
  {
    id: 'brief-3',
    title: 'TON Space Integrates Self-Custodial Wallet Direct to Telegram Messenger',
    slug: 'ton-space-integrates-self-custodial-wallet',
    briefing: 'The TON Foundation has completed the integration of TON Space, a fully self-custodial Web3 wallet, directly within the Telegram application settings menu. This features instant access to native private key management, letting users execute Web3 transactions and connect directly to decentralized Mini Apps from the primary chat drawer.',
    why_it_matters: 'Unifies user experience and asset security inside Telegram, allowing users to interact with decentralized exchanges and NFT marketplaces without leaving the messenger.',
    category: 'Infrastructure',
    tags: ['ton-space', 'wallets', 'self-custody', 'integration'],
    is_published: true,
    telegram_posted: true,
    telegram_message_id: 1247,
    views_count: 890,
    confidence_score: 96,
    readability_score: 91,
    hallucination_probability: 2,
    source_quality_score: 97,
    moderation_status: 'auto_approved',
    
    // Aggregation elements
    source_name: 'TON Foundation Blog',
    source_url: 'https://blog.ton.org/introducing-ton-space-self-custodial-wallet',
    key_takeaways: [
      'TON Space self-custodial wallet integrated into Telegram primary drawer.',
      'Allows seed key storage locally on device via encrypted sandbox.',
      'Connects seamlessly to external decentralized Mini Apps using TON Connect.'
    ],
    spam_probability: 3,
    duplicate_probability: 5,
    relevance_score: 97,
    
    image_url: undefined,
    published_at: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString(),
    created_at: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString()
  },
  {
    id: 'brief-4',
    title: 'STON.fi DEX Crosses $100M TVL Driven by TON/USDT Liquidity Pools',
    slug: 'stonfi-dex-crosses-100m-tvl',
    briefing: 'STON.fi, the primary decentralized exchange built on the TON blockchain, has officially crossed $100 million in Total Value Locked (TVL). Platform dashboards show the growth was heavily catalyzed by liquidity incentive pools surrounding the native TON/USDT stablecoin trading pairs, coupled with low-slippage smart order routing algorithms.',
    why_it_matters: 'Deepens the financial liquidity foundations of the TON ecosystem, significantly reducing slip ratios for ecosystem trading bots and in-game economies.',
    category: 'DeFi',
    tags: ['ston-fi', 'dex', 'tvl', 'liquidity'],
    is_published: true,
    telegram_posted: false,
    telegram_message_id: undefined,
    views_count: 312,
    confidence_score: 94,
    readability_score: 93,
    hallucination_probability: 2,
    source_quality_score: 95,
    moderation_status: 'auto_approved',
    
    // Aggregation elements
    source_name: 'STON.fi Portal',
    source_url: 'https://ston.fi/blog/stonfi-crosses-100m-tvl',
    key_takeaways: [
      'Total Value Locked (TVL) crosses $100 million.',
      'Growth heavily catalyzed by TON/USDT liquidity incentive farming.',
      'Smart order routing algorithms minimize swap slippage under 0.1%.'
    ],
    spam_probability: 4,
    duplicate_probability: 8,
    relevance_score: 96,
    
    image_url: undefined,
    published_at: new Date(Date.now() - 14 * 60 * 60 * 1000).toISOString(),
    created_at: new Date(Date.now() - 14 * 60 * 60 * 1000).toISOString()
  },
  {
    id: 'brief-5',
    title: 'GetGems Releases Public APIs to Support In-Game NFT Integrations',
    slug: 'getgems-releases-public-apis-nft',
    briefing: 'GetGems, the leading digital collectible and NFT marketplace on the TON blockchain, has launched its public developer API library. The framework allows external gaming studios and social Mini Apps to query collection metrics, trace user ownership histories, and execute direct trades inside in-app browser portals.',
    why_it_matters: 'Empowers Telegram gaming studios to integrate on-chain inventories and collectibles directly into their gameplay cycles with near-zero server configurations.',
    category: 'Mini Apps',
    tags: ['getgems', 'nfts', 'apis', 'gaming-sdk'],
    is_published: true,
    telegram_posted: true,
    telegram_message_id: 1244,
    views_count: 2450,
    confidence_score: 97,
    readability_score: 92,
    hallucination_probability: 1,
    source_quality_score: 98,
    moderation_status: 'auto_approved',
    
    // Aggregation elements
    source_name: 'GetGems Core Announcements',
    source_url: 'https://getgems.io/blog/nft-marketplace-apis',
    key_takeaways: [
      'GetGems public API library launched for Web3 developers.',
      'Enables gaming Mini Apps to query NFT metadata, collections, and owners.',
      'Supports in-app marketplace browsing with low-latency REST endpoints.'
    ],
    spam_probability: 2,
    duplicate_probability: 3,
    relevance_score: 98,
    
    image_url: undefined,
    published_at: new Date(Date.now() - 26 * 60 * 60 * 1000).toISOString(),
    created_at: new Date(Date.now() - 26 * 60 * 60 * 1000).toISOString()
  }
];

let localMockBriefings = [...MOCK_BRIEFINGS];
let localRawUpdates: RawUpdate[] = [];
let localLogs: AutomationLog[] = [];
let localModerationLogs: ModerationLog[] = [];
const localFeedCache = new Map<string, { data: unknown; expiresAt: number }>();

// ==========================================
// DB SERVICE INTERFACE (Backwards Compatibility)
// ==========================================
export const dbService = {
  // --- feed cache helpers ---
  async getFeedCache<T = unknown>(key: string): Promise<T | null> {
    if (isSupabaseConfigured && supabaseAdmin) {
      const { data, error } = await supabaseAdmin
        .from('feed_cache')
        .select('data, expires_at')
        .eq('key', key)
        .maybeSingle();

      if (!error && data && new Date(data.expires_at).getTime() > Date.now()) {
        return data.data as T;
      }
    }

    const local = localFeedCache.get(key);
    if (local && local.expiresAt > Date.now()) {
      return local.data as T;
    }

    if (local) localFeedCache.delete(key);
    return null;
  },

  async setFeedCache(key: string, data: unknown, ttlSeconds: number): Promise<void> {
    const expiresAt = new Date(Date.now() + ttlSeconds * 1000).toISOString();

    if (isSupabaseConfigured && supabaseAdmin) {
      const { error } = await supabaseAdmin
        .from('feed_cache')
        .upsert([{ key, data, expires_at: expiresAt, updated_at: new Date().toISOString() }], { onConflict: 'key' });

      if (!error) return;
      logDbError('[DB] Failed to write feed cache.', error);
    }

    localFeedCache.set(key, { data, expiresAt: new Date(expiresAt).getTime() });
  },

  async deleteFeedCachePrefix(prefix: string): Promise<void> {
    if (isSupabaseConfigured && supabaseAdmin) {
      const { data, error } = await supabaseAdmin
        .from('feed_cache')
        .select('key')
        .like('key', `${prefix}%`);

      if (!error && data && data.length > 0) {
        await supabaseAdmin.from('feed_cache').delete().in('key', data.map((row: { key: string }) => row.key));
      }
    }

    for (const key of localFeedCache.keys()) {
      if (key.startsWith(prefix)) localFeedCache.delete(key);
    }
  },

  // --- briefings query ---
  async getBriefings(options?: { category?: BriefingCategory; search?: string }): Promise<Briefing[]> {
    if (isSupabaseConfigured && supabaseReader) {
      let query = supabaseReader
        .from('briefings')
        .select('*')
        .eq('is_published', true)
        .eq('moderation_status', 'auto_approved')
        .order('published_at', { ascending: false });
      
      if (options?.category) {
        query = query.eq('category', options.category);
      }
      
      if (options?.search) {
        query = query.or(`title.ilike.%${options.search}%,briefing.ilike.%${options.search}%,why_it_matters.ilike.%${options.search}%`);
      }
      
      const { data, error } = await query;
      if (!error && data) {
        console.info(`[DB] Supabase briefings query returned ${data.length} records.`);
        return data as Briefing[];
      }
      logDbError('[DB] Supabase briefings query failed.', error);
      if (!canUseLocalFallback()) return [];
    }
    if (!canUseLocalFallback()) return [];

    let result = localMockBriefings.filter(b => b.is_published && b.moderation_status === 'auto_approved');
    
    if (options?.category) {
      result = result.filter(b => b.category === options.category);
    }
    
    if (options?.search) {
      const s = options.search.toLowerCase();
      result = result.filter(b => 
        b.title.toLowerCase().includes(s) || 
        b.briefing.toLowerCase().includes(s) ||
        b.why_it_matters.toLowerCase().includes(s) ||
        b.tags.some(t => t.toLowerCase().includes(s))
      );
    }
    
    return result;
  },

  // --- single briefing by slug ---
  async getBriefingBySlug(slug: string): Promise<Briefing | null> {
    if (isSupabaseConfigured && supabaseReader) {
      const { data, error } = await supabaseReader
        .from('briefings')
        .select('*')
        .eq('slug', slug)
        .eq('is_published', true)
        .eq('moderation_status', 'auto_approved')
        .single();
      if (!error && data) return data as Briefing;
      if (!canUseLocalFallback()) return null;
    }
    if (!canUseLocalFallback()) return null;

    const mock = localMockBriefings.find(b => b.slug === slug);
    return mock || null;
  },

  // --- increment view count ---
  async incrementBriefingViews(id: string): Promise<void> {
    if (isSupabaseConfigured && supabaseReader) {
      const { error } = await supabaseReader.rpc('increment_views', { briefing_id: id });
      if (!error) return;
      
      const briefing = await this.getBriefingBySlug(id);
      if (briefing) {
        const nextViews = briefing.views_count + 1;
        await supabaseReader.from('briefings').update({ views_count: nextViews }).eq('id', briefing.id);
      }
      return;
    }
    
    const idx = localMockBriefings.findIndex(b => b.id === id || b.slug === id);
    if (idx !== -1) {
      localMockBriefings[idx] = {
        ...localMockBriefings[idx],
        views_count: localMockBriefings[idx].views_count + 1
      };
    }
  },

  // --- sources list ---
  async getSources(): Promise<Source[]> {
    if (isSupabaseConfigured && supabaseReader) {
      const { data, error } = await supabaseReader.from('sources').select('*').eq('is_active', true).order('reliability_score', { ascending: false });
      if (!error && data) {
        console.info(`[DB] Supabase sources query returned ${data.length} active sources.`);
        return data as Source[];
      }
      logDbError('[DB] Supabase sources query failed.', error);
      if (!canUseLocalFallback()) return [];
    }
    return canUseLocalFallback() ? MOCK_SOURCES : [];
  },

  // --- insert raw updates (Ingest) ---
  async insertRawUpdates(updates: Omit<RawUpdate, 'id' | 'status' | 'retry_count' | 'created_at'>[]): Promise<number> {
    if (isSupabaseConfigured && supabaseAdmin) {
      const payload = updates.map(u => ({
        ...u,
        status: 'pending',
        retry_count: 0
      }));
      const { data, error } = await supabaseAdmin
        .from('raw_updates')
        .upsert(payload, { onConflict: 'source_url', ignoreDuplicates: true })
        .select();
      if (!error && data) {
        console.info(`[DB] raw_updates insert completed: requested=${updates.length}, inserted=${data.length}.`);
        return data.length;
      }
      logDbError('[DB] Failed to insert raw_updates into Supabase.', error);
      return 0;
    }

    if (isSupabaseConfigured && !supabaseAdmin) {
      logDbError('[DB] Cannot insert raw_updates: SUPABASE_SERVICE_ROLE_KEY is missing for backend write access.');
      return 0;
    }
    if (!canUseLocalFallback()) return 0;

    const startCount = localRawUpdates.length;
    updates.forEach(u => {
      if (!localRawUpdates.some(x => x.source_url === u.source_url)) {
        localRawUpdates.push({
          ...u,
          id: `raw-${Math.random().toString(36).slice(2, 9)}`,
          status: 'pending',
          retry_count: 0,
          created_at: new Date().toISOString()
        });
      }
    });
    return localRawUpdates.length - startCount;
  },

  // --- upsert a single raw update and return the persisted record ---
  async upsertRawUpdate(update: Omit<RawUpdate, 'id' | 'retry_count' | 'created_at'>): Promise<{ record: RawUpdate | null; inserted: boolean }> {
    if (isSupabaseConfigured && supabaseAdmin) {
      const payload = {
        ...update,
        retry_count: 0
      };

      const { data, error } = await supabaseAdmin
        .from('raw_updates')
        .upsert([payload], { onConflict: 'source_url', ignoreDuplicates: true })
        .select()
        .maybeSingle();

      if (!error && data) {
        console.info(`[DB] raw_updates upsert inserted source_url=${update.source_url}`);
        return { record: data as RawUpdate, inserted: true };
      }

      if (error) {
        logDbError('[DB] raw_updates upsert failed.', error);
        return { record: null, inserted: false };
      }

      const existing = await supabaseAdmin
        .from('raw_updates')
        .select('*')
        .eq('source_url', update.source_url)
        .maybeSingle();

      if (existing.error) {
        logDbError('[DB] raw_updates duplicate lookup failed.', existing.error);
        return { record: null, inserted: false };
      }

      return { record: existing.data as RawUpdate | null, inserted: false };
    }

    if (isSupabaseConfigured && !supabaseAdmin) {
      logDbError('[DB] Cannot upsert raw_update: SUPABASE_SERVICE_ROLE_KEY is missing for backend write access.');
      return { record: null, inserted: false };
    }

    if (!canUseLocalFallback()) return { record: null, inserted: false };

    const existing = localRawUpdates.find(x => x.source_url === update.source_url);
    if (existing) return { record: existing, inserted: false };

    const record: RawUpdate = {
      ...update,
      id: `raw-${Math.random().toString(36).slice(2, 9)}`,
      retry_count: 0,
      created_at: new Date().toISOString()
    };
    localRawUpdates.push(record);
    return { record, inserted: true };
  },

  // --- get pending raw updates ---
  async getPendingRawUpdates(limit = 10): Promise<RawUpdate[]> {
    if (isSupabaseConfigured && supabaseReader) {
      const { data, error } = await supabaseReader
        .from('raw_updates')
        .select('*')
        .in('status', ['pending', 'failed'])
        .lt('retry_count', 3)
        .order('publish_date', { ascending: false })
        .limit(limit);
      if (!error && data) {
        console.info(`[DB] Pending raw_updates query returned ${data.length} records.`);
        return data as RawUpdate[];
      }
      logDbError('[DB] Pending raw_updates query failed.', error);
      if (!canUseLocalFallback()) return [];
    }
    return canUseLocalFallback()
      ? localRawUpdates.filter(r => (r.status === 'pending' || r.status === 'failed') && r.retry_count < 3).slice(0, limit)
      : [];
  },

  // --- update raw update status ---
  async updateRawUpdateStatus(id: string, status: RawUpdate['status'], retryCount?: number): Promise<void> {
    if (isSupabaseConfigured && supabaseAdmin) {
      const payload: Partial<RawUpdate> = { status };
      if (retryCount !== undefined) payload.retry_count = retryCount;
      
      const { error } = await supabaseAdmin.from('raw_updates').update(payload).eq('id', id);
      if (error) logDbError(`[DB] Failed to update raw_update status for ${id}.`, error);
      return;
    }

    if (isSupabaseConfigured && !supabaseAdmin) {
      logDbError('[DB] Cannot update raw_update status: SUPABASE_SERVICE_ROLE_KEY is missing for backend write access.');
      return;
    }

    if (!canUseLocalFallback()) return;
    
    const idx = localRawUpdates.findIndex(r => r.id === id);
    if (idx !== -1) {
      localRawUpdates[idx] = {
        ...localRawUpdates[idx],
        status,
        retry_count: retryCount !== undefined ? retryCount : localRawUpdates[idx].retry_count
      };
    }
  },

  // --- insert processed briefing (Publish) ---
  async insertBriefing(briefing: Omit<Briefing, 'id' | 'views_count' | 'created_at'>): Promise<Briefing> {
    if (isSupabaseConfigured && supabaseAdmin) {
      const existingBySource = briefing.source_url
        ? await supabaseAdmin.from('briefings').select('*').eq('source_url', briefing.source_url).maybeSingle()
        : { data: null, error: null };

      if (existingBySource.error) {
        logDbError('[DB] Briefing source_url duplicate lookup failed.', existingBySource.error);
      }

      if (existingBySource.data) {
        console.info(`[DB] Briefing already exists for source_url=${briefing.source_url}.`);
        return existingBySource.data as Briefing;
      }

      const { data, error } = await supabaseAdmin
        .from('briefings')
        .upsert([briefing], { onConflict: 'slug' })
        .select()
        .single();
      if (!error && data) {
        console.info(`[DB] Briefing persisted: ${data.title} (${data.id}).`);
        await this.deleteFeedCachePrefix('briefings:');
        return data as Briefing;
      }
      logDbError('[DB] Failed to persist briefing into Supabase.', error);
      throw new Error(error?.message || 'Failed to persist briefing into Supabase');
    }

    if (isSupabaseConfigured && !supabaseAdmin) {
      throw new Error('SUPABASE_SERVICE_ROLE_KEY is required to insert briefings from backend services.');
    }

    if (!canUseLocalFallback()) {
      throw new Error('Supabase service role is required to insert briefings in production');
    }
    
    const newBriefing: Briefing = {
      ...briefing,
      id: `brief-${Math.random().toString(36).slice(2, 9)}`,
      views_count: 0,
      created_at: new Date().toISOString()
    };
    localMockBriefings.unshift(newBriefing);
    await this.deleteFeedCachePrefix('briefings:');
    return newBriefing;
  },

  // --- get briefings pending Telegram Broadcast ---
  async getBriefingsPendingTelegram(limit = 5): Promise<Briefing[]> {
    if (isSupabaseConfigured && supabaseReader) {
      const { data, error } = await supabaseReader
        .from('briefings')
        .select('*')
        .eq('is_published', true)
        .eq('moderation_status', 'auto_approved')
        .eq('telegram_posted', false)
        .order('published_at', { ascending: true })
        .limit(limit);
      if (!error && data) return data as Briefing[];
      logDbError('[DB] Telegram pending briefings query failed.', error);
      if (!canUseLocalFallback()) return [];
    }
    return canUseLocalFallback()
      ? localMockBriefings.filter(b => b.is_published && b.moderation_status === 'auto_approved' && !b.telegram_posted).slice(0, limit)
      : [];
  },

  // --- mark Telegram posted status ---
  async markBriefingAsTelegramPosted(id: string, messageId: number): Promise<void> {
    if (isSupabaseConfigured && supabaseAdmin) {
      const { error } = await supabaseAdmin.from('briefings').update({
        telegram_posted: true,
        telegram_message_id: messageId
      }).eq('id', id);
      if (error) logDbError(`[DB] Failed to mark briefing ${id} as Telegram-posted.`, error);
      return;
    }
    
    const idx = localMockBriefings.findIndex(b => b.id === id);
    if (idx !== -1) {
      localMockBriefings[idx] = {
        ...localMockBriefings[idx],
        telegram_posted: true,
        telegram_message_id: messageId
      };
    }
  },

  // --- create automation execution log ---
  async logAutomationJob(log: Omit<AutomationLog, 'id' | 'created_at'>): Promise<void> {
    if (isSupabaseConfigured && supabaseAdmin) {
      await supabaseAdmin.from('automation_logs').insert([log]);
      return;
    }
    
    localLogs.unshift({
      ...log,
      id: `log-${Math.random().toString(36).slice(2, 9)}`,
      created_at: new Date().toISOString()
    });
  },

  // --- get pending review briefings ---
  async getPendingReviewBriefings(): Promise<Briefing[]> {
    if (isSupabaseConfigured && supabaseReader) {
      const { data, error } = await supabaseReader
        .from('briefings')
        .select('*')
        .eq('moderation_status', 'pending_review')
        .order('published_at', { ascending: false });
      if (!error && data) return data as Briefing[];
      logDbError('[DB] Pending review briefings query failed.', error);
      if (!canUseLocalFallback()) return [];
    }
    
    return canUseLocalFallback() ? localMockBriefings.filter(b => b.moderation_status === 'pending_review') : [];
  },

  // --- get moderation logs or archive ---
  async getModerationArchive(status: 'auto_approved' | 'flagged_discarded'): Promise<Briefing[]> {
    if (isSupabaseConfigured && supabaseReader) {
      const { data, error } = await supabaseReader
        .from('briefings')
        .select('*')
        .eq('moderation_status', status)
        .order('published_at', { ascending: false });
      if (!error && data) return data as Briefing[];
      logDbError('[DB] Moderation archive query failed.', error);
      if (!canUseLocalFallback()) return [];
    }
    
    return canUseLocalFallback() ? localMockBriefings.filter(b => b.moderation_status === status) : [];
  },

  // --- update briefing moderation status ---
  async updateBriefingModerationStatus(id: string, status: any, isPublished: boolean, fields?: Partial<Briefing>): Promise<Briefing | null> {
    if (isSupabaseConfigured && supabaseAdmin) {
      const payload = {
        moderation_status: status,
        is_published: isPublished,
        ...fields
      };
      const { data, error } = await supabaseAdmin
        .from('briefings')
        .update(payload)
        .eq('id', id)
        .select()
        .single();
      if (!error && data) {
        await this.deleteFeedCachePrefix('briefings:');
        return data as Briefing;
      }
      logDbError(`[DB] Failed to update briefing moderation status for ${id}.`, error);
      return null;
    }

    if (!canUseLocalFallback()) return null;

    const idx = localMockBriefings.findIndex(b => b.id === id);
    if (idx !== -1) {
      localMockBriefings[idx] = {
        ...localMockBriefings[idx],
        moderation_status: status,
        is_published: isPublished,
        ...fields
      };
      await this.deleteFeedCachePrefix('briefings:');
      return localMockBriefings[idx];
    }
    return null;
  },

  // --- create moderation override validation log ---
  async logModerationAction(log: Omit<ModerationLog, 'id' | 'created_at'>): Promise<void> {
    if (isSupabaseConfigured && supabaseAdmin) {
      await supabaseAdmin.from('moderation_logs').insert([log]);
      return;
    }
    
    localModerationLogs.unshift({
      ...log,
      id: `modlog-${Math.random().toString(36).slice(2, 9)}`,
      created_at: new Date().toISOString()
    });
  },

  // --- insert media asset ---
  async insertMediaAsset(asset: Omit<MediaAsset, 'id' | 'created_at'>): Promise<MediaAsset> {
    if (isSupabaseConfigured && supabaseAdmin) {
      const { data, error } = await supabaseAdmin.from('media_assets').insert([asset]).select().single();
      if (!error && data) return data as MediaAsset;
    }
    
    const newAsset: MediaAsset = {
      ...asset,
      id: `asset-${Math.random().toString(36).slice(2, 9)}`,
      created_at: new Date().toISOString()
    };
    return newAsset;
  },

  // --- get media asset by briefing ---
  async getMediaAssetByBriefing(briefingId: string): Promise<MediaAsset | null> {
    if (isSupabaseConfigured && supabaseReader) {
      const { data, error } = await supabaseReader.from('media_assets').select('*').eq('briefing_id', briefingId).maybeSingle();
      if (!error && data) return data as MediaAsset;
      if (!canUseLocalFallback()) return null;
    }
    return null;
  },

  // --- log source telemetry ---
  async logSourceTelemetry(telemetry: Omit<SourceTelemetry, 'id' | 'created_at'>): Promise<void> {
    if (isSupabaseConfigured && supabaseAdmin) {
      await supabaseAdmin.from('source_telemetry').insert([telemetry]);
      return;
    }
  },

  // --- log redirect telemetry ---
  async logRedirectTelemetry(telemetry: Omit<RedirectTelemetry, 'id' | 'created_at'>): Promise<void> {
    if (isSupabaseConfigured && supabaseAdmin) {
      await supabaseAdmin.from('redirect_telemetry').insert([telemetry]);
      return;
    }
  },

  // --- insert briefing embedding ---
  async insertBriefingEmbedding(briefingId: string, embedding: number[]): Promise<void> {
    if (isSupabaseConfigured && supabaseAdmin) {
      await supabaseAdmin.from('briefing_embeddings').insert([{ briefing_id: briefingId, embedding }]);
      return;
    }
  },

  // --- get all briefing embeddings ---
  async getAllBriefingEmbeddings(): Promise<{ briefing_id: string; embedding: number[] }[]> {
    if (isSupabaseConfigured && supabaseAdmin) {
      const { data, error } = await supabaseAdmin.from('briefing_embeddings').select('briefing_id, embedding');
      if (!error && data) return data as { briefing_id: string; embedding: number[] }[];
    }
    return [];
  },

  // --- insert verified sources (with URL dedup) ---
  async insertSources(sources: { name: string; url: string; source_type: Source['source_type']; reliability_score: number }[]): Promise<number> {
    if (isSupabaseConfigured && supabaseAdmin) {
      const payload = sources.map(s => ({
        name: s.name,
        url: s.url,
        source_type: s.source_type,
        reliability_score: s.reliability_score,
        is_active: true
      }));
      const { data, error } = await supabaseAdmin.from('sources').upsert(payload, { onConflict: 'url', ignoreDuplicates: true }).select();
      if (!error && data) return data.length;
      console.error('[DB] Failed to insert sources:', error);
      return 0;
    }

    // Mock fallback: add to MOCK_SOURCES if not already present
    let added = 0;
    for (const s of sources) {
      if (!MOCK_SOURCES.some(existing => existing.url === s.url)) {
        MOCK_SOURCES.push({
          id: `source-${Math.random().toString(36).slice(2, 9)}`,
          name: s.name,
          url: s.url,
          source_type: s.source_type,
          reliability_score: s.reliability_score,
          is_active: true,
          created_at: new Date().toISOString()
        });
        added++;
      }
    }
    return added;
  },

  // --- get briefing by ID ---
  async getBriefingById(id: string): Promise<Briefing | null> {
    if (isSupabaseConfigured && supabase) {
      const { data, error } = await supabase.from('briefings').select('*').eq('id', id).single();
      if (!error && data) return data as Briefing;
    }
    const mock = localMockBriefings.find(b => b.id === id);
    return mock || null;
  },

  // --- get source by ID ---
  async getSourceById(sourceId: string): Promise<Source | null> {
    if (isSupabaseConfigured && supabase) {
      const { data, error } = await supabase.from('sources').select('*').eq('id', sourceId).single();
      if (!error && data) return data as Source;
    }
    const mock = MOCK_SOURCES.find(s => s.id === sourceId);
    return mock || null;
  },

  // --- get recent briefings (sliding window for duplicate detection) ---
  async getRecentBriefings(days: number = 7): Promise<Briefing[]> {
    const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
    if (isSupabaseConfigured && supabase) {
      const { data, error } = await supabase
        .from('briefings')
        .select('*')
        .gte('created_at', cutoff)
        .order('created_at', { ascending: false });
      if (!error && data) return data as Briefing[];
    }
    return localMockBriefings.filter(b => b.created_at >= cutoff);
  },

  // --- prune old records ---
  async pruneOldRawUpdates(days: number = 14): Promise<number> {
    const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
    if (isSupabaseConfigured && supabaseAdmin) {
      const { data, error } = await supabaseAdmin
        .from('raw_updates')
        .delete()
        .in('status', ['processed', 'filtered'])
        .lt('created_at', cutoff)
        .select();
      if (!error && data) return data.length;
      return 0;
    }
    const before = localRawUpdates.length;
    localRawUpdates = localRawUpdates.filter(r =>
      !(['processed', 'filtered'].includes(r.status)) || r.created_at >= cutoff
    );
    return before - localRawUpdates.length;
  },

  // --- prune old automation logs ---
  async pruneOldAutomationLogs(days: number = 30): Promise<number> {
    const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
    if (isSupabaseConfigured && supabaseAdmin) {
      const { data, error } = await supabaseAdmin
        .from('automation_logs')
        .delete()
        .lt('created_at', cutoff)
        .select();
      if (!error && data) return data.length;
      return 0;
    }
    const before = localLogs.length;
    localLogs = localLogs.filter(l => l.created_at >= cutoff);
    return before - localLogs.length;
  },

  // --- persist live TON market data ---
  async persistMarketData(data: {
    price_usd: number;
    volume_24h?: number;
    market_cap?: number;
    change_24h?: number;
    last_updated: string;
  }): Promise<void> {
    if (isSupabaseConfigured && supabaseAdmin) {
      const { error } = await supabaseAdmin
        .from('market_data')
        .insert([data]);
      if (error) {
        console.error('[DB] Failed to persist market data:', error.message);
      }
      return;
    }
  },

  // --- persist wallet connection ---
  async persistWalletConnection(wallet: {
    address: string;
    network?: string;
    public_key?: string;
  }): Promise<void> {
    if (isSupabaseConfigured && supabaseAdmin) {
      const { error } = await supabaseAdmin
        .from('wallets')
        .upsert([wallet], { onConflict: 'address' });
      if (error) {
        console.error('[DB] Failed to persist wallet connection:', error.message);
      }
      return;
    }
  }
};
