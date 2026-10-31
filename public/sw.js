// LogKaro Service Worker
self.addEventListener('install', (event) => {
    self.skipWaiting();
});

self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((keys) => Promise.all(keys.map(k => caches.delete(k))))
            .then(() => self.clients.claim())
    );
});

// Do not block or fake network errors
self.addEventListener('fetch', (event) => {
    // Pass-through without trapping network error text
    return;
});
