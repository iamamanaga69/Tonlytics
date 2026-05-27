'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Bookmark, Share2 } from 'lucide-react';
import { clsx } from 'clsx';
import { useTelegram } from '@/hooks/useTelegram';

export default function ArticleControls({ briefingId }: { briefingId: string }) {
  const router = useRouter();
  const { triggerHaptic } = useTelegram();
  const [isSaved, setIsSaved] = useState(() => readStoredBookmarks().includes(briefingId));
  const [copied, setCopied] = useState(false);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const onScroll = () => {
      const scrollTop = window.scrollY;
      const docHeight = document.documentElement.scrollHeight - window.innerHeight;
      setProgress(docHeight > 0 ? Math.min(100, Math.max(0, (scrollTop / docHeight) * 100)) : 0);
    };

    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const toggleSave = () => {
    triggerHaptic('light');
    setIsSaved((saved) => {
      const bookmarks = readStoredBookmarks();
      const next = saved ? bookmarks.filter((id) => id !== briefingId) : Array.from(new Set([...bookmarks, briefingId]));
      window.localStorage.setItem('tonlytics-bookmarks', JSON.stringify(next));
      return !saved;
    });
  };

  const share = async () => {
    triggerHaptic('light');
    if (!navigator.clipboard) return;
    await navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  };

  return (
    <>
      <div className="fixed left-0 top-0 z-50 h-1 bg-editorial-accent transition-all" style={{ width: `${progress}%` }} />
      <nav className="sticky top-0 z-40 border-b border-editorial-border bg-editorial-bg/92 backdrop-blur-xl">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3 md:px-6">
          <button
            onClick={() => {
              triggerHaptic('light');
              router.push('/');
            }}
            className="flex items-center gap-2 text-sm font-black text-editorial-text-subtle transition hover:text-editorial-accent"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Tonlytics
          </button>

          <div className="flex items-center gap-2">
            <button
              onClick={toggleSave}
              className="flex h-9 w-9 items-center justify-center rounded-lg border border-editorial-border bg-editorial-card text-editorial-text-subtle transition hover:border-editorial-accent/45 hover:text-editorial-accent"
              aria-label="Save story"
            >
              <Bookmark className={clsx('h-4 w-4', isSaved && 'fill-editorial-accent text-editorial-accent')} />
            </button>
            <button
              onClick={share}
              className="relative flex h-9 w-9 items-center justify-center rounded-lg border border-editorial-border bg-editorial-card text-editorial-text-subtle transition hover:border-editorial-accent/45 hover:text-editorial-accent"
              aria-label="Share story"
            >
              <Share2 className="h-4 w-4" />
              {copied && (
                <span className="absolute right-0 top-11 rounded-md border border-editorial-border bg-editorial-card px-2 py-1 text-xs font-black text-editorial-accent shadow-md">
                  Copied
                </span>
              )}
            </button>
          </div>
        </div>
      </nav>
    </>
  );
}

function readStoredBookmarks(): string[] {
  if (typeof window === 'undefined') return [];
  try {
    const parsed = JSON.parse(window.localStorage.getItem('tonlytics-bookmarks') || '[]');
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function ArticleViewBeacon({ briefingId }: { briefingId: string }) {
  useEffect(() => {
    fetch(`/api/briefings/view?id=${briefingId}`, { method: 'POST' }).catch(() => {});
  }, [briefingId]);

  return null;
}
