-- =============================================
-- TONLYTICS PRODUCTION SCHEMA
-- Run this in Supabase Dashboard → SQL Editor
-- =============================================

-- 1. SOURCES
CREATE TABLE IF NOT EXISTS sources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  url VARCHAR(512) NOT NULL UNIQUE,
  source_type VARCHAR(50) NOT NULL,
  reliability_score INTEGER NOT NULL DEFAULT 3,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. RAW UPDATES
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

-- 3. BRIEFINGS
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

-- 4. MODERATION LOGS
CREATE TABLE IF NOT EXISTS moderation_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  briefing_id UUID REFERENCES briefings(id) ON DELETE CASCADE NOT NULL,
  raw_update_id UUID REFERENCES raw_updates(id) ON DELETE SET NULL,
  validation_errors TEXT[] NOT NULL DEFAULT '{}',
  confidence_score INTEGER NOT NULL,
  action_taken VARCHAR(50) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 5. AUTOMATION LOGS
CREATE TABLE IF NOT EXISTS automation_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_name VARCHAR(100) NOT NULL,
  status VARCHAR(50) NOT NULL,
  records_processed INTEGER NOT NULL DEFAULT 0,
  duration_ms INTEGER NOT NULL DEFAULT 0,
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 6. MEDIA ASSETS
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

-- 7. SOURCE TELEMETRY
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

-- 8. REDIRECT TELEMETRY
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

-- 9. BRIEFING EMBEDDINGS
CREATE TABLE IF NOT EXISTS briefing_embeddings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  briefing_id UUID REFERENCES briefings(id) ON DELETE CASCADE NOT NULL,
  embedding JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 11. NEWS
CREATE TABLE IF NOT EXISTS news (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title VARCHAR(512) NOT NULL,
  content TEXT,
  source_url VARCHAR(512),
  published_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 12. ARTICLES
CREATE TABLE IF NOT EXISTS articles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title VARCHAR(512) NOT NULL,
  slug VARCHAR(512) NOT NULL UNIQUE,
  content TEXT NOT NULL,
  author VARCHAR(255),
  published_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 13. ECOSYSTEM UPDATES
CREATE TABLE IF NOT EXISTS ecosystem_updates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title VARCHAR(512) NOT NULL,
  description TEXT,
  category VARCHAR(100),
  project_url VARCHAR(512),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 14. MARKET DATA
CREATE TABLE IF NOT EXISTS market_data (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  price_usd NUMERIC(20, 8) NOT NULL,
  volume_24h NUMERIC(24, 2),
  market_cap NUMERIC(24, 2),
  change_24h NUMERIC(8, 4),
  last_updated TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 15. WALLETS
CREATE TABLE IF NOT EXISTS wallets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  address VARCHAR(255) NOT NULL UNIQUE,
  network VARCHAR(50),
  public_key VARCHAR(255),
  connected_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 16. USERS
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE,
  wallet_address VARCHAR(255) REFERENCES wallets(address) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 17. TRENDING TOPICS
CREATE TABLE IF NOT EXISTS trending_topics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  topic VARCHAR(255) NOT NULL UNIQUE,
  mention_count INTEGER NOT NULL DEFAULT 1,
  last_seen_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 18. FEED CACHE
CREATE TABLE IF NOT EXISTS feed_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key VARCHAR(255) NOT NULL UNIQUE,
  data JSONB NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- =============================================
-- ROW LEVEL SECURITY
-- =============================================
ALTER TABLE sources ENABLE ROW LEVEL SECURITY;
ALTER TABLE raw_updates ENABLE ROW LEVEL SECURITY;
ALTER TABLE briefings ENABLE ROW LEVEL SECURITY;
ALTER TABLE moderation_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE automation_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE media_assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE source_telemetry ENABLE ROW LEVEL SECURITY;
ALTER TABLE redirect_telemetry ENABLE ROW LEVEL SECURITY;
ALTER TABLE briefing_embeddings ENABLE ROW LEVEL SECURITY;
ALTER TABLE news ENABLE ROW LEVEL SECURITY;
ALTER TABLE articles ENABLE ROW LEVEL SECURITY;
ALTER TABLE ecosystem_updates ENABLE ROW LEVEL SECURITY;
ALTER TABLE market_data ENABLE ROW LEVEL SECURITY;
ALTER TABLE wallets ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE trending_topics ENABLE ROW LEVEL SECURITY;
ALTER TABLE feed_cache ENABLE ROW LEVEL SECURITY;

-- Public read: published briefings only
CREATE POLICY "Public can read published briefings"
  ON briefings FOR SELECT
  USING (is_published = true);

-- Public read: active sources
CREATE POLICY "Public can read active sources"
  ON sources FOR SELECT
  USING (is_active = true);

-- Public read: news, articles, ecosystem_updates, market_data, wallets, trending_topics
CREATE POLICY "Public can read news" ON news FOR SELECT USING (true);
CREATE POLICY "Public can read articles" ON articles FOR SELECT USING (true);
CREATE POLICY "Public can read ecosystem_updates" ON ecosystem_updates FOR SELECT USING (true);
CREATE POLICY "Public can read market_data" ON market_data FOR SELECT USING (true);
CREATE POLICY "Public can read wallets" ON wallets FOR SELECT USING (true);
CREATE POLICY "Public can read trending_topics" ON trending_topics FOR SELECT USING (true);

-- Service role: full access on all tables
CREATE POLICY "Service role full access on sources"
  ON sources FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Service role full access on raw_updates"
  ON raw_updates FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Service role full access on briefings"
  ON briefings FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Service role full access on moderation_logs"
  ON moderation_logs FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Service role full access on automation_logs"
  ON automation_logs FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Service role full access on media_assets"
  ON media_assets FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Service role full access on source_telemetry"
  ON source_telemetry FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Service role full access on redirect_telemetry"
  ON redirect_telemetry FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Service role full access on briefing_embeddings"
  ON briefing_embeddings FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Service role full access on news"
  ON news FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Service role full access on articles"
  ON articles FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Service role full access on ecosystem_updates"
  ON ecosystem_updates FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Service role full access on market_data"
  ON market_data FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Service role full access on wallets"
  ON wallets FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Service role full access on users"
  ON users FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Service role full access on trending_topics"
  ON trending_topics FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Service role full access on feed_cache"
  ON feed_cache FOR ALL USING (auth.role() = 'service_role');

-- =============================================
-- INDEXES
-- =============================================
CREATE INDEX IF NOT EXISTS idx_briefings_published ON briefings(is_published, moderation_status);
CREATE INDEX IF NOT EXISTS idx_briefings_category ON briefings(category);
CREATE INDEX IF NOT EXISTS idx_briefings_slug ON briefings(slug);
CREATE INDEX IF NOT EXISTS idx_briefings_created ON briefings(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_raw_updates_status ON raw_updates(status);
CREATE INDEX IF NOT EXISTS idx_raw_updates_source ON raw_updates(source_id);
CREATE INDEX IF NOT EXISTS idx_sources_active ON sources(is_active);

-- =============================================
-- REALTIME
-- =============================================
ALTER PUBLICATION supabase_realtime ADD TABLE briefings;

-- =============================================
-- SEED INITIAL SOURCES
-- =============================================
INSERT INTO sources (name, url, source_type, reliability_score) VALUES
  ('TON Foundation Blog', 'https://ton.org/en/blog/rss', 'rss', 5),
  ('TON Core Releases', 'https://github.com/ton-blockchain/ton/releases', 'github', 5),
  ('Telegram Apps SDK', 'https://github.com/telegram-apps/sdk/releases', 'github', 5),
  ('Watcher Guru', 'https://t.me/s/WatcherGuru', 'telegram', 4),
  ('TonNomads', 'https://t.me/s/tonnomads', 'telegram', 4)
ON CONFLICT (url) DO NOTHING;
