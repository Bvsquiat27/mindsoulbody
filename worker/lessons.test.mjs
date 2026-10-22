import assert from 'node:assert/strict';
import test from 'node:test';
import { handleFriends } from './friends.mjs';
import { LESSONS_LIMITS, cleanLessons } from './mynotes.mjs';

function memoryKv() { const d = new Map(); return { async get(k) { return d.has(k) ? d.get(k) : null; }, async put(k, v) { d.set(k, String(v)); }, async delete(k) { d.delete(k); } }; }
async function call(kv, path, body) {
  const r = await handleFriends(new Request(`https://friends.test${path}`, { method: 'POST', headers: { 'content-type': 'application/json', origin: 'https://bvsquiat27.github.io' }, body: JSON.stringify(body ?? {}) }), { FRIENDS: kv });
  return { status: r.status, data: await r.json() };
}
async function people(kv) {
  const a = (await call(kv, '/register', { name: 'Alex' })).data, m = (await call(kv, '/register', { name: 'Mary' })).data, s = (await call(kv, '/register', { name: 'Sam' })).data;
  await call(kv, '/friend/add', { code: a.code, secret: a.secret, friendCode: m.code });
  await call(kv, '/friend/accept', { code: m.code, secret: m.secret, friendCode: a.code });
  return { a, m, s };
}
const L = { current: { id: 'psalm-23', ts: 5 }, done: [{ id: 'grace', ts: 2, score: 80 }, { id: 'john-1', ts: 3, score: null }] };

test('friends see lesson progress; strangers do not', async () => {
  const kv = memoryKv(); const { a, m, s } = await people(kv);
  assert.equal((await call(kv, '/lessons/sync', { code: m.code, secret: m.secret, lessons: L })).data.count, 2);
  const r = await call(kv, '/lessons/friend', { code: a.code, secret: a.secret, friend: m.code });
  assert.equal(r.status, 200);
  assert.deepEqual(r.data.current, { id: 'psalm-23', ts: 5 });
  assert.deepEqual(r.data.done.map((x) => x.id), ['john-1', 'grace']);
  assert.equal((await call(kv, '/lessons/friend', { code: s.code, secret: s.secret, friend: m.code })).status, 403);
});

test('hide switch: nothing stored, friends see hidden; hiding has its own rate bucket', async () => {
  const kv = memoryKv(); const { a, m } = await people(kv);
  for (let i = 0; i < LESSONS_LIMITS.SYNC_RATE; i++) await call(kv, '/lessons/sync', { code: m.code, secret: m.secret, lessons: L });
  assert.equal((await call(kv, '/lessons/sync', { code: m.code, secret: m.secret, lessons: L })).status, 429);
  const hide = await call(kv, '/lessons/sync', { code: m.code, secret: m.secret, hidden: true, lessons: L });
  assert.equal(hide.status, 200); assert.equal(hide.data.count, 0);
  assert.deepEqual((await call(kv, '/lessons/friend', { code: a.code, secret: a.secret, friend: m.code })).data, { hidden: true, current: null, done: [] });
});

test('caps and cleaning', () => {
  assert.ok(cleanLessons({ done: Array.from({ length: LESSONS_LIMITS.COUNT + 1 }, (_, i) => ({ id: 'l' + i })) }).error);
  assert.ok(cleanLessons({ done: 'x' }).error);
  const c = cleanLessons({ current: { id: '<script>' }, done: [{ id: 'ok', score: 500 }, { id: 'ok' }, { id: 'x'.repeat(81) }, { id: '../a' }] }).lessons;
  assert.equal(c.current, null);
  assert.deepEqual(c.done, [{ id: 'ok', ts: null, score: null }]);
});

test('lesson endpoints need the account secret, and oversize lists are refused', async () => {
  const kv = memoryKv(); const { a, m } = await people(kv);
  assert.equal((await call(kv, '/lessons/sync', { code: m.code, secret: 'wrong', lessons: L })).status, 401);
  assert.equal((await call(kv, '/lessons/sync', { code: 'MSB-NOPE', secret: 'x', lessons: L })).status, 404);
  assert.equal((await call(kv, '/lessons/friend', { code: a.code, friend: m.code })).status, 401);
  const big = { done: Array.from({ length: LESSONS_LIMITS.COUNT + 1 }, (_, i) => ({ id: 'l' + i })) };
  assert.equal((await call(kv, '/lessons/sync', { code: m.code, secret: m.secret, lessons: big })).status, 400);
  assert.equal((await call(kv, '/lessons/nope', { code: m.code, secret: m.secret })).status, 404);
});

test('only lesson ids, dates and scores are stored, never names or note text', async () => {
  const kv = memoryKv(); const { m } = await people(kv);
  await call(kv, '/lessons/sync', { code: m.code, secret: m.secret, lessons: { current: { id: 'psalm-23', ts: 5, title: 'x', note: 'secret note' }, done: [{ id: 'grace', ts: 2, score: 80, note: 'secret note', name: 'Mary' }] } });
  const stored = JSON.parse(await kv.get(`lessons:${m.code}`));
  assert.doesNotMatch(JSON.stringify(stored), /secret note|Mary/);
  assert.deepEqual(stored.done, [{ id: 'grace', ts: 2, score: 80 }]);
});
