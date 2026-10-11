import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
const require = createRequire(import.meta.url);
const { PIECES, CHAPTERS, LEVELS } = require('./match3-data.js');
const C = require('./match3-core.js');
const Art = require('./match3-art.js');

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
const { idx, SP, BOMB, EMPTY, N } = C;

/* A hand-made board. The filler (x + 2y) % 5 has no two equal neighbours,
   so only the cells a test sets can match. */
const testLevel = { n: 0, pieces: ['star', 'fish', 'grapes', 'loaf', 'leaf'], moves: 20, seed: 99, goals: [{ kind: 'score', n: 100000 }], stars: [1, 2], stones: null };
function board(set = {}, level = testLevel) {
  const g = C.createGame(level);
  for (let i = 0; i < N; i += 1) { const [x, y] = C.xy(i); g.t[i] = (x + 2 * y) % 5; g.sp[i] = 0; }
  for (const [k, v] of Object.entries(set)) { const [x, y] = k.split(',').map(Number); if (Array.isArray(v)) { g.t[idx(x, y)] = v[0]; g.sp[idx(x, y)] = v[1]; } else g.t[idx(x, y)] = v; }
  return g;
}
const fakeStore = () => { const m = new Map(); return { getItem: k => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, String(v)), m }; };

/* ---------- Levels and lessons ---------- */
test('20 levels in 10 Bible chapters, two each, in story order', () => {
  assert.equal(LEVELS.length, 20);
  assert.deepEqual(CHAPTERS.map(c => c.id), ['creation', 'noah', 'sea', 'jericho', 'david', 'daniel', 'jonah', 'birth', 'loaves', 'easter']);
  LEVELS.forEach((lv, i) => {
    assert.equal(lv.n, i + 1);
    assert.equal(lv.chapter, CHAPTERS[Math.floor(i / 2)].id, `level ${lv.n}`);
  });
});

test('every level and chapter has EN and ES words (titles, intros, lessons)', () => {
  for (const c of CHAPTERS) for (const f of ['name', 'intro']) for (const l of ['en', 'es']) assert.ok(c[f][l] && c[f][l].length > 3, `${c.id} ${f} ${l}`);
  for (const c of CHAPTERS) { const n = c.intro.en.split(/[.!?](\s|$)/).filter(s => s && s.trim()).length; assert.ok(n >= 2 && n <= 3, `${c.id} intro has ${n} sentences`); }
  for (const lv of LEVELS) for (const f of ['title', 'lesson']) for (const l of ['en', 'es']) {
    assert.ok(typeof lv[f][l] === 'string' && lv[f][l].trim().length > 3, `${lv.n} ${f} ${l}`);
  }
  for (const lv of LEVELS) assert.notEqual(lv.lesson.en, lv.lesson.es);
});

test('every lesson verse is word for word from the app KJV and RV1909 text', () => {
  for (const lv of LEVELS) for (const l of ['en', 'es']) {
    const text = verseAt(l, lv.at[l]);
    assert.ok(text, `level ${lv.n} ${l}: verse missing`);
    assert.equal(lv.verse[l], text, `level ${lv.n} ${l}`);
    assert.equal(lv.ref[l], label(l, lv.at[l]), `level ${lv.n} ${l} reference`);
  }
  const refs = LEVELS.map(lv => lv.ref.en);
  assert.deepEqual(refs, ['Genesis 1:1', 'Genesis 1:3', 'Genesis 8:11', 'Genesis 9:15', 'Exodus 14:21', 'Exodus 14:14', 'Joshua 6:20', 'Joshua 1:9', '1 Samuel 16:7', 'Psalms 23:1', 'Daniel 6:22', 'Psalms 46:1', 'Jonah 2:10', 'Jonah 3:5', 'Luke 2:11', 'Luke 2:14', 'John 6:9', 'John 6:35', 'Matthew 28:6', 'John 11:25']);
  assert.equal(new Set(refs).size, 20);
});

test('goals, moves, pieces and stones are sound, and stars rise', () => {
  const kinds = new Set();
  for (const lv of LEVELS) {
    assert.ok(lv.pieces.length >= 5 && lv.pieces.length <= 6, `level ${lv.n} pieces`);
    for (const p of lv.pieces) assert.ok(PIECES.includes(p) && Art.KEYS.includes(p), p);
    assert.ok(lv.moves >= 18 && lv.moves <= 32, `level ${lv.n} moves`);
    assert.ok(lv.goals.length >= 1);
    for (const g of lv.goals) {
      kinds.add(g.kind);
      if (g.kind === 'collect') { assert.ok(lv.pieces.includes(g.piece), `level ${lv.n} collects a piece on its board`); assert.ok(g.n > 0 && g.n <= 30); }
      if (g.kind === 'score') assert.ok(g.n > 0);
      if (g.kind === 'stones') { assert.ok(Array.isArray(lv.stones) && lv.stones.length === 8); assert.ok(lv.stones.every(r => /^[.#]{8}$/.test(r))); }
    }
    if (!lv.goals.some(g => g.kind === 'stones')) assert.equal(lv.stones, null);
    assert.ok(lv.stars[0] > 0 && lv.stars[1] > lv.stars[0], `level ${lv.n} stars`);
  }
  assert.deepEqual([...kinds].sort(), ['collect', 'score', 'stones']);
  /* gentle start: the first levels use 5 kinds of pieces and are short */
  assert.equal(LEVELS[0].pieces.length, 5);
  assert.equal(LEVELS[0].goals[0].kind, 'score');
});

/* ---------- Board ---------- */
test('seeded boards: the same level always starts the same way', () => {
  const a = C.createGame(LEVELS[0]), b = C.createGame(LEVELS[0]);
  assert.deepEqual(Array.from(a.t), Array.from(b.t));
  assert.notDeepEqual(Array.from(C.createGame(LEVELS[1]).t), Array.from(a.t));
  const r1 = C.rng(5), r2 = C.rng(5);
  for (let i = 0; i < 20; i += 1) assert.equal(r1.next(), r2.next());
});

test('every level starts with no ready-made matches and at least one move', () => {
  for (const lv of LEVELS) {
    const g = C.createGame(lv);
    assert.equal(C.findGroups(g).length, 0, `level ${lv.n}`);
    assert.ok(C.hasMove(g), `level ${lv.n}`);
    assert.ok(Array.from(g.t).every(t => t >= 0 && t < lv.pieces.length));
    assert.equal(g.movesLeft, lv.moves);
    const stones = (lv.stones || []).join('').split('#').length - 1;
    assert.equal(g.stonesStart, stones);
  }
});

test('finds rows and columns of 3', () => {
  let g = board({ '0,0': 1, '1,0': 1, '2,0': 1 });
  let gr = C.findGroups(g);
  assert.equal(gr.length, 1);
  assert.deepEqual(gr[0].cells.sort((a, b) => a - b), [0, 1, 2]);
  assert.equal(gr[0].special, SP.NONE);
  g = board({ '5,2': 4, '5,3': 4, '5,4': 4 });
  gr = C.findGroups(g);
  assert.equal(gr.length, 1);
  assert.deepEqual(gr[0].cells.sort((a, b) => a - b), [idx(5, 2), idx(5, 3), idx(5, 4)]);
});

test('4 in a row makes a row trumpet, 4 in a column a column trumpet, 5 a star', () => {
  let gr = C.findGroups(board({ '0,3': 2, '1,3': 2, '2,3': 2, '3,3': 2 }));
  assert.equal(gr[0].special, SP.ROW);
  gr = C.findGroups(board({ '6,1': 2, '6,2': 2, '6,3': 2, '6,4': 2 }));
  assert.equal(gr[0].special, SP.COL);
  gr = C.findGroups(board({ '1,6': 3, '2,6': 3, '3,6': 3, '4,6': 3, '5,6': 3 }));
  assert.equal(gr[0].special, SP.BOMB);
  gr = C.findGroups(board({ '7,0': 3, '7,1': 3, '7,2': 3, '7,3': 3, '7,4': 3 }));
  assert.equal(gr[0].special, SP.BOMB);
});

test('L and T shapes join into one group and make a light burst at the corner', () => {
  /* L: row y=5 x=2..4 and column x=2 y=3..5 */
  let gr = C.findGroups(board({ '2,5': 2, '3,5': 2, '4,5': 2, '2,4': 2, '2,3': 2 }));
  assert.equal(gr.length, 1);
  assert.equal(gr[0].cells.length, 5);
  assert.equal(gr[0].special, SP.BURST);
  assert.equal(gr[0].at, idx(2, 5));
  /* T: row y=1 x=3..5 and column x=4 y=1..3 */
  gr = C.findGroups(board({ '3,1': 1, '4,1': 1, '5,1': 1, '4,2': 1, '4,3': 1 }));
  assert.equal(gr.length, 1);
  assert.equal(gr[0].special, SP.BURST);
  assert.equal(gr[0].at, idx(4, 1));
});

test('only swaps that make a match (or use a special) are allowed', () => {
  const g = board({ '0,0': 1, '1,0': 1, '3,0': 1 });
  assert.equal(C.isValidSwap(g, idx(2, 0), idx(3, 0)), true);
  assert.equal(C.isValidSwap(g, idx(5, 5), idx(6, 5)), false);
  assert.equal(C.isValidSwap(g, idx(0, 0), idx(2, 0)), false, 'not neighbours');
  assert.equal(C.isValidSwap(g, idx(0, 0), idx(1, 1)), false, 'not diagonal');
  /* a refused move changes nothing and costs no move */
  const before = Array.from(g.t), moves = g.movesLeft;
  assert.equal(C.play(g, idx(5, 5), idx(6, 5)), null);
  assert.deepEqual(Array.from(g.t), before);
  assert.equal(g.movesLeft, moves);
  /* a star can swap with any neighbour */
  const s = board({ '4,4': BOMB });
  s.sp[idx(4, 4)] = SP.BOMB;
  assert.equal(C.isValidSwap(s, idx(4, 4), idx(5, 4)), true);
});

test('gravity drops pieces down in order and refills from the top', () => {
  const g = board();
  const col = [0, 1, 2, 3, 4, 5, 6, 7].map(y => g.id[idx(2, y)]);
  for (const y of [5, 6]) { g.t[idx(2, y)] = EMPTY; g.id[idx(2, y)] = 0; }
  const { moves, added } = C.gravity(g);
  assert.equal(added.length, 2);
  assert.ok(added.every(a => a.fromRow < 0));
  assert.deepEqual([2, 3, 4, 5, 6, 7].map(y => g.id[idx(2, y)]), [col[0], col[1], col[2], col[3], col[4], col[7]]);
  assert.equal(moves.length, 5);
  assert.ok(Array.from(g.t).every(t => t !== EMPTY));
});

test('matches clear, cascades follow and score more with each wave', () => {
  /* clearing the row at y=5 drops the 0 at (0,4) onto two more 0s */
  const g = board({ '0,5': 1, '1,5': 1, '2,5': 1, '0,4': 0, '0,6': 0, '0,7': 0 });
  const steps = C.resolve(g, null, []);
  assert.ok(steps.length >= 2, `cascade steps: ${steps.length}`);
  assert.equal(steps[0].combo, 1);
  assert.equal(steps[0].gained, 30);
  assert.equal(steps[1].combo, 2);
  assert.ok(steps[1].gained >= 3 * 10 * 2);
  assert.equal(C.findGroups(g).length, 0, 'the board settles');
  assert.ok(Array.from(g.t).every(t => t !== EMPTY));
  assert.equal(g.score, steps.reduce((s, x) => s + x.gained, 0));
});

test('a swap that lines up 4 makes a trumpet where the piece moved', () => {
  const g = board({ '0,3': 2, '1,3': 2, '3,3': 2, '2,4': 2 });
  const r = C.play(g, idx(2, 4), idx(2, 3));
  assert.ok(r);
  assert.equal(r.steps[0].spawned.length, 1);
  assert.equal(r.steps[0].spawned[0].sp, SP.ROW);
  assert.equal(r.steps[0].spawned[0].i, idx(2, 3));
  assert.equal(g.movesLeft, testLevel.moves - 1);
});

test('specials: trumpets clear a line, light clears 3x3, the star clears one kind', () => {
  const g = board();
  g.sp[idx(3, 2)] = SP.ROW;
  assert.deepEqual(C.effect(g, idx(3, 2)).sort((a, b) => a - b), [0, 1, 2, 3, 4, 5, 6, 7].map(x => idx(x, 2)));
  g.sp[idx(3, 2)] = SP.COL;
  assert.deepEqual(C.effect(g, idx(3, 2)).sort((a, b) => a - b), [0, 1, 2, 3, 4, 5, 6, 7].map(y => idx(3, y)));
  g.sp[idx(3, 2)] = SP.BURST;
  assert.equal(C.effect(g, idx(3, 2)).length, 9);
  g.sp[idx(0, 0)] = SP.BURST;
  assert.equal(C.effect(g, idx(0, 0)).length, 4, 'a corner burst stays on the board');
  /* star swapped with a fish clears every fish */
  const s = board({ '4,4': BOMB });
  s.sp[idx(4, 4)] = SP.BOMB;
  const kind = s.t[idx(5, 4)];
  const count = Array.from(s.t).filter(t => t === kind).length;
  const r = C.play(s, idx(4, 4), idx(5, 4));
  assert.ok(r);
  const first = r.steps[0];
  assert.ok(first.fired.some(f => f.sp === SP.BOMB));
  assert.equal(first.cleared.filter(c => c.t === kind).length, count);
  assert.ok((s.collected[testLevel.pieces[kind]] || 0) >= count);
});

test('a row trumpet in a match fires and clears its whole row', () => {
  const g = board({ '0,6': 1, '1,6': 1, '2,6': [1, SP.ROW] });
  const steps = C.resolve(g, null, []);
  assert.ok(steps[0].fired.some(f => f.sp === SP.ROW));
  assert.ok(steps[0].cleared.length >= 8);
  const rowCells = new Set(steps[0].cleared.map(c => c.i));
  for (let x = 0; x < 8; x += 1) assert.ok(rowCells.has(idx(x, 6)));
});

test('two stars together clear the whole board', () => {
  const g = board({ '3,3': BOMB, '4,3': BOMB });
  g.sp[idx(3, 3)] = SP.BOMB; g.sp[idx(4, 3)] = SP.BOMB;
  const r = C.play(g, idx(3, 3), idx(4, 3));
  assert.ok(r);
  const cleared = new Set(r.steps.flatMap(s => s.cleared.map(c => c.i)));
  assert.equal(cleared.size, N);
  assert.ok(Array.from(g.t).every(t => t !== EMPTY));
});

test('stones break when a piece on them is cleared', () => {
  const lv = { ...testLevel, goals: [{ kind: 'stones' }], stones: ['........', '........', '........', '........', '........', '###.....', '........', '........'] };
  const g = board({ '0,5': 1, '1,5': 1, '2,5': 1 }, lv);
  g.stone = new Uint8Array(N); g.stone[idx(0, 5)] = g.stone[idx(1, 5)] = g.stone[idx(2, 5)] = 1; g.stonesStart = 3;
  assert.equal(C.status(g, lv), 'playing');
  C.resolve(g, null, []);
  assert.equal(g.stone.reduce((a, b) => a + b, 0), 0);
  assert.equal(C.status(g, lv), 'won');
});

test('hint gives a real move; shuffle keeps the pieces and leaves a move', () => {
  for (const lv of LEVELS.slice(0, 6)) {
    const g = C.createGame(lv);
    const h = C.hint(g, lv);
    assert.ok(h && C.isValidSwap(g, h[0], h[1]), `level ${lv.n}`);
    const before = Array.from(g.t).sort();
    assert.ok(C.shuffle(g));
    assert.deepEqual(Array.from(g.t).sort(), before);
    assert.equal(C.findGroups(g).length, 0);
    assert.ok(C.hasMove(g));
  }
});

test('after every move the board is full, settled and has a move (shuffled if needed)', () => {
  const lv = LEVELS[9], g = C.createGame(lv), pick = C.rng(3);
  for (let k = 0; k < lv.moves; k += 1) {
    const all = C.allMoves(g), m = all[pick.int(all.length)];
    const r = C.play(g, m[0], m[1]);
    assert.ok(r);
    assert.ok(Array.from(g.t).every(t => t !== EMPTY));
    assert.equal(C.findGroups(g).length, 0);
    assert.ok(C.hasMove(g));
    assert.equal(new Set(Array.from(g.id)).size, N, 'every piece has its own id');
  }
  assert.equal(C.play(g, ...C.allMoves(g)[0]), null, 'no moves left after the last one');
});

test('goals: score, collect and stones; win, lose and stars', () => {
  const lv = { ...testLevel, moves: 3, goals: [{ kind: 'score', n: 100 }, { kind: 'collect', piece: 'fish', n: 5 }], stars: [500, 900] };
  const g = C.createGame(lv);
  assert.equal(C.status(g, lv), 'playing');
  g.score = 120; g.collected.fish = 4;
  let goals = C.goals(g, lv);
  assert.equal(goals[0].done, true);
  assert.equal(goals[1].done, false);
  assert.equal(goals[1].have, 4);
  g.collected.fish = 9;
  goals = C.goals(g, lv);
  assert.equal(goals[1].have, 5, 'counts stop at the goal');
  assert.equal(C.status(g, lv), 'won');
  g.score = 10; g.movesLeft = 0;
  assert.equal(C.status(g, lv), 'lost');
  g.movesLeft = 2; g.score = 100;
  assert.equal(C.finalScore(g), 100 + 2 * 60, 'moves left give a bonus');
  assert.equal(C.stars(lv, 100), 1);
  assert.equal(C.stars(lv, 500), 2);
  assert.equal(C.stars(lv, 950), 3);
});

test('every level can be won, and a careful player wins most tries', () => {
  for (const lv of LEVELS) {
    const g = C.createGame(lv);
    while (C.status(g, lv) === 'playing') { const h = C.hint(g, lv); C.play(g, h[0], h[1]); }
    assert.equal(C.status(g, lv), 'won', `level ${lv.n} with the hint move every time`);
  }
  /* a player who takes the best move half the time and any move otherwise */
  for (const n of [1, 2, 3, 6, 10, 20]) {
    const lv = LEVELS[n - 1];
    let wins = 0;
    for (let r = 0; r < 12; r += 1) {
      const g = C.createGame(lv), pick = C.rng(500 + r);
      while (C.status(g, lv) === 'playing') {
        const m = pick.next() < 0.5 ? C.hint(g, lv) : (all => all[pick.int(all.length)])(C.allMoves(g));
        C.play(g, m[0], m[1]);
      }
      if (C.status(g, lv) === 'won') wins += 1;
    }
    assert.ok(wins >= (n <= 3 ? 12 : 8), `level ${n}: ${wins}/12`);
  }
});

/* ---------- Progress, sound, vibration ---------- */
test('progress: levels open in order, best stars and scores are kept and saved', () => {
  const s = fakeStore(), p = C.progress(s, 20);
  assert.equal(p.get().open, 1);
  assert.equal(p.isOpen(1), true);
  assert.equal(p.isOpen(2), false);
  p.win(1, 2, 1500);
  assert.equal(p.get().open, 2);
  p.win(1, 1, 900);
  assert.equal(p.get().stars[1], 2, 'a worse game keeps the best stars');
  assert.equal(p.get().best[1], 1500);
  p.win(2, 3, 2000);
  assert.equal(p.totalStars(), 5);
  /* saved under an msb_ key, so Export / Restore carries it */
  assert.ok(C.KEYS.progress.startsWith('msb_'));
  assert.ok(C.KEYS.sounds.startsWith('msb_'));
  const again = C.progress(s, 20).get();
  assert.deepEqual(again, { open: 3, stars: { 1: 2, 2: 3 }, best: { 1: 1500, 2: 2000 } });
  /* the last level stays the last */
  p.win(20, 1, 10);
  assert.equal(p.get().open, 20);
  /* broken or odd saved data falls back safely */
  s.setItem(C.KEYS.progress, '{bad json');
  assert.deepEqual(C.progress(s, 20).get(), { open: 1, stars: {}, best: {} });
  s.setItem(C.KEYS.progress, JSON.stringify({ open: 99, stars: { 1: 7, 2: 3, x: 2 }, best: { 1: -5, 2: 40 } }));
  assert.deepEqual(C.progress(s, 20).get(), { open: 20, stars: { 2: 3 }, best: { 2: 40 } });
});

test('backups include the game progress (msb_ prefix)', () => {
  const aura = read('./aura.js');
  assert.match(aura, /MSB_BACKUP_PREFIXES\s*=\s*\[[^\]]*'msb_'/);
});

test('sound setting is remembered; vibration stays short', () => {
  const s = fakeStore(), snd = C.soundPref(s);
  assert.equal(snd.get(), true);
  snd.set(false);
  assert.equal(C.soundPref(s).get(), false);
  snd.set(true);
  assert.equal(C.soundPref(s).get(), true);
  assert.ok(C.buzzMs(1, 0) >= 5);
  assert.ok(C.buzzMs(9, 5) <= 30);
  assert.ok(C.buzzMs(3, 1) > C.buzzMs(1, 0));
});

test('the game respects tap vibration, bedtime and reduced motion', () => {
  const ui = read('./match3.js');
  assert.match(ui, /msb_tap_vibration/);
  assert.match(ui, /bedtimeOn/);
  assert.match(ui, /prefers-reduced-motion/);
  const css = read('./study-design.css');
  assert.match(css, /\.m3-board\{[^}]*touch-action:none/);
  assert.match(css, /prefers-reduced-motion:reduce\)\{\.m3-piece/);
});

test('piece art: each kind is a small inline SVG with a face', () => {
  for (const k of [...Art.KEYS, 'bomb']) for (const sp of [0, 1, 2, 3]) {
    const s = Art.svg(k, sp);
    assert.match(s, /^<svg xmlns="http:\/\/www.w3.org\/2000\/svg" viewBox="0 0 100 100"/);
    assert.ok(Art.uri(k, sp).startsWith('data:image/svg+xml'));
  }
  assert.equal(Art.KEYS.length, 6);
  assert.notEqual(Art.svg('star', 1), Art.svg('star', 0));
});

/* ---------- Wiring and words ---------- */
test('the game is wired into Stories, precached, and its words have Spanish', () => {
  const html = read('./index.html'), sw = read('./sw.js'), i18n = read('./i18n.js'), stories = read('./stories.js');
  for (const f of ['match3-data.js', 'match3-core.js', 'match3-art.js', 'match3.js']) {
    assert.ok(html.includes(`<script src="${f}" defer>`), f);
    assert.ok(sw.includes(`'./${f}'`), f);
    assert.ok(html.indexOf(`${f}"`) < html.indexOf('stories.js"'), f);
  }
  assert.match(stories, /data-match-open/);
  assert.match(stories, /data-match-exit/);
  assert.match(stories, /MsbMatch\.close\(\)/);
  const ui = read('./match3.js');
  const keys = [...ui.matchAll(/L\('([^']+)'/g)].map(m => m[1]);
  assert.ok(keys.length > 30);
  for (const k of new Set(keys)) assert.ok(i18n.includes(`"${k}":`) || i18n.includes(`'${k}':`), `missing Spanish for: ${k}`);
  const dyn = [...ui.matchAll(/(?:PIECE_NAME|PIECE_ONE|SPECIAL_NAME) = \{([^}]+)\}/g)].flatMap(m => [...m[1].matchAll(/'([^']+)'/g)].map(x => x[1])).filter(k => !/^[a-z]+$/.test(k) || ['stars', 'fish', 'grapes', 'loaves', 'hearts'].includes(k));
  for (const k of dyn) assert.ok(i18n.includes(`"${k}":`), `missing Spanish for: ${k}`);
  for (const k of ['Manna Match', 'Match Bible pictures and learn a lesson in every level']) assert.ok(i18n.includes(`"${k}":`), k);
  assert.match(ui, /data-i18n-skip/);
});
