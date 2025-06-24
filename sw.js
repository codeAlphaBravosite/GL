const VERSION = '1.0.6'; // Increment version for updates
const CACHE_NAME = `goal-achiever-cache-${VERSION}`;

const STATIC_CACHE_URLS = [
  './', // Important: Caches the root, often resolves to index.html
  './index.html',
  './manifest.webmanifest', // Cache the manifest itself
  './icon-192x192.png',
  './icon-512x512.png',
  'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css' // Cache external Font Awesome
  // Add any other static local assets if you split CSS/JS into separate files later
];

self.addEventListener('install', event => {
  console.log(`[SW ${VERSION}] Installing...`);
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log(`[SW ${VERSION}] Caching app shell`);
        return cache.addAll(STATIC_CACHE_URLS);
      })
      .then(() => self.skipWaiting())
      .catch(error => {
        console.error(`[SW ${VERSION}] Failed to cache app shell:`, error);
      })
  );
});

self.addEventListener('activate', event => {
  console.log(`[SW ${VERSION}] Activating...`);
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName.startsWith('goal-achiever-cache-') && cacheName !== CACHE_NAME) {
            console.log(`[SW ${VERSION}] Deleting old cache: ${cacheName}`);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => self.clients.claim()) // Ensure new SW takes control immediately
  );
});

self.addEventListener('fetch', event => {
  // We only want to handle GET requests for caching
  if (event.request.method !== 'GET') {
    return;
  }

  event.respondWith(
    caches.match(event.request)
      .then(cachedResponse => {
        // Cache hit - return response
        if (cachedResponse) {
          return cachedResponse;
        }

        // Not in cache - go to network
        return fetch(event.request).then(
          networkResponse => {
            // Check if we received a valid response
            if (!networkResponse || networkResponse.status !== 200 || networkResponse.type !== 'basic' && networkResponse.type !== 'cors') {
              // For opaque responses (like CDN no-cors), we can't clone or check status accurately,
              // but we might still want to cache them if they are essential.
              // For FontAwesome, type will be 'cors' if server allows it, or 'opaque'
              if (networkResponse.type === 'opaque' && STATIC_CACHE_URLS.includes(event.request.url)) {
                 // Clone and cache opaque responses for listed static URLs
              } else if (networkResponse.type !== 'opaque') { // Don't cache other opaque responses by default
                return networkResponse;
              }
            }

            // IMPORTANT: Clone the response. A response is a stream
            // and because we want the browser to consume the response
            // as well as the cache consuming the response, we need
            // to clone it so we have two streams.
            const responseToCache = networkResponse.clone();

            caches.open(CACHE_NAME)
              .then(cache => {
                cache.put(event.request, responseToCache);
              });

            return networkResponse;
          }
        ).catch(error => {
          // Network request failed, try to serve a fallback for navigation
          console.warn(`[SW ${VERSION}] Network fetch failed for ${event.request.url}. Error: ${error}`);
          if (event.request.mode === 'navigate') {
            console.log(`[SW ${VERSION}] Serving offline page for navigation to ${event.request.url}`);
            return caches.match('./index.html');
          }
          // For other types of requests (images, scripts, styles),
          // if they fail and are not in cache, there's no specific fallback here,
          // they will just fail as they would without SW.
          // You could add specific fallbacks for images etc. if needed.
        });
      })
  );
});

// Background Sync (placeholder - not actively used by the current app logic)
self.addEventListener('sync', event => {
  if (event.tag === 'sync-goals') { // Changed tag to be more relevant
    console.log(`[SW ${VERSION}] Background sync event: ${event.tag}`);
    // event.waitUntil(syncGoals()); // Call your sync function
  }
});

async function syncGoals() {
  // This function would be implemented if you had a backend to sync localStorage data with.
  // For now, the app's data is purely client-side in localStorage.
  console.log(`[SW ${VERSION}] Attempting to sync goals... (Not implemented for current version)`);
  // Example:
  // const client = await self.clients.get(event.clientId); // Get client to send message
  // const dataFromLocalStorage = await getGoalsFromIndexedDBOrClient(); // pseudo-function
  // try {
  //   const response = await fetch('/api/sync-goals', {
  //     method: 'POST',
  //     body: JSON.stringify(dataFromLocalStorage),
  //     headers: {'Content-Type': 'application/json'}
  //   });
  //   if (response.ok) {
  //     console.log('Goals synced successfully');
  //     // Optionally clear local queue or notify client
  //   } else {
  //     console.error('Failed to sync goals to server');
  //   }
  // } catch (error) {
  //   console.error('Network error during sync:', error);
  //   // Sync will be retried later by the browser
  //   throw error; // Important to throw error so browser knows to retry
  // }
}
