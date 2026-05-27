'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTerminalStore } from '@/store/terminalStore';
import { useBriefings } from '@/hooks/useBriefings';
import BriefingCard from './BriefingCard';
import { Search, RefreshCw, Layers, AlertCircle, Play, Eye } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTelegram } from '@/hooks/useTelegram';
import ImageWithFallback from './ImageWithFallback';

export default function BriefingFeed() {
  const router = useRouter();
  const { triggerHaptic } = useTelegram();
  const { searchQuery, setSearchQuery } = useTerminalStore();
  const { briefings, isLoading, error, refresh } = useBriefings();
  const [localSearch, setLocalSearch] = useState<string>(searchQuery);
  const [isHeroImageBroken, setIsHeroImageBroken] = useState(false);

  // Debounce the search input to protect database capacity from query spam
  useEffect(() => {
    const timer = setTimeout(() => {
      setSearchQuery(localSearch);
    }, 300);
    return () => clearTimeout(timer);
  }, [localSearch, setSearchQuery]);

  // Sync local search when store resets
  useEffect(() => {
    setLocalSearch(searchQuery);
  }, [searchQuery]);

  // Framer Motion entry configurations
  const containerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: { staggerChildren: 0.05 }
    }
  } as const;

  const itemVariants = {
    hidden: { opacity: 0, y: 15 },
    show: { 
      opacity: 1, 
      y: 0, 
      transition: { type: 'spring', stiffness: 90, damping: 15 } 
    }
  } as const;

  // Curation variables
  const spotlightBriefing = briefings.length > 0 ? briefings[0] : null;
  const feedBriefings = searchQuery || briefings.length <= 1 ? briefings : briefings.slice(1);

  return (
    <div className="flex-1 flex flex-col gap-6 px-4 md:px-0">
      
      {/* 1. Search Input and Refresh Row */}
      <div className="w-full flex items-center gap-3">
        {/* Search Input Container */}
        <div className="flex-1 relative glass-panel rounded-xl">
          <Search className="w-4 h-4 text-slate-550 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={localSearch}
            onChange={(e) => setLocalSearch(e.target.value)}
            placeholder="Search verified ecosystem signals, protocols, metrics..."
            className="w-full bg-transparent text-[11px] font-mono tracking-wide py-2.5 pl-10 pr-4 outline-none border border-transparent rounded-xl text-slate-200 placeholder:text-slate-550 focus:border-sky-500/20 transition-all duration-200"
          />
        </div>

        {/* Sync/Refresh Action Button */}
        <button
          onClick={() => { triggerHaptic('light'); refresh(); }}
          disabled={isLoading}
          className="p-2.5 bg-slate-950/40 border border-slate-900/60 rounded-xl text-slate-500 hover:text-sky-400 hover:border-sky-500/25 active:bg-slate-950/60 transition-all duration-150 glass-panel shrink-0 cursor-pointer"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* 2. Loading Skeleton Mode */}
      {isLoading && briefings.length === 0 && (
        <div className="flex flex-col gap-5">
          {[1, 2, 3].map((skeletonId) => (
            <div 
              key={skeletonId}
              className="glass-panel rounded-2xl p-5 flex flex-col gap-4 animate-pulse border-slate-900/25 bg-slate-950/10"
            >
              <div className="flex justify-between items-center w-full">
                <div className="w-20 h-4 bg-slate-900/80 rounded" />
                <div className="w-16 h-3 bg-slate-900/80 rounded" />
              </div>
              <div className="w-3/4 h-5 bg-slate-900/80 rounded" />
              <div className="w-full h-12 bg-slate-900/80 rounded-lg" />
            </div>
          ))}
        </div>
      )}

      {/* 3. Database Connection Error Mode */}
      {error && briefings.length === 0 && (
        <div className="glass-panel rounded-2xl p-8 flex flex-col items-center justify-center gap-4 text-center border-red-500/10 bg-red-950/5">
          <AlertCircle className="w-10 h-10 text-red-400/80 animate-pulse" />
          <h3 className="text-xs font-bold text-slate-200 uppercase tracking-widest font-mono">Ecosystem Link Offline</h3>
          <p className="text-[10px] text-slate-500 max-w-sm leading-relaxed font-mono">
            Unable to synchronize with the intelligence database cluster. Verify credentials.
          </p>
          <button
            onClick={() => refresh()}
            className="px-4 py-2 bg-red-500/10 hover:bg-red-500/15 border border-red-500/20 text-red-400 text-[10px] font-bold uppercase tracking-wider rounded-lg transition-colors cursor-pointer font-mono"
          >
            Reconnect
          </button>
        </div>
      )}

      {/* 4. Cinematic Hero Ecosystem Spotlight Widget (Default layout view) */}
      {!isLoading && !searchQuery && spotlightBriefing && (
        <motion.div
          onClick={() => { triggerHaptic('medium'); router.push(`/briefing/${spotlightBriefing.slug}`); }}
          whileHover={{ y: -3 }}
          transition={{ type: 'spring', stiffness: 200, damping: 22 }}
          className="w-full relative rounded-2xl overflow-hidden border border-slate-900 bg-slate-950/30 cursor-pointer shadow-xl hover:shadow-2xl group transition-all duration-300 select-none"
        >
          {/* Large Hero Image Banner */}
          {spotlightBriefing.image_url && !isHeroImageBroken && (
            <div className="w-full aspect-[21/9] relative overflow-hidden border-b border-slate-950 z-0">
              <ImageWithFallback
                src={spotlightBriefing.image_url}
                alt={spotlightBriefing.title}
                className="w-full h-full object-cover group-hover:scale-101 transition-transform duration-700 opacity-80"
                onFallbackTriggered={() => setIsHeroImageBroken(true)}
              />
            </div>
          )}

          {/* Spotlight Badge overlay */}
          <div className="absolute top-4 left-6 bg-amber-500/10 border border-amber-500/25 px-2.5 py-0.5 rounded-full text-[8px] font-bold font-mono uppercase tracking-widest text-amber-400">
            Spotlight Feature
          </div>

          {/* Card Content Overlay / Box */}
          <div className="p-6 flex flex-col gap-4">
            <div className="flex items-center justify-between text-[9px] font-mono tracking-wider uppercase font-semibold text-slate-550">
              <span className="text-sky-400 font-bold">{spotlightBriefing.category}</span>
              <span>{getCardRelativeTime(spotlightBriefing.published_at)}</span>
            </div>

            <h2 className="text-base md:text-xl font-extrabold text-slate-100 group-hover:text-sky-400 transition-colors leading-snug font-display">
              {spotlightBriefing.title}
            </h2>

            <p className="text-slate-400 text-[11px] leading-relaxed line-clamp-2">
              {spotlightBriefing.briefing}
            </p>

            {/* Why it matters banner */}
            <div className="border-l border-sky-500/25 pl-4 py-0.5 mt-1.5 flex flex-col gap-0.5">
              <span className="text-[8px] uppercase font-bold tracking-widest text-slate-550 font-mono">Why It Matters</span>
              <p className="text-slate-300 text-[11px] font-semibold leading-relaxed">
                {spotlightBriefing.why_it_matters}
              </p>
            </div>
          </div>
        </motion.div>
      )}

      {/* 5. Chronological Signal stream List */}
      <AnimatePresence mode="popLayout">
        {!isLoading && feedBriefings.length > 0 && (
          <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="show"
            className="flex flex-col gap-5"
          >
            {feedBriefings.map((briefing) => (
              <motion.div
                key={briefing.id}
                variants={itemVariants}
                layoutId={`card-container-${briefing.id}`}
              >
                <BriefingCard briefing={briefing} />
              </motion.div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {/* 6. Empty Results Mode */}
      {!isLoading && briefings.length === 0 && !error && (
        <div className="glass-panel rounded-2xl p-12 flex flex-col items-center justify-center gap-3 text-center border-slate-900/35 bg-slate-950/10">
          <Layers className="w-8 h-8 text-slate-700 animate-pulse" />
          <h3 className="text-xs font-bold text-slate-350 uppercase tracking-wider font-mono">No Signals Found</h3>
          <p className="text-[10px] text-slate-500 max-w-xs font-mono">
            No ecosystem signals match your current query or category tab filters.
          </p>
        </div>
      )}
    </div>
  );
}

// Utility relative date calculations
function getCardRelativeTime(isoString: string): string {
  try {
    const past = new Date(isoString).getTime();
    const now = Date.now();
    const diffMs = now - past;
    
    const diffMins = Math.floor(diffMs / (60 * 1000));
    const diffHours = Math.floor(diffMs / (60 * 60 * 1000));
    const diffDays = Math.floor(diffMs / (24 * 60 * 60 * 1000));

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays === 1) return 'Yesterday';
    return `${diffDays} days ago`;
  } catch {
    return 'Recently';
  }
}
