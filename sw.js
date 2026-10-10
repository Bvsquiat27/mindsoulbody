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
   Worship audio is not precached. The first play stores the whole file in
   AUDIO_CACHE (kept across updates); later plays, online or offline, are
   served from it, with Range requests answered as 206 slices.
   Bump BIBLE_DATA_VERSION only when the Bible JSON itself changes.
   Bump CACHE_VERSION to refresh the precached shell. */
const CACHE_VERSION = 'v88';
const SHELL_CACHE = `msb-shell-${CACHE_VERSION}`;
const DATA_CACHE = `msb-data-${CACHE_VERSION}`;
const BIBLE_DATA_VERSION = 'kjv-3';
const BIBLE_CACHE = `msb-bible-${BIBLE_DATA_VERSION}`;
const RVR_DATA_VERSION = 'rvr1909-4';
const RVR_CACHE = `msb-bible-${RVR_DATA_VERSION}`;
const APP_CACHE_PREFIX = 'msb-';
const STORIES_CACHE = 'msb-stories-1';
const AUDIO_CACHE = 'msb-audio-1';
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
  './coloring-core.js',
  './coloring.js',
  './stories.js',
  './bridge.js',
  './speech.js',
  './love.js',
  './memory-schedule.js',
  './memory.js',
];

const DATA_FILES = [
  './data/study-challenges.json',
  './data/study-library.json',
  './data/holy-spirit.json',
  './data/game-bank.json',
  './data/trivia.json',
  './bible/study-notes.json',
  './data/offline-verses.json',
];

// Only the small covers are precached. The full-size pictures are cached
// the first time a story is opened; offline, a missing one falls back to its
// small cover.
const STORY_FILES = STORY_IDS.map((id) => `./img/stories/${id}-512.webp`)
  .concat(STORY_IDS.map((id) => `./img/coloring/${id}-400.webp`));

function offlineResponse(url) {
  const json = /\.json$/.test(url.pathname);
  return new Response(json ? JSON.stringify({ offline: true, error: 'Not saved on this device yet.' }) : 'Not saved on this device yet.', {
    status: 503,
    statusText: 'Offline',
    headers: { 'Content-Type': json ? 'application/json; charset=utf-8' : 'text/plain; charset=utf-8', 'Cache-Control': 'no-store' }
  });
}

const isBibleBook = (url) => /\/bible\/(?:index|\d\d)\.json$/.test(url.pathname);
const isRvrBook = (url) => /\/bible\/rvr\/(?:index|\d\d)\.json$/.test(url.pathname);
const isFatherNotes = (url) => /\/bible\/fathers\/\d\d\.json$/.test(url.pathname);
const isStoryArt = (url) => /\/img\/(?:stories\/[a-z0-9-]+\.webp|coloring\/[a-z0-9-]+\.(?:png|webp))$/.test(url.pathname);
const isWorshipAudio = (url) => /\/audio\/[a-z0-9-]+\.(?:ogg|mp3)$/.test(url.pathname);
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
        const kept = new Set([SHELL_CACHE, DATA_CACHE, BIBLE_CACHE, RVR_CACHE, STORIES_CACHE, AUDIO_CACHE]);
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

// Answer a Range request from a full cached file.
async function rangeResponse(full, rangeHeader) {
  const buffer = await full.arrayBuffer();
  const size = buffer.byteLength;
  const type = full.headers.get('Content-Type') || 'application/octet-stream';
  const match = /^bytes=(\d*)-(\d*)$/.exec(String(rangeHeader || '').trim());
  if (!match) {
    return new Response(buffer, { status: 200, headers: { 'Content-Type': type, 'Content-Length': String(size), 'Accept-Ranges': 'bytes' } });
  }
  let start = match[1] === '' ? NaN : Number(match[1]);
  let end = match[2] === '' ? NaN : Number(match[2]);
  if (Number.isNaN(start)) { start = Math.max(0, size - (Number.isNaN(end) ? 0 : end)); end = size - 1; }
  if (Number.isNaN(end) || end >= size) end = size - 1;
  if (start >= size || start > end) {
    return new Response(null, { status: 416, headers: { 'Content-Range': `bytes */${size}` } });
  }
  return new Response(buffer.slice(start, end + 1), {
    status: 206,
    statusText: 'Partial Content',
    headers: { 'Content-Type': type, 'Content-Length': String(end - start + 1), 'Content-Range': `bytes ${start}-${end}/${size}`, 'Accept-Ranges': 'bytes' }
  });
}

// Worship audio: cache-first. The first play fetches the whole file (no Range),
// stores it, and every later play is answered from the cache.
async function worshipAudio(request, url) {
  const cache = await caches.open(AUDIO_CACHE);
  const key = new Request(url.href);
  let full = await cache.match(key);
  if (!full) {
    try {
      const res = await fetch(key);
      if (res && res.ok && res.status === 200) {
        await cache.put(key, res.clone());
        full = res;
      } else {
        return res;
      }
    } catch {
      return offlineResponse(url);
    }
  }
  return rangeResponse(full, request.headers.get('Range'));
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
        .catch(() => caches.match(request).then((hit) => hit || offlineResponse(url)))
    );
    return;
  }

  if (isWorshipAudio(url)) {
    event.respondWith(worshipAudio(request, url));
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
      }).catch(() => {
        const small = url.pathname.replace(/(\/img\/stories\/[a-z]+)\.webp$/, '$1-512.webp').replace(/(\/img\/coloring\/[a-z]+)\.png$/, '$1-400.webp');
        return (small !== url.pathname ? cache.match(new URL(small, url.origin).href) : Promise.resolve(null))
          .then((hit) => hit || offlineResponse(url));
      })))
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
