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

test('each locked squishy has its own challenge, ramping up, with rare and legendary ones', () => {
  const locked = SQUISHIES.filter(x => x.locked).map(x => x.id);
  assert.deepEqual(C.CHALLENGES.map(c => c.id), locked, 'one challenge per locked squishy, in shelf order');
  assert.equal(new Set(C.CHALLENGES.map(c => c.kind)).size, C.CHALLENGES.length, 'all different kinds');
  assert.deepEqual(C.CHALLENGES.filter(c => c.tier === 'rare').map(c => c.id), ['basket', 'ark', 'coat']);
  assert.deepEqual(C.CHALLENGES.filter(c => c.tier === 'legendary').map(c => c.id), ['lamp']);
  assert.equal(C.CHALLENGES[0].kind, 'memoryWins', 'the first one is easy');
  assert.equal(C.CHALLENGES.at(-1).kind, 'final');
  assert.equal(C.tierOf('lamb'), 'common');
});

test('challenges unlock their own squishy (and only that one), remembered', () => {
  const s = memoryStorage(), st = C.stats(s), open = () => C.progress(s, SQUISHIES).unlocked();
  const check = () => C.checkUnlocks(s, SQUISHIES, new Date(2026, 9, 11));
  assert.deepEqual(check(), []);
  assert.equal(open().length, 6);
  st.memoryWon(14);
  assert.deepEqual(check(), ['stone'], 'win Memory once');
  assert.deepEqual(check(), [], 'not twice');
  const p = C.progress(s, SQUISHIES);
  p.addStar('lamb'); p.addStar('dove');
  assert.deepEqual(check(), []);
  p.addStar('lion');
  assert.deepEqual(check(), ['loaves'], 'learn 3 lessons');
  for (let i = 0; i < 49; i += 1) st.squished();
  assert.deepEqual(check(), []);
  st.squished();
  assert.deepEqual(check(), ['seed'], 'squish 50 times');
  st.roundDone(3, 5); st.roundDone(4, 5); st.roundDone(4, 5);
  assert.deepEqual(check(), [], 'a lost round does not count');
  st.roundDone(4, 5);
  assert.deepEqual(check(), ['bush'], 'win 3 rounds of Questions');
  s.setItem('msb_match_progress', JSON.stringify({ open: 4, stars: { 1: 3, 2: 1, 3: 2 }, best: {} }));
  assert.deepEqual(check(), []);
  s.setItem('msb_match_progress', JSON.stringify({ open: 5, stars: { 1: 2, 2: 1, 3: 2, 4: 1 }, best: {} }));
  assert.deepEqual(check(), ['basket'], 'finish the Noah chapter in Manna Match');
  st.memoryWon(11);
  assert.deepEqual(check(), []);
  assert.equal(st.get().memoryBest, 11);
  st.memoryWon(10);
  assert.deepEqual(check(), ['tree'], 'win Memory in 10 moves or fewer');
  st.memoryWon(16);
  assert.equal(st.get().memoryBest, 10, 'best is kept');
  st.roundDone(5, 5);
  assert.deepEqual(check(), ['ark'], '5 of 5');
  st.played(new Date(2026, 9, 30, 23, 50)); st.played(new Date(2026, 9, 31, 8));
  assert.deepEqual(check(), []);
  st.played(new Date(2026, 10, 1, 0, 5));
  assert.deepEqual(check(), ['coat'], '3 days in a row, across a month end, by local date');
  assert.deepEqual(check(), [], 'the lamp still needs 3 stars in Manna Match');
  s.setItem('msb_match_progress', JSON.stringify({ open: 6, stars: { 1: 2, 2: 1, 3: 2, 4: 1, 5: 3 }, best: {} }));
  assert.deepEqual(check(), ['lamp']);
  assert.equal(C.progress(s, SQUISHIES).unlocked().length, SQUISHIES.length);
});

test('play streaks use local calendar days', () => {
  assert.equal(C.dayKey(new Date(2026, 0, 5, 23, 59)), '2026-01-05');
  assert.equal(C.longestStreak(['2026-10-09', '2026-10-11']), 1);
  assert.equal(C.longestStreak(['2026-10-09', '2026-10-10', '2026-10-10', '2026-10-11', '2026-10-20']), 3);
  assert.equal(C.longestStreak(['2026-12-31', '2027-01-01']), 2);
  assert.equal(C.longestStreak(['2026-03-07', '2026-03-08', '2026-03-09']), 3, 'over a clock change');
  const s = memoryStorage(), st = C.stats(s);
  st.played(new Date(2026, 9, 1)); st.played(new Date(2026, 9, 1, 18));
  assert.equal(st.get().days.length, 1, 'once per day');
  st.played(new Date(2026, 9, 2)); st.played(new Date(2026, 9, 3));
  assert.equal(st.get().bestStreak, 3);
  for (let d = 5; d < 45; d += 2) st.played(new Date(2026, 9, d));
  assert.ok(st.get().days.length <= 30, 'keeps a short list');
  assert.equal(st.get().bestStreak, 3, 'the best streak is remembered');
});

test('the lamp opens last even when everything is done at once', () => {
  const s = memoryStorage(), st = C.stats(s), p = C.progress(s, SQUISHIES);
  st.memoryWon(8); st.roundDone(5, 5); st.roundDone(5, 5); st.roundDone(5, 5);
  for (let i = 0; i < 60; i += 1) st.squished();
  ['lamb', 'dove', 'fish'].forEach(id => p.addStar(id));
  for (const d of [1, 2, 3]) st.played(new Date(2026, 4, d));
  s.setItem('msb_match_progress', JSON.stringify({ open: 5, stars: { 1: 3, 2: 3, 3: 3, 4: 3 } }));
  const opened = C.checkUnlocks(s, SQUISHIES);
  assert.equal(opened.length, 9);
  assert.equal(opened.at(-1), 'lamp');
});

test('squishies opened before keep open; nothing is ever locked again', () => {
  const s = memoryStorage();
  s.setItem('msb_squishy_unlocked', JSON.stringify(['stone', 'loaves', 'seed', 'bush']));
  assert.deepEqual(C.checkUnlocks(s, SQUISHIES), []);
  const open = C.progress(s, SQUISHIES).unlocked();
  for (const id of ['stone', 'loaves', 'seed', 'bush']) assert.ok(open.includes(id), id);
  assert.equal(open.length, 10);
  /* the lamp counts the ones already open */
  const lamp = C.challengeFor('lamp'), pr = C.challengeProgress(lamp, C.challengeContext(s, SQUISHIES));
  assert.deepEqual([pr.have, pr.need], [4, 9]);
  assert.equal(C.progress(s, SQUISHIES).unlock('stone'), false, 'already open');
});

test('achievements: badges with progress and the day they were earned', () => {
  const s = memoryStorage(), st = C.stats(s);
  let list = C.badges(s, SQUISHIES);
  assert.equal(list.length, C.CHALLENGES.length + C.EXTRA_BADGES.length);
  assert.ok(list.every(b => !b.earned));
  st.squished();
  C.checkUnlocks(s, SQUISHIES, new Date(2026, 9, 11));
  list = C.badges(s, SQUISHIES);
  assert.equal(list.find(b => b.id === 'first-squish').earned, '2026-10-11');
  const seed = list.find(b => b.id === 'seed');
  assert.deepEqual([seed.progress.have, seed.progress.need, seed.progress.done], [1, 50, false]);
  assert.equal(seed.squishy, 'seed');
  s.setItem(C.KEYS.stats, '{bad json');
  assert.equal(C.stats(s).get().squishes, 0, 'broken data falls back safely');
  s.setItem(C.KEYS.stats, JSON.stringify({ squishes: -5, memoryBest: 'x', days: ['nope', '2026-01-01'], badges: { a: 3, b: '2026-01-01' } }));
  const v = C.stats(s).get();
  assert.deepEqual([v.squishes, v.memoryBest, v.days, v.badges], [0, 0, ['2026-01-01'], { b: '2026-01-01' }]);
  assert.ok(C.KEYS.stats.startsWith('msb_'), 'kept in the Export/Restore backup');
});

test('locked tiles show their challenge and progress; rare tiles sparkle; words have Spanish', () => {
  const ui = read('./squishy.js'), i18n = read('./i18n.js'), css = read('./study-design.css');
  assert.match(ui, /progressBar\(pr, text\)/);
  assert.match(ui, /data-sq-view="\$\{id\}"|\['badges'/);
  for (const k of ['RARE', 'LEGENDARY', 'Rare squishy unlocked!', 'Legendary squishy unlocked!']) assert.ok(i18n.includes(`"${k}":`), k);
  assert.ok(i18n.includes('"Rare squishy unlocked!": "¡Squishy raro desbloqueado!"'));
  const names = [...ui.match(/BADGE_NAME = \{([^}]+)\}/)[1].matchAll(/: '([^']+)'/g)].map(m => m[1]);
  assert.equal(names.length, C.CHALLENGES.length + C.EXTRA_BADGES.length);
  for (const k of names) assert.ok(i18n.includes(`"${k}":`), `missing Spanish for: ${k}`);
  assert.match(css, /\.sq-tile\.rare/);
  assert.match(css, /prefers-reduced-motion:reduce\)\{\.sq-tile\.rare/);
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
  assert.ok(mid > 130, `stretched to ${mid}`);
  assert.ok(b.y[Math.floor(b.n / 2)] < -15, 'top middle followed the finger up');
  assert.ok(Math.abs(b.y[b.N - 1 - Math.floor(b.n / 2)] - 120) < 15, 'bottom stays near its place');
  b.grab(60, 0, 0, -600); run(b, 1.5);
  const far = box(b).h;
  b.grab(60, 0, 0, -6000); run(b, 1.5);
  const huge = box(b).h;
  assert.ok(far > mid && huge >= far - 0.5);
  assert.ok(huge < 120 + b.cfg.max + 2, `capped: ${huge}`);
  assert.ok(huge <= 120 * 1.6, `springy but bounded: at most about 1.6x tall (${(huge / 120).toFixed(2)})`);
  assert.ok(box(b).w > 120 * 0.9, 'does not pinch thin');
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
  assert.ok(r.h < light && r.h < 104, `flatter: ${r.h}`);
  assert.ok(r.h >= 120 * 0.68, `not squashed flat: at least about 0.7x tall (${(r.h / 120).toFixed(2)})`);
  assert.ok(r.w > 130 && r.w < 120 * 1.45, `wider: ${r.w}`);
  const ratio = b.area() / b.A0;
  assert.ok(ratio > 0.8 && ratio < 1.15, `area ratio ${ratio}`);
  const top = Math.floor(b.n / 2), side = 0;
  assert.ok(b.y[top] - b.ry[top] > b.y[side] - b.ry[side], 'deeper under the finger');
  assert.equal(C.mood(b.state), 'squint');
  b.release(); assert.ok(settleTime(b) < 5);
});

test('two fingers squeeze it narrow or spread it wide, keeping its area', () => {
  const b = C.softBody();
  b.pinch(60, 60, 1, 0, 0.1); run(b, 1.5);
  let r = box(b);
  assert.ok(r.w < 100 && r.h > 135, `squeezed ${r.w}x${r.h}`);
  assert.ok(r.w >= 120 * 0.6 && r.h <= 120 * 1.6, `capped squeeze ${r.w}x${r.h}`);
  let ratio = b.area() / b.A0; assert.ok(ratio > 0.85 && ratio < 1.15, `area ${ratio}`);
  b.pinch(60, 60, 1, 0, 9); run(b, 1.5);
  r = box(b);
  assert.ok(r.w > 140 && r.w <= 120 * 1.6 && r.h < 104 && r.h >= 120 * 0.6, `spread ${r.w}x${r.h}`);
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
  assert.match(ui, /now - p\.buzzAt < \(p\.glow \? 160 : 110\)/, 'throttled');
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

test('the face stays one stiff piece: it follows the body with only a mild stretch and tilt', () => {
  const b = C.softBody();
  const f0 = b.faceFrame(60, 66, 19);
  assert.deepEqual([f0.x, f0.y, f0.sx, f0.sy, f0.rot], [60, 66, 1, 1, 0]);
  for (const act of [() => b.grab(60, 0, 0, -900), () => b.grab(0, 60, -900, 300), () => b.press(30, 30, 1), () => b.pinch(60, 60, 1, 1, 0.1), () => b.pinch(60, 60, 1, 0, 9)]) {
    act(); run(b, 1.2);
    const f = b.faceFrame(60, 66, 19);
    assert.ok(f.sx >= 0.9 && f.sx <= 1.1 && f.sy >= 0.9 && f.sy <= 1.1, `scale ${f.sx} ${f.sy}`);
    assert.ok(Math.abs(f.rot) <= 0.18 + 1e-9, `tilt ${f.rot}`);
    b.release(); run(b, 4);
  }
  const art = read('./squishy-art.js'), ui = read('./squishy.js');
  assert.match(art, /part === 'body'\) return ''/, 'body picture is drawn without its face');
  assert.match(ui, /function drawFace/);
  assert.match(ui, /A\(\)\.svg\(id, '', 'happy', 'body'\)/);
});

test('the outline stays smooth while stretched, squished or pinched (no kinks)', () => {
  const b = C.softBody();
  /* a contour through the picture (where the art's outline lives), on the
     24-step render mesh that is sampled smoothly from the physics grid */
  const R = 24, lo = 3, hi = 21, edge = [];
  for (let i = lo; i <= hi; i += 1) edge.push([i, lo]);
  for (let j = lo + 1; j <= hi; j += 1) edge.push([hi, j]);
  for (let i = hi - 1; i >= lo; i -= 1) edge.push([i, hi]);
  for (let j = hi - 1; j > lo; j -= 1) edge.push([lo, j]);
  const isCorner = ([i, j]) => (i === lo || i === hi) && (j === lo || j === hi);
  const worstTurn = () => {
    let worst = 0;
    const P = edge.map(([i, j]) => b.smooth(i * 120 / R, j * 120 / R));
    for (let q = 0; q < edge.length; q += 1) {
      if (isCorner(edge[q])) continue;
      const A = P[(q + edge.length - 1) % edge.length], K = P[q], Cc = P[(q + 1) % edge.length];
      const t1 = Math.atan2(K.y - A.y, K.x - A.x), t2 = Math.atan2(Cc.y - K.y, Cc.x - K.x);
      let d = Math.abs(t2 - t1); if (d > Math.PI) d = 2 * Math.PI - d;
      worst = Math.max(worst, d);
    }
    return worst;
  };
  for (const act of [() => b.grab(60, 0, 0, -900), () => b.grab(120, 60, 900, 0), () => b.grab(60, 60, 900, 0), () => b.grab(100, 100, 600, 600), () => b.press(60, 10, 1), () => b.pinch(60, 60, 1, 0, 0.1), () => b.pinch(60, 60, 1, 0, 9)]) {
    act(); run(b, 1.5);
    assert.ok(worstTurn() < 0.45, `kink ${worstTurn().toFixed(2)} rad`);
    b.release(); run(b, 4);
  }
});

/* ---------- The final, glowing squishy ---------- */
test('the glowing Light of the World lamp is the 15th squishy, legendary and unlocks last', () => {
  assert.equal(SQUISHIES.length, 15);
  const lamp = SQUISHIES.at(-1);
  assert.equal(lamp.id, 'lamp');
  assert.equal(lamp.locked, true);
  assert.equal(lamp.glow, true);
  assert.equal(lamp.final, true);
  assert.equal(lamp.sound, 'crunch');
  assert.equal(SQUISHIES.filter(x => x.final).length, 1);
  assert.equal(lamp.ref.en, 'John 8:12');
  assert.equal(lamp.ref.es, 'Juan 8:12');
  assert.match(lamp.verse.en, /I am the light of the world/);
  assert.match(lamp.verse.es, /Yo soy la luz del mundo/);
  assert.equal(lamp.verse.en, verseAt('en', [43, 8, 12]));
  assert.equal(lamp.verse.es, verseAt('es', [43, 8, 12]));
  assert.equal(C.tierOf('lamp'), 'legendary');
  assert.equal(C.challengeFor('lamp').kind, 'final');
});

test('crunchy sounds and vibration grow with the squish, stay soft and capped', () => {
  const small = C.crunchShape(0.1), big = C.crunchShape(1);
  assert.ok(big.clicks > small.clicks && big.spanMs > small.spanMs && big.peak > small.peak);
  assert.ok(C.crunchShape(50).peak <= 0.05, 'soft volume');
  for (const i of [0, 0.2, 0.5, 0.9, 1, 7]) {
    const pat = C.crunchPattern(i);
    assert.equal(pat.length % 2, 1, 'ticks with gaps between');
    const ticks = pat.filter((_, k) => k % 2 === 0), gaps = pat.filter((_, k) => k % 2 === 1);
    assert.ok(ticks.every(t => t > 0 && t <= 12), `short ticks ${pat}`);
    assert.ok(ticks.reduce((a, b) => a + b, 0) <= 30, `capped ${pat}`);
    assert.ok(gaps.every(g => g >= 15));
  }
  assert.ok(C.crunchPattern(1).length > C.crunchPattern(0.1).length);
  const ui = read('./squishy.js');
  assert.match(ui, /\n    crunch: \(\) => crunch\(/);
  assert.match(ui, /function crunch\(intensity, tail\)/);
  assert.match(ui, /const a = audio\(\); if \(!a\) return;\n    try \{\n      if \(!noiseBuf\)/, 'crunch goes through audio(): sound switch and bedtime still apply');
  assert.match(ui, /vibrate\(p\.glow \? C\(\)\.crunchPattern\(level\)/);
  assert.match(ui, /msb_tap_vibration/);
});

test('glow: soft pulse that brightens with squish/stretch; steady with reduced motion', () => {
  assert.ok(C.glowLevel(1, 0, false) > C.glowLevel(0, 0, false) + 0.4);
  const pulse = [0, 0.5, 1, 1.5, 2].map(t => C.glowLevel(0, t, false));
  assert.ok(Math.max(...pulse) - Math.min(...pulse) > 0.05, 'pulses');
  const calm = [0, 0.5, 1, 1.5, 2].map(t => C.glowLevel(0, t, true));
  assert.equal(new Set(calm).size, 1, 'no pulse with reduced motion');
  assert.ok(C.glowLevel(5, 1, false) <= 1);
  const ui = read('./squishy.js'), css = read('./study-design.css');
  assert.match(ui, /if \(reduced\(\)\) \{ p\.sparks\.length = 0; return; \}/, 'no sparkles with reduced motion');
  assert.match(css, /\.sq-tile\.glow/);
  assert.match(css, /\.sq-tile\.locked\.final/);
  const calmCss = css.slice(css.lastIndexOf('@media (prefers-reduced-motion:reduce){.sq-mcard'));
  for (const sel of ['.sq-tile.glow .sq-art{animation:none', '.sq-sparks{display:none}', '.sq-tile.locked.final{animation:none}', '.sq-burst{display:none}']) assert.ok(calmCss.includes(sel), sel);
});

test('render mesh is smooth and exact at rest; the picture is drawn straight when not deformed', () => {
  const b = C.softBody();
  for (const [x, y] of [[0, 0], [17, 93], [60, 60], [120, 120], [33.3, 7.7]]) { const p = b.smooth(x, y); assert.ok(Math.hypot(p.x - x, p.y - y) < 1e-6, `${x},${y}`); }
  const ui = read('./squishy.js');
  assert.match(ui, /const RENDER = 24/);
  assert.match(ui, /imageSmoothingQuality = 'high'/);
  assert.match(ui, /devicePixelRatio/);
  assert.match(ui, /if \(full\.ready && !b\.state\.mode && b\.maxOffset\(\) < 0\.3\)/, 'at rest: the original picture, unwarped');
  assert.match(ui, /width="\$\{T\}" height="\$\{T\}"/, 'SVG drawn at the target resolution');
});

test('squint eyes are hidden by an attribute, so pictures drawn on a canvas have clean, matching eyes', () => {
  const g = globalThis, prev = g.window;
  g.window = {};
  try {
    const src = read('./squishy-art.js');
    new Function(src)();
    const A = g.window.MsbSquishyArt;
    for (const id of A.ids) {
      const happy = A.svg(id), squint = A.svg(id, '', 'squint'), face = A.svg(id, '', 'happy', 'face');
      assert.match(happy, /<g class="sq-shut" display="none"/, `${id}: > < hidden at rest`);
      assert.doesNotMatch(happy, /<g class="sq-open" display="none"/, `${id}: open eyes shown`);
      assert.match(squint, /<g class="sq-open" display="none"/);
      assert.match(squint, /<g class="sq-shut" display="inline"/);
      assert.match(face, /sq-face/);
      assert.doesNotMatch(A.svg(id, '', 'happy', 'body'), /sq-face/, `${id}: body picture has no face`);
      const eyes = [...happy.matchAll(/<ellipse cx="(-?\d+)" cy="0" rx="5\.6" ry="6\.6"/g)].map(m => Number(m[1]));
      assert.deepEqual(eyes, [-13, 13], `${id}: two matching eyes`);
    }
  } finally { g.window = prev; }
});
