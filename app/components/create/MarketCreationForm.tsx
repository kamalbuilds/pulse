'use client';

import React, { useState } from 'react';
import { ArrowRight, ArrowLeft, Info, AlertTriangle } from 'lucide-react';
import { MarketType, OracleConfig, Market, PrivacyLevel } from '@/types/market';
import { BasicInfoStep } from './steps/BasicInfoStep';
import { OracleSetupStep } from './steps/OracleSetupStep';
import { EconomicsStep } from './steps/EconomicsStep';
import { TimelineStep } from './steps/TimelineStep';

interface MarketCreationFormProps {
  step: number;
  marketData: Partial<Market>;
  onStepComplete: (data: Partial<Market>) => void;
  onBack: () => void;
}

export const MarketCreationForm: React.FC<MarketCreationFormProps> = ({
  step,
  marketData,
  onStepComplete,
  onBack,
}) => {
  const [stepData, setStepData] = useState<Partial<Market>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validateStep = (data: Partial<Market>): boolean => {
    const newErrors: Record<string, string> = {};

    switch (step) {
      case 1: // Basic Info
        if (!data.question?.trim()) {
          newErrors.question = 'Question is required';
        } else if (data.question.length < 10) {
          newErrors.question = 'Question must be at least 10 characters';
        } else if (data.question.length > 200) {
          newErrors.question = 'Question must be less than 200 characters';
        }

        if (!data.description?.trim()) {
          newErrors.description = 'Description is required';
        } else if (data.description.length < 20) {
          newErrors.description = 'Description must be at least 20 characters';
        }

        if (!data.category) {
          newErrors.category = 'Category is required';
        }

        if (!data.type) {
          newErrors.type = 'Market type is required';
        }
        break;

      case 2: // Oracle Setup
        if (!data.oracle_config?.type) {
          newErrors.oracle_type = 'Oracle type is required';
        }

        if (!data.oracle_config?.resolution_source) {
          newErrors.resolution_source = 'Resolution source is required';
        }

        if (data.oracle_config?.minimum_bond && data.oracle_config.minimum_bond < 10) {
          newErrors.minimum_bond = 'Minimum bond must be at least 10 SOL';
        }
        break;

      case 3: // Economics
        if (!data.initial_liquidity || data.initial_liquidity < 100) {
          newErrors.initial_liquidity = 'Initial liquidity must be at least 100 SOL';
        }

        if (data.trading_fee && (data.trading_fee < 0 || data.trading_fee > 5)) {
          newErrors.trading_fee = 'Trading fee must be between 0% and 5%';
        }

        if (data.creator_fee && (data.creator_fee < 0 || data.creator_fee > 2)) {
          newErrors.creator_fee = 'Creator fee must be between 0% and 2%';
        }
        break;

      case 4: // Timeline
        if (!data.resolution_date) {
          newErrors.resolution_date = 'Resolution date is required';
        } else {
          const resolutionDate = new Date(data.resolution_date);
          const now = new Date();
          const minDate = new Date(now.getTime() + 24 * 60 * 60 * 1000); // 24 hours from now

          if (resolutionDate <= minDate) {
            newErrors.resolution_date = 'Resolution date must be at least 24 hours in the future';
          }
        }

        if (data.trading_deadline) {
          const tradingDeadline = new Date(data.trading_deadline);
          const resolutionDate = new Date(data.resolution_date || '');

          if (tradingDeadline >= resolutionDate) {
            newErrors.trading_deadline = 'Trading deadline must be before resolution date';
          }
        }
        break;
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNext = () => {
    const combinedData = { ...marketData, ...stepData };
    if (validateStep(combinedData)) {
      onStepComplete(stepData);
      setStepData({});
    }
  };

  const handleDataChange = (data: Partial<Market>) => {
    setStepData(prev => ({ ...prev, ...data }));
    // Clear relevant errors when data changes
    const newErrors = { ...errors };
    Object.keys(data).forEach(key => {
      delete newErrors[key];
    });
    setErrors(newErrors);
  };

  const renderStep = () => {
    const combinedData = { ...marketData, ...stepData };

    switch (step) {
      case 1:
        return (
          <BasicInfoStep
            data={combinedData}
            errors={errors}
            onChange={handleDataChange}
          />
        );
      case 2:
        return (
          <OracleSetupStep
            data={combinedData}
            errors={errors}
            onChange={handleDataChange}
          />
        );
      case 3:
        return (
          <EconomicsStep
            data={combinedData}
            errors={errors}
            onChange={handleDataChange}
          />
        );
      case 4:
        return (
          <TimelineStep
            data={combinedData}
            errors={errors}
            onChange={handleDataChange}
          />
        );
      default:
        return null;
    }
  };

  const getStepTitle = () => {
    switch (step) {
      case 1: return 'Basic Information';
      case 2: return 'Oracle Configuration';
      case 3: return 'Economic Parameters';
      case 4: return 'Timeline Settings';
      default: return '';
    }
  };

  const getStepDescription = () => {
    switch (step) {
      case 1: return 'Define your market question, description, and basic settings';
      case 2: return 'Configure how your market will be resolved';
      case 3: return 'Set up fees, liquidity, and economic incentives';
      case 4: return 'Define when trading ends and market resolves';
      default: return '';
    }
  };

  return (
    <div className="space-y-8">
      {/* Step Header */}
      <div className="text-center space-y-2">
        <h2 className="text-2xl font-bold">{getStepTitle()}</h2>
        <p className="text-muted-foreground max-w-2xl mx-auto">
          {getStepDescription()}
        </p>
      </div>

      {/* Form Content */}
      <div className="glass-card p-8">
        {renderStep()}
      </div>

      {/* Navigation */}
      <div className="flex items-center justify-between">
        <button
          onClick={onBack}
          disabled={step === 1}
          className={`
            flex items-center space-x-2 px-6 py-3 rounded-lg transition-all
            ${step === 1
              ? 'bg-muted text-muted-foreground cursor-not-allowed'
              : 'bg-background border border-border hover:bg-muted text-foreground'
            }
          `}
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back</span>
        </button>

        <div className="text-sm text-muted-foreground">
          Step {step} of 4
        </div>

        <button
          onClick={handleNext}
          className="btn-primary flex items-center space-x-2"
        >
          <span>Continue</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>

      {/* Errors Summary */}
      {Object.keys(errors).length > 0 && (
        <div className="glass-card border-error-500/30 bg-error-500/5 p-4">
          <div className="flex items-start space-x-3">
            <AlertTriangle className="w-5 h-5 text-error-400 flex-shrink-0 mt-0.5" />
            <div>
              <h4 className="text-sm font-medium text-error-400 mb-2">
                Please fix the following errors:
              </h4>
              <ul className="text-sm text-error-300 space-y-1">
                {Object.values(errors).map((error, index) => (
                  <li key={index}>• {error}</li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};