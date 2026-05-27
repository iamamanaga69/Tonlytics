import { Client } from 'pg';
import * as fs from 'fs';
import * as path from 'path';

/**
 * Inline essential schema SQL for Railway environments where migration.sql
 * might not be resolvable on the filesystem.
 */
const INLINE_SCHEMA_SQL = `
-- Core tables
CREATE TABLE IF NOT EXISTS sources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  url VARCHAR(512) NOT NULL UNIQUE,
  source_type VARCHAR(50) NOT NULL,
  reliability_score INTEGER NOT NULL DEFAULT 3,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS raw_updates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_id UUID REFERENCES sources(id) ON DELETE CASCADE,
  external_id VARCHAR(255),
  source_url VARCHAR(512) NOT NULL UNIQUE,
  raw_title TEXT NOT NULL,
  raw_content TEXT NOT NULL,
  publish_date TIMESTAMPTZ NOT NULL,
  status VARCHAR(50) NOT NULL DEFAULT 'pending',
  retry_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS briefings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  raw_update_id UUID REFERENCES raw_updates(id) ON DELETE SET NULL,
  title VARCHAR(512) NOT NULL,
  slug VARCHAR(512) NOT NULL UNIQUE,
  briefing TEXT NOT NULL,
  why_it_matters TEXT NOT NULL,
  category VARCHAR(100) NOT NULL,
  tags TEXT[] NOT NULL DEFAULT '{}',
  is_published BOOLEAN NOT NULL DEFAULT false,
  telegram_posted BOOLEAN NOT NULL DEFAULT false,
  telegram_message_id INTEGER,
  views_count INTEGER NOT NULL DEFAULT 0,
  confidence_score INTEGER NOT NULL DEFAULT 80,
  readability_score INTEGER NOT NULL DEFAULT 80,
  hallucination_probability INTEGER NOT NULL DEFAULT 5,
  source_quality_score INTEGER NOT NULL DEFAULT 80,
  moderation_status VARCHAR(50) NOT NULL DEFAULT 'pending_review',
  image_url VARCHAR(512),
  video_url VARCHAR(512),
  ecosystem_context TEXT,
  discussion_url VARCHAR(512),
  timeline JSONB NOT NULL DEFAULT '[]',
  related_protocols JSONB NOT NULL DEFAULT '[]',
  source_name VARCHAR(255),
  source_url VARCHAR(512),
  key_takeaways TEXT[] NOT NULL DEFAULT '{}',
  spam_probability INTEGER NOT NULL DEFAULT 0,
  duplicate_probability INTEGER NOT NULL DEFAULT 0,
  relevance_score INTEGER NOT NULL DEFAULT 0,
  published_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS moderation_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  briefing_id UUID REFERENCES briefings(id) ON DELETE CASCADE NOT NULL,
  raw_update_id UUID REFERENCES raw_updates(id) ON DELETE SET NULL,
  validation_errors TEXT[] NOT NULL DEFAULT '{}',
  confidence_score INTEGER NOT NULL,
  action_taken VARCHAR(50) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS automation_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_name VARCHAR(100) NOT NULL,
  status VARCHAR(50) NOT NULL,
  records_processed INTEGER NOT NULL DEFAULT 0,
  duration_ms INTEGER NOT NULL DEFAULT 0,
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS media_assets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  briefing_id UUID REFERENCES briefings(id) ON DELETE CASCADE,
  original_url VARCHAR(512) NOT NULL,
  local_path VARCHAR(512) NOT NULL,
  mime_type VARCHAR(100) NOT NULL,
  file_size INTEGER NOT NULL,
  width INTEGER,
  height INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS source_telemetry (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_id UUID REFERENCES sources(id) ON DELETE CASCADE,
  last_crawled_at TIMESTAMPTZ,
  success_count INTEGER NOT NULL DEFAULT 0,
  failure_count INTEGER NOT NULL DEFAULT 0,
  stale_count INTEGER NOT NULL DEFAULT 0,
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS redirect_telemetry (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  briefing_id UUID REFERENCES briefings(id) ON DELETE CASCADE,
  destination_url VARCHAR(512) NOT NULL,
  user_agent TEXT,
  ip_hash VARCHAR(64),
  referrer TEXT,
  status_code INTEGER NOT NULL DEFAULT 302,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS briefing_embeddings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  briefing_id UUID REFERENCES briefings(id) ON DELETE CASCADE NOT NULL,
  embedding JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS news (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title VARCHAR(512) NOT NULL,
  content TEXT,
  source_url VARCHAR(512),
  published_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS articles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title VARCHAR(512) NOT NULL,
  slug VARCHAR(512) NOT NULL UNIQUE,
  content TEXT NOT NULL,
  author VARCHAR(255),
  published_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS ecosystem_updates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title VARCHAR(512) NOT NULL,
  description TEXT,
  category VARCHAR(100),
  project_url VARCHAR(512),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS market_data (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  price_usd NUMERIC(20, 8) NOT NULL,
  volume_24h NUMERIC(24, 2),
  market_cap NUMERIC(24, 2),
  change_24h NUMERIC(8, 4),
  last_updated TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS wallets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  address VARCHAR(255) NOT NULL UNIQUE,
  network VARCHAR(50),
  public_key VARCHAR(255),
  connected_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE,
  wallet_address VARCHAR(255) REFERENCES wallets(address) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS trending_topics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  topic VARCHAR(255) NOT NULL UNIQUE,
  mention_count INTEGER NOT NULL DEFAULT 1,
  last_seen_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS feed_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key VARCHAR(255) NOT NULL UNIQUE,
  data JSONB NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_briefings_published ON briefings(is_published, moderation_status);
CREATE INDEX IF NOT EXISTS idx_briefings_category ON briefings(category);
CREATE INDEX IF NOT EXISTS idx_briefings_slug ON briefings(slug);
CREATE INDEX IF NOT EXISTS idx_briefings_created ON briefings(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_raw_updates_status ON raw_updates(status);
CREATE INDEX IF NOT EXISTS idx_raw_updates_source ON raw_updates(source_id);
CREATE INDEX IF NOT EXISTS idx_sources_active ON sources(is_active);

-- Seed initial sources
INSERT INTO sources (name, url, source_type, reliability_score) VALUES
  ('TON Foundation Blog', 'https://ton.org/en/blog/rss', 'rss', 5),
  ('TON Core Releases', 'https://github.com/ton-blockchain/ton/releases', 'github', 5),
  ('Telegram Apps SDK', 'https://github.com/telegram-apps/sdk/releases', 'github', 5),
  ('TON Community', 'https://t.me/s/toncoin', 'telegram', 5),
  ('TON Society', 'https://t.me/s/tonsociety', 'telegram', 4),
  ('TON Keeper', 'https://t.me/s/tonkeeper', 'telegram', 4),
  ('STON.fi', 'https://t.me/s/stonfichannel', 'telegram', 4),
  ('Fragment', 'https://t.me/s/fragment', 'telegram', 4),
  ('DeDust', 'https://t.me/s/dedust', 'telegram', 4),
  ('MyTonWallet', 'https://t.me/s/mytonwallet_en', 'telegram', 4)
ON CONFLICT (url) DO NOTHING;
`;

const INLINE_DISABLE_RLS_SQL = `
-- Disable RLS on all tables to ensure queries work without policy issues
ALTER TABLE IF EXISTS sources DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS briefings DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS raw_updates DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS moderation_logs DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS automation_logs DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS media_assets DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS source_telemetry DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS redirect_telemetry DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS briefing_embeddings DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS news DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS articles DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS ecosystem_updates DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS market_data DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS wallets DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS users DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS trending_topics DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS feed_cache DISABLE ROW LEVEL SECURITY;

-- Grant SELECT to anon and authenticated on all public tables
GRANT SELECT ON public.briefings TO anon, authenticated;
GRANT SELECT ON public.sources TO anon, authenticated;
GRANT SELECT ON public.raw_updates TO anon, authenticated;
GRANT SELECT ON public.media_assets TO anon, authenticated;
GRANT SELECT ON public.news TO anon, authenticated;
GRANT SELECT ON public.articles TO anon, authenticated;
GRANT SELECT ON public.ecosystem_updates TO anon, authenticated;
GRANT SELECT ON public.market_data TO anon, authenticated;
GRANT SELECT ON public.wallets TO anon, authenticated;
GRANT SELECT ON public.trending_topics TO anon, authenticated;
GRANT SELECT ON public.feed_cache TO anon, authenticated;

-- Grant ALL to service_role
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO service_role;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO service_role;
`;

export async function runDbMigrations(): Promise<void> {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    console.log('[DATABASE/MIGRATIONS] DATABASE_URL is not set. Skipping automated schema migration.');
    return;
  }

  console.log('[DATABASE/MIGRATIONS] Starting automated schema check / migration...');
  
  const client = new Client({ connectionString: databaseUrl });
  
  try {
    await client.connect();
    
    // Check if briefings table already exists
    const checkRes = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'briefings'
      );
    `);
    
    const tableExists = checkRes.rows[0]?.exists;
    
    if (tableExists) {
      console.log('[DATABASE/MIGRATIONS] Table "briefings" already exists. Schema is already initialized.');
      
      // Check if new tables also exist
      const checkNewTables = await client.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_schema = 'public' 
          AND table_name = 'market_data'
        );
      `);
      
      const newTablesExist = checkNewTables.rows[0]?.exists;
      if (newTablesExist) {
        console.log('[DATABASE/MIGRATIONS] All tables exist. Running RLS disable + permissions...');
        // Always run the RLS disable + permissions script
        try {
          await client.query(INLINE_DISABLE_RLS_SQL);
          console.log('[DATABASE/MIGRATIONS] RLS disabled + permissions granted successfully.');
        } catch (rlsErr) {
          console.warn('[DATABASE/MIGRATIONS] RLS/permissions script had non-fatal errors:', rlsErr);
        }
        await client.end();
        return;
      }
      console.log('[DATABASE/MIGRATIONS] New tables (e.g. market_data) do not exist yet. Running schema additions.');
    } else {
      console.log('[DATABASE/MIGRATIONS] Schema tables not found. Running full schema migration...');
    }
    
    // Try to find migration.sql on filesystem first
    const pathsToTry = [
      path.resolve(process.cwd(), 'scripts/migration.sql'),
      path.resolve(process.cwd(), '../scripts/migration.sql'),
      path.resolve(process.cwd(), '../../scripts/migration.sql'),
      path.resolve(__dirname, '../../../../scripts/migration.sql'),
      path.resolve(__dirname, '../../../scripts/migration.sql')
    ];
    
    let sqlExecuted = false;
    
    for (const p of pathsToTry) {
      if (fs.existsSync(p)) {
        console.log(`[DATABASE/MIGRATIONS] Found migration SQL file at: ${p}`);
        const sql = fs.readFileSync(p, 'utf8');
        await client.query(sql);
        console.log('[DATABASE/MIGRATIONS] File-based migration executed successfully!');
        sqlExecuted = true;
        break;
      }
    }
    
    // Fallback: Use inline schema SQL if no migration file was found
    if (!sqlExecuted) {
      console.log('[DATABASE/MIGRATIONS] No migration.sql file found on filesystem. Using INLINE schema SQL...');
      await client.query(INLINE_SCHEMA_SQL);
      console.log('[DATABASE/MIGRATIONS] Inline schema migration executed successfully!');
    }
    
    // Always run RLS disable + permissions
    try {
      await client.query(INLINE_DISABLE_RLS_SQL);
      console.log('[DATABASE/MIGRATIONS] RLS disabled + permissions granted successfully.');
    } catch (rlsErr) {
      console.warn('[DATABASE/MIGRATIONS] RLS/permissions script had non-fatal errors:', rlsErr);
    }
    
    // Also try grant_permissions.sql from filesystem
    const grantPaths = [
      path.resolve(process.cwd(), 'scripts/grant_permissions.sql'),
      path.resolve(process.cwd(), '../scripts/grant_permissions.sql'),
      path.resolve(process.cwd(), '../../scripts/grant_permissions.sql'),
    ];
    
    for (const p of grantPaths) {
      if (fs.existsSync(p)) {
        console.log(`[DATABASE/MIGRATIONS] Found permissions SQL file at: ${p}`);
        try {
          const grantSql = fs.readFileSync(p, 'utf8');
          await client.query(grantSql);
          console.log('[DATABASE/MIGRATIONS] File-based permissions applied successfully!');
        } catch (grantErr) {
          console.warn('[DATABASE/MIGRATIONS] File-based permissions had non-fatal errors:', grantErr);
        }
        break;
      }
    }
    
  } catch (error) {
    console.error('[DATABASE/MIGRATIONS] Failed to execute database migrations:', error);
  } finally {
    try {
      await client.end();
    } catch (e) {}
  }
}
