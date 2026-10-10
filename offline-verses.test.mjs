import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = (path) => readFileSync(new URL(path, import.meta.url), 'utf8');
const book = (translation, n) => JSON.parse(read(`./bible/${translation === 'rvr' ? 'rvr/' : ''}${String(n).padStart(2, '0')}.json`));

test('offline verse snippets match the Bible books word for word', () => {
  const { verses } = JSON.parse(read('./data/offline-verses.json'));
  assert.ok(Object.keys(verses).length > 50);
  for (const [ref, texts] of Object.entries(verses)) {
    const [b, c, v] = ref.split(':').map(Number);
    for (const translation of ['kjv', 'rvr']) {
      assert.equal(texts[translation], String(book(translation, b).chapters[c - 1][v - 1]).trim(), `${translation} ${ref}`);
    }
  }
});

test('every love and memory verse has an offline snippet, and the snippet file is precached', () => {
  const { verses } = JSON.parse(read('./data/offline-verses.json'));
  const memory = read('./memory.js');
  for (const [, b, c, v] of memory.matchAll(/book: (\d+), chapter: (\d+), verse: (\d+)/g)) assert.ok(verses[`${b}:${c}:${v}`], `memory ${b}:${c}:${v}`);
  const love = read('./love.js');
  for (const [, b, c, list] of love.matchAll(/book: (\d+), chapter: (\d+), verses: \[([\d, ]+)\]/g)) {
    for (const v of list.split(',').map((x) => x.trim())) assert.ok(verses[`${b}:${c}:${v}`], `love ${b}:${c}:${v}`);
  }
  assert.match(read('./sw.js'), /'\.\/data\/offline-verses\.json'/);
});
