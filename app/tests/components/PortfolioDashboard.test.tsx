import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { jest } from '@jest/globals';
import { PortfolioDashboard } from '../../components/portfolio/PortfolioDashboard';
import { TestProviders, mockPortfolioData, mockRiskMetrics } from '../utils/test-providers';
import { useWallet } from '@solana/wallet-adapter-react';

// Mock the useWallet hook
jest.mock('@solana/wallet-adapter-react', () => ({
  useWallet: jest.fn(),
  useConnection: jest.fn(() => ({
    connection: {
      getAccountInfo: jest.fn(),
      confirmTransaction: jest.fn(),
    }
  })),
}));

// Mock the portfolio hooks
jest.mock('../../hooks/usePortfolio', () => ({
  usePortfolio: jest.fn(),
  usePortfolioValue: jest.fn(),
  useRiskMetrics: jest.fn(),
}));

import { usePortfolio, usePortfolioValue, useRiskMetrics } from '../../hooks/usePortfolio';

const mockUseWallet = useWallet as jest.MockedFunction<typeof useWallet>;
const mockUsePortfolio = usePortfolio as jest.MockedFunction<typeof usePortfolio>;
const mockUsePortfolioValue = usePortfolioValue as jest.MockedFunction<typeof usePortfolioValue>;
const mockUseRiskMetrics = useRiskMetrics as jest.MockedFunction<typeof useRiskMetrics>;

describe('PortfolioDashboard', () => {
  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();

    // Default mock implementations
    mockUseWallet.mockReturnValue({
      connected: true,
      publicKey: {
        toString: () => '11111111111111111111111111111112',
        toBuffer: () => Buffer.from('mock-pubkey'),
        toBytes: () => new Uint8Array(32),
        equals: jest.fn(),
        toBase58: jest.fn(),
      } as any,
      wallet: null,
      connect: jest.fn(),
      disconnect: jest.fn(),
      connecting: false,
      disconnecting: false,
      select: jest.fn(),
      wallets: [],
      signTransaction: jest.fn(),
      signAllTransactions: jest.fn(),
      signMessage: jest.fn(),
    });

    mockUsePortfolio.mockReturnValue({
      data: mockPortfolioData,
      isLoading: false,
      isError: false,
      error: null,
      refetch: jest.fn(),
    });

    mockUsePortfolioValue.mockReturnValue({
      data: null,
      isLoading: false,
      isError: false,
      error: null,
      mutate: jest.fn(),
    });

    mockUseRiskMetrics.mockReturnValue({
      data: mockRiskMetrics,
      isLoading: false,
      isError: false,
      error: null,
      mutate: jest.fn(),
    });
  });

  const renderPortfolioDashboard = () => {
    return render(
      <TestProviders>
        <PortfolioDashboard />
      </TestProviders>
    );
  };

  describe('Wallet Connection State', () => {
    it('should show connect wallet message when not connected', () => {
      mockUseWallet.mockReturnValue({
        connected: false,
        publicKey: null,
        connect: jest.fn(),
        disconnect: jest.fn(),
        connecting: false,
        disconnecting: false,
      } as any);

      renderPortfolioDashboard();

      expect(screen.getByText(/connect your wallet/i)).toBeInTheDocument();
    });

    it('should show loading state when connecting', () => {
      mockUseWallet.mockReturnValue({
        connected: false,
        publicKey: null,
        connecting: true,
        disconnecting: false,
        connect: jest.fn(),
        disconnect: jest.fn(),
      } as any);

      renderPortfolioDashboard();

      expect(screen.getByText(/connecting/i)).toBeInTheDocument();
    });

    it('should show dashboard when wallet is connected', () => {
      renderPortfolioDashboard();

      expect(screen.getByText(/portfolio overview/i)).toBeInTheDocument();
    });
  });

  describe('Portfolio Data Display', () => {
    it('should display portfolio total value correctly', () => {
      renderPortfolioDashboard();

      // $1500.00 formatted
      expect(screen.getByText(/\$1,500\.00/)).toBeInTheDocument();
    });

    it('should show loading state while fetching portfolio data', () => {
      mockUsePortfolio.mockReturnValue({
        data: null,
        isLoading: true,
        isError: false,
        error: null,
        refetch: jest.fn(),
      });

      renderPortfolioDashboard();

      expect(screen.getByTestId('portfolio-loading')).toBeInTheDocument();
    });

    it('should show error state when portfolio fetch fails', () => {
      mockUsePortfolio.mockReturnValue({
        data: null,
        isLoading: false,
        isError: true,
        error: new Error('Failed to fetch portfolio'),
        refetch: jest.fn(),
      });

      renderPortfolioDashboard();

      expect(screen.getByText(/failed to load portfolio/i)).toBeInTheDocument();
    });

    it('should show initialization prompt when portfolio is not initialized', () => {
      mockUsePortfolio.mockReturnValue({
        data: { ...mockPortfolioData, isInitialized: false },
        isLoading: false,
        isError: false,
        error: null,
        refetch: jest.fn(),
      });

      renderPortfolioDashboard();

      expect(screen.getByText(/initialize your portfolio/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /initialize/i })).toBeInTheDocument();
    });
  });

  describe('Risk Metrics Display', () => {
    it('should display risk metrics correctly', () => {
      renderPortfolioDashboard();

      // Check for Sharpe ratio (1.25)
      expect(screen.getByText(/1\.25/)).toBeInTheDocument();

      // Check for volatility (1.5%)
      expect(screen.getByText(/1\.5%/)).toBeInTheDocument();

      // Check for max drawdown (5%)
      expect(screen.getByText(/5\.0%/)).toBeInTheDocument();
    });

    it('should show loading state for risk metrics', () => {
      mockUseRiskMetrics.mockReturnValue({
        data: null,
        isLoading: true,
        isError: false,
        error: null,
        mutate: jest.fn(),
      });

      renderPortfolioDashboard();

      expect(screen.getByTestId('risk-metrics-loading')).toBeInTheDocument();
    });

    it('should handle missing risk metrics gracefully', () => {
      mockUseRiskMetrics.mockReturnValue({
        data: null,
        isLoading: false,
        isError: false,
        error: null,
        mutate: jest.fn(),
      });

      renderPortfolioDashboard();

      expect(screen.getByText(/calculate risk metrics/i)).toBeInTheDocument();
    });
  });

  describe('Portfolio Value Calculation', () => {
    it('should trigger portfolio value calculation', async () => {
      const mockMutate = jest.fn();
      mockUsePortfolioValue.mockReturnValue({
        data: null,
        isLoading: false,
        isError: false,
        error: null,
        mutate: mockMutate,
      });

      renderPortfolioDashboard();

      const calculateButton = screen.getByRole('button', { name: /calculate portfolio value/i });
      fireEvent.click(calculateButton);

      expect(mockMutate).toHaveBeenCalled();
    });

    it('should show computation in progress state', () => {
      mockUsePortfolioValue.mockReturnValue({
        data: null,
        isLoading: true,
        isError: false,
        error: null,
        mutate: jest.fn(),
      });

      renderPortfolioDashboard();

      expect(screen.getByText(/computing portfolio value/i)).toBeInTheDocument();
      expect(screen.getByTestId('computation-spinner')).toBeInTheDocument();
    });

    it('should handle computation errors', () => {
      mockUsePortfolioValue.mockReturnValue({
        data: null,
        isLoading: false,
        isError: true,
        error: new Error('Computation failed'),
        mutate: jest.fn(),
      });

      renderPortfolioDashboard();

      expect(screen.getByText(/computation failed/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /retry/i })).toBeInTheDocument();
    });
  });

  describe('Privacy Indicators', () => {
    it('should show privacy status indicators', () => {
      renderPortfolioDashboard();

      expect(screen.getByTestId('privacy-indicator')).toBeInTheDocument();
      expect(screen.getByText(/encrypted computation/i)).toBeInTheDocument();
    });

    it('should show encryption status for computations', () => {
      mockUsePortfolioValue.mockReturnValue({
        data: null,
        isLoading: true,
        isError: false,
        error: null,
        mutate: jest.fn(),
      });

      renderPortfolioDashboard();

      expect(screen.getByTestId('encryption-status')).toBeInTheDocument();
    });
  });

  describe('Responsive Design', () => {
    it('should adapt to mobile viewport', () => {
      // Mock mobile viewport
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 375,
      });

      renderPortfolioDashboard();

      const dashboard = screen.getByTestId('portfolio-dashboard');
      expect(dashboard).toHaveClass('mobile-layout');
    });

    it('should show desktop layout on larger screens', () => {
      // Mock desktop viewport
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 1200,
      });

      renderPortfolioDashboard();

      const dashboard = screen.getByTestId('portfolio-dashboard');
      expect(dashboard).toHaveClass('desktop-layout');
    });
  });

  describe('Data Refresh', () => {
    it('should refresh portfolio data when requested', async () => {
      const mockRefetch = jest.fn();
      mockUsePortfolio.mockReturnValue({
        data: mockPortfolioData,
        isLoading: false,
        isError: false,
        error: null,
        refetch: mockRefetch,
      });

      renderPortfolioDashboard();

      const refreshButton = screen.getByRole('button', { name: /refresh/i });
      fireEvent.click(refreshButton);

      expect(mockRefetch).toHaveBeenCalled();
    });

    it('should show last updated timestamp', () => {
      const mockData = {
        ...mockPortfolioData,
        lastUpdated: Date.now() - 300000, // 5 minutes ago
      };

      mockUsePortfolio.mockReturnValue({
        data: mockData,
        isLoading: false,
        isError: false,
        error: null,
        refetch: jest.fn(),
      });

      renderPortfolioDashboard();

      expect(screen.getByText(/5 minutes ago/i)).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA labels', () => {
      renderPortfolioDashboard();

      expect(screen.getByRole('main')).toHaveAttribute('aria-label', 'Portfolio Dashboard');
      expect(screen.getByRole('region', { name: /portfolio overview/i })).toBeInTheDocument();
      expect(screen.getByRole('region', { name: /risk metrics/i })).toBeInTheDocument();
    });

    it('should support keyboard navigation', () => {
      renderPortfolioDashboard();

      const calculateButton = screen.getByRole('button', { name: /calculate portfolio value/i });
      calculateButton.focus();

      expect(calculateButton).toHaveFocus();

      // Test tab navigation
      fireEvent.keyDown(calculateButton, { key: 'Tab' });
      const refreshButton = screen.getByRole('button', { name: /refresh/i });
      expect(refreshButton).toHaveFocus();
    });

    it('should provide screen reader announcements', async () => {
      renderPortfolioDashboard();

      const calculateButton = screen.getByRole('button', { name: /calculate portfolio value/i });
      fireEvent.click(calculateButton);

      await waitFor(() => {
        expect(screen.getByRole('status')).toHaveTextContent(/portfolio calculation started/i);
      });
    });
  });
});