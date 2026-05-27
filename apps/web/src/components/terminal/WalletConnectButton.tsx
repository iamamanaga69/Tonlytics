'use client';

import React from 'react';
import { useTonConnectUI, useTonAddress } from '@tonconnect/ui-react';
import { Wallet } from 'lucide-react';
import { useTelegram } from '@/hooks/useTelegram';

export default function WalletConnectButton() {
  const { triggerHaptic } = useTelegram();
  const [tonConnectUI] = useTonConnectUI();
  const walletAddress = useTonAddress();

  return (
    <div className="relative">
      {walletAddress ? (
        <button
          onClick={() => {
            triggerHaptic('light');
            tonConnectUI.disconnect();
          }}
          className="hidden h-10 items-center gap-2 rounded-sm border border-editorial-border bg-editorial-card px-3 text-sm font-mono font-bold text-foreground transition-colors hover:border-editorial-border-hover sm:flex"
        >
          <Wallet className="h-4 w-4 text-editorial-accent" />
          <span>[{walletAddress.slice(0, 4)}...{walletAddress.slice(-4)}]</span>
        </button>
      ) : (
        <button
          onClick={() => {
            triggerHaptic('light');
            tonConnectUI.openModal();
          }}
          className="hidden h-10 items-center gap-2 rounded-sm border border-editorial-border bg-editorial-card px-3 text-sm font-mono font-bold text-foreground transition-colors hover:border-editorial-border-hover sm:flex"
        >
          <Wallet className="h-4 w-4 text-editorial-accent" />
          <span>[CONNECT WALLET]</span>
        </button>
      )}
    </div>
  );
}
