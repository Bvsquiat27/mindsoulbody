/* KV has no transactions: these check that friend links, messages and notes
   survive requests that land at the same moment, that the pair keys repair a
   half-written link, and that the newer rate limits apply. */
import assert from 'node:assert/strict';
import test from 'node:test';
import { RATE_LIMITS, handleFriends } from './friends.mjs';

/* memory KV that yields between steps, so Promise.all interleaves requests */
function memoryKv() {
  const d = new Map();
  const tick = () => new Promise((r) => setImmediate(r));
  return {
    async get(k, type) { await tick(); if (!d.has(k)) return null; const v = d.get(k); return type === 'json' ? JSON.parse(v) : v; },
    async put(k, v) { await tick(); d.set(k, String(v)); },
    async delete(k) { await tick(); d.delete(k); },
    raw: d,
  };
}
async function call(kv, path, body) {
  const r = await handleFriends(new Request(`https://friends.test${path}`, { method: 'POST', headers: { 'content-type': 'application/json', origin: 'https://bvsquiat27.github.io' }, body: JSON.stringify(body ?? {}) }), { FRIENDS: kv });
  return { status: r.status, data: await r.json() };
}
const reg = async (kv, name) => (await call(kv, '/register', { name })).data;
const as = (u, extra) => ({ code: u.code, secret: u.secret, ...extra });
const user = (kv, u) => JSON.parse(kv.raw.get(`user:${u.code}`));
async function friends(kv, a, b) {
  await call(kv, '/friend/add', as(a, { friendCode: b.code }));
  await call(kv, '/friend/accept', as(b, { friendCode: a.code }));
}

test('two people adding each other at the same moment end up friends (M5)', async () => {
  for (let round = 0; round < 5; round++) {
    const kv = memoryKv(); const a = await reg(kv, 'Ana'), b = await reg(kv, 'Ben');
    const [ra, rb] = await Promise.all([call(kv, '/friend/add', as(a, { friendCode: b.code })), call(kv, '/friend/add', as(b, { friendCode: a.code }))]);
    assert.equal(ra.status, 200); assert.equal(rb.status, 200);
    // after the next friends read on either side, both records agree
    await call(kv, '/friends', as(a)); await call(kv, '/friends', as(b));
    assert.ok(user(kv, a).friends.includes(b.code), `round ${round}: Ana has Ben`);
    assert.ok(user(kv, b).friends.includes(a.code), `round ${round}: Ben has Ana`);
    assert.deepEqual(user(kv, a).requestsOut, []); assert.deepEqual(user(kv, b).requestsIn, []);
    assert.equal(kv.raw.get(`fr:${[a.code, b.code].sort().join(':')}`), 'friends');
  }
});

test('a profile sync at the same moment as an accept does not drop the new friend', async () => {
  const kv = memoryKv(); const a = await reg(kv, 'Ana'), b = await reg(kv, 'Ben');
  await call(kv, '/friend/add', as(a, { friendCode: b.code }));
  await Promise.all([call(kv, '/friend/accept', as(b, { friendCode: a.code })), call(kv, '/sync', as(a, { name: 'Ana M', stats: { studies: 3 } }))]);
  const ana = user(kv, a);
  assert.ok(ana.friends.includes(b.code));
  assert.equal(ana.name, 'Ana M');
  assert.equal(ana.stats.studies, 3);
});

test('a lost link is repaired from the pair key, and a removed friend stays removed', async () => {
  const kv = memoryKv(); const a = await reg(kv, 'Ana'), b = await reg(kv, 'Ben');
  await friends(kv, a, b);
  // simulate a save that lost Ben's side of the link
  const ben = user(kv, b); ben.friends = []; kv.raw.set(`user:${b.code}`, JSON.stringify(ben));
  const list = await call(kv, '/friends', as(a));
  assert.equal(list.data.length, 1);
  assert.ok(user(kv, b).friends.includes(a.code), 'Ben has Ana again');
  // removal wins over a stale half-link
  await call(kv, '/friend/remove', as(b, { friendCode: a.code }));
  const ana = user(kv, a); ana.friends = [b.code]; kv.raw.set(`user:${a.code}`, JSON.stringify(ana));
  assert.equal((await call(kv, '/friends', as(a))).data.length, 0);
  assert.deepEqual(user(kv, a).friends, []);
});

test('an outgoing request whose accept was lost becomes a friendship on the next read', async () => {
  const kv = memoryKv(); const a = await reg(kv, 'Ana'), b = await reg(kv, 'Ben');
  await call(kv, '/friend/add', as(a, { friendCode: b.code }));
  const before = kv.raw.get(`user:${a.code}`);
  await call(kv, '/friend/accept', as(b, { friendCode: a.code }));
  kv.raw.set(`user:${a.code}`, before); // Ana's record lost the accept
  const r = await call(kv, '/friend/requests', as(a));
  assert.deepEqual(r.data.outgoing, []);
  assert.ok(user(kv, a).friends.includes(b.code));
});

test('messages and notes sent at the same moment are all kept', async () => {
  const kv = memoryKv(); const a = await reg(kv, 'Ana'), b = await reg(kv, 'Ben'), c = await reg(kv, 'Cy');
  await friends(kv, a, b); await friends(kv, c, b); await friends(kv, a, c);
  await Promise.all([
    call(kv, '/msg/send', as(a, { to: b.code, body: 'from Ana' })),
    call(kv, '/msg/send', as(b, { to: a.code, body: 'from Ben' })),
  ]);
  assert.deepEqual(user(kv, a).threads[b.code].map((m) => m.body).sort(), ['from Ana', 'from Ben']);
  assert.deepEqual(user(kv, b).threads[a.code].map((m) => m.body).sort(), ['from Ana', 'from Ben']);
  await Promise.all([
    call(kv, '/note/send', as(a, { to: b.code, body: 'note A' })),
    call(kv, '/note/send', as(c, { to: b.code, body: 'note C' })),
  ]);
  assert.deepEqual(user(kv, b).inbox.map((n) => n.body).sort(), ['note A', 'note C']);
  // deleting one note while another arrives keeps the new one
  const first = user(kv, b).inbox.find((n) => n.body === 'note A');
  await Promise.all([
    call(kv, '/note/delete', as(b, { id: first.id })),
    call(kv, '/note/send', as(c, { to: b.code, body: 'note C2' })),
  ]);
  assert.deepEqual(user(kv, b).inbox.map((n) => n.body).sort(), ['note C', 'note C2']);
});

test('saving a friend\u2019s record for a message keeps their last-active time', async () => {
  const kv = memoryKv(); const a = await reg(kv, 'Ana'), b = await reg(kv, 'Ben');
  await friends(kv, a, b);
  const stamp = user(kv, b).updatedAt;
  await new Promise((r) => setTimeout(r, 5));
  await call(kv, '/msg/send', as(a, { to: b.code, body: 'hi' }));
  assert.equal(user(kv, b).updatedAt, stamp);
});

test('accept, decline, cancel, remove, shared edits, note changes and game rooms are rate limited', async () => {
  const kv = memoryKv(); const a = await reg(kv, 'Ana'), b = await reg(kv, 'Ben');
  await friends(kv, a, b);
  const seed = (key, n) => kv.raw.set(key, JSON.stringify({ start: Date.now(), n }));
  seed(`rate:friend-change:${a.code}`, RATE_LIMITS.friendChange);
  seed(`rate:shared-edit:${a.code}`, RATE_LIMITS.sharedEdit);
  seed(`rate:room:${a.code}`, RATE_LIMITS.room);
  for (const p of ['/friend/accept', '/friend/decline', '/friend/cancel', '/friend/remove']) assert.equal((await call(kv, p, as(a, { friendCode: b.code }))).status, 429, p);
  assert.ok(user(kv, a).friends.includes(b.code), 'a refused remove changes nothing');
  for (const p of ['/shared/update', '/shared/delete']) assert.equal((await call(kv, p, as(a, { id: 'x', body: 'y' }))).status, 429, p);
  assert.equal((await call(kv, '/room/create', as(a, { show: 'jeopardy', level: 1 }))).status, 429);
  assert.equal((await call(kv, '/room/join', as(a, { room: 'ABCD' }))).status, 429);
  await call(kv, '/note/send', as(b, { to: a.code, body: 'n' }));
  const id = user(kv, a).inbox[0].id;
  seed(`rate:note-change:${a.code}`, RATE_LIMITS.noteChange);
  assert.equal((await call(kv, '/note/read', as(a, { id }))).status, 429);
  assert.equal((await call(kv, '/note/delete', as(a, { id }))).status, 429);
});

test('verified is only reported when an admin set it on the record', async () => {
  const kv = memoryKv(); const a = await reg(kv, 'Ana'), b = await reg(kv, 'Ben');
  await friends(kv, a, b);
  assert.equal((await call(kv, '/sync', as(a, { verified: true }))).data.verified, undefined, 'a client cannot set it');
  const ana = user(kv, a); ana.verified = true; kv.raw.set(`user:${a.code}`, JSON.stringify(ana));
  assert.equal((await call(kv, '/sync', as(a))).data.verified, true);
  assert.equal((await call(kv, '/friends', as(b))).data[0].verified, true);
  assert.equal(user(kv, a).verified, true, 'a sync keeps the flag');
});
