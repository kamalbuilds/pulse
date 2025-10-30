'use client';

import React, { useEffect, useState } from 'react';
import { WifiOff, RefreshCw, Zap, ArrowLeft } from 'lucide-react';
import Link from 'next/link';

export default function OfflinePage() {
  const [isOnline, setIsOnline] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Check initial state
    setIsOnline(navigator.onLine);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const handleRefresh = async () => {
    if (isRefreshing) return;

    setIsRefreshing(true);

    try {
      // Try to fetch a small resource to test connectivity
      await fetch('/api/health', {
        method: 'HEAD',
        cache: 'no-cache'
      });

      // If successful, reload the page
      window.location.href = '/';
    } catch (error) {
      // Still offline, show feedback
      setTimeout(() => setIsRefreshing(false), 1000);
    }
  };

  useEffect(() => {
    if (isOnline) {
      // Auto-redirect when back online
      setTimeout(() => {
        window.location.href = '/';
      }, 1000);
    }
  }, [isOnline]);

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
      <div className="max-w-md w-full text-center space-y-8">
        {/* Logo */}
        <div className="flex justify-center">
          <div className="flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-r from-zenith-500 to-zenith-600">
            <Zap className="w-8 h-8 text-white" />
          </div>
        </div>

        {/* Status */}
        <div className="space-y-4">
          <div className="flex items-center justify-center space-x-3">
            <WifiOff
              className={`w-8 h-8 ${isOnline ? 'text-success-400' : 'text-error-400'}`}
            />
            <div className="text-left">
              <h1 className="text-2xl font-bold">
                {isOnline ? 'Back Online!' : 'You\'re Offline'}
              </h1>
              <p className="text-muted-foreground">
                {isOnline
                  ? 'Reconnecting to Pulse...'
                  : 'Pulse needs an internet connection'
                }
              </p>
            </div>
          </div>

          {isOnline && (
            <div className="flex items-center justify-center space-x-2 text-success-400">
              <div className="w-2 h-2 bg-success-400 rounded-full animate-pulse" />
              <span className="text-sm">Redirecting...</span>
            </div>
          )}
        </div>

        {/* Offline Features */}
        {!isOnline && (
          <div className="glass-card p-6 text-left space-y-4">
            <h3 className="font-semibold mb-3">What you can do offline:</h3>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li className="flex items-center space-x-2">
                <div className="w-1.5 h-1.5 bg-zenith-400 rounded-full" />
                <span>View cached markets and your predictions</span>
              </li>
              <li className="flex items-center space-x-2">
                <div className="w-1.5 h-1.5 bg-zenith-400 rounded-full" />
                <span>Browse your market management dashboard</span>
              </li>
              <li className="flex items-center space-x-2">
                <div className="w-1.5 h-1.5 bg-zenith-400 rounded-full" />
                <span>Queue votes to sync when reconnected</span>
              </li>
              <li className="flex items-center space-x-2">
                <div className="w-1.5 h-1.5 bg-warning-400 rounded-full" />
                <span>New markets require internet connection</span>
              </li>
            </ul>
          </div>
        )}

        {/* Actions */}
        <div className="space-y-3">
          <button
            onClick={handleRefresh}
            disabled={isRefreshing || isOnline}
            className={`
              w-full flex items-center justify-center space-x-2 py-3 px-6 rounded-lg font-medium transition-all
              ${isOnline || isRefreshing
                ? 'bg-muted text-muted-foreground cursor-not-allowed'
                : 'bg-zenith-500 hover:bg-zenith-600 text-white'
              }
            `}
          >
            <RefreshCw className={`w-5 h-5 ${isRefreshing ? 'animate-spin' : ''}`} />
            <span>
              {isRefreshing ? 'Checking Connection...' : 'Try Again'}
            </span>
          </button>

          <Link
            href="/"
            className="w-full flex items-center justify-center space-x-2 py-3 px-6 rounded-lg font-medium border border-border hover:bg-muted transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            <span>Continue Offline</span>
          </Link>
        </div>

        {/* PWA Info */}
        <div className="text-xs text-muted-foreground space-y-2">
          <p>
            💡 <strong>Tip:</strong> Add Pulse to your home screen for faster access
          </p>
          <p>
            Your votes and market creations will sync automatically when you're back online.
          </p>
        </div>

        {/* Network Status Indicator */}
        <div className="flex items-center justify-center space-x-2 text-xs">
          <div className={`w-2 h-2 rounded-full ${isOnline ? 'bg-success-400 animate-pulse' : 'bg-error-400'}`} />
          <span className="text-muted-foreground">
            {isOnline ? 'Connected' : 'Offline'}
          </span>
        </div>
      </div>
    </div>
  );
}