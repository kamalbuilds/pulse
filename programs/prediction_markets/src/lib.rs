use anchor_lang::prelude::*;

declare_id!("11111111111111111111111111111112");

#[derive(AnchorSerialize, AnchorDeserialize, Clone, PartialEq)]
pub enum MarketStatus {
    Active,
    Resolved,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, PartialEq)]
pub enum VoteChoice {
    Yes,
    No,
}

#[account]
pub struct PredictionMarket {
    pub market_id: u64,
    pub creator: Pubkey,
    pub status: MarketStatus,
    pub yes_stake: u64,
    pub no_stake: u64,
    pub resolved_outcome: Option<bool>,
    pub bump: u8,
}

#[account]
pub struct UserPosition {
    pub user: Pubkey,
    pub market: Pubkey,
    pub vote_choice: VoteChoice,
    pub stake_amount: u64,
    pub is_claimed: bool,
    pub bump: u8,
}

#[program]
pub mod prediction_markets {
    use super::*;

    pub fn create_market(
        ctx: Context<CreateMarket>,
        market_id: u64,
    ) -> Result<()> {
        let market = &mut ctx.accounts.prediction_market;
        market.market_id = market_id;
        market.creator = ctx.accounts.creator.key();
        market.status = MarketStatus::Active;
        market.yes_stake = 0;
        market.no_stake = 0;
        market.resolved_outcome = None;
        market.bump = ctx.bumps.prediction_market;
        Ok(())
    }

    pub fn submit_vote(
        ctx: Context<SubmitVote>,
        stake_amount: u64,
        vote_choice: VoteChoice,
    ) -> Result<()> {
        let position = &mut ctx.accounts.user_position;
        position.user = ctx.accounts.user.key();
        position.market = ctx.accounts.prediction_market.key();
        position.vote_choice = vote_choice;
        position.stake_amount = stake_amount;
        position.is_claimed = false;
        position.bump = ctx.bumps.user_position;

        let market = &mut ctx.accounts.prediction_market;
        match vote_choice {
            VoteChoice::Yes => market.yes_stake += stake_amount,
            VoteChoice::No => market.no_stake += stake_amount,
        }
        Ok(())
    }

    pub fn resolve_market(
        ctx: Context<ResolveMarket>,
        outcome: bool,
    ) -> Result<()> {
        let market = &mut ctx.accounts.prediction_market;
        market.status = MarketStatus::Resolved;
        market.resolved_outcome = Some(outcome);
        Ok(())
    }

    pub fn claim_payout(ctx: Context<ClaimPayout>) -> Result<()> {
        let position = &mut ctx.accounts.user_position;
        position.is_claimed = true;
        Ok(())
    }
}

#[derive(Accounts)]
#[instruction(market_id: u64)]
pub struct CreateMarket<'info> {
    #[account(mut)]
    pub creator: Signer<'info>,
    #[account(
        init,
        payer = creator,
        space = 100,
        seeds = [b"market", market_id.to_le_bytes().as_ref()],
        bump
    )]
    pub prediction_market: Account<'info, PredictionMarket>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct SubmitVote<'info> {
    #[account(mut)]
    pub user: Signer<'info>,
    #[account(mut)]
    pub prediction_market: Account<'info, PredictionMarket>,
    #[account(
        init,
        payer = user,
        space = 100,
        seeds = [b"position", user.key().as_ref(), prediction_market.key().as_ref()],
        bump
    )]
    pub user_position: Account<'info, UserPosition>,
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
}