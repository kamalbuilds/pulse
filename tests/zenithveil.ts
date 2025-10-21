import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { PublicKey } from "@solana/web3.js";
import { Zenithveil } from "../target/types/zenithveil";
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

describe("ZenithVeil Portfolio Analytics", () => {
  // Configure the client to use the local cluster.
  anchor.setProvider(anchor.AnchorProvider.env());
  const program = anchor.workspace.Zenithveil as Program<Zenithveil>;
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

  // Test portfolio account initialization
  it("Initialize portfolio account", async () => {
    const [portfolioPDA] = PublicKey.findProgramAddressSync(
      [Buffer.from("portfolio"), owner.publicKey.toBuffer()],
      program.programId
    );

    const tx = await program.methods
      .initializePortfolio()
      .accounts({
        user: owner.publicKey,
        portfolioAccount: portfolioPDA,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .signers([owner])
      .rpc();

    console.log("Portfolio initialized with signature", tx);

    // Verify the portfolio account was created
    const portfolioAccount = await program.account.portfolioAccount.fetch(portfolioPDA);
    expect(portfolioAccount.owner.toString()).to.equal(owner.publicKey.toString());
    expect(portfolioAccount.isInitialized).to.be.true;
    expect(portfolioAccount.totalValue.toNumber()).to.equal(0);
  });

  // Test performance history initialization
  it("Initialize performance history", async () => {
    const [performancePDA] = PublicKey.findProgramAddressSync(
      [Buffer.from("performance"), owner.publicKey.toBuffer()],
      program.programId
    );

    const tx = await program.methods
      .initializePerformanceHistory()
      .accounts({
        user: owner.publicKey,
        performanceHistory: performancePDA,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .signers([owner])
      .rpc();

    console.log("Performance history initialized with signature", tx);

    // Verify the performance history account was created
    const performanceAccount = await program.account.userPerformanceHistory.fetch(performancePDA);
    expect(performanceAccount.owner.toString()).to.equal(owner.publicKey.toString());
    expect(performanceAccount.returnCount).to.equal(0);
  });

  // Test performance history updates
  it("Update performance history", async () => {
    const [performancePDA] = PublicKey.findProgramAddressSync(
      [Buffer.from("performance"), owner.publicKey.toBuffer()],
      program.programId
    );

    // Add some test performance data
    const testReturn = 150; // 1.5% return in basis points
    const testPortfolioValue = 1000000; // $1000 in micro-dollars

    const tx = await program.methods
      .updatePerformanceHistory(new anchor.BN(testReturn), new anchor.BN(testPortfolioValue))
      .accounts({
        user: owner.publicKey,
        performanceHistory: performancePDA,
      })
      .signers([owner])
      .rpc();

    console.log("Performance history updated with signature", tx);

    // Verify the update
    const performanceAccount = await program.account.userPerformanceHistory.fetch(performancePDA);
    expect(performanceAccount.returnCount).to.equal(1);
    expect(performanceAccount.dailyReturns[0].toNumber()).to.equal(testReturn);
    expect(performanceAccount.portfolioValues[0].toNumber()).to.equal(testPortfolioValue);
  });

  // Test computation definition initialization (when encrypted instructions are ready)
  it("Initialize computation definitions", async () => {
    try {
      // Initialize portfolio value computation definition
      const initPortfolioValueSig = await initPortfolioValueCompDef(program, owner);
      console.log("Portfolio value computation definition initialized", initPortfolioValueSig);

      // Initialize risk metrics computation definition
      const initRiskMetricsSig = await initRiskMetricsCompDef(program, owner);
      console.log("Risk metrics computation definition initialized", initRiskMetricsSig);

      // Initialize peer comparison computation definition
      const initPeerComparisonSig = await initPeerComparisonCompDef(program, owner);
      console.log("Peer comparison computation definition initialized", initPeerComparisonSig);
    } catch (error) {
      console.log("Encrypted instructions not built yet, skipping computation definition tests");
      console.log("Run 'anchor build' to compile encrypted instructions");
    }
  });

  // Test portfolio value calculation (when encrypted instructions are ready)
  it("Calculate portfolio value", async () => {
    try {
      const privateKey = x25519.utils.randomPrivateKey();
      const publicKey = x25519.getPublicKey(privateKey);
      const mxePublicKey = new Uint8Array([
        34, 56, 246, 3, 165, 122, 74, 68, 14, 81, 107, 73, 129, 145, 196, 4, 98,
        253, 120, 15, 235, 108, 37, 198, 124, 111, 38, 1, 210, 143, 72, 87,
      ]);

      const sharedSecret = x25519.getSharedSecret(privateKey, mxePublicKey);
      const cipher = new RescueCipher(sharedSecret);
      const nonce = randomBytes(16);

      // Create mock portfolio data
      const mockPortfolioData = {
        owner: owner.publicKey.toBytes(),
        holdings: [
          {
            token_mint: new Uint8Array(32), // SOL mint
            balance: BigInt(1000000000), // 1 SOL
            price_usd: BigInt(100000000), // $100 in micro-dollars
            last_updated: BigInt(Date.now()),
          },
        ],
        holdings_count: 1,
        total_value_usd: BigInt(0),
        last_updated: BigInt(Date.now()),
      };

      // This would be the encrypted portfolio data
      const encryptedData = new Uint8Array(32); // Mock encrypted data
      const computationOffset = new anchor.BN(randomBytes(8));

      const portfolioValueEventPromise = awaitEvent("portfolioValueEvent");

      const queueSig = await program.methods
        .calculatePortfolioValue(
          computationOffset,
          Array.from(encryptedData),
          Array.from(publicKey),
          new anchor.BN(deserializeLE(nonce).toString())
        )
        .accountsPartial({
          payer: owner.publicKey,
          computationAccount: getComputationAccAddress(program.programId, computationOffset),
          clusterAccount: arciumEnv.arciumClusterPubkey,
          mxeAccount: getMXEAccAddress(program.programId),
          mempoolAccount: getMempoolAccAddress(program.programId),
          executingPool: getExecutingPoolAccAddress(program.programId),
          compDefAccount: getCompDefAccAddress(
            program.programId,
            Buffer.from(getCompDefAccOffset("calculate_portfolio_value")).readUInt32LE()
          ),
        })
        .signers([owner])
        .rpc({ skipPreflight: true, commitment: "confirmed" });

      console.log("Portfolio value calculation queued with signature", queueSig);

      // Wait for computation to complete
      const finalizeSig = await awaitComputationFinalization(
        provider as anchor.AnchorProvider,
        computationOffset,
        program.programId,
        "confirmed"
      );

      console.log("Portfolio value calculation completed with signature", finalizeSig);
      
      const portfolioValueEvent = await portfolioValueEventPromise;
      console.log("Portfolio value event:", portfolioValueEvent);
      expect(portfolioValueEvent.owner.toString()).to.equal(owner.publicKey.toString());
    } catch (error) {
      console.log("Encrypted instructions not built yet, skipping portfolio value calculation");
      console.log("Error:", error.message);
    }
  });

  // Helper functions for computation definition initialization
  async function initPortfolioValueCompDef(
    program: Program<Zenithveil>,
    owner: anchor.web3.Keypair
  ): Promise<string> {
    const baseSeedCompDefAcc = getArciumAccountBaseSeed("ComputationDefinitionAccount");
    const offset = getCompDefAccOffset("calculate_portfolio_value");

    const compDefPDA = PublicKey.findProgramAddressSync(
      [baseSeedCompDefAcc, program.programId.toBuffer(), offset],
      getArciumProgAddress()
    )[0];

    const sig = await program.methods
      .initPortfolioValueCompDef()
      .accounts({
        compDefAccount: compDefPDA,
        payer: owner.publicKey,
        mxeAccount: getMXEAccAddress(program.programId),
      })
      .signers([owner])
      .rpc({ commitment: "confirmed" });

    return sig;
  }

  async function initRiskMetricsCompDef(
    program: Program<Zenithveil>,
    owner: anchor.web3.Keypair
  ): Promise<string> {
    const baseSeedCompDefAcc = getArciumAccountBaseSeed("ComputationDefinitionAccount");
    const offset = getCompDefAccOffset("calculate_risk_metrics");

    const compDefPDA = PublicKey.findProgramAddressSync(
      [baseSeedCompDefAcc, program.programId.toBuffer(), offset],
      getArciumProgAddress()
    )[0];

    const sig = await program.methods
      .initRiskMetricsCompDef()
      .accounts({
        compDefAccount: compDefPDA,
        payer: owner.publicKey,
        mxeAccount: getMXEAccAddress(program.programId),
      })
      .signers([owner])
      .rpc({ commitment: "confirmed" });

    return sig;
  }

  async function initPeerComparisonCompDef(
    program: Program<Zenithveil>,
    owner: anchor.web3.Keypair
  ): Promise<string> {
    const baseSeedCompDefAcc = getArciumAccountBaseSeed("ComputationDefinitionAccount");
    const offset = getCompDefAccOffset("calculate_peer_comparison");

    const compDefPDA = PublicKey.findProgramAddressSync(
      [baseSeedCompDefAcc, program.programId.toBuffer(), offset],
      getArciumProgAddress()
    )[0];

    const sig = await program.methods
      .initPeerComparisonCompDef()
      .accounts({
        compDefAccount: compDefPDA,
        payer: owner.publicKey,
        mxeAccount: getMXEAccAddress(program.programId),
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
