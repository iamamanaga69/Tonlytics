import { useCallback, useEffect, useState } from 'react';
import { useTerminalStore } from '@/store/terminalStore';

interface TelegramUser {
  id: number;
  first_name: string;
  last_name?: string;
  username?: string;
  language_code?: string;
  is_premium?: boolean;
}

interface TelegramWebApp {
  platform?: string;
  colorScheme?: 'light' | 'dark';
  backgroundColor?: string;
  textColor?: string;
  initDataUnsafe?: {
    user?: TelegramUser;
  };
  themeParams?: {
    hint_color?: string;
    link_color?: string;
    button_color?: string;
    button_text_color?: string;
  };
  BackButton?: {
    show: () => void;
    hide: () => void;
    onClick: (handler: () => void) => void;
    offClick: (handler: () => void) => void;
  };
  HapticFeedback?: {
    impactOccurred: (style: 'light' | 'medium' | 'heavy' | 'rigid' | 'soft') => void;
  };
  ready: () => void;
  expand: () => void;
  onEvent: (event: 'themeChanged', handler: () => void) => void;
  offEvent: (event: 'themeChanged', handler: () => void) => void;
}

interface TelegramWindow extends Window {
  Telegram?: {
    WebApp?: TelegramWebApp;
  };
}

function getTelegramWebApp(): TelegramWebApp | null {
  if (typeof window === 'undefined') return null;
  return (window as TelegramWindow).Telegram?.WebApp || null;
}

export function useTelegram() {
  const initialWebApp = getTelegramWebApp();
  const [user] = useState<TelegramUser | null>(() => initialWebApp?.initDataUnsafe?.user || null);
  const [platform] = useState<string>(() => initialWebApp?.platform || 'unknown');
  const [tgColorMode] = useState<'light' | 'dark'>(() => initialWebApp?.colorScheme || 'light');
  const { isTelegramContext, setIsTelegramContext, isDetailOpen, setIsDetailOpen } = useTerminalStore();

  const triggerHaptic = useCallback((style: 'light' | 'medium' | 'heavy' | 'rigid' | 'soft' = 'light') => {
    const webApp = getTelegramWebApp();
    if (webApp?.HapticFeedback) {
      try {
        webApp.HapticFeedback.impactOccurred(style);
      } catch (err) {
        console.warn('[TELEGRAM] Haptic trigger failed:', err);
      }
    }
  }, []);

  useEffect(() => {
    const webApp = getTelegramWebApp();
    if (!webApp) return;

    setIsTelegramContext(true);
    webApp.ready();
    webApp.expand();

    const syncTheme = () => {
      const root = document.documentElement;
      root.style.setProperty('--background', webApp.backgroundColor || '#F7F9FC');
      root.style.setProperty('--foreground', webApp.textColor || '#111827');
      root.style.setProperty('--color-hint', webApp.themeParams?.hint_color || '#64748b');
      root.style.setProperty('--color-link', webApp.themeParams?.link_color || '#0098EA');
      root.style.setProperty('--color-button', webApp.themeParams?.button_color || '#0098EA');
      root.style.setProperty('--color-button-text', webApp.themeParams?.button_text_color || '#ffffff');
    };

    syncTheme();
    webApp.onEvent('themeChanged', syncTheme);

    return () => {
      webApp.offEvent('themeChanged', syncTheme);
    };
  }, [setIsTelegramContext]);

  useEffect(() => {
    const webApp = getTelegramWebApp();
    if (!webApp?.BackButton) return;

    if (!isDetailOpen) {
      webApp.BackButton.hide();
      return;
    }

    webApp.BackButton.show();
    const handleBack = () => {
      setIsDetailOpen(false);
      triggerHaptic('light');
    };
    webApp.BackButton.onClick(handleBack);

    return () => {
      webApp.BackButton?.offClick(handleBack);
      webApp.BackButton?.hide();
    };
  }, [isDetailOpen, setIsDetailOpen, triggerHaptic]);

  const getSafeAreaStyles = () => {
    const isMobileTelegram = isTelegramContext && ['ios', 'android'].includes(platform);
    return {
      paddingBottom: isMobileTelegram ? '24px' : '0px',
      paddingTop: platform === 'ios' ? '12px' : '0px',
    };
  };

  return {
    tgUser: user,
    tgPlatform: platform,
    tgColorMode,
    isTelegram: isTelegramContext,
    triggerHaptic,
    getSafeAreaStyles,
    tgWebApp: getTelegramWebApp(),
  };
}
