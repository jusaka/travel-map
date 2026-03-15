const CACHE = 'travel-map-v1';
const ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/icon-192.png',
  '/icon-512.png',
  '/js/data.js',
  '/js/state.js',
  '/js/profile.js',
  '/js/map.js',
  '/js/events.js',
  '/js/ui.js',
  '/js/init.js',
  '/js/topo_data.js',
  '/js/topo_renderer.js'
];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS)));
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))));
  self.clients.claim();
});

self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  // Don't cache city boundary data (too large, loaded on demand)
  if (e.request.url.includes('/data/cities/')) return;
  e.respondWith(caches.match(e.request).then(r => r || fetch(e.request)));
});
