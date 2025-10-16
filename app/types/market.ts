export interface Market {
  id: string;
  title: string;
  description: string;
  category: MarketCategory;
  endDate: Date;
  totalVolume: number;
  yesOdds: number;
  noOdds: number;
  participants: number;
  imageUrl?: string;
  tags: string[];
  createdBy: string;
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

export enum MarketStatus {
  ACTIVE = 'active',
  CLOSED = 'closed',
  RESOLVED = 'resolved',
  CANCELLED = 'cancelled',
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