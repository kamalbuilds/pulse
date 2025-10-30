'use client';

/**
 * React Hooks for Prediction Markets SDK
 *
 * Provides hooks for interacting with the prediction markets program
 * and managing SDK state in React components.
 */

import { useState, useEffect, useCallback } from "react";
import { useWallet, useConnection } from "@solana/wallet-adapter-react";
import { PublicKey, Transaction, VersionedTransaction } from "@solana/web3.js";
import { BN } from "@coral-xyz/anchor";
import {
  PredictionMarketsSDK,
  MarketData,
  createDevnetSDK,
} from "../prediction-markets-sdk";

/**
 * Lightweight Wallet wrapper that matches Anchor's Wallet interface
 * This avoids the Wallet import issue from @coral-xyz/anchor
 */
class WalletWrapper {
  constructor(private wallet: any) {}

  get publicKey(): PublicKey {
    return this.wallet.publicKey;
  }

  async signTransaction<T extends Transaction | VersionedTransaction>(tx: T): Promise<T> {
    return this.wallet.signTransaction(tx);
  }

  async signAllTransactions<T extends Transaction | VersionedTransaction>(txs: T[]): Promise<T[]> {
    return this.wallet.signAllTransactions(txs);
  }
}

/**
 * Main hook for initializing and managing the Prediction Markets SDK
 */
export function usePredictionMarkets() {
  const wallet = useWallet();
  const { connection } = useConnection();
  const [sdk, setSdk] = useState<PredictionMarketsSDK | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const [isInitializing, setIsInitializing] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const initializeSDK = useCallback(async () => {
    if (!wallet.publicKey || !wallet.signTransaction || !wallet.signAllTransactions) {
      setError(new Error("Wallet not connected properly"));
      return;
    }

    setIsInitializing(true);
    setError(null);

    try {
      console.log("🔧 Initializing Prediction Markets SDK...");

      const anchorWallet = new WalletWrapper(wallet);
      const sdkInstance = await createDevnetSDK(anchorWallet as any);

      setSdk(sdkInstance);
      setIsInitialized(true);
      console.log("✅ SDK initialized successfully!");
    } catch (err: any) {
      console.error("❌ SDK initialization failed:", err);
      setError(err);
      setIsInitialized(false);
    } finally {
      setIsInitializing(false);
    }
  }, [wallet]);

  // Auto-initialize when wallet connects
  useEffect(() => {
    if (wallet.connected && wallet.publicKey && !isInitialized && !isInitializing) {
      initializeSDK();
    }
  }, [wallet.connected, wallet.publicKey, isInitialized, isInitializing, initializeSDK]);

  // Clean up when wallet disconnects
  useEffect(() => {
    if (!wallet.connected) {
      setSdk(null);
      setIsInitialized(false);
      setError(null);
    }
  }, [wallet.connected]);

  return {
    sdk,
    isInitialized,
    isInitializing,
    error,
    initializeSDK,
  };
}

/**
 * Hook for interacting with a specific market
 */
export function useMarket(marketId: BN) {
  const { sdk, isInitialized } = usePredictionMarkets();
  const [market, setMarket] = useState<MarketData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const fetchMarket = useCallback(async () => {
    if (!sdk || !isInitialized) return;

    setIsLoading(true);
    setError(null);

    try {
      const marketData = await sdk.getMarket(marketId);
      setMarket(marketData);
    } catch (err: any) {
      console.error("Failed to fetch market:", err);
      setError(err);
    } finally {
      setIsLoading(false);
    }
  }, [sdk, isInitialized, marketId]);

  useEffect(() => {
    if (isInitialized && sdk) {
      fetchMarket();
    }
  }, [isInitialized, sdk, fetchMarket]);

  const submitVote = useCallback(
    async (params: {
      voteChoice: boolean;
      stakeAmount: BN;
      predictedProbability?: number;
      convictionScore?: number;
    }) => {
      if (!sdk) throw new Error("SDK not initialized");

      const result = await sdk.submitEncryptedVote({
        marketId,
        ...params,
      });

      // Refresh market data after vote
      await fetchMarket();

      return result;
    },
    [sdk, marketId, fetchMarket]
  );

  const aggregateVotes = useCallback(async () => {
    if (!sdk) throw new Error("SDK not initialized");
    const result = await sdk.aggregateVotes(marketId);
    await fetchMarket();
    return result;
  }, [sdk, marketId, fetchMarket]);

  const calculateOdds = useCallback(async () => {
    if (!sdk) throw new Error("SDK not initialized");
    const result = await sdk.calculateOdds(marketId);
    await fetchMarket();
    return result;
  }, [sdk, marketId, fetchMarket]);

  const resolveMarket = useCallback(
    async (outcome: boolean) => {
      if (!sdk) throw new Error("SDK not initialized");
      const signature = await sdk.resolveMarket(marketId, outcome);
      await fetchMarket();
      return signature;
    },
    [sdk, marketId, fetchMarket]
  );

  const claimPayout = useCallback(async () => {
    if (!sdk) throw new Error("SDK not initialized");
    const signature = await sdk.claimPayout(marketId);
    await fetchMarket();
    return signature;
  }, [sdk, marketId, fetchMarket]);

  return {
    market,
    isLoading,
    error,
    refresh: fetchMarket,
    submitVote,
    aggregateVotes,
    calculateOdds,
    resolveMarket,
    claimPayout,
  };
}

/**
 * Hook for managing multiple markets
 */
export function useMarketsList() {
  const { sdk, isInitialized } = usePredictionMarkets();
  const [markets, setMarkets] = useState<MarketData[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const fetchMarkets = useCallback(async () => {
    if (!sdk || !isInitialized) return;

    setIsLoading(true);
    setError(null);

    try {
      // TODO: Implement proper market fetching from indexer or program
      // For now, this is a placeholder
      console.log("Markets list fetching not yet implemented");
      setMarkets([]);
    } catch (err: any) {
      console.error("Failed to fetch markets:", err);
      setError(err);
    } finally {
      setIsLoading(false);
    }
  }, [sdk, isInitialized]);

  const createMarket = useCallback(
    async (params: {
      marketId: BN;
      title: string;
      description: string;
      imageUrl: string;
      category: number;
      votingEndsAt: BN;
      oracleType: number;
      oracleAddress?: PublicKey;
    }) => {
      if (!sdk) throw new Error("SDK not initialized");

      const result = await sdk.createMarket(params);
      await fetchMarkets();
      return result;
    },
    [sdk, fetchMarkets]
  );

  useEffect(() => {
    if (isInitialized && sdk) {
      fetchMarkets();
    }
  }, [isInitialized, sdk, fetchMarkets]);

  return {
    markets,
    isLoading,
    error,
    refresh: fetchMarkets,
    createMarket,
  };
}

/**
 * Hook for vote operations with loading state
 */
export function useVoteOperation(marketId: BN) {
  const { submitVote } = useMarket(marketId);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const handleSubmitVote = useCallback(
    async (params: {
      voteChoice: boolean;
      stakeAmount: BN;
      predictedProbability?: number;
      convictionScore?: number;
    }) => {
      setIsSubmitting(true);
      setError(null);

      try {
        const result = await submitVote(params);
        return result;
      } catch (err: any) {
        console.error("Vote submission failed:", err);
        setError(err);
        throw err;
      } finally {
        setIsSubmitting(false);
      }
    },
    [submitVote]
  );

  return {
    isSubmitting,
    error,
    submitVote: handleSubmitVote,
  };
}

/**
 * Utility hook to calculate market odds as percentages
 */
export function useMarketOdds(market: MarketData | null): {
  yesOdds: number;
  noOdds: number;
} {
  if (!market || market.totalStake.toNumber() === 0) {
    return { yesOdds: 50, noOdds: 50 };
  }

  const total = market.totalStake.toNumber();
  const yesOdds = Math.round((market.yesStake.toNumber() / total) * 100);
  const noOdds = 100 - yesOdds;

  return { yesOdds, noOdds };
}

/**
 * Utility hook to check if a user can vote on a market
 */
export function useCanVote(market: MarketData | null): boolean {
  if (!market) return false;

  const now = Math.floor(Date.now() / 1000);
  const votingEnded = market.votingEndsAt.toNumber() < now;
  const isActive = market.status === 0; // MarketStatus.Active

  return isActive && !votingEnded && !market.isResolved;
}

/**
 * Utility hook to get time remaining for voting
 */
export function useTimeRemaining(market: MarketData | null): string {
  if (!market) return "Loading...";

  const now = Math.floor(Date.now() / 1000);
  const endTime = market.votingEndsAt.toNumber();
  const remaining = endTime - now;

  if (remaining <= 0) return "Voting ended";

  const days = Math.floor(remaining / 86400);
  const hours = Math.floor((remaining % 86400) / 3600);
  const minutes = Math.floor((remaining % 3600) / 60);

  if (days > 0) return `${days}d ${hours}h`;
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
}
