// ================================================================
// WELLOVIE — SERVICE WORKER
// Handles caching, offline support, and background sync
// ================================================================

const APP_VERSION = 'v1.5.0';
const CACHE_NAME = `wellovie-${APP_VERSION}`;
const RUNTIME_CACHE = `wellovie-runtime-${APP_VERSION}`;

// Files to cache immediately on install
// These are the shell of the app — everything needed to load
const PRECACHE_URLS = [
  '/',
  '/index.html',
  '/disclaimer.html',
  '/signup.html',
  '/login.html',
  '/assessment.html',
  '/app.html',
  '/landing.html',
  '/manifest.json',
  '/css/main.css',
  '/js/supabase-client.js',
  '/js/utils.js',
  '/js/module-engine.js'
];

// Module pages — cached when visited, not on install
// Too many to precache, cache on demand instead
const MODULE_PATTERN = /\/pathways\//;

// External resources — cache with network-first strategy
const SUPABASE_PATTERN = /supabase\.co/;
const FONTS_PATTERN = /fonts\.(googleapis|gstatic)\.com/;


// ================================================================
// INSTALL — precache the app shell
// ================================================================

self.addEventListener('install', event => {
  console.log(`[SW] Installing ${CACHE_NAME}`);

  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('[SW] Precaching app shell');
        // Cache what we can — don't fail install if one resource fails
        return Promise.allSettled(
          PRECACHE_URLS.map(url =>
            cache.add(url).catch(err => {
              console.warn(`[SW] Failed to cache ${url}:`, err);
            })
          )
        );
      })
      .then(() => {
        console.log('[SW] Install complete');
        // Take control immediately — don't wait for old SW to die
        return self.skipWaiting();
      })
  );
});


// ================================================================
// ACTIVATE — clean up old caches
// ================================================================

self.addEventListener('activate', event => {
  console.log(`[SW] Activating ${CACHE_NAME}`);

  event.waitUntil(
    caches.keys()
      .then(cacheNames => {
        return Promise.all(
          cacheNames
            .filter(name => {
              // Delete old Wellovie caches
              return name.startsWith('wellovie-') && 
                     name !== CACHE_NAME &&
                     name !== RUNTIME_CACHE;
            })
            .map(name => {
              console.log(`[SW] Deleting old cache: ${name}`);
              return caches.delete(name);
            })
        );
      })
      .then(() => {
        console.log('[SW] Activation complete');
        // Take control of all open clients immediately
        return self.clients.claim();
      })
  );
});


// ================================================================
// FETCH — handle all network requests
// ================================================================

self.addEventListener('fetch', event => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests
  if (request.method !== 'GET') return;

  // Skip chrome-extension and other non-http requests
  if (!request.url.startsWith('http')) return;

  // Skip OAuth redirects
  if (url.searchParams.has('code') || url.searchParams.has('token') || url.searchParams.has('access_token')) {
    return;
  }

  // NEVER intercept HTML page navigations — let browser handle these directly
  // This prevents the redirected response error on auth flows
  if (request.destination === 'document' || request.mode === 'navigate') {
    return;
  }

  // Supabase API calls — network only, never cache
  if (SUPABASE_PATTERN.test(request.url)) {
    event.respondWith(fetch(request));
    return;
  }

  // Google Fonts — cache first
  if (FONTS_PATTERN.test(request.url)) {
    event.respondWith(cacheFirst(request, RUNTIME_CACHE));
    return;
  }

  // JS and CSS — cache first (versioned by SW version bump)
  if (request.destination === 'style' || request.destination === 'script') {
    event.respondWith(cacheFirst(request, CACHE_NAME));
    return;
  }

  // Images — cache first
  if (request.destination === 'image') {
    event.respondWith(cacheFirst(request, RUNTIME_CACHE));
    return;
  }

  // Everything else — network first
  event.respondWith(networkFirst(request, RUNTIME_CACHE));
});


// ================================================================
// CACHING STRATEGIES
// ================================================================

// Cache First — serve from cache, fall back to network
// Best for: app shell, fonts, static assets
async function cacheFirst(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);

  if (cached) {
    return cached;
  }

  try {
    const response = await fetch(request);
    if (response.ok && response.type !== 'opaqueredirect') {
      cache.put(request, response.clone());
    }
    return response;
  } catch (err) {
    // Return offline page if we have one
    const offlinePage = await cache.match('/offline.html');
    return offlinePage || new Response(
      offlineHTML(),
      { headers: { 'Content-Type': 'text/html' } }
    );
  }
}

// Network First — try network, fall back to cache
// Best for: dynamic content
async function networkFirst(request, cacheName) {
  const cache = await caches.open(cacheName);

  try {
    const response = await fetch(request);
    if (response.ok && response.type !== 'opaqueredirect') {
      cache.put(request, response.clone());
    }
    return response;
  } catch (err) {
    const cached = await cache.match(request);
    return cached || new Response(
      'Network error. Please check your connection.',
      { status: 503 }
    );
  }
}

// Stale While Revalidate — serve cache immediately, update in background
// Best for: module pages (fast load, eventually consistent)
async function staleWhileRevalidate(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);

  // Fetch in background regardless
  const fetchPromise = fetch(request).then(response => {
    if (response.ok) {
      cache.put(request, response.clone());
    }
    return response;
  }).catch(() => null);

  // Return cache immediately if we have it
  return cached || fetchPromise;
}


// ================================================================
// PUSH NOTIFICATIONS
// ================================================================

self.addEventListener('push', event => {
  if (!event.data) return;

  let data;
  try {
    data = event.data.json();
  } catch (e) {
    data = {
      title: 'Wellovie',
      body: event.data.text() || 'Your daily check-in is ready.'
    };
  }

  const options = {
    body: data.body || 'Your daily check-in is ready.',
    icon: '/assets/icons/icon-192.png',
    badge: '/assets/icons/icon-72.png',
    tag: data.tag || 'wellovie-daily',
    renotify: false,
    silent: false,
    data: {
      url: data.url || '/app.html',
      timestamp: Date.now()
    },
    actions: data.actions || [
      {
        action: 'checkin',
        title: 'Check In Now'
      },
      {
        action: 'dismiss',
        title: 'Later'
      }
    ]
  };

  event.waitUntil(
    self.registration.showNotification(
      data.title || 'Wellovie',
      options
    )
  );
});


// ================================================================
// NOTIFICATION CLICK
// ================================================================

self.addEventListener('notificationclick', event => {
  event.notification.close();

  const action = event.action;
  const data = event.notification.data || {};

  let targetUrl = '/app.html';

  if (action === 'checkin') {
    targetUrl = '/app.html?tab=today&action=checkin';
  } else if (action === 'dismiss') {
    return; // Do nothing
  } else if (data.url) {
    targetUrl = data.url;
  }

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then(clientList => {
        // If app is already open, focus it and navigate
        for (const client of clientList) {
          if (client.url.includes(self.location.origin)) {
            client.focus();
            client.navigate(targetUrl);
            return;
          }
        }
        // Otherwise open a new window
        return clients.openWindow(targetUrl);
      })
  );
});


// ================================================================
// MESSAGE HANDLING
// From app pages to service worker
// ================================================================

self.addEventListener('message', event => {
  const { type, payload } = event.data || {};

  switch (type) {

    // Force update — skip waiting and take control
    case 'SKIP_WAITING':
      self.skipWaiting();
      break;

    // Cache a specific module page proactively
    case 'CACHE_MODULE':
      if (payload?.url) {
        caches.open(RUNTIME_CACHE).then(cache => {
          cache.add(payload.url).catch(() => {});
        });
      }
      break;

    // Clear runtime cache (e.g. after Pro upgrade)
    case 'CLEAR_RUNTIME_CACHE':
      caches.delete(RUNTIME_CACHE).then(() => {
        event.source?.postMessage({ type: 'CACHE_CLEARED' });
      });
      break;

    // Report cache status
    case 'GET_CACHE_STATUS':
      getCacheStatus().then(status => {
        event.source?.postMessage({
          type: 'CACHE_STATUS',
          payload: status
        });
      });
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

// Minimal offline fallback page
function offlineHTML() {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Wellovie — Offline</title>
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
    h1 { 
      font-size: 1.5rem; 
      margin-bottom: 0.75rem;
      font-weight: 600;
    }
    p { 
      color: #94a3b8; 
      line-height: 1.6;
      margin-bottom: 2rem;
      font-size: 0.9375rem;
    }
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
    <p>Wellovie needs a connection to sync your progress. Your data is safe — come back when you're connected.</p>
    <button onclick="window.location.reload()">Try Again</button>
  </div>
</body>
</html>`;
}

console.log(`[SW] Wellovie Service Worker ${APP_VERSION} loaded`);
