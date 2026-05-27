import { NextResponse } from 'next/server';
import { validateAdminRequest } from '@/lib/auth';
import { dbService } from '@/lib/db/supabase';

/**
 * GET /api/admin/moderation
 * Retrieves the quarantined briefings held in "pending_review" status
 */
export async function GET(request: Request) {
  try {
    const authError = validateAdminRequest(request);
    if (authError) return authError;

    const pendingBriefings = await dbService.getPendingReviewBriefings();
    return NextResponse.json({
      success: true,
      count: pendingBriefings.length,
      briefings: pendingBriefings
    });
  } catch (error) {
    console.error('[API ADMIN MODERATION] Failed to fetch pending briefings:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Database query crashed' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/admin/moderation
 * Executes content moderation overrides (Approve & Publish or Discard Briefing)
 */
export async function POST(request: Request) {
  try {
    const authError = validateAdminRequest(request);
    if (authError) return authError;

    const body = await request.json();
    const { 
      briefingId, 
      action,
      title,
      briefing,
      why_it_matters,
      category,
      tags,
      key_takeaways
    } = body;

    if (!briefingId || !action) {
      return NextResponse.json(
        { error: 'Missing required parameters: briefingId, action' },
        { status: 400 }
      );
    }

    if (action !== 'approve' && action !== 'discard') {
      return NextResponse.json(
        { error: 'Invalid moderation action. Must be "approve" or "discard"' },
        { status: 400 }
      );
    }

    const nextStatus = action === 'approve' ? 'auto_approved' : 'flagged_discarded';
    const isPublished = action === 'approve';

    const fieldsToUpdate: any = {};
    if (action === 'approve') {
      if (title !== undefined) fieldsToUpdate.title = title;
      if (briefing !== undefined) fieldsToUpdate.briefing = briefing;
      if (why_it_matters !== undefined) fieldsToUpdate.why_it_matters = why_it_matters;
      if (category !== undefined) fieldsToUpdate.category = category;
      if (tags !== undefined) fieldsToUpdate.tags = tags;
      if (key_takeaways !== undefined) fieldsToUpdate.key_takeaways = key_takeaways;
    }

    const updatedBriefing = await dbService.updateBriefingModerationStatus(
      briefingId,
      nextStatus,
      isPublished,
      fieldsToUpdate
    );

    if (!updatedBriefing) {
      return NextResponse.json(
        { error: 'Briefing not found or could not be updated' },
        { status: 404 }
      );
    }

    console.log(`[API ADMIN MODERATION] Manually ${action}d briefing ID: ${briefingId}`);

    return NextResponse.json({
      success: true,
      action_taken: action,
      briefing: updatedBriefing
    });
  } catch (error) {
    console.error('[API ADMIN MODERATION] Execution crashed:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Execution crashed' },
      { status: 500 }
    );
  }
}
