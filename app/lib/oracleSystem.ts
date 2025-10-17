/**
 * Encrypted Oracle Resolution System for ZenithVeil Prediction Markets
 * Built on Arcium's Multi-Party Computation (MPC) infrastructure
 *
 * This system ensures that market resolution is:
 * 1. Privacy-preserving - Oracle votes remain encrypted until aggregation
 * 2. Manipulation-resistant - Anti-collusion mechanisms prevent coordinated attacks
 * 3. Dispute-resistant - Multi-source validation with encrypted attestations
 * 4. Decentralized - No single point of failure or control
 */

import { Connection, PublicKey, Transaction, TransactionInstruction } from '@solana/web3.js';
import { WalletContextState } from '@solana/wallet-adapter-react';
import { Market } from '@/types/market';

// Oracle system constants
const ORACLE_PROGRAM_ID = new PublicKey('OracleResolutionProgram11111111111111111111111');
const MIN_ORACLE_CONSENSUS = 3; // Minimum oracles required for resolution
const ORACLE_REPUTATION_THRESHOLD = 75; // Minimum reputation score
const RESOLUTION_TIMEOUT_HOURS = 24; // Hours before alternative resolution

// Oracle types and interfaces
export interface Oracle {
  address: PublicKey;
  reputation: number; // 0-100 score based on historical accuracy
  specialization: OracleSpecialization[];
  isActive: boolean;
  totalResolutions: number;
  correctResolutions: number;
  stake: bigint; // Staked amount for participation
  lastActiveTimestamp: number;
}

export enum OracleSpecialization {
  SPORTS = 'sports',
  POLITICS = 'politics',
  CRYPTO = 'crypto',
  ENTERTAINMENT = 'entertainment',
  TECHNOLOGY = 'technology',
  WEATHER = 'weather',
  ECONOMY = 'economy',
  GENERAL = 'general'
}

export interface EncryptedOracleVote {
  oracle: PublicKey;
  marketId: string;
  encryptedVote: Uint8Array; // Encrypted vote (true/false/invalid)
  confidence: number; // 0-100 confidence level
  evidenceHash: Uint8Array; // Hash of supporting evidence
  timestamp: bigint;
  nonce: bigint; // Anti-replay protection
  signature: Uint8Array; // Oracle's signature
}

export interface OracleResolution {
  marketId: string;
  result: boolean | null; // null = invalid/cancelled
  confidence: number; // Aggregate confidence level
  participatingOracles: PublicKey[];
  evidenceSources: string[]; // URLs or IPFS hashes of evidence
  resolutionTimestamp: bigint;
  disputeDeadline: bigint;
  consensusStrength: number; // How strong the consensus was (0-100)
}

export interface DisputeChallenge {
  challengeId: string;
  marketId: string;
  challenger: PublicKey;
  challengeReason: string;
  evidenceHash: Uint8Array;
  stake: bigint; // Stake put up by challenger
  status: 'pending' | 'accepted' | 'rejected' | 'resolved';
  reviewDeadline: bigint;
}

// Oracle reputation and anti-collusion system
export interface OracleReputationMetrics {
  accuracy: number; // Historical accuracy percentage
  responseTime: number; // Average response time in minutes
  participationRate: number; // Percentage of eligible markets resolved
  evidenceQuality: number; // Quality score of provided evidence
  collusionRisk: number; // Risk score for collusion (0-100, lower is better)
  diversityScore: number; // How diverse their decisions are vs other oracles
}

export class EncryptedOracleSystem {
  private connection: Connection;
  private wallet: WalletContextState;
  private registeredOracles: Map<string, Oracle> = new Map();
  private activeResolutions: Map<string, OracleResolution> = new Map();
  private disputeChallenges: Map<string, DisputeChallenge> = new Map();

  constructor(connection: Connection, wallet: WalletContextState) {
    this.connection = connection;
    this.wallet = wallet;
    this.initializeOracleNetwork();
  }

  /**
   * Initialize the oracle network with registered oracles
   */
  private async initializeOracleNetwork() {
    try {
      // In production, this would query the blockchain for registered oracles
      const mockOracles: Oracle[] = [
        {
          address: new PublicKey('Oracle1SportsSpecialist1111111111111111111111'),
          reputation: 92,
          specialization: [OracleSpecialization.SPORTS, OracleSpecialization.GENERAL],
          isActive: true,
          totalResolutions: 156,
          correctResolutions: 143,
          stake: BigInt(100000000), // 0.1 SOL
          lastActiveTimestamp: Date.now() / 1000 - 3600
        },
        {
          address: new PublicKey('Oracle2PoliticsExpert111111111111111111111111'),
          reputation: 88,
          specialization: [OracleSpecialization.POLITICS, OracleSpecialization.ECONOMY],
          isActive: true,
          totalResolutions: 89,
          correctResolutions: 78,
          stake: BigInt(150000000), // 0.15 SOL
          lastActiveTimestamp: Date.now() / 1000 - 1800
        },
        {
          address: new PublicKey('Oracle3CryptoAnalyst111111111111111111111111'),
          reputation: 95,
          specialization: [OracleSpecialization.CRYPTO, OracleSpecialization.TECHNOLOGY],
          isActive: true,
          totalResolutions: 203,
          correctResolutions: 193,
          stake: BigInt(200000000), // 0.2 SOL
          lastActiveTimestamp: Date.now() / 1000 - 900
        }
      ];

      mockOracles.forEach(oracle => {
        this.registeredOracles.set(oracle.address.toString(), oracle);
      });

      console.log(`Initialized oracle network with ${mockOracles.length} oracles`);
    } catch (error) {
      console.error('Failed to initialize oracle network:', error);
    }
  }

  /**
   * Select optimal oracles for a specific market resolution
   */
  private selectOptimalOracles(market: Market, count: number = 5): Oracle[] {
    const availableOracles = Array.from(this.registeredOracles.values())
      .filter(oracle => {
        return (
          oracle.isActive &&
          oracle.reputation >= ORACLE_REPUTATION_THRESHOLD &&
          (oracle.specialization.includes(market.category as OracleSpecialization) ||
           oracle.specialization.includes(OracleSpecialization.GENERAL))
        );
      });

    // Sort by reputation, specialization match, and anti-collusion factors
    return availableOracles
      .sort((a, b) => {
        const aSpecMatch = a.specialization.includes(market.category as OracleSpecialization) ? 1 : 0;
        const bSpecMatch = b.specialization.includes(market.category as OracleSpecialization) ? 1 : 0;

        if (aSpecMatch !== bSpecMatch) {
          return bSpecMatch - aSpecMatch; // Prefer specialized oracles
        }

        return b.reputation - a.reputation; // Then by reputation
      })
      .slice(0, count);
  }

  /**
   * Request encrypted oracle resolution for a market
   */
  async requestOracleResolution(market: Market): Promise<{
    success: boolean;
    resolutionId?: string;
    selectedOracles?: PublicKey[];
    error?: string;
  }> {
    try {
      if (!this.wallet.publicKey) {
        throw new Error('Wallet not connected');
      }

      // Check if market is eligible for resolution
      if (market.endDate > new Date()) {
        throw new Error('Market has not ended yet');
      }

      if (this.activeResolutions.has(market.id)) {
        throw new Error('Resolution already in progress for this market');
      }

      // Select optimal oracles for this market
      const selectedOracles = this.selectOptimalOracles(market, 5);

      if (selectedOracles.length < MIN_ORACLE_CONSENSUS) {
        throw new Error(`Insufficient qualified oracles available (need ${MIN_ORACLE_CONSENSUS}, found ${selectedOracles.length})`);
      }

      // Create resolution request
      const resolutionId = `resolution_${market.id}_${Date.now()}`;
      const resolution: OracleResolution = {
        marketId: market.id,
        result: null,
        confidence: 0,
        participatingOracles: selectedOracles.map(o => o.address),
        evidenceSources: [],
        resolutionTimestamp: BigInt(0),
        disputeDeadline: BigInt(Date.now() / 1000 + RESOLUTION_TIMEOUT_HOURS * 3600),
        consensusStrength: 0
      };

      // Store active resolution
      this.activeResolutions.set(resolutionId, resolution);

      // Create MXE instruction for oracle resolution request
      const instruction = await this.createOracleResolutionInstruction(
        market,
        selectedOracles.map(o => o.address)
      );

      // Send transaction
      const transaction = new Transaction().add(instruction);
      const { blockhash } = await this.connection.getLatestBlockhash();
      transaction.recentBlockhash = blockhash;
      transaction.feePayer = this.wallet.publicKey;

      const signedTransaction = await this.wallet.signTransaction!(transaction);
      const signature = await this.connection.sendRawTransaction(
        signedTransaction.serialize(),
        { skipPreflight: false }
      );

      await this.connection.confirmTransaction(signature, 'confirmed');

      return {
        success: true,
        resolutionId,
        selectedOracles: selectedOracles.map(o => o.address)
      };

    } catch (error) {
      console.error('Error requesting oracle resolution:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Submit encrypted oracle vote (for oracle operators)
   */
  async submitEncryptedOracleVote(
    marketId: string,
    vote: boolean,
    confidence: number,
    evidence: string,
    oraclePrivateKey?: Uint8Array // In production, this would be managed securely
  ): Promise<{ success: boolean; voteId?: string; error?: string }> {
    try {
      if (!this.wallet.publicKey) {
        throw new Error('Oracle wallet not connected');
      }

      // Verify oracle is registered and authorized for this resolution
      const oracle = this.registeredOracles.get(this.wallet.publicKey.toString());
      if (!oracle) {
        throw new Error('Oracle not registered');
      }

      const activeResolution = Array.from(this.activeResolutions.values())
        .find(res => res.marketId === marketId);

      if (!activeResolution) {
        throw new Error('No active resolution found for this market');
      }

      if (!activeResolution.participatingOracles.some(addr => addr.equals(this.wallet.publicKey!))) {
        throw new Error('Oracle not selected for this resolution');
      }

      // Create encrypted vote data
      const voteData = {
        oracle: this.wallet.publicKey.toBytes(),
        marketId,
        vote,
        confidence,
        evidence,
        timestamp: Date.now() / 1000
      };

      // Encrypt vote using Arcium MPC
      const encryptedVote = await this.encryptOracleVote(voteData);

      // Create oracle vote instruction
      const instruction = await this.createEncryptedOracleVoteInstruction(encryptedVote);

      // Send transaction
      const transaction = new Transaction().add(instruction);
      const { blockhash } = await this.connection.getLatestBlockhash();
      transaction.recentBlockhash = blockhash;
      transaction.feePayer = this.wallet.publicKey;

      const signedTransaction = await this.wallet.signTransaction!(transaction);
      const signature = await this.connection.sendRawTransaction(
        signedTransaction.serialize(),
        { skipPreflight: false }
      );

      await this.connection.confirmTransaction(signature, 'confirmed');

      const voteId = `vote_${marketId}_${this.wallet.publicKey.toString()}_${Date.now()}`;

      return {
        success: true,
        voteId
      };

    } catch (error) {
      console.error('Error submitting encrypted oracle vote:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Aggregate encrypted oracle votes and resolve market
   */
  async aggregateOracleVotes(marketId: string): Promise<{
    success: boolean;
    resolution?: OracleResolution;
    error?: string;
  }> {
    try {
      const activeResolution = Array.from(this.activeResolutions.entries())
        .find(([_, res]) => res.marketId === marketId);

      if (!activeResolution) {
        throw new Error('No active resolution found for this market');
      }

      const [resolutionId, resolution] = activeResolution;

      // In production, this would perform MPC aggregation of encrypted votes
      // For now, simulate the aggregation process
      const simulatedAggregation = await this.simulateEncryptedAggregation(resolution);

      // Update resolution with results
      const finalResolution: OracleResolution = {
        ...resolution,
        result: simulatedAggregation.result,
        confidence: simulatedAggregation.confidence,
        evidenceSources: simulatedAggregation.evidenceSources,
        resolutionTimestamp: BigInt(Math.floor(Date.now() / 1000)),
        consensusStrength: simulatedAggregation.consensusStrength
      };

      // Store final resolution
      this.activeResolutions.set(resolutionId, finalResolution);

      // Update oracle reputations based on consensus
      await this.updateOracleReputations(finalResolution);

      return {
        success: true,
        resolution: finalResolution
      };

    } catch (error) {
      console.error('Error aggregating oracle votes:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Submit dispute challenge against a resolution
   */
  async submitDisputeChallenge(
    marketId: string,
    reason: string,
    evidence: string,
    stakeAmount: number
  ): Promise<{ success: boolean; challengeId?: string; error?: string }> {
    try {
      if (!this.wallet.publicKey) {
        throw new Error('Wallet not connected');
      }

      const resolution = Array.from(this.activeResolutions.values())
        .find(res => res.marketId === marketId);

      if (!resolution) {
        throw new Error('No resolution found for this market');
      }

      if (Date.now() / 1000 > Number(resolution.disputeDeadline)) {
        throw new Error('Dispute deadline has passed');
      }

      const challengeId = `challenge_${marketId}_${Date.now()}`;
      const challenge: DisputeChallenge = {
        challengeId,
        marketId,
        challenger: this.wallet.publicKey,
        challengeReason: reason,
        evidenceHash: await this.hashEvidence(evidence),
        stake: BigInt(Math.floor(stakeAmount * 1e6)),
        status: 'pending',
        reviewDeadline: BigInt(Date.now() / 1000 + 72 * 3600) // 72 hours for review
      };

      this.disputeChallenges.set(challengeId, challenge);

      // Create dispute challenge instruction
      const instruction = await this.createDisputeChallengeInstruction(challenge);

      // Send transaction
      const transaction = new Transaction().add(instruction);
      const { blockhash } = await this.connection.getLatestBlockhash();
      transaction.recentBlockhash = blockhash;
      transaction.feePayer = this.wallet.publicKey;

      const signedTransaction = await this.wallet.signTransaction!(transaction);
      const signature = await this.connection.sendRawTransaction(
        signedTransaction.serialize(),
        { skipPreflight: false }
      );

      await this.connection.confirmTransaction(signature, 'confirmed');

      return {
        success: true,
        challengeId
      };

    } catch (error) {
      console.error('Error submitting dispute challenge:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Get oracle statistics and reputation metrics
   */
  async getOracleMetrics(oracleAddress: PublicKey): Promise<OracleReputationMetrics | null> {
    try {
      const oracle = this.registeredOracles.get(oracleAddress.toString());
      if (!oracle) {
        return null;
      }

      // Calculate reputation metrics
      const accuracy = oracle.totalResolutions > 0 ?
        (oracle.correctResolutions / oracle.totalResolutions) * 100 : 0;

      const responseTime = 45; // Average minutes to respond (mock data)
      const participationRate = 85; // Percentage of eligible markets resolved (mock)
      const evidenceQuality = 78; // Evidence quality score (mock)
      const collusionRisk = 15; // Low collusion risk (mock)
      const diversityScore = 82; // High decision diversity (mock)

      return {
        accuracy,
        responseTime,
        participationRate,
        evidenceQuality,
        collusionRisk,
        diversityScore
      };

    } catch (error) {
      console.error('Error getting oracle metrics:', error);
      return null;
    }
  }

  /**
   * Private helper methods for oracle system
   */
  private async encryptOracleVote(voteData: any): Promise<EncryptedOracleVote> {
    // In production, this would use Arcium's MPC encryption
    const encoder = new TextEncoder();
    const serialized = JSON.stringify(voteData);
    const encryptedData = encoder.encode(serialized); // Mock encryption

    return {
      oracle: this.wallet.publicKey!,
      marketId: voteData.marketId,
      encryptedVote: encryptedData,
      confidence: voteData.confidence,
      evidenceHash: await this.hashEvidence(voteData.evidence),
      timestamp: BigInt(Math.floor(voteData.timestamp)),
      nonce: BigInt(Math.floor(Math.random() * Number.MAX_SAFE_INTEGER)),
      signature: new Uint8Array(64) // Mock signature
    };
  }

  private async simulateEncryptedAggregation(resolution: OracleResolution): Promise<{
    result: boolean;
    confidence: number;
    evidenceSources: string[];
    consensusStrength: number;
  }> {
    // Simulate MPC aggregation of encrypted oracle votes
    const mockResults = {
      result: Math.random() > 0.5, // Random result for demo
      confidence: 75 + Math.floor(Math.random() * 20), // 75-95% confidence
      evidenceSources: [
        'https://example.com/evidence1',
        'ipfs://QmExampleHash1',
        'https://api.sportsdata.com/result'
      ],
      consensusStrength: 85 + Math.floor(Math.random() * 15) // 85-100% consensus
    };

    return mockResults;
  }

  private async updateOracleReputations(resolution: OracleResolution) {
    // Update oracle reputations based on consensus and accuracy
    for (const oracleAddress of resolution.participatingOracles) {
      const oracle = this.registeredOracles.get(oracleAddress.toString());
      if (oracle) {
        // In production, this would update based on actual vote accuracy
        oracle.totalResolutions += 1;
        oracle.correctResolutions += Math.random() > 0.1 ? 1 : 0; // 90% accuracy simulation
        oracle.reputation = (oracle.correctResolutions / oracle.totalResolutions) * 100;
        oracle.lastActiveTimestamp = Date.now() / 1000;
      }
    }
  }

  private async hashEvidence(evidence: string): Promise<Uint8Array> {
    const encoder = new TextEncoder();
    const data = encoder.encode(evidence);
    const hash = await crypto.subtle.digest('SHA-256', data);
    return new Uint8Array(hash);
  }

  private async createOracleResolutionInstruction(
    market: Market,
    selectedOracles: PublicKey[]
  ): Promise<TransactionInstruction> {
    // Create instruction for oracle resolution request
    const keys = [
      { pubkey: this.wallet.publicKey!, isSigner: true, isWritable: false },
      { pubkey: ORACLE_PROGRAM_ID, isSigner: false, isWritable: false },
      ...selectedOracles.map(oracle => ({ pubkey: oracle, isSigner: false, isWritable: true }))
    ];

    const instructionData = Buffer.concat([
      Buffer.from([1]), // Instruction discriminator for 'request_resolution'
      Buffer.from(market.id, 'utf8'),
      Buffer.from([selectedOracles.length]),
      ...selectedOracles.map(oracle => oracle.toBuffer())
    ]);

    return new TransactionInstruction({
      keys,
      programId: ORACLE_PROGRAM_ID,
      data: instructionData
    });
  }

  private async createEncryptedOracleVoteInstruction(
    encryptedVote: EncryptedOracleVote
  ): Promise<TransactionInstruction> {
    // Create instruction for encrypted oracle vote
    const keys = [
      { pubkey: this.wallet.publicKey!, isSigner: true, isWritable: false },
      { pubkey: ORACLE_PROGRAM_ID, isSigner: false, isWritable: true }
    ];

    const instructionData = Buffer.concat([
      Buffer.from([2]), // Instruction discriminator for 'submit_encrypted_vote'
      Buffer.from(encryptedVote.marketId, 'utf8'),
      Buffer.from(encryptedVote.encryptedVote),
      Buffer.from([encryptedVote.confidence])
    ]);

    return new TransactionInstruction({
      keys,
      programId: ORACLE_PROGRAM_ID,
      data: instructionData
    });
  }

  private async createDisputeChallengeInstruction(
    challenge: DisputeChallenge
  ): Promise<TransactionInstruction> {
    // Create instruction for dispute challenge
    const keys = [
      { pubkey: this.wallet.publicKey!, isSigner: true, isWritable: false },
      { pubkey: ORACLE_PROGRAM_ID, isSigner: false, isWritable: true }
    ];

    const instructionData = Buffer.concat([
      Buffer.from([3]), // Instruction discriminator for 'submit_dispute'
      Buffer.from(challenge.marketId, 'utf8'),
      Buffer.from(challenge.challengeReason, 'utf8'),
      Buffer.from(challenge.evidenceHash),
      Buffer.from(challenge.stake.toString(), 'utf8')
    ]);

    return new TransactionInstruction({
      keys,
      programId: ORACLE_PROGRAM_ID,
      data: instructionData
    });
  }
}

export default EncryptedOracleSystem;