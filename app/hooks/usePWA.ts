'use client';

import { useEffect, useState } from 'react';

interface PWAInstallEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

interface PWAState {
  isInstallable: boolean;
  isInstalled: boolean;
  isOnline: boolean;
  showInstallPrompt: boolean;
  installApp: () => Promise<void>;
  dismissInstallPrompt: () => void;
}

declare global {
  interface WindowEventMap {
    beforeinstallprompt: PWAInstallEvent;
  }
}

export const usePWA = (): PWAState => {
  const [installPrompt, setInstallPrompt] = useState<PWAInstallEvent | null>(null);
  const [isInstallable, setIsInstallable] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isOnline, setIsOnline] = useState(true);
  const [showInstallPrompt, setShowInstallPrompt] = useState(false);

  useEffect(() => {
    // Register service worker
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker
        .register('/sw.js')
        .then((registration) => {
          console.log('PWA: Service Worker registered', registration);

          // Handle service worker updates
          registration.addEventListener('updatefound', () => {
            const newWorker = registration.installing;
            if (newWorker) {
              newWorker.addEventListener('statechange', () => {
                if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                  // New content is available, prompt user to refresh
                  if (confirm('New version available! Reload to update?')) {
                    window.location.reload();
                  }
                }
              });
            }
          });
        })
        .catch((error) => {
          console.error('PWA: Service Worker registration failed', error);
        });
    }

    // Check if app is already installed
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches ||
                         (window.navigator as any).standalone ||
                         document.referrer.includes('android-app://');
    setIsInstalled(isStandalone);

    // Handle beforeinstallprompt event
    const handleBeforeInstallPrompt = (e: PWAInstallEvent) => {
      console.log('PWA: Install prompt available');
      e.preventDefault();
      setInstallPrompt(e);
      setIsInstallable(true);

      // Show install prompt after 30 seconds if not installed
      setTimeout(() => {
        if (!isInstalled && !localStorage.getItem('pwa-install-dismissed')) {
          setShowInstallPrompt(true);
        }
      }, 30000);
    };

    // Handle app installed event
    const handleAppInstalled = () => {
      console.log('PWA: App installed');
      setIsInstalled(true);
      setIsInstallable(false);
      setShowInstallPrompt(false);
      setInstallPrompt(null);
    };

    // Handle online/offline status
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    // Add event listeners
    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Set initial online status
    setIsOnline(navigator.onLine);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [isInstalled]);

  const installApp = async (): Promise<void> => {
    if (!installPrompt) {
      throw new Error('Install prompt not available');
    }

    try {
      await installPrompt.prompt();
      const choice = await installPrompt.userChoice;

      if (choice.outcome === 'accepted') {
        console.log('PWA: User accepted install');
        setShowInstallPrompt(false);
      } else {
        console.log('PWA: User dismissed install');
        localStorage.setItem('pwa-install-dismissed', 'true');
      }

      setInstallPrompt(null);
      setIsInstallable(false);
    } catch (error) {
      console.error('PWA: Install failed', error);
      throw error;
    }
  };

  const dismissInstallPrompt = (): void => {
    setShowInstallPrompt(false);
    localStorage.setItem('pwa-install-dismissed', 'true');
  };

  return {
    isInstallable,
    isInstalled,
    isOnline,
    showInstallPrompt,
    installApp,
    dismissInstallPrompt,
  };
};

// Hook for managing offline queue
export const useOfflineQueue = () => {
  const [queuedItems, setQueuedItems] = useState<any[]>([]);

  const addToQueue = (item: any, type: 'vote' | 'market') => {
    const queueKey = type === 'vote' ? 'queuedVotes' : 'queuedMarkets';
    const existing = JSON.parse(localStorage.getItem(queueKey) || '[]');
    const updated = [...existing, { ...item, timestamp: Date.now() }];
    localStorage.setItem(queueKey, JSON.stringify(updated));
    setQueuedItems(updated);

    // Register background sync if available
    if ('serviceWorker' in navigator && 'sync' in window.ServiceWorkerRegistration.prototype) {
      navigator.serviceWorker.ready.then((registration) => {
        const syncTag = type === 'vote' ? 'vote-sync' : 'market-creation-sync';
        return registration.sync.register(syncTag);
      });
    }
  };

  const getQueuedItems = (type: 'vote' | 'market') => {
    const queueKey = type === 'vote' ? 'queuedVotes' : 'queuedMarkets';
    return JSON.parse(localStorage.getItem(queueKey) || '[]');
  };

  const clearQueue = (type: 'vote' | 'market') => {
    const queueKey = type === 'vote' ? 'queuedVotes' : 'queuedMarkets';
    localStorage.removeItem(queueKey);
    setQueuedItems([]);
  };

  return {
    queuedItems,
    addToQueue,
    getQueuedItems,
    clearQueue,
  };
};

// Hook for push notifications
export const usePushNotifications = () => {
  const [isSupported, setIsSupported] = useState(false);
  const [subscription, setSubscription] = useState<PushSubscription | null>(null);
  const [permission, setPermission] = useState<NotificationPermission>('default');

  useEffect(() => {
    if ('Notification' in window && 'serviceWorker' in navigator && 'PushManager' in window) {
      setIsSupported(true);
      setPermission(Notification.permission);

      // Get existing subscription
      navigator.serviceWorker.ready.then((registration) => {
        registration.pushManager.getSubscription().then((sub) => {
          setSubscription(sub);
        });
      });
    }
  }, []);

  const subscribe = async (): Promise<PushSubscription | null> => {
    if (!isSupported) {
      throw new Error('Push notifications not supported');
    }

    const permission = await Notification.requestPermission();
    setPermission(permission);

    if (permission !== 'granted') {
      throw new Error('Push notification permission denied');
    }

    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY,
    });

    setSubscription(subscription);

    // Send subscription to server
    await fetch('/api/notifications/subscribe', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(subscription),
    });

    return subscription;
  };

  const unsubscribe = async (): Promise<void> => {
    if (subscription) {
      await subscription.unsubscribe();
      setSubscription(null);

      // Notify server
      await fetch('/api/notifications/unsubscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(subscription),
      });
    }
  };

  return {
    isSupported,
    subscription,
    permission,
    subscribe,
    unsubscribe,
  };
};