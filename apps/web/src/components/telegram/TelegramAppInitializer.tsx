'use client';

import { useEffect } from 'react';

interface TelegramWindow extends Window {
  Telegram?: {
    WebApp?: unknown;
  };
}

export default function TelegramAppInitializer() {
  useEffect(() => {
    // Add external Telegram WebApp SDK script dynamically if not present
    if (typeof window !== 'undefined' && !(window as TelegramWindow).Telegram?.WebApp) {
      const script = document.createElement('script');
      script.src = 'https://telegram.org/js/telegram-web-app.js';
      script.async = true;
      document.body.appendChild(script);
    }
  }, []);

  // Invisible operational bridge
  return null;
}
