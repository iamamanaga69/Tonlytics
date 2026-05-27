import { useEffect, useState, useCallback, useRef } from 'react';
import { useTerminalStore } from '@/store/terminalStore';
import { supabase, isSupabaseReady } from '@/lib/supabase-client';
import type { Briefing } from '@/types';

export function useBriefings() {
  const [briefings, setBriefings] = useState<Briefing[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  
  const { selectedCategory, searchQuery } = useTerminalStore();

  const fetchBriefings = useCallback(async (showLoading = true) => {
    if (showLoading) setIsLoading(true);
    setError(null);
    
    try {
      if (isSupabaseReady) {
        // === REAL SUPABASE QUERY ===
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
        
        if (dbError) {
          console.error('[HOOK] Supabase query error:', dbError);
          throw new Error(dbError.message);
        }
        
        setBriefings(data || []);
      } else {
        // Fallback to API route (which uses dbService mock fallback)
        const categoryParam = selectedCategory !== 'All' ? `category=${encodeURIComponent(selectedCategory)}` : '';
        const searchParam = searchQuery ? `search=${encodeURIComponent(searchQuery)}` : '';
        const queryParts = [categoryParam, searchParam].filter(Boolean);
        const queryString = queryParts.length > 0 ? `?${queryParts.join('&')}` : '';
        
        const response = await fetch(`/api/briefings${queryString}`);
        if (!response.ok) throw new Error(`Failed to load briefings: ${response.status}`);
        
        const data = await response.json();
        if (data.success && Array.isArray(data.briefings)) {
          setBriefings(data.briefings);
        } else {
          throw new Error(data.error || 'Invalid API data payload received');
        }
      }
    } catch (err) {
      console.error('[HOOK BRIEFINGS] Fetch failed:', err);
      setError(err instanceof Error ? err.message : 'Database communication failure');
    } finally {
      if (showLoading) setIsLoading(false);
    }
  }, [selectedCategory, searchQuery]);

  // Initial load and filter reactive updates
  useEffect(() => {
    fetchBriefings(true);
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
          console.log('[REALTIME] New briefing received:', payload.new);
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
      .subscribe((status) => {
        console.log('[REALTIME] Subscription status:', status);
      });

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
