'use client';

import React, { useState } from 'react';
import { motion, PanInfo, useMotionValue, useTransform } from 'framer-motion';
import { Calendar, TrendingUp, Users, X, Check, MoreHorizontal } from 'lucide-react';
import { Market, MarketCategory } from '@/types/market';

interface SwipeCardProps {
  market: Market;
  onSwipe: (direction: 'left' | 'right', market: Market) => void;
  onPass: (market: Market) => void;
  isActive: boolean;
  style?: React.CSSProperties;
}

const categoryColors = {
  [MarketCategory.SPORTS]: 'bg-orange-500/10 text-orange-400 border-orange-500/20',
  [MarketCategory.POLITICS]: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
  [MarketCategory.CRYPTO]: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20',
  [MarketCategory.ENTERTAINMENT]: 'bg-pink-500/10 text-pink-400 border-pink-500/20',
  [MarketCategory.TECHNOLOGY]: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
  [MarketCategory.WEATHER]: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20',
  [MarketCategory.ECONOMY]: 'bg-green-500/10 text-green-400 border-green-500/20',
  [MarketCategory.OTHER]: 'bg-gray-500/10 text-gray-400 border-gray-500/20',
};

export const SwipeCard: React.FC<SwipeCardProps> = ({
  market,
  onSwipe,
  onPass,
  isActive,
  style,
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const x = useMotionValue(0);
  const rotate = useTransform(x, [-200, 200], [-30, 30]);
  const opacity = useTransform(x, [-200, -50, 0, 50, 200], [0, 0.5, 1, 0.5, 0]);

  // Transform for swipe indicators
  const yesOpacity = useTransform(x, [0, 150], [0, 1]);
  const noOpacity = useTransform(x, [-150, 0], [1, 0]);

  const handleDragEnd = (event: any, info: PanInfo) => {
    setIsDragging(false);
    const threshold = 100;

    if (info.offset.x > threshold) {
      onSwipe('right', market);
    } else if (info.offset.x < -threshold) {
      onSwipe('left', market);
    }
  };

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    }).format(date);
  };

  const formatVolume = (volume: number) => {
    if (volume >= 1000000) {
      return `$${(volume / 1000000).toFixed(1)}M`;
    }
    if (volume >= 1000) {
      return `$${(volume / 1000).toFixed(1)}K`;
    }
    return `$${volume}`;
  };

  return (
    <motion.div
      className="absolute inset-0 cursor-grab active:cursor-grabbing"
      style={{ ...style, x, rotate, opacity }}
      drag={isActive ? "x" : false}
      dragConstraints={{ left: 0, right: 0 }}
      dragElastic={0.7}
      onDragStart={() => setIsDragging(true)}
      onDragEnd={handleDragEnd}
      whileTap={{ scale: 0.95 }}
      initial={{ scale: 0.9, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      exit={{ scale: 0.9, opacity: 0 }}
      transition={{ duration: 0.3 }}
    >
      {/* Card Container */}
      <div className="h-full w-full rounded-2xl bg-card border border-border/50 shadow-2xl overflow-hidden">
        {/* Swipe Indicators */}
        {isDragging && (
          <>
            {/* YES Indicator */}
            <motion.div
              className="absolute top-8 right-8 z-10 px-4 py-2 rounded-full bg-success-500 text-white font-bold text-lg transform rotate-12"
              style={{ opacity: yesOpacity }}
            >
              YES
            </motion.div>

            {/* NO Indicator */}
            <motion.div
              className="absolute top-8 left-8 z-10 px-4 py-2 rounded-full bg-error-500 text-white font-bold text-lg transform -rotate-12"
              style={{ opacity: noOpacity }}
            >
              NO
            </motion.div>
          </>
        )}

        {/* Market Image */}
        <div className="relative h-48 bg-gradient-to-br from-zenith-500/20 to-zenith-600/30">
          {market.imageUrl ? (
            <img
              src={market.imageUrl}
              alt={market.title}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <TrendingUp className="w-16 h-16 text-zenith-400" />
            </div>
          )}

          {/* Category Badge */}
          <div className="absolute top-4 left-4">
            <span className={`px-3 py-1 rounded-full text-xs font-medium border ${categoryColors[market.category]}`}>
              {market.category.toUpperCase()}
            </span>
          </div>

          {/* More Options */}
          <button
            onClick={() => onPass(market)}
            className="absolute top-4 right-4 w-8 h-8 rounded-full bg-black/50 flex items-center justify-center text-white hover:bg-black/70 transition-colors"
          >
            <MoreHorizontal className="w-4 h-4" />
          </button>
        </div>

        {/* Market Content */}
        <div className="p-6 space-y-4">
          {/* Title */}
          <h3 className="text-xl font-bold text-foreground leading-tight">
            {market.title}
          </h3>

          {/* Description */}
          <p className="text-muted-foreground text-sm line-clamp-3">
            {market.description}
          </p>

          {/* Odds Display */}
          <div className="grid grid-cols-2 gap-3">
            <div className="p-3 rounded-lg bg-success-500/10 border border-success-500/20">
              <div className="text-xs text-success-400 font-medium">YES</div>
              <div className="text-lg font-bold text-success-400">{market.yesOdds}%</div>
            </div>
            <div className="p-3 rounded-lg bg-error-500/10 border border-error-500/20">
              <div className="text-xs text-error-400 font-medium">NO</div>
              <div className="text-lg font-bold text-error-400">{market.noOdds}%</div>
            </div>
          </div>

          {/* Market Stats */}
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <div className="flex items-center space-x-1">
              <Calendar className="w-3 h-3" />
              <span>Ends {formatDate(market.endDate)}</span>
            </div>
            <div className="flex items-center space-x-1">
              <Users className="w-3 h-3" />
              <span>{market.participants} traders</span>
            </div>
          </div>

          {/* Volume */}
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Total Volume</span>
            <span className="text-sm font-semibold text-zenith-400">{formatVolume(market.totalVolume)}</span>
          </div>
        </div>

        {/* Action Buttons for Desktop */}
        <div className="hidden md:flex absolute bottom-6 left-6 right-6 justify-center space-x-4">
          <button
            onClick={() => onSwipe('left', market)}
            className="w-14 h-14 rounded-full bg-error-500/20 border-2 border-error-500/30 flex items-center justify-center text-error-400 hover:bg-error-500/30 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>

          <button
            onClick={() => onPass(market)}
            className="w-12 h-12 rounded-full bg-muted/20 border-2 border-border/30 flex items-center justify-center text-muted-foreground hover:bg-muted/30 transition-colors"
          >
            <MoreHorizontal className="w-5 h-5" />
          </button>

          <button
            onClick={() => onSwipe('right', market)}
            className="w-14 h-14 rounded-full bg-success-500/20 border-2 border-success-500/30 flex items-center justify-center text-success-400 hover:bg-success-500/30 transition-colors"
          >
            <Check className="w-6 h-6" />
          </button>
        </div>
      </div>
    </motion.div>
  );
};