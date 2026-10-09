/* Web Push (RFC 8291 aes128gcm) and VAPID (RFC 8292) using WebCrypto.
   No Node-only libraries: this file runs inside a Cloudflare Worker. */

const PUSH_HOSTS = new Set([
  'fcm.googleapis.com',
  'android.googleapis.com',
  'updates.push.services.mozilla.com',
  'web.push.apple.com',
]);

export function bytesToB64url(bytes) {
  const bin = String.fromCharCode(...bytes);
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

export function b64urlToBytes(value) {
  const text = String(value || '').trim().replace(/-/g, '+').replace(/_/g, '/');
  const padded = text + '='.repeat((4 - (text.length % 4)) % 4);
  const bin = atob(padded);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

function concat(...parts) {
  const len = parts.reduce((sum, part) => sum + part.length, 0);
  const out = new Uint8Array(len);
  let offset = 0;
  for (const part of parts) {
    out.set(part, offset);
    offset += part.length;
  }
  return out;
}

const utf8 = (text) => new TextEncoder().encode(text);

async function hmacSha256(keyBytes, data) {
  const key = await crypto.subtle.importKey('raw', keyBytes, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  return new Uint8Array(await crypto.subtle.sign('HMAC', key, data));
}

async function hkdfExtract(salt, ikm) {
  return hmacSha256(salt, ikm);
}

async function hkdfExpand(prk, info, length) {
  const block = await hmacSha256(prk, concat(info, new Uint8Array([1])));
  return block.slice(0, length);
}

function ecJwk(publicBytes, privateBytes) {
  const jwk = {
    kty: 'EC',
    crv: 'P-256',
    x: bytesToB64url(publicBytes.slice(1, 33)),
    y: bytesToB64url(publicBytes.slice(33, 65)),
    ext: true,
  };
  if (privateBytes) jwk.d = bytesToB64url(privateBytes);
  return jwk;
}

export function knownPushEndpoint(value) {
  let url;
  try { url = new URL(String(value || '')); } catch { return false; }
  if (url.protocol !== 'https:') return false;
  const host = url.hostname.toLowerCase();
  if (PUSH_HOSTS.has(host)) return true;
  if (host === 'notify.windows.com' || host.endsWith('.notify.windows.com')) return true;
  if (host.endsWith('.push.apple.com')) return true;
  return false;
}

export function validatePushBody(body) {
  const endpoint = String(body?.endpoint || '').trim();
  if (!knownPushEndpoint(endpoint)) return { error: 'That notification address is not a known push service' };
  let p256dh;
  let auth;
  try {
    p256dh = b64urlToBytes(body?.p256dh);
    auth = b64urlToBytes(body?.auth);
  } catch {
    return { error: 'The push keys are not valid' };
  }
  if (p256dh.length !== 65 || p256dh[0] !== 4) return { error: 'The push key is not valid' };
  if (auth.length !== 16) return { error: 'The push auth secret is not valid' };
  const hour = Number(body?.hour);
  const minute = Number(body?.minute);
  if (!Number.isInteger(hour) || hour < 0 || hour > 23) return { error: 'Choose an hour from 0 to 23' };
  if (!Number.isInteger(minute) || minute < 0 || minute > 59) return { error: 'Choose a minute from 0 to 59' };
  const timeZone = String(body?.timeZone || '').trim();
  if (!/^[A-Za-z0-9_+\/-]{1,64}$/.test(timeZone)) return { error: 'That time zone is not valid' };
  try { Intl.DateTimeFormat('en-US', { timeZone }); } catch { return { error: 'That time zone is not valid' }; }
  const lang = body?.lang === 'es' ? 'es' : body?.lang === 'en' ? 'en' : '';
  if (!lang) return { error: 'Choose English or Spanish' };
  return { endpoint, p256dh: bytesToB64url(p256dh), auth: bytesToB64url(auth), hour, minute, timeZone, lang };
}

export async function encryptAes128gcm({ plaintext, asPublic, asPrivate, uaPublic, auth, salt, recordSize = 4096 }) {
  const privateKey = await crypto.subtle.importKey('jwk', ecJwk(asPublic, asPrivate), { name: 'ECDH', namedCurve: 'P-256' }, false, ['deriveBits']);
  const uaKey = await crypto.subtle.importKey('jwk', ecJwk(uaPublic), { name: 'ECDH', namedCurve: 'P-256' }, false, []);
  const shared = new Uint8Array(await crypto.subtle.deriveBits({ name: 'ECDH', public: uaKey }, privateKey, 256));
  const prkKey = await hkdfExtract(auth, shared);
  const ikm = await hkdfExpand(prkKey, concat(utf8('WebPush: info\0'), uaPublic, asPublic), 32);
  const prk = await hkdfExtract(salt, ikm);
  const cek = await hkdfExpand(prk, utf8('Content-Encoding: aes128gcm\0'), 16);
  const nonce = await hkdfExpand(prk, utf8('Content-Encoding: nonce\0'), 12);
  const aes = await crypto.subtle.importKey('raw', cek, { name: 'AES-GCM' }, false, ['encrypt']);
  const cipher = new Uint8Array(await crypto.subtle.encrypt({ name: 'AES-GCM', iv: nonce }, aes, concat(plaintext, new Uint8Array([2]))));
  const header = new Uint8Array(21 + asPublic.length);
  header.set(salt, 0);
  new DataView(header.buffer).setUint32(16, recordSize);
  header[20] = asPublic.length;
  header.set(asPublic, 21);
  return concat(header, cipher);
}

async function vapidJwt(endpoint, publicKey, privateKey, subject) {
  const header = bytesToB64url(utf8(JSON.stringify({ typ: 'JWT', alg: 'ES256' })));
  const payload = bytesToB64url(utf8(JSON.stringify({
    aud: new URL(endpoint).origin,
    exp: Math.floor(Date.now() / 1000) + 12 * 60 * 60,
    sub: subject,
  })));
  const signing = await crypto.subtle.importKey(
    'jwk',
    ecJwk(publicKey, privateKey),
    { name: 'ECDSA', namedCurve: 'P-256' },
    false,
    ['sign']
  );
  const sig = new Uint8Array(await crypto.subtle.sign({ name: 'ECDSA', hash: 'SHA-256' }, signing, utf8(`${header}.${payload}`)));
  return `${header}.${payload}.${bytesToB64url(sig)}`;
}

export async function postWebPush(env, subscription, payload) {
  const asPublic = b64urlToBytes(env.VAPID_PUBLIC_KEY);
  const asPrivate = b64urlToBytes(env.VAPID_PRIVATE_KEY);
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const body = await encryptAes128gcm({
    plaintext: utf8(payload),
    asPublic,
    asPrivate,
    uaPublic: b64urlToBytes(subscription.p256dh),
    auth: b64urlToBytes(subscription.auth),
    salt,
  });
  const token = await vapidJwt(subscription.endpoint, asPublic, asPrivate, env.VAPID_SUBJECT);
  const response = await fetch(subscription.endpoint, {
    method: 'POST',
    headers: {
      'Content-Encoding': 'aes128gcm',
      'Content-Type': 'application/octet-stream',
      TTL: '86400',
      Authorization: `vapid t=${token}, k=${env.VAPID_PUBLIC_KEY}`,
    },
    body,
  });
  return { ok: response.status >= 200 && response.status < 300, status: response.status, gone: response.status === 404 || response.status === 410 };
}
