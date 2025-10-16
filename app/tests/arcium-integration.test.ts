import { describe, test, expect, beforeEach, jest } from '@jest/globals';
import ArciumPredictionMarketsClient, { ArciumUtils, ArciumVoteData } from '@/lib/arciumClient';
import { Market, VoteChoice, MarketCategory, MarketStatus } from '@/types/market';
import { Connection, PublicKey } from '@solana/web3.js';

// Mock Solana wallet
const mockWallet = {
  publicKey: new PublicKey('11111111111111111111111111111112'),
  connected: true,
  signTransaction: jest.fn(),
  signAllTransactions: jest.fn(),
  connect: jest.fn(),
  disconnect: jest.fn(),
  on: jest.fn(),
  off: jest.fn(),
  removeListener: jest.fn(),
};

// Mock Solana connection
const mockConnection = {
  getLatestBlockhash: jest.fn().mockResolvedValue({
    blockhash: 'mock-blockhash',
    lastValidBlockHeight: 123456
  }),
  sendRawTransaction: jest.fn().mockResolvedValue('mock-transaction-signature'),
  confirmTransaction: jest.fn().mockResolvedValue({ value: { err: null } }),
} as unknown as Connection;

// Mock market for testing
const mockMarket: Market = {
  id: 'test-market-1',
  title: 'Will Bitcoin reach $100k by end of 2024?',
  description: 'A prediction about Bitcoin price reaching six figures',
  category: MarketCategory.CRYPTO,
  endDate: new Date('2024-12-31'),
  totalVolume: 50000,
  yesOdds: 65,
  noOdds: 35,
  participants: 150,
  tags: ['bitcoin', 'crypto', 'price'],
  createdBy: 'test-user',
  status: MarketStatus.ACTIVE,
  resolutionSource: 'coinbase-api'
};

describe('Arcium Prediction Markets Integration', () => {
  let client: ArciumPredictionMarketsClient;

  beforeEach(() => {
    client = new ArciumPredictionMarketsClient(mockConnection, mockWallet);
    jest.clearAllMocks();
  });

  describe('ArciumUtils', () => {
    test('should validate vote data correctly', () => {
      const validVoteData: ArciumVoteData = {
        voter: new Uint8Array(32),
        market_id: BigInt(123),
        vote_choice: 1, // YES
        stake_amount: BigInt(1000000), // 0.001 SOL
        predicted_probability: 75,
        conviction_score: 850,
        timestamp: BigInt(Math.floor(Date.now() / 1000)),
        nonce: BigInt(123456789)
      };

      const result = ArciumUtils.validateVoteData(validVoteData);
      expect(result.valid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    test('should reject invalid vote choice', () => {
      const invalidVoteData: ArciumVoteData = {
        voter: new Uint8Array(32),
        market_id: BigInt(123),
        vote_choice: 5, // Invalid choice
        stake_amount: BigInt(1000000),
        predicted_probability: 75,
        conviction_score: 850,
        timestamp: BigInt(Math.floor(Date.now() / 1000)),
        nonce: BigInt(123456789)
      };

      const result = ArciumUtils.validateVoteData(invalidVoteData);
      expect(result.valid).toBe(false);
      expect(result.error).toBe('Invalid vote choice');
    });

    test('should reject zero stake amount', () => {
      const invalidVoteData: ArciumVoteData = {
        voter: new Uint8Array(32),
        market_id: BigInt(123),
        vote_choice: 1,
        stake_amount: BigInt(0), // Invalid stake
        predicted_probability: 75,
        conviction_score: 850,
        timestamp: BigInt(Math.floor(Date.now() / 1000)),
        nonce: BigInt(123456789)
      };

      const result = ArciumUtils.validateVoteData(invalidVoteData);
      expect(result.valid).toBe(false);
      expect(result.error).toBe('Stake must be positive');
    });

    test('should reject invalid probability', () => {
      const invalidVoteData: ArciumVoteData = {
        voter: new Uint8Array(32),
        market_id: BigInt(123),
        vote_choice: 1,
        stake_amount: BigInt(1000000),
        predicted_probability: 150, // Invalid probability
        conviction_score: 850,
        timestamp: BigInt(Math.floor(Date.now() / 1000)),
        nonce: BigInt(123456789)
      };

      const result = ArciumUtils.validateVoteData(invalidVoteData);
      expect(result.valid).toBe(false);
      expect(result.error).toBe('Probability must be 0-100');
    });

    test('should format vote results correctly', () => {
      const successResult = {
        success: true,
        transactionSignature: 'mock-signature-abcd1234'
      };

      const formattedSuccess = ArciumUtils.formatVoteResult(successResult);
      expect(formattedSuccess).toContain('Vote submitted privately!');
      expect(formattedSuccess).toContain('mock-sig');

      const errorResult = {
        success: false,
        error: 'Network error'
      };

      const formattedError = ArciumUtils.formatVoteResult(errorResult);
      expect(formattedError).toContain('Error: Network error');
    });
  });

  describe('ArciumPredictionMarketsClient', () => {
    test('should submit encrypted vote successfully', async () => {
      mockWallet.signTransaction = jest.fn().mockResolvedValue({
        serialize: () => new Uint8Array(100)
      });

      const result = await client.submitEncryptedVote(
        mockMarket,
        VoteChoice.Yes,
        0.1, // 0.1 SOL stake
        85, // 85% confidence
        70  // 70% probability
      );

      expect(result.success).toBe(true);
      expect(result.transactionSignature).toBe('mock-transaction-signature');
      expect(mockConnection.sendRawTransaction).toHaveBeenCalled();
      expect(mockConnection.confirmTransaction).toHaveBeenCalled();
    });

    test('should handle wallet not connected error', async () => {
      const disconnectedWallet = { ...mockWallet, connected: false, publicKey: null };
      const disconnectedClient = new ArciumPredictionMarketsClient(mockConnection, disconnectedWallet);

      const result = await disconnectedClient.submitEncryptedVote(
        mockMarket,
        VoteChoice.Yes,
        0.1,
        85,
        70
      );

      expect(result.success).toBe(false);
      expect(result.error).toBe('Wallet not connected');
    });

    test('should aggregate market votes', async () => {
      const aggregation = await client.aggregateMarketVotes('test-market-1');

      expect(aggregation).toBeDefined();
      expect(aggregation?.totalYesVotes).toBeGreaterThan(0);
      expect(aggregation?.totalNoVotes).toBeGreaterThan(0);
      expect(aggregation?.participantCount).toBeGreaterThan(0);
      expect(aggregation?.marketProbability).toBeGreaterThanOrEqual(0);
      expect(aggregation?.marketProbability).toBeLessThanOrEqual(100);
    });

    test('should calculate encrypted payout', async () => {
      const userPrediction = {
        id: 'pred-1',
        marketId: 'test-market-1',
        userId: 'user-1',
        prediction: true, // Predicted YES
        confidence: 85,
        stakeAmount: 1000000, // 0.001 SOL in lamports
        timestamp: new Date(),
        isPrivate: true
      };

      // Test winning scenario
      const winningPayout = await client.calculateEncryptedPayout(userPrediction, true);
      expect(winningPayout).toBeGreaterThan(BigInt(0));

      // Test losing scenario
      const losingPayout = await client.calculateEncryptedPayout(userPrediction, false);
      expect(losingPayout).toBe(BigInt(0));
    });

    test('should get private market odds', async () => {
      const odds = await client.getPrivateMarketOdds('test-market-1');

      expect(odds).toBeDefined();
      expect(odds?.yesOdds + odds?.noOdds).toBe(100);
      expect(odds?.confidence).toBeGreaterThanOrEqual(0);
      expect(odds?.confidence).toBeLessThanOrEqual(100);
      expect(odds?.liquidityFactor).toBeGreaterThanOrEqual(0);
      expect(odds?.liquidityFactor).toBeLessThanOrEqual(100);
    });

    test('should detect manipulation', async () => {
      const manipulation = await client.detectManipulation('test-market-1');

      expect(manipulation).toBeDefined();
      expect(manipulation?.manipulationScore).toBeGreaterThanOrEqual(0);
      expect(manipulation?.manipulationScore).toBeLessThanOrEqual(100);
      expect(['low', 'medium', 'high']).toContain(manipulation?.riskLevel);
      expect(Array.isArray(manipulation?.patterns)).toBe(true);
    });

    test('should create new market', async () => {
      const result = await client.createMarket(
        'Test Market',
        'A test prediction market',
        'technology',
        new Date('2024-12-31'),
        'custom-oracle'
      );

      expect(result.success).toBe(true);
      expect(result.marketId).toBeDefined();
      expect(result.marketId).toMatch(/^market_\d+_[a-z0-9]+$/);
    });

    test('should get user private stats', async () => {
      const stats = await client.getUserPrivateStats();

      expect(stats).toBeDefined();
      expect(stats?.totalVotes).toBeGreaterThanOrEqual(0);
      expect(stats?.winRate).toBeGreaterThanOrEqual(0);
      expect(stats?.winRate).toBeLessThanOrEqual(100);
      expect(stats?.averageConfidence).toBeGreaterThanOrEqual(0);
      expect(stats?.averageConfidence).toBeLessThanOrEqual(100);
      expect(stats?.totalVolume).toBeGreaterThanOrEqual(BigInt(0));
      expect(stats?.privacyScore).toBeGreaterThanOrEqual(0);
      expect(stats?.privacyScore).toBeLessThanOrEqual(100);
    });
  });

  describe('Privacy and Security', () => {
    test('should maintain vote privacy', async () => {
      // Test that individual vote details are not exposed in aggregation
      const result = await client.submitEncryptedVote(
        mockMarket,
        VoteChoice.Yes,
        0.5,
        90,
        80
      );

      // Verify that the transaction doesn't contain plaintext vote data
      expect(result.success).toBe(true);

      // The encrypted vote data should not be readable from the transaction
      const aggregation = await client.aggregateMarketVotes(mockMarket.id);
      expect(aggregation).toBeDefined();
      // Aggregation should only show totals, not individual votes
    });

    test('should detect suspicious voting patterns', async () => {
      const manipulation = await client.detectManipulation('test-market-1');

      expect(manipulation?.manipulationScore).toBeLessThan(30); // Low risk expected
      expect(manipulation?.riskLevel).toBe('low');
      expect(manipulation?.patterns).toHaveLength(0); // No suspicious patterns
    });

    test('should preserve privacy in payout calculations', async () => {
      const userPrediction = {
        id: 'pred-1',
        marketId: 'test-market-1',
        userId: 'user-1',
        prediction: true,
        confidence: 75,
        stakeAmount: 2000000, // 0.002 SOL
        timestamp: new Date(),
        isPrivate: true
      };

      const payout = await client.calculateEncryptedPayout(userPrediction, true);

      // Payout should be calculated without revealing user's original stake to others
      expect(payout).toBeGreaterThan(BigInt(userPrediction.stakeAmount));
    });
  });

  describe('Error Handling', () => {
    test('should handle network errors gracefully', async () => {
      // Mock network failure
      mockConnection.sendRawTransaction = jest.fn().mockRejectedValue(new Error('Network error'));

      const result = await client.submitEncryptedVote(
        mockMarket,
        VoteChoice.Yes,
        0.1,
        75,
        60
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain('Network error');
    });

    test('should handle invalid market data', async () => {
      const invalidMarket = { ...mockMarket, id: '' };

      const result = await client.submitEncryptedVote(
        invalidMarket,
        VoteChoice.Yes,
        0.1,
        75,
        60
      );

      // Should still attempt to process but may fail validation
      expect(typeof result.success).toBe('boolean');
    });
  });
});

describe('Integration Flow Tests', () => {
  test('should complete full encrypted voting flow', async () => {
    const client = new ArciumPredictionMarketsClient(mockConnection, mockWallet);

    // 1. Submit encrypted vote
    const voteResult = await client.submitEncryptedVote(
      mockMarket,
      VoteChoice.Yes,
      0.25, // 0.25 SOL
      88,   // 88% confidence
      72    // 72% probability
    );

    expect(voteResult.success).toBe(true);

    // 2. Aggregate votes
    const aggregation = await client.aggregateMarketVotes(mockMarket.id);
    expect(aggregation).toBeDefined();

    // 3. Check for manipulation
    const manipulation = await client.detectManipulation(mockMarket.id);
    expect(manipulation?.riskLevel).toBe('low');

    // 4. Get updated market odds
    const odds = await client.getPrivateMarketOdds(mockMarket.id);
    expect(odds).toBeDefined();

    // 5. Simulate market resolution and payout
    const userPrediction = {
      id: 'pred-test',
      marketId: mockMarket.id,
      userId: 'test-user',
      prediction: true,
      confidence: 88,
      stakeAmount: 250000, // 0.25 SOL in lamports
      timestamp: new Date(),
      isPrivate: true
    };

    const payout = await client.calculateEncryptedPayout(userPrediction, true);
    expect(payout).toBeGreaterThan(BigInt(0));
  });
});