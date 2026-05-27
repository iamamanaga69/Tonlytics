'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { useTelegram } from '@/hooks/useTelegram';
import type { Briefing } from '@/types';
import { Clock, Send, Layers, Smartphone, Coins, Shuffle, Globe } from 'lucide-react';
import { clsx } from 'clsx';
import { motion } from 'framer-motion';
import ImageWithFallback from './ImageWithFallback';

interface BriefingCardProps {
  briefing: Briefing;
}

export default function BriefingCard({ briefing }: BriefingCardProps) {
  const router = useRouter();
  const { triggerHaptic } = useTelegram();
  const [isImageBroken, setIsImageBroken] = React.useState(false);

  const handleCardClick = () => {
    triggerHaptic('light'); // tactile feedback for Telegram users
    router.push(`/briefing/${briefing.slug}`);
  };

  const getCategoryTheme = (category: Briefing['category']) => {
    switch (category) {
      case 'Infrastructure':
        return {
          badge: 'text-indigo-400 border-indigo-900/35 bg-indigo-950/20',
          glow: 'group-hover:border-indigo-500/30',
          icon: Layers
        };
      case 'Mini Apps':
        return {
          badge: 'text-emerald-400 border-emerald-900/35 bg-emerald-950/20',
          glow: 'group-hover:border-emerald-500/30',
          icon: Smartphone
        };
      case 'DeFi':
        return {
          badge: 'text-amber-400 border-amber-900/35 bg-amber-950/20',
          glow: 'group-hover:border-amber-500/30',
          icon: Coins
        };
      case 'Integration':
        return {
          badge: 'text-purple-400 border-purple-900/35 bg-purple-950/20',
          glow: 'group-hover:border-purple-500/30',
          icon: Shuffle
        };
      default: // Ecosystem
        return {
          badge: 'text-sky-400 border-sky-900/35 bg-sky-950/20',
          glow: 'group-hover:border-sky-500/30',
          icon: Globe
        };
    }
  };

  const theme = getCategoryTheme(briefing.category);
  const Icon = theme.icon;

  return (
    <motion.article 
      onClick={handleCardClick}
      whileHover={{ y: -3, scale: 1.006 }}
      transition={{ type: 'spring', stiffness: 200, damping: 22 }}
      className={clsx(
        "glass-panel rounded-2xl overflow-hidden flex flex-col cursor-pointer relative border border-slate-900/65 bg-slate-950/30 shadow-lg hover:shadow-2xl transition-all duration-350 select-none group",
        theme.glow
      )}
    >
      
      {/* 1. Card Media Thumbnail */}
      {briefing.image_url && !isImageBroken && (
        <div className="w-full aspect-[21/9] sm:aspect-[16/7] relative overflow-hidden border-b border-slate-950 z-0">
          <ImageWithFallback
            src={briefing.image_url}
            alt={briefing.title}
            className="w-full h-full object-cover object-center opacity-75 group-hover:scale-102 transition-transform duration-700"
            onFallbackTriggered={() => setIsImageBroken(true)}
          />
        </div>
      )}

      {/* Card Content Shell */}
      <div className="p-5 flex flex-col gap-4.5">
        
        {/* 2. Header Metadata Row */}
        <div className="flex items-center justify-between w-full text-[9px] tracking-wider uppercase font-semibold font-mono">
          <div className="flex items-center gap-2">
            <span className={clsx(
              "px-2 py-0.5 rounded-full border font-bold text-[8px]",
              theme.badge
            )}>
              {briefing.category}
            </span>
            
            <span className="text-slate-500 font-bold text-[8px]">
              via {briefing.source_name || 'Ecosystem Aggregator'}
            </span>
            
            {briefing.telegram_posted && (
              <span className="flex items-center gap-0.5 text-slate-550 font-bold text-[8px] hidden sm:inline-flex">
                <Send className="w-2.5 h-2.5" />
                <span>Broadcasted</span>
              </span>
            )}
          </div>

          <div className="flex items-center gap-1 text-slate-500 font-semibold">
            <Clock className="w-3.5 h-3.5 text-slate-650" />
            <span>{getCardRelativeTime(briefing.published_at)}</span>
          </div>
        </div>

        {/* 3. Article Title */}
        <h2 className="text-sm md:text-base font-bold text-slate-200 group-hover:text-sky-400 transition-colors duration-250 leading-snug font-display">
          {briefing.title}
        </h2>

        {/* 4. Concise Summary Block */}
        <p className="text-slate-400 text-[11px] md:text-xs leading-relaxed font-normal line-clamp-3">
          {briefing.briefing}
        </p>

        {/* 5. "Why It Matters" Callout Block */}
        <div className="border-l border-sky-500/25 pl-3 py-0.5 flex flex-col gap-0.5 transition-colors group-hover:border-sky-400/40">
          <span className="text-[8px] uppercase font-bold tracking-widest text-slate-550 font-mono">
            Why It Matters
          </span>
          <p className="text-slate-300 text-[11px] leading-relaxed font-medium">
            {briefing.why_it_matters}
          </p>
        </div>

        {/* 6. Tags & Curate Indicator Footer */}
        <div className="flex items-center justify-between w-full border-t border-slate-900/50 pt-3.5 mt-0.5 text-[9px] font-mono text-slate-550">
          <div className="flex flex-wrap gap-2 max-w-[70%]">
            {briefing.tags.slice(0, 3).map((tag) => (
              <span key={tag} className="hover:text-slate-450 transition-colors">
                #{tag}
              </span>
            ))}
          </div>

          <span className="text-[8px] font-bold uppercase tracking-wider text-sky-400/80 opacity-0 group-hover:opacity-100 group-hover:translate-x-0.5 transform -translate-x-1.5 transition-all duration-300 font-sans flex items-center gap-0.5">
            <span>Read Report</span>
            <span>&rarr;</span>
          </span>
        </div>

      </div>
    </motion.article>
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
