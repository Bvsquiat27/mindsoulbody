/* Mind Soul & Body — service worker
   Shell: precached, but HTML/JS/CSS are NETWORK-FIRST at runtime so
   deploys land immediately (no stale-build trap). Study JSON under data/
   and study-notes.json are NETWORK-FIRST so lesson notes update immediately.
   Bible book JSON lives in its own cache (BIBLE_CACHE). That cache is NOT
   tied to CACHE_VERSION, so an app update does not wipe downloaded books.
   Story illustrations live in STORIES_CACHE, also kept across app updates.
   Bump BIBLE_DATA_VERSION only when the Bible JSON itself changes.
   Bump CACHE_VERSION to refresh the precached shell. */
const CACHE_VERSION = 'v75';
const SHELL_CACHE = `msb-shell-${CACHE_VERSION}`;
const DATA_CACHE = `msb-data-${CACHE_VERSION}`;
const BIBLE_DATA_VERSION = 'kjv-1';
const BIBLE_CACHE = `msb-bible-${BIBLE_DATA_VERSION}`;
const RVR_DATA_VERSION = 'rvr1909-1';
const RVR_CACHE = `msb-bible-${RVR_DATA_VERSION}`;
const STORIES_CACHE = 'msb-stories-1';
const STORY_IDS = ['creation', 'noah', 'stars', 'joseph', 'moses', 'david', 'daniel', 'jonah', 'nativity', 'storm', 'children', 'feeding', 'sheep', 'easter'];

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
  './aura.js',
  './bible-reader.js',
  './trivia-game.js',
  './games.js',
  './prayers.js',
  './orthodox-day.js',
  './study-tools.js',
  './achievements-rules.js',
  './i18n.js',
  './moments.js',
  './stories.js',
  './bridge.js',
  './audio/still-waters.ogg',
  './audio/still-waters.mp3',
  ...STORY_IDS.flatMap((id) => [`./img/stories/${id}.webp`, `./img/stories/${id}-512.webp`]),
];

const isBibleBook = (url) => /\/bible\/(?:index|\d\d)\.json$/.test(url.pathname);
const isRvrBook = (url) => /\/bible\/rvr\/(?:index|\d\d)\.json$/.test(url.pathname);
const isFatherNotes = (url) => /\/bible\/fathers\/\d\d\.json$/.test(url.pathname);
const isStoryArt = (url) => /\/img\/stories\/[a-z0-9-]+\.webp$/.test(url.pathname);
const isStudyNotes = (url) => url.pathname.endsWith('/study-notes.json');
const isDataRequest = (url) => url.pathname.includes('/data/');

async function preserveBibleBooks(keys) {
  const bible = await caches.open(BIBLE_CACHE);
  for (const key of keys) {
    if (key === BIBLE_CACHE) continue;
    const cache = await caches.open(key);
    const requests = await cache.keys();
    for (const request of requests) {
      const path = new URL(request.url).pathname;
      if (!isBibleBook(new URL(request.url)) && !isFatherNotes(new URL(request.url))) continue;
      if (path.endsWith('/study-notes.json')) continue;
      const hit = await cache.match(request);
      if (hit) await bible.put(request, hit.clone());
    }
  }
}

async function preserveStories(keys) {
  const stories = await caches.open(STORIES_CACHE);
  const ordered = keys.filter((key) => key !== STORIES_CACHE);
  ordered.sort((a, b) => (a === SHELL_CACHE) - (b === SHELL_CACHE));
  for (const key of ordered) {
    const cache = await caches.open(key);
    const requests = await cache.keys();
    for (const request of requests) {
      if (!isStoryArt(new URL(request.url))) continue;
      const hit = await cache.match(request);
      if (hit) await stories.put(request, hit.clone());
    }
  }
}

async function preserveRvrBooks(keys) {
  const bible = await caches.open(RVR_CACHE);
  for (const key of keys) {
    if (key === RVR_CACHE) continue;
    const cache = await caches.open(key);
    const requests = await cache.keys();
    for (const request of requests) {
      if (!isRvrBook(new URL(request.url))) continue;
      const hit = await cache.match(request);
      if (hit) await bible.put(request, hit.clone());
    }
  }
}

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
      .then(async (keys) => {
        await preserveBibleBooks(keys);
        await preserveRvrBooks(keys);
        await preserveStories(keys);
        await Promise.all(
          keys.filter((k) => k !== SHELL_CACHE && k !== DATA_CACHE && k !== BIBLE_CACHE && k !== RVR_CACHE && k !== STORIES_CACHE)
            .map((k) => caches.delete(k))
        );
      })
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  if (isStudyNotes(url) || isDataRequest(url)) {
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

  if (isRvrBook(url)) {
    event.respondWith(
      caches.open(RVR_CACHE).then((cache) => cache.match(request).then((hit) => hit || fetch(request).then((res) => {
        if (res.ok) cache.put(request, res.clone());
        return res;
      })))
    );
    return;
  }

  if (isStoryArt(url)) {
    event.respondWith(
      caches.open(STORIES_CACHE).then((cache) => cache.match(request).then((hit) => hit || fetch(request).then((res) => {
        if (res.ok) cache.put(request, res.clone());
        return res;
      }).catch(() => caches.match(request))))
    );
    return;
  }

  if (isBibleBook(url) || isFatherNotes(url)) {
    event.respondWith(
      caches.open(BIBLE_CACHE).then((cache) => cache.match(request).then((hit) => hit || fetch(request).then((res) => {
        if (res.ok) cache.put(request, res.clone());
        return res;
      })))
    );
    return;
  }

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
