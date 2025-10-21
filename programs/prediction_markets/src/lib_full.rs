use anchor_lang::prelude::*;
// use anchor_spl::token::{self, Token, TokenAccount, Transfer};

// Temporarily commented out for simple build
// pub mod oracle_system;
// pub use oracle_system::*;

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
#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, PartialEq)]
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

        // Initialize title array
        market.title = [0u8; 200];
        let title_slice = title.as_bytes();
        if title_slice.len() <= 200 {
            market.title[..title_slice.len()].copy_from_slice(title_slice);
        }

        // Initialize description array
        market.description = [0u8; 1000];
        let desc_slice = description.as_bytes();
        if desc_slice.len() <= 1000 {
            market.description[..desc_slice.len()].copy_from_slice(desc_slice);
        }

        // Initialize image_url array
        market.image_url = [0u8; 200];
        let url_slice = image_url.as_bytes();
        if url_slice.len() <= 200 {
            market.image_url[..url_slice.len()].copy_from_slice(url_slice);
        }

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

    // Submit a public vote (simplified version without Arcium)
    pub fn submit_public_vote(
        ctx: Context<SubmitPublicVote>,
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
        position.vote_choice = vote_choice.clone();
        position.stake_amount = stake_amount;
        position.predicted_probability = predicted_probability;
        position.timestamp = Clock::get()?.unix_timestamp;
        position.is_claimed = false;
        position.payout_amount = 0;
        position.computation_id = [0; 32];
        position.bump = ctx.bumps.user_position;

        // Update market statistics
        let market = &mut ctx.accounts.prediction_market;
        market.participant_count += 1;
        market.total_stake += stake_amount;

        match vote_choice {
            VoteChoice::Yes => {
                market.yes_stake += stake_amount;
            },
            VoteChoice::No => {
                market.no_stake += stake_amount;
            },
            VoteChoice::Skip => {
                // No stake adjustment for skip votes
            }
        }

        // Update user profile
        let profile = &mut ctx.accounts.user_profile;
        profile.total_markets_participated += 1;
        profile.last_activity = Clock::get()?.unix_timestamp;

        emit!(VoteSubmittedEvent {
            market_id: ctx.accounts.prediction_market.market_id,
            user: position.user,
            stake_amount,
            timestamp: position.timestamp,
        });

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
            ctx.accounts.prediction_market.status == MarketStatus::Active ||
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

    // Claim payout for user (simplified calculation)
    pub fn claim_payout(
        ctx: Context<ClaimPayout>,
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
        let position = &mut ctx.accounts.user_position;
        let profile = &mut ctx.accounts.user_profile;

        // Simple payout calculation
        let payout_amount = if let Some(resolved_outcome) = market.resolved_outcome {
            let user_predicted_correctly = match position.vote_choice {
                VoteChoice::Yes => resolved_outcome,
                VoteChoice::No => !resolved_outcome,
                VoteChoice::Skip => false, // Skip votes don't get payouts
            };

            if user_predicted_correctly {
                // Winner gets their stake back plus share of losing side
                let winning_stake = if resolved_outcome { market.yes_stake } else { market.no_stake };
                let losing_stake = if resolved_outcome { market.no_stake } else { market.yes_stake };

                if winning_stake > 0 {
                    position.stake_amount + (position.stake_amount * losing_stake) / winning_stake
                } else {
                    position.stake_amount // Only their stake back if no other winners
                }
            } else {
                0 // Losers get nothing
            }
        } else {
            0
        };

        position.payout_amount = payout_amount;
        position.is_claimed = true;

        // Update user profile
        profile.total_winnings += payout_amount;

        // Check if prediction was correct
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
        space = 2100, // 8 + 8 + 32 + 200 + 1000 + 200 + 1 + 1 + 8 + 8 + 8 + 8 + 8 + 8 + 4 + 32 + 1 + 500 + 1 + padding
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
        space = 120, // 8 + 32 + 4 + 4 + 8 + 2 + 2 + 2 + 8 + 32 + 2 + 1 + padding
        seeds = [b"profile", user.key().as_ref()],
        bump
    )]
    pub user_profile: Account<'info, UserProfile>,

    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct SubmitPublicVote<'info> {
    #[account(mut)]
    pub user: Signer<'info>,

    #[account(mut)]
    pub prediction_market: Account<'info, PredictionMarket>,

    #[account(
        init,
        payer = user,
        space = 150, // 8 + 32 + 32 + 1 + 8 + 1 + 8 + 1 + 8 + 32 + 1 + padding
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

    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct ResolveMarket<'info> {
    #[account(mut)]
    pub oracle: Signer<'info>,

    #[account(mut)]
    pub prediction_market: Account<'info, PredictionMarket>,
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
pub struct PayoutCalculatedEvent {
    pub market_id: u64,
    pub user: Pubkey,
    pub payout_amount: u64,
    pub was_correct: bool,
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
    #[msg("Invalid oracle")]
    InvalidOracle,
    #[msg("Cannot resolve market in current state")]
    CannotResolveMarket,
    #[msg("Market not resolved")]
    MarketNotResolved,
    #[msg("Payout already claimed")]
    PayoutAlreadyClaimed,
}