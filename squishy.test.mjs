import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
const require = createRequire(import.meta.url);
const { SQUISHIES, QUESTIONS } = require('./squishy-data.js');
const C = require('./squishy-core.js');

const read = p => readFileSync(new URL(p, import.meta.url), 'utf8');
const books = new Map();
const book = (dir, id) => {
  const key = dir + id;
  if (!books.has(key)) books.set(key, JSON.parse(read(`./bible/${dir}${String(id).padStart(2, '0')}.json`)));
  return books.get(key);
};
const verseAt = (l, [b, c, v]) => String((book(l === 'es' ? 'rvr/' : '', b).chapters[c - 1] || [])[v - 1] || '').trim();
const index = { en: JSON.parse(read('./bible/index.json')).books, es: JSON.parse(read('./bible/rvr/index.json')).books };
const label = (l, [b, c, v]) => `${index[l].find(x => x.id === b).name} ${c}:${v}`;

test('there are about a dozen squishies, 6 open at the start and the rest locked', () => {
  assert.ok(SQUISHIES.length >= 12 && SQUISHIES.length <= 20, String(SQUISHIES.length));
  assert.equal(SQUISHIES.filter(x => !x.locked).length, 6);
  assert.ok(SQUISHIES.filter(x => x.locked).length >= 6);
  assert.equal(new Set(SQUISHIES.map(x => x.id)).size, SQUISHIES.length);
});

test('every squishy has EN and ES name, lesson and quiz text', () => {
  for (const x of SQUISHIES) for (const f of ['name', 'lesson', 'quiz']) for (const l of ['en', 'es']) {
    assert.equal(typeof x[f][l], 'string', `${x.id} ${f} ${l}`);
    assert.ok(x[f][l].trim().length > 2, `${x.id} ${f} ${l}`);
  }
  for (const x of SQUISHIES) assert.notEqual(x.lesson.en, x.lesson.es, x.id);
});

test('every squishy quotes its verse word for word from the app KJV and RV1909 text', () => {
  for (const x of SQUISHIES) for (const l of ['en', 'es']) {
    const text = verseAt(l, x.at[l]);
    assert.ok(text, `${x.id} ${l}: verse missing`);
    assert.equal(x.verse[l], text, `${x.id} ${l}`);
    assert.equal(x.ref[l], label(l, x.at[l]), `${x.id} ${l} reference`);
  }
  const fish = SQUISHIES.find(x => x.id === 'fish');
  assert.equal(fish.ref.en, 'Jonah 1:17');
  assert.equal(fish.ref.es, 'Jonás 2:1');
  assert.match(fish.verse.es, /gran pez/);
});

test('every Bible question has EN/ES text, 4 choices, and a verse that exists and supports the answer', () => {
  assert.ok(QUESTIONS.length >= 15, String(QUESTIONS.length));
  for (const q of QUESTIONS) for (const l of ['en', 'es']) {
    assert.ok(q.q[l] && q.q[l].endsWith('?'), `${q.id} ${l} question`);
    assert.equal(q.choices[l].length, 4, `${q.id} ${l} choices`);
    assert.equal(new Set(q.choices[l]).size, 4, `${q.id} ${l} duplicate choices`);
    const text = verseAt(l, q.at[l]);
    assert.ok(text, `${q.id} ${l}: ${q.ref[l]} missing`);
    assert.equal(q.ref[l], label(l, q.at[l]));
    assert.ok(text.toLowerCase().includes(q.key[l].toLowerCase()), `${q.id} ${l}: "${q.key[l]}" not in ${q.ref[l]}`);
  }
  const rain = QUESTIONS.find(q => q.ref.en === 'Genesis 7:12');
  assert.equal(rain.choices.en[0], '40');
});

test('every squishy has a drawing and a sound', () => {
  const art = read('./squishy-art.js'), ui = read('./squishy.js');
  for (const x of SQUISHIES) {
    assert.match(art, new RegExp(`\\n    ${x.id}\\(\\) \\{`), `${x.id} art`);
    assert.match(ui, new RegExp(`\\n    ${x.sound}: \\(\\) =>`), `${x.id} sound ${x.sound}`);
  }
  assert.doesNotMatch(art + ui, /<img|\.png|\.mp3|\.wav|fetch\(/, 'no files to download: works offline');
});

function memoryStorage() { const m = new Map(); return { getItem: k => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, String(v)), m }; }

test('sound switch is on by default and remembered', () => {
  const s = memoryStorage();
  assert.equal(C.soundPref(s).get(), true);
  C.soundPref(s).set(false);
  assert.equal(s.m.get('msb_squishy_sounds'), 'off');
  assert.equal(C.soundPref(s).get(), false);
  C.soundPref(s).set(true);
  assert.equal(C.soundPref(s).get(), true);
});

test('winning rounds unlocks squishies one at a time, in order, and it is remembered', () => {
  const s = memoryStorage();
  const p = C.progress(s, SQUISHIES);
  assert.equal(p.unlocked().length, 6);
  const firstLocked = SQUISHIES.find(x => x.locked);
  assert.equal(p.isOpen(firstLocked.id), false);
  assert.equal(p.unlockNext().id, firstLocked.id);
  assert.equal(C.progress(s, SQUISHIES).isOpen(firstLocked.id), true, 'remembered on the next visit');
  let n = 0;
  while (p.unlockNext()) n += 1;
  assert.equal(p.unlocked().length, SQUISHIES.length);
  assert.equal(n, SQUISHIES.filter(x => x.locked).length - 1);
  assert.equal(p.unlockNext(), null);
  s.setItem('msb_squishy_unlocked', '{bad json');
  assert.equal(C.progress(s, SQUISHIES).unlocked().length, 6, 'broken data falls back safely');
  s.setItem('msb_squishy_unlocked', JSON.stringify(['nope', 7]));
  assert.equal(C.progress(s, SQUISHIES).unlocked().length, 6);
});

test('lesson stars are collected once each and remembered', () => {
  const s = memoryStorage();
  const p = C.progress(s, SQUISHIES);
  p.addStar('lamb'); p.addStar('lamb'); p.addStar('lion'); p.addStar('unknown');
  assert.deepEqual(C.progress(s, SQUISHIES).stars(), ['lamb', 'lion']);
  assert.ok(C.KEYS.stars.startsWith('msb_') && C.KEYS.unlocked.startsWith('msb_'), 'kept in the Export/Restore backup (msb_ keys)');
  assert.match(read('./aura.js'), /MSB_BACKUP_PREFIXES=\['msb_'/);
});

test('squash grows with a longer hold, is capped, gentler with reduced motion, and springs back to rest', () => {
  assert.equal(C.pressDepth(0), 0);
  assert.ok(C.pressDepth(300) < C.pressDepth(1200));
  assert.ok(C.pressDepth(60000) <= 0.42 + 1e-9);
  assert.ok(C.pressDepth(60000, true) <= 0.16 + 1e-9);
  let st = { s: 0, vs: 0, dx: 0, vx: 0, dy: 0, vy: 0 };
  for (let i = 0; i < 60; i += 1) st = C.springStep(st, 1 / 60, { s: C.pressDepth(i * 16.7), dx: 10, dy: 0 }, true, false);
  assert.ok(st.s > 0.2 && st.dx > 5);
  let overshoot = 0, t = 0;
  while (!C.atRest(st) && t < 600) { st = C.springStep(st, 1 / 60, { s: 0, dx: 0, dy: 0 }, false, false); overshoot = Math.min(overshoot, st.s); t += 1; }
  assert.ok(C.atRest(st), 'comes back to rest');
  assert.ok(t > 40, 'slow rise, not a snap');
  assert.ok(overshoot < -0.005, 'a little jiggle');
  let calm = { s: 0.16, vs: 0, dx: 0, vx: 0, dy: 0, vy: 0 }, low = 0;
  for (let i = 0; i < 600; i += 1) { calm = C.springStep(calm, 1 / 60, { s: 0, dx: 0, dy: 0 }, false, true); low = Math.min(low, calm.s); }
  assert.ok(low > -0.002, 'reduced motion: no jiggle');
  const p = C.pokeOffset(500, 0, 200);
  assert.ok(p.dx > 0 && p.dx <= 200 * 0.16 * 0.45 + 1e-9, 'poke has a soft limit');
});

test('vibration grows with the squish and is capped at 30 ms', () => {
  assert.equal(C.vibeMs(0), 8);
  assert.ok(C.vibeMs(600) > C.vibeMs(100));
  assert.equal(C.vibeMs(10000), 30);
  assert.match(read('./squishy.js'), /msb_tap_vibration/);
  assert.match(read('./squishy.js'), /typeof navigator\.vibrate !== 'function'/);
});

test('memory deck pairs each squishy picture with its name; rounds pick 5 questions with the right answer tracked', () => {
  const ids = SQUISHIES.filter(x => !x.locked).map(x => x.id);
  const deck = C.memoryDeck(ids, 6, 42);
  assert.equal(deck.length, 12);
  for (const id of ids) assert.deepEqual(deck.filter(c => c.id === id).map(c => c.face).sort(), ['name', 'pic']);
  const pic = deck.find(c => c.face === 'pic'), name = deck.find(c => c.face === 'name' && c.id === pic.id), other = deck.find(c => c.id !== pic.id);
  assert.equal(C.isMatch(pic, name), true);
  assert.equal(C.isMatch(pic, pic), false);
  assert.equal(C.isMatch(pic, other), false);
  const round = C.questionRound(QUESTIONS, 5, 7, 'es');
  assert.equal(round.length, 5);
  assert.equal(new Set(round.map(q => q.id)).size, 5);
  for (const q of round) {
    const src = QUESTIONS.find(x => x.id === q.id);
    assert.equal(q.choices[q.answer], src.choices.es[0]);
    assert.equal(q.ref, src.ref.es);
  }
  assert.equal(C.roundWon(4, 5), true);
  assert.equal(C.roundWon(3, 5), false);
});

test('the game is wired in, precached, and its words have Spanish', () => {
  const html = read('./index.html'), sw = read('./sw.js'), i18n = read('./i18n.js'), stories = read('./stories.js');
  for (const f of ['squishy-data.js', 'squishy-core.js', 'squishy-art.js', 'squishy.js']) {
    assert.ok(html.includes(`<script src="${f}" defer>`), f);
    assert.ok(sw.includes(`'./${f}'`), f);
  }
  assert.ok(html.indexOf('squishy.js"') < html.indexOf('stories.js"'));
  assert.match(stories, /data-squishy-open/);
  const ui = read('./squishy.js');
  const keys = [...ui.matchAll(/L\('([^']+)'/g)].map(m => m[1]);
  for (const k of new Set(keys)) assert.ok(i18n.includes(`"${k}":`), `missing Spanish for: ${k}`);
  for (const k of ['Bible squishies', 'Squish a soft friend and learn its Bible story']) assert.ok(i18n.includes(`"${k}":`), k);
});
