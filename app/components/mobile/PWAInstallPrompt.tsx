'use client';

import React, { useState } from 'react';
import { X, Download, Smartphone, Zap } from 'lucide-react';
import { usePWA } from '@/hooks/usePWA';

export const PWAInstallPrompt: React.FC = () => {
  const { showInstallPrompt, installApp, dismissInstallPrompt, isInstalled } = usePWA();
  const [isInstalling, setIsInstalling] = useState(false);

  if (!showInstallPrompt || isInstalled) {
    return null;
  }

  const handleInstall = async () => {
    setIsInstalling(true);
    try {
      await installApp();
    } catch (error) {
      console.error('Failed to install app:', error);
    } finally {
      setIsInstalling(false);
    }
  };

  return (
    <div className="fixed bottom-20 md:bottom-4 left-4 right-4 z-50 max-w-sm mx-auto">
      <div className="glass-card p-4 border-zenith-500/30 bg-zenith-500/5 backdrop-blur-xl">
        <div className="flex items-start space-x-3">
          <div className="flex-shrink-0">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-r from-zenith-500 to-zenith-600 flex items-center justify-center">
              <Zap className="w-6 h-6 text-white" />
            </div>
          </div>

          <div className="flex-1 min-w-0">
            <h3 className="text-sm font-semibold text-zenith-400 mb-1">
              Install SwipePredict
            </h3>
            <p className="text-xs text-muted-foreground mb-3">
              Get faster access and offline support for your prediction markets
            </p>

            <div className="flex items-center space-x-2">
              <button
                onClick={handleInstall}
                disabled={isInstalling}
                className={`
                  flex items-center space-x-1 px-3 py-1.5 rounded-lg text-xs font-medium transition-all
                  ${isInstalling
                    ? 'bg-muted text-muted-foreground cursor-not-allowed'
                    : 'bg-zenith-500 hover:bg-zenith-600 text-white'
                  }
                `}
              >
                {isInstalling ? (
                  <>
                    <div className="w-3 h-3 border border-white/30 border-t-white rounded-full animate-spin" />
                    <span>Installing...</span>
                  </>
                ) : (
                  <>
                    <Download className="w-3 h-3" />
                    <span>Install</span>
                  </>
                )}
              </button>

              <button
                onClick={dismissInstallPrompt}
                className="text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                Maybe later
              </button>
            </div>
          </div>

          <button
            onClick={dismissInstallPrompt}
            className="flex-shrink-0 p-1 rounded-lg hover:bg-muted transition-colors"
          >
            <X className="w-4 h-4 text-muted-foreground" />
          </button>
        </div>

        {/* Benefits */}
        <div className="mt-3 pt-3 border-t border-border">
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="flex items-center space-x-1 text-muted-foreground">
              <Smartphone className="w-3 h-3" />
              <span>Home screen access</span>
            </div>
            <div className="flex items-center space-x-1 text-muted-foreground">
              <Zap className="w-3 h-3" />
              <span>Offline support</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// Network status indicator
export const NetworkStatus: React.FC = () => {
  const { isOnline } = usePWA();

  if (isOnline) return null;

  return (
    <div className="fixed top-16 md:top-4 left-4 right-4 z-50">
      <div className="glass-card p-3 border-warning-500/30 bg-warning-500/5 max-w-sm mx-auto">
        <div className="flex items-center space-x-2">
          <div className="w-2 h-2 bg-warning-400 rounded-full animate-pulse flex-shrink-0" />
          <p className="text-xs text-warning-400 font-medium">
            You're offline. Some features may be limited.
          </p>
        </div>
      </div>
    </div>
  );
};