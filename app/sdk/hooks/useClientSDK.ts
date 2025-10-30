'use client';

/**
 * Client-Only SDK Wrapper
 *
 * This wrapper ensures the Prediction Markets SDK only loads on the client side,
 * preventing SSR issues with cryptographic libraries (@noble/curves, etc.)
 *
 * IMPORTANT: No imports from prediction-markets-sdk at top level!
 * All imports must be dynamic to prevent SSR compilation.
 */

import { useState, useEffect } from 'react';

// Use generic types to avoid importing SDK types at compile time
interface UseClientSDKResult {
  sdk: any | null;
  isInitialized: boolean;
  isInitializing: boolean;
  error: Error | null;
  initializeSDK: () => Promise<void>;
}

/**
 * Hook that dynamically imports and initializes the SDK only on client side
 */
export function useClientSDK(): UseClientSDKResult {
  const [hookModule, setHookModule] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Dynamically import the hooks module only on client side
    import('./usePredictionMarkets')
      .then((module) => {
        setHookModule(module);
        setIsLoading(false);
      })
      .catch((error) => {
        console.error('Failed to load SDK hooks:', error);
        setIsLoading(false);
      });
  }, []);

  // Use the actual hook once it's loaded
  const sdkHook = hookModule?.usePredictionMarkets?.() || {
    sdk: null,
    isInitialized: false,
    isInitializing: isLoading,
    error: null,
    initializeSDK: async () => {},
  };

  return sdkHook;
}

/**
 * Client-only wrapper for useMarket hook
 */
export function useClientMarket(marketId: any) {
  const [hookModule, setHookModule] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    import('./usePredictionMarkets')
      .then((module) => {
        setHookModule(module);
        setIsLoading(false);
      })
      .catch((error) => {
        console.error('Failed to load SDK hooks:', error);
        setIsLoading(false);
      });
  }, []);

  const marketHook = hookModule?.useMarket?.(marketId) || {
    market: null,
    isLoading: isLoading,
    error: null,
    refresh: async () => {},
    submitVote: async () => {},
    aggregateVotes: async () => {},
    calculateOdds: async () => {},
    resolveMarket: async () => {},
    claimPayout: async () => {},
  };

  return marketHook;
}

/**
 * Client-only wrapper for useVoteOperation hook
 */
export function useClientVoteOperation(marketId: any) {
  const [hookModule, setHookModule] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    import('./usePredictionMarkets')
      .then((module) => {
        setHookModule(module);
        setIsLoading(false);
      })
      .catch((error) => {
        console.error('Failed to load SDK hooks:', error);
        setIsLoading(false);
      });
  }, []);

  const voteHook = hookModule?.useVoteOperation?.(marketId) || {
    isSubmitting: isLoading,
    error: null,
    submitVote: async () => {},
  };

  return voteHook;
}

/**
 * Re-export utility hooks dynamically to prevent SSR issues
 */
export function useMarketOdds(market: any) {
  const [hookModule, setHookModule] = useState<any>(null);

  useEffect(() => {
    import('./usePredictionMarkets')
      .then((module) => setHookModule(module))
      .catch(console.error);
  }, []);

  return hookModule?.useMarketOdds?.(market) || { yesOdds: 50, noOdds: 50 };
}

export function useCanVote(market: any): boolean {
  const [hookModule, setHookModule] = useState<any>(null);

  useEffect(() => {
    import('./usePredictionMarkets')
      .then((module) => setHookModule(module))
      .catch(console.error);
  }, []);

  return hookModule?.useCanVote?.(market) ?? false;
}

export function useTimeRemaining(market: any): string {
  const [hookModule, setHookModule] = useState<any>(null);

  useEffect(() => {
    import('./usePredictionMarkets')
      .then((module) => setHookModule(module))
      .catch(console.error);
  }, []);

  return hookModule?.useTimeRemaining?.(market) ?? 'Loading...';
}
