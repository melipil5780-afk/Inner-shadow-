// ================================================================
// INNERSHADOW — SERVICE WORKER
// Handles caching, offline support, and background sync
// ================================================================

const APP_VERSION = 'v1.0.3'; // Bumped to force update
const CACHE_NAME = `innershadow-${APP_VERSION}`;
const RUNTIME_CACHE = `innershadow-runtime-${APP_VERSION}`;

// Files to cache immediately on install – using final URLs (no redirects)
const PRECACHE_URLS = [
  '/',
  '/index.html',
  '/disclaimer.html',
  '/signup.html',
  '/login.html',
  '/assessment.html',
  '/app.html',
  '/manifest.json',
  '/css/main.css',
  '/js/supabase-client.js',
  '/js/utils.js',
  '/js/module-engine.js',
  // Google Fonts – cache so they work offline
  'https://fonts.googleapis.com/css2?family=DM+Sans:ital,wght@0,300;0,400;0,500;0,600;0,700;1,300;1,400&family=Fraunces:ital,opsz,wght@0,9..144,300;0,9..144,400;0,9..144,500;1,9..144,300;1,9..144,400&display=swap'
];

// Module pages – cached when visited
const MODULE_PATTERN = /\/pathways\//;

// External resources
const SUPABASE_PATTERN = /supabase\.co/;
const FONTS_PATTERN = /fonts\.(googleapis|gstatic)\.com/;

// ================================================================
// INSTALL – precache the app shell
// ================================================================

self.addEventListener('install', event => {
  console.log(`[SW] Installing ${CACHE_NAME}`);
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('[SW] Precaching app shell');
        return Promise.allSettled(
          PRECACHE_URLS.map(url =>
            cache.add(url).catch(err => console.warn(`[SW] Failed to cache ${url}:`, err))
          )
        );
      })
      .then(() => self.skipWaiting())
  );
});

// ================================================================
// ACTIVATE – clean up old caches
// ================================================================

self.addEventListener('activate', event => {
  console.log(`[SW] Activating ${CACHE_NAME}`);
  event.waitUntil(
    caches.keys()
      .then(cacheNames => {
        return Promise.all(
          cacheNames
            .filter(name => name.startsWith('innershadow-') && name !== CACHE_NAME && name !== RUNTIME_CACHE)
            .map(name => caches.delete(name))
        );
      })
      .then(() => self.clients.claim())
  );
});

// ================================================================
// FETCH – handle all network requests
// ================================================================

self.addEventListener('fetch', event => {
  const { request } = event;
  const url = new URL(request.url);

  if (request.method !== 'GET') return;
  if (!request.url.startsWith('http')) return;

  // Supabase API – network only
  if (SUPABASE_PATTERN.test(request.url)) {
    event.respondWith(fetch(request));
    return;
  }

  // Google Fonts – cache first
  if (FONTS_PATTERN.test(request.url)) {
    event.respondWith(cacheFirst(request, RUNTIME_CACHE));
    return;
  }

  // Module pages – stale while revalidate
  if (MODULE_PATTERN.test(request.url)) {
    event.respondWith(staleWhileRevalidate(request, RUNTIME_CACHE));
    return;
  }

  // App shell (HTML, CSS, JS) – cache first
  if (
    request.destination === 'document' ||
    request.destination === 'style' ||
    request.destination === 'script' ||
    request.destination === 'image'
  ) {
    event.respondWith(cacheFirst(request, CACHE_NAME));
    return;
  }

  // Everything else – network first
  event.respondWith(networkFirst(request, RUNTIME_CACHE));
});

// ================================================================
// CACHING STRATEGIES (with Safari redirect fix)
// ================================================================

async function cacheFirst(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);

  if (cached) return cached;

  try {
    const response = await fetch(request);

    // SAFARI FIX: Follow redirects by fetching the final URL
    if (response.redirected) {
      return fetch(response.url);
    }

    if (response.ok) {
      cache.put(request, response.clone());
    }
    return response;
  } catch (err) {
    const offlinePage = await cache.match('/offline.html');
    return offlinePage || new Response(offlineHTML(), { headers: { 'Content-Type': 'text/html' } });
  }
}

async function networkFirst(request, cacheName) {
  const cache = await caches.open(cacheName);

  try {
    const response = await fetch(request);

    if (response.redirected) {
      return fetch(response.url);
    }

    if (response.ok) {
      cache.put(request, response.clone());
    }
    return response;
  } catch (err) {
    const cached = await cache.match(request);
    return cached || new Response('Network error. Please check your connection.', { status: 503 });
  }
}

async function staleWhileRevalidate(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);

  const fetchPromise = fetch(request).then(response => {
    if (response.redirected) {
      return fetch(response.url);
    }
    if (response.ok) {
      cache.put(request, response.clone());
    }
    return response;
  }).catch(() => null);

  return cached || fetchPromise;
}

// ================================================================
// PUSH NOTIFICATIONS (placeholder – expand later)
// ================================================================

self.addEventListener('push', event => {
  if (!event.data) return;

  let data;
  try {
    data = event.data.json();
  } catch (e) {
    data = { title: 'InnerShadow', body: event.data.text() || 'Your daily check-in is ready.' };
  }

  const options = {
    body: data.body || 'Your daily check-in is ready.',
    icon: '/assets/icons/icon-192.png',
    badge: '/assets/icons/icon-72.png',
    tag: data.tag || 'innershadow-daily',
    renotify: false,
    silent: false,
    data: { url: data.url || '/app.html', timestamp: Date.now() },
    actions: data.actions || [
      { action: 'checkin', title: 'Check In Now' },
      { action: 'dismiss', title: 'Later' }
    ]
  };

  event.waitUntil(self.registration.showNotification(data.title || 'InnerShadow', options));
});

self.addEventListener('notificationclick', event => {
  event.notification.close();
  const action = event.action;
  const data = event.notification.data || {};
  let targetUrl = '/app.html';

  if (action === 'checkin') {
    targetUrl = '/app.html?tab=today&action=checkin';
  } else if (action === 'dismiss') {
    return;
  } else if (data.url) {
    targetUrl = data.url;
  }

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(clientList => {
      for (const client of clientList) {
        if (client.url.includes(self.location.origin)) {
          client.focus();
          client.navigate(targetUrl);
          return;
        }
      }
      return clients.openWindow(targetUrl);
    })
  );
});

// ================================================================
// MESSAGE HANDLING
// ================================================================

self.addEventListener('message', event => {
  const { type, payload } = event.data || {};

  switch (type) {
    case 'SKIP_WAITING':
      self.skipWaiting();
      break;
    case 'CACHE_MODULE':
      if (payload?.url) {
        caches.open(RUNTIME_CACHE).then(cache => cache.add(payload.url).catch(() => {}));
      }
      break;
    case 'CLEAR_RUNTIME_CACHE':
      caches.delete(RUNTIME_CACHE).then(() => event.source?.postMessage({ type: 'CACHE_CLEARED' }));
      break;
    case 'GET_CACHE_STATUS':
      getCacheStatus().then(status => event.source?.postMessage({ type: 'CACHE_STATUS', payload: status }));
      break;
  }
});

// ================================================================
// UTILITIES
// ================================================================

async function getCacheStatus() {
  const shellCache = await caches.open(CACHE_NAME);
  const runtimeCache = await caches.open(RUNTIME_CACHE);
  const shellKeys = await shellCache.keys();
  const runtimeKeys = await runtimeCache.keys();
  return {
    version: APP_VERSION,
    shellCached: shellKeys.length,
    runtimeCached: runtimeKeys.length,
    totalCached: shellKeys.length + runtimeKeys.length
  };
}

function offlineHTML() {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>InnerShadow — Offline</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, sans-serif;
      background: #0a0f1e;
      color: #f1f5f9;
      height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      text-align: center;
      padding: 2rem;
    }
    .icon { font-size: 3rem; margin-bottom: 1.5rem; }
    h1 { font-size: 1.5rem; margin-bottom: 0.75rem; font-weight: 600; }
    p { color: #94a3b8; line-height: 1.6; margin-bottom: 2rem; font-size: 0.9375rem; }
    button {
      background: linear-gradient(135deg, #0d9488, #d97706);
      color: white;
      border: none;
      padding: 0.875rem 2rem;
      border-radius: 1rem;
      font-size: 1rem;
      font-weight: 600;
      cursor: pointer;
    }
  </style>
</head>
<body>
  <div>
    <div class="icon">🌑</div>
    <h1>You're offline</h1>
    <p>InnerShadow needs a connection to sync your progress. Your data is safe — come back when you're connected.</p>
    <button onclick="window.location.reload()">Try Again</button>
  </div>
</body>
</html>`;
}

console.log(`[SW] InnerShadow Service Worker ${APP_VERSION} loaded`);
