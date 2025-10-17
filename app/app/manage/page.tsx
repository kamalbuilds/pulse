'use client';

import React, { useState, useEffect } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { ArrowLeft, Plus, Search, Filter, MoreVertical, Users, DollarSign, Clock, AlertTriangle } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { MarketManagerCard } from '@/components/manage/MarketManagerCard';
import { MarketAnalytics } from '@/components/manage/MarketAnalytics';
import { MarketFilters } from '@/components/manage/MarketFilters';
import { Market, MarketStatus } from '@/types/market';
import { mockMarkets } from '@/lib/mockData';

export default function ManageMarketsPage() {
  const { connected, publicKey } = useWallet();
  const router = useRouter();
  const [markets, setMarkets] = useState<Market[]>([]);
  const [filteredMarkets, setFilteredMarkets] = useState<Market[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<MarketStatus | 'all'>('all');
  const [sortBy, setSortBy] = useState<'newest' | 'volume' | 'participants'>('newest');
  const [showAnalytics, setShowAnalytics] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (connected && publicKey) {
      // In production, fetch user's markets from blockchain
      // For now, simulate user-created markets
      const userMarkets = mockMarkets.map((market, index) => ({
        ...market,
        creator: index < 3 ? publicKey.toString() : market.creator,
        status: index === 0 ? 'active' as MarketStatus :
                index === 1 ? 'pending_resolution' as MarketStatus :
                'resolved' as MarketStatus,
      }));

      setMarkets(userMarkets.filter(m => m.creator === publicKey.toString()));
      setLoading(false);
    }
  }, [connected, publicKey]);

  useEffect(() => {
    let filtered = markets;

    // Apply search filter
    if (searchQuery) {
      filtered = filtered.filter(market =>
        market.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
        market.category.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Apply status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(market => market.status === statusFilter);
    }

    // Apply sorting
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'newest':
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        case 'volume':
          return (b.total_volume || 0) - (a.total_volume || 0);
        case 'participants':
          return (b.participants || 0) - (a.participants || 0);
        default:
          return 0;
      }
    });

    setFilteredMarkets(filtered);
  }, [markets, searchQuery, statusFilter, sortBy]);

  if (!connected) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="text-center space-y-4">
          <AlertTriangle className="w-16 h-16 text-warning-400 mx-auto" />
          <h1 className="text-2xl font-bold">Wallet Required</h1>
          <p className="text-muted-foreground">
            Please connect your Solana wallet to manage your markets
          </p>
          <button
            onClick={() => router.push('/')}
            className="btn-primary"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  const totalVolume = markets.reduce((sum, market) => sum + (market.total_volume || 0), 0);
  const totalParticipants = markets.reduce((sum, market) => sum + (market.participants || 0), 0);
  const activeMarkets = markets.filter(m => m.status === 'active').length;

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center space-x-4">
            <button
              onClick={() => router.push('/')}
              className="p-2 rounded-lg hover:bg-muted transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <h1 className="text-2xl font-bold">Manage Markets</h1>
              <p className="text-muted-foreground">
                Monitor and manage your prediction markets
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            <button
              onClick={() => setShowAnalytics(!showAnalytics)}
              className="btn-secondary"
            >
              Analytics
            </button>
            <button
              onClick={() => router.push('/create')}
              className="btn-primary flex items-center space-x-2"
            >
              <Plus className="w-4 h-4" />
              <span>Create Market</span>
            </button>
          </div>
        </div>

        {/* Analytics Panel */}
        {showAnalytics && (
          <div className="mb-8">
            <MarketAnalytics markets={markets} />
          </div>
        )}

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <div className="glass-card p-4">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-full bg-zenith-500/20 flex items-center justify-center">
                <Users className="w-5 h-5 text-zenith-400" />
              </div>
              <div>
                <div className="text-lg font-bold">{markets.length}</div>
                <div className="text-sm text-muted-foreground">Total Markets</div>
              </div>
            </div>
          </div>

          <div className="glass-card p-4">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-full bg-success-500/20 flex items-center justify-center">
                <Clock className="w-5 h-5 text-success-400" />
              </div>
              <div>
                <div className="text-lg font-bold">{activeMarkets}</div>
                <div className="text-sm text-muted-foreground">Active</div>
              </div>
            </div>
          </div>

          <div className="glass-card p-4">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-full bg-warning-500/20 flex items-center justify-center">
                <DollarSign className="w-5 h-5 text-warning-400" />
              </div>
              <div>
                <div className="text-lg font-bold">${totalVolume.toFixed(0)}</div>
                <div className="text-sm text-muted-foreground">Total Volume</div>
              </div>
            </div>
          </div>

          <div className="glass-card p-4">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-full bg-info-500/20 flex items-center justify-center">
                <Users className="w-5 h-5 text-info-400" />
              </div>
              <div>
                <div className="text-lg font-bold">{totalParticipants}</div>
                <div className="text-sm text-muted-foreground">Participants</div>
              </div>
            </div>
          </div>
        </div>

        {/* Filters and Search */}
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 mb-6">
          <div className="flex items-center space-x-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search markets..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 pr-4 py-2 bg-background border border-border rounded-lg focus:ring-2 focus:ring-zenith-500 focus:border-transparent"
              />
            </div>

            <MarketFilters
              statusFilter={statusFilter}
              onStatusChange={setStatusFilter}
              sortBy={sortBy}
              onSortChange={setSortBy}
            />
          </div>

          <div className="text-sm text-muted-foreground">
            {filteredMarkets.length} of {markets.length} markets
          </div>
        </div>

        {/* Markets List */}
        {loading ? (
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="glass-card p-6 animate-pulse">
                <div className="h-4 bg-muted rounded w-3/4 mb-2" />
                <div className="h-3 bg-muted rounded w-1/2" />
              </div>
            ))}
          </div>
        ) : filteredMarkets.length === 0 ? (
          <div className="text-center py-12">
            <div className="w-16 h-16 rounded-full bg-muted-foreground/10 flex items-center justify-center mx-auto mb-4">
              <Users className="w-8 h-8 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-semibold mb-2">No markets found</h3>
            <p className="text-muted-foreground mb-6">
              {markets.length === 0
                ? "You haven't created any markets yet."
                : "No markets match your current filters."}
            </p>
            {markets.length === 0 && (
              <button
                onClick={() => router.push('/create')}
                className="btn-primary"
              >
                Create Your First Market
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            {filteredMarkets.map((market) => (
              <MarketManagerCard
                key={market.id}
                market={market}
                onEdit={(id) => router.push(`/manage/${id}/edit`)}
                onResolve={(id) => router.push(`/manage/${id}/resolve`)}
                onAnalytics={(id) => router.push(`/manage/${id}/analytics`)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}