/**
 * React Hooks for Prediction Markets with Arcium MPC
 *
 * Production-ready hooks for integrating prediction markets into React applications.
 * Handles state management, error handling, and automatic updates.
 *
 * @author Claude Code
 * @version 1.0.0
 */

import { useState, useEffect, useCallback, useMemo } from "react";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { BN } from "@coral-xyz/anchor";
import * as anchor from "@coral-xyz/anchor";
import {
  PredictionMarketsSDK,
  createDevnetSDK,
  MarketData,
  MarketCategory,
  OracleType,
  SubmitVoteParams,
  CreateMarketParams,
} from "../prediction-markets-sdk";

// ============================================================================
// TYPES
// ============================================================================

export interface UsePredictionMarketsReturn {
  sdk: PredictionMarketsSDK | null;
  isInitialized: boolean;
  isInitializing: boolean;
  error: Error | null;
  initializeSDK: () => Promise<void>;
}

export interface UseMarketReturn {
  market: MarketData | null;
  isLoading: boolean;
  error: Error | null;
  refresh: () => Promise<void>;
  submitVote: (params: Omit<SubmitVoteParams, "marketId">) => Promise<void>;
  aggregateVotes: () => Promise<void>;
  calculateOdds: () => Promise<void>;
  resolveMarket: (outcome: boolean) => Promise<void>;
  claimPayout: () => Promise<void>;
}

export interface UseMarketsListReturn {
  markets: MarketData[];
  isLoading: boolean;
  error: Error | null;
  refresh: () => Promise<void>;
  createMarket: (params: Omit<CreateMarketParams, "marketId">) => Promise<MarketData>;
}

export interface VoteOperation {
  isSubmitting: boolean;
  error: Error | null;
  submitVote: (params: Omit<SubmitVoteParams, "marketId">) => Promise<{
    queueTx: string;
    finalizeTx: string;
  }>;
}

// ============================================================================
// MAIN SDK HOOK
// ============================================================================

/**
 * Main hook for initializing and accessing the Prediction Markets SDK
 */
export function usePredictionMarkets(): UsePredictionMarketsReturn {
  const { connection } = useConnection();
  const wallet = useWallet();
  const [sdk, setSDK] = useState<PredictionMarketsSDK | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const [isInitializing, setIsInitializing] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const initializeSDK = useCallback(async () => {
    if (!wallet.publicKey || !wallet.signTransaction) {
      setError(new Error("Wallet not connected"));
      return;
    }

    setIsInitializing(true);
    setError(null);

    try {
      const anchorWallet = {
        publicKey: wallet.publicKey,
        signTransaction: wallet.signTransaction.bind(wallet),
        signAllTransactions: wallet.signAllTransactions?.bind(wallet) || (async (txs) => {
          return await Promise.all(txs.map(tx => wallet.signTransaction!(tx)));
        }),
      } as anchor.Wallet;

      const newSDK = await createDevnetSDK(anchorWallet);
      setSDK(newSDK);
      setIsInitialized(true);
    } catch (err) {
      setError(err as Error);
      console.error("Failed to initialize SDK:", err);
    } finally {
      setIsInitializing(false);
    }
  }, [wallet]);

  // Auto-initialize when wallet connects
  useEffect(() => {
    if (wallet.publicKey && !isInitialized && !isInitializing) {
      initializeSDK();
    }
  }, [wallet.publicKey, isInitialized, isInitializing, initializeSDK]);

  return {
    sdk,
    isInitialized,
    isInitializing,
    error,
    initializeSDK,
  };
}

// ============================================================================
// MARKET HOOK
// ============================================================================

/**
 * Hook for interacting with a single market
 */
export function useMarket(marketId: BN): UseMarketReturn {
  const { sdk, isInitialized } = usePredictionMarkets();
  const [market, setMarket] = useState<MarketData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const refresh = useCallback(async () => {
    if (!sdk || !isInitialized) return;

    setIsLoading(true);
    setError(null);

    try {
      const marketData = await sdk.getMarket(marketId);
      setMarket(marketData);
    } catch (err) {
      setError(err as Error);
      console.error("Failed to fetch market:", err);
    } finally {
      setIsLoading(false);
    }
  }, [sdk, isInitialized, marketId]);

  const submitVote = useCallback(
    async (params: Omit<SubmitVoteParams, "marketId">) => {
      if (!sdk) throw new Error("SDK not initialized");

      setIsLoading(true);
      setError(null);

      try {
        await sdk.submitEncryptedVote({
          ...params,
          marketId,
        });
        await refresh(); // Refresh market data after voting
      } catch (err) {
        setError(err as Error);
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    [sdk, marketId, refresh]
  );

  const aggregateVotes = useCallback(async () => {
    if (!sdk) throw new Error("SDK not initialized");

    setIsLoading(true);
    setError(null);

    try {
      await sdk.aggregateVotes(marketId);
      await refresh();
    } catch (err) {
      setError(err as Error);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [sdk, marketId, refresh]);

  const calculateOdds = useCallback(async () => {
    if (!sdk) throw new Error("SDK not initialized");

    setIsLoading(true);
    setError(null);

    try {
      await sdk.calculateOdds(marketId);
      await refresh();
    } catch (err) {
      setError(err as Error);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [sdk, marketId, refresh]);

  const resolveMarket = useCallback(
    async (outcome: boolean) => {
      if (!sdk) throw new Error("SDK not initialized");

      setIsLoading(true);
      setError(null);

      try {
        await sdk.resolveMarket(marketId, outcome);
        await refresh();
      } catch (err) {
        setError(err as Error);
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    [sdk, marketId, refresh]
  );

  const claimPayout = useCallback(async () => {
    if (!sdk) throw new Error("SDK not initialized");

    setIsLoading(true);
    setError(null);

    try {
      await sdk.claimPayout(marketId);
      await refresh();
    } catch (err) {
      setError(err as Error);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [sdk, marketId, refresh]);

  // Auto-fetch market data
  useEffect(() => {
    if (isInitialized) {
      refresh();
    }
  }, [isInitialized, refresh]);

  return {
    market,
    isLoading,
    error,
    refresh,
    submitVote,
    aggregateVotes,
    calculateOdds,
    resolveMarket,
    claimPayout,
  };
}

// ============================================================================
// MARKETS LIST HOOK
// ============================================================================

/**
 * Hook for managing multiple markets
 *
 * Note: This is a simplified version. In production, you'd want to:
 * - Add pagination
 * - Add filtering by category
 * - Cache market data
 * - Use WebSocket for real-time updates
 */
export function useMarketsList(): UseMarketsListReturn {
  const { sdk, isInitialized } = usePredictionMarkets();
  const [markets, setMarkets] = useState<MarketData[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const refresh = useCallback(async () => {
    if (!sdk || !isInitialized) return;

    setIsLoading(true);
    setError(null);

    try {
      // In a real app, you'd fetch market IDs from an indexer or program
      // For now, this is a placeholder
      const marketIds: BN[] = []; // TODO: Fetch from program accounts or indexer

      const marketPromises = marketIds.map((id) => sdk.getMarket(id));
      const marketData = await Promise.all(marketPromises);
      setMarkets(marketData);
    } catch (err) {
      setError(err as Error);
      console.error("Failed to fetch markets:", err);
    } finally {
      setIsLoading(false);
    }
  }, [sdk, isInitialized]);

  const createMarket = useCallback(
    async (
      params: Omit<CreateMarketParams, "marketId">
    ): Promise<MarketData> => {
      if (!sdk) throw new Error("SDK not initialized");

      setIsLoading(true);
      setError(null);

      try {
        // Generate unique market ID
        const marketId = new BN(Date.now());

        const { marketPDA } = await sdk.createMarket({
          ...params,
          marketId,
        });

        // Fetch the newly created market
        const newMarket = await sdk.getMarket(marketId);
        setMarkets((prev) => [...prev, newMarket]);

        return newMarket;
      } catch (err) {
        setError(err as Error);
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    [sdk]
  );

  // Auto-fetch markets
  useEffect(() => {
    if (isInitialized) {
      refresh();
    }
  }, [isInitialized, refresh]);

  return {
    markets,
    isLoading,
    error,
    refresh,
    createMarket,
  };
}

// ============================================================================
// VOTE OPERATION HOOK
// ============================================================================

/**
 * Hook for submitting encrypted votes with loading states
 */
export function useVoteOperation(marketId: BN): VoteOperation {
  const { sdk } = usePredictionMarkets();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const submitVote = useCallback(
    async (params: Omit<SubmitVoteParams, "marketId">) => {
      if (!sdk) throw new Error("SDK not initialized");

      setIsSubmitting(true);
      setError(null);

      try {
        const result = await sdk.submitEncryptedVote({
          ...params,
          marketId,
        });
        return result;
      } catch (err) {
        setError(err as Error);
        throw err;
      } finally {
        setIsSubmitting(false);
      }
    },
    [sdk, marketId]
  );

  return {
    isSubmitting,
    error,
    submitVote,
  };
}

// ============================================================================
// UTILITY HOOKS
// ============================================================================

/**
 * Hook for formatting market odds as percentages
 */
export function useMarketOdds(market: MarketData | null) {
  return useMemo(() => {
    if (!market) return { yesOdds: 50, noOdds: 50 };

    const total = market.totalStake.toNumber();
    if (total === 0) return { yesOdds: 50, noOdds: 50 };

    const yesOdds = (market.yesStake.toNumber() / total) * 100;
    const noOdds = (market.noStake.toNumber() / total) * 100;

    return { yesOdds: Math.round(yesOdds), noOdds: Math.round(noOdds) };
  }, [market]);
}

/**
 * Hook for checking if user can vote on a market
 */
export function useCanVote(market: MarketData | null): boolean {
  return useMemo(() => {
    if (!market) return false;
    if (market.isResolved) return false;

    const now = Date.now() / 1000;
    return now < market.votingEndsAt.toNumber();
  }, [market]);
}

/**
 * Hook for getting time remaining until voting ends
 */
export function useTimeRemaining(market: MarketData | null): string {
  const [timeRemaining, setTimeRemaining] = useState("");

  useEffect(() => {
    if (!market) {
      setTimeRemaining("");
      return;
    }

    const updateTime = () => {
      const now = Date.now() / 1000;
      const endsAt = market.votingEndsAt.toNumber();
      const remaining = endsAt - now;

      if (remaining <= 0) {
        setTimeRemaining("Voting ended");
        return;
      }

      const days = Math.floor(remaining / 86400);
      const hours = Math.floor((remaining % 86400) / 3600);
      const minutes = Math.floor((remaining % 3600) / 60);

      if (days > 0) {
        setTimeRemaining(`${days}d ${hours}h`);
      } else if (hours > 0) {
        setTimeRemaining(`${hours}h ${minutes}m`);
      } else {
        setTimeRemaining(`${minutes}m`);
      }
    };

    updateTime();
    const interval = setInterval(updateTime, 60000); // Update every minute

    return () => clearInterval(interval);
  }, [market]);

  return timeRemaining;
}
