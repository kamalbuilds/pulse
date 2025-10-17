'use client';

import React, { useState } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { ArrowLeft, Calendar, DollarSign, Users, AlertTriangle, Info } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { MarketCreationForm } from '@/components/create/MarketCreationForm';
import { MarketPreview } from '@/components/create/MarketPreview';
import { MarketType, OracleConfig, Market } from '@/types/market';

export default function CreateMarketPage() {
  const { connected } = useWallet();
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(1);
  const [marketData, setMarketData] = useState<Partial<Market>>({
    type: 'binary',
    category: 'sports',
    oracle_config: {
      type: 'uma_optimistic',
      resolution_source: 'manual',
      challenge_period: 86400,
      minimum_bond: 100,
      dispute_window: 604800,
    },
    privacy_level: 'semi_private',
  });

  if (!connected) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="text-center space-y-4">
          <AlertTriangle className="w-16 h-16 text-warning-400 mx-auto" />
          <h1 className="text-2xl font-bold">Wallet Required</h1>
          <p className="text-muted-foreground">
            Please connect your Solana wallet to create markets
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

  const steps = [
    {
      id: 1,
      title: 'Basic Info',
      description: 'Question, category, and type',
      icon: Info,
    },
    {
      id: 2,
      title: 'Oracle Setup',
      description: 'Resolution method and parameters',
      icon: Users,
    },
    {
      id: 3,
      title: 'Economics',
      description: 'Fees, liquidity, and rewards',
      icon: DollarSign,
    },
    {
      id: 4,
      title: 'Timeline',
      description: 'Deadlines and resolution',
      icon: Calendar,
    },
    {
      id: 5,
      title: 'Preview',
      description: 'Review and deploy',
      icon: ArrowLeft,
    },
  ];

  const handleStepComplete = (data: Partial<Market>) => {
    setMarketData(prev => ({ ...prev, ...data }));
    if (currentStep < 5) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handleCreateMarket = async (finalData: Market) => {
    try {
      // In production, this would call the smart contract
      console.log('Creating market:', finalData);

      // Show success message and redirect
      alert('Market created successfully!');
      router.push('/');
    } catch (error) {
      console.error('Error creating market:', error);
      alert('Failed to create market. Please try again.');
    }
  };

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
              <h1 className="text-2xl font-bold">Create Prediction Market</h1>
              <p className="text-muted-foreground">
                Build a new market with Arcium privacy protection
              </p>
            </div>
          </div>
        </div>

        {/* Progress Steps */}
        <div className="mb-12">
          <div className="flex items-center justify-between">
            {steps.map((step, index) => {
              const isActive = step.id === currentStep;
              const isCompleted = step.id < currentStep;
              const IconComponent = step.icon;

              return (
                <div key={step.id} className="flex items-center">
                  <div className="flex flex-col items-center">
                    <div
                      className={`
                        w-12 h-12 rounded-full flex items-center justify-center border-2 transition-all
                        ${isActive
                          ? 'border-zenith-500 bg-zenith-500/20 text-zenith-400'
                          : isCompleted
                          ? 'border-success-500 bg-success-500/20 text-success-400'
                          : 'border-muted-foreground/30 text-muted-foreground'
                        }
                      `}
                    >
                      <IconComponent className="w-5 h-5" />
                    </div>
                    <div className="mt-2 text-center">
                      <div
                        className={`
                          text-sm font-medium
                          ${isActive ? 'text-zenith-400' : isCompleted ? 'text-success-400' : 'text-muted-foreground'}
                        `}
                      >
                        {step.title}
                      </div>
                      <div className="text-xs text-muted-foreground max-w-20">
                        {step.description}
                      </div>
                    </div>
                  </div>
                  {index < steps.length - 1 && (
                    <div
                      className={`
                        flex-1 h-0.5 mx-4 transition-colors
                        ${isCompleted ? 'bg-success-500' : 'bg-muted-foreground/30'}
                      `}
                    />
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Form Content */}
        <div className="max-w-4xl mx-auto">
          {currentStep < 5 ? (
            <MarketCreationForm
              step={currentStep}
              marketData={marketData}
              onStepComplete={handleStepComplete}
              onBack={() => setCurrentStep(Math.max(1, currentStep - 1))}
            />
          ) : (
            <MarketPreview
              marketData={marketData as Market}
              onEdit={(step) => setCurrentStep(step)}
              onCreate={handleCreateMarket}
              onBack={() => setCurrentStep(4)}
            />
          )}
        </div>
      </div>
    </div>
  );
}