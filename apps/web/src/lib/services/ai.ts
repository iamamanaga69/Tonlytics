import { summarizeRawUpdate, isAiConfigured } from 'ai';
import type { Briefing, RawUpdate } from 'types';

export const ai = {
  /**
   * Checks if AI API credentials (Gemini/OpenAI) are present.
   */
  isConfigured(): boolean {
    return isAiConfigured;
  },

  /**
   * Processes raw content to generate a clean, structured editorial briefing.
   * If the external LLM is offline or unconfigured, falls back to a rules-based parser.
   */
  async processContent(rawUpdate: RawUpdate): Promise<Omit<Briefing, 'id' | 'views_count' | 'created_at'>> {
    try {
      const summary = await summarizeRawUpdate(rawUpdate);
      
      // Auto-extract keywords/tags from raw text if the LLM returned empty arrays
      if (!summary.tags || summary.tags.length === 0) {
        summary.tags = this.extractKeywords(rawUpdate.raw_title + ' ' + rawUpdate.raw_content);
      }
      
      return summary;
    } catch (error) {
      console.error('[SERVICES/AI] Processing content failed:', error);
      throw error;
    }
  },

  /**
   * Scans text to check if it's likely spam/low quality.
   */
  isSpam(text: string): boolean {
    const lower = text.toLowerCase();
    const spamSignals = [
      'airdrop now',
      'guaranteed profit',
      'claim free',
      'send money',
      '100x gem',
      'pump signal',
      'giveaway bot',
      't.me/temp_bot'
    ];
    return spamSignals.some(sig => lower.includes(sig));
  },

  /**
   * Evaluates if text is relevant to TON ecosystem.
   */
  isEcosystemRelevant(text: string): boolean {
    const lower = text.toLowerCase();
    const tonKeywords = [
      'ton',
      'toncoin',
      'telegram',
      'tonkeeper',
      'ston.fi',
      'dedust',
      'getgems',
      'tact',
      'funC',
      'jetton',
      't.me/'
    ];
    
    // Check if at least one keyword appears
    return tonKeywords.some(keyword => lower.includes(keyword));
  },

  /**
   * Standalone fallback keyword extractor.
   */
  extractKeywords(text: string): string[] {
    const lower = text.toLowerCase();
    const keywordsMap = [
      { pattern: /\bton\b/i, word: 'TON' },
      { pattern: /\btoncoin\b/i, word: 'Toncoin' },
      { pattern: /\bwallet\b/i, word: 'Wallet' },
      { pattern: /\bdefi\b/i, word: 'DeFi' },
      { pattern: /\bnft\b/i, word: 'NFT' },
      { pattern: /\busdt\b/i, word: 'USDT' },
      { pattern: /\btelegram\b/i, word: 'Telegram' },
      { pattern: /\bdex\b/i, word: 'DEX' },
      { pattern: /\bmini app\b/i, word: 'Mini Apps' },
      { pattern: /\btonkeeper\b/i, word: 'Tonkeeper' }
    ];

    const tags: string[] = [];
    for (const { pattern, word } of keywordsMap) {
      if (pattern.test(lower)) {
        tags.push(word);
      }
    }
    return tags.slice(0, 4);
  }
};
