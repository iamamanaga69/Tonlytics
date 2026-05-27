import { useEffect, useState, useCallback, useRef } from 'react';
import { useTerminalStore } from '@/store/terminalStore';
import { supabase, isSupabaseReady } from '@/lib/supabase-client';
import { apiFetch } from '@/lib/api-client';
import type { Briefing } from '@/types';

export function useBriefings(options: { initialBriefings?: Briefing[] } = {}) {
  const initialBriefings = options.initialBriefings || [];
  const [briefings, setBriefings] = useState<Briefing[]>(initialBriefings);
  const [isLoading, setIsLoading] = useState<boolean>(initialBriefings.length === 0);
  const [error, setError] = useState<string | null>(null);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  
  const { selectedCategory, searchQuery } = useTerminalStore();

  const fetchBriefings = useCallback(async (showLoading = true) => {
    if (showLoading) setIsLoading(true);
    setError(null);
    
    try {
      // === PATH 1: Direct Supabase reads (lowest latency, real-time capable) ===
      if (isSupabaseReady) {
        let query = supabase
          .from('briefings')
          .select('*')
          .eq('is_published', true)
          .order('published_at', { ascending: false })
          .limit(50);
        
        if (selectedCategory !== 'All') {
          query = query.eq('category', selectedCategory);
        }
        
        if (searchQuery) {
          query = query.or(
            `title.ilike.%${searchQuery}%,briefing.ilike.%${searchQuery}%,why_it_matters.ilike.%${searchQuery}%`
          );
        }
        
        const { data, error: dbError } = await query;
        
        if (!dbError && data) {
          setBriefings(data);
          return; // Success — Supabase delivered live data
        }
        
        // If Supabase returned empty or had an error, fall through to next path
        if (dbError) {
          console.warn('[useBriefings] Supabase direct query failed, trying fallback:', dbError.message);
        }
      }

      // === PATH 2: Railway backend API or Next.js API route ===
      // apiFetch auto-resolves to Railway if NEXT_PUBLIC_API_URL is set,
      // otherwise falls back to the /api/briefings Next.js route
      const categoryParam = selectedCategory !== 'All' ? `category=${encodeURIComponent(selectedCategory)}` : '';
      const searchParam = searchQuery ? `search=${encodeURIComponent(searchQuery)}` : '';
      const queryParts = [categoryParam, searchParam].filter(Boolean);
      const queryString = queryParts.length > 0 ? `?${queryParts.join('&')}` : '';
      
      const data = await apiFetch<{ success?: boolean; briefings?: Briefing[]; data?: Briefing[] }>(
        `/api/briefings${queryString}`,
        { timeoutMs: 12_000 }
      );

      // Railway backend returns { success: true, data: [...] }
      // Next.js route returns { success: true, briefings: [...] }
      const items = data.briefings || data.data || [];
      if (Array.isArray(items)) {
        setBriefings(items);
      } else {
        throw new Error('Invalid API data payload received');
      }
    } catch (err) {
      console.error('[useBriefings] All data sources failed:', err);
      setError(err instanceof Error ? err.message : 'Database communication failure');
    } finally {
      if (showLoading) setIsLoading(false);
    }
  }, [selectedCategory, searchQuery]);

  // Initial load and filter reactive updates
  useEffect(() => {
    const timer = window.setTimeout(() => {
      void fetchBriefings(true);
    }, 0);
    return () => window.clearTimeout(timer);
  }, [fetchBriefings]);

  // === SUPABASE REALTIME SUBSCRIPTION ===
  useEffect(() => {
    if (!isSupabaseReady) return;

    // Subscribe to new briefings via Supabase Realtime
    const channel = supabase
      .channel('briefings-realtime')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'briefings',
          filter: 'is_published=eq.true',
        },
        (payload) => {
          const newBriefing = payload.new as Briefing;
          
          // Prepend to the feed immediately
          setBriefings((prev) => {
            // Deduplicate
            if (prev.some((b) => b.id === newBriefing.id)) return prev;
            return [newBriefing, ...prev];
          });
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'briefings',
        },
        (payload) => {
          const updated = payload.new as Briefing;
          setBriefings((prev) =>
            prev.map((b) => (b.id === updated.id ? updated : b))
          );
        }
      )
      .subscribe();

    channelRef.current = channel;

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, []);

  // Background polling fallback (every 3 minutes)
  useEffect(() => {
    const interval = setInterval(() => {
      fetchBriefings(false);
    }, 180 * 1000);
    
    return () => clearInterval(interval);
  }, [fetchBriefings]);

  return {
    briefings,
    isLoading,
    error,
    refresh: () => fetchBriefings(true),
    silentRefresh: () => fetchBriefings(false)
  };
}
