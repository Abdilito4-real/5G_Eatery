// ═══════════════════════════════════════════════════════════════════════════════
// 5G EATERY — SERVICE WORKER
// Handles asset caching, offline fallback, and rich push notifications.
// ═══════════════════════════════════════════════════════════════════════════════

const CACHE_NAME = '5g-eatery-cache-v2';
const OFFLINE_URL = 'offline.html';

const ASSETS_TO_CACHE = [
  '/',
  '/splash.html',
  '/menu.html',
  '/admin.html',
  '/index.html',
  '/about.html',
  '/locations.html',
  '/styles.css',
  '/loader.css',
  '/loader.js',
  '/menu.js',
  '/admin.js',
  '/supabase.js',
  OFFLINE_URL,
  '/manifest.json'
];

// ==============================================================================
// INSTALL — pre-cache all static assets
// ==============================================================================
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      return cache.addAll(ASSETS_TO_CACHE).catch(err => {
        console.warn('[SW] Some assets failed to cache:', err);
      });
    })
  );
  self.skipWaiting();
});

// ==============================================================================
// ACTIVATE — clean up old caches and claim clients immediately
// ==============================================================================
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames =>
      Promise.all(
        cacheNames.map(name => {
          if (name !== CACHE_NAME) {
            console.log('[SW] Deleting old cache:', name);
            return caches.delete(name);
          }
        })
      )
    )
  );
  self.clients.claim();
});

// ==============================================================================
// FETCH — tiered caching strategy
// ==============================================================================
self.addEventListener('fetch', event => {
  // Navigate requests (HTML pages) — network first, fall back to cache, then offline
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request)
        .catch(() => caches.match(event.request))
        .catch(() => caches.match(OFFLINE_URL))
    );
    return;
  }

  // Supabase API calls — always network first (never serve stale data)
  if (event.request.url.includes('supabase')) {
    event.respondWith(
      fetch(event.request)
        .catch(() => caches.match(event.request))
    );
    return;
  }

  // Cloudinary images — cache first (images rarely change)
  if (event.request.url.includes('cloudinary')) {
    event.respondWith(
      caches.match(event.request)
        .then(response => response || fetch(event.request).then(res => {
          const toCache = res.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, toCache));
          return res;
        }))
    );
    return;
  }

  // All other static assets — cache first, fall back to network
  event.respondWith(
    caches.match(event.request)
      .then(response => response || fetch(event.request))
      .catch(() => {
        if (event.request.destination === 'image') {
          return caches.match('/logo.png');
        }
      })
  );
});

// ==============================================================================
// MESSAGE HANDLER — for notifications from main thread
// ==============================================================================
self.addEventListener('message', event => {
  if (event.data && event.data.type === 'SHOW_NOTIFICATION') {
    self.registration.showNotification(event.data.title, {
      body: event.data.body,
      icon: event.data.icon,
      badge: event.data.badge,
      tag: event.data.tag
    });
  }
});

// ==============================================================================
// NOTIFICATION CLICK — handle action buttons and plain taps
// ==============================================================================
self.addEventListener('notificationclick', event => {
  const notification = event.notification;
  const action = event.action;
  const orderId = notification.data?.orderId;

  notification.close();

  if (action === 'accept' && orderId) {
    // Accept button: tell admin tab to mark order as 'preparing'
    event.waitUntil(
      notifyClients({
        type: 'NOTIFICATION_ACTION',
        action: 'accept',
        orderId
      })
    );

  } else if (action === 'view' || action === '') {
    // View button or plain notification tap: focus/open admin
    event.waitUntil(focusOrOpenAdmin(orderId));

  } else if (action === 'mark-completed' && orderId) {
    // Legacy action kept for backwards compatibility
    event.waitUntil(
      notifyClients({
        type: 'UPDATE_ORDER_STATUS',
        orderId,
        status: 'completed'
      })
    );
  }
});

// ==============================================================================
// NOTIFICATION CLOSE — dismissed without action
// ==============================================================================
self.addEventListener('notificationclose', () => {
  // Reserved for future missed-order tracking
});

// ==============================================================================
// HELPERS
// ==============================================================================

async function notifyClients(data) {
  const clientList = await self.clients.matchAll({
    type: 'window',
    includeUncontrolled: true
  });
  clientList.forEach(client => client.postMessage(data));
}

async function focusOrOpenAdmin(orderId) {
  const clientList = await self.clients.matchAll({
    type: 'window',
    includeUncontrolled: true
  });

  for (const client of clientList) {
    if (client.url.includes('admin')) {
      await client.focus();
      client.postMessage({ type: 'NOTIFICATION_CLICK', orderId });
      return;
    }
  }

  // No admin tab open — open one and message it once loaded
  const newClient = await self.clients.openWindow('/admin.html');
  setTimeout(() => {
    newClient?.postMessage({ type: 'NOTIFICATION_CLICK', orderId });
  }, 2000);
}