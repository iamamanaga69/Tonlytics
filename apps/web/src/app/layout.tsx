import type { Metadata } from 'next';
import './globals.css';
import TelegramAppInitializer from '@/components/telegram/TelegramAppInitializer';
import TonConnectProvider from '@/components/providers/TonConnectProvider';

export const metadata: Metadata = {
  title: {
    default: 'Tonlytics - TON Ecosystem Intelligence',
    template: '%s | Tonlytics',
  },
  description:
    'Premium editorial intelligence for TON, Telegram Mini Apps, builders, infrastructure, funding, governance, and ecosystem strategy.',
  keywords: [
    'TON',
    'Telegram Mini Apps',
    'TON ecosystem',
    'Tonkeeper',
    'TON DeFi',
    'Tact',
    'USDT TON',
    'Web3 research',
  ],
  authors: [{ name: 'Tonlytics' }],
  creator: 'Tonlytics',
  publisher: 'Tonlytics',
  applicationName: 'Tonlytics',
  metadataBase: new URL('https://tonlytics.xyz'),
  alternates: {
    canonical: '/',
  },
  openGraph: {
    title: 'Tonlytics - TON Ecosystem Intelligence',
    description:
      'Bloomberg-grade editorial coverage and high-signal briefings across the TON and Telegram ecosystem.',
    url: 'https://tonlytics.xyz',
    siteName: 'Tonlytics',
    type: 'website',
    locale: 'en_US',
    images: [
      {
        url: '/images/tonlytics_logo.png',
        width: 1200,
        height: 630,
        alt: 'Tonlytics TON ecosystem intelligence',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Tonlytics - TON Ecosystem Intelligence',
    description:
      'Independent reporting and analysis on TON infrastructure, Mini Apps, DeFi, funding, governance, and Telegram integrations.',
    images: ['/images/tonlytics_logo.png'],
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
    <html lang="en" className="h-full scroll-smooth antialiased">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover" />
        <meta name="format-detection" content="telephone=no" />
        <meta httpEquiv="X-UA-Compatible" content="IE=edge" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  const storedTheme = localStorage.getItem('theme');
                  const theme = storedTheme || 'light';
                  document.documentElement.classList.toggle('dark', theme === 'dark');
                } catch (e) {
                  document.documentElement.classList.remove('dark');
                }
              })()
            `,
          }}
        />
      </head>
      <body className="min-h-full bg-editorial-bg text-foreground flex flex-col sans-body antialiased">
        <TelegramAppInitializer />
        <TonConnectProvider>
          {children}
        </TonConnectProvider>
      </body>
    </html>
  );
}
