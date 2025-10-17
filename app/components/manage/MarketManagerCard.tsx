'use client';

import React, { useState } from 'react';
import { MoreVertical, Users, DollarSign, Clock, TrendingUp, AlertTriangle, CheckCircle, Edit, BarChart3, Gavel } from 'lucide-react';
import { Market, MarketStatus } from '@/types/market';

interface MarketManagerCardProps {
  market: Market;
  onEdit: (id: string) => void;
  onResolve: (id: string) => void;
  onAnalytics: (id: string) => void;
}

export const MarketManagerCard: React.FC<MarketManagerCardProps> = ({
  market,
  onEdit,
  onResolve,
  onAnalytics,
}) => {
  const [showMenu, setShowMenu] = useState(false);

  const getStatusColor = (status: MarketStatus) => {
    switch (status) {
      case 'active': return 'text-success-400 bg-success-500/20';
      case 'pending_resolution': return 'text-warning-400 bg-warning-500/20';
      case 'resolved': return 'text-info-400 bg-info-500/20';
      case 'disputed': return 'text-error-400 bg-error-500/20';
      case 'cancelled': return 'text-muted-foreground bg-muted';
      default: return 'text-muted-foreground bg-muted';
    }
  };

  const getStatusIcon = (status: MarketStatus) => {
    switch (status) {
      case 'active': return <Clock className="w-4 h-4" />;
      case 'pending_resolution': return <AlertTriangle className="w-4 h-4" />;
      case 'resolved': return <CheckCircle className="w-4 h-4" />;
      case 'disputed': return <AlertTriangle className="w-4 h-4" />;
      case 'cancelled': return <AlertTriangle className="w-4 h-4" />;
      default: return <Clock className="w-4 h-4" />;
    }
  };

  const formatTimeRemaining = (date: string | Date | undefined): string => {
    if (!date) return '';

    const now = new Date();
    const target = new Date(date);
    const diff = target.getTime() - now.getTime();

    if (diff <= 0) return 'Ended';

    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));

    if (days > 0) {
      return `${days}d ${hours}h`;
    }
    return `${hours}h`;
  };

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

  const canEdit = market.status === 'active';
  const canResolve = market.status === 'pending_resolution' ||
                    (market.status === 'active' && market.resolution_date && new Date(market.resolution_date) <= new Date());

  return (
    <div className="glass-card p-6 hover:border-zenith-500/30 transition-all">
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-start space-x-4 flex-1">
          <div className="text-2xl">{getCategoryIcon(market.category)}</div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center space-x-3 mb-2">
              <div className={`
                inline-flex items-center space-x-1 px-2 py-1 rounded-full text-xs font-medium
                ${getStatusColor(market.status)}
              `}>
                {getStatusIcon(market.status)}
                <span className="capitalize">{market.status.replace('_', ' ')}</span>
              </div>
              <span className="text-xs text-muted-foreground uppercase tracking-wide">
                {market.category.replace('_', ' ')}
              </span>
            </div>
            <h3 className="text-lg font-semibold text-foreground mb-2 truncate">
              {market.question}
            </h3>
            <p className="text-sm text-muted-foreground line-clamp-2">
              {market.description}
            </p>
          </div>
        </div>

        {/* Actions Menu */}
        <div className="relative">
          <button
            onClick={() => setShowMenu(!showMenu)}
            className="p-2 rounded-lg hover:bg-muted transition-colors"
          >
            <MoreVertical className="w-4 h-4" />
          </button>

          {showMenu && (
            <div className="absolute right-0 top-full mt-2 w-48 bg-background border border-border rounded-lg shadow-lg z-10">
              <div className="py-1">
                <button
                  onClick={() => {
                    onAnalytics(market.id);
                    setShowMenu(false);
                  }}
                  className="flex items-center space-x-2 w-full px-4 py-2 text-sm hover:bg-muted transition-colors"
                >
                  <BarChart3 className="w-4 h-4" />
                  <span>View Analytics</span>
                </button>

                {canEdit && (
                  <button
                    onClick={() => {
                      onEdit(market.id);
                      setShowMenu(false);
                    }}
                    className="flex items-center space-x-2 w-full px-4 py-2 text-sm hover:bg-muted transition-colors"
                  >
                    <Edit className="w-4 h-4" />
                    <span>Edit Market</span>
                  </button>
                )}

                {canResolve && (
                  <button
                    onClick={() => {
                      onResolve(market.id);
                      setShowMenu(false);
                    }}
                    className="flex items-center space-x-2 w-full px-4 py-2 text-sm text-warning-400 hover:bg-warning-500/10 transition-colors"
                  >
                    <Gavel className="w-4 h-4" />
                    <span>Resolve Market</span>
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Market Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
        <div className="text-center">
          <div className="text-lg font-bold text-zenith-400">
            {market.total_volume?.toFixed(0) || '0'} SOL
          </div>
          <div className="text-xs text-muted-foreground">Total Volume</div>
        </div>
        <div className="text-center">
          <div className="text-lg font-bold text-success-400">
            {market.participants || 0}
          </div>
          <div className="text-xs text-muted-foreground">Participants</div>
        </div>
        <div className="text-center">
          <div className="text-lg font-bold text-warning-400">
            {((market.creator_fee || 0) * (market.total_volume || 0) / 100).toFixed(2)} SOL
          </div>
          <div className="text-xs text-muted-foreground">Your Earnings</div>
        </div>
        <div className="text-center">
          <div className="text-lg font-bold text-info-400">
            {formatTimeRemaining(market.resolution_date)}
          </div>
          <div className="text-xs text-muted-foreground">
            {market.status === 'resolved' ? 'Resolved' : 'Time Left'}
          </div>
        </div>
      </div>

      {/* Current Odds */}
      {market.type === 'binary' && (
        <div className="mb-4">
          <div className="flex items-center justify-between text-xs text-muted-foreground mb-2">
            <span>Current Odds</span>
            <span>Volume: {market.total_volume?.toFixed(0) || '0'} SOL</span>
          </div>
          <div className="flex space-x-2">
            <div className="flex-1 bg-success-500/20 rounded-lg p-3 text-center">
              <div className="text-lg font-bold text-success-400">
                {((market.yes_price || 0.5) * 100).toFixed(0)}%
              </div>
              <div className="text-xs text-muted-foreground">YES</div>
            </div>
            <div className="flex-1 bg-error-500/20 rounded-lg p-3 text-center">
              <div className="text-lg font-bold text-error-400">
                {((1 - (market.yes_price || 0.5)) * 100).toFixed(0)}%
              </div>
              <div className="text-xs text-muted-foreground">NO</div>
            </div>
          </div>
        </div>
      )}

      {/* Timeline */}
      <div className="space-y-2 text-xs">
        <div className="flex justify-between">
          <span className="text-muted-foreground">Created:</span>
          <span>{new Date(market.created_at).toLocaleDateString()}</span>
        </div>
        {market.trading_deadline && (
          <div className="flex justify-between">
            <span className="text-muted-foreground">Trading Ends:</span>
            <span>{new Date(market.trading_deadline).toLocaleDateString()}</span>
          </div>
        )}
        {market.resolution_date && (
          <div className="flex justify-between">
            <span className="text-muted-foreground">Resolves:</span>
            <span>{new Date(market.resolution_date).toLocaleDateString()}</span>
          </div>
        )}
      </div>

      {/* Quick Actions */}
      <div className="mt-4 pt-4 border-t border-border">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2 text-xs text-muted-foreground">
            <TrendingUp className="w-3 h-3" />
            <span>
              {market.privacy_level === 'private' ? 'Fully Private' :
               market.privacy_level === 'semi_private' ? 'Semi-Private' : 'Public'}
            </span>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={() => onAnalytics(market.id)}
              className="text-xs text-zenith-400 hover:text-zenith-300 transition-colors"
            >
              View Details
            </button>
            {canResolve && (
              <>
                <span className="text-muted-foreground">•</span>
                <button
                  onClick={() => onResolve(market.id)}
                  className="text-xs text-warning-400 hover:text-warning-300 transition-colors"
                >
                  Resolve Now
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Close menu when clicking outside */}
      {showMenu && (
        <div
          className="fixed inset-0 z-0"
          onClick={() => setShowMenu(false)}
        />
      )}
    </div>
  );
};