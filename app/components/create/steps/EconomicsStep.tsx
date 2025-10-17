'use client';

import React from 'react';
import { DollarSign, TrendingUp, Users, Percent, Info, Calculator } from 'lucide-react';
import { Market } from '@/types/market';

interface EconomicsStepProps {
  data: Partial<Market>;
  errors: Record<string, string>;
  onChange: (data: Partial<Market>) => void;
}

export const EconomicsStep: React.FC<EconomicsStepProps> = ({
  data,
  errors,
  onChange,
}) => {
  const handleInputChange = (field: keyof Market, value: any) => {
    onChange({ [field]: value });
  };

  const calculateEstimatedReturns = () => {
    const liquidity = data.initial_liquidity || 0;
    const tradingFee = data.trading_fee || 0;
    const creatorFee = data.creator_fee || 0;

    // Estimate daily volume as 10% of liquidity
    const estimatedDailyVolume = liquidity * 0.1;
    const dailyTradingFees = estimatedDailyVolume * (tradingFee / 100);
    const dailyCreatorFees = estimatedDailyVolume * (creatorFee / 100);

    return {
      dailyVolume: estimatedDailyVolume,
      dailyTradingFees,
      dailyCreatorFees,
      monthlyCreatorFees: dailyCreatorFees * 30,
    };
  };

  const estimates = calculateEstimatedReturns();

  return (
    <div className="space-y-8">
      {/* Initial Liquidity */}
      <div className="space-y-4">
        <label className="block text-sm font-medium text-foreground">
          Initial Liquidity (SOL) *
        </label>
        <div className="relative">
          <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-muted-foreground" />
          <input
            type="number"
            min="100"
            max="100000"
            step="50"
            value={data.initial_liquidity || ''}
            onChange={(e) => handleInputChange('initial_liquidity', parseFloat(e.target.value) || 0)}
            placeholder="1000"
            className={`
              w-full pl-10 pr-4 py-3 bg-background border rounded-lg
              focus:ring-2 focus:ring-zenith-500 focus:border-transparent
              ${errors.initial_liquidity ? 'border-error-500' : 'border-border'}
            `}
          />
        </div>
        <div className="flex items-center justify-between text-xs">
          <span className={errors.initial_liquidity ? 'text-error-400' : 'text-muted-foreground'}>
            {errors.initial_liquidity || 'Minimum 100 SOL required for market creation'}
          </span>
          <span className="text-muted-foreground">
            ~${((data.initial_liquidity || 0) * 150).toLocaleString()} USD
          </span>
        </div>
      </div>

      {/* Trading Fees */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Trading Fee */}
        <div className="space-y-3">
          <label className="block text-sm font-medium text-foreground">
            Trading Fee (%)
          </label>
          <div className="relative">
            <Percent className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-muted-foreground" />
            <input
              type="number"
              min="0"
              max="5"
              step="0.1"
              value={data.trading_fee || ''}
              onChange={(e) => handleInputChange('trading_fee', parseFloat(e.target.value) || 0)}
              placeholder="0.5"
              className={`
                w-full pl-10 pr-4 py-3 bg-background border rounded-lg
                focus:ring-2 focus:ring-zenith-500 focus:border-transparent
                ${errors.trading_fee ? 'border-error-500' : 'border-border'}
              `}
            />
          </div>
          <p className="text-xs text-muted-foreground">
            Fee charged on each trade (0-5%)
          </p>
          {errors.trading_fee && (
            <p className="text-xs text-error-400">{errors.trading_fee}</p>
          )}
        </div>

        {/* Creator Fee */}
        <div className="space-y-3">
          <label className="block text-sm font-medium text-foreground">
            Creator Fee (%)
          </label>
          <div className="relative">
            <TrendingUp className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-muted-foreground" />
            <input
              type="number"
              min="0"
              max="2"
              step="0.1"
              value={data.creator_fee || ''}
              onChange={(e) => handleInputChange('creator_fee', parseFloat(e.target.value) || 0)}
              placeholder="0.2"
              className={`
                w-full pl-10 pr-4 py-3 bg-background border rounded-lg
                focus:ring-2 focus:ring-zenith-500 focus:border-transparent
                ${errors.creator_fee ? 'border-error-500' : 'border-border'}
              `}
            />
          </div>
          <p className="text-xs text-muted-foreground">
            Your fee from trading volume (0-2%)
          </p>
          {errors.creator_fee && (
            <p className="text-xs text-error-400">{errors.creator_fee}</p>
          )}
        </div>
      </div>

      {/* Incentive Mechanisms */}
      <div className="space-y-4">
        <h3 className="text-lg font-medium text-foreground flex items-center space-x-2">
          <Users className="w-5 h-5" />
          <span>Participation Incentives</span>
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Early Bird Bonus */}
          <div className="space-y-3">
            <label className="block text-sm font-medium text-foreground">
              Early Bird Bonus (SOL)
            </label>
            <input
              type="number"
              min="0"
              max="1000"
              step="10"
              value={data.early_bird_bonus || ''}
              onChange={(e) => handleInputChange('early_bird_bonus', parseFloat(e.target.value) || 0)}
              placeholder="50"
              className="w-full px-4 py-3 bg-background border border-border rounded-lg focus:ring-2 focus:ring-zenith-500 focus:border-transparent"
            />
            <p className="text-xs text-muted-foreground">
              Bonus for first 100 participants
            </p>
          </div>

          {/* Referral Bonus */}
          <div className="space-y-3">
            <label className="block text-sm font-medium text-foreground">
              Referral Bonus (SOL)
            </label>
            <input
              type="number"
              min="0"
              max="100"
              step="1"
              value={data.referral_bonus || ''}
              onChange={(e) => handleInputChange('referral_bonus', parseFloat(e.target.value) || 0)}
              placeholder="5"
              className="w-full px-4 py-3 bg-background border border-border rounded-lg focus:ring-2 focus:ring-zenith-500 focus:border-transparent"
            />
            <p className="text-xs text-muted-foreground">
              Bonus for each successful referral
            </p>
          </div>
        </div>
      </div>

      {/* Market Limits */}
      <div className="space-y-4">
        <h3 className="text-lg font-medium text-foreground">
          Market Limits
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Maximum Position Size */}
          <div className="space-y-3">
            <label className="block text-sm font-medium text-foreground">
              Max Position Size (SOL)
            </label>
            <input
              type="number"
              min="0"
              max="10000"
              step="50"
              value={data.max_position_size || ''}
              onChange={(e) => handleInputChange('max_position_size', parseFloat(e.target.value) || 0)}
              placeholder="1000"
              className="w-full px-4 py-3 bg-background border border-border rounded-lg focus:ring-2 focus:ring-zenith-500 focus:border-transparent"
            />
            <p className="text-xs text-muted-foreground">
              Maximum SOL per user position (0 = unlimited)
            </p>
          </div>

          {/* Minimum Position Size */}
          <div className="space-y-3">
            <label className="block text-sm font-medium text-foreground">
              Min Position Size (SOL)
            </label>
            <input
              type="number"
              min="0.1"
              max="100"
              step="0.1"
              value={data.min_position_size || ''}
              onChange={(e) => handleInputChange('min_position_size', parseFloat(e.target.value) || 0)}
              placeholder="1"
              className="w-full px-4 py-3 bg-background border border-border rounded-lg focus:ring-2 focus:ring-zenith-500 focus:border-transparent"
            />
            <p className="text-xs text-muted-foreground">
              Minimum SOL required to participate
            </p>
          </div>
        </div>
      </div>

      {/* Revenue Estimation */}
      <div className="glass-card border-success-500/30 bg-success-500/5 p-6">
        <h3 className="text-lg font-medium text-success-400 mb-4 flex items-center space-x-2">
          <Calculator className="w-5 h-5" />
          <span>Revenue Estimation</span>
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm">
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Estimated Daily Volume:</span>
              <span className="font-medium">{estimates.dailyVolume.toFixed(1)} SOL</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Daily Trading Fees:</span>
              <span className="font-medium">{estimates.dailyTradingFees.toFixed(2)} SOL</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Daily Creator Fees:</span>
              <span className="font-medium text-success-400">{estimates.dailyCreatorFees.toFixed(2)} SOL</span>
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Monthly Creator Revenue:</span>
              <span className="font-medium text-success-400">{estimates.monthlyCreatorFees.toFixed(1)} SOL</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Est. Monthly USD:</span>
              <span className="font-medium text-success-400">
                ${(estimates.monthlyCreatorFees * 150).toFixed(0)}
              </span>
            </div>
          </div>
        </div>

        <div className="mt-4 p-3 bg-background/50 rounded-lg">
          <p className="text-xs text-muted-foreground">
            * Estimates based on 10% daily volume relative to liquidity. Actual results may vary significantly.
          </p>
        </div>
      </div>

      {/* Fee Distribution */}
      <div className="space-y-4">
        <h3 className="text-lg font-medium text-foreground">
          Fee Distribution
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="glass-card p-4 text-center">
            <div className="text-lg font-bold text-zenith-400">
              {((data.creator_fee || 0) / ((data.trading_fee || 0.5) + (data.creator_fee || 0)) * 100).toFixed(0)}%
            </div>
            <div className="text-sm text-muted-foreground">To Creator</div>
          </div>

          <div className="glass-card p-4 text-center">
            <div className="text-lg font-bold text-info-400">
              {(((data.trading_fee || 0.5) * 0.7) / ((data.trading_fee || 0.5) + (data.creator_fee || 0)) * 100).toFixed(0)}%
            </div>
            <div className="text-sm text-muted-foreground">To Protocol</div>
          </div>

          <div className="glass-card p-4 text-center">
            <div className="text-lg font-bold text-warning-400">
              {(((data.trading_fee || 0.5) * 0.3) / ((data.trading_fee || 0.5) + (data.creator_fee || 0)) * 100).toFixed(0)}%
            </div>
            <div className="text-sm text-muted-foreground">To Liquidity</div>
          </div>
        </div>
      </div>

      {/* Info Box */}
      <div className="glass-card border-info-500/30 bg-info-500/5 p-4">
        <div className="flex items-start space-x-3">
          <Info className="w-5 h-5 text-info-400 flex-shrink-0 mt-0.5" />
          <div className="text-sm">
            <h4 className="font-medium text-info-400 mb-1">
              Economics Best Practices
            </h4>
            <ul className="text-info-300 space-y-1">
              <li>• Higher liquidity attracts more traders and reduces slippage</li>
              <li>• Competitive fees (0.3-0.7%) encourage participation</li>
              <li>• Incentives can bootstrap early adoption</li>
              <li>• Position limits prevent market manipulation</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};