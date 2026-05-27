-- =============================================
-- TONLYTICS: Grant permissions and disable RLS
-- Run this in Supabase Dashboard → SQL Editor
-- =============================================

-- Grant usage on public schema
GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;

-- Grant ALL privileges to service_role on all existing tables
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO service_role;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO service_role;
GRANT ALL PRIVILEGES ON ALL FUNCTIONS IN SCHEMA public TO service_role;

-- Grant SELECT privileges to anon and authenticated on the public-facing tables
GRANT SELECT ON public.briefings TO anon, authenticated;
GRANT SELECT ON public.sources TO anon, authenticated;
GRANT SELECT ON public.media_assets TO anon, authenticated;
GRANT SELECT ON public.news TO anon, authenticated;
GRANT SELECT ON public.articles TO anon, authenticated;
GRANT SELECT ON public.ecosystem_updates TO anon, authenticated;
GRANT SELECT ON public.market_data TO anon, authenticated;
GRANT SELECT ON public.wallets TO anon, authenticated;
GRANT SELECT ON public.trending_topics TO anon, authenticated;
GRANT SELECT ON public.feed_cache TO anon, authenticated;
GRANT SELECT ON public.raw_updates TO anon, authenticated;

-- Set default privileges for any tables created in the future
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT ON TABLES TO anon, authenticated;

-- =============================================
-- DISABLE ROW LEVEL SECURITY ON ALL TABLES
-- This is the most reliable way to ensure reads/writes work
-- across all roles without complex RLS policy debugging
-- =============================================
ALTER TABLE public.sources DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.briefings DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.raw_updates DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.moderation_logs DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.automation_logs DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.media_assets DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.source_telemetry DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.redirect_telemetry DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.briefing_embeddings DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.news DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.articles DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.ecosystem_updates DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.market_data DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.wallets DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.users DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.trending_topics DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.feed_cache DISABLE ROW LEVEL SECURITY;
