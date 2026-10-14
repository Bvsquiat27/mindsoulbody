import { appHtml } from './app-scripts.test-helper.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
const require = createRequire(import.meta.url);
const { SQUISHIES } = require('./squishy-data.js');
const C = require('./squishy-core.js');
const S = require('./squishy-social.js');
const read = f => readFileSync(new URL(f, import.meta.url), 'utf8');
function mem() { const m = new Map(); return { getItem: k => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, String(v)), m }; }

test('the collection is public by default, can be turned off, and only ids are sent', () => {
  const s = mem();
  assert.equal(S.isPublic(s), true);
  s.setItem('msb_squishy_unlocked', JSON.stringify(['ark', 'tomb']));
  const p = S.payload(s, SQUISHIES, C);
  assert.deepEqual(Object.keys(p).sort(), ['ids', 'public']);
  assert.deepEqual(p.ids, ['lamb', 'dove', 'fish', 'lion', 'star', 'rainbow', 'ark', 'tomb']);
  S.setPublic(s, false);
  assert.equal(s.m.get('msb_squishy_public'), 'off');
  assert.equal(S.payload(s, SQUISHIES, C).public, false);
  for (const k of [S.PUBLIC_KEY, S.ROOM_KEY]) assert.ok(k.startsWith('msb_'), `${k} is in Export/Restore`);
});

test('a finished swap is applied once: given ones leave, received ones arrive as gifts', () => {
  const s = mem();
  s.setItem('msb_squishy_unlocked', JSON.stringify(['ark', 'coin']));
  const pending = [{ trade: 'a'.repeat(16), give: ['ark', 'lamb', 'lamp'], get: ['jar', 'nope'] }];
  const r = S.applyPending(s, pending, SQUISHIES, C);
  assert.deepEqual(r, { ack: ['a'.repeat(16)], got: ['jar'] });
  assert.deepEqual(JSON.parse(s.m.get('msb_squishy_unlocked')).sort(), ['coin', 'jar']);
  assert.ok(C.progress(s, SQUISHIES).unlocked().includes('lamb'), 'starters never leave');
  assert.deepEqual(C.roomLedger(s), { away: ['ark'], got: ['jar'], applied: ['a'.repeat(16)] });
  assert.deepEqual(S.applyPending(s, pending, SQUISHIES, C), { ack: ['a'.repeat(16)], got: [] }, 'twice changes nothing but still acks');
  assert.deepEqual(JSON.parse(s.m.get('msb_squishy_unlocked')).sort(), ['coin', 'jar']);
  assert.deepEqual(S.applyPending(s, [{ trade: 'bad' }, null], SQUISHIES, C).ack, []);
});

test('a squishy traded away comes back only by fresh play after the trade, or by trading it back', () => {
  const s = mem(), st = C.stats(s);
  st.memoryWon(14);
  C.checkUnlocks(s, SQUISHIES);
  assert.ok(C.progress(s, SQUISHIES).unlocked().includes('stone'));
  S.applyPending(s, [{ trade: '1'.repeat(16), give: ['stone'], get: ['jar'] }], SQUISHIES, C);
  assert.deepEqual(C.checkUnlocks(s, SQUISHIES), [], 'stone stays with the friend');
  assert.ok(!C.progress(s, SQUISHIES).unlocked().includes('stone'));
  assert.ok(C.awayList(s).stone, 'stone can be won back');
  S.applyPending(s, [{ trade: '2'.repeat(16), give: ['jar'], get: ['stone'] }], SQUISHIES, C);
  assert.ok(C.progress(s, SQUISHIES).unlocked().includes('stone'));
  assert.deepEqual(C.roomLedger(s).away, ['jar']);
  assert.ok(!C.awayList(s).stone, 'traded back: nothing left to win back');
  /* the jar left too: fresh rounds bring it back with the usual unlock */
  const ch = C.CHALLENGES.find(c => c.id === 'jar');
  assert.equal(C.wonBackProgress(s, ch).done, false);
});

test('gifted legendaries do not count toward the lamp unless their challenge is earned; room trades count as trades', () => {
  const s = mem();
  const lamp = C.challengeFor('lamp');
  const have = () => C.challengeProgress(lamp, C.challengeContext(s, SQUISHIES)).have;
  assert.equal(have(), 0);
  S.applyPending(s, [{ trade: '3'.repeat(16), give: [], get: ['tomb'] }], SQUISHIES, C);
  assert.equal(have(), 0, 'a gifted tomb does not count');
  assert.equal(C.challengeContext(s, SQUISHIES).trades, 1, 'the Friendship badge sees room trades');
  s.setItem('msb_squishy_stats', JSON.stringify({ badges: { tomb: '2026-10-14' } }));
  assert.equal(have(), 1, 'it counts once earned');
  /* one earned and then given away still counts */
  s.setItem('msb_squishy_stats', JSON.stringify({ badges: { tomb: '2026-10-14', jar: '2026-10-01' } }));
  S.applyPending(s, [{ trade: '4'.repeat(16), give: ['jar'], get: [] }], SQUISHIES, C);
  assert.equal(have(), 2);
});

test('a friend grid: names, rare and legendary tags, the lamp never traded', () => {
  global.window = { MsbSquishyData: { SQUISHIES }, MsbSquishyCore: C, MsbSquishyArt: { svg: id => `<svg data-id="${id}"></svg>` } };
  const html = S.gridHtml(['ark', 'tomb', 'lamp', 'coin', 'zzz'], { lang: 'es' });
  delete global.window;
  assert.match(html, /3|4 de 37 squishies/);
  assert.match(html, /4 de 37 squishies/);
  assert.match(html, /fsq-tile fsq-legendary[^]*?5 squishies/);
  assert.match(html, /Nunca se cambia/);
  assert.match(html, /fsq-tile fsq-rare[^]*?Raro/);
  assert.doesNotMatch(html, /zzz/);
  assert.match(html, /data-i18n-skip/);
});

test('wired into the app: script, offline cache, sync, friend profile and the setting', () => {
  const html = appHtml(), sw = read('./sw.js'), aura = read('./aura.js');
  assert.ok(html.indexOf('squishy-social.js"') > html.indexOf('squishy-core.js"') && html.indexOf('squishy-social.js"') < html.indexOf('aura.js"'));
  assert.ok(sw.includes("'./squishy-social.js'"));
  assert.match(aura, /body\.squishies=SQS\.payload\(localStorage,SQD\.SQUISHIES,SQC\)/);
  assert.match(aura, /msbSquishyApply\(synced\.squishyPending\)/);
  assert.match(aura, /msbFriendsCall\('\/trade\/ack'/);
  assert.match(aura, /view\.squishies=friend\.squishies\.filter\(x=>typeof x==='string'/);
  assert.match(aura, /MsbSquishySocial\.gridHtml\(f\.squishies/);
  assert.match(aura, /MsbSquishySocial\.toggleHtml\(localStorage/);
  assert.match(aura, /id==='squishy-public'&&window\.MsbSquishySocial/);
});
