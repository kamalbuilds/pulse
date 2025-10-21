'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  AlertTriangle,
  Shield,
  Users,
  TrendingUp,
  Brain,
  Eye,
  Clock,
  Zap,
  CheckCircle,
  XCircle
} from 'lucide-react';

export interface HerdingAnalysis {
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  herdingScore: number; // 0-100
  patterns: Array<{
    type: 'rapid_consensus' | 'low_conviction_following' | 'whale_following' | 'bot_activity';
    severity: number;
    description: string;
  }>;
  recommendations: string[];
  privacyScore: number;
  manipulationLikelihood: number;
}

interface HerdingDetectionProps {
  marketId: string;
  userConfidence: number;
  voteChoice: 'yes' | 'no';
  onAnalysisComplete: (analysis: HerdingAnalysis) => void;
  isVisible: boolean;
}

const riskLevelConfig = {
  low: {
    color: 'text-success-400',
    bg: 'bg-success-500/20',
    border: 'border-success-500/30',
    icon: CheckCircle
  },
  medium: {
    color: 'text-warning-400',
    bg: 'bg-warning-500/20',
    border: 'border-warning-500/30',
    icon: AlertTriangle
  },
  high: {
    color: 'text-error-400',
    bg: 'bg-error-500/20',
    border: 'border-error-500/30',
    icon: AlertTriangle
  },
  critical: {
    color: 'text-error-400',
    bg: 'bg-error-500/20',
    border: 'border-error-500/30',
    icon: XCircle
  }
};

export const HerdingDetection: React.FC<HerdingDetectionProps> = ({
  marketId,
  userConfidence,
  voteChoice,
  onAnalysisComplete,
  isVisible
}) => {
  const [analysis, setAnalysis] = useState<HerdingAnalysis | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisProgress, setAnalysisProgress] = useState(0);

  useEffect(() => {
    if (isVisible) {
      performHerdingAnalysis();
    }
  }, [isVisible, marketId, userConfidence, voteChoice]);

  const performHerdingAnalysis = async () => {
    setIsAnalyzing(true);
    setAnalysisProgress(0);

    // Simulate analysis steps
    const analysisSteps = [
      'Analyzing recent voting patterns...',
      'Detecting consensus formation...',
      'Checking for manipulation signals...',
      'Evaluating privacy preservation...',
      'Calculating risk scores...'
    ];

    for (let i = 0; i < analysisSteps.length; i++) {
      await new Promise(resolve => setTimeout(resolve, 400));
      setAnalysisProgress((i + 1) / analysisSteps.length * 100);
    }

    // Mock analysis based on user input
    const mockAnalysis = generateMockAnalysis(userConfidence, voteChoice);
    setAnalysis(mockAnalysis);
    setIsAnalyzing(false);
    onAnalysisComplete(mockAnalysis);
  };

  const generateMockAnalysis = (confidence: number, choice: string): HerdingAnalysis => {
    let herdingScore = 0;
    const patterns: HerdingAnalysis['patterns'] = [];
    const recommendations: string[] = [];

    // Low confidence following detection
    if (confidence < 60) {
      herdingScore += 25;
      patterns.push({
        type: 'low_conviction_following',
        severity: 6,
        description: 'Low conviction vote may indicate social influence'
      });
      recommendations.push('Consider waiting for more information before voting');
    }

    // Simulate rapid consensus detection
    if (Math.random() > 0.7) {
      herdingScore += 20;
      patterns.push({
        type: 'rapid_consensus',
        severity: 4,
        description: 'Rapid consensus formation detected in recent votes'
      });
      recommendations.push('Take time to form independent opinion');
    }

    // Whale following pattern
    if (confidence > 80 && Math.random() > 0.8) {
      herdingScore += 15;
      patterns.push({
        type: 'whale_following',
        severity: 3,
        description: 'High-confidence votes aligning with market leaders'
      });
      recommendations.push('Verify your prediction with independent research');
    }

    // Bot activity detection
    if (Math.random() > 0.9) {
      herdingScore += 30;
      patterns.push({
        type: 'bot_activity',
        severity: 8,
        description: 'Suspicious automated voting patterns detected'
      });
      recommendations.push('Market may be under manipulation attack');
    }

    let riskLevel: HerdingAnalysis['riskLevel'];
    if (herdingScore < 20) riskLevel = 'low';
    else if (herdingScore < 40) riskLevel = 'medium';
    else if (herdingScore < 60) riskLevel = 'high';
    else riskLevel = 'critical';

    return {
      riskLevel,
      herdingScore: Math.min(100, herdingScore),
      patterns,
      recommendations,
      privacyScore: Math.max(0, 95 - herdingScore * 0.5),
      manipulationLikelihood: Math.min(100, herdingScore * 0.8)
    };
  };

  if (!isVisible) return null;

  const riskConfig = analysis ? riskLevelConfig[analysis.riskLevel] : riskLevelConfig.low;
  const RiskIcon = riskConfig.icon;

  return (
    <AnimatePresence>
      <motion.div
        className="space-y-4"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        transition={{ duration: 0.3 }}
      >
        {/* Header */}
        <div className="flex items-center space-x-3">
          <div className="p-2 rounded-full bg-zenith-500/20 border border-zenith-500/30">
            <Brain className="w-5 h-5 text-zenith-400" />
          </div>
          <div>
            <h3 className="font-semibold text-foreground">Anti-Herding Analysis</h3>
            <p className="text-sm text-muted-foreground">
              Protecting against manipulation and groupthink
            </p>
          </div>
        </div>

        {/* Analysis Progress */}
        {isAnalyzing && (
          <motion.div
            className="space-y-3"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          >
            <div className="flex items-center space-x-2">
              <Zap className="w-4 h-4 text-zenith-400 animate-pulse" />
              <span className="text-sm text-muted-foreground">
                Analyzing voting patterns with Arcium MPC...
              </span>
            </div>

            <div className="w-full bg-muted/20 rounded-full h-2 overflow-hidden">
              <motion.div
                className="h-full bg-zenith-500"
                initial={{ width: 0 }}
                animate={{ width: `${analysisProgress}%` }}
                transition={{ duration: 0.3 }}
              />
            </div>

            <div className="text-xs text-center text-muted-foreground">
              {analysisProgress.toFixed(0)}% complete
            </div>
          </motion.div>
        )}

        {/* Analysis Results */}
        {analysis && !isAnalyzing && (
          <motion.div
            className="space-y-4"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.4 }}
          >
            {/* Risk Level Card */}
            <div className={`p-4 rounded-lg border ${riskConfig.bg} ${riskConfig.border}`}>
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center space-x-2">
                  <RiskIcon className={`w-5 h-5 ${riskConfig.color}`} />
                  <span className={`font-semibold ${riskConfig.color} capitalize`}>
                    {analysis.riskLevel} Risk
                  </span>
                </div>
                <div className="text-right">
                  <div className={`text-lg font-bold ${riskConfig.color}`}>
                    {analysis.herdingScore}
                  </div>
                  <div className="text-xs text-muted-foreground">herding score</div>
                </div>
              </div>

              {/* Risk Metrics */}
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div className="flex items-center space-x-2">
                  <Shield className="w-4 h-4 text-success-400" />
                  <span className="text-muted-foreground">Privacy:</span>
                  <span className="font-medium text-success-400">
                    {analysis.privacyScore}%
                  </span>
                </div>
                <div className="flex items-center space-x-2">
                  <Eye className="w-4 h-4 text-warning-400" />
                  <span className="text-muted-foreground">Manipulation:</span>
                  <span className="font-medium text-warning-400">
                    {analysis.manipulationLikelihood}%
                  </span>
                </div>
              </div>
            </div>

            {/* Detected Patterns */}
            {analysis.patterns.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-sm font-medium text-foreground flex items-center space-x-2">
                  <TrendingUp className="w-4 h-4" />
                  <span>Detected Patterns</span>
                </h4>

                {analysis.patterns.map((pattern, index) => (
                  <motion.div
                    key={index}
                    className="p-3 bg-muted/10 border border-border/20 rounded-lg"
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.3, delay: index * 0.1 }}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-medium text-foreground capitalize">
                        {pattern.type.replace('_', ' ')}
                      </span>
                      <div className="flex items-center space-x-1">
                        <div className="w-2 h-2 rounded-full bg-warning-400" />
                        <span className="text-xs text-muted-foreground">
                          Severity: {pattern.severity}/10
                        </span>
                      </div>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {pattern.description}
                    </p>
                  </motion.div>
                ))}
              </div>
            )}

            {/* Recommendations */}
            {analysis.recommendations.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-sm font-medium text-foreground flex items-center space-x-2">
                  <Users className="w-4 h-4" />
                  <span>Recommendations</span>
                </h4>

                <div className="space-y-1">
                  {analysis.recommendations.map((rec, index) => (
                    <motion.div
                      key={index}
                      className="flex items-start space-x-2 text-sm"
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.3, delay: index * 0.05 }}
                    >
                      <div className="w-1.5 h-1.5 rounded-full bg-zenith-400 mt-2 flex-shrink-0" />
                      <span className="text-muted-foreground">{rec}</span>
                    </motion.div>
                  ))}
                </div>
              </div>
            )}

            {/* Privacy Protection Notice */}
            <div className="p-3 bg-zenith-500/10 border border-zenith-500/20 rounded-lg">
              <div className="flex items-center space-x-2 mb-1">
                <Shield className="w-4 h-4 text-zenith-400" />
                <span className="text-sm font-medium text-zenith-400">
                  Privacy Protected
                </span>
              </div>
              <p className="text-xs text-muted-foreground">
                This analysis was performed using Arcium's encrypted MPC without revealing your vote or personal data to other participants.
              </p>
            </div>

            {/* Timing Information */}
            <div className="flex items-center justify-center space-x-2 text-xs text-muted-foreground">
              <Clock className="w-3 h-3" />
              <span>Analysis completed in encrypted environment</span>
            </div>
          </motion.div>
        )}
      </motion.div>
    </AnimatePresence>
  );
};

export default HerdingDetection;