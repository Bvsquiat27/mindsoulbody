import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { handleFriends, sendDueMorningPushes, RATE_LIMITS } from './friends.mjs';
import { encryptAes128gcm, bytesToB64url, b64urlToBytes, knownPushEndpoint } from './webpush.mjs';
import { clientDayNumber, pushDue, morningCard, MORNING } from './morning.mjs';

function memoryKv() {
  const data = new Map();
  return {
    async get(key) {
      return data.has(key) ? data.get(key) : null;
    },
    async put(key, value) { data.set(key, String(value)); },
    async delete(key) { data.delete(key); },
  };
}

function call(kv, path, body, method = 'POST') {
  const request = new Request(`https://friends.test${path}`, {
    method,
    headers: { 'content-type': 'application/json', origin: 'https://bvsquiat27.github.io' },
    body: method === 'GET' ? undefined : JSON.stringify(body ?? {}),
  });
  return handleFriends(request, { FRIENDS: kv, VAPID_PUBLIC_KEY: 'test-public' });
}

async function read(response) {
  const text = await response.text();
  let data = null;
  try { data = text ? JSON.parse(text) : null; } catch { data = text; }
  return { status: response.status, data };
}

const RFC_AS_PUBLIC = 'BP4z9KsN6nGRTbVYI_c7VJSPQTBtkgcy27mlmlMoZIIgDll6e3vCYLocInmYWAmS6TlzAC8wEqKK6PBru3jl7A8';
const RFC_AS_PRIVATE = 'yfWPiYE-n46HLnH0KqZOF1fJJU3MYrct3AELtAQ-oRw';
const RFC_UA_PUBLIC = 'BCVxsr7N_eNgVRqvHtD0zTZsEc6-VV-JvLexhqUzORcxaOzi6-AYWXvTBHm4bjyPjs7Vd8pZGH6SRpkNtoIAiw4';
const RFC_AUTH = 'BTBZMqHH6r4Tts7J_aSIgg';
const RFC_SALT = 'DGv6ra1nlYgDCS1FRnbzlw';
const RFC_BODY = 'DGv6ra1nlYgDCS1FRnbzlwAAEABBBP4z9KsN6nGRTbVYI_c7VJSPQTBtkgcy27mlmlMoZIIgDll6e3vCYLocInmYWAmS6TlzAC8wEqKK6PBru3jl7A_yl95bQpu6cVPTpK4Mqgkf1CXztLVBSt2Ks3oZwbuwXPXLWyouBWLVWGNWQexSgSxsj_Qulcy4a-fN';

test('aes128gcm matches the RFC 8291 example', async () => {
  const body = await encryptAes128gcm({
    plaintext: new TextEncoder().encode('When I grow up, I want to be a watermelon'),
    asPublic: b64urlToBytes(RFC_AS_PUBLIC),
    asPrivate: b64urlToBytes(RFC_AS_PRIVATE),
    uaPublic: b64urlToBytes(RFC_UA_PUBLIC),
    auth: b64urlToBytes(RFC_AUTH),
    salt: b64urlToBytes(RFC_SALT),
  });
  assert.equal(bytesToB64url(body), RFC_BODY);
});

test('the worker morning list matches the client and the day index', () => {
  const src = readFileSync(new URL('../moments.js', import.meta.url), 'utf8');
  const start = src.indexOf('const MORNING = ');
  const end = src.indexOf('const NIGHT = ');
  const client = JSON.parse(src.slice(start + 'const MORNING = '.length, end).trim().replace(/;$/, ''));
  assert.equal(JSON.stringify(client), JSON.stringify(MORNING));
  const noonNewYork = Date.parse('2026-01-01T17:00:00Z');
  assert.equal(clientDayNumber(noonNewYork, 'America/New_York'), 1);
  const card = morningCard(noonNewYork, 'America/New_York', 'es');
  assert.equal(card.ref, MORNING[1].refEs);
  assert.equal(card.prayer, MORNING[1].prayerEs);
});

test('a subscription is due once, in its own time zone, inside a 15 minute window', () => {
  const nyMorning = Date.parse('2026-03-15T11:05:00Z');
  const row = { hour: 7, minute: 0, timeZone: 'America/New_York', lastSent: '' };
  assert.equal(pushDue(nyMorning, row).due, true);
  assert.equal(pushDue(nyMorning, row).today, '2026-03-15');
  assert.equal(pushDue(Date.parse('2026-03-15T11:14:00Z'), row).due, true);
  assert.equal(pushDue(Date.parse('2026-03-15T11:15:00Z'), row).due, false);
  assert.equal(pushDue(Date.parse('2026-03-15T10:59:00Z'), row).due, false);
  assert.equal(pushDue(nyMorning, { ...row, lastSent: '2026-03-15' }).due, false);
  assert.equal(pushDue(Date.parse('2026-03-15T07:05:00Z'), row).due, false);
  const madrid = { hour: 7, minute: 0, timeZone: 'Europe/Madrid', lastSent: '' };
  assert.equal(pushDue(Date.parse('2026-03-15T06:05:00Z'), madrid).due, true);
  assert.equal(pushDue(Date.parse('2026-03-15T06:05:00Z'), madrid).today, '2026-03-15');
  const late = { hour: 23, minute: 50, timeZone: 'America/New_York', lastSent: '' };
  const justAfter = Date.parse('2026-03-16T04:04:00Z');
  assert.equal(pushDue(justAfter, late).due, true);
  assert.equal(pushDue(justAfter, late).today, '2026-03-15');
  assert.equal(pushDue(justAfter, { ...late, lastSent: '2026-03-15' }).due, false);
});

test('subscribe accepts a known push service and rejects anything else', async () => {
  assert.equal(knownPushEndpoint('https://fcm.googleapis.com/wp/abc'), true);
  assert.equal(knownPushEndpoint('http://fcm.googleapis.com/wp/abc'), false);
  assert.equal(knownPushEndpoint('https://evil.example/wp/abc'), false);
  const kv = memoryKv();
  const user = (await read(await call(kv, '/register', { name: 'Mary' }))).data;
  const keys = { p256dh: RFC_UA_PUBLIC, auth: RFC_AUTH };
  const bad = await read(await call(kv, '/push/subscribe', {
    code: user.code, secret: user.secret, endpoint: 'https://evil.example/push', ...keys, hour: 7, minute: 0, timeZone: 'America/New_York', lang: 'es'
  }));
  assert.equal(bad.status, 400);
  const saved = await read(await call(kv, '/push/subscribe', {
    code: user.code, secret: user.secret, endpoint: 'https://fcm.googleapis.com/wp/abc', ...keys, hour: 7, minute: 0, timeZone: 'America/New_York', lang: 'es'
  }));
  assert.equal(saved.status, 200);
  const stored = JSON.parse(await kv.get(`push:${user.code}`));
  assert.equal(stored.endpoint, 'https://fcm.googleapis.com/wp/abc');
  assert.equal(stored.lang, 'es');
  assert.equal(stored.hour, 7);
  assert.deepEqual(JSON.parse(await kv.get('push:index')), [user.code]);
  const key = await read(await call(kv, '/push/key', null, 'GET'));
  assert.equal(key.status, 200);
  assert.equal(key.data.publicKey, 'test-public');
  assert.equal(JSON.stringify(key.data).includes('PRIVATE'), false);
  await kv.put(`rate:push-subscribe:${user.code}`, JSON.stringify({ start: Date.now(), n: RATE_LIMITS.pushSubscribe }));
  const limited = await read(await call(kv, '/push/subscribe', {
    code: user.code, secret: user.secret, endpoint: 'https://fcm.googleapis.com/wp/abc', ...keys, hour: 8, minute: 0, timeZone: 'America/New_York', lang: 'en'
  }));
  assert.equal(limited.status, 429);
  assert.equal(JSON.parse(await kv.get(`push:${user.code}`)).hour, 7);
  const off = await read(await call(kv, '/push/unsubscribe', { code: user.code, secret: user.secret }));
  assert.equal(off.status, 200);
  assert.equal(await kv.get(`push:${user.code}`), null);
  assert.deepEqual(JSON.parse(await kv.get('push:index')), []);
});

test('a gone push subscription is deleted and a send happens once', async () => {
  const kv = memoryKv();
  const user = (await read(await call(kv, '/register', { name: 'Mary' }))).data;
  await call(kv, '/push/subscribe', {
    code: user.code, secret: user.secret,
    endpoint: 'https://fcm.googleapis.com/wp/abc',
    p256dh: RFC_UA_PUBLIC, auth: RFC_AUTH,
    hour: 7, minute: 0, timeZone: 'America/New_York', lang: 'en'
  });
  const now = Date.parse('2026-03-15T11:05:00Z');
  const unconfigured = await sendDueMorningPushes({ FRIENDS: kv }, now);
  assert.equal(unconfigured.reason, 'unconfigured');
  assert.equal(JSON.parse(await kv.get(`push:${user.code}`)).lastSent, '');
  const pair = await crypto.subtle.generateKey({ name: 'ECDSA', namedCurve: 'P-256' }, true, ['sign']);
  const publicKey = bytesToB64url(new Uint8Array(await crypto.subtle.exportKey('raw', pair.publicKey)));
  const privateKey = (await crypto.subtle.exportKey('jwk', pair.privateKey)).d;
  const env = {
    FRIENDS: kv,
    VAPID_PUBLIC_KEY: publicKey,
    VAPID_PRIVATE_KEY: privateKey,
    VAPID_SUBJECT: 'https://bvsquiat27.github.io/mindsoulbody/',
  };
  const calls = [];
  const original = globalThis.fetch;
  globalThis.fetch = async (url, options) => {
    calls.push({ url: String(url), encoding: options.headers['Content-Encoding'] });
    return new Response('', { status: 201 });
  };
  try {
    const first = await sendDueMorningPushes(env, now);
    assert.equal(first.sent, 1);
    assert.equal(calls.length, 1);
    assert.equal(calls[0].encoding, 'aes128gcm');
    assert.equal(JSON.parse(await kv.get(`push:${user.code}`)).lastSent, '2026-03-15');
    const second = await sendDueMorningPushes(env, now);
    assert.equal(second.sent, 0);
    assert.equal(calls.length, 1);
    globalThis.fetch = async () => new Response('', { status: 410 });
    await kv.put(`push:${user.code}`, JSON.stringify({ ...JSON.parse(await kv.get(`push:${user.code}`)), lastSent: '' }));
    const gone = await sendDueMorningPushes(env, now);
    assert.equal(gone.sent, 0);
    assert.equal(await kv.get(`push:${user.code}`), null);
    assert.deepEqual(JSON.parse(await kv.get('push:index')), []);
  } finally {
    globalThis.fetch = original;
  }
});
