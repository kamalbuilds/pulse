use anchor_lang::prelude::*;
use std::collections::HashMap;

// Oracle resolution system for prediction markets
// Inspired by UMA DVM and Chainlink for different data types

#[derive(AnchorSerialize, AnchorDeserialize, Clone, PartialEq)]
pub enum OracleType {
    UmaOptimistic,    // UMA's optimistic oracle for subjective outcomes
    ChainlinkPrice,   // Chainlink for objective price data
    CustomValidated,  // Custom oracle with validator consensus
    Community,        // Community-driven resolution
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, PartialEq)]
pub enum ResolutionStatus {
    Pending,
    Proposed,
    Disputed,
    Finalized,
    Invalid,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, PartialEq)]
pub enum DataSource {
    CoinbasePrice,
    BinancePrice,
    KrakenPrice,
    SportsApi,
    NewsApi,
    GovernmentData,
    WeatherApi,
    Custom(String),
}

// Oracle resolution proposal
#[account]
pub struct OracleProposal {
    pub market: Pubkey,
    pub proposer: Pubkey,
    pub oracle_type: OracleType,
    pub proposed_outcome: bool,
    pub confidence_score: u8,        // 0-100
    pub data_sources: Vec<DataSource>,
    pub evidence_hash: [u8; 32],     // Hash of supporting evidence
    pub proposal_timestamp: i64,
    pub challenge_period_end: i64,
    pub bond_amount: u64,            // Required bond for proposal
    pub status: ResolutionStatus,
    pub dispute_count: u8,
    pub final_outcome: Option<bool>,
    pub resolution_metadata: [u8; 500],
    pub bump: u8,
}

// Oracle validator for consensus-based resolution
#[account]
pub struct OracleValidator {
    pub validator: Pubkey,
    pub stake_amount: u64,
    pub reputation_score: u16,       // Based on historical accuracy
    pub total_resolutions: u32,
    pub correct_resolutions: u32,
    pub last_activity: i64,
    pub is_active: bool,
    pub specialization: Vec<u8>,     // Categories they specialize in
    pub bond_locked: u64,
    pub slash_count: u8,
    pub bump: u8,
}

// Dispute against oracle proposal
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

// Price-based oracle integration (Chainlink style)
#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub struct PriceOracle {
    pub asset_symbol: String,
    pub target_price: u64,          // Price threshold in micro-dollars
    pub comparison_type: PriceComparison,
    pub data_sources: Vec<DataSource>,
    pub aggregation_method: AggregationMethod,
    pub observation_window: i64,     // Time window for price checking
    pub minimum_sources: u8,         // Min sources that must agree
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, PartialEq)]
pub enum PriceComparison {
    GreaterThan,
    LessThan,
    Between(u64, u64),  // Min, Max range
    ExactlyAt(u64),
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, PartialEq)]
pub enum AggregationMethod {
    Median,
    Mean,
    Mode,
    WeightedAverage,
}

// Sports oracle for event outcomes
#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub struct SportsOracle {
    pub league: String,
    pub event_id: String,
    pub team_a: String,
    pub team_b: String,
    pub event_date: i64,
    pub outcome_type: SportsOutcomeType,
    pub api_endpoints: Vec<String>,
    pub settlement_delay: i64,       // Delay before auto-settlement
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, PartialEq)]
pub enum SportsOutcomeType {
    Winner,                    // Which team wins
    ScoreOver(u32),           // Score over threshold
    PlayerPerformance(String), // Specific player metrics
    SeasonOutcome,            // Season-long predictions
}

// Weather oracle for meteorological events
#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub struct WeatherOracle {
    pub location: String,
    pub latitude: f64,
    pub longitude: f64,
    pub weather_metric: WeatherMetric,
    pub threshold_value: f64,
    pub measurement_date: i64,
    pub data_providers: Vec<String>,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, PartialEq)]
pub enum WeatherMetric {
    Temperature,
    Precipitation,
    WindSpeed,
    Humidity,
    Pressure,
    AirQuality,
}

// Political/Election oracle
#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub struct PoliticalOracle {
    pub election_type: String,
    pub jurisdiction: String,
    pub candidate_or_measure: String,
    pub election_date: i64,
    pub outcome_type: PoliticalOutcomeType,
    pub official_sources: Vec<String>,
    pub certification_delay: i64,    // Time to wait for official results
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, PartialEq)]
pub enum PoliticalOutcomeType {
    Winner,
    VotePercentage(f64),      // Percentage threshold
    Participation(f64),       // Voter turnout threshold
    BallotMeasure,           // Yes/No on ballot measures
}

impl OracleProposal {
    pub const LEN: usize = 8 + 32 + 32 + 1 + 1 + 1 + 4 + 32 + 8 + 8 + 8 + 1 + 1 + 1 + 500 + 1;

    pub fn is_challenge_period_expired(&self, current_timestamp: i64) -> bool {
        current_timestamp > self.challenge_period_end
    }

    pub fn calculate_required_bond(&self, oracle_type: &OracleType) -> u64 {
        match oracle_type {
            OracleType::UmaOptimistic => 1_000_000_000, // 1 SOL
            OracleType::ChainlinkPrice => 100_000_000,  // 0.1 SOL
            OracleType::CustomValidated => 500_000_000, // 0.5 SOL
            OracleType::Community => 50_000_000,        // 0.05 SOL
        }
    }
}

impl OracleValidator {
    pub const LEN: usize = 8 + 32 + 8 + 2 + 4 + 4 + 8 + 1 + 4 + 8 + 1 + 1;

    pub fn accuracy_rate(&self) -> f64 {
        if self.total_resolutions == 0 {
            0.0
        } else {
            self.correct_resolutions as f64 / self.total_resolutions as f64
        }
    }

    pub fn is_eligible_validator(&self, required_stake: u64, min_accuracy: f64) -> bool {
        self.is_active
            && self.stake_amount >= required_stake
            && self.accuracy_rate() >= min_accuracy
            && self.slash_count < 3 // Max 3 slashes before permanent ban
    }

    pub fn calculate_voting_weight(&self) -> u64 {
        let base_weight = self.stake_amount / 1_000_000; // Weight based on SOL staked
        let accuracy_bonus = (self.accuracy_rate() * 100.0) as u64;
        let reputation_bonus = self.reputation_score as u64;

        base_weight + accuracy_bonus + reputation_bonus
    }
}

impl OracleDispute {
    pub const LEN: usize = 8 + 32 + 32 + 4 + 200 + 32 + 8 + 8 + 1 + 1 + 1;

    pub fn is_valid_dispute_period(&self, proposal_timestamp: i64, current_timestamp: i64) -> bool {
        let dispute_window = 24 * 60 * 60; // 24 hours in seconds
        current_timestamp - proposal_timestamp <= dispute_window
    }
}

// Oracle resolution algorithms
pub struct OracleResolution;

impl OracleResolution {
    // UMA-style optimistic resolution
    pub fn resolve_optimistic(
        proposal: &OracleProposal,
        disputes: &[OracleDispute],
        current_timestamp: i64,
    ) -> Result<bool> {
        // If no disputes and challenge period expired, accept proposal
        if disputes.is_empty() && proposal.is_challenge_period_expired(current_timestamp) {
            return Ok(proposal.proposed_outcome);
        }

        // If disputed, require validator consensus
        if !disputes.is_empty() {
            return Err(error!(OracleErrorCode::RequiresValidatorResolution));
        }

        // Still in challenge period
        Err(error!(OracleErrorCode::ChallengePeriodActive))
    }

    // Chainlink-style price aggregation
    pub fn resolve_price_oracle(
        price_oracle: &PriceOracle,
        price_feeds: &[u64], // Array of price data from different sources
        current_timestamp: i64,
    ) -> Result<bool> {
        require!(
            price_feeds.len() >= price_oracle.minimum_sources as usize,
            OracleErrorCode::InsufficientPriceSources
        );

        let aggregated_price = match price_oracle.aggregation_method {
            AggregationMethod::Median => Self::calculate_median(price_feeds),
            AggregationMethod::Mean => Self::calculate_mean(price_feeds),
            AggregationMethod::Mode => Self::calculate_mode(price_feeds),
            AggregationMethod::WeightedAverage => Self::calculate_weighted_average(price_feeds),
        };

        let outcome = match price_oracle.comparison_type {
            PriceComparison::GreaterThan => aggregated_price > price_oracle.target_price,
            PriceComparison::LessThan => aggregated_price < price_oracle.target_price,
            PriceComparison::Between(min, max) => {
                aggregated_price >= min && aggregated_price <= max
            },
            PriceComparison::ExactlyAt(target) => {
                let tolerance = target / 1000; // 0.1% tolerance
                (aggregated_price as i64 - target as i64).abs() <= tolerance as i64
            },
        };

        Ok(outcome)
    }

    // Validator consensus resolution
    pub fn resolve_with_validators(
        validators: &[OracleValidator],
        votes: &[(Pubkey, bool, u64)], // (validator, vote, weight)
        min_participation: f64,
    ) -> Result<bool> {
        let total_eligible_weight: u64 = validators
            .iter()
            .filter(|v| v.is_active)
            .map(|v| v.calculate_voting_weight())
            .sum();

        let total_vote_weight: u64 = votes.iter().map(|(_, _, weight)| *weight).sum();

        let participation_rate = total_vote_weight as f64 / total_eligible_weight as f64;
        require!(
            participation_rate >= min_participation,
            OracleErrorCode::InsufficientValidatorParticipation
        );

        let yes_weight: u64 = votes
            .iter()
            .filter(|(_, vote, _)| *vote)
            .map(|(_, _, weight)| *weight)
            .sum();

        let no_weight: u64 = votes
            .iter()
            .filter(|(_, vote, _)| !*vote)
            .map(|(_, _, weight)| *weight)
            .sum();

        // Require supermajority (66%) for resolution
        let threshold = (total_vote_weight * 2) / 3;

        if yes_weight >= threshold {
            Ok(true)
        } else if no_weight >= threshold {
            Ok(false)
        } else {
            Err(error!(OracleErrorCode::NoConsensusReached))
        }
    }

    // Price aggregation utility functions
    fn calculate_median(prices: &[u64]) -> u64 {
        let mut sorted_prices = prices.to_vec();
        sorted_prices.sort();
        let len = sorted_prices.len();
        if len % 2 == 0 {
            (sorted_prices[len / 2 - 1] + sorted_prices[len / 2]) / 2
        } else {
            sorted_prices[len / 2]
        }
    }

    fn calculate_mean(prices: &[u64]) -> u64 {
        let sum: u64 = prices.iter().sum();
        sum / prices.len() as u64
    }

    fn calculate_mode(prices: &[u64]) -> u64 {
        let mut frequency_map = HashMap::new();
        for &price in prices {
            *frequency_map.entry(price).or_insert(0) += 1;
        }

        frequency_map
            .into_iter()
            .max_by_key(|(_, count)| *count)
            .map(|(price, _)| price)
            .unwrap_or(prices[0])
    }

    fn calculate_weighted_average(prices: &[u64]) -> u64 {
        // Simple equal weighting for now
        // In production, weights would be based on source reliability
        Self::calculate_mean(prices)
    }
}

// Error codes for oracle system
#[error_code]
pub enum OracleErrorCode {
    #[msg("Challenge period is still active")]
    ChallengePeriodActive,
    #[msg("Requires validator resolution due to disputes")]
    RequiresValidatorResolution,
    #[msg("Insufficient price sources for resolution")]
    InsufficientPriceSources,
    #[msg("Insufficient validator participation")]
    InsufficientValidatorParticipation,
    #[msg("No consensus reached among validators")]
    NoConsensusReached,
    #[msg("Invalid oracle type for this resolution method")]
    InvalidOracleType,
    #[msg("Validator not eligible to participate")]
    ValidatorNotEligible,
    #[msg("Oracle proposal already resolved")]
    ProposalAlreadyResolved,
    #[msg("Invalid evidence hash")]
    InvalidEvidenceHash,
    #[msg("Insufficient bond amount")]
    InsufficientBond,
}