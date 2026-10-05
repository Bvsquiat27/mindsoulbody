// Friends API for Mind Soul & Body.
// Deploy as mindsoulbody-api with the existing production FRIENDS KV namespace.
// A new namespace would not contain current friend accounts.
//
// The account secret is stored only under auth:<code> so a request can be
// recognized. It is never copied onto a user, friend, note, message, score,
// or room record. POST /register is the one response that returns it, and
// only to the browser that just created the code. Every other response is
// built without that field.

const SHOWS = ['jeopardy', 'millionaire', 'feud', 'sound', 'babel', 'defend', 'doctrine'];
const TEXT_LIMITS = { handle: 24, city: 80, bio: 160 };
const CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const SECRET_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
const IMAGE_DATA = /^data:image\/(?:jpeg|png|webp);base64,[a-z0-9+/]+={0,2}$/i;
const IMAGE_HTTPS = /^https:\/\/[^\s"'<>]+$/i;
const PRIVATE_KEYS = new Set(['secret', 'password', 'passwordHash', 'recovery', 'recoveryHash', 'recovery_code', 'email', 'friends']);

const CORS = {
  'access-control-allow-origin': 'https://bvsquiat27.github.io',
  'access-control-allow-headers': 'content-type',
  'access-control-allow-methods': 'GET, POST, OPTIONS',
  'access-control-max-age': '86400',
  'content-type': 'application/json'
};

function json(body, status = 200) {
  return new Response(JSON.stringify(scrub(body)), { status, headers: CORS });
}

function scrub(value) {
  if (Array.isArray(value)) return value.map(scrub);
  if (value && typeof value === 'object') {
    const out = {};
    for (const [key, item] of Object.entries(value)) {
      if (PRIVATE_KEYS.has(key)) continue;
      out[key] = scrub(item);
    }
    return out;
  }
  return value;
}

function publicImage(value) {
  const raw = String(value ?? '').trim();
  if (!raw || raw.length > 7000000) return '';
  if (IMAGE_DATA.test(raw) || IMAGE_HTTPS.test(raw)) return raw;
  return '';
}

function num(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

function clip(value, max) {
  return String(value ?? '').trim().slice(0, max);
}

function normalizeStats(input) {
  const src = input && typeof input === 'object' ? input : {};
  const bests = {};
  const levels = {};
  for (const show of SHOWS) {
    bests[show] = num(src.bests && src.bests[show]);
    levels[show] = num(src.levels && src.levels[show]);
  }
  return { bests, levels, studies: num(src.studies) };
}

function friendCode(value) {
  const code = String(value ?? '').trim().toUpperCase();
  return /^MSB-[A-Z0-9]{6}$/.test(code) ? code : '';
}

function roomCode(value) {
  const code = String(value ?? '').trim().toUpperCase();
  return /^ROOM-[A-Z0-9]{6}$/.test(code) ? code : '';
}

function randomFrom(alphabet, length) {
  const bytes = new Uint8Array(length);
  crypto.getRandomValues(bytes);
  let out = '';
  for (const byte of bytes) out += alphabet[byte % alphabet.length];
  return out;
}

function hexId(bytes = 8) {
  const raw = new Uint8Array(bytes);
  crypto.getRandomValues(raw);
  return [...raw].map(b => b.toString(16).padStart(2, '0')).join('');
}

function secretMatches(stored, given) {
  const a = String(stored || '');
  const b = String(given || '');
  if (!a || a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
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
  const text = values.map(value => clip(value, TEXT_LIMITS[key])).find(Boolean) || '';
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
      if (img) {
        chosen = img;
        break;
      }
    }
    if (chosen) break;
  }
  if (!seen) return;
  if (chosen) user[storedKey] = chosen;
  else delete user[storedKey];
}

function applyProfile(user, body) {
  const nested = body && body.profile && typeof body.profile === 'object' && !Array.isArray(body.profile) ? body.profile : null;
  for (const key of ['handle', 'city', 'bio']) applyText(user, body, nested, key);
  applyImage(user, body, nested, 'avatar_data', ['avatar_data', 'avatar', 'avatarUrl']);
  applyImage(user, body, nested, 'cover_data', ['cover_data', 'cover', 'coverUrl']);
}

function friendView(user, unread = 0) {
  const view = {
    code: user.code,
    name: user.name || '',
    stats: normalizeStats(user.stats),
    updatedAt: user.updatedAt || 0,
    unread
  };
  const profile = {};
  for (const key of ['handle', 'city', 'bio', 'avatar_data', 'cover_data']) {
    if (typeof user[key] === 'string' && user[key]) {
      view[key] = user[key];
      profile[key] = user[key];
    }
  }
  if (Object.keys(profile).length) view.profile = profile;
  return view;
}

function cleanRef(ref) {
  if (!ref || typeof ref !== 'object') return null;
  const out = {};
  if (ref.book != null) out.book = clip(ref.book, 40);
  if (ref.chapter != null) out.chapter = num(ref.chapter);
  if (ref.verse != null) out.verse = num(ref.verse);
  if (ref.label) out.label = clip(ref.label, 120);
  return Object.keys(out).length ? out : null;
}

function pairKey(a, b) {
  return [a, b].sort().join(':');
}

async function loadUser(kv, code) {
  return kv.get(`user:${code}`, 'json');
}

async function saveUser(kv, user) {
  const stored = { ...user };
  delete stored.secret;
  delete stored.email;
  delete stored.password;
  delete stored.passwordHash;
  delete stored.recovery;
  delete stored.recoveryHash;
  delete stored.recovery_code;
  if (stored.profile && typeof stored.profile === 'object' && !Array.isArray(stored.profile)) {
    for (const key of PRIVATE_KEYS) delete stored.profile[key];
    if (!Object.keys(stored.profile).length) delete stored.profile;
  }
  stored.friends = (Array.isArray(stored.friends) ? stored.friends : []).filter(code => friendCode(code));
  await kv.put(`user:${user.code}`, JSON.stringify(stored));
}

async function loadMailbox(kv, code) {
  return (await kv.get(`mailbox:${code}`, 'json')) || { inbox: [], sent: [] };
}

async function saveMailbox(kv, code, box) {
  await kv.put(`mailbox:${code}`, JSON.stringify(scrub(box)));
}

async function requireUser(kv, body) {
  const code = friendCode(body && body.code);
  if (!code) return { error: json({ error: 'Unknown friend code' }, 404) };
  const user = await loadUser(kv, code);
  if (!user) return { error: json({ error: 'Unknown friend code' }, 404) };
  const secret = await kv.get(`auth:${code}`);
  if (!secretMatches(secret, body && body.secret)) return { error: json({ error: 'Wrong account secret' }, 401) };
  return { user };
}

function roomView(room) {
  return {
    room: room.room,
    show: room.show,
    level: room.level,
    host: room.host,
    status: room.status,
    createdAt: room.createdAt,
    startedAt: room.startedAt ?? null,
    players: (room.players || []).map(player => ({
      code: player.code,
      name: player.name || '',
      score: num(player.score),
      finished: !!player.finished
    }))
  };
}

function sharedView(note) {
  return {
    id: note.id,
    owner: note.owner,
    ownerName: note.ownerName || '',
    with: note.with,
    withName: note.withName || '',
    editors: Array.isArray(note.editors) ? note.editors.filter(code => friendCode(code)) : [],
    title: note.title || '',
    body: note.body || '',
    studyId: note.studyId || '',
    ref: note.ref || null,
    createdAt: note.createdAt || 0,
    updatedAt: note.updatedAt || 0,
    updatedBy: note.updatedBy || '',
    updatedByName: note.updatedByName || ''
  };
}

async function unreadFrom(kv, owner, friend) {
  const thread = (await kv.get(`thread:${pairKey(owner, friend)}`, 'json')) || [];
  return thread.filter(message => message && message.to === owner && message.from === friend && !message.read).length;
}

export async function handleFriends(request, env) {
  if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: CORS });
  const url = new URL(request.url);
  const path = url.pathname.replace(/\/+$/, '') || '/';
  const kv = env && env.FRIENDS;
  if (!kv) return json({ error: 'Friends storage is not configured.' }, 503);

  if (request.method === 'GET' && path === '/scores') {
    const show = clip(url.searchParams.get('show'), 40);
    const scores = (await kv.get(`board:${show}`, 'json')) || [];
    return json({ show, scores: scores.map(row => ({ code: row.code, name: row.name || '', score: num(row.score), level: num(row.level), ts: row.ts || 0 })) });
  }

  if (request.method !== 'POST') return json({ error: 'Not found' }, 404);
  let body = {};
  try { body = await request.json(); } catch { return json({ error: 'Not found' }, 400); }
  if (!body || typeof body !== 'object' || Array.isArray(body)) return json({ error: 'Not found' }, 400);

  if (path === '/register') {
    const name = clip(body.name, 40);
    let code = '';
    for (let attempt = 0; attempt < 8 && !code; attempt++) {
      const candidate = `MSB-${randomFrom(CODE_ALPHABET, 6)}`;
      if (!(await loadUser(kv, candidate))) code = candidate;
    }
    if (!code) return json({ error: 'Not found' }, 503);
    const secret = randomFrom(SECRET_ALPHABET, 32);
    const user = { code, name, updatedAt: Date.now(), stats: normalizeStats(null), friends: [] };
    await saveUser(kv, user);
    await kv.put(`auth:${code}`, secret);
    return new Response(JSON.stringify({ code, secret }), { status: 200, headers: CORS });
  }

  const auth = await requireUser(kv, body);
  if (auth.error) return auth.error;
  const me = auth.user;

  if (path === '/sync') {
    const friends = (Array.isArray(me.friends) ? me.friends : []).filter(code => friendCode(code));
    if (typeof body.name === 'string' && body.name.trim()) me.name = clip(body.name, 40);
    if (body.stats && typeof body.stats === 'object') me.stats = normalizeStats(body.stats);
    applyProfile(me, body);
    if (me.profile && typeof me.profile === 'object') {
      delete me.profile.friends;
      delete me.profile.secret;
      delete me.profile.email;
    }
    me.friends = friends;
    me.updatedAt = Date.now();
    await saveUser(kv, me);
    return json({ ok: true });
  }

  if (path === '/friends') {
    const rows = [];
    for (const code of me.friends || []) {
      const friend = await loadUser(kv, code);
      if (!friend) continue;
      rows.push(friendView(friend, await unreadFrom(kv, me.code, code)));
    }
    return json(rows);
  }

  if (path === '/friend/add') {
    const otherCode = friendCode(body.friendCode);
    if (!otherCode) return json({ error: 'No user with that friend code' }, 404);
    if (otherCode === me.code) return json({ error: 'You cannot add yourself' }, 400);
    const other = await loadUser(kv, otherCode);
    if (!other) return json({ error: 'No user with that friend code' }, 404);
    me.friends = Array.isArray(me.friends) ? me.friends : [];
    other.friends = Array.isArray(other.friends) ? other.friends : [];
    if (!me.friends.includes(otherCode)) me.friends.push(otherCode);
    if (!other.friends.includes(me.code)) other.friends.push(me.code);
    await saveUser(kv, me);
    await saveUser(kv, other);
    return json({ ok: true });
  }

  if (path === '/friend/remove') {
    const otherCode = friendCode(body.friendCode);
    if (otherCode && otherCode !== me.code) {
      me.friends = (me.friends || []).filter(code => code !== otherCode);
      await saveUser(kv, me);
      const other = await loadUser(kv, otherCode);
      if (other) {
        other.friends = (other.friends || []).filter(code => code !== me.code);
        await saveUser(kv, other);
      }
    }
    return json({ ok: true });
  }

  if (path === '/note/send') {
    const to = friendCode(body.to);
    if (!to || !(me.friends || []).includes(to)) return json({ error: 'Add that person as a friend first' }, 403);
    const recipient = await loadUser(kv, to);
    if (!recipient) return json({ error: 'No user with that friend code' }, 404);
    const note = {
      id: hexId(),
      from: me.code,
      fromName: me.name || '',
      to,
      title: clip(body.title, 120),
      body: clip(body.body, 4000),
      studyId: clip(body.studyId, 80),
      ref: cleanRef(body.ref),
      ts: Date.now(),
      read: false
    };
    const mine = await loadMailbox(kv, me.code);
    const theirs = await loadMailbox(kv, to);
    mine.sent.unshift(note);
    theirs.inbox.unshift({ ...note });
    await saveMailbox(kv, me.code, mine);
    await saveMailbox(kv, to, theirs);
    return json({ ok: true, id: note.id });
  }

  if (path === '/notes') {
    const box = await loadMailbox(kv, me.code);
    return json({ inbox: box.inbox || [], sent: box.sent || [] });
  }

  if (path === '/note/read') {
    const box = await loadMailbox(kv, me.code);
    const note = (box.inbox || []).find(item => item.id === body.id);
    if (note) note.read = true;
    await saveMailbox(kv, me.code, box);
    return json({ ok: true });
  }

  if (path === '/note/delete') {
    const box = await loadMailbox(kv, me.code);
    const side = body.box === 'sent' ? 'sent' : 'inbox';
    box[side] = (box[side] || []).filter(item => item.id !== body.id);
    await saveMailbox(kv, me.code, box);
    return json({ ok: true });
  }

  if (path === '/msg/send') {
    const to = friendCode(body.to);
    if (!to || !(me.friends || []).includes(to)) return json({ error: 'Add that person as a friend first' }, 403);
    const recipient = await loadUser(kv, to);
    if (!recipient) return json({ error: 'No user with that friend code' }, 404);
    const key = `thread:${pairKey(me.code, to)}`;
    const thread = (await kv.get(key, 'json')) || [];
    const message = { id: hexId(), from: me.code, fromName: me.name || '', to, body: clip(body.body, 4000), ts: Date.now(), read: false };
    thread.push(message);
    await kv.put(key, JSON.stringify(scrub(thread)));
    return json({ ok: true, id: message.id });
  }

  if (path === '/msg/thread') {
    const withCode = friendCode(body.with);
    if (!withCode) return json({ with: '', messages: [] });
    const key = `thread:${pairKey(me.code, withCode)}`;
    const thread = (await kv.get(key, 'json')) || [];
    let changed = false;
    for (const message of thread) {
      if (message && message.to === me.code && message.from === withCode && !message.read) {
        message.read = true;
        changed = true;
      }
    }
    if (changed) await kv.put(key, JSON.stringify(scrub(thread)));
    return json({
      with: withCode,
      messages: thread.map(message => ({
        id: message.id,
        from: message.from,
        fromName: message.fromName || '',
        body: message.body || '',
        ts: message.ts || 0,
        read: !!message.read
      }))
    });
  }

  if (path === '/shared/create') {
    const to = friendCode(body.to);
    if (!to || !(me.friends || []).includes(to)) return json({ error: 'Add that person as a friend first' }, 403);
    const recipient = await loadUser(kv, to);
    if (!recipient) return json({ error: 'No user with that friend code' }, 404);
    const now = Date.now();
    const note = sharedView({
      id: hexId(),
      owner: me.code,
      ownerName: me.name || '',
      with: to,
      withName: recipient.name || '',
      editors: [me.code, to],
      title: clip(body.title, 120),
      body: clip(body.body, 4000),
      studyId: clip(body.studyId, 80),
      ref: cleanRef(body.ref),
      createdAt: now,
      updatedAt: now,
      updatedBy: me.code,
      updatedByName: me.name || ''
    });
    await kv.put(`shared:${note.id}`, JSON.stringify(note));
    for (const code of [me.code, to]) {
      const ids = (await kv.get(`shared-index:${code}`, 'json')) || [];
      ids.unshift(note.id);
      await kv.put(`shared-index:${code}`, JSON.stringify(ids));
    }
    return json(note);
  }

  if (path === '/shared/list') {
    const ids = (await kv.get(`shared-index:${me.code}`, 'json')) || [];
    const notes = [];
    for (const id of ids) {
      const note = await kv.get(`shared:${id}`, 'json');
      if (note) notes.push(sharedView(note));
    }
    return json({ notes });
  }

  if (path === '/shared/update') {
    const note = await kv.get(`shared:${clip(body.id, 40)}`, 'json');
    if (!note || !Array.isArray(note.editors) || !note.editors.includes(me.code)) return json({ error: 'Not found' }, 404);
    const text = clip(body.body, 4000);
    if (!text) return json({ error: 'Not found' }, 400);
    note.title = clip(body.title, 120);
    note.body = text;
    note.updatedAt = Date.now();
    note.updatedBy = me.code;
    note.updatedByName = me.name || '';
    const view = sharedView(note);
    await kv.put(`shared:${note.id}`, JSON.stringify(view));
    return json(view);
  }

  if (path === '/shared/delete') {
    const id = clip(body.id, 40);
    const note = await kv.get(`shared:${id}`, 'json');
    if (note && Array.isArray(note.editors) && note.editors.includes(me.code)) {
      await kv.delete(`shared:${id}`);
      for (const code of note.editors) {
        const ids = ((await kv.get(`shared-index:${code}`, 'json')) || []).filter(item => item !== id);
        await kv.put(`shared-index:${code}`, JSON.stringify(ids));
      }
    }
    return json({ ok: true });
  }

  if (path === '/scores/submit') {
    const show = clip(body.show, 40);
    if (!show) return json({ error: 'Not found' }, 400);
    const row = { code: me.code, name: me.name || '', score: num(body.score), level: num(body.level), ts: Date.now() };
    const board = (await kv.get(`board:${show}`, 'json')) || [];
    const next = board.filter(item => item.code !== me.code);
    const previous = board.find(item => item.code === me.code);
    next.push(!previous || row.score >= num(previous.score) ? row : previous);
    next.sort((a, b) => num(b.score) - num(a.score));
    await kv.put(`board:${show}`, JSON.stringify(next.map(item => ({ code: item.code, name: item.name || '', score: num(item.score), level: num(item.level), ts: item.ts || 0 }))));
    return json({ ok: true });
  }

  if (path === '/room/create') {
    let roomId = '';
    for (let attempt = 0; attempt < 8 && !roomId; attempt++) {
      const candidate = `ROOM-${randomFrom(CODE_ALPHABET, 6)}`;
      if (!(await kv.get(`room:${candidate}`, 'json'))) roomId = candidate;
    }
    if (!roomId) return json({ error: 'Not found' }, 503);
    const room = {
      room: roomId,
      show: clip(body.show, 40),
      level: num(body.level) || 1,
      host: me.code,
      status: 'waiting',
      createdAt: Date.now(),
      startedAt: null,
      players: [{ code: me.code, name: me.name || '', score: 0, finished: false }]
    };
    await kv.put(`room:${roomId}`, JSON.stringify(room));
    return json(roomView(room));
  }

  if (path === '/room/join' || path === '/room/start' || path === '/room/score' || path === '/room/state' || path === '/room/leave') {
    const id = roomCode(body.room);
    const room = id ? await kv.get(`room:${id}`, 'json') : null;
    if (!room) return json({ error: 'Not found' }, 404);
    const player = (room.players || []).find(item => item.code === me.code);

    if (path === '/room/join') {
      if (!player) room.players.push({ code: me.code, name: me.name || '', score: 0, finished: false });
      await kv.put(`room:${id}`, JSON.stringify(roomView(room)));
      return json(roomView(room));
    }
    if (!player && path !== '/room/state') return json({ error: 'Not found' }, 404);
    if (path === '/room/start') {
      if (room.host !== me.code) return json({ error: 'Not found' }, 403);
      if (room.status === 'waiting') {
        room.status = 'active';
        room.startedAt = Date.now();
      }
    }
    if (path === '/room/score' && player && room.status !== 'waiting') {
      player.score = num(body.score);
      player.finished = !!body.finished;
      if ((room.players || []).length > 0 && room.players.every(item => item.finished)) room.status = 'done';
    }
    if (path === '/room/leave') {
      room.players = (room.players || []).filter(item => item.code !== me.code);
      if (room.host === me.code && room.players[0]) room.host = room.players[0].code;
      if (!room.players.length) {
        await kv.delete(`room:${id}`);
        return json({ ok: true });
      }
      await kv.put(`room:${id}`, JSON.stringify(roomView(room)));
      return json({ ok: true });
    }
    const view = roomView(room);
    await kv.put(`room:${id}`, JSON.stringify(view));
    return json(view);
  }

  return json({ error: 'Not found' }, 404);
}

export default { fetch: (request, env) => handleFriends(request, env) };
