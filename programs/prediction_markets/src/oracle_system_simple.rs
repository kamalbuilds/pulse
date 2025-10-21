use anchor_lang::prelude::*;

// Simple oracle system without Arcium MPC for basic Solana build

#[derive(AnchorSerialize, AnchorDeserialize, Clone, PartialEq)]
pub enum OracleType {
    UmaOptimistic = 0,
    ChainlinkPrice = 1,
    CustomValidated = 2,
    Community = 3,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, PartialEq)]
pub enum ResolutionStatus {
    Proposed = 0,
    Disputed = 1,
    Pending = 2,
    Finalized = 3,
    Invalid = 4,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub struct DataSource {
    pub url: [u8; 200],
    pub api_key_hash: [u8; 32],
    pub query_path: [u8; 100],
}

// Basic Oracle Proposal without MPC complexity
#[account]
pub struct OracleProposal {
    pub market: Pubkey,
    pub proposer: Pubkey,
    pub oracle_type: OracleType,
    pub proposed_outcome: bool,
    pub confidence_score: u8,
    pub proposal_timestamp: i64,
    pub challenge_period_end: i64,
    pub bond_amount: u64,
    pub status: ResolutionStatus,
    pub dispute_count: u8,
    pub final_outcome: Option<bool>,
    pub resolution_metadata: [u8; 500],
    pub bump: u8,
}

impl OracleProposal {
    pub const LEN: usize = 8 + 32 + 32 + 1 + 1 + 1 + 8 + 8 + 8 + 1 + 1 + 1 + 500 + 1;

    pub fn calculate_required_bond(&self, oracle_type: &OracleType) -> u64 {
        match oracle_type {
            OracleType::UmaOptimistic => 100_000_000,     // 0.1 SOL
            OracleType::ChainlinkPrice => 50_000_000,     // 0.05 SOL
            OracleType::CustomValidated => 75_000_000,    // 0.075 SOL
            OracleType::Community => 25_000_000,          // 0.025 SOL
        }
    }
}

// Simple Oracle Validator
#[account]
pub struct OracleValidator {
    pub validator: Pubkey,
    pub stake_amount: u64,
    pub reputation_score: u16,
    pub total_resolutions: u32,
    pub correct_resolutions: u32,
    pub last_activity: i64,
    pub is_active: bool,
    pub specialization: Vec<u8>,
    pub bond_locked: u64,
    pub slash_count: u8,
    pub bump: u8,
}

impl OracleValidator {
    pub const LEN: usize = 8 + 32 + 8 + 2 + 4 + 4 + 8 + 1 + 50 + 8 + 1 + 1; // Estimated with Vec allocation

    pub fn is_eligible_validator(&self, min_stake: u64, min_accuracy: f64) -> bool {
        if !self.is_active || self.stake_amount < min_stake {
            return false;
        }

        if self.total_resolutions == 0 {
            return true; // New validators are eligible
        }

        let accuracy = self.correct_resolutions as f64 / self.total_resolutions as f64;
        accuracy >= min_accuracy
    }
}

// Oracle Dispute
#[account]
pub struct OracleDispute {
    pub proposal: Pubkey,
    pub disputer: Pubkey,
    pub dispute_reason: String,
    pub counter_evidence_hash: [u8; 32],
    pub dispute_timestamp: i64,
    pub dispute_bond: u64,
    pub is_resolved: bool,
    pub was_valid: Option<bool>,
    pub bump: u8,
}

impl OracleDispute {
    pub const LEN: usize = 8 + 32 + 32 + 500 + 32 + 8 + 8 + 1 + 1 + 1; // Estimated with String allocation
}