// Core Types
export type MarketType = 'binary' | 'categorical' | 'scalar';
export type PrivacyLevel = 'public' | 'semi_private' | 'private';

// Enums
export enum MarketStatus {
  ACTIVE = 'active',
  PENDING_RESOLUTION = 'pending_resolution',
  RESOLVED = 'resolved',
  DISPUTED = 'disputed',
  CANCELLED = 'cancelled',
}

export enum VoteChoice {
  YES = 'yes',
  NO = 'no',
  PASS = 'pass',
}

export enum MarketCategory {
  SPORTS = 'sports',
  POLITICS = 'politics',
  CRYPTO = 'crypto',
  ENTERTAINMENT = 'entertainment',
  TECHNOLOGY = 'technology',
  WEATHER = 'weather',
  ECONOMY = 'economy',
  OTHER = 'other',
}

// Oracle Configuration
export interface OracleConfig {
  type: 'uma_optimistic' | 'manual' | 'api' | 'consensus';
  resolution_source: string;
  challenge_period?: number;
  minimum_bond?: number;
  dispute_window?: number;
  oracle_reward?: number;
  min_oracles?: number;
  consensus_threshold?: number;
  api_endpoint?: string;
}

// Main Market Interface
export interface Market {
  id: string;
  question: string;
  title?: string;
  description: string;
  category: MarketCategory | string;
  type: MarketType;
  privacy_level: PrivacyLevel;

  // Dates
  created_at: string | Date;
  resolution_date?: string | Date;
  trading_deadline?: string | Date;

  // Economic parameters
  initial_liquidity?: number;
  total_volume?: number;
  trading_fee?: number;
  creator_fee?: number;
  min_position_size?: number;
  max_position_size?: number;
  early_bird_bonus?: number;
  referral_bonus?: number;

  // Market data
  yes_price?: number;
  no_price?: number;
  yesOdds?: number;
  noOdds?: number;
  participants?: number;

  // Oracle configuration
  oracle_config?: OracleConfig;

  // Timeline
  grace_period?: number;
  auto_resolution_enabled?: boolean;

  // Legacy fields for compatibility
  endDate?: Date;
  totalVolume?: number;
  imageUrl?: string;
  tags?: string[];
  createdBy?: string;
  creator?: string;
  status: MarketStatus;
  resolutionSource?: string;
}

export interface UserPrediction {
  id: string;
  marketId: string;
  userId: string;
  prediction: boolean; // true for YES, false for NO
  confidence: number; // 0-100
  stakeAmount: number;
  timestamp: Date;
  isPrivate: boolean;
}

export interface UserStats {
  totalPredictions: number;
  correctPredictions: number;
  accuracy: number;
  totalVolume: number;
  currentStreak: number;
  longestStreak: number;
  rank: number;
  reputation: number;
}

export interface SwipeAction {
  type: 'yes' | 'no' | 'pass';
  marketId: string;
  confidence?: number;
  stakeAmount?: number;
}

export interface Achievement {
  id: string;
  title: string;
  description: string;
  iconUrl: string;
  unlockedAt?: Date;
  progress?: number;
  maxProgress?: number;
}