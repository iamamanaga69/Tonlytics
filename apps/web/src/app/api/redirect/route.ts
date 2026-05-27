import { NextResponse } from 'next/server';
import { dbService } from 'database';
import { logInfo, logError, logWarn } from 'telemetry';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');

  if (!id) {
    logWarn('[REDIRECT API] Inbound redirect triggered without briefing ID.');
    return NextResponse.redirect(new URL('/', request.url));
  }

  try {
    // 1. Fetch current briefing using dbService to verify the canonical source URL
    const briefings = await dbService.getBriefings();
    
    // Check both by ID or Slug to support flexible lookups
    const briefing = briefings.find(b => b.id === id || b.slug === id) || 
                     await dbService.getBriefingBySlug(id);

    if (!briefing || !briefing.source_url) {
      logWarn(`[REDIRECT API] Briefing not found or lacks canonical source_url: ${id}`);
      return NextResponse.redirect(new URL('/', request.url));
    }

    const rawTargetUrl = briefing.source_url.trim();

    // 2. Strict URL Validation and Normalization
    let parsedUrl: URL;
    try {
      parsedUrl = new URL(rawTargetUrl);
    } catch {
      logError(`[REDIRECT API] Malformed canonical URL rejected: "${rawTargetUrl}"`);
      return NextResponse.redirect(new URL('/', request.url));
    }

    // 3. Protocol Whitelist (Strictly block javascript:, file:, data:, or other browser execution protocols)
    const allowedProtocols = ['http:', 'https:'];
    if (!allowedProtocols.includes(parsedUrl.protocol)) {
      logError(`[REDIRECT API] Invalid protocol blocked: "${parsedUrl.protocol}" for URL: ${rawTargetUrl}`);
      return NextResponse.redirect(new URL('/', request.url));
    }

    // 4. Sanitize and normalise query string parameters to prevent string injection
    const cleanUrl = parsedUrl.origin + parsedUrl.pathname + parsedUrl.search;

    // 5. Structure Telemetry Audit
    logInfo(`[REDIRECT SUCCESS] Outbound click authorized`, {
      briefingId: briefing.id,
      briefingSlug: briefing.slug,
      sourceName: briefing.source_name || 'Ecosystem Partner',
      targetUrl: cleanUrl,
      relevanceScore: briefing.relevance_score || 0
    });

    // 6. Safe Redirect response
    return NextResponse.redirect(cleanUrl, 302);
  } catch (error) {
    logError(`[REDIRECT CRITICAL] Failed to execute redirect query for ID: ${id}`, error);
    return NextResponse.redirect(new URL('/', request.url));
  }
}
