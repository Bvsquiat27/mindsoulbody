import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import vm from 'node:vm';

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
    assert.ok(existsSync(`img/stories/${item.id}.webp`) && existsSync(`img/stories/${item.id}-512.webp`), `${item.id} art`);
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
