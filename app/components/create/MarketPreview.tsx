'use client';

import React, { useState } from 'react';
import { ArrowLeft, Edit, Check, DollarSign, Users, Calendar, Shield, Zap, AlertTriangle } from 'lucide-react';
import { Market } from '@/types/market';

interface MarketPreviewProps {
  marketData: Market;
  onEdit: (step: number) => void;
  onCreate: (market: Market) => void;
  onBack: () => void;
}

export const MarketPreview: React.FC<MarketPreviewProps> = ({
  marketData,
  onEdit,
  onCreate,
  onBack,
}) => {
  const [isCreating, setIsCreating] = useState(false);
  const [agreedToTerms, setAgreedToTerms] = useState(false);

  const handleCreate = async () => {
    if (!agreedToTerms) {
      alert('Please agree to the terms and conditions');
      return;
    }

    setIsCreating(true);
    try {
      await onCreate(marketData);
    } finally {
      setIsCreating(false);
    }
  };

  const formatDate = (dateString: string | Date | undefined): string => {
    if (!dateString) return 'Not set';
    return new Date(dateString).toLocaleString();
  };

  const getTimeRemaining = (targetDate: string | Date | undefined): string => {
    if (!targetDate) return '';

    const now = new Date();
    const target = new Date(targetDate);
    const diff = target.getTime() - now.getTime();

    if (diff <= 0) return 'Past date';

    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));

    if (days > 0) {
      return `${days} day${days !== 1 ? 's' : ''}, ${hours} hour${hours !== 1 ? 's' : ''}`;
    }
    return `${hours} hour${hours !== 1 ? 's' : ''}`;
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

  const getPrivacyBadge = (level: string) => {
    switch (level) {
      case 'public':
        return <span className="px-2 py-1 bg-info-500/20 text-info-400 text-xs rounded-full">Public</span>;
      case 'semi_private':
        return <span className="px-2 py-1 bg-warning-500/20 text-warning-400 text-xs rounded-full">Semi-Private</span>;
      case 'private':
        return <span className="px-2 py-1 bg-success-500/20 text-success-400 text-xs rounded-full">Fully Private</span>;
      default:
        return null;
    }
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="text-center space-y-2">
        <h2 className="text-2xl font-bold">Review Your Market</h2>
        <p className="text-muted-foreground">
          Double-check all details before deploying to the blockchain
        </p>
      </div>

      {/* Market Card Preview */}
      <div className="glass-card p-6 border-zenith-500/30">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center space-x-3">
            <div className="text-2xl">{getCategoryIcon(marketData.category)}</div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
                  {marketData.category.replace('_', ' ')}
                </span>
                {getPrivacyBadge(marketData.privacy_level)}
              </div>
              <h3 className="text-lg font-bold text-foreground mt-1">
                {marketData.question}
              </h3>
            </div>
          </div>
          <button
            onClick={() => onEdit(1)}
            className="p-2 rounded-lg hover:bg-muted transition-colors"
          >
            <Edit className="w-4 h-4" />
          </button>
        </div>

        <p className="text-muted-foreground text-sm mb-4">
          {marketData.description}
        </p>

        {/* Quick Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center">
            <div className="text-lg font-bold text-zenith-400">
              {marketData.initial_liquidity} SOL
            </div>
            <div className="text-xs text-muted-foreground">Initial Liquidity</div>
          </div>
          <div className="text-center">
            <div className="text-lg font-bold text-success-400">
              {(marketData.trading_fee || 0).toFixed(1)}%
            </div>
            <div className="text-xs text-muted-foreground">Trading Fee</div>
          </div>
          <div className="text-center">
            <div className="text-lg font-bold text-warning-400">
              {(marketData.creator_fee || 0).toFixed(1)}%
            </div>
            <div className="text-xs text-muted-foreground">Creator Fee</div>
          </div>
          <div className="text-center">
            <div className="text-lg font-bold text-foreground">
              {marketData.type === 'binary' ? 'YES/NO' :
               marketData.type === 'categorical' ? 'MULTI' : 'RANGE'}
            </div>
            <div className="text-xs text-muted-foreground">Market Type</div>
          </div>
        </div>
      </div>

      {/* Configuration Sections */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Oracle Configuration */}
        <div className="glass-card p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold flex items-center space-x-2">
              <Shield className="w-5 h-5 text-zenith-400" />
              <span>Oracle Setup</span>
            </h3>
            <button
              onClick={() => onEdit(2)}
              className="p-1 rounded hover:bg-muted transition-colors"
            >
              <Edit className="w-4 h-4" />
            </button>
          </div>

          <div className="space-y-3 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Oracle Type:</span>
              <span className="font-medium">
                {marketData.oracle_config?.type === 'uma_optimistic' ? 'UMA Optimistic' :
                 marketData.oracle_config?.type === 'consensus' ? 'Oracle Consensus' :
                 marketData.oracle_config?.type === 'api' ? 'API Data Source' :
                 'Manual Resolution'}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Resolution Source:</span>
              <span className="font-medium capitalize">
                {marketData.oracle_config?.resolution_source?.replace('_', ' ')}
              </span>
            </div>
            {marketData.oracle_config?.minimum_bond && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Minimum Bond:</span>
                <span className="font-medium">{marketData.oracle_config.minimum_bond} SOL</span>
              </div>
            )}
            {marketData.oracle_config?.challenge_period && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Challenge Period:</span>
                <span className="font-medium">
                  {marketData.oracle_config.challenge_period / 3600} hours
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Economics */}
        <div className="glass-card p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold flex items-center space-x-2">
              <DollarSign className="w-5 h-5 text-success-400" />
              <span>Economics</span>
            </h3>
            <button
              onClick={() => onEdit(3)}
              className="p-1 rounded hover:bg-muted transition-colors"
            >
              <Edit className="w-4 h-4" />
            </button>
          </div>

          <div className="space-y-3 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Initial Liquidity:</span>
              <span className="font-medium">{marketData.initial_liquidity} SOL</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Trading Fee:</span>
              <span className="font-medium">{(marketData.trading_fee || 0).toFixed(1)}%</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Creator Fee:</span>
              <span className="font-medium">{(marketData.creator_fee || 0).toFixed(1)}%</span>
            </div>
            {marketData.max_position_size && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Max Position:</span>
                <span className="font-medium">{marketData.max_position_size} SOL</span>
              </div>
            )}
            {marketData.min_position_size && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Min Position:</span>
                <span className="font-medium">{marketData.min_position_size} SOL</span>
              </div>
            )}
          </div>
        </div>

        {/* Timeline */}
        <div className="glass-card p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold flex items-center space-x-2">
              <Calendar className="w-5 h-5 text-info-400" />
              <span>Timeline</span>
            </h3>
            <button
              onClick={() => onEdit(4)}
              className="p-1 rounded hover:bg-muted transition-colors"
            >
              <Edit className="w-4 h-4" />
            </button>
          </div>

          <div className="space-y-3 text-sm">
            {marketData.trading_deadline && (
              <div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Trading Ends:</span>
                  <span className="font-medium">{formatDate(marketData.trading_deadline)}</span>
                </div>
                <div className="text-xs text-warning-400 text-right">
                  {getTimeRemaining(marketData.trading_deadline)}
                </div>
              </div>
            )}
            {marketData.resolution_date && (
              <div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Market Resolves:</span>
                  <span className="font-medium">{formatDate(marketData.resolution_date)}</span>
                </div>
                <div className="text-xs text-success-400 text-right">
                  {getTimeRemaining(marketData.resolution_date)}
                </div>
              </div>
            )}
            {marketData.grace_period && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Grace Period:</span>
                <span className="font-medium">{marketData.grace_period} hours</span>
              </div>
            )}
          </div>
        </div>

        {/* Privacy & Security */}
        <div className="glass-card p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold flex items-center space-x-2">
              <Zap className="w-5 h-5 text-zenith-400" />
              <span>Arcium Privacy</span>
            </h3>
          </div>

          <div className="space-y-3 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Privacy Level:</span>
              <span className="font-medium capitalize">
                {marketData.privacy_level?.replace('_', ' ')}
              </span>
            </div>
            <div className="flex items-start space-x-2">
              <Check className="w-4 h-4 text-success-400 mt-0.5 flex-shrink-0" />
              <span className="text-muted-foreground">Encrypted vote submission via MPC</span>
            </div>
            <div className="flex items-start space-x-2">
              <Check className="w-4 h-4 text-success-400 mt-0.5 flex-shrink-0" />
              <span className="text-muted-foreground">Anti-manipulation detection</span>
            </div>
            <div className="flex items-start space-x-2">
              <Check className="w-4 h-4 text-success-400 mt-0.5 flex-shrink-0" />
              <span className="text-muted-foreground">Reputation-weighted consensus</span>
            </div>
          </div>
        </div>
      </div>

      {/* Estimated Costs */}
      <div className="glass-card border-warning-500/30 bg-warning-500/5 p-6">
        <h3 className="text-lg font-semibold text-warning-400 mb-4">
          Estimated Deployment Costs
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Market Creation:</span>
            <span className="font-medium">~0.02 SOL</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Initial Liquidity:</span>
            <span className="font-medium">{marketData.initial_liquidity} SOL</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Oracle Setup:</span>
            <span className="font-medium">~{marketData.oracle_config?.minimum_bond || 0} SOL</span>
          </div>
        </div>
        <div className="border-t border-warning-500/20 mt-4 pt-4">
          <div className="flex justify-between font-semibold">
            <span>Total Estimated Cost:</span>
            <span className="text-warning-400">
              ~{((marketData.initial_liquidity || 0) + (marketData.oracle_config?.minimum_bond || 0) + 0.02).toFixed(2)} SOL
            </span>
          </div>
        </div>
      </div>

      {/* Terms and Conditions */}
      <div className="glass-card p-6">
        <div className="flex items-start space-x-3">
          <input
            type="checkbox"
            id="agree-terms"
            checked={agreedToTerms}
            onChange={(e) => setAgreedToTerms(e.target.checked)}
            className="w-5 h-5 rounded border-border focus:ring-2 focus:ring-zenith-500 mt-1"
          />
          <div className="text-sm">
            <label htmlFor="agree-terms" className="font-medium text-foreground cursor-pointer">
              I agree to the Terms and Conditions
            </label>
            <ul className="text-muted-foreground mt-2 space-y-1">
              <li>• Market creation is irreversible once deployed</li>
              <li>• Creator fees will be distributed automatically</li>
              <li>• Resolution must follow the specified oracle configuration</li>
              <li>• All transactions are recorded on the Solana blockchain</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex items-center justify-between">
        <button
          onClick={onBack}
          className="flex items-center space-x-2 px-6 py-3 bg-background border border-border rounded-lg hover:bg-muted transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Timeline</span>
        </button>

        <button
          onClick={handleCreate}
          disabled={!agreedToTerms || isCreating}
          className={`
            flex items-center space-x-2 px-8 py-3 rounded-lg font-medium transition-all
            ${agreedToTerms && !isCreating
              ? 'bg-zenith-500 hover:bg-zenith-600 text-white'
              : 'bg-muted text-muted-foreground cursor-not-allowed'
            }
          `}
        >
          {isCreating ? (
            <>
              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              <span>Creating Market...</span>
            </>
          ) : (
            <>
              <Zap className="w-4 h-4" />
              <span>Deploy Market</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
};