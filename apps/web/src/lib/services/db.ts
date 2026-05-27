import { dbService } from 'database';
import { supabase, supabaseAdmin, isSupabaseConfigured } from 'database';
import type { Briefing, RawUpdate, Source } from 'types';

export const db = {
  /**
   * Retrieves all active news sources.
   */
  async getSources(): Promise<Source[]> {
    try {
      return await dbService.getSources();
    } catch (error) {
      console.error('[SERVICES/DB] Failed to fetch sources:', error);
      throw error;
    }
  },

  /**
   * Inserts new raw updates fetched from crawled sources.
   */
  async insertRawUpdates(updates: Omit<RawUpdate, 'id' | 'status' | 'retry_count' | 'created_at'>[]): Promise<number> {
    try {
      return await dbService.insertRawUpdates(updates);
    } catch (error) {
      console.error('[SERVICES/DB] Failed to insert raw updates:', error);
      throw error;
    }
  },

  /**
   * Fetches pending raw updates to be processed.
   */
  async getPendingRawUpdates(limit = 10): Promise<RawUpdate[]> {
    try {
      return await dbService.getPendingRawUpdates(limit);
    } catch (error) {
      console.error('[SERVICES/DB] Failed to fetch pending raw updates:', error);
      return [];
    }
  },

  /**
   * Updates status of a raw update (e.g. processed, filtered, failed).
   */
  async updateRawUpdateStatus(id: string, status: RawUpdate['status'], retryCount?: number): Promise<void> {
    try {
      await dbService.updateRawUpdateStatus(id, status, retryCount);
    } catch (error) {
      console.error(`[SERVICES/DB] Failed to update raw update status (${id}):`, error);
      throw error;
    }
  },

  /**
   * Checks if an article is a duplicate based on external URL or normalized title.
   */
  async checkDuplicate(sourceUrl: string, title: string): Promise<boolean> {
    if (!isSupabaseConfigured || !supabase) {
      // Mock duplicate check
      return false;
    }

    try {
      // 1. Check exact source URL matches
      const { data: exactMatch, error: urlError } = await supabase
        .from('briefings')
        .select('id')
        .eq('source_url', sourceUrl)
        .maybeSingle();

      if (exactMatch) return true;

      // 2. Check title matches in the last 7 days
      const cutoff = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
      const normalizedTitle = title.toLowerCase().replace(/[^\w\s]/g, '').replace(/\s+/g, ' ').trim();

      const { data: recentBriefings, error: titleError } = await supabase
        .from('briefings')
        .select('title')
        .gte('published_at', cutoff);

      if (recentBriefings) {
        const matches = recentBriefings.some(b => {
          const t = b.title.toLowerCase().replace(/[^\w\s]/g, '').replace(/\s+/g, ' ').trim();
          return t === normalizedTitle;
        });
        if (matches) return true;
      }

      return false;
    } catch (error) {
      console.error('[SERVICES/DB] Error checking duplicates:', error);
      return false;
    }
  },

  /**
   * Inserts an enriched editorial briefing into the database.
   */
  async insertBriefing(briefing: Omit<Briefing, 'id' | 'views_count' | 'created_at'>): Promise<Briefing> {
    try {
      return await dbService.insertBriefing(briefing);
    } catch (error) {
      console.error('[SERVICES/DB] Failed to insert briefing:', error);
      throw error;
    }
  },

  /**
   * Inserts a locally saved media asset log.
   */
  async insertMediaAsset(asset: {
    briefingId: string;
    originalUrl: string;
    localPath: string;
    mimeType: string;
    fileSize: number;
    width?: number;
    height?: number;
  }): Promise<void> {
    try {
      await dbService.insertMediaAsset({
        briefing_id: asset.briefingId,
        original_url: asset.originalUrl,
        local_path: asset.localPath,
        mime_type: asset.mimeType,
        file_size: asset.fileSize,
        width: asset.width,
        height: asset.height
      });
    } catch (error) {
      console.error('[SERVICES/DB] Failed to log media asset:', error);
    }
  }
};
