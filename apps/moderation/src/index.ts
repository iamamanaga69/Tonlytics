import http from 'http';
import { dbService, isSupabaseConfigured, supabase } from 'database';
import { logInfo, logError, logWarn } from 'telemetry';
import { TRUST_THRESHOLDS } from 'config';
import type { Briefing } from 'types';
import { getRedisConnection } from 'queues';

const port = process.env.PORT || 3007;

export type BriefingState = 
  | 'RAW' 
  | 'EXTRACTED' 
  | 'ENRICHED' 
  | 'MODERATION_PENDING' 
  | 'APPROVED' 
  | 'PUBLISHED' 
  | 'ARCHIVED';

logInfo('[MODERATION] Initializing Curation Editorial State Pipeline Service...');

export class CurationStateMachine {
  /**
   * Evaluates an AI-summarized update and determines initial pipeline state.
   */
  public static async evaluateProcessedBriefing(briefing: Briefing): Promise<{
    nextState: 'auto_approved' | 'pending_review' | 'flagged_discarded';
    errors: string[];
  }> {
    const errors: string[] = [];

    // Rule 1: Confidence threshold check
    if (briefing.confidence_score < TRUST_THRESHOLDS.AUTO_APPROVE_CONFIDENCE) {
      errors.push(`Low confidence score: ${briefing.confidence_score}% (Threshold: ${TRUST_THRESHOLDS.AUTO_APPROVE_CONFIDENCE}%)`);
    }

    // Rule 2: Spam probability check
    if (briefing.spam_probability && briefing.spam_probability >= TRUST_THRESHOLDS.DISCARD_SPAM_PROBABILITY) {
      errors.push(`High spam probability: ${briefing.spam_probability}% (Max: ${TRUST_THRESHOLDS.DISCARD_SPAM_PROBABILITY}%)`);
    }

    // Rule 3: Relevance score cutoff
    if (briefing.relevance_score && briefing.relevance_score < TRUST_THRESHOLDS.RELEVANCE_SCORE_MINIMUM) {
      errors.push(`Muted relevance score: ${briefing.relevance_score}% (Min: ${TRUST_THRESHOLDS.RELEVANCE_SCORE_MINIMUM}%)`);
    }

    let nextState: 'auto_approved' | 'pending_review' | 'flagged_discarded' = 'auto_approved';

    if (errors.length > 0) {
      nextState = 'pending_review';
      
      // If critical thresholds are completely violated, flag as discarded
      if (briefing.confidence_score < 50 || (briefing.spam_probability && briefing.spam_probability > 90)) {
        nextState = 'flagged_discarded';
      }
    }

    return { nextState, errors };
  }

  /**
   * Transition briefing status and write logs.
   */
  public static async transitionCurationStatus(
    briefingId: string,
    action: 'approve' | 'discard' | 'hold',
    curatorNotes?: string
  ): Promise<Briefing | null> {
    logInfo(`[MODERATION] Curator trigger: ${action} on briefing ${briefingId}`);

    try {
      let status: 'auto_approved' | 'pending_review' | 'flagged_discarded';
      let isPublished = false;

      if (action === 'approve') {
        status = 'auto_approved';
        isPublished = true;
      } else if (action === 'discard') {
        status = 'flagged_discarded';
      } else {
        status = 'pending_review';
      }

      const updated = await dbService.updateBriefingModerationStatus(briefingId, status, isPublished, {
        ecosystem_context: curatorNotes
      });

      if (updated) {
        logInfo(`[MODERATION] Briefing ${briefingId} transitioned successfully to ${status}`);
        
        await dbService.logModerationAction({
          briefing_id: updated.id,
          raw_update_id: updated.raw_update_id,
          validation_errors: curatorNotes ? [curatorNotes] : [],
          confidence_score: updated.confidence_score,
          action_taken: action === 'approve' ? 'auto_approved' : action === 'discard' ? 'discarded' : 'held_for_review'
        });
      }

      return updated;
    } catch (error) {
      logError(`[MODERATION] Failed status transition for briefing ${briefingId}`, error);
      throw error;
    }
  }
}

// Start a simple HTTP server to keep the service running and satisfy health checks on Railway
const server = http.createServer(async (req, res) => {
  if (req.url === '/api/health' || req.url === '/health' || req.url === '/') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      status: 'healthy',
      service: 'moderation',
      uptime: process.uptime(),
      timestamp: new Date().toISOString()
    }));
    return;
  }
  
  res.writeHead(404);
  res.end('Not Found');
});

server.listen(port, async () => {
  logInfo('==================================================');
  logInfo(`[STARTUP] Service: moderation`);
  logInfo(`[STARTUP] Port: ${port}`);
  logInfo(`[STARTUP] Environment: ${process.env.NODE_ENV || 'development'}`);
  logInfo(`[STARTUP] Database Configured: ${!!process.env.DATABASE_URL}`);
  logInfo(`[STARTUP] Supabase Configured: ${isSupabaseConfigured}`);

  // 1. Supabase Check
  if (isSupabaseConfigured && supabase) {
    try {
      const { error } = await supabase.from('briefings').select('id').limit(1);
      if (error) throw error;
      logInfo('[STARTUP] Supabase Connection: SUCCESSFUL');
    } catch (err) {
      logError('[STARTUP] Supabase Connection: FAILED', err);
    }
  } else {
    logInfo('[STARTUP] Supabase Connection: SKIPPED (Not configured)');
  }

  // 2. Queue Status Check
  try {
    const redis = getRedisConnection();
    const pong = await redis.ping();
    logInfo(`[STARTUP] Redis Connection (Queues): SUCCESSFUL (${pong})`);
  } catch (err) {
    logError('[STARTUP] Redis Connection (Queues): FAILED', err);
  }

  logInfo('==================================================');
  logInfo(`[MODERATION] Tonlytics Moderation Service successfully running on port ${port}`);
});
