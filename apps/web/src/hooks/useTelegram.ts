import { useEffect, useState } from 'react';
import { useTerminalStore } from '@/store/terminalStore';

interface TelegramUser {
  id: number;
  first_name: string;
  last_name?: string;
  username?: string;
  language_code?: string;
  is_premium?: boolean;
}

export function useTelegram() {
  const [user, setUser] = useState<TelegramUser | null>(null);
  const [platform, setPlatform] = useState<string>('unknown');
  const [tgColorMode, setTgColorMode] = useState<'light' | 'dark'>('dark');
  const { isTelegramContext, setIsTelegramContext, isDetailOpen, setIsDetailOpen } = useTerminalStore();

  useEffect(() => {
    // Check if loaded inside Telegram client
    const webApp = typeof window !== 'undefined' ? (window as any).Telegram?.WebApp : null;

    if (webApp) {
      setIsTelegramContext(true);
      setPlatform(webApp.platform || 'unknown');
      setTgColorMode(webApp.colorScheme || 'dark');
      
      if (webApp.initDataUnsafe?.user) {
        setUser(webApp.initDataUnsafe.user);
      }

      // Signal Telegram that loading is complete
      webApp.ready();
      
      // Request full height viewport expansion
      webApp.expand();

      // Synchronize Telegram native theme variables to standard CSS variables
      const syncTheme = () => {
        const root = document.documentElement;
        root.style.setProperty('--background', webApp.backgroundColor || '#080a10');
        root.style.setProperty('--foreground', webApp.textColor || '#f8fafc');
        root.style.setProperty('--color-hint', webApp.themeParams?.hint_color || '#64748b');
        root.style.setProperty('--color-link', webApp.themeParams?.link_color || '#38bdf8');
        root.style.setProperty('--color-button', webApp.themeParams?.button_color || '#4f46e5');
        root.style.setProperty('--color-button-text', webApp.themeParams?.button_text_color || '#ffffff');
      };
      
      syncTheme();
      
      // Bind event listener for viewport/theme changes
      webApp.onEvent('themeChanged', syncTheme);
      
      return () => {
        webApp.offEvent('themeChanged', syncTheme);
      };
    }
  }, [setIsTelegramContext]);

  // Hook up Telegram Native BackButton to close expanded briefings
  useEffect(() => {
    const webApp = typeof window !== 'undefined' ? (window as any).Telegram?.WebApp : null;
    
    if (webApp?.BackButton) {
      if (isDetailOpen) {
        webApp.BackButton.show();
        const handleBack = () => {
          setIsDetailOpen(false);
          triggerHaptic('light');
        };
        webApp.BackButton.onClick(handleBack);
        
        return () => {
          webApp.BackButton.offClick(handleBack);
          webApp.BackButton.hide();
        };
      } else {
        webApp.BackButton.hide();
      }
    }
  }, [isDetailOpen, setIsDetailOpen]);

  /**
   * Invokes native haptic vibration feedback inside the Telegram client
   */
  const triggerHaptic = (style: 'light' | 'medium' | 'heavy' | 'rigid' | 'soft' = 'light') => {
    const webApp = typeof window !== 'undefined' ? (window as any).Telegram?.WebApp : null;
    if (webApp?.HapticFeedback) {
      try {
        webApp.HapticFeedback.impactOccurred(style);
      } catch (err) {
        console.warn('[TELEGRAM] Haptic trigger failed:', err);
      }
    }
  };

  /**
   * Safe Area Padding calculator based on Telegram browser dimensions
   */
  const getSafeAreaStyles = () => {
    const isMobileTelegram = isTelegramContext && ['ios', 'android'].includes(platform);
    return {
      paddingBottom: isMobileTelegram ? '24px' : '0px',
      paddingTop: platform === 'ios' ? '12px' : '0px'
    };
  };

  return {
    tgUser: user,
    tgPlatform: platform,
    tgColorMode,
    isTelegram: isTelegramContext,
    triggerHaptic,
    getSafeAreaStyles,
    tgWebApp: typeof window !== 'undefined' ? (window as any).Telegram?.WebApp : null
  };
}
