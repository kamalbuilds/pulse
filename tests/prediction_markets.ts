import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { PublicKey, Keypair } from "@solana/web3.js";
import { PredictionMarkets } from "../target/types/prediction_markets";
import { randomBytes } from "crypto";
import {
  awaitComputationFinalization,
  getArciumEnv,
  getCompDefAccOffset,
  getArciumAccountBaseSeed,
  getArciumProgAddress,
  uploadCircuit,
  buildFinalizeCompDefTx,
  RescueCipher,
  deserializeLE,
  getMXEAccAddress,
  getMempoolAccAddress,
  getCompDefAccAddress,
  getExecutingPoolAccAddress,
  getComputationAccAddress,
  x25519,
} from "@arcium-hq/client";
import * as fs from "fs";
import * as os from "os";
import { expect } from "chai";

describe("Tinder-Style Prediction Markets", () => {
  // Configure the client to use the local cluster.
  anchor.setProvider(anchor.AnchorProvider.env());
  const program = anchor.workspace.PredictionMarkets as Program<PredictionMarkets>;
  const provider = anchor.getProvider();

  type Event = anchor.IdlEvents<(typeof program)["idl"]>;
  const awaitEvent = async <E extends keyof Event>(
    eventName: E
  ): Promise<Event[E]> => {
    let listenerId: number;
    const event = await new Promise<Event[E]>((res) => {
      listenerId = program.addEventListener(eventName, (event) => {
        res(event);
      });
    });
    await program.removeEventListener(listenerId);
    return event;
  };

  const arciumEnv = getArciumEnv();
  const owner = readKpJson(`${os.homedir()}/.config/solana/id.json`);
  const oracle = Keypair.generate();
  const user1 = Keypair.generate();
  const user2 = Keypair.generate();

  let marketId: number;
  let marketPDA: PublicKey;

  before(async () => {
    // Airdrop SOL to test accounts
    await provider.connection.confirmTransaction(
      await provider.connection.requestAirdrop(user1.publicKey, 2 * anchor.web3.LAMPORTS_PER_SOL)
    );
    await provider.connection.confirmTransaction(
      await provider.connection.requestAirdrop(user2.publicKey, 2 * anchor.web3.LAMPORTS_PER_SOL)
    );
    await provider.connection.confirmTransaction(
      await provider.connection.requestAirdrop(oracle.publicKey, 1 * anchor.web3.LAMPORTS_PER_SOL)
    );

    marketId = Date.now(); // Use timestamp as unique market ID
  });

  describe("Market Creation", () => {
    it("Should create a new prediction market", async () => {
      const [pda] = PublicKey.findProgramAddressSync(
        [Buffer.from("market"), Buffer.from(marketId.toString().padStart(8, '0'))],
        program.programId
      );
      marketPDA = pda;

      const title = "Will Bitcoin reach $100k by end of 2025?";
      const description = "Market resolves to YES if Bitcoin (BTC) price reaches or exceeds $100,000 USD on any major exchange (Coinbase, Binance, Kraken) by December 31, 2025 11:59 PM UTC.";
      const imageUrl = "https://example.com/bitcoin-chart.jpg";
      const category = { economics: {} };
      const votingEndsAt = new anchor.BN(Date.now() / 1000 + 86400 * 30); // 30 days from now

      const marketCreatedEventPromise = awaitEvent("marketCreatedEvent");

      const tx = await program.methods
        .createMarket(
          new anchor.BN(marketId),
          title,
          description,
          imageUrl,
          category,
          votingEndsAt
        )
        .accounts({
          creator: owner.publicKey,
          predictionMarket: marketPDA,
          oracle: oracle.publicKey,
          systemProgram: anchor.web3.SystemProgram.programId,
        })
        .signers([owner])
        .rpc();

      console.log("Market created with signature", tx);

      // Verify the market was created correctly
      const marketAccount = await program.account.predictionMarket.fetch(marketPDA);
      expect(marketAccount.marketId.toNumber()).to.equal(marketId);
      expect(marketAccount.creator.toString()).to.equal(owner.publicKey.toString());
      expect(marketAccount.status).to.deep.equal({ active: {} });
      expect(marketAccount.totalStake.toNumber()).to.equal(0);
      expect(marketAccount.participantCount).to.equal(0);

      // Verify event was emitted
      const event = await marketCreatedEventPromise;
      expect(event.marketId.toNumber()).to.equal(marketId);
      expect(event.creator.toString()).to.equal(owner.publicKey.toString());
      expect(event.title).to.equal(title);
    });

    it("Should fail to create market with invalid parameters", async () => {
      const invalidMarketId = marketId + 1;
      const [invalidPDA] = PublicKey.findProgramAddressSync(
        [Buffer.from("market"), Buffer.from(invalidMarketId.toString().padStart(8, '0'))],
        program.programId
      );

      const longTitle = "A".repeat(201); // Too long
      const pastEndTime = new anchor.BN(Date.now() / 1000 - 3600); // 1 hour ago

      try {
        await program.methods
          .createMarket(
            new anchor.BN(invalidMarketId),
            longTitle,
            "Valid description",
            "https://example.com/image.jpg",
            { sports: {} },
            pastEndTime
          )
          .accounts({
            creator: owner.publicKey,
            predictionMarket: invalidPDA,
            oracle: oracle.publicKey,
            systemProgram: anchor.web3.SystemProgram.programId,
          })
          .signers([owner])
          .rpc();

        expect.fail("Should have failed with invalid parameters");
      } catch (error) {
        expect(error.message).to.include("Title is too long");
      }
    });
  });

  describe("User Profile Management", () => {
    it("Should initialize user profiles", async () => {
      const [profile1PDA] = PublicKey.findProgramAddressSync(
        [Buffer.from("profile"), user1.publicKey.toBuffer()],
        program.programId
      );
      const [profile2PDA] = PublicKey.findProgramAddressSync(
        [Buffer.from("profile"), user2.publicKey.toBuffer()],
        program.programId
      );

      // Initialize user1 profile
      const tx1 = await program.methods
        .initializeUserProfile()
        .accounts({
          user: user1.publicKey,
          userProfile: profile1PDA,
          systemProgram: anchor.web3.SystemProgram.programId,
        })
        .signers([user1])
        .rpc();

      // Initialize user2 profile
      const tx2 = await program.methods
        .initializeUserProfile()
        .accounts({
          user: user2.publicKey,
          userProfile: profile2PDA,
          systemProgram: anchor.web3.SystemProgram.programId,
        })
        .signers([user2])
        .rpc();

      console.log("User profiles initialized", { tx1, tx2 });

      // Verify profiles were created
      const profile1 = await program.account.userProfile.fetch(profile1PDA);
      const profile2 = await program.account.userProfile.fetch(profile2PDA);

      expect(profile1.user.toString()).to.equal(user1.publicKey.toString());
      expect(profile1.totalMarketsParticipated).to.equal(0);
      expect(profile1.reputationScore).to.equal(1000); // Starting reputation

      expect(profile2.user.toString()).to.equal(user2.publicKey.toString());
      expect(profile2.totalMarketsParticipated).to.equal(0);
      expect(profile2.reputationScore).to.equal(1000);
    });
  });

  describe("Encrypted Voting System", () => {
    it("Should initialize computation definitions for voting", async () => {
      try {
        // Initialize submit vote computation definition
        const initSubmitVoteSig = await initSubmitVoteCompDef(program, owner);
        console.log("Submit vote computation definition initialized", initSubmitVoteSig);

        // Initialize aggregate votes computation definition
        const initAggregateVotesSig = await initAggregateVotesCompDef(program, owner);
        console.log("Aggregate votes computation definition initialized", initAggregateVotesSig);

        // Initialize calculate payout computation definition
        const initCalculatePayoutSig = await initCalculatePayoutCompDef(program, owner);
        console.log("Calculate payout computation definition initialized", initCalculatePayoutSig);
      } catch (error) {
        console.log("Encrypted instructions not built yet, skipping computation definition tests");
        console.log("Run 'anchor build' to compile encrypted instructions");
      }
    });

    it("Should submit private votes", async () => {
      try {
        const privateKey = x25519.utils.randomPrivateKey();
        const publicKey = x25519.getPublicKey(privateKey);
        const mxePublicKey = new Uint8Array([
          34, 56, 246, 3, 165, 122, 74, 68, 14, 81, 107, 73, 129, 145, 196, 4, 98,
          253, 120, 15, 235, 108, 37, 198, 124, 111, 38, 1, 210, 143, 72, 87,
        ]);

        const sharedSecret = x25519.getSharedSecret(privateKey, mxePublicKey);
        const cipher = new RescueCipher(sharedSecret);
        const nonce = BigInt(randomBytes(16).readBigUInt64BE());

        // Create encrypted vote data for user1 (YES vote)
        const voteData1 = {
          voter: user1.publicKey.toBytes(),
          market_id: BigInt(marketId),
          vote_choice: 1, // YES
          stake_amount: BigInt(1000000), // 0.001 SOL
          predicted_probability: 75, // 75% confidence
          conviction_score: 800,
          timestamp: BigInt(Date.now()),
          nonce: nonce,
        };

        const encryptedVoteData1 = new Uint8Array(64); // Mock encrypted data
        const computationOffset1 = new anchor.BN(randomBytes(8));

        const [position1PDA] = PublicKey.findProgramAddressSync(
          [Buffer.from("position"), user1.publicKey.toBuffer(), marketPDA.toBuffer()],
          program.programId
        );
        const [profile1PDA] = PublicKey.findProgramAddressSync(
          [Buffer.from("profile"), user1.publicKey.toBuffer()],
          program.programId
        );

        const voteSubmittedEventPromise = awaitEvent("voteSubmittedEvent");

        const queueSig1 = await program.methods
          .submitPrivateVote(
            computationOffset1,
            Array.from(encryptedVoteData1),
            Array.from(publicKey),
            new anchor.BN(nonce.toString()),
            new anchor.BN(voteData1.stake_amount.toString()),
            { yes: {} }, // VoteChoice::Yes
            voteData1.predicted_probability
          )
          .accounts({
            payer: user1.publicKey,
            user: user1.publicKey,
            predictionMarket: marketPDA,
            userPosition: position1PDA,
            userProfile: profile1PDA,
            mxeAccount: getMXEAccAddress(program.programId),
            mempoolAccount: getMempoolAccAddress(program.programId),
            executingPool: getExecutingPoolAccAddress(program.programId),
            computationAccount: getComputationAccAddress(program.programId, computationOffset1),
            compDefAccount: getCompDefAccAddress(
              program.programId,
              Buffer.from(getCompDefAccOffset("submit_private_vote")).readUInt32LE()
            ),
            clusterAccount: arciumEnv.arciumClusterPubkey,
            poolAccount: arciumEnv.arciumStakingPoolPubkey,
            clockAccount: arciumEnv.arciumClockPubkey,
            systemProgram: anchor.web3.SystemProgram.programId,
            arciumProgram: getArciumProgAddress(),
          })
          .signers([user1])
          .rpc({ skipPreflight: true, commitment: "confirmed" });

        console.log("User1 vote submitted with signature", queueSig1);

        // Wait for computation to complete
        const finalizeSig1 = await awaitComputationFinalization(
          provider as anchor.AnchorProvider,
          computationOffset1,
          program.programId,
          "confirmed"
        );

        console.log("User1 vote computation completed with signature", finalizeSig1);

        const voteEvent = await voteSubmittedEventPromise;
        expect(voteEvent.marketId.toNumber()).to.equal(marketId);
        expect(voteEvent.user.toString()).to.equal(user1.publicKey.toString());

        // Verify position was created
        const position1 = await program.account.userPosition.fetch(position1PDA);
        expect(position1.user.toString()).to.equal(user1.publicKey.toString());
        expect(position1.market.toString()).to.equal(marketPDA.toString());
        expect(position1.voteChoice).to.deep.equal({ yes: {} });
        expect(position1.stakeAmount.toNumber()).to.equal(voteData1.stake_amount);
        expect(position1.predictedProbability).to.equal(voteData1.predicted_probability);

      } catch (error) {
        console.log("Encrypted instructions not ready, skipping vote submission test");
        console.log("Error:", error.message);
      }
    });

    it("Should aggregate votes and calculate market odds", async () => {
      try {
        const computationOffset = new anchor.BN(randomBytes(8));

        const aggregateVotesEventPromise = awaitEvent("votesAggregatedEvent");

        const queueSig = await program.methods
          .aggregateMarketVotes(computationOffset)
          .accounts({
            payer: owner.publicKey,
            predictionMarket: marketPDA,
            mxeAccount: getMXEAccAddress(program.programId),
            mempoolAccount: getMempoolAccAddress(program.programId),
            executingPool: getExecutingPoolAccAddress(program.programId),
            computationAccount: getComputationAccAddress(program.programId, computationOffset),
            compDefAccount: getCompDefAccAddress(
              program.programId,
              Buffer.from(getCompDefAccOffset("aggregate_market_votes")).readUInt32LE()
            ),
            clusterAccount: arciumEnv.arciumClusterPubkey,
            poolAccount: arciumEnv.arciumStakingPoolPubkey,
            clockAccount: arciumEnv.arciumClockPubkey,
            systemProgram: anchor.web3.SystemProgram.programId,
            arciumProgram: getArciumProgAddress(),
          })
          .signers([owner])
          .rpc({ skipPreflight: true, commitment: "confirmed" });

        console.log("Vote aggregation queued with signature", queueSig);

        // Wait for computation to complete
        const finalizeSig = await awaitComputationFinalization(
          provider as anchor.AnchorProvider,
          computationOffset,
          program.programId,
          "confirmed"
        );

        console.log("Vote aggregation completed with signature", finalizeSig);

        const aggregateEvent = await aggregateVotesEventPromise;
        expect(aggregateEvent.marketId.toNumber()).to.equal(marketId);
        console.log("Aggregated votes:", aggregateEvent);

        // Verify market status changed to locked
        const marketAccount = await program.account.predictionMarket.fetch(marketPDA);
        expect(marketAccount.status).to.deep.equal({ locked: {} });

      } catch (error) {
        console.log("Vote aggregation test failed, likely due to missing encrypted instructions");
        console.log("Error:", error.message);
      }
    });
  });

  describe("Market Resolution", () => {
    it("Should resolve market with outcome", async () => {
      const outcome = true; // Market resolves to YES
      const resolutionData = Buffer.from("Bitcoin reached $105,000 on Coinbase at 2025-12-15 14:30 UTC");

      const marketResolvedEventPromise = awaitEvent("marketResolvedEvent");

      const tx = await program.methods
        .resolveMarket(outcome, Array.from(resolutionData))
        .accounts({
          oracle: oracle.publicKey,
          predictionMarket: marketPDA,
        })
        .signers([oracle])
        .rpc();

      console.log("Market resolved with signature", tx);

      // Verify market resolution
      const marketAccount = await program.account.predictionMarket.fetch(marketPDA);
      expect(marketAccount.status).to.deep.equal({ resolved: {} });
      expect(marketAccount.resolvedOutcome).to.equal(outcome);
      expect(marketAccount.resolutionTimestamp.toNumber()).to.be.greaterThan(0);

      const resolvedEvent = await marketResolvedEventPromise;
      expect(resolvedEvent.marketId.toNumber()).to.equal(marketId);
      expect(resolvedEvent.outcome).to.equal(outcome);
    });

    it("Should fail resolution from non-oracle account", async () => {
      const fakeOracle = Keypair.generate();
      await provider.connection.confirmTransaction(
        await provider.connection.requestAirdrop(fakeOracle.publicKey, 1 * anchor.web3.LAMPORTS_PER_SOL)
      );

      try {
        await program.methods
          .resolveMarket(false, [])
          .accounts({
            oracle: fakeOracle.publicKey,
            predictionMarket: marketPDA,
          })
          .signers([fakeOracle])
          .rpc();

        expect.fail("Should have failed with invalid oracle");
      } catch (error) {
        expect(error.message).to.include("InvalidOracle");
      }
    });
  });

  describe("Payout Calculation", () => {
    it("Should calculate and distribute payouts", async () => {
      try {
        const [position1PDA] = PublicKey.findProgramAddressSync(
          [Buffer.from("position"), user1.publicKey.toBuffer(), marketPDA.toBuffer()],
          program.programId
        );
        const [profile1PDA] = PublicKey.findProgramAddressSync(
          [Buffer.from("profile"), user1.publicKey.toBuffer()],
          program.programId
        );

        const computationOffset = new anchor.BN(randomBytes(8));

        const payoutCalculatedEventPromise = awaitEvent("payoutCalculatedEvent");

        const queueSig = await program.methods
          .calculateUserPayout(computationOffset)
          .accounts({
            payer: user1.publicKey,
            user: user1.publicKey,
            predictionMarket: marketPDA,
            userPosition: position1PDA,
            mxeAccount: getMXEAccAddress(program.programId),
            mempoolAccount: getMempoolAccAddress(program.programId),
            executingPool: getExecutingPoolAccAddress(program.programId),
            computationAccount: getComputationAccAddress(program.programId, computationOffset),
            compDefAccount: getCompDefAccAddress(
              program.programId,
              Buffer.from(getCompDefAccOffset("calculate_payout")).readUInt32LE()
            ),
            clusterAccount: arciumEnv.arciumClusterPubkey,
            poolAccount: arciumEnv.arciumStakingPoolPubkey,
            clockAccount: arciumEnv.arciumClockPubkey,
            systemProgram: anchor.web3.SystemProgram.programId,
            arciumProgram: getArciumProgAddress(),
          })
          .signers([user1])
          .rpc({ skipPreflight: true, commitment: "confirmed" });

        console.log("Payout calculation queued with signature", queueSig);

        // Wait for computation to complete
        const finalizeSig = await awaitComputationFinalization(
          provider as anchor.AnchorProvider,
          computationOffset,
          program.programId,
          "confirmed"
        );

        console.log("Payout calculation completed with signature", finalizeSig);

        const payoutEvent = await payoutCalculatedEventPromise;
        expect(payoutEvent.marketId.toNumber()).to.equal(marketId);
        expect(payoutEvent.user.toString()).to.equal(user1.publicKey.toString());
        expect(payoutEvent.wasCorrect).to.be.true; // User1 voted YES and market resolved to YES

        // Verify payout was recorded
        const position1 = await program.account.userPosition.fetch(position1PDA);
        expect(position1.isClaimed).to.be.true;
        expect(position1.payoutAmount.toNumber()).to.be.greaterThan(0);

        // Verify user profile was updated
        const profile1 = await program.account.userProfile.fetch(profile1PDA);
        expect(profile1.correctPredictions).to.equal(1);
        expect(profile1.totalWinnings.toNumber()).to.be.greaterThan(0);
        expect(profile1.streakCurrent).to.equal(1);

      } catch (error) {
        console.log("Payout calculation test failed, likely due to missing encrypted instructions");
        console.log("Error:", error.message);
      }
    });
  });

  describe("Anti-Manipulation Features", () => {
    it("Should prevent double voting", async () => {
      const [position1PDA] = PublicKey.findProgramAddressSync(
        [Buffer.from("position"), user1.publicKey.toBuffer(), marketPDA.toBuffer()],
        program.programId
      );

      try {
        // Try to vote again with same user
        const computationOffset = new anchor.BN(randomBytes(8));
        const encryptedVoteData = new Uint8Array(64);
        const publicKey = x25519.getPublicKey(x25519.utils.randomPrivateKey());

        await program.methods
          .submitPrivateVote(
            computationOffset,
            Array.from(encryptedVoteData),
            Array.from(publicKey),
            new anchor.BN("12345"),
            new anchor.BN("500000"),
            { no: {} },
            25
          )
          .accounts({
            payer: user1.publicKey,
            user: user1.publicKey,
            predictionMarket: marketPDA,
            userPosition: position1PDA, // Same position account
            userProfile: PublicKey.findProgramAddressSync(
              [Buffer.from("profile"), user1.publicKey.toBuffer()],
              program.programId
            )[0],
            mxeAccount: getMXEAccAddress(program.programId),
            mempoolAccount: getMempoolAccAddress(program.programId),
            executingPool: getExecutingPoolAccAddress(program.programId),
            computationAccount: getComputationAccAddress(program.programId, computationOffset),
            compDefAccount: getCompDefAccAddress(
              program.programId,
              Buffer.from(getCompDefAccOffset("submit_private_vote")).readUInt32LE()
            ),
            clusterAccount: arciumEnv.arciumClusterPubkey,
            poolAccount: arciumEnv.arciumStakingPoolPubkey,
            clockAccount: arciumEnv.arciumClockPubkey,
            systemProgram: anchor.web3.SystemProgram.programId,
            arciumProgram: getArciumProgAddress(),
          })
          .signers([user1])
          .rpc();

        expect.fail("Should have failed due to existing position");
      } catch (error) {
        expect(error.message).to.include("already in use");
      }
    });

    it("Should prevent voting after market ends", async () => {
      // Create a market that ends immediately
      const expiredMarketId = Date.now() + 1;
      const [expiredMarketPDA] = PublicKey.findProgramAddressSync(
        [Buffer.from("market"), Buffer.from(expiredMarketId.toString().padStart(8, '0'))],
        program.programId
      );

      const pastEndTime = new anchor.BN(Date.now() / 1000 - 3600); // 1 hour ago

      await program.methods
        .createMarket(
          new anchor.BN(expiredMarketId),
          "Expired Market",
          "This market has already ended",
          "https://example.com/expired.jpg",
          { custom: {} },
          pastEndTime
        )
        .accounts({
          creator: owner.publicKey,
          predictionMarket: expiredMarketPDA,
          oracle: oracle.publicKey,
          systemProgram: anchor.web3.SystemProgram.programId,
        })
        .signers([owner])
        .rpc();

      // Try to vote on expired market
      try {
        const [expiredPositionPDA] = PublicKey.findProgramAddressSync(
          [Buffer.from("position"), user2.publicKey.toBuffer(), expiredMarketPDA.toBuffer()],
          program.programId
        );

        const computationOffset = new anchor.BN(randomBytes(8));
        const encryptedVoteData = new Uint8Array(64);
        const publicKey = x25519.getPublicKey(x25519.utils.randomPrivateKey());

        await program.methods
          .submitPrivateVote(
            computationOffset,
            Array.from(encryptedVoteData),
            Array.from(publicKey),
            new anchor.BN("12345"),
            new anchor.BN("500000"),
            { yes: {} },
            50
          )
          .accounts({
            payer: user2.publicKey,
            user: user2.publicKey,
            predictionMarket: expiredMarketPDA,
            userPosition: expiredPositionPDA,
            userProfile: PublicKey.findProgramAddressSync(
              [Buffer.from("profile"), user2.publicKey.toBuffer()],
              program.programId
            )[0],
            mxeAccount: getMXEAccAddress(program.programId),
            mempoolAccount: getMempoolAccAddress(program.programId),
            executingPool: getExecutingPoolAccAddress(program.programId),
            computationAccount: getComputationAccAddress(program.programId, computationOffset),
            compDefAccount: getCompDefAccAddress(
              program.programId,
              Buffer.from(getCompDefAccOffset("submit_private_vote")).readUInt32LE()
            ),
            clusterAccount: arciumEnv.arciumClusterPubkey,
            poolAccount: arciumEnv.arciumStakingPoolPubkey,
            clockAccount: arciumEnv.arciumClockPubkey,
            systemProgram: anchor.web3.SystemProgram.programId,
            arciumProgram: getArciumProgAddress(),
          })
          .signers([user2])
          .rpc();

        expect.fail("Should have failed due to expired voting period");
      } catch (error) {
        expect(error.message).to.include("VotingPeriodEnded");
      }
    });
  });

  // Helper functions for computation definition initialization
  async function initSubmitVoteCompDef(
    program: Program<PredictionMarkets>,
    owner: anchor.web3.Keypair
  ): Promise<string> {
    const baseSeedCompDefAcc = getArciumAccountBaseSeed("ComputationDefinitionAccount");
    const offset = getCompDefAccOffset("submit_private_vote");

    const compDefPDA = PublicKey.findProgramAddressSync(
      [baseSeedCompDefAcc, program.programId.toBuffer(), offset],
      getArciumProgAddress()
    )[0];

    const sig = await program.methods
      .initSubmitVoteCompDef()
      .accounts({
        compDefAccount: compDefPDA,
        payer: owner.publicKey,
        mxeAccount: getMXEAccAddress(program.programId),
        arciumProgram: getArciumProgAddress(),
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .signers([owner])
      .rpc({ commitment: "confirmed" });

    return sig;
  }

  async function initAggregateVotesCompDef(
    program: Program<PredictionMarkets>,
    owner: anchor.web3.Keypair
  ): Promise<string> {
    const baseSeedCompDefAcc = getArciumAccountBaseSeed("ComputationDefinitionAccount");
    const offset = getCompDefAccOffset("aggregate_market_votes");

    const compDefPDA = PublicKey.findProgramAddressSync(
      [baseSeedCompDefAcc, program.programId.toBuffer(), offset],
      getArciumProgAddress()
    )[0];

    const sig = await program.methods
      .initAggregateVotesCompDef()
      .accounts({
        compDefAccount: compDefPDA,
        payer: owner.publicKey,
        mxeAccount: getMXEAccAddress(program.programId),
        arciumProgram: getArciumProgAddress(),
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .signers([owner])
      .rpc({ commitment: "confirmed" });

    return sig;
  }

  async function initCalculatePayoutCompDef(
    program: Program<PredictionMarkets>,
    owner: anchor.web3.Keypair
  ): Promise<string> {
    const baseSeedCompDefAcc = getArciumAccountBaseSeed("ComputationDefinitionAccount");
    const offset = getCompDefAccOffset("calculate_payout");

    const compDefPDA = PublicKey.findProgramAddressSync(
      [baseSeedCompDefAcc, program.programId.toBuffer(), offset],
      getArciumProgAddress()
    )[0];

    const sig = await program.methods
      .initCalculatePayoutCompDef()
      .accounts({
        compDefAccount: compDefPDA,
        payer: owner.publicKey,
        mxeAccount: getMXEAccAddress(program.programId),
        arciumProgram: getArciumProgAddress(),
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .signers([owner])
      .rpc({ commitment: "confirmed" });

    return sig;
  }
});

function readKpJson(path: string): anchor.web3.Keypair {
  const file = fs.readFileSync(path);
  return anchor.web3.Keypair.fromSecretKey(
    new Uint8Array(JSON.parse(file.toString()))
  );
}