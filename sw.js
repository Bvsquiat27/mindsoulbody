/* Mind Soul & Body — service worker
   Shell: precached lightly, but HTML/JS/CSS are NETWORK-FIRST at runtime so
   deploys land immediately (no stale-build trap). Bible/study JSON under
   bible/ and data/ is CACHE-FIRST (versioned with the deploy) and lazy-cached
   per book on first read. Bump CACHE_VERSION to force a clean precache. */
const CACHE_VERSION = 'v42';
const SHELL_CACHE = `msb-shell-${CACHE_VERSION}`;
const DATA_CACHE = `msb-data-${CACHE_VERSION}`;

const SHELL = [
  './',
  './index.html',
  './manifest.webmanifest',
  './favicon.svg',
  './icon-192.png',
  './icon-512.png',
  './icon-maskable-512.png',
  './aura.css',
  './study-design.css',
  './games.js',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(SHELL_CACHE)
      .then((cache) => cache.addAll(SHELL))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(
        keys.filter((k) => k !== SHELL_CACHE && k !== DATA_CACHE)
            .map((k) => caches.delete(k))
      ))
      .then(() => self.clients.claim())
  );
});

const isBibleRequest = (url) => url.pathname.includes('/bible/');
const isDataRequest = (url) => url.pathname.includes('/data/');

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  if (isBibleRequest(url)) {
    // Cache-first for verse JSON (the text never changes); populate on first fetch.
    event.respondWith(
      caches.match(request).then((hit) => hit || fetch(request).then((res) => {
        if (res.ok) {
          const copy = res.clone();
          caches.open(DATA_CACHE).then((cache) => cache.put(request, copy));
        }
        return res;
      }))
    );
    return;
  }

  if (isDataRequest(url)) {
    // Network-first for study/game JSON so content and answer-key updates
    // can never be served stale; fall back to cache when offline.
    event.respondWith(
      fetch(request)
        .then((res) => {
          if (res.ok) {
            const copy = res.clone();
            caches.open(DATA_CACHE).then((cache) => cache.put(request, copy));
          }
          return res;
        })
        .catch(() => caches.match(request))
    );
    return;
  }

  // Network-first for the shell so updates arrive on the next load;
  // fall back to cache (and to index.html for navigations) when offline.
  event.respondWith(
    fetch(request)
      .then((res) => {
        if (res.ok) {
          const copy = res.clone();
          caches.open(SHELL_CACHE).then((cache) => cache.put(request, copy));
        }
        return res;
      })
      .catch(() => caches.match(request).then((hit) => {
        if (hit) return hit;
        if (request.mode === 'navigate') return caches.match('./index.html');
        return Response.error();
      }))
  );
});
