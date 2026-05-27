import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function GET() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

  const env = {
    NEXT_PUBLIC_SUPABASE_URL: supabaseUrl ? '✅ set' : '❌ missing',
    NEXT_PUBLIC_SUPABASE_ANON_KEY: supabaseAnonKey ? '✅ set' : '❌ missing',
    SUPABASE_SERVICE_ROLE_KEY: serviceRoleKey ? '✅ set' : '❌ missing',
    SUPABASE_URL: process.env.SUPABASE_URL ? '✅ set' : '⚠️ missing (using NEXT_PUBLIC_SUPABASE_URL)',
    SUPABASE_ANON_KEY: process.env.SUPABASE_ANON_KEY ? '✅ set' : '⚠️ missing (using NEXT_PUBLIC_SUPABASE_ANON_KEY)',
    GEMINI_API_KEY: process.env.GEMINI_API_KEY ? '✅ set' : '❌ missing',
    OPENAI_API_KEY: process.env.OPENAI_API_KEY ? '✅ set' : '❌ missing',
    NODE_ENV: process.env.NODE_ENV || 'unknown',
    ALLOW_MOCK_DATA: process.env.ALLOW_MOCK_DATA || 'unset',
  };

  const counts: Record<string, number | string> = {
    sources: 'n/a',
    raw_updates: 'n/a',
    briefings: 'n/a',
    briefings_auto_approved: 'n/a',
    briefings_pending_review: 'n/a',
    briefings_published: 'n/a',
  };

  let connectionStatus = 'not_attempted';

  if (supabaseUrl && (supabaseAnonKey || serviceRoleKey)) {
    const client = createClient(supabaseUrl, serviceRoleKey || supabaseAnonKey);

    try {
      // Count sources
      const { count: sourcesCount, error: sourcesErr } = await client
        .from('sources')
        .select('*', { count: 'exact', head: true });
      counts.sources = sourcesErr ? `error: ${sourcesErr.message}` : (sourcesCount ?? 0);

      // Count raw_updates
      const { count: rawCount, error: rawErr } = await client
        .from('raw_updates')
        .select('*', { count: 'exact', head: true });
      counts.raw_updates = rawErr ? `error: ${rawErr.message}` : (rawCount ?? 0);

      // Count all briefings
      const { count: briefingsCount, error: briefErr } = await client
        .from('briefings')
        .select('*', { count: 'exact', head: true });
      counts.briefings = briefErr ? `error: ${briefErr.message}` : (briefingsCount ?? 0);

      // Count auto_approved briefings
      const { count: approvedCount, error: approvedErr } = await client
        .from('briefings')
        .select('*', { count: 'exact', head: true })
        .eq('moderation_status', 'auto_approved');
      counts.briefings_auto_approved = approvedErr ? `error: ${approvedErr.message}` : (approvedCount ?? 0);

      // Count pending_review briefings
      const { count: pendingCount, error: pendingErr } = await client
        .from('briefings')
        .select('*', { count: 'exact', head: true })
        .eq('moderation_status', 'pending_review');
      counts.briefings_pending_review = pendingErr ? `error: ${pendingErr.message}` : (pendingCount ?? 0);

      // Count published briefings
      const { count: pubCount, error: pubErr } = await client
        .from('briefings')
        .select('*', { count: 'exact', head: true })
        .eq('is_published', true);
      counts.briefings_published = pubErr ? `error: ${pubErr.message}` : (pubCount ?? 0);

      connectionStatus = 'connected';
    } catch (err) {
      connectionStatus = `error: ${err instanceof Error ? err.message : 'unknown'}`;
    }
  } else {
    connectionStatus = 'no_credentials';
  }

  return NextResponse.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    connection: connectionStatus,
    environment: env,
    counts,
  });
}
