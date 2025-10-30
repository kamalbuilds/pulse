/**
 * Prediction Markets SDK with Arcium MPC Integration
 *
 * Production-ready TypeScript SDK for interacting with the prediction markets program.
 * Handles all encryption, MPC computations, and blockchain interactions.
 *
 * @author Claude Code
 * @version 1.0.0
 */

import * as anchor from "@coral-xyz/anchor";
import { Program, BN } from "@coral-xyz/anchor";
import {
  Connection,
  PublicKey,
  Keypair,
  Transaction,
  SystemProgram,
  LAMPORTS_PER_SOL,
} from "@solana/web3.js";
import {
  awaitComputationFinalization,
  getClusterAccAddress,
  RescueCipher,
  x25519,
  deserializeLE,
  getComputationAccAddress,
  getCompDefAccAddress,
  getMXEAccAddress,
  getMempoolAccAddress,
  getExecutingPoolAccAddress,
  getMXEPublicKey,
} from "@arcium-hq/client";
import { randomBytes } from "crypto";
import { PredictionMarkets } from "../../target/types/prediction_markets";

// ============================================================================
// CONFIGURATION
// ============================================================================

export interface SDKConfig {
  programId: PublicKey;
  mxeAddress: PublicKey;
  clusterOffset: number;
  connection: Connection;
  wallet: anchor.Wallet;
}

export const DEFAULT_DEVNET_CONFIG: Partial<SDKConfig> = {
  programId: new PublicKey("6crfTQztShryQeMRaPG5H5Uf7Zd69wyPRRF4AFBndh9F"),
  mxeAddress: new PublicKey("6sHtDL8cpyNVByxsEHXEkNkii3aivgzNcKC7YUkhSgUz"),
  clusterOffset: 1078779259,
};

// ============================================================================
// TYPES
// ============================================================================

export enum MarketCategory {
  Sports = 0,
  Politics = 1,
  Economics = 2,
  Technology = 3,
  Entertainment = 4,
  Weather = 5,
  Custom = 99,
}

export enum OracleType {
  UmaOptimistic = 0,
  ChainlinkPrice = 1,
  CustomValidated = 2,
  Community = 3,
}

export enum MarketStatus {
  Active = 0,
  Locked = 1,
  Resolved = 2,
  Settled = 3,
  Cancelled = 4,
}

export interface CreateMarketParams {
  marketId: BN;
  title: string;
  description: string;
  imageUrl: string;
  category: MarketCategory;
  votingEndsAt: BN;
  oracleType: OracleType;
  oracleAddress?: PublicKey; // Optional, defaults to authority
}

export interface SubmitVoteParams {
  marketId: BN;
  voteChoice: boolean; // true = YES, false = NO
  stakeAmount: BN;
  predictedProbability?: number; // 0-100
  convictionScore?: number; // 0-65535
}

export interface MarketData {
  marketId: BN;
  creator: PublicKey;
  category: MarketCategory;
  status: MarketStatus;
  createdAt: BN;
  votingEndsAt: BN;
  totalStake: BN;
  yesStake: BN;
  noStake: BN;
  participantCount: number;
  title: string;
  description: string;
  imageUrl: string;
  isResolved: boolean;
  outcome?: boolean;
}

export interface UserPositionData {
  user: PublicKey;
  market: PublicKey;
  stakeAmount: BN;
  timestamp: BN;
  isClaimed: boolean;
  payoutAmount: BN;
}

// ============================================================================
// MAIN SDK CLASS
// ============================================================================

export class PredictionMarketsSDK {
  private program: Program<PredictionMarkets>;
  private config: SDKConfig;
  private provider: anchor.AnchorProvider;
  private mxePublicKey: Uint8Array | null = null;
  private arciumProgram = new PublicKey("BKck65TgoKRokMjQM3datB9oRwJ8rAj2jxPXvHXUvcL6");

  constructor(config: SDKConfig) {
    this.config = config;
    this.provider = new anchor.AnchorProvider(
      config.connection,
      config.wallet,
      {
        commitment: "confirmed",
        preflightCommitment: "confirmed",
      }
    );
    anchor.setProvider(this.provider);

    // @ts-ignore
    this.program = new Program(
      require("./idl/prediction_markets.json"),
      config.programId,
      this.provider
    );
  }

  /**
   * Initialize the SDK by fetching MXE public key
   */
  async initialize(): Promise<void> {
    console.log("🔧 Initializing Prediction Markets SDK...");
    this.mxePublicKey = await this.getMXEPublicKeyWithRetry();
    console.log("✅ SDK initialized successfully");
  }

  // ==========================================================================
  // MARKET MANAGEMENT
  // ==========================================================================

  /**
   * Create a new prediction market
   */
  async createMarket(params: CreateMarketParams): Promise<{
    signature: string;
    marketPDA: PublicKey;
  }> {
    const marketPDA = this.deriveMarketPDA(params.marketId);
    const oracle = params.oracleAddress || this.config.wallet.publicKey;

    console.log(`📝 Creating market: "${params.title}"`);

    const signature = await this.program.methods
      .createMarket(
        params.marketId.toNumber(),
        params.title,
        params.description,
        params.imageUrl,
        params.category,
        params.votingEndsAt.toNumber(),
        params.oracleType
      )
      .accounts({
        creator: this.config.wallet.publicKey,
        predictionMarket: marketPDA,
        oracle,
        systemProgram: SystemProgram.programId,
      })
      .rpc();

    console.log(`✅ Market created: ${signature.slice(0, 20)}...`);

    return { signature, marketPDA };
  }

  /**
   * Fetch market data
   */
  async getMarket(marketId: BN): Promise<MarketData> {
    const marketPDA = this.deriveMarketPDA(marketId);
    const account = await this.program.account.predictionMarket.fetch(marketPDA);

    return {
      marketId: new BN(account.marketId),
      creator: account.creator,
      category: account.category as MarketCategory,
      status: account.status as MarketStatus,
      createdAt: new BN(account.createdAt.toString()),
      votingEndsAt: new BN(account.votingEndsAt.toString()),
      totalStake: new BN(account.totalStake.toString()),
      yesStake: new BN(account.yesStake.toString()),
      noStake: new BN(account.noStake.toString()),
      participantCount: account.participantCount,
      title: account.title,
      description: account.description,
      imageUrl: account.imageUrl,
      isResolved: account.resolvedOutcome !== null,
      outcome: account.resolvedOutcome,
    };
  }

  // ==========================================================================
  // VOTING (MPC OPERATION #1)
  // ==========================================================================

  /**
   * Submit an encrypted vote to a prediction market
   *
   * This method encrypts the vote data and queues an MPC computation
   * that validates and processes the vote without revealing individual choices.
   */
  async submitEncryptedVote(params: SubmitVoteParams): Promise<{
    queueTx: string;
    finalizeTx: string;
    positionPDA: PublicKey;
  }> {
    if (!this.mxePublicKey) {
      throw new Error("SDK not initialized. Call initialize() first.");
    }

    console.log(`🗳️  Submitting encrypted ${params.voteChoice ? 'YES' : 'NO'} vote...`);

    const marketPDA = this.deriveMarketPDA(params.marketId);
    const positionPDA = this.derivePositionPDA(
      params.marketId,
      this.config.wallet.publicKey
    );
    const userProfilePDA = this.deriveUserProfilePDA(this.config.wallet.publicKey);

    // Setup encryption
    const privateKey = x25519.utils.randomPrivateKey();
    const publicKey = x25519.getPublicKey(privateKey);
    const sharedSecret = x25519.getSharedSecret(privateKey, this.mxePublicKey);
    const cipher = new RescueCipher(sharedSecret);
    const nonce = randomBytes(16);

    // Prepare vote data (7 encrypted fields as per VoteData struct)
    // Fields: market_id, vote_choice, stake_amount, predicted_probability,
    //         conviction_score, timestamp, nonce
    const timestamp = BigInt(Date.now());
    const encryptionNonce = deserializeLE(nonce);

    const voteFields = [
      BigInt(params.marketId.toString()), // market_id (u64)
      BigInt(params.voteChoice ? 1 : 0), // vote_choice (u8 as u64)
      BigInt(params.stakeAmount.toString()), // stake_amount (u64)
      BigInt(params.predictedProbability || 50), // predicted_probability (u8 as u64)
      BigInt(params.convictionScore || 50), // conviction_score (u16 as u64)
      timestamp, // timestamp (u64)
      encryptionNonce, // nonce (u128 -> will be split into u64 fields)
    ];

    // Encrypt each field
    const encryptedFields: [number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number][] = [];
    for (let i = 0; i < 7; i++) {
      const encrypted = cipher.encrypt([voteFields[i]], nonce);
      encryptedFields.push(Array.from(encrypted[0]) as any);
    }

    const computationOffset = new BN(randomBytes(8).readBigUInt64LE().toString());

    console.log(`   📦 Queuing vote computation...`);

    // Queue the MPC computation
    const queueTx = await this.program.methods
      .submitEncryptedVote(
        computationOffset.toNumber(),
        encryptedFields as any,
        Array.from(publicKey) as any,
        new BN(encryptionNonce.toString()),
        params.stakeAmount.toNumber()
      )
      .accounts({
        user: this.config.wallet.publicKey,
        predictionMarket: marketPDA,
        userPosition: positionPDA,
        userProfile: userProfilePDA,
        signPdaAccount: this.deriveSignPDA(),
        mxeAccount: this.config.mxeAddress,
        mempoolAccount: getMempoolAccAddress(this.config.programId),
        executingPool: getExecutingPoolAccAddress(this.config.programId),
        computationAccount: getComputationAccAddress(
          this.config.programId,
          computationOffset
        ),
        clusterAccount: getClusterAccAddress(this.config.clusterOffset),
        compDefAccount: getCompDefAccAddress(this.config.programId, 0),
        arciumProgram: this.arciumProgram,
        systemProgram: SystemProgram.programId,
      })
      .rpc({ skipPreflight: true, commitment: "confirmed" });

    console.log(`   ✅ Vote queued: ${queueTx.slice(0, 20)}...`);
    console.log(`   ⏳ Waiting for MPC computation to finalize...`);

    // Wait for computation to complete
    const finalizeTx = await awaitComputationFinalization(
      this.provider,
      computationOffset,
      this.config.programId,
      "confirmed"
    );

    console.log(`   ✅ Vote finalized: ${finalizeTx.slice(0, 20)}...`);

    return { queueTx, finalizeTx, positionPDA };
  }

  // ==========================================================================
  // AGGREGATION (MPC OPERATION #2)
  // ==========================================================================

  /**
   * Aggregate all encrypted votes for a market
   */
  async aggregateVotes(marketId: BN): Promise<{
    queueTx: string;
    finalizeTx: string;
  }> {
    if (!this.mxePublicKey) {
      throw new Error("SDK not initialized");
    }

    console.log(`📊 Aggregating votes for market ${marketId.toString()}...`);

    const marketPDA = this.deriveMarketPDA(marketId);
    const computationOffset = new BN(randomBytes(8).readBigUInt64LE().toString());

    // Setup encryption for parameters
    const privateKey = x25519.utils.randomPrivateKey();
    const publicKey = x25519.getPublicKey(privateKey);
    const sharedSecret = x25519.getSharedSecret(privateKey, this.mxePublicKey);
    const cipher = new RescueCipher(sharedSecret);
    const nonce = randomBytes(16);

    // Encrypt market_id parameter
    const params = [BigInt(marketId.toString())];
    const encryptedParams = cipher.encrypt(params, nonce);

    const queueTx = await this.program.methods
      .aggregateVotes(
        computationOffset.toNumber(),
        Array.from(encryptedParams[0]) as any,
        Array.from(publicKey) as any,
        new BN(deserializeLE(nonce).toString())
      )
      .accounts({
        payer: this.config.wallet.publicKey,
        predictionMarket: marketPDA,
        signPdaAccount: this.deriveSignPDA(),
        mxeAccount: this.config.mxeAddress,
        mempoolAccount: getMempoolAccAddress(this.config.programId),
        executingPool: getExecutingPoolAccAddress(this.config.programId),
        computationAccount: getComputationAccAddress(
          this.config.programId,
          computationOffset
        ),
        clusterAccount: getClusterAccAddress(this.config.clusterOffset),
        compDefAccount: getCompDefAccAddress(this.config.programId, 1),
        arciumProgram: this.arciumProgram,
        systemProgram: SystemProgram.programId,
      })
      .rpc({ skipPreflight: true, commitment: "confirmed" });

    console.log(`   ✅ Aggregation queued: ${queueTx.slice(0, 20)}...`);

    const finalizeTx = await awaitComputationFinalization(
      this.provider,
      computationOffset,
      this.config.programId,
      "confirmed"
    );

    console.log(`   ✅ Aggregation completed: ${finalizeTx.slice(0, 20)}...`);

    return { queueTx, finalizeTx };
  }

  // ==========================================================================
  // PAYOUT CALCULATION (MPC OPERATION #3)
  // ==========================================================================

  /**
   * Calculate payouts for a resolved market
   */
  async calculatePayouts(marketId: BN, userAddress: PublicKey): Promise<{
    queueTx: string;
    finalizeTx: string;
  }> {
    if (!this.mxePublicKey) {
      throw new Error("SDK not initialized");
    }

    console.log(`💰 Calculating payouts for market ${marketId.toString()}...`);

    const marketPDA = this.deriveMarketPDA(marketId);
    const positionPDA = this.derivePositionPDA(marketId, userAddress);
    const computationOffset = new BN(randomBytes(8).readBigUInt64LE().toString());

    // Setup encryption
    const privateKey = x25519.utils.randomPrivateKey();
    const publicKey = x25519.getPublicKey(privateKey);
    const sharedSecret = x25519.getSharedSecret(privateKey, this.mxePublicKey);
    const cipher = new RescueCipher(sharedSecret);
    const nonce = randomBytes(16);

    // Encrypt parameters (market_id, user)
    const userBytes = userAddress.toBytes();
    const userBigInt = BigInt('0x' + Buffer.from(userBytes).toString('hex'));
    const params = [BigInt(marketId.toString()), userBigInt];
    const encryptedParams = cipher.encrypt(params, nonce);

    const queueTx = await this.program.methods
      .calculateUserPayout(
        computationOffset.toNumber(),
        Array.from(encryptedParams[0]) as any,
        Array.from(publicKey) as any,
        new BN(deserializeLE(nonce).toString())
      )
      .accounts({
        payer: this.config.wallet.publicKey,
        predictionMarket: marketPDA,
        userPosition: positionPDA,
        signPdaAccount: this.deriveSignPDA(),
        mxeAccount: this.config.mxeAddress,
        mempoolAccount: getMempoolAccAddress(this.config.programId),
        executingPool: getExecutingPoolAccAddress(this.config.programId),
        computationAccount: getComputationAccAddress(
          this.config.programId,
          computationOffset
        ),
        clusterAccount: getClusterAccAddress(this.config.clusterOffset),
        compDefAccount: getCompDefAccAddress(this.config.programId, 2),
        arciumProgram: this.arciumProgram,
        systemProgram: SystemProgram.programId,
      })
      .rpc({ skipPreflight: true, commitment: "confirmed" });

    console.log(`   ✅ Payout calculation queued: ${queueTx.slice(0, 20)}...`);

    const finalizeTx = await awaitComputationFinalization(
      this.provider,
      computationOffset,
      this.config.programId,
      "confirmed"
    );

    console.log(`   ✅ Payout calculated: ${finalizeTx.slice(0, 20)}...`);

    return { queueTx, finalizeTx };
  }

  // ==========================================================================
  // ODDS CALCULATION (MPC OPERATION #4)
  // ==========================================================================

  /**
   * Calculate market odds based on encrypted vote distribution
   */
  async calculateOdds(marketId: BN): Promise<{
    queueTx: string;
    finalizeTx: string;
  }> {
    if (!this.mxePublicKey) {
      throw new Error("SDK not initialized");
    }

    console.log(`📈 Calculating odds for market ${marketId.toString()}...`);

    const marketPDA = this.deriveMarketPDA(marketId);
    const computationOffset = new BN(randomBytes(8).readBigUInt64LE().toString());

    // Setup encryption
    const privateKey = x25519.utils.randomPrivateKey();
    const publicKey = x25519.getPublicKey(privateKey);
    const sharedSecret = x25519.getSharedSecret(privateKey, this.mxePublicKey);
    const cipher = new RescueCipher(sharedSecret);
    const nonce = randomBytes(16);

    const params = [BigInt(marketId.toString())];
    const encryptedParams = cipher.encrypt(params, nonce);

    const queueTx = await this.program.methods
      .calculateMarketOdds(
        computationOffset.toNumber(),
        Array.from(encryptedParams[0]) as any,
        Array.from(publicKey) as any,
        new BN(deserializeLE(nonce).toString())
      )
      .accounts({
        payer: this.config.wallet.publicKey,
        predictionMarket: marketPDA,
        signPdaAccount: this.deriveSignPDA(),
        mxeAccount: this.config.mxeAddress,
        mempoolAccount: getMempoolAccAddress(this.config.programId),
        executingPool: getExecutingPoolAccAddress(this.config.programId),
        computationAccount: getComputationAccAddress(
          this.config.programId,
          computationOffset
        ),
        clusterAccount: getClusterAccAddress(this.config.clusterOffset),
        compDefAccount: getCompDefAccAddress(this.config.programId, 3),
        arciumProgram: this.arciumProgram,
        systemProgram: SystemProgram.programId,
      })
      .rpc({ skipPreflight: true, commitment: "confirmed" });

    console.log(`   ✅ Odds calculation queued: ${queueTx.slice(0, 20)}...`);

    const finalizeTx = await awaitComputationFinalization(
      this.provider,
      computationOffset,
      this.config.programId,
      "confirmed"
    );

    console.log(`   ✅ Odds calculated: ${finalizeTx.slice(0, 20)}...`);

    return { queueTx, finalizeTx };
  }

  // ==========================================================================
  // MARKET RESOLUTION & CLAIMS
  // ==========================================================================

  /**
   * Resolve a market (oracle only)
   */
  async resolveMarket(
    marketId: BN,
    outcome: boolean
  ): Promise<string> {
    const marketPDA = this.deriveMarketPDA(marketId);

    const signature = await this.program.methods
      .resolveMarket(marketId.toNumber(), outcome)
      .accounts({
        authority: this.config.wallet.publicKey,
        predictionMarket: marketPDA,
      })
      .rpc();

    console.log(`✅ Market resolved: ${signature.slice(0, 20)}...`);
    return signature;
  }

  /**
   * Claim payout for a user position
   */
  async claimPayout(marketId: BN): Promise<string> {
    const marketPDA = this.deriveMarketPDA(marketId);
    const positionPDA = this.derivePositionPDA(
      marketId,
      this.config.wallet.publicKey
    );

    const signature = await this.program.methods
      .claimPayout()
      .accounts({
        user: this.config.wallet.publicKey,
        predictionMarket: marketPDA,
        userPosition: positionPDA,
      })
      .rpc();

    console.log(`💸 Payout claimed: ${signature.slice(0, 20)}...`);
    return signature;
  }

  // ==========================================================================
  // USER PROFILE
  // ==========================================================================

  /**
   * Initialize user profile
   */
  async initializeUserProfile(): Promise<{ signature: string; profilePDA: PublicKey }> {
    const profilePDA = this.deriveUserProfilePDA(this.config.wallet.publicKey);

    const signature = await this.program.methods
      .initializeUserProfile()
      .accounts({
        user: this.config.wallet.publicKey,
        userProfile: profilePDA,
        systemProgram: SystemProgram.programId,
      })
      .rpc();

    console.log(`✅ User profile initialized: ${signature.slice(0, 20)}...`);
    return { signature, profilePDA };
  }

  // ==========================================================================
  // HELPER METHODS
  // ==========================================================================

  deriveMarketPDA(marketId: BN): PublicKey {
    const [pda] = PublicKey.findProgramAddressSync(
      [Buffer.from("market"), marketId.toArrayLike(Buffer, "le", 8)],
      this.config.programId
    );
    return pda;
  }

  derivePositionPDA(marketId: BN, user: PublicKey): PublicKey {
    const [pda] = PublicKey.findProgramAddressSync(
      [
        Buffer.from("position"),
        marketId.toArrayLike(Buffer, "le", 8),
        user.toBuffer(),
      ],
      this.config.programId
    );
    return pda;
  }

  deriveUserProfilePDA(user: PublicKey): PublicKey {
    const [pda] = PublicKey.findProgramAddressSync(
      [Buffer.from("user_profile"), user.toBuffer()],
      this.config.programId
    );
    return pda;
  }

  deriveSignPDA(): PublicKey {
    const [pda] = PublicKey.findProgramAddressSync(
      [Buffer.from("SIGN")],
      this.config.programId
    );
    return pda;
  }

  private async getMXEPublicKeyWithRetry(
    maxRetries: number = 10,
    retryDelayMs: number = 1000
  ): Promise<Uint8Array> {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const mxePubKey = await getMXEPublicKey(
          this.provider,
          this.config.programId
        );
        if (mxePubKey) {
          return mxePubKey;
        }
      } catch (error: any) {
        console.log(`   Attempt ${attempt}/${maxRetries} failed:`, error.message);
      }

      if (attempt < maxRetries) {
        await new Promise((resolve) => setTimeout(resolve, retryDelayMs));
      }
    }

    throw new Error(`Failed to fetch MXE public key after ${maxRetries} attempts`);
  }
}

// ============================================================================
// FACTORY FUNCTIONS
// ============================================================================

/**
 * Create SDK instance for devnet
 */
export async function createDevnetSDK(wallet: anchor.Wallet): Promise<PredictionMarketsSDK> {
  const connection = new Connection(
    "https://devnet.helius-rpc.com/?api-key=50008632-d9e6-4dda-aade-e98446e575a0",
    { commitment: "confirmed", confirmTransactionInitialTimeout: 60000 }
  );

  const sdk = new PredictionMarketsSDK({
    ...DEFAULT_DEVNET_CONFIG,
    connection,
    wallet,
  } as SDKConfig);

  await sdk.initialize();
  return sdk;
}

/**
 * Create SDK instance with custom configuration
 */
export async function createSDK(config: SDKConfig): Promise<PredictionMarketsSDK> {
  const sdk = new PredictionMarketsSDK(config);
  await sdk.initialize();
  return sdk;
}
