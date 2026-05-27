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
        <section className="editorial-card rounded-sm p-4">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-xs font-extrabold uppercase text-editorial-text-subtle">Coverage</h2>
            <Gem className="h-4 w-4 text-editorial-accent" />
          </div>

          <div className="grid gap-1">
            {CATEGORIES.map((cat) => {
              const isActive = selectedCategory === cat.id;
              const Icon = cat.icon;

              return (
                <button
                  key={cat.id}
                  onClick={() => handleCategorySelect(cat.id)}
                  className={clsx(
                    'group grid grid-cols-[28px_1fr] gap-3 rounded-sm border px-3 py-3 text-left transition-colors',
                    isActive
                      ? 'border-editorial-accent bg-editorial-accent-bg text-foreground'
                      : 'border-transparent text-editorial-text-subtle hover:border-editorial-border hover:text-foreground'
                  )}
                >
                  <span className="mt-0.5 flex h-7 w-7 items-center justify-center rounded-sm bg-editorial-muted">
                    <Icon className="h-4 w-4 text-editorial-accent" />
                  </span>
                  <span>
                    <span className="block text-sm font-extrabold">{cat.label}</span>
                    <span className="mt-0.5 block text-xs leading-snug text-editorial-text-subtle">{cat.description}</span>
                  </span>
                </button>
              );
            })}
          </div>
        </section>

        <section id="trending" className="editorial-card rounded-sm p-4">
          <div className="mb-4 flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-editorial-accent" />
            <h2 className="text-xs font-extrabold uppercase text-editorial-text-subtle">Trending in TON</h2>
          </div>
          <div className="flex flex-wrap gap-2">
            {TRENDING_TOPICS.map((topic) => (
              <button
                key={topic}
                onClick={() => {
                  setSelectedCategory('All');
                  triggerHaptic('light');
                }}
                className="rounded-sm border border-editorial-border bg-editorial-card px-2.5 py-1.5 text-xs font-semibold text-editorial-text-subtle hover:border-editorial-border-hover hover:text-foreground"
              >
                {topic}
              </button>
            ))}
          </div>
        </section>
      </aside>

      <div className="lg:hidden -mx-4 mb-1 border-b border-editorial-border px-4 pb-3">
        <div className="mask-gradient-right flex gap-3 overflow-x-auto">
          {CATEGORIES.map((cat) => {
            const isActive = selectedCategory === cat.id;
            return (
              <button
                key={cat.id}
                onClick={() => handleCategorySelect(cat.id)}
                className={clsx(
                  'shrink-0 border-b-2 px-1 pb-2 text-sm font-extrabold transition-colors',
                  isActive
                    ? 'border-editorial-accent text-foreground'
                    : 'border-transparent text-editorial-text-subtle'
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
