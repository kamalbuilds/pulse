// Pulse PWA Service Worker
const CACHE_NAME = 'swipepredict-v1.0.0';
const OFFLINE_CACHE = 'swipepredict-offline-v1';

// Essential files to cache for offline functionality
const CACHE_URLS = [
  '/',
  '/create',
  '/manage',
  '/offline',
  '/_next/static/css/',
  '/_next/static/chunks/',
  '/manifest.json',
];

// API routes to cache responses
const API_CACHE_PATTERNS = [
  '/api/markets',
  '/api/user',
  '/api/stats',
];

// Install event - cache essential resources
self.addEventListener('install', (event) => {
  console.log('[SW] Installing...');

  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('[SW] Caching essential files');
        return cache.addAll(CACHE_URLS);
      })
      .then(() => {
        console.log('[SW] Installation complete');
        return self.skipWaiting();
      })
      .catch((error) => {
        console.error('[SW] Installation failed:', error);
      })
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  console.log('[SW] Activating...');

  event.waitUntil(
    caches.keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            if (cacheName !== CACHE_NAME && cacheName !== OFFLINE_CACHE) {
              console.log('[SW] Deleting old cache:', cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      })
      .then(() => {
        console.log('[SW] Activation complete');
        return self.clients.claim();
      })
  );
});

// Fetch event - handle network requests with cache-first strategy
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests
  if (request.method !== 'GET') {
    return;
  }

  // Skip chrome-extension and other non-http requests
  if (!url.protocol.startsWith('http')) {
    return;
  }

  // Handle different types of requests
  if (isAPIRequest(url)) {
    event.respondWith(handleAPIRequest(request));
  } else if (isStaticAsset(url)) {
    event.respondWith(handleStaticAsset(request));
  } else if (isNavigationRequest(request)) {
    event.respondWith(handleNavigationRequest(request));
  } else {
    event.respondWith(handleGenericRequest(request));
  }
});

// Check if request is for API
function isAPIRequest(url) {
  return url.pathname.startsWith('/api/') ||
         API_CACHE_PATTERNS.some(pattern => url.pathname.includes(pattern));
}

// Check if request is for static asset
function isStaticAsset(url) {
  return url.pathname.startsWith('/_next/') ||
         url.pathname.includes('.js') ||
         url.pathname.includes('.css') ||
         url.pathname.includes('.png') ||
         url.pathname.includes('.jpg') ||
         url.pathname.includes('.svg') ||
         url.pathname.includes('.ico');
}

// Check if request is navigation request
function isNavigationRequest(request) {
  return request.mode === 'navigate' ||
         (request.method === 'GET' && request.headers.get('accept')?.includes('text/html'));
}

// Handle API requests with network-first strategy
async function handleAPIRequest(request) {
  try {
    // Try network first
    const networkResponse = await fetch(request);

    if (networkResponse.ok) {
      // Cache successful responses
      const cache = await caches.open(CACHE_NAME);
      cache.put(request, networkResponse.clone());
    }

    return networkResponse;
  } catch (error) {
    console.log('[SW] API request failed, trying cache:', request.url);

    // Fallback to cache
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }

    // Return offline data if available
    return new Response(
      JSON.stringify({
        error: 'Offline',
        message: 'No network connection available',
        cached: false
      }),
      {
        status: 503,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
}

// Handle static assets with cache-first strategy
async function handleStaticAsset(request) {
  // Try cache first
  const cachedResponse = await caches.match(request);
  if (cachedResponse) {
    return cachedResponse;
  }

  try {
    // Fallback to network
    const networkResponse = await fetch(request);

    if (networkResponse.ok) {
      const cache = await caches.open(CACHE_NAME);
      cache.put(request, networkResponse.clone());
    }

    return networkResponse;
  } catch (error) {
    console.log('[SW] Static asset failed to load:', request.url);
    return new Response('', { status: 404 });
  }
}

// Handle navigation requests
async function handleNavigationRequest(request) {
  try {
    // Try network first for navigation
    const networkResponse = await fetch(request);
    return networkResponse;
  } catch (error) {
    console.log('[SW] Navigation request failed, serving offline page');

    // Try to serve cached page
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }

    // Serve offline page
    const offlinePage = await caches.match('/offline');
    if (offlinePage) {
      return offlinePage;
    }

    // Fallback to basic offline response
    return new Response(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Pulse - Offline</title>
          <meta name="viewport" content="width=device-width, initial-scale=1">
          <style>
            body {
              font-family: system-ui, sans-serif;
              display: flex;
              flex-direction: column;
              align-items: center;
              justify-content: center;
              height: 100vh;
              margin: 0;
              background: #0a0a0b;
              color: #ffffff;
              text-align: center;
              padding: 20px;
            }
            .logo {
              width: 64px;
              height: 64px;
              background: linear-gradient(135deg, #6366f1, #8b5cf6);
              border-radius: 16px;
              display: flex;
              align-items: center;
              justify-content: center;
              margin-bottom: 24px;
            }
            h1 { margin: 0 0 16px 0; }
            p { color: #9ca3af; margin-bottom: 24px; }
            button {
              background: #6366f1;
              color: white;
              border: none;
              padding: 12px 24px;
              border-radius: 8px;
              cursor: pointer;
              font-weight: 500;
            }
            button:hover { background: #5856eb; }
          </style>
        </head>
        <body>
          <div class="logo">⚡</div>
          <h1>You're Offline</h1>
          <p>Pulse needs an internet connection to load new markets.</p>
          <button onclick="window.location.reload()">Try Again</button>
        </body>
      </html>
    `, {
      headers: { 'Content-Type': 'text/html' }
    });
  }
}

// Handle generic requests
async function handleGenericRequest(request) {
  try {
    return await fetch(request);
  } catch (error) {
    const cachedResponse = await caches.match(request);
    return cachedResponse || new Response('', { status: 404 });
  }
}

// Background sync for queued actions
self.addEventListener('sync', (event) => {
  console.log('[SW] Background sync:', event.tag);

  if (event.tag === 'vote-sync') {
    event.waitUntil(syncQueuedVotes());
  } else if (event.tag === 'market-creation-sync') {
    event.waitUntil(syncQueuedMarkets());
  }
});

// Sync queued votes when online
async function syncQueuedVotes() {
  try {
    // Get queued votes from IndexedDB or localStorage
    const queuedVotes = await getQueuedVotes();

    for (const vote of queuedVotes) {
      try {
        const response = await fetch('/api/votes', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(vote)
        });

        if (response.ok) {
          await removeQueuedVote(vote.id);
          console.log('[SW] Synced queued vote:', vote.id);
        }
      } catch (error) {
        console.error('[SW] Failed to sync vote:', vote.id, error);
      }
    }
  } catch (error) {
    console.error('[SW] Vote sync failed:', error);
  }
}

// Sync queued market creations
async function syncQueuedMarkets() {
  try {
    const queuedMarkets = await getQueuedMarkets();

    for (const market of queuedMarkets) {
      try {
        const response = await fetch('/api/markets', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(market)
        });

        if (response.ok) {
          await removeQueuedMarket(market.id);
          console.log('[SW] Synced queued market:', market.id);
        }
      } catch (error) {
        console.error('[SW] Failed to sync market:', market.id, error);
      }
    }
  } catch (error) {
    console.error('[SW] Market sync failed:', error);
  }
}

// Helper functions for queue management
async function getQueuedVotes() {
  // Implementation would depend on storage strategy
  return JSON.parse(localStorage.getItem('queuedVotes') || '[]');
}

async function removeQueuedVote(voteId) {
  const votes = await getQueuedVotes();
  const filtered = votes.filter(v => v.id !== voteId);
  localStorage.setItem('queuedVotes', JSON.stringify(filtered));
}

async function getQueuedMarkets() {
  return JSON.parse(localStorage.getItem('queuedMarkets') || '[]');
}

async function removeQueuedMarket(marketId) {
  const markets = await getQueuedMarkets();
  const filtered = markets.filter(m => m.id !== marketId);
  localStorage.setItem('queuedMarkets', JSON.stringify(filtered));
}

// Push notification handling
self.addEventListener('push', (event) => {
  console.log('[SW] Push notification received');

  if (!event.data) return;

  try {
    const data = event.data.json();

    const options = {
      body: data.body || 'New prediction market activity',
      icon: '/icons/icon-192x192.png',
      badge: '/icons/badge-72x72.png',
      data: data.data || {},
      tag: data.tag || 'default',
      renotify: true,
      requireInteraction: data.requireInteraction || false,
      actions: [
        {
          action: 'view',
          title: 'View Market',
          icon: '/icons/view-icon.png'
        },
        {
          action: 'dismiss',
          title: 'Dismiss',
          icon: '/icons/dismiss-icon.png'
        }
      ]
    };

    event.waitUntil(
      self.registration.showNotification(data.title || 'Pulse', options)
    );
  } catch (error) {
    console.error('[SW] Push notification error:', error);
  }
});

// Notification click handling
self.addEventListener('notificationclick', (event) => {
  console.log('[SW] Notification clicked:', event.action);

  event.notification.close();

  if (event.action === 'view') {
    const urlToOpen = event.notification.data.url || '/';

    event.waitUntil(
      clients.matchAll({ type: 'window', includeUncontrolled: true })
        .then((clientList) => {
          // Check if app is already open
          for (const client of clientList) {
            if (client.url.includes(self.location.origin) && 'focus' in client) {
              client.navigate(urlToOpen);
              return client.focus();
            }
          }

          // Open new window if app is not open
          if (clients.openWindow) {
            return clients.openWindow(urlToOpen);
          }
        })
    );
  }
});

console.log('[SW] Service Worker loaded successfully');