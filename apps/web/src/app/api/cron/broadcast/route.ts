import { NextResponse } from 'next/server';
import { dbService } from '@/lib/db/supabase';
import { sendTelegramMessage } from '@/lib/telegram/bot';
import { formatBriefingForTelegram } from '@/lib/telegram/publisher';

const CRON_SECRET = process.env.CRON_SECRET || 'dev_secret_token';

export async function GET(request: Request) {
  const startTime = Date.now();
  
  // 1. Enforce Bearer Token authentication to prevent public invocation
  const authHeader = request.headers.get('Authorization');
  const isDev = process.env.NODE_ENV === 'development';
  const expectedAuth = `Bearer ${CRON_SECRET}`;
  
  if (!isDev && authHeader !== expectedAuth) {
    return NextResponse.json(
      { error: 'Unauthorized access header missing or invalid' },
      { status: 401 }
    );
  }

  try {
    // 2. Fetch published briefings that haven't been shared on Telegram yet
    const pendingBriefings = await dbService.getBriefingsPendingTelegram(3); // post 3 items max per cron tick
    let broadcastCount = 0;
    
    console.log(`[CRON BROADCAST] Found ${pendingBriefings.length} briefings waiting to be sent to Telegram`);

    // Determine base app url for shared terminal links
    const origin = request.headers.get('host') || 'localhost:3000';
    const protocol = origin.includes('localhost') ? 'http' : 'https';
    const baseAppUrl = `${protocol}://${origin}`;

    for (const briefing of pendingBriefings) {
      try {
        // A. Format briefing text with professional markdown and open links
        const messageText = formatBriefingForTelegram(briefing, baseAppUrl);
        
        // B. Broadcast to Telegram Channel via our API helper
        const result = await sendTelegramMessage(messageText);
        
        if (result.success && result.messageId) {
          // C. Log successful post and save Telegram Message ID in database
          await dbService.markBriefingAsTelegramPosted(briefing.id, result.messageId);
          broadcastCount++;
          
          console.log(`[CRON BROADCAST] Posted successfully! Msg ID: ${result.messageId} | Briefing: "${briefing.title}"`);
        } else {
          console.error(`[CRON BROADCAST] Bot client reported failure: ${result.error}`);
        }
      } catch (itemErr) {
        console.error(`[CRON BROADCAST] Error broadcasting briefing ID ${briefing.id}:`, itemErr);
      }
    }

    const duration = Date.now() - startTime;
    
    // 3. Log automation job telemetry
    await dbService.logAutomationJob({
      job_name: 'telegram_post',
      status: 'success',
      records_processed: broadcastCount,
      duration_ms: duration
    });
    
    return NextResponse.json({
      success: true,
      job: 'telegram_post',
      records_broadcast: broadcastCount,
      duration_ms: duration
    });
  } catch (error) {
    const duration = Date.now() - startTime;
    const errorMsg = error instanceof Error ? error.message : 'Unknown broadcasting worker failure';
    
    await dbService.logAutomationJob({
      job_name: 'telegram_post',
      status: 'failure',
      records_processed: 0,
      duration_ms: duration,
      error_message: errorMsg
    });
    
    return NextResponse.json(
      { error: errorMsg },
      { status: 500 }
    );
  }
}
