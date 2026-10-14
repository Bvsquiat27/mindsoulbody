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
  assert.equal(D.QUOTES.length, 35);
  assert.equal(new Set(D.QUOTES.map(q => q.quote.en)).size, 35, 'no quote twice');
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
  assert.equal(D.WORDSEARCH.length, 14); assert.equal(new Set(D.WORDSEARCH.map(p => p.id)).size, 14);
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
  assert.equal(D.ORDER.length, 10); assert.equal(new Set(D.ORDER.map(o => o.id)).size, 10);
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
  const files = ['kidgames-data.js', 'kidgames-core.js', 'kidgames.js', 'kg-wordsearch.js', 'kg-order.js', 'kg-who.js', 'kg-verse.js', 'kg-map.js', 'kg-sling.js'];
  for (const f of files) { assert.ok(html.includes(`<script src="${f}" defer></script>`), f); assert.ok(sw.includes(`'./${f}'`), f); }
  assert.ok(html.indexOf('kg-sling.js') < html.indexOf('stories.js'));
  assert.match(stories, /data-kg-enter/); assert.match(stories, /data-kg-exit/); assert.match(stories, /MsbKidGames\.close\(\)/);
  assert.match(ui, /msb_tap_vibration/); assert.match(ui, /prefers-reduced-motion/); assert.match(ui, /data-i18n-skip/);
  assert.match(ui, /aria-live="polite"/);
  assert.match(read('./aura.js'), /MsbKidGames\.kidBadges/);
  const css = read('./kidgames.css');
  assert.match(html, /<link rel="stylesheet" href="kidgames.css">/); assert.ok(sw.includes("'./kidgames.css'"));
  assert.match(css, /prefers-reduced-motion:reduce\)\{\.kg-screen/);
  assert.match(css, /\.kg-ws-grid\{[^}]*touch-action:none/);
  for (const f of ['kg-wordsearch.js', 'kg-order.js', 'kg-who.js', 'kg-verse.js', 'kg-map.js', 'kg-sling.js']) {
    const src = read(`./${f}`);
    const pairs = [...src.matchAll(/t\('((?:[^'\\]|\\.)*)', '((?:[^'\\]|\\.)*)'/g)];
    assert.ok(pairs.length > 8, f);
    for (const [, en, es] of pairs) assert.ok(es && es !== en || /^[\d{}\s/]+$/.test(en), `${f}: "${en}" needs Spanish`);
    assert.match(src, /name: \{ en: '[^']+', es: '[^']+' \}/);
  }
  for (const f of files) assert.doesNotThrow(() => new Function(read(`./${f}`)), f);
});

test('verse builder: verses split into words in order; the next word always falls; stars by mistakes', () => {
  assert.equal(D.VERSES.length, 14);
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

test('map journey: six routes, each stop on the map with an EN/ES question, 3 choices and a verse', () => {
  assert.deepEqual(D.MAPS.map(m => m.id), ['exodus', 'paul', 'abraham', 'jonah', 'ruth', 'magi']);
  for (const m of D.MAPS) assert.ok(new RegExp(`\\n    ${m.land}: \\(\\) =>`).test(read('./kg-map.js')), `${m.id} has a map drawing`);
  for (const m of D.MAPS) {
    assert.ok(m.stops.length >= 6);
    for (const st of m.stops) {
      assert.ok(st.x >= 0 && st.x <= 400 && st.y >= 0 && st.y <= 280, `${m.id} ${st.name.en}`);
      for (const l of ['en', 'es']) { assert.ok(st.name[l] && st.q[l]); assert.equal(st.choices[l].length, 3); assert.equal(new Set(st.choices[l]).size, 3); }
      const c = C.stopChoices(st, 'es', C.rng(3));
      assert.equal(c.filter(x => x.right).length, 1); assert.equal(c.find(x => x.right).text, st.choices.es[0]);
    }
  }
  assert.match(read('./kg-map.js'), /reduced\(\)/);
});

test('david\u2019s sling: a stone chain rolls toward Goliath; match 3 pops and pulls back; powers; stars', () => {
  const lvls = D.SLING.levels; assert.equal(lvls.length, 15); assert.deepEqual(lvls.map(l => l.id), Array.from({ length: 15 }, (_, i) => `z${i + 1}`));
  let prev = 0;
  for (const lv of lvls) {
    assert.ok(lv.speed >= prev && (!prev || lv.speed - prev <= 4), 'a gentle speed ramp'); prev = lv.speed;
    const P = C.zumaPath(lv.path), g = P.goliath, dv = P.david;
    assert.ok(g.y >= 86, `${lv.id}: Goliath fits above the end of the track`);
    assert.ok(!(Math.abs(g.x - dv.x) < 65 && g.y - 120 < dv.y + 20 && g.y > dv.y - 45), `${lv.id}: Goliath does not stand on David`);
    assert.ok(lv.title.en && lv.title.es && lv.verse, lv.id);
    const path = C.zumaPath(lv.path);
    assert.ok(path.len > 600, lv.id);
    const min = Math.min(...path.pts.map(p => Math.hypot(p[0] - path.david.x, p[1] - path.david.y)));
    assert.ok(min > 60, `${lv.id}: the path stays clear of David`);
    for (const [x, y] of path.pts) assert.ok(x >= -60 && x <= 420 && y >= 0 && y <= 480, `${lv.id} near the field`);
    assert.ok(path.goliath.x > 0 && path.goliath.x < 360, `${lv.id}: Goliath stands in the field`);
    const z = C.zumaStart(lv, C.rng(3));
    assert.equal(z.balls.length, lv.count);
    for (let i = 2; i < z.balls.length; i += 1) assert.ok(!(z.balls[i].c === z.balls[i - 1].c && z.balls[i].c === z.balls[i - 2].c), 'no ready-made triples');
    assert.equal(z.balls.filter(b => b.p).length, lv.powers.length);
  }
  /* resolve: three of a kind pop and the chain closes up */
  const mk = (cs, head = 500) => ({ balls: cs.map((c, id) => ({ c, p: null, id })), head, speed: 20, slowT: 0, revT: 0, maxFrac: 0, nextId: 99, started: true, lost: false, cleared: false });
  let z = mk([1, 2, 2, 2, 3, 3, 1]);
  let ev = C.zumaResolve(z, 2);
  assert.equal(ev[0].count, 3); assert.deepEqual(z.balls.map(b => b.c), [1, 3, 3, 1]); assert.equal(z.head, 500 - 3 * C.ZUMA.D, 'the front pulls back');
  /* chain reaction: the gap closes on two runs that pop too */
  z = mk([1, 1, 2, 2, 2, 1, 4]);
  ev = C.zumaResolve(z, 3);
  assert.equal(ev.length, 2); assert.equal(ev[1].combo, 2); assert.deepEqual(z.balls.map(b => b.c), [4]);
  z = mk([2, 2, 2]); C.zumaResolve(z, 1); assert.ok(z.cleared);
  /* insert pushes the front forward one stone */
  const path = C.zumaPath(lvls[0].path); z = mk([0, 1, 0], 300);
  const k = C.zumaInsert(z, path, 1, { c: 1 }, path.at(300 - C.ZUMA.D).x, path.at(300 - C.ZUMA.D).y);
  assert.equal(z.balls.length, 4); assert.equal(z.balls[k].c, 1); assert.equal(z.head, 300 + C.ZUMA.D);
  /* bomb takes two on each side; slow and reverse change the rolling */
  z = mk([0, 1, 2, 2, 2, 3, 4, 0]); z.balls[3].p = 'bomb'; ev = C.zumaResolve(z, 3);
  assert.equal(ev[0].count, 7);
  z = mk([5, 5, 5, 0]); z.balls[1].p = 'slow'; C.zumaResolve(z, 1); assert.ok(z.slowT > 0);
  z = mk([5, 5, 5, 0]); z.balls[1].p = 'reverse'; C.zumaResolve(z, 1); assert.ok(z.revT > 0);
  const roll = p => { const q = mk([0, 1, 0, 1, 0, 1, 0, 1], 400); if (p) q[p] = 2; C.zumaStep(q, 0.5, path); return q.head - 400; };
  assert.ok(roll('slowT') < roll(null) && roll(null) > 0 && roll('revT') < 0);
  const lost = mk([0], path.len - 1); C.zumaStep(lost, 1, path); assert.ok(lost.lost, 'the chain reaching Goliath loses');
  assert.deepEqual([C.zumaStars(0.3), C.zumaStars(0.7), C.zumaStars(0.95)], [3, 2, 1]);
  assert.equal(typeof C.zumaPos, 'function'); assert.equal(typeof C.zumaHit, 'function');
  const ui = read('./kg-sling.js');
  for (const k of ['data-sl-swap', 'data-sl-canvas', 'data-zm-danger', "'fall'", "'angry'", "'hit'", 'buzz(']) assert.ok(ui.includes(k), k);
  assert.doesNotMatch(ui, /Giant Slayer/i);
});

test('Bible squishies and Manna Match live in the Bible games hub, not as separate Stories cards', () => {
  const stories = readFileSync(new URL('./stories.js', import.meta.url), 'utf8');
  const kg = readFileSync(new URL('./kidgames.js', import.meta.url), 'utf8');
  const i18n = readFileSync(new URL('./i18n.js', import.meta.url), 'utf8');
  assert.doesNotMatch(stories, /class="card squishy-entry" type="button" data-squishy-open/);
  assert.doesNotMatch(stories, /data-match-open><span class="squishy-entry-art"/);
  assert.match(kg, /class="card kg-tile kg-tile-art" data-squishy-open>/);
  assert.match(kg, /class="card kg-tile kg-tile-art" data-match-open>/);
  assert.match(kg, /<div class="kg-tiles">\$\{extra\}\$\{tiles\}<\/div>/);
  /* the old openers still work, leave the hub, and their back buttons return to it */
  assert.match(stories, /closest\('\[data-squishy-open\]'\)[\s\S]{0,120}squishyOn = true;\s*kidGamesOn = false;/);
  assert.match(stories, /closest\('\[data-match-open\]'\)[\s\S]{0,120}matchOn = true;\s*kidGamesOn = false;/);
  assert.equal((stories.match(/kidGamesOn = !!window\.MsbKidGames;/g) || []).length, 2);
  for (const f of ['squishy.js', 'match3.js']) assert.match(readFileSync(new URL(`./${f}`, import.meta.url), 'utf8'), /L\('← Bible games'\)/, f);
  assert.ok(i18n.includes('"← Bible games": "← Juegos bíblicos"'));
});

test('second polish pass: map stories, stamps, coach, level cards, clean sling restarts', () => {
  const map = read('./kg-map.js'), sling = read('./kg-sling.js'), kg = read('./kidgames.js'), css = read('./kidgames.css');
  /* every stop of both journeys has a story in EN and ES, a stamp and a weather */
  const block = map.slice(map.indexOf('const STORY'), map.indexOf('const storyOf'));
  for (const id of D.MAPS.map(m => m.id)) {
    const part = block.slice(block.indexOf(id + ':'));
    const n = D.MAPS.find(m => m.id === id).stops.length;
    const rows = part.split('\n').filter(l => /\{ w: '/.test(l)).slice(0, n);
    assert.equal(rows.length, n, `${id} has a story for each stop`);
    for (const r of rows) { assert.match(r, /en: '.{20,}'/); assert.match(r, /es: '.{20,}'/); assert.match(r, /stamp: '/); }
  }
  assert.match(map, /STAMP_KEY = 'msb_kg_map_stamps'/, 'stamps are covered by Export/Restore');
  assert.match(kg, /COACH_KEY = 'msb_kg_coach'/, 'the tutorial memory is covered by Export/Restore');
  for (const src of [map, sling]) { assert.match(src, /coach\('/); assert.match(src, /levelCard\(/); assert.match(src, /starPings\(/); assert.match(src, /sound\('start'\)/); }
  /* Sling: a new level or a replay stands Goliath back up and clears the effects */
  for (const k of ['parts: []', 'shake: 0', 'texts: []']) assert.ok(sling.includes(k), k);
  /* reduced motion is respected by the new effects */
  assert.match(css, /prefers-reduced-motion:reduce\)\{\.kg-coach/);
  assert.match(css, /prefers-reduced-motion:reduce\)\{\.zm-danger/);
  assert.match(map, /if \(!tr \|\| reduced\(\)\) return;/);
  assert.match(sling, /s\.freeze = reduced\(\) \? 0/);
  assert.match(css, /prefers-reduced-motion:reduce\)\{\.zm-danger\{animation:none/);
  assert.match(css, /\.kg-sl-intro\{font-size:17px\}/);
});

test('sling follow-up: Giant courage counts the new levels, old clears carry over once, no ark sounds left', () => {
  const mem = () => { const m = new Map(); return { getItem: k => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, String(v)) }; };
  const s = mem(); s.setItem('msb_kidgames', JSON.stringify({ done: { sling: ['s1', 's2', 's3', 's4'] }, best: {}, plays: {}, badges: {} }));
  const pr = C.progress(s), giant = C.badgeDefs({ sling: 5 }).find(b => b.id === 'kg-sling-all');
  assert.equal(giant.test(pr.get()), false, 'old ids do not count');
  assert.equal(pr.migrateSling(), true);
  assert.deepEqual(pr.done('sling'), ['z1', 'z2', 'z3', 'z4']);
  assert.equal(pr.migrateSling(), false, 'only once');
  assert.equal(giant.test(pr.get()), false);
  pr.finish('sling', 'z5'); assert.equal(giant.test(pr.get()), true);
  const sling = read('./kg-sling.js');
  assert.ok(sling.includes("'New Sling! Your cleared levels are open in the new game.', '¡Nueva Honda!"));
  assert.doesNotMatch(read('./kidgames.js'), /Ark Builder|knock: \(\)|rain: \(\)/);
  assert.ok(read('./i18n.js').includes('"Finish 1 Map Journey": "Termina 1 ruta de Viaje en el mapa"'));
  assert.match(read('./squishy.js'), /ch\.n === 1 \? 'Finish 1 Map Journey'/);
});

test('every sound() a kid game plays exists, and old Sling stars carry over', () => {
  const ui = read('./kidgames.js'), fx = ui.slice(ui.indexOf('const SOUND = {'), ui.indexOf('\n  };', ui.indexOf('const SOUND = {')));
  const names = new Set();
  for (const f of ['kidgames.js', 'kg-wordsearch.js', 'kg-order.js', 'kg-who.js', 'kg-verse.js', 'kg-map.js', 'kg-sling.js']) for (const m of read(`./${f}`).matchAll(/\bsound\('([a-z]+)'/g)) names.add(m[1]);
  assert.ok(names.has('thunder'));
  for (const n of names) assert.match(fx, new RegExp(`\\b${n}: \\(`), `sound "${n}" exists`);
  const m = new Map(), s = { getItem: k => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, String(v)) };
  s.setItem('msb_kidgames', JSON.stringify({ done: { sling: ['s1', 's2'] }, best: { 'sling:s1': 3, 'sling:s2': 2, 'sling:z2': 3, who: 4 }, plays: {}, badges: {} }));
  const pr = C.progress(s); assert.ok(pr.migrateSling());
  assert.deepEqual(pr.get().best, { 'sling:z1': 3, 'sling:z2': 3, who: 4 });
});

test('orphaned old Sling stars move to the new levels on their own; painted art is precached', () => {
  const m = new Map(), s = { getItem: k => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, String(v)) };
  s.setItem('msb_kidgames', JSON.stringify({ done: { sling: ['z1'] }, best: { 'sling:s3': 2, 'sling:z1': 1 }, plays: {}, badges: {} }));
  const pr = C.progress(s);
  assert.equal(pr.migrateSling(), false, 'no levels moved, so no note');
  assert.deepEqual(pr.get().best, { 'sling:z1': 1, 'sling:z3': 2 });
  assert.deepEqual(pr.done('sling'), ['z1']);
  const sw = read('./sw.js'), sling = read('./kg-sling.js'), map = read('./kg-map.js');
  for (const n of ['goliath-idle', 'goliath-angry', 'goliath-hit', 'goliath-laugh', 'david', 'valley']) { assert.ok(sw.includes(`'${n}'`), n); assert.ok(existsSync(new URL(`./img/sling/${n}.webp`, import.meta.url)), n); }
  for (const n of ['map-exodus', 'map-paul']) { assert.ok(map.includes(`img/map/${n}.webp`)); assert.ok(existsSync(new URL(`./img/map/${n}.webp`, import.meta.url)), n); }
  assert.match(sling, /img\/sling\/\$\{name\}\.webp/);
  assert.match(sling, /goliath-\$\{pose === 'fall' \? 'hit' : pose\}/);
});

test('sling levels 6-15: new paths, the zap stone, new courage verses; shield counts only new levels', () => {
  const lv = D.SLING.levels;
  assert.equal(new Set(lv.map(l => l.path)).size, 15, 'every level has its own path');
  assert.ok(lv.slice(0, 9).every(l => !l.powers.includes('zap')) && lv.slice(9).every(l => l.powers.includes('zap')), 'zap arrives late');
  assert.equal(new Set(lv.map(l => l.verse.ref.en)).size, 15, 'a different verse each level');
  const mk = cs => ({ balls: cs.map((c, id) => ({ c, p: null, id })), head: 600, speed: 20, slowT: 0, revT: 0, maxFrac: 0, nextId: 99, started: true, lost: false, cleared: false });
  const z = mk([3, 1, 2, 2, 2, 4, 1, 1, 0]); z.balls[3].p = 'zap';
  const ev = C.zumaResolve(z, 3);
  assert.ok(ev[0].powers.includes('zap'));
  assert.ok(!z.balls.some(b => b.c === 2), 'all the twos are gone');
  assert.equal(z.head, 600 - (9 - z.balls.length) * C.ZUMA.D);
  assert.match(read('./kg-sling.js'), /zap: \{ icon: '⚡'/);
  const SC = require('./squishy-core.js'), m = new Map(), st = { getItem: k => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, String(v)) };
  st.setItem('msb_kidgames', JSON.stringify({ done: { sling: ['s1', 's2', 's3', 's4', 'z1'] } }));
  const ctx = SC.challengeContext(st, require('./squishy-data.js').SQUISHIES);
  assert.equal(ctx.kid.done.sling, 1, 'old level ids do not count toward the shield');
  const sq = read('./squishy.js');
  assert.match(sq, /<details class="sq-sent"\$\{ui\.trade\.sentOpen \? ' open' : ''\}>/);
  assert.match(sq, /ui\.trade\.sentOpen = true;/);
  assert.equal((read('./kg-map.js').match(/onerror=/g) || []).length, 1, 'map travelers fall back if the art is missing'); assert.match(read('./kg-map.js'), /mp-trav-fb" y="-6" text-anchor="middle" font-size="24">\$\{travEmoji\(m\)\}/, 'journeys without painted art use an emoji traveler');
  assert.match(read('./kg-sling.js'), /burstAt\(s, e\.x, gChest\(e\)/);
});
