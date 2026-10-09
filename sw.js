/* Mind Soul & Body — service worker
   Shell: precached, but HTML/JS/CSS are NETWORK-FIRST at runtime so
   deploys land immediately (no stale-build trap). Study JSON under data/
   and study-notes.json are NETWORK-FIRST so lesson notes update immediately.
   Bible book JSON lives in its own cache (BIBLE_CACHE). That cache is NOT
   tied to CACHE_VERSION, so an app update does not wipe downloaded books.
   A newer Bible cache is seeded from the previous one so offline reading
   still opens, then each book is replaced from the network the next time
   it is fetched. Story illustrations live in STORIES_CACHE, also kept
   across app updates. Only caches named with this app's msb- prefix are
   deleted, so another app on the same origin keeps its own caches.
   Bump BIBLE_DATA_VERSION only when the Bible JSON itself changes.
   Bump CACHE_VERSION to refresh the precached shell. */
const CACHE_VERSION = 'v80';
const SHELL_CACHE = `msb-shell-${CACHE_VERSION}`;
const DATA_CACHE = `msb-data-${CACHE_VERSION}`;
const BIBLE_DATA_VERSION = 'kjv-2';
const BIBLE_CACHE = `msb-bible-${BIBLE_DATA_VERSION}`;
const RVR_DATA_VERSION = 'rvr1909-4';
const RVR_CACHE = `msb-bible-${RVR_DATA_VERSION}`;
const APP_CACHE_PREFIX = 'msb-';
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
];

const DATA_FILES = [
  './data/study-challenges.json',
  './data/study-library.json',
  './data/holy-spirit.json',
  './data/game-bank.json',
  './data/trivia.json',
  './bible/study-notes.json',
];

const STORY_FILES = STORY_IDS.flatMap((id) => [`./img/stories/${id}.webp`, `./img/stories/${id}-512.webp`]);

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
  event.waitUntil((async () => {
    const shell = await caches.open(SHELL_CACHE);
    await shell.addAll(SHELL);
    const data = await caches.open(DATA_CACHE);
    await data.addAll(DATA_FILES);
    const bible = await caches.open(BIBLE_CACHE);
    await bible.addAll(['./bible/index.json']);
    const rvr = await caches.open(RVR_CACHE);
    await rvr.addAll(['./bible/rvr/index.json']);
    const stories = await caches.open(STORIES_CACHE);
    await stories.addAll(STORY_FILES);
    await self.skipWaiting();
  })());
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then(async (keys) => {
        await preserveBibleBooks(keys);
        await preserveRvrBooks(keys);
        await preserveStories(keys);
        const kept = new Set([SHELL_CACHE, DATA_CACHE, BIBLE_CACHE, RVR_CACHE, STORIES_CACHE]);
        await Promise.all(
          keys.filter((k) => k.startsWith(APP_CACHE_PREFIX) && !kept.has(k))
            .map((k) => caches.delete(k))
        );
      })
      .then(() => self.clients.claim())
  );
});

function freshOrCached(cacheName, request) {
  const cached = () => caches.open(cacheName).then((cache) => cache.match(request));
  return fetch(request).then((res) => {
    if (res && res.ok) {
      const copy = res.clone();
      caches.open(cacheName).then((cache) => cache.put(request, copy));
      return res;
    }
    return cached().then((hit) => hit || res);
  }).catch(() => cached().then((hit) => hit || Response.error()));
}

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
    event.respondWith(freshOrCached(RVR_CACHE, request));
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
    event.respondWith(freshOrCached(BIBLE_CACHE, request));
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
