import assert from 'node:assert/strict';
import test from 'node:test';
import { createRequire } from 'node:module';
import { handleFriends, SQUISHY_IDS, SQUISHY_LEGENDARY, SQUISHY_STARTERS, TRADE_RULES, cleanSquishyIds, tradableSquishy } from './friends.mjs';

const require = createRequire(import.meta.url);
const { SQUISHIES } = require('../squishy-data.js');
const C = require('../squishy-core.js');

function memoryKv() {
  const data = new Map();
  return {
    async get(key) { return data.has(key) ? data.get(key) : null; },
    async put(key, value) { data.set(key, String(value)); },
    async delete(key) { data.delete(key); },
    data,
  };
}
const call = async (kv, path, body) => {
  const res = await handleFriends(new Request(`https://friends.test${path}`, { method: 'POST', headers: { 'content-type': 'application/json', origin: 'https://bvsquiat27.github.io' }, body: JSON.stringify(body ?? {}) }), { FRIENDS: kv });
  return { status: res.status, data: await res.json() };
};
async function pair(kv, aIds, bIds) {
  const a = (await call(kv, '/register', { name: 'Ana' })).data, b = (await call(kv, '/register', { name: 'Ben' })).data;
  await call(kv, '/friend/add', { code: a.code, secret: a.secret, friendCode: b.code });
  await call(kv, '/friend/add', { code: b.code, secret: b.secret, friendCode: a.code });
  const as = (x) => ({ code: x.code, secret: x.secret });
  if (aIds) await call(kv, '/sync', { ...as(a), squishies: { ids: aIds } });
  if (bIds) await call(kv, '/sync', { ...as(b), squishies: { ids: bIds } });
  return { a: as(a), b: as(b) };
}
async function openRoom(kv, a, b) {
  const t = (await call(kv, '/trade/request', { ...a, with: b.code })).data.trade;
  const opened = await call(kv, '/trade/accept', { ...b, trade: t.id });
  assert.equal(opened.data.trade.status, 'open');
  return t.id;
}
const user = (kv, code) => JSON.parse(kv.data.get(`user:${code}`));

test('the worker knows exactly the app squishies, legendaries and starters', () => {
  assert.deepEqual(SQUISHY_IDS, SQUISHIES.map((x) => x.id));
  /* ids legendary in the app but not yet in the deployed worker list (none now) */
  const PENDING = [];
  assert.deepEqual(SQUISHY_LEGENDARY.filter((id) => !PENDING.includes(id)).sort(), SQUISHIES.filter((x) => C.tierOf(x.id) === 'legendary' && !PENDING.includes(x.id)).map((x) => x.id).sort());
  assert.ok(PENDING.every((id) => C.tierOf(id) === 'legendary'), 'pending ids are legendary in the app');
  assert.deepEqual(SQUISHY_STARTERS, SQUISHIES.filter((x) => !x.locked).map((x) => x.id));
  assert.equal(tradableSquishy('lamp'), false);
  assert.equal(tradableSquishy('lamb'), false, 'starters everyone has are not traded');
  assert.equal(tradableSquishy('chariot'), true);
  assert.deepEqual(cleanSquishyIds(['Ark', 'ark', 'nope', 5, ' pearl ', '<x>']), ['ark', 'pearl']);
  assert.equal(cleanSquishyIds(Array(500).fill('ark').concat(SQUISHY_IDS)).length, 1, 'long lists are cut before reading');
});

test('collection syncs ids only, is public by default, can be hidden, and friends see it', async () => {
  const kv = memoryKv();
  const { a, b } = await pair(kv);
  let friends = (await call(kv, '/friends', b)).data;
  assert.equal(friends[0].squishies, undefined, 'nothing until the phone syncs');
  await call(kv, '/sync', { ...a, squishies: { ids: ['ark', 'bush', 'made-up', 'ark'], extra: 'x', names: ['Ana'] } });
  assert.deepEqual(Object.keys(user(kv, a.code).squishies).sort(), ['ids', 'pending', 'public', 'updatedAt']);
  assert.deepEqual(user(kv, a.code).squishies.ids, ['ark', 'bush']);
  friends = (await call(kv, '/friends', b)).data;
  assert.deepEqual(friends[0].squishies, ['ark', 'bush']);
  await call(kv, '/sync', { ...a, squishies: { public: false } });
  friends = (await call(kv, '/friends', b)).data;
  assert.equal(friends[0].squishies, undefined, 'hidden');
  assert.deepEqual(user(kv, a.code).squishies.ids, ['ark', 'bush'], 'the toggle keeps the list');
  await call(kv, '/sync', { ...a, squishies: { public: true } });
  assert.deepEqual((await call(kv, '/friends', b)).data[0].squishies, ['ark', 'bush']);
  await call(kv, '/sync', { ...a, name: 'Ana' });
  assert.deepEqual(user(kv, a.code).squishies.ids, ['ark', 'bush'], 'a sync without squishies leaves them alone');
});

test('trade requests need friends, the friend accepts, and only one room per pair', async () => {
  const kv = memoryKv();
  const { a, b } = await pair(kv, ['ark'], ['coin']);
  const stranger = (await call(kv, '/register', { name: 'Sam' })).data;
  assert.equal((await call(kv, '/trade/request', { code: stranger.code, secret: stranger.secret, with: a.code })).status, 403);
  const r = await call(kv, '/trade/request', { ...a, with: b.code });
  assert.equal(r.data.trade.status, 'requested');
  const again = await call(kv, '/trade/request', { ...b, with: a.code });
  assert.equal(again.data.existing, true);
  assert.equal(again.data.trade.id, r.data.trade.id);
  assert.equal((await call(kv, '/trade/accept', { ...a, trade: r.data.trade.id })).status, 409, 'the asker cannot accept their own request');
  const early = await call(kv, '/trade/update', { ...a, trade: r.data.trade.id, offer: ['ark'] });
  assert.equal(early.status, 200, 'the asker fills their side while the request waits');
  assert.equal(early.data.trade.status, 'requested'); assert.deepEqual(early.data.trade.offers[a.code], ['ark']);
  assert.equal((await call(kv, '/trade/update', { ...a, trade: r.data.trade.id, ask: 'more' })).status, 409, 'no asking for more before the friend is in');
  assert.equal((await call(kv, '/trade/confirm', { ...a, trade: r.data.trade.id, rev: early.data.trade.rev })).status, 409, 'no ✓ before it opens');
  const list = (await call(kv, '/trade/list', b)).data.trades;
  assert.equal(list[0].id, r.data.trade.id);
  assert.equal((await call(kv, '/trade/state', { code: stranger.code, secret: stranger.secret, trade: r.data.trade.id })).status, 404, 'strangers cannot peek');
  const declined = await call(kv, '/trade/cancel', { ...b, trade: r.data.trade.id });
  assert.equal(declined.data.trade.status, 'declined');
  assert.equal((await call(kv, '/trade/accept', { ...b, trade: r.data.trade.id })).status, 409);
});

test('offers: only your own tradable squishies, never the lamp or a starter, not promised elsewhere', async () => {
  const kv = memoryKv();
  const { a, b } = await pair(kv, ['lamb', 'ark', 'lamp', 'coin'], ['jar']);
  const id = await openRoom(kv, a, b);
  const up = (offer) => call(kv, '/trade/update', { ...a, trade: id, offer });
  assert.equal((await up(['lamp'])).data.reason, 'lamp');
  assert.equal((await up(['lamb'])).data.reason, 'starter');
  assert.equal((await up(['tomb'])).data.reason, 'owned');
  assert.equal((await up(['nope'])).status, 400);
  assert.equal((await up(Array(13).fill('ark'))).status, 400);
  assert.equal((await up(['ark'])).status, 200);
  const c = (await call(kv, '/register', { name: 'Cy' })).data;
  await call(kv, '/friend/add', { ...a, friendCode: c.code });
  await call(kv, '/friend/add', { code: c.code, secret: c.secret, friendCode: a.code });
  const id2 = await openRoom(kv, a, { code: c.code, secret: c.secret });
  assert.equal((await call(kv, '/trade/update', { ...a, trade: id2, offer: ['ark'] })).data.reason, 'locked', 'no double spend across rooms');
  assert.equal((await call(kv, '/trade/update', { ...a, trade: id2, offer: ['coin'] })).status, 200);
});

test('both must press ✓ on the same board; any change clears the checks', async () => {
  const kv = memoryKv();
  const { a, b } = await pair(kv, ['ark', 'coin'], ['jar', 'oil']);
  const id = await openRoom(kv, a, b);
  await call(kv, '/trade/update', { ...a, trade: id, offer: ['ark'] });
  let t = (await call(kv, '/trade/update', { ...b, trade: id, offer: ['jar'] })).data.trade;
  assert.equal(t.ready, true);
  t = (await call(kv, '/trade/confirm', { ...a, trade: id, rev: t.rev })).data.trade;
  assert.equal(t.checks[a.code], t.rev);
  t = (await call(kv, '/trade/update', { ...b, trade: id, offer: ['oil'] })).data.trade;
  assert.deepEqual([t.checks[a.code], t.checks[b.code]], [0, 0], 'a change resets both checks');
  const stale = await call(kv, '/trade/confirm', { ...b, trade: id, rev: t.rev - 1 });
  assert.equal(stale.data.reason, 'changed', 'a ✓ on an old board does not count');
  t = (await call(kv, '/trade/update', { ...a, trade: id, ask: 'more' })).data.trade;
  assert.deepEqual([t.note.kind, t.checks[a.code]], ['more', 0], 'asking for more is a change too');
  await call(kv, '/trade/confirm', { ...a, trade: id, rev: t.rev });
  assert.equal((await call(kv, '/trade/state', { ...a, trade: id })).data.trade.status, 'open', 'one ✓ is not enough');
  const done = (await call(kv, '/trade/confirm', { ...b, trade: id, rev: t.rev })).data.trade;
  assert.equal(done.status, 'done');
  assert.deepEqual(done.result[a.code], { give: ['ark'], get: ['oil'] });
});

test('a legendary needs at least 5 squishies back, the owner may ask for more', async () => {
  const kv = memoryKv();
  const seven = ['ark', 'coin', 'jar', 'oil', 'boat', 'crown', 'pearl'];
  const { a, b } = await pair(kv, ['tomb'], seven);
  const id = await openRoom(kv, a, b);
  await call(kv, '/trade/update', { ...a, trade: id, offer: ['tomb'] });
  let t = (await call(kv, '/trade/update', { ...b, trade: id, offer: seven.slice(0, 4) })).data.trade;
  assert.deepEqual([t.ready, t.want[b.code], t.problems[0]], [false, 5, `need:${b.code}:5`]);
  assert.equal((await call(kv, '/trade/confirm', { ...a, trade: id, rev: t.rev })).status, 400, '4 for a legendary is refused');
  t = (await call(kv, '/trade/update', { ...b, trade: id, offer: seven.slice(0, 5) })).data.trade;
  assert.equal(t.ready, true);
  t = (await call(kv, '/trade/update', { ...a, trade: id, need: 7 })).data.trade;
  assert.deepEqual([t.ready, t.want[b.code]], [false, 7], 'the owner asks for 7');
  assert.equal((await call(kv, '/trade/update', { ...a, trade: id, need: 99 })).status, 400);
  t = (await call(kv, '/trade/update', { ...b, trade: id, offer: seven })).data.trade;
  assert.equal(t.ready, true);
  await call(kv, '/trade/confirm', { ...a, trade: id, rev: t.rev });
  const done = (await call(kv, '/trade/confirm', { ...b, trade: id, rev: t.rev })).data.trade;
  assert.equal(done.status, 'done');
  assert.deepEqual(user(kv, a.code).squishies.ids.sort(), seven.slice().sort());
  assert.deepEqual(user(kv, b.code).squishies.ids, ['tomb']);
});

test('the swap is atomic and happens once; stale phones are corrected until they acknowledge', async () => {
  const kv = memoryKv();
  const { a, b } = await pair(kv, ['ark', 'coin'], ['jar']);
  const id = await openRoom(kv, a, b);
  await call(kv, '/trade/update', { ...a, trade: id, offer: ['ark'] });
  const t = (await call(kv, '/trade/update', { ...b, trade: id, offer: ['jar'] })).data.trade;
  await call(kv, '/trade/confirm', { ...a, trade: id, rev: t.rev });
  await call(kv, '/trade/confirm', { ...b, trade: id, rev: t.rev });
  assert.equal((await call(kv, '/trade/confirm', { ...b, trade: id, rev: t.rev })).status, 409, 'no second swap');
  assert.deepEqual(user(kv, a.code).squishies.ids.sort(), ['coin', 'jar']);
  assert.deepEqual(user(kv, b.code).squishies.ids, ['ark']);
  const sync = (await call(kv, '/sync', { ...a, squishies: { ids: ['ark', 'coin'] } })).data;
  assert.deepEqual(user(kv, a.code).squishies.ids.sort(), ['coin', 'jar'], 'the ark does not come back');
  assert.deepEqual(sync.squishyPending.map((p) => [p.trade, p.give, p.get]), [[id, ['ark'], ['jar']]]);
  await call(kv, '/trade/ack', { ...a, trade: id });
  assert.equal(user(kv, a.code).squishies.pending.length, 0);
  assert.equal((await call(kv, '/sync', { ...a, squishies: { ids: ['coin', 'jar'] } })).data.squishyPending, undefined);
});

test('a squishy that left before both ✓ stops the swap and clears the checks', async () => {
  const kv = memoryKv();
  const { a, b } = await pair(kv, ['ark'], ['jar']);
  const id = await openRoom(kv, a, b);
  await call(kv, '/trade/update', { ...a, trade: id, offer: ['ark'] });
  const t = (await call(kv, '/trade/update', { ...b, trade: id, offer: ['jar'] })).data.trade;
  await call(kv, '/trade/confirm', { ...a, trade: id, rev: t.rev });
  await call(kv, '/sync', { ...a, squishies: { ids: [] } });
  const r = await call(kv, '/trade/confirm', { ...b, trade: id, rev: t.rev });
  assert.deepEqual([r.status, r.data.reason, r.data.trade.status, r.data.trade.checks[a.code]], [409, 'owned', 'open', 0]);
  assert.deepEqual(user(kv, b.code).squishies.ids, ['jar'], 'nothing moved');
  await call(kv, '/sync', { ...a, squishies: { ids: ['ark', 'jar'] } });
  const t2 = (await call(kv, '/trade/state', { ...a, trade: id })).data.trade;
  await call(kv, '/trade/confirm', { ...a, trade: id, rev: t2.rev });
  assert.equal((await call(kv, '/trade/confirm', { ...b, trade: id, rev: t2.rev })).data.reason, 'already');
});

test('rooms expire, X backs out, and over-eager clients are rate limited', async () => {
  const kv = memoryKv();
  const { a, b } = await pair(kv, ['ark'], ['jar']);
  const id = await openRoom(kv, a, b);
  const raw = JSON.parse(kv.data.get(`trade:${id}`));
  raw.expiresAt = Date.now() - 1;
  kv.data.set(`trade:${id}`, JSON.stringify(raw));
  const r = await call(kv, '/trade/update', { ...a, trade: id, offer: ['ark'] });
  assert.deepEqual([r.status, r.data.trade.status], [410, 'expired']);
  const id2 = await openRoom(kv, a, b);
  assert.equal((await call(kv, '/trade/cancel', { ...b, trade: id2 })).data.trade.status, 'cancelled');
  assert.equal((await call(kv, '/trade/update', { ...a, trade: id2, offer: ['ark'] })).status, 409);
  kv.data.set(`rate:trade-read:${a.code}`, JSON.stringify({ start: Date.now(), n: TRADE_RULES.RATE_READ }));
  assert.equal((await call(kv, '/trade/state', { ...a, trade: id2 })).status, 429);
  kv.data.set(`rate:trade:${b.code}`, JSON.stringify({ start: Date.now(), n: TRADE_RULES.RATE_REQUEST }));
  assert.equal((await call(kv, '/trade/request', { ...b, with: a.code })).status, 429);
  assert.equal((await call(kv, '/trade/state', { ...a, secret: 'wrong', trade: id2 })).status, 401);
});

test('live from the first tap: the request can carry an offer, and the friend opens the room by moving on the board', async () => {
  const kv = memoryKv();
  const { a, b } = await pair(kv, ['ark', 'tablets'], ['coin', 'jar', 'key', 'pearl', 'oil', 'crown']);
  assert.ok(SQUISHY_LEGENDARY.includes('tablets'), 'the tablets are legendary');
  assert.equal((await call(kv, '/trade/request', { ...a, with: b.code, offer: ['lamp'] })).status, 400, 'the first offer is checked too');
  assert.equal((await call(kv, '/trade/request', { ...a, with: b.code, offer: ['coin'] })).status, 400, 'only your own squishies');
  const r = await call(kv, '/trade/request', { ...a, with: b.code, offer: ['tablets'] });
  assert.equal(r.status, 200);
  const t = r.data.trade;
  assert.equal(t.status, 'requested'); assert.deepEqual(t.offers[a.code], ['tablets']);
  assert.equal(t.need[a.code], TRADE_RULES.LEGEND_MIN, 'a legendary asks for 5 from the start');
  const seen = (await call(kv, '/trade/state', { ...b, trade: t.id })).data.trade;
  assert.deepEqual(seen.offers[a.code], ['tablets'], 'the friend sees the board right away');
  const moved = await call(kv, '/trade/update', { ...b, trade: t.id, offer: ['coin', 'jar', 'key', 'pearl'] });
  assert.equal(moved.data.trade.status, 'open', 'the friend\u2019s first move opens the room');
  assert.equal(moved.data.trade.ready, false, 'tablets need 5 back');
  const five = (await call(kv, '/trade/update', { ...b, trade: t.id, offer: ['coin', 'jar', 'key', 'pearl', 'oil'] })).data.trade;
  assert.equal(five.ready, true);
  await call(kv, '/trade/confirm', { ...a, trade: t.id, rev: five.rev });
  const done = (await call(kv, '/trade/confirm', { ...b, trade: t.id, rev: five.rev })).data.trade;
  assert.equal(done.status, 'done');
  assert.ok(user(kv, b.code).squishies.ids.includes('tablets'));
  assert.ok(!user(kv, a.code).squishies.ids.includes('tablets'));
  const opened = await call(kv, '/trade/request', { ...b, with: a.code });
  const empty = await call(kv, '/trade/update', { ...a, trade: opened.data.trade.id, offer: [] });
  assert.equal(empty.data.trade.status, 'open', 'opening with no change still opens the room');
  assert.equal((await call(kv, '/trade/state', { ...b, trade: opened.data.trade.id })).data.trade.status, 'open');
});
