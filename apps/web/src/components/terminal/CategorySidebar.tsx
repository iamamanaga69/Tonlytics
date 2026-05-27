'use client';

import { useTerminalStore } from '@/store/terminalStore';
import { useTelegram } from '@/hooks/useTelegram';
import type { BriefingCategory } from '@/types';
import { Blocks, Coins, Gem, Globe2, Landmark, Layers, Smartphone, TrendingUp } from 'lucide-react';
import { clsx } from 'clsx';

interface CategoryItem {
  id: BriefingCategory | 'All';
  label: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
}

const CATEGORIES: CategoryItem[] = [
  { id: 'All', label: 'Top Stories', description: 'Everything important across TON', icon: Landmark },
  { id: 'Infrastructure', label: 'TON Infrastructure', description: 'Core releases, wallets, tooling', icon: Layers },
  { id: 'Mini Apps', label: 'Mini Apps', description: 'Telegram-native product coverage', icon: Smartphone },
  { id: 'DeFi', label: 'DeFi & Stablecoins', description: 'Liquidity, payments, exchanges', icon: Coins },
  { id: 'Integration', label: 'Telegram Integrations', description: 'Distribution and partner moves', icon: Blocks },
  { id: 'Ecosystem', label: 'Ecosystem Funding', description: 'Projects, grants, community', icon: Globe2 },
];

const TRENDING_TOPICS = [
  'Wallet v5',
  'USDT on TON',
  'Telegram Mini Apps',
  'TON Connect',
  'Tact tooling',
  'STON.fi liquidity',
];

export default function CategorySidebar() {
  const { selectedCategory, setSelectedCategory } = useTerminalStore();
  const { triggerHaptic } = useTelegram();

  const handleCategorySelect = (categoryId: BriefingCategory | 'All') => {
    setSelectedCategory(categoryId);
    triggerHaptic('light');
  };

  return (
    <>
      <aside id="coverage" className="hidden lg:flex flex-col gap-5">
        <section className="editorial-card rounded-2xl p-4">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-xs font-extrabold uppercase tracking-wider text-[#7D8597]">Coverage</h2>
            <Gem className="h-4 w-4 text-editorial-accent" />
          </div>

          <div className="grid gap-1.5">
            {CATEGORIES.map((cat) => {
              const isActive = selectedCategory === cat.id;
              const Icon = cat.icon;

              return (
                <button
                  key={cat.id}
                  onClick={() => handleCategorySelect(cat.id)}
                  className={clsx(
                    'group grid grid-cols-[32px_1fr] gap-3 rounded-xl border p-2.5 text-left transition-all duration-300 cursor-pointer',
                    isActive
                      ? 'border-[#0098EA]/40 bg-[#0098EA]/10 text-[#F5F7FA] shadow-[0_0_15px_rgba(0,152,234,0.1)]'
                      : 'border-transparent text-[#AAB3C5] hover:border-editorial-border hover:bg-[#111827]/40 hover:text-[#F5F7FA]'
                  )}
                >
                  <span className={clsx(
                    'mt-0.5 flex h-8 w-8 items-center justify-center rounded-lg transition-colors',
                    isActive 
                      ? 'bg-[#0098EA]/20 text-[#0098EA]' 
                      : 'bg-[#111827]/60 text-[#7D8597] group-hover:bg-[#0098EA]/10 group-hover:text-[#0098EA]'
                  )}>
                    <Icon className="h-4 w-4" />
                  </span>
                  <span>
                    <span className="block text-sm font-extrabold">{cat.label}</span>
                    <span className="mt-0.5 block text-xs leading-snug text-[#7D8597] group-hover:text-[#AAB3C5]">{cat.description}</span>
                  </span>
                </button>
              );
            })}
          </div>
        </section>

        <section id="trending" className="editorial-card rounded-2xl p-4">
          <div className="mb-4 flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-editorial-accent" />
            <h2 className="text-xs font-extrabold uppercase tracking-wider text-[#7D8597]">Trending in TON</h2>
          </div>
          <div className="flex flex-wrap gap-2">
            {TRENDING_TOPICS.map((topic) => (
              <button
                key={topic}
                onClick={() => {
                  setSelectedCategory('All');
                  triggerHaptic('light');
                }}
                className="rounded-lg border border-editorial-border bg-[#111827]/40 px-3 py-1.5 text-xs font-semibold text-[#AAB3C5] transition-all duration-300 hover:border-[#0098EA]/40 hover:bg-[#0098EA]/10 hover:text-[#F5F7FA]"
              >
                {topic}
              </button>
            ))}
          </div>
        </section>
      </aside>

      <div className="lg:hidden -mx-4 mb-1 border-b border-editorial-border/60 px-4 pb-3">
        <div className="mask-gradient-right flex gap-3 overflow-x-auto pb-1">
          {CATEGORIES.map((cat) => {
            const isActive = selectedCategory === cat.id;
            return (
              <button
                key={cat.id}
                onClick={() => handleCategorySelect(cat.id)}
                className={clsx(
                  'shrink-0 border-b-2 px-2 pb-1.5 text-sm font-extrabold transition-all duration-300',
                  isActive
                    ? 'border-[#0098EA] text-[#F5F7FA]'
                    : 'border-transparent text-[#7D8597] hover:text-[#AAB3C5]'
                )}
              >
                {cat.label}
              </button>
            );
          })}
        </div>
      </div>
    </>
  );
}
