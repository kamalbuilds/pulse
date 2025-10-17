'use client';

import React from 'react';
import { Calendar, Clock, AlertTriangle, Info, Timer } from 'lucide-react';
import { Market } from '@/types/market';

interface TimelineStepProps {
  data: Partial<Market>;
  errors: Record<string, string>;
  onChange: (data: Partial<Market>) => void;
}

export const TimelineStep: React.FC<TimelineStepProps> = ({
  data,
  errors,
  onChange,
}) => {
  const handleInputChange = (field: keyof Market, value: any) => {
    onChange({ [field]: value });
  };

  const formatDateForInput = (date: Date | string | undefined): string => {
    if (!date) return '';
    const d = new Date(date);
    return d.toISOString().slice(0, 16); // Format for datetime-local input
  };

  const calculateTimeRemaining = (targetDate: string | Date | undefined): string => {
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

  const getMinDateTime = (): string => {
    const now = new Date();
    now.setHours(now.getHours() + 24); // Minimum 24 hours from now
    return now.toISOString().slice(0, 16);
  };

  const getMaxDateTime = (): string => {
    const future = new Date();
    future.setFullYear(future.getFullYear() + 2); // Maximum 2 years from now
    return future.toISOString().slice(0, 16);
  };

  const presetOptions = [
    {
      label: '1 Week',
      description: 'Quick prediction',
      getDate: () => {
        const date = new Date();
        date.setDate(date.getDate() + 7);
        return date;
      },
    },
    {
      label: '1 Month',
      description: 'Medium-term prediction',
      getDate: () => {
        const date = new Date();
        date.setMonth(date.getMonth() + 1);
        return date;
      },
    },
    {
      label: '3 Months',
      description: 'Quarterly prediction',
      getDate: () => {
        const date = new Date();
        date.setMonth(date.getMonth() + 3);
        return date;
      },
    },
    {
      label: '6 Months',
      description: 'Long-term prediction',
      getDate: () => {
        const date = new Date();
        date.setMonth(date.getMonth() + 6);
        return date;
      },
    },
    {
      label: '1 Year',
      description: 'Annual prediction',
      getDate: () => {
        const date = new Date();
        date.setFullYear(date.getFullYear() + 1);
        return date;
      },
    },
  ];

  return (
    <div className="space-y-8">
      {/* Trading Deadline */}
      <div className="space-y-4">
        <label className="block text-sm font-medium text-foreground">
          Trading Deadline
        </label>
        <div className="relative">
          <Clock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-muted-foreground" />
          <input
            type="datetime-local"
            value={formatDateForInput(data.trading_deadline)}
            onChange={(e) => handleInputChange('trading_deadline', e.target.value)}
            min={getMinDateTime()}
            max={formatDateForInput(data.resolution_date)}
            className={`
              w-full pl-10 pr-4 py-3 bg-background border rounded-lg
              focus:ring-2 focus:ring-zenith-500 focus:border-transparent
              ${errors.trading_deadline ? 'border-error-500' : 'border-border'}
            `}
          />
        </div>
        <div className="flex items-center justify-between text-xs">
          <span className={errors.trading_deadline ? 'text-error-400' : 'text-muted-foreground'}>
            {errors.trading_deadline || 'When trading stops (optional - defaults to resolution date)'}
          </span>
          {data.trading_deadline && (
            <span className="text-muted-foreground">
              {calculateTimeRemaining(data.trading_deadline)} from now
            </span>
          )}
        </div>
      </div>

      {/* Resolution Date */}
      <div className="space-y-4">
        <label className="block text-sm font-medium text-foreground">
          Resolution Date *
        </label>
        <div className="relative">
          <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-muted-foreground" />
          <input
            type="datetime-local"
            value={formatDateForInput(data.resolution_date)}
            onChange={(e) => handleInputChange('resolution_date', e.target.value)}
            min={getMinDateTime()}
            max={getMaxDateTime()}
            className={`
              w-full pl-10 pr-4 py-3 bg-background border rounded-lg
              focus:ring-2 focus:ring-zenith-500 focus:border-transparent
              ${errors.resolution_date ? 'border-error-500' : 'border-border'}
            `}
          />
        </div>
        <div className="flex items-center justify-between text-xs">
          <span className={errors.resolution_date ? 'text-error-400' : 'text-muted-foreground'}>
            {errors.resolution_date || 'When the market outcome will be determined'}
          </span>
          {data.resolution_date && (
            <span className="text-muted-foreground">
              {calculateTimeRemaining(data.resolution_date)} from now
            </span>
          )}
        </div>
      </div>

      {/* Quick Preset Options */}
      <div className="space-y-4">
        <h3 className="text-lg font-medium text-foreground flex items-center space-x-2">
          <Timer className="w-5 h-5" />
          <span>Quick Presets</span>
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          {presetOptions.map((preset) => (
            <button
              key={preset.label}
              type="button"
              onClick={() => {
                const date = preset.getDate();
                handleInputChange('resolution_date', date.toISOString().slice(0, 16));
              }}
              className="p-3 text-center border border-border rounded-lg hover:border-zenith-500/50 hover:bg-zenith-500/5 transition-all"
            >
              <div className="font-medium text-sm">{preset.label}</div>
              <div className="text-xs text-muted-foreground mt-1">
                {preset.description}
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Auto-Resolution Settings */}
      <div className="space-y-4">
        <h3 className="text-lg font-medium text-foreground">
          Auto-Resolution Settings
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Grace Period */}
          <div className="space-y-3">
            <label className="block text-sm font-medium text-foreground">
              Grace Period (hours)
            </label>
            <input
              type="number"
              min="0"
              max="168"
              value={data.grace_period || 24}
              onChange={(e) => handleInputChange('grace_period', parseInt(e.target.value))}
              className="w-full px-4 py-3 bg-background border border-border rounded-lg focus:ring-2 focus:ring-zenith-500 focus:border-transparent"
            />
            <p className="text-xs text-muted-foreground">
              Additional time after resolution date before auto-resolution
            </p>
          </div>

          {/* Auto-Resolution Enabled */}
          <div className="space-y-3">
            <label className="block text-sm font-medium text-foreground">
              Auto-Resolution
            </label>
            <div className="flex items-center space-x-3">
              <input
                type="checkbox"
                id="auto-resolution"
                checked={data.auto_resolution_enabled !== false}
                onChange={(e) => handleInputChange('auto_resolution_enabled', e.target.checked)}
                className="w-5 h-5 rounded border-border focus:ring-2 focus:ring-zenith-500"
              />
              <label htmlFor="auto-resolution" className="text-sm text-muted-foreground">
                Enable automatic resolution when possible
              </label>
            </div>
            <p className="text-xs text-muted-foreground">
              Markets with API data sources can resolve automatically
            </p>
          </div>
        </div>
      </div>

      {/* Timeline Visualization */}
      <div className="glass-card p-6">
        <h3 className="text-lg font-medium text-foreground mb-4">
          Market Timeline
        </h3>

        <div className="space-y-4">
          {/* Current Time */}
          <div className="flex items-center space-x-4">
            <div className="w-3 h-3 rounded-full bg-zenith-500" />
            <div>
              <div className="font-medium text-zenith-400">Now</div>
              <div className="text-sm text-muted-foreground">
                {new Date().toLocaleString()}
              </div>
            </div>
          </div>

          {/* Trading Deadline */}
          {data.trading_deadline && (
            <div className="flex items-center space-x-4">
              <div className="w-3 h-3 rounded-full bg-warning-500" />
              <div>
                <div className="font-medium text-warning-400">Trading Ends</div>
                <div className="text-sm text-muted-foreground">
                  {new Date(data.trading_deadline).toLocaleString()}
                </div>
                <div className="text-xs text-warning-400">
                  {calculateTimeRemaining(data.trading_deadline)}
                </div>
              </div>
            </div>
          )}

          {/* Resolution Date */}
          {data.resolution_date && (
            <div className="flex items-center space-x-4">
              <div className="w-3 h-3 rounded-full bg-success-500" />
              <div>
                <div className="font-medium text-success-400">Market Resolves</div>
                <div className="text-sm text-muted-foreground">
                  {new Date(data.resolution_date).toLocaleString()}
                </div>
                <div className="text-xs text-success-400">
                  {calculateTimeRemaining(data.resolution_date)}
                </div>
              </div>
            </div>
          )}

          {/* Grace Period End */}
          {data.resolution_date && data.grace_period && (
            <div className="flex items-center space-x-4">
              <div className="w-3 h-3 rounded-full bg-error-500" />
              <div>
                <div className="font-medium text-error-400">Auto-Resolution Deadline</div>
                <div className="text-sm text-muted-foreground">
                  {new Date(
                    new Date(data.resolution_date).getTime() + (data.grace_period * 60 * 60 * 1000)
                  ).toLocaleString()}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Warning for Past Dates */}
      {data.resolution_date && new Date(data.resolution_date) <= new Date() && (
        <div className="glass-card border-error-500/30 bg-error-500/5 p-4">
          <div className="flex items-start space-x-3">
            <AlertTriangle className="w-5 h-5 text-error-400 flex-shrink-0 mt-0.5" />
            <div>
              <h4 className="text-sm font-medium text-error-400 mb-1">
                Invalid Resolution Date
              </h4>
              <p className="text-sm text-error-300">
                Resolution date must be at least 24 hours in the future.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Info Box */}
      <div className="glass-card border-info-500/30 bg-info-500/5 p-4">
        <div className="flex items-start space-x-3">
          <Info className="w-5 h-5 text-info-400 flex-shrink-0 mt-0.5" />
          <div className="text-sm">
            <h4 className="font-medium text-info-400 mb-1">
              Timeline Best Practices
            </h4>
            <ul className="text-info-300 space-y-1">
              <li>• Allow sufficient time for market discovery and trading</li>
              <li>• Set trading deadline before resolution for clarity</li>
              <li>• Use grace periods for manual resolution markets</li>
              <li>• Consider time zones when setting deadlines</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};