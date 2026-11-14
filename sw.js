// LiftLog service worker: works offline, updates itself when a connection is available.
// Bump VERSION only if you want to force-clear old caches; normal updates need no change.
const VERSION = 'liftlog-v2';
const FILES = ['./', './index.html', './manifest.webmanifest', './icon-180.png', './icon-192.png', './icon-512.png'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(VERSION).then(c => c.addAll(FILES)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys => Promise.all(keys.filter(k => k !== VERSION).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

// Network-first (3s timeout) so a new version is picked up on open when online;
// falls back to the cached copy when offline or the connection is slow.
self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== location.origin) return;
  e.respondWith((async () => {
    const cache = await caches.open(VERSION);
    try {
      const ctrl = new AbortController();
      const t = setTimeout(() => ctrl.abort(), 3000);
      const res = await fetch(req, {signal: ctrl.signal, cache: 'no-cache'});
      clearTimeout(t);
      if (res && res.ok) cache.put(req, res.clone());
      return res;
    } catch (err) {
      const hit = await cache.match(req, {ignoreSearch: true}) || (req.mode === 'navigate' && await cache.match('./index.html'));
      if (hit) return hit;
      throw err;
    }
  })());
});
