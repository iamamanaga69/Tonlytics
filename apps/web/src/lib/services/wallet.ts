import { logInfo, logError } from 'telemetry';
import { dbService } from 'database';

export interface WalletSession {
  address: string;
  network: string; // '-239' for mainnet, '-3' for testnet
  publicKey: string;
  connectedAt: string;
}

export const wallet = {
  /**
   * Stub verifier to validate TON Connect wallet proof or signatures
   * for future on-chain authentication.
   */
  async verifyWalletProof(
    address: string,
    proof: {
      timestamp: number;
      domain: string;
      signature: string;
      payload: string;
    }
  ): Promise<boolean> {
    logInfo('[SERVICES/WALLET] Verifying wallet signature', { address });
    // Placeholder validation: check if timestamp is not expired (e.g. within 24h)
    const now = Math.floor(Date.now() / 1000);
    const isValidTimestamp = Math.abs(now - proof.timestamp) < 24 * 60 * 60;
    
    return isValidTimestamp;
  },

  /**
   * Stub to track connected wallet addresses and save state.
   */
  async recordWalletConnection(session: WalletSession): Promise<void> {
    logInfo('[SERVICES/WALLET] Wallet connected', {
      address: session.address,
      network: session.network,
    });
    try {
      await dbService.persistWalletConnection({
        address: session.address,
        network: session.network,
        public_key: session.publicKey
      });
    } catch (err) {
      logError('[SERVICES/WALLET] Failed to persist wallet connection in Supabase', err);
    }
  }
};
