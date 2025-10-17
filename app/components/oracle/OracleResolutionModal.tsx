'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useWallet, useConnection } from '@solana/wallet-adapter-react';
import {
  Shield,
  Clock,
  Users,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Gavel,
  Eye,
  FileText,
  TrendingUp,
  Award,
  Zap,
  X
} from 'lucide-react';
import { Market } from '@/types/market';
import EncryptedOracleSystem, { Oracle, OracleResolution } from '@/lib/oracleSystem';

interface OracleResolutionModalProps {
  isOpen: boolean;
  onClose: () => void;
  market: Market;
  onResolutionComplete?: (resolution: OracleResolution) => void;
}

export const OracleResolutionModal: React.FC<OracleResolutionModalProps> = ({
  isOpen,
  onClose,
  market,
  onResolutionComplete,
}) => {
  const wallet = useWallet();
  const { connection } = useConnection();
  const [oracleSystem] = useState(() => new EncryptedOracleSystem(connection, wallet));

  // UI State
  const [currentStep, setCurrentStep] = useState<'request' | 'voting' | 'aggregation' | 'completed'>('request');
  const [isProcessing, setIsProcessing] = useState(false);
  const [selectedOracles, setSelectedOracles] = useState<Oracle[]>([]);
  const [resolution, setResolution] = useState<OracleResolution | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [voteProgress, setVoteProgress] = useState(0);
  const [timeRemaining, setTimeRemaining] = useState(3600); // 1 hour default

  // Resolution stats
  const [resolutionStats, setResolutionStats] = useState({
    totalVotes: 0,
    yesVotes: 0,
    noVotes: 0,
    averageConfidence: 0,
    consensusStrength: 0
  });

  // Timer for resolution countdown
  useEffect(() => {
    if (currentStep === 'voting' && timeRemaining > 0) {
      const timer = setInterval(() => {
        setTimeRemaining(prev => {
          if (prev <= 1) {
            setCurrentStep('aggregation');
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

      return () => clearInterval(timer);
    }
  }, [currentStep, timeRemaining]);

  // Simulate vote progress
  useEffect(() => {
    if (currentStep === 'voting') {
      const progressTimer = setInterval(() => {
        setVoteProgress(prev => {
          const newProgress = Math.min(prev + Math.random() * 20, 100);

          // Update mock stats
          setResolutionStats({
            totalVotes: Math.floor(newProgress / 20),
            yesVotes: Math.floor(newProgress / 20 * 0.65),
            noVotes: Math.floor(newProgress / 20 * 0.35),
            averageConfidence: 75 + Math.random() * 20,
            consensusStrength: 60 + newProgress * 0.3
          });

          if (newProgress >= 100) {
            setTimeout(() => setCurrentStep('aggregation'), 1000);
          }

          return newProgress;
        });
      }, 2000);

      return () => clearInterval(progressTimer);
    }
  }, [currentStep]);

  const handleRequestResolution = async () => {
    if (!wallet.connected || !wallet.publicKey) {
      setError('Please connect your wallet first');
      return;
    }

    setIsProcessing(true);
    setError(null);

    try {
      const result = await oracleSystem.requestOracleResolution(market);

      if (result.success) {
        setCurrentStep('voting');
        setTimeRemaining(3600); // 1 hour for voting
        // In a real implementation, we'd fetch the actual selected oracles
        setSelectedOracles([
          {
            address: result.selectedOracles![0],
            reputation: 92,
            specialization: [],
            isActive: true,
            totalResolutions: 156,
            correctResolutions: 143,
            stake: BigInt(100000000),
            lastActiveTimestamp: Date.now() / 1000
          },
          {
            address: result.selectedOracles![1],
            reputation: 88,
            specialization: [],
            isActive: true,
            totalResolutions: 89,
            correctResolutions: 78,
            stake: BigInt(150000000),
            lastActiveTimestamp: Date.now() / 1000
          }
        ]);
      } else {
        setError(result.error || 'Failed to request oracle resolution');
      }
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Unknown error occurred');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleAggregateVotes = async () => {
    setIsProcessing(true);
    setCurrentStep('aggregation');

    try {
      // Simulate aggregation delay
      await new Promise(resolve => setTimeout(resolve, 3000));

      const result = await oracleSystem.aggregateOracleVotes(market.id);

      if (result.success && result.resolution) {
        setResolution(result.resolution);
        setCurrentStep('completed');
        onResolutionComplete?.(result.resolution);
      } else {
        setError(result.error || 'Failed to aggregate oracle votes');
      }
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Aggregation failed');
    } finally {
      setIsProcessing(false);
    }
  };

  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const renderRequestStep = () => (
    <div className="space-y-6">
      <div className="text-center space-y-4">
        <div className="w-16 h-16 rounded-full bg-zenith-500/20 flex items-center justify-center mx-auto">
          <Gavel className="w-8 h-8 text-zenith-400" />
        </div>
        <h3 className="text-xl font-bold text-foreground">Request Oracle Resolution</h3>
        <p className="text-muted-foreground">
          Request encrypted oracle resolution for this prediction market. Multiple qualified oracles will privately evaluate the outcome.
        </p>
      </div>

      <div className="bg-muted/20 rounded-lg p-4 space-y-3">
        <h4 className="font-semibold text-foreground">Market Details</h4>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Market:</span>
            <span className="text-foreground font-medium">{market.title}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Category:</span>
            <span className="text-foreground">{market.category}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">End Date:</span>
            <span className="text-foreground">{market.endDate.toLocaleDateString()}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Total Volume:</span>
            <span className="text-foreground">${market.totalVolume.toLocaleString()}</span>
          </div>
        </div>
      </div>

      <div className="bg-zenith-500/10 border border-zenith-500/20 rounded-lg p-4">
        <div className="flex items-start space-x-3">
          <Shield className="w-5 h-5 text-zenith-400 mt-0.5" />
          <div>
            <h5 className="font-medium text-zenith-300">Privacy-Preserving Resolution</h5>
            <p className="text-sm text-zenith-400 mt-1">
              Oracle votes are encrypted using Arcium MPC technology, ensuring fair and manipulation-resistant resolution.
            </p>
          </div>
        </div>
      </div>

      {error && (
        <div className="bg-error-500/10 border border-error-500/20 rounded-lg p-4 text-error-400">
          <div className="flex items-center space-x-2">
            <AlertTriangle className="w-4 h-4" />
            <span className="text-sm">{error}</span>
          </div>
        </div>
      )}

      <button
        onClick={handleRequestResolution}
        disabled={isProcessing}
        className="w-full py-3 px-4 bg-zenith-500 hover:bg-zenith-600 disabled:bg-zenith-500/50 text-white rounded-lg font-medium transition-colors flex items-center justify-center space-x-2"
      >
        {isProcessing ? (
          <>
            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            <span>Requesting Resolution...</span>
          </>
        ) : (
          <>
            <Gavel className="w-4 h-4" />
            <span>Request Oracle Resolution</span>
          </>
        )}
      </button>
    </div>
  );

  const renderVotingStep = () => (
    <div className="space-y-6">
      <div className="text-center space-y-4">
        <div className="w-16 h-16 rounded-full bg-warning-500/20 flex items-center justify-center mx-auto">
          <Clock className="w-8 h-8 text-warning-400 animate-pulse" />
        </div>
        <h3 className="text-xl font-bold text-foreground">Oracle Voting in Progress</h3>
        <p className="text-muted-foreground">
          Selected oracles are privately evaluating the market outcome. Votes are encrypted to prevent manipulation.
        </p>
      </div>

      {/* Countdown Timer */}
      <div className="bg-warning-500/10 border border-warning-500/20 rounded-lg p-4 text-center">
        <div className="text-2xl font-bold text-warning-400 mb-2">
          {formatTime(timeRemaining)}
        </div>
        <p className="text-sm text-warning-400">Time remaining for oracle voting</p>
      </div>

      {/* Vote Progress */}
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <span className="text-sm text-muted-foreground">Vote Progress</span>
          <span className="text-sm font-medium text-foreground">{Math.floor(voteProgress)}%</span>
        </div>
        <div className="w-full bg-muted/20 rounded-full h-2">
          <motion.div
            className="bg-zenith-500 h-2 rounded-full"
            initial={{ width: 0 }}
            animate={{ width: `${voteProgress}%` }}
            transition={{ duration: 0.5 }}
          />
        </div>
      </div>

      {/* Live Stats */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-muted/20 rounded-lg p-3 text-center">
          <div className="text-lg font-bold text-foreground">{resolutionStats.totalVotes}/5</div>
          <div className="text-xs text-muted-foreground">Votes Received</div>
        </div>
        <div className="bg-muted/20 rounded-lg p-3 text-center">
          <div className="text-lg font-bold text-zenith-400">{Math.floor(resolutionStats.consensusStrength)}%</div>
          <div className="text-xs text-muted-foreground">Consensus</div>
        </div>
      </div>

      {/* Selected Oracles */}
      <div className="space-y-3">
        <h4 className="font-semibold text-foreground flex items-center space-x-2">
          <Users className="w-4 h-4" />
          <span>Selected Oracles</span>
        </h4>
        <div className="space-y-2">
          {selectedOracles.map((oracle, index) => (
            <div key={index} className="flex items-center justify-between p-3 bg-muted/20 rounded-lg">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 rounded-full bg-zenith-500/20 flex items-center justify-center">
                  <Award className="w-4 h-4 text-zenith-400" />
                </div>
                <div>
                  <div className="text-sm font-medium text-foreground">
                    Oracle {index + 1}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {oracle.address.toString().slice(0, 8)}...
                  </div>
                </div>
              </div>
              <div className="text-right">
                <div className="text-sm font-medium text-success-400">{oracle.reputation}%</div>
                <div className="text-xs text-muted-foreground">Reputation</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {voteProgress >= 100 && (
        <button
          onClick={handleAggregateVotes}
          disabled={isProcessing}
          className="w-full py-3 px-4 bg-success-500 hover:bg-success-600 disabled:bg-success-500/50 text-white rounded-lg font-medium transition-colors flex items-center justify-center space-x-2"
        >
          {isProcessing ? (
            <>
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              <span>Aggregating Votes...</span>
            </>
          ) : (
            <>
              <Zap className="w-4 h-4" />
              <span>Aggregate Votes & Resolve</span>
            </>
          )}
        </button>
      )}
    </div>
  );

  const renderAggregationStep = () => (
    <div className="space-y-6 text-center">
      <div className="w-16 h-16 rounded-full bg-zenith-500/20 flex items-center justify-center mx-auto">
        <div className="w-8 h-8 border-4 border-zenith-500 border-t-transparent rounded-full animate-spin" />
      </div>
      <h3 className="text-xl font-bold text-foreground">Aggregating Encrypted Votes</h3>
      <p className="text-muted-foreground">
        Processing oracle votes using Multi-Party Computation to determine the final resolution while preserving privacy.
      </p>

      <div className="bg-zenith-500/10 border border-zenith-500/20 rounded-lg p-4">
        <div className="flex items-center justify-center space-x-2 text-zenith-400">
          <Shield className="w-5 h-5" />
          <span className="text-sm">Privacy-preserving aggregation in progress...</span>
        </div>
      </div>
    </div>
  );

  const renderCompletedStep = () => (
    <div className="space-y-6">
      <div className="text-center space-y-4">
        <div className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto ${
          resolution?.result === true
            ? 'bg-success-500/20'
            : resolution?.result === false
            ? 'bg-error-500/20'
            : 'bg-muted/20'
        }`}>
          {resolution?.result === true ? (
            <CheckCircle className="w-8 h-8 text-success-400" />
          ) : resolution?.result === false ? (
            <XCircle className="w-8 h-8 text-error-400" />
          ) : (
            <AlertTriangle className="w-8 h-8 text-muted-foreground" />
          )}
        </div>
        <h3 className="text-xl font-bold text-foreground">Resolution Complete</h3>
        <p className="text-muted-foreground">
          Oracle consensus has been reached. The market has been resolved with encrypted vote aggregation.
        </p>
      </div>

      {resolution && (
        <div className="space-y-4">
          {/* Final Result */}
          <div className={`p-4 rounded-lg border ${
            resolution.result === true
              ? 'bg-success-500/10 border-success-500/20'
              : resolution.result === false
              ? 'bg-error-500/10 border-error-500/20'
              : 'bg-muted/10 border-muted/20'
          }`}>
            <div className="text-center">
              <div className={`text-2xl font-bold ${
                resolution.result === true
                  ? 'text-success-400'
                  : resolution.result === false
                  ? 'text-error-400'
                  : 'text-muted-foreground'
              }`}>
                {resolution.result === true ? 'YES' : resolution.result === false ? 'NO' : 'INVALID'}
              </div>
              <div className="text-sm text-muted-foreground mt-1">Market Resolution</div>
            </div>
          </div>

          {/* Resolution Stats */}
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-muted/20 rounded-lg p-3 text-center">
              <div className="text-lg font-bold text-foreground">{resolution.confidence}%</div>
              <div className="text-xs text-muted-foreground">Confidence</div>
            </div>
            <div className="bg-muted/20 rounded-lg p-3 text-center">
              <div className="text-lg font-bold text-zenith-400">{resolution.consensusStrength}%</div>
              <div className="text-xs text-muted-foreground">Consensus</div>
            </div>
            <div className="bg-muted/20 rounded-lg p-3 text-center">
              <div className="text-lg font-bold text-foreground">{resolution.participatingOracles.length}</div>
              <div className="text-xs text-muted-foreground">Oracles</div>
            </div>
          </div>

          {/* Evidence Sources */}
          {resolution.evidenceSources.length > 0 && (
            <div className="space-y-3">
              <h4 className="font-semibold text-foreground flex items-center space-x-2">
                <FileText className="w-4 h-4" />
                <span>Evidence Sources</span>
              </h4>
              <div className="space-y-2">
                {resolution.evidenceSources.map((source, index) => (
                  <div key={index} className="flex items-center space-x-3 p-2 bg-muted/20 rounded text-sm">
                    <Eye className="w-4 h-4 text-muted-foreground" />
                    <span className="text-muted-foreground truncate">{source}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      <button
        onClick={onClose}
        className="w-full py-3 px-4 bg-zenith-500 hover:bg-zenith-600 text-white rounded-lg font-medium transition-colors"
      >
        Close
      </button>
    </div>
  );

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
          className="relative w-full max-w-lg bg-card border border-border/50 rounded-2xl shadow-2xl overflow-hidden"
          initial={{ scale: 0.9, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.9, opacity: 0, y: 20 }}
          transition={{ type: 'spring', stiffness: 300, damping: 30 }}
        >
          {/* Header */}
          <div className="bg-gradient-to-r from-zenith-500/10 to-zenith-600/20 p-6 border-b border-border/30">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 rounded-full bg-zenith-500/20 flex items-center justify-center">
                  <Gavel className="w-4 h-4 text-zenith-400" />
                </div>
                <h2 className="text-xl font-bold text-foreground">Oracle Resolution</h2>
              </div>
              <button
                onClick={onClose}
                className="w-8 h-8 rounded-full bg-muted/20 flex items-center justify-center text-muted-foreground hover:bg-muted/30 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Progress Steps */}
            <div className="flex items-center justify-between mt-6">
              {['request', 'voting', 'aggregation', 'completed'].map((step, index) => (
                <div key={step} className="flex items-center">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                    currentStep === step
                      ? 'bg-zenith-500 text-white'
                      : index < ['request', 'voting', 'aggregation', 'completed'].indexOf(currentStep)
                      ? 'bg-success-500 text-white'
                      : 'bg-muted/20 text-muted-foreground'
                  }`}>
                    {index + 1}
                  </div>
                  {index < 3 && (
                    <div className={`w-8 h-0.5 mx-2 ${
                      index < ['request', 'voting', 'aggregation', 'completed'].indexOf(currentStep)
                        ? 'bg-success-500'
                        : 'bg-muted/20'
                    }`} />
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Content */}
          <div className="p-6">
            {currentStep === 'request' && renderRequestStep()}
            {currentStep === 'voting' && renderVotingStep()}
            {currentStep === 'aggregation' && renderAggregationStep()}
            {currentStep === 'completed' && renderCompletedStep()}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};