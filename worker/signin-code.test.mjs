import assert from 'node:assert/strict';
import test from 'node:test';
import { handleFriends, cleanSigninCode, signinCodeKey } from './friends.mjs';

function memoryKv() {
  const data = new Map();
  return { async get(k) { return data.has(k) ? data.get(k) : null; }, async put(k, v) { data.set(k, String(v)); }, async delete(k) { data.delete(k); }, data };
}
const call = async (kv, path, body, ip = '1.2.3.4') => {
  const res = await handleFriends(new Request(`https://friends.test${path}`, { method: 'POST', headers: { 'content-type': 'application/json', origin: 'https://bvsquiat27.github.io', 'CF-Connecting-IP': ip }, body: JSON.stringify(body ?? {}) }), { FRIENDS: kv, SAVE_SETTLE_MS: 0 });
  return { status: res.status, data: await res.json() };
};
async function grant(kv, code, clean, exp = Date.now() + 48 * 3600e3) { await kv.put(await signinCodeKey(clean), JSON.stringify({ code, exp })); }

test('sign-in codes are 8 easy characters; spaces, dashes and case do not matter', () => {
  assert.equal(cleanSigninCode('abcd-ef23'), 'ABCDEF23');
  assert.equal(cleanSigninCode(' ABCD EF23 '), 'ABCDEF23');
  assert.equal(cleanSigninCode('ABCDEF2O'), '');
  assert.equal(cleanSigninCode('ABC'), '');
});

test('a sign-in code gives this phone a new secret and the profile, once', async () => {
  const kv = memoryKv();
  const a = (await call(kv, '/register', { name: 'Ana' })).data;
  await call(kv, '/sync', { code: a.code, secret: a.secret, handle: 'reader_1', city: 'Town' });
  await grant(kv, a.code, 'ABCDEF23');
  const r = await call(kv, '/signin-code/redeem', { signinCode: 'abcd-ef23' });
  assert.equal(r.status, 200);
  assert.equal(r.data.code, a.code);
  assert.match(r.data.secret, /^[a-f0-9]{32}$/);
  assert.notEqual(r.data.secret, a.secret);
  assert.equal(r.data.profile.handle, 'reader_1');
  assert.equal(r.data.profile.name, 'Ana');
  assert.equal('secretHash' in r.data.profile, false);
  assert.equal((await call(kv, '/friends', { code: a.code, secret: r.data.secret })).status, 200);
  assert.equal((await call(kv, '/friends', { code: a.code, secret: a.secret })).status, 401);
  assert.equal([...kv.data.keys()].some((k) => k.startsWith('signin:')), false);
  assert.equal((await call(kv, '/signin-code/redeem', { signinCode: 'ABCDEF23' })).status, 404);
});

test('expired or unknown codes fail, and guessing is rate-limited', async () => {
  const kv = memoryKv();
  const a = (await call(kv, '/register', { name: 'Ana' })).data;
  await grant(kv, a.code, 'ABCDEF23', Date.now() - 1000);
  assert.equal((await call(kv, '/signin-code/redeem', { signinCode: 'ABCDEF23' }, '9.9.9.9')).status, 404);
  for (let i = 0; i < 9; i++) await call(kv, '/signin-code/redeem', { signinCode: 'ZZZZZZZZ' }, '9.9.9.9');
  assert.equal((await call(kv, '/signin-code/redeem', { signinCode: 'ZZZZZZZZ' }, '9.9.9.9')).status, 429);
});

test('an admin squishy gift reaches every sync and its ack keeps it for other phones', async () => {
  const kv = memoryKv();
  const a = (await call(kv, '/register', { name: 'Ana' })).data;
  const u = JSON.parse(kv.data.get(`user:${a.code}`));
  u.squishies = { ids: ['lamb', 'bush'], public: true, pending: [{ trade: '0123456789abcdef', gift: true, give: [], get: ['bush'], ts: 1 }], updatedAt: 1 };
  kv.data.set(`user:${a.code}`, JSON.stringify(u));
  const s = (await call(kv, '/sync', { code: a.code, secret: a.secret, squishies: { ids: ['lamb'] } })).data;
  assert.deepEqual(s.squishyPending.map((p) => p.get), [['bush']]);
  assert.ok(JSON.parse(kv.data.get(`user:${a.code}`)).squishies.ids.includes('bush'));
  const ack = await call(kv, '/trade/ack', { code: a.code, secret: a.secret, trade: '0123456789abcdef' });
  assert.equal(ack.status, 200);
  assert.equal(JSON.parse(kv.data.get(`user:${a.code}`)).squishies.pending.length, 1);
});

test('onlyFor: a code for another account is not used up and answers 409', async () => {
  const kv = memoryKv();
  const a = (await call(kv, '/register', { name: 'Ana' })).data;
  const b = (await call(kv, '/register', { name: 'Ben' })).data;
  await grant(kv, a.code, 'ABCDEF23');
  const other = await call(kv, '/signin-code/redeem', { signinCode: 'ABCDEF23', onlyFor: b.code });
  assert.equal(other.status, 409);
  assert.equal(other.data.otherAccount, true);
  assert.ok(!('secret' in other.data));
  const same = await call(kv, '/signin-code/redeem', { signinCode: 'ABCDEF23', onlyFor: a.code.toLowerCase() });
  assert.equal(same.status, 200);
  assert.equal(same.data.code, a.code);
  assert.equal((await call(kv, '/signin-code/redeem', { signinCode: 'ABCDEF23' })).status, 404);
});
