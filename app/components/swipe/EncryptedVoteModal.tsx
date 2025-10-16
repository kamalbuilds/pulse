'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useWallet, useConnection } from '@solana/wallet-adapter-react';
import {
  Shield,
  Lock,
  Eye,
  EyeOff,
  TrendingUp,
  Users,
  AlertTriangle,
  CheckCircle,
  Loader2,
  X
} from 'lucide-react';
import { Market, VoteChoice } from '@/types/market';
import ArciumPredictionMarketsClient, { ArciumUtils } from '@/lib/arciumClient';

interface EncryptedVoteModalProps {
  isOpen: boolean;
  onClose: () => void;
  market: Market;
  voteChoice: VoteChoice;
  onVoteSubmitted: (success: boolean, signature?: string) => void;
}

export const EncryptedVoteModal: React.FC<EncryptedVoteModalProps> = ({
  isOpen,
  onClose,
  market,
  voteChoice,
  onVoteSubmitted,
}) => {
  const wallet = useWallet();
  const { connection } = useConnection();
  const [arciumClient] = useState(() => new ArciumPredictionMarketsClient(connection, wallet));

  // Vote configuration
  const [stakeAmount, setStakeAmount] = useState(0.1);
  const [confidence, setConfidence] = useState(75);
  const [probability, setProbability] = useState(voteChoice === VoteChoice.Yes ? 65 : 35);
  const [showPrivacyDetails, setShowPrivacyDetails] = useState(false);

  // UI state
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submissionResult, setSubmissionResult] = useState<{
    success: boolean;
    message: string;
    signature?: string;
  } | null>(null);
  const [privacyScore, setPrivacyScore] = useState(95);

  // Privacy simulation
  useEffect(() => {
    // Simulate privacy score calculation based on vote parameters
    const baseScore = 90;
    const confidenceBonus = confidence > 80 ? 5 : 0;
    const amountPenalty = stakeAmount > 1 ? -2 : 0;
    setPrivacyScore(Math.min(100, baseScore + confidenceBonus + amountPenalty));
  }, [confidence, stakeAmount]);

  const handleSubmitVote = async () => {
    if (!wallet.connected || !wallet.publicKey) {
      setSubmissionResult({
        success: false,
        message: 'Please connect your wallet first'
      });
      return;
    }

    setIsSubmitting(true);
    setSubmissionResult(null);

    try {
      // Submit encrypted vote
      const result = await arciumClient.submitEncryptedVote(
        market,
        voteChoice,
        stakeAmount,
        confidence,
        probability
      );

      if (result.success) {
        setSubmissionResult({
          success: true,
          message: 'Vote submitted privately and encrypted!',
          signature: result.transactionSignature
        });
        onVoteSubmitted(true, result.transactionSignature);
      } else {
        setSubmissionResult({
          success: false,
          message: result.error || 'Failed to submit vote'
        });
        onVoteSubmitted(false);
      }
    } catch (error) {
      setSubmissionResult({
        success: false,
        message: error instanceof Error ? error.message : 'Unknown error occurred'
      });
      onVoteSubmitted(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  const getVoteIcon = () => {
    switch (voteChoice) {
      case VoteChoice.Yes:
        return <TrendingUp className="w-6 h-6 text-success-400" />;
      case VoteChoice.No:
        return <X className="w-6 h-6 text-error-400" />;
      default:
        return <Users className="w-6 h-6 text-muted-foreground" />;
    }
  };

  const getVoteColor = () => {
    switch (voteChoice) {
      case VoteChoice.Yes:
        return 'success';
      case VoteChoice.No:
        return 'error';
      default:
        return 'muted';
    }
  };

  const formatProbability = (prob: number) => {
    if (voteChoice === VoteChoice.Yes) {
      return `${prob}% chance of YES`;
    } else {
      return `${100 - prob}% chance of NO`;
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 z-50 flex items-center justify-center p-4"
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
          onClick={onClose}
        />

        {/* Modal */}
        <motion.div
          className="relative w-full max-w-md bg-card border border-border/50 rounded-2xl shadow-2xl overflow-hidden"
          initial={{ scale: 0.9, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.9, opacity: 0, y: 20 }}
          transition={{ type: 'spring', stiffness: 300, damping: 30 }}
        >
          {/* Header */}
          <div className="bg-gradient-to-r from-zenith-500/10 to-zenith-600/20 p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-3">
                {getVoteIcon()}
                <h2 className="text-xl font-bold text-foreground">
                  {voteChoice === VoteChoice.Yes ? 'Predict YES' : 'Predict NO'}
                </h2>
              </div>
              <button
                onClick={onClose}
                className="w-8 h-8 rounded-full bg-muted/20 flex items-center justify-center text-muted-foreground hover:bg-muted/30 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Privacy Indicator */}
            <div className="flex items-center space-x-2 text-sm">
              <Shield className="w-4 h-4 text-zenith-400" />
              <span className="text-muted-foreground">Encrypted by Arcium MPC</span>
              <div className="flex items-center space-x-1">
                <div className="w-2 h-2 bg-success-400 rounded-full animate-pulse" />
                <span className="text-success-400 font-medium">{privacyScore}% Private</span>
              </div>
            </div>
          </div>

          {/* Content */}
          <div className="p-6 space-y-6">
            {/* Market Info */}
            <div>
              <h3 className="font-semibold text-foreground mb-2 line-clamp-2">
                {market.title}
              </h3>
              <p className="text-sm text-muted-foreground">
                Current odds: {market.yesOdds}% YES, {market.noOdds}% NO
              </p>
            </div>

            {/* Stake Amount */}
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Stake Amount (SOL)
              </label>
              <div className="relative">
                <input
                  type="number"
                  min="0.01"
                  max="10"
                  step="0.01"
                  value={stakeAmount}
                  onChange={(e) => setStakeAmount(parseFloat(e.target.value) || 0)}
                  className="w-full px-4 py-3 bg-muted/20 border border-border/30 rounded-lg text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-zenith-500/50 focus:border-zenith-500/50"
                  placeholder="0.1"
                />
                <div className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                  SOL
                </div>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Higher stakes increase potential rewards but reduce privacy score
              </p>
            </div>

            {/* Confidence Level */}
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Confidence Level: {confidence}%
              </label>
              <input
                type="range"
                min="1"
                max="100"
                value={confidence}
                onChange={(e) => setConfidence(parseInt(e.target.value))}
                className="w-full h-2 bg-muted/20 rounded-lg appearance-none cursor-pointer slider-thumb"
              />
              <div className="flex justify-between text-xs text-muted-foreground mt-1">
                <span>Low</span>
                <span>Medium</span>
                <span>High</span>
              </div>
            </div>

            {/* Probability Prediction */}
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Your Prediction: {formatProbability(probability)}
              </label>
              <input
                type="range"
                min="1"
                max="99"
                value={probability}
                onChange={(e) => setProbability(parseInt(e.target.value))}
                className="w-full h-2 bg-muted/20 rounded-lg appearance-none cursor-pointer slider-thumb"
              />
              <div className="flex justify-between text-xs text-muted-foreground mt-1">
                <span>Unlikely</span>
                <span>50/50</span>
                <span>Very Likely</span>
              </div>
            </div>

            {/* Privacy Details Toggle */}
            <div>
              <button
                onClick={() => setShowPrivacyDetails(!showPrivacyDetails)}
                className="flex items-center space-x-2 text-sm text-zenith-400 hover:text-zenith-300 transition-colors"
              >
                {showPrivacyDetails ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                <span>{showPrivacyDetails ? 'Hide' : 'Show'} Privacy Details</span>
              </button>

              <AnimatePresence>
                {showPrivacyDetails && (
                  <motion.div
                    className="mt-3 p-4 bg-zenith-500/5 border border-zenith-500/20 rounded-lg"
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                  >
                    <div className="space-y-2 text-xs text-muted-foreground">
                      <div className="flex items-center space-x-2">
                        <Lock className="w-3 h-3" />
                        <span>Vote encrypted using Arcium MPC</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Shield className="w-3 h-3" />
                        <span>Individual votes remain private until aggregation</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Users className="w-3 h-3" />
                        <span>Only aggregated statistics are revealed publicly</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <AlertTriangle className="w-3 h-3" />
                        <span>Anti-manipulation detection active</span>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Submission Result */}
            <AnimatePresence>
              {submissionResult && (
                <motion.div
                  className={`p-4 rounded-lg border ${
                    submissionResult.success
                      ? 'bg-success-500/10 border-success-500/20 text-success-400'
                      : 'bg-error-500/10 border-error-500/20 text-error-400'
                  }`}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                >
                  <div className="flex items-center space-x-2">
                    {submissionResult.success ? (
                      <CheckCircle className="w-4 h-4" />
                    ) : (
                      <AlertTriangle className="w-4 h-4" />
                    )}
                    <span className="text-sm font-medium">{submissionResult.message}</span>
                  </div>
                  {submissionResult.signature && (
                    <p className="text-xs mt-1 opacity-75">
                      Tx: {submissionResult.signature.slice(0, 8)}...
                    </p>
                  )}
                </motion.div>
              )}
            </AnimatePresence>

            {/* Action Buttons */}
            <div className="flex space-x-3">
              <button
                onClick={onClose}
                className="flex-1 py-3 px-4 bg-muted/20 border border-border/30 rounded-lg text-muted-foreground hover:bg-muted/30 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSubmitVote}
                disabled={isSubmitting || stakeAmount <= 0}
                className={`flex-1 py-3 px-4 rounded-lg font-medium transition-colors flex items-center justify-center space-x-2 ${
                  voteChoice === VoteChoice.Yes
                    ? 'bg-success-500/20 border border-success-500/30 text-success-400 hover:bg-success-500/30'
                    : 'bg-error-500/20 border border-error-500/30 text-error-400 hover:bg-error-500/30'
                } disabled:opacity-50 disabled:cursor-not-allowed`}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Encrypting...</span>
                  </>
                ) : (
                  <>
                    <Lock className="w-4 h-4" />
                    <span>Submit Private Vote</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </motion.div>
      </motion.div>

      <style jsx>{`
        .slider-thumb::-webkit-slider-thumb {
          appearance: none;
          height: 20px;
          width: 20px;
          border-radius: 50%;
          background: rgb(124, 58, 237);
          cursor: pointer;
          border: 2px solid rgb(124, 58, 237);
        }

        .slider-thumb::-moz-range-thumb {
          height: 20px;
          width: 20px;
          border-radius: 50%;
          background: rgb(124, 58, 237);
          cursor: pointer;
          border: 2px solid rgb(124, 58, 237);
        }
      `}</style>
    </AnimatePresence>
  );
};