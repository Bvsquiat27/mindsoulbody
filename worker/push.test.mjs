import assert from 'node:assert/strict';
import test from 'node:test';
import { createECDH, createDecipheriv, hkdfSync, createVerify, createPublicKey, generateKeyPairSync } from 'node:crypto';
import { handleFriends } from './friends.mjs';
import worker from './friends.mjs';
import { orthodoxPascha, pickId, messageFor, isDue, cleanSubscription, encryptPayload, vapidHeader, runPushCron, b64u, PUSH_LIMITS } from './push.mjs';
import { PUSH_TEXT, PUSH_ORDER } from './devotional-push-data.mjs';

function kv() {
  const m = new Map();
  return {
    m,
    async get(k) { return m.has(k) ? m.get(k).v : null; },
    async getWithMetadata(k) { return m.has(k) ? { value: m.get(k).v, metadata: m.get(k).meta ?? null } : { value: null, metadata: null }; },
    async put(k, v, o) { m.set(k, { v: String(v), meta: o?.metadata }); },
    async delete(k) { m.delete(k); },
    async list({ prefix }) { return { keys: [...m.keys()].filter((k) => k.startsWith(prefix)).map((name) => ({ name, metadata: m.get(name).meta })), list_complete: true }; },
  };
}
function vapidEnv(store) {
  const { privateKey } = generateKeyPairSync('ec', { namedCurve: 'P-256' });
  const j = privateKey.export({ format: 'jwk' });
  const pub = Buffer.concat([Buffer.from([4]), Buffer.from(j.x, 'base64url'), Buffer.from(j.y, 'base64url')]).toString('base64url');
  return { FRIENDS: store, VAPID_PUBLIC_KEY: pub, VAPID_PRIVATE_KEY: j.d, VAPID_SUBJECT: 'https://bvsquiat27.github.io/mindsoulbody/' };
}
/* a fake browser: its own ECDH key and auth secret, and a decryptor per RFC 8291 */
function fakeBrowser(endpoint = 'https://fcm.googleapis.com/fcm/send/abc123') {
  const ecdh = createECDH('prime256v1'); ecdh.generateKeys();
  const auth = Buffer.from('0123456789abcdef');
  const sub = { endpoint, keys: { p256dh: ecdh.getPublicKey().toString('base64url'), auth: auth.toString('base64url') } };
  const decrypt = (body) => {
    body = Buffer.from(body);
    const salt = body.subarray(0, 16), idlen = body[20], asPub = body.subarray(21, 21 + idlen), ct = body.subarray(21 + idlen);
    const shared = ecdh.computeSecret(asPub);
    const ikm = Buffer.from(hkdfSync('sha256', shared, auth, Buffer.concat([Buffer.from('WebPush: info\0'), ecdh.getPublicKey(), asPub]), 32));
    const cek = Buffer.from(hkdfSync('sha256', ikm, salt, Buffer.from('Content-Encoding: aes128gcm\0'), 16));
    const nonce = Buffer.from(hkdfSync('sha256', ikm, salt, Buffer.from('Content-Encoding: nonce\0'), 12));
    const d = createDecipheriv('aes-128-gcm', cek, nonce); d.setAuthTag(ct.subarray(ct.length - 16));
    const pt = Buffer.concat([d.update(ct.subarray(0, ct.length - 16)), d.final()]);
    assert.equal(pt[pt.length - 1], 2);
    return JSON.parse(pt.subarray(0, pt.length - 1).toString());
  };
  return { sub, decrypt };
}
const post = (env, path, body, ip = '1.2.3.4') => handleFriends(new Request(`https://w.test${path}`, { method: 'POST', headers: { 'content-type': 'application/json', origin: 'https://bvsquiat27.github.io', 'CF-Connecting-IP': ip }, body: JSON.stringify(body) }), env).then(async (r) => [r.status, await r.json()]);

test('Orthodox Pascha dates', () => {
  const iso = (y) => orthodoxPascha(y).toISOString().slice(0, 10);
  assert.equal(iso(2024), '2024-05-05'); assert.equal(iso(2025), '2025-04-20'); assert.equal(iso(2026), '2026-04-12'); assert.equal(iso(2027), '2027-05-02');
});
test('feasts land on their dates; ordinary days cycle through 60+ devotionals', () => {
  assert.ok(PUSH_ORDER.ordinary.length >= 60);
  assert.equal(pickId(2026, 4, 12), 'pascha'); assert.equal(pickId(2026, 4, 5), 'palm-sunday'); assert.equal(pickId(2026, 5, 31), 'pentecost');
  assert.equal(pickId(2026, 12, 25), 'nativity'); assert.equal(pickId(2027, 1, 6), 'theophany'); assert.equal(pickId(2026, 8, 6), 'transfiguration');
  const seen = new Set(); for (let i = 0; i < 400; i++) { const d = new Date(Date.UTC(2026, 0, 1 + i)); seen.add(pickId(d.getUTCFullYear(), d.getUTCMonth() + 1, d.getUTCDate())); }
  for (const id of PUSH_ORDER.ordinary) assert.ok(seen.has(id), id);
});
test('the message reads like a text: title plus the first verse line, and opens that day', () => {
  const m = messageFor('2026-12-25', 'es');
  assert.equal(m.title, PUSH_TEXT.nativity.es[0]); assert.match(m.body, /No temáis/); assert.equal(m.url, './?devotional=2026-12-25');
  assert.equal(messageFor('2026-12-25', 'en').title, 'Unto You a Savior Is Born');
});
test('due logic: after the chosen local time, once a day, within the window', () => {
  const at = (iso) => new Date(iso);
  assert.equal(isDue({ z: 'America/New_York', t: '07:00', d: '' }, at('2026-10-14T11:02:00Z')), '2026-10-14');
  assert.equal(isDue({ z: 'America/New_York', t: '07:00', d: '' }, at('2026-10-14T10:58:00Z')), null);
  assert.equal(isDue({ z: 'America/New_York', t: '07:00', d: '2026-10-14' }, at('2026-10-14T11:30:00Z')), null);
  assert.equal(isDue({ z: 'America/New_York', t: '07:00', d: '' }, at('2026-10-14T16:00:00Z')), null);
  assert.equal(isDue({ z: 'Europe/Madrid', t: '07:00', d: '' }, at('2026-10-14T05:05:00Z')), '2026-10-14');
});
test('only real push services, valid keys', () => {
  const { sub } = fakeBrowser();
  assert.ok(cleanSubscription(sub));
  assert.equal(cleanSubscription({ ...sub, endpoint: 'https://evil.example/x' }), null);
  assert.equal(cleanSubscription({ ...sub, endpoint: 'http://fcm.googleapis.com/x' }), null);
  assert.equal(cleanSubscription({ ...sub, keys: { ...sub.keys, auth: 'AAAA' } }), null);
});
test('payload encryption round-trips with a browser-side decrypt (RFC 8291)', async () => {
  const b = fakeBrowser();
  const body = await encryptPayload(b.sub, JSON.stringify({ title: 'Hola', body: 'á é' }));
  assert.equal(new DataView(body.buffer).getUint32(16), 4096);
  assert.deepEqual(b.decrypt(body), { title: 'Hola', body: 'á é' });
});
test('VAPID header is a valid ES256 JWT for the push origin', async () => {
  const env = vapidEnv(kv());
  const h = await vapidHeader(env, 'https://fcm.googleapis.com/fcm/send/x', 1_800_000_000_000);
  const [, jwt, k] = h.match(/^vapid t=([^,]+), k=(.+)$/);
  assert.equal(k, env.VAPID_PUBLIC_KEY);
  const [hd, cl, sig] = jwt.split('.');
  const claims = JSON.parse(Buffer.from(cl, 'base64url'));
  assert.equal(claims.aud, 'https://fcm.googleapis.com'); assert.match(claims.sub, /^https:/);
  const pub = b64u.dec(env.VAPID_PUBLIC_KEY);
  const key = createPublicKey({ key: { kty: 'EC', crv: 'P-256', x: Buffer.from(pub.slice(1, 33)).toString('base64url'), y: Buffer.from(pub.slice(33)).toString('base64url') }, format: 'jwk' });
  const v = createVerify('SHA256'); v.update(`${hd}.${cl}`);
  assert.ok(v.verify({ key, dsaEncoding: 'ieee-p1363' }, Buffer.from(sig, 'base64url')));
});
test('subscribe without an account, test push, unsubscribe needs the auth secret', async () => {
  const store = kv(), env = vapidEnv(store), b = fakeBrowser();
  let [st, r] = await post(env, '/push/subscribe', { subscription: b.sub, tz: 'America/New_York', time: '07:00', lang: 'es' });
  assert.equal(st, 200); assert.ok(r.ok);
  const key = [...store.m.keys()].find((k) => /^push:[a-f0-9]{32}$/.test(k));
  assert.equal(store.m.get(key).meta.t, '07:00'); assert.equal(store.m.get(key).meta.l, 'es');
  assert.equal(await store.get('push:total'), '1');
  [st] = await post(env, '/push/subscribe', { subscription: b.sub, tz: 'Mars/Base', time: '07:00' }); assert.equal(st, 400);
  [st] = await post(env, '/push/subscribe', { subscription: b.sub, tz: 'UTC', time: '7am' }); assert.equal(st, 400);
  const sent = [];
  const realFetch = globalThis.fetch;
  globalThis.fetch = async (url, init) => { sent.push({ url, init }); return new Response('', { status: 201 }); };
  try {
    [st] = await post(env, '/push/test', { endpoint: b.sub.endpoint, auth: 'wrong' }); assert.equal(st, 404);
    [st, r] = await post(env, '/push/test', { endpoint: b.sub.endpoint, auth: b.sub.keys.auth }); assert.equal(st, 200); assert.ok(r.sent);
    assert.equal(sent[0].init.headers['Content-Encoding'], 'aes128gcm');
    const msg = b.decrypt(sent[0].init.body); assert.equal(msg.lang, 'es'); assert.match(msg.url, /devotional=\d{4}-\d\d-\d\d/);
    for (let i = 0; i < PUSH_LIMITS.testPerHour - 1; i++) await post(env, '/push/test', { endpoint: b.sub.endpoint, auth: b.sub.keys.auth });
    [st] = await post(env, '/push/test', { endpoint: b.sub.endpoint, auth: b.sub.keys.auth }); assert.equal(st, 429);
  } finally { globalThis.fetch = realFetch; }
  [st] = await post(env, '/push/unsubscribe', { endpoint: b.sub.endpoint, auth: 'nope' }); assert.equal(st, 200);
  assert.ok(store.m.has(key));
  [st] = await post(env, '/push/unsubscribe', { endpoint: b.sub.endpoint, auth: b.sub.keys.auth }); assert.equal(st, 200);
  assert.ok(!store.m.has(key)); assert.equal(await store.get('push:total'), '0');
});
test('subscribe rate limit per IP', async () => {
  const env = vapidEnv(kv()), b = fakeBrowser();
  for (let i = 0; i < PUSH_LIMITS.subPerHourIp; i++) await post(env, '/push/subscribe', { subscription: b.sub, tz: 'UTC', time: '07:00' }, '9.9.9.9');
  const [st] = await post(env, '/push/subscribe', { subscription: b.sub, tz: 'UTC', time: '07:00' }, '9.9.9.9'); assert.equal(st, 429);
});
test('cron sends once when due, drops gone subscriptions, and is wired as scheduled()', async () => {
  const store = kv(), env = vapidEnv(store), a = fakeBrowser('https://fcm.googleapis.com/fcm/send/a'), g = fakeBrowser('https://updates.push.services.mozilla.com/wpush/v2/gone');
  const sub = (s) => post(env, '/push/subscribe', { subscription: s, tz: 'UTC', time: '23:59', lang: 'en' });
  await sub(a.sub); await sub(g.sub);
  for (const [k, v] of store.m) if (/^push:[a-f0-9]{32}$/.test(k)) v.meta = { ...v.meta, t: '07:00', d: '' };
  const calls = [];
  const fetcher = async (url, init) => { calls.push(url); return new Response('', { status: url.includes('gone') ? 410 : 201 }); };
  const now = new Date('2026-10-14T07:10:00Z');
  let r = await runPushCron(env, now, fetcher);
  assert.equal(r.sent, 2); assert.equal(r.removed, 1); assert.equal(calls.length, 2);
  r = await runPushCron(env, now, fetcher); assert.equal(r.sent, 0);
  assert.equal(typeof worker.scheduled, 'function');
});
