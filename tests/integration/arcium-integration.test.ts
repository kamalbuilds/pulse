import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { PublicKey, Keypair } from "@solana/web3.js";
import { Zenithveil } from "../../target/types/zenithveil";
import { expect } from "chai";
import {
  awaitComputationFinalization,
  getArciumEnv,
  RescueCipher,
  x25519,
  deserializeLE,
  getComputationAccAddress,
  getCompDefAccAddress,
  getMXEAccAddress,
  getMempoolAccAddress,
  getExecutingPoolAccAddress,
} from "@arcium-hq/client";
import { randomBytes } from "crypto";

describe("Arcium-Solana Integration Tests", () => {
  // Configure the client to use the local cluster
  anchor.setProvider(anchor.AnchorProvider.env());
  const program = anchor.workspace.Zenithveil as Program<Zenithveil>;
  const provider = anchor.getProvider() as anchor.AnchorProvider;

  let testUser: Keypair;
  let portfolioPDA: PublicKey;
  let performancePDA: PublicKey;
  const arciumEnv = getArciumEnv();

  beforeEach(async () => {
    // Generate a new test user for each test to ensure isolation
    testUser = Keypair.generate();

    // Airdrop SOL to test user
    await provider.connection.requestAirdrop(testUser.publicKey, 10 * anchor.web3.LAMPORTS_PER_SOL);
    await provider.connection.confirmTransaction(
      await provider.connection.requestAirdrop(testUser.publicKey, 10 * anchor.web3.LAMPORTS_PER_SOL)
    );

    // Derive PDAs
    [portfolioPDA] = PublicKey.findProgramAddressSync(
      [Buffer.from("portfolio"), testUser.publicKey.toBuffer()],
      program.programId
    );

    [performancePDA] = PublicKey.findProgramAddressSync(
      [Buffer.from("performance"), testUser.publicKey.toBuffer()],
      program.programId
    );
  });

  describe("Portfolio Value Computation Integration", () => {
    it("should successfully queue and execute portfolio value computation", async () => {
      // Initialize portfolio account first
      await program.methods
        .initializePortfolio()
        .accounts({
          user: testUser.publicKey,
          portfolioAccount: portfolioPDA,
          systemProgram: anchor.web3.SystemProgram.programId,
        })
        .signers([testUser])
        .rpc();

      // Generate encryption keys
      const privateKey = x25519.utils.randomPrivateKey();
      const publicKey = x25519.getPublicKey(privateKey);
      const mxePublicKey = new Uint8Array([
        34, 56, 246, 3, 165, 122, 74, 68, 14, 81, 107, 73, 129, 145, 196, 4, 98,
        253, 120, 15, 235, 108, 37, 198, 124, 111, 38, 1, 210, 143, 72, 87,
      ]);

      const sharedSecret = x25519.getSharedSecret(privateKey, mxePublicKey);
      const cipher = new RescueCipher(sharedSecret);
      const nonce = randomBytes(16);

      // Create test portfolio data
      const testPortfolioData = createTestPortfolioData(testUser.publicKey);
      const encryptedData = await encryptPortfolioData(testPortfolioData, cipher);

      const computationOffset = new anchor.BN(randomBytes(8));

      // Queue the computation
      const queueTx = await program.methods
        .calculatePortfolioValue(
          computationOffset,
          Array.from(encryptedData),
          Array.from(publicKey),
          new anchor.BN(deserializeLE(nonce).toString())
        )
        .accountsPartial({
          payer: testUser.publicKey,
          computationAccount: getComputationAccAddress(program.programId, computationOffset),
          clusterAccount: arciumEnv.arciumClusterPubkey,
          mxeAccount: getMXEAccAddress(program.programId),
          mempoolAccount: getMempoolAccAddress(program.programId),
          executingPool: getExecutingPoolAccAddress(program.programId),
          compDefAccount: getCompDefAccAddress(program.programId, 0), // Portfolio value comp def offset
        })
        .signers([testUser])
        .rpc({ skipPreflight: true, commitment: "confirmed" });

      console.log("Portfolio computation queued:", queueTx);

      // Wait for computation finalization
      const finalizeTx = await awaitComputationFinalization(
        provider,
        computationOffset,
        program.programId,
        "confirmed"
      );

      console.log("Portfolio computation finalized:", finalizeTx);

      // Verify the portfolio account was updated
      const portfolioAccount = await program.account.portfolioAccount.fetch(portfolioPDA);
      expect(portfolioAccount.totalValue.toNumber()).to.be.greaterThan(0);
      expect(portfolioAccount.lastUpdated).to.be.greaterThan(0);
    });

    it("should handle computation failures gracefully", async () => {
      // Initialize portfolio account
      await program.methods
        .initializePortfolio()
        .accounts({
          user: testUser.publicKey,
          portfolioAccount: portfolioPDA,
          systemProgram: anchor.web3.SystemProgram.programId,
        })
        .signers([testUser])
        .rpc();

      // Create malformed encrypted data
      const malformedData = new Uint8Array(32);
      const privateKey = x25519.utils.randomPrivateKey();
      const publicKey = x25519.getPublicKey(privateKey);
      const nonce = randomBytes(16);

      const computationOffset = new anchor.BN(randomBytes(8));

      try {
        // This should fail due to malformed data
        await program.methods
          .calculatePortfolioValue(
            computationOffset,
            Array.from(malformedData),
            Array.from(publicKey),
            new anchor.BN(deserializeLE(nonce).toString())
          )
          .accountsPartial({
            payer: testUser.publicKey,
            computationAccount: getComputationAccAddress(program.programId, computationOffset),
            clusterAccount: arciumEnv.arciumClusterPubkey,
            mxeAccount: getMXEAccAddress(program.programId),
            mempoolAccount: getMempoolAccAddress(program.programId),
            executingPool: getExecutingPoolAccAddress(program.programId),
            compDefAccount: getCompDefAccAddress(program.programId, 0),
          })
          .signers([testUser])
          .rpc({ skipPreflight: true, commitment: "confirmed" });

        // Wait for computation with timeout
        await Promise.race([
          awaitComputationFinalization(provider, computationOffset, program.programId, "confirmed"),
          new Promise((_, reject) => setTimeout(() => reject(new Error("Computation timeout")), 30000))
        ]);

        // If we reach here, the test failed
        expect.fail("Computation should have failed with malformed data");
      } catch (error) {
        // This is expected - computation should fail
        console.log("Expected failure:", error.message);
        expect(error.message).to.include("Computation timeout");
      }
    });
  });

  describe("Risk Metrics Computation Integration", () => {
    it("should calculate risk metrics from performance history", async () => {
      // Initialize performance history
      await program.methods
        .initializePerformanceHistory()
        .accounts({
          user: testUser.publicKey,
          performanceHistory: performancePDA,
          systemProgram: anchor.web3.SystemProgram.programId,
        })
        .signers([testUser])
        .rpc();

      // Add some test performance data
      const testReturns = [150, -100, 200, 50, -50, 300, -200, 100];
      const testValues = [1000000, 1015000, 1005000, 1025000, 1030000, 1025000, 1055000, 1035000];

      for (let i = 0; i < testReturns.length; i++) {
        await program.methods
          .updatePerformanceHistory(new anchor.BN(testReturns[i]), new anchor.BN(testValues[i]))
          .accounts({
            user: testUser.publicKey,
            performanceHistory: performancePDA,
          })
          .signers([testUser])
          .rpc();
      }

      // Generate encryption keys and encrypt performance data
      const privateKey = x25519.utils.randomPrivateKey();
      const publicKey = x25519.getPublicKey(privateKey);
      const mxePublicKey = new Uint8Array([
        34, 56, 246, 3, 165, 122, 74, 68, 14, 81, 107, 73, 129, 145, 196, 4, 98,
        253, 120, 15, 235, 108, 37, 198, 124, 111, 38, 1, 210, 143, 72, 87,
      ]);

      const sharedSecret = x25519.getSharedSecret(privateKey, mxePublicKey);
      const cipher = new RescueCipher(sharedSecret);
      const nonce = randomBytes(16);

      const performanceData = createTestPerformanceData(testReturns, testValues);
      const encryptedData = await encryptPerformanceData(performanceData, cipher);

      const computationOffset = new anchor.BN(randomBytes(8));

      // Set up event listener for risk metrics
      const riskMetricsEventPromise = awaitRiskMetricsEvent();

      // Queue risk metrics computation
      const queueTx = await program.methods
        .calculateRiskMetrics(
          computationOffset,
          Array.from(encryptedData),
          Array.from(publicKey),
          new anchor.BN(deserializeLE(nonce).toString())
        )
        .accountsPartial({
          payer: testUser.publicKey,
          computationAccount: getComputationAccAddress(program.programId, computationOffset),
          clusterAccount: arciumEnv.arciumClusterPubkey,
          mxeAccount: getMXEAccAddress(program.programId),
          mempoolAccount: getMempoolAccAddress(program.programId),
          executingPool: getExecutingPoolAccAddress(program.programId),
          compDefAccount: getCompDefAccAddress(program.programId, 1), // Risk metrics comp def offset
        })
        .signers([testUser])
        .rpc({ skipPreflight: true, commitment: "confirmed" });

      console.log("Risk metrics computation queued:", queueTx);

      // Wait for computation finalization
      await awaitComputationFinalization(
        provider,
        computationOffset,
        program.programId,
        "confirmed"
      );

      // Wait for the risk metrics event
      const riskEvent = await riskMetricsEventPromise;

      // Validate risk metrics
      expect(riskEvent.owner.toString()).to.equal(testUser.publicKey.toString());
      expect(riskEvent.portfolioValue).to.be.greaterThan(0);
      expect(riskEvent.dailyVolatility).to.be.greaterThan(0);
      expect(riskEvent.var95).to.be.greaterThan(0);
      expect(riskEvent.var99).to.be.greaterThan(riskEvent.var95);
    });
  });

  describe("Peer Comparison Integration", () => {
    it("should perform encrypted peer comparison", async () => {
      const peerData = createTestPeerComparisonData(testUser.publicKey);

      // Encrypt peer comparison data
      const privateKey = x25519.utils.randomPrivateKey();
      const publicKey = x25519.getPublicKey(privateKey);
      const mxePublicKey = new Uint8Array([
        34, 56, 246, 3, 165, 122, 74, 68, 14, 81, 107, 73, 129, 145, 196, 4, 98,
        253, 120, 15, 235, 108, 37, 198, 124, 111, 38, 1, 210, 143, 72, 87,
      ]);

      const sharedSecret = x25519.getSharedSecret(privateKey, mxePublicKey);
      const cipher = new RescueCipher(sharedSecret);
      const nonce = randomBytes(16);

      const encryptedData = await encryptPeerComparisonData(peerData, cipher);
      const computationOffset = new anchor.BN(randomBytes(8));

      // Set up event listener
      const peerComparisonEventPromise = awaitPeerComparisonEvent();

      // Queue peer comparison computation
      const queueTx = await program.methods
        .calculatePeerComparison(
          computationOffset,
          Array.from(encryptedData),
          Array.from(publicKey),
          new anchor.BN(deserializeLE(nonce).toString())
        )
        .accountsPartial({
          payer: testUser.publicKey,
          computationAccount: getComputationAccAddress(program.programId, computationOffset),
          clusterAccount: arciumEnv.arciumClusterPubkey,
          mxeAccount: getMXEAccAddress(program.programId),
          mempoolAccount: getMempoolAccAddress(program.programId),
          executingPool: getExecutingPoolAccAddress(program.programId),
          compDefAccount: getCompDefAccAddress(program.programId, 2), // Peer comparison comp def offset
        })
        .signers([testUser])
        .rpc({ skipPreflight: true, commitment: "confirmed" });

      console.log("Peer comparison computation queued:", queueTx);

      // Wait for computation finalization
      await awaitComputationFinalization(
        provider,
        computationOffset,
        program.programId,
        "confirmed"
      );

      // Wait for the peer comparison event
      const peerEvent = await peerComparisonEventPromise;

      // Validate peer comparison results
      expect(peerEvent.owner.toString()).to.equal(testUser.publicKey.toString());
      expect(peerEvent.peerPercentile).to.be.at.most(100);
      expect(peerEvent.riskAdjustedRank).to.be.at.most(100);
      expect(peerEvent.categoryVolatility).to.be.greaterThan(0);
    });
  });

  describe("Network Resilience", () => {
    it("should handle Arcium network disconnections", async () => {
      // This test would simulate network failures and verify graceful handling
      // Implementation would depend on the specific error handling mechanisms
    });

    it("should retry failed computations", async () => {
      // Test automatic retry logic for failed computations
    });

    it("should validate computation authenticity", async () => {
      // Ensure computation results are cryptographically verified
    });
  });

  // Helper functions
  function createTestPortfolioData(owner: PublicKey) {
    return {
      owner: owner.toBytes(),
      holdings: [
        {
          token_mint: new Uint8Array(32), // Mock SOL mint
          balance: BigInt(1000000000), // 1 SOL
          price_usd: BigInt(100000000), // $100 in micro-dollars
          last_updated: BigInt(Date.now()),
        },
        {
          token_mint: new Uint8Array(32), // Mock USDC mint
          balance: BigInt(500000000), // 500 USDC
          price_usd: BigInt(1000000), // $1 in micro-dollars
          last_updated: BigInt(Date.now()),
        },
      ],
      holdings_count: 2,
      total_value_usd: BigInt(0),
      last_updated: BigInt(Date.now()),
    };
  }

  function createTestPerformanceData(returns: number[], values: number[]) {
    const paddedReturns = [...returns, ...Array(30 - returns.length).fill(0)];
    const paddedValues = [...values, ...Array(30 - values.length).fill(0)];

    return {
      daily_returns: paddedReturns,
      portfolio_values: paddedValues,
      return_count: returns.length,
    };
  }

  function createTestPeerComparisonData(owner: PublicKey) {
    // Generate mock peer returns
    const peerReturns = Array.from({ length: 50 }, () =>
      Math.floor((Math.random() - 0.5) * 1000) // -500 to 500 basis points
    );

    return {
      user_return: 150, // 1.5% return
      peer_returns: [...peerReturns, ...Array(50).fill(0)], // Pad to 100
      peer_count: 50,
      percentile_rank: 0,
      category_avg: 0,
      category_median: 0,
    };
  }

  async function encryptPortfolioData(data: any, cipher: RescueCipher): Promise<Uint8Array> {
    // This would implement the actual encryption logic for portfolio data
    // For now, return mock encrypted data
    return new Uint8Array(32);
  }

  async function encryptPerformanceData(data: any, cipher: RescueCipher): Promise<Uint8Array> {
    // This would implement the actual encryption logic for performance data
    return new Uint8Array(32);
  }

  async function encryptPeerComparisonData(data: any, cipher: RescueCipher): Promise<Uint8Array> {
    // This would implement the actual encryption logic for peer comparison data
    return new Uint8Array(32);
  }

  async function awaitRiskMetricsEvent(): Promise<any> {
    return new Promise((resolve) => {
      const listenerId = program.addEventListener("riskMetricsEvent", (event) => {
        program.removeEventListener(listenerId);
        resolve(event);
      });
    });
  }

  async function awaitPeerComparisonEvent(): Promise<any> {
    return new Promise((resolve) => {
      const listenerId = program.addEventListener("peerComparisonEvent", (event) => {
        program.removeEventListener(listenerId);
        resolve(event);
      });
    });
  }
});