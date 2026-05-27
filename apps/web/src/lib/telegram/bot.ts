const botToken = process.env.TELEGRAM_BOT_TOKEN || '';
const defaultChatId = process.env.TELEGRAM_CHAT_ID || '';

export const isTelegramConfigured = !!(botToken && defaultChatId);

interface SendMessageResponse {
  ok: boolean;
  result?: {
    message_id: number;
    [key: string]: unknown;
  };
  description?: string;
}

/**
 * Sends a Markdown formatted message to the configured Telegram Channel or Chat ID
 */
export async function sendTelegramMessage(markdownText: string, customChatId?: string): Promise<{ success: boolean; messageId?: number; error?: string }> {
  const chatId = customChatId || defaultChatId;
  
  if (!chatId) {
    return { success: false, error: 'Telegram Chat ID / Channel Username is not configured' };
  }

  if (isTelegramConfigured) {
    try {
      const response = await fetch(
        `https://api.telegram.org/bot${botToken}/sendMessage`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            chat_id: chatId,
            text: markdownText,
            parse_mode: 'Markdown',
            disable_web_page_preview: false, // keep previews active to render shared cards
          }),
        }
      );

      const data: SendMessageResponse = await response.json();
      
      if (response.ok && data.ok && data.result) {
        return {
          success: true,
          messageId: data.result.message_id
        };
      }
      
      return {
        success: false,
        error: data.description || 'Unknown error response from Telegram API'
      };
    } catch (err) {
      console.error('[TELEGRAM] Send message API failed:', err);
      return {
        success: false,
        error: err instanceof Error ? err.message : 'Network error connecting to Telegram Bot API'
      };
    }
  }

  // ==========================================
  // LOCAL DEVELOPMENT LOGGING FALLBACK
  // ==========================================
  console.log('==========================================');
  console.log(`[MOCK TELEGRAM BROADCAST] Target Chat: ${chatId}`);
  console.log('------------------------------------------');
  console.log(markdownText);
  console.log('==========================================');

  // Return a mock success response with a simulated message ID
  const simulatedMessageId = Math.floor(100000 + Math.random() * 900000);
  return {
    success: true,
    messageId: simulatedMessageId
  };
}
