import { create } from 'zustand';
import type { Briefing, BriefingCategory } from '@/types';

interface TerminalState {
  selectedCategory: BriefingCategory | 'All';
  searchQuery: string;
  activeBriefing: Briefing | null;
  isDetailOpen: boolean;
  breakingNews: string;
  isTelegramContext: boolean;
  
  // Setters
  setSelectedCategory: (category: BriefingCategory | 'All') => void;
  setSearchQuery: (query: string) => void;
  setActiveBriefing: (briefing: Briefing | null) => void;
  setIsDetailOpen: (open: boolean) => void;
  setBreakingNews: (headline: string) => void;
  setIsTelegramContext: (isTG: boolean) => void;
  resetFilters: () => void;
}

export const useTerminalStore = create<TerminalState>((set) => ({
  selectedCategory: 'All',
  searchQuery: '',
  activeBriefing: null,
  isDetailOpen: false,
  breakingNews: 'TON Core deploys Wallet v5 coverage across the ecosystem.',
  isTelegramContext: false,

  setSelectedCategory: (category) => set({ selectedCategory: category }),
  setSearchQuery: (query) => set({ searchQuery: query }),
  setActiveBriefing: (briefing) => set({ activeBriefing: briefing, isDetailOpen: !!briefing }),
  setIsDetailOpen: (open) => set((state) => ({ 
    isDetailOpen: open, 
    activeBriefing: open ? state.activeBriefing : null // clear active briefing when closing
  })),
  setBreakingNews: (headline) => set({ breakingNews: headline }),
  setIsTelegramContext: (isTG) => set({ isTelegramContext: isTG }),
  
  resetFilters: () => set({ selectedCategory: 'All', searchQuery: '' })
}));
