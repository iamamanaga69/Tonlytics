-- Tonlytics DB Initialization Migration Script
-- Path: supabase/migrations/20260527000000_init_schema.sql

-- Enable fuzzy search extension
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- 1. sources Table
CREATE TABLE IF NOT EXISTS sources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL,
  url VARCHAR(255) NOT NULL UNIQUE,
  source_type VARCHAR(50) NOT NULL, -- 'rss', 'github', 'telegram', 'twitter'
  reliability_score INT DEFAULT 3 CHECK (reliability_score BETWEEN 1 AND 5),
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. raw_updates Table
CREATE TABLE IF NOT EXISTS raw_updates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_id UUID REFERENCES sources(id) ON DELETE CASCADE,
  external_id VARCHAR(255),
  source_url VARCHAR(550) NOT NULL,
  raw_title VARCHAR(255) NOT NULL,
  raw_content TEXT NOT NULL,
  publish_date TIMESTAMPTZ NOT NULL,
  status VARCHAR(50) DEFAULT 'pending', -- 'pending', 'filtered', 'processed', 'failed'
  retry_count INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_raw_updates_status ON raw_updates(status);
CREATE INDEX IF NOT EXISTS idx_raw_updates_publish_date ON raw_updates(publish_date DESC);

-- 3. briefings Table
CREATE TABLE IF NOT EXISTS briefings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  raw_update_id UUID REFERENCES raw_updates(id) ON DELETE SET NULL,
  title VARCHAR(255) NOT NULL,
  slug VARCHAR(255) NOT NULL UNIQUE,
  briefing TEXT NOT NULL,
  why_it_matters TEXT NOT NULL,
  category VARCHAR(50) NOT NULL, -- 'Ecosystem', 'Infrastructure', 'Mini Apps', 'DeFi', 'Integration'
  tags TEXT[] DEFAULT '{}',
  is_published BOOLEAN DEFAULT TRUE,
  telegram_posted BOOLEAN DEFAULT FALSE,
  telegram_message_id INT,
  views_count INT DEFAULT 0,
  
  -- Moderation & Self-Evaluation Trust Metrics
  confidence_score INT DEFAULT 100 CHECK (confidence_score BETWEEN 0 AND 100),
  readability_score INT DEFAULT 100 CHECK (readability_score BETWEEN 0 AND 100),
  hallucination_probability INT DEFAULT 0 CHECK (hallucination_probability BETWEEN 0 AND 100),
  source_quality_score INT DEFAULT 100 CHECK (source_quality_score BETWEEN 0 AND 100),
  moderation_status VARCHAR(50) DEFAULT 'auto_approved', -- 'auto_approved', 'pending_review', 'flagged_discarded'

  published_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_briefings_published ON briefings(is_published, published_at DESC);
CREATE INDEX IF NOT EXISTS idx_briefings_moderation ON briefings(moderation_status);
CREATE INDEX IF NOT EXISTS idx_briefings_category ON briefings(category);
CREATE INDEX IF NOT EXISTS idx_briefings_slug ON briefings(slug);

-- 4. moderation_logs Table
CREATE TABLE IF NOT EXISTS moderation_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  briefing_id UUID REFERENCES briefings(id) ON DELETE CASCADE,
  raw_update_id UUID REFERENCES raw_updates(id) ON DELETE SET NULL,
  validation_errors TEXT[] DEFAULT '{}',
  confidence_score INT NOT NULL,
  action_taken VARCHAR(50) NOT NULL, -- 'held_for_review', 'auto_approved', 'discarded'
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_moderation_logs_created_at ON moderation_logs(created_at DESC);

-- 5. automation_logs Table
CREATE TABLE IF NOT EXISTS automation_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_name VARCHAR(100) NOT NULL, -- 'ingestion', 'processing', 'telegram_post'
  status VARCHAR(50) NOT NULL, -- 'success', 'failure'
  records_processed INT DEFAULT 0,
  duration_ms INT NOT NULL,
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_automation_logs_created_at ON automation_logs(created_at DESC);

-- Seed High-Signal Ingestion Sources
INSERT INTO sources (name, url, source_type, reliability_score) VALUES
('TON Foundation Blog', 'https://ton.org/en/blog/rss', 'rss', 5),
('TON Core Releases', 'https://github.com/ton-blockchain/ton/releases', 'github', 5),
('Telegram Apps SDK Updates', 'https://github.com/telegram-apps/sdk/releases', 'github', 5),
('TON Developer Announcements', 'https://t.me/s/tondevs', 'telegram', 4),
('TON Blockchain Channel', 'https://t.me/s/tonblockchain', 'telegram', 4)
ON CONFLICT (url) DO UPDATE 
SET reliability_score = EXCLUDED.reliability_score;
