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

-- Set default privileges for any tables created in the future
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT ON TABLES TO anon, authenticated;

-- Disable RLS again to ensure it's off if policies are causing issues
ALTER TABLE public.sources DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.briefings DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.raw_updates DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.moderation_logs DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.automation_logs DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.media_assets DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.source_telemetry DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.redirect_telemetry DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.briefing_embeddings DISABLE ROW LEVEL SECURITY;
