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
    <div className="w-full overflow-hidden border-b border-editorial-border bg-editorial-muted/55">
      <div className="mx-auto flex max-w-7xl items-center gap-4 px-4 py-2.5 md:px-6 lg:px-8">
        <div className="shrink-0 rounded-sm bg-editorial-accent px-2.5 py-1 text-[11px] font-extrabold text-white dark:text-[#101722]">
          Live TON Feed
        </div>
        <div className="mask-gradient-right relative flex min-w-0 flex-1 overflow-hidden">
          <div className="flex min-w-max animate-marquee items-center text-sm font-semibold text-editorial-text-subtle">
            {items.map((headline, index) => (
              <span key={`${headline}-${index}`} className="flex items-center">
                <span className="mx-6">{headline}</span>
                <span className="h-1 w-1 rounded-full bg-editorial-border-hover" />
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
