'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, TrendingUp, Coins } from 'lucide-react';
import { Market } from '@/types/market';

interface PredictionModalProps {
  market: Market;
  onConfirm: (confidence: number, stakeAmount: number) => void;
  onCancel: () => void;
}

export const PredictionModal: React.FC<PredictionModalProps> = ({
  market,
  onConfirm,
  onCancel,
}) => {
  const [confidence, setConfidence] = useState(75);
  const [stakeAmount, setStakeAmount] = useState(10);
  const [currency, setCurrency] = useState<'SOL' | 'USDC'>('SOL');

  const handleConfidenceChange = (value: number) => {
    setConfidence(Math.max(1, Math.min(100, value)));
  };

  const handleStakeAmountChange = (value: number) => {
    setStakeAmount(Math.max(0.1, value));
  };

  const getConfidenceColor = () => {
    if (confidence >= 80) return 'text-success-400 bg-success-400/20';
    if (confidence >= 60) return 'text-warning-400 bg-warning-400/20';
    return 'text-error-400 bg-error-400/20';
  };

  const getConfidenceLabel = () => {
    if (confidence >= 90) return 'Very High';
    if (confidence >= 80) return 'High';
    if (confidence >= 60) return 'Medium';
    if (confidence >= 40) return 'Low';
    return 'Very Low';
  };

  const calculatePotentialReturn = () => {
    const odds = market.yesOdds / 100;
    const potentialWin = stakeAmount / odds;
    return potentialWin.toFixed(2);
  };

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 z-50 flex items-center justify-center"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
      >
        {/* Backdrop */}
        <motion.div
          className="absolute inset-0 bg-black/60 backdrop-blur-sm"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onCancel}
        />

        {/* Modal */}
        <motion.div
          className="relative w-full max-w-md mx-4 bg-card border border-border/50 rounded-2xl shadow-2xl overflow-hidden"
          initial={{ scale: 0.9, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.9, opacity: 0, y: 20 }}
          transition={{ type: "spring", stiffness: 300, damping: 30 }}
        >
          {/* Header */}
          <div className="p-6 border-b border-border/50">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-foreground">Place Prediction</h3>
              <button
                onClick={onCancel}
                className="w-8 h-8 rounded-full bg-muted/20 flex items-center justify-center text-muted-foreground hover:bg-muted/30 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <p className="text-sm text-muted-foreground mt-2 line-clamp-2">
              {market.title}
            </p>
          </div>

          {/* Content */}
          <div className="p-6 space-y-6">
            {/* Prediction Direction */}
            <div className="p-4 rounded-lg bg-success-500/10 border border-success-500/20">
              <div className="flex items-center space-x-2">
                <TrendingUp className="w-5 h-5 text-success-400" />
                <span className="font-medium text-success-400">Predicting YES</span>
              </div>
              <div className="text-sm text-success-400/80 mt-1">
                Current odds: {market.yesOdds}%
              </div>
            </div>

            {/* Confidence Slider */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium text-foreground">Confidence Level</label>
                <div className={`px-3 py-1 rounded-full text-xs font-medium ${getConfidenceColor()}`}>
                  {confidence}% - {getConfidenceLabel()}
                </div>
              </div>

              <div className="relative">
                <input
                  type="range"
                  min="1"
                  max="100"
                  value={confidence}
                  onChange={(e) => handleConfidenceChange(parseInt(e.target.value))}
                  className="w-full h-2 bg-muted rounded-lg appearance-none cursor-pointer slider"
                  style={{
                    background: `linear-gradient(to right, hsl(var(--success)) 0%, hsl(var(--success)) ${confidence}%, hsl(var(--muted)) ${confidence}%, hsl(var(--muted)) 100%)`
                  }}
                />
                <div className="flex justify-between text-xs text-muted-foreground mt-1">
                  <span>Low</span>
                  <span>High</span>
                </div>
              </div>

              {/* Confidence Input */}
              <div className="flex items-center space-x-2">
                <input
                  type="number"
                  min="1"
                  max="100"
                  value={confidence}
                  onChange={(e) => handleConfidenceChange(parseInt(e.target.value) || 1)}
                  className="w-20 px-3 py-1 bg-muted/50 border border-border/50 rounded-lg text-sm text-center focus:outline-none focus:ring-2 focus:ring-zenith-500"
                />
                <span className="text-sm text-muted-foreground">%</span>
              </div>
            </div>

            {/* Stake Amount */}
            <div className="space-y-3">
              <label className="text-sm font-medium text-foreground">Stake Amount</label>

              {/* Currency Toggle */}
              <div className="flex rounded-lg bg-muted/20 p-1">
                <button
                  onClick={() => setCurrency('SOL')}
                  className={`flex-1 py-2 px-3 rounded-md text-sm font-medium transition-colors ${
                    currency === 'SOL'
                      ? 'bg-zenith-500 text-white'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  SOL
                </button>
                <button
                  onClick={() => setCurrency('USDC')}
                  className={`flex-1 py-2 px-3 rounded-md text-sm font-medium transition-colors ${
                    currency === 'USDC'
                      ? 'bg-zenith-500 text-white'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  USDC
                </button>
              </div>

              {/* Amount Input */}
              <div className="relative">
                <div className="absolute left-3 top-1/2 transform -translate-y-1/2">
                  <Coins className="w-4 h-4 text-muted-foreground" />
                </div>
                <input
                  type="number"
                  min="0.1"
                  step="0.1"
                  value={stakeAmount}
                  onChange={(e) => handleStakeAmountChange(parseFloat(e.target.value) || 0.1)}
                  className="w-full pl-10 pr-12 py-3 bg-muted/50 border border-border/50 rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-zenith-500"
                  placeholder="0.00"
                />
                <div className="absolute right-3 top-1/2 transform -translate-y-1/2 text-sm text-muted-foreground">
                  {currency}
                </div>
              </div>

              {/* Quick Amount Buttons */}
              <div className="grid grid-cols-4 gap-2">
                {[1, 5, 10, 25].map((amount) => (
                  <button
                    key={amount}
                    onClick={() => setStakeAmount(amount)}
                    className="py-2 px-3 bg-muted/20 border border-border/30 rounded-lg text-sm text-muted-foreground hover:bg-muted/30 hover:text-foreground transition-colors"
                  >
                    {amount}
                  </button>
                ))}
              </div>
            </div>

            {/* Potential Return */}
            <div className="p-4 rounded-lg bg-muted/10 border border-border/30">
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Potential Return</span>
                <span className="font-semibold text-zenith-400">
                  {calculatePotentialReturn()} {currency}
                </span>
              </div>
              <div className="text-xs text-muted-foreground mt-1">
                If your prediction is correct
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="p-6 border-t border-border/50 flex space-x-3">
            <button
              onClick={onCancel}
              className="flex-1 py-3 px-4 bg-muted/20 border border-border/30 rounded-lg text-muted-foreground hover:bg-muted/30 hover:text-foreground transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={() => onConfirm(confidence, stakeAmount)}
              className="flex-1 py-3 px-4 bg-success-500 text-white rounded-lg hover:bg-success-600 transition-colors font-medium"
            >
              Confirm Prediction
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};