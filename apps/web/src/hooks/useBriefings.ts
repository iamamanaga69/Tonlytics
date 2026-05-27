import { useEffect, useState, useCallback } from 'react';
import { useTerminalStore } from '@/store/terminalStore';
import type { Briefing } from '@/types';

export function useBriefings() {
  const [briefings, setBriefings] = useState<Briefing[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  
  const { selectedCategory, searchQuery } = useTerminalStore();

  const fetchBriefings = useCallback(async (showLoading = true) => {
    if (showLoading) setIsLoading(true);
    setError(null);
    
    try {
      const categoryParam = selectedCategory !== 'All' ? `category=${encodeURIComponent(selectedCategory)}` : '';
      const searchParam = searchQuery ? `search=${encodeURIComponent(searchQuery)}` : '';
      
      const queryParts = [categoryParam, searchParam].filter(Boolean);
      const queryString = queryParts.length > 0 ? `?${queryParts.join('&')}` : '';
      
      const response = await fetch(`/api/briefings${queryString}`);
      
      if (!response.ok) {
        throw new Error(`Failed to load briefings: ${response.status}`);
      }
      
      const data = await response.json();
      if (data.success && Array.isArray(data.briefings)) {
        setBriefings(data.briefings);
      } else {
        throw new Error(data.error || 'Invalid API data payload received');
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

  // Set up background polling (Refreshes the intelligence terminal every 3 minutes silently)
  useEffect(() => {
    const interval = setInterval(() => {
      console.log('[HOOK BRIEFINGS] Executing silent background updates refresh');
      fetchBriefings(false);
    }, 180 * 1000); // 3 minutes
    
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
