import { appHtml } from './app-scripts.test-helper.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
const require = createRequire(import.meta.url);
const T = require('./squishy-trade.js');
const C = require('./squishy-core.js');
const { SQUISHIES } = require('./squishy-data.js');
const read = f => readFileSync(new URL(f, import.meta.url), 'utf8');
const mem = () => { const m = new Map(); return { getItem: k => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, String(v)), removeItem: k => m.delete(k) }; };
const seq = vals => { let i = 0; return () => vals[i++ % vals.length]; };

test('codes are 8 easy characters with a checksum and decode back to the squishy', () => {
  for (const id of T.IDS) for (const r of [0, 0.123, 0.5, 0.999999]) {
    const c = T.makeCode(id, () => r);
    assert.match(c, /^[0-9A-HJKMNP-TV-Z]{8}$/);
    const back = T.readCode(c);
    assert.equal(back.id, id);
    assert.equal(back.ok, T.tradable(id), id === 'bush' ? 'the bush decodes but is legendary now' : id);
  }
  assert.equal(T.pretty('ABCD1234'), 'ABCD-1234');
  const c = T.makeCode('ark', () => 0.42);
  assert.equal(T.readCode(` ${T.pretty(c).toLowerCase()} `).id, 'ark', 'spaces, dashes and lower case are fine');
  assert.notEqual(T.makeCode('ark', () => 0.42), T.makeCode('ark', () => 0.43), 'a random part makes every code different');
  assert.notEqual(T.makeCode('ark', () => 0.42).slice(0, 6), T.makeCode('dove', () => 0.42).slice(0, 6), 'the squishy is scrambled in, not readable');
});

test('every single typo and every swapped pair is rejected', () => {
  let tried = 0;
  for (const id of ['lamb', 'ark', 'boat', 'crown']) for (const r of [0.01, 0.37, 0.77]) {
    const c = T.makeCode(id, () => r);
    for (let i = 0; i < 8; i += 1) for (const ch of T.ALPHA) {
      if (ch === c[i]) continue;
      tried += 1;
      assert.equal(T.readCode(c.slice(0, i) + ch + c.slice(i + 1)).ok, false, `${c} @${i}=${ch}`);
    }
    for (let i = 0; i < 7; i += 1) if (c[i] !== c[i + 1]) assert.equal(T.readCode(c.slice(0, i) + c[i + 1] + c[i] + c.slice(i + 2)).ok, false);
  }
  assert.equal(tried, 4 * 3 * 8 * 31);
  assert.equal(T.readCode('ABC').reason, 'format');
  assert.equal(T.readCode('ABCD-123U').reason, 'format');
  assert.equal(T.readCode('').ok, false);
});

test('legendary squishies cannot be traded', () => {
  for (const id of ['lamp', 'tomb']) {
    assert.equal(C.tierOf(id), 'legendary');
    assert.equal(T.tradable(id), false);
    assert.equal(T.makeCode(id), null);
    assert.equal(T.trades(mem()).create(id, [id]), null);
  }
  for (const x of SQUISHIES) assert.equal(T.tradable(x.id), C.tierOf(x.id) !== 'legendary', x.id);
});

test('codes work for every tradable squishy, the newer ones too; older codes read the same', () => {
  assert.equal(T.IDS.length, 34);
  assert.deepEqual(T.IDS.slice(0, 23), ['lamb', 'dove', 'fish', 'lion', 'star', 'rainbow', 'stone', 'loaves', 'seed', 'bush', 'basket', 'tree', 'ark', 'coat', 'ladder', 'raven', 'wheat', 'oil', 'coin', 'donkey', 'jar', 'crown', 'boat'], 'fixed order kept');
  for (const id of T.IDS.filter(T.tradable)) for (const r of [0, 0.37, 0.999999]) {
    const c = T.makeCode(id, () => r), back = T.readCode(c);
    assert.deepEqual([back.ok, back.id], [true, id], `${id} ${r}`);
  }
  assert.equal(T.makeCode('chariot'), null, 'the legendary chariot is not traded by code');
  for (const x of SQUISHIES) assert.ok(T.IDS.includes(x.id) || C.tierOf(x.id) === 'legendary', x.id);
});

test('you keep yours, your friend gets a copy once, and your own code does not work for you', () => {
  const a = mem(), b = mem();
  const ta = T.trades(a), tb = T.trades(b);
  assert.equal(ta.create('ark', ['lamb']), null, 'only squishies you have');
  const code = ta.create('ark', ['lamb', 'ark'], () => 0.31);
  assert.ok(code);
  assert.deepEqual(ta.redeem(code), { ok: false, reason: 'own', id: 'ark' });
  const got = tb.redeem(T.pretty(code));
  assert.deepEqual([got.ok, got.id], [true, 'ark']);
  assert.equal(tb.redeem(code).reason, 'used', 'one redeem per code per phone');
  assert.equal(tb.redeem(code.toLowerCase()).reason, 'used');
  assert.deepEqual(tb.gifts(), ['ark']);
  assert.deepEqual(ta.gifts(), []);
  /* a return code: the friend sends one back */
  const back = tb.create('ark', ['ark']);
  assert.equal(ta.redeem(back).ok, true);
  assert.deepEqual(ta.gifts(), ['ark']);
});

test('the Friendship badge needs a code actually redeemed, not just made; trades live in the backup', () => {
  const a = mem(), b = mem();
  const code = T.trades(a).create('dove', ['dove']);
  C.checkUnlocks(a, SQUISHIES, new Date(2026, 9, 13));
  assert.equal(C.badges(a, SQUISHIES).find(x => x.id === 'friendship').earned, null, 'making a code alone earns nothing');
  assert.equal(C.badges(b, SQUISHIES).find(x => x.id === 'friendship').earned, null);
  T.trades(b).redeem(code);
  C.progress(b, SQUISHIES).unlock('dove');
  C.checkUnlocks(b, SQUISHIES, new Date(2026, 9, 14));
  assert.equal(C.badges(b, SQUISHIES).find(x => x.id === 'friendship').earned, '2026-10-14');
  /* a return gift earns the giver the badge too */
  T.trades(a).redeem(T.trades(b).create('dove', ['dove']));
  C.checkUnlocks(a, SQUISHIES, new Date(2026, 9, 15));
  assert.equal(C.badges(a, SQUISHIES).find(x => x.id === 'friendship').earned, '2026-10-15');
  assert.ok(T.KEY.startsWith('msb_'));
  /* junk in storage is ignored */
  a.setItem(T.KEY, JSON.stringify({ sent: [{ c: 'nope', id: 'ark' }, 5], got: 'x' }));
  assert.deepEqual(T.trades(a).get(), { sent: [], got: [] });
  a.setItem(T.KEY, '{bad');
  assert.deepEqual(T.trades(a).get(), { sent: [], got: [] });
});

test('Trade tab, gift ribbon, Share button and Spanish words are wired in', () => {
  const ui = read('./squishy.js'), html = appHtml(), sw = read('./sw.js'), i18n = read('./i18n.js');
  assert.ok(html.includes('<script src="squishy-trade.js" defer>') && html.indexOf('squishy-trade.js') < html.indexOf('squishy.js"'));
  assert.ok(sw.includes("'./squishy-trade.js'"));
  assert.match(ui, /\['trade', '🎁 ' \+ L\('Trade'\)\]/);
  assert.ok(i18n.includes('"Trade": "Cambiar"'));
  assert.match(ui, /navigator\.share/); assert.match(ui, /data-sq-trade-share/); assert.match(ui, /class="sq-gift"/);
  for (const m of ui.match(/TRADE_ERR = \{([^}]+)\}/)[1].matchAll(/: '([^']+)'/g)) assert.ok(i18n.includes(`${JSON.stringify(m[1])}:`), m[1]);
});

test('kid badges show on the own Profile achievements, with no worker change for friends', () => {
  const aura = read('./aura.js'), ui = read('./squishy.js');
  assert.match(aura, /\$\{msbKidBadgesHtml\(esAch\)\}<p><button class="secondary" data-nav="profile">/);
  assert.match(aura, /MsbSquishy\.kidBadges\(\)/);
  assert.match(ui, /kidBadges\(\) \{/);
  for (const k of ['Trick master', 'Friendship']) assert.match(ui, new RegExp(`'${k}'`));
});

test('gifted squishies do not count toward the lamp until their own challenge is met', () => {
  const s = mem(), p = C.progress(s, SQUISHIES);
  const others = SQUISHIES.filter(x => x.locked && x.id !== 'lamp');
  for (const x of others) p.unlock(x.id);
  s.setItem('msb_match_progress', JSON.stringify({ open: 2, stars: { 1: 3 }, best: {} }));
  const lamp = C.CHALLENGES.find(c => c.id === 'lamp');
  assert.equal(C.challengeProgress(lamp, C.challengeContext(s, SQUISHIES)).done, true, 'all opened by play');
  const gift = others.find(x => T.tradable(x.id) && C.tierOf(x.id) === 'rare').id;
  s.setItem(T.KEY, JSON.stringify({ sent: [], got: [{ c: T.makeCode(gift, () => 0.2), id: gift, at: 1 }] }));
  const pr = C.challengeProgress(lamp, C.challengeContext(s, SQUISHIES));
  assert.equal(pr.done, false, 'a gifted rare does not count');
  assert.equal(pr.have, pr.need - 1);
  const st = JSON.parse(s.getItem('msb_squishy_stats') || '{}'); st.badges = { ...(st.badges || {}), [gift]: '2026-10-13' }; s.setItem('msb_squishy_stats', JSON.stringify(st));
  assert.equal(C.challengeProgress(lamp, C.challengeContext(s, SQUISHIES)).done, true, 'once its challenge is earned it counts');
});

test('an old burning bush code no longer opens it, kindly; old bush trades stay in the history', () => {
  const oldCode = T.makeCode('bush', () => 0.4);
  assert.deepEqual([T.readCode(oldCode).ok, T.readCode(oldCode).reason, T.readCode(oldCode).id], [false, 'legendary', 'bush']);
  const s = mem(), tr = T.trades(s);
  const r = tr.redeem(T.pretty(oldCode));
  assert.deepEqual([r.ok, r.reason], [false, 'legendary']);
  assert.deepEqual(tr.get().got, [], 'nothing is saved');
  assert.equal(tr.create('bush', ['bush']), null, 'no new bush codes');
  /* a bush received before it became legendary stays in the history */
  const prior = { c: oldCode, id: 'bush', at: 1 };
  s.setItem(T.KEY, JSON.stringify({ sent: [], got: [prior] }));
  assert.deepEqual(T.trades(s).get().got, [prior]);
  assert.equal(T.trades(s).count(), 1);
  C.checkUnlocks(s, SQUISHIES, new Date(2026, 9, 13));
  assert.equal(C.badges(s, SQUISHIES).find(x => x.id === 'friendship').earned, '2026-10-13', 'it still counts for Friendship');
  /* but a gifted bush does not count toward the lamp until its challenge is earned */
  const p = C.progress(s, SQUISHIES);
  for (const x of SQUISHIES.filter(x => x.locked && x.id !== 'lamp')) p.unlock(x.id);
  s.setItem('msb_match_progress', JSON.stringify({ open: 2, stars: { 1: 3 }, best: {} }));
  const lamp = C.CHALLENGES.find(c => c.id === 'lamp');
  assert.equal(C.challengeProgress(lamp, C.challengeContext(s, SQUISHIES)).done, false);
  const st = C.stats(s);
  for (let i = 0; i < 10; i += 1) st.roundDone(5, 5);
  C.checkUnlocks(s, SQUISHIES, new Date(2026, 9, 14));
  assert.equal(C.challengeProgress(lamp, C.challengeContext(s, SQUISHIES)).done, true, 'after 10 perfect rounds it counts');
  const ui = read('./squishy.js'), i18n = read('./i18n.js');
  assert.match(ui, /legendary: 'Legendary squishies can’t be traded\. Earn this one with its own challenge!'/);
  assert.ok(i18n.includes('"Legendary squishies can’t be traded. Earn this one with its own challenge!": "Los squishies legendarios'));
});
