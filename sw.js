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
const CACHE_VERSION = 'v165';
const SHELL_CACHE = `msb-shell-${CACHE_VERSION}`;
const DATA_CACHE = `msb-data-${CACHE_VERSION}`;
const BIBLE_DATA_VERSION = 'kjv-3';
const BIBLE_CACHE = `msb-bible-${BIBLE_DATA_VERSION}`;
const RVR_DATA_VERSION = 'rvr1909-4';
const RVR_CACHE = `msb-bible-${RVR_DATA_VERSION}`;
const APP_CACHE_PREFIX = 'msb-';
const STORIES_CACHE = 'msb-stories-1';
const AUDIO_CACHE = 'msb-audio-1';
/* Google Fonts (the stylesheet and the font files) are kept across updates
   and served stale-while-revalidate, so the app keeps its type offline. */
const FONTS_CACHE = 'msb-fonts-1';
const FONT_HOSTS = ['fonts.googleapis.com', 'fonts.gstatic.com'];
const COLORING_IDS = ['creation', 'noah', 'stars', 'joseph', 'moses', 'david', 'daniel', 'jonah', 'nativity', 'storm', 'children', 'feeding', 'sheep', 'easter'];
const STORY_IDS = ['creation', 'noah', 'stars', 'ladder', 'joseph', 'moses', 'redsea', 'samuel', 'david', 'daniel', 'jonah', 'nativity', 'storm', 'children', 'feeding', 'sheep', 'easter', 'ruth', 'elijah', 'esther', 'baptism', 'samaritan', 'zacchaeus', 'bartimaeus'];

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
  './kidgames.css',
  './aura.js',
  './dialog-focus.js',
  './rv-case.js',
  './bible-reader.js',
  './trivia-game.js',
  './games.js',
  './prayers.js',
  './orthodox-day.js',
  './study-tools.js',
  './devotional-data.js',
  './devotional.js',
  './achievements-rules.js',
  './study-session.js',
  './i18n.js',
  './moments.js',
  './coloring-core.js',
  './coloring-fx.js',
  './drawings-store.js',
  './drawings.js',
  './coloring.js',
  './squishy-data.js',
  './squishy-core.js',
  './squishy-art.js',
  './squishy-fx.js',
  './squishy-trade.js',
  './squishy-social.js',
  './squishy-room.js',
  './squishy.js',
  './match3-data.js',
  './match3-core.js',
  './match3-art.js',
  './match3.js',
  './kidgames-data.js',
  './kidgames-core.js',
  './kids-art.js',
  './kidgames.js',
  './kg-wordsearch.js',
  './kg-order.js',
  './kg-who.js',
  './kg-verse.js',
  './kg-map.js',
  './kg-sling.js',
  './stories.js',
  './my-notes.js',
  './reading-share.js',
  './dm.js',
  './bridge.js',
  './speech.js',
  './love.js',
  './luz-data.js',
  './luz.js',
  './luz.css',
  './img/luz/luz-video-thumb.jpg',
  './memory-schedule.js',
  './memory.js',
];

const DATA_FILES = [
  './data/study-challenges.json',
  './data/study-library.json',
  './data/study-index.json',
  './data/holy-spirit.json',
  './data/game-bank.json',
  './data/trivia.json',
  './bible/study-notes.json',
  './data/offline-verses.json',
];

// Only the small covers are precached. The full-size pictures are cached
// the first time a story is opened; offline, a missing one falls back to its
// small cover.
const KIDS_ART = ['badge-medal', 'color-crayons', 'gbadge-ark-1', 'gbadge-ark-all', 'gbadge-map-1', 'gbadge-map-all', 'gbadge-order-1', 'gbadge-order-all', 'gbadge-sling-all', 'gbadge-verse-1', 'gbadge-verse-all', 'gbadge-who-10', 'gbadge-who-5', 'gbadge-word-1', 'gbadge-word-all', 'howto-map-read', 'howto-map-stamp', 'howto-sling-aim', 'howto-sling-match', 'howto-sling-swap', 'howto-sling-win', 'm3-bomb', 'm3-fish', 'm3-grapes', 'm3-heart', 'm3-leaf', 'm3-loaf', 'm3-lost-sprout', 'm3-sp-burst', 'm3-sp-col', 'm3-sp-row', 'm3-star', 'm3ch-birth', 'm3ch-carmel', 'm3ch-creation', 'm3ch-daniel', 'm3ch-david', 'm3ch-easter', 'm3ch-esther', 'm3ch-gate', 'm3ch-heaven', 'm3ch-jericho', 'm3ch-jonah', 'm3ch-loaves', 'm3ch-lost', 'm3ch-noah', 'm3ch-pentecost', 'm3ch-prison', 'm3ch-road', 'm3ch-ruth', 'm3ch-sea', 'm3ch-tree', 'pile-loaves-fish', 'sling-lost', 'sling-pow-bomb', 'sling-pow-reverse', 'sling-pow-slow', 'sling-pow-zap', 'sling-stone', 'sling-z1', 'sling-z10', 'sling-z11', 'sling-z12', 'sling-z13', 'sling-z14', 'sling-z15', 'sling-z2', 'sling-z3', 'sling-z4', 'sling-z5', 'sling-z6', 'sling-z7', 'sling-z8', 'sling-z9', 'sqbadge-all-lessons', 'sqbadge-anchor', 'sqbadge-ark', 'sqbadge-basket', 'sqbadge-boat', 'sqbadge-bush', 'sqbadge-chariot', 'sqbadge-coat', 'sqbadge-coin', 'sqbadge-crown', 'sqbadge-donkey', 'sqbadge-elephant', 'sqbadge-first-squish', 'sqbadge-first-trick', 'sqbadge-friendship', 'sqbadge-honeycomb', 'sqbadge-jar', 'sqbadge-key', 'sqbadge-ladder', 'sqbadge-lamp', 'sqbadge-lily', 'sqbadge-loaves', 'sqbadge-manna', 'sqbadge-match-3star', 'sqbadge-oil', 'sqbadge-pearl', 'sqbadge-raven', 'sqbadge-scroll', 'sqbadge-seed', 'sqbadge-shield', 'sqbadge-shofar', 'sqbadge-squish-200', 'sqbadge-stone', 'sqbadge-tablets', 'sqbadge-tomb', 'sqbadge-tree', 'sqbadge-trick-master', 'sqbadge-wheat', 'stamp-abraham-0', 'stamp-abraham-1', 'stamp-abraham-2', 'stamp-abraham-3', 'stamp-abraham-4', 'stamp-abraham-5', 'stamp-exodus-0', 'stamp-exodus-1', 'stamp-exodus-2', 'stamp-exodus-3', 'stamp-exodus-4', 'stamp-exodus-5', 'stamp-fallback', 'stamp-jonah-0', 'stamp-jonah-1', 'stamp-jonah-2', 'stamp-jonah-3', 'stamp-jonah-4', 'stamp-jonah-5', 'stamp-magi-0', 'stamp-magi-1', 'stamp-magi-2', 'stamp-magi-3', 'stamp-magi-4', 'stamp-magi-5', 'stamp-paul-0', 'stamp-paul-1', 'stamp-paul-2', 'stamp-paul-3', 'stamp-paul-4', 'stamp-paul-5', 'stamp-ruth-0', 'stamp-ruth-1', 'stamp-ruth-2', 'stamp-ruth-3', 'stamp-ruth-4', 'stamp-ruth-5', 'tier-common', 'tier-legendary', 'tier-rare', 'tile-map', 'tile-order', 'tile-sling', 'tile-verse', 'tile-who', 'tile-wordsearch', 'ws-armor', 'ws-fruit', 'ws-joseph', 'ws-prayer', 'wx-clear', 'wx-dawn', 'wx-heat', 'wx-rain', 'wx-storm', 'wx-wind'];
const STORY_ART_V2 = ['creation', 'noah', 'stars', 'ladder', 'redsea', 'samuel', 'joseph', 'moses', 'david', 'daniel', 'jonah', 'nativity', 'storm', 'children', 'feeding', 'sheep', 'easter'];
const storyArt = (id) => (STORY_ART_V2.includes(id) ? `${id}-v2` : id);
/* Painted achievement badges (img/ach/<id>-128.webp); the same ids as
   MSB_ACH_ART in aura.js. Empty until the art is painted. */
const ACH_ART = [];
const STORY_FILES = STORY_IDS.map((id) => `./img/stories/${storyArt(id)}-512.webp`)
  .concat(COLORING_IDS.map((id) => `./img/coloring/${id}-400.webp`))
  /* painted game art: David's Sling and Map Journey travelers */
  .concat(['goliath-idle', 'goliath-angry', 'goliath-hit', 'goliath-laugh', 'david', 'valley'].map((n) => `./img/sling/${n}.webp`))
  .concat(['map-exodus', 'map-paul', 'map-abraham', 'map-jonah', 'map-ruth', 'map-magi'].map((n) => `./img/map/${n}.webp`))
  /* Abby's Room: painted header and icon */
  .concat(['abbys-room-icon-96', 'abbys-room-icon-192', 'abbys-room-icon-384', 'abbys-room-banner-640', 'abbys-room-banner-1280'].map((n) => `./img/room/${n}.webp`))
  /* Abby's Room painted icons (kids-art.js NAMES): the 128 px files are
     precached (~1.4 MB); the 256 px files are cached the first time they
     are shown, and offline a missing 256 is answered with its 128. */
  .concat(KIDS_ART.map((n) => `./img/kids/${n}-128.webp`))
  .concat(ACH_ART.map((id) => `./img/ach/${id}-128.webp`));

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
const isStoryArt = (url) => /\/img\/(?:stories\/[a-z0-9-]+\.webp|room\/[a-z0-9-]+\.webp|kids\/[a-z0-9-]+-(?:128|256)\.webp|ach\/[a-z0-9-]+-(?:128|256)\.webp|coloring\/[a-z0-9-]+\.(?:png|webp))$/.test(url.pathname);
const CURRENT_STORY_ART = new Set(STORY_IDS.flatMap((id) => [`${storyArt(id)}.webp`, `${storyArt(id)}-512.webp`]));
const isOldStoryArt = (url) => { const m = url.pathname.match(/\/img\/stories\/([a-z0-9-]+\.webp)$/); return !!m && !CURRENT_STORY_ART.has(m[1]); };
const REFILL_HEADER = 'X-MSB-Refill';
const isWorshipAudio = (url) => /\/audio\/[a-z0-9-]+\.(?:ogg|mp3)$/.test(url.pathname);
const isStudyNotes = (url) => url.pathname.endsWith('/study-notes.json');
const isDataRequest = (url) => url.pathname.includes('/data/');
/* The two big game packs (about 1 MB together) change only with a release, so
   they are served cache-first from this version's DATA_CACHE, which install
   fills. A new CACHE_VERSION brings the new copies; other data stays
   network-first. */
const VERSIONED_DATA = ['/data/study-challenges.json', '/data/holy-spirit.json'];
const isVersionedData = (url) => VERSIONED_DATA.some((p) => url.pathname.endsWith(p));
async function versionedData(request) {
  const cache = await caches.open(DATA_CACHE);
  const key = new URL(request.url); key.search = '';
  const hit = await cache.match(key.href);
  if (hit) return hit;
  try {
    const res = await fetch(key.href);
    if (res.ok) await cache.put(key.href, res.clone());
    return res;
  } catch {
    return (await caches.match(key.href)) || offlineResponse(new URL(request.url));
  }
}

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
      const url = new URL(request.url);
      if (!isStoryArt(url) || isOldStoryArt(url)) continue;
      const hit = await cache.match(request);
      if (hit) await stories.put(request, hit.clone());
    }
  }
  /* Drop story pictures whose names are no longer used (art that was
     repainted under a new name), so old files do not pile up on phones. */
  for (const request of await stories.keys()) {
    if (isOldStoryArt(new URL(request.url))) await stories.delete(request);
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
    /* reload: skip the browser's HTTP cache so a new version never stores an
       older copy of the cache-first game packs. */
    await data.addAll(DATA_FILES.map((f) => new Request(f, { cache: 'reload' })));
    const bible = await caches.open(BIBLE_CACHE);
    await bible.addAll(['./bible/index.json']);
    const rvr = await caches.open(RVR_CACHE);
    await rvr.addAll(['./bible/rvr/index.json']);
    /* painted art (~4.5 MB) is kept across updates: fetch only what is missing,
       so a version bump does not download every picture again. Art files are
       never edited in place; changed art gets a new file name. */
    const stories = await caches.open(STORIES_CACHE);
    const have = new Set((await stories.keys()).map((r) => new URL(r.url).pathname));
    const missing = STORY_FILES.filter((f) => !have.has(new URL(f, self.registration.scope).pathname));
    if (missing.length) await stories.addAll(missing);
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
        const kept = new Set([SHELL_CACHE, DATA_CACHE, BIBLE_CACHE, RVR_CACHE, FONTS_CACHE, STORIES_CACHE, AUDIO_CACHE]);
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

// Google Fonts: answer from the cache at once when there is a copy, and
// refresh that copy in the background. The stylesheet link has no
// crossorigin attribute, so its response is opaque; it is still cached.
async function googleFont(event, request) {
  const cache = await caches.open(FONTS_CACHE);
  const hit = await cache.match(request);
  const refresh = fetch(request).then((res) => {
    if (res && (res.ok || res.type === 'opaque')) return cache.put(request, res.clone()).then(() => res);
    return res;
  }).catch(() => null);
  if (hit) { event.waitUntil(refresh); return hit; }
  const res = await refresh;
  return res || new Response('', { status: 503, statusText: 'Offline' });
}

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  if (FONT_HOSTS.includes(url.hostname) && url.protocol === 'https:') {
    event.respondWith(googleFont(event, request));
    return;
  }
  /* Other cross-origin requests (the API, the Lessons for Luz video frame)
     are never cached here. */
  if (url.origin !== self.location.origin) return;

  if (isVersionedData(url)) {
    event.respondWith(versionedData(request));
    return;
  }

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
        /* A refill from "save offline" wants the real file or nothing: never
           hand it the small cover under the full-size name. */
        if (request.headers.get(REFILL_HEADER)) return new Response('', { status: 503, statusText: 'Offline' });
        const small = url.pathname.replace(/(\/img\/stories\/[a-z]+(?:-v\d+)?)\.webp$/, '$1-512.webp').replace(/(\/img\/coloring\/[a-z]+)\.png$/, '$1-400.webp').replace(/(\/img\/(?:kids|ach)\/[a-z0-9-]+)-256\.webp$/, '$1-128.webp');
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

/* Morning devotional reminder (sent by the friends worker, see worker/push.mjs).
   The payload is { title, body, url, tag, date, lang }. It reads like a text
   message; tapping it opens that day's devotional. */
self.addEventListener('push', (event) => {
  let msg = {};
  try { msg = event.data ? event.data.json() : {}; } catch { msg = { title: 'Mind Soul & Body', body: event.data ? event.data.text() : '' }; }
  const title = String(msg.title || 'Mind Soul & Body').slice(0, 120);
  event.waitUntil(self.registration.showNotification(title, {
    body: String(msg.body || '').slice(0, 240),
    icon: './icon-192.png',
    badge: './icon-192.png',
    tag: String(msg.tag || 'msb-devotional'),
    lang: msg.lang === 'es' ? 'es' : 'en',
    data: { url: String(msg.url || './'), date: /^\d{4}-\d{2}-\d{2}$/.test(msg.date) ? msg.date : '' },
  }));
});
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const data = event.notification.data || {};
  const target = new URL(data.url || './', self.registration.scope);
  if (target.origin !== self.location.origin) return;
  event.waitUntil((async () => {
    const wins = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    const win = wins.find((w) => w.url.startsWith(self.registration.scope));
    if (win) { await win.focus(); win.postMessage({ type: 'msb-open-devotional', date: data.date || '' }); return; }
    await self.clients.openWindow(target.href);
  })());
});
