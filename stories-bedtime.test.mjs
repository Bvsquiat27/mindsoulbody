import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import vm from 'node:vm';

const V2 = ['creation', 'noah', 'stars', 'joseph', 'moses', 'david', 'daniel', 'jonah', 'nativity', 'storm', 'children', 'feeding', 'sheep', 'easter'];
function load() {
  const listeners = [];
  const ctx = { window: {}, document: { addEventListener: (t, f, c) => listeners.push([t, f, c]), getElementById: () => null, querySelector: () => null }, navigator: {}, console, setTimeout, clearTimeout };
  ctx.window.document = ctx.document;
  vm.createContext(ctx);
  vm.runInContext(readFileSync('stories.js', 'utf8'), ctx);
  return ctx.window.MsbStories;
}

test('every story verse matches the KJV and RV 1909 text word for word', () => {
  const S = load();
  const list = S.stories();
  assert.ok(list.length >= 17);
  for (const item of list) {
    const v = S.verses[item.id];
    assert.ok(v, `${item.id} has a verse`);
    const [b, c, n] = v.ref;
    const pad = String(b).padStart(2, '0');
    const en = JSON.parse(readFileSync(`bible/${pad}.json`, 'utf8')).chapters[c - 1][n - 1];
    const es = JSON.parse(readFileSync(`bible/rvr/${pad}.json`, 'utf8')).chapters[c - 1][n - 1];
    assert.equal(v.en, en, `${item.id} KJV`);
    assert.equal(v.es, es, `${item.id} RV1909`);
    const art = V2.includes(item.id) ? `${item.id}-v2` : item.id;
    assert.ok(existsSync(`img/stories/${art}.webp`) && existsSync(`img/stories/${art}-512.webp`), `${item.id} art`);
    assert.ok(item.titleEs && item.bodyEs && item.altEs, `${item.id} Spanish`);
  }
});

test('the service worker lists every story cover', () => {
  const sw = readFileSync('sw.js', 'utf8');
  const ids = load().stories().map((s) => s.id);
  const listed = JSON.parse(sw.match(/const STORY_IDS = (\[[^\]]+\])/)[1].replace(/'/g, '"'));
  assert.deepEqual([...listed].sort(), [...ids].sort());
  assert.match(sw, /COLORING_IDS\.map/);
});

test('bedtime steps through stories with position, next and previous, and keeps reading', () => {
  const src = readFileSync('stories.js', 'utf8');
  assert.match(src, /data-bedtime-step="-1"/);
  assert.match(src, /data-bedtime-step="1"/);
  assert.match(src, /\$\{at \+ 1\} de \$\{total\}/);
  assert.match(src, /\$\{at \+ 1\} of \$\{total\}/);
  assert.match(src, /bedtime\.reading\) setTimeout/);
  assert.match(src, /class="bedtime-read"/);
  /* art loads lazily: one hero per screen, no preloading of the whole set */
  assert.match(src, /loading="lazy"/);
  const css = readFileSync('study-design.css', 'utf8');
  assert.match(css, /\.bedtime-read\{/);
});

test('the seven newer stories have painted art, both languages and a checked verse', () => {
  const S = load();
  const ids = S.stories().map((s) => s.id);
  for (const id of ['ruth', 'elijah', 'esther', 'baptism', 'samaritan', 'zacchaeus', 'bartimaeus']) {
    assert.ok(ids.includes(id), id);
    assert.ok(S.verses[id], `${id} verse`);
  }
  assert.equal(ids.length, 24);
  const br = readFileSync('bible-reader.js', 'utf8').split('\n').find((l) => l.includes('STORY_ART_FILES ='));
  for (const id of ids) assert.match(br, new RegExp(`'${id}'`), `${id} saved for offline`);
});

test('repainted covers use one -v2 list everywhere and the old files are gone', () => {
  for (const f of ['stories.js', 'bible-reader.js', 'sw.js', 'kg-order.js']) {
    const m = readFileSync(f, 'utf8').match(/const STORY_ART_V2 = (\[[^\]]+\])/);
    assert.ok(m, f);
    assert.deepEqual(JSON.parse(m[1].replace(/'/g, '"')), V2, f);
  }
  for (const id of V2) {
    assert.ok(existsSync(`img/stories/${id}-v2.webp`) && existsSync(`img/stories/${id}-v2-512.webp`), id);
    assert.ok(!existsSync(`img/stories/${id}.webp`) && !existsSync(`img/stories/${id}-512.webp`), `${id} old art removed`);
  }
  assert.match(readFileSync('sw.js', 'utf8'), /\[a-z\]\+\(\?:-v\\d\+\)\?\)\\\.webp/);
});

test('trip list traveler images fall back to the trip emoji', () => {
  const map = readFileSync('kg-map.js', 'utf8');
  assert.match(map, /class="mp-pick-art"[^>]*data-mp-fb><span class="mp-pick-fb"/);
  assert.match(map, /addEventListener\('error', e => \{ const el = e\.target; if \(!el \|\| !el\.hasAttribute \|\| !el\.hasAttribute\('data-mp-fb'\)\)/);
  assert.match(map, /exodus: \['img\/map\/map-exodus\.webp', 50, '🚶'\]/);
  const data = readFileSync('kidgames-data.js', 'utf8');
  assert.match(data, /"id": "exodus",[\s\S]{0,200}"travel": "🚶"/);
});
