const CACHE_NAME = 'optinutrition-v1';
const urlsToCache = [
  '/',
  '/index.html',
  '/manifest.json'
];

// Install event - cache only essential files
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Opened cache');
        return cache.addAll(urlsToCache);
      })
      .catch(err => {
        console.error('Failed to cache:', err);
      })
  );
  // Skip waiting to activate immediately
  self.skipWaiting();
});

// Fetch event - be very conservative with caching
self.addEventListener('fetch', event => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests
  if (request.method !== 'GET') {
    return;
  }

  // Skip cross-origin requests
  if (url.origin !== location.origin) {
    return;
  }

  // Skip API requests and dynamic assets
  if (url.pathname.startsWith('/api') || 
      url.pathname.includes('.hot-update') ||
      url.pathname.includes('/@vite') ||
      url.pathname.includes('/@fs') ||
      url.pathname.includes('/node_modules')) {
    return;
  }

  // Only cache static assets and navigation requests
  const isStaticAsset = /\.(js|css|png|jpg|jpeg|svg|gif|woff|woff2|ttf|eot)$/i.test(url.pathname);
  const isNavigationRequest = request.mode === 'navigate';

  if (!isStaticAsset && !isNavigationRequest) {
    return;
  }

  event.respondWith(
    fetch(request)
      .then(response => {
        // Check if we received a valid response
        if (!response || response.status !== 200 || response.type !== 'basic') {
          return response;
        }

        // Only cache successful responses for static assets
        if (isStaticAsset) {
          const responseToCache = response.clone();
          caches.open(CACHE_NAME)
            .then(cache => {
              cache.put(request, responseToCache);
            })
            .catch(err => console.log('Cache put failed:', err));
        }

        return response;
      })
      .catch(() => {
        // Network failed, try cache only for static assets and navigation
        if (isNavigationRequest) {
          return caches.match('/index.html');
        }
        
        return caches.match(request)
          .then(response => {
            if (response) {
              return response;
            }
            // Return a basic offline response
            return new Response('Offline - resource not cached', {
              status: 503,
              statusText: 'Service Unavailable',
              headers: new Headers({
                'Content-Type': 'text/plain'
              })
            });
          });
      })
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', event => {
  const cacheWhitelist = [CACHE_NAME];
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheWhitelist.indexOf(cacheName) === -1) {
            console.log('Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => {
      // Claim all clients immediately
      return self.clients.claim();
    })
  );
});

// Handle skip waiting message
self.addEventListener('message', event => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});