const CACHE_NAME = 'vbutler-cache-v0.4';
const OFFLINE_URLS = [
  '/',
  '/index.html',
  '/css/style.css',
  '/css/bootstrap.min.css',
  '/css/video-js-minified.css',
  '/css/videojs-mobile-ui.css',
  '/js/index.js',
  '/js/utilities.js',
  '/js/bootstrap.bundle.min.js',
  '/js/video.min.js',
  '/js/videojs-mobile-ui.min.js',
  '/js/videojs.hotkeys.current-0.2.min.js',
  '/img/icon-192.png',
  '/img/icon-512.png',
  '/img/placeholder.svg',
  '/img/tube-spinner-x27.svg',
  '/img/settings-white.svg',
  '/img/settings-black.svg',
  '/favicon.ico'
];

self.addEventListener('install', event => {
    event.waitUntil(
    caches.open(CACHE_NAME).then(async cache => {
        return cache.addAll(OFFLINE_URLS)
        .catch(err => {
            console.warn('Cache addAll failed:', err);
        });
    })
    );
    self.skipWaiting();
});

self.addEventListener('activate', event => {
    event.waitUntil(
    caches.keys().then(keys => {
        return Promise.all(
        keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key))
        );
    })
    );
    self.clients.claim();
});

self.addEventListener('fetch', event => {
    if (event.request.method !== 'GET') return;
    event.respondWith(
    caches.match(event.request).then(response => {
        return response || fetch(event.request).then(networkResponse => {
        // Optionally cache new requests
        if (networkResponse && networkResponse.status === 200 && networkResponse.type === 'basic') {
            const responseClone = networkResponse.clone();
            caches.open(CACHE_NAME).then(cache => {
            cache.put(event.request, responseClone);
            });
        }
        return networkResponse;
        }).catch(() => {
        // Offline fallback
        if (event.request.destination === 'document') {
            return caches.match('/index.html');
        }
        });
    })
    );
});

// Listen for skipWaiting message to activate new SW immediately
self.addEventListener('message', event => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
