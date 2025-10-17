use anchor_lang::prelude::*;
use anchor_spl::token::{self, Token, TokenAccount, Transfer};
use arcium_anchor::{
    comp_def_offset,
    derive_cluster_pda,
    derive_comp_def_pda,
    derive_comp_pda,
    derive_execpool_pda,
    derive_mempool_pda,
    derive_mxe_pda,
    init_comp_def,
    queue_computation,
    ComputationOutputs,
    ARCIUM_CLOCK_ACCOUNT_ADDRESS,
    ARCIUM_STAKING_POOL_ACCOUNT_ADDRESS,
};
use arcium_client::idl::arcium::{
    accounts::{
        ClockAccount, Cluster, ComputationDefinitionAccount, PersistentMXEAccount, StakingPoolAccount
    },
    program::Arcium,
    types::Argument,
};
use arcium_macros::{
    arcium_callback,
    arcium_program,
    callback_accounts,
    init_computation_definition_accounts,
    queue_computation_accounts,
};

pub mod oracle_system;
pub use oracle_system::*;

// Computation definition offsets for prediction markets
const COMP_DEF_OFFSET_SUBMIT_VOTE: u32 = comp_def_offset("submit_private_vote");
const COMP_DEF_OFFSET_AGGREGATE_VOTES: u32 = comp_def_offset("aggregate_market_votes");
const COMP_DEF_OFFSET_CALCULATE_PAYOUT: u32 = comp_def_offset("calculate_payout");
const COMP_DEF_OFFSET_ORACLE_VOTE: u32 = comp_def_offset("submit_encrypted_oracle_vote");
const COMP_DEF_OFFSET_ORACLE_CONSENSUS: u32 = comp_def_offset("calculate_oracle_consensus");
const COMP_DEF_OFFSET_DETECT_MANIPULATION: u32 = comp_def_offset("detect_manipulation_patterns");

declare_id!("11111111111111111111111111111112");

// Market status enumeration
#[derive(AnchorSerialize, AnchorDeserialize, Clone, PartialEq)]
pub enum MarketStatus {
    Active,      // Accepting votes
    Locked,      // Voting closed, awaiting resolution
    Resolved,    // Outcome determined
    Settled,     // Payouts distributed
    Cancelled,   // Market cancelled
}

// Vote choice enumeration
#[derive(AnchorSerialize, AnchorDeserialize, Clone, PartialEq)]
pub enum VoteChoice {
    Yes,    // Swipe right
    No,     // Swipe left
    Skip,   // No vote
}

// Market category enumeration
#[derive(AnchorSerialize, AnchorDeserialize, Clone, PartialEq)]
pub enum MarketCategory {
    Sports = 0,
    Politics = 1,
    Economics = 2,
    Technology = 3,
    Entertainment = 4,
    Weather = 5,
    Custom = 99,
}

// Main prediction market account
#[account]
pub struct PredictionMarket {
    pub market_id: u64,
    pub creator: Pubkey,
    pub title: [u8; 200],           // UTF-8 encoded title
    pub description: [u8; 1000],    // UTF-8 encoded description
    pub image_url: [u8; 200],       // UTF-8 encoded image URL
    pub category: MarketCategory,
    pub status: MarketStatus,
    pub created_at: i64,
    pub voting_ends_at: i64,
    pub resolution_timestamp: i64,
    pub total_stake: u64,
    pub yes_stake: u64,
    pub no_stake: u64,
    pub participant_count: u32,
    pub oracle_pubkey: Pubkey,
    pub resolved_outcome: Option<bool>,
    pub resolution_data: [u8; 500],  // Additional resolution metadata
    pub bump: u8,
}

// User position in a specific market
#[account]
pub struct UserPosition {
    pub user: Pubkey,
    pub market: Pubkey,
    pub vote_choice: VoteChoice,
    pub stake_amount: u64,
    pub predicted_probability: u8,   // 0-100
    pub timestamp: i64,
    pub is_claimed: bool,
    pub payout_amount: u64,
    pub computation_id: [u8; 32],    // Arcium computation ID
    pub bump: u8,
}

// User profile and statistics
#[account]
pub struct UserProfile {
    pub user: Pubkey,
    pub total_markets_participated: u32,
    pub correct_predictions: u32,
    pub total_winnings: u64,
    pub reputation_score: u16,
    pub streak_current: u16,
    pub streak_best: u16,
    pub last_activity: i64,
    pub achievements: [u8; 32],      // Bitfield for achievements
    pub preferred_categories: u16,   // Bitfield for category preferences
    pub bump: u8,
}

// Market statistics for aggregation
#[account]
pub struct MarketStats {
    pub market: Pubkey,
    pub hourly_volume: [u64; 24],    // Last 24 hours of volume
    pub daily_participants: [u16; 7], // Last 7 days of participants
    pub probability_history: [u8; 100], // Last 100 probability snapshots
    pub last_updated: i64,
    pub bump: u8,
}

#[program]
pub mod prediction_markets {
    use super::*;

    // TODO: Initialize computation definitions (requires .arcis files)
    // pub fn init_submit_vote_comp_def(ctx: Context<InitSubmitVoteCompDef>) -> Result<()> {
    //     init_comp_def(ctx.accounts, true, None, None)?;
    //     Ok(())
    // }

    // pub fn init_aggregate_votes_comp_def(ctx: Context<InitAggregateVotesCompDef>) -> Result<()> {
    //     init_comp_def(ctx.accounts, true, None, None)?;
    //     Ok(())
    // }

    // pub fn init_calculate_payout_comp_def(ctx: Context<InitCalculatePayoutCompDef>) -> Result<()> {
    //     init_comp_def(ctx.accounts, true, None, None)?;
    //     Ok(())
    // }

    // Create a new prediction market
    pub fn create_market(
        ctx: Context<CreateMarket>,
        market_id: u64,
        title: String,
        description: String,
        image_url: String,
        category: MarketCategory,
        voting_ends_at: i64,
    ) -> Result<()> {
        require!(title.len() <= 200, ErrorCode::TitleTooLong);
        require!(description.len() <= 1000, ErrorCode::DescriptionTooLong);
        require!(image_url.len() <= 200, ErrorCode::ImageUrlTooLong);
        require!(voting_ends_at > Clock::get()?.unix_timestamp, ErrorCode::InvalidEndTime);

        let market = &mut ctx.accounts.prediction_market;
        market.market_id = market_id;
        market.creator = ctx.accounts.creator.key();
        market.category = category.clone();
        market.status = MarketStatus::Active;
        market.created_at = Clock::get()?.unix_timestamp;
        market.voting_ends_at = voting_ends_at;
        market.resolution_timestamp = 0;
        market.total_stake = 0;
        market.yes_stake = 0;
        market.no_stake = 0;
        market.participant_count = 0;
        market.oracle_pubkey = ctx.accounts.oracle.key();
        market.resolved_outcome = None;
        market.resolution_data = [0; 500];
        market.bump = ctx.bumps.prediction_market;

        // Initialize title, description, image_url arrays
        let mut title_bytes = [0u8; 200];
        let title_slice = title.as_bytes();
        title_bytes[..title_slice.len()].copy_from_slice(title_slice);
        market.title = title_bytes;

        let mut desc_bytes = [0u8; 1000];
        let desc_slice = description.as_bytes();
        desc_bytes[..desc_slice.len()].copy_from_slice(desc_slice);
        market.description = desc_bytes;

        let mut url_bytes = [0u8; 200];
        let url_slice = image_url.as_bytes();
        url_bytes[..url_slice.len()].copy_from_slice(url_slice);
        market.image_url = url_bytes;

        emit!(MarketCreatedEvent {
            market_id,
            creator: market.creator,
            title,
            category: category as u8,
            voting_ends_at,
            timestamp: market.created_at,
        });

        Ok(())
    }

    // Initialize user profile
    pub fn initialize_user_profile(ctx: Context<InitializeUserProfile>) -> Result<()> {
        let profile = &mut ctx.accounts.user_profile;
        profile.user = ctx.accounts.user.key();
        profile.total_markets_participated = 0;
        profile.correct_predictions = 0;
        profile.total_winnings = 0;
        profile.reputation_score = 1000; // Starting reputation
        profile.streak_current = 0;
        profile.streak_best = 0;
        profile.last_activity = Clock::get()?.unix_timestamp;
        profile.achievements = [0; 32];
        profile.preferred_categories = 0;
        profile.bump = ctx.bumps.user_profile;

        Ok(())
    }

    // Submit a private vote via Arcium
    pub fn submit_private_vote(
        ctx: Context<SubmitPrivateVote>,
        computation_offset: u64,
        encrypted_vote_data: [u8; 64],
        pub_key: [u8; 32],
        nonce: u128,
        stake_amount: u64,
        vote_choice: VoteChoice,
        predicted_probability: u8,
    ) -> Result<()> {
        require!(
            ctx.accounts.prediction_market.status == MarketStatus::Active,
            ErrorCode::MarketNotActive
        );
        require!(
            Clock::get()?.unix_timestamp < ctx.accounts.prediction_market.voting_ends_at,
            ErrorCode::VotingPeriodEnded
        );
        require!(stake_amount > 0, ErrorCode::InvalidStakeAmount);
        require!(predicted_probability <= 100, ErrorCode::InvalidProbability);

        // Create user position account
        let position = &mut ctx.accounts.user_position;
        position.user = ctx.accounts.user.key();
        position.market = ctx.accounts.prediction_market.key();
        position.vote_choice = vote_choice;
        position.stake_amount = stake_amount;
        position.predicted_probability = predicted_probability;
        position.timestamp = Clock::get()?.unix_timestamp;
        position.is_claimed = false;
        position.payout_amount = 0;
        position.computation_id = [0; 32];
        position.bump = ctx.bumps.user_position;

        // TODO: Queue encrypted computation (requires .arcis files)
        // let args = vec![
        //     Argument::ArcisPubkey(pub_key),
        //     Argument::PlaintextU128(nonce),
        //     Argument::EncryptedBool([0u8; 32]), // encrypted_vote_data placeholder
        //     Argument::PlaintextU64(stake_amount),
        //     Argument::PlaintextU8(vote_choice as u8),
        //     Argument::PlaintextU8(predicted_probability),
        // ];

        // queue_computation(ctx.accounts, computation_offset, args, vec![], None)?;

        emit!(VoteSubmittedEvent {
            market_id: ctx.accounts.prediction_market.market_id,
            user: position.user,
            stake_amount,
            timestamp: position.timestamp,
        });

        Ok(())
    }

    // Aggregate votes for market resolution
    pub fn aggregate_market_votes(
        ctx: Context<AggregateMarketVotes>,
        computation_offset: u64,
    ) -> Result<()> {
        require!(
            ctx.accounts.prediction_market.status == MarketStatus::Active ||
            ctx.accounts.prediction_market.status == MarketStatus::Locked,
            ErrorCode::CannotAggregateVotes
        );

        // Update market status to locked
        ctx.accounts.prediction_market.status = MarketStatus::Locked;

        let args = vec![
            Argument::PlaintextU64(ctx.accounts.prediction_market.market_id),
        ];

        // TODO: queue_computation(ctx.accounts, computation_offset, args, vec![], None)?;

        Ok(())
    }

    // Resolve market with outcome
    pub fn resolve_market(
        ctx: Context<ResolveMarket>,
        outcome: bool,
        resolution_data: Vec<u8>,
    ) -> Result<()> {
        require!(
            ctx.accounts.oracle.key() == ctx.accounts.prediction_market.oracle_pubkey,
            ErrorCode::InvalidOracle
        );
        require!(
            ctx.accounts.prediction_market.status == MarketStatus::Locked,
            ErrorCode::CannotResolveMarket
        );

        let market = &mut ctx.accounts.prediction_market;
        market.status = MarketStatus::Resolved;
        market.resolved_outcome = Some(outcome);
        market.resolution_timestamp = Clock::get()?.unix_timestamp;

        // Store resolution data (truncate if too long)
        let data_len = resolution_data.len().min(500);
        market.resolution_data[..data_len].copy_from_slice(&resolution_data[..data_len]);

        emit!(MarketResolvedEvent {
            market_id: market.market_id,
            outcome,
            resolution_timestamp: market.resolution_timestamp,
        });

        Ok(())
    }

    // Calculate payout for user
    pub fn calculate_user_payout(
        ctx: Context<CalculateUserPayout>,
        computation_offset: u64,
    ) -> Result<()> {
        require!(
            ctx.accounts.prediction_market.status == MarketStatus::Resolved,
            ErrorCode::MarketNotResolved
        );
        require!(
            !ctx.accounts.user_position.is_claimed,
            ErrorCode::PayoutAlreadyClaimed
        );

        let args = vec![
            Argument::ArcisPubkey(ctx.accounts.user.key().to_bytes()),
            Argument::PlaintextU64(ctx.accounts.prediction_market.market_id),
            Argument::PlaintextU64(ctx.accounts.user_position.stake_amount),
            Argument::PlaintextU8(ctx.accounts.user_position.vote_choice as u8),
            Argument::PlaintextU8(ctx.accounts.prediction_market.resolved_outcome.unwrap() as u8),
        ];

        // TODO: queue_computation(ctx.accounts, computation_offset, args, vec![], None)?;

        Ok(())
    }

    // TODO: Callback for private vote submission (requires .arcis files)
    // #[arcium_callback(encrypted_ix = "submit_private_vote")]
    // pub fn submit_vote_callback(
    //     ctx: Context<SubmitVoteCallback>,
    //     output: ComputationOutputs,
    // ) -> Result<()> {
    //     let bytes = if let ComputationOutputs::Bytes(bytes) = output {
    //         bytes
    //     } else {
    //         return Err(ErrorCode::InvalidComputationOutput.into());
    //     };

    //     let is_valid = bytes[0] == 1;
    //     require!(is_valid, ErrorCode::InvalidVote);

    //     // Update market statistics
    //     let market = &mut ctx.accounts.prediction_market;
    //     market.participant_count += 1;
    //     market.total_stake += ctx.accounts.user_position.stake_amount;

    //     match ctx.accounts.user_position.vote_choice {
    //         VoteChoice::Yes => {
    //             market.yes_stake += ctx.accounts.user_position.stake_amount;
    //         },
    //         VoteChoice::No => {
    //             market.no_stake += ctx.accounts.user_position.stake_amount;
    //         },
    //         VoteChoice::Skip => {
    //             // No stake adjustment for skip votes
    //         }
    //     }

    //     // Update user profile
    //     let profile = &mut ctx.accounts.user_profile;
    //     profile.total_markets_participated += 1;
    //     profile.last_activity = Clock::get()?.unix_timestamp;

    //     Ok(())
    // }

    // Callback for vote aggregation
    #[arcium_callback(encrypted_ix = "aggregate_market_votes")]
    pub fn aggregate_votes_callback(
        ctx: Context<AggregateVotesCallback>,
        output: ComputationOutputs,
    ) -> Result<()> {
        let bytes = if let ComputationOutputs::Bytes(bytes) = output {
            bytes
        } else {
            return Err(ErrorCode::InvalidComputationOutput.into());
        };

        // Parse aggregated results
        let total_yes_votes = u32::from_le_bytes(bytes[0..4].try_into().unwrap());
        let total_no_votes = u32::from_le_bytes(bytes[4..8].try_into().unwrap());
        let total_stake = u64::from_le_bytes(bytes[8..16].try_into().unwrap());
        let yes_stake = u64::from_le_bytes(bytes[16..24].try_into().unwrap());
        let no_stake = u64::from_le_bytes(bytes[24..32].try_into().unwrap());

        emit!(VotesAggregatedEvent {
            market_id: ctx.accounts.prediction_market.market_id,
            total_yes_votes,
            total_no_votes,
            total_stake,
            yes_stake,
            no_stake,
        });

        Ok(())
    }

    // Callback for payout calculation
    #[arcium_callback(encrypted_ix = "calculate_payout")]
    pub fn payout_callback(
        ctx: Context<PayoutCallback>,
        output: ComputationOutputs,
    ) -> Result<()> {
        let bytes = if let ComputationOutputs::Bytes(bytes) = output {
            bytes
        } else {
            return Err(ErrorCode::InvalidComputationOutput.into());
        };

        let payout_amount = u64::from_le_bytes(bytes[0..8].try_into().unwrap());

        // Update user position
        let position = &mut ctx.accounts.user_position;
        position.payout_amount = payout_amount;
        position.is_claimed = true;

        // Update user profile
        let profile = &mut ctx.accounts.user_profile;
        profile.total_winnings += payout_amount;

        // Check if prediction was correct
        let market = &ctx.accounts.prediction_market;
        let predicted_outcome = match position.vote_choice {
            VoteChoice::Yes => true,
            VoteChoice::No => false,
            VoteChoice::Skip => return Ok(()), // Skip votes don't count toward accuracy
        };

        if Some(predicted_outcome) == market.resolved_outcome {
            profile.correct_predictions += 1;
            profile.streak_current += 1;
            if profile.streak_current > profile.streak_best {
                profile.streak_best = profile.streak_current;
            }
        } else {
            profile.streak_current = 0;
        }

        // Update reputation score
        let accuracy = if profile.total_markets_participated > 0 {
            (profile.correct_predictions * 100) / profile.total_markets_participated
        } else {
            50
        };
        profile.reputation_score = (accuracy as u16 * 10) + (profile.streak_current * 5);

        emit!(PayoutCalculatedEvent {
            market_id: market.market_id,
            user: position.user,
            payout_amount,
            was_correct: Some(predicted_outcome) == market.resolved_outcome,
        });

        Ok(())
    }

    // ======= ORACLE SYSTEM WITH ARCIUM MPC INTEGRATION =======

    // Create oracle proposal for market resolution
    pub fn create_oracle_proposal(
        ctx: Context<CreateOracleProposal>,
        oracle_type: OracleType,
        proposed_outcome: bool,
        confidence_score: u8,
        data_sources: Vec<DataSource>,
        evidence_hash: [u8; 32],
        resolution_metadata: [u8; 500],
    ) -> Result<()> {
        require!(
            ctx.accounts.prediction_market.status == MarketStatus::Locked,
            ErrorCode::MarketNotLocked
        );
        require!(confidence_score <= 100, ErrorCode::InvalidConfidenceScore);

        let proposal = &mut ctx.accounts.oracle_proposal;
        proposal.market = ctx.accounts.prediction_market.key();
        proposal.proposer = ctx.accounts.proposer.key();
        proposal.oracle_type = oracle_type.clone();
        proposal.proposed_outcome = proposed_outcome;
        proposal.confidence_score = confidence_score;
        proposal.data_sources = data_sources;
        proposal.evidence_hash = evidence_hash;
        proposal.proposal_timestamp = Clock::get()?.unix_timestamp;

        // Set challenge period based on oracle type
        let challenge_period = match oracle_type {
            OracleType::UmaOptimistic => 24 * 60 * 60, // 24 hours
            OracleType::ChainlinkPrice => 2 * 60 * 60,  // 2 hours
            OracleType::CustomValidated => 12 * 60 * 60, // 12 hours
            OracleType::Community => 48 * 60 * 60,      // 48 hours
        };

        proposal.challenge_period_end = proposal.proposal_timestamp + challenge_period;
        proposal.bond_amount = proposal.calculate_required_bond(&oracle_type);
        proposal.status = ResolutionStatus::Proposed;
        proposal.dispute_count = 0;
        proposal.final_outcome = None;
        proposal.resolution_metadata = resolution_metadata;
        proposal.bump = ctx.bumps.oracle_proposal;

        emit!(OracleProposalCreatedEvent {
            market_id: ctx.accounts.prediction_market.market_id,
            proposer: proposal.proposer,
            oracle_type: oracle_type as u8,
            proposed_outcome,
            confidence_score,
            challenge_period_end: proposal.challenge_period_end,
        });

        Ok(())
    }

    // Register oracle validator with stake and reputation tracking
    pub fn register_oracle_validator(
        ctx: Context<RegisterOracleValidator>,
        stake_amount: u64,
        specialization: Vec<u8>,
    ) -> Result<()> {
        require!(stake_amount >= 10_000_000, ErrorCode::InsufficientValidatorStake); // Min 0.01 SOL

        let validator = &mut ctx.accounts.oracle_validator;
        validator.validator = ctx.accounts.validator.key();
        validator.stake_amount = stake_amount;
        validator.reputation_score = 1000; // Starting reputation
        validator.total_resolutions = 0;
        validator.correct_resolutions = 0;
        validator.last_activity = Clock::get()?.unix_timestamp;
        validator.is_active = true;
        validator.specialization = specialization;
        validator.bond_locked = 0;
        validator.slash_count = 0;
        validator.bump = ctx.bumps.oracle_validator;

        // Transfer stake to program
        token::transfer(
            CpiContext::new(
                ctx.accounts.token_program.to_account_info(),
                Transfer {
                    from: ctx.accounts.validator_token_account.to_account_info(),
                    to: ctx.accounts.program_token_account.to_account_info(),
                    authority: ctx.accounts.validator.to_account_info(),
                },
            ),
            stake_amount,
        )?;

        emit!(OracleValidatorRegisteredEvent {
            validator: validator.validator,
            stake_amount,
            specialization: specialization.clone(),
        });

        Ok(())
    }

    // Submit encrypted oracle vote via Arcium MPC
    pub fn submit_encrypted_oracle_vote(
        ctx: Context<SubmitEncryptedOracleVote>,
        computation_offset: u64,
        encrypted_vote_data: [u8; 64],
        confidence_level: u8,
        evidence_hash: [u8; 32],
        anti_collusion_proof: [u8; 32],
    ) -> Result<()> {
        require!(
            ctx.accounts.oracle_proposal.status == ResolutionStatus::Proposed,
            ErrorCode::ProposalNotActive
        );
        require!(confidence_level <= 100, ErrorCode::InvalidConfidenceScore);

        // Verify validator eligibility
        let validator = &ctx.accounts.oracle_validator;
        require!(
            validator.is_eligible_validator(50_000_000, 0.7), // Min 0.05 SOL, 70% accuracy
            ErrorCode::ValidatorNotEligible
        );

        // Prepare encrypted vote arguments for Arcium MPC
        let args = vec![
            Argument::ArcisPubkey(ctx.accounts.validator.key().to_bytes()),
            Argument::EncryptedBool(encrypted_vote_data[0..32].try_into().unwrap()),
            Argument::PlaintextU8(confidence_level),
            Argument::PlaintextU64(ctx.accounts.oracle_proposal.market.key().to_bytes()[0..8].try_into().unwrap().iter().fold(0u64, |acc, &b| (acc << 8) | (b as u64))),
            Argument::PlaintextU128(Clock::get()?.unix_timestamp as u128),
            Argument::PlaintextBytes(evidence_hash.to_vec()),
            Argument::PlaintextBytes(anti_collusion_proof.to_vec()),
        ];

        // Queue encrypted computation
        queue_computation(ctx.accounts, computation_offset, args, vec![], None)?;

        emit!(EncryptedOracleVoteSubmittedEvent {
            proposal: ctx.accounts.oracle_proposal.key(),
            validator: ctx.accounts.validator.key(),
            confidence_level,
            timestamp: Clock::get()?.unix_timestamp,
        });

        Ok(())
    }

    // Calculate oracle consensus via Arcium MPC
    pub fn calculate_oracle_consensus(
        ctx: Context<CalculateOracleConsensus>,
        computation_offset: u64,
        min_participation_rate: u8,
        consensus_threshold: u8,
    ) -> Result<()> {
        require!(
            ctx.accounts.oracle_proposal.status == ResolutionStatus::Proposed,
            ErrorCode::ProposalNotActive
        );
        require!(
            Clock::get()?.unix_timestamp > ctx.accounts.oracle_proposal.challenge_period_end,
            ErrorCode::ChallengePeriodActive
        );
        require!(consensus_threshold >= 51 && consensus_threshold <= 100, ErrorCode::InvalidConsensusThreshold);

        // Update proposal status to being calculated
        ctx.accounts.oracle_proposal.status = ResolutionStatus::Pending;

        let args = vec![
            Argument::PlaintextU64(ctx.accounts.oracle_proposal.market.key().to_bytes()[0..8].try_into().unwrap().iter().fold(0u64, |acc, &b| (acc << 8) | (b as u64))),
            Argument::PlaintextU8(min_participation_rate),
            Argument::PlaintextU8(consensus_threshold),
            Argument::PlaintextU128(Clock::get()?.unix_timestamp as u128),
        ];

        // Queue consensus calculation computation
        queue_computation(ctx.accounts, computation_offset, args, vec![], None)?;

        emit!(OracleConsensusCalculationStartedEvent {
            proposal: ctx.accounts.oracle_proposal.key(),
            min_participation_rate,
            consensus_threshold,
            timestamp: Clock::get()?.unix_timestamp,
        });

        Ok(())
    }

    // Detect manipulation patterns in oracle voting
    pub fn detect_manipulation_patterns(
        ctx: Context<DetectManipulationPatterns>,
        computation_offset: u64,
        analysis_window_hours: u16,
        sensitivity_threshold: u8,
    ) -> Result<()> {
        require!(sensitivity_threshold <= 100, ErrorCode::InvalidSensitivityThreshold);

        let args = vec![
            Argument::PlaintextU64(ctx.accounts.oracle_proposal.market.key().to_bytes()[0..8].try_into().unwrap().iter().fold(0u64, |acc, &b| (acc << 8) | (b as u64))),
            Argument::PlaintextU16(analysis_window_hours),
            Argument::PlaintextU8(sensitivity_threshold),
            Argument::PlaintextU128(Clock::get()?.unix_timestamp as u128),
        ];

        // Queue manipulation detection computation
        queue_computation(ctx.accounts, computation_offset, args, vec![], None)?;

        emit!(ManipulationDetectionStartedEvent {
            proposal: ctx.accounts.oracle_proposal.key(),
            analysis_window_hours,
            sensitivity_threshold,
            timestamp: Clock::get()?.unix_timestamp,
        });

        Ok(())
    }

    // Create dispute against oracle proposal
    pub fn create_oracle_dispute(
        ctx: Context<CreateOracleDispute>,
        dispute_reason: String,
        counter_evidence_hash: [u8; 32],
        dispute_bond: u64,
    ) -> Result<()> {
        require!(
            ctx.accounts.oracle_proposal.status == ResolutionStatus::Proposed,
            ErrorCode::ProposalNotActive
        );
        require!(
            Clock::get()?.unix_timestamp <= ctx.accounts.oracle_proposal.challenge_period_end,
            ErrorCode::ChallengePeriodExpired
        );
        require!(dispute_reason.len() <= 500, ErrorCode::DisputeReasonTooLong);
        require!(dispute_bond >= 1_000_000, ErrorCode::InsufficientDisputeBond); // Min 0.001 SOL

        let dispute = &mut ctx.accounts.oracle_dispute;
        dispute.proposal = ctx.accounts.oracle_proposal.key();
        dispute.disputer = ctx.accounts.disputer.key();
        dispute.dispute_reason = dispute_reason.clone();
        dispute.counter_evidence_hash = counter_evidence_hash;
        dispute.dispute_timestamp = Clock::get()?.unix_timestamp;
        dispute.dispute_bond = dispute_bond;
        dispute.is_resolved = false;
        dispute.was_valid = None;
        dispute.bump = ctx.bumps.oracle_dispute;

        // Update proposal dispute count
        ctx.accounts.oracle_proposal.dispute_count += 1;
        ctx.accounts.oracle_proposal.status = ResolutionStatus::Disputed;

        // Transfer dispute bond
        token::transfer(
            CpiContext::new(
                ctx.accounts.token_program.to_account_info(),
                Transfer {
                    from: ctx.accounts.disputer_token_account.to_account_info(),
                    to: ctx.accounts.program_token_account.to_account_info(),
                    authority: ctx.accounts.disputer.to_account_info(),
                },
            ),
            dispute_bond,
        )?;

        emit!(OracleDisputeCreatedEvent {
            proposal: dispute.proposal,
            disputer: dispute.disputer,
            dispute_reason,
            dispute_bond,
            timestamp: dispute.dispute_timestamp,
        });

        Ok(())
    }

    // ======= ARCIUM MPC ORACLE CALLBACKS =======

    // Callback for encrypted oracle vote processing
    #[arcium_callback(encrypted_ix = "submit_encrypted_oracle_vote")]
    pub fn oracle_vote_callback(
        ctx: Context<OracleVoteCallback>,
        output: ComputationOutputs,
    ) -> Result<()> {
        let bytes = if let ComputationOutputs::Bytes(bytes) = output {
            bytes
        } else {
            return Err(ErrorCode::InvalidComputationOutput.into());
        };

        // Parse encrypted vote result
        let vote_valid = bytes[0] == 1;
        let anti_collusion_score = bytes[1];
        let weighted_confidence = u16::from_le_bytes(bytes[2..4].try_into().unwrap());

        require!(vote_valid, ErrorCode::InvalidOracleVote);
        require!(anti_collusion_score >= 70, ErrorCode::CollusionDetected); // Min 70% non-collusion score

        // Update validator activity and reputation
        let validator = &mut ctx.accounts.oracle_validator;
        validator.last_activity = Clock::get()?.unix_timestamp;
        validator.total_resolutions += 1;

        emit!(OracleVoteProcessedEvent {
            proposal: ctx.accounts.oracle_proposal.key(),
            validator: validator.validator,
            weighted_confidence,
            anti_collusion_score,
            timestamp: Clock::get()?.unix_timestamp,
        });

        Ok(())
    }

    // Callback for oracle consensus calculation
    #[arcium_callback(encrypted_ix = "calculate_oracle_consensus")]
    pub fn oracle_consensus_callback(
        ctx: Context<OracleConsensusCallback>,
        output: ComputationOutputs,
    ) -> Result<()> {
        let bytes = if let ComputationOutputs::Bytes(bytes) = output {
            bytes
        } else {
            return Err(ErrorCode::InvalidComputationOutput.into());
        };

        // Parse consensus results
        let consensus_reached = bytes[0] == 1;
        let final_outcome = bytes[1] == 1;
        let participation_rate = bytes[2];
        let consensus_strength = bytes[3];
        let total_validators = u16::from_le_bytes(bytes[4..6].try_into().unwrap());

        let proposal = &mut ctx.accounts.oracle_proposal;

        if consensus_reached {
            proposal.status = ResolutionStatus::Finalized;
            proposal.final_outcome = Some(final_outcome);

            // Update market resolution
            let market = &mut ctx.accounts.prediction_market;
            market.status = MarketStatus::Resolved;
            market.resolved_outcome = Some(final_outcome);
            market.resolution_timestamp = Clock::get()?.unix_timestamp;

            // Update validator reputations based on consensus
            // This would be done in a separate instruction for each validator

            emit!(OracleConsensusReachedEvent {
                proposal: proposal.key(),
                market_id: market.market_id,
                final_outcome,
                participation_rate,
                consensus_strength,
                total_validators,
                timestamp: Clock::get()?.unix_timestamp,
            });
        } else {
            proposal.status = ResolutionStatus::Invalid;

            emit!(OracleConsensusFailedEvent {
                proposal: proposal.key(),
                participation_rate,
                consensus_strength,
                total_validators,
                timestamp: Clock::get()?.unix_timestamp,
            });
        }

        Ok(())
    }

    // Callback for manipulation detection results
    #[arcium_callback(encrypted_ix = "detect_manipulation_patterns")]
    pub fn manipulation_detection_callback(
        ctx: Context<ManipulationDetectionCallback>,
        output: ComputationOutputs,
    ) -> Result<()> {
        let bytes = if let ComputationOutputs::Bytes(bytes) = output {
            bytes
        } else {
            return Err(ErrorCode::InvalidComputationOutput.into());
        };

        // Parse manipulation detection results
        let manipulation_detected = bytes[0] == 1;
        let manipulation_score = bytes[1]; // 0-100
        let affected_validators = bytes[2];
        let pattern_type = bytes[3]; // Different types of manipulation patterns

        if manipulation_detected && manipulation_score > 75 {
            // High confidence manipulation detected
            ctx.accounts.oracle_proposal.status = ResolutionStatus::Invalid;

            // Slash affected validators (would be done in separate instructions)

            emit!(ManipulationDetectedEvent {
                proposal: ctx.accounts.oracle_proposal.key(),
                manipulation_score,
                affected_validators,
                pattern_type,
                timestamp: Clock::get()?.unix_timestamp,
            });
        } else {
            emit!(ManipulationAnalysisCompletedEvent {
                proposal: ctx.accounts.oracle_proposal.key(),
                manipulation_score,
                pattern_type,
                timestamp: Clock::get()?.unix_timestamp,
            });
        }

        Ok(())
    }

// Account validation structs
#[derive(Accounts)]
#[instruction(market_id: u64)]
pub struct CreateMarket<'info> {
    #[account(mut)]
    pub creator: Signer<'info>,

    #[account(
        init,
        payer = creator,
        space = 8 + 8 + 32 + 200 + 1000 + 200 + 1 + 1 + 8 + 8 + 8 + 8 + 8 + 8 + 4 + 32 + 1 + 500 + 1, // All fields
        seeds = [b"market", market_id.to_le_bytes().as_ref()],
        bump
    )]
    pub prediction_market: Account<'info, PredictionMarket>,

    /// CHECK: Oracle address validation handled in instruction
    pub oracle: UncheckedAccount<'info>,

    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct InitializeUserProfile<'info> {
    #[account(mut)]
    pub user: Signer<'info>,

    #[account(
        init,
        payer = user,
        space = 8 + 32 + 4 + 4 + 8 + 2 + 2 + 2 + 8 + 32 + 2 + 1, // All fields
        seeds = [b"profile", user.key().as_ref()],
        bump
    )]
    pub user_profile: Account<'info, UserProfile>,

    pub system_program: Program<'info, System>,
}

// Computation account validation structs
#[queue_computation_accounts("submit_private_vote", payer)]
#[derive(Accounts)]
#[instruction(computation_offset: u64)]
pub struct SubmitPrivateVote<'info> {
    #[account(mut)]
    pub payer: Signer<'info>,

    #[account(mut)]
    pub user: Signer<'info>,

    #[account(mut)]
    pub prediction_market: Account<'info, PredictionMarket>,

    #[account(
        init,
        payer = payer,
        space = 8 + 32 + 32 + 1 + 8 + 1 + 8 + 1 + 8 + 32 + 1, // All fields
        seeds = [b"position", user.key().as_ref(), prediction_market.key().as_ref()],
        bump
    )]
    pub user_position: Account<'info, UserPosition>,

    #[account(
        mut,
        seeds = [b"profile", user.key().as_ref()],
        bump = user_profile.bump
    )]
    pub user_profile: Account<'info, UserProfile>,

    #[account(
        address = derive_mxe_pda!()
    )]
    pub mxe_account: Account<'info, PersistentMXEAccount>,

    #[account(
        mut,
        address = derive_mempool_pda!()
    )]
    /// CHECK: mempool_account, checked by the arcium program.
    pub mempool_account: UncheckedAccount<'info>,

    #[account(
        mut,
        address = derive_execpool_pda!()
    )]
    /// CHECK: executing_pool, checked by the arcium program.
    pub executing_pool: UncheckedAccount<'info>,

    #[account(
        mut,
        address = derive_comp_pda!(computation_offset)
    )]
    /// CHECK: computation_account, checked by the arcium program.
    pub computation_account: UncheckedAccount<'info>,

    #[account(
        address = derive_comp_def_pda!(COMP_DEF_OFFSET_SUBMIT_VOTE)
    )]
    pub comp_def_account: Account<'info, ComputationDefinitionAccount>,

    #[account(
        mut,
        address = derive_cluster_pda!(mxe_account)
    )]
    pub cluster_account: Account<'info, Cluster>,

    #[account(
        mut,
        address = ARCIUM_STAKING_POOL_ACCOUNT_ADDRESS,
    )]
    pub pool_account: Account<'info, StakingPoolAccount>,

    #[account(
        address = ARCIUM_CLOCK_ACCOUNT_ADDRESS
    )]
    pub clock_account: Account<'info, ClockAccount>,

    pub system_program: Program<'info, System>,
    pub arcium_program: Program<'info, Arcium>,
}

#[queue_computation_accounts("aggregate_market_votes", payer)]
#[derive(Accounts)]
#[instruction(computation_offset: u64)]
pub struct AggregateMarketVotes<'info> {
    #[account(mut)]
    pub payer: Signer<'info>,

    #[account(mut)]
    pub prediction_market: Account<'info, PredictionMarket>,

    #[account(
        address = derive_mxe_pda!()
    )]
    pub mxe_account: Account<'info, PersistentMXEAccount>,

    #[account(
        mut,
        address = derive_mempool_pda!()
    )]
    /// CHECK: mempool_account, checked by the arcium program.
    pub mempool_account: UncheckedAccount<'info>,

    #[account(
        mut,
        address = derive_execpool_pda!()
    )]
    /// CHECK: executing_pool, checked by the arcium program.
    pub executing_pool: UncheckedAccount<'info>,

    #[account(
        mut,
        address = derive_comp_pda!(computation_offset)
    )]
    /// CHECK: computation_account, checked by the arcium program.
    pub computation_account: UncheckedAccount<'info>,

    #[account(
        address = derive_comp_def_pda!(COMP_DEF_OFFSET_AGGREGATE_VOTES)
    )]
    pub comp_def_account: Account<'info, ComputationDefinitionAccount>,

    #[account(
        mut,
        address = derive_cluster_pda!(mxe_account)
    )]
    pub cluster_account: Account<'info, Cluster>,

    #[account(
        mut,
        address = ARCIUM_STAKING_POOL_ACCOUNT_ADDRESS,
    )]
    pub pool_account: Account<'info, StakingPoolAccount>,

    #[account(
        address = ARCIUM_CLOCK_ACCOUNT_ADDRESS
    )]
    pub clock_account: Account<'info, ClockAccount>,

    pub system_program: Program<'info, System>,
    pub arcium_program: Program<'info, Arcium>,
}

#[queue_computation_accounts("calculate_payout", payer)]
#[derive(Accounts)]
#[instruction(computation_offset: u64)]
pub struct CalculateUserPayout<'info> {
    #[account(mut)]
    pub payer: Signer<'info>,

    #[account(mut)]
    pub user: Signer<'info>,

    pub prediction_market: Account<'info, PredictionMarket>,

    #[account(
        mut,
        seeds = [b"position", user.key().as_ref(), prediction_market.key().as_ref()],
        bump = user_position.bump
    )]
    pub user_position: Account<'info, UserPosition>,

    #[account(
        address = derive_mxe_pda!()
    )]
    pub mxe_account: Account<'info, PersistentMXEAccount>,

    #[account(
        mut,
        address = derive_mempool_pda!()
    )]
    /// CHECK: mempool_account, checked by the arcium program.
    pub mempool_account: UncheckedAccount<'info>,

    #[account(
        mut,
        address = derive_execpool_pda!()
    )]
    /// CHECK: executing_pool, checked by the arcium program.
    pub executing_pool: UncheckedAccount<'info>,

    #[account(
        mut,
        address = derive_comp_pda!(computation_offset)
    )]
    /// CHECK: computation_account, checked by the arcium program.
    pub computation_account: UncheckedAccount<'info>,

    #[account(
        address = derive_comp_def_pda!(COMP_DEF_OFFSET_CALCULATE_PAYOUT)
    )]
    pub comp_def_account: Account<'info, ComputationDefinitionAccount>,

    #[account(
        mut,
        address = derive_cluster_pda!(mxe_account)
    )]
    pub cluster_account: Account<'info, Cluster>,

    #[account(
        mut,
        address = ARCIUM_STAKING_POOL_ACCOUNT_ADDRESS,
    )]
    pub pool_account: Account<'info, StakingPoolAccount>,

    #[account(
        address = ARCIUM_CLOCK_ACCOUNT_ADDRESS
    )]
    pub clock_account: Account<'info, ClockAccount>,

    pub system_program: Program<'info, System>,
    pub arcium_program: Program<'info, Arcium>,
}

#[derive(Accounts)]
pub struct ResolveMarket<'info> {
    #[account(mut)]
    pub oracle: Signer<'info>,

    #[account(mut)]
    pub prediction_market: Account<'info, PredictionMarket>,
}

// ======= ORACLE ACCOUNT VALIDATION STRUCTS =======

#[derive(Accounts)]
#[instruction(market_id: u64)]
pub struct CreateOracleProposal<'info> {
    #[account(mut)]
    pub proposer: Signer<'info>,

    #[account(
        mut,
        seeds = [b"market", market_id.to_le_bytes().as_ref()],
        bump = prediction_market.bump
    )]
    pub prediction_market: Account<'info, PredictionMarket>,

    #[account(
        init,
        payer = proposer,
        space = OracleProposal::LEN,
        seeds = [b"oracle_proposal", prediction_market.key().as_ref(), proposer.key().as_ref()],
        bump
    )]
    pub oracle_proposal: Account<'info, OracleProposal>,

    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct RegisterOracleValidator<'info> {
    #[account(mut)]
    pub validator: Signer<'info>,

    #[account(
        init,
        payer = validator,
        space = OracleValidator::LEN,
        seeds = [b"oracle_validator", validator.key().as_ref()],
        bump
    )]
    pub oracle_validator: Account<'info, OracleValidator>,

    #[account(mut)]
    pub validator_token_account: Account<'info, TokenAccount>,

    #[account(mut)]
    pub program_token_account: Account<'info, TokenAccount>,

    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
}

#[queue_computation_accounts("submit_encrypted_oracle_vote", payer)]
#[derive(Accounts)]
#[instruction(computation_offset: u64)]
pub struct SubmitEncryptedOracleVote<'info> {
    #[account(mut)]
    pub payer: Signer<'info>,

    #[account(mut)]
    pub validator: Signer<'info>,

    #[account(mut)]
    pub oracle_proposal: Account<'info, OracleProposal>,

    #[account(
        mut,
        seeds = [b"oracle_validator", validator.key().as_ref()],
        bump = oracle_validator.bump
    )]
    pub oracle_validator: Account<'info, OracleValidator>,

    #[account(
        address = derive_mxe_pda!()
    )]
    pub mxe_account: Account<'info, PersistentMXEAccount>,

    #[account(
        mut,
        address = derive_mempool_pda!()
    )]
    /// CHECK: mempool_account, checked by the arcium program.
    pub mempool_account: UncheckedAccount<'info>,

    #[account(
        mut,
        address = derive_execpool_pda!()
    )]
    /// CHECK: executing_pool, checked by the arcium program.
    pub executing_pool: UncheckedAccount<'info>,

    #[account(
        mut,
        address = derive_comp_pda!(computation_offset)
    )]
    /// CHECK: computation_account, checked by the arcium program.
    pub computation_account: UncheckedAccount<'info>,

    #[account(
        address = derive_comp_def_pda!(COMP_DEF_OFFSET_ORACLE_VOTE)
    )]
    pub comp_def_account: Account<'info, ComputationDefinitionAccount>,

    #[account(
        mut,
        address = derive_cluster_pda!(mxe_account)
    )]
    pub cluster_account: Account<'info, Cluster>,

    #[account(
        mut,
        address = ARCIUM_STAKING_POOL_ACCOUNT_ADDRESS,
    )]
    pub pool_account: Account<'info, StakingPoolAccount>,

    #[account(
        address = ARCIUM_CLOCK_ACCOUNT_ADDRESS
    )]
    pub clock_account: Account<'info, ClockAccount>,

    pub system_program: Program<'info, System>,
    pub arcium_program: Program<'info, Arcium>,
}

#[queue_computation_accounts("calculate_oracle_consensus", payer)]
#[derive(Accounts)]
#[instruction(computation_offset: u64)]
pub struct CalculateOracleConsensus<'info> {
    #[account(mut)]
    pub payer: Signer<'info>,

    #[account(mut)]
    pub oracle_proposal: Account<'info, OracleProposal>,

    #[account(mut)]
    pub prediction_market: Account<'info, PredictionMarket>,

    #[account(
        address = derive_mxe_pda!()
    )]
    pub mxe_account: Account<'info, PersistentMXEAccount>,

    #[account(
        mut,
        address = derive_mempool_pda!()
    )]
    /// CHECK: mempool_account, checked by the arcium program.
    pub mempool_account: UncheckedAccount<'info>,

    #[account(
        mut,
        address = derive_execpool_pda!()
    )]
    /// CHECK: executing_pool, checked by the arcium program.
    pub executing_pool: UncheckedAccount<'info>,

    #[account(
        mut,
        address = derive_comp_pda!(computation_offset)
    )]
    /// CHECK: computation_account, checked by the arcium program.
    pub computation_account: UncheckedAccount<'info>,

    #[account(
        address = derive_comp_def_pda!(COMP_DEF_OFFSET_ORACLE_CONSENSUS)
    )]
    pub comp_def_account: Account<'info, ComputationDefinitionAccount>,

    #[account(
        mut,
        address = derive_cluster_pda!(mxe_account)
    )]
    pub cluster_account: Account<'info, Cluster>,

    #[account(
        mut,
        address = ARCIUM_STAKING_POOL_ACCOUNT_ADDRESS,
    )]
    pub pool_account: Account<'info, StakingPoolAccount>,

    #[account(
        address = ARCIUM_CLOCK_ACCOUNT_ADDRESS
    )]
    pub clock_account: Account<'info, ClockAccount>,

    pub system_program: Program<'info, System>,
    pub arcium_program: Program<'info, Arcium>,
}

#[queue_computation_accounts("detect_manipulation_patterns", payer)]
#[derive(Accounts)]
#[instruction(computation_offset: u64)]
pub struct DetectManipulationPatterns<'info> {
    #[account(mut)]
    pub payer: Signer<'info>,

    #[account(mut)]
    pub oracle_proposal: Account<'info, OracleProposal>,

    #[account(
        address = derive_mxe_pda!()
    )]
    pub mxe_account: Account<'info, PersistentMXEAccount>,

    #[account(
        mut,
        address = derive_mempool_pda!()
    )]
    /// CHECK: mempool_account, checked by the arcium program.
    pub mempool_account: UncheckedAccount<'info>,

    #[account(
        mut,
        address = derive_execpool_pda!()
    )]
    /// CHECK: executing_pool, checked by the arcium program.
    pub executing_pool: UncheckedAccount<'info>,

    #[account(
        mut,
        address = derive_comp_pda!(computation_offset)
    )]
    /// CHECK: computation_account, checked by the arcium program.
    pub computation_account: UncheckedAccount<'info>,

    #[account(
        address = derive_comp_def_pda!(COMP_DEF_OFFSET_DETECT_MANIPULATION)
    )]
    pub comp_def_account: Account<'info, ComputationDefinitionAccount>,

    #[account(
        mut,
        address = derive_cluster_pda!(mxe_account)
    )]
    pub cluster_account: Account<'info, Cluster>,

    #[account(
        mut,
        address = ARCIUM_STAKING_POOL_ACCOUNT_ADDRESS,
    )]
    pub pool_account: Account<'info, StakingPoolAccount>,

    #[account(
        address = ARCIUM_CLOCK_ACCOUNT_ADDRESS
    )]
    pub clock_account: Account<'info, ClockAccount>,

    pub system_program: Program<'info, System>,
    pub arcium_program: Program<'info, Arcium>,
}

#[derive(Accounts)]
pub struct CreateOracleDispute<'info> {
    #[account(mut)]
    pub disputer: Signer<'info>,

    #[account(mut)]
    pub oracle_proposal: Account<'info, OracleProposal>,

    #[account(
        init,
        payer = disputer,
        space = OracleDispute::LEN,
        seeds = [b"oracle_dispute", oracle_proposal.key().as_ref(), disputer.key().as_ref()],
        bump
    )]
    pub oracle_dispute: Account<'info, OracleDispute>,

    #[account(mut)]
    pub disputer_token_account: Account<'info, TokenAccount>,

    #[account(mut)]
    pub program_token_account: Account<'info, TokenAccount>,

    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
}

// Oracle callback account validation structs
#[callback_accounts("submit_encrypted_oracle_vote", payer)]
#[derive(Accounts)]
pub struct OracleVoteCallback<'info> {
    #[account(mut)]
    pub payer: Signer<'info>,

    #[account(mut)]
    pub oracle_proposal: Account<'info, OracleProposal>,

    #[account(mut)]
    pub oracle_validator: Account<'info, OracleValidator>,

    pub arcium_program: Program<'info, Arcium>,

    #[account(
        address = derive_comp_def_pda!(COMP_DEF_OFFSET_ORACLE_VOTE)
    )]
    pub comp_def_account: Account<'info, ComputationDefinitionAccount>,

    #[account(address = ::anchor_lang::solana_program::sysvar::instructions::ID)]
    /// CHECK: instructions_sysvar, checked by the account constraint
    pub instructions_sysvar: AccountInfo<'info>,
}

#[callback_accounts("calculate_oracle_consensus", payer)]
#[derive(Accounts)]
pub struct OracleConsensusCallback<'info> {
    #[account(mut)]
    pub payer: Signer<'info>,

    #[account(mut)]
    pub oracle_proposal: Account<'info, OracleProposal>,

    #[account(mut)]
    pub prediction_market: Account<'info, PredictionMarket>,

    pub arcium_program: Program<'info, Arcium>,

    #[account(
        address = derive_comp_def_pda!(COMP_DEF_OFFSET_ORACLE_CONSENSUS)
    )]
    pub comp_def_account: Account<'info, ComputationDefinitionAccount>,

    #[account(address = ::anchor_lang::solana_program::sysvar::instructions::ID)]
    /// CHECK: instructions_sysvar, checked by the account constraint
    pub instructions_sysvar: AccountInfo<'info>,
}

#[callback_accounts("detect_manipulation_patterns", payer)]
#[derive(Accounts)]
pub struct ManipulationDetectionCallback<'info> {
    #[account(mut)]
    pub payer: Signer<'info>,

    #[account(mut)]
    pub oracle_proposal: Account<'info, OracleProposal>,

    pub arcium_program: Program<'info, Arcium>,

    #[account(
        address = derive_comp_def_pda!(COMP_DEF_OFFSET_DETECT_MANIPULATION)
    )]
    pub comp_def_account: Account<'info, ComputationDefinitionAccount>,

    #[account(address = ::anchor_lang::solana_program::sysvar::instructions::ID)]
    /// CHECK: instructions_sysvar, checked by the account constraint
    pub instructions_sysvar: AccountInfo<'info>,
}

// Callback account validation structs
#[callback_accounts("submit_private_vote", payer)]
#[derive(Accounts)]
pub struct SubmitVoteCallback<'info> {
    #[account(mut)]
    pub payer: Signer<'info>,

    #[account(mut)]
    pub prediction_market: Account<'info, PredictionMarket>,

    #[account(mut)]
    pub user_position: Account<'info, UserPosition>,

    #[account(mut)]
    pub user_profile: Account<'info, UserProfile>,

    pub arcium_program: Program<'info, Arcium>,

    #[account(
        address = derive_comp_def_pda!(COMP_DEF_OFFSET_SUBMIT_VOTE)
    )]
    pub comp_def_account: Account<'info, ComputationDefinitionAccount>,

    #[account(address = ::anchor_lang::solana_program::sysvar::instructions::ID)]
    /// CHECK: instructions_sysvar, checked by the account constraint
    pub instructions_sysvar: AccountInfo<'info>,
}

#[callback_accounts("aggregate_market_votes", payer)]
#[derive(Accounts)]
pub struct AggregateVotesCallback<'info> {
    #[account(mut)]
    pub payer: Signer<'info>,

    pub prediction_market: Account<'info, PredictionMarket>,

    pub arcium_program: Program<'info, Arcium>,

    #[account(
        address = derive_comp_def_pda!(COMP_DEF_OFFSET_AGGREGATE_VOTES)
    )]
    pub comp_def_account: Account<'info, ComputationDefinitionAccount>,

    #[account(address = ::anchor_lang::solana_program::sysvar::instructions::ID)]
    /// CHECK: instructions_sysvar, checked by the account constraint
    pub instructions_sysvar: AccountInfo<'info>,
}

#[callback_accounts("calculate_payout", payer)]
#[derive(Accounts)]
pub struct PayoutCallback<'info> {
    #[account(mut)]
    pub payer: Signer<'info>,

    pub prediction_market: Account<'info, PredictionMarket>,

    #[account(mut)]
    pub user_position: Account<'info, UserPosition>,

    #[account(mut)]
    pub user_profile: Account<'info, UserProfile>,

    pub arcium_program: Program<'info, Arcium>,

    #[account(
        address = derive_comp_def_pda!(COMP_DEF_OFFSET_CALCULATE_PAYOUT)
    )]
    pub comp_def_account: Account<'info, ComputationDefinitionAccount>,

    #[account(address = ::anchor_lang::solana_program::sysvar::instructions::ID)]
    /// CHECK: instructions_sysvar, checked by the account constraint
    pub instructions_sysvar: AccountInfo<'info>,
}

// Computation definition initialization structs
#[init_computation_definition_accounts("submit_private_vote", payer)]
#[derive(Accounts)]
pub struct InitSubmitVoteCompDef<'info> {
    #[account(mut)]
    pub payer: Signer<'info>,

    #[account(
        mut,
        address = derive_mxe_pda!()
    )]
    pub mxe_account: Box<Account<'info, PersistentMXEAccount>>,

    #[account(mut)]
    /// CHECK: comp_def_account, checked by arcium program.
    pub comp_def_account: UncheckedAccount<'info>,

    pub arcium_program: Program<'info, Arcium>,
    pub system_program: Program<'info, System>,
}

#[init_computation_definition_accounts("aggregate_market_votes", payer)]
#[derive(Accounts)]
pub struct InitAggregateVotesCompDef<'info> {
    #[account(mut)]
    pub payer: Signer<'info>,

    #[account(
        mut,
        address = derive_mxe_pda!()
    )]
    pub mxe_account: Box<Account<'info, PersistentMXEAccount>>,

    #[account(mut)]
    /// CHECK: comp_def_account, checked by arcium program.
    pub comp_def_account: UncheckedAccount<'info>,

    pub arcium_program: Program<'info, Arcium>,
    pub system_program: Program<'info, System>,
}

#[init_computation_definition_accounts("calculate_payout", payer)]
#[derive(Accounts)]
pub struct InitCalculatePayoutCompDef<'info> {
    #[account(mut)]
    pub payer: Signer<'info>,

    #[account(
        mut,
        address = derive_mxe_pda!()
    )]
    pub mxe_account: Box<Account<'info, PersistentMXEAccount>>,

    #[account(mut)]
    /// CHECK: comp_def_account, checked by arcium program.
    pub comp_def_account: UncheckedAccount<'info>,

    pub arcium_program: Program<'info, Arcium>,
    pub system_program: Program<'info, System>,
}

// Events
#[event]
pub struct MarketCreatedEvent {
    pub market_id: u64,
    pub creator: Pubkey,
    pub title: String,
    pub category: u8,
    pub voting_ends_at: i64,
    pub timestamp: i64,
}

#[event]
pub struct VoteSubmittedEvent {
    pub market_id: u64,
    pub user: Pubkey,
    pub stake_amount: u64,
    pub timestamp: i64,
}

#[event]
pub struct MarketResolvedEvent {
    pub market_id: u64,
    pub outcome: bool,
    pub resolution_timestamp: i64,
}

#[event]
pub struct VotesAggregatedEvent {
    pub market_id: u64,
    pub total_yes_votes: u32,
    pub total_no_votes: u32,
    pub total_stake: u64,
    pub yes_stake: u64,
    pub no_stake: u64,
}

#[event]
pub struct PayoutCalculatedEvent {
    pub market_id: u64,
    pub user: Pubkey,
    pub payout_amount: u64,
    pub was_correct: bool,
}

// ======= ORACLE SYSTEM EVENTS =======

#[event]
pub struct OracleProposalCreatedEvent {
    pub market_id: u64,
    pub proposer: Pubkey,
    pub oracle_type: u8,
    pub proposed_outcome: bool,
    pub confidence_score: u8,
    pub challenge_period_end: i64,
}

#[event]
pub struct OracleValidatorRegisteredEvent {
    pub validator: Pubkey,
    pub stake_amount: u64,
    pub specialization: Vec<u8>,
}

#[event]
pub struct EncryptedOracleVoteSubmittedEvent {
    pub proposal: Pubkey,
    pub validator: Pubkey,
    pub confidence_level: u8,
    pub timestamp: i64,
}

#[event]
pub struct OracleVoteProcessedEvent {
    pub proposal: Pubkey,
    pub validator: Pubkey,
    pub weighted_confidence: u16,
    pub anti_collusion_score: u8,
    pub timestamp: i64,
}

#[event]
pub struct OracleConsensusCalculationStartedEvent {
    pub proposal: Pubkey,
    pub min_participation_rate: u8,
    pub consensus_threshold: u8,
    pub timestamp: i64,
}

#[event]
pub struct OracleConsensusReachedEvent {
    pub proposal: Pubkey,
    pub market_id: u64,
    pub final_outcome: bool,
    pub participation_rate: u8,
    pub consensus_strength: u8,
    pub total_validators: u16,
    pub timestamp: i64,
}

#[event]
pub struct OracleConsensusFailedEvent {
    pub proposal: Pubkey,
    pub participation_rate: u8,
    pub consensus_strength: u8,
    pub total_validators: u16,
    pub timestamp: i64,
}

#[event]
pub struct ManipulationDetectionStartedEvent {
    pub proposal: Pubkey,
    pub analysis_window_hours: u16,
    pub sensitivity_threshold: u8,
    pub timestamp: i64,
}

#[event]
pub struct ManipulationDetectedEvent {
    pub proposal: Pubkey,
    pub manipulation_score: u8,
    pub affected_validators: u8,
    pub pattern_type: u8,
    pub timestamp: i64,
}

#[event]
pub struct ManipulationAnalysisCompletedEvent {
    pub proposal: Pubkey,
    pub manipulation_score: u8,
    pub pattern_type: u8,
    pub timestamp: i64,
}

#[event]
pub struct OracleDisputeCreatedEvent {
    pub proposal: Pubkey,
    pub disputer: Pubkey,
    pub dispute_reason: String,
    pub dispute_bond: u64,
    pub timestamp: i64,
}

// Error codes
#[error_code]
pub enum ErrorCode {
    #[msg("Title is too long (max 200 chars)")]
    TitleTooLong,
    #[msg("Description is too long (max 1000 chars)")]
    DescriptionTooLong,
    #[msg("Image URL is too long (max 200 chars)")]
    ImageUrlTooLong,
    #[msg("Invalid end time")]
    InvalidEndTime,
    #[msg("Market is not active")]
    MarketNotActive,
    #[msg("Voting period has ended")]
    VotingPeriodEnded,
    #[msg("Invalid stake amount")]
    InvalidStakeAmount,
    #[msg("Invalid probability value")]
    InvalidProbability,
    #[msg("Cannot aggregate votes in current state")]
    CannotAggregateVotes,
    #[msg("Invalid oracle")]
    InvalidOracle,
    #[msg("Cannot resolve market in current state")]
    CannotResolveMarket,
    #[msg("Market not resolved")]
    MarketNotResolved,
    #[msg("Payout already claimed")]
    PayoutAlreadyClaimed,
    #[msg("Invalid computation output")]
    InvalidComputationOutput,
    #[msg("Invalid vote")]
    InvalidVote,

    // ======= ORACLE SYSTEM ERROR CODES =======
    #[msg("Market is not locked for oracle resolution")]
    MarketNotLocked,
    #[msg("Invalid confidence score (must be 0-100)")]
    InvalidConfidenceScore,
    #[msg("Proposal is not active")]
    ProposalNotActive,
    #[msg("Challenge period is active")]
    ChallengePeriodActive,
    #[msg("Challenge period has expired")]
    ChallengePeriodExpired,
    #[msg("Invalid consensus threshold")]
    InvalidConsensusThreshold,
    #[msg("Invalid sensitivity threshold")]
    InvalidSensitivityThreshold,
    #[msg("Dispute reason is too long")]
    DisputeReasonTooLong,
    #[msg("Insufficient dispute bond")]
    InsufficientDisputeBond,
    #[msg("Insufficient validator stake")]
    InsufficientValidatorStake,
    #[msg("Invalid oracle vote")]
    InvalidOracleVote,
    #[msg("Collusion detected in oracle voting")]
    CollusionDetected,
}

} // End of prediction_markets module
