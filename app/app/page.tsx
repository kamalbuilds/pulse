'use client';

import React, { useState, useCallback } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { SwipeStack } from '@/components/swipe/SwipeStack';
import { UserDashboard } from '@/components/dashboard/UserDashboard';
import { SwipeStreak } from '@/components/gamification/SwipeStreak';
import AchievementToast, { useAchievements } from '@/components/gamification/AchievementToast';
import { Market } from '@/types/market';
import { mockMarkets, generateRandomMarkets, mockUserStats } from '@/lib/mockData';
import { TrendingUp, Zap, Users, Trophy } from 'lucide-react';

export default function HomePage() {
  const { connected } = useWallet();
  const [markets, setMarkets] = useState<Market[]>(mockMarkets);
  const [isLoading, setIsLoading] = useState(false);
  const [userStats, setUserStats] = useState(mockUserStats);
  const [showDashboard, setShowDashboard] = useState(false);

  // Achievement system
  const {
    currentAchievement,
    showToast,
    checkAchievements,
    dismissToast
  } = useAchievements();

  const handleSwipe = useCallback((
    direction: 'left' | 'right',
    market: Market,
    prediction?: { confidence: number; stakeAmount: number }
  ) => {
    console.log('Swipe:', { direction, market: market.id, prediction });

    // In a real app, this would submit to blockchain/backend
    if (direction === 'right' && prediction) {
      // Update user stats for YES prediction
      setUserStats(prev => {
        const newStats = {
          ...prev,
          totalPredictions: prev.totalPredictions + 1,
          totalVolume: prev.totalVolume + prediction.stakeAmount,
          currentStreak: prev.currentStreak + 1,
        };

        // Check for achievements
        checkAchievements({
          totalPredictions: newStats.totalPredictions,
          accuracy: newStats.accuracy,
          currentStreak: newStats.currentStreak,
          totalVolume: newStats.totalVolume,
          encryptedVotes: 25 // Mock encrypted vote count
        });

        return newStats;
      });
    } else if (direction === 'left') {
      // Update user stats for NO prediction
      setUserStats(prev => {
        const newStats = {
          ...prev,
          totalPredictions: prev.totalPredictions + 1,
          currentStreak: prev.currentStreak + 1,
        };

        // Check for achievements
        checkAchievements({
          totalPredictions: newStats.totalPredictions,
          accuracy: newStats.accuracy,
          currentStreak: newStats.currentStreak,
          totalVolume: newStats.totalVolume,
          encryptedVotes: 25 // Mock encrypted vote count
        });

        return newStats;
      });
    }
  }, []);

  const handleLoadMore = useCallback(() => {
    if (isLoading) return;

    setIsLoading(true);
    // Simulate API call
    setTimeout(() => {
      const newMarkets = generateRandomMarkets(5);
      setMarkets(prev => [...prev, ...newMarkets]);
      setIsLoading(false);
    }, 1000);
  }, [isLoading]);

  if (!connected) {
    return (
      <div className="landing-page min-h-screen flex flex-col items-center justify-center px-4 relative overflow-hidden">
        {/* Background concentric circles */}
        <div className="concentric-circles" />

        <div className="text-center space-y-8 max-w-4xl z-10 relative">
          {/* Logo and Brand */}
          <div className="flex items-center justify-center space-x-2 mb-6">
            <div className="flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-r from-zenith-500 to-zenith-600">
              <Zap className="w-8 h-8 text-white" />
            </div>
          </div>

          {/* Small uppercase header */}
          <div className="landing-header">
            SOLVIBES HARNESSES
          </div>

          {/* Main headline - split into two parts */}
          <div className="space-y-2">
            <h1 className="landing-title-white">
              The power of swipe
            </h1>
            <h1 className="landing-title-gradient">
              prediction markets
            </h1>
          </div>

          {/* Descriptive text */}
          <p className="landing-description">
            allowing you to trade on real-world event outcomes in a fully transparent<br />
            and decentralized market powered by Solana blockchain.
          </p>

          {/* Abstract gradient shape */}
          <div className="gradient-mountain-container">
            <div className="gradient-mountain">
              {/* Glowing droplet at peak */}
              <div className="mountain-droplet">
                <div className="droplet-icon">💧</div>
              </div>
            </div>
          </div>

          {/* Features Grid */}
          <div className="grid md:grid-cols-3 gap-6 mt-16">
            <div className="glass-card p-6 text-center space-y-3">
              <div className="w-12 h-12 rounded-full bg-zenith-500/20 flex items-center justify-center mx-auto">
                <TrendingUp className="w-6 h-6 text-zenith-400" />
              </div>
              <h3 className="font-semibold">Intuitive Swiping</h3>
              <p className="text-sm text-muted-foreground">
                Make predictions as easy as swiping on your favorite app
              </p>
            </div>
            <div className="glass-card p-6 text-center space-y-3">
              <div className="w-12 h-12 rounded-full bg-zenith-500/20 flex items-center justify-center mx-auto">
                <Users className="w-6 h-6 text-zenith-400" />
              </div>
              <h3 className="font-semibold">Privacy Protected</h3>
              <p className="text-sm text-muted-foreground">
                Your predictions are secured with Arcium's MPC technology
              </p>
            </div>
            <div className="glass-card p-6 text-center space-y-3">
              <div className="w-12 h-12 rounded-full bg-zenith-500/20 flex items-center justify-center mx-auto">
                <Trophy className="w-6 h-6 text-zenith-400" />
              </div>
              <h3 className="font-semibold">Competitive Trading</h3>
              <p className="text-sm text-muted-foreground">
                Compete with others and build your reputation
              </p>
            </div>
          </div>

          {/* CTA */}
          <div className="mt-12">
            <p className="text-muted-foreground mb-4">
              Connect your Solana wallet to start swiping
            </p>
            <div className="animate-pulse">
              <div className="w-8 h-8 mx-auto text-zenith-400">
                ⬆️
              </div>
            </div>
          </div>
        </div>

        {/* Scroll indicator */}
        <div className="scroll-indicator">
          <div className="scroll-circle">
            <svg
              width="20"
              height="20"
              viewBox="0 0 20 20"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M5 7.5L10 12.5L15 7.5"
                stroke="white"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {showDashboard ? (
        <UserDashboard
          userStats={userStats}
          onClose={() => setShowDashboard(false)}
        />
      ) : (
        <div className="container mx-auto px-4 py-8">
          {/* Header */}
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-2xl font-bold text-foreground">Prediction Markets</h1>
              <p className="text-muted-foreground">Swipe right for YES, left for NO</p>
            </div>

            <button
              onClick={() => setShowDashboard(true)}
              className="flex items-center space-x-2 px-4 py-2 bg-zenith-500/20 border border-zenith-500/30 rounded-lg text-zenith-400 hover:bg-zenith-500/30 transition-colors"
            >
              <Trophy className="w-4 h-4" />
              <span>Dashboard</span>
            </button>
          </div>

          {/* Streak Component */}
          <div className="mb-6">
            <SwipeStreak
              currentStreak={userStats.currentStreak}
              accuracy={userStats.accuracy}
              totalPredictions={userStats.totalPredictions}
            />
          </div>

          {/* Stats Bar */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            <div className="glass-card p-4 text-center">
              <div className="text-lg font-bold text-foreground">{userStats.totalPredictions}</div>
              <div className="text-xs text-muted-foreground">Predictions</div>
            </div>
            <div className="glass-card p-4 text-center">
              <div className="text-lg font-bold text-success-400">{userStats.accuracy.toFixed(1)}%</div>
              <div className="text-xs text-muted-foreground">Accuracy</div>
            </div>
            <div className="glass-card p-4 text-center">
              <div className="text-lg font-bold text-zenith-400">{userStats.currentStreak}</div>
              <div className="text-xs text-muted-foreground">Streak</div>
            </div>
            <div className="glass-card p-4 text-center">
              <div className="text-lg font-bold text-foreground">#{userStats.rank}</div>
              <div className="text-xs text-muted-foreground">Rank</div>
            </div>
          </div>

          {/* Swipe Interface */}
          <div className="max-w-md mx-auto">
            <div className="relative h-[600px]">
              <SwipeStack
                markets={markets}
                onSwipe={handleSwipe}
                onLoadMore={handleLoadMore}
                isLoading={isLoading}
                maxVisible={3}
              />
            </div>

            {/* Instructions */}
            <div className="mt-8 text-center space-y-2">
              <p className="text-sm text-muted-foreground">
                Swipe or use the buttons below
              </p>
              <div className="flex items-center justify-center space-x-6 text-xs text-muted-foreground">
                <div className="flex items-center space-x-2">
                  <div className="w-4 h-4 bg-error-500/20 border border-error-500/30 rounded-full" />
                  <span>No / Pass</span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-4 h-4 bg-success-500/20 border border-success-500/30 rounded-full" />
                  <span>Yes / Predict</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Achievement Toast */}
      <AchievementToast
        achievement={currentAchievement}
        show={showToast}
        onDismiss={dismissToast}
      />
    </div>
  );
}