'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Calendar, TrendingUp, Users, X, Check, MoreHorizontal, Zap, Vibrate } from 'lucide-react';
import { Market, MarketCategory } from '@/types/market';

interface MobileSwipeEnhancedProps {
  market: Market;
  onSwipe: (direction: 'left' | 'right', market: Market) => void;
  onPass: (market: Market) => void;
  isActive: boolean;
  style?: React.CSSProperties;
}

// Mobile-specific swipe thresholds
const MOBILE_SWIPE_THRESHOLD = 80;
const MOBILE_VELOCITY_THRESHOLD = 0.5;
const HAPTIC_FEEDBACK_THRESHOLD = 50;

// Enhanced touch event handling for mobile
interface TouchState {
  startX: number;
  startY: number;
  currentX: number;
  currentY: number;
  deltaX: number;
  deltaY: number;
  velocity: number;
  timestamp: number;
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

export const MobileSwipeEnhanced: React.FC<MobileSwipeEnhancedProps> = ({
  market,
  onSwipe,
  onPass,
  isActive,
  style,
}) => {
  const [touchState, setTouchState] = useState<TouchState | null>(null);
  const [isSwiping, setIsSwiping] = useState(false);
  const [hapticTriggered, setHapticTriggered] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);

  // Haptic feedback for mobile devices
  const triggerHaptic = useCallback((type: 'light' | 'medium' | 'heavy' = 'light') => {
    if ('vibrate' in navigator) {
      const patterns = {
        light: [10],
        medium: [20],
        heavy: [30, 10, 30],
      };
      navigator.vibrate(patterns[type]);
    }
  }, []);

  // Enhanced touch start handler
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (!isActive) return;

    const touch = e.touches[0];
    const now = Date.now();

    setTouchState({
      startX: touch.clientX,
      startY: touch.clientY,
      currentX: touch.clientX,
      currentY: touch.clientY,
      deltaX: 0,
      deltaY: 0,
      velocity: 0,
      timestamp: now,
    });

    setIsSwiping(true);
    setHapticTriggered(false);

    // Light haptic feedback on touch start
    triggerHaptic('light');
  }, [isActive, triggerHaptic]);

  // Enhanced touch move handler with velocity calculation
  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (!touchState || !isActive) return;

    const touch = e.touches[0];
    const now = Date.now();
    const deltaTime = now - touchState.timestamp;

    const deltaX = touch.clientX - touchState.startX;
    const deltaY = touch.clientY - touchState.startY;
    const velocity = deltaTime > 0 ? Math.abs(deltaX) / deltaTime : 0;

    setTouchState(prev => prev ? {
      ...prev,
      currentX: touch.clientX,
      currentY: touch.clientY,
      deltaX,
      deltaY,
      velocity,
    } : null);

    // Trigger haptic feedback when reaching threshold
    if (!hapticTriggered && Math.abs(deltaX) > HAPTIC_FEEDBACK_THRESHOLD) {
      triggerHaptic('medium');
      setHapticTriggered(true);
    }

    // Prevent scrolling when swiping horizontally
    if (Math.abs(deltaX) > Math.abs(deltaY)) {
      e.preventDefault();
    }
  }, [touchState, isActive, hapticTriggered, triggerHaptic]);

  // Enhanced touch end handler with velocity-based decisions
  const handleTouchEnd = useCallback(() => {
    if (!touchState || !isActive) {
      setIsSwiping(false);
      setTouchState(null);
      return;
    }

    const { deltaX, deltaY, velocity } = touchState;
    const absX = Math.abs(deltaX);
    const absY = Math.abs(deltaY);

    // Determine action based on swipe distance and velocity
    if (absX > MOBILE_SWIPE_THRESHOLD || velocity > MOBILE_VELOCITY_THRESHOLD) {
      const direction = deltaX > 0 ? 'right' : 'left';
      triggerHaptic('heavy');
      onSwipe(direction, market);
    } else if (deltaY < -MOBILE_SWIPE_THRESHOLD) {
      triggerHaptic('medium');
      onPass(market);
    }

    setIsSwiping(false);
    setTouchState(null);
    setHapticTriggered(false);
  }, [touchState, isActive, onSwipe, onPass, market, triggerHaptic]);

  // Prevent default touch behaviors that might interfere
  useEffect(() => {
    const preventDefaults = (e: TouchEvent) => {
      if (isSwiping) {
        e.preventDefault();
      }
    };

    if (cardRef.current) {
      cardRef.current.addEventListener('touchmove', preventDefaults, { passive: false });
    }

    return () => {
      if (cardRef.current) {
        cardRef.current.removeEventListener('touchmove', preventDefaults);
      }
    };
  }, [isSwiping]);

  const getTimeLeft = (deadline: string | Date | undefined) => {
    if (!deadline) return 'No deadline';

    const now = new Date().getTime();
    const end = new Date(deadline).getTime();
    const diff = end - now;

    if (diff <= 0) return 'Ended';

    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));

    if (days > 0) {
      return `${days}d ${hours}h`;
    }
    return `${hours}h`;
  };

  const formatVolume = (volume: number | undefined) => {
    if (!volume) return '$0';
    if (volume >= 1000000) return `$${(volume / 1000000).toFixed(1)}M`;
    if (volume >= 1000) return `$${(volume / 1000).toFixed(1)}K`;
    return `$${volume}`;
  };

  // Calculate transform values for smooth animation
  const deltaX = touchState?.deltaX || 0;
  const deltaY = touchState?.deltaY || 0;
  const rotation = deltaX * 0.08; // Reduced rotation for mobile
  const scale = isSwiping ? 0.98 : 1;
  const opacity = Math.max(0.8, 1 - Math.abs(deltaX) / 200);

  // Calculate swipe progress for visual feedback
  const swipeProgress = Math.min(Math.abs(deltaX) / MOBILE_SWIPE_THRESHOLD, 1);

  return (
    <div
      ref={cardRef}
      className={`
        absolute inset-0 select-none touch-none
        ${isActive ? 'z-10' : 'z-0'}
      `}
      style={{
        ...style,
        transform: `translate(${deltaX}px, ${deltaY}px) rotate(${rotation}deg) scale(${scale})`,
        opacity,
        transition: isSwiping ? 'none' : 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
      }}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      <div className="glass-card h-full w-full p-4 sm:p-6 flex flex-col relative overflow-hidden">
        {/* Swipe Indicators with Progress */}
        {deltaX > 20 && (
          <div
            className="absolute top-4 right-4 bg-success-500/20 border border-success-500/50 rounded-full p-2 transition-all"
            style={{
              opacity: swipeProgress,
              transform: `scale(${0.8 + swipeProgress * 0.4})`,
            }}
          >
            <Check className="w-5 h-5 sm:w-6 sm:h-6 text-success-400" />
          </div>
        )}
        {deltaX < -20 && (
          <div
            className="absolute top-4 right-4 bg-error-500/20 border border-error-500/50 rounded-full p-2 transition-all"
            style={{
              opacity: swipeProgress,
              transform: `scale(${0.8 + swipeProgress * 0.4})`,
            }}
          >
            <X className="w-5 h-5 sm:w-6 sm:h-6 text-error-400" />
          </div>
        )}
        {deltaY < -20 && (
          <div
            className="absolute top-4 right-4 bg-warning-500/20 border border-warning-500/50 rounded-full p-2 transition-all"
            style={{
              opacity: Math.min(Math.abs(deltaY) / MOBILE_SWIPE_THRESHOLD, 1),
            }}
          >
            <MoreHorizontal className="w-5 h-5 sm:w-6 sm:h-6 text-warning-400" />
          </div>
        )}

        {/* Header */}
        <div className="flex items-start justify-between mb-3 sm:mb-4">
          <div className="flex-1">
            <div className="flex items-center space-x-2 sm:space-x-3 mb-2">
              <span className={`px-2 py-1 rounded-full text-xs font-medium border ${categoryColors[market.category as MarketCategory] || categoryColors[MarketCategory.OTHER]}`}>
                {market.category.replace('_', ' ').toUpperCase()}
              </span>
              <div className="flex items-center space-x-1 text-xs text-muted-foreground">
                <Calendar className="w-3 h-3" />
                <span>{getTimeLeft(market.resolution_date)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Question - Mobile Optimized */}
        <div className="flex-1 mb-4 sm:mb-6">
          <h2 className="text-lg sm:text-xl font-bold text-foreground mb-2 sm:mb-3 leading-tight">
            {market.question}
          </h2>
          <p className="text-muted-foreground text-sm line-clamp-2 sm:line-clamp-3">
            {market.description}
          </p>
        </div>

        {/* Current Odds - Mobile Layout */}
        {market.type === 'binary' && (
          <div className="mb-4 sm:mb-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-foreground">Current Odds</span>
              <span className="text-xs text-muted-foreground">
                {formatVolume(market.total_volume)} vol
              </span>
            </div>
            <div className="flex space-x-2">
              <div className="flex-1 bg-success-500/20 rounded-lg p-2 sm:p-3 text-center">
                <div className="text-base sm:text-lg font-bold text-success-400">
                  {((market.yes_price || 0.5) * 100).toFixed(0)}%
                </div>
                <div className="text-xs text-muted-foreground">YES</div>
              </div>
              <div className="flex-1 bg-error-500/20 rounded-lg p-2 sm:p-3 text-center">
                <div className="text-base sm:text-lg font-bold text-error-400">
                  {((1 - (market.yes_price || 0.5)) * 100).toFixed(0)}%
                </div>
                <div className="text-xs text-muted-foreground">NO</div>
              </div>
            </div>
          </div>
        )}

        {/* Stats - Compact Mobile Layout */}
        <div className="grid grid-cols-2 gap-3 sm:gap-4 mb-4 sm:mb-6">
          <div className="flex items-center space-x-2">
            <TrendingUp className="w-4 h-4 text-zenith-400" />
            <div>
              <div className="text-sm font-medium">{formatVolume(market.total_volume)}</div>
              <div className="text-xs text-muted-foreground">Volume</div>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <Users className="w-4 h-4 text-info-400" />
            <div>
              <div className="text-sm font-medium">{market.participants || 0}</div>
              <div className="text-xs text-muted-foreground">Traders</div>
            </div>
          </div>
        </div>

        {/* Privacy Badge */}
        {market.privacy_level && market.privacy_level !== 'public' && (
          <div className="flex items-center justify-center mb-4">
            <div className="flex items-center space-x-2 px-3 py-1 bg-zenith-500/20 border border-zenith-500/30 rounded-full">
              <Zap className="w-3 h-3 text-zenith-400" />
              <span className="text-xs text-zenith-400 font-medium">
                {market.privacy_level === 'private' ? 'Fully Private' : 'Semi-Private'}
              </span>
            </div>
          </div>
        )}

        {/* Mobile Action Buttons */}
        <div className="flex space-x-2 sm:space-x-3">
          <button
            onClick={() => onSwipe('left', market)}
            className="flex-1 py-2 sm:py-3 bg-error-500/20 border border-error-500/30 rounded-lg hover:bg-error-500/30 transition-colors active:scale-95"
            disabled={!isActive}
          >
            <div className="flex items-center justify-center space-x-1 sm:space-x-2">
              <X className="w-4 h-4 sm:w-5 sm:h-5 text-error-400" />
              <span className="text-error-400 font-medium text-sm sm:text-base">No</span>
            </div>
          </button>
          <button
            onClick={() => onPass(market)}
            className="px-3 sm:px-4 py-2 sm:py-3 bg-warning-500/20 border border-warning-500/30 rounded-lg hover:bg-warning-500/30 transition-colors active:scale-95"
            disabled={!isActive}
          >
            <MoreHorizontal className="w-4 h-4 sm:w-5 sm:h-5 text-warning-400" />
          </button>
          <button
            onClick={() => onSwipe('right', market)}
            className="flex-1 py-2 sm:py-3 bg-success-500/20 border border-success-500/30 rounded-lg hover:bg-success-500/30 transition-colors active:scale-95"
            disabled={!isActive}
          >
            <div className="flex items-center justify-center space-x-1 sm:space-x-2">
              <Check className="w-4 h-4 sm:w-5 sm:h-5 text-success-400" />
              <span className="text-success-400 font-medium text-sm sm:text-base">Yes</span>
            </div>
          </button>
        </div>

        {/* Mobile Swipe Instructions */}
        <div className="mt-3 text-center">
          <p className="text-xs text-muted-foreground">
            Swipe or tap to predict • Pull up to pass
          </p>
          {isSwiping && (
            <div className="mt-1">
              <Vibrate className="w-3 h-3 text-zenith-400 mx-auto animate-pulse" />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};