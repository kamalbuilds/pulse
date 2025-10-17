'use client';

import React from 'react';
import { Users, Globe, UserCheck, Clock, DollarSign, Shield, Info } from 'lucide-react';
import { Market, OracleConfig } from '@/types/market';

interface OracleSetupStepProps {
  data: Partial<Market>;
  errors: Record<string, string>;
  onChange: (data: Partial<Market>) => void;
}

export const OracleSetupStep: React.FC<OracleSetupStepProps> = ({
  data,
  errors,
  onChange,
}) => {
  const oracleTypes = [
    {
      id: 'uma_optimistic',
      label: 'UMA Optimistic Oracle',
      description: 'Optimistic resolution with dispute mechanism',
      icon: Shield,
      recommended: true,
    },
    {
      id: 'manual',
      label: 'Manual Resolution',
      description: 'Market creator resolves manually',
      icon: UserCheck,
      recommended: false,
    },
    {
      id: 'api',
      label: 'API Data Source',
      description: 'Automated resolution from external API',
      icon: Globe,
      recommended: false,
    },
    {
      id: 'consensus',
      label: 'Oracle Consensus',
      description: 'Multiple oracles vote on outcome',
      icon: Users,
      recommended: true,
    },
  ];

  const resolutionSources = [
    { id: 'manual', label: 'Manual by Creator' },
    { id: 'coinmarketcap', label: 'CoinMarketCap API' },
    { id: 'coingecko', label: 'CoinGecko API' },
    { id: 'espn', label: 'ESPN Sports API' },
    { id: 'polygon', label: 'Polygon News API' },
    { id: 'custom', label: 'Custom API Endpoint' },
  ];

  const handleOracleConfigChange = (field: keyof OracleConfig, value: any) => {
    const newConfig = { ...data.oracle_config, [field]: value };
    onChange({ oracle_config: newConfig });
  };

  const handleInputChange = (field: keyof Market, value: any) => {
    onChange({ [field]: value });
  };

  const getOracleConfig = (): OracleConfig => {
    return data.oracle_config || {
      type: 'uma_optimistic',
      resolution_source: 'manual',
      challenge_period: 86400,
      minimum_bond: 100,
      dispute_window: 604800,
    };
  };

  const config = getOracleConfig();

  return (
    <div className="space-y-8">
      {/* Oracle Type Selection */}
      <div className="space-y-4">
        <label className="block text-sm font-medium text-foreground">
          Oracle Type *
        </label>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {oracleTypes.map((type) => {
            const IconComponent = type.icon;
            const isSelected = config.type === type.id;

            return (
              <button
                key={type.id}
                type="button"
                onClick={() => handleOracleConfigChange('type', type.id)}
                className={`
                  relative p-4 rounded-lg border text-left transition-all
                  ${isSelected
                    ? 'border-zenith-500 bg-zenith-500/10'
                    : 'border-border hover:border-muted-foreground/50 hover:bg-muted'
                  }
                `}
              >
                {type.recommended && (
                  <div className="absolute -top-2 -right-2 bg-success-500 text-white text-xs px-2 py-1 rounded-full">
                    Recommended
                  </div>
                )}
                <div className="flex items-start space-x-3">
                  <IconComponent
                    className={`w-6 h-6 mt-1 ${isSelected ? 'text-zenith-400' : 'text-muted-foreground'}`}
                  />
                  <div>
                    <h4 className={`font-medium ${isSelected ? 'text-zenith-400' : 'text-foreground'}`}>
                      {type.label}
                    </h4>
                    <p className="text-sm text-muted-foreground mt-1">
                      {type.description}
                    </p>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
        {errors.oracle_type && (
          <p className="text-xs text-error-400">{errors.oracle_type}</p>
        )}
      </div>

      {/* Resolution Source */}
      <div className="space-y-3">
        <label className="block text-sm font-medium text-foreground">
          Resolution Source *
        </label>
        <select
          value={config.resolution_source}
          onChange={(e) => handleOracleConfigChange('resolution_source', e.target.value)}
          className={`
            w-full px-4 py-3 bg-background border rounded-lg
            focus:ring-2 focus:ring-zenith-500 focus:border-transparent
            ${errors.resolution_source ? 'border-error-500' : 'border-border'}
          `}
        >
          <option value="">Select resolution source</option>
          {resolutionSources.map((source) => (
            <option key={source.id} value={source.id}>
              {source.label}
            </option>
          ))}
        </select>
        {errors.resolution_source && (
          <p className="text-xs text-error-400">{errors.resolution_source}</p>
        )}
      </div>

      {/* Custom API Endpoint (if custom selected) */}
      {config.resolution_source === 'custom' && (
        <div className="space-y-3">
          <label className="block text-sm font-medium text-foreground">
            Custom API Endpoint
          </label>
          <input
            type="url"
            value={config.api_endpoint || ''}
            onChange={(e) => handleOracleConfigChange('api_endpoint', e.target.value)}
            placeholder="https://api.example.com/data"
            className="w-full px-4 py-3 bg-background border border-border rounded-lg focus:ring-2 focus:ring-zenith-500 focus:border-transparent"
          />
          <p className="text-xs text-muted-foreground">
            The API should return JSON with a boolean 'result' field
          </p>
        </div>
      )}

      {/* Oracle Parameters */}
      {config.type === 'uma_optimistic' && (
        <div className="space-y-6">
          <h3 className="text-lg font-medium text-foreground flex items-center space-x-2">
            <Clock className="w-5 h-5" />
            <span>Oracle Parameters</span>
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Challenge Period */}
            <div className="space-y-3">
              <label className="block text-sm font-medium text-foreground">
                Challenge Period (hours)
              </label>
              <input
                type="number"
                min="1"
                max="168"
                value={config.challenge_period ? config.challenge_period / 3600 : 24}
                onChange={(e) => handleOracleConfigChange('challenge_period', parseInt(e.target.value) * 3600)}
                className="w-full px-4 py-3 bg-background border border-border rounded-lg focus:ring-2 focus:ring-zenith-500 focus:border-transparent"
              />
              <p className="text-xs text-muted-foreground">
                Time allowed for challenging the initial resolution
              </p>
            </div>

            {/* Minimum Bond */}
            <div className="space-y-3">
              <label className="block text-sm font-medium text-foreground">
                Minimum Bond (SOL)
              </label>
              <input
                type="number"
                min="10"
                max="10000"
                step="10"
                value={config.minimum_bond || 100}
                onChange={(e) => handleOracleConfigChange('minimum_bond', parseFloat(e.target.value))}
                className={`
                  w-full px-4 py-3 bg-background border rounded-lg
                  focus:ring-2 focus:ring-zenith-500 focus:border-transparent
                  ${errors.minimum_bond ? 'border-error-500' : 'border-border'}
                `}
              />
              <p className="text-xs text-muted-foreground">
                Required bond for proposing resolution
              </p>
              {errors.minimum_bond && (
                <p className="text-xs text-error-400">{errors.minimum_bond}</p>
              )}
            </div>

            {/* Dispute Window */}
            <div className="space-y-3">
              <label className="block text-sm font-medium text-foreground">
                Dispute Window (days)
              </label>
              <input
                type="number"
                min="1"
                max="30"
                value={config.dispute_window ? config.dispute_window / 86400 : 7}
                onChange={(e) => handleOracleConfigChange('dispute_window', parseInt(e.target.value) * 86400)}
                className="w-full px-4 py-3 bg-background border border-border rounded-lg focus:ring-2 focus:ring-zenith-500 focus:border-transparent"
              />
              <p className="text-xs text-muted-foreground">
                Maximum time for dispute resolution
              </p>
            </div>

            {/* Oracle Reward */}
            <div className="space-y-3">
              <label className="block text-sm font-medium text-foreground">
                Oracle Reward (SOL)
              </label>
              <input
                type="number"
                min="1"
                max="1000"
                step="1"
                value={config.oracle_reward || 50}
                onChange={(e) => handleOracleConfigChange('oracle_reward', parseFloat(e.target.value))}
                className="w-full px-4 py-3 bg-background border border-border rounded-lg focus:ring-2 focus:ring-zenith-500 focus:border-transparent"
              />
              <p className="text-xs text-muted-foreground">
                Reward for correct oracle resolution
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Consensus Oracle Parameters */}
      {config.type === 'consensus' && (
        <div className="space-y-6">
          <h3 className="text-lg font-medium text-foreground flex items-center space-x-2">
            <Users className="w-5 h-5" />
            <span>Consensus Parameters</span>
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Minimum Oracles */}
            <div className="space-y-3">
              <label className="block text-sm font-medium text-foreground">
                Minimum Oracles Required
              </label>
              <input
                type="number"
                min="3"
                max="50"
                value={config.min_oracles || 5}
                onChange={(e) => handleOracleConfigChange('min_oracles', parseInt(e.target.value))}
                className="w-full px-4 py-3 bg-background border border-border rounded-lg focus:ring-2 focus:ring-zenith-500 focus:border-transparent"
              />
              <p className="text-xs text-muted-foreground">
                Minimum number of oracle votes required
              </p>
            </div>

            {/* Consensus Threshold */}
            <div className="space-y-3">
              <label className="block text-sm font-medium text-foreground">
                Consensus Threshold (%)
              </label>
              <input
                type="number"
                min="51"
                max="100"
                value={config.consensus_threshold || 66}
                onChange={(e) => handleOracleConfigChange('consensus_threshold', parseInt(e.target.value))}
                className="w-full px-4 py-3 bg-background border border-border rounded-lg focus:ring-2 focus:ring-zenith-500 focus:border-transparent"
              />
              <p className="text-xs text-muted-foreground">
                Percentage agreement required for resolution
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Oracle Security Features */}
      <div className="glass-card border-zenith-500/30 bg-zenith-500/5 p-6">
        <h3 className="text-lg font-medium text-zenith-400 mb-4 flex items-center space-x-2">
          <Shield className="w-5 h-5" />
          <span>Arcium Privacy Protection</span>
        </h3>
        <div className="space-y-3 text-sm">
          <div className="flex items-start space-x-3">
            <div className="w-2 h-2 rounded-full bg-zenith-400 mt-2 flex-shrink-0" />
            <div>
              <h4 className="font-medium text-zenith-400">Encrypted Oracle Voting</h4>
              <p className="text-muted-foreground">
                Oracle votes are submitted and tallied using Arcium MPC
              </p>
            </div>
          </div>
          <div className="flex items-start space-x-3">
            <div className="w-2 h-2 rounded-full bg-zenith-400 mt-2 flex-shrink-0" />
            <div>
              <h4 className="font-medium text-zenith-400">Anti-Manipulation Detection</h4>
              <p className="text-muted-foreground">
                Built-in algorithms detect and prevent oracle manipulation
              </p>
            </div>
          </div>
          <div className="flex items-start space-x-3">
            <div className="w-2 h-2 rounded-full bg-zenith-400 mt-2 flex-shrink-0" />
            <div>
              <h4 className="font-medium text-zenith-400">Reputation-Weighted Consensus</h4>
              <p className="text-muted-foreground">
                Oracle votes weighted by historical accuracy and reputation
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Info Box */}
      <div className="glass-card border-info-500/30 bg-info-500/5 p-4">
        <div className="flex items-start space-x-3">
          <Info className="w-5 h-5 text-info-400 flex-shrink-0 mt-0.5" />
          <div className="text-sm">
            <h4 className="font-medium text-info-400 mb-1">
              Oracle Selection Guidelines
            </h4>
            <ul className="text-info-300 space-y-1">
              <li>• UMA Optimistic Oracle is recommended for most markets</li>
              <li>• Consensus oracles work well for subjective questions</li>
              <li>• API sources are best for objective, data-driven markets</li>
              <li>• Higher bonds increase security but may reduce participation</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};