'use client';

import React from 'react';
import { Zap, Shield, TrendingUp } from 'lucide-react';

export const Footer: React.FC = () => {
  return (
    <footer className="border-t border-border/40 bg-background/95">
      <div className="container py-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Brand */}
          <div className="space-y-3">
            <div className="flex items-center space-x-2">
              <div className="flex items-center justify-center w-6 h-6 rounded-lg bg-gradient-to-r from-zenith-500 to-zenith-600">
                <Zap className="w-4 h-4 text-white" />
              </div>
              <span className="font-bold gradient-text">SwipePredict</span>
            </div>
            <p className="text-sm text-muted-foreground">
              Tinder-style prediction markets with Arcium privacy protection.
            </p>
          </div>

          {/* Features */}
          <div className="space-y-3">
            <h4 className="font-semibold">Features</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li className="flex items-center space-x-2">
                <TrendingUp className="w-3 h-3" />
                <span>Prediction Markets</span>
              </li>
              <li className="flex items-center space-x-2">
                <Shield className="w-3 h-3" />
                <span>Privacy Protection</span>
              </li>
              <li>Swipe Interface</li>
              <li>Real-time Odds</li>
            </ul>
          </div>

          {/* Community */}
          <div className="space-y-3">
            <h4 className="font-semibold">Community</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li>Discord</li>
              <li>Twitter</li>
              <li>Documentation</li>
              <li>GitHub</li>
            </ul>
          </div>

          {/* Legal */}
          <div className="space-y-3">
            <h4 className="font-semibold">Legal</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li>Terms of Service</li>
              <li>Privacy Policy</li>
              <li>Risk Disclosure</li>
            </ul>
          </div>
        </div>

        <div className="mt-8 pt-8 border-t border-border/40">
          <div className="flex flex-col md:flex-row justify-between items-center space-y-2 md:space-y-0">
            <p className="text-sm text-muted-foreground">
              © 2024 SwipePredict. Built on Solana with Arcium.
            </p>
            <div className="flex items-center space-x-4 text-xs text-muted-foreground">
              <span>Powered by Arcium MPC</span>
              <span>•</span>
              <span>Built on Solana</span>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
};