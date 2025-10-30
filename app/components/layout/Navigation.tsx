'use client';

import React from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import { TrendingUp, Zap, Trophy, User, Plus, Settings } from 'lucide-react';
import Link from 'next/link';

export const Navigation: React.FC = () => {
  const { connected } = useWallet();

  return (
    <nav className="sticky top-0 z-50 border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-16 items-center justify-between">
        {/* Logo */}
        <div className="flex items-center space-x-2">
          <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-gradient-to-r from-zenith-500 to-zenith-600">
            <Zap className="w-5 h-5 text-white" />
          </div>
          <span className="text-xl font-bold gradient-text">SolanaVibes</span>
        </div>

        {/* Navigation Links */}
        <div className="hidden md:flex items-center space-x-6">
          <Link
            href="/"
            className="flex items-center space-x-2 text-muted-foreground hover:text-foreground transition-colors"
          >
            <TrendingUp className="w-4 h-4" />
            <span>Markets</span>
          </Link>
          {connected && (
            <>
              <Link
                href="/create"
                className="flex items-center space-x-2 text-muted-foreground hover:text-foreground transition-colors"
              >
                <Plus className="w-4 h-4" />
                <span>Create</span>
              </Link>
              <Link
                href="/manage"
                className="flex items-center space-x-2 text-muted-foreground hover:text-foreground transition-colors"
              >
                <Settings className="w-4 h-4" />
                <span>Manage</span>
              </Link>
            </>
          )}
          <a
            href="#"
            className="flex items-center space-x-2 text-muted-foreground hover:text-foreground transition-colors"
          >
            <Trophy className="w-4 h-4" />
            <span>Leaderboard</span>
          </a>
          <a
            href="#"
            className="flex items-center space-x-2 text-muted-foreground hover:text-foreground transition-colors"
          >
            <User className="w-4 h-4" />
            <span>Profile</span>
          </a>
        </div>

        {/* Wallet Connection */}
        <div className="flex items-center space-x-4">
          {connected && (
            <div className="hidden sm:flex items-center space-x-2 px-3 py-1.5 rounded-lg bg-success-500/10 border border-success-500/20">
              <div className="w-2 h-2 rounded-full bg-success-500 animate-pulse" />
              <span className="text-sm text-success-400 font-medium">Connected</span>
            </div>
          )}
          <WalletMultiButton className="!bg-zenith-500 !rounded-lg hover:!bg-zenith-600 transition-colors" />
        </div>
      </div>
    </nav>
  );
};