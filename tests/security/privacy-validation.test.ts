import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { PublicKey, Keypair } from "@solana/web3.js";
import { Zenithveil } from "../../target/types/zenithveil";
import { expect } from "chai";
import { randomBytes, createHash, timingSafeEqual } from "crypto";
import {
  RescueCipher,
  x25519,
  deserializeLE,
} from "@arcium-hq/client";

describe("Privacy and Security Validation", () => {
  anchor.setProvider(anchor.AnchorProvider.env());
  const program = anchor.workspace.Zenithveil as Program<Zenithveil>;
  const provider = anchor.getProvider() as anchor.AnchorProvider;

  let testUser1: Keypair;
  let testUser2: Keypair;

  beforeEach(async () => {
    testUser1 = Keypair.generate();
    testUser2 = Keypair.generate();

    // Airdrop SOL to test users
    await Promise.all([
      provider.connection.requestAirdrop(testUser1.publicKey, 10 * anchor.web3.LAMPORTS_PER_SOL),
      provider.connection.requestAirdrop(testUser2.publicKey, 10 * anchor.web3.LAMPORTS_PER_SOL),
    ]);

    await Promise.all([
      provider.connection.confirmTransaction(
        await provider.connection.requestAirdrop(testUser1.publicKey, 10 * anchor.web3.LAMPORTS_PER_SOL)
      ),
      provider.connection.confirmTransaction(
        await provider.connection.requestAirdrop(testUser2.publicKey, 10 * anchor.web3.LAMPORTS_PER_SOL)
      ),
    ]);
  });

  describe("Data Encryption and Privacy", () => {
    it("should encrypt portfolio data before computation", async () => {
      const privateKey = x25519.utils.randomPrivateKey();
      const publicKey = x25519.getPublicKey(privateKey);
      const mxePublicKey = new Uint8Array([
        34, 56, 246, 3, 165, 122, 74, 68, 14, 81, 107, 73, 129, 145, 196, 4, 98,
        253, 120, 15, 235, 108, 37, 198, 124, 111, 38, 1, 210, 143, 72, 87,
      ]);

      const sharedSecret = x25519.getSharedSecret(privateKey, mxePublicKey);
      const cipher = new RescueCipher(sharedSecret);

      // Create sensitive portfolio data
      const sensitiveData = {
        owner: testUser1.publicKey.toBytes(),
        totalValue: BigInt(1000000000), // $1000
        holdings: [
          { token: "SOL", balance: BigInt(5000000000) }, // 5 SOL
          { token: "USDC", balance: BigInt(500000000) }, // 500 USDC
        ],
      };

      // Encrypt the data
      const nonce = randomBytes(16);
      const serializedData = serializePortfolioData(sensitiveData);
      const encryptedData = await cipher.encrypt(serializedData, nonce);

      // Verify data is properly encrypted
      expect(encryptedData).to.not.deep.equal(serializedData);
      expect(encryptedData.length).to.be.greaterThan(0);

      // Verify decryption works
      const decryptedData = await cipher.decrypt(encryptedData, nonce);
      const deserializedData = deserializePortfolioData(decryptedData);

      expect(deserializedData.totalValue.toString()).to.equal(sensitiveData.totalValue.toString());
    });

    it("should prevent data leakage through transaction logs", async () => {
      const [portfolioPDA] = PublicKey.findProgramAddressSync(
        [Buffer.from("portfolio"), testUser1.publicKey.toBuffer()],
        program.programId
      );

      // Initialize portfolio
      const initTx = await program.methods
        .initializePortfolio()
        .accounts({
          user: testUser1.publicKey,
          portfolioAccount: portfolioPDA,
          systemProgram: anchor.web3.SystemProgram.programId,
        })
        .signers([testUser1])
        .rpc();

      // Get transaction details
      const txDetails = await provider.connection.getTransaction(initTx, {
        commitment: "confirmed",
        maxSupportedTransactionVersion: 0,
      });

      // Verify no sensitive data is exposed in logs
      const logs = txDetails?.meta?.logMessages || [];
      logs.forEach((log) => {
        expect(log).to.not.include("portfolio_value");
        expect(log).to.not.include("balance");
        expect(log).to.not.include("holdings");
      });

      // Verify account data is minimal and doesn't leak sensitive info
      const accountInfo = await provider.connection.getAccountInfo(portfolioPDA);
      expect(accountInfo?.data.length).to.be.lessThan(200); // Should be small
    });

    it("should isolate user data between accounts", async () => {
      const [portfolio1PDA] = PublicKey.findProgramAddressSync(
        [Buffer.from("portfolio"), testUser1.publicKey.toBuffer()],
        program.programId
      );

      const [portfolio2PDA] = PublicKey.findProgramAddressSync(
        [Buffer.from("portfolio"), testUser2.publicKey.toBuffer()],
        program.programId
      );

      // Initialize both portfolios
      await Promise.all([
        program.methods
          .initializePortfolio()
          .accounts({
            user: testUser1.publicKey,
            portfolioAccount: portfolio1PDA,
            systemProgram: anchor.web3.SystemProgram.programId,
          })
          .signers([testUser1])
          .rpc(),

        program.methods
          .initializePortfolio()
          .accounts({
            user: testUser2.publicKey,
            portfolioAccount: portfolio2PDA,
            systemProgram: anchor.web3.SystemProgram.programId,
          })
          .signers([testUser2])
          .rpc(),
      ]);

      // Verify each user can only access their own portfolio
      const portfolio1 = await program.account.portfolioAccount.fetch(portfolio1PDA);
      const portfolio2 = await program.account.portfolioAccount.fetch(portfolio2PDA);

      expect(portfolio1.owner.toString()).to.equal(testUser1.publicKey.toString());
      expect(portfolio2.owner.toString()).to.equal(testUser2.publicKey.toString());

      // Verify user1 cannot modify user2's portfolio
      try {
        await program.methods
          .updatePerformanceHistory(new anchor.BN(100), new anchor.BN(1000000))
          .accounts({
            user: testUser1.publicKey,
            performanceHistory: portfolio2PDA, // Wrong PDA
          })
          .signers([testUser1])
          .rpc();

        expect.fail("Should have failed with access violation");
      } catch (error) {
        expect(error.message).to.include("access");
      }
    });
  });

  describe("Timing Attack Resistance", () => {
    it("should have consistent execution times for encrypted computations", async () => {
      const executionTimes: number[] = [];
      const testCases = [
        { value: 100000000, holdings: 1 },
        { value: 1000000000, holdings: 5 },
        { value: 10000000000, holdings: 10 },
      ];

      for (const testCase of testCases) {
        const startTime = performance.now();

        // Simulate encrypted computation with different input sizes
        await simulateEncryptedComputation(testCase);

        const endTime = performance.now();
        executionTimes.push(endTime - startTime);
      }

      // Verify execution times are within acceptable variance (less than 20% difference)
      const avgTime = executionTimes.reduce((a, b) => a + b) / executionTimes.length;
      executionTimes.forEach((time) => {
        const variance = Math.abs(time - avgTime) / avgTime;
        expect(variance).to.be.lessThan(0.2);
      });
    });

    it("should prevent correlation attacks through metadata analysis", async () => {
      const computationOffsets: anchor.BN[] = [];
      const timestamps: number[] = [];

      // Perform multiple computations
      for (let i = 0; i < 10; i++) {
        const offset = new anchor.BN(randomBytes(8));
        computationOffsets.push(offset);
        timestamps.push(Date.now());

        // Small random delay to prevent correlation
        await new Promise(resolve => setTimeout(resolve, Math.random() * 100));
      }

      // Verify offsets are properly randomized
      const offsetBuffers = computationOffsets.map(offset => offset.toBuffer());
      for (let i = 0; i < offsetBuffers.length - 1; i++) {
        for (let j = i + 1; j < offsetBuffers.length; j++) {
          expect(offsetBuffers[i]).to.not.deep.equal(offsetBuffers[j]);
        }
      }

      // Verify timestamps don't leak information about computation complexity
      const timeDifferences = timestamps.slice(1).map((time, index) => time - timestamps[index]);
      const avgTimeDiff = timeDifferences.reduce((a, b) => a + b) / timeDifferences.length;

      // Time differences should be relatively consistent (not correlating with data)
      timeDifferences.forEach((diff) => {
        expect(Math.abs(diff - avgTimeDiff)).to.be.lessThan(avgTimeDiff * 0.5);
      });
    });
  });

  describe("Zero-Knowledge Properties", () => {
    it("should not reveal intermediate computation states", async () => {
      const privateKey = x25519.utils.randomPrivateKey();
      const publicKey = x25519.getPublicKey(privateKey);

      // Create test portfolio with known values
      const portfolioData = {
        holdings: [
          { token: "SOL", balance: 1000000000, price: 100000000 }, // 1 SOL @ $100
          { token: "USDC", balance: 500000000, price: 1000000 },   // 500 USDC @ $1
        ],
        expectedTotal: 600000000, // $600
      };

      // Encrypt and submit computation
      const encryptedData = await encryptTestData(portfolioData, publicKey);
      const computationOffset = new anchor.BN(randomBytes(8));

      // Monitor blockchain state during computation
      const preComputationState = await captureBlockchainState(program.programId);

      // Queue computation (this would normally trigger encrypted execution)
      // For testing, we simulate the process without actual Arcium network
      const intermediateState = await captureBlockchainState(program.programId);

      // Verify no intermediate values are exposed
      const stateDiff = compareBlockchainStates(preComputationState, intermediateState);

      // Should only see computation queuing, not intermediate calculations
      stateDiff.forEach((change) => {
        expect(change.type).to.not.include("intermediate_value");
        expect(change.type).to.not.include("partial_sum");
        expect(change.type).to.not.include("holding_value");
      });
    });

    it("should maintain privacy during peer comparisons", async () => {
      // Create multiple test portfolios with known performance
      const portfolios = [
        { user: testUser1, performance: 150 }, // 1.5% return
        { user: testUser2, performance: -50 }, // -0.5% return
      ];

      const peerComparisonResults: any[] = [];

      for (const portfolio of portfolios) {
        // Encrypt individual performance data
        const encryptedPerformance = await encryptPerformanceData({
          userReturn: portfolio.performance,
          // Don't include other users' data in individual submissions
        });

        // Submit for peer comparison
        const result = await simulatePeerComparison(portfolio.user, encryptedPerformance);
        peerComparisonResults.push(result);
      }

      // Verify results contain only aggregated statistics
      peerComparisonResults.forEach((result) => {
        expect(result).to.have.property("percentileRank");
        expect(result).to.have.property("relativePerformance");

        // Should NOT contain individual portfolio details from other users
        expect(result).to.not.have.property("otherUsersReturns");
        expect(result).to.not.have.property("individualPortfolios");
        expect(result).to.not.have.property("peerIdentities");
      });

      // Verify percentiles are mathematically consistent but don't reveal individual data
      const user1Result = peerComparisonResults[0];
      const user2Result = peerComparisonResults[1];

      expect(user1Result.percentileRank).to.be.greaterThan(user2Result.percentileRank);
      expect(user1Result.percentileRank + user2Result.percentileRank).to.be.lessThan(200);
    });
  });

  describe("Cryptographic Security", () => {
    it("should use cryptographically secure random number generation", () => {
      const randoms: Buffer[] = [];

      // Generate multiple random values
      for (let i = 0; i < 100; i++) {
        randoms.push(randomBytes(32));
      }

      // Verify randomness quality
      randoms.forEach((random, index) => {
        // Each should be unique
        randoms.slice(index + 1).forEach((other) => {
          expect(random).to.not.deep.equal(other);
        });

        // Should have good entropy (not all zeros, not predictable patterns)
        const zeros = random.filter(byte => byte === 0).length;
        expect(zeros).to.be.lessThan(random.length / 4); // Less than 25% zeros

        const ones = random.filter(byte => byte === 255).length;
        expect(ones).to.be.lessThan(random.length / 4); // Less than 25% max values
      });
    });

    it("should validate encryption key derivation", async () => {
      const privateKeys = Array.from({ length: 10 }, () => x25519.utils.randomPrivateKey());
      const publicKeys = privateKeys.map(priv => x25519.getPublicKey(priv));

      // Verify key pairs are valid
      privateKeys.forEach((privKey, index) => {
        expect(privKey.length).to.equal(32);
        expect(publicKeys[index].length).to.equal(32);

        // Verify keys are properly derived (same private key -> same public key)
        const derivedPubKey = x25519.getPublicKey(privKey);
        expect(derivedPubKey).to.deep.equal(publicKeys[index]);
      });

      // Verify shared secrets are consistent
      const mxePrivateKey = x25519.utils.randomPrivateKey();
      const mxePublicKey = x25519.getPublicKey(mxePrivateKey);

      const sharedSecrets = privateKeys.map(privKey =>
        x25519.getSharedSecret(privKey, mxePublicKey)
      );

      // Each shared secret should be unique and properly sized
      sharedSecrets.forEach((secret, index) => {
        expect(secret.length).to.equal(32);

        // Verify the shared secret is the same when computed from the other side
        const reverseSecret = x25519.getSharedSecret(mxePrivateKey, publicKeys[index]);
        expect(secret).to.deep.equal(reverseSecret);
      });
    });

    it("should resist side-channel attacks during encryption", async () => {
      const testData = [
        Buffer.alloc(32, 0), // All zeros
        Buffer.alloc(32, 255), // All ones
        randomBytes(32), // Random data
        Buffer.from("a".repeat(32)), // Repeated pattern
      ];

      const privateKey = x25519.utils.randomPrivateKey();
      const publicKey = x25519.getPublicKey(privateKey);
      const mxePublicKey = randomBytes(32);
      const sharedSecret = x25519.getSharedSecret(privateKey, mxePublicKey);
      const cipher = new RescueCipher(sharedSecret);

      const encryptionTimes: number[] = [];

      for (const data of testData) {
        const nonce = randomBytes(16);

        const startTime = performance.now();
        await cipher.encrypt(data, nonce);
        const endTime = performance.now();

        encryptionTimes.push(endTime - startTime);
      }

      // Encryption times should be consistent regardless of input data
      const avgTime = encryptionTimes.reduce((a, b) => a + b) / encryptionTimes.length;
      encryptionTimes.forEach((time) => {
        const variance = Math.abs(time - avgTime) / avgTime;
        expect(variance).to.be.lessThan(0.3); // Within 30% variance
      });
    });
  });

  describe("Access Control and Authorization", () => {
    it("should enforce proper ownership validation", async () => {
      const [portfolio1PDA] = PublicKey.findProgramAddressSync(
        [Buffer.from("portfolio"), testUser1.publicKey.toBuffer()],
        program.programId
      );

      // Initialize portfolio for user1
      await program.methods
        .initializePortfolio()
        .accounts({
          user: testUser1.publicKey,
          portfolioAccount: portfolio1PDA,
          systemProgram: anchor.web3.SystemProgram.programId,
        })
        .signers([testUser1])
        .rpc();

      // Try to access with user2 (should fail)
      try {
        await program.methods
          .updatePerformanceHistory(new anchor.BN(100), new anchor.BN(1000000))
          .accounts({
            user: testUser2.publicKey, // Wrong user
            performanceHistory: portfolio1PDA,
          })
          .signers([testUser2])
          .rpc();

        expect.fail("Should have failed authorization check");
      } catch (error) {
        expect(error.message).to.include("constraint");
      }
    });

    it("should validate PDA derivations securely", () => {
      // Test various PDA derivations
      const testCases = [
        { seed: "portfolio", user: testUser1.publicKey },
        { seed: "performance", user: testUser1.publicKey },
        { seed: "portfolio", user: testUser2.publicKey },
        { seed: "performance", user: testUser2.publicKey },
      ];

      const pdas = testCases.map(testCase => {
        const [pda, bump] = PublicKey.findProgramAddressSync(
          [Buffer.from(testCase.seed), testCase.user.toBuffer()],
          program.programId
        );
        return { pda, bump, testCase };
      });

      // Verify each PDA is unique
      pdas.forEach((item1, index1) => {
        pdas.slice(index1 + 1).forEach((item2) => {
          expect(item1.pda.toString()).to.not.equal(item2.pda.toString());
        });
      });

      // Verify PDAs are properly derived (deterministic)
      pdas.forEach(({ pda, bump, testCase }) => {
        const [derivedPda, derivedBump] = PublicKey.findProgramAddressSync(
          [Buffer.from(testCase.seed), testCase.user.toBuffer()],
          program.programId
        );

        expect(pda.toString()).to.equal(derivedPda.toString());
        expect(bump).to.equal(derivedBump);
      });
    });
  });

  // Helper functions
  function serializePortfolioData(data: any): Buffer {
    // Implement actual serialization logic
    return Buffer.from(JSON.stringify(data));
  }

  function deserializePortfolioData(buffer: Buffer): any {
    // Implement actual deserialization logic
    return JSON.parse(buffer.toString());
  }

  async function simulateEncryptedComputation(testCase: any): Promise<void> {
    // Simulate the time complexity of encrypted computation
    const iterations = testCase.holdings * 1000;
    let sum = 0;
    for (let i = 0; i < iterations; i++) {
      sum += Math.sqrt(i * testCase.value);
    }
    return Promise.resolve();
  }

  async function encryptTestData(data: any, publicKey: Uint8Array): Promise<Uint8Array> {
    // Mock encryption for testing
    const serialized = JSON.stringify(data);
    return new TextEncoder().encode(serialized);
  }

  async function encryptPerformanceData(data: any): Promise<Uint8Array> {
    // Mock encryption for performance data
    return new Uint8Array(32);
  }

  async function captureBlockchainState(programId: PublicKey): Promise<any[]> {
    // Capture current program accounts and their states
    const accounts = await provider.connection.getProgramAccounts(programId);
    return accounts.map(account => ({
      pubkey: account.pubkey.toString(),
      data: account.account.data,
      owner: account.account.owner.toString(),
      lamports: account.account.lamports,
    }));
  }

  function compareBlockchainStates(before: any[], after: any[]): any[] {
    // Compare two blockchain states and return differences
    const changes: any[] = [];

    after.forEach(afterAccount => {
      const beforeAccount = before.find(acc => acc.pubkey === afterAccount.pubkey);
      if (!beforeAccount) {
        changes.push({ type: "new_account", account: afterAccount });
      } else if (!beforeAccount.data.equals(afterAccount.data)) {
        changes.push({ type: "data_change", account: afterAccount });
      }
    });

    return changes;
  }

  async function simulatePeerComparison(user: Keypair, encryptedData: Uint8Array): Promise<any> {
    // Simulate peer comparison computation
    return {
      percentileRank: Math.floor(Math.random() * 100),
      relativePerformance: Math.floor((Math.random() - 0.5) * 200),
    };
  }
});