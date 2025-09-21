// Service Worker for aggressive asset caching
const CACHE_NAME = 'servicehub-v1';
const STATIC_ASSETS = [
  '/',
  '/assets/index.js',
  '/assets/index.css',
  '/assets/hero-dashboard.jpg'
];

// Install event - cache static assets
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(STATIC_ASSETS))
      .then(() => self.skipWaiting())
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Fetch event - serve from cache with stale-while-revalidate
self.addEventListener('fetch', event => {
  // Only cache GET requests for same origin
  if (event.request.method !== 'GET' || !event.request.url.startsWith(self.location.origin)) {
    return;
  }

  event.respondWith(
    caches.open(CACHE_NAME).then(cache => {
      return cache.match(event.request).then(cachedResponse => {
        if (cachedResponse) {
          // Return cached version immediately, then update cache in background
          fetch(event.request).then(response => {
            if (response.status === 200) {
              cache.put(event.request, response.clone());
            }
          }).catch(() => {
            // Silently fail background updates
          });
          return cachedResponse;
        }
        
        // Not in cache, fetch and cache
        return fetch(event.request).then(response => {
          if (response.status === 200) {
            cache.put(event.request, response.clone());
          }
          return response;
        });
      });
    })
  );
});