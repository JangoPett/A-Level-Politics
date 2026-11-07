const CACHE_NAME = 'politics-tracker-v2.1';

// List all static files needed for offline functionality
const ASSETS_TO_CACHE = [
  './',
  './index.html',
  './manifest.json',
  './js/paper1-uk.js',
  './js/paper1-core.js',
  './js/paper2-uk.js',
  './js/paper2-feminism.js',
  './js/paper3-us.js',
  './js/app.js'
];

// 1. Install: Pre-cache all essential files
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS_TO_CACHE);
    }).then(() => self.skipWaiting())
  );
});

// 2. Activate: Clean up old versions of the cache
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cache) => {
          if (cache !== CACHE_NAME) {
            return caches.delete(cache);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// 3. Fetch: Cache-first fallback to network (ignoring unsupported schemes)
self.addEventListener('fetch', (event) => {
  // Ignore non-http/https requests (e.g., chrome-extension://, file://)
  if (!event.request.url.startsWith('http')) {
    return;
  }

  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) {
        return cachedResponse;
      }
      return fetch(event.request).then((response) => {
        // Optional: Check if we received a valid response before caching dynamic requests
        if (!response || response.status !== 200 || response.type !== 'basic') {
          return response;
        }

        const responseToCache = response.clone();
        caches.open(CACHE_NAME).then((cache) => {
          cache.put(event.request, responseToCache);
        });

        return response;
      });
    })
  );
});
