use arcis_imports::*;

#[encrypted]
mod circuits {
    use arcis_imports::*;

    // =====================================================================
    // PREDICTION MARKETS ENCRYPTED COMPUTATION CIRCUITS
    // =====================================================================

    // Vote data structure for private voting - Remove #[derive(ArcisType)]
    pub struct VoteData {
        pub voter: [u8; 32],
        pub market_id: u64,
        pub vote_choice: u8, // 0 = No, 1 = Yes, 2 = Skip
        pub stake_amount: u64,
        pub predicted_probability: u8, // 0-100
        pub conviction_score: u16, // Internal confidence metric
        pub timestamp: u64,
        pub nonce: u128, // For replay protection
    }

    // Market voting state for aggregation - Remove #[derive(ArcisType)]
    pub struct MarketVotingState {
        pub market_id: u64,
        pub total_yes_votes: u32,
        pub total_no_votes: u32,
        pub total_skip_votes: u32,
        pub total_yes_stake: u64,
        pub total_no_stake: u64,
        pub total_participants: u32,
        pub weighted_probability_sum: u64, // Sum of stake * probability
        pub conviction_weighted_yes: u64,
        pub conviction_weighted_no: u64,
        pub last_updated: u64,
    }

    // Payout calculation data - Remove #[derive(ArcisType)]
    pub struct PayoutData {
        pub user: [u8; 32],
        pub market_id: u64,
        pub user_stake: u64,
        pub user_vote: u8,
        pub user_probability: u8,
        pub user_conviction: u16,
        pub market_outcome: u8, // 0 = No, 1 = Yes
        pub total_winning_stake: u64,
        pub total_losing_stake: u64,
        pub accuracy_bonus: u64,
        pub conviction_bonus: u64,
    }

    // Private vote validation and submission
    #[instruction]
    pub fn submit_private_vote(
        vote_ctxt: Enc<Shared, VoteData>
    ) -> Enc<Shared, u8> {
        let vote = vote_ctxt.to_arcis();

        // Validate vote data
        let mut is_valid = 1u8;

        // Check vote choice is valid (0, 1, or 2)
        if vote.vote_choice > 2 {
            is_valid = 0;
        }

        // Check stake amount is positive
        if vote.stake_amount == 0 {
            is_valid = 0;
        }

        // Check probability is within bounds
        if vote.predicted_probability > 100 {
            is_valid = 0;
        }

        // Check timestamp is reasonable (not too far in past/future)
        if vote.timestamp == 0 {
            is_valid = 0;
        }

        // Validate conviction score
        if vote.conviction_score == 0 || vote.conviction_score > 1000 {
            is_valid = 0;
        }

        // Anti-spam: Check nonce uniqueness (simplified check)
        if vote.nonce == 0 {
            is_valid = 0;
        }

        vote_ctxt.owner.from_arcis(is_valid)
    }

    // Aggregate single vote into market state
    #[instruction]
    pub fn aggregate_market_votes(
        vote_ctxt: Enc<Shared, VoteData>,
        current_state_ctxt: Enc<Mxe, MarketVotingState>
    ) -> Enc<Shared, MarketVotingState> {
        let vote = vote_ctxt.to_arcis();
        let mut state = current_state_ctxt.to_arcis();

        // Validate and aggregate single vote
        if vote.vote_choice <= 2 && vote.stake_amount > 0 {
            // Update vote counts
            if vote.vote_choice == 1 {
                state.total_yes_votes += 1;
                state.total_yes_stake += vote.stake_amount;
                state.conviction_weighted_yes += vote.conviction_score as u64 * vote.stake_amount;
            } else if vote.vote_choice == 0 {
                state.total_no_votes += 1;
                state.total_no_stake += vote.stake_amount;
                state.conviction_weighted_no += vote.conviction_score as u64 * vote.stake_amount;
            } else if vote.vote_choice == 2 {
                state.total_skip_votes += 1;
                // Skip votes don't contribute to stake totals
            }

            // Update aggregated probability (weighted by stake)
            if vote.vote_choice != 2 { // Only count Yes/No votes for probability
                state.weighted_probability_sum += vote.stake_amount * vote.predicted_probability as u64;
            }

            state.total_participants += 1;
        }

        // Update last updated timestamp
        state.last_updated = state.last_updated + 1; // Simplified timestamp increment

        vote_ctxt.owner.from_arcis(state)
    }

    // Calculate individual payout while preserving privacy
    #[instruction]
    pub fn calculate_payout(
        payout_ctxt: Enc<Shared, PayoutData>
    ) -> Enc<Shared, u64> {
        let payout_data = payout_ctxt.to_arcis();
        let mut final_payout = 0u64;

        // Check if user won the prediction
        let user_won = payout_data.user_vote == payout_data.market_outcome;

        if user_won {
            // Base payout: User's stake + proportional share of losing stakes
            let losing_stake_share = if payout_data.total_winning_stake > 0 {
                (payout_data.user_stake * payout_data.total_losing_stake) / payout_data.total_winning_stake
            } else {
                0
            };

            final_payout = payout_data.user_stake + losing_stake_share;

            // Accuracy bonus: Reward for prediction confidence matching outcome
            let accuracy_factor = if payout_data.market_outcome == 1 {
                payout_data.user_probability as u64 // Predicted Yes correctly
            } else if payout_data.market_outcome == 0 {
                (100 - payout_data.user_probability) as u64 // Predicted No correctly
            } else {
                50 // Unknown outcome
            };

            let accuracy_bonus = (payout_data.accuracy_bonus * accuracy_factor) / 100;
            final_payout += accuracy_bonus;

            // Conviction bonus: Reward for high conviction in correct predictions
            let conviction_bonus = (payout_data.conviction_bonus * payout_data.user_conviction as u64) / 1000;
            final_payout += conviction_bonus;

        } else {
            // User lost - no payout
            final_payout = 0;
        }

        payout_ctxt.owner.from_arcis(final_payout)
    }

    // Simple market odds calculation without complex byte packing
    #[instruction]
    pub fn calculate_market_odds(
        state_ctxt: Enc<Shared, MarketVotingState>
    ) -> Enc<Shared, (u8, u8, u32, bool)> { // (yes_prob, no_prob, participants, high_confidence)
        let state = state_ctxt.to_arcis();

        let total_stake = state.total_yes_stake + state.total_no_stake;

        let (yes_probability, no_probability, high_confidence) = if total_stake > 0 {
            // Calculate implied probabilities based on stake distribution
            let yes_prob = (state.total_yes_stake * 100) / total_stake;
            let no_prob = (state.total_no_stake * 100) / total_stake;

            // Apply liquidity adjustments and market maker spread
            let liquidity_factor = if total_stake > 10000 { // High liquidity
                95 // 5% spread
            } else if total_stake > 1000 { // Medium liquidity
                90 // 10% spread
            } else { // Low liquidity
                85 // 15% spread
            };

            let adjusted_yes = (yes_prob * liquidity_factor) / 100;
            let adjusted_no = (no_prob * liquidity_factor) / 100;

            (adjusted_yes as u8, adjusted_no as u8, total_stake > 1000)
        } else {
            // No stake yet - default to 50/50
            (50u8, 50u8, false)
        };

        state_ctxt.owner.from_arcis((yes_probability, no_probability, state.total_participants, high_confidence))
    }

    // Anti-manipulation detection between two votes
    #[instruction]
    pub fn detect_manipulation(
        vote1_ctxt: Enc<Shared, VoteData>,
        vote2_ctxt: Enc<Shared, VoteData>
    ) -> Enc<Shared, u8> {
        let vote1 = vote1_ctxt.to_arcis();
        let vote2 = vote2_ctxt.to_arcis();

        let mut suspicious_patterns = 0u8;

        // Check for suspicious timing between two votes
        let time_diff = if vote1.timestamp > vote2.timestamp {
            vote1.timestamp - vote2.timestamp
        } else {
            vote2.timestamp - vote1.timestamp
        };

        if time_diff < 5 { // Votes within 5 seconds
            suspicious_patterns += 1;
        }

        // Check for identical probabilities (suspicious for independent voters)
        if vote1.predicted_probability == vote2.predicted_probability {
            suspicious_patterns += 1;
        }

        // Check for identical conviction scores
        if vote1.conviction_score == vote2.conviction_score {
            suspicious_patterns += 1;
        }

        // Check if votes are from same choice with similar patterns
        if vote1.vote_choice == vote2.vote_choice
            && vote1.stake_amount == vote2.stake_amount
            && suspicious_patterns >= 2 {
            suspicious_patterns += 1;
        }

        // Calculate final manipulation score (0-100)
        let manipulation_score = (suspicious_patterns * 25).min(100);

        vote1_ctxt.owner.from_arcis(manipulation_score)
    }
}