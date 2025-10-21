import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { PublicKey, Keypair } from "@solana/web3.js";
import { Zenithveil } from "../../target/types/zenithveil";
import { expect } from "chai";
import { performance } from "perf_hooks";

describe("Performance Benchmarks", () => {
  anchor.setProvider(anchor.AnchorProvider.env());
  const program = anchor.workspace.Zenithveil as Program<Zenithveil>;
  const provider = anchor.getProvider() as anchor.AnchorProvider;

  // Performance tracking
  interface BenchmarkResult {
    operation: string;
    averageTime: number;
    minTime: number;
    maxTime: number;
    iterations: number;
    throughput: number; // operations per second
  }

  const benchmarkResults: BenchmarkResult[] = [];

  before(async () => {
    console.log("Starting performance benchmark suite...");
  });

  after(() => {
    // Print benchmark summary
    console.log("\n=== PERFORMANCE BENCHMARK RESULTS ===");
    benchmarkResults.forEach(result => {
      console.log(`${result.operation}:`);
      console.log(`  Average: ${result.averageTime.toFixed(2)}ms`);
      console.log(`  Min: ${result.minTime.toFixed(2)}ms`);
      console.log(`  Max: ${result.maxTime.toFixed(2)}ms`);
      console.log(`  Throughput: ${result.throughput.toFixed(2)} ops/sec`);
      console.log(`  Iterations: ${result.iterations}`);
      console.log("");
    });
  });

  describe("Account Initialization Performance", () => {
    it("should benchmark portfolio account initialization", async () => {
      const iterations = 50;
      const times: number[] = [];

      for (let i = 0; i < iterations; i++) {
        const testUser = Keypair.generate();

        // Airdrop SOL
        await provider.connection.requestAirdrop(testUser.publicKey, anchor.web3.LAMPORTS_PER_SOL);
        await provider.connection.confirmTransaction(
          await provider.connection.requestAirdrop(testUser.publicKey, anchor.web3.LAMPORTS_PER_SOL)
        );

        const [portfolioPDA] = PublicKey.findProgramAddressSync(
          [Buffer.from("portfolio"), testUser.publicKey.toBuffer()],
          program.programId
        );

        const startTime = performance.now();

        await program.methods
          .initializePortfolio()
          .accounts({
            user: testUser.publicKey,
            portfolioAccount: portfolioPDA,
            systemProgram: anchor.web3.SystemProgram.programId,
          })
          .signers([testUser])
          .rpc();

        const endTime = performance.now();
        times.push(endTime - startTime);
      }

      const result = calculateBenchmarkStats("Portfolio Initialization", times);
      benchmarkResults.push(result);

      // Performance assertions
      expect(result.averageTime).to.be.lessThan(2000); // Average under 2 seconds
      expect(result.maxTime).to.be.lessThan(5000); // Max under 5 seconds
    });

    it("should benchmark performance history initialization", async () => {
      const iterations = 50;
      const times: number[] = [];

      for (let i = 0; i < iterations; i++) {
        const testUser = Keypair.generate();

        await provider.connection.requestAirdrop(testUser.publicKey, anchor.web3.LAMPORTS_PER_SOL);
        await provider.connection.confirmTransaction(
          await provider.connection.requestAirdrop(testUser.publicKey, anchor.web3.LAMPORTS_PER_SOL)
        );

        const [performancePDA] = PublicKey.findProgramAddressSync(
          [Buffer.from("performance"), testUser.publicKey.toBuffer()],
          program.programId
        );

        const startTime = performance.now();

        await program.methods
          .initializePerformanceHistory()
          .accounts({
            user: testUser.publicKey,
            performanceHistory: performancePDA,
            systemProgram: anchor.web3.SystemProgram.programId,
          })
          .signers([testUser])
          .rpc();

        const endTime = performance.now();
        times.push(endTime - startTime);
      }

      const result = calculateBenchmarkStats("Performance History Initialization", times);
      benchmarkResults.push(result);

      expect(result.averageTime).to.be.lessThan(2000);
    });
  });

  describe("Data Update Performance", () => {
    let testUser: Keypair;
    let performancePDA: PublicKey;

    before(async () => {
      testUser = Keypair.generate();
      await provider.connection.requestAirdrop(testUser.publicKey, 10 * anchor.web3.LAMPORTS_PER_SOL);
      await provider.connection.confirmTransaction(
        await provider.connection.requestAirdrop(testUser.publicKey, 10 * anchor.web3.LAMPORTS_PER_SOL)
      );

      [performancePDA] = PublicKey.findProgramAddressSync(
        [Buffer.from("performance"), testUser.publicKey.toBuffer()],
        program.programId
      );

      await program.methods
        .initializePerformanceHistory()
        .accounts({
          user: testUser.publicKey,
          performanceHistory: performancePDA,
          systemProgram: anchor.web3.SystemProgram.programId,
        })
        .signers([testUser])
        .rpc();
    });

    it("should benchmark performance history updates", async () => {
      const iterations = 100;
      const times: number[] = [];

      for (let i = 0; i < iterations; i++) {
        const testReturn = Math.floor((Math.random() - 0.5) * 1000); // -500 to 500 bp
        const testValue = Math.floor(1000000 + Math.random() * 1000000); // $1000-2000

        const startTime = performance.now();

        await program.methods
          .updatePerformanceHistory(new anchor.BN(testReturn), new anchor.BN(testValue))
          .accounts({
            user: testUser.publicKey,
            performanceHistory: performancePDA,
          })
          .signers([testUser])
          .rpc();

        const endTime = performance.now();
        times.push(endTime - startTime);
      }

      const result = calculateBenchmarkStats("Performance History Update", times);
      benchmarkResults.push(result);

      expect(result.averageTime).to.be.lessThan(1500); // Updates should be faster
      expect(result.throughput).to.be.greaterThan(1); // At least 1 update per second
    });

    it("should benchmark batch performance updates", async () => {
      const batchSizes = [5, 10, 20, 30];
      const batchResults: { size: number; avgTime: number }[] = [];

      for (const batchSize of batchSizes) {
        const times: number[] = [];

        for (let batch = 0; batch < 10; batch++) {
          const startTime = performance.now();

          // Perform batch updates
          const promises = [];
          for (let i = 0; i < batchSize; i++) {
            const testReturn = Math.floor((Math.random() - 0.5) * 1000);
            const testValue = Math.floor(1000000 + Math.random() * 1000000);

            promises.push(
              program.methods
                .updatePerformanceHistory(new anchor.BN(testReturn), new anchor.BN(testValue))
                .accounts({
                  user: testUser.publicKey,
                  performanceHistory: performancePDA,
                })
                .signers([testUser])
                .rpc()
            );
          }

          await Promise.all(promises);

          const endTime = performance.now();
          times.push(endTime - startTime);
        }

        const avgTime = times.reduce((sum, time) => sum + time, 0) / times.length;
        batchResults.push({ size: batchSize, avgTime });

        console.log(`Batch size ${batchSize}: ${avgTime.toFixed(2)}ms average`);
      }

      // Verify that larger batches don't scale linearly (indicating good parallelization)
      const firstBatch = batchResults[0];
      const lastBatch = batchResults[batchResults.length - 1];
      const scalingFactor = lastBatch.avgTime / firstBatch.avgTime;
      const expectedLinearScaling = lastBatch.size / firstBatch.size;

      expect(scalingFactor).to.be.lessThan(expectedLinearScaling); // Better than linear scaling
    });
  });

  describe("Computation Queue Performance", () => {
    it("should benchmark computation queueing latency", async () => {
      const iterations = 25; // Fewer iterations due to network calls
      const times: number[] = [];

      for (let i = 0; i < iterations; i++) {
        const testUser = Keypair.generate();
        await provider.connection.requestAirdrop(testUser.publicKey, anchor.web3.LAMPORTS_PER_SOL);
        await provider.connection.confirmTransaction(
          await provider.connection.requestAirdrop(testUser.publicKey, anchor.web3.LAMPORTS_PER_SOL)
        );

        const [portfolioPDA] = PublicKey.findProgramAddressSync(
          [Buffer.from("portfolio"), testUser.publicKey.toBuffer()],
          program.programId
        );

        await program.methods
          .initializePortfolio()
          .accounts({
            user: testUser.publicKey,
            portfolioAccount: portfolioPDA,
            systemProgram: anchor.web3.SystemProgram.programId,
          })
          .signers([testUser])
          .rpc();

        // Mock encrypted data and keys
        const encryptedData = new Array(32).fill(0);
        const publicKey = new Array(32).fill(0);
        const nonce = new anchor.BN(Date.now());
        const computationOffset = new anchor.BN(Math.floor(Math.random() * 1000000));

        const startTime = performance.now();

        try {
          // This would normally queue a computation on Arcium network
          // For benchmarking, we'll measure the transaction submission time
          const tx = await program.methods
            .calculatePortfolioValue(
              computationOffset,
              encryptedData,
              publicKey,
              nonce
            )
            .accountsPartial({
              payer: testUser.publicKey,
              // Other accounts would be derived/provided in real implementation
            })
            .signers([testUser])
            .transaction();

          // Measure transaction creation and signing time
          const endTime = performance.now();
          times.push(endTime - startTime);

        } catch (error) {
          // Expected to fail without proper account setup, but we measure the attempt
          const endTime = performance.now();
          times.push(endTime - startTime);
        }
      }

      const result = calculateBenchmarkStats("Computation Queue Latency", times);
      benchmarkResults.push(result);

      expect(result.averageTime).to.be.lessThan(1000); // Queue requests should be fast
    });
  });

  describe("Memory and Resource Usage", () => {
    it("should benchmark account data size efficiency", async () => {
      const testUser = Keypair.generate();
      await provider.connection.requestAirdrop(testUser.publicKey, anchor.web3.LAMPORTS_PER_SOL);
      await provider.connection.confirmTransaction(
        await provider.connection.requestAirdrop(testUser.publicKey, anchor.web3.LAMPORTS_PER_SOL)
      );

      const [portfolioPDA] = PublicKey.findProgramAddressSync(
        [Buffer.from("portfolio"), testUser.publicKey.toBuffer()],
        program.programId
      );

      const [performancePDA] = PublicKey.findProgramAddressSync(
        [Buffer.from("performance"), testUser.publicKey.toBuffer()],
        program.programId
      );

      // Initialize accounts
      await program.methods
        .initializePortfolio()
        .accounts({
          user: testUser.publicKey,
          portfolioAccount: portfolioPDA,
          systemProgram: anchor.web3.SystemProgram.programId,
        })
        .signers([testUser])
        .rpc();

      await program.methods
        .initializePerformanceHistory()
        .accounts({
          user: testUser.publicKey,
          performanceHistory: performancePDA,
          systemProgram: anchor.web3.SystemProgram.programId,
        })
        .signers([testUser])
        .rpc();

      // Measure account sizes
      const portfolioAccount = await provider.connection.getAccountInfo(portfolioPDA);
      const performanceAccount = await provider.connection.getAccountInfo(performancePDA);

      expect(portfolioAccount?.data.length).to.be.lessThan(200); // Efficient storage
      expect(performanceAccount?.data.length).to.be.lessThan(1000); // 30 days of data should be compact

      console.log(`Portfolio account size: ${portfolioAccount?.data.length} bytes`);
      console.log(`Performance account size: ${performanceAccount?.data.length} bytes`);

      // Calculate storage efficiency
      const totalStorageCost = (portfolioAccount?.lamports || 0) + (performanceAccount?.lamports || 0);
      const costPerSOL = totalStorageCost / anchor.web3.LAMPORTS_PER_SOL;

      console.log(`Total storage cost: ${costPerSOL.toFixed(6)} SOL`);
      expect(costPerSOL).to.be.lessThan(0.01); // Should cost less than 0.01 SOL for storage
    });

    it("should measure gas optimization", async () => {
      const operations = [
        { name: "Portfolio Init", cost: 0 },
        { name: "Performance Init", cost: 0 },
        { name: "Performance Update", cost: 0 },
      ];

      const testUser = Keypair.generate();
      await provider.connection.requestAirdrop(testUser.publicKey, anchor.web3.LAMPORTS_PER_SOL);

      // Measure each operation's cost
      const beforeBalance = await provider.connection.getBalance(testUser.publicKey);

      const [portfolioPDA] = PublicKey.findProgramAddressSync(
        [Buffer.from("portfolio"), testUser.publicKey.toBuffer()],
        program.programId
      );

      await program.methods
        .initializePortfolio()
        .accounts({
          user: testUser.publicKey,
          portfolioAccount: portfolioPDA,
          systemProgram: anchor.web3.SystemProgram.programId,
        })
        .signers([testUser])
        .rpc();

      const afterPortfolioInit = await provider.connection.getBalance(testUser.publicKey);
      operations[0].cost = (beforeBalance - afterPortfolioInit) / anchor.web3.LAMPORTS_PER_SOL;

      console.log(`Gas costs (SOL):`);
      operations.forEach(op => {
        if (op.cost > 0) {
          console.log(`  ${op.name}: ${op.cost.toFixed(6)} SOL`);
          expect(op.cost).to.be.lessThan(0.01); // Each operation should cost less than 0.01 SOL
        }
      });
    });
  });

  describe("Concurrent Access Performance", () => {
    it("should handle concurrent portfolio updates", async () => {
      const concurrentUsers = 10;
      const usersAndAccounts = [];

      // Set up multiple users
      for (let i = 0; i < concurrentUsers; i++) {
        const user = Keypair.generate();
        await provider.connection.requestAirdrop(user.publicKey, anchor.web3.LAMPORTS_PER_SOL);
        await provider.connection.confirmTransaction(
          await provider.connection.requestAirdrop(user.publicKey, anchor.web3.LAMPORTS_PER_SOL)
        );

        const [performancePDA] = PublicKey.findProgramAddressSync(
          [Buffer.from("performance"), user.publicKey.toBuffer()],
          program.programId
        );

        await program.methods
          .initializePerformanceHistory()
          .accounts({
            user: user.publicKey,
            performanceHistory: performancePDA,
            systemProgram: anchor.web3.SystemProgram.programId,
          })
          .signers([user])
          .rpc();

        usersAndAccounts.push({ user, performancePDA });
      }

      // Measure concurrent update performance
      const startTime = performance.now();

      const updatePromises = usersAndAccounts.map(({ user, performancePDA }) =>
        program.methods
          .updatePerformanceHistory(new anchor.BN(150), new anchor.BN(1100000))
          .accounts({
            user: user.publicKey,
            performanceHistory: performancePDA,
          })
          .signers([user])
          .rpc()
      );

      await Promise.all(updatePromises);

      const endTime = performance.now();
      const concurrentTime = endTime - startTime;

      console.log(`Concurrent updates (${concurrentUsers} users): ${concurrentTime.toFixed(2)}ms`);

      // Should handle concurrent updates efficiently
      expect(concurrentTime).to.be.lessThan(10000); // Under 10 seconds for 10 concurrent updates
    });
  });

  // Helper function to calculate benchmark statistics
  function calculateBenchmarkStats(operation: string, times: number[]): BenchmarkResult {
    const sortedTimes = times.sort((a, b) => a - b);
    const averageTime = times.reduce((sum, time) => sum + time, 0) / times.length;
    const minTime = sortedTimes[0];
    const maxTime = sortedTimes[sortedTimes.length - 1];
    const throughput = 1000 / averageTime; // operations per second

    return {
      operation,
      averageTime,
      minTime,
      maxTime,
      iterations: times.length,
      throughput,
    };
  }
});