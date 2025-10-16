import React from 'react';
import { QueryClient, QueryClientProvider } from 'react-query';
import { ConnectionProvider } from '@solana/wallet-adapter-react';
import { WalletProvider } from '@solana/wallet-adapter-react';
import { ThemeProvider } from '../../components/providers/ThemeProvider';

// Mock wallets for testing
const mockWallets: any[] = [];

// Mock Solana connection
const mockEndpoint = 'http://localhost:8899';

interface TestProvidersProps {
  children: React.ReactNode;
  queryClient?: QueryClient;
}

export const TestProviders: React.FC<TestProvidersProps> = ({
  children,
  queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  })
}) => {
  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="dark"
      enableSystem={false}
      disableTransitionOnChange
    >
      <ConnectionProvider endpoint={mockEndpoint}>
        <WalletProvider wallets={mockWallets} autoConnect={false}>
          <QueryClientProvider client={queryClient}>
            {children}
          </QueryClientProvider>
        </WalletProvider>
      </ConnectionProvider>
    </ThemeProvider>
  );
};

export const createTestQueryClient = () => new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
      cacheTime: 0,
    },
    mutations: {
      retry: false,
    },
  },
});

// Mock portfolio data for testing
export const mockPortfolioData = {
  owner: '11111111111111111111111111111112',
  totalValue: 1500000000, // $1500 in micro-dollars
  lastUpdated: Date.now(),
  isInitialized: true,
  holdingsCount: 3,
};

// Mock performance history
export const mockPerformanceHistory = {
  owner: '11111111111111111111111111111112',
  dailyReturns: [100, -50, 150, 75, -25, 200, -100, 125, 50, -75],
  portfolioValues: [1000, 1010, 1005, 1020, 1025, 1022, 1042, 1032, 1045, 1040],
  returnCount: 10,
  lastUpdated: Date.now(),
};

// Mock risk metrics
export const mockRiskMetrics = {
  portfolioValue: 1500000000,
  dailyVolatility: 150, // 1.5%
  sharpeRatio: 12500, // 1.25 * 10000
  maxDrawdown: 500, // 5%
  var95: 200,
  var99: 300,
  timestamp: Date.now(),
};

// Mock peer comparison data
export const mockPeerComparison = {
  userPerformance: 150, // 1.5%
  peerPercentile: 75,
  relativePerformance: 25,
  riskAdjustedRank: 80,
  categoryVolatility: 180,
  timestamp: Date.now(),
};