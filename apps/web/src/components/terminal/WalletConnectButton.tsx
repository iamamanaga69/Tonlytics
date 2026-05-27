'use client';

import { useTonAddress, useTonConnectUI } from '@tonconnect/ui-react';
import { CheckCircle2, Wallet } from 'lucide-react';
import { useTelegram } from '@/hooks/useTelegram';

export default function WalletConnectButton() {
  const { triggerHaptic } = useTelegram();
  const [tonConnectUI] = useTonConnectUI();
  const walletAddress = useTonAddress();

  if (walletAddress) {
    return (
      <button
        onClick={() => {
          triggerHaptic('light');
          tonConnectUI.disconnect();
        }}
        className="flex h-10 items-center gap-2 rounded-xl border border-[#38BDF8]/30 bg-[#38BDF8]/10 px-3 text-sm font-bold text-[#F5F7FA] transition-all duration-300 hover:border-[#38BDF8]/60 hover:bg-[#38BDF8]/15 hover:shadow-[0_0_18px_rgba(56,189,248,0.22)] sm:px-4"
      >
        <CheckCircle2 className="h-4 w-4 text-[#38BDF8]" />
        <span className="hidden sm:inline">{walletAddress.slice(0, 4)}...{walletAddress.slice(-4)}</span>
        <span className="sm:hidden">Wallet</span>
      </button>
    );
  }

  return (
    <button
      onClick={() => {
        triggerHaptic('light');
        tonConnectUI.openModal();
      }}
      className="flex h-10 items-center gap-2 rounded-xl border border-[#ffffff]/10 bg-[#111827]/70 px-3 text-sm font-bold text-[#F5F7FA] transition-all duration-300 hover:border-[#0098EA]/60 hover:bg-[#0098EA]/10 hover:shadow-[0_0_18px_rgba(0,152,234,0.22)] sm:px-4"
    >
      <Wallet className="h-4 w-4 text-[#0098EA]" />
      <span className="hidden sm:inline">Connect Wallet</span>
      <span className="sm:hidden">Connect</span>
    </button>
  );
}
