'use client';

import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Trophy, Star, Zap, Target, Flame, Crown, TrendingUp, Shield, Users } from 'lucide-react';

export interface Achievement {
  id: string;
  title: string;
  description: string;
  icon: any;
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
  reward?: {
    type: 'xp' | 'tokens' | 'multiplier';
    amount: number;
  };
  trigger?: {
    type: 'streak' | 'accuracy' | 'volume' | 'privacy' | 'special';
    threshold: number;
  };
}

const achievements: Achievement[] = [
  {
    id: 'first_prediction',
    title: 'First Steps',
    description: 'Made your first prediction',
    icon: Star,
    rarity: 'common',
    reward: { type: 'xp', amount: 100 }
  },
  {
    id: 'streak_5',
    title: 'Getting Warm',
    description: 'Achieved a 5-prediction streak',
    icon: Flame,
    rarity: 'common',
    reward: { type: 'xp', amount: 250 }
  },
  {
    id: 'streak_10',
    title: 'On Fire',
    description: 'Achieved a 10-prediction streak',
    icon: Flame,
    rarity: 'rare',
    reward: { type: 'multiplier', amount: 1.1 }
  },
  {
    id: 'accuracy_80',
    title: 'Sharp Shooter',
    description: 'Maintained 80%+ accuracy over 20 predictions',
    icon: Target,
    rarity: 'rare',
    reward: { type: 'tokens', amount: 1000 }
  },
  {
    id: 'high_volume_trader',
    title: 'Big Player',
    description: 'Staked over 10 SOL in total',
    icon: TrendingUp,
    rarity: 'epic',
    reward: { type: 'multiplier', amount: 1.25 }
  },
  {
    id: 'privacy_advocate',
    title: 'Privacy Advocate',
    description: 'Used encrypted voting 50 times',
    icon: Shield,
    rarity: 'epic',
    reward: { type: 'xp', amount: 1000 }
  },
  {
    id: 'streak_50',
    title: 'Unstoppable',
    description: 'Achieved a 50-prediction streak',
    icon: Crown,
    rarity: 'legendary',
    reward: { type: 'multiplier', amount: 2.0 }
  },
  {
    id: 'community_builder',
    title: 'Community Builder',
    description: 'Invited 10 friends who made predictions',
    icon: Users,
    rarity: 'legendary',
    reward: { type: 'tokens', amount: 5000 }
  }
];

interface AchievementToastProps {
  achievement: Achievement | null;
  onDismiss: () => void;
  show: boolean;
}

const rarityColors = {
  common: {
    bg: 'bg-gray-500/20',
    border: 'border-gray-500/30',
    text: 'text-gray-400',
    glow: 'shadow-gray-500/25'
  },
  rare: {
    bg: 'bg-blue-500/20',
    border: 'border-blue-500/30',
    text: 'text-blue-400',
    glow: 'shadow-blue-500/25'
  },
  epic: {
    bg: 'bg-purple-500/20',
    border: 'border-purple-500/30',
    text: 'text-purple-400',
    glow: 'shadow-purple-500/25'
  },
  legendary: {
    bg: 'bg-zenith-500/20',
    border: 'border-zenith-500/30',
    text: 'text-zenith-400',
    glow: 'shadow-zenith-500/25'
  }
};

export const AchievementToast: React.FC<AchievementToastProps> = ({
  achievement,
  onDismiss,
  show
}) => {
  const [particles, setParticles] = useState<Array<{ id: number; x: number; y: number }>>([]);

  useEffect(() => {
    if (show && achievement) {
      // Create celebration particles
      const newParticles = Array.from({ length: 12 }, (_, i) => ({
        id: i,
        x: Math.random() * 400,
        y: Math.random() * 200
      }));
      setParticles(newParticles);

      // Auto dismiss after 5 seconds
      const timer = setTimeout(() => {
        onDismiss();
      }, 5000);

      return () => clearTimeout(timer);
    }
  }, [show, achievement, onDismiss]);

  if (!achievement) return null;

  const colors = rarityColors[achievement.rarity];
  const IconComponent = achievement.icon;

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          className="fixed top-4 right-4 z-50 pointer-events-none"
          initial={{ opacity: 0, scale: 0.5, y: -50 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.5, y: -50 }}
          transition={{
            type: 'spring',
            stiffness: 300,
            damping: 20,
            duration: 0.6
          }}
        >
          {/* Celebration Particles */}
          <div className="absolute inset-0 pointer-events-none">
            {particles.map((particle) => (
              <motion.div
                key={particle.id}
                className={`absolute w-1 h-1 ${colors.bg} rounded-full`}
                initial={{
                  x: particle.x,
                  y: particle.y,
                  scale: 0,
                  opacity: 1
                }}
                animate={{
                  x: particle.x + (Math.random() - 0.5) * 200,
                  y: particle.y + Math.random() * -100 - 50,
                  scale: [0, 1, 0],
                  opacity: [1, 1, 0]
                }}
                transition={{
                  duration: 2,
                  ease: 'easeOut'
                }}
              />
            ))}
          </div>

          {/* Achievement Card */}
          <motion.div
            className={`
              relative max-w-sm p-6 rounded-2xl
              ${colors.bg} ${colors.border} border-2
              backdrop-blur-sm shadow-2xl ${colors.glow}
              pointer-events-auto cursor-pointer
            `}
            onClick={onDismiss}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            {/* Glow Effect */}
            <div className={`absolute inset-0 rounded-2xl ${colors.bg} blur-xl opacity-75`} />

            <div className="relative">
              {/* Header */}
              <div className="flex items-center space-x-3 mb-3">
                <motion.div
                  className={`p-3 rounded-full ${colors.bg} ${colors.border} border`}
                  animate={{
                    rotate: [0, 10, -10, 0],
                    scale: [1, 1.1, 1]
                  }}
                  transition={{
                    duration: 2,
                    repeat: Infinity,
                    repeatType: 'reverse'
                  }}
                >
                  <IconComponent className={`w-6 h-6 ${colors.text}`} />
                </motion.div>

                <div>
                  <h3 className="font-bold text-foreground text-lg">
                    Achievement Unlocked!
                  </h3>
                  <span className={`text-xs uppercase font-medium ${colors.text}`}>
                    {achievement.rarity}
                  </span>
                </div>
              </div>

              {/* Achievement Details */}
              <div className="space-y-2">
                <h4 className="font-semibold text-foreground">
                  {achievement.title}
                </h4>
                <p className="text-sm text-muted-foreground">
                  {achievement.description}
                </p>

                {/* Reward */}
                {achievement.reward && (
                  <div className={`flex items-center space-x-2 pt-2 ${colors.text}`}>
                    <Trophy className="w-4 h-4" />
                    <span className="text-sm font-medium">
                      {achievement.reward.type === 'xp' && `+${achievement.reward.amount} XP`}
                      {achievement.reward.type === 'tokens' && `+${achievement.reward.amount} Tokens`}
                      {achievement.reward.type === 'multiplier' && `${achievement.reward.amount}x Multiplier`}
                    </span>
                  </div>
                )}
              </div>

              {/* Dismiss Hint */}
              <div className="absolute top-2 right-2">
                <div className="w-2 h-2 bg-muted-foreground/50 rounded-full" />
              </div>
            </div>
          </motion.div>

          {/* Progress Ring Animation */}
          <motion.div
            className="absolute inset-0 pointer-events-none"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <svg className="w-full h-full">
              <motion.circle
                cx="50%"
                cy="50%"
                r="180"
                fill="none"
                stroke={colors.text.replace('text-', '')}
                strokeWidth="2"
                strokeDasharray="1130"
                strokeDashoffset="1130"
                strokeLinecap="round"
                animate={{ strokeDashoffset: 0 }}
                transition={{ duration: 5, ease: 'linear' }}
                className="opacity-30"
              />
            </svg>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

// Achievement Manager Hook
export const useAchievements = () => {
  const [unlockedAchievements, setUnlockedAchievements] = useState<string[]>([]);
  const [currentAchievement, setCurrentAchievement] = useState<Achievement | null>(null);
  const [showToast, setShowToast] = useState(false);

  const checkAchievements = (
    userStats: {
      totalPredictions: number;
      accuracy: number;
      currentStreak: number;
      totalVolume: number;
      encryptedVotes: number;
    }
  ) => {
    achievements.forEach(achievement => {
      if (unlockedAchievements.includes(achievement.id)) return;

      let shouldUnlock = false;

      // Check different trigger types
      if (achievement.trigger) {
        switch (achievement.trigger.type) {
          case 'streak':
            shouldUnlock = userStats.currentStreak >= achievement.trigger.threshold;
            break;
          case 'accuracy':
            shouldUnlock = userStats.accuracy >= achievement.trigger.threshold &&
                          userStats.totalPredictions >= 20;
            break;
          case 'volume':
            shouldUnlock = userStats.totalVolume >= achievement.trigger.threshold;
            break;
          case 'privacy':
            shouldUnlock = userStats.encryptedVotes >= achievement.trigger.threshold;
            break;
        }
      } else {
        // Special achievements
        if (achievement.id === 'first_prediction') {
          shouldUnlock = userStats.totalPredictions >= 1;
        }
      }

      if (shouldUnlock) {
        unlockAchievement(achievement);
      }
    });
  };

  const unlockAchievement = (achievement: Achievement) => {
    setUnlockedAchievements(prev => [...prev, achievement.id]);
    setCurrentAchievement(achievement);
    setShowToast(true);
  };

  const dismissToast = () => {
    setShowToast(false);
    setTimeout(() => {
      setCurrentAchievement(null);
    }, 300);
  };

  return {
    unlockedAchievements,
    currentAchievement,
    showToast,
    checkAchievements,
    dismissToast,
    allAchievements: achievements
  };
};

export default AchievementToast;