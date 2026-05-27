-- QUICK FIX: Disable RLS on all tables temporarily
-- This allows both anon and service_role to access everything
-- We'll add proper RLS policies later

ALTER TABLE sources DISABLE ROW LEVEL SECURITY;
ALTER TABLE briefings DISABLE ROW LEVEL SECURITY;
ALTER TABLE raw_updates DISABLE ROW LEVEL SECURITY;
ALTER TABLE moderation_logs DISABLE ROW LEVEL SECURITY;
ALTER TABLE automation_logs DISABLE ROW LEVEL SECURITY;
ALTER TABLE media_assets DISABLE ROW LEVEL SECURITY;
ALTER TABLE source_telemetry DISABLE ROW LEVEL SECURITY;
ALTER TABLE redirect_telemetry DISABLE ROW LEVEL SECURITY;
ALTER TABLE briefing_embeddings DISABLE ROW LEVEL SECURITY;

-- Seed sources
INSERT INTO sources (name, url, source_type, reliability_score) VALUES
  ('TON Foundation Blog', 'https://ton.org/en/blog/rss', 'rss', 5),
  ('TON Core Releases', 'https://github.com/ton-blockchain/ton/releases', 'github', 5),
  ('Watcher Guru', 'https://t.me/s/WatcherGuru', 'telegram', 4),
  ('TonNomads', 'https://t.me/s/tonnomads', 'telegram', 4)
ON CONFLICT (url) DO NOTHING;

-- Enable realtime
DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE briefings;
EXCEPTION WHEN duplicate_object THEN
  NULL;
END $$;
