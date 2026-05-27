'use client';

import { useEffect } from 'react';
import { useTelegram } from '@/hooks/useTelegram';

export default function TelegramAppInitializer() {
  const { isTelegram, tgUser } = useTelegram();

  useEffect(() => {
    // Add external Telegram WebApp SDK script dynamically if not present
    if (typeof window !== 'undefined' && !(window as any).Telegram?.WebApp) {
      const script = document.createElement('script');
      script.src = 'https://telegram.org/js/telegram-web-app.js';
      script.async = true;
      document.body.appendChild(script);
    }
  }, []);

  // Invisible operational bridge
  return null;
}
