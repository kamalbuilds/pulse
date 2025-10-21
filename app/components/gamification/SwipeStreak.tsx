'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { Flame, Star, Trophy, Zap, Target, Crown } from 'lucide-react';

interface SwipeStreakProps {
  currentStreak: number;
  accuracy: number;
  totalPredictions: number;
  onStreakMilestone?: (milestone: number) => void;
}

const streakMilestones = [
  { count: 5, icon: Star, color: 'text-yellow-400', bg: 'bg-yellow-500/20', label: 'Rising Star' },
  { count: 10, icon: Flame, color: 'text-orange-400', bg: 'bg-orange-500/20', label: 'On Fire' },
  { count: 25, icon: Target, color: 'text-blue-400', bg: 'bg-blue-500/20', label: 'Sharp Shooter' },
  { count: 50, icon: Trophy, color: 'text-purple-400', bg: 'bg-purple-500/20', label: 'Legend' },
  { count: 100, icon: Crown, color: 'text-zenith-400', bg: 'bg-zenith-500/20', label: 'Oracle' },
];

export const SwipeStreak: React.FC<SwipeStreakProps> = ({
  currentStreak,
  accuracy,
  totalPredictions,
  onStreakMilestone
}) => {
  const getCurrentMilestone = () => {
    return streakMilestones
      .reverse()
      .find(milestone => currentStreak >= milestone.count) || null;
  };

  const getNextMilestone = () => {
    return streakMilestones
      .find(milestone => currentStreak < milestone.count) || null;
  };

  const currentMilestone = getCurrentMilestone();
  const nextMilestone = getNextMilestone();

  const progressToNext = nextMilestone
    ? (currentStreak / nextMilestone.count) * 100
    : 100;

  const getStreakColor = () => {
    if (currentStreak >= 50) return 'text-zenith-400';
    if (currentStreak >= 25) return 'text-purple-400';
    if (currentStreak >= 10) return 'text-orange-400';
    if (currentStreak >= 5) return 'text-yellow-400';
    return 'text-muted-foreground';
  };

  const getFireIntensity = () => {
    if (currentStreak >= 25) return 3; // Triple fire
    if (currentStreak >= 10) return 2; // Double fire
    if (currentStreak >= 5) return 1; // Single fire
    return 0;
  };

  const fireIntensity = getFireIntensity();

  return (
    <motion.div
      className="relative"
      initial={{ scale: 0.9, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ duration: 0.3 }}
    >
      {/* Streak Display */}
      <div className="flex items-center justify-center mb-2">
        <motion.div
          className={`flex items-center space-x-2 px-4 py-2 rounded-full ${
            currentMilestone?.bg || 'bg-muted/20'
          } border ${currentMilestone?.color.replace('text-', 'border-').replace('-400', '-500/30') || 'border-border/30'}`}
          animate={currentStreak >= 10 ? { scale: [1, 1.05, 1] } : {}}
          transition={{ duration: 2, repeat: Infinity }}
        >
          {/* Fire Effects */}
          {Array.from({ length: fireIntensity }, (_, i) => (
            <motion.div
              key={i}
              animate={{
                scale: [1, 1.2, 1],
                rotate: [0, 5, -5, 0],
              }}
              transition={{
                duration: 1.5,
                repeat: Infinity,
                delay: i * 0.2,
              }}
            >
              <Flame className={`w-4 h-4 ${getStreakColor()}`} />
            </motion.div>
          ))}

          {currentMilestone && (
            <currentMilestone.icon className={`w-5 h-5 ${currentMilestone.color}`} />
          )}

          <span className={`font-bold text-lg ${getStreakColor()}`}>
            {currentStreak}
          </span>

          <span className="text-xs text-muted-foreground">
            streak
          </span>
        </motion.div>
      </div>

      {/* Current Milestone */}
      {currentMilestone && (
        <motion.div
          className="text-center mb-2"
          initial={{ y: -10, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
        >
          <span className={`text-sm font-medium ${currentMilestone.color}`}>
            {currentMilestone.label}
          </span>
        </motion.div>
      )}

      {/* Progress to Next Milestone */}
      {nextMilestone && (
        <div className="space-y-1">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>Next: {nextMilestone.label}</span>
            <span>{currentStreak}/{nextMilestone.count}</span>
          </div>

          <div className="w-full bg-muted/20 rounded-full h-1.5 overflow-hidden">
            <motion.div
              className={`h-full ${nextMilestone.color.replace('text-', 'bg-').replace('-400', '-500')}`}
              initial={{ width: 0 }}
              animate={{ width: `${progressToNext}%` }}
              transition={{ duration: 0.8, ease: 'easeOut' }}
            />
          </div>
        </div>
      )}

      {/* Performance Stats */}
      <div className="flex justify-center space-x-4 mt-3 text-xs text-muted-foreground">
        <div className="flex items-center space-x-1">
          <Target className="w-3 h-3" />
          <span>{accuracy.toFixed(1)}% accuracy</span>
        </div>
        <div className="flex items-center space-x-1">
          <Zap className="w-3 h-3" />
          <span>{totalPredictions} total</span>
        </div>
      </div>
    </motion.div>
  );
};