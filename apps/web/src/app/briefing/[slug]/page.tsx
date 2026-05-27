'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { 
  ArrowLeft, 
  Clock, 
  Eye, 
  Send, 
  Calendar, 
  Layers, 
  Smartphone, 
  Coins, 
  Shuffle, 
  Globe, 
  ExternalLink, 
  ChevronRight, 
  ChevronLeft,
  Share2,
  Bookmark,
  AlertTriangle,
  FileText,
  TrendingUp,
  Link
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTelegram } from '@/hooks/useTelegram';
import type { Briefing } from '@/types';
import ImageWithFallback from '@/components/terminal/ImageWithFallback';

export default function ArticleDetail() {
  const params = useParams();
  const router = useRouter();
  const { triggerHaptic } = useTelegram();
  const [isImageBroken, setIsImageBroken] = useState(false);
  
  const [briefing, setBriefing] = useState<Briefing | null>(null);
  const [adjacent, setAdjacent] = useState<{ prev: Briefing | null; next: Briefing | null }>({ prev: null, next: null });
  const [isLoading, setIsLoading] = useState(true);
  const [isCopied, setIsCopied] = useState(false);

  useEffect(() => {
    const slug = params.slug as string;
    if (!slug) return;

    const fetchArticleDetails = async () => {
      setIsLoading(true);
      try {
        // Fetch current briefing from listings
        const response = await fetch(`/api/briefings`);
        const data = await response.json();
        if (data.success && data.briefings) {
          const allBriefs = data.briefings as Briefing[];
          const current = allBriefs.find(b => b.slug === slug);
          
          if (current) {
            setBriefing(current);
            
            // Increment views count silently on server
            fetch(`/api/briefings/view?id=${current.id}`, { method: 'POST' }).catch(() => {});
            current.views_count += 1;

            // Find adjacent briefings
            const index = allBriefs.findIndex(b => b.id === current.id);
            setAdjacent({
              prev: index > 0 ? allBriefs[index - 1] : null,
              next: index < allBriefs.length - 1 ? allBriefs[index + 1] : null
            });
          }
        }
      } catch (err) {
        console.error('Failed to load article details:', err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchArticleDetails();
  }, [params.slug]);

  const handleBackToDashboard = () => {
    triggerHaptic('light');
    router.push('/');
  };

  const handleShare = () => {
    triggerHaptic('light');
    if (typeof window !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(window.location.href);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    }
  };

  if (isLoading) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center min-h-screen bg-[#040609] gap-4 font-mono text-[9px] tracking-wider uppercase font-bold text-slate-500">
        <div className="relative w-10 h-10 flex items-center justify-center">
          <div className="absolute w-full h-full rounded-full border border-sky-500/20 border-t-sky-500 animate-spin" />
          <span className="text-sky-500 font-sans text-xs">T</span>
        </div>
        <span>Syncing Intelligence...</span>
      </div>
    );
  }

  if (!briefing) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center min-h-screen bg-[#040609] text-center p-6 gap-4 font-mono">
        <AlertTriangle className="w-8 h-8 text-amber-500" />
        <h3 className="text-slate-400 font-bold text-xs uppercase tracking-wider">Ecosystem update not found</h3>
        <p className="text-[10px] text-slate-600 max-w-xs">The requested summary has not passed trust verification filters.</p>
        <button onClick={handleBackToDashboard} className="mt-4 px-4 py-2 border border-slate-900 bg-slate-950 text-slate-400 rounded-lg hover:border-slate-800 text-[10px] tracking-widest font-bold uppercase transition-all">
          Return to Terminal
        </button>
      </div>
    );
  }

  const categoryIcons = {
    Infrastructure: Layers,
    'Mini Apps': Smartphone,
    DeFi: Coins,
    Integration: Shuffle,
    Ecosystem: Globe,
  };
  
  const Icon = categoryIcons[briefing.category] || Globe;

  const getCategoryTheme = (cat: string) => {
    switch (cat) {
      case 'Infrastructure':
        return { text: 'text-indigo-400', border: 'border-indigo-900/35', bg: 'bg-indigo-950/20', glow: 'from-indigo-600/5' };
      case 'Mini Apps':
        return { text: 'text-emerald-400', border: 'border-emerald-900/35', bg: 'bg-emerald-950/20', glow: 'from-emerald-600/5' };
      case 'DeFi':
        return { text: 'text-amber-400', border: 'border-amber-900/35', bg: 'bg-amber-950/20', glow: 'from-amber-600/5' };
      case 'Integration':
        return { text: 'text-purple-400', border: 'border-purple-900/35', bg: 'bg-purple-950/20', glow: 'from-purple-600/5' };
      default:
        return { text: 'text-sky-400', border: 'border-sky-900/35', bg: 'bg-sky-950/20', glow: 'from-sky-600/5' };
    }
  };

  const theme = getCategoryTheme(briefing.category);

  return (
    <div className="flex-1 flex flex-col w-full min-h-screen bg-[#040609] select-text">
      
      {/* Soft Glow Backdrop */}
      <div className={`absolute top-0 inset-x-0 h-[450px] bg-gradient-to-b ${theme.glow} to-transparent opacity-30 pointer-events-none blur-3xl z-0`} />

      {/* NAVIGATION TOOLBAR */}
      <nav className="w-full bg-[#080b11]/30 backdrop-blur-md border-b border-slate-900/40 py-4 px-4 md:px-8 flex items-center justify-between shrink-0 z-40 sticky top-0">
        <button
          onClick={handleBackToDashboard}
          className="flex items-center gap-2 text-slate-400 hover:text-slate-200 text-[10px] font-bold uppercase tracking-wider font-mono cursor-pointer transition-colors"
        >
          <ArrowLeft className="w-4 h-4 text-slate-500" />
          <span>Aggregation Feed</span>
        </button>

        <div className="flex items-center gap-3 shrink-0">
          <button
            onClick={handleShare}
            className="w-8 h-8 rounded-xl bg-slate-950/50 border border-slate-900 hover:border-slate-800 flex items-center justify-center text-slate-450 hover:text-slate-200 transition-colors relative cursor-pointer"
          >
            <Share2 className="w-3.5 h-3.5" />
            <AnimatePresence>
              {isCopied && (
                <motion.span
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className="absolute -bottom-8 right-0 bg-[#080b11] border border-slate-900 text-sky-400 text-[8px] font-bold font-mono uppercase tracking-widest px-2 py-0.5 rounded shadow-xl whitespace-nowrap"
                >
                  Link Copied
                </motion.span>
              )}
            </AnimatePresence>
          </button>
          <button className="w-8 h-8 rounded-xl bg-slate-950/50 border border-slate-900 hover:border-slate-800 flex items-center justify-center text-slate-450 hover:text-slate-200 transition-colors cursor-pointer">
            <Bookmark className="w-3.5 h-3.5" />
          </button>
        </div>
      </nav>

      {/* IMMERSIVE CONTENT GRID */}
      <main className="flex-1 max-w-3xl w-full mx-auto py-8 px-4 md:px-6 relative z-10">
        
        <article className="flex flex-col gap-6 md:gap-8">
          
          {/* 1 & 2. Official Thumbnail Visual (ONLY if available; no AI mockups) */}
          {briefing.image_url && !isImageBroken && (
            <div className="w-full relative aspect-[21/9] rounded-2xl overflow-hidden border border-slate-900/60 bg-slate-950 shadow-2xl z-10">
              <ImageWithFallback
                src={briefing.image_url}
                alt={briefing.title}
                className="w-full h-full object-contain p-6 bg-slate-950/60 object-center opacity-90"
                onFallbackTriggered={() => setIsImageBroken(true)}
              />
            </div>
          )}

          {/* 3 & 4. Category and Title display */}
          <div className="flex flex-col gap-3">
            
            {/* Category badge */}
            <div className="flex items-center gap-2">
              <span className={`px-2.5 py-0.5 rounded-full border text-[8px] font-mono tracking-widest uppercase font-bold ${theme.text} ${theme.border} ${theme.bg}`}>
                {briefing.category}
              </span>
              <span className="text-[8px] font-mono tracking-widest uppercase font-bold text-slate-500 bg-slate-950/40 px-2 py-0.5 rounded-full">
                via {briefing.source_name || 'Ecosystem Aggregator'}
              </span>
            </div>

            {/* Title display */}
            <h1 className="text-xl md:text-3xl font-extrabold text-slate-100 leading-tight font-display tracking-tight mt-1.5">
              {briefing.title}
            </h1>

            {/* 5. Metadata Telemetry Row */}
            <div className="flex flex-wrap items-center gap-y-2 gap-x-4 text-[8px] font-mono tracking-wider uppercase text-slate-550 font-semibold border-b border-slate-900/30 pb-3.5 mt-1">
              <div className="flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-slate-650" />
                <span>Aggregated {new Date(briefing.published_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
              </div>
              <span className="h-2 w-px bg-slate-900" />
              <div className="flex items-center gap-1.5">
                <Eye className="w-3.5 h-3.5 text-slate-650" />
                <span>{briefing.views_count} checks</span>
              </div>
              <span className="h-2 w-px bg-slate-900" />
              <div className="flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-slate-650" />
                <span>1 min summary read</span>
              </div>
            </div>
          </div>

          {/* 6. Concise Curation Aggregated summary */}
          <div className="text-slate-350 text-xs md:text-sm leading-relaxed space-y-4 font-normal">
            {briefing.briefing.split('\n\n').map((paragraph, index) => (
              <p key={index}>{paragraph}</p>
            ))}
          </div>

          {/* 8. Factual Key Takeaways (3 Bullet highlights) */}
          {briefing.key_takeaways && briefing.key_takeaways.length > 0 && (
            <div className="flex flex-col gap-3 p-5 border border-slate-900/60 bg-[#07090e]/30 rounded-2xl">
              <div className="flex items-center gap-1.5 border-b border-slate-900/35 pb-2">
                <FileText className="w-3.5 h-3.5 text-sky-400" />
                <h3 className="text-[9px] font-mono tracking-widest text-slate-450 font-bold uppercase">Factual Key Highlights</h3>
              </div>
              
              <ul className="flex flex-col gap-3">
                {briefing.key_takeaways.map((takeaway, i) => (
                  <li key={i} className="flex items-start gap-2.5 text-xs text-slate-300 leading-relaxed font-medium">
                    <span className="w-1.5 h-1.5 rounded-full bg-sky-500/40 mt-1.5 shrink-0" />
                    <span>{takeaway}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* 7. "Why It Matters" (Sleek callout block) */}
          <div className="border-l border-sky-500/25 pl-4 flex flex-col gap-1.5 my-1">
            <span className="text-[9px] font-mono tracking-widest text-slate-550 font-bold uppercase">
              Ecosystem Relevance Analysis
            </span>
            <p className="text-slate-200 text-xs md:text-sm leading-relaxed font-semibold">
              {briefing.why_it_matters}
            </p>
          </div>

          {/* Canonical Redirection Redirect CTA (Aggregators strictly redirect to canonical URL!) */}
          {briefing.source_url && (
            <div className="glass-panel p-5.5 rounded-2xl border border-slate-900 bg-slate-950/20 text-center flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mt-2">
              <div className="flex flex-col gap-1 text-left">
                <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider font-mono">Original Document Aggregated</h4>
                <p className="text-[9px] text-slate-500 font-mono">Tonlytics respects copyright. Redirect back to the official channel or portal for complete text.</p>
              </div>
              
              <a
                href={`/api/redirect?id=${briefing.id}`}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => triggerHaptic('light')}
                className="px-5 py-2.5 bg-sky-500/10 border border-sky-500/20 hover:bg-sky-500/15 text-[10px] font-bold text-sky-400 uppercase tracking-widest rounded-xl transition-all cursor-pointer font-mono shrink-0 flex items-center justify-center gap-1.5"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                <span>Read Full Article</span>
              </a>
            </div>
          )}

          {/* Interactive Navigation Row (Next/Previous slide controls) */}
          <div className="flex items-center justify-between border-t border-slate-900/40 pt-6 mt-6">
            {adjacent.prev ? (
              <a
                href={`/briefing/${adjacent.prev.slug}`}
                onClick={() => triggerHaptic('light')}
                className="flex items-center gap-3 p-3 max-w-[45%] text-left hover:-translate-x-0.5 transition-all"
              >
                <ChevronLeft className="w-4 h-4 text-slate-500 shrink-0" />
                <div className="flex flex-col gap-0.5">
                  <span className="text-[7px] font-mono uppercase text-slate-550 font-bold">Previous aggregation</span>
                  <span className="text-[11px] text-slate-400 font-bold leading-tight line-clamp-1 font-display">{adjacent.prev.title}</span>
                </div>
              </a>
            ) : (
              <div />
            )}

            {adjacent.next ? (
              <a
                href={`/briefing/${adjacent.next.slug}`}
                onClick={() => triggerHaptic('light')}
                className="flex items-center gap-3 p-3 max-w-[45%] text-right hover:translate-x-0.5 transition-all"
              >
                <div className="flex flex-col gap-0.5">
                  <span className="text-[7px] font-mono uppercase text-slate-550 font-bold">Next aggregation</span>
                  <span className="text-[11px] text-slate-400 font-bold leading-tight line-clamp-1 font-display">{adjacent.next.title}</span>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-500 shrink-0" />
              </a>
            ) : (
              <div />
            )}
          </div>

        </article>

      </main>

    </div>
  );
}
