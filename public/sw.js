const CACHE_NAME = 'talkme-cache-v1';
const ASSETS_TO_CACHE = [
  '/',
  '/index.html',
  '/manifest.json',
  '/apple-icon.png',
  '/sounds/notification.wav',
  '/placeholder-user.jpg',
  '/placeholder.jpg'
];

// Install Event - cache core static assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[Service Worker] Caching app shell');
      return cache.addAll(ASSETS_TO_CACHE);
    }).then(() => self.skipWaiting())
  );
});

// Activate Event - clean up old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keyList) => {
      return Promise.all(keyList.map((key) => {
        if (key !== CACHE_NAME) {
          console.log('[Service Worker] Removing old cache', key);
          return caches.delete(key);
        }
      }));
    }).then(() => self.clients.claim())
  );
});

// Fetch Event - network-first fallback to cache, bypass api/ws entirely
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // CRITICAL: Bypass service worker caching for REST API calls and WebSocket connections
  if (
    url.pathname.includes('/api/v1/') || 
    url.pathname.includes('/ws') || 
    url.pathname.startsWith('/api/') ||
    event.request.url.includes('/api/v1/')
  ) {
    return;
  }

  // Network-first strategy for other requests
  event.respondWith(
    fetch(event.request)
      .then((response) => {
        // If successful response, clone and cache it (only for GET requests and HTTP/HTTPS schemes)
        if (event.request.method === 'GET' && response.status === 200 && (url.protocol === 'http:' || url.protocol === 'https:')) {
          const responseClone = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseClone);
          });
        }
        return response;
      })
      .catch(() => {
        // Fallback to cache if network is down/offline
        return caches.match(event.request);
      })
  );
});
