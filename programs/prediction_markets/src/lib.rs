use anchor_lang::prelude::*;
use arcium_anchor::prelude::*;
use arcium_client::idl::arcium::types::{CallbackAccount, CircuitSource, OffChainCircuitSource};

// Import oracle system
pub mod oracle_system;
pub use oracle_system::*;

// Computation definition offsets for each encrypted instruction
const COMP_DEF_OFFSET_SUBMIT_VOTE: u32 = comp_def_offset("submit_private_vote");
const COMP_DEF_OFFSET_AGGREGATE: u32 = comp_def_offset("aggregate_market_votes");
const COMP_DEF_OFFSET_CALCULATE_PAYOUT: u32 = comp_def_offset("calculate_payout");
const COMP_DEF_OFFSET_CALCULATE_ODDS: u32 = comp_def_offset("calculate_market_odds");

declare_id!("6crfTQztShryQeMRaPG5H5Uf7Zd69wyPRRF4AFBndh9F");

#[arcium_program]
pub mod prediction_markets {
    use super::*;

    // =====================================================================
    // COMPUTATION DEFINITION INITIALIZATION
    // =====================================================================

    /// Initialize computation definition for submit_private_vote with offchain circuit storage
    pub fn init_submit_vote_comp_def(ctx: Context<InitSubmitVoteCompDef>) -> Result<()> {
        init_comp_def(
            ctx.accounts,
            true,
            0,
            Some(CircuitSource::OffChain(OffChainCircuitSource {
                source: "https://esuvpguudqdlgwxhweqp.supabase.co/storage/v1/object/public/arcium-circuits/submit_private_vote_testnet.arcis".to_string(),
                hash: [0; 32], // Hash verification not enforced yet
            })),
            None,
        )?;
        Ok(())
    }

    /// Initialize computation definition for aggregate_market_votes with offchain circuit storage
    pub fn init_aggregate_comp_def(ctx: Context<InitAggregateCompDef>) -> Result<()> {
        init_comp_def(
            ctx.accounts,
            true,
            0,
            Some(CircuitSource::OffChain(OffChainCircuitSource {
                source: "https://esuvpguudqdlgwxhweqp.supabase.co/storage/v1/object/public/arcium-circuits/aggregate_market_votes_testnet.arcis".to_string(),
                hash: [0; 32],
            })),
            None,
        )?;
        Ok(())
    }

    /// Initialize computation definition for calculate_payout with offchain circuit storage
    pub fn init_calculate_payout_comp_def(ctx: Context<InitCalculatePayoutCompDef>) -> Result<()> {
        init_comp_def(
            ctx.accounts,
            true,
            0,
            Some(CircuitSource::OffChain(OffChainCircuitSource {
                source: "https://esuvpguudqdlgwxhweqp.supabase.co/storage/v1/object/public/arcium-circuits/calculate_payout_testnet.arcis".to_string(),
                hash: [0; 32],
            })),
            None,
        )?;
        Ok(())
    }

    /// Initialize computation definition for calculate_market_odds with offchain circuit storage
    pub fn init_calculate_odds_comp_def(ctx: Context<InitCalculateOddsCompDef>) -> Result<()> {
        init_comp_def(
            ctx.accounts,
            true,
            0,
            Some(CircuitSource::OffChain(OffChainCircuitSource {
                source: "https://esuvpguudqdlgwxhweqp.supabase.co/storage/v1/object/public/arcium-circuits/calculate_market_odds_testnet.arcis".to_string(),
                hash: [0; 32],
            })),
            None,
        )?;
        Ok(())
    }

    // =====================================================================
    // MARKET CREATION & MANAGEMENT
    // =====================================================================

    /// Creates a new prediction market with encrypted voting
    ///
    /// # Arguments
    /// * `market_id` - Unique identifier for this market
    /// * `title` - Market question (max 200 chars)
    /// * `description` - Detailed description (max 1000 chars)
    /// * `image_url` - Market image URL (max 200 chars)
    /// * `category` - Market category (Sports, Politics, etc.)
    /// * `voting_ends_at` - Unix timestamp when voting closes
    /// * `oracle_type` - Type of oracle for resolution
    pub fn create_market(
        ctx: Context<CreateMarket>,
        market_id: u64,
        title: String,
        description: String,
        image_url: String,
        category: MarketCategory,
        voting_ends_at: i64,
        oracle_type: OracleType,
    ) -> Result<()> {
        require!(title.len() <= 200, ErrorCode::TitleTooLong);
        require!(description.len() <= 1000, ErrorCode::DescriptionTooLong);
        require!(image_url.len() <= 200, ErrorCode::ImageUrlTooLong);
        require!(
            voting_ends_at > Clock::get()?.unix_timestamp,
            ErrorCode::InvalidEndTime
        );

        let market = &mut ctx.accounts.prediction_market;
        market.market_id = market_id;
        market.creator = ctx.accounts.creator.key();
        market.category = category;
        market.status = MarketStatus::Active;
        market.created_at = Clock::get()?.unix_timestamp;
        market.voting_ends_at = voting_ends_at;
        market.resolution_timestamp = 0;
        market.oracle_type = oracle_type;
        market.oracle_pubkey = ctx.accounts.oracle.key();
        market.resolved_outcome = None;
        market.bump = ctx.bumps.prediction_market;

        // Initialize encrypted vote state (will be set after MPC initialization)
        market.encrypted_vote_state = [[0; 32]; 11]; // 11 encrypted fields
        market.nonce = 0;

        // Store dynamic strings directly
        market.title = title.clone();
        market.description = description.clone();
        market.image_url = image_url.clone();

        market.total_stake = 0;
        market.yes_stake = 0;
        market.no_stake = 0;
        market.participant_count = 0;

        emit!(MarketCreatedEvent {
            market_id,
            creator: market.creator,
            title: title,
            category: category as u8,
            oracle_type: market.oracle_type as u8,
            voting_ends_at,
            timestamp: market.created_at,
        });

        Ok(())
    }

    /// Initialize user profile for tracking stats and reputation
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

    // =====================================================================
    // ENCRYPTED VOTING WITH ARCIUM MPC
    // =====================================================================

    /// Submit encrypted vote to prediction market
    ///
    /// This queues an MPC computation that validates and processes the encrypted vote
    /// without revealing individual vote choices to anyone
    ///
    /// # Arguments
    /// * `vote_data_encrypted` - Encrypted vote data (32 bytes per field x 7 fields, voter derived from signer)
    /// * `vote_encryption_pubkey` - User's x25519 public key
    /// * `vote_nonce` - Nonce for vote encryption
    /// * `stake_amount` - Amount staked on this prediction
    pub fn submit_encrypted_vote(
        ctx: Context<SubmitEncryptedVote>,
        computation_offset: u64,
        vote_data_encrypted: [[u8; 32]; 7], // Encrypted VoteData struct (without voter field)
        vote_encryption_pubkey: [u8; 32],
        vote_nonce: u128,
        stake_amount: u64,
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

        // Capture position key before mutable borrow
        let position_key = ctx.accounts.user_position.key();
        let user_key = ctx.accounts.user.key();
        let current_timestamp = Clock::get()?.unix_timestamp;

        // Create user position account
        let position = &mut ctx.accounts.user_position;
        position.user = user_key;
        position.market = ctx.accounts.prediction_market.key();
        position.stake_amount = stake_amount;
        position.timestamp = current_timestamp;
        position.is_claimed = false;
        position.payout_amount = 0;
        position.encrypted_vote_data = vote_data_encrypted;
        position.vote_pubkey = vote_encryption_pubkey;
        position.vote_nonce = vote_nonce;
        position.bump = ctx.bumps.user_position;

        // Queue MPC computation for vote validation
        // Note: voter field is derived from user pubkey on-chain, not passed as encrypted
        let args = vec![
            Argument::ArcisPubkey(vote_encryption_pubkey),
            Argument::PlaintextU128(vote_nonce),
            // Pass 7 encrypted fields of VoteData (voter is derived from signer)
            Argument::EncryptedU64(vote_data_encrypted[0]),       // market_id
            Argument::EncryptedU8(vote_data_encrypted[1]),        // vote_choice
            Argument::EncryptedU64(vote_data_encrypted[2]),       // stake_amount
            Argument::EncryptedU8(vote_data_encrypted[3]),        // predicted_probability
            Argument::EncryptedU16(vote_data_encrypted[4]),       // conviction_score
            Argument::EncryptedU64(vote_data_encrypted[5]),       // timestamp
            Argument::EncryptedU128(vote_data_encrypted[6]),      // nonce
        ];

        ctx.accounts.sign_pda_account.bump = ctx.bumps.sign_pda_account;

        queue_computation(
            ctx.accounts,
            computation_offset,
            args,
            None,
            vec![SubmitPrivateVoteCallback::callback_ix(&[CallbackAccount {
                pubkey: position_key,
                is_writable: true,
            }])],
        )?;

        // Update market stats (public aggregates)
        let market = &mut ctx.accounts.prediction_market;
        let market_id = market.market_id;
        market.participant_count += 1;
        market.total_stake += stake_amount;

        // Update user profile
        let profile = &mut ctx.accounts.user_profile;
        profile.total_markets_participated += 1;
        profile.last_activity = current_timestamp;

        emit!(VoteSubmittedEvent {
            market_id,
            user: user_key,
            stake_amount,
            timestamp: current_timestamp,
        });

        Ok(())
    }

    #[arcium_callback(encrypted_ix = "submit_private_vote")]
    pub fn submit_private_vote_callback(
        ctx: Context<SubmitPrivateVoteCallback>,
        output: ComputationOutputs<SubmitPrivateVoteOutput>,
    ) -> Result<()> {
        let validation_result = match output {
            ComputationOutputs::Success(SubmitPrivateVoteOutput { field_0 }) => field_0,
            _ => return Err(ErrorCode::AbortedComputation.into()),
        };

        // Check if vote was valid (1 = valid, 0 = invalid)
        if validation_result.ciphertexts[0][0] == 0 {
            return Err(ErrorCode::InvalidVoteData.into());
        }

        ctx.accounts.user_position.is_validated = true;

        Ok(())
    }

    /// Aggregate votes for market state calculation (called periodically or on-demand)
    pub fn aggregate_votes(
        ctx: Context<AggregateVotes>,
        computation_offset: u64,
    ) -> Result<()> {
        require!(
            ctx.accounts.prediction_market.status == MarketStatus::Active,
            ErrorCode::MarketNotActive
        );

        // Queue MPC computation to aggregate the new vote with current market state
        let market = &ctx.accounts.prediction_market;
        let position = &ctx.accounts.user_position;

        let args = vec![
            // Pass encrypted vote data
            Argument::ArcisPubkey(position.vote_pubkey),
            Argument::PlaintextU128(position.vote_nonce),
            Argument::EncryptedU64(position.encrypted_vote_data[0]),
            Argument::EncryptedU8(position.encrypted_vote_data[1]),
            Argument::EncryptedU64(position.encrypted_vote_data[2]),
            Argument::EncryptedU8(position.encrypted_vote_data[3]),
            Argument::EncryptedU16(position.encrypted_vote_data[4]),
            Argument::EncryptedU64(position.encrypted_vote_data[5]),
            Argument::EncryptedU128(position.encrypted_vote_data[6]),
            // Pass current encrypted market state
            Argument::PlaintextU128(market.nonce),
            Argument::Account(
                market.key(),
                8 + 1,  // discriminator + bump
                32 * 11, // encrypted_vote_state [[u8; 32]; 11] = 352 bytes
            ),
        ];

        ctx.accounts.sign_pda_account.bump = ctx.bumps.sign_pda_account;

        queue_computation(
            ctx.accounts,
            computation_offset,
            args,
            None,
            vec![AggregateMarketVotesCallback::callback_ix(&[CallbackAccount {
                pubkey: ctx.accounts.prediction_market.key(),
                is_writable: true,
            }])],
        )?;

        Ok(())
    }

    #[arcium_callback(encrypted_ix = "aggregate_market_votes")]
    pub fn aggregate_market_votes_callback(
        ctx: Context<AggregateMarketVotesCallback>,
        output: ComputationOutputs<AggregateMarketVotesOutput>,
    ) -> Result<()> {
        let market_state = match output {
            ComputationOutputs::Success(AggregateMarketVotesOutput { field_0 }) => field_0,
            _ => return Err(ErrorCode::AbortedComputation.into()),
        };

        // Update encrypted market state (11 fields from MarketVotingState)
        let encrypted_state: [[u8; 32]; 11] = market_state.ciphertexts;
        ctx.accounts.prediction_market.encrypted_vote_state = encrypted_state;
        ctx.accounts.prediction_market.nonce = market_state.nonce;

        Ok(())
    }

    // =====================================================================
    // ORACLE RESOLUTION
    // =====================================================================

    /// Resolve market with oracle outcome
    ///
    /// Only authorized oracle can call this to finalize the market
    pub fn resolve_market(
        ctx: Context<ResolveMarket>,
        outcome: bool,
    ) -> Result<()> {
        require!(
            ctx.accounts.oracle.key() == ctx.accounts.prediction_market.oracle_pubkey,
            ErrorCode::InvalidOracle
        );
        require!(
            ctx.accounts.prediction_market.status == MarketStatus::Active
                || ctx.accounts.prediction_market.status == MarketStatus::Locked,
            ErrorCode::CannotResolveMarket
        );

        let market = &mut ctx.accounts.prediction_market;
        market.status = MarketStatus::Resolved;
        market.resolved_outcome = Some(outcome);
        market.resolution_timestamp = Clock::get()?.unix_timestamp;

        emit!(MarketResolvedEvent {
            market_id: market.market_id,
            outcome,
            resolution_timestamp: market.resolution_timestamp,
        });

        Ok(())
    }

    // =====================================================================
    // PAYOUT CALCULATION & CLAIMS
    // =====================================================================

    /// Calculate payout for user using MPC
    ///
    /// This queues an encrypted computation to calculate the user's payout
    /// based on their encrypted vote and the market outcome
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

        let market = &ctx.accounts.prediction_market;
        let position = &ctx.accounts.user_position;

        // Build encrypted PayoutData and queue MPC computation
        let args = vec![
            Argument::ArcisPubkey(position.vote_pubkey),
            Argument::PlaintextU128(position.vote_nonce),
            // User's encrypted vote data (voter derived from position.user)
            Argument::EncryptedU64(position.encrypted_vote_data[0]),       // market_id
            Argument::EncryptedU64(position.encrypted_vote_data[2]),       // user_stake
            Argument::EncryptedU8(position.encrypted_vote_data[1]),        // user_vote
            Argument::EncryptedU8(position.encrypted_vote_data[3]),        // user_probability
            Argument::EncryptedU16(position.encrypted_vote_data[4]),       // user_conviction
            // Market outcome (plaintext since it's public after resolution)
            Argument::PlaintextU8(if market.resolved_outcome.unwrap() { 1 } else { 0 }),
            Argument::PlaintextU64(market.yes_stake),
            Argument::PlaintextU64(market.no_stake),
            // Bonus pools (could be dynamic based on market size)
            Argument::PlaintextU64(market.total_stake / 100), // 1% accuracy bonus pool
            Argument::PlaintextU64(market.total_stake / 200), // 0.5% conviction bonus pool
        ];

        ctx.accounts.sign_pda_account.bump = ctx.bumps.sign_pda_account;

        queue_computation(
            ctx.accounts,
            computation_offset,
            args,
            None,
            vec![CalculatePayoutCallback::callback_ix(&[CallbackAccount {
                pubkey: ctx.accounts.user_position.key(),
                is_writable: true,
            }])],
        )?;

        Ok(())
    }

    #[arcium_callback(encrypted_ix = "calculate_payout")]
    pub fn calculate_payout_callback(
        ctx: Context<CalculatePayoutCallback>,
        output: ComputationOutputs<CalculatePayoutOutput>,
    ) -> Result<()> {
        let payout_amount_encrypted = match output {
            ComputationOutputs::Success(CalculatePayoutOutput { field_0 }) => field_0,
            _ => return Err(ErrorCode::AbortedComputation.into()),
        };

        // Store encrypted payout amount
        ctx.accounts.user_position.encrypted_payout = payout_amount_encrypted.ciphertexts[0];
        ctx.accounts.user_position.payout_nonce = payout_amount_encrypted.nonce;

        Ok(())
    }

    /// Claim payout after calculation
    ///
    /// User must decrypt their payout amount client-side and verify
    pub fn claim_payout(ctx: Context<ClaimPayout>) -> Result<()> {
        require!(
            ctx.accounts.prediction_market.status == MarketStatus::Resolved,
            ErrorCode::MarketNotResolved
        );
        require!(
            !ctx.accounts.user_position.is_claimed,
            ErrorCode::PayoutAlreadyClaimed
        );

        let position = &mut ctx.accounts.user_position;
        position.is_claimed = true;

        // In production, this would transfer tokens from market vault to user
        // For now, just mark as claimed

        // Update user profile
        let _profile = &mut ctx.accounts.user_profile;
        // Payout amount would be decrypted client-side
        // _profile.total_winnings += decrypted_payout;

        emit!(PayoutClaimedEvent {
            market_id: ctx.accounts.prediction_market.market_id,
            user: position.user,
            timestamp: Clock::get()?.unix_timestamp,
        });

        Ok(())
    }

    // =====================================================================
    // MARKET STATISTICS & ODDS
    // =====================================================================

    /// Calculate market odds using encrypted vote data
    ///
    /// This reveals aggregated market odds without revealing individual votes
    pub fn calculate_market_odds(
        ctx: Context<CalculateMarketOdds>,
        computation_offset: u64,
    ) -> Result<()> {
        require!(
            ctx.accounts.prediction_market.status == MarketStatus::Active,
            ErrorCode::MarketNotActive
        );

        let market = &ctx.accounts.prediction_market;

        let args = vec![
            Argument::PlaintextU128(market.nonce),
            Argument::Account(
                market.key(),
                8 + 1,  // discriminator + bump
                32 * 11, // encrypted_vote_state [[u8; 32]; 11] = 352 bytes
            ),
        ];

        ctx.accounts.sign_pda_account.bump = ctx.bumps.sign_pda_account;

        queue_computation(
            ctx.accounts,
            computation_offset,
            args,
            None,
            vec![CalculateMarketOddsCallback::callback_ix(&[])],
        )?;

        Ok(())
    }

    #[arcium_callback(encrypted_ix = "calculate_market_odds")]
    pub fn calculate_market_odds_callback(
        ctx: Context<CalculateMarketOddsCallback>,
        output: ComputationOutputs<CalculateMarketOddsOutput>,
    ) -> Result<()> {
        let _odds_tuple = match output {
            ComputationOutputs::Success(CalculateMarketOddsOutput { field_0 }) => field_0,
            _ => return Err(ErrorCode::AbortedComputation.into()),
        };

        emit!(MarketOddsUpdatedEvent {
            market_id: ctx.accounts.prediction_market.market_id,
            // odds_tuple is (yes_prob, no_prob, participants, high_confidence)
            timestamp: Clock::get()?.unix_timestamp,
        });

        Ok(())
    }
}

// =====================================================================
// ACCOUNT STRUCTURES
// =====================================================================

/// Main prediction market account with encrypted vote state
/// Note: encrypted_vote_state and nonce are placed early for fixed offset access
#[account]
pub struct PredictionMarket {
    pub bump: u8,
    // Encrypted vote aggregation state (stored at fixed offset for MPC)
    // MarketVotingState has 11 u64 fields (market_id, yes/no counts, stakes, participants, etc.)
    pub encrypted_vote_state: [[u8; 32]; 11],
    pub nonce: u128,
    // Market identifiers and metadata
    pub market_id: u64,
    pub creator: Pubkey,
    pub category: MarketCategory,
    pub status: MarketStatus,
    pub created_at: i64,
    pub voting_ends_at: i64,
    pub resolution_timestamp: i64,
    pub oracle_type: OracleType,
    pub oracle_pubkey: Pubkey,
    pub resolved_outcome: Option<bool>,
    // Public aggregate stats (not encrypted)
    pub total_stake: u64,
    pub yes_stake: u64,
    pub no_stake: u64,
    pub participant_count: u32,
    // Variable-length fields at end
    pub title: String,           // Dynamic string (4 + len bytes)
    pub description: String,     // Dynamic string (4 + len bytes)
    pub image_url: String,       // Dynamic string (4 + len bytes)
}

/// User's encrypted position in a market
#[account]
pub struct UserPosition {
    pub user: Pubkey,
    pub market: Pubkey,
    pub stake_amount: u64,
    pub timestamp: i64,
    pub is_claimed: bool,
    pub is_validated: bool,
    // Encrypted vote data (7 fields: market_id, vote_choice, stake, prob, conviction, timestamp, nonce)
    // voter field is derived from user pubkey, not encrypted
    pub encrypted_vote_data: [[u8; 32]; 7],
    pub vote_pubkey: [u8; 32],
    pub vote_nonce: u128,
    // Encrypted payout result
    pub encrypted_payout: [u8; 32],
    pub payout_nonce: u128,
    pub payout_amount: u64, // Decrypted amount (set client-side before claim)
    pub bump: u8,
}

/// User profile for reputation and statistics
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
    pub achievements: [u8; 32],
    pub preferred_categories: u16,
    pub bump: u8,
}

// =====================================================================
// ENUMS
// =====================================================================

#[derive(AnchorSerialize, AnchorDeserialize, Clone, PartialEq)]
pub enum MarketStatus {
    Active,
    Locked,
    Resolved,
    Settled,
    Cancelled,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, PartialEq)]
pub enum MarketCategory {
    Sports = 0,
    Politics = 1,
    Economics = 2,
    Technology = 3,
    Entertainment = 4,
    Weather = 5,
    Custom = 99,
}

// =====================================================================
// ACCOUNT VALIDATION CONTEXTS
// =====================================================================

#[derive(Accounts)]
#[instruction(market_id: u64)]
pub struct CreateMarket<'info> {
    #[account(mut)]
    pub creator: Signer<'info>,
    #[account(
        init,
        payer = creator,
        space = 8 + // discriminator
                1 + // bump
                352 + // encrypted_vote_state [[u8; 32]; 11]
                16 + // nonce (u128)
                8 + // market_id
                32 + // creator
                1 + // category
                1 + // status
                8 + // created_at
                8 + // voting_ends_at
                8 + // resolution_timestamp
                1 + // oracle_type
                32 + // oracle_pubkey
                2 + // resolved_outcome (Option<bool>)
                8 + // total_stake
                8 + // yes_stake
                8 + // no_stake
                4 + // participant_count
                4 + 200 + // title (String max 200)
                4 + 1000 + // description (String max 1000)
                4 + 200, // image_url (String max 200)
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
        space = 8 + 120,
        seeds = [b"profile", user.key().as_ref()],
        bump
    )]
    pub user_profile: Account<'info, UserProfile>,
    pub system_program: Program<'info, System>,
}

#[queue_computation_accounts("submit_private_vote", user)]
#[derive(Accounts)]
#[instruction(computation_offset: u64)]
pub struct SubmitEncryptedVote<'info> {
    #[account(mut)]
    pub user: Signer<'info>,
    #[account(
        init_if_needed,
        space = 9,
        payer = user,
        seeds = [&SIGN_PDA_SEED],
        bump,
        address = derive_sign_pda!(),
    )]
    pub sign_pda_account: Account<'info, SignerAccount>,
    #[account(address = derive_mxe_pda!())]
    pub mxe_account: Account<'info, MXEAccount>,
    #[account(mut, address = derive_mempool_pda!())]
    /// CHECK: mempool_account, checked by the arcium program
    pub mempool_account: UncheckedAccount<'info>,
    #[account(mut, address = derive_execpool_pda!())]
    /// CHECK: executing_pool, checked by the arcium program
    pub executing_pool: UncheckedAccount<'info>,
    #[account(mut, address = derive_comp_pda!(computation_offset))]
    /// CHECK: computation_account, checked by the arcium program
    pub computation_account: UncheckedAccount<'info>,
    #[account(address = derive_comp_def_pda!(COMP_DEF_OFFSET_SUBMIT_VOTE))]
    pub comp_def_account: Account<'info, ComputationDefinitionAccount>,
    #[account(mut, address = derive_cluster_pda!(mxe_account))]
    pub cluster_account: Account<'info, Cluster>,
    #[account(mut, address = ARCIUM_FEE_POOL_ACCOUNT_ADDRESS)]
    pub pool_account: Account<'info, FeePool>,
    #[account(address = ARCIUM_CLOCK_ACCOUNT_ADDRESS)]
    pub clock_account: Account<'info, ClockAccount>,
    pub system_program: Program<'info, System>,
    pub arcium_program: Program<'info, Arcium>,
    #[account(mut)]
    pub prediction_market: Account<'info, PredictionMarket>,
    #[account(
        init,
        payer = user,
        space = 8 + 600,
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
}

#[callback_accounts("submit_private_vote")]
#[derive(Accounts)]
pub struct SubmitPrivateVoteCallback<'info> {
    pub arcium_program: Program<'info, Arcium>,
    #[account(address = derive_comp_def_pda!(COMP_DEF_OFFSET_SUBMIT_VOTE))]
    pub comp_def_account: Account<'info, ComputationDefinitionAccount>,
    #[account(address = ::anchor_lang::solana_program::sysvar::instructions::ID)]
    /// CHECK: instructions_sysvar, checked by the account constraint
    pub instructions_sysvar: AccountInfo<'info>,
    #[account(mut)]
    pub user_position: Account<'info, UserPosition>,
}

#[queue_computation_accounts("aggregate_market_votes", payer)]
#[derive(Accounts)]
#[instruction(computation_offset: u64)]
pub struct AggregateVotes<'info> {
    #[account(mut)]
    pub payer: Signer<'info>,
    #[account(
        init_if_needed,
        space = 9,
        payer = payer,
        seeds = [&SIGN_PDA_SEED],
        bump,
        address = derive_sign_pda!(),
    )]
    pub sign_pda_account: Account<'info, SignerAccount>,
    #[account(address = derive_mxe_pda!())]
    pub mxe_account: Account<'info, MXEAccount>,
    #[account(mut, address = derive_mempool_pda!())]
    /// CHECK: mempool_account, checked by the arcium program
    pub mempool_account: UncheckedAccount<'info>,
    #[account(mut, address = derive_execpool_pda!())]
    /// CHECK: executing_pool, checked by the arcium program
    pub executing_pool: UncheckedAccount<'info>,
    #[account(mut, address = derive_comp_pda!(computation_offset))]
    /// CHECK: computation_account, checked by the arcium program
    pub computation_account: UncheckedAccount<'info>,
    #[account(address = derive_comp_def_pda!(COMP_DEF_OFFSET_AGGREGATE))]
    pub comp_def_account: Account<'info, ComputationDefinitionAccount>,
    #[account(mut, address = derive_cluster_pda!(mxe_account))]
    pub cluster_account: Account<'info, Cluster>,
    #[account(mut, address = ARCIUM_FEE_POOL_ACCOUNT_ADDRESS)]
    pub pool_account: Account<'info, FeePool>,
    #[account(address = ARCIUM_CLOCK_ACCOUNT_ADDRESS)]
    pub clock_account: Account<'info, ClockAccount>,
    pub system_program: Program<'info, System>,
    pub arcium_program: Program<'info, Arcium>,
    #[account(mut)]
    pub prediction_market: Account<'info, PredictionMarket>,
    pub user_position: Account<'info, UserPosition>,
}

#[callback_accounts("aggregate_market_votes")]
#[derive(Accounts)]
pub struct AggregateMarketVotesCallback<'info> {
    pub arcium_program: Program<'info, Arcium>,
    #[account(address = derive_comp_def_pda!(COMP_DEF_OFFSET_AGGREGATE))]
    pub comp_def_account: Account<'info, ComputationDefinitionAccount>,
    #[account(address = ::anchor_lang::solana_program::sysvar::instructions::ID)]
    /// CHECK: instructions_sysvar, checked by the account constraint
    pub instructions_sysvar: AccountInfo<'info>,
    #[account(mut)]
    pub prediction_market: Account<'info, PredictionMarket>,
}

#[derive(Accounts)]
pub struct ResolveMarket<'info> {
    #[account(mut)]
    pub oracle: Signer<'info>,
    #[account(mut)]
    pub prediction_market: Account<'info, PredictionMarket>,
}

#[queue_computation_accounts("calculate_payout", user)]
#[derive(Accounts)]
#[instruction(computation_offset: u64)]
pub struct CalculateUserPayout<'info> {
    #[account(mut)]
    pub user: Signer<'info>,
    #[account(
        init_if_needed,
        space = 9,
        payer = user,
        seeds = [&SIGN_PDA_SEED],
        bump,
        address = derive_sign_pda!(),
    )]
    pub sign_pda_account: Account<'info, SignerAccount>,
    #[account(address = derive_mxe_pda!())]
    pub mxe_account: Account<'info, MXEAccount>,
    #[account(mut, address = derive_mempool_pda!())]
    /// CHECK: mempool_account, checked by the arcium program
    pub mempool_account: UncheckedAccount<'info>,
    #[account(mut, address = derive_execpool_pda!())]
    /// CHECK: executing_pool, checked by the arcium program
    pub executing_pool: UncheckedAccount<'info>,
    #[account(mut, address = derive_comp_pda!(computation_offset))]
    /// CHECK: computation_account, checked by the arcium program
    pub computation_account: UncheckedAccount<'info>,
    #[account(address = derive_comp_def_pda!(COMP_DEF_OFFSET_CALCULATE_PAYOUT))]
    pub comp_def_account: Account<'info, ComputationDefinitionAccount>,
    #[account(mut, address = derive_cluster_pda!(mxe_account))]
    pub cluster_account: Account<'info, Cluster>,
    #[account(mut, address = ARCIUM_FEE_POOL_ACCOUNT_ADDRESS)]
    pub pool_account: Account<'info, FeePool>,
    #[account(address = ARCIUM_CLOCK_ACCOUNT_ADDRESS)]
    pub clock_account: Account<'info, ClockAccount>,
    pub system_program: Program<'info, System>,
    pub arcium_program: Program<'info, Arcium>,
    pub prediction_market: Account<'info, PredictionMarket>,
    #[account(
        mut,
        seeds = [b"position", user.key().as_ref(), prediction_market.key().as_ref()],
        bump = user_position.bump
    )]
    pub user_position: Account<'info, UserPosition>,
}

#[callback_accounts("calculate_payout")]
#[derive(Accounts)]
pub struct CalculatePayoutCallback<'info> {
    pub arcium_program: Program<'info, Arcium>,
    #[account(address = derive_comp_def_pda!(COMP_DEF_OFFSET_CALCULATE_PAYOUT))]
    pub comp_def_account: Account<'info, ComputationDefinitionAccount>,
    #[account(address = ::anchor_lang::solana_program::sysvar::instructions::ID)]
    /// CHECK: instructions_sysvar, checked by the account constraint
    pub instructions_sysvar: AccountInfo<'info>,
    #[account(mut)]
    pub user_position: Account<'info, UserPosition>,
}

#[derive(Accounts)]
pub struct ClaimPayout<'info> {
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
        mut,
        seeds = [b"profile", user.key().as_ref()],
        bump = user_profile.bump
    )]
    pub user_profile: Account<'info, UserProfile>,
}

#[queue_computation_accounts("calculate_market_odds", payer)]
#[derive(Accounts)]
#[instruction(computation_offset: u64)]
pub struct CalculateMarketOdds<'info> {
    #[account(mut)]
    pub payer: Signer<'info>,
    #[account(
        init_if_needed,
        space = 9,
        payer = payer,
        seeds = [&SIGN_PDA_SEED],
        bump,
        address = derive_sign_pda!(),
    )]
    pub sign_pda_account: Account<'info, SignerAccount>,
    #[account(address = derive_mxe_pda!())]
    pub mxe_account: Account<'info, MXEAccount>,
    #[account(mut, address = derive_mempool_pda!())]
    /// CHECK: mempool_account, checked by the arcium program
    pub mempool_account: UncheckedAccount<'info>,
    #[account(mut, address = derive_execpool_pda!())]
    /// CHECK: executing_pool, checked by the arcium program
    pub executing_pool: UncheckedAccount<'info>,
    #[account(mut, address = derive_comp_pda!(computation_offset))]
    /// CHECK: computation_account, checked by the arcium program
    pub computation_account: UncheckedAccount<'info>,
    #[account(address = derive_comp_def_pda!(COMP_DEF_OFFSET_CALCULATE_ODDS))]
    pub comp_def_account: Account<'info, ComputationDefinitionAccount>,
    #[account(mut, address = derive_cluster_pda!(mxe_account))]
    pub cluster_account: Account<'info, Cluster>,
    #[account(mut, address = ARCIUM_FEE_POOL_ACCOUNT_ADDRESS)]
    pub pool_account: Account<'info, FeePool>,
    #[account(address = ARCIUM_CLOCK_ACCOUNT_ADDRESS)]
    pub clock_account: Account<'info, ClockAccount>,
    pub system_program: Program<'info, System>,
    pub arcium_program: Program<'info, Arcium>,
    pub prediction_market: Account<'info, PredictionMarket>,
}

#[callback_accounts("calculate_market_odds")]
#[derive(Accounts)]
pub struct CalculateMarketOddsCallback<'info> {
    pub arcium_program: Program<'info, Arcium>,
    #[account(address = derive_comp_def_pda!(COMP_DEF_OFFSET_CALCULATE_ODDS))]
    pub comp_def_account: Account<'info, ComputationDefinitionAccount>,
    #[account(address = ::anchor_lang::solana_program::sysvar::instructions::ID)]
    /// CHECK: instructions_sysvar, checked by the account constraint
    pub instructions_sysvar: AccountInfo<'info>,
    pub prediction_market: Account<'info, PredictionMarket>,
}

// Init comp def contexts
#[init_computation_definition_accounts("submit_private_vote", payer)]
#[derive(Accounts)]
pub struct InitSubmitVoteCompDef<'info> {
    #[account(mut)]
    pub payer: Signer<'info>,
    #[account(mut, address = derive_mxe_pda!())]
    pub mxe_account: Box<Account<'info, MXEAccount>>,
    #[account(mut)]
    /// CHECK: comp_def_account, checked by arcium program
    pub comp_def_account: UncheckedAccount<'info>,
    pub arcium_program: Program<'info, Arcium>,
    pub system_program: Program<'info, System>,
}

#[init_computation_definition_accounts("aggregate_market_votes", payer)]
#[derive(Accounts)]
pub struct InitAggregateCompDef<'info> {
    #[account(mut)]
    pub payer: Signer<'info>,
    #[account(mut, address = derive_mxe_pda!())]
    pub mxe_account: Box<Account<'info, MXEAccount>>,
    #[account(mut)]
    /// CHECK: comp_def_account, checked by arcium program
    pub comp_def_account: UncheckedAccount<'info>,
    pub arcium_program: Program<'info, Arcium>,
    pub system_program: Program<'info, System>,
}

#[init_computation_definition_accounts("calculate_payout", payer)]
#[derive(Accounts)]
pub struct InitCalculatePayoutCompDef<'info> {
    #[account(mut)]
    pub payer: Signer<'info>,
    #[account(mut, address = derive_mxe_pda!())]
    pub mxe_account: Box<Account<'info, MXEAccount>>,
    #[account(mut)]
    /// CHECK: comp_def_account, checked by arcium program
    pub comp_def_account: UncheckedAccount<'info>,
    pub arcium_program: Program<'info, Arcium>,
    pub system_program: Program<'info, System>,
}

#[init_computation_definition_accounts("calculate_market_odds", payer)]
#[derive(Accounts)]
pub struct InitCalculateOddsCompDef<'info> {
    #[account(mut)]
    pub payer: Signer<'info>,
    #[account(mut, address = derive_mxe_pda!())]
    pub mxe_account: Box<Account<'info, MXEAccount>>,
    #[account(mut)]
    /// CHECK: comp_def_account, checked by arcium program
    pub comp_def_account: UncheckedAccount<'info>,
    pub arcium_program: Program<'info, Arcium>,
    pub system_program: Program<'info, System>,
}

// =====================================================================
// EVENTS
// =====================================================================

#[event]
pub struct MarketCreatedEvent {
    pub market_id: u64,
    pub creator: Pubkey,
    pub title: String,
    pub category: u8,
    pub oracle_type: u8,
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
pub struct PayoutClaimedEvent {
    pub market_id: u64,
    pub user: Pubkey,
    pub timestamp: i64,
}

#[event]
pub struct MarketOddsUpdatedEvent {
    pub market_id: u64,
    pub timestamp: i64,
}

// =====================================================================
// ERROR CODES
// =====================================================================

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
    #[msg("Invalid oracle")]
    InvalidOracle,
    #[msg("Cannot resolve market in current state")]
    CannotResolveMarket,
    #[msg("Market not resolved")]
    MarketNotResolved,
    #[msg("Payout already claimed")]
    PayoutAlreadyClaimed,
    #[msg("The computation was aborted")]
    AbortedComputation,
    #[msg("Invalid vote data")]
    InvalidVoteData,
    #[msg("Invalid encrypted state")]
    InvalidEncryptedState,
    #[msg("Cluster not set")]
    ClusterNotSet,
}
