import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const src = readFileSync(new URL('./prayers.js', import.meta.url), 'utf8');
const block = src.slice(src.indexOf('const SCRIPTURE_PRAYERS'), src.indexOf('const OLDER_PRAYERS'));
const book = (id, es) => JSON.parse(readFileSync(new URL(`./bible/${es ? 'rvr/' : ''}${String(id).padStart(2, '0')}.json`, import.meta.url), 'utf8'));
const verses = (id, chapter, from, to, es) => book(id, es).chapters[chapter - 1].slice(from - 1, to).join(' ');
const norm = s => s.replace(/\s+/g, ' ').trim().toLowerCase();

const expected = [
  [40, 6, 9, 13], [19, 5, 3, 3], [25, 3, 22, 23], [19, 143, 8, 8], [19, 141, 2, 2], [19, 4, 8, 8], [19, 145, 15, 16], [19, 107, 1, 1]
];

test('Pray tab main path quotes the KJV and RV1909 word for word', () => {
  const en = [], es = [];
  for (const m of block.matchAll(/blocks(Es)?:\[\n([\s\S]*?)\n\s*\],?\n/g)) {
    const list = [...m[2].matchAll(/\['text','((?:\\'|[^'])*)'\]/g)].map(x => x[1].replace(/\\'/g, "'"));
    (m[1] ? es : en).push(...list);
  }
  assert.equal(en.length, expected.length);
  assert.equal(es.length, expected.length);
  expected.forEach(([id, ch, a, b], i) => {
    assert.equal(norm(en[i]), norm(verses(id, ch, a, b, false)), `KJV ${id} ${ch}:${a}`);
    assert.equal(norm(es[i]), norm(verses(id, ch, a, b, true)), `RVR ${id} ${ch}:${a}`);
  });
});

test('the main Pray rule has no Orthodox service-book prayers or prayer rope', () => {
  const rule = src.slice(src.indexOf('function ruleHtml'), src.indexOf('function deeperHtml'));
  assert.doesNotMatch(rule, /Hapgood|ropeHtml\(\)/);
  assert.match(src, /function html\(\)\{ return ruleHtml\(\); \}/);
  const deeper = src.slice(src.indexOf('function deeperHtml'), src.indexOf('function html()'));
  assert.match(deeper, /Hapgood/);
  assert.match(deeper, /ropeHtml\(\)/);
});
