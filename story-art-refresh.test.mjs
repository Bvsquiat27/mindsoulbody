import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

/* A tiny Cache Storage stand-in: Map of cache name -> Map of url -> body. */
function fakeCaches(seed) {
  const store = new Map(Object.entries(seed).map(([k, v]) => [k, new Map(v.map((u) => [u, 'x']))]));
  const open = async (name) => {
    if (!store.has(name)) store.set(name, new Map());
    const c = store.get(name);
    return {
      keys: async () => [...c.keys()].map((url) => ({ url })),
      match: async (r) => (c.has(typeof r === 'string' ? r : r.url) ? { clone: () => 'x' } : undefined),
      put: async (r) => { c.set(typeof r === 'string' ? r : r.url, 'x'); },
      delete: async (r) => c.delete(typeof r === 'string' ? r : r.url),
    };
  };
  return { store, api: { open, keys: async () => [...store.keys()], delete: async (k) => store.delete(k) } };
}

function loadSw(caches) {
  const ctx = { self: { addEventListener() {}, location: { origin: 'https://x.test' } }, caches, URL, Response: class {}, fetch: async () => ({ ok: false }), console, Promise, Set, Map };
  vm.createContext(ctx);
  vm.runInContext(readFileSync('sw.js', 'utf8') + '\n;globalThis.__p = { preserveStories, STORIES_CACHE };', ctx);
  return ctx.__p;
}

test('the service worker prunes story art that is no longer in the list, and keeps the rest', async () => {
  const B = 'https://x.test/mindsoulbody/img/';
  const { store, api } = fakeCaches({
    'msb-stories-1': [`${B}stories/creation.webp`, `${B}stories/creation-512.webp`, `${B}stories/creation-v2.webp`, `${B}stories/ruth-512.webp`, `${B}coloring/noah-400.webp`],
    'msb-shell-v1': [`${B}stories/samuel-512.webp`, `${B}stories/samuel-v2-512.webp`],
  });
  const P = loadSw(api);
  await P.preserveStories(['msb-stories-1', 'msb-shell-v1']);
  const left = [...store.get(P.STORIES_CACHE).keys()].map((u) => u.slice(B.length)).sort();
  assert.deepEqual(left, ['coloring/noah-400.webp', 'stories/creation-v2.webp', 'stories/ruth-512.webp', 'stories/samuel-v2-512.webp']);
});

test('a device that saved everything earlier fetches missing story art from the current list', () => {
  const br = readFileSync('bible-reader.js', 'utf8');
  assert.match(br, /if \(books\.length >= BIBLE_BOOK_TOTAL\) fillStoryArt\(\);/);
  const fn = br.slice(br.indexOf('function fillStoryArt'), br.indexOf('async function refreshOffline'));
  assert.match(fn, /for \(const file of STORY_ART_FILES\)/);
  assert.match(fn, /if \(hit && !\(await isCoverCopy\(cache, file, hit\)\)\) continue;/);
  assert.match(fn, /headers: \{ \[REFILL_HEADER\]: '1' \}/);
  assert.match(fn, /if \(!refillOk\(response, url\)\) continue;/);
  assert.match(fn, /caches\.open\(STORIES_CACHE_NAME\)/);
});

function loadSwFetch(caches, fetchImpl) {
  let onFetch = null;
  const ctx = { self: { addEventListener(t, f) { if (t === 'fetch') onFetch = f; }, location: { origin: 'https://x.test' } }, caches, URL, Response, Headers, Request, fetch: fetchImpl, console, Promise, Set, Map };
  vm.createContext(ctx);
  vm.runInContext(readFileSync('sw.js', 'utf8'), ctx);
  return async (url, headers = {}) => { let p; onFetch({ request: new Request(url, { headers }), respondWith: (x) => { p = x; }, waitUntil() {} }); return p; };
}

test('offline, a refill request for full-size art gets 503, a normal request still gets the small cover', async () => {
  const B = 'https://x.test/mindsoulbody/img/stories/';
  const { api } = fakeCaches({ 'msb-stories-1': [`${B}creation-v2-512.webp`] });
  /* the fake cache returns a marker object for hits */
  const go = loadSwFetch(api, async () => { throw new TypeError('offline'); });
  const refill = await go(`${B}creation-v2.webp`, { 'X-MSB-Refill': '1' });
  assert.equal(refill.status, 503);
  const normal = await go(`${B}creation-v2.webp`);
  assert.notEqual(normal && normal.status, 503, 'normal view keeps the cover fallback');
});

test('refill stores only the real file and spots full-size entries that are cover copies', async () => {
  const src = readFileSync('bible-reader.js', 'utf8');
  const pick = (name) => src.slice(src.indexOf(`function ${name}(`), src.indexOf('\n  }\n', src.indexOf(`function ${name}(`)) + 4);
  const ctx = { URL, location: { href: 'https://x.test/mindsoulbody/' }, Uint8Array, Promise };
  vm.createContext(ctx);
  vm.runInContext(`${pick('refillOk')}\n${pick('isCoverCopy').replace('function isCoverCopy', 'async function isCoverCopy')}\nglobalThis.R = { refillOk, isCoverCopy };`.replace('async async', 'async'), ctx);
  const full = 'https://x.test/mindsoulbody/img/stories/noah-v2.webp';
  const res = (url, status = 200, type = 'image/webp') => ({ ok: status < 300, status, url, headers: new Headers({ 'Content-Type': type }) });
  assert.equal(ctx.R.refillOk(res(full), full), true);
  assert.equal(ctx.R.refillOk(res(full.replace('.webp', '-512.webp')), full), false, 'a cover answering for the full name is refused');
  assert.equal(ctx.R.refillOk(res(full, 503), full), false);
  assert.equal(ctx.R.refillOk(res(full, 200, 'text/plain'), full), false);
  const body = (bytes) => ({ clone: () => ({ arrayBuffer: async () => new Uint8Array(bytes).buffer }) });
  const cache = (cover) => ({ match: async () => (cover ? body(cover) : undefined) });
  assert.equal(await ctx.R.isCoverCopy(cache([1, 2, 3]), 'img/stories/noah-v2.webp', body([1, 2, 3])), true);
  assert.equal(await ctx.R.isCoverCopy(cache([1, 2, 3]), 'img/stories/noah-v2.webp', body([1, 2, 3, 4])), false);
  assert.equal(await ctx.R.isCoverCopy(cache([1, 2, 3]), 'img/stories/noah-v2-512.webp', body([1, 2, 3])), false);
  assert.equal(await ctx.R.isCoverCopy(cache(null), 'img/stories/noah-v2.webp', body([1])), false);
});
