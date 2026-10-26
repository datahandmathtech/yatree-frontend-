const CACHE_NAME = 'logkaro-v17';

self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            return cache.addAll([
                '/manifest.json?v=17',
                '/logos.png'
            ]).catch(() => {
                // Silently fail if some assets are not available yet
                console.log('PWA: Initial cache failed, will retry on fetch.');
            });
        })
    );
    self.skipWaiting();
});

self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames.map((cacheName) => {
                    if (cacheName !== CACHE_NAME) {
                        return caches.delete(cacheName);
                    }
                })
            );
        })
    );
    return self.clients.claim();
});

self.addEventListener('fetch', (event) => {
    // Ignore non-GET requests (like POST/PUT/DELETE API calls)
    if (event.request.method !== 'GET') {
        return;
    }

    const url = new URL(event.request.url);

    // ⚡ Never intercept /assets/ JS/CSS chunks with SW — allow Vite's preloadError to handle missing chunks
    if (url.pathname.startsWith('/assets/')) {
        return;
    }

    // ⚡ Never intercept API calls
    if (url.pathname.startsWith('/api/')) {
        return;
    }

    event.respondWith(
        fetch(event.request).catch(() => {
            return caches.match(event.request).then((response) => {
                if (response) {
                    return response;
                }
                
                return new Response('Offline - Network Error', {
                    status: 503,
                    statusText: 'Service Unavailable'
                });
            });
        })
    );
});
