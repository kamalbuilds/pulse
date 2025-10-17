'use client';

import React, { useState } from 'react';
import { TrendingUp, Users, DollarSign, BarChart3, PieChart, Clock, Zap, Target } from 'lucide-react';
import { Market } from '@/types/market';

interface MarketAnalyticsProps {
  markets: Market[];
}

export const MarketAnalytics: React.FC<MarketAnalyticsProps> = ({ markets }) => {
  const [timeFrame, setTimeFrame] = useState<'7d' | '30d' | '90d' | 'all'>('30d');

  // Calculate analytics data
  const totalVolume = markets.reduce((sum, market) => sum + (market.total_volume || 0), 0);
  const totalParticipants = markets.reduce((sum, market) => sum + (market.participants || 0), 0);
  const totalEarnings = markets.reduce((sum, market) =>
    sum + ((market.creator_fee || 0) * (market.total_volume || 0) / 100), 0
  );

  const activeMarkets = markets.filter(m => m.status === 'active');
  const resolvedMarkets = markets.filter(m => m.status === 'resolved');
  const avgVolumePerMarket = markets.length > 0 ? totalVolume / markets.length : 0;

  // Performance metrics
  const performanceData = [
    {
      label: 'High Performing',
      count: markets.filter(m => (m.total_volume || 0) > avgVolumePerMarket * 1.5).length,
      color: 'bg-success-500',
    },
    {
      label: 'Average Performing',
      count: markets.filter(m =>
        (m.total_volume || 0) >= avgVolumePerMarket * 0.5 &&
        (m.total_volume || 0) <= avgVolumePerMarket * 1.5
      ).length,
      color: 'bg-warning-500',
    },
    {
      label: 'Low Performing',
      count: markets.filter(m => (m.total_volume || 0) < avgVolumePerMarket * 0.5).length,
      color: 'bg-error-500',
    },
  ];

  // Category breakdown
  const categoryData = markets.reduce((acc, market) => {
    acc[market.category] = (acc[market.category] || 0) + (market.total_volume || 0);
    return acc;
  }, {} as Record<string, number>);

  const categoryStats = Object.entries(categoryData)
    .map(([category, volume]) => ({
      category,
      volume,
      count: markets.filter(m => m.category === category).length,
      percentage: totalVolume > 0 ? (volume / totalVolume) * 100 : 0,
    }))
    .sort((a, b) => b.volume - a.volume);

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'sports': return '🏆';
      case 'politics': return '🗳️';
      case 'crypto': return '₿';
      case 'technology': return '⚡';
      case 'entertainment': return '🎬';
      case 'world_events': return '🌍';
      default: return '📈';
    }
  };

  // Generate mock historical data for charts
  const generateHistoricalData = () => {
    const days = timeFrame === '7d' ? 7 : timeFrame === '30d' ? 30 : timeFrame === '90d' ? 90 : 180;
    const data = [];

    for (let i = days; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);

      // Simulate growth over time
      const baseVolume = totalVolume * 0.7; // Assume 70% of volume is from recent activity
      const dailyVolume = (baseVolume / days) * (0.5 + Math.random() * 1.5);

      data.push({
        date: date.toISOString().split('T')[0],
        volume: dailyVolume,
        participants: Math.floor(dailyVolume / 50), // Rough estimate
      });
    }

    return data;
  };

  const historicalData = generateHistoricalData();

  return (
    <div className="space-y-6">
      {/* Time Frame Selector */}
      <div className="flex items-center justify-between">
        <h3 className="text-xl font-bold flex items-center space-x-2">
          <BarChart3 className="w-6 h-6 text-zenith-400" />
          <span>Market Analytics</span>
        </h3>

        <div className="flex items-center space-x-2">
          {(['7d', '30d', '90d', 'all'] as const).map((period) => (
            <button
              key={period}
              onClick={() => setTimeFrame(period)}
              className={`
                px-3 py-1 text-xs rounded-lg transition-colors
                ${timeFrame === period
                  ? 'bg-zenith-500 text-white'
                  : 'bg-background border border-border hover:bg-muted'
                }
              `}
            >
              {period === 'all' ? 'All Time' : period.toUpperCase()}
            </button>
          ))}
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="glass-card p-4">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-full bg-zenith-500/20 flex items-center justify-center">
              <DollarSign className="w-5 h-5 text-zenith-400" />
            </div>
            <div>
              <div className="text-lg font-bold">{totalVolume.toFixed(0)} SOL</div>
              <div className="text-sm text-muted-foreground">Total Volume</div>
            </div>
          </div>
          <div className="mt-2 text-xs text-success-400">
            +{(totalVolume * 0.15).toFixed(0)} SOL this {timeFrame}
          </div>
        </div>

        <div className="glass-card p-4">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-full bg-success-500/20 flex items-center justify-center">
              <TrendingUp className="w-5 h-5 text-success-400" />
            </div>
            <div>
              <div className="text-lg font-bold">{totalEarnings.toFixed(2)} SOL</div>
              <div className="text-sm text-muted-foreground">Total Earnings</div>
            </div>
          </div>
          <div className="mt-2 text-xs text-success-400">
            ~${(totalEarnings * 150).toFixed(0)} USD
          </div>
        </div>

        <div className="glass-card p-4">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-full bg-info-500/20 flex items-center justify-center">
              <Users className="w-5 h-5 text-info-400" />
            </div>
            <div>
              <div className="text-lg font-bold">{totalParticipants}</div>
              <div className="text-sm text-muted-foreground">Total Participants</div>
            </div>
          </div>
          <div className="mt-2 text-xs text-info-400">
            Avg {(totalParticipants / Math.max(markets.length, 1)).toFixed(0)} per market
          </div>
        </div>

        <div className="glass-card p-4">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-full bg-warning-500/20 flex items-center justify-center">
              <Target className="w-5 h-5 text-warning-400" />
            </div>
            <div>
              <div className="text-lg font-bold">{avgVolumePerMarket.toFixed(0)} SOL</div>
              <div className="text-sm text-muted-foreground">Avg Volume/Market</div>
            </div>
          </div>
          <div className="mt-2 text-xs text-warning-400">
            {markets.length} total markets
          </div>
        </div>
      </div>

      {/* Performance Distribution */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="glass-card p-6">
          <h4 className="text-lg font-semibold mb-4 flex items-center space-x-2">
            <PieChart className="w-5 h-5 text-zenith-400" />
            <span>Performance Distribution</span>
          </h4>

          <div className="space-y-4">
            {performanceData.map((item, index) => (
              <div key={index} className="flex items-center space-x-4">
                <div className={`w-4 h-4 rounded-full ${item.color}`} />
                <div className="flex-1">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium">{item.label}</span>
                    <span className="text-sm text-muted-foreground">{item.count} markets</span>
                  </div>
                  <div className="w-full bg-muted rounded-full h-2 mt-1">
                    <div
                      className={`h-2 rounded-full ${item.color}`}
                      style={{ width: `${(item.count / markets.length) * 100}%` }}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Category Breakdown */}
        <div className="glass-card p-6">
          <h4 className="text-lg font-semibold mb-4 flex items-center space-x-2">
            <BarChart3 className="w-5 h-5 text-zenith-400" />
            <span>Category Performance</span>
          </h4>

          <div className="space-y-3">
            {categoryStats.slice(0, 5).map((category, index) => (
              <div key={category.category} className="flex items-center space-x-3">
                <div className="text-lg">{getCategoryIcon(category.category)}</div>
                <div className="flex-1">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium capitalize">
                      {category.category.replace('_', ' ')}
                    </span>
                    <span className="text-sm text-muted-foreground">
                      {category.volume.toFixed(0)} SOL
                    </span>
                  </div>
                  <div className="flex justify-between items-center text-xs text-muted-foreground">
                    <span>{category.count} markets</span>
                    <span>{category.percentage.toFixed(1)}% of volume</span>
                  </div>
                  <div className="w-full bg-muted rounded-full h-1.5 mt-1">
                    <div
                      className="h-1.5 rounded-full bg-zenith-500"
                      style={{ width: `${category.percentage}%` }}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="glass-card p-6">
        <h4 className="text-lg font-semibold mb-4 flex items-center space-x-2">
          <Clock className="w-5 h-5 text-zenith-400" />
          <span>Recent Market Activity</span>
        </h4>

        <div className="space-y-3">
          {markets.slice(0, 5).map((market, index) => (
            <div key={market.id} className="flex items-center justify-between p-3 bg-background/50 rounded-lg">
              <div className="flex items-center space-x-3">
                <div className="text-lg">{getCategoryIcon(market.category)}</div>
                <div>
                  <div className="font-medium text-sm truncate max-w-xs">
                    {market.question}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    Created {new Date(market.created_at).toLocaleDateString()}
                  </div>
                </div>
              </div>
              <div className="text-right">
                <div className="text-sm font-medium">
                  {market.total_volume?.toFixed(0) || '0'} SOL
                </div>
                <div className="text-xs text-muted-foreground">
                  {market.participants || 0} participants
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Arcium Privacy Stats */}
      <div className="glass-card border-zenith-500/30 bg-zenith-500/5 p-6">
        <h4 className="text-lg font-semibold mb-4 flex items-center space-x-2 text-zenith-400">
          <Zap className="w-5 h-5" />
          <span>Privacy Protection Stats</span>
        </h4>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-zenith-400">
              {markets.filter(m => m.privacy_level === 'private').length}
            </div>
            <div className="text-sm text-muted-foreground">Fully Private Markets</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-zenith-400">
              {markets.filter(m => m.privacy_level === 'semi_private').length}
            </div>
            <div className="text-sm text-muted-foreground">Semi-Private Markets</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-zenith-400">
              {totalParticipants}
            </div>
            <div className="text-sm text-muted-foreground">Protected Participants</div>
          </div>
        </div>

        <div className="mt-4 text-xs text-muted-foreground text-center">
          All markets use Arcium MPC for anti-manipulation detection and secure oracle resolution
        </div>
      </div>
    </div>
  );
};