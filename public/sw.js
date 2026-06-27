const CACHE_NAME = 'talkme-cache-v2';
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

// ============================================================================
// Web Push — background notifications (installed PWAs)
// ============================================================================

// Push received (fires even when the app/browser is closed)
self.addEventListener('push', (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch (e) {
    data = { title: 'TalkMe', body: event.data ? event.data.text() : '' };
  }

  const title = data.title || 'TalkMe';
  const chatId = data.chatId || '';
  const options = {
    body: data.body || '',
    icon: data.icon || '/icon-192.png',
    badge: '/icon-192.png',
    // Same tag for the same message → de-duplicates; renotify re-alerts on updates
    tag: data.messageId || chatId || 'talkme',
    renotify: true,
    // Make sure the OS plays its notification sound and vibrates (mobile). A service
    // worker can't play a custom audio file, so the alert sound is the OS one — this
    // ensures we never request a silent notification. (Desktop also needs the per-app
    // "Play sound for notifications" enabled in the OS notification settings.)
    silent: false,
    vibrate: [120, 60, 120],
    timestamp: data.timestamp ? (Date.parse(data.timestamp) || Date.now()) : Date.now(),
    data: {
      chatId: chatId,
      messageId: data.messageId,
      url: chatId ? ('/?chat=' + encodeURIComponent(chatId) + '#messages') : '/',
    },
  };

  event.waitUntil((async () => {
    // Acknowledge delivery to the server the moment the push lands on this device
    // — even though the tab/app is backgrounded and its WebSocket is closed. This
    // is what flips the SENDER's tick from "sent" to "delivered" in real time
    // (the WhatsApp double-tick). The signed token in the payload authorizes it,
    // so no access token is needed here. Best-effort; runs CONCURRENTLY with (and
    // never blocks) showing the notification, which must appear promptly because
    // the subscription is userVisibleOnly.
    let ackPromise = Promise.resolve();
    if (data.deliveryToken && data.deliveryAck) {
      try {
        const ackUrl = new URL(data.deliveryAck, self.location.origin).toString();
        ackPromise = fetch(ackUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token: data.deliveryToken }),
          keepalive: true,
        }).catch(() => { /* offline/transient — heals on recipient's next reconnect */ });
      } catch (e) { /* bad URL — ignore */ }
    }

    // Keep the OS app badge in sync from the push payload
    if (typeof data.badge === 'number' && 'setAppBadge' in self.navigator) {
      try {
        if (data.badge > 0) await self.navigator.setAppBadge(data.badge);
        else await self.navigator.clearAppBadge();
      } catch (e) { /* unsupported — ignore */ }
    }

    // Show the notification right away; keep the event alive for the ack too.
    await Promise.all([self.registration.showNotification(title, options), ackPromise]);
  })());
});

// Notification tapped → focus or open the app and jump to the conversation
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const info = event.notification.data || {};
  const targetUrl = info.url || '/';

  event.waitUntil((async () => {
    const allClients = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    for (const client of allClients) {
      if ('focus' in client) {
        await client.focus();
        try {
          client.postMessage({ type: 'OPEN_CHAT', chatId: info.chatId, url: targetUrl });
        } catch (e) { /* ignore */ }
        return;
      }
    }
    if (self.clients.openWindow) {
      await self.clients.openWindow(targetUrl);
    }
  })());
});

self.addEventListener('notificationclose', () => {
  // Hook for analytics if needed (no-op for now)
});

// Browser rotated/expired the subscription → ask the page(s) to re-subscribe
self.addEventListener('pushsubscriptionchange', (event) => {
  event.waitUntil((async () => {
    const allClients = await self.clients.matchAll({ includeUncontrolled: true });
    allClients.forEach((c) => {
      try { c.postMessage({ type: 'PUSH_SUBSCRIPTION_CHANGED' }); } catch (e) { /* ignore */ }
    });
  })());
});
