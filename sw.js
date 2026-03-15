const CACHE = 'travel-map-v2';
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
  '/js/topo_renderer.js',
  '/data/cities/110000.json',
  '/data/cities/120000.json',
  '/data/cities/130000.json',
  '/data/cities/140000.json',
  '/data/cities/150000.json',
  '/data/cities/210000.json',
  '/data/cities/220000.json',
  '/data/cities/230000.json',
  '/data/cities/310000.json',
  '/data/cities/320000.json',
  '/data/cities/330000.json',
  '/data/cities/340000.json',
  '/data/cities/350000.json',
  '/data/cities/360000.json',
  '/data/cities/370000.json',
  '/data/cities/410000.json',
  '/data/cities/420000.json',
  '/data/cities/430000.json',
  '/data/cities/440000.json',
  '/data/cities/450000.json',
  '/data/cities/460000.json',
  '/data/cities/500000.json',
  '/data/cities/510000.json',
  '/data/cities/520000.json',
  '/data/cities/530000.json',
  '/data/cities/540000.json',
  '/data/cities/610000.json',
  '/data/cities/620000.json',
  '/data/cities/630000.json',
  '/data/cities/640000.json',
  '/data/cities/650000.json'
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
  e.respondWith(
    caches.match(e.request).then(r => r || fetch(e.request).then(resp => {
      // Cache any new GET requests too
      const clone = resp.clone();
      caches.open(CACHE).then(c => c.put(e.request, clone));
      return resp;
    }))
  );
});
