'use client';

import { useEffect, useState } from 'react';
import { supabase, isSupabaseReady } from '@/lib/supabase-client';

export default function BreakingBanner() {
  const [headlines, setHeadlines] = useState<string[]>([]);

  useEffect(() => {
    async function fetchHeadlines() {
      if (!isSupabaseReady) {
        setHeadlines([
          'Latest TON updates will appear here when Supabase is connected.',
          'Editorial coverage includes infrastructure, Mini Apps, DeFi, funding, and Telegram integrations.',
        ]);
        return;
      }

      try {
        const { data, error } = await supabase
          .from('briefings')
          .select('title')
          .eq('is_published', true)
          .order('published_at', { ascending: false })
          .limit(8);

        if (!error && data && data.length > 0) {
          setHeadlines(data.map((b: { title: string }) => b.title));
        } else {
          setHeadlines(['Following verified TON ecosystem sources for new developments.']);
        }
      } catch {
        setHeadlines(['Live TON feed is temporarily unavailable. Recent briefings remain readable.']);
      }
    }

    fetchHeadlines();
    const interval = setInterval(fetchHeadlines, 120 * 1000);
    return () => clearInterval(interval);
  }, []);

  if (headlines.length === 0) return null;

  const items = [...headlines, ...headlines];

  return (
    <div className="w-full overflow-hidden border-b border-[#ffffff]/10 bg-[#0B1120]/80 backdrop-blur-md">
      <div className="mx-auto flex max-w-7xl items-center gap-4 px-4 py-2 md:px-6 lg:px-8">
        <div className="shrink-0 rounded-lg bg-gradient-to-r from-[#0098EA]/20 to-[#38BDF8]/20 border border-[#0098EA]/40 px-3 py-1 text-[10px] font-extrabold tracking-wider uppercase text-[#38BDF8] shadow-[0_0_10px_rgba(0,152,234,0.15)]">
          Live TON Feed
        </div>
        <div className="mask-gradient-right relative flex min-w-0 flex-1 overflow-hidden">
          <div className="flex min-w-max animate-marquee items-center text-xs font-semibold text-[#AAB3C5]">
            {items.map((headline, index) => (
              <span key={`${headline}-${index}`} className="flex items-center">
                <span className="mx-6 font-mono tracking-tight text-[#CBD5E1] hover:text-[#0098EA] transition-colors">{headline}</span>
                <span className="h-1.5 w-1.5 rounded-full bg-[#0098EA] shadow-[0_0_8px_rgba(0,152,234,0.8)] animate-pulse" />
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
