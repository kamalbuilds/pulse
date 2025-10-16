use arcis_imports::*;

#[encrypted]
mod circuits {
    use arcis_imports::*;

    // Portfolio holding data structure
    pub struct TokenHolding {
        pub token_mint: [u8; 32],
        pub balance: u64,
        pub price_usd: u64, // Price in micro-dollars (1 USD = 1,000,000)
        pub last_updated: u64,
    }

    // Portfolio data structure
    pub struct PortfolioData {
        pub owner: [u8; 32],
        pub holdings: [TokenHolding; 10], // Support up to 10 token positions
        pub holdings_count: u8,
        pub total_value_usd: u64,
        pub last_updated: u64,
    }

    // Historical performance data
    pub struct PerformanceData {
        pub daily_returns: [i64; 30], // 30 days of returns in basis points
        pub portfolio_values: [u64; 30], // 30 days of portfolio values
        pub return_count: u8,
    }

    // Risk metrics output
    pub struct RiskMetrics {
        pub portfolio_value: u64,
        pub daily_volatility: u64, // Volatility in basis points
        pub sharpe_ratio: i64, // Sharpe ratio * 10000 for precision
        pub max_drawdown: u64, // Max drawdown in basis points
        pub var_95: u64, // 95% Value at Risk
        pub var_99: u64, // 99% Value at Risk
    }

    // Peer comparison data
    pub struct PeerComparisonData {
        pub user_return: i64,
        pub peer_returns: [i64; 100], // Up to 100 peer returns
        pub peer_count: u8,
        pub percentile_rank: u8, // 0-100 percentile
        pub category_avg: i64,
        pub category_median: i64,
    }

    // Portfolio benchmarking result
    pub struct BenchmarkResult {
        pub user_performance: i64,
        pub peer_percentile: u8,
        pub relative_performance: i64, // vs median
        pub risk_adjusted_rank: u8,
        pub category_volatility: u64,
    }

    #[instruction]
    pub fn calculate_portfolio_value(
        input_ctxt: Enc<Shared, PortfolioData>
    ) -> Enc<Shared, u64> {
        let portfolio = input_ctxt.to_arcis();
        let mut total_value = 0u64;
        
        for i in 0..10 {
            if i < portfolio.holdings_count {
                let holding = &portfolio.holdings[i as usize];
                let value = (holding.balance as u128 * holding.price_usd as u128) / 1_000_000u128;
                total_value = total_value + value as u64;
            }
        }
        
        input_ctxt.owner.from_arcis(total_value)
    }

    #[instruction]
    pub fn calculate_risk_metrics(
        input_ctxt: Enc<Shared, PerformanceData>
    ) -> Enc<Shared, RiskMetrics> {
        let perf_data = input_ctxt.to_arcis();
        let returns = &perf_data.daily_returns;
        let count = perf_data.return_count as usize;
        
        let mut portfolio_value = 0u64;
        let mut daily_volatility = 0u64;
        let mut sharpe_ratio = 0i64;
        let mut max_drawdown = 0u64;
        let mut var_95 = 0u64;
        let mut var_99 = 0u64;
        
        if count > 0 {
            // Calculate mean return
            let mut sum_returns = 0i64;
            for i in 0..30 {
                if i < count {
                                         sum_returns = sum_returns + returns[i];
                }
            }
            let mean_return = sum_returns / count as i64;
            
            // Calculate volatility (standard deviation)
            let mut sum_squared_diff = 0u64;
            for i in 0..30 {
                if i < count {
                    let diff = returns[i] - mean_return;
                                         sum_squared_diff = sum_squared_diff + (diff * diff) as u64;
                }
            }
            let variance = sum_squared_diff / count as u64;
            daily_volatility = sqrt_approx(variance); // Approximate square root
            
            // Calculate Sharpe ratio (assuming risk-free rate of 2% annually = ~5 bps daily)
            let risk_free_rate = 5i64;
            let excess_return = mean_return - risk_free_rate;
            sharpe_ratio = if daily_volatility > 0 {
                (excess_return * 10000) / daily_volatility as i64
            } else {
                0
            };
            
            // Calculate max drawdown
            let mut peak_value = perf_data.portfolio_values[0];
            
            for i in 1..30 {
                if i < count {
                    let current_value = perf_data.portfolio_values[i];
                    if current_value > peak_value {
                        peak_value = current_value;
                    } else {
                        let drawdown = ((peak_value - current_value) as u128 * 10000u128) / peak_value as u128;
                        max_drawdown = max_drawdown.max(drawdown as u64);
                    }
                }
            }
            
            // Calculate VaR (simplified using normal distribution approximation)
            var_95 = (daily_volatility as u128 * 164u128 / 100u128) as u64; // 1.645 * volatility
            var_99 = (daily_volatility as u128 * 233u128 / 100u128) as u64; // 2.33 * volatility
            
            portfolio_value = perf_data.portfolio_values[count - 1];
        }
        
        input_ctxt.owner.from_arcis(RiskMetrics {
            portfolio_value,
            daily_volatility,
            sharpe_ratio,
            max_drawdown,
            var_95,
            var_99,
        })
    }

    #[instruction]
    pub fn calculate_peer_comparison(
        input_ctxt: Enc<Shared, PeerComparisonData>
    ) -> Enc<Shared, BenchmarkResult> {
        let comparison_data = input_ctxt.to_arcis();
        let user_return = comparison_data.user_return;
        let peer_returns = &comparison_data.peer_returns;
        let peer_count = comparison_data.peer_count as usize;
        
        let mut peer_percentile = 50u8;
        let mut relative_performance = 0i64;
        let mut risk_adjusted_rank = 50u8;
        let mut category_volatility = 0u64;
        
        if peer_count > 0 {
            // Calculate percentile rank
            let mut better_count = 0u8;
            let mut sum_peer_returns = 0i64;
            let mut sum_abs_returns = 0u64;
            
            for i in 0..100 {
                if i < peer_count {
                    let peer_return = peer_returns[i];
                    sum_peer_returns = sum_peer_returns + peer_return;
                    sum_abs_returns = sum_abs_returns + peer_return.abs() as u64;
                    
                    if user_return > peer_return {
                        better_count = better_count + 1;
                    }
                }
            }
            
            let percentile = (better_count as u16 * 100) / peer_count as u16;
            peer_percentile = percentile as u8;
            
            // Calculate category statistics
            let category_avg = sum_peer_returns / peer_count as i64;
            relative_performance = user_return - category_avg;
            
            // Calculate category volatility (simplified)
            category_volatility = sum_abs_returns / peer_count as u64;
            
            // Risk-adjusted rank (simplified - based on return/volatility ratio)
            let user_risk_adj = if category_volatility > 0 {
                (user_return.abs() as u64 * 1000) / category_volatility
            } else {
                500
            };
            
            let mut better_risk_adj = 0u8;
            
            for i in 0..100 {
                if i < peer_count {
                    let peer_return = peer_returns[i];
                    let peer_risk_adj = if category_volatility > 0 {
                        (peer_return.abs() as u64 * 1000) / category_volatility
                    } else {
                        500
                    };
                    
                    if user_risk_adj > peer_risk_adj {
                        better_risk_adj = better_risk_adj + 1;
                    }
                }
            }
            
            risk_adjusted_rank = ((better_risk_adj as u16 * 100) / peer_count as u16) as u8;
        }
        
        input_ctxt.owner.from_arcis(BenchmarkResult {
            user_performance: user_return,
            peer_percentile,
            relative_performance,
            risk_adjusted_rank,
            category_volatility,
        })
    }

    // Simplified square root approximation using Newton's method iteration
    fn sqrt_approx(x: u64) -> u64 {
        if x == 0 {
            0
        } else if x < 4 {
            1
        } else {
            let mut result = x / 2;
            // Fixed number of iterations for approximation
            for _ in 0..8 {
                let new_result = (result + x / result) / 2;
                result = new_result;
            }
            result
        }
    }

    // =====================================================================
    // PREDICTION MARKETS ENCRYPTED COMPUTATION CIRCUITS
    // =====================================================================

    // Vote data structure for private voting
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

    // Market voting state for aggregation
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

    // Payout calculation data
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
        // Note: In real implementation, you'd compare with current time
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

    // Aggregate votes while maintaining privacy
    #[instruction]
    pub fn aggregate_market_votes(
        votes_ctxt: Enc<Shared, [VoteData; 100]>, // Batch of up to 100 votes
        vote_count_ctxt: Enc<Shared, u8>,
        current_state_ctxt: Enc<Mxe, MarketVotingState>
    ) -> Enc<Shared, [u8; 32]> {
        let votes = votes_ctxt.to_arcis();
        let vote_count = vote_count_ctxt.to_arcis();
        let mut state = current_state_ctxt.to_arcis();

        // Process each vote in the batch
        for i in 0..100 {
            if i < vote_count {
                let vote = &votes[i as usize];

                // Validate and aggregate vote
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
            }
        }

        // Prepare aggregated results for public revelation
        let mut result = [0u8; 32];

        // Pack results into bytes for return
        let yes_votes_bytes = state.total_yes_votes.to_le_bytes();
        let no_votes_bytes = state.total_no_votes.to_le_bytes();
        let yes_stake_bytes = state.total_yes_stake.to_le_bytes();
        let no_stake_bytes = state.total_no_stake.to_le_bytes();
        let participants_bytes = state.total_participants.to_le_bytes();

        result[0] = yes_votes_bytes[0];
        result[1] = yes_votes_bytes[1];
        result[2] = yes_votes_bytes[2];
        result[3] = yes_votes_bytes[3];

        result[4] = no_votes_bytes[0];
        result[5] = no_votes_bytes[1];
        result[6] = no_votes_bytes[2];
        result[7] = no_votes_bytes[3];

        result[8] = yes_stake_bytes[0];
        result[9] = yes_stake_bytes[1];
        result[10] = yes_stake_bytes[2];
        result[11] = yes_stake_bytes[3];
        result[12] = yes_stake_bytes[4];
        result[13] = yes_stake_bytes[5];
        result[14] = yes_stake_bytes[6];
        result[15] = yes_stake_bytes[7];

        result[16] = no_stake_bytes[0];
        result[17] = no_stake_bytes[1];
        result[18] = no_stake_bytes[2];
        result[19] = no_stake_bytes[3];
        result[20] = no_stake_bytes[4];
        result[21] = no_stake_bytes[5];
        result[22] = no_stake_bytes[6];
        result[23] = no_stake_bytes[7];

        result[24] = participants_bytes[0];
        result[25] = participants_bytes[1];
        result[26] = participants_bytes[2];
        result[27] = participants_bytes[3];

        // Calculate market probability (weighted average)
        let market_probability = if state.total_yes_stake + state.total_no_stake > 0 {
            state.weighted_probability_sum / (state.total_yes_stake + state.total_no_stake)
        } else {
            50 // Default to 50% if no stake
        };
        result[28] = market_probability as u8;

        votes_ctxt.owner.from_arcis(result)
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
            // Higher probability prediction gets bigger bonus if correct
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

    // Privacy-preserving market maker pricing
    #[instruction]
    pub fn calculate_market_odds(
        state_ctxt: Enc<Shared, MarketVotingState>
    ) -> Enc<Shared, [u8; 8]> {
        let state = state_ctxt.to_arcis();

        let total_stake = state.total_yes_stake + state.total_no_stake;
        let mut result = [0u8; 8];

        if total_stake > 0 {
            // Calculate implied probabilities based on stake distribution
            let yes_probability = (state.total_yes_stake * 100) / total_stake;
            let no_probability = (state.total_no_stake * 100) / total_stake;

            // Apply liquidity adjustments and market maker spread
            let liquidity_factor = if total_stake > 10000 { // High liquidity
                95 // 5% spread
            } else if total_stake > 1000 { // Medium liquidity
                90 // 10% spread
            } else { // Low liquidity
                85 // 15% spread
            };

            let adjusted_yes = (yes_probability * liquidity_factor) / 100;
            let adjusted_no = (no_probability * liquidity_factor) / 100;

            // Pack results
            result[0] = adjusted_yes as u8;
            result[1] = adjusted_no as u8;
            let participants_bytes = state.total_participants.to_le_bytes();
            result[2] = participants_bytes[0];
            result[3] = participants_bytes[1];
            result[4] = participants_bytes[2];
            result[5] = participants_bytes[3];
            result[6] = if total_stake > 1000 { 1 } else { 0 }; // High confidence flag
            result[7] = ((state.conviction_weighted_yes + state.conviction_weighted_no) / total_stake.max(1)) as u8; // Avg conviction
        } else {
            // No stake yet - default to 50/50
            result[0] = 50;
            result[1] = 50;
            result[6] = 0; // Low confidence
        }

        state_ctxt.owner.from_arcis(result)
    }

    // Anti-manipulation detection
    #[instruction]
    pub fn detect_manipulation(
        votes_ctxt: Enc<Shared, [VoteData; 50]>, // Smaller batch for analysis
        vote_count_ctxt: Enc<Shared, u8>
    ) -> Enc<Shared, u8> {
        let votes = votes_ctxt.to_arcis();
        let vote_count = vote_count_ctxt.to_arcis();

        let mut manipulation_score = 0u8;
        let mut suspicious_patterns = 0u8;

        // Check for coordinated voting patterns
        let mut same_timestamp_count = 0u8;
        let mut same_probability_count = 0u8;
        let mut same_conviction_count = 0u8;

        for i in 0..50 {
            if i < vote_count {
                let vote1 = &votes[i as usize];

                // Compare with other votes for patterns
                for j in (i + 1)..50 {
                    if j < vote_count {
                        let vote2 = &votes[j as usize];

                        // Check for suspicious timing
                        let time_diff = if vote1.timestamp > vote2.timestamp {
                            vote1.timestamp - vote2.timestamp
                        } else {
                            vote2.timestamp - vote1.timestamp
                        };

                        if time_diff < 5 { // Votes within 5 seconds
                            same_timestamp_count += 1;
                        }

                        // Check for identical probabilities (suspicious for independent voters)
                        if vote1.predicted_probability == vote2.predicted_probability {
                            same_probability_count += 1;
                        }

                        // Check for identical conviction scores
                        if vote1.conviction_score == vote2.conviction_score {
                            same_conviction_count += 1;
                        }
                    }
                }
            }
        }

        // Score manipulation risk
        if same_timestamp_count > vote_count / 4 {
            suspicious_patterns += 1; // Too many simultaneous votes
        }

        if same_probability_count > vote_count / 3 {
            suspicious_patterns += 1; // Too many identical predictions
        }

        if same_conviction_count > vote_count / 3 {
            suspicious_patterns += 1; // Too many identical conviction scores
        }

        // Calculate final manipulation score (0-100)
        manipulation_score = (suspicious_patterns * 33).min(100);

        votes_ctxt.owner.from_arcis(manipulation_score)
    }
}
