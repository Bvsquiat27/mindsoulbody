import assert from 'node:assert/strict';
import test from 'node:test';
import { handleFriends } from './friends.mjs';
import { MYNOTES_LIMITS, cleanNotes } from './mynotes.mjs';

function memoryKv() {
  const data = new Map();
  return {
    async get(key, type) { if (!data.has(key)) return null; const v = data.get(key); return type === 'json' ? JSON.parse(v) : v; },
    async put(key, value) { data.set(key, String(value)); },
    async delete(key) { data.delete(key); },
    keys() { return [...data.keys()]; },
  };
}
async function call(kv, path, body) {
  const r = await handleFriends(new Request(`https://friends.test${path}`, { method: 'POST', headers: { 'content-type': 'application/json', origin: 'https://bvsquiat27.github.io' }, body: JSON.stringify(body ?? {}) }), { FRIENDS: kv });
  return { status: r.status, data: await r.json() };
}
async function people(kv) {
  const a = (await call(kv, '/register', { name: 'Alex' })).data;
  const m = (await call(kv, '/register', { name: 'Mary' })).data;
  const s = (await call(kv, '/register', { name: 'Sam' })).data;
  await call(kv, '/friend/add', { code: a.code, secret: a.secret, friendCode: m.code });
  await call(kv, '/friend/accept', { code: m.code, secret: m.secret, friendCode: a.code });
  return { a, m, s };
}
const NOTE = { kind: 'devotional', key: '2026-10-14', text: 'Mercy is new today.', title: 'New every morning', ref: 'Lamentations 3:23', verse: 'They are new every morning', book: 25, chapter: 3, v: 23, ts: 1 };

test('friends can read synced notes; strangers cannot', async () => {
  const kv = memoryKv(); const { a, m, s } = await people(kv);
  const sync = await call(kv, '/mynotes/sync', { code: m.code, secret: m.secret, notes: [NOTE, { kind: 'study', key: 'grace', text: 'Grace first.', title: 'Grace' }] });
  assert.equal(sync.status, 200); assert.equal(sync.data.count, 2);
  const read = await call(kv, '/mynotes/friend', { code: a.code, secret: a.secret, friend: m.code });
  assert.equal(read.status, 200); assert.equal(read.data.notes.length, 2);
  assert.equal(read.data.notes.find((n) => n.kind === 'devotional').text, 'Mercy is new today.');
  const stranger = await call(kv, '/mynotes/friend', { code: s.code, secret: s.secret, friend: m.code });
  assert.equal(stranger.status, 403);
  const badSecret = await call(kv, '/mynotes/friend', { code: a.code, secret: 'x'.repeat(32), friend: m.code });
  assert.notEqual(badSecret.status, 200);
  assert.ok(!JSON.stringify(read.data).includes(m.secret));
});

test('the hide switch hides notes from friends and stores none', async () => {
  const kv = memoryKv(); const { a, m } = await people(kv);
  await call(kv, '/mynotes/sync', { code: m.code, secret: m.secret, notes: [NOTE] });
  await call(kv, '/mynotes/sync', { code: m.code, secret: m.secret, hidden: true });
  const read = await call(kv, '/mynotes/friend', { code: a.code, secret: a.secret, friend: m.code });
  assert.deepEqual(read.data, { hidden: true, notes: [] });
  await call(kv, '/mynotes/sync', { code: m.code, secret: m.secret, hidden: false, notes: [NOTE] });
  assert.equal((await call(kv, '/mynotes/friend', { code: a.code, secret: a.secret, friend: m.code })).data.notes.length, 1);
});

test('size, count and rate caps', async () => {
  assert.ok(cleanNotes(Array.from({ length: MYNOTES_LIMITS.COUNT + 1 }, (_, i) => ({ ...NOTE, key: 'k' + i }))).error);
  assert.ok(cleanNotes([{ ...NOTE, text: 'x'.repeat(MYNOTES_LIMITS.TEXT + 1) }]).error);
  assert.equal(cleanNotes([{ ...NOTE, kind: 'other' }, { ...NOTE, text: '   ' }, NOTE, NOTE]).notes.length, 1);
  assert.ok(cleanNotes('nope').error);
  const kv = memoryKv(); const { m } = await people(kv);
  let last;
  for (let i = 0; i <= MYNOTES_LIMITS.SYNC_RATE; i++) last = await call(kv, '/mynotes/sync', { code: m.code, secret: m.secret, notes: [NOTE] });
  assert.equal(last.status, 429);
});

test('hiding has its own rate bucket, so it works after the sync limit is used up', async () => {
  const kv = memoryKv(); const { a, m } = await people(kv);
  for (let i = 0; i < MYNOTES_LIMITS.SYNC_RATE; i++) await call(kv, '/mynotes/sync', { code: m.code, secret: m.secret, notes: [NOTE] });
  assert.equal((await call(kv, '/mynotes/sync', { code: m.code, secret: m.secret, notes: [NOTE] })).status, 429);
  const hide = await call(kv, '/mynotes/sync', { code: m.code, secret: m.secret, hidden: true, notes: [NOTE] });
  assert.equal(hide.status, 200); assert.equal(hide.data.count, 0);
  assert.deepEqual((await call(kv, '/mynotes/friend', { code: a.code, secret: a.secret, friend: m.code })).data, { hidden: true, notes: [] });
});
