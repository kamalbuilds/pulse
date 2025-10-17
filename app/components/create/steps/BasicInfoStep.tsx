'use client';

import React from 'react';
import { Info, HelpCircle, TrendingUp, Users, Trophy, Globe, Zap, Gamepad } from 'lucide-react';
import { Market, MarketType, PrivacyLevel } from '@/types/market';

interface BasicInfoStepProps {
  data: Partial<Market>;
  errors: Record<string, string>;
  onChange: (data: Partial<Market>) => void;
}

export const BasicInfoStep: React.FC<BasicInfoStepProps> = ({
  data,
  errors,
  onChange,
}) => {
  const categories = [
    { id: 'sports', label: 'Sports', icon: Trophy, description: 'Sports events and tournaments' },
    { id: 'politics', label: 'Politics', icon: Users, description: 'Elections and political events' },
    { id: 'crypto', label: 'Crypto', icon: TrendingUp, description: 'Cryptocurrency and DeFi markets' },
    { id: 'technology', label: 'Technology', icon: Zap, description: 'Tech announcements and developments' },
    { id: 'entertainment', label: 'Entertainment', icon: Gamepad, description: 'Movies, TV, and gaming' },
    { id: 'world_events', label: 'World Events', icon: Globe, description: 'Global news and current events' },
  ];

  const marketTypes: { id: MarketType; label: string; description: string }[] = [
    {
      id: 'binary',
      label: 'Binary (Yes/No)',
      description: 'Simple yes/no question with two outcomes',
    },
    {
      id: 'categorical',
      label: 'Multiple Choice',
      description: 'Question with multiple possible outcomes',
    },
    {
      id: 'scalar',
      label: 'Numerical Range',
      description: 'Predict a numerical value within a range',
    },
  ];

  const privacyLevels: { id: PrivacyLevel; label: string; description: string }[] = [
    {
      id: 'public',
      label: 'Public',
      description: 'All votes and positions are visible',
    },
    {
      id: 'semi_private',
      label: 'Semi-Private',
      description: 'Individual votes hidden, aggregates visible',
    },
    {
      id: 'private',
      label: 'Fully Private',
      description: 'All data encrypted with Arcium MPC',
    },
  ];

  const handleInputChange = (field: keyof Market, value: any) => {
    onChange({ [field]: value });
  };

  return (
    <div className="space-y-8">
      {/* Market Question */}
      <div className="space-y-3">
        <label className="block text-sm font-medium text-foreground">
          Market Question *
        </label>
        <textarea
          value={data.question || ''}
          onChange={(e) => handleInputChange('question', e.target.value)}
          placeholder="Will Bitcoin reach $100,000 by December 31, 2024?"
          className={`
            w-full px-4 py-3 bg-background border rounded-lg resize-none
            focus:ring-2 focus:ring-zenith-500 focus:border-transparent
            ${errors.question ? 'border-error-500' : 'border-border'}
          `}
          rows={3}
          maxLength={200}
        />
        <div className="flex items-center justify-between text-xs">
          <span className={errors.question ? 'text-error-400' : 'text-muted-foreground'}>
            {errors.question || 'Be specific and unambiguous'}
          </span>
          <span className="text-muted-foreground">
            {(data.question || '').length}/200
          </span>
        </div>
      </div>

      {/* Description */}
      <div className="space-y-3">
        <label className="block text-sm font-medium text-foreground">
          Description *
        </label>
        <textarea
          value={data.description || ''}
          onChange={(e) => handleInputChange('description', e.target.value)}
          placeholder="Provide context, criteria for resolution, and any important details..."
          className={`
            w-full px-4 py-3 bg-background border rounded-lg resize-none
            focus:ring-2 focus:ring-zenith-500 focus:border-transparent
            ${errors.description ? 'border-error-500' : 'border-border'}
          `}
          rows={4}
          maxLength={1000}
        />
        <div className="flex items-center justify-between text-xs">
          <span className={errors.description ? 'text-error-400' : 'text-muted-foreground'}>
            {errors.description || 'Explain how this market will be resolved'}
          </span>
          <span className="text-muted-foreground">
            {(data.description || '').length}/1000
          </span>
        </div>
      </div>

      {/* Category */}
      <div className="space-y-3">
        <label className="block text-sm font-medium text-foreground">
          Category *
        </label>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {categories.map((category) => {
            const IconComponent = category.icon;
            const isSelected = data.category === category.id;

            return (
              <button
                key={category.id}
                type="button"
                onClick={() => handleInputChange('category', category.id)}
                className={`
                  p-4 rounded-lg border text-left transition-all
                  ${isSelected
                    ? 'border-zenith-500 bg-zenith-500/10 text-zenith-400'
                    : 'border-border hover:border-muted-foreground/50 hover:bg-muted'
                  }
                `}
              >
                <div className="flex items-center space-x-3 mb-2">
                  <IconComponent className="w-5 h-5" />
                  <span className="font-medium">{category.label}</span>
                </div>
                <p className="text-xs text-muted-foreground">
                  {category.description}
                </p>
              </button>
            );
          })}
        </div>
        {errors.category && (
          <p className="text-xs text-error-400">{errors.category}</p>
        )}
      </div>

      {/* Market Type */}
      <div className="space-y-3">
        <label className="block text-sm font-medium text-foreground">
          Market Type *
        </label>
        <div className="space-y-3">
          {marketTypes.map((type) => {
            const isSelected = data.type === type.id;

            return (
              <button
                key={type.id}
                type="button"
                onClick={() => handleInputChange('type', type.id)}
                className={`
                  w-full p-4 rounded-lg border text-left transition-all
                  ${isSelected
                    ? 'border-zenith-500 bg-zenith-500/10'
                    : 'border-border hover:border-muted-foreground/50 hover:bg-muted'
                  }
                `}
              >
                <div className="flex items-center space-x-3">
                  <div
                    className={`
                      w-4 h-4 rounded-full border-2 transition-colors
                      ${isSelected
                        ? 'border-zenith-500 bg-zenith-500'
                        : 'border-muted-foreground'
                      }
                    `}
                  />
                  <div>
                    <h4 className={`font-medium ${isSelected ? 'text-zenith-400' : 'text-foreground'}`}>
                      {type.label}
                    </h4>
                    <p className="text-sm text-muted-foreground">
                      {type.description}
                    </p>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
        {errors.type && (
          <p className="text-xs text-error-400">{errors.type}</p>
        )}
      </div>

      {/* Privacy Level */}
      <div className="space-y-3">
        <div className="flex items-center space-x-2">
          <label className="block text-sm font-medium text-foreground">
            Privacy Level
          </label>
          <div className="group relative">
            <HelpCircle className="w-4 h-4 text-muted-foreground cursor-help" />
            <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 hidden group-hover:block">
              <div className="bg-background border border-border rounded-lg p-3 text-xs whitespace-nowrap shadow-lg">
                Powered by Arcium MPC technology
              </div>
            </div>
          </div>
        </div>
        <div className="space-y-3">
          {privacyLevels.map((level) => {
            const isSelected = data.privacy_level === level.id;

            return (
              <button
                key={level.id}
                type="button"
                onClick={() => handleInputChange('privacy_level', level.id)}
                className={`
                  w-full p-4 rounded-lg border text-left transition-all
                  ${isSelected
                    ? 'border-zenith-500 bg-zenith-500/10'
                    : 'border-border hover:border-muted-foreground/50 hover:bg-muted'
                  }
                `}
              >
                <div className="flex items-center space-x-3">
                  <div
                    className={`
                      w-4 h-4 rounded-full border-2 transition-colors
                      ${isSelected
                        ? 'border-zenith-500 bg-zenith-500'
                        : 'border-muted-foreground'
                      }
                    `}
                  />
                  <div>
                    <h4 className={`font-medium ${isSelected ? 'text-zenith-400' : 'text-foreground'}`}>
                      {level.label}
                    </h4>
                    <p className="text-sm text-muted-foreground">
                      {level.description}
                    </p>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Info Box */}
      <div className="glass-card border-info-500/30 bg-info-500/5 p-4">
        <div className="flex items-start space-x-3">
          <Info className="w-5 h-5 text-info-400 flex-shrink-0 mt-0.5" />
          <div className="text-sm">
            <h4 className="font-medium text-info-400 mb-1">
              Market Creation Tips
            </h4>
            <ul className="text-info-300 space-y-1">
              <li>• Make questions specific and unambiguous</li>
              <li>• Include clear resolution criteria</li>
              <li>• Choose appropriate privacy level for your use case</li>
              <li>• Consider your target audience and market dynamics</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};