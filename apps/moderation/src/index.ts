import { dbService } from 'database';
import { logInfo, logError, logWarn } from 'telemetry';
import { TRUST_THRESHOLDS } from 'config';
import type { Briefing } from 'types';

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
