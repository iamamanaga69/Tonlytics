'use client';

import React, { useState, useEffect } from 'react';
import { 
  ShieldCheck, 
  Check, 
  Trash2, 
  AlertTriangle, 
  Clock, 
  Eye, 
  ExternalLink, 
  Loader2, 
  ArrowLeft, 
  Inbox, 
  FileText, 
  ThumbsUp,
  Sliders,
  Sparkles,
  Link,
  Plus,
  Trash
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTelegram } from '@/hooks/useTelegram';
import type { Briefing } from '@/types';

export default function ModerationPortal() {
  const { triggerHaptic } = useTelegram();
  const [pending, setPending] = useState<Briefing[]>([]);
  const [approved, setApproved] = useState<Briefing[]>([]);
  const [rejected, setRejected] = useState<Briefing[]>([]);
  const [activeTab, setActiveTab] = useState<'pending' | 'approved' | 'rejected'>('pending');
  
  const [selectedBriefing, setSelectedBriefing] = useState<Briefing | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Live Curation Inline State
  const [curatedTitle, setCuratedTitle] = useState('');
  const [curatedBriefing, setCuratedBriefing] = useState('');
  const [curatedWhyItMatters, setCuratedWhyItMatters] = useState('');
  const [curatedTakeaways, setCuratedTakeaways] = useState<string[]>([]);
  
  // Load data from API endpoints
  const loadData = async () => {
    setIsLoading(true);
    try {
      // 1. Fetch pending reviews
      const pendingRes = await fetch('/api/admin/moderation');
      const pendingData = await pendingRes.json();
      if (pendingData.success) {
        setPending(pendingData.briefings);
        if (pendingData.briefings.length > 0) {
          selectBriefingItem(pendingData.briefings[0]);
        } else {
          setSelectedBriefing(null);
        }
      }
      
      // 2. Fetch approved briefings
      const approvedRes = await fetch('/api/briefings');
      const approvedData = await approvedRes.json();
      if (approvedData.success) {
        setApproved(approvedData.briefings);
      }
    } catch (err) {
      console.error('Failed to retrieve briefings:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const selectBriefingItem = (briefing: Briefing) => {
    setSelectedBriefing(briefing);
    setCuratedTitle(briefing.title);
    setCuratedBriefing(briefing.briefing);
    setCuratedWhyItMatters(briefing.why_it_matters);
    setCuratedTakeaways(briefing.key_takeaways || ['']);
  };

  const handleSelectBriefing = (briefing: Briefing) => {
    selectBriefingItem(briefing);
    triggerHaptic('light');
  };

  // Curation Takeaway helpers
  const handleTakeawayChange = (index: number, val: string) => {
    const updated = [...curatedTakeaways];
    updated[index] = val;
    setCuratedTakeaways(updated);
  };

  const handleAddTakeaway = () => {
    setCuratedTakeaways([...curatedTakeaways, '']);
    triggerHaptic('light');
  };

  const handleRemoveTakeaway = (index: number) => {
    setCuratedTakeaways(curatedTakeaways.filter((_, i) => i !== index));
    triggerHaptic('light');
  };

  // Perform manual Approve or Discard action with manual overrides
  const handleModerateAction = async (action: 'approve' | 'discard') => {
    if (!selectedBriefing || isSubmitting) return;
    setIsSubmitting(true);
    triggerHaptic('medium');
    
    try {
      const payload: any = {
        briefingId: selectedBriefing.id,
        action
      };

      if (action === 'approve') {
        // Include inline manual overrides from curator
        payload.title = curatedTitle;
        payload.briefing = curatedBriefing;
        payload.why_it_matters = curatedWhyItMatters;
        payload.key_takeaways = curatedTakeaways.filter(Boolean); // strip empty lines
      }

      const response = await fetch('/api/admin/moderation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      
      const resData = await response.json();
      if (resData.success) {
        if (action === 'approve') {
          // Remove from pending list
          const updatedPending = pending.filter(p => p.id !== selectedBriefing.id);
          setPending(updatedPending);
          
          // Add to approved archive locally
          if (resData.briefing) {
            setApproved([resData.briefing, ...approved]);
          }
          
          // Select next pending item
          if (updatedPending.length > 0) {
            selectBriefingItem(updatedPending[0]);
          } else {
            setSelectedBriefing(null);
          }
        } else {
          // Discard
          const updatedPending = pending.filter(p => p.id !== selectedBriefing.id);
          setPending(updatedPending);
          
          if (resData.briefing) {
            setRejected([resData.briefing, ...rejected]);
          }
          
          if (updatedPending.length > 0) {
            selectBriefingItem(updatedPending[0]);
          } else {
            setSelectedBriefing(null);
          }
        }
      } else {
        alert(`Failed to curate: ${resData.error}`);
      }
    } catch (err) {
      console.error('Curation error:', err);
      alert('Curation failed. Verify server properties.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Generate mock pending aggregator item for testing
  const handleCreateMockPending = () => {
    const mockPending: Briefing = {
      id: `pending-${Math.random().toString(36).substring(2, 9)}`,
      title: 'STON.fi Prepares Cross-Chain Bridges for Evm Wallet Interoperability',
      slug: 'stonfi-prepares-cross-chain-bridges',
      briefing: 'STON.fi DEX has drafted architectural proposals to introduce trustless cross-chain routing bridging EVM networks to TON mainnet natively, bypassing intermediate custodial wraps.',
      why_it_matters: 'Expands liquidity aggregation and bridges EVM capital to TON dApps directly.',
      category: 'DeFi',
      tags: ['cross-chain', 'ston-fi', 'evm', 'liquidity'],
      is_published: false,
      telegram_posted: false,
      views_count: 0,
      
      // Auto Aggregated Scoring Metrics
      relevance_score: 94,
      spam_probability: 8,
      duplicate_probability: 32, // potential duplicate notice
      confidence_score: 92,
      readability_score: 88,
      hallucination_probability: 4,
      source_quality_score: 95,
      moderation_status: 'pending_review',
      
      source_name: 'STON.fi Tech Announcement',
      source_url: 'https://ston.fi/blog/cross-chain-proposals',
      key_takeaways: [
        'Enables EVM key connection and wallet signatures.',
        'Minimizes custodial bridging wrap overhead.',
        'Implements native sharded swap validators.'
      ],
      published_at: new Date().toISOString(),
      created_at: new Date().toISOString()
    };
    
    setPending([mockPending, ...pending]);
    selectBriefingItem(mockPending);
    triggerHaptic('light');
  };

  return (
    <div className="flex-1 flex flex-col w-full min-h-screen bg-[#040609] select-text">
      
      {/* 1. HEADER */}
      <header className="w-full bg-[#080b11]/30 backdrop-blur-md border-b border-slate-900/40 py-4 px-4 md:px-8 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <a
            href="/"
            className="w-7 h-7 rounded-full bg-slate-950/60 border border-slate-900 flex items-center justify-center text-slate-450 hover:text-slate-200 transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
          </a>
          <span className="font-extrabold text-sm md:text-base tracking-widest font-display text-slate-200 uppercase">
            Tonlytics
          </span>
          <span className="h-4.5 w-px bg-slate-900 shrink-0" />
          <span className="text-[10px] font-bold text-slate-500 font-mono tracking-widest uppercase flex items-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-sky-400" />
            <span>Aggregation & Curation desk</span>
          </span>
        </div>
        
        <div>
          {pending.length === 0 && (
            <button
              onClick={handleCreateMockPending}
              className="px-3 py-1.5 bg-sky-950/20 border border-sky-900/40 hover:border-sky-850 text-[9px] font-bold text-sky-400 uppercase tracking-widest rounded-lg transition-all cursor-pointer font-mono"
            >
              Simulate Aggregated Inflow
            </button>
          )}
        </div>
      </header>

      {/* 2. CRAWLER INTELLIGENCE CONTENT AREA */}
      <main className="flex-1 max-w-7xl w-full mx-auto flex flex-col lg:flex-row h-[calc(100vh-64px)] overflow-hidden">
        
        {/* SIDEBAR: Ingestion Logs and Queue Lists */}
        <section className="w-full lg:w-80 border-r border-slate-950/80 bg-[#07090d]/60 flex flex-col shrink-0">
          {/* Curation Queue Tab Triggers */}
          <div className="flex border-b border-slate-950/85 bg-slate-950/30 p-2 gap-1 shrink-0">
            <button
              onClick={() => setActiveTab('pending')}
              className={`flex-1 py-2 text-center text-[9px] font-bold uppercase tracking-wider rounded-lg transition-all font-mono flex items-center justify-center gap-1 cursor-pointer ${
                activeTab === 'pending'
                  ? 'bg-slate-900/60 text-amber-400 border border-amber-950/30'
                  : 'text-slate-500 hover:text-slate-400'
              }`}
            >
              <Inbox className="w-3 h-3" />
              <span>Held ({pending.length})</span>
            </button>
            <button
              onClick={() => setActiveTab('approved')}
              className={`flex-1 py-2 text-center text-[9px] font-bold uppercase tracking-wider rounded-lg transition-all font-mono flex items-center justify-center gap-1 cursor-pointer ${
                activeTab === 'approved'
                  ? 'bg-slate-900/60 text-sky-400 border border-sky-950/30'
                  : 'text-slate-500 hover:text-slate-400'
              }`}
            >
              <ThumbsUp className="w-3 h-3" />
              <span>Published ({approved.length})</span>
            </button>
            <button
              onClick={() => setActiveTab('rejected')}
              className={`flex-1 py-2 text-center text-[9px] font-bold uppercase tracking-wider rounded-lg transition-all font-mono flex items-center justify-center gap-1 cursor-pointer ${
                activeTab === 'rejected'
                  ? 'bg-slate-900/60 text-red-400 border border-red-950/30'
                  : 'text-slate-500 hover:text-slate-400'
              }`}
            >
              <Trash2 className="w-3 h-3" />
              <span>Trash ({rejected.length})</span>
            </button>
          </div>

          {/* Aggregated Inflow Stream */}
          <div className="flex-1 overflow-y-auto p-3 space-y-2">
            {isLoading ? (
              <div className="flex flex-col items-center justify-center h-48 gap-3 text-slate-500 font-mono text-[9px] tracking-wider uppercase font-bold">
                <Loader2 className="w-4 h-4 text-sky-500 animate-spin" />
                <span>Auditing Ingestion...</span>
              </div>
            ) : activeTab === 'pending' ? (
              pending.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-48 text-center px-4 py-8 border border-dashed border-slate-900 rounded-xl bg-slate-950/10">
                  <ShieldCheck className="w-6 h-6 text-sky-500/20 mb-3" />
                  <h3 className="text-slate-400 font-bold text-[10px] uppercase tracking-wider font-mono">Quarantine Inbox Empty</h3>
                  <p className="text-[9px] text-slate-600 mt-1 font-mono">All incoming ecosystem aggregation updates validated successfully.</p>
                </div>
              ) : (
                pending.map(b => (
                  <div
                    key={b.id}
                    onClick={() => handleSelectBriefing(b)}
                    className={`p-3 rounded-lg border cursor-pointer transition-all duration-200 flex flex-col gap-2 ${
                      selectedBriefing?.id === b.id
                        ? 'bg-amber-950/10 border-amber-500/30 text-amber-300'
                        : 'bg-slate-950/20 border-slate-900 hover:border-slate-800 text-slate-400'
                    }`}
                  >
                    <div className="flex items-center justify-between text-[8px] font-mono font-bold tracking-widest uppercase">
                      <span className="px-1.5 py-0.5 rounded border border-amber-950/40 text-amber-500">
                        {b.category}
                      </span>
                      <span className="text-amber-500/90 font-semibold">
                        Relevance: {b.relevance_score || 90}%
                      </span>
                    </div>
                    <h3 className="text-xs font-bold leading-snug line-clamp-2 font-display">
                      {b.title}
                    </h3>
                    <div className="flex justify-between items-center text-[7px] text-slate-550 font-mono">
                      <span>{b.source_name || 'Aggregation Link'}</span>
                      <span>Held</span>
                    </div>
                  </div>
                ))
              )
            ) : activeTab === 'approved' ? (
              approved.length === 0 ? (
                <div className="text-center py-12 text-slate-650 font-mono text-[9px]">No published briefings.</div>
              ) : (
                approved.map(b => (
                  <div
                    key={b.id}
                    onClick={() => handleSelectBriefing(b)}
                    className={`p-3 rounded-lg border cursor-pointer transition-all duration-200 flex flex-col gap-2 ${
                      selectedBriefing?.id === b.id
                        ? 'bg-sky-950/10 border-sky-500/30 text-sky-300'
                        : 'bg-slate-950/20 border-slate-900 hover:border-slate-800 text-slate-450'
                    }`}
                  >
                    <div className="flex items-center justify-between text-[8px] font-mono font-bold tracking-widest uppercase">
                      <span className="px-1.5 py-0.5 rounded border border-sky-950/40 text-sky-500">
                        {b.category}
                      </span>
                      <span className="text-slate-550">{b.source_name}</span>
                    </div>
                    <h3 className="text-xs font-bold leading-snug line-clamp-2 font-display">
                      {b.title}
                    </h3>
                  </div>
                ))
              )
            ) : (
              rejected.length === 0 ? (
                <div className="text-center py-12 text-slate-650 font-mono text-[9px]">No rejected briefings.</div>
              ) : (
                rejected.map(b => (
                  <div
                    key={b.id}
                    onClick={() => handleSelectBriefing(b)}
                    className={`p-3 rounded-lg border cursor-pointer transition-all duration-200 flex flex-col gap-2 ${
                      selectedBriefing?.id === b.id
                        ? 'bg-red-950/10 border-red-500/30 text-red-300'
                        : 'bg-slate-950/20 border-slate-900 hover:border-slate-800 text-slate-450'
                    }`}
                  >
                    <div className="flex items-center justify-between text-[8px] font-mono font-bold tracking-widest uppercase">
                      <span className="px-1.5 py-0.5 rounded border border-red-950/40 text-red-400">
                        {b.category}
                      </span>
                      <span className="text-slate-550">Spam score: {b.spam_probability || 0}%</span>
                    </div>
                    <h3 className="text-xs font-bold leading-snug line-clamp-2 font-display">
                      {b.title}
                    </h3>
                  </div>
                ))
              )
            )}
          </div>
        </section>

        {/* COMPARATOR & COPIED WRITER BOARD PANEL */}
        <section className="flex-1 bg-[#05070a]/90 flex flex-col overflow-hidden">
          {selectedBriefing ? (
            <div className="flex-1 flex flex-col overflow-hidden">
              
              {/* Telemetry Action Controls Banner */}
              <div className="bg-[#090d14] border-b border-slate-950/90 px-6 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shrink-0">
                <div className="flex flex-col gap-1.5">
                  <span className="text-[9px] text-amber-500 font-mono font-bold uppercase tracking-widest flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                    <span>Fact Aggregator Curation Portal</span>
                  </span>
                  <div className="text-[11px] text-slate-400 font-mono flex items-center gap-1.5">
                    <span>Source:</span>
                    <span className="text-sky-400 font-bold underline decoration-sky-400/20">{selectedBriefing.source_name || 'Aggregated Link'}</span>
                  </div>
                </div>

                {/* Moderation curates */}
                {activeTab === 'pending' && (
                  <div className="flex items-center gap-2.5 self-end sm:self-center shrink-0">
                    <button
                      disabled={isSubmitting}
                      onClick={() => handleModerateAction('discard')}
                      className="flex items-center gap-1.5 px-4 py-2 border border-red-500/20 bg-red-950/10 hover:bg-red-950/20 text-red-400 text-[10px] font-mono font-bold tracking-wider uppercase rounded-lg transition-all cursor-pointer disabled:opacity-50"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Discard</span>
                    </button>
                    <button
                      disabled={isSubmitting}
                      onClick={() => handleModerateAction('approve')}
                      className="flex items-center gap-1.5 px-4 py-2 border border-emerald-500/20 bg-emerald-950/10 hover:bg-emerald-950/20 text-emerald-400 text-[10px] font-mono font-bold tracking-wider uppercase rounded-lg transition-all cursor-pointer disabled:opacity-50"
                    >
                      <Check className="w-3.5 h-3.5" />
                      <span>Approve & Publish</span>
                    </button>
                  </div>
                )}
              </div>

              {/* AUTOMATED METRICS SLIDER BAR */}
              <div className="grid grid-cols-3 gap-6 p-6 border-b border-slate-950/80 bg-slate-950/10 shrink-0 select-none">
                
                {/* 1. Relevance Slider Gauge */}
                <div className="flex flex-col gap-2">
                  <div className="flex justify-between items-center text-[8px] font-mono tracking-widest text-slate-500 font-bold uppercase">
                    <span>Ecosystem Relevance</span>
                    <span className="text-sky-400 font-extrabold">{selectedBriefing.relevance_score || 95}%</span>
                  </div>
                  <div className="w-full h-1 bg-slate-900 rounded-full overflow-hidden relative">
                    <div className="absolute left-0 top-0 h-full bg-sky-500 rounded-full" style={{ width: `${selectedBriefing.relevance_score || 95}%` }} />
                  </div>
                </div>

                {/* 2. Spam Probability Slider */}
                <div className="flex flex-col gap-2">
                  <div className="flex justify-between items-center text-[8px] font-mono tracking-widest text-slate-500 font-bold uppercase">
                    <span>Spam Probability</span>
                    <span className={`font-extrabold ${(selectedBriefing.spam_probability || 0) > 30 ? 'text-red-400' : 'text-slate-400'}`}>
                      {selectedBriefing.spam_probability || 0}%
                    </span>
                  </div>
                  <div className="w-full h-1 bg-slate-900 rounded-full overflow-hidden relative">
                    <div className="absolute left-0 top-0 h-full bg-amber-500 rounded-full" style={{ width: `${selectedBriefing.spam_probability || 0}%` }} />
                  </div>
                </div>

                {/* 3. Duplicate Probability Slider */}
                <div className="flex flex-col gap-2">
                  <div className="flex justify-between items-center text-[8px] font-mono tracking-widest text-slate-500 font-bold uppercase">
                    <span>Duplicate Probability</span>
                    <span className={`font-extrabold ${(selectedBriefing.duplicate_probability || 0) > 40 ? 'text-amber-400' : 'text-slate-400'}`}>
                      {selectedBriefing.duplicate_probability || 0}%
                    </span>
                  </div>
                  <div className="w-full h-1 bg-slate-900 rounded-full overflow-hidden relative">
                    <div className="absolute left-0 top-0 h-full bg-indigo-500 rounded-full" style={{ width: `${selectedBriefing.duplicate_probability || 0}%` }} />
                  </div>
                </div>

              </div>

              {/* INLINE EDIT CURATE PANEL (Side-by-side comparative views) */}
              <div className="flex-1 overflow-hidden flex flex-col md:flex-row">
                
                {/* LEFT: MASTER CURATION EDITOR (PLATFORM OWNER DIRECT INPUTS) */}
                <div className="flex-1 border-r border-slate-950/80 p-6 overflow-y-auto flex flex-col gap-5 bg-slate-950/5">
                  <div className="flex items-center gap-1.5 border-b border-slate-900/40 pb-2">
                    <Sliders className="w-4 h-4 text-sky-400" />
                    <h2 className="text-[10px] font-bold text-slate-400 font-mono tracking-wider uppercase">Editorial Curation Editor</h2>
                  </div>

                  {activeTab !== 'pending' && (
                    <div className="p-3 bg-sky-950/15 border border-sky-900/20 text-[10px] font-semibold text-sky-400 font-mono rounded-xl flex items-center gap-2">
                      <ShieldCheck className="w-4 h-4 shrink-0" />
                      <span>Archive Log View: Inline edits locked.</span>
                    </div>
                  )}
                  
                  {/* Curation Title Edit */}
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[8px] font-mono text-slate-500 uppercase font-bold">Curation Headline (Max 70 Chars)</label>
                    <input
                      type="text"
                      disabled={activeTab !== 'pending'}
                      value={curatedTitle}
                      onChange={(e) => setCuratedTitle(e.target.value)}
                      className="w-full bg-[#05070a] border border-slate-900 text-xs font-bold text-slate-200 rounded-xl px-4 py-2.5 outline-none focus:border-sky-500/25 transition-all"
                    />
                  </div>

                  {/* Summary Briefing Textarea Edit */}
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[8px] font-mono text-slate-500 uppercase font-bold">Concise Summary Curation briefing (2 dense paragraphs max)</label>
                    <textarea
                      disabled={activeTab !== 'pending'}
                      value={curatedBriefing}
                      onChange={(e) => setCuratedBriefing(e.target.value)}
                      rows={5}
                      className="w-full bg-[#05070a] border border-slate-900 text-xs text-slate-300 rounded-xl px-4 py-3 outline-none focus:border-sky-500/25 transition-all leading-relaxed font-sans resize-none"
                    />
                  </div>

                  {/* Why It Matters Edit */}
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[8px] font-mono text-slate-500 uppercase font-bold">"Why It Matters" strategic ecosystem analysis</label>
                    <textarea
                      disabled={activeTab !== 'pending'}
                      value={curatedWhyItMatters}
                      onChange={(e) => setCuratedWhyItMatters(e.target.value)}
                      rows={3}
                      className="w-full bg-[#05070a] border border-slate-900 text-xs text-slate-350 rounded-xl px-4 py-3 outline-none focus:border-sky-500/25 transition-all leading-relaxed font-sans resize-none font-semibold"
                    />
                  </div>

                  {/* Key Takeaways Bullet List Edit */}
                  <div className="flex flex-col gap-2.5">
                    <div className="flex justify-between items-center border-b border-slate-900/20 pb-1.5">
                      <label className="text-[8px] font-mono text-slate-500 uppercase font-bold">Factual Key Takeaways (3 Bullet highlights)</label>
                      {activeTab === 'pending' && (
                        <button
                          onClick={handleAddTakeaway}
                          className="text-[8px] font-bold text-sky-400 font-mono flex items-center gap-0.5 uppercase cursor-pointer"
                        >
                          <Plus className="w-2.5 h-2.5" />
                          <span>Add point</span>
                        </button>
                      )}
                    </div>
                    
                    <div className="space-y-2">
                      {curatedTakeaways.map((takeaway, i) => (
                        <div key={i} className="flex items-center gap-2">
                          <span className="w-1.5 h-1.5 rounded-full bg-sky-500/30 shrink-0" />
                          <input
                            type="text"
                            disabled={activeTab !== 'pending'}
                            value={takeaway}
                            onChange={(e) => handleTakeawayChange(i, e.target.value)}
                            placeholder="Factual, verifiable aggregated fact"
                            className="flex-1 bg-[#05070a] border border-slate-900 text-xs text-slate-350 rounded-xl px-3 py-2 outline-none focus:border-sky-500/25 transition-all"
                          />
                          {activeTab === 'pending' && curatedTakeaways.length > 1 && (
                            <button
                              onClick={() => handleRemoveTakeaway(i)}
                              className="text-slate-650 hover:text-red-400 transition-colors p-1"
                            >
                              <Trash className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* RIGHT: RAW CRAWLED METADATA REFERENCE FRAME */}
                <div className="flex-1 p-6 bg-[#04060a]/95 overflow-y-auto flex flex-col gap-5">
                  <div className="flex items-center justify-between border-b border-slate-900/40 pb-2">
                    <div className="flex items-center gap-1.5">
                      <FileText className="w-4 h-4 text-slate-500" />
                      <h2 className="text-[10px] font-bold text-slate-400 font-mono tracking-wider uppercase">Aggregated Source Reference</h2>
                    </div>
                    
                    {selectedBriefing.source_url && (
                      <a
                        href={selectedBriefing.source_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1 text-[9px] font-bold text-sky-400 hover:text-sky-300 font-mono tracking-wider"
                      >
                        <Link className="w-3.5 h-3.5 text-sky-500" />
                        <span>Canonical Document</span>
                        <ExternalLink className="w-2.5 h-2.5" />
                      </a>
                    )}
                  </div>

                  {/* Canonical URL */}
                  <div className="flex flex-col gap-1">
                    <span className="text-[8px] font-mono text-slate-500 uppercase font-bold">Canonical Redirect Link</span>
                    <p className="text-[10px] font-mono text-slate-450 break-all select-all p-3 rounded-xl bg-slate-950/45 border border-slate-900/50">
                      {selectedBriefing.source_url || 'Seeded Ingestion Core Announcement Mock'}
                    </p>
                  </div>

                  {/* Raw update context body */}
                  <div className="flex flex-col gap-1.5">
                    <span className="text-[8px] font-mono text-slate-500 uppercase font-bold">Raw Crawled Document Context</span>
                    <div className="text-[11px] text-slate-450 leading-relaxed font-sans bg-slate-950/20 border border-slate-900/40 rounded-xl p-4 space-y-3 whitespace-pre-wrap max-h-[300px] overflow-y-auto">
                      {selectedBriefing.ecosystem_context || 
                        `Factual update aggregated from canonical source URL: ${selectedBriefing.source_url || 'n/a'}.\n\nThe aggregation pipeline computed a high TON-relevance score of ${selectedBriefing.relevance_score || 95}% and evaluated the source as highly active. Standard summaries, bullet highlights, and why-it-matters have been automatically compiled for curation edits.`
                      }
                    </div>
                  </div>

                  {/* Curation Telemetry logs */}
                  <div className="flex flex-col gap-2">
                    <span className="text-[8px] font-mono text-slate-500 uppercase font-bold">Curation Telemetry logs</span>
                    <div className="flex flex-col gap-1.5 p-3.5 bg-slate-950/30 border border-slate-900/50 rounded-xl text-[9px] font-semibold font-mono text-slate-500">
                      <div>ID: {selectedBriefing.id}</div>
                      <div>Confidence Gate: {selectedBriefing.confidence_score}%</div>
                      <div>Readability score: {selectedBriefing.readability_score || 90}%</div>
                      <div>Hallucination Risk: {selectedBriefing.hallucination_probability || 0}%</div>
                      <div>Source Authority Quality: {selectedBriefing.source_quality_score || 95}%</div>
                      <div className="text-sky-400 font-bold border-t border-slate-900 pt-1.5 mt-1.5">Status: {selectedBriefing.moderation_status.toUpperCase()}</div>
                    </div>
                  </div>
                </div>

              </div>

            </div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center gap-3.5 text-slate-600 text-center p-6 select-none">
              <ShieldCheck className="w-10 h-10 text-slate-800" />
              <h3 className="text-slate-500 font-bold text-xs uppercase tracking-wider font-mono">Aggregation Queue Clear</h3>
              <p className="text-[9px] text-slate-650 font-mono max-w-xs">Select a quarantined briefing update from the left sidebar to refine, edit, and approve.</p>
            </div>
          )}
        </section>

      </main>

    </div>
  );
}
