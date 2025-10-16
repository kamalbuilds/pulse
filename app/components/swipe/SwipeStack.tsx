'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { AnimatePresence } from 'framer-motion';
import { SwipeCard } from './SwipeCard';
import { PredictionModal } from './PredictionModal';
import { EncryptedVoteModal } from './EncryptedVoteModal';
import { Market, VoteChoice } from '@/types/market';

interface SwipeStackProps {
  markets: Market[];
  onSwipe: (direction: 'left' | 'right', market: Market, prediction?: { confidence: number; stakeAmount: number }) => void;
  onLoadMore: () => void;
  isLoading?: boolean;
  maxVisible?: number;
}

export const SwipeStack: React.FC<SwipeStackProps> = ({
  markets,
  onSwipe,
  onLoadMore,
  isLoading = false,
  maxVisible = 3,
}) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [removedCards, setRemovedCards] = useState<string[]>([]);
  const [showPredictionModal, setShowPredictionModal] = useState(false);
  const [showEncryptedVoteModal, setShowEncryptedVoteModal] = useState(false);
  const [pendingSwipe, setPendingSwipe] = useState<{
    direction: 'left' | 'right';
    market: Market;
  } | null>(null);
  const [useEncryption, setUseEncryption] = useState(true); // Toggle for encrypted vs regular voting

  // Load more cards when running low
  useEffect(() => {
    if (currentIndex >= markets.length - 2 && !isLoading) {
      onLoadMore();
    }
  }, [currentIndex, markets.length, isLoading, onLoadMore]);

  const handleSwipe = useCallback((direction: 'left' | 'right', market: Market) => {
    if (direction === 'right') {
      // Show appropriate modal for YES votes
      setPendingSwipe({ direction, market });
      if (useEncryption) {
        setShowEncryptedVoteModal(true);
      } else {
        setShowPredictionModal(true);
      }
    } else {
      // For NO votes, also use encrypted voting if enabled
      if (useEncryption) {
        setPendingSwipe({ direction, market });
        setShowEncryptedVoteModal(true);
      } else {
        // Direct NO vote without encryption
        onSwipe(direction, market);
        setRemovedCards(prev => [...prev, market.id]);
        setCurrentIndex(prev => prev + 1);
      }
    }
  }, [onSwipe, useEncryption]);

  const handleConfirmPrediction = useCallback((confidence: number, stakeAmount: number) => {
    if (pendingSwipe) {
      onSwipe(pendingSwipe.direction, pendingSwipe.market, { confidence, stakeAmount });
      setRemovedCards(prev => [...prev, pendingSwipe.market.id]);
      setCurrentIndex(prev => prev + 1);
    }
    setShowPredictionModal(false);
    setPendingSwipe(null);
  }, [pendingSwipe, onSwipe]);

  const handleEncryptedVoteSubmitted = useCallback((success: boolean, signature?: string) => {
    if (success && pendingSwipe) {
      // For encrypted votes, we don't pass prediction details to avoid data leaks
      onSwipe(pendingSwipe.direction, pendingSwipe.market);
      setRemovedCards(prev => [...prev, pendingSwipe.market.id]);
      setCurrentIndex(prev => prev + 1);
    }
    setShowEncryptedVoteModal(false);
    setPendingSwipe(null);
  }, [pendingSwipe, onSwipe]);

  const handlePass = useCallback((market: Market) => {
    setRemovedCards(prev => [...prev, market.id]);
    setCurrentIndex(prev => prev + 1);
  }, []);

  const getVisibleMarkets = () => {
    return markets
      .slice(currentIndex, currentIndex + maxVisible)
      .filter(market => !removedCards.includes(market.id));
  };

  const visibleMarkets = getVisibleMarkets();

  // Calculate card styles for stacking effect
  const getCardStyle = (index: number) => {
    const scale = 1 - (index * 0.05);
    const translateY = index * 8;
    const opacity = index === 0 ? 1 : 0.7;

    return {
      transform: `scale(${scale}) translateY(${translateY}px)`,
      zIndex: maxVisible - index,
      opacity,
    };
  };

  if (visibleMarkets.length === 0 && !isLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-full space-y-4 p-8">
        <div className="w-24 h-24 rounded-full bg-muted/20 flex items-center justify-center">
          <div className="w-12 h-12 border-4 border-zenith-500 border-t-transparent rounded-full animate-spin" />
        </div>
        <h3 className="text-xl font-semibold text-foreground">Loading Markets...</h3>
        <p className="text-muted-foreground text-center">
          Finding the best prediction opportunities for you
        </p>
      </div>
    );
  }

  return (
    <div className="relative w-full h-full">
      {/* Card Stack */}
      <div className="relative w-full h-full">
        <AnimatePresence mode="sync">
          {visibleMarkets.map((market, index) => (
            <SwipeCard
              key={market.id}
              market={market}
              onSwipe={handleSwipe}
              onPass={handlePass}
              isActive={index === 0}
              style={getCardStyle(index)}
            />
          ))}
        </AnimatePresence>
      </div>

      {/* Loading indicator when fetching more */}
      {isLoading && visibleMarkets.length > 0 && (
        <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2">
          <div className="px-4 py-2 bg-black/80 rounded-full text-white text-sm">
            Loading more markets...
          </div>
        </div>
      )}

      {/* Empty state when no more markets */}
      {visibleMarkets.length === 0 && !isLoading && currentIndex > 0 && (
        <div className="flex flex-col items-center justify-center h-full space-y-4 p-8">
          <div className="w-24 h-24 rounded-full bg-success-500/20 flex items-center justify-center">
            <div className="w-12 h-12 text-success-400">
              🎉
            </div>
          </div>
          <h3 className="text-xl font-semibold text-foreground">All Caught Up!</h3>
          <p className="text-muted-foreground text-center">
            You've reviewed all available markets. Check back later for new opportunities!
          </p>
          <button
            onClick={() => {
              setCurrentIndex(0);
              setRemovedCards([]);
            }}
            className="px-6 py-2 bg-zenith-500 text-white rounded-lg hover:bg-zenith-600 transition-colors"
          >
            Start Over
          </button>
        </div>
      )}

      {/* Privacy Toggle */}
      <div className="absolute top-4 right-4 z-10">
        <button
          onClick={() => setUseEncryption(!useEncryption)}
          className={`px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
            useEncryption
              ? 'bg-zenith-500/20 border border-zenith-500/30 text-zenith-400'
              : 'bg-muted/20 border border-border/30 text-muted-foreground'
          }`}
        >
          {useEncryption ? '🔒 Private' : '👁️ Public'}
        </button>
      </div>

      {/* Prediction Modal */}
      {showPredictionModal && pendingSwipe && (
        <PredictionModal
          market={pendingSwipe.market}
          onConfirm={handleConfirmPrediction}
          onCancel={() => {
            setShowPredictionModal(false);
            setPendingSwipe(null);
          }}
        />
      )}

      {/* Encrypted Vote Modal */}
      {showEncryptedVoteModal && pendingSwipe && (
        <EncryptedVoteModal
          isOpen={showEncryptedVoteModal}
          onClose={() => {
            setShowEncryptedVoteModal(false);
            setPendingSwipe(null);
          }}
          market={pendingSwipe.market}
          voteChoice={pendingSwipe.direction === 'right' ? VoteChoice.Yes : VoteChoice.No}
          onVoteSubmitted={handleEncryptedVoteSubmitted}
        />
      )}
    </div>
  );
};