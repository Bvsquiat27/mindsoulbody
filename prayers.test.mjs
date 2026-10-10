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

function loadPrayers(saved) {
  const store = new Map(Object.entries(saved || {}));
  const localStorage = { getItem: k => (store.has(k) ? store.get(k) : null), setItem: (k, v) => store.set(k, String(v)) };
  const document = { addEventListener() {}, getElementById: () => null, visibilityState: 'visible' };
  const window = { MsbI18n: null };
  new Function('window', 'document', 'localStorage', 'navigator', src)(window, document, localStorage, {});
  return { api: window.MsbPrayers, store };
}

test('the prayer rope is on the Pray tab and the rule offers the Scripture and older prayers', () => {
  assert.match(src, /function html\(\)\{ return ropeHtml\(\) \+ ruleHtml\(\); \}/);
  assert.match(src, /const ROPE_KEY = 'msb_prayer_rope';/);
  const { api } = loadPrayers();
  const page = api.html();
  assert.match(page, /id="prayer-rope"/);
  for (const id of ['our-father', 'morning-psalms', 'evening-psalms', 'table', 'workday', 'morning', 'evening', 'trisagion', 'meals', 'communion']) {
    assert.match(page, new RegExp(`data-prayer-rule="${id}"`), `${id} in my rule`);
    assert.match(page, new RegExp(`data-prayer-done="${id}"`), `${id} prayed today`);
  }
  assert.match(page, /Hapgood/);
  const deeper = api.deeperHtml();
  assert.match(deeper, /Hapgood/);
  assert.doesNotMatch(deeper, /prayer-rope/);
});

test('a saved rule keeps every id, including older and unknown ones', () => {
  const saved = { included: ['morning', 'trisagion', 'communion', 'some-future-prayer', 'our-father'], day: '', done: {} };
  const { api, store } = loadPrayers({ msb_prayer_rule: JSON.stringify(saved) });
  const page = api.html();
  for (const id of ['morning', 'trisagion', 'communion', 'our-father']) assert.match(page, new RegExp(`data-prayer-rule="${id}" checked`));
  assert.doesNotMatch(page, /data-prayer-rule="evening" checked/);
  assert.deepEqual(JSON.parse(store.get('msb_prayer_rule')).included, saved.included);
  assert.match(page, /4 of 4 prayed today|0 of 4 prayed today/);
});
