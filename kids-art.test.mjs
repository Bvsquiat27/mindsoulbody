import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { readFileSync, existsSync } from 'node:fs';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const read = f => readFileSync(f, 'utf8');
const A = require('./kids-art.js');

/* Every spot in Abby's Room that shows a picture (games, maps, stories,
   badges, Manna Match) uses painted art from img/kids, never an emoji or a
   code-drawn stand-in. UI glyphs (locks, sound, counters) stay as they are.
   SPOTS is the art manifest: "group|key" for every spot that needs art. */
const SPOTS = [
  ...['exodus', 'paul', 'abraham', 'jonah', 'ruth', 'magi'].flatMap(j => [0, 1, 2, 3, 4, 5].map(i => `map-stamp|${j}:${i}`)), 'map-stamp|fallback',
  ...['storm', 'rain', 'wind', 'heat', 'dawn', 'clear'].map(w => `map-weather|${w}`),
  'how-to-play|kg-map:📜', 'how-to-play|kg-map:🔖', 'how-to-play|kg-sling:👆', 'how-to-play|kg-sling:🔴', 'how-to-play|kg-sling:🔁', 'how-to-play|kg-sling:🛡️',
  ...['wordsearch', 'order', 'who', 'verse', 'map', 'sling'].map(g => `hub-tile|${g}`),
  ...Array.from({ length: 15 }, (_, i) => `sling-level|z${i + 1}`), 'sling-level|fallback',
  ...['slow', 'reverse', 'bomb', 'zap'].map(p => `sling-power|${p}`), 'sling-other|lost-art',
  ...['creation', 'noah', 'sea', 'jericho', 'david', 'daniel', 'jonah', 'birth', 'loaves', 'easter', 'pentecost', 'gate', 'road', 'prison', 'heaven', 'ruth', 'carmel', 'esther', 'tree', 'lost'].map(c => `match3-chapter|${c}`),
  ...['star', 'fish', 'grapes', 'loaf', 'leaf', 'heart', 'bomb'].map(p => `match3-art|${p}`), 'match3-special|badge1', 'match3-special|badge2', 'match3-special|badge3',
  ...['kg-word-1', 'kg-word-all', 'kg-order-1', 'kg-order-all', 'kg-who-5', 'kg-verse-1', 'kg-verse-all', 'kg-ark-1', 'kg-ark-all', 'kg-map-1', 'kg-map-all', 'kg-sling-1', 'kg-sling-all', 'kg-who-10'].map(b => `game-badge|${b}`),
  'other|squishy tier legendary', 'other|squishy tier rare', 'other|squishy tier common', 'other|match hub tile fallback', 'other|lost screen', 'other|loaves-fishes pile', 'other|trophy medal', 'other|badge fallback', 'other|color-it button',
];
const SQUISHY_BADGES = ['stone', 'loaves', 'seed', 'bush', 'basket', 'tree', 'ark', 'coat', 'lamp', 'first-squish', 'squish-200', 'all-lessons', 'match-3star', 'first-trick', 'trick-master', 'friendship', 'ladder', 'raven', 'wheat', 'oil', 'coin', 'donkey', 'jar', 'crown', 'boat', 'tomb', 'lily', 'key', 'pearl', 'manna', 'scroll', 'shofar', 'tablets', 'elephant', 'honeycomb', 'anchor', 'shield', 'chariot'];
/* UI glyphs that stay text on purpose (the manifest's "ui" group) */
const UI_GLYPHS = ['🔒', '🔊', '🔈', '⭐', '🎯', '👣', '💥', '🔁', '🔥', '📜', '★', '📖', '✨', '✦', '↕', '✓', '🎁'];
const PICT = /\p{Extended_Pictographic}/u;
const leftover = html => {
  let s = html
    .replace(/<span class="mp-pick-fb" style="display:none"[^>]*>[^<]*<\/span>/g, '') /* hidden traveler fallbacks */
    .replace(/<text class="mp-trav-fb"[^>]*>[^<]*<\/text>/g, '');
  for (const g of UI_GLYPHS) s = s.split(g).join('');
  return [...s].filter(ch => PICT.test(ch));
};

test('every art spot in the manifest has a painted picture, in both sizes, hashed and cached', () => {
  const hashes = JSON.parse(read('img/art-hashes.json'));
  const sw = read('sw.js');
  const swNames = JSON.parse(sw.match(/const KIDS_ART = (\[[^\]]*\]);/)[1].replace(/'/g, '"'));
  assert.deepEqual(swNames, A.NAMES, 'sw.js precaches exactly the kids-art.js pictures');
  assert.match(sw, /KIDS_ART\.map\(\(n\) => `\.\/img\/kids\/\$\{n\}-128\.webp`\)/);
  assert.match(sw, /kids\\\/\[a-z0-9-\]\+-\(\?:128\|256\)\\\.webp/, 'img/kids is kept in the art cache across updates');
  assert.match(sw, /'\.\/kids-art\.js'/);
  const all = [...SPOTS, ...SQUISHY_BADGES.map(b => `squishy-badge|${b}`)];
  for (const key of all) {
    const n = A.spot(key);
    assert.ok(n && A.has(n), `${key} has painted art`);
  }
  for (const n of A.NAMES) for (const px of [128, 256]) {
    const f = A.src(n, px);
    assert.ok(existsSync(f), f);
    assert.ok(hashes[f], `${f} is in img/art-hashes.json`);
  }
  const D = require('./kidgames-data.js');
  for (const m of D.MAPS) assert.ok(A.has(A.data('MAPS', m.id)), `journey ${m.id} icon`);
  for (const p of D.WORDSEARCH) assert.ok(A.has(A.data('WORDSEARCH', p.id)), `word search ${p.id} icon`);
  for (const b of require('./kidgames-core.js').badgeDefs({})) assert.ok(A.has(b.art), `badge ${b.id}`);
  const M3 = require('./match3-art.js');
  for (const k of [...M3.KEYS, 'bomb']) assert.ok(existsSync(M3.src(k)), k);
  for (const c of require('./match3-data.js').CHAPTERS || []) assert.ok(A.spot(`match3-chapter|${c.id}`), c.id);
});

/* A small fake browser: enough to render the games' HTML in node. */
function browser() {
  const store = new Map();
  const listeners = {};
  const el = () => new Proxy({}, { get: (o, k) => (k in o ? o[k] : k === 'querySelector' ? () => null : k === 'querySelectorAll' ? () => [] : k === 'style' ? {} : k === 'classList' ? { add() {}, remove() {}, toggle() {} } : k === 'dataset' ? {} : typeof k === 'string' && /^(add|remove|set|append|focus|scroll|get)/.test(k) ? () => null : undefined), set: (o, k, v) => { o[k] = v; return true; } });
  const window = {
    localStorage: { getItem: k => (store.has(k) ? store.get(k) : null), setItem: (k, v) => store.set(k, String(v)), removeItem: k => store.delete(k) },
    matchMedia: () => ({ matches: true }), MsbI18n: { lang: () => window.__lang || 'en' },
    scrollTo() {}, setTimeout: () => 0, clearTimeout() {}, requestAnimationFrame: () => 0, cancelAnimationFrame() {}, performance: { now: () => 0 },
  };
  const document = { addEventListener: (t, f) => { (listeners[t] ||= []).push(f); }, querySelector: () => null, querySelectorAll: () => [], createElement: el, body: el() };
  Object.assign(window, { window, document, navigator: {}, self: window, console });
  const ctx = vm.createContext(window);
  for (const f of ['kids-art.js', 'match3-art.js', 'kidgames-data.js', 'kidgames-core.js', 'kidgames.js', 'kg-wordsearch.js', 'kg-order.js', 'kg-who.js', 'kg-verse.js', 'kg-map.js', 'kg-sling.js']) vm.runInContext(read(f), ctx, { filename: f });
  const root = el(); root.isConnected = true; root.contains = () => true; root.querySelector = () => el();
  return { window, root, listeners, click: target => listeners.click.forEach(f => f({ target })) };
}
const closer = map => ({ closest: sel => (sel in map ? { dataset: map[sel] } : null) });

test('no art spot in the kids games renders an emoji (hub, pickers, how-to-play, play and finish screens), in English and Spanish', () => {
  for (const l of ['en', 'es']) {
    const b = browser(); b.window.__lang = l;
    const K = b.window.MsbKidGames;
    const store = b.window.localStorage;
    store.setItem('msb_kidgames', JSON.stringify({ done: { sling: ['z1', 'z2'], map: ['exodus'] }, best: {}, badges: Object.fromEntries(K.kidBadges().map(x => [x.id, '2026-10-01'])) }));
    store.setItem('msb_kg_map_stamps', JSON.stringify(Object.fromEntries(b.window.MsbKidGamesData.MAPS.map(m => [m.id, m.stops.map((_, i) => i)]))));
    const seen = [];
    const look = what => { const bad = leftover(b.root.innerHTML); seen.push(what); assert.deepEqual(bad, [], `${l} ${what} still shows ${bad.join(' ')}`); };
    K.open(b.root); look('hub');
    assert.equal((b.root.innerHTML.match(/<img class="kart" src="img\/kids\/tile-/g) || []).length, 6, 'six painted hub tiles');
    for (const id of ['wordsearch', 'order', 'who', 'verse', 'map', 'sling']) {
      K.openGame(id); look(`${id} picker`);
    }
    /* Map Journey: a stop with the how-to-play card, an answered stop, the end */
    for (let at = 0; at < b.window.MsbKidGamesData.MAPS.length; at += 1) {
      K.openGame('map'); K._ui.coachForce = 'map';
      b.click(closer({ '[data-mp-pick]': { mpPick: String(at) } })); look(`map ${at} stop with how-to-play`);
      const s = K._ui.state; s.answered = true; s.fresh = 0; K._helpers.render(); look(`map ${at} stamped`);
      s.done = true; K._helpers.render(); look(`map ${at} finished`);
    }
    /* David's Sling: how-to-play, play, lost */
    K.openGame('sling'); K._ui.coachForce = 'sling';
    b.click(closer({ '[data-sl-pick]': { slPick: '0' } })); look('sling play with how-to-play');
    K._ui.state.lost = true; K._helpers.render(); look('sling lost');
    assert.match(b.root.innerHTML, /img\/kids\/sling-lost-128\.webp/);
    assert.ok(seen.length > 20);
  }
});

test('David’s Sling power stones, Manna Match, squishies and stories use the painted pictures', () => {
  const sling = read('kg-sling.js');
  assert.match(sling, /g\.drawImage\(pa, -d \/ 2, -d \/ 2, d, d\)/, 'power stones draw their painted badge');
  assert.doesNotMatch(sling, /fillText\(POWER\[st\.p\]\.icon/, 'no emoji drawn on power stones');
  const m3 = read('match3.js');
  assert.match(m3, /src="\$\{A\(\)\.src\(name\)\}"/);
  assert.match(m3, /m3-sp-badge/);
  assert.doesNotMatch(m3, /\$\{ch\.icon\}|>🌱</);
  assert.doesNotMatch(read('match3-art.js'), /<svg|<path/, 'no code-drawn pieces');
  const sq = read('squishy.js');
  assert.doesNotMatch(sq, /F\.emo\(g, it\.ch/, 'the loaves pile is painted');
  assert.equal((sq.match(/BADGE_ICON\[/g) || []).length, 2, 'only the plain-text icon fields handed to other screens keep the emoji (they draw the art)');
  assert.doesNotMatch(sq, /\$\{legend \? '👑' : '🏆'\}|'🏅' : '🔒'/);
  const kg = read('kidgames.js');
  assert.doesNotMatch(kg, /'👑' : x\.tier === 'rare' \? '💎' : '🧸'|MsbMatchArt\.svg\('loaf'\) : '🍞'/);
  assert.match(read('stories.js'), /MsbKidsArt\.img\('color-crayons'/);
  assert.match(read('aura.js'), /class="kid-badge-art" src="\$\{esc\(b\.art\)\}"/);
  assert.doesNotMatch(read('kg-map.js'), /onerror=|storyOf\(m, i\)\.stamp|\$\{ev\.stamp\}/);
});

test('painted <img> markup: sized, empty alt for decoration, 128 and 256 sources', () => {
  const h = A.img('wx-rain', { px: 18 });
  assert.match(h, /^<img class="kart" src="img\/kids\/wx-rain-128\.webp" srcset="img\/kids\/wx-rain-128\.webp 128w, img\/kids\/wx-rain-256\.webp 256w" sizes="18px" width="18" height="18" alt="" decoding="async" draggable="false">$/);
  assert.equal(A.img('no-such-art'), '');
  assert.match(A.img('tile-map', { alt: 'Mapa "x"' }), /alt="Mapa &quot;x&quot;"/);
});
