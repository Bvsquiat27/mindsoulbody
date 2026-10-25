/* Mind Soul & Body — friends API worker.
   This is the production KV layout for mindsoulbody-api. Do not replace it
   with per-show board keys, a separate auth record, or a new namespace.
   Deploying a different layout would orphan the live accounts.

   KV binding FRIENDS:
     user:<code> → {
       code, name, secretHash, stats, friends: [codes], updatedAt,
       inbox, outbox, threads, shared,            // older records may omit these
       publicId,                                  // stable non-secret id
       requestsIn, requestsOut,                   // pending friend requests
       handle, city, bio, denomination, avatar_data, cover_data
     }
     leaderboard → { show: [{ code, id, name, score, level, ts }] } cap 50
     shared:<16 hex>
     room:ROOM-XXXXXX with a two-hour TTL
     versebox:<code> → array, newest first, max 100. Each item:
       { id, from, fromName, to, toName, book, chapter, verse,
         reference, text, note, translation, ts, read, direction }
       direction is "in" or "out". Sender copy is read:true, direction "out".
       Recipient copy is read:false, direction "in".
     study:<codeLow>:<codeHigh> → codes sorted. {
       id, editors:[a,b], updatedAt,
       entries:[{ id, question, answer, verses:[{book,chapter,verse,reference}],
                  author, authorName, updatedBy, updatedByName, ts }]
     }
     rate:verse:<code> → { start, n }  30 sends per hour
     rate:verse-read:<code> → { start, n }  200 reads per hour
     rate:study:<code> → { start, n }  40 writes per hour
     rate:study-delete:<code> → { start, n }  200 deletes per hour
     squishy collection and trade keys: see the "Bible squishies" section
     push:* and rate:push-*: morning devotional reminders, see push.mjs

   The account secret is a random 32-hex string returned once at register.
   Only its SHA-256 hex digest is stored. Compare it in constant time.
   Public /scores never includes friend codes. */

import { handlePush, runPushCron } from './push.mjs';
import { handleMyNotes, handleLessons } from './mynotes.mjs';

const ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
const SHOWS = ['jeopardy', 'millionaire', 'feud', 'sound', 'babel', 'defend', 'doctrine'];
/* Avatar uploads are a 256px JPEG (quality 0.85) and covers are 1024px.
   These caps fit one of each data URL, sent once. A photo past its own cap
   is skipped; text fields in the same request are still saved. */
const AVATAR_MAX = 250000;
const COVER_MAX = 1500000;
const MAX_BODY = 2000000;
export const FRIEND_LIMITS = { MAX_BODY, AVATAR_MAX, COVER_MAX, REQUEST_MAX: 30 };
const NOTE_TITLE_MAX = 120;
const NOTE_BODY_MAX = 4000;
const NOTE_BOX_MAX = 30;
const REQUEST_MAX = FRIEND_LIMITS.REQUEST_MAX;
const INBOX_FULL = 'Their request inbox is full. They need to accept or decline a request before yours can be delivered.';
const OUTBOX_FULL = 'Your outgoing requests are full. Cancel a request before sending another.';
const BOARD_MAX = 50;
const ROOM_TTL_SECONDS = 2 * 60 * 60;
const ROOM_MAX_PLAYERS = 4;
const BOARD_KEY = 'leaderboard';
const ORIGIN = 'https://bvsquiat27.github.io';
const TEXT_LIMITS = { handle: 24, city: 80, bio: 160, denomination: 40 };
const IMAGE_DATA = /^data:image\/(?:jpeg|png|webp);base64,[a-z0-9+/]+={0,2}$/i;
const IMAGE_HTTPS = /^https:\/\/[^\s"'<>]+$/i;
const PUBLIC_ID = /^[a-f0-9]{16}$/;

function allowedOrigin(request) {
  const requestOrigin = request.headers.get('origin') || '';
  return requestOrigin === ORIGIN || /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(requestOrigin) ? requestOrigin : ORIGIN;
}

function corsHeaders(origin) {
  return {
    'access-control-allow-origin': origin,
    vary: 'Origin',
    'access-control-allow-methods': 'GET, POST, OPTIONS',
    'access-control-allow-headers': 'content-type',
    'access-control-max-age': '86400',
  };
}

/* basic hardening for every API reply; CORS headers stay as they were */
export const SECURITY_HEADERS = {
  'x-content-type-options': 'nosniff',
  'referrer-policy': 'no-referrer',
  'x-frame-options': 'DENY',
  'content-security-policy': "default-src 'none'; frame-ancestors 'none'",
  'strict-transport-security': 'max-age=31536000',
  'cache-control': 'no-store',
};

function json(data, status = 200, origin = ORIGIN) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8', ...SECURITY_HEADERS, ...corsHeaders(origin) },
  });
}

async function sha256hex(text) {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

function timingSafeEqual(a, b) {
  const left = String(a ?? '');
  const right = String(b ?? '');
  const len = Math.max(left.length, right.length);
  let diff = left.length === right.length ? 0 : 1;
  for (let i = 0; i < len; i++) diff |= (left.charCodeAt(i) || 0) ^ (right.charCodeAt(i) || 0);
  return diff === 0;
}

function randomHex(bytes) {
  const arr = new Uint8Array(bytes);
  crypto.getRandomValues(arr);
  return [...arr].map((b) => b.toString(16).padStart(2, '0')).join('');
}

function newCode() {
  let out = 'MSB-';
  const arr = new Uint8Array(6);
  crypto.getRandomValues(arr);
  for (const b of arr) out += ALPHABET[b % ALPHABET.length];
  return out;
}

function newRoomCode() {
  let out = 'ROOM-';
  const arr = new Uint8Array(6);
  crypto.getRandomValues(arr);
  for (const b of arr) out += ALPHABET[b % ALPHABET.length];
  return out;
}

const cleanName = (v) => String(v ?? '').trim().slice(0, 40);
const clip = (v, max) => String(v ?? '').trim().slice(0, max);
const num = (v) => { const n = Number(v); return Number.isFinite(n) && n > 0 ? n : 0; };
const int = (v) => Math.floor(num(v));

function cleanStats(input) {
  const src = input && typeof input === 'object' ? input : {};
  const pick = (obj) => {
    const out = {};
    for (const k of SHOWS) out[k] = num(obj && obj[k]);
    return out;
  };
  const levelsSrc = src.levels && typeof src.levels === 'object' ? src.levels : {};
  const levels = {};
  for (const k of SHOWS) levels[k] = int(levelsSrc[k]);
  const out = { bests: pick(src.bests), levels, studies: int(src.studies) };
  const reading = cleanReading(src.reading);
  if (reading) out.reading = reading;
  return out;
}

/* Opt-in "what I'm reading" (client: reading-share.js). Only small known
   fields; absent when the user does not share, so turning it off clears it. */
function cleanReading(input) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) return null;
  const out = {};
  const book = Math.floor(num(input.book)), chapter = Math.floor(num(input.chapter));
  if (book >= 1 && book <= 78 && chapter >= 1 && chapter <= 150) { out.book = book; out.chapter = chapter; }
  const study = String(input.study ?? '').trim().toLowerCase();
  if (/^[a-z0-9-]{1,60}$/.test(study)) {
    out.study = study;
    const title = String(input.studyTitle ?? '').replace(/[\u0000-\u001f<>]/g, '').trim().slice(0, 120);
    if (title) out.studyTitle = title;
  }
  const total = Math.floor(num(input.total)), done = Math.floor(num(input.done));
  if (total >= 1 && total <= 500 && done >= 0 && done <= total) { out.done = done; out.total = total; }
  const at = Math.floor(num(input.at));
  if (at > 0) out.at = at;
  return out.book || out.study || out.total ? out : null;
}

function cleanNoteRef(input) {
  if (!input || typeof input !== 'object') return null;
  const book = Math.floor(num(input.book));
  const chapter = Math.floor(num(input.chapter));
  const verse = Math.floor(num(input.verse));
  if (book < 1 || book > 78 || chapter < 1 || chapter > 200 || verse > 999) return null;
  const label = String(input.label ?? '').trim().slice(0, 80);
  return { book, chapter, verse, label };
}

function cleanStudyId(v) {
  const s = String(v ?? '').trim().toLowerCase();
  return /^[a-z0-9-]{1,60}$/.test(s) ? s : '';
}

function publicImage(value, max) {
  const raw = String(value ?? '').trim();
  if (!raw || raw.length > max) return '';
  if (IMAGE_DATA.test(raw) || IMAGE_HTTPS.test(raw)) return raw;
  return '';
}

function nestedProfile(body) {
  const profile = body && body.profile;
  return profile && typeof profile === 'object' && !Array.isArray(profile) ? profile : null;
}

function fieldValues(body, nested, key) {
  const values = [];
  if (body && Object.prototype.hasOwnProperty.call(body, key)) values.push(body[key]);
  if (nested && Object.prototype.hasOwnProperty.call(nested, key)) values.push(nested[key]);
  return values;
}

function applyText(user, body, nested, key) {
  const values = fieldValues(body, nested, key);
  if (!values.length) return;
  const text = values.map((value) => clip(value, TEXT_LIMITS[key])).find(Boolean) || '';
  if (text) user[key] = text;
  else delete user[key];
}

function applyImage(user, body, nested, storedKey, aliases, max) {
  let seen = false;
  let chosen = '';
  let oversize = false;
  for (const alias of aliases) {
    for (const value of fieldValues(body, nested, alias)) {
      seen = true;
      const raw = String(value ?? '').trim();
      if (!raw) continue;
      if (raw.length > max) { oversize = true; continue; }
      const img = publicImage(raw, max);
      if (img) { chosen = img; break; }
    }
    if (chosen) break;
  }
  if (!seen) return '';
  if (chosen) { user[storedKey] = chosen; return ''; }
  if (oversize) {
    return storedKey === 'avatar_data'
      ? 'The profile photo was too large, so it was left unchanged. Your other profile details were saved.'
      : 'The cover photo was too large, so it was left unchanged. Your other profile details were saved.';
  }
  delete user[storedKey];
  return '';
}

function applyProfile(user, body) {
  const nested = nestedProfile(body);
  for (const key of ['handle', 'city', 'bio', 'denomination']) applyText(user, body, nested, key);
  const warnings = [
    applyImage(user, body, nested, 'avatar_data', ['avatar_data', 'avatar', 'avatarUrl'], AVATAR_MAX),
    applyImage(user, body, nested, 'cover_data', ['cover_data', 'cover', 'coverUrl'], COVER_MAX),
  ].filter(Boolean);
  delete user.avatar_saint;
  if (user.profile && typeof user.profile === 'object') {
    delete user.profile.avatar_saint;
    delete user.profile.secret;
    delete user.profile.secretHash;
    delete user.profile.email;
    delete user.profile.password;
    delete user.profile.friends;
    if (!Object.keys(user.profile).length) delete user.profile;
  }
  delete user.profile;
  return warnings;
}

function hydrate(user) {
  if (!user || typeof user !== 'object') return null;
  if (!Array.isArray(user.friends)) user.friends = [];
  if (!Array.isArray(user.inbox)) user.inbox = [];
  if (!Array.isArray(user.outbox)) user.outbox = [];
  if (!user.threads || typeof user.threads !== 'object' || Array.isArray(user.threads)) user.threads = {};
  if (!Array.isArray(user.shared)) user.shared = [];
  if (!Array.isArray(user.requestsIn)) user.requestsIn = [];
  if (!Array.isArray(user.requestsOut)) user.requestsOut = [];
  if (!user.stats || typeof user.stats !== 'object' || Array.isArray(user.stats)) user.stats = cleanStats(null);
  return user;
}

function cleanRequests(list) {
  const out = [];
  const seen = new Set();
  for (const item of Array.isArray(list) ? list : []) {
    const code = String(item?.code || '').trim().toUpperCase();
    if (!code || seen.has(code)) continue;
    seen.add(code);
    out.push({ code, name: cleanName(item?.name) || 'Friend', ts: Number(item?.ts) || 0 });
  }
  return out;
}

function withoutCode(list, code) {
  return cleanRequests(list).filter((item) => item.code !== code);
}

function hasRequest(list, code) {
  return cleanRequests(list).some((item) => item.code === code);
}

function linkFriends(a, b) {
  a.friends = [...new Set([...(a.friends || []), b.code])];
  b.friends = [...new Set([...(b.friends || []), a.code])];
}

function clearRequestPair(a, b) {
  a.requestsIn = withoutCode(a.requestsIn, b.code);
  a.requestsOut = withoutCode(a.requestsOut, b.code);
  b.requestsIn = withoutCode(b.requestsIn, a.code);
  b.requestsOut = withoutCode(b.requestsOut, a.code);
}

function validPublicId(value) {
  const id = String(value ?? '').trim().toLowerCase();
  return PUBLIC_ID.test(id) ? id : '';
}

async function loadUser(env, code) {
  if (!code) return null;
  const raw = await env.FRIENDS.get(`user:${code}`);
  if (!raw) return null;
  let user; try { user = JSON.parse(raw); } catch { return null; }
  /* what was stored when this request read it, so a save can tell which
     friends and requests this request added or took away */
  if (user && typeof user === 'object') Object.defineProperty(user, BASE, { value: raw, enumerable: false, writable: true });
  return user;
}

/* KV has no transactions, and one user record is changed by many requests
   (a profile sync, a friend accepting, a message landing). A save re-reads the
   stored record and writes back only the fields this request changed (`own`),
   so different changes no longer undo each other; the window left is one
   get+put. Friendship itself is also kept in per-pair keys (see healLinks). */
const PROFILE = 'profile';
const REL_FIELDS = ['friends', 'requestsIn', 'requestsOut', 'inbox', 'outbox', 'threads', 'shared', 'squishies'];
const LINKS = ['friends', 'requestsIn', 'requestsOut'];
const LIST_FIELDS = ['friends', 'requestsIn', 'requestsOut', 'shared'];
const BOX_OP = /^(inbox|outbox)([+*-])(.+)$/;
const BASE = Symbol('stored');
const itemKey = (x) => (typeof x === 'string' ? x : x && (x.code || x.id)) || '';
/* a list this request changed, as what it added and what it took away */
function listChange(user, f) {
  let base = null; try { base = user[BASE] ? JSON.parse(user[BASE]) : null; } catch { base = null; }
  if (!base || !Array.isArray(base[f]) || !Array.isArray(user[f])) return null;
  const was = new Set(base[f].map(itemKey)), now = new Set(user[f].map(itemKey));
  return { add: user[f].filter((x) => !was.has(itemKey(x))), drop: [...was].filter((k) => !now.has(k)) };
}
/* how long a save waits before it checks that its write was not overwritten */
const SETTLE_MS = 90;
const settle = (env) => { const ms = env.SAVE_SETTLE_MS ?? SETTLE_MS; return ms > 0 ? new Promise((r) => setTimeout(r, ms / 2 + Math.random() * ms)) : Promise.resolve(); };
/* union of two message lists by id; a message marked read in either stays read */
function unionById(mine, theirs) {
  const map = new Map();
  for (const m of [...(Array.isArray(theirs) ? theirs : []), ...(Array.isArray(mine) ? mine : [])]) {
    if (!m || typeof m !== 'object' || !m.id) continue;
    const had = map.get(m.id);
    map.set(m.id, had ? { ...had, ...m, read: !!(had.read || m.read) } : m);
  }
  return [...map.values()];
}
/* own: fields this request changed. 'inbox+<id>' / 'inbox*<id>' /
   'inbox-<id>' add, mark read or remove one note; 'threads.<code>' is one
   conversation (union by id). Saving
   someone else's record (stamp=false) keeps their last-active time. */
async function saveUser(env, user, own, stamp = true) {
  if (stamp) user.updatedAt = Date.now();
  if (!Array.isArray(own)) { await env.FRIENDS.put(`user:${user.code}`, JSON.stringify(user)); return; }
  /* list fields this request added to: check after the write that its items
     landed, and merge again if another request wrote over them meanwhile */
  const want = [];
  for (const f of own) {
    if (f.startsWith('threads.')) { const k = f.slice(8); for (const m of (user.threads && user.threads[k]) || []) if (m && m.id) want.push((r) => ((r.threads && r.threads[k]) || []).some((x) => x && x.id === m.id)); }
    else if (f === PROFILE) {
      for (const k of Object.keys(user)) if (!REL_FIELDS.includes(k) && k !== 'updatedAt') { const v = JSON.stringify(user[k]); want.push((r) => JSON.stringify(r[k]) === v); }
    } else if (!BOX_OP.test(f) && LIST_FIELDS.includes(f)) {
      const c = listChange(user, f);
      if (c) { for (const x of c.add) want.push((r) => (r[f] || []).some((y) => itemKey(y) === itemKey(x))); for (const k of c.drop) want.push((r) => !(r[f] || []).some((y) => itemKey(y) === k)); }
      else { const v = JSON.stringify(user[f]); want.push((r) => JSON.stringify(r[f]) === v); }
    } else if (!BOX_OP.test(f)) {
      const v = JSON.stringify(user[f]); want.push((r) => JSON.stringify(r[f]) === v);
    } else {
      const m = BOX_OP.exec(f);
      if (m) {
        const [, k, op, id] = m, has = (r) => (r[k] || []).find((x) => x && x.id === id);
        want.push(op === '+' ? (r) => !!has(r) : op === '*' ? (r) => !!(has(r) || {}).read : (r) => !has(r));
      }
    }
  }
  let fresh = await loadUser(env, user.code);
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const out = mergeUser(user, fresh, own, stamp);
    await env.FRIENDS.put(`user:${user.code}`, JSON.stringify(out));
    if (!want.length) return;
    /* another request that read the record before this put may write after
       it: wait a moment, look again, and merge again if this change is gone */
    await settle(env);
    fresh = await loadUser(env, user.code);
    if (!fresh || want.every((ok) => ok(fresh))) return;
  }
}
function mergeUser(user, fresh, own, stamp) {
  if (!fresh || typeof fresh !== 'object' || Array.isArray(fresh)) return user;
  const out = { ...fresh };
  for (const f of own) {
    if (f === PROFILE) {
      for (const k of Object.keys(out)) if (!REL_FIELDS.includes(k) && !(k in user)) delete out[k];
      for (const k of Object.keys(user)) if (!REL_FIELDS.includes(k)) out[k] = user[k];
    } else if (f.startsWith('threads.')) {
      const k = f.slice(8);
      if (out.threads === fresh.threads) out.threads = { ...(fresh.threads && typeof fresh.threads === 'object' && !Array.isArray(fresh.threads) ? fresh.threads : {}) };
      const merged = unionById(user.threads && user.threads[k], out.threads[k]).sort((x, y) => (Number(x.ts) || 0) - (Number(y.ts) || 0)).slice(-100);
      if (merged.length) out.threads[k] = merged; else delete out.threads[k];
    } else if (BOX_OP.test(f)) {
      /* inbox+<id> adds that note, inbox*<id> marks it read, inbox-<id> removes it */
      const [, k, op, id] = BOX_OP.exec(f);
      const list = (Array.isArray(fresh[k]) ? fresh[k] : []).filter((n) => n && n.id !== id);
      const mine = (user[k] || []).find((n) => n && n.id === id);
      const theirs = (Array.isArray(fresh[k]) ? fresh[k] : []).find((n) => n && n.id === id);
      if (op === '+' && mine) list.push(mine);
      if (op === '*' && theirs) list.push({ ...theirs, read: true });
      out[k] = list.sort((x, y) => (Number(y.ts) || 0) - (Number(x.ts) || 0)).slice(0, NOTE_BOX_MAX);
    } else if (LIST_FIELDS.includes(f) && listChange(user, f)) {
      const c = listChange(user, f), drop = new Set([...c.drop, ...c.add.map(itemKey)]);
      const kept = (Array.isArray(fresh[f]) ? fresh[f] : []).filter((x) => !drop.has(itemKey(x)));
      /* friends keep the order they were added; requests and shared notes are newest first */
      out[f] = f === 'friends' ? [...kept, ...c.add] : [...c.add, ...kept];
    } else if (f in user) out[f] = user[f];
  }
  out.updatedAt = stamp ? user.updatedAt : fresh.updatedAt;
  return out;
}

/* Per-pair friendship keys. `fr:<a>:<b>` (codes sorted) is 'friends' or
   'removed'; `rq:<from>:<to>` marks a request only its sender writes. When two
   people add each other at the same moment, or a save loses a link, these
   keys let the next read put both records right. */
const pairKey = (a, b) => `fr:${[a, b].sort().join(':')}`;
const reqKey = (from, to) => `rq:${from}:${to}`;
const REQ_TTL_SECONDS = 60 * 60 * 24 * 60;
async function markFriends(env, a, b) {
  await env.FRIENDS.put(pairKey(a.code, b.code), 'friends');
  await env.FRIENDS.delete(reqKey(a.code, b.code));
  await env.FRIENDS.delete(reqKey(b.code, a.code));
}
async function befriend(env, me, friend) {
  linkFriends(me, friend);
  clearRequestPair(me, friend);
  await saveUser(env, me, LINKS);
  await saveUser(env, friend, LINKS);
  await markFriends(env, me, friend);
}
/* Repair `user` from the pair keys; returns true if it changed (and saved). */
async function healLinks(env, user) {
  let changed = false;
  const dropReq = (code) => { user.requestsIn = withoutCode(user.requestsIn, code); user.requestsOut = withoutCode(user.requestsOut, code); };
  for (const { code } of cleanRequests(user.requestsOut)) {
    if (user.friends.includes(code)) { dropReq(code); changed = true; continue; }
    const pair = await env.FRIENDS.get(pairKey(user.code, code));
    if (pair === 'friends') { user.friends = [...new Set([...user.friends, code])]; dropReq(code); changed = true; continue; }
    if (await env.FRIENDS.get(reqKey(code, user.code))) {
      /* both sent a request at the same moment: that is a yes from both */
      const friend = hydrate(await loadUser(env, code));
      if (friend) { await befriend(env, user, friend); return true; }
    }
  }
  for (const { code } of cleanRequests(user.requestsIn)) {
    if (user.friends.includes(code) || (await env.FRIENDS.get(pairKey(user.code, code))) === 'friends') {
      user.friends = [...new Set([...user.friends, code])]; dropReq(code); changed = true;
    }
  }
  if (changed) await saveUser(env, user, LINKS);
  return changed;
}

async function ensurePublicId(env, user) {
  const existing = validPublicId(user && user.publicId);
  if (existing) {
    user.publicId = existing;
    return existing;
  }
  user.publicId = randomHex(8);
  await saveUser(env, user, [PROFILE]);
  return user.publicId;
}

async function readBody(request) {
  const text = await request.text();
  if (text.length > MAX_BODY) return { error: 'Request too large', status: 413 };
  try { return { body: JSON.parse(text) }; }
  catch { return { error: 'Malformed JSON body', status: 400 }; }
}

async function loadBoard(env) {
  try {
    const raw = await env.FRIENDS.get(BOARD_KEY);
    const b = raw ? JSON.parse(raw) : {};
    return b && typeof b === 'object' && !Array.isArray(b) ? b : {};
  } catch { return {}; }
}

async function loadRoom(env, code) {
  if (!code) return null;
  try {
    const raw = await env.FRIENDS.get(`room:${code}`);
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}

async function saveRoom(env, room) {
  await env.FRIENDS.put(`room:${room.room}`, JSON.stringify(room), { expirationTtl: ROOM_TTL_SECONDS });
}

function publicRoom(room) {
  return {
    room: room.room, show: room.show, level: room.level, host: room.host,
    status: room.status, createdAt: room.createdAt, startedAt: room.startedAt || null,
    players: (room.players || []).map((p) => ({ code: p.code, name: p.name, score: p.score || 0, finished: !!p.finished })),
  };
}

/* the leaderboard is public: a handle if the player set one, otherwise only
   the first word of their name, never a full name */
export function boardName(name, handle) {
  const h = typeof handle === 'string' ? handle.trim().replace(/^@+/, '').split(/\s+/)[0] : '';
  if (h) return h.slice(0, 24);
  const first = typeof name === 'string' ? name.trim().split(/\s+/)[0] || '' : '';
  return first.slice(0, 24);
}

function publicScore(entry, id) {
  return {
    id: id || '',
    name: boardName(entry.name, entry.handle),
    score: Number(entry.score) || 0,
    level: Number(entry.level) || 0,
    ts: Number(entry.ts) || 0,
  };
}

/* The whole board is one KV key, so two players saving at once could undo
   each other. edit(board) changes the board in place and returns true if it
   changed anything; it must be safe to run again. After a put, wait a moment,
   read again, and re-apply if another write took the change away. */
async function editBoard(env, edit) {
  for (let attempt = 0; attempt < 4; attempt += 1) {
    const board = await loadBoard(env);
    if (!edit(board)) return;
    await env.FRIENDS.put(BOARD_KEY, JSON.stringify(board));
    await settle(env);
    if (!edit(await loadBoard(env))) return;
  }
}

async function stampBoardId(env, code, publicId) {
  if (!code || !publicId) return;
  await editBoard(env, (board) => {
    let dirty = false;
    for (const rows of Object.values(board)) {
      if (!Array.isArray(rows)) continue;
      for (const entry of rows) {
        if (!entry || typeof entry !== 'object') continue;
        if (String(entry.code || '').trim().toUpperCase() !== code) continue;
        if (entry.id !== publicId) { entry.id = publicId; dirty = true; }
      }
    }
    return dirty;
  });
}

async function presentScoreList(env, list, limit) {
  const rows = Array.isArray(list) ? list : [];
  const out = [];
  for (const entry of rows) {
    if (!entry || typeof entry !== 'object') continue;
    let id = validPublicId(entry.id);
    if (!id) {
      const code = String(entry.code || '').trim().toUpperCase();
      if (code) {
        const user = await loadUser(env, code);
        id = validPublicId(user && user.publicId);
      }
    }
    out.push(publicScore(entry, id));
    if (out.length >= limit) break;
  }
  return out;
}

function friendView(me, friend) {
  const thread = (me.threads || {})[friend.code] || [];
  const unread = thread.filter((m) => m.from === friend.code && !m.read).length;
  const view = {
    code: friend.code,
    name: friend.name || '',
    stats: friend.stats || cleanStats(null),
    updatedAt: friend.updatedAt || 0,
    unread,
  };
  /* set only by an admin directly on the record; clients cannot set it */
  if (friend.verified === true) view.verified = true;
  const profile = {};
  for (const key of ['handle', 'city', 'bio', 'denomination', 'avatar_data', 'cover_data']) {
    if (typeof friend[key] === 'string' && friend[key]) {
      view[key] = friend[key];
      profile[key] = friend[key];
    }
  }
  if (Object.keys(profile).length) view.profile = profile;
  const squishies = publicSquishies(friend);
  if (squishies) view.squishies = squishies;
  return view;
}

async function authed(env, body) {
  const code = String(body?.code || '').trim().toUpperCase();
  const secret = String(body?.secret || '');
  const user = hydrate(await loadUser(env, code));
  if (!user) return { error: 'Unknown friend code', status: 404 };
  const hash = secret ? await sha256hex(secret) : '';
  if (!secret || !timingSafeEqual(hash, user.secretHash || '')) {
    return { error: 'Wrong account secret', status: 401 };
  }
  user.requestsIn = cleanRequests(user.requestsIn);
  user.requestsOut = cleanRequests(user.requestsOut);
  return { user };
}

const VERSE_TEXT_MAX = 500;
const VERSE_NOTE_MAX = 280;
const VERSE_REF_MAX = 80;
const VERSE_BOX_MAX = 100;
const VERSE_RATE = 30;
const STUDY_QUESTION_MAX = 400;
const STUDY_ANSWER_MAX = 2000;
const STUDY_VERSES_MAX = 6;
const STUDY_ENTRIES_MAX = 100;
const STUDY_RATE = 40;
const VERSE_READ_RATE = 200;
const STUDY_DELETE_RATE = 200;
const HOUR_MS = 60 * 60 * 1000;
const SCORE_MAX = 1000000;
export const RATE_LIMITS = {
  register: 80,
  signinCode: 10,
  sync: 60,
  msg: 60,
  note: 40,
  friendAdd: 40,
  shared: 20,
  scores: 60,
  friendChange: 120,
  noteChange: 600,
  sharedEdit: 300,
  room: 60,
};

function verseNumber(value, min, max) {
  if (typeof value === 'boolean' || value == null) return null;
  if (typeof value === 'string' && value.trim() === '') return null;
  const n = typeof value === 'number' ? value : Number(value);
  if (!Number.isInteger(n) || n < min || n > max) return null;
  return n;
}

function boundedText(value, max) {
  const raw = String(value ?? '');
  if (raw.length > max) return { error: 'That text is too long' };
  return { text: raw.trim() };
}

function clientIp(request) {
  const cf = request.headers.get('CF-Connecting-IP');
  if (cf) return cf.trim();
  const forwarded = request.headers.get('x-forwarded-for') || '';
  const first = forwarded.split(',')[0].trim();
  return first || 'unknown';
}

async function takeRate(env, key, limit) {
  const now = Date.now();
  let bucket = null;
  try { bucket = JSON.parse(await env.FRIENDS.get(key) || 'null'); } catch { bucket = null; }
  if (!bucket || typeof bucket.start !== 'number' || now - bucket.start >= HOUR_MS) bucket = { start: now, n: 0 };
  if (bucket.n >= limit) return false;
  bucket.n += 1;
  await env.FRIENDS.put(key, JSON.stringify(bucket));
  return true;
}

async function friendsBothWays(env, user, otherCode) {
  const code = String(otherCode || '').trim().toUpperCase();
  if (!code || code === user.code) return null;
  if (!(user.friends || []).includes(code)) return null;
  const other = hydrate(await loadUser(env, code));
  if (!other || !(other.friends || []).includes(user.code)) return null;
  return other;
}

async function loadVersebox(env, code) {
  const raw = await env.FRIENDS.get(`versebox:${code}`);
  if (!raw) return [];
  try {
    const data = JSON.parse(raw);
    return Array.isArray(data) ? data : [];
  } catch { return []; }
}

async function saveVersebox(env, code, items) {
  await env.FRIENDS.put(`versebox:${code}`, JSON.stringify(items.slice(0, VERSE_BOX_MAX)));
}

function otherParty(item, code) {
  if (!item) return '';
  return item.direction === 'out' ? item.to : item.from;
}

function studyStorageKey(a, b) {
  const pair = [String(a || '').trim().toUpperCase(), String(b || '').trim().toUpperCase()].sort();
  return { key: `study:${pair[0]}:${pair[1]}`, editors: pair };
}

async function loadStudy(env, a, b) {
  const { key, editors } = studyStorageKey(a, b);
  const raw = await env.FRIENDS.get(key);
  if (!raw) return { id: key, editors, entries: [], updatedAt: 0 };
  try {
    const note = JSON.parse(raw);
    if (!note || typeof note !== 'object') return { id: key, editors, entries: [], updatedAt: 0 };
    note.id = key;
    note.editors = editors;
    note.entries = Array.isArray(note.entries) ? note.entries : [];
    return note;
  } catch { return { id: key, editors, entries: [], updatedAt: 0 }; }
}

function cleanStudyVerses(input) {
  if (input == null) return { verses: [] };
  if (!Array.isArray(input)) return { error: 'Verse links are not valid' };
  if (input.length > STUDY_VERSES_MAX) return { error: 'Too many linked verses' };
  const verses = [];
  for (const item of input) {
    if (!item || typeof item !== 'object') return { error: 'Verse links are not valid' };
    const book = verseNumber(item.book, 1, 78);
    const chapter = verseNumber(item.chapter, 1, 200);
    const verse = verseNumber(item.verse, 1, 200);
    if (book == null || chapter == null || verse == null) return { error: 'Verse link is not valid' };
    const reference = boundedText(item.reference, VERSE_REF_MAX);
    if (reference.error) return { error: 'Reference is too long' };
    verses.push({ book, chapter, verse, reference: reference.text });
  }
  return { verses };
}

/* ---------- Bible squishies: public collection and the Trade Room ----------
   user.squishies → { ids: [known ids], public: bool, pending: [{ trade, give, get, ts }] }
     ids is what the phone last synced (checked against SQUISHY_IDS, capped).
     pending holds finished swaps the phone has not applied yet; a sync that
     still lists a squishy given away (or misses one received) is corrected.
   trade:<16 hex> → { id, from, to, names, status, offers, need, rev, checks,
                      note, createdAt, updatedAt, expiresAt, result }  TTL 2 h
     status: requested → open → done, or declined / cancelled / expired.
   trades:<code> → [trade ids], newest first, max TRADE_INDEX_MAX
   rate:trade:<code> → 30 trade requests per hour
   rate:trade-move:<code> → 600 board changes per hour
   rate:trade-read:<code> → 3600 state reads per hour (the board polls only while open)
   The board is live from the first tap: the asker can fill their side while
   the request waits, and the friend's first move on the board opens it. */
export const SQUISHY_IDS = ['lamb', 'dove', 'fish', 'lion', 'star', 'rainbow', 'stone', 'loaves', 'seed', 'bush', 'basket', 'tree', 'ark', 'coat',
  'ladder', 'raven', 'wheat', 'oil', 'coin', 'donkey', 'jar', 'crown', 'boat', 'tomb',
  'lily', 'key', 'pearl', 'manna', 'scroll', 'shofar', 'tablets', 'elephant', 'honeycomb', 'anchor', 'shield', 'chariot', 'lamp'];
/* everyone starts with these, so they are not traded; the lamp never is */
export const SQUISHY_STARTERS = ['lamb', 'dove', 'fish', 'lion', 'star', 'rainbow'];
export const SQUISHY_LEGENDARY = ['bush', 'tomb', 'chariot', 'tablets', 'lamp', 'shield'];
export const TRADE_RULES = {
  LEGEND_MIN: 5, NEED_MAX: 12, OFFER_MAX: 12, ACTIVE_MAX: 5, INDEX_MAX: 20,
  REQUEST_TTL_MS: 30 * 60 * 1000, OPEN_TTL_MS: 30 * 60 * 1000, MAX_LIFE_MS: 2 * 60 * 60 * 1000,
  RATE_REQUEST: 30, RATE_MOVE: 600, RATE_READ: 3600, PENDING_MAX: 20,
};
const TRADE_KV_TTL = 2 * 60 * 60;
const TRADE_ID = /^[a-f0-9]{16}$/;
const SIGNIN_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
/* sign-in codes are 8 characters from SIGNIN_ALPHABET; spaces and dashes are ignored */
export function cleanSigninCode(value) {
  const c = String(value ?? '').toUpperCase().replace(/[\s-]+/g, '');
  return c.length === 8 && [...c].every((ch) => SIGNIN_ALPHABET.includes(ch)) ? c : '';
}
export async function signinCodeKey(clean) { return `signin:${await sha256hex(`signin:${clean}`)}`; }
const FINAL_STATES = ['done', 'declined', 'cancelled', 'expired'];
export const tradableSquishy = (id) => SQUISHY_IDS.includes(id) && id !== 'lamp' && !SQUISHY_STARTERS.includes(id);

/* known ids only, no repeats, at most one of each */
export function cleanSquishyIds(input) {
  if (!Array.isArray(input)) return [];
  const out = [];
  for (const raw of input.slice(0, SQUISHY_IDS.length * 2)) {
    const id = typeof raw === 'string' ? raw.trim().toLowerCase() : '';
    if (SQUISHY_IDS.includes(id) && !out.includes(id)) out.push(id);
  }
  return out;
}

function squishyRecord(user) {
  const s = user.squishies && typeof user.squishies === 'object' && !Array.isArray(user.squishies) ? user.squishies : {};
  return {
    ids: cleanSquishyIds(s.ids),
    public: s.public !== false,
    pending: Array.isArray(s.pending) ? s.pending.filter((p) => p && TRADE_ID.test(p.trade)).slice(-TRADE_RULES.PENDING_MAX) : [],
    updatedAt: Number(s.updatedAt) || 0,
  };
}

/* a phone's list, corrected for finished swaps it has not applied yet */
function withPending(ids, pending) {
  let out = ids.slice();
  for (const p of pending) {
    out = out.filter((id) => !cleanSquishyIds(p.give).includes(id));
    for (const id of cleanSquishyIds(p.get)) if (!out.includes(id)) out.push(id);
  }
  return out;
}

/* sync: { squishies: { ids: [...], public: true|false } } */
export function applySquishies(user, input) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) return;
  const rec = squishyRecord(user);
  if (Array.isArray(input.ids)) rec.ids = withPending(cleanSquishyIds(input.ids), rec.pending);
  if (typeof input.public === 'boolean') rec.public = input.public;
  rec.updatedAt = Date.now();
  user.squishies = rec;
}

export function publicSquishies(user) {
  const rec = squishyRecord(user);
  return rec.public && rec.updatedAt ? rec.ids : null;
}

/* a side of the board: known, tradable, owned, not promised in another trade */
async function checkOffer(env, me, raw, tradeId) {
  if (!Array.isArray(raw) || raw.length > TRADE_RULES.OFFER_MAX) return { error: 'That offer is not valid', status: 400 };
  const offer = cleanSquishyIds(raw);
  if (offer.length !== raw.length) return { error: 'That offer is not valid', status: 400 };
  if (offer.includes('lamp')) return { error: 'The lamp can never be traded', reason: 'lamp', status: 400 };
  if (offer.some((id) => !tradableSquishy(id))) return { error: 'Starter squishies are not traded', reason: 'starter', status: 400 };
  const owned = squishyRecord(me).ids;
  if (offer.some((id) => !owned.includes(id))) return { error: 'You can only offer squishies you have', reason: 'owned', status: 400 };
  const locked = await lockedElsewhere(env, me.code, tradeId);
  if (offer.some((id) => locked.has(id))) return { error: 'That squishy is already in another trade', reason: 'locked', status: 409 };
  return { offer };
}

async function loadTrade(env, id) {
  if (!TRADE_ID.test(String(id || ''))) return null;
  try { const raw = await env.FRIENDS.get(`trade:${id}`); return raw ? JSON.parse(raw) : null; } catch { return null; }
}
async function saveTrade(env, t) {
  t.updatedAt = Date.now();
  await env.FRIENDS.put(`trade:${t.id}`, JSON.stringify(t), { expirationTtl: TRADE_KV_TTL });
}
/* Each person's ✓ lives in its own key that only they write, so two people
   pressing ✓ at the same moment can no longer overwrite each other's ✓ in the
   shared trade record. The value is the board rev they agreed to. */
const checkKey = (id, code) => `tc:${id}:${code}`;
async function loadChecks(env, t) {
  const out = {};
  for (const code of [t.from, t.to]) {
    let v = 0;
    try { v = Number(await env.FRIENDS.get(checkKey(t.id, code))) || 0; } catch { v = 0; }
    out[code] = Math.max(v, Number(t.checks && t.checks[code]) || 0);
  }
  return out;
}
const bothChecked = (t, checks) => checks[t.from] === t.rev && checks[t.to] === t.rev;
/* how long a ✓ waits for the other person's ✓ to land before it answers */
const TRADE_SETTLE_MS = 300;
const tradeSettle = (env) => { const ms = env.TRADE_SETTLE_MS ?? TRADE_SETTLE_MS; return ms > 0 ? new Promise((r) => setTimeout(r, ms / 2 + Math.random() * ms)) : Promise.resolve(); };

async function loadTradeIndex(env, code) {
  try { const v = JSON.parse(await env.FRIENDS.get(`trades:${code}`) || '[]'); return Array.isArray(v) ? v.filter((x) => TRADE_ID.test(x)) : []; } catch { return []; }
}
async function addTradeIndex(env, code, id) {
  const list = [id, ...(await loadTradeIndex(env, code)).filter((x) => x !== id)].slice(0, TRADE_RULES.INDEX_MAX);
  await env.FRIENDS.put(`trades:${code}`, JSON.stringify(list), { expirationTtl: TRADE_KV_TTL });
}
function expireIfOld(t, now = Date.now()) {
  if (t && !FINAL_STATES.includes(t.status) && now > t.expiresAt) { t.status = 'expired'; return true; }
  return false;
}
const otherSide = (t, code) => (t.from === code ? t.to : t.from);
const isParty = (t, code) => !!t && (t.from === code || t.to === code);

/* what each side needs from the other: 5 or more for each side that offers a
   legendary (the owner may ask for more); 1 otherwise */
export function tradeCheck(t) {
  const [a, b] = [t.from, t.to];
  const offerA = t.offers[a] || [], offerB = t.offers[b] || [];
  const needFrom = (owner, offer) => (offer.some((id) => SQUISHY_LEGENDARY.includes(id)) ? Math.max(TRADE_RULES.LEGEND_MIN, Number(t.need[owner]) || 0) : Math.max(1, Number(t.need[owner]) || 0));
  const wantB = needFrom(a, offerA), wantA = needFrom(b, offerB);
  const problems = [];
  if (!offerA.length || !offerB.length) problems.push('empty');
  if (offerA.length && offerB.length < wantB) problems.push(`need:${b}:${wantB}`);
  if (offerB.length && offerA.length < wantA) problems.push(`need:${a}:${wantA}`);
  return { ok: !problems.length, problems, want: { [b]: wantB, [a]: wantA } };
}

function tradeView(t, code) {
  const check = tradeCheck(t);
  return {
    id: t.id, status: t.status, from: t.from, to: t.to, names: t.names, me: code, other: otherSide(t, code),
    offers: t.offers, need: t.need, rev: t.rev, checks: t.checks, note: t.note || null,
    want: check.want, ready: check.ok, problems: check.problems,
    createdAt: t.createdAt, updatedAt: t.updatedAt, expiresAt: t.expiresAt, result: t.result || null,
  };
}

/* ids this user has promised in another open trade */
async function lockedElsewhere(env, code, exceptId) {
  const out = new Set();
  for (const id of await loadTradeIndex(env, code)) {
    if (id === exceptId) continue;
    const t = await loadTrade(env, id);
    if (!t || expireIfOld(t) || FINAL_STATES.includes(t.status)) continue;
    for (const s of t.offers[code] || []) out.add(s);
  }
  return out;
}
async function activeTrades(env, code) {
  const out = [];
  for (const id of await loadTradeIndex(env, code)) {
    const t = await loadTrade(env, id);
    if (t && !expireIfOld(t) && !FINAL_STATES.includes(t.status)) out.push(t);
  }
  return out;
}

/* Both pressed ✓ on this exact board: check ownership again, then swap. Safe
   to run twice at once (both confirms, or a confirm and a look): a side whose
   record already holds this swap is not checked or changed again. */
async function finishTrade(env, t0, me0, now) {
  const t = (await loadTrade(env, t0.id)) || t0;
  const me = hydrate(await loadUser(env, me0.code)) || me0;
  t.checks = await loadChecks(env, t);
  if (t.status === 'done') return [{ ok: true, trade: tradeView(t, me.code) }];
  if (t.status !== 'open' || !bothChecked(t, t.checks)) return [{ ok: true, trade: tradeView(t, me.code) }];
  const other = otherSide(t, me.code);
  const friend = await friendsBothWays(env, me, other);
  if (!friend) return [{ error: 'You are not friends' }, 403];
  const users = { [me.code]: me, [friend.code]: friend };
  const applied = (code) => squishyRecord(users[code]).pending.some((p) => p.trade === t.id);
  for (const code of [t.from, t.to]) {
    if (applied(code) || applied(otherSide(t, code))) continue;
    const owner = squishyRecord(users[code]), receiver = squishyRecord(users[otherSide(t, code)]);
    const locked = await lockedElsewhere(env, code, t.id);
    const give = t.offers[code];
    const bad = give.some((id) => !owner.ids.includes(id) || locked.has(id)) ? 'owned' : give.some((id) => receiver.ids.includes(id)) ? 'already' : '';
    if (bad) {
      const latest = await loadTrade(env, t.id);
      if (latest && latest.status === 'done') { latest.checks = await loadChecks(env, latest); return [{ ok: true, trade: tradeView(latest, me.code) }]; }
      t.checks = { [t.from]: 0, [t.to]: 0 };
      t.rev += 1;
      await saveTrade(env, t);
      return [{ error: bad === 'owned' ? 'A squishy on the board is not available any more' : 'Your friend already has one of those squishies', reason: bad, trade: tradeView(t, me.code) }, 409];
    }
  }
  /* mark it done first so a later confirm cannot swap twice */
  t.status = 'done';
  t.expiresAt = Math.min(t.createdAt + TRADE_RULES.MAX_LIFE_MS, now + TRADE_RULES.OPEN_TTL_MS);
  t.result = { [t.from]: { give: t.offers[t.from], get: t.offers[t.to] }, [t.to]: { give: t.offers[t.to], get: t.offers[t.from] }, ts: now };
  await saveTrade(env, t);
  for (const code of [t.from, t.to]) {
    if (applied(code)) continue;
    const u = users[code], rec = squishyRecord(u), r = t.result[code];
    rec.ids = withPending(rec.ids, [{ give: r.give, get: r.get }]);
    rec.pending = [...rec.pending, { trade: t.id, give: r.give, get: r.get, ts: now }].slice(-TRADE_RULES.PENDING_MAX);
    rec.updatedAt = now;
    u.squishies = rec;
    await saveUser(env, u, ['squishies']);
  }
  return [{ ok: true, trade: tradeView(t, me.code) }];
}

export async function handleTrade(path, body, env, authedUser) {
  const a = await authedUser(env, body);
  if (a.error) return [{ error: a.error }, a.status];
  const me = a.user, now = Date.now();

  if (path === '/trade/list') {
    if (!(await takeRate(env, `rate:trade-read:${me.code}`, TRADE_RULES.RATE_READ))) return [{ error: 'Too many trade checks this hour' }, 429];
    const list = [];
    for (const id of await loadTradeIndex(env, me.code)) {
      let t = await loadTrade(env, id);
      if (!t) continue;
      if (expireIfOld(t, now)) await saveTrade(env, t);
      if (t.status === 'open') {
        t.checks = await loadChecks(env, t);
        if (bothChecked(t, t.checks)) { const [done] = await finishTrade(env, t, me, now); if (done && done.trade) { list.push(done.trade); continue; } t = (await loadTrade(env, id)) || t; }
      }
      list.push(tradeView(t, me.code));
    }
    return [{ trades: list, pending: squishyRecord(me).pending }];
  }

  if (path === '/trade/request') {
    if (!(await takeRate(env, `rate:trade:${me.code}`, TRADE_RULES.RATE_REQUEST))) return [{ error: 'Too many trade requests this hour' }, 429];
    const friend = await friendsBothWays(env, me, body?.with);
    if (!friend) return [{ error: 'You are not friends' }, 403];
    const mine = await activeTrades(env, me.code), theirs = await activeTrades(env, friend.code);
    const same = mine.find((t) => isParty(t, friend.code));
    if (same) return [{ ok: true, trade: tradeView(same, me.code), existing: true }];
    if (mine.length >= TRADE_RULES.ACTIVE_MAX) return [{ error: 'You have too many open trades' }, 429];
    if (theirs.length >= TRADE_RULES.ACTIVE_MAX) return [{ error: 'Your friend has too many open trades' }, 429];
    let first = [];
    if (body && Object.prototype.hasOwnProperty.call(body, 'offer')) {
      const c = await checkOffer(env, me, body.offer, null);
      if (c.error) return [{ error: c.error, ...(c.reason ? { reason: c.reason } : {}) }, c.status];
      first = c.offer;
    }
    const t = {
      id: randomHex(8), from: me.code, to: friend.code, names: { [me.code]: me.name || 'Friend', [friend.code]: friend.name || 'Friend' },
      status: 'requested', offers: { [me.code]: first, [friend.code]: [] }, need: { [me.code]: first.some((id) => SQUISHY_LEGENDARY.includes(id)) ? TRADE_RULES.LEGEND_MIN : 0, [friend.code]: 0 },
      rev: 1, checks: { [me.code]: 0, [friend.code]: 0 }, note: null, createdAt: now, updatedAt: now, expiresAt: now + TRADE_RULES.REQUEST_TTL_MS,
    };
    await saveTrade(env, t);
    await addTradeIndex(env, me.code, t.id);
    await addTradeIndex(env, friend.code, t.id);
    return [{ ok: true, trade: tradeView(t, me.code) }];
  }

  /* a gift from the app admin has no trade behind it: it stays in pending so
     every phone that signs in to this account receives it once */
  if (path === '/trade/ack' && squishyRecord(me).pending.some((p) => p.trade === body?.trade && p.gift === true)) return [{ ok: true }];
  const t = await loadTrade(env, body?.trade);
  if (!t || !isParty(t, me.code)) return [{ error: 'Trade not found' }, 404];
  if (!FINAL_STATES.includes(t.status)) t.checks = await loadChecks(env, t);
  if (expireIfOld(t, now)) { await saveTrade(env, t); return [{ error: 'This trade has expired', trade: tradeView(t, me.code) }, 410]; }

  if (path === '/trade/state') {
    if (!(await takeRate(env, `rate:trade-read:${me.code}`, TRADE_RULES.RATE_READ))) return [{ error: 'Too many trade checks this hour' }, 429];
    if (t.status === 'open') {
      t.checks = await loadChecks(env, t);
      /* both ✓ landed but neither confirm saw the other's (KV is slow to
         spread between places): the next look finishes the swap */
      if (bothChecked(t, t.checks)) { const [done, code] = await finishTrade(env, t, me, now); return [done.trade ? { trade: done.trade, ...(done.error ? { error: done.error, reason: done.reason } : {}) } : done, done.trade ? 200 : code]; }
    }
    return [{ trade: tradeView(t, me.code) }];
  }

  if (path === '/trade/ack') {
    const rec = squishyRecord(me);
    rec.pending = rec.pending.filter((p) => p.trade !== t.id);
    me.squishies = rec;
    await saveUser(env, me, ['squishies']);
    return [{ ok: true }];
  }

  if (FINAL_STATES.includes(t.status)) return [{ error: 'This trade is over', trade: tradeView(t, me.code) }, 409];
  if (!(await takeRate(env, `rate:trade-move:${me.code}`, TRADE_RULES.RATE_MOVE))) return [{ error: 'Too many trade moves this hour' }, 429];

  if (path === '/trade/cancel') {
    t.status = t.status === 'requested' && t.to === me.code ? 'declined' : 'cancelled';
    t.note = { by: me.code, kind: t.status, ts: now };
    await saveTrade(env, t);
    return [{ ok: true, trade: tradeView(t, me.code) }];
  }

  if (path === '/trade/accept') {
    if (t.to !== me.code || t.status !== 'requested') return [{ error: 'Only your friend can open this trade' }, 409];
    t.status = 'open';
    t.expiresAt = Math.min(t.createdAt + TRADE_RULES.MAX_LIFE_MS, now + TRADE_RULES.OPEN_TTL_MS);
    t.rev += 1;
    await saveTrade(env, t);
    return [{ ok: true, trade: tradeView(t, me.code) }];
  }

  /* a live board from the first tap: while the request waits, the asker may
     change their side, and the friend's first move on the board opens it */
  let opened = false;
  if (path === '/trade/update' && t.status === 'requested') {
    if (t.to === me.code) {
      opened = true;
      t.status = 'open';
      t.expiresAt = Math.min(t.createdAt + TRADE_RULES.MAX_LIFE_MS, now + TRADE_RULES.OPEN_TTL_MS);
      t.rev += 1;
    } else if (body?.ask === 'more') return [{ error: 'The trade room is not open yet' }, 409];
  }
  if (t.status !== 'open' && !(path === '/trade/update' && t.status === 'requested')) return [{ error: 'The trade room is not open yet' }, 409];
  const touch = () => { t.expiresAt = Math.min(t.createdAt + TRADE_RULES.MAX_LIFE_MS, now + TRADE_RULES.OPEN_TTL_MS); };

  if (path === '/trade/update') {
    /* your own offer, how many you want back, or "more please" */
    let changed = false;
    if (body && Object.prototype.hasOwnProperty.call(body, 'offer')) {
      const c = await checkOffer(env, me, body.offer, t.id);
      if (c.error) return [{ error: c.error, ...(c.reason ? { reason: c.reason } : {}) }, c.status];
      const offer = c.offer;
      if (offer.join() !== (t.offers[me.code] || []).join()) { t.offers[me.code] = offer; changed = true; }
    }
    if (body && Object.prototype.hasOwnProperty.call(body, 'need')) {
      const n = Number(body.need);
      if (!Number.isInteger(n) || n < 0 || n > TRADE_RULES.NEED_MAX) return [{ error: 'That number is not valid' }, 400];
      if (n !== t.need[me.code]) { t.need[me.code] = n; changed = true; }
    }
    if (body?.ask === 'more') { t.note = { by: me.code, kind: 'more', ts: now }; changed = true; }
    if (changed) {
      t.rev += 1;
      t.checks = { [t.from]: 0, [t.to]: 0 };
      if (body?.ask !== 'more') t.note = null;
      touch();
      await saveTrade(env, t);
    } else if (opened) await saveTrade(env, t);
    return [{ ok: true, trade: tradeView(t, me.code) }];
  }

  if (path === '/trade/confirm') {
    t.checks = await loadChecks(env, t);
    if (Number(body?.rev) !== t.rev) return [{ error: 'The board changed. Look again before you press ✓.', reason: 'changed', trade: tradeView(t, me.code) }, 409];
    const check = tradeCheck(t);
    if (!check.ok) return [{ error: 'This trade is not fair yet', reason: check.problems[0], trade: tradeView(t, me.code) }, 400];
    await env.FRIENDS.put(checkKey(t.id, me.code), String(t.rev), { expirationTtl: TRADE_KV_TTL });
    t.checks[me.code] = t.rev;
    if (!bothChecked(t, t.checks)) {
      /* the other ✓ may be on its way right now: give it a moment, then look again */
      await tradeSettle(env);
      const fresh = await loadTrade(env, t.id);
      if (!fresh || fresh.rev !== t.rev || fresh.status !== 'open') { const v = fresh || t; v.checks = await loadChecks(env, v); return [{ ok: true, trade: tradeView(v, me.code) }]; }
      t.checks = await loadChecks(env, t);
      t.checks[me.code] = t.rev;
      if (!bothChecked(t, t.checks)) return [{ ok: true, trade: tradeView(t, me.code) }];
    }
    return finishTrade(env, t, me, now);
  }

  return [{ error: 'Not found' }, 404];
}

/* every per-person rate bucket, so a deleted account leaves no keys behind */
const RATE_NAMES = ['account-delete', 'friend-add', 'friend-change', 'lessons', 'lessons-hide', 'lessons-read', 'msg', 'mynotes', 'mynotes-hide', 'mynotes-read', 'note', 'note-change', 'room', 'scores', 'shared', 'shared-edit', 'study', 'study-delete', 'sync', 'trade', 'trade-move', 'trade-read', 'verse', 'verse-read'];

/* Delete an account and what it left with friends: the user record, saved
   lessons and notes, trades, friend links on both sides (with the messages,
   notes, verses and shared notebooks between them) and leaderboard rows.
   The user record goes last, so a delete that stops part way can be run again. */
async function deleteAccount(env, user) {
  const me = user.code;
  const others = new Set([...(user.friends || []), ...cleanRequests(user.requestsIn).map((r) => r.code), ...cleanRequests(user.requestsOut).map((r) => r.code)]);
  for (const id of user.shared || []) {
    try { const n = JSON.parse((await env.FRIENDS.get(`shared:${id}`)) || 'null'); if (n && Array.isArray(n.editors)) for (const c of n.editors) if (c !== me) others.add(c); } catch { /* skip */ }
  }
  for (const v of await loadVersebox(env, me)) { const c = otherParty(v, me); if (c) others.add(c); }
  others.delete(me);
  /* trades: cancel the open ones so the friend's board closes, then drop them */
  for (const id of await loadTradeIndex(env, me)) {
    const t = await loadTrade(env, id);
    if (t && isParty(t, me)) { others.add(otherSide(t, me)); if (!FINAL_STATES.includes(t.status)) { t.status = 'cancelled'; t.note = { by: me, kind: 'cancelled', ts: Date.now() }; await saveTrade(env, t); } }
    await env.FRIENDS.delete(checkKey(id, me));
  }
  await env.FRIENDS.delete(`trades:${me}`);
  for (const code of others) {
    if (!/^[A-Z0-9-]{4,24}$/.test(code)) continue;
    const f = hydrate(await loadUser(env, code));
    if (f) {
      f.friends = (f.friends || []).filter((c) => c !== me);
      f.requestsIn = withoutCode(f.requestsIn, me);
      f.requestsOut = withoutCode(f.requestsOut, me);
      f.shared = (f.shared || []).filter((id) => !(user.shared || []).includes(id));
      const own = [...LINKS, 'shared'];
      for (const n of f.inbox || []) if (n && n.from === me) own.push(`inbox-${n.id}`);
      f.inbox = (f.inbox || []).filter((n) => !(n && n.from === me));
      if (f.threads && f.threads[me]) { f.threads = { ...f.threads }; delete f.threads[me]; own.push('threads'); }
      await saveUser(env, f, own, false);
      const box = await loadVersebox(env, code);
      const kept = box.filter((v) => otherParty(v, code) !== me);
      if (kept.length !== box.length) await saveVersebox(env, code, kept);
    }
    await env.FRIENDS.delete(pairKey(me, code));
    await env.FRIENDS.delete(reqKey(me, code));
    await env.FRIENDS.delete(reqKey(code, me));
    await env.FRIENDS.delete(studyStorageKey(me, code).key);
  }
  for (const id of user.shared || []) await env.FRIENDS.delete(`shared:${id}`);
  await editBoard(env, (board) => {
    let dirty = false;
    for (const show of Object.keys(board)) {
      if (!Array.isArray(board[show])) continue;
      const kept = board[show].filter((e) => !(e && (String(e.code || '').toUpperCase() === me || (user.publicId && e.id === user.publicId))));
      if (kept.length !== board[show].length) { board[show] = kept; dirty = true; }
    }
    return dirty;
  });
  for (const k of [`versebox:${me}`, `lessons:${me}`, `mynotes:${me}`]) await env.FRIENDS.delete(k);
  for (const r of RATE_NAMES) await env.FRIENDS.delete(`rate:${r}:${me}`);
  await env.FRIENDS.delete(`user:${me}`);
}

export async function handleFriends(request, env) {
  const origin = allowedOrigin(request);
  const reply = (data, status = 200) => json(data, status, origin);
  try {
    const url = new URL(request.url);
    if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: { ...SECURITY_HEADERS, ...corsHeaders(origin) } });
    if (url.pathname === '/health' && request.method === 'GET') return reply({ ok: true });
    if (url.pathname === '/recovery-email' && (request.method === 'GET' || request.method === 'POST')) {
      return reply({
        ready: false,
        configured: false,
        sent: false,
        error: 'No mailbox or sending key is configured. No recovery email was sent.',
      });
    }
    if (url.pathname === '/scores' && request.method === 'GET') {
      const board = await loadBoard(env);
      const want = String(url.searchParams.get('show') || '').toLowerCase();
      if (want) {
        if (!SHOWS.includes(want)) return reply({ error: 'Unknown game' }, 400);
        return reply({ show: want, scores: await presentScoreList(env, board[want], 20) });
      }
      const all = {};
      for (const s of SHOWS) all[s] = await presentScoreList(env, board[s], 10);
      return reply({ scores: all });
    }
    if (url.pathname === '/push/key' && request.method === 'GET') return reply({ key: env.VAPID_PUBLIC_KEY || null });
    if (request.method !== 'POST') return reply({ error: 'Not found' }, 404);

    const { body, error, status } = await readBody(request);
    if (error) return reply({ error }, status);

    if (url.pathname.startsWith('/push/')) {
      const [data, code = 200] = await handlePush(url.pathname, body, env, clientIp(request));
      return reply(data, code);
    }

    if (url.pathname === '/register') {
      if (!(await takeRate(env, `rate:register:${clientIp(request)}`, RATE_LIMITS.register))) return reply({ error: 'Too many new friend codes this hour' }, 429);
      const name = cleanName(body?.name) || 'Friend';
      let code = null;
      for (let i = 0; i < 6 && !code; i++) {
        const candidate = newCode();
        if (!(await env.FRIENDS.get(`user:${candidate}`))) code = candidate;
      }
      if (!code) return reply({ error: 'Could not allocate a friend code' }, 500);
      const secret = randomHex(16);
      const user = {
        code, name, secretHash: await sha256hex(secret), publicId: randomHex(8),
        stats: cleanStats(null), friends: [], inbox: [], outbox: [], threads: {}, shared: [],
        requestsIn: [], requestsOut: [], updatedAt: Date.now(),
      };
      await env.FRIENDS.put(`user:${code}`, JSON.stringify(user));
      return reply({ code, secret, publicId: user.publicId });
    }

    /* One-time sign-in code: the app admin stores signin:<sha256> in KV (see
       signinCodeKey) with a 48 hour TTL. Typing the code on any phone gives
       that phone a fresh account secret and the public profile to show, so
       nobody has to type the long secret. Single use, hashed, rate-limited. */
    if (url.pathname === '/signin-code/redeem') {
      if (!(await takeRate(env, `rate:signin-code:${clientIp(request)}`, RATE_LIMITS.signinCode))) return reply({ error: 'Too many tries this hour. Wait a while and try again.' }, 429);
      const typed = cleanSigninCode(body?.signinCode);
      if (!typed) return reply({ error: 'That sign-in code is not right. Check it and try again.' }, 400);
      const key = await signinCodeKey(typed);
      let grant = null; try { grant = JSON.parse(await env.FRIENDS.get(key) || 'null'); } catch { grant = null; }
      if (!grant || typeof grant.code !== 'string' || !(Number(grant.exp) > Date.now())) return reply({ error: 'That sign-in code is not right or has expired. Ask for a new one.' }, 404);
      await env.FRIENDS.delete(key);
      const user = hydrate(await loadUser(env, grant.code));
      if (!user) return reply({ error: 'That sign-in code is not right or has expired. Ask for a new one.' }, 404);
      const secret = randomHex(16);
      user.secretHash = await sha256hex(secret);
      const publicId = await ensurePublicId(env, user);
      const own = ['secretHash'];
      if (user.publicId !== publicId) { user.publicId = publicId; own.push('publicId'); }
      await saveUser(env, user, own);
      const profile = {};
      for (const k of ['name', 'handle', 'city', 'bio', 'denomination', 'avatar_data', 'cover_data']) if (typeof user[k] === 'string' && user[k]) profile[k] = user[k];
      return reply({ ok: true, code: user.code, secret, publicId, profile, ...(user.verified === true ? { verified: true } : {}) });
    }

    if (url.pathname === '/sync') {
      const a = await authed(env, body);
      if (a.error) return reply({ error: a.error }, a.status);
      if (!(await takeRate(env, `rate:sync:${a.user.code}`, RATE_LIMITS.sync))) return reply({ error: 'Too many syncs this hour' }, 429);
      if (body?.name !== undefined) a.user.name = cleanName(body.name) || a.user.name;
      if (body && Object.prototype.hasOwnProperty.call(body, 'stats')) a.user.stats = cleanStats(body.stats);
      const warnings = applyProfile(a.user, body || {});
      if (body && Object.prototype.hasOwnProperty.call(body, 'squishies')) applySquishies(a.user, body.squishies);
      const publicId = await ensurePublicId(env, a.user);
      if (a.user.publicId !== publicId) a.user.publicId = publicId;
      await saveUser(env, a.user, body && Object.prototype.hasOwnProperty.call(body, 'squishies') ? [PROFILE, 'squishies'] : [PROFILE]);
      await stampBoardId(env, a.user.code, publicId);
      const squishyPending = squishyRecord(a.user).pending;
      return reply({ ok: true, publicId, ...(a.user.verified === true ? { verified: true } : {}), ...(squishyPending.length ? { squishyPending } : {}), ...(warnings.length ? { warning: warnings.join(' ') } : {}) });
    }

    if (url.pathname === '/account/delete') {
      const a = await authed(env, body);
      if (a.error) return reply({ error: a.error }, a.status);
      if (body?.confirm !== 'DELETE') return reply({ error: 'Send confirm: "DELETE" to delete this account' }, 400);
      if (!(await takeRate(env, `rate:account-delete:${a.user.code}`, 10))) return reply({ error: 'Too many tries this hour' }, 429);
      await deleteAccount(env, a.user);
      return reply({ ok: true, deleted: a.user.code });
    }

    if (url.pathname === '/friends') {
      const a = await authed(env, body);
      if (a.error) return reply({ error: a.error }, a.status);
      await healLinks(env, a.user);
      const out = [];
      let dropped = false;
      for (const code of [...(a.user.friends || [])]) {
        const friend = hydrate(await loadUser(env, code));
        if (!friend) continue;
        if (!friend.friends.includes(a.user.code)) {
          /* half a link: the pair key says which half is right (old pairs have none) */
          const pair = await env.FRIENDS.get(pairKey(a.user.code, code));
          if (pair === 'removed') { a.user.friends = a.user.friends.filter((c) => c !== code); dropped = true; continue; }
          if (pair === 'friends') { friend.friends = [...new Set([...friend.friends, a.user.code])]; await saveUser(env, friend, LINKS); }
        }
        out.push(friendView(a.user, friend));
      }
      if (dropped) await saveUser(env, a.user, LINKS);
      return reply(out);
    }

    if (url.pathname === '/friend/add') {
      const a = await authed(env, body);
      if (a.error) return reply({ error: a.error }, a.status);
      if (!(await takeRate(env, `rate:friend-add:${a.user.code}`, RATE_LIMITS.friendAdd))) return reply({ error: 'Too many friend requests this hour' }, 429);
      const friendCode = String(body?.friendCode || '').trim().toUpperCase();
      if (!friendCode) return reply({ error: 'Missing friendCode' }, 400);
      if (friendCode === a.user.code) return reply({ error: 'You cannot add yourself' }, 400);
      const friend = hydrate(await loadUser(env, friendCode));
      if (!friend) return reply({ error: 'No user with that friend code' }, 404);
      if ((a.user.friends || []).includes(friendCode)) return reply({ ok: true, status: 'friends' });
      /* my side of the request goes in a key only I write, before anything else,
         so two people adding each other at once both see it */
      if (friend.friends.includes(a.user.code) && (await env.FRIENDS.get(pairKey(a.user.code, friendCode))) === 'friends') {
        await befriend(env, a.user, friend);
        return reply({ ok: true, status: 'friends' });
      }
      await env.FRIENDS.put(reqKey(a.user.code, friendCode), String(Date.now()), { expirationTtl: REQ_TTL_SECONDS });
      const theyAsked = hasRequest(a.user.requestsIn, friendCode) || hasRequest(friend.requestsOut, a.user.code) || !!(await env.FRIENDS.get(reqKey(friendCode, a.user.code)));
      if (theyAsked) {
        await befriend(env, a.user, friend);
        return reply({ ok: true, status: 'friends' });
      }
      if (hasRequest(a.user.requestsOut, friendCode)) {
        if (!hasRequest(friend.requestsIn, a.user.code)) {
          const existing = cleanRequests(a.user.requestsOut).find((item) => item.code === friendCode);
          friend.requestsIn = [{ code: a.user.code, name: a.user.name || 'Friend', ts: existing?.ts || Date.now() }, ...withoutCode(friend.requestsIn, a.user.code)];
          await saveUser(env, friend, LINKS);
        }
        return reply({ ok: true, status: 'pending' });
      }
      if (cleanRequests(friend.requestsIn).length >= REQUEST_MAX) { await env.FRIENDS.delete(reqKey(a.user.code, friendCode)); return reply({ error: INBOX_FULL }, 409); }
      if (cleanRequests(a.user.requestsOut).length >= REQUEST_MAX) { await env.FRIENDS.delete(reqKey(a.user.code, friendCode)); return reply({ error: OUTBOX_FULL }, 409); }
      const ts = Date.now();
      a.user.requestsOut = [{ code: friend.code, name: friend.name || 'Friend', ts }, ...withoutCode(a.user.requestsOut, friend.code)];
      friend.requestsIn = [{ code: a.user.code, name: a.user.name || 'Friend', ts }, ...withoutCode(friend.requestsIn, a.user.code)];
      await saveUser(env, a.user, LINKS);
      await saveUser(env, friend, LINKS);
      /* the other side may have asked while this request was being written */
      if (await env.FRIENDS.get(reqKey(friendCode, a.user.code))) {
        const fresh = hydrate(await loadUser(env, friendCode)) || friend;
        await befriend(env, a.user, fresh);
        return reply({ ok: true, status: 'friends' });
      }
      return reply({ ok: true, status: 'pending' });
    }

    if (url.pathname === '/friend/requests') {
      const a = await authed(env, body);
      if (a.error) return reply({ error: a.error }, a.status);
      await healLinks(env, a.user);
      return reply({ incoming: cleanRequests(a.user.requestsIn), outgoing: cleanRequests(a.user.requestsOut) });
    }

    if (url.pathname === '/friend/accept') {
      const a = await authed(env, body);
      if (a.error) return reply({ error: a.error }, a.status);
      if (!(await takeRate(env, `rate:friend-change:${a.user.code}`, RATE_LIMITS.friendChange))) return reply({ error: 'Too many friend changes this hour' }, 429);
      const friendCode = String(body?.friendCode || '').trim().toUpperCase();
      if (!friendCode) return reply({ error: 'Missing friendCode' }, 400);
      if ((a.user.friends || []).includes(friendCode)) return reply({ ok: true, status: 'friends' });
      /* the request may be missing from my record if a save raced; their key still counts */
      if (!hasRequest(a.user.requestsIn, friendCode) && !(await env.FRIENDS.get(reqKey(friendCode, a.user.code)))) return reply({ error: 'Request not found' }, 404);
      const friend = hydrate(await loadUser(env, friendCode));
      if (!friend) return reply({ error: 'No user with that friend code' }, 404);
      await befriend(env, a.user, friend);
      return reply({ ok: true, status: 'friends' });
    }

    if (url.pathname === '/friend/decline') {
      const a = await authed(env, body);
      if (a.error) return reply({ error: a.error }, a.status);
      if (!(await takeRate(env, `rate:friend-change:${a.user.code}`, RATE_LIMITS.friendChange))) return reply({ error: 'Too many friend changes this hour' }, 429);
      const friendCode = String(body?.friendCode || '').trim().toUpperCase();
      if (!friendCode) return reply({ error: 'Missing friendCode' }, 400);
      if (!hasRequest(a.user.requestsIn, friendCode)) return reply({ error: 'Request not found' }, 404);
      a.user.requestsIn = withoutCode(a.user.requestsIn, friendCode);
      await saveUser(env, a.user, LINKS);
      await env.FRIENDS.delete(reqKey(friendCode, a.user.code));
      const friend = hydrate(await loadUser(env, friendCode));
      if (friend) {
        friend.requestsOut = withoutCode(friend.requestsOut, a.user.code);
        await saveUser(env, friend, LINKS);
      }
      return reply({ ok: true });
    }

    if (url.pathname === '/friend/cancel') {
      const a = await authed(env, body);
      if (a.error) return reply({ error: a.error }, a.status);
      if (!(await takeRate(env, `rate:friend-change:${a.user.code}`, RATE_LIMITS.friendChange))) return reply({ error: 'Too many friend changes this hour' }, 429);
      const friendCode = String(body?.friendCode || '').trim().toUpperCase();
      if (!friendCode) return reply({ error: 'Missing friendCode' }, 400);
      if (!hasRequest(a.user.requestsOut, friendCode)) return reply({ error: 'Request not found' }, 404);
      a.user.requestsOut = withoutCode(a.user.requestsOut, friendCode);
      await saveUser(env, a.user, LINKS);
      await env.FRIENDS.delete(reqKey(a.user.code, friendCode));
      const friend = hydrate(await loadUser(env, friendCode));
      if (friend) {
        friend.requestsIn = withoutCode(friend.requestsIn, a.user.code);
        await saveUser(env, friend, LINKS);
      }
      return reply({ ok: true });
    }

    if (url.pathname === '/friend/remove') {
      const a = await authed(env, body);
      if (a.error) return reply({ error: a.error }, a.status);
      if (!(await takeRate(env, `rate:friend-change:${a.user.code}`, RATE_LIMITS.friendChange))) return reply({ error: 'Too many friend changes this hour' }, 429);
      const friendCode = String(body?.friendCode || '').trim().toUpperCase();
      if (!friendCode) return reply({ error: 'Missing friendCode' }, 400);
      a.user.friends = (a.user.friends || []).filter((c) => c !== friendCode);
      a.user.requestsIn = withoutCode(a.user.requestsIn, friendCode);
      a.user.requestsOut = withoutCode(a.user.requestsOut, friendCode);
      await saveUser(env, a.user, LINKS);
      await env.FRIENDS.put(pairKey(a.user.code, friendCode), 'removed');
      await env.FRIENDS.delete(reqKey(a.user.code, friendCode));
      await env.FRIENDS.delete(reqKey(friendCode, a.user.code));
      const friend = hydrate(await loadUser(env, friendCode));
      if (friend) {
        friend.friends = (friend.friends || []).filter((c) => c !== a.user.code);
        friend.requestsIn = withoutCode(friend.requestsIn, a.user.code);
        friend.requestsOut = withoutCode(friend.requestsOut, a.user.code);
        await saveUser(env, friend, LINKS);
      }
      return reply({ ok: true });
    }

    if (url.pathname === '/note/send') {
      const a = await authed(env, body);
      if (a.error) return reply({ error: a.error }, a.status);
      const to = String(body?.to || '').trim().toUpperCase();
      if (!to) return reply({ error: 'Missing recipient code' }, 400);
      if (to === a.user.code) return reply({ error: 'You cannot send a note to yourself' }, 400);
      if (!(await takeRate(env, `rate:note:${a.user.code}`, RATE_LIMITS.note))) return reply({ error: 'Too many notes this hour' }, 429);
      const friend = await friendsBothWays(env, a.user, to);
      if (!friend) return reply({ error: 'Add that person as a friend first' }, 403);
      const text = String(body?.body ?? '').trim().slice(0, NOTE_BODY_MAX);
      if (!text) return reply({ error: 'Write the note first' }, 400);
      const note = {
        id: randomHex(8),
        from: a.user.code,
        fromName: a.user.name,
        to,
        title: String(body?.title ?? '').trim().slice(0, NOTE_TITLE_MAX),
        body: text,
        studyId: cleanStudyId(body?.studyId),
        ref: cleanNoteRef(body?.ref),
        ts: Date.now(),
        read: false,
      };
      friend.inbox = [note, ...(friend.inbox || [])].slice(0, NOTE_BOX_MAX);
      a.user.outbox = [note, ...(a.user.outbox || [])].slice(0, NOTE_BOX_MAX);
      await saveUser(env, friend, [`inbox+${note.id}`], false);
      await saveUser(env, a.user, [`outbox+${note.id}`]);
      return reply({ ok: true, id: note.id });
    }

    if (url.pathname === '/notes') {
      const a = await authed(env, body);
      if (a.error) return reply({ error: a.error }, a.status);
      return reply({ inbox: a.user.inbox || [], sent: a.user.outbox || [] });
    }

    if (url.pathname === '/note/read') {
      const a = await authed(env, body);
      if (a.error) return reply({ error: a.error }, a.status);
      const id = String(body?.id || '');
      const note = (a.user.inbox || []).find((n) => n.id === id);
      if (!note) return reply({ error: 'Note not found' }, 404);
      if (!note.read) {
        if (!(await takeRate(env, `rate:note-change:${a.user.code}`, RATE_LIMITS.noteChange))) return reply({ error: 'Too many requests this hour' }, 429);
        note.read = true;
        await saveUser(env, a.user, [`inbox*${id}`], false);
      }
      return reply({ ok: true });
    }

    if (url.pathname === '/note/delete') {
      const a = await authed(env, body);
      if (a.error) return reply({ error: a.error }, a.status);
      const id = String(body?.id || '');
      const box = body?.box === 'sent' ? 'outbox' : 'inbox';
      const before = (a.user[box] || []).length;
      a.user[box] = (a.user[box] || []).filter((n) => n.id !== id);
      if (a.user[box].length === before) return reply({ error: 'Note not found' }, 404);
      if (!(await takeRate(env, `rate:note-change:${a.user.code}`, RATE_LIMITS.noteChange))) return reply({ error: 'Too many requests this hour' }, 429);
      await saveUser(env, a.user, [`${box}-${id}`], false);
      return reply({ ok: true });
    }

    if (url.pathname === '/scores/submit') {
      const a = await authed(env, body);
      if (a.error) return reply({ error: a.error }, a.status);
      const show = String(body?.show || '').toLowerCase();
      if (!SHOWS.includes(show)) return reply({ error: 'Unknown game' }, 400);
      const score = Math.floor(num(body?.score));
      const level = Math.min(5, Math.max(1, Math.floor(num(body?.level)) || 1));
      if (score <= 0) return reply({ ok: true, skipped: true });
      if (score > SCORE_MAX) return reply({ error: 'That score is too high' }, 400);
      if (!(await takeRate(env, `rate:scores:${a.user.code}`, RATE_LIMITS.scores))) return reply({ error: 'Too many scores this hour' }, 429);
      const publicId = await ensurePublicId(env, a.user);
      await stampBoardId(env, a.user.code, publicId);
      /* only the public display name is stored on the board */
      const entry = { code: a.user.code, id: publicId, name: boardName(a.user.name, a.user.handle), score, level, ts: Date.now() };
      await editBoard(env, (board) => {
        const list = Array.isArray(board[show]) ? board[show] : [];
        const mine = list.find((e) => e && e.code === a.user.code);
        if (mine && mine.score >= score) {
          if (mine.id === publicId && mine.name === entry.name) return false;
          mine.id = publicId; mine.name = entry.name; return true;
        }
        const next = list.filter((e) => e && e.code !== a.user.code).concat({ ...entry });
        next.sort((x, y) => y.score - x.score || x.ts - y.ts);
        const top = next.slice(0, BOARD_MAX);
        if (!top.some((e) => e.code === a.user.code)) return false; // not high enough for the board
        board[show] = top;
        return true;
      });
      return reply({ ok: true });
    }

    if (url.pathname === '/room/create') {
      const a = await authed(env, body);
      if (a.error) return reply({ error: a.error }, a.status);
      if (!(await takeRate(env, `rate:room:${a.user.code}`, RATE_LIMITS.room))) return reply({ error: 'Too many game rooms this hour' }, 429);
      const show = String(body?.show || '').toLowerCase();
      if (!SHOWS.includes(show)) return reply({ error: 'Unknown game' }, 400);
      const level = Math.min(5, Math.max(1, Math.floor(num(body?.level)) || 1));
      let roomCode = null;
      for (let i = 0; i < 6 && !roomCode; i++) {
        const candidate = newRoomCode();
        if (!(await env.FRIENDS.get(`room:${candidate}`))) roomCode = candidate;
      }
      if (!roomCode) return reply({ error: 'Could not open a room' }, 500);
      const room = {
        room: roomCode, show, level, host: a.user.code, status: 'waiting',
        createdAt: Date.now(), startedAt: null,
        players: [{ code: a.user.code, name: a.user.name, score: 0, finished: false, updatedAt: Date.now() }],
      };
      await saveRoom(env, room);
      return reply(publicRoom(room));
    }

    if (url.pathname === '/room/join') {
      const a = await authed(env, body);
      if (a.error) return reply({ error: a.error }, a.status);
      if (!(await takeRate(env, `rate:room:${a.user.code}`, RATE_LIMITS.room))) return reply({ error: 'Too many game rooms this hour' }, 429);
      const roomCode = String(body?.room || '').trim().toUpperCase();
      const room = await loadRoom(env, roomCode);
      if (!room) return reply({ error: 'No room with that code' }, 404);
      if (room.players.some((p) => p.code === a.user.code)) return reply(publicRoom(room));
      const host = await loadUser(env, room.host);
      const areFriends = host && ((host.friends || []).includes(a.user.code) || (a.user.friends || []).includes(host.code));
      if (!areFriends) return reply({ error: 'Rooms are for friends — add the host as a friend first' }, 403);
      if (room.status !== 'waiting') return reply({ error: 'That room already started' }, 409);
      if (room.players.length >= ROOM_MAX_PLAYERS) return reply({ error: 'That room is full' }, 409);
      room.players.push({ code: a.user.code, name: a.user.name, score: 0, finished: false, updatedAt: Date.now() });
      await saveRoom(env, room);
      return reply(publicRoom(room));
    }

    if (url.pathname === '/room/start') {
      const a = await authed(env, body);
      if (a.error) return reply({ error: a.error }, a.status);
      if (!(await takeRate(env, `rate:room:${a.user.code}`, RATE_LIMITS.room))) return reply({ error: 'Too many game rooms this hour' }, 429);
      const room = await loadRoom(env, String(body?.room || '').trim().toUpperCase());
      if (!room) return reply({ error: 'No room with that code' }, 404);
      if (room.host !== a.user.code) return reply({ error: 'Only the host can start the room' }, 403);
      if (room.status !== 'waiting') return reply({ error: 'That room already started' }, 409);
      if (room.players.length < 2) return reply({ error: 'Wait for a friend to join first' }, 400);
      room.status = 'active'; room.startedAt = Date.now();
      await saveRoom(env, room);
      return reply(publicRoom(room));
    }

    if (url.pathname === '/room/score') {
      const a = await authed(env, body);
      if (a.error) return reply({ error: a.error }, a.status);
      const room = await loadRoom(env, String(body?.room || '').trim().toUpperCase());
      if (!room) return reply({ error: 'No room with that code' }, 404);
      if (room.status !== 'active') return reply({ error: 'That room is not active' }, 409);
      const me = room.players.find((p) => p.code === a.user.code);
      if (!me) return reply({ error: 'You are not in that room' }, 403);
      me.score = Math.max(me.score || 0, Math.floor(num(body?.score)));
      if (body?.finished) {
        me.score = Math.floor(num(body?.score));
        me.finished = true;
      }
      me.updatedAt = Date.now();
      if (room.players.length > 0 && room.players.every((p) => p.finished)) room.status = 'done';
      await saveRoom(env, room);
      return reply(publicRoom(room));
    }

    if (url.pathname === '/room/state') {
      const a = await authed(env, body);
      if (a.error) return reply({ error: a.error }, a.status);
      const room = await loadRoom(env, String(body?.room || '').trim().toUpperCase());
      if (!room) return reply({ error: 'No room with that code' }, 404);
      if (!room.players.some((p) => p.code === a.user.code)) return reply({ error: 'You are not in that room' }, 403);
      return reply(publicRoom(room));
    }

    if (url.pathname === '/room/leave') {
      const a = await authed(env, body);
      if (a.error) return reply({ error: a.error }, a.status);
      const roomCode = String(body?.room || '').trim().toUpperCase();
      const room = await loadRoom(env, roomCode);
      if (!room) return reply({ ok: true });
      room.players = room.players.filter((p) => p.code !== a.user.code);
      if (!room.players.length) { await env.FRIENDS.delete(`room:${roomCode}`); return reply({ ok: true }); }
      if (room.host === a.user.code) room.host = room.players[0].code;
      await saveRoom(env, room);
      return reply(publicRoom(room));
    }

    if (url.pathname === '/msg/send') {
      const a = await authed(env, body);
      if (a.error) return reply({ error: a.error }, a.status);
      const to = String(body?.to || '').trim().toUpperCase();
      if (!to) return reply({ error: 'Missing recipient code' }, 400);
      if (to === a.user.code) return reply({ error: 'You cannot message yourself' }, 400);
      if (!(await takeRate(env, `rate:msg:${a.user.code}`, RATE_LIMITS.msg))) return reply({ error: 'Too many messages this hour' }, 429);
      const friend = await friendsBothWays(env, a.user, to);
      if (!friend) return reply({ error: 'Add that person as a friend first' }, 403);
      const text = String(body?.body ?? '').trim().slice(0, 2000);
      if (!text) return reply({ error: 'Write the message first' }, 400);
      const msg = { id: randomHex(8), from: a.user.code, fromName: a.user.name, body: text, ts: Date.now(), read: false };
      a.user.threads = a.user.threads || {};
      friend.threads = friend.threads || {};
      a.user.threads[to] = [...(a.user.threads[to] || []), msg].slice(-100);
      friend.threads[a.user.code] = [...(friend.threads[a.user.code] || []), msg].slice(-100);
      await saveUser(env, friend, [`threads.${a.user.code}`], false);
      await saveUser(env, a.user, [`threads.${to}`]);
      return reply({ ok: true, id: msg.id });
    }

    if (url.pathname === '/msg/thread') {
      const a = await authed(env, body);
      if (a.error) return reply({ error: a.error }, a.status);
      const withCode = String(body?.with || '').trim().toUpperCase();
      if (!(a.user.friends || []).includes(withCode)) return reply({ error: 'You are not friends anymore, so this conversation is hidden.' }, 403);
      a.user.threads = a.user.threads || {};
      const thread = a.user.threads[withCode] || [];
      let changed = false;
      for (const m of thread) {
        if (m.from === withCode && !m.read) { m.read = true; changed = true; }
      }
      if (changed) {
        await saveUser(env, a.user, [`threads.${withCode}`]);
        const friend = hydrate(await loadUser(env, withCode));
        if (friend && friend.threads && friend.threads[a.user.code]) {
          for (const m of friend.threads[a.user.code]) if (m.from === withCode) m.read = true;
          await saveUser(env, friend, [`threads.${a.user.code}`], false);
        }
      }
      return reply({ with: withCode, messages: thread.slice(-60) });
    }

    if (url.pathname === '/shared/create') {
      const a = await authed(env, body);
      if (a.error) return reply({ error: a.error }, a.status);
      const to = String(body?.to || '').trim().toUpperCase();
      if (!to) return reply({ error: 'Missing friend code' }, 400);
      if (to === a.user.code) return reply({ error: 'Pick a friend to write with' }, 400);
      if (!(await takeRate(env, `rate:shared:${a.user.code}`, RATE_LIMITS.shared))) return reply({ error: 'Too many shared notes this hour' }, 429);
      const friend = await friendsBothWays(env, a.user, to);
      if (!friend) return reply({ error: 'Add that person as a friend first' }, 403);
      const text = String(body?.body ?? '').trim().slice(0, NOTE_BODY_MAX);
      if (!text) return reply({ error: 'Write the first line together first' }, 400);
      const id = randomHex(8);
      const note = {
        id, owner: a.user.code, ownerName: a.user.name,
        with: to, withName: friend.name, editors: [a.user.code, to],
        title: String(body?.title ?? '').trim().slice(0, NOTE_TITLE_MAX),
        body: text, studyId: cleanStudyId(body?.studyId), ref: cleanNoteRef(body?.ref),
        createdAt: Date.now(), updatedAt: Date.now(), updatedBy: a.user.code, updatedByName: a.user.name,
      };
      await env.FRIENDS.put(`shared:${id}`, JSON.stringify(note));
      a.user.shared = [id, ...(a.user.shared || [])].slice(0, 30);
      friend.shared = [id, ...(friend.shared || [])].slice(0, 30);
      await saveUser(env, friend, ['shared'], false);
      await saveUser(env, a.user, ['shared']);
      return reply(note);
    }

    if (url.pathname === '/shared/list') {
      const a = await authed(env, body);
      if (a.error) return reply({ error: a.error }, a.status);
      const out = [];
      for (const id of a.user.shared || []) {
        try {
          const raw = await env.FRIENDS.get(`shared:${id}`);
          if (!raw) continue;
          const note = JSON.parse(raw);
          if (!(note.editors || []).includes(a.user.code)) continue;
          out.push(note);
        } catch { /* skip broken entries */ }
      }
      out.sort((x, y) => (y.updatedAt || 0) - (x.updatedAt || 0));
      return reply({ notes: out });
    }

    if (url.pathname === '/shared/get') {
      const a = await authed(env, body);
      if (a.error) return reply({ error: a.error }, a.status);
      const id = String(body?.id || '');
      const raw = await env.FRIENDS.get(`shared:${id}`);
      if (!raw) return reply({ error: 'Shared note not found' }, 404);
      const note = JSON.parse(raw);
      if (!(note.editors || []).includes(a.user.code)) return reply({ error: 'That note is not shared with you' }, 403);
      return reply(note);
    }

    if (url.pathname === '/shared/update') {
      const a = await authed(env, body);
      if (a.error) return reply({ error: a.error }, a.status);
      if (!(await takeRate(env, `rate:shared-edit:${a.user.code}`, RATE_LIMITS.sharedEdit))) return reply({ error: 'Too many edits this hour' }, 429);
      const id = String(body?.id || '');
      const raw = await env.FRIENDS.get(`shared:${id}`);
      if (!raw) return reply({ error: 'Shared note not found' }, 404);
      const note = JSON.parse(raw);
      if (!(note.editors || []).includes(a.user.code)) return reply({ error: 'That note is not shared with you' }, 403);
      const text = String(body?.body ?? '').trim().slice(0, NOTE_BODY_MAX);
      if (!text) return reply({ error: 'The note cannot be empty' }, 400);
      note.title = String(body?.title ?? note.title ?? '').trim().slice(0, NOTE_TITLE_MAX);
      note.body = text;
      note.updatedAt = Date.now();
      note.updatedBy = a.user.code;
      note.updatedByName = a.user.name;
      await env.FRIENDS.put(`shared:${id}`, JSON.stringify(note));
      return reply(note);
    }

    if (url.pathname === '/shared/delete') {
      const a = await authed(env, body);
      if (a.error) return reply({ error: a.error }, a.status);
      if (!(await takeRate(env, `rate:shared-edit:${a.user.code}`, RATE_LIMITS.sharedEdit))) return reply({ error: 'Too many edits this hour' }, 429);
      const id = String(body?.id || '');
      const raw = await env.FRIENDS.get(`shared:${id}`);
      if (!raw) return reply({ error: 'Shared note not found' }, 404);
      const note = JSON.parse(raw);
      if (!(note.editors || []).includes(a.user.code)) return reply({ error: 'That note is not shared with you' }, 403);
      await env.FRIENDS.delete(`shared:${id}`);
      for (const code of note.editors || []) {
        const u = hydrate(await loadUser(env, code));
        if (u) { u.shared = (u.shared || []).filter((x) => x !== id); await env.FRIENDS.put(`user:${u.code}`, JSON.stringify(u)); }
      }
      return reply({ ok: true });
    }

    if (url.pathname === '/verse/send') {
      const a = await authed(env, body);
      if (a.error) return reply({ error: a.error }, a.status);
      const friend = await friendsBothWays(env, a.user, body?.to);
      if (!friend) return reply({ error: 'You can only send a verse to an accepted friend' }, 403);
      if (!(await takeRate(env, `rate:verse:${a.user.code}`, VERSE_RATE))) return reply({ error: 'Too many verses this hour' }, 429);
      const text = boundedText(body?.text, VERSE_TEXT_MAX);
      if (text.error) return reply({ error: 'That verse is too long' }, 400);
      if (!text.text) return reply({ error: 'Missing verse text' }, 400);
      const note = boundedText(body?.note, VERSE_NOTE_MAX);
      if (note.error) return reply({ error: 'That note is too long' }, 400);
      const reference = boundedText(body?.reference, VERSE_REF_MAX);
      if (reference.error) return reply({ error: 'That reference is too long' }, 400);
      const book = verseNumber(body?.book, 1, 78);
      const chapter = verseNumber(body?.chapter, 1, 200);
      const verse = verseNumber(body?.verse, 1, 200);
      if (book == null || chapter == null || verse == null) return reply({ error: 'That verse is not in this Bible' }, 400);
      const translation = body?.translation === 'rvr' ? 'rvr' : 'kjv';
      const id = randomHex(8);
      const ts = Date.now();
      const base = {
        id, from: a.user.code, fromName: a.user.name || 'Friend', to: friend.code, toName: friend.name || 'Friend',
        book, chapter, verse, reference: reference.text, text: text.text, note: note.text, translation, ts,
      };
      const senderBox = await loadVersebox(env, a.user.code);
      const friendBox = await loadVersebox(env, friend.code);
      senderBox.unshift({ ...base, read: true, direction: 'out' });
      friendBox.unshift({ ...base, read: false, direction: 'in' });
      await saveVersebox(env, a.user.code, senderBox);
      await saveVersebox(env, friend.code, friendBox);
      return reply({ ok: true, id });
    }

    if (url.pathname === '/verse/inbox' || url.pathname === '/verse/thread') {
      const a = await authed(env, body);
      if (a.error) return reply({ error: a.error }, a.status);
      const withCode = String(body?.with || '').trim().toUpperCase();
      if (url.pathname === '/verse/thread') {
        const friend = await friendsBothWays(env, a.user, withCode);
        if (!friend) return reply({ error: 'You are not friends' }, 403);
      }
      const box = await loadVersebox(env, a.user.code);
      const verses = [];
      for (const item of box) {
        const other = otherParty(item, a.user.code);
        const friend = await friendsBothWays(env, a.user, other);
        if (!friend) continue;
        if (withCode && other !== withCode) continue;
        verses.push(item);
      }
      return reply({ verses });
    }

    if (url.pathname === '/verse/read') {
      const a = await authed(env, body);
      if (a.error) return reply({ error: a.error }, a.status);
      if (!(await takeRate(env, `rate:verse-read:${a.user.code}`, VERSE_READ_RATE))) return reply({ error: 'Too many verse reads this hour' }, 429);
      const id = String(body?.id || '');
      const box = await loadVersebox(env, a.user.code);
      const item = box.find((row) => row && row.id === id);
      if (!item) return reply({ error: 'Verse not found' }, 404);
      const friend = await friendsBothWays(env, a.user, otherParty(item, a.user.code));
      if (!friend) return reply({ error: 'You are not friends' }, 403);
      item.read = true;
      await saveVersebox(env, a.user.code, box);
      return reply({ ok: true });
    }

    if (url.pathname === '/study/get' || url.pathname === '/study/add' || url.pathname === '/study/delete') {
      const a = await authed(env, body);
      if (a.error) return reply({ error: a.error }, a.status);
      const friend = await friendsBothWays(env, a.user, body?.with);
      if (!friend) return reply({ error: 'You are not friends' }, 403);
      const note = await loadStudy(env, a.user.code, friend.code);
      if (url.pathname === '/study/get') return reply(note);
      if (url.pathname === '/study/delete') {
        if (!(await takeRate(env, `rate:study-delete:${a.user.code}`, STUDY_DELETE_RATE))) return reply({ error: 'Too many study deletes this hour' }, 429);
        const entryId = String(body?.entryId || '');
        note.entries = (note.entries || []).filter((entry) => entry.id !== entryId);
        note.updatedAt = Date.now();
        await env.FRIENDS.put(note.id, JSON.stringify(note));
        return reply(note);
      }
      if (!(await takeRate(env, `rate:study:${a.user.code}`, STUDY_RATE))) return reply({ error: 'Too many study writes this hour' }, 429);
      const question = boundedText(body?.question, STUDY_QUESTION_MAX);
      if (question.error) return reply({ error: 'That question is too long' }, 400);
      if (!question.text) return reply({ error: 'Write a question first' }, 400);
      const answer = boundedText(body?.answer, STUDY_ANSWER_MAX);
      if (answer.error) return reply({ error: 'That answer is too long' }, 400);
      const verses = cleanStudyVerses(body?.verses);
      if (verses.error) return reply({ error: verses.error }, 400);
      const requested = String(body?.entryId || '');
      const entryId = /^[a-f0-9]{8,16}$/.test(requested) ? requested : randomHex(8);
      const now = Date.now();
      const existing = (note.entries || []).find((entry) => entry.id === entryId);
      if (existing) {
        existing.question = question.text;
        existing.answer = answer.text;
        existing.verses = verses.verses;
        existing.updatedBy = a.user.code;
        existing.updatedByName = a.user.name || 'Friend';
        existing.ts = now;
      } else {
        if ((note.entries || []).length >= STUDY_ENTRIES_MAX) return reply({ error: 'This notebook is full' }, 400);
        note.entries.unshift({
          id: entryId, question: question.text, answer: answer.text, verses: verses.verses,
          author: a.user.code, authorName: a.user.name || 'Friend',
          updatedBy: a.user.code, updatedByName: a.user.name || 'Friend', ts: now,
        });
      }
      note.updatedAt = now;
      await env.FRIENDS.put(note.id, JSON.stringify(note));
      return reply(note);
    }

    if (url.pathname.startsWith('/lessons/')) {
      const [data, code = 200] = await handleLessons(url.pathname, body, env, { authed, friendsBothWays, takeRate });
      return reply(data, code);
    }
    if (url.pathname.startsWith('/mynotes/')) {
      const [data, code = 200] = await handleMyNotes(url.pathname, body, env, { authed, friendsBothWays, takeRate });
      return reply(data, code);
    }

    if (url.pathname.startsWith('/trade/')) {
      const [data, code = 200] = await handleTrade(url.pathname, body, env, authed);
      return reply(data, code);
    }

    return reply({ error: 'Not found' }, 404);
  } catch {
    return reply({ error: 'Server error' }, 500);
  }
}

export default {
  fetch: handleFriends,
  scheduled(event, env, ctx) { ctx.waitUntil(runPushCron(env).catch(() => null)); },
};
