import assert from 'node:assert/strict';
import test from 'node:test';
import { handleFriends, RATE_LIMITS } from './friends.mjs';

function memoryKv() {
  const data = new Map();
  return { async get(k) { return data.has(k) ? data.get(k) : null; }, async put(k, v) { data.set(k, String(v)); }, async delete(k) { data.delete(k); }, data };
}
const call = async (kv, path, body) => {
  const res = await handleFriends(new Request(`https://friends.test${path}`, { method: 'POST', headers: { 'content-type': 'application/json', origin: 'https://bvsquiat27.github.io', 'CF-Connecting-IP': '1.2.3.4' }, body: JSON.stringify(body ?? {}) }), { FRIENDS: kv, SAVE_SETTLE_MS: 0 });
  return { status: res.status, data: await res.json() };
};

test('/me/state returns the account its own saved copy: profile, squishies, notes, lessons, stats', async () => {
  const kv = memoryKv();
  const a = (await call(kv, '/register', { name: 'Ana' })).data;
  await call(kv, '/sync', { code: a.code, secret: a.secret, handle: 'reader_1', city: 'Town', squishies: { ids: ['lamb', 'ark', 'coat'], public: false } });
  await call(kv, '/mynotes/sync', { code: a.code, secret: a.secret, hidden: false, notes: [{ kind: 'devotional', key: '2026-10-01', text: 'A note', ts: 1000 }] });
  await call(kv, '/lessons/sync', { code: a.code, secret: a.secret, hidden: false, lessons: { current: null, done: [{ id: 'shepherd', ts: 2000, score: 3 }] } });
  const r = await call(kv, '/me/state', { code: a.code, secret: a.secret });
  assert.equal(r.status, 200);
  assert.equal(r.data.ok, true);
  assert.equal(r.data.code, a.code);
  assert.equal(r.data.profile.handle, 'reader_1');
  assert.deepEqual([...r.data.squishies.ids].sort(), ['ark', 'coat', 'lamb']);
  assert.equal(r.data.squishies.public, false);
  assert.equal(r.data.notes.hidden, false);
  assert.equal(r.data.notes.notes[0].text, 'A note');
  assert.equal(r.data.lessons.done[0].id, 'shepherd');
  assert.ok('stats' in r.data);
  assert.ok(!('secret' in r.data) && !('secretHash' in r.data));
});

test('/me/state needs the account secret, and a fresh account gets empty lists', async () => {
  const kv = memoryKv();
  const a = (await call(kv, '/register', { name: 'Ana' })).data;
  assert.equal((await call(kv, '/me/state', { code: a.code, secret: 'f'.repeat(32) })).status, 401);
  assert.equal((await call(kv, '/me/state', { code: 'MSB-ZZZZZZ', secret: a.secret })).status, 404);
  const r = (await call(kv, '/me/state', { code: a.code, secret: a.secret })).data;
  assert.deepEqual(r.notes, { hidden: false, notes: [] });
  assert.deepEqual(r.lessons, { hidden: false, current: null, done: [] });
  assert.ok(Array.isArray(r.squishies.ids));
});

test('/me/state keeps hidden notes and lessons hidden, and is rate limited', async () => {
  const kv = memoryKv();
  const a = (await call(kv, '/register', { name: 'Ana' })).data;
  await call(kv, '/mynotes/sync', { code: a.code, secret: a.secret, hidden: true });
  await call(kv, '/lessons/sync', { code: a.code, secret: a.secret, hidden: true });
  const r = (await call(kv, '/me/state', { code: a.code, secret: a.secret })).data;
  assert.equal(r.notes.hidden, true);
  assert.equal(r.lessons.hidden, true);
  await kv.put(`rate:me-state:${a.code}`, JSON.stringify({ start: Date.now(), n: RATE_LIMITS.meState }));
  assert.equal((await call(kv, '/me/state', { code: a.code, secret: a.secret })).status, 429);
});
