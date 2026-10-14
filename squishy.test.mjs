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

test('there are 37 squishies, 6 open at the start and the rest locked', () => {
  assert.ok(SQUISHIES.length === 37, String(SQUISHIES.length));
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
  assert.equal(new Set(C.CHALLENGES.map(c => `${c.kind}:${c.game || ''}:${c.n}`)).size, C.CHALLENGES.length, 'all different goals');
  for (const c of C.CHALLENGES) { const same = C.CHALLENGES.filter(d => d.kind === c.kind && d.game === c.game && d.kind !== 'final'); assert.ok(same.every((d, i) => i === 0 || d.n > same[i - 1].n), `${c.kind} ramps up`); }
  assert.deepEqual(C.CHALLENGES.filter(c => c.tier === 'rare').map(c => c.id), ['basket', 'ark', 'coat', 'jar', 'crown', 'boat', 'pearl', 'tablets', 'honeycomb', 'anchor', 'shield']);
  assert.deepEqual(C.CHALLENGES.filter(c => c.tier === 'legendary').map(c => c.id), ['bush', 'tomb', 'chariot', 'lamp']);
  assert.equal(C.CHALLENGES[0].kind, 'memoryWins', 'the first one is easy');
  assert.equal(C.CHALLENGES.at(-1).kind, 'final');
  assert.equal(C.tierOf('lamb'), 'common');
});

test('challenges unlock their own squishy (and only that one), remembered', () => {
  const s = memoryStorage(), st = C.stats(s), open = () => C.progress(s, SQUISHIES).unlocked();
  const FIRST = SQUISHIES.slice(0, 14).map(x => x.id).concat('lamp');
  const check = () => C.checkUnlocks(s, SQUISHIES, new Date(2026, 9, 11)).filter(id => FIRST.includes(id));
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
  st.roundDone(3, 5); st.roundDone(4, 5); st.roundDone(4, 5); st.roundDone(4, 5);
  assert.deepEqual(check(), [], 'the legendary bush is not opened by 3 ordinary wins any more');
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
  assert.deepEqual(check(), [], 'the lamp still needs the newer squishies');
  for (const x of SQUISHIES.slice(14, -1)) C.progress(s, SQUISHIES).unlock(x.id);
  for (let i = 0; i < 10; i += 1) st.roundDone(5, 5);
  assert.ok(C.checkUnlocks(s, SQUISHIES, new Date(2026, 9, 11)).includes('bush'), 'the legendary bush after 10 perfect rounds');
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

const KG_ALL = { done: { wordsearch: ['w1', 'w2', 'w3'], order: ['o1', 'o2', 'o3', 'o4'], who: ['round'], verse: ['v1', 'v2', 'v3'], map: ['m1', 'm2'], sling: ['s1', 's2', 's3', 's4'] }, best: { who: 9 }, plays: {}, badges: {} };

test('the lamp opens last even when everything is done at once', () => {
  const s = memoryStorage(), st = C.stats(s), p = C.progress(s, SQUISHIES);
  for (let i = 0; i < 4; i += 1) st.memoryWon(8);
  for (let i = 0; i < 10; i += 1) st.roundDone(5, 5);
  for (let i = 0; i < 300; i += 1) st.squished();
  SQUISHIES.slice(0, 12).forEach(x => p.addStar(x.id));
  for (const d of [1, 2, 3, 4, 5]) st.played(new Date(2026, 4, d));
  const stars = {}; for (let l = 1; l <= 20; l += 1) stars[l] = 3;
  s.setItem('msb_match_progress', JSON.stringify({ open: 21, stars }));
  for (let i = 0; i < 4; i += 1) st.memoryWon(8);
  for (const page of ['a', 'b', 'c']) st.colored(page);
  s.setItem('msb_kidgames', JSON.stringify(KG_ALL));
  const opened = C.checkUnlocks(s, SQUISHIES);
  assert.equal(opened.length, 31);
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
  assert.deepEqual([pr.have, pr.need], [4, 31]);
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
  assert.match(ui, /softBody\(\{ reduced: reduced\(\), feel: C\(\)\.feelFor\(id\) \}\)/);
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
test('the glowing Light of the World lamp is the last squishy, legendary and unlocks last', () => {
  assert.equal(SQUISHIES.length, 37);
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
  assert.match(ui, /function crunch\(intensity, tail, again\)/);
  assert.match(ui, /function crunch\(intensity, tail, again\) \{\n    const a = audio\(\); if \(!a\) return;/, 'crunch goes through audio(): sound switch and bedtime still apply');
  assert.match(ui, /feelBuzz\('hold', level\)/);
  assert.equal(C.feelPattern('lamp', 'hold', 0.8, 'medium', false).length, C.crunchPattern(0.8).length, 'the lamp still crackles');
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

/* ---------- Own sounds, effects and secret tricks ---------- */
const FX = require('./squishy-fx.js');
const memStore = () => { const m = new Map(); return { getItem: k => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, String(v)), removeItem: k => m.delete(k) }; };

test('every squishy has its own sound voices and effect; only the burning bush and the lamp keep a secret trick', () => {
  const ui = read('./squishy.js');
  const ids = SQUISHIES.map(s => s.id);
  assert.deepEqual(Object.keys(C.KITS).sort(), [...ids].sort());
  const uniq = (list, what) => assert.equal(new Set(list).size, list.length, `${what} must be unique`);
  const kits = ids.map(id => C.KITS[id]);
  uniq(kits.map(k => k.sound.squish), 'squish voices');
  uniq(kits.map(k => k.sound.release), 'release voices');
  uniq(kits.map(k => k.sound.tone), 'stretch tones');
  uniq(kits.map(k => k.fx), 'effects');
  assert.deepEqual(ids.filter(id => C.hasTrick(id)), ['bush', 'lamp']);
  assert.deepEqual(Object.keys(FX.TRICKS).sort(), ['i-am', 'light-room']);
  /* tones differ in more than pitch: no two share wave + wobble + filter */
  const tones = kits.map(k => C.TONES[k.sound.tone]).filter(Boolean);
  uniq(tones.map(t => `${t.type}/${t.lfo}/${t.depth}/${t.filter}/${t.q}`), 'tone shapes');
  for (const k of kits) {
    if (k.trick) assert.ok(C.GESTURES.includes(k.gesture), k.gesture); else assert.ok(!('gesture' in k), 'no gesture without a trick');
    assert.ok(k.sound.tone in C.TONES, k.sound.tone);
    assert.ok(FX.FX[k.fx], k.fx);
    if (k.trick) assert.ok(FX.TRICKS[k.trick] && FX.TRICKS[k.trick].dur > 1000, k.trick);
    assert.ok(new RegExp(`\\n    ${JSON.stringify(k.sound.squish).replace(/"/g, "'?")}: `).test(ui) || ui.includes(`    ${k.sound.squish}: d =>`), `squish voice ${k.sound.squish}`);
    assert.ok(ui.includes(`    ${k.sound.release}: `) || ui.includes(`    '${k.sound.release}': `), `release voice ${k.sound.release}`);
    if (k.trick) assert.ok(ui.includes(`    ${k.trick}: () =>`) || ui.includes(`    '${k.trick}': () =>`), `trick sound ${k.trick}`);
  }
  /* effect particles are different: shape + color + where they start */
  uniq(kits.filter(k => k.fx !== 'sparks').map(k => { const f = FX.FX[k.fx]; return `${f.shape}/${f.colors[0]}/${f.origin}`; }), 'particle looks');
});

/* a little finger: build pointer events for the recognizer */
function gestRun(events) { const g = C.gestures(); const out = []; for (const [kind, x, y, t] of events) out.push(...(kind === 'poll' ? g.poll(t) : g[kind](x, y, t))); return out.map(o => o.type); }
const taps = (n, gap = 200, at = [60, 60]) => { const ev = []; for (let i = 0; i < n; i += 1) { ev.push(['down', ...at, i * gap], ['up', ...at, i * gap + 80]); } return ev; };

test('gestures: taps (double, triple, five) and tapping the top', () => {
  assert.ok(gestRun(taps(2)).includes('doubleTap'));
  assert.ok(!gestRun(taps(2)).includes('tripleTap'));
  assert.ok(gestRun(taps(3)).includes('tripleTap'));
  assert.ok(gestRun(taps(5)).includes('fiveTaps'));
  /* taps far apart in time do not add up */
  assert.ok(!gestRun(taps(2, 900)).includes('doubleTap'));
  assert.ok(gestRun(taps(1, 200, [60, 10])).includes('tapTop'));
  assert.ok(!gestRun(taps(1, 200, [60, 90])).includes('tapTop'));
});

test('gestures: hold and hold still fire while the finger is down', () => {
  const hold = gestRun([['down', 60, 60, 0], ['poll', 0, 0, 1000], ['move', 64, 62, 1200], ['poll', 0, 0, 1600]]);
  assert.deepEqual(hold, ['hold']);
  const still = gestRun([['down', 60, 60, 0], ['poll', 0, 0, 1600], ['poll', 0, 0, 3100]]);
  assert.deepEqual(still, ['hold', 'holdStill']);
  /* wiggling breaks "still" */
  assert.ok(!gestRun([['down', 60, 60, 0], ['move', 72, 60, 500], ['move', 60, 60, 900], ['poll', 0, 0, 3200]]).includes('holdStill'));
  /* a short press is not a hold */
  assert.ok(!gestRun([['down', 60, 60, 0], ['poll', 0, 0, 900], ['up', 60, 60, 1000]]).includes('hold'));
});

test('gestures: flick up, pull-and-release, stretch up, drag across', () => {
  assert.ok(gestRun([['down', 60, 80, 0], ['move', 60, 70, 60], ['move', 61, 40, 110], ['up', 61, 20, 150]]).includes('flickUp'));
  /* a slow pull up is not a flick, but it is a stretch up */
  const slow = gestRun([['down', 60, 80, 0], ['move', 60, 60, 400], ['move', 60, 35, 800], ['move', 60, 30, 1000], ['up', 60, 30, 1300]]);
  assert.ok(!slow.includes('flickUp')); assert.ok(slow.includes('stretchUp'));
  assert.ok(gestRun([['down', 60, 60, 0], ['move', 20, 80, 300], ['move', 0, 100, 600], ['up', 0, 100, 700]]).includes('pullRelease'));
  /* pulled far but brought back before letting go: no slingshot */
  assert.ok(!gestRun([['down', 60, 60, 0], ['move', 0, 100, 400], ['move', 58, 62, 800], ['up', 58, 62, 900]]).includes('pullRelease'));
  const across = []; for (let i = 0; i <= 20; i += 1) across.push(['move', -30 + i * 9, 60 + Math.sin(i / 3) * 10, i * 40]);
  assert.ok(gestRun([['down', -30, 60, 0], ...across, ['up', 150, 60, 900]]).includes('dragAcross'));
});

test('gestures: circle, shake, left-right swipe and slow rocking', () => {
  const circ = [['down', 90, 60, 0]];
  for (let i = 1; i <= 24; i += 1) { const a = i / 24 * Math.PI * 2; circ.push(['move', 60 + 30 * Math.cos(a), 60 + 30 * Math.sin(a), i * 30]); }
  assert.ok(gestRun([...circ, ['up', 90, 60, 760]]).includes('circle'));
  /* a straight line is not a circle */
  assert.ok(!gestRun([['down', 0, 60, 0], ...Array.from({ length: 10 }, (_, i) => ['move', i * 12, 60, i * 30]), ['up', 120, 60, 330]]).includes('circle'));
  const zig = (n, step, amp) => { const ev = [['down', 60, 60, 0]]; for (let i = 1; i <= n; i += 1) ev.push(['move', 60 + (i % 2 ? amp : -amp), 60, i * step]); ev.push(['up', 60, 60, (n + 1) * step]); return ev; };
  const fast = gestRun(zig(6, 90, 30));
  assert.ok(fast.includes('shake')); assert.ok(fast.includes('swipeLR')); assert.ok(!fast.includes('rock'));
  const slowRock = gestRun(zig(4, 450, 25));
  assert.ok(slowRock.includes('rock')); assert.ok(!slowRock.includes('shake'));
  /* one swipe only is none of them */
  const one = gestRun([['down', 60, 60, 0], ['move', 100, 60, 100], ['up', 100, 60, 150]]);
  for (const k of ['shake', 'swipeLR', 'rock']) assert.ok(!one.includes(k), k);
});

test('a trick needs that squishy and its own gesture', () => {
  assert.ok(C.isTrick('bush', { type: 'tripleTap' }));
  assert.ok(!C.isTrick('bush', { type: 'hold', ms: 2000 }));
  assert.ok(C.isTrick('lamp', { type: 'hold', ms: 1500 }) && !C.isTrick('lamp', { type: 'hold', ms: 900 }));
  for (const [id, g] of [['dove', 'flickUp'], ['lamb', 'holdStill'], ['lion', 'tripleTap'], ['coat', 'circle'], ['boat', 'swipeLR'], ['tomb', 'dragAcross']]) assert.ok(!C.isTrick(id, { type: g, ms: 3000 }), `${id} has no trick now`);
});

test('found tricks are remembered, hints show after some play, Trick master needs them all', () => {
  const s = memStore(), st = C.stats(s);
  assert.equal(C.trickRevealed('bush', st.get()), false);
  for (let i = 0; i < C.HINT_AFTER; i += 1) { st.squished('bush'); st.squished('dove'); }
  assert.equal(C.trickRevealed('bush', st.get()), true);
  assert.equal(C.trickRevealed('dove', st.get()), false, 'no trick, no hint');
  assert.equal(C.trickRevealed('lamp', st.get()), false);
  assert.equal(st.trickFound('lamp'), true);
  assert.equal(st.trickFound('lamp'), false, 'only the first time counts');
  assert.equal(C.trickRevealed('lamp', st.get()), true);
  C.checkUnlocks(s, SQUISHIES, new Date(2026, 9, 11));
  let list = C.badges(s, SQUISHIES);
  assert.ok(list.find(b => b.id === 'first-trick').earned);
  const master = list.find(b => b.id === 'trick-master');
  assert.equal(master.earned, null); assert.equal(master.progress.need, 2); assert.equal(master.progress.have, 1);
  st.trickFound('bush');
  C.checkUnlocks(s, SQUISHIES, new Date(2026, 9, 11));
  list = C.badges(s, SQUISHIES);
  assert.equal(list.find(b => b.id === 'trick-master').earned, '2026-10-11');
  /* junk in storage is ignored */
  s.setItem('msb_squishy_stats', JSON.stringify({ tricks: ['dove', 'nope', 5], plays: { dove: 3, nope: 9, lamb: -2 } }));
  assert.deepEqual(C.stats(s).get().tricks, ['dove']);
  assert.deepEqual(C.stats(s).get().plays, { dove: 3, lamb: 0 });
});

test('tricks UI: hint chip, T key, toast, effects module wired in, Spanish for every trick word', () => {
  const ui = read('./squishy.js'), i18n = read('./i18n.js'), html = read('./index.html'), sw = read('./sw.js');
  assert.ok(html.includes('<script src="squishy-fx.js" defer>') && html.indexOf('squishy-fx.js') < html.indexOf('squishy.js"'));
  assert.ok(sw.includes("'./squishy-fx.js'"));
  assert.match(ui, /data-sq-trick/); assert.match(ui, /e\.key === 't' \|\| e\.key === 'T'/); assert.match(ui, /data-sq-toast/);
  /* reduced motion: still picture of the trick, no particles */
  assert.match(ui, /const t = red \? 0\.85/); assert.match(ui, /if \(!p \|\| !F \|\| reduced\(\)\) return;/);
  const grab = name => { const m = ui.match(new RegExp(`const ${name} = \\{([^\\n]+)\\};`)); assert.ok(m, name); return [...m[1].matchAll(/: '([^']+)'/g)].map(x => x[1]); };
  for (const k of [...grab('TRICK_NAME'), ...grab('TRICK_STORY'), ...grab('GESTURE_TEXT'), ...grab('TRICK_TEXT')]) assert.ok(i18n.includes(`${JSON.stringify(k)}:`), `missing Spanish for: ${k}`);
  for (const id of Object.keys(C.KITS).filter(C.hasTrick)) assert.ok(grab('TRICK_NAME').length === 2 && ui.includes(`${/-/.test(C.KITS[id].trick) ? `'${C.KITS[id].trick}'` : C.KITS[id].trick}: '`), id);
});

test('every trick animation draws without errors at any moment', () => {
  const noop = () => {};
  const g = new Proxy({ createRadialGradient: () => ({ addColorStop: noop }) }, { get: (o, k) => (k in o ? o[k] : noop), set: () => true });
  const G = { cx: 300, cy: 400, S: 300, W: 600, H: 900, dpr: 2, ground: 560, px: 300, py: 400, path: [[300, 400], [500, 600]], text: 'X' };
  for (const [id, tr] of Object.entries(FX.TRICKS)) for (const t of [0, 0.1, 0.33, 0.5, 0.66, 0.8, 0.95, 1]) {
    const pose = tr.pose(t) || {};
    for (const v of ['dx', 'dy', 'rot', 'sx', 'sy', 'alpha']) if (v in pose) assert.ok(Number.isFinite(pose[v]), `${id} ${v} @${t}`);
    tr.over(g, t, G);
  }
  /* particles step and draw too */
  for (const name of Object.keys(FX.FX)) { const pt = FX.spawn(name, { x: 0, y: 0, w: 100, h: 100 }, { x: 50, y: 50 }, Math.random, 3); if (!pt) continue; FX.step(pt, 0.1); FX.drawParticle(g, pt, 2); }
});

test('ten newer squishies: Bible stories, own sound and effect, no trick, unlocked by their own goal', () => {
  const NEW = ['ladder', 'raven', 'wheat', 'oil', 'coin', 'donkey', 'jar', 'crown', 'boat', 'tomb'];
  assert.deepEqual(SQUISHIES.slice(14, 24).map(x => x.id), NEW);
  for (const id of NEW) {
    const x = SQUISHIES.find(q => q.id === id), k = C.KITS[id];
    assert.ok(x.locked && C.challengeFor(id), id);
    assert.ok(k && FX.FX[k.fx] && !k.trick && !C.hasTrick(id), id);
  }
  const fxs = Object.values(C.KITS).map(k => k.fx);
  assert.equal(new Set(fxs).size, fxs.length, 'every effect is different');
  const sig = Object.values(C.KITS).map(k => `${k.sound.squish}/${k.sound.release}/${k.sound.tone}`);
  assert.equal(new Set(sig).size, sig.length, 'every voice is different');
});

test('new gestures: pull down slowly, flick down, flick sideways, swipe up and down', () => {
  const has = (pts, g) => { const ev = pts.map(([x, y, t], i) => [i ? 'move' : 'down', 60 + x, 60 + y, t]); const [x, y, t] = pts.at(-1); ev.push(['up', 60 + x, 60 + y, t + 10]); return gestRun(ev).includes(g); };
  assert.ok(has([[0, 0, 0], [0, 20, 150], [1, 40, 300], [0, 55, 450]], 'stretchDown'));
  assert.ok(!has([[0, 0, 0], [0, 55, 100]], 'stretchDown'), 'too fast to be a stretch');
  assert.ok(has([[0, 0, 0], [0, 10, 40], [0, 40, 100], [0, 70, 140]], 'flickDown'));
  assert.ok(has([[0, 0, 0], [15, 0, 40], [45, 2, 100], [75, 1, 140]], 'flickSide'));
  assert.ok(has([[0, 0, 0], [-15, 0, 40], [-45, 2, 100], [-75, 1, 140]], 'flickSide'));
  assert.ok(has([[0, 0, 0], [0, -30, 200], [0, 30, 450], [0, -30, 700], [0, 30, 950]], 'swipeUD'));
  assert.ok(!has([[0, 0, 0], [0, -30, 200], [0, 30, 450], [0, -30, 700], [0, 30, 950]], 'swipeLR'));
});

test('progress from removed tricks is kept: stored list untouched, earned trick badges stay earned', () => {
  const s = memoryStorage();
  s.setItem('msb_squishy_stats', JSON.stringify({ tricks: ['dove', 'fish', 'bush'], badges: { 'first-trick': '2026-10-01', 'trick-master': '2026-10-02' } }));
  C.checkUnlocks(s, SQUISHIES, new Date(2026, 9, 13));
  const st = C.stats(s).get();
  assert.deepEqual(st.tricks, ['dove', 'fish', 'bush']);
  const list = C.badges(s, SQUISHIES);
  assert.equal(list.find(b => b.id === 'first-trick').earned, '2026-10-01');
  assert.equal(list.find(b => b.id === 'trick-master').earned, '2026-10-02');
  assert.deepEqual([list.find(b => b.id === 'trick-master').progress.have, list.find(b => b.id === 'trick-master').progress.need], [1, 2], 'only real tricks count now');
});

test('art fits its 120 x 120 picture: the drawings that reach past it are scaled and shifted, face spot too', () => {
  const src = read('./squishy-art.js');
  const fit = Function(`return ${src.match(/const FIT = (\{[^\n]+\});/)[1]}`)();
  assert.ok(Object.keys(fit).length >= 10);
  for (const [id, [s, dx, dy]] of Object.entries(fit)) {
    assert.ok(SQUISHIES.some(x => x.id === id), id);
    assert.ok(s > 0.9 && s <= 1, `${id} scale`); assert.ok(Math.abs(dx) <= 10 && Math.abs(dy) <= 10, `${id} shift`);
  }
  for (const id of ['wheat', 'ladder', 'donkey', 'jar', 'tomb', 'oil']) assert.ok(fit[id][2] > 0, `${id} moves down so its top is not cut`);
  assert.match(src, /body = fitWrap\(id, body\);/);
  assert.match(src, /x: f\[1\] \+ p\.x \* f\[0\], y: f\[2\] \+ p\.y \* f\[0\], k: p\.k \* f\[0\]/);
});

test('only trick squishies mention a secret trick; the first squish shows the lesson card', () => {
  const ui = readFileSync(new URL('./squishy.js', import.meta.url), 'utf8');
  const i18n = readFileSync(new URL('./i18n.js', import.meta.url), 'utf8');
  assert.match(ui, /kit\(x\.id\) && kit\(x\.id\)\.trick \? L\('\{name\}\. Press to squish[^']*T does its secret trick\.'/);
  assert.ok(i18n.includes('"{name}. Press to squish, drag to stretch, two fingers to squeeze or spread. Keys: Enter or Space squishes, arrows stretch.":'));
  assert.match(ui, /<article class="card sq-card" aria-live="polite">/);
  assert.match(ui, /if \(learn && learn\.hidden\) \{\s*learn\.hidden = false;[\s\S]{0,400}sheet\.innerHTML = cardHtml\(p\.x\); sheet\.hidden = false;/);
  assert.match(ui, /sheet\.hidden && C\(\)\.lessonSeen\(store2\(\)\)\.first\(p\.id\)\) setTimeout/, 'only the first squish of each squishy');
  assert.ok(i18n.includes('"Verified": "Verificado"'));
  for (const k of ['Gold', 'Teal', 'Black', 'Read Scripture with the Orthodox Church. A profile on this device keeps your notes and progress in this browser.']) assert.ok(new RegExp(`['"]${k.replace(/[.]/g, '\\.')}['"]:`).test(i18n), k);
});

test('every squishy has its own feel: softness, bounce and buzz', () => {
  const ids = SQUISHIES.map(x => x.id);
  assert.equal(ids.length, 37);
  for (const id of ids) {
    const f = C.FEEL[id];
    assert.ok(f, id); assert.ok(C.BUZZ[f.buzz], `${id} buzz`);
    assert.ok(f.soft >= 0.5 && f.soft <= 1.3 && f.bounce >= 0.55 && f.bounce <= 1.5, id);
  }
  /* lamb soft and slow, tomb and stone heavy, coin quick buzzes */
  assert.ok(C.FEEL.lamb.soft > 1.2 && C.FEEL.lamb.bounce < 0.8 && C.FEEL.lamb.buzz === 'soft');
  for (const id of ['tomb', 'stone']) assert.ok(C.FEEL[id].soft < 0.6 && C.FEEL[id].buzz === 'heavy', id);
  assert.equal(C.FEEL.coin.buzz, 'quick');
  const lamb = C.feelPattern('lamb', 'release', 1, 'medium'), tomb = C.feelPattern('tomb', 'release', 1, 'medium'), coin = C.feelPattern('coin', 'release', 1, 'medium');
  const on = p => (Array.isArray(p) ? p.filter((_, i) => i % 2 === 0) : [p]);
  assert.ok(Math.max(...on(tomb)) > 2 * Math.max(...on(lamb)), 'the tomb thuds harder than the lamb');
  assert.ok(on(coin).length >= 4 && Math.max(...on(coin)) <= 12, 'the coin is quick little buzzes');
  assert.ok(lamb[1] >= 80, 'the lamb waits slowly between pulses');
  const pats = new Set(ids.map(id => JSON.stringify(C.feelPattern(id, 'release', 0.7, 'medium'))));
  assert.ok(pats.size >= 12, `many different buzzes (${pats.size})`);
  /* softness and bounce reach the soft body */
  const soft = C.softBody({ feel: C.FEEL.lamb }), hard = C.softBody({ feel: C.FEEL.tomb });
  assert.ok(soft.cfg.squash > 2 * hard.cfg.squash, 'the lamb squashes much deeper than the tomb');
  assert.ok(C.softBody({ feel: C.FEEL.coin }).cfg.damp < soft.cfg.damp, 'the coin bounces livelier than the lamb');
  assert.equal(C.softBody({ reduced: true, feel: C.FEEL.lamb }).cfg.squash, C.softBody({ reduced: true }).cfg.squash, 'reduced motion is never softer');
});

test('vibration strength Off/Light/Medium/Strong scales every pulse; reduced motion keeps one pulse', () => {
  assert.deepEqual(C.VIBE_LEVELS, ['off', 'light', 'medium', 'strong']);
  const m = new Map(), st = { getItem: k => m.get(k) ?? null, setItem: (k, v) => m.set(k, v) }, pref = C.vibePref(st);
  assert.equal(pref.get(), 'medium');
  assert.equal(pref.set('strong'), 'strong'); assert.equal(pref.get(), 'strong');
  assert.equal(pref.set('loud'), 'medium');
  assert.equal(C.scalePattern([20, 40, 20], 'off'), 0);
  assert.deepEqual(C.scalePattern([20, 40, 20], 'light'), [10, 40, 10]);
  assert.deepEqual(C.scalePattern([20, 40, 20], 'strong'), [32, 40, 32]);
  assert.equal(C.scalePattern(100, 'strong'), 80, 'each pulse at most 80 ms');
  for (const id of Object.keys(C.FEEL)) for (const lv of ['light', 'medium', 'strong']) {
    const p = C.feelPattern(id, 'release', 1, lv), a = Array.isArray(p) ? p : [p];
    assert.ok(a.reduce((x, y) => x + y, 0) <= 300 && a.length % 2 === 1, `${id} ${lv}`);
  }
  assert.equal(C.feelPattern('tomb', 'release', 1, 'off'), 0);
  assert.equal(typeof C.feelPattern('coin', 'release', 1, 'medium', true), 'number', 'reduced motion: one pulse');
  const ui = read('./squishy.js'), i18n = read('./i18n.js');
  assert.match(ui, /localStorage\.getItem\('msb_tap_vibration'\) === 'off'\) return;[\s\S]{0,200}scalePattern\(pattern, vibe\(\)\.get\(\)\)/, 'the app switch wins, then the strength');
  assert.match(ui, /es: \{ off: 'Apagada', light: 'Suave', medium: 'Media', strong: 'Fuerte' \}/);
  assert.match(ui, /role="radiogroup"/);
  assert.ok(i18n.includes('"Vibration strength": "Fuerza de la vibración"'));
});

test('first squish sound is quick: warm audio on open, resume on touch and return, fast attacks', () => {
  const ui = read('./squishy.js');
  assert.match(ui, /new Ctor\(\{ latencyHint: 'interactive' \}\)/);
  assert.match(ui, /function warmAudio\(\)[\s\S]{0,400}makeNoise\(a\)[\s\S]{0,300}g\.gain\.value = 0;[^\n]*src\.start\(0\)/, 'noise built and a silent blip for iOS');
  assert.match(ui, /if \(!host \|\| !x\) return;\n    warmAudio\(\);/, 'warmed when the play view opens');
  assert.match(ui, /addEventListener\('pointerdown', \(\) => \{ if \(pv && ac && ac\.state !== 'running'\) audio\(\); \}, true\)/);
  assert.match(ui, /visibilitychange', \(\) => \{ if \(!document\.hidden && pv/);
  assert.match(ui, /a\.resume\(\)\.then\(again/, 'sounds wait for resume() when the device is waking');
  for (const name of ['bleat', 'coo', 'purr']) {
    const m = ui.match(new RegExp(`\\n    ${name}: d => voice\\(\\{[^\\n]*attack: ([0-9.]+)`));
    assert.ok(m && Number(m[1]) <= 0.01, `${name} attack ${m && m[1]}`);
  }
  assert.match(ui, /exponentialRampToValueAtTime\(o\.peak \|\| 0\.04, t \+ \(o\.attack \|\| 0\.006\)\)/, 'noise fades in within 6 ms');
  assert.match(ui, /delay: k === 0 \? 0 : rr\(\) \* 0\.25/, 'the bush crackle starts at once');
  assert.match(ui, /swish: d => \{[^\n]*voice\(\{ type: 'triangle', f0: 784, dur: 0\.4, peak: 0\.02 \}\)/, 'coat tone with no offset');
  assert.match(ui, /alleluia: a => \[523, 659, 784\][^\n]*attack: 0\.15/, 'soft choir kept');
  assert.match(ui, /p\.pointers\.delete\(e\.pointerId\); kitSquish\(0\.3\); return;/, 'a tap during a trick still squishes');
});

test('the burning bush is legendary: 10 perfect rounds, keeps I AM, cannot be traded, stays open if you had it', () => {
  const T = require('./squishy-trade.js');
  const ch = C.challengeFor('bush');
  assert.deepEqual([ch.kind, ch.n, ch.tier], ['perfectLegend', 10, 'legendary']);
  assert.equal(C.tierOf('bush'), 'legendary');
  assert.ok(C.hasTrick('bush') && C.isTrick('bush', { type: 'tripleTap' }), 'still says I AM');
  assert.equal(T.tradable('bush'), false);
  const s = memoryStorage(), st = C.stats(s);
  for (let i = 0; i < 9; i += 1) st.roundDone(5, 5);
  assert.ok(!C.checkUnlocks(s, SQUISHIES).includes('bush'), '9 is not enough');
  st.roundDone(5, 5);
  assert.ok(C.checkUnlocks(s, SQUISHIES).includes('bush'), '10 perfect rounds');
  const old = memoryStorage();
  old.setItem('msb_squishy_unlocked', JSON.stringify(['bush']));
  C.checkUnlocks(old, SQUISHIES);
  assert.ok(C.progress(old, SQUISHIES).unlocked().includes('bush'), 'an already opened bush stays open');
  const ui = read('./squishy.js');
  assert.match(ui, /case 'perfectLegend': return L\('Get 5 of 5 right in Questions \{n\} times', \{ n: ch\.n \}\);/);
});

test('the lesson card pops up by itself only the first time each squishy is squished', () => {
  const s = memoryStorage(), seen = C.lessonSeen(s);
  assert.equal(seen.first('lamb'), true, 'first squish of the lamb');
  assert.equal(seen.first('lamb'), false, 'not again');
  assert.equal(C.lessonSeen(s).first('lamb'), false, 'remembered after closing and reopening');
  assert.equal(seen.first('dove'), true, 'each squishy has its own first time');
  assert.ok(C.KEYS.lessonSeen.startsWith('msb_'), 'covered by Export/Restore (msb_ keys)');
  const aura = read('./aura.js');
  assert.match(aura, /MSB_BACKUP_PREFIXES=\['msb_'/);
  /* a squishy whose lesson star was already collected counts as seen */
  C.progress(s, SQUISHIES).addStar('lion');
  assert.equal(C.lessonSeen(s).first('lion'), false);
  s.setItem(C.KEYS.lessonSeen, '{bad');
  assert.equal(C.lessonSeen(s).first('fish'), true, 'junk is ignored');
});

/* ---------- Twelve squishies won in the games ---------- */
const GAME_SQ = ['lily', 'key', 'pearl', 'manna', 'scroll', 'shofar', 'tablets', 'elephant', 'honeycomb', 'anchor', 'shield', 'chariot'];

test('twelve game squishies: before the lamp, own art, sound, voice, effect, feel and badge, no trick', () => {
  assert.deepEqual(SQUISHIES.slice(24, -1).map(x => x.id), GAME_SQ);
  const ui = read('./squishy.js'), i18n = read('./i18n.js');
  for (const id of GAME_SQ) {
    const x = SQUISHIES.find(q => q.id === id), k = C.KITS[id];
    assert.ok(x.locked && C.challengeFor(id), id);
    assert.ok(k && FX.FX[k.fx] && !k.trick && !C.hasTrick(id), `${id} no trick`);
    assert.ok(C.TONES[k.sound.tone], `${id} tone`);
    assert.match(ui, new RegExp(`\\n    '?${k.sound.squish}'?: d =>`), `${id} squish voice`);
    assert.match(ui, new RegExp(`\\n    '?${k.sound.release}'?: (a|\\(\\)) =>`), `${id} release voice`);
    assert.ok(C.FEEL[id], `${id} feel`);
    const badge = ui.match(new RegExp(`${id}: '([^']+)'`));
    assert.ok(badge, `${id} badge`);
    assert.ok(i18n.includes(`"${badge[1]}":`), `${id} badge ES`);
  }
  const tones = Object.values(C.TONES).filter(Boolean).map(t => JSON.stringify(t));
  assert.equal(new Set(tones).size, tones.length, 'every tone is different');
  const fx = Object.values(FX.FX).map(f => `${f.shape}/${f.colors[0]}/${f.origin}`);
  assert.equal(new Set(fx).size, fx.length, 'every effect looks different');
  assert.equal(C.tierOf('chariot'), 'legendary');
});

test('game squishies unlock from coloring, Questions, Memory, Manna Match and each Bible game', () => {
  const s = memoryStorage(), st = C.stats(s);
  const ctx = () => C.challengeContext(s, SQUISHIES), pr = id => C.challengeProgress(C.challengeFor(id), ctx());
  assert.deepEqual([pr('lily').have, pr('scroll').have, pr('chariot').have], [0, 0, 0]);
  st.colored('noah'); st.colored('noah'); st.colored('ark');
  assert.equal(pr('lily').have, 2, 'the same page counts once');
  st.colored('<bad page>');
  assert.equal(pr('lily').have, 2, 'odd ids are ignored');
  st.colored('jonah');
  assert.ok(pr('lily').done);
  s.setItem('msb_kidgames', JSON.stringify({ done: { wordsearch: ['a', 'b', 'b'], sling: 'x' }, best: { who: 7 } }));
  assert.deepEqual([pr('scroll').have, pr('shield').have, pr('shofar').have], [2, 0, 7], 'repeats and bad data do not count');
  s.setItem('msb_kidgames', '{oops');
  assert.equal(pr('scroll').have, 0, 'broken data is safe');
  s.setItem('msb_kidgames', JSON.stringify({ ...KG_ALL, done: { ...KG_ALL.done, map: [] } }));
  assert.deepEqual([pr('chariot').have, pr('chariot').need, pr('chariot').done], [5, 6, false], 'the chariot needs all six games');
  s.setItem('msb_kidgames', JSON.stringify(KG_ALL));
  const opened = C.checkUnlocks(s, SQUISHIES);
  for (const id of ['lily', 'scroll', 'shofar', 'tablets', 'elephant', 'honeycomb', 'anchor', 'shield', 'chariot']) assert.ok(opened.includes(id), id);
  assert.ok(!opened.includes('lamp'), 'the lamp still waits for the rest');
  assert.equal(C.stats(s).get().colored.length, 3, 'colored pages are kept in the stats (backed up with msb_)');
});

test('the games report progress to the squishies and show a note', () => {
  const ui = read('./squishy.js'), kg = read('./kidgames.js'), col = read('./coloring.js'), i18n = read('./i18n.js');
  assert.match(ui, /gameProgress\(colorPage\) \{/);
  assert.match(kg, /MsbSquishy\.gameProgress \? MsbSquishy\.gameProgress\(\) : \[\]/);
  assert.match(kg, /New squishy: \{name\}!', '¡Nuevo squishy: \{name\}!'/);
  assert.match(col, /MsbSquishy\.gameProgress\(s\.id\)/);
  assert.ok(i18n.includes('"New squishy: {name}!": "¡Nuevo squishy: {name}!"'));
  for (const k of ['Color {n} different pages', 'Get {n} in a row in Who Said It?', 'Finish each of the 6 Bible games once', 'Finish {n} Word Search puzzles', 'Put {n} stories in order', 'Build {n} verses in Verse Builder', 'Finish {n} Map Journeys', 'Finish {n} levels of David’s Sling']) assert.ok(i18n.includes(`"${k}":`), k);
});

/* ---------- Winning a squishy back after a trade ---------- */
test('a squishy traded away comes back only by doing its goal again with fresh play', () => {
  const s = memoryStorage(), st = C.stats(s);
  for (let i = 0; i < 10; i += 1) st.roundDone(4, 5);
  C.checkUnlocks(s, SQUISHIES);
  assert.ok(C.progress(s, SQUISHIES).unlocked().includes('key'), 'key won with 10 Questions wins');
  assert.equal(C.tradeAway(s, SQUISHIES, 'key'), true);
  assert.equal(C.tradeAway(s, SQUISHIES, 'lamp'), false, 'the lamp never leaves');
  assert.equal(C.tradeAway(s, SQUISHIES, 'lamb'), false, 'starters never leave');
  assert.ok(!C.progress(s, SQUISHIES).unlocked().includes('key'));
  assert.deepEqual(C.checkUnlocks(s, SQUISHIES), [], 'old progress does not bring it back instantly');
  for (let i = 0; i < 9; i += 1) st.roundDone(4, 5);
  const pr = C.wonBackProgress(s, C.challengeFor('key'));
  assert.deepEqual([pr.have, pr.need, pr.done, pr.again], [9, 10, false, true]);
  assert.deepEqual(C.checkUnlocks(s, SQUISHIES), []);
  st.roundDone(4, 5);
  assert.deepEqual(C.checkUnlocks(s, SQUISHIES), ['key'], 'the full count again: back, with the normal unlock (and celebration)');
  assert.deepEqual(C.awayList(s), {}, 'nothing left to win back');
});

test('one-time goals need fresh rounds of the same game; trading it back clears the rule', () => {
  const s = memoryStorage();
  s.setItem('msb_squishy_unlocked', JSON.stringify(['tomb', 'shofar']));
  s.setItem('msb_match_progress', JSON.stringify({ open: 21, stars: Object.fromEntries(Array.from({ length: 20 }, (_, i) => [i + 1, 2])), best: {}, wins: 20 }));
  s.setItem('msb_kidgames', JSON.stringify({ done: { who: ['round'] }, best: { who: 9 }, plays: { who: 3 } }));
  C.tradeAway(s, SQUISHIES, 'tomb'); C.tradeAway(s, SQUISHIES, 'shofar');
  const two = () => C.checkUnlocks(s, SQUISHIES).filter(id => id === 'tomb' || id === 'shofar').sort();
  assert.deepEqual(two(), []);
  assert.equal(C.AGAIN.matchChapter, 5);
  s.setItem('msb_match_progress', JSON.stringify({ ...JSON.parse(s.getItem('msb_match_progress')), wins: 24 }));
  assert.deepEqual(two(), [], '4 fresh level wins are not enough for the tomb');
  s.setItem('msb_match_progress', JSON.stringify({ ...JSON.parse(s.getItem('msb_match_progress')), wins: 25 }));
  s.setItem('msb_kidgames', JSON.stringify({ done: { who: ['round'] }, best: { who: 9 }, plays: { who: 4 } }));
  assert.deepEqual(two(), ['shofar', 'tomb']);
  /* trading it back in removes the win-back rule */
  C.tradeAway(s, SQUISHIES, 'ark');
  assert.ok(C.awayList(s).ark);
  assert.equal(C.cameBack(s, 'ark'), true);
  assert.deepEqual(Object.keys(C.awayList(s)), []);
});

test('the win-back rule is explained in EN/ES and shown on the locked tile', () => {
  const ui = read('./squishy.js'), i18n = read('./i18n.js');
  assert.match(ui, /C\(\)\.wonBackProgress\(store2\(\), ch\)/);
  const keys = [...ui.matchAll(/L\('([^']+)'/g)].map(m => m[1]);
  for (const k of new Set(keys)) assert.ok(i18n.includes(`"${k}":`), `missing Spanish for: ${k}`);
  assert.ok(i18n.includes('"If a squishy ever leaves your shelf in a trade, you can win it back: do its goal again after the trade (fresh play, not old progress).":'));
  for (const k of [C.KEYS.away, 'msb_squishy_celebrate']) assert.ok(k.startsWith('msb_'), k);
});

test('squishies won in a game or coloring get the full celebration; badge icons are all different', () => {
  const ui = read('./squishy.js'), who = read('./kg-who.js');
  assert.match(ui, /queueCelebrations\(won\.map\(x => x\.id\)\)/);
  assert.match(ui, /const waiting = takeCelebrations\(\);/);
  assert.match(ui, /play\(top\);/, 'the rare or legendary fanfare plays where it was won');
  assert.match(who, /if \(s\.k >= s\.order\.length\) award\(\);/, 'Who Said It awards at the end of a round');
  const icons = Object.values(Function(`return ${ui.match(/const BADGE_ICON = (\{[^\n]+\});/)[1]}`)());
  assert.equal(new Set(icons).size, icons.length);
  assert.ok(read('./i18n.js').includes('"Get {n} in a row in Who Said It?": "Acierta {n} seguidas en ¿Quién lo dijo?"'));
});

test('queued and new unlock celebrations share one queue and never double', () => {
  const src = readFileSync(new URL('./squishy.js', import.meta.url), 'utf8');
  assert.match(src, /function enqueue\(ids, delay\)/);
  assert.match(src, /!ui\.queue\.includes\(id\) && ui\.showing !== id/);
  assert.match(src, /if \(!ui\.queue\.length \|\| ui\.celebrateT/);
  assert.ok(!/setTimeout\(\(\) => celebrate\(ui\.queue\.shift\(\)\)/.test(src), 'no second timer path');
});

/* ---------- Trade codes give the squishy away (real flow) ---------- */
test('making a trade code gives the squishy away; the friend gets it; it is won back by fresh play', () => {
  const T = require('./squishy-trade.js');
  const giver = memoryStorage(), friend = memoryStorage(), st = C.stats(giver);
  for (let i = 0; i < 10; i += 1) st.roundDone(4, 5);
  C.checkUnlocks(giver, SQUISHIES);
  const owned = () => C.progress(giver, SQUISHIES).unlocked();
  assert.ok(owned().includes('key'));
  /* the screen passes tradeAway as the give step (after the confirm dialog) */
  const code = T.trades(giver).create('key', owned(), Math.random, new Date(), id => C.tradeAway(giver, SQUISHIES, id));
  assert.ok(code);
  assert.ok(!owned().includes('key'), 'it left the giver’s shelf');
  assert.ok(C.awayList(giver).key, 'and can be won back');
  assert.equal(T.trades(giver).redeem(code).reason, 'own', 'the giver cannot redeem their own code');
  const r = T.trades(friend).redeem(code);
  assert.equal(r.ok, true); assert.equal(r.id, 'key');
  /* legendaries stay untradable by code */
  assert.equal(T.trades(giver).create('bush', ['bush'], Math.random, new Date(), () => assert.fail('never given')), null);
  /* fresh play brings it back with the normal unlock */
  assert.deepEqual(C.checkUnlocks(giver, SQUISHIES), []);
  for (let i = 0; i < 10; i += 1) st.roundDone(4, 5);
  assert.deepEqual(C.checkUnlocks(giver, SQUISHIES), ['key']);
});

test('the trade screen asks before giving, says it is a gift, and the locked tile says how to win it back', () => {
  const ui = read('./squishy.js'), i18n = read('./i18n.js');
  assert.match(ui, /data-sq-trade-make[^]*ui\.trade\.confirm = true/);
  assert.match(ui, /trades\(\)\.create\(tr\.pick, prog\(\)\.unlocked\(\), Math\.random, new Date\(\), id => C\(\)\.tradeAway\(/);
  assert.match(ui, /C\(\)\.cameBack\(store2\(\), r\.id\)/);
  assert.match(ui, /back \? `\$\{L\('Win it back: \{goal\}'/);
  for (const k of ['Give a squishy to a friend', 'Give {name} away?', 'Yes, give it', 'Keep it', 'It leaves your shelf when you make the code. You can win it back by doing its goal again.']) assert.ok(i18n.includes(`"${k}":`), k);
  assert.ok(!ui.includes('Give a friend a copy') && !ui.includes('You keep your squishy too'));
});

test('trade audit: sent codes can be shown again, starters are not offered, one Spanish word, confirm resets', () => {
  const T = require('./squishy-trade.js');
  const ui = read('./squishy.js'), i18n = read('./i18n.js'), tr = read('./squishy-trade.js');
  /* a code made is always in the sent history */
  const s = memoryStorage();
  const code = T.trades(s).create('key', ['key']);
  assert.deepEqual(T.trades(s).get().sent.map(x => [x.c, x.id]), [[code, 'key']]);
  assert.match(ui, /function sentHtml\(tr\)/);
  assert.match(ui, /data-sq-sent="\$\{esc\(x\.c\)\}"/);
  assert.ok(i18n.includes('"My sent codes": "Mis códigos enviados"'));
  /* starters never appear in the picker */
  assert.match(ui, /SQUISHIES\.filter\(x => x\.locked && open\.includes\(x\.id\) && T\.tradable\(x\.id\)\)/);
  /* the tab is "Cambiar" and the instructions say the same */
  assert.ok(i18n.includes('"Trade": "Cambiar"'));
  assert.ok(!/en Intercambio/.test(i18n));
  assert.ok(i18n.includes('en la pestaña Cambiar'));
  /* the header no longer promises a copy */
  assert.ok(!/the giver keeps their squishy/.test(tr));
  /* changing the pick closes the give-away question */
  assert.match(ui, /ui\.trade\.pick = tp\.dataset\.sqTradePick; ui\.trade\.confirm = false;/);
});
