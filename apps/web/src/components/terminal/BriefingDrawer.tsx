'use client';

import { useTerminalStore } from '@/store/terminalStore';
import { useTelegram } from '@/hooks/useTelegram';
import { 
  X, 
  Calendar, 
  Eye, 
  ExternalLink, 
  Send, 
  Layers, 
  Smartphone, 
  Coins, 
  Shuffle, 
  Globe
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useEffect } from 'react';

/**
 * Renders a relative date string: e.g. "15m ago", "2h ago", "Yesterday"
 */
function getRelativeTime(isoString: string): string {
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

export default function BriefingDrawer() {
  const { activeBriefing, isDetailOpen, setIsDetailOpen } = useTerminalStore();
  const { isTelegram, triggerHaptic } = useTelegram();

  // Increment view counter locally when opening details drawer
  useEffect(() => {
    if (isDetailOpen && activeBriefing) {
      // Call background API route to increment views on server (silent operation)
      fetch(`/api/briefings/view?id=${activeBriefing.id}`, { method: 'POST' }).catch(() => {});
      activeBriefing.views_count += 1; // update local counter for UI realism
    }
  }, [isDetailOpen, activeBriefing]);

  const handleClose = () => {
    setIsDetailOpen(false);
    triggerHaptic('light');
  };

  if (!activeBriefing) return null;

  const categoryIcons = {
    Infrastructure: Layers,
    'Mini Apps': Smartphone,
    DeFi: Coins,
    Integration: Shuffle,
    Ecosystem: Globe,
  };

  const Icon = categoryIcons[activeBriefing.category] || Globe;

  return (
    <AnimatePresence>
      {isDetailOpen && (
        <>
          {/* 1. Backdrop Overlay with smooth blur */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={handleClose}
            className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-50 transition-opacity"
          />

          {/* 2. Container Panel (Bottom Drawer on Mobile, Centered Modal on Desktop) */}
          <motion.div
            initial={
              typeof window !== 'undefined' && window.innerWidth < 768
                ? { y: '100%' }
                : { opacity: 0, scale: 0.95, y: '-50%', x: '-50%', top: '50%', left: '50%' }
            }
            animate={
              typeof window !== 'undefined' && window.innerWidth < 768
                ? { y: 0 }
                : { opacity: 1, scale: 1, y: '-50%', x: '-50%', top: '50%', left: '50%' }
            }
            exit={
              typeof window !== 'undefined' && window.innerWidth < 768
                ? { y: '100%' }
                : { opacity: 0, scale: 0.95 }
            }
            transition={{ type: 'spring', damping: 25, stiffness: 220 }}
            className={`fixed z-50 bg-[#080b11] border border-slate-900/60 outline-none flex flex-col overflow-hidden max-h-[92vh] md:max-h-[85vh]
              ${
                typeof window !== 'undefined' && window.innerWidth < 768
                  ? 'inset-x-0 bottom-0 rounded-t-2xl w-full'
                  : 'rounded-2xl w-[600px]'
              }
            `}
          >
            {/* Drawer Header Toolbar */}
            <div className="flex items-center justify-between px-6 py-4.5 border-b border-slate-900/60 shrink-0">
              <div className="flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-sky-500/10 flex items-center justify-center text-sky-400">
                  <Icon className="w-3.5 h-3.5" />
                </span>
                <span className="text-xs font-bold uppercase tracking-wider text-slate-400 font-mono">
                  Ecosystem Intelligence
                </span>
              </div>

              {/* Close Button */}
              <button
                onClick={handleClose}
                className="w-8 h-8 rounded-full bg-slate-900 border border-slate-800 flex items-center justify-center text-slate-400 hover:text-slate-200 active:bg-slate-950 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Scrollable Briefing Content */}
            <div className="flex-1 overflow-y-auto px-6 py-6 flex flex-col gap-6">
              {/* Category Badging and Telemetry Row */}
              <div className="flex items-center justify-between w-full text-[10px] text-slate-500 font-mono tracking-wider uppercase">
                <span className="font-semibold text-slate-400 bg-slate-950/40 border border-slate-900 px-2.5 py-0.5 rounded text-[9px]">
                  {activeBriefing.category}
                </span>

                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-slate-650" />
                    <span>{getRelativeTime(activeBriefing.published_at)}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Eye className="w-3.5 h-3.5 text-slate-650" />
                    <span>{activeBriefing.views_count} views</span>
                  </div>
                </div>
              </div>

              {/* Headline Title */}
              <h1 className="text-xl md:text-2xl font-bold text-slate-200 leading-snug font-display">
                {activeBriefing.title}
              </h1>

              {/* Complete Deep Editorial Briefing */}
              <div className="text-slate-350 text-xs md:text-sm leading-relaxed space-y-4 font-normal">
                {activeBriefing.briefing.split('\n\n').map((paragraph, index) => (
                  <p key={index}>{paragraph}</p>
                ))}
              </div>

              {/* STRATEGIC IMPACT ("Why It Matters") Callout */}
              <div className="border-l-2 border-sky-500/25 pl-5 py-1.5 flex flex-col gap-1.5">
                <span className="text-[10px] uppercase font-bold tracking-widest text-slate-500 font-mono">
                  Why It Matters
                </span>
                <p className="text-slate-300 text-xs md:text-sm leading-relaxed font-semibold">
                  {activeBriefing.why_it_matters}
                </p>
              </div>

              {/* Inline tag collection */}
              <div className="flex flex-wrap gap-2.5 pt-4.5 border-t border-slate-900/40">
                {activeBriefing.tags.map((tag) => (
                  <span
                    key={tag}
                    className="text-[10px] text-slate-500 hover:text-slate-400 cursor-pointer font-mono"
                  >
                    #{tag}
                  </span>
                ))}
              </div>
            </div>

            {/* Bottom Actions Drawer Bar */}
            <div className="px-6 py-4 border-t border-slate-900/60 bg-slate-950/30 shrink-0 flex flex-col sm:flex-row gap-3">
              {/* Link 1: View original source update */}
              {activeBriefing.raw_update_id && (
                <a
                  href={activeBriefing.raw_update_id} // raw_update_id field maps source_url dynamically in mock
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 flex items-center justify-center gap-2 py-2.5 px-4 bg-slate-900 border border-slate-800 hover:border-slate-700 active:bg-slate-950 text-xs font-semibold text-slate-200 rounded-lg transition-all"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>Inspect Source Document</span>
                </a>
              )}

              {/* Link 2: View Broadcast channel post if set */}
              {activeBriefing.telegram_posted && activeBriefing.telegram_message_id && (
                <a
                  href={`https://t.me/tonlytics/${activeBriefing.telegram_message_id}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 flex items-center justify-center gap-2 py-2.5 px-4 bg-sky-500/10 border border-sky-500/20 hover:bg-sky-500/15 text-xs font-semibold text-sky-400 rounded-lg transition-all"
                >
                  <Send className="w-3.5 h-3.5 text-sky-400" />
                  <span>View Telegram Post</span>
                </a>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
