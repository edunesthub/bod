// sw.js - Updated on 2025-04-06
const CACHE_NAME = 'chawp-admin-v27';
const urlsToCache = [
  '/',
  '/index.html',
  'https://cdn.tailwindcss.com',
  'https://fonts.googleapis.com/css2?family=SF+Pro+Display:wght@300;500;700&display=swap',
  'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css',
  'https://www.gstatic.com/firebasejs/10.9.0/firebase-app.js',
  'https://www.gstatic.com/firebasejs/10.9.0/firebase-firestore.js',
  'https://www.gstatic.com/firebasejs/10.9.0/firebase-auth.js'
];

// Install event - Cache core assets
self.addEventListener('install', event => {
  self.skipWaiting(); // Immediate activation
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(urlsToCache))
      .catch(err => console.error('[SW] Caching failed:', err))
  );
});

// Activate event - Clean up old caches
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames =>
      Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== CACHE_NAME) {
            console.log('[SW] Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      )
    ).then(() => self.clients.claim()) // Take control immediately
  );
});

// Fetch event - Serve cache or network
self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request)
      .then(response => {
        return response || fetch(event.request).then(networkRes => {
          if (event.request.method === 'GET' && networkRes.ok) {
            return caches.open(CACHE_NAME).then(cache => {
              cache.put(event.request, networkRes.clone());
              return networkRes;
            });
          }
          return networkRes;
        });
      }).catch(() => caches.match('/index.html')) // Fallback offline
  );
});
