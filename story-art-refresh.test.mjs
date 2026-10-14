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
  assert.match(fn, /if \(await cache\.match\(url\)\) continue;/);
  assert.match(fn, /caches\.open\(STORIES_CACHE_NAME\)/);
});
