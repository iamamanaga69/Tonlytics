'use client';

import { useTerminalStore } from '@/store/terminalStore';
import { useTelegram } from '@/hooks/useTelegram';
import type { BriefingCategory } from '@/types';
import { 
  Layers, 
  Smartphone, 
  Coins, 
  Shuffle, 
  Globe, 
  Grid,
  TrendingUp
} from 'lucide-react';
import { clsx } from 'clsx';

interface CategoryItem {
  id: BriefingCategory | 'All';
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}

const CATEGORIES: CategoryItem[] = [
  { id: 'All', label: 'All intelligence', icon: Grid },
  { id: 'Infrastructure', label: 'Infrastructure', icon: Layers },
  { id: 'Mini Apps', label: 'Mini Apps', icon: Smartphone },
  { id: 'DeFi', label: 'DeFi & Stablecoins', icon: Coins },
  { id: 'Integration', label: 'Integrations', icon: Shuffle },
  { id: 'Ecosystem', label: 'Ecosystem News', icon: Globe },
];

const TRENDING_TOPICS = [
  '#wallet-v5',
  '#tma-sdk',
  '#usdt-velocity',
  '#dao-grants',
  '#stablecoins',
];

export default function CategorySidebar() {
  const { selectedCategory, setSelectedCategory } = useTerminalStore();
  const { triggerHaptic } = useTelegram();

  const handleCategorySelect = (categoryId: BriefingCategory | 'All') => {
    setSelectedCategory(categoryId);
    triggerHaptic('light'); // tactile feedback on button tap
  };

  return (
    <>
      {/* -------------------------------------------
         DESKTOP SIDEBAR VIEW (Visible on lg md screens)
         ------------------------------------------- */}
      <aside className="hidden md:flex flex-col gap-6 w-64 shrink-0">
        {/* Minimal Stream Indicator Line */}
        <div className="flex items-center gap-2 px-3 pt-1">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 terminal-status-glow" />
          <span className="text-[10px] tracking-widest uppercase font-bold text-slate-500 font-mono">
            Intelligence Stream Online
          </span>
        </div>

        {/* Categories Navigation */}
        <div className="flex flex-col gap-1">
          <h3 className="text-[10px] uppercase tracking-widest font-bold text-slate-500 px-3 mb-2 font-mono">
            Segments
          </h3>
          
          {CATEGORIES.map((cat) => {
            const Icon = cat.icon;
            const isActive = selectedCategory === cat.id;
            
            return (
              <button
                key={cat.id}
                onClick={() => handleCategorySelect(cat.id)}
                className={clsx(
                  "flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-semibold transition-all duration-200 text-left border border-transparent",
                  isActive 
                    ? "bg-slate-900/60 text-slate-100" 
                    : "text-slate-400 hover:text-slate-200 hover:bg-slate-900/10"
                )}
              >
                <Icon className={clsx("w-3.5 h-3.5", isActive ? "text-slate-200" : "text-slate-500")} />
                <span>{cat.label}</span>
              </button>
            );
          })}
        </div>

        {/* Trending Tags Section */}
        <div className="flex flex-col gap-2.5 border-t border-slate-900/40 pt-5">
          <div className="flex items-center gap-1.5 px-3 mb-1 text-slate-500 font-mono text-[10px]">
            <TrendingUp className="w-3.5 h-3.5" />
            <h3 className="uppercase tracking-widest font-bold">
              Ecosystem Signals
            </h3>
          </div>
          
          <div className="flex flex-wrap gap-2 px-3">
            {TRENDING_TOPICS.map((topic) => (
              <span
                key={topic}
                className="text-[10px] text-slate-400 font-mono font-medium hover:text-sky-400 cursor-pointer transition-colors"
              >
                {topic}
              </span>
            ))}
          </div>
        </div>
      </aside>

      {/* -------------------------------------------
         MOBILE SWIPEABLE HEADER VIEW (Visible on sm screens)
         ------------------------------------------- */}
      <div className="md:hidden w-full flex flex-col gap-3 shrink-0 scrollbar-none py-1 border-b border-slate-900/30 mb-2">
        <div className="flex overflow-x-auto gap-2 pb-2 scrollbar-none px-4 -mx-4 mask-gradient-right">
          {CATEGORIES.map((cat) => {
            const Icon = cat.icon;
            const isActive = selectedCategory === cat.id;
            
            return (
              <button
                key={cat.id}
                onClick={() => handleCategorySelect(cat.id)}
                className={clsx(
                  "flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all duration-150 border shrink-0",
                  isActive 
                    ? "bg-sky-500/10 border-sky-500/40 text-sky-400" 
                    : "bg-slate-950/40 border-slate-800/40 text-slate-400 hover:bg-slate-900/30"
                )}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{cat.id === 'All' ? 'All' : cat.id}</span>
              </button>
            );
          })}
        </div>
      </div>
    </>
  );
}
