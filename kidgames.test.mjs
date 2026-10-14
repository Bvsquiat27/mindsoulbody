import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { readFileSync, existsSync } from 'node:fs';
const require = createRequire(import.meta.url);
const C = require('./kidgames-core.js');
const D = require('./kidgames-data.js');
const read = p => readFileSync(new URL(p, import.meta.url), 'utf8');
const books = new Map();
const book = (dir, id) => { const k = dir + id; if (!books.has(k)) books.set(k, JSON.parse(read(`./bible/${dir}${String(id).padStart(2, '0')}.json`))); return books.get(k); };
const verseAt = (l, [b, c, v]) => String((book(l === 'es' ? 'rvr/' : '', b).chapters[c - 1] || [])[v - 1] || '').trim();
const index = { en: JSON.parse(read('./bible/index.json')).books, es: JSON.parse(read('./bible/rvr/index.json')).books };
const mem = () => { const m = new Map(); return { getItem: k => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, String(v)) }; };
const allVerses = () => {
  const out = [];
  const walk = (o, where) => { if (o && typeof o === 'object') { if (o.at && o.text) out.push([where, o]); else for (const [k, v] of Object.entries(o)) walk(v, `${where}.${k}`); } };
  walk(D, 'data');
  return out;
};

test('every game verse is word for word from the app KJV and RV1909 text, with its reference', () => {
  const list = allVerses();
  assert.ok(list.length >= 20);
  for (const [where, v] of list) for (const l of ['en', 'es']) {
    const text = verseAt(l, v.at[l]);
    assert.ok(text, `${where} ${l}: missing`);
    assert.equal(v.text[l], text, `${where} ${l}`);
    const [b, c, n] = v.at[l];
    assert.equal(v.ref[l], `${index[l].find(x => x.id === b).name} ${c}:${n}`, `${where} ${l} ref`);
  }
});

test('Who Said It? quotes are exact pieces of their verses, with EN/ES speakers', () => {
  assert.ok(D.QUOTES.length >= 12);
  for (const q of D.QUOTES) {
    assert.ok(D.PEOPLE[q.who] && D.PEOPLE[q.who].en && D.PEOPLE[q.who].es, q.who);
    for (const l of ['en', 'es']) assert.ok(q.verse.text[l].includes(q.quote[l]), `${q.who} ${l}: "${q.quote[l]}"`);
  }
  const rand = C.rng(7);
  for (let i = 0; i < D.QUOTES.length; i += 1) {
    const ch = C.choices(D.QUOTES, i, rand);
    assert.equal(ch.length, 3); assert.equal(new Set(ch).size, 3); assert.ok(ch.includes(D.QUOTES[i].who));
  }
});

test('word search: every puzzle builds in EN and ES, and each word reads off the grid', () => {
  for (const p of D.WORDSEARCH) for (const l of ['en', 'es']) {
    assert.ok(p.title[l] && p.words[l].length >= 5, `${p.id} ${l}`);
    const z = C.wordSearch(p.words[l], 10, `${p.id}|${l}`, l);
    assert.ok(z, `${p.id} ${l} did not build`);
    assert.equal(z.grid.length, 100);
    assert.ok(z.grid.every(ch => /^[A-ZÑ]$/.test(ch)));
    z.placed.forEach((w, i) => {
      assert.equal(w.word, p.words[l][i]);
      assert.equal(w.cells.map(c => z.grid[c]).join(''), C.gridWord(w.word));
      assert.deepEqual(C.lineCells(w.cells[0], w.cells[w.cells.length - 1], 10), w.cells);
      assert.equal(C.findWord(z, w.cells), i);
      assert.equal(C.findWord(z, w.cells.slice().reverse()), i, 'backwards selection counts too');
    });
    assert.deepEqual(C.wordSearch(p.words[l], 10, `${p.id}|${l}`, l), z, 'same puzzle every time');
  }
  assert.equal(C.gridWord('ÁNGEL'), 'ANGEL'); assert.equal(C.gridWord('RESUCITÓ'), 'RESUCITO'); assert.equal(C.gridWord('niño'), 'NIÑO');
  assert.equal(C.lineCells(0, 12, 10), null, 'not a straight line');
  assert.deepEqual(C.lineCells(22, 0, 10), [22, 11, 0]);
});

test('story order: picture sets are in Bible order, use the app story art, and never start solved', () => {
  const bibleOrder = Object.keys(D.PICTURES);
  for (const set of D.ORDER) {
    assert.ok(set.cards.length >= 5 && set.cards.length <= 6, set.id);
    const pos = set.cards.map(id => bibleOrder.indexOf(id));
    assert.ok(pos.every(p => p >= 0)); assert.deepEqual(pos, pos.slice().sort((a, b) => a - b), `${set.id} order`);
    for (const id of set.cards) { assert.ok(existsSync(new URL(`./img/stories/${id}-512.webp`, import.meta.url)), id); assert.ok(D.PICTURES[id].en && D.PICTURES[id].es); }
    for (let k = 0; k < 30; k += 1) assert.ok(!C.isOrdered(C.scramble(set.cards, C.rng(k)), set.cards));
  }
  assert.deepEqual(C.moveItem(['a', 'b', 'c'], 0, 2), ['b', 'c', 'a']);
  assert.deepEqual(C.orderMarks(['a', 'c', 'b'], ['a', 'b', 'c']), [true, false, false]);
});

test('progress lives in one msb_ key that Export/Restore covers; badges get a date once', () => {
  assert.ok(Object.values(C.KEYS).every(k => k.startsWith('msb_')));
  assert.match(read('./aura.js'), /MSB_BACKUP_PREFIXES\s*=\s*\[[^\]]*'msb_'/);
  const s = mem(), p = C.progress(s);
  assert.equal(p.finish('wordsearch', 'noah'), true);
  assert.equal(p.finish('wordsearch', 'noah'), false);
  assert.deepEqual(p.done('wordsearch'), ['noah']);
  assert.equal(p.best('who', 4), true); assert.equal(p.best('who', 2), false);
  const defs = C.badgeDefs({ wordsearch: 6, order: 4 });
  assert.deepEqual(p.award(defs), ['kg-word-1']);
  assert.deepEqual(p.award(defs), []);
  p.best('who', 5); assert.deepEqual(p.award(defs), ['kg-who-5']);
  assert.match(p.get().badges['kg-word-1'], /^\d{4}-\d{2}-\d{2}$/);
  s.setItem(C.KEYS.progress, '{bad json'); assert.deepEqual(C.progress(s).get().done, {});
  for (const b of defs) assert.ok(b.name.en && b.name.es && b.goal.en && b.goal.es && b.icon, b.id);
  const snd = C.soundPref(mem()); assert.equal(snd.get(), true); snd.set(false); assert.equal(snd.get(), false);
});

test('games are wired in, precached, in Spanish, and follow sound, vibration and reduced-motion settings', () => {
  const html = read('./index.html'), sw = read('./sw.js'), stories = read('./stories.js'), ui = read('./kidgames.js');
  const files = ['kidgames-data.js', 'kidgames-core.js', 'kidgames.js', 'kg-wordsearch.js', 'kg-order.js', 'kg-who.js', 'kg-verse.js', 'kg-ark.js'];
  for (const f of files) { assert.ok(html.includes(`<script src="${f}" defer></script>`), f); assert.ok(sw.includes(`'./${f}'`), f); }
  assert.ok(html.indexOf('kg-ark.js') < html.indexOf('stories.js'));
  assert.match(stories, /data-kg-enter/); assert.match(stories, /data-kg-exit/); assert.match(stories, /MsbKidGames\.close\(\)/);
  assert.match(ui, /msb_tap_vibration/); assert.match(ui, /prefers-reduced-motion/); assert.match(ui, /data-i18n-skip/);
  assert.match(ui, /aria-live="polite"/);
  assert.match(read('./aura.js'), /MsbKidGames\.kidBadges/);
  const css = read('./kidgames.css');
  assert.match(html, /<link rel="stylesheet" href="kidgames.css">/); assert.ok(sw.includes("'./kidgames.css'"));
  assert.match(css, /prefers-reduced-motion:reduce\)\{\.kg-screen/);
  assert.match(css, /\.kg-ws-grid\{[^}]*touch-action:none/);
  for (const f of ['kg-wordsearch.js', 'kg-order.js', 'kg-who.js', 'kg-verse.js', 'kg-ark.js']) {
    const src = read(`./${f}`);
    const pairs = [...src.matchAll(/t\('((?:[^'\\]|\\.)*)', '((?:[^'\\]|\\.)*)'/g)];
    assert.ok(pairs.length > 8, f);
    for (const [, en, es] of pairs) assert.ok(es && es !== en || /^[\d{}\s/]+$/.test(en), `${f}: "${en}" needs Spanish`);
    assert.match(src, /name: \{ en: '[^']+', es: '[^']+' \}/);
  }
  for (const f of files) assert.doesNotThrow(() => new Function(read(`./${f}`)), f);
});

test('verse builder: verses split into words in order; the next word always falls; stars by mistakes', () => {
  assert.equal(D.VERSES.length, 6);
  for (const x of D.VERSES) for (const l of ['en', 'es']) {
    const w = C.verseWords(x.verse.text[l]);
    assert.equal(w.join(' '), x.verse.text[l].replace(/\s+/g, ' '));
    assert.ok(w.length >= 7 && w.length <= 16, `${x.id} ${l}: ${w.length} words`);
    for (let have = 0; have < w.length; have += 1) {
      assert.equal(C.nextFalling(w, have, []), have, 'needed word comes first');
      const other = C.nextFalling(w, have, [have], C.rng(have));
      if (other !== null) assert.ok(other > have && other < have + 6);
    }
    assert.equal(C.nextFalling(w, w.length, []), null);
  }
  const w = ['a', 'b', 'a', 'c'];
  assert.ok(C.wordFits(w, 0, 2), 'a copy of the same word counts'); assert.ok(!C.wordFits(w, 0, 1));
  assert.deepEqual([C.stars(0), C.stars(2), C.stars(5)], [3, 2, 1]);
  assert.match(read('./kg-verse.js'), /reduced\(\)/, 'still words with reduced motion');
  assert.match(read('./kg-verse.js'), /const changed = added \|\|/, 'new falling words are drawn as soon as they spawn');
});

test('ark builder: each level is pairs of known animals with EN/ES names, a timer, and an obedience lesson', () => {
  for (const lv of D.ARK.levels) {
    assert.equal(new Set(lv.pairs).size, lv.pairs.length);
    for (const a of lv.pairs) { assert.ok(D.ARK.animals[a], a); assert.ok(D.ARK.names[a].en && D.ARK.names[a].es, a); }
    const deck = C.arkDeck(lv.pairs, C.rng(1));
    assert.equal(deck.length, lv.pairs.length * 2);
    for (const a of lv.pairs) assert.equal(deck.filter(x => x === a).length, 2);
    assert.ok(lv.seconds >= 45);
  }
  assert.ok(D.ARK.lesson.en.includes('obey') && /obedec/i.test(D.ARK.lesson.es));
  assert.deepEqual([C.arkStars(30, 60), C.arkStars(15, 60), C.arkStars(5, 60)], [3, 2, 1]);
  const ark = read('./kg-ark.js');
  assert.match(ark, /document\.hidden/, 'timer pauses when hidden'); assert.match(ark, /role="timer"/);
});
