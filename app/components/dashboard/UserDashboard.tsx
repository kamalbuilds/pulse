'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { X, Trophy, TrendingUp, Target, Coins, Award, Calendar } from 'lucide-react';
import { UserStats } from '@/types/market';
import { mockAchievements } from '@/lib/mockData';

interface UserDashboardProps {
  userStats: UserStats;
  onClose: () => void;
}

export const UserDashboard: React.FC<UserDashboardProps> = ({
  userStats,
  onClose,
}) => {
  const formatCurrency = (amount: number) => {
    if (amount >= 1000000) {
      return `$${(amount / 1000000).toFixed(1)}M`;
    }
    if (amount >= 1000) {
      return `$${(amount / 1000).toFixed(1)}K`;
    }
    return `$${amount}`;
  };

  const getAccuracyColor = (accuracy: number) => {
    if (accuracy >= 80) return 'text-success-400 bg-success-400/10 border-success-400/20';
    if (accuracy >= 60) return 'text-warning-400 bg-warning-400/10 border-warning-400/20';
    return 'text-error-400 bg-error-400/10 border-error-400/20';
  };

  const getRankColor = (rank: number) => {
    if (rank <= 10) return 'text-yellow-400 bg-yellow-400/10 border-yellow-400/20';
    if (rank <= 100) return 'text-zenith-400 bg-zenith-400/10 border-zenith-400/20';
    return 'text-muted-foreground bg-muted/10 border-border/20';
  };

  return (
    <motion.div
      className="fixed inset-0 z-50 bg-background overflow-y-auto"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 20 }}
    >
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Your Dashboard</h1>
            <p className="text-muted-foreground">Track your prediction performance and achievements</p>
          </div>

          <button
            onClick={onClose}
            className="w-10 h-10 rounded-full bg-muted/20 flex items-center justify-center text-muted-foreground hover:bg-muted/30 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Main Stats */}
          <div className="lg:col-span-2 space-y-6">
            {/* Key Metrics */}
            <div className="grid md:grid-cols-2 gap-4">
              <div className="glass-card p-6">
                <div className="flex items-center space-x-3 mb-4">
                  <div className="w-10 h-10 rounded-full bg-zenith-500/20 flex items-center justify-center">
                    <Target className="w-5 h-5 text-zenith-400" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-foreground">Total Predictions</h3>
                    <p className="text-2xl font-bold text-foreground">{userStats.totalPredictions}</p>
                  </div>
                </div>
                <div className="text-sm text-muted-foreground">
                  Correct: {userStats.correctPredictions} • Wrong: {userStats.totalPredictions - userStats.correctPredictions}
                </div>
              </div>

              <div className="glass-card p-6">
                <div className="flex items-center space-x-3 mb-4">
                  <div className="w-10 h-10 rounded-full bg-success-500/20 flex items-center justify-center">
                    <TrendingUp className="w-5 h-5 text-success-400" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-foreground">Accuracy Rate</h3>
                    <p className={`text-2xl font-bold ${getAccuracyColor(userStats.accuracy).split(' ')[0]}`}>
                      {userStats.accuracy.toFixed(1)}%
                    </p>
                  </div>
                </div>
                <div className="w-full bg-muted/20 rounded-full h-2">
                  <div
                    className="bg-success-500 h-2 rounded-full"
                    style={{ width: `${userStats.accuracy}%` }}
                  />
                </div>
              </div>

              <div className="glass-card p-6">
                <div className="flex items-center space-x-3 mb-4">
                  <div className="w-10 h-10 rounded-full bg-warning-500/20 flex items-center justify-center">
                    <Trophy className="w-5 h-5 text-warning-400" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-foreground">Current Streak</h3>
                    <p className="text-2xl font-bold text-warning-400">{userStats.currentStreak}</p>
                  </div>
                </div>
                <div className="text-sm text-muted-foreground">
                  Best: {userStats.longestStreak} predictions
                </div>
              </div>

              <div className="glass-card p-6">
                <div className="flex items-center space-x-3 mb-4">
                  <div className="w-10 h-10 rounded-full bg-purple-500/20 flex items-center justify-center">
                    <Coins className="w-5 h-5 text-purple-400" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-foreground">Total Volume</h3>
                    <p className="text-2xl font-bold text-purple-400">{formatCurrency(userStats.totalVolume)}</p>
                  </div>
                </div>
                <div className="text-sm text-muted-foreground">
                  Across all predictions
                </div>
              </div>
            </div>

            {/* Rank Card */}
            <div className="glass-card p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-foreground">Leaderboard Position</h3>
                <div className={`px-3 py-1 rounded-full border ${getRankColor(userStats.rank)}`}>
                  #{userStats.rank}
                </div>
              </div>

              <div className="grid md:grid-cols-3 gap-4">
                <div className="text-center p-4 bg-muted/10 rounded-lg">
                  <div className="text-lg font-bold text-foreground">{userStats.reputation}</div>
                  <div className="text-xs text-muted-foreground">Reputation Points</div>
                </div>
                <div className="text-center p-4 bg-muted/10 rounded-lg">
                  <div className="text-lg font-bold text-success-400">+{Math.floor(userStats.accuracy * 10)}</div>
                  <div className="text-xs text-muted-foreground">This Week</div>
                </div>
                <div className="text-center p-4 bg-muted/10 rounded-lg">
                  <div className="text-lg font-bold text-zenith-400">Global</div>
                  <div className="text-xs text-muted-foreground">Ranking</div>
                </div>
              </div>
            </div>

            {/* Recent Activity */}
            <div className="glass-card p-6">
              <h3 className="text-lg font-semibold text-foreground mb-4">Recent Activity</h3>
              <div className="space-y-3">
                {[
                  { action: 'Correct prediction', market: 'Bitcoin $100K by 2024', time: '2 hours ago', status: 'success' },
                  { action: 'New prediction', market: 'Lakers make playoffs', time: '5 hours ago', status: 'pending' },
                  { action: 'Correct prediction', market: 'Fed rate cut Q1', time: '1 day ago', status: 'success' },
                  { action: 'Wrong prediction', market: 'Snow in Miami', time: '2 days ago', status: 'error' },
                ].map((activity, index) => (
                  <div key={index} className="flex items-center justify-between py-2 border-b border-border/30 last:border-b-0">
                    <div className="flex items-center space-x-3">
                      <div className={`w-2 h-2 rounded-full ${
                        activity.status === 'success' ? 'bg-success-500' :
                        activity.status === 'error' ? 'bg-error-500' : 'bg-warning-500'
                      }`} />
                      <div>
                        <div className="font-medium text-foreground">{activity.action}</div>
                        <div className="text-sm text-muted-foreground">{activity.market}</div>
                      </div>
                    </div>
                    <div className="text-xs text-muted-foreground">{activity.time}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Achievements Sidebar */}
          <div className="space-y-6">
            {/* Achievements */}
            <div className="glass-card p-6">
              <div className="flex items-center space-x-2 mb-4">
                <Award className="w-5 h-5 text-warning-400" />
                <h3 className="text-lg font-semibold text-foreground">Achievements</h3>
              </div>

              <div className="space-y-3">
                {mockAchievements.map((achievement) => (
                  <div
                    key={achievement.id}
                    className={`p-3 rounded-lg border ${
                      achievement.unlockedAt
                        ? 'bg-success-500/10 border-success-500/20'
                        : 'bg-muted/10 border-border/30'
                    }`}
                  >
                    <div className="flex items-center space-x-3">
                      <div className="text-2xl">{achievement.iconUrl}</div>
                      <div className="flex-1">
                        <div className="font-medium text-foreground">{achievement.title}</div>
                        <div className="text-xs text-muted-foreground">{achievement.description}</div>

                        {achievement.progress !== undefined && !achievement.unlockedAt && (
                          <div className="mt-2">
                            <div className="flex justify-between text-xs text-muted-foreground mb-1">
                              <span>{achievement.progress}/{achievement.maxProgress}</span>
                              <span>{Math.round((achievement.progress / (achievement.maxProgress || 1)) * 100)}%</span>
                            </div>
                            <div className="w-full bg-muted/20 rounded-full h-1">
                              <div
                                className="bg-zenith-500 h-1 rounded-full"
                                style={{ width: `${(achievement.progress / (achievement.maxProgress || 1)) * 100}%` }}
                              />
                            </div>
                          </div>
                        )}

                        {achievement.unlockedAt && (
                          <div className="text-xs text-success-400 mt-1">
                            Unlocked {achievement.unlockedAt.toLocaleDateString()}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Quick Stats */}
            <div className="glass-card p-6">
              <h3 className="text-lg font-semibold text-foreground mb-4">This Week</h3>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Predictions</span>
                  <span className="font-medium text-foreground">12</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Accuracy</span>
                  <span className="font-medium text-success-400">83.3%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Volume</span>
                  <span className="font-medium text-zenith-400">$2.4K</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Rank Change</span>
                  <span className="font-medium text-success-400">+15</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
};