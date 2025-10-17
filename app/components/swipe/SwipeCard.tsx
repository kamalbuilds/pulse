'use client';

import React, { useState, useRef, useEffect } from 'react';
import { motion, PanInfo, useMotionValue, useTransform, useAnimation, AnimatePresence } from 'framer-motion';
import { Calendar, TrendingUp, Users, X, Check, MoreHorizontal, Heart, Zap, AlertTriangle } from 'lucide-react';
import { Market, MarketCategory } from '@/types/market';

interface SwipeCardProps {
  market: Market;
  onSwipe: (direction: 'left' | 'right', market: Market) => void;
  onPass: (market: Market) => void;
  isActive: boolean;
  style?: React.CSSProperties;
}

// Enhanced swipe directions with animations
type SwipeDirection = 'left' | 'right' | 'up' | 'down';

// Particle effect for swipe feedback
interface Particle {
  id: number;
  x: number;
  y: number;
  velocity: { x: number; y: number };
  life: number;
  maxLife: number;
  color: string;
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
  const [isHovered, setIsHovered] = useState(false);
  const [swipeDirection, setSwipeDirection] = useState<SwipeDirection | null>(null);
  const [particles, setParticles] = useState<Particle[]>([]);
  const [showPulse, setShowPulse] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);
  const animationRef = useRef<number | null>(null);
  const controls = useAnimation();

  // Motion values for enhanced animations
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const rotate = useTransform(x, [-300, 300], [-45, 45]);
  const rotateY = useTransform(y, [-100, 100], [-15, 15]);
  const scale = useTransform(x, [-300, 0, 300], [0.8, 1, 0.8]);

  // Enhanced swipe indicators with multiple states
  const yesOpacity = useTransform(x, [0, 100, 200], [0, 0.7, 1]);
  const noOpacity = useTransform(x, [-200, -100, 0], [1, 0.7, 0]);
  const superOpacity = useTransform(x, [200, 300], [0, 1]); // Super YES
  const passOpacity = useTransform(y, [-150, -50], [1, 0]); // Pass (swipe up)

  // Particle animation system
  useEffect(() => {
    if (particles.length === 0) return;

    const animate = () => {
      setParticles(prevParticles =>
        prevParticles
          .map(particle => ({
            ...particle,
            x: particle.x + particle.velocity.x,
            y: particle.y + particle.velocity.y,
            life: particle.life - 1,
            velocity: {
              x: particle.velocity.x * 0.98,
              y: particle.velocity.y * 0.98 + 0.2 // gravity
            }
          }))
          .filter(particle => particle.life > 0)
      );

      if (particles.some(p => p.life > 0)) {
        animationRef.current = requestAnimationFrame(animate);
      }
    };

    animationRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [particles]);

  // Generate particles for swipe feedback
  const createParticles = (centerX: number, centerY: number, color: string, count: number = 15) => {
    const newParticles: Particle[] = Array.from({ length: count }, (_, i) => ({
      id: Date.now() + i,
      x: centerX,
      y: centerY,
      velocity: {
        x: (Math.random() - 0.5) * 8,
        y: (Math.random() - 0.5) * 8 - 2
      },
      life: 60,
      maxLife: 60,
      color
    }));

    setParticles(prev => [...prev, ...newParticles]);
  };

  const handleDragStart = () => {
    setIsDragging(true);
    setShowPulse(true);
  };

  const handleDrag = (event: any, info: PanInfo) => {
    const newDirection: SwipeDirection | null =
      Math.abs(info.offset.x) > Math.abs(info.offset.y)
        ? (info.offset.x > 0 ? 'right' : 'left')
        : (info.offset.y < 0 ? 'up' : 'down');

    setSwipeDirection(newDirection);

    // Haptic feedback simulation (would use actual haptics on mobile)
    if (Math.abs(info.offset.x) > 150 || Math.abs(info.offset.y) > 100) {
      if (!showPulse) {
        setShowPulse(true);
        // Simulate haptic feedback
        navigator.vibrate?.(50);
      }
    } else {
      setShowPulse(false);
    }
  };

  const handleDragEnd = async (event: any, info: PanInfo) => {
    setIsDragging(false);
    setSwipeDirection(null);
    setShowPulse(false);

    const xThreshold = 120;
    const yThreshold = 80;
    const superThreshold = 250;

    const rect = cardRef.current?.getBoundingClientRect();
    const centerX = rect ? rect.left + rect.width / 2 : 0;
    const centerY = rect ? rect.top + rect.height / 2 : 0;

    // Handle different swipe gestures
    if (info.offset.x > superThreshold) {
      // Super YES - extra confident
      createParticles(centerX, centerY, '#10b981', 25);
      await controls.start({
        x: 400,
        rotate: 30,
        scale: 1.1,
        transition: { duration: 0.3, ease: 'easeOut' }
      });
      onSwipe('right', market);
    } else if (info.offset.x > xThreshold) {
      // Regular YES
      createParticles(centerX, centerY, '#10b981', 15);
      await controls.start({
        x: 300,
        rotate: 20,
        transition: { duration: 0.2, ease: 'easeOut' }
      });
      onSwipe('right', market);
    } else if (info.offset.x < -superThreshold) {
      // Super NO - extra confident
      createParticles(centerX, centerY, '#ef4444', 25);
      await controls.start({
        x: -400,
        rotate: -30,
        scale: 1.1,
        transition: { duration: 0.3, ease: 'easeOut' }
      });
      onSwipe('left', market);
    } else if (info.offset.x < -xThreshold) {
      // Regular NO
      createParticles(centerX, centerY, '#ef4444', 15);
      await controls.start({
        x: -300,
        rotate: -20,
        transition: { duration: 0.2, ease: 'easeOut' }
      });
      onSwipe('left', market);
    } else if (info.offset.y < -yThreshold) {
      // Pass/Skip (swipe up)
      createParticles(centerX, centerY, '#6b7280', 10);
      await controls.start({
        y: -200,
        scale: 0.8,
        opacity: 0,
        transition: { duration: 0.2, ease: 'easeOut' }
      });
      onPass(market);
    } else {
      // Return to center with spring animation
      await controls.start({
        x: 0,
        y: 0,
        rotate: 0,
        scale: 1,
        transition: {
          type: 'spring',
          stiffness: 300,
          damping: 20
        }
      });
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
      ref={cardRef}
      className={`absolute inset-0 cursor-grab active:cursor-grabbing ${showPulse ? 'animate-pulse' : ''}`}
      style={{ ...style }}
      animate={controls}
      drag={isActive ? true : false}
      dragConstraints={{ left: -50, right: 50, top: -50, bottom: 50 }}
      dragElastic={0.1}
      onDragStart={handleDragStart}
      onDrag={handleDrag}
      onDragEnd={handleDragEnd}
      onHoverStart={() => setIsHovered(true)}
      onHoverEnd={() => setIsHovered(false)}
      whileHover={{ scale: isActive ? 1.02 : 1 }}
      whileTap={{ scale: 0.98 }}
      initial={{ scale: 0.9, opacity: 0, y: 50 }}
      animate={{ scale: 1, opacity: 1, y: 0 }}
      exit={{ scale: 0.8, opacity: 0, y: -50 }}
      transition={{ duration: 0.4, ease: 'easeOut' }}
    >
      {/* Particle Effects */}
      <AnimatePresence>
        {particles.map(particle => (
          <motion.div
            key={particle.id}
            className="absolute w-2 h-2 rounded-full pointer-events-none z-50"
            style={{
              backgroundColor: particle.color,
              left: particle.x,
              top: particle.y,
            }}
            initial={{ scale: 1, opacity: 1 }}
            animate={{ scale: 0, opacity: 0 }}
            transition={{ duration: particle.maxLife / 60 }}
          />
        ))}
      </AnimatePresence>

      {/* Card Container */}
      <motion.div
        className="h-full w-full rounded-2xl bg-card border border-border/50 shadow-2xl overflow-hidden relative"
        style={{
          rotateX: rotateY,
          transformStyle: 'preserve-3d'
        }}
      >
        {/* Enhanced Swipe Indicators */}
        <AnimatePresence>
          {isDragging && (
            <>
              {/* YES Indicator */}
              <motion.div
                className="absolute top-6 right-6 z-20 px-6 py-3 rounded-full bg-success-500 text-white font-bold text-xl transform rotate-12 shadow-lg flex items-center space-x-2"
                style={{ opacity: yesOpacity }}
                initial={{ scale: 0, rotate: 0 }}
                animate={{ scale: 1, rotate: 12 }}
                exit={{ scale: 0, rotate: 0 }}
                transition={{ type: 'spring', stiffness: 400, damping: 20 }}
              >
                <Check className="w-5 h-5" />
                <span>YES</span>
              </motion.div>

              {/* Super YES Indicator */}
              <motion.div
                className="absolute top-6 right-6 z-30 px-8 py-4 rounded-full bg-gradient-to-r from-success-400 to-success-600 text-white font-bold text-2xl transform rotate-12 shadow-xl flex items-center space-x-2"
                style={{ opacity: superOpacity }}
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                exit={{ scale: 0 }}
              >
                <Heart className="w-6 h-6" />
                <span>SUPER YES!</span>
                <Zap className="w-6 h-6" />
              </motion.div>

              {/* NO Indicator */}
              <motion.div
                className="absolute top-6 left-6 z-20 px-6 py-3 rounded-full bg-error-500 text-white font-bold text-xl transform -rotate-12 shadow-lg flex items-center space-x-2"
                style={{ opacity: noOpacity }}
                initial={{ scale: 0, rotate: 0 }}
                animate={{ scale: 1, rotate: -12 }}
                exit={{ scale: 0, rotate: 0 }}
                transition={{ type: 'spring', stiffness: 400, damping: 20 }}
              >
                <X className="w-5 h-5" />
                <span>NO</span>
              </motion.div>

              {/* PASS Indicator (swipe up) */}
              <motion.div
                className="absolute top-4 left-1/2 transform -translate-x-1/2 z-20 px-6 py-3 rounded-full bg-muted text-muted-foreground font-bold text-lg shadow-lg flex items-center space-x-2"
                style={{ opacity: passOpacity }}
                initial={{ scale: 0, y: 20 }}
                animate={{ scale: 1, y: 0 }}
                exit={{ scale: 0, y: 20 }}
              >
                <MoreHorizontal className="w-5 h-5" />
                <span>PASS</span>
              </motion.div>
            </>
          )}
        </AnimatePresence>

        {/* Swipe Direction Feedback */}
        {swipeDirection && (
          <motion.div
            className={`absolute inset-0 pointer-events-none z-10 ${
              swipeDirection === 'right' ? 'bg-success-500/10' :
              swipeDirection === 'left' ? 'bg-error-500/10' :
              swipeDirection === 'up' ? 'bg-muted/10' : 'bg-warning-500/10'
            }`}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          />
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

        {/* Enhanced Action Buttons for Desktop */}
        <motion.div
          className="hidden md:flex absolute bottom-6 left-6 right-6 justify-center space-x-6"
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: isHovered ? 1 : 0.7 }}
          transition={{ delay: 0.2 }}
        >
          {/* NO Button */}
          <motion.button
            onClick={() => {
              createParticles(200, 400, '#ef4444', 10);
              onSwipe('left', market);
            }}
            className="relative group w-16 h-16 rounded-full bg-error-500/20 border-2 border-error-500/30 flex items-center justify-center text-error-400 hover:bg-error-500/30 transition-all duration-300"
            whileHover={{ scale: 1.1, boxShadow: '0 0 20px rgba(239, 68, 68, 0.4)' }}
            whileTap={{ scale: 0.9 }}
            disabled={!isActive}
          >
            <motion.div
              whileHover={{ rotate: -10 }}
              transition={{ type: 'spring', stiffness: 400 }}
            >
              <X className="w-7 h-7" />
            </motion.div>
            <motion.div
              className="absolute inset-0 rounded-full bg-error-500/20"
              initial={false}
              animate={{ scale: isDragging && swipeDirection === 'left' ? 1.3 : 1 }}
              transition={{ type: 'spring', stiffness: 300 }}
            />
          </motion.button>

          {/* PASS Button */}
          <motion.button
            onClick={() => {
              createParticles(250, 400, '#6b7280', 8);
              onPass(market);
            }}
            className="relative group w-12 h-12 rounded-full bg-muted/20 border-2 border-border/30 flex items-center justify-center text-muted-foreground hover:bg-muted/30 transition-all duration-300"
            whileHover={{ scale: 1.1, y: -2 }}
            whileTap={{ scale: 0.9 }}
            disabled={!isActive}
          >
            <motion.div
              whileHover={{ scale: 1.2 }}
              transition={{ type: 'spring', stiffness: 400 }}
            >
              <MoreHorizontal className="w-5 h-5" />
            </motion.div>
          </motion.button>

          {/* YES Button */}
          <motion.button
            onClick={() => {
              createParticles(300, 400, '#10b981', 10);
              onSwipe('right', market);
            }}
            className="relative group w-16 h-16 rounded-full bg-success-500/20 border-2 border-success-500/30 flex items-center justify-center text-success-400 hover:bg-success-500/30 transition-all duration-300"
            whileHover={{ scale: 1.1, boxShadow: '0 0 20px rgba(16, 185, 129, 0.4)' }}
            whileTap={{ scale: 0.9 }}
            disabled={!isActive}
          >
            <motion.div
              whileHover={{ rotate: 10 }}
              transition={{ type: 'spring', stiffness: 400 }}
            >
              <Check className="w-7 h-7" />
            </motion.div>
            <motion.div
              className="absolute inset-0 rounded-full bg-success-500/20"
              initial={false}
              animate={{ scale: isDragging && swipeDirection === 'right' ? 1.3 : 1 }}
              transition={{ type: 'spring', stiffness: 300 }}
            />
          </motion.button>
        </motion.div>

        {/* Mobile Swipe Instructions */}
        <motion.div
          className="md:hidden absolute bottom-4 left-4 right-4 text-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: isActive && !isDragging ? 0.6 : 0 }}
          transition={{ delay: 1 }}
        >
          <p className="text-xs text-muted-foreground">
            Swipe left for NO • Swipe right for YES • Swipe up to PASS
          </p>
        </motion.div>

        {/* Hover Effects */}
        <AnimatePresence>
          {isHovered && isActive && (
            <motion.div
              className="absolute inset-0 rounded-2xl border-2 border-zenith-500/30 pointer-events-none"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.2 }}
            />
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
};