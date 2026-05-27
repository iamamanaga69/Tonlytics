import type { Metadata } from 'next';
import './globals.css';
import TelegramAppInitializer from '@/components/telegram/TelegramAppInitializer';

export const metadata: Metadata = {
  title: 'Tonlytics — TON Blockchain Ecosystem Intelligence Terminal',
  description:
    'Independent Real-time TON & Telegram Web3 Ecosystem News, Developer Infrastructure Updates, and Professional Intelligence Briefings.',
  keywords: [
    'TON',
    'Telegram Web3',
    'Tonkeeper',
    'TON Blockchain',
    'Mini Apps',
    'Ecosystem News',
    'Tact',
    'USDT TON',
    'Web3 News',
  ],
  authors: [{ name: 'Tonlytics Editorial Board' }],
  metadataBase: new URL('https://tonlytics.xyz'),
  openGraph: {
    title: 'Tonlytics — TON Blockchain Ecosystem Intelligence',
    description:
      'Independent Real-time TON & Telegram Web3 Ecosystem News, Developer Infrastructure Updates, and Professional Briefings.',
    url: 'https://tonlytics.xyz',
    siteName: 'Tonlytics Terminal',
    type: 'website',
    locale: 'en_US',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Tonlytics — TON Ecosystem Intelligence',
    description:
      'Independent, concise updates on the TON blockchain and Telegram Mini App developer ecosystem.',
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full scroll-smooth antialiased dark">
      <head>
        {/* Enforce Telegram webapp stylesheet and compatibility scripts */}
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0, minimum-scale=1.0, maximum-scale=1.0, user-scalable=no" />
        <meta name="format-detection" content="telephone=no" />
        <meta httpEquiv="X-UA-Compatible" content="IE=edge" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
      </head>
      <body className="min-h-full bg-terminal-bg text-slate-100 flex flex-col font-sans select-none antialiased">
        {/* Telegram SDK Connection Bridge */}
        <TelegramAppInitializer />
        {children}
      </body>
    </html>
  );
}
