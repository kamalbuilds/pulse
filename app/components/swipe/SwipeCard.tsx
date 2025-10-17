'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Calendar, TrendingUp, Users, X, Check, MoreHorizontal, Heart, Zap, AlertTriangle } from 'lucide-react';
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
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [startPos, setStartPos] = useState({ x: 0, y: 0 });
  const cardRef = useRef<HTMLDivElement>(null);

  const handleMouseDown = (e: React.MouseEvent) => {
    if (!isActive) return;
    setIsDragging(true);
    setStartPos({ x: e.clientX, y: e.clientY });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging || !isActive) return;
    const offset = {
      x: e.clientX - startPos.x,
      y: e.clientY - startPos.y,
    };
    setDragOffset(offset);
  };

  const handleMouseUp = () => {
    if (!isDragging || !isActive) return;
    setIsDragging(false);

    const threshold = 100;
    if (Math.abs(dragOffset.x) > threshold) {
      const direction = dragOffset.x > 0 ? 'right' : 'left';
      onSwipe(direction, market);
    } else if (dragOffset.y < -threshold) {
      onPass(market);
    }

    setDragOffset({ x: 0, y: 0 });
  };

  // Touch events for mobile
  const handleTouchStart = (e: React.TouchEvent) => {
    if (!isActive) return;
    const touch = e.touches[0];
    setIsDragging(true);
    setStartPos({ x: touch.clientX, y: touch.clientY });
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDragging || !isActive) return;
    const touch = e.touches[0];
    const offset = {
      x: touch.clientX - startPos.x,
      y: touch.clientY - startPos.y,
    };
    setDragOffset(offset);
  };

  const handleTouchEnd = () => {
    if (!isDragging || !isActive) return;
    setIsDragging(false);

    const threshold = 100;
    if (Math.abs(dragOffset.x) > threshold) {
      const direction = dragOffset.x > 0 ? 'right' : 'left';
      onSwipe(direction, market);
    } else if (dragOffset.y < -threshold) {
      onPass(market);
    }

    setDragOffset({ x: 0, y: 0 });
  };

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

  const rotation = dragOffset.x * 0.1;
  const opacity = Math.max(0.7, 1 - Math.abs(dragOffset.x) / 300);

  return (
    <div
      ref={cardRef}
      className={`absolute inset-0 cursor-grab active:cursor-grabbing ${isActive ? 'z-10' : 'z-0'}`}
      style={{
        ...style,
        transform: `translate(${dragOffset.x}px, ${dragOffset.y}px) rotate(${rotation}deg)`,
        opacity,
        transition: isDragging ? 'none' : 'all 0.3s ease-out',
      }}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      <div className="glass-card h-full w-full p-6 flex flex-col relative overflow-hidden">
        {/* Swipe Indicators */}
        {dragOffset.x > 50 && (
          <div className="absolute top-4 right-4 bg-success-500/20 border border-success-500/50 rounded-full p-2">
            <Check className="w-6 h-6 text-success-400" />
          </div>
        )}
        {dragOffset.x < -50 && (
          <div className="absolute top-4 right-4 bg-error-500/20 border border-error-500/50 rounded-full p-2">
            <X className="w-6 h-6 text-error-400" />
          </div>
        )}
        {dragOffset.y < -50 && (
          <div className="absolute top-4 right-4 bg-warning-500/20 border border-warning-500/50 rounded-full p-2">
            <MoreHorizontal className="w-6 h-6 text-warning-400" />
          </div>
        )}

        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex-1">
            <div className="flex items-center space-x-3 mb-2">
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

        {/* Question */}
        <div className="flex-1 mb-6">
          <h2 className="text-xl font-bold text-foreground mb-3 leading-tight">
            {market.question}
          </h2>
          <p className="text-muted-foreground text-sm line-clamp-3">
            {market.description}
          </p>
        </div>

        {/* Current Odds */}
        {market.type === 'binary' && (
          <div className="mb-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-foreground">Current Odds</span>
              <span className="text-xs text-muted-foreground">
                {formatVolume(market.total_volume)} volume
              </span>
            </div>
            <div className="flex space-x-2">
              <div className="flex-1 bg-success-500/20 rounded-lg p-3 text-center">
                <div className="text-lg font-bold text-success-400">
                  {((market.yes_price || 0.5) * 100).toFixed(0)}%
                </div>
                <div className="text-xs text-muted-foreground">YES</div>
              </div>
              <div className="flex-1 bg-error-500/20 rounded-lg p-3 text-center">
                <div className="text-lg font-bold text-error-400">
                  {((1 - (market.yes_price || 0.5)) * 100).toFixed(0)}%
                </div>
                <div className="text-xs text-muted-foreground">NO</div>
              </div>
            </div>
          </div>
        )}

        {/* Stats */}
        <div className="grid grid-cols-2 gap-4 mb-6">
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

        {/* Action Buttons */}
        <div className="flex space-x-3">
          <button
            onClick={() => onSwipe('left', market)}
            className="flex-1 py-3 bg-error-500/20 border border-error-500/30 rounded-lg hover:bg-error-500/30 transition-colors"
            disabled={!isActive}
          >
            <div className="flex items-center justify-center space-x-2">
              <X className="w-5 h-5 text-error-400" />
              <span className="text-error-400 font-medium">No</span>
            </div>
          </button>
          <button
            onClick={() => onPass(market)}
            className="px-4 py-3 bg-warning-500/20 border border-warning-500/30 rounded-lg hover:bg-warning-500/30 transition-colors"
            disabled={!isActive}
          >
            <MoreHorizontal className="w-5 h-5 text-warning-400" />
          </button>
          <button
            onClick={() => onSwipe('right', market)}
            className="flex-1 py-3 bg-success-500/20 border border-success-500/30 rounded-lg hover:bg-success-500/30 transition-colors"
            disabled={!isActive}
          >
            <div className="flex items-center justify-center space-x-2">
              <Check className="w-5 h-5 text-success-400" />
              <span className="text-success-400 font-medium">Yes</span>
            </div>
          </button>
        </div>

        {/* Swipe Instructions */}
        <div className="mt-4 text-center">
          <p className="text-xs text-muted-foreground">
            Swipe or tap to predict • Pull up to pass
          </p>
        </div>
      </div>
    </div>
  );
};