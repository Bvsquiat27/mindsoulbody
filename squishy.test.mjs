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
  const ten = QUESTIONS.find(q => q.choices.en[0] === 'Ten');
  assert.equal(ten.ref.en, 'Deuteronomy 10:4');
  assert.equal(ten.ref.es, 'Deuteronomio 10:4');
  assert.match(verseAt('en', ten.at.en), /ten commandments/);
  assert.match(verseAt('es', ten.at.es), /diez palabras/);
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

/* ---------- Soft-body squish and stretch ---------- */
const run = (b, sec) => { for (let i = 0; i < Math.round(sec * 60); i += 1) b.step(1 / 60); };
const settleTime = b => { let t = 0; while (!b.atRest() && t < 60 * 8) { b.step(1 / 60); t += 1; } return t / 60; };
const box = b => { const r = b.bounds(); return { w: r.maxX - r.minX, h: r.maxY - r.minY }; };

test('soft body starts at rest and is a spring mesh of about 24-32 outline points', () => {
  const b = C.softBody();
  assert.equal(b.atRest(), true);
  assert.equal(b.n * b.n, b.N);
  assert.ok(b.n * 4 - 4 >= 24 && b.n * 4 - 4 <= 48);
  assert.ok(Math.abs(b.area() - b.A0) < 1e-9);
});

test('pulling stretches the part near the finger, with a cap that resists harder the farther you pull', () => {
  const b = C.softBody();
  b.grab(60, 0, 0, -60); run(b, 1.5);
  const mid = box(b).h;
  assert.ok(mid > 140, `stretched to ${mid}`);
  assert.ok(b.y[Math.floor(b.n / 2)] < -20, 'top middle followed the finger up');
  assert.ok(Math.abs(b.y[b.N - 1 - Math.floor(b.n / 2)] - 120) < 15, 'bottom stays near its place');
  b.grab(60, 0, 0, -600); run(b, 1.5);
  const far = box(b).h;
  b.grab(60, 0, 0, -6000); run(b, 1.5);
  const huge = box(b).h;
  assert.ok(far > mid && huge >= far - 0.5);
  assert.ok(huge < 120 + b.cfg.max + 2, `capped: ${huge}`);
  assert.ok(huge - far < far - mid, 'more pull gives less stretch');
  assert.ok(b.state.stretch <= 1 && b.state.stretch > 0.9);
  assert.equal(C.mood(b.state), 'wow');
});

test('release snaps back with a wobble, then settles exactly at rest', () => {
  const b = C.softBody();
  b.grab(60, 0, 0, -200); run(b, 1.5);
  b.release(0, 0);
  let below = 0;
  for (let i = 0; i < 120; i += 1) { b.step(1 / 60); below = Math.max(below, b.y[Math.floor(b.n / 2)]); }
  assert.ok(below > 2, `overshoots past rest (wobble): ${below}`);
  const t = settleTime(b);
  assert.ok(t < 5, `settles in ${t}s`);
  assert.equal(b.atRest(), true);
  assert.equal(C.mood(b.state), 'happy');
});

test('a press flattens it, dents under the finger and bulges the sides; area stays roughly the same', () => {
  const b = C.softBody();
  b.press(60, 20, 0.3); run(b, 1);
  const light = box(b).h;
  b.press(60, 20, 1); run(b, 1.5);
  const r = box(b);
  assert.ok(r.h < light && r.h < 100, `flatter: ${r.h}`);
  assert.ok(r.w > 130, `wider: ${r.w}`);
  const ratio = b.area() / b.A0;
  assert.ok(ratio > 0.8 && ratio < 1.15, `area ratio ${ratio}`);
  const top = Math.floor(b.n / 2), side = 0;
  assert.ok(b.y[top] - b.ry[top] > b.y[side] - b.ry[side], 'deeper under the finger');
  assert.equal(C.mood(b.state), 'squint');
  b.release(); assert.ok(settleTime(b) < 5);
});

test('two fingers squeeze it narrow or spread it wide, keeping its area', () => {
  const b = C.softBody();
  b.pinch(60, 60, 1, 0, 0.4); run(b, 1.5);
  let r = box(b);
  assert.ok(r.w < 90 && r.h > 140, `squeezed ${r.w}x${r.h}`);
  let ratio = b.area() / b.A0; assert.ok(ratio > 0.85 && ratio < 1.15, `area ${ratio}`);
  b.pinch(60, 60, 1, 0, 5); run(b, 1.5);
  r = box(b);
  assert.ok(r.w > 160 && r.w < 120 * 1.7 + 4 && r.h < 90, `spread ${r.w}x${r.h}`);
  ratio = b.area() / b.A0; assert.ok(ratio > 0.85 && ratio < 1.15, `area ${ratio}`);
  b.release(); assert.ok(settleTime(b) < 5);
});

test('a fast flick makes it jiggle, and it still comes to rest', () => {
  const b = C.softBody();
  b.grab(60, 60, 30, 0); run(b, 0.3);
  b.release(4000, 0);
  run(b, 0.1);
  assert.ok(b.energy() > 50 || b.maxOffset() > 5, 'moving after the flick');
  assert.ok(settleTime(b) < 6);
});

test('reduced motion: gentler squash and stretch, less wobble, quicker settle', () => {
  const soft = C.softBody(), calm = C.softBody({ reduced: true });
  for (const b of [soft, calm]) { b.grab(60, 0, 0, -500); run(b, 1.5); }
  assert.ok(box(calm).h < box(soft).h);
  const over = b => { b.release(0, 0); let m = 0; for (let i = 0; i < 180; i += 1) { b.step(1 / 60); m = Math.max(m, b.y[Math.floor(b.n / 2)] - b.ry[Math.floor(b.n / 2)]); } return m; };
  assert.ok(over(calm) < over(soft) / 3);
  assert.ok(calm.cfg.squash < soft.cfg.squash);
});

test('the physics step is stable even on a very slow frame', () => {
  const b = C.softBody();
  b.grab(60, 0, 0, -300);
  for (let i = 0; i < 20; i += 1) b.step(0.5);
  for (let k = 0; k < b.N; k += 1) assert.ok(Number.isFinite(b.x[k]) && Math.abs(b.x[k]) < 1000);
});

test('vibration scales with how hard you squish or stretch, capped at 30 ms', () => {
  assert.equal(C.pulseMs(0), 6);
  assert.ok(C.pulseMs(0.5) > C.pulseMs(0.2));
  assert.equal(C.pulseMs(1), 30);
  assert.equal(C.pulseMs(9), 30);
  const ui = read('./squishy.js');
  assert.match(ui, /now - p\.buzzAt < 110/, 'throttled');
});

test('play view: canvas mesh, touch-action none, Learn bubble, keyboard, faces, and settings kept', () => {
  const ui = read('./squishy.js'), css = read('./study-design.css'), art = read('./squishy-art.js');
  assert.match(ui, /data-sq-learn/);
  assert.match(ui, /data-sq-play-back/);
  assert.match(ui, /ArrowUp/);
  assert.match(ui, /e\.key === 'Enter' \|\| e\.key === ' '/);
  assert.match(ui, /softBody\(\{ reduced: reduced\(\) \}\)/);
  assert.match(ui, /bedtimeOn/);
  assert.match(css, /\.sq-play-area\{[^}]*touch-action:none/);
  assert.match(css, /\.sq-canvas\{[^}]*touch-action:none/);
  for (const m of ['squint', 'wow']) assert.match(art, new RegExp(`look === '${m}'`));
  const g = globalThis;
  const prev = g.window;
  g.window = {};
  try {
    const store = new Map();
    const s = C.soundPref({ getItem: k => store.get(k) ?? null, setItem: (k, v) => store.set(k, String(v)) });
    s.set(false);
    assert.equal(C.soundPref({ getItem: k => store.get(k) ?? null, setItem: () => {} }).get(), false);
  } finally { g.window = prev; }
});
