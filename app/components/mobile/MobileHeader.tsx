'use client';

import React, { useState } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import { Menu, X, Zap, Bell, Settings } from 'lucide-react';
import Link from 'next/link';

export const MobileHeader: React.FC = () => {
  const { connected } = useWallet();
  const [showMenu, setShowMenu] = useState(false);

  return (
    <>
      <header className="sticky top-0 z-50 border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 md:hidden">
        <div className="flex h-16 items-center justify-between px-4">
          {/* Logo */}
          <Link href="/" className="flex items-center space-x-2">
            <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-gradient-to-r from-zenith-500 to-zenith-600">
              <Zap className="w-5 h-5 text-white" />
            </div>
            <span className="text-lg font-bold gradient-text">SolanaVibes</span>
          </Link>

          {/* Actions */}
          <div className="flex items-center space-x-2">
            {connected && (
              <>
                <button className="p-2 rounded-lg hover:bg-muted transition-colors">
                  <Bell className="w-5 h-5 text-muted-foreground" />
                </button>
                <button className="p-2 rounded-lg hover:bg-muted transition-colors">
                  <Settings className="w-5 h-5 text-muted-foreground" />
                </button>
              </>
            )}

            <button
              onClick={() => setShowMenu(!showMenu)}
              className="p-2 rounded-lg hover:bg-muted transition-colors"
            >
              {showMenu ? (
                <X className="w-5 h-5" />
              ) : (
                <Menu className="w-5 h-5" />
              )}
            </button>
          </div>
        </div>

        {/* Status Indicator */}
        {connected && (
          <div className="px-4 pb-2">
            <div className="flex items-center space-x-2 px-3 py-1 rounded-full bg-success-500/10 border border-success-500/20 w-fit">
              <div className="w-1.5 h-1.5 rounded-full bg-success-500 animate-pulse" />
              <span className="text-xs text-success-400 font-medium">Connected</span>
            </div>
          </div>
        )}
      </header>

      {/* Mobile Menu Overlay */}
      {showMenu && (
        <>
          <div
            className="fixed inset-0 z-40 bg-black/50 md:hidden"
            onClick={() => setShowMenu(false)}
          />
          <div className="fixed top-16 right-0 z-50 w-64 h-[calc(100vh-4rem)] bg-background border-l border-border md:hidden">
            <div className="flex flex-col h-full">
              {/* Wallet Connection */}
              <div className="p-4 border-b border-border">
                <WalletMultiButton className="!w-full !bg-zenith-500 !rounded-lg hover:!bg-zenith-600 transition-colors" />
              </div>

              {/* Menu Items */}
              <div className="flex-1 overflow-y-auto py-4">
                <div className="space-y-1 px-4">
                  <Link
                    href="/"
                    onClick={() => setShowMenu(false)}
                    className="flex items-center space-x-3 px-3 py-2 rounded-lg hover:bg-muted transition-colors"
                  >
                    <span>🏠</span>
                    <span>Home</span>
                  </Link>

                  {connected && (
                    <>
                      <Link
                        href="/create"
                        onClick={() => setShowMenu(false)}
                        className="flex items-center space-x-3 px-3 py-2 rounded-lg hover:bg-muted transition-colors"
                      >
                        <span>➕</span>
                        <span>Create Market</span>
                      </Link>

                      <Link
                        href="/manage"
                        onClick={() => setShowMenu(false)}
                        className="flex items-center space-x-3 px-3 py-2 rounded-lg hover:bg-muted transition-colors"
                      >
                        <span>⚙️</span>
                        <span>Manage Markets</span>
                      </Link>
                    </>
                  )}

                  <Link
                    href="/leaderboard"
                    onClick={() => setShowMenu(false)}
                    className="flex items-center space-x-3 px-3 py-2 rounded-lg hover:bg-muted transition-colors"
                  >
                    <span>🏆</span>
                    <span>Leaderboard</span>
                  </Link>

                  <Link
                    href="/profile"
                    onClick={() => setShowMenu(false)}
                    className="flex items-center space-x-3 px-3 py-2 rounded-lg hover:bg-muted transition-colors"
                  >
                    <span>👤</span>
                    <span>Profile</span>
                  </Link>
                </div>
              </div>

              {/* Footer */}
              <div className="p-4 border-t border-border">
                <div className="text-xs text-muted-foreground text-center">
                  <p>Powered by Arcium MPC</p>
                  <p className="mt-1">Privacy-First Prediction Markets</p>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </>
  );
};