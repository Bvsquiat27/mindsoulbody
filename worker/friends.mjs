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

   The account secret is a random 32-hex string returned once at register.
   Only its SHA-256 hex digest is stored. Compare it in constant time.
   Public /scores never includes friend codes. */

const ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
const SHOWS = ['jeopardy', 'millionaire', 'feud', 'sound', 'babel', 'defend', 'doctrine'];
const MAX_BODY = 16384;
const NOTE_TITLE_MAX = 120;
const NOTE_BODY_MAX = 4000;
const NOTE_BOX_MAX = 30;
const REQUEST_MAX = 30;
const BOARD_MAX = 50;
const ROOM_TTL_SECONDS = 2 * 60 * 60;
const ROOM_MAX_PLAYERS = 4;
const BOARD_KEY = 'leaderboard';
const ORIGIN = 'https://bvsquiat27.github.io';
const TEXT_LIMITS = { handle: 24, city: 80, bio: 160, denomination: 40 };
const IMAGE_DATA = /^data:image\/(?:jpeg|png|webp);base64,[a-z0-9+/]+={0,2}$/i;
const IMAGE_HTTPS = /^https:\/\/[^\s"'<>]+$/i;
const PUBLIC_ID = /^[a-f0-9]{16}$/;

const cors = {
  'access-control-allow-origin': ORIGIN,
  'access-control-allow-methods': 'GET, POST, OPTIONS',
  'access-control-allow-headers': 'content-type',
  'access-control-max-age': '86400',
};

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'content-type': 'application/json', ...cors },
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
  return { bests: pick(src.bests), levels, studies: int(src.studies) };
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

function publicImage(value) {
  const raw = String(value ?? '').trim();
  if (!raw || raw.length > 12000) return '';
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

function applyImage(user, body, nested, storedKey, aliases) {
  let seen = false;
  let chosen = '';
  for (const alias of aliases) {
    const values = fieldValues(body, nested, alias);
    if (!values.length) continue;
    seen = true;
    for (const value of values) {
      const img = publicImage(value);
      if (img) { chosen = img; break; }
    }
    if (chosen) break;
  }
  if (!seen) return;
  if (chosen) user[storedKey] = chosen;
  else delete user[storedKey];
}

function applyProfile(user, body) {
  const nested = nestedProfile(body);
  for (const key of ['handle', 'city', 'bio', 'denomination']) applyText(user, body, nested, key);
  applyImage(user, body, nested, 'avatar_data', ['avatar_data', 'avatar', 'avatarUrl']);
  applyImage(user, body, nested, 'cover_data', ['cover_data', 'cover', 'coverUrl']);
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
  return out.slice(0, REQUEST_MAX);
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
  try { return JSON.parse(raw); } catch { return null; }
}

async function saveUser(env, user) {
  user.updatedAt = Date.now();
  await env.FRIENDS.put(`user:${user.code}`, JSON.stringify(user));
}

async function ensurePublicId(env, user) {
  const existing = validPublicId(user && user.publicId);
  if (existing) {
    user.publicId = existing;
    return existing;
  }
  user.publicId = randomHex(8);
  await saveUser(env, user);
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

function publicScore(entry, id) {
  return {
    id: id || '',
    name: typeof entry.name === 'string' ? entry.name : '',
    score: Number(entry.score) || 0,
    level: Number(entry.level) || 0,
    ts: Number(entry.ts) || 0,
  };
}

async function publishBoard(env, board) {
  let dirty = false;
  for (const rows of Object.values(board)) {
    if (!Array.isArray(rows)) continue;
    for (const entry of rows) {
      if (!entry || typeof entry !== 'object') continue;
      const code = String(entry.code || '').trim().toUpperCase();
      let id = validPublicId(entry.id);
      if (code) {
        const user = hydrate(await loadUser(env, code));
        if (user) {
          const pid = await ensurePublicId(env, user);
          if (pid && pid !== id) {
            entry.id = pid;
            id = pid;
            dirty = true;
          }
        }
      }
      if (!id) {
        entry.id = randomHex(8);
        dirty = true;
      }
    }
  }
  if (dirty) await env.FRIENDS.put(BOARD_KEY, JSON.stringify(board));
  return board;
}

function scoreRows(list) {
  return (Array.isArray(list) ? list : []).map((entry) => publicScore(entry, validPublicId(entry && entry.id)));
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
  const profile = {};
  for (const key of ['handle', 'city', 'bio', 'denomination', 'avatar_data', 'cover_data']) {
    if (typeof friend[key] === 'string' && friend[key]) {
      view[key] = friend[key];
      profile[key] = friend[key];
    }
  }
  if (Object.keys(profile).length) view.profile = profile;
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

export async function handleFriends(request, env) {
  try {
    const url = new URL(request.url);
    if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors });
    if (url.pathname === '/health' && request.method === 'GET') return json({ ok: true });
    if (url.pathname === '/scores' && request.method === 'GET') {
      const board = await publishBoard(env, await loadBoard(env));
      const want = String(url.searchParams.get('show') || '').toLowerCase();
      if (want) {
        if (!SHOWS.includes(want)) return json({ error: 'Unknown game' }, 400);
        return json({ show: want, scores: scoreRows(board[want]).slice(0, 20) });
      }
      const all = {};
      for (const s of SHOWS) all[s] = scoreRows(board[s]).slice(0, 10);
      return json({ scores: all });
    }
    if (request.method !== 'POST') return json({ error: 'Not found' }, 404);

    const { body, error, status } = await readBody(request);
    if (error) return json({ error }, status);

    if (url.pathname === '/register') {
      const name = cleanName(body?.name) || 'Friend';
      let code = null;
      for (let i = 0; i < 6 && !code; i++) {
        const candidate = newCode();
        if (!(await env.FRIENDS.get(`user:${candidate}`))) code = candidate;
      }
      if (!code) return json({ error: 'Could not allocate a friend code' }, 500);
      const secret = randomHex(16);
      const user = {
        code, name, secretHash: await sha256hex(secret), publicId: randomHex(8),
        stats: cleanStats(null), friends: [], inbox: [], outbox: [], threads: {}, shared: [],
        requestsIn: [], requestsOut: [], updatedAt: Date.now(),
      };
      await env.FRIENDS.put(`user:${code}`, JSON.stringify(user));
      return json({ code, secret, publicId: user.publicId });
    }

    if (url.pathname === '/sync') {
      const a = await authed(env, body);
      if (a.error) return json({ error: a.error }, a.status);
      if (body?.name !== undefined) a.user.name = cleanName(body.name) || a.user.name;
      a.user.stats = cleanStats(body?.stats);
      applyProfile(a.user, body || {});
      const publicId = await ensurePublicId(env, a.user);
      if (a.user.publicId !== publicId) a.user.publicId = publicId;
      await saveUser(env, a.user);
      return json({ ok: true, publicId });
    }

    if (url.pathname === '/friends') {
      const a = await authed(env, body);
      if (a.error) return json({ error: a.error }, a.status);
      const out = [];
      for (const code of a.user.friends || []) {
        const friend = hydrate(await loadUser(env, code));
        if (friend) out.push(friendView(a.user, friend));
      }
      return json(out);
    }

    if (url.pathname === '/friend/add') {
      const a = await authed(env, body);
      if (a.error) return json({ error: a.error }, a.status);
      const friendCode = String(body?.friendCode || '').trim().toUpperCase();
      if (!friendCode) return json({ error: 'Missing friendCode' }, 400);
      if (friendCode === a.user.code) return json({ error: 'You cannot add yourself' }, 400);
      const friend = hydrate(await loadUser(env, friendCode));
      if (!friend) return json({ error: 'No user with that friend code' }, 404);
      if ((a.user.friends || []).includes(friendCode)) return json({ ok: true, status: 'friends' });
      const theyAsked = hasRequest(a.user.requestsIn, friendCode) || hasRequest(friend.requestsOut, a.user.code);
      if (theyAsked) {
        linkFriends(a.user, friend);
        clearRequestPair(a.user, friend);
        await saveUser(env, a.user);
        await saveUser(env, friend);
        return json({ ok: true, status: 'friends' });
      }
      if (hasRequest(a.user.requestsOut, friendCode)) return json({ ok: true, status: 'pending' });
      const ts = Date.now();
      a.user.requestsOut = [{ code: friend.code, name: friend.name || 'Friend', ts }, ...withoutCode(a.user.requestsOut, friend.code)].slice(0, REQUEST_MAX);
      friend.requestsIn = [{ code: a.user.code, name: a.user.name || 'Friend', ts }, ...withoutCode(friend.requestsIn, a.user.code)].slice(0, REQUEST_MAX);
      await saveUser(env, a.user);
      await saveUser(env, friend);
      return json({ ok: true, status: 'pending' });
    }

    if (url.pathname === '/friend/requests') {
      const a = await authed(env, body);
      if (a.error) return json({ error: a.error }, a.status);
      return json({ incoming: cleanRequests(a.user.requestsIn), outgoing: cleanRequests(a.user.requestsOut) });
    }

    if (url.pathname === '/friend/accept') {
      const a = await authed(env, body);
      if (a.error) return json({ error: a.error }, a.status);
      const friendCode = String(body?.friendCode || '').trim().toUpperCase();
      if (!friendCode) return json({ error: 'Missing friendCode' }, 400);
      if ((a.user.friends || []).includes(friendCode)) return json({ ok: true, status: 'friends' });
      if (!hasRequest(a.user.requestsIn, friendCode)) return json({ error: 'Request not found' }, 404);
      const friend = hydrate(await loadUser(env, friendCode));
      if (!friend) return json({ error: 'No user with that friend code' }, 404);
      linkFriends(a.user, friend);
      clearRequestPair(a.user, friend);
      await saveUser(env, a.user);
      await saveUser(env, friend);
      return json({ ok: true, status: 'friends' });
    }

    if (url.pathname === '/friend/decline') {
      const a = await authed(env, body);
      if (a.error) return json({ error: a.error }, a.status);
      const friendCode = String(body?.friendCode || '').trim().toUpperCase();
      if (!friendCode) return json({ error: 'Missing friendCode' }, 400);
      if (!hasRequest(a.user.requestsIn, friendCode)) return json({ error: 'Request not found' }, 404);
      a.user.requestsIn = withoutCode(a.user.requestsIn, friendCode);
      await saveUser(env, a.user);
      const friend = hydrate(await loadUser(env, friendCode));
      if (friend) {
        friend.requestsOut = withoutCode(friend.requestsOut, a.user.code);
        await saveUser(env, friend);
      }
      return json({ ok: true });
    }

    if (url.pathname === '/friend/remove') {
      const a = await authed(env, body);
      if (a.error) return json({ error: a.error }, a.status);
      const friendCode = String(body?.friendCode || '').trim().toUpperCase();
      if (!friendCode) return json({ error: 'Missing friendCode' }, 400);
      a.user.friends = (a.user.friends || []).filter((c) => c !== friendCode);
      a.user.requestsIn = withoutCode(a.user.requestsIn, friendCode);
      a.user.requestsOut = withoutCode(a.user.requestsOut, friendCode);
      await saveUser(env, a.user);
      const friend = hydrate(await loadUser(env, friendCode));
      if (friend) {
        friend.friends = (friend.friends || []).filter((c) => c !== a.user.code);
        friend.requestsIn = withoutCode(friend.requestsIn, a.user.code);
        friend.requestsOut = withoutCode(friend.requestsOut, a.user.code);
        await saveUser(env, friend);
      }
      return json({ ok: true });
    }

    if (url.pathname === '/note/send') {
      const a = await authed(env, body);
      if (a.error) return json({ error: a.error }, a.status);
      const to = String(body?.to || '').trim().toUpperCase();
      if (!to) return json({ error: 'Missing recipient code' }, 400);
      if (to === a.user.code) return json({ error: 'You cannot send a note to yourself' }, 400);
      if (!(a.user.friends || []).includes(to)) return json({ error: 'Add that person as a friend first' }, 403);
      const friend = hydrate(await loadUser(env, to));
      if (!friend) return json({ error: 'No user with that friend code' }, 404);
      const text = String(body?.body ?? '').trim().slice(0, NOTE_BODY_MAX);
      if (!text) return json({ error: 'Write the note first' }, 400);
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
      await env.FRIENDS.put(`user:${friend.code}`, JSON.stringify(friend));
      await saveUser(env, a.user);
      return json({ ok: true, id: note.id });
    }

    if (url.pathname === '/notes') {
      const a = await authed(env, body);
      if (a.error) return json({ error: a.error }, a.status);
      return json({ inbox: a.user.inbox || [], sent: a.user.outbox || [] });
    }

    if (url.pathname === '/note/read') {
      const a = await authed(env, body);
      if (a.error) return json({ error: a.error }, a.status);
      const id = String(body?.id || '');
      const note = (a.user.inbox || []).find((n) => n.id === id);
      if (!note) return json({ error: 'Note not found' }, 404);
      if (!note.read) {
        note.read = true;
        await saveUser(env, a.user);
      }
      return json({ ok: true });
    }

    if (url.pathname === '/note/delete') {
      const a = await authed(env, body);
      if (a.error) return json({ error: a.error }, a.status);
      const id = String(body?.id || '');
      const box = body?.box === 'sent' ? 'outbox' : 'inbox';
      const before = (a.user[box] || []).length;
      a.user[box] = (a.user[box] || []).filter((n) => n.id !== id);
      if (a.user[box].length === before) return json({ error: 'Note not found' }, 404);
      await saveUser(env, a.user);
      return json({ ok: true });
    }

    if (url.pathname === '/scores/submit') {
      const a = await authed(env, body);
      if (a.error) return json({ error: a.error }, a.status);
      const show = String(body?.show || '').toLowerCase();
      if (!SHOWS.includes(show)) return json({ error: 'Unknown game' }, 400);
      const score = Math.floor(num(body?.score));
      const level = Math.min(5, Math.max(1, Math.floor(num(body?.level)) || 1));
      if (score <= 0) return json({ ok: true, skipped: true });
      const publicId = await ensurePublicId(env, a.user);
      const board = await loadBoard(env);
      const list = Array.isArray(board[show]) ? board[show] : [];
      const mine = list.find((e) => e.code === a.user.code);
      if (!mine || score > mine.score) {
        const entry = { code: a.user.code, id: publicId, name: a.user.name, score, level, ts: Date.now() };
        const next = list.filter((e) => e.code !== a.user.code).concat(entry);
        next.sort((x, y) => y.score - x.score || x.ts - y.ts);
        board[show] = next.slice(0, BOARD_MAX);
        await env.FRIENDS.put(BOARD_KEY, JSON.stringify(board));
      } else if (mine && mine.id !== publicId) {
        mine.id = publicId;
        await env.FRIENDS.put(BOARD_KEY, JSON.stringify(board));
      }
      return json({ ok: true });
    }

    if (url.pathname === '/room/create') {
      const a = await authed(env, body);
      if (a.error) return json({ error: a.error }, a.status);
      const show = String(body?.show || '').toLowerCase();
      if (!SHOWS.includes(show)) return json({ error: 'Unknown game' }, 400);
      const level = Math.min(5, Math.max(1, Math.floor(num(body?.level)) || 1));
      let roomCode = null;
      for (let i = 0; i < 6 && !roomCode; i++) {
        const candidate = newRoomCode();
        if (!(await env.FRIENDS.get(`room:${candidate}`))) roomCode = candidate;
      }
      if (!roomCode) return json({ error: 'Could not open a room' }, 500);
      const room = {
        room: roomCode, show, level, host: a.user.code, status: 'waiting',
        createdAt: Date.now(), startedAt: null,
        players: [{ code: a.user.code, name: a.user.name, score: 0, finished: false, updatedAt: Date.now() }],
      };
      await saveRoom(env, room);
      return json(publicRoom(room));
    }

    if (url.pathname === '/room/join') {
      const a = await authed(env, body);
      if (a.error) return json({ error: a.error }, a.status);
      const roomCode = String(body?.room || '').trim().toUpperCase();
      const room = await loadRoom(env, roomCode);
      if (!room) return json({ error: 'No room with that code' }, 404);
      if (room.players.some((p) => p.code === a.user.code)) return json(publicRoom(room));
      const host = await loadUser(env, room.host);
      const areFriends = host && ((host.friends || []).includes(a.user.code) || (a.user.friends || []).includes(host.code));
      if (!areFriends) return json({ error: 'Rooms are for friends — add the host as a friend first' }, 403);
      if (room.status !== 'waiting') return json({ error: 'That room already started' }, 409);
      if (room.players.length >= ROOM_MAX_PLAYERS) return json({ error: 'That room is full' }, 409);
      room.players.push({ code: a.user.code, name: a.user.name, score: 0, finished: false, updatedAt: Date.now() });
      await saveRoom(env, room);
      return json(publicRoom(room));
    }

    if (url.pathname === '/room/start') {
      const a = await authed(env, body);
      if (a.error) return json({ error: a.error }, a.status);
      const room = await loadRoom(env, String(body?.room || '').trim().toUpperCase());
      if (!room) return json({ error: 'No room with that code' }, 404);
      if (room.host !== a.user.code) return json({ error: 'Only the host can start the room' }, 403);
      if (room.status !== 'waiting') return json({ error: 'That room already started' }, 409);
      if (room.players.length < 2) return json({ error: 'Wait for a friend to join first' }, 400);
      room.status = 'active'; room.startedAt = Date.now();
      await saveRoom(env, room);
      return json(publicRoom(room));
    }

    if (url.pathname === '/room/score') {
      const a = await authed(env, body);
      if (a.error) return json({ error: a.error }, a.status);
      const room = await loadRoom(env, String(body?.room || '').trim().toUpperCase());
      if (!room) return json({ error: 'No room with that code' }, 404);
      const me = room.players.find((p) => p.code === a.user.code);
      if (!me) return json({ error: 'You are not in that room' }, 403);
      me.score = Math.max(me.score || 0, Math.floor(num(body?.score)));
      if (body?.finished) {
        me.score = Math.floor(num(body?.score));
        me.finished = true;
      }
      me.updatedAt = Date.now();
      if (room.players.length > 0 && room.players.every((p) => p.finished)) room.status = 'done';
      await saveRoom(env, room);
      return json(publicRoom(room));
    }

    if (url.pathname === '/room/state') {
      const a = await authed(env, body);
      if (a.error) return json({ error: a.error }, a.status);
      const room = await loadRoom(env, String(body?.room || '').trim().toUpperCase());
      if (!room) return json({ error: 'No room with that code' }, 404);
      if (!room.players.some((p) => p.code === a.user.code)) return json({ error: 'You are not in that room' }, 403);
      return json(publicRoom(room));
    }

    if (url.pathname === '/room/leave') {
      const a = await authed(env, body);
      if (a.error) return json({ error: a.error }, a.status);
      const roomCode = String(body?.room || '').trim().toUpperCase();
      const room = await loadRoom(env, roomCode);
      if (!room) return json({ ok: true });
      room.players = room.players.filter((p) => p.code !== a.user.code);
      if (!room.players.length) { await env.FRIENDS.delete(`room:${roomCode}`); return json({ ok: true }); }
      if (room.host === a.user.code) room.host = room.players[0].code;
      await saveRoom(env, room);
      return json(publicRoom(room));
    }

    if (url.pathname === '/msg/send') {
      const a = await authed(env, body);
      if (a.error) return json({ error: a.error }, a.status);
      const to = String(body?.to || '').trim().toUpperCase();
      if (!to) return json({ error: 'Missing recipient code' }, 400);
      if (to === a.user.code) return json({ error: 'You cannot message yourself' }, 400);
      if (!(a.user.friends || []).includes(to)) return json({ error: 'Add that person as a friend first' }, 403);
      const friend = hydrate(await loadUser(env, to));
      if (!friend) return json({ error: 'No user with that friend code' }, 404);
      const text = String(body?.body ?? '').trim().slice(0, 2000);
      if (!text) return json({ error: 'Write the message first' }, 400);
      const msg = { id: randomHex(8), from: a.user.code, fromName: a.user.name, body: text, ts: Date.now(), read: false };
      a.user.threads = a.user.threads || {};
      friend.threads = friend.threads || {};
      a.user.threads[to] = [...(a.user.threads[to] || []), msg].slice(-100);
      friend.threads[a.user.code] = [...(friend.threads[a.user.code] || []), msg].slice(-100);
      await env.FRIENDS.put(`user:${friend.code}`, JSON.stringify(friend));
      await saveUser(env, a.user);
      return json({ ok: true, id: msg.id });
    }

    if (url.pathname === '/msg/thread') {
      const a = await authed(env, body);
      if (a.error) return json({ error: a.error }, a.status);
      const withCode = String(body?.with || '').trim().toUpperCase();
      a.user.threads = a.user.threads || {};
      const thread = a.user.threads[withCode] || [];
      let changed = false;
      for (const m of thread) {
        if (m.from === withCode && !m.read) { m.read = true; changed = true; }
      }
      if (changed) {
        await saveUser(env, a.user);
        const friend = hydrate(await loadUser(env, withCode));
        if (friend && friend.threads && friend.threads[a.user.code]) {
          for (const m of friend.threads[a.user.code]) if (m.from === withCode) m.read = true;
          await env.FRIENDS.put(`user:${friend.code}`, JSON.stringify(friend));
        }
      }
      return json({ with: withCode, messages: thread.slice(-60) });
    }

    if (url.pathname === '/shared/create') {
      const a = await authed(env, body);
      if (a.error) return json({ error: a.error }, a.status);
      const to = String(body?.to || '').trim().toUpperCase();
      if (!to) return json({ error: 'Missing friend code' }, 400);
      if (to === a.user.code) return json({ error: 'Pick a friend to write with' }, 400);
      if (!(a.user.friends || []).includes(to)) return json({ error: 'Add that person as a friend first' }, 403);
      const friend = hydrate(await loadUser(env, to));
      if (!friend) return json({ error: 'No user with that friend code' }, 404);
      const text = String(body?.body ?? '').trim().slice(0, NOTE_BODY_MAX);
      if (!text) return json({ error: 'Write the first line together first' }, 400);
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
      await env.FRIENDS.put(`user:${friend.code}`, JSON.stringify(friend));
      await saveUser(env, a.user);
      return json(note);
    }

    if (url.pathname === '/shared/list') {
      const a = await authed(env, body);
      if (a.error) return json({ error: a.error }, a.status);
      const out = [];
      for (const id of a.user.shared || []) {
        try {
          const raw = await env.FRIENDS.get(`shared:${id}`);
          if (raw) out.push(JSON.parse(raw));
        } catch { /* skip broken entries */ }
      }
      out.sort((x, y) => (y.updatedAt || 0) - (x.updatedAt || 0));
      return json({ notes: out });
    }

    if (url.pathname === '/shared/get') {
      const a = await authed(env, body);
      if (a.error) return json({ error: a.error }, a.status);
      const id = String(body?.id || '');
      const raw = await env.FRIENDS.get(`shared:${id}`);
      if (!raw) return json({ error: 'Shared note not found' }, 404);
      const note = JSON.parse(raw);
      if (!(note.editors || []).includes(a.user.code)) return json({ error: 'That note is not shared with you' }, 403);
      return json(note);
    }

    if (url.pathname === '/shared/update') {
      const a = await authed(env, body);
      if (a.error) return json({ error: a.error }, a.status);
      const id = String(body?.id || '');
      const raw = await env.FRIENDS.get(`shared:${id}`);
      if (!raw) return json({ error: 'Shared note not found' }, 404);
      const note = JSON.parse(raw);
      if (!(note.editors || []).includes(a.user.code)) return json({ error: 'That note is not shared with you' }, 403);
      const text = String(body?.body ?? '').trim().slice(0, NOTE_BODY_MAX);
      if (!text) return json({ error: 'The note cannot be empty' }, 400);
      note.title = String(body?.title ?? note.title ?? '').trim().slice(0, NOTE_TITLE_MAX);
      note.body = text;
      note.updatedAt = Date.now();
      note.updatedBy = a.user.code;
      note.updatedByName = a.user.name;
      await env.FRIENDS.put(`shared:${id}`, JSON.stringify(note));
      return json(note);
    }

    if (url.pathname === '/shared/delete') {
      const a = await authed(env, body);
      if (a.error) return json({ error: a.error }, a.status);
      const id = String(body?.id || '');
      const raw = await env.FRIENDS.get(`shared:${id}`);
      if (!raw) return json({ error: 'Shared note not found' }, 404);
      const note = JSON.parse(raw);
      if (!(note.editors || []).includes(a.user.code)) return json({ error: 'That note is not shared with you' }, 403);
      await env.FRIENDS.delete(`shared:${id}`);
      for (const code of note.editors || []) {
        const u = hydrate(await loadUser(env, code));
        if (u) { u.shared = (u.shared || []).filter((x) => x !== id); await env.FRIENDS.put(`user:${u.code}`, JSON.stringify(u)); }
      }
      return json({ ok: true });
    }

    return json({ error: 'Not found' }, 404);
  } catch {
    return json({ error: 'Server error' }, 500);
  }
}

export default { fetch: handleFriends };
