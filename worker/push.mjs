/* Morning devotional push (Web Push with VAPID, RFC 8291 aes128gcm + RFC 8292).
   KV binding FRIENDS (the same namespace as friends.mjs):
     push:<32 hex of sha256(endpoint)> → value { endpoint, keys:{p256dh,auth}, tz, time, lang, created }
                                        metadata { t:"HH:MM", z:tz, l:"en"|"es", d:"YYYY-MM-DD" last sent, f:fails }
     push:total → approximate number of stored subscriptions (cap PUSH_LIMITS.total)
     rate:push-sub:<ip>, rate:push-test:<id>, rate:push-test-ip:<ip>, rate:push-del:<ip> → { start, n } hourly
   No account is needed: a subscription is its own identity. Unsubscribe and
   test need the subscription's auth secret, which only that browser has.
   Secrets: VAPID_PRIVATE_KEY (base64url "d" of the P-256 key) is a wrangler
   secret. VAPID_PUBLIC_KEY and VAPID_SUBJECT are plain vars. */
import { PUSH_TEXT, PUSH_ORDER } from './devotional-push-data.mjs';

export const PUSH_LIMITS = { subPerHourIp: 20, testPerHour: 3, testPerHourIp: 10, delPerHourIp: 30, total: 5000, sendPerRun: 40, windowMin: 180, maxFails: 5 };
const PUSH_HOSTS = /^(fcm\.googleapis\.com|android\.googleapis\.com|updates\.push\.services\.mozilla\.com|push\.services\.mozilla\.com|web\.push\.apple\.com|[a-z0-9-]+\.notify\.windows\.com)$/;
const HOUR_MS = 3600000;
const enc = new TextEncoder();

export const b64u = {
  enc(bytes) { let s = ''; for (const b of new Uint8Array(bytes)) s += String.fromCharCode(b); return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, ''); },
  dec(str) { const s = String(str).replace(/-/g, '+').replace(/_/g, '/'); const bin = atob(s + '==='.slice((s.length + 3) % 4)); return Uint8Array.from(bin, (c) => c.charCodeAt(0)); },
};
const concat = (...parts) => { const out = new Uint8Array(parts.reduce((n, p) => n + p.length, 0)); let o = 0; for (const p of parts) { out.set(p, o); o += p.length; } return out; };

/* ---------- calendar: must match devotional.js ---------- */
export function orthodoxPascha(y) {
  const a = y % 4, b = y % 7, c = y % 19, d = (19 * c + 15) % 30, e = (2 * a + 4 * b - d + 34) % 7;
  const m = Math.floor((d + e + 114) / 31), day = ((d + e + 114) % 31) + 1;
  const t = new Date(Date.UTC(y, m - 1, day)); t.setUTCDate(t.getUTCDate() + 13); /* Julian → Gregorian, 1900–2099 */
  return t;
}
export function pickId(y, m, d, order = PUSH_ORDER) {
  const t = Date.UTC(y, m - 1, d), mmdd = `${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
  const off = Math.round((t - orthodoxPascha(y).getTime()) / 86400000);
  let fixed = null;
  for (const [id, when] of order.feasts) {
    if (when[0] === 'P') { if (Number(when.slice(1)) === off) return id; }
    else if (when === mmdd) fixed = fixed || id;
  }
  if (fixed) return fixed;
  const n = order.ordinary.length, day = Math.floor(t / 86400000);
  return order.ordinary[((day % n) + n) % n];
}
export function localNow(tz, now = new Date()) {
  const parts = Object.fromEntries(new Intl.DateTimeFormat('en-CA', { timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).formatToParts(now).map((p) => [p.type, p.value]));
  return { y: +parts.year, m: +parts.month, d: +parts.day, date: `${parts.year}-${parts.month}-${parts.day}`, min: (+parts.hour % 24) * 60 + +parts.minute };
}
export function messageFor(date, lang) {
  const [y, m, d] = date.split('-').map(Number), id = pickId(y, m, d), t = PUSH_TEXT[id][lang === 'es' ? 'es' : 'en'];
  const body = t[1].length > 160 ? t[1].slice(0, 157).replace(/\s+\S*$/, '') + '…' : t[1];
  return { title: t[0], body, url: `./?devotional=${date}`, tag: 'msb-devotional', date, lang: lang === 'es' ? 'es' : 'en' };
}
const minutesOf = (hhmm) => Number(hhmm.slice(0, 2)) * 60 + Number(hhmm.slice(3, 5));
/* due when local time is at or after the chosen time (within the window) and nothing was sent today */
export function isDue(meta, now = new Date()) {
  if (!meta || !meta.z || !meta.t) return null;
  let l; try { l = localNow(meta.z, now); } catch { return null; }
  const late = l.min - minutesOf(meta.t);
  return late >= 0 && late < PUSH_LIMITS.windowMin && meta.d !== l.date ? l.date : null;
}

/* ---------- validation ---------- */
export function validTimeZone(tz) {
  if (typeof tz !== 'string' || tz.length > 64 || !/^[A-Za-z0-9_+\-/]+$/.test(tz)) return false;
  try { new Intl.DateTimeFormat('en', { timeZone: tz }); return true; } catch { return false; }
}
export function cleanSubscription(input) {
  const endpoint = String(input?.endpoint || '');
  if (endpoint.length > 1000) return null;
  let u; try { u = new URL(endpoint); } catch { return null; }
  if (u.protocol !== 'https:' || u.port || !PUSH_HOSTS.test(u.hostname)) return null;
  const p256dh = String(input?.keys?.p256dh || ''), auth = String(input?.keys?.auth || '');
  try {
    const k = b64u.dec(p256dh), a = b64u.dec(auth);
    if (k.length !== 65 || k[0] !== 4 || a.length !== 16) return null;
  } catch { return null; }
  return { endpoint, keys: { p256dh, auth } };
}
export async function subId(endpoint) {
  const h = new Uint8Array(await crypto.subtle.digest('SHA-256', enc.encode(endpoint)));
  return [...h.slice(0, 16)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

/* ---------- RFC 8291 payload encryption ---------- */
async function hkdf(salt, ikm, info, bytes) {
  const key = await crypto.subtle.importKey('raw', ikm, 'HKDF', false, ['deriveBits']);
  return new Uint8Array(await crypto.subtle.deriveBits({ name: 'HKDF', hash: 'SHA-256', salt, info }, key, bytes * 8));
}
export async function encryptPayload(sub, plaintext, fixed = {}) {
  const uaPub = b64u.dec(sub.keys.p256dh), authSecret = b64u.dec(sub.keys.auth);
  const local = fixed.localKeys || await crypto.subtle.generateKey({ name: 'ECDH', namedCurve: 'P-256' }, true, ['deriveBits']);
  const asPub = new Uint8Array(await crypto.subtle.exportKey('raw', local.publicKey));
  const uaKey = await crypto.subtle.importKey('raw', uaPub, { name: 'ECDH', namedCurve: 'P-256' }, false, []);
  const shared = new Uint8Array(await crypto.subtle.deriveBits({ name: 'ECDH', public: uaKey }, local.privateKey, 256));
  const ikm = await hkdf(authSecret, shared, concat(enc.encode('WebPush: info\0'), uaPub, asPub), 32);
  const salt = fixed.salt || crypto.getRandomValues(new Uint8Array(16));
  const cek = await hkdf(salt, ikm, enc.encode('Content-Encoding: aes128gcm\0'), 16);
  const nonce = await hkdf(salt, ikm, enc.encode('Content-Encoding: nonce\0'), 12);
  const key = await crypto.subtle.importKey('raw', cek, 'AES-GCM', false, ['encrypt']);
  const data = concat(enc.encode(plaintext), new Uint8Array([2]));
  const ct = new Uint8Array(await crypto.subtle.encrypt({ name: 'AES-GCM', iv: nonce }, key, data));
  const header = new Uint8Array(21); header.set(salt, 0); new DataView(header.buffer).setUint32(16, 4096); header[20] = 65;
  return concat(header, asPub, ct);
}

/* ---------- RFC 8292 VAPID ---------- */
async function vapidKey(env) {
  const pub = b64u.dec(env.VAPID_PUBLIC_KEY);
  if (pub.length !== 65 || !env.VAPID_PRIVATE_KEY) throw Error('VAPID keys are not configured');
  const jwk = { kty: 'EC', crv: 'P-256', x: b64u.enc(pub.slice(1, 33)), y: b64u.enc(pub.slice(33, 65)), d: env.VAPID_PRIVATE_KEY, ext: true };
  return crypto.subtle.importKey('jwk', jwk, { name: 'ECDSA', namedCurve: 'P-256' }, false, ['sign']);
}
export async function vapidHeader(env, endpoint, now = Date.now()) {
  const aud = new URL(endpoint).origin;
  const head = b64u.enc(enc.encode(JSON.stringify({ typ: 'JWT', alg: 'ES256' })));
  const claims = b64u.enc(enc.encode(JSON.stringify({ aud, exp: Math.floor(now / 1000) + 12 * 3600, sub: env.VAPID_SUBJECT || 'https://bvsquiat27.github.io/mindsoulbody/' })));
  const sig = await crypto.subtle.sign({ name: 'ECDSA', hash: 'SHA-256' }, await vapidKey(env), enc.encode(`${head}.${claims}`));
  return `vapid t=${head}.${claims}.${b64u.enc(sig)}, k=${env.VAPID_PUBLIC_KEY}`;
}
export async function sendPush(env, sub, message, fetcher = fetch) {
  const body = await encryptPayload(sub, JSON.stringify(message));
  const res = await fetcher(sub.endpoint, {
    method: 'POST',
    headers: { Authorization: await vapidHeader(env, sub.endpoint), 'Content-Encoding': 'aes128gcm', 'Content-Type': 'application/octet-stream', TTL: '43200', Urgency: 'normal', Topic: 'devotional' },
    body,
  });
  return res.status;
}

/* ---------- KV helpers ---------- */
async function takeRate(env, key, limit) {
  const now = Date.now();
  let b = null; try { b = JSON.parse(await env.FRIENDS.get(key) || 'null'); } catch { b = null; }
  if (!b || typeof b.start !== 'number' || now - b.start >= HOUR_MS) b = { start: now, n: 0 };
  if (b.n >= limit) return false;
  b.n += 1; await env.FRIENDS.put(key, JSON.stringify(b), { expirationTtl: 7200 });
  return true;
}
async function total(env, delta) {
  const n = Math.max(0, (Number(await env.FRIENDS.get('push:total')) || 0) + delta);
  if (delta) await env.FRIENDS.put('push:total', String(n));
  return n;
}
async function loadSub(env, id) {
  const r = await env.FRIENDS.getWithMetadata(`push:${id}`);
  if (!r || !r.value) return null;
  try { return { rec: JSON.parse(r.value), meta: r.metadata || {} }; } catch { return null; }
}
const ctEqual = (a, b) => { a = String(a); b = String(b); let x = a.length === b.length ? 0 : 1; for (let i = 0; i < Math.max(a.length, b.length); i++) x |= (a.charCodeAt(i) || 0) ^ (b.charCodeAt(i) || 0); return x === 0; };

/* ---------- routes: /push/key, /push/subscribe, /push/unsubscribe, /push/test ---------- */
export async function handlePush(path, body, env, ip, fetcher = fetch) {
  if (path === '/push/key') return [{ key: env.VAPID_PUBLIC_KEY || null }];
  if (path === '/push/subscribe') {
    if (!(await takeRate(env, `rate:push-sub:${ip}`, PUSH_LIMITS.subPerHourIp))) return [{ error: 'Too many reminder changes this hour' }, 429];
    const sub = cleanSubscription(body?.subscription);
    if (!sub) return [{ error: 'That push subscription is not supported' }, 400];
    const tz = String(body?.tz || ''); if (!validTimeZone(tz)) return [{ error: 'Unknown time zone' }, 400];
    const time = String(body?.time || ''); if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(time)) return [{ error: 'Choose a time like 07:00' }, 400];
    const lang = body?.lang === 'es' ? 'es' : 'en';
    const id = await subId(sub.endpoint), old = await loadSub(env, id);
    if (!old && (await total(env, 0)) >= PUSH_LIMITS.total) return [{ error: 'Reminders are full right now. Please try again later.' }, 503];
    const l = localNow(tz);
    /* turning it on after today's time: start tomorrow, never a surprise push right away */
    const d = old && old.meta.d === l.date ? l.date : (l.min >= minutesOf(time) ? l.date : '');
    const rec = { ...sub, tz, time, lang, created: old?.rec?.created || Date.now() };
    await env.FRIENDS.put(`push:${id}`, JSON.stringify(rec), { metadata: { t: time, z: tz, l: lang, d, f: 0 } });
    if (!old) await total(env, 1);
    return [{ ok: true, id, time, tz, lang, next: d === l.date ? 'tomorrow' : 'today' }];
  }
  if (path === '/push/unsubscribe' || path === '/push/test') {
    const del = path === '/push/unsubscribe';
    if (del && !(await takeRate(env, `rate:push-del:${ip}`, PUSH_LIMITS.delPerHourIp))) return [{ error: 'Too many requests this hour' }, 429];
    const endpoint = String(body?.endpoint || ''); if (!endpoint || endpoint.length > 1000) return [{ error: 'Missing subscription' }, 400];
    const id = await subId(endpoint), found = await loadSub(env, id);
    if (!found || !ctEqual(found.rec.keys.auth, String(body?.auth || ''))) return del ? [{ ok: true }] : [{ error: 'Reminder not found. Turn it off and on again.' }, 404];
    if (del) { await env.FRIENDS.delete(`push:${id}`); await total(env, -1); return [{ ok: true }]; }
    if (!(await takeRate(env, `rate:push-test-ip:${ip}`, PUSH_LIMITS.testPerHourIp)) || !(await takeRate(env, `rate:push-test:${id}`, PUSH_LIMITS.testPerHour))) return [{ error: 'Only 3 test reminders an hour' }, 429];
    const msg = messageFor(localNow(found.rec.tz).date, found.rec.lang);
    let status = 0; try { status = await sendPush(env, found.rec, msg, fetcher); } catch { status = 0; }
    if (status === 404 || status === 410) { await env.FRIENDS.delete(`push:${id}`); await total(env, -1); return [{ error: 'This phone’s subscription expired. Turn reminders off and on again.' }, 410]; }
    return status >= 200 && status < 300 ? [{ ok: true, sent: true, status }] : [{ error: 'The push service did not accept the test', status }, 502];
  }
  return [{ error: 'Not found' }, 404];
}

/* ---------- cron: send what is due ---------- */
export async function runPushCron(env, now = new Date(), fetcher = fetch) {
  let cursor, sent = 0, removed = 0, checked = 0;
  do {
    const page = await env.FRIENDS.list({ prefix: 'push:', cursor, limit: 1000 });
    for (const k of page.keys) {
      if (k.name === 'push:total') continue;
      checked++;
      const date = isDue(k.metadata, now);
      if (!date) continue;
      if (sent >= PUSH_LIMITS.sendPerRun) return { sent, removed, checked, more: true };
      const found = await loadSub(env, k.name.slice(5));
      if (!found) continue;
      let status = 0; try { status = await sendPush(env, found.rec, messageFor(date, found.meta.l || found.rec.lang), fetcher); } catch { status = 0; }
      sent++;
      if (status === 404 || status === 410 || (status >= 400 && status < 500 && status !== 429 && (found.meta.f || 0) + 1 >= PUSH_LIMITS.maxFails)) {
        await env.FRIENDS.delete(k.name); await total(env, -1); removed++; continue;
      }
      const ok = status >= 200 && status < 300, client = status >= 400 && status < 500 && status !== 429;
      if (ok || client) await env.FRIENDS.put(k.name, JSON.stringify(found.rec), { metadata: { ...found.meta, d: date, f: ok ? 0 : (found.meta.f || 0) + 1 } });
    }
    cursor = page.list_complete ? undefined : page.cursor;
  } while (cursor);
  return { sent, removed, checked, more: false };
}
