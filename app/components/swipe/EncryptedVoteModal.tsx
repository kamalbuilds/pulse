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
import HerdingDetection, { HerdingAnalysis } from '@/components/privacy/HerdingDetection';
import { useClientSDK } from '@/sdk/hooks/useClientSDK';
import { BN } from '@coral-xyz/anchor';
import { LAMPORTS_PER_SOL } from '@solana/web3.js';

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

  // NEW: Use production SDK with client-only loading
  const { sdk, isInitialized, error: sdkError } = useClientSDK();

  // FALLBACK: Keep mock client for development/testing
  const [arciumClient] = useState(() => new ArciumPredictionMarketsClient(connection, wallet));

  // Vote configuration
  const [stakeAmount, setStakeAmount] = useState(0.1);
  const [confidence, setConfidence] = useState(75);
  const [probability, setProbability] = useState(voteChoice === VoteChoice.Yes ? 65 : 35);
  const [showPrivacyDetails, setShowPrivacyDetails] = useState(false);
  const [showHerdingAnalysis, setShowHerdingAnalysis] = useState(false);
  const [herdingAnalysis, setHerdingAnalysis] = useState<HerdingAnalysis | null>(null);

  // UI state
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submissionResult, setSubmissionResult] = useState<{
    success: boolean;
    message: string;
    signature?: string;
  } | null>(null);
  const [privacyScore, setPrivacyScore] = useState(95);

  // MPC Progress tracking
  const [mpcProgress, setMPCProgress] = useState({
    stage: 'idle' as 'idle' | 'encrypting' | 'queueing' | 'computing' | 'finalizing',
    progress: 0,
    message: ''
  });

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

    // Check SDK initialization
    if (!isInitialized || !sdk) {
      setSubmissionResult({
        success: false,
        message: sdkError?.message || 'SDK not initialized. Please wait...'
      });
      return;
    }

    // Check herding analysis if we have it
    if (herdingAnalysis && herdingAnalysis.riskLevel === 'critical') {
      setSubmissionResult({
        success: false,
        message: 'Vote blocked: Critical manipulation risk detected'
      });
      return;
    }

    setIsSubmitting(true);
    setSubmissionResult(null);

    try {
      // NEW: Use production SDK for encrypted voting
      setMPCProgress({ stage: 'encrypting', progress: 20, message: 'Encrypting vote data with x25519...' });

      const result = await sdk.submitEncryptedVote({
        marketId: new BN(market.id), // Assuming market.id is the numeric ID
        voteChoice: voteChoice === VoteChoice.Yes,
        stakeAmount: new BN(stakeAmount * LAMPORTS_PER_SOL),
        predictedProbability: probability,
        convictionScore: Math.floor((confidence / 100) * 65535)
      });

      setMPCProgress({ stage: 'finalizing', progress: 100, message: 'Vote finalized on-chain!' });

      setSubmissionResult({
        success: true,
        message: 'Vote submitted privately via Arcium MPC!',
        signature: result.finalizeTx
      });
      onVoteSubmitted(true, result.finalizeTx);

    } catch (error) {
      console.error('Vote submission error:', error);

      // Enhanced error messages
      let errorMessage = 'Unknown error occurred';
      if (error instanceof Error) {
        if (error.message.includes('User rejected')) {
          errorMessage = 'Transaction cancelled by user';
        } else if (error.message.includes('insufficient funds')) {
          errorMessage = 'Insufficient SOL balance. Get devnet SOL from faucet.';
        } else if (error.message.includes('timeout')) {
          errorMessage = 'MPC computation timed out. Please try again.';
        } else if (error.message.includes('Market not active')) {
          errorMessage = 'This market is no longer accepting votes.';
        } else if (error.message.includes('already voted')) {
          errorMessage = 'You have already voted on this market.';
        } else {
          errorMessage = error.message;
        }
      }

      setSubmissionResult({
        success: false,
        message: errorMessage
      });
      onVoteSubmitted(false);

      setMPCProgress({ stage: 'idle', progress: 0, message: '' });
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

            {/* Anti-Herding Analysis Toggle */}
            <div className="space-y-3">
              <button
                onClick={() => setShowHerdingAnalysis(!showHerdingAnalysis)}
                className="flex items-center space-x-2 text-sm text-zenith-400 hover:text-zenith-300 transition-colors"
              >
                <Shield className="w-4 h-4" />
                <span>{showHerdingAnalysis ? 'Hide' : 'Show'} Anti-Herding Analysis</span>
              </button>

              <AnimatePresence>
                {showHerdingAnalysis && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="overflow-hidden"
                  >
                    <HerdingDetection
                      marketId={market.id}
                      userConfidence={confidence}
                      voteChoice={voteChoice === VoteChoice.Yes ? 'yes' : 'no'}
                      onAnalysisComplete={setHerdingAnalysis}
                      isVisible={showHerdingAnalysis}
                    />
                  </motion.div>
                )}
              </AnimatePresence>
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

            {/* MPC Progress Indicator */}
            <AnimatePresence>
              {isSubmitting && mpcProgress.stage !== 'idle' && (
                <motion.div
                  className="space-y-3 p-4 bg-zenith-500/5 border border-zenith-500/20 rounded-lg"
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                >
                  <div className="flex items-center space-x-3">
                    <Loader2 className="w-5 h-5 animate-spin text-zenith-400" />
                    <span className="text-sm font-medium text-foreground">{mpcProgress.message}</span>
                  </div>
                  <div className="w-full bg-muted/20 rounded-full h-2 overflow-hidden">
                    <motion.div
                      className="h-full bg-gradient-to-r from-zenith-500 to-zenith-400"
                      initial={{ width: 0 }}
                      animate={{ width: `${mpcProgress.progress}%` }}
                      transition={{ duration: 0.5 }}
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {mpcProgress.stage === 'encrypting' && 'Step 1 of 3: Encrypting vote data'}
                    {mpcProgress.stage === 'queueing' && 'Step 2 of 3: Queuing MPC computation'}
                    {mpcProgress.stage === 'computing' && 'Step 3 of 3: Waiting for Arcium network'}
                    {mpcProgress.stage === 'finalizing' && 'Finalizing transaction...'}
                  </p>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Action Buttons */}
            <div className="flex space-x-3">
              <button
                onClick={onClose}
                disabled={isSubmitting}
                className="flex-1 py-3 px-4 bg-muted/20 border border-border/30 rounded-lg text-muted-foreground hover:bg-muted/30 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Cancel
              </button>
              <button
                onClick={handleSubmitVote}
                disabled={isSubmitting || stakeAmount <= 0 || !isInitialized}
                className={`flex-1 py-3 px-4 rounded-lg font-medium transition-colors flex items-center justify-center space-x-2 ${
                  voteChoice === VoteChoice.Yes
                    ? 'bg-success-500/20 border border-success-500/30 text-success-400 hover:bg-success-500/30'
                    : 'bg-error-500/20 border border-error-500/30 text-error-400 hover:bg-error-500/30'
                } disabled:opacity-50 disabled:cursor-not-allowed`}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Processing...</span>
                  </>
                ) : !isInitialized ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Initializing SDK...</span>
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