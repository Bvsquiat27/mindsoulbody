/* Pew Talk online rooms: friends on separate phones see the same discussion
   card, answer privately, and see everyone's answers together.

   KV keys (all short lived):
     pew:<CODE>      → room, 3 hour TTL. CODE is 5 letters/digits.
       { room, host, status:'waiting'|'active'|'done', createdAt, updatedAt,
         deck:[card ids], round, phase:'vote'|'reveal',
         players:[{ code, name, joinedAt }], votes:{ code: 'amen'|'mercy'|'pray' },
         invited:[codes], timer: 0|30|60|90|120 seconds, voteEndsAt: ms or null }
     pewinv:<code>   → invitations for that person, newest first, max 10, 3 hour TTL.
       [{ room, from, fromName, ts }]

   Card text lives in the app (pewtalk-data.js). The server only stores ids.
   Answers stay hidden until everyone in the room has answered, the round
   timer runs out, or the host reveals the round; until then /pew/state lists
   who answered, not what. Phones poll /pew/state about every 1.5 seconds. */
export const PEW_ANSWERS = ['amen', 'mercy', 'pray'];
export const PEW_TIMERS = [0, 30, 60, 90, 120];
export const PEW_LIMITS = { MAX_PLAYERS: 6, DECK_MAX: 80, TTL_SECONDS: 3 * 60 * 60, INVITES_MAX: 10, RATE: 120, READ_RATE: 2400 };
const ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
const CARD_ID = /^[a-z0-9-]{1,32}$/;

function newCode() {
  const arr = new Uint8Array(5);
  crypto.getRandomValues(arr);
  let out = '';
  for (const b of arr) out += ALPHABET[b % ALPHABET.length];
  return out;
}
export function cleanPewCode(value) {
  const raw = String(value ?? '').trim().toUpperCase().replace(/^PEW-?/, '').replace(/[^A-Z0-9]/g, '');
  return /^[A-Z0-9]{5}$/.test(raw) ? raw : '';
}
export function cleanDeck(input) {
  if (!Array.isArray(input)) return null;
  const out = [];
  for (const id of input) {
    if (typeof id !== 'string' || !CARD_ID.test(id) || out.includes(id)) return null;
    out.push(id);
  }
  return out.length && out.length <= PEW_LIMITS.DECK_MAX ? out : null;
}
async function loadRoom(env, code) {
  if (!code) return null;
  try { const raw = await env.FRIENDS.get(`pew:${code}`); return raw ? JSON.parse(raw) : null; } catch { return null; }
}
async function saveRoom(env, room) {
  room.updatedAt = Date.now();
  await env.FRIENDS.put(`pew:${room.room}`, JSON.stringify(room), { expirationTtl: PEW_LIMITS.TTL_SECONDS });
}
async function loadInvites(env, code) {
  try { const raw = await env.FRIENDS.get(`pewinv:${code}`); const list = raw ? JSON.parse(raw) : []; return Array.isArray(list) ? list : []; } catch { return []; }
}
const allVoted = (room) => room.players.length > 0 && room.players.every((p) => room.votes[p.code]);
const timeUp = (room, now) => !!room.voteEndsAt && now >= room.voteEndsAt;
/* true when this call moved the round to reveal */
function maybeReveal(room, now = Date.now()) {
  if (room.status === 'active' && room.phase === 'vote' && (allVoted(room) || timeUp(room, now))) { room.phase = 'reveal'; return true; }
  return false;
}
function openRound(room, now = Date.now()) {
  room.phase = 'vote'; room.votes = {};
  room.voteEndsAt = room.timer ? now + room.timer * 1000 : null;
}
/* what a player may see: answers only once the round is revealed */
export function publicPewRoom(room) {
  const revealed = room.phase === 'reveal';
  return {
    room: room.room, host: room.host, status: room.status, round: room.round, phase: room.phase,
    total: room.deck.length, card: room.deck[room.round] || null, deck: room.deck,
    timer: room.timer || 0, msLeft: room.phase === 'vote' && room.voteEndsAt ? Math.max(0, room.voteEndsAt - Date.now()) : null,
    players: room.players.map((p) => ({ code: p.code, name: p.name, answered: !!room.votes[p.code], answer: revealed ? (room.votes[p.code] || null) : null })),
  };
}

/* deps: { authed, takeRate, friendsBothWays } from friends.mjs */
export async function handlePew(path, body, env, deps) {
  if (path === '/pew/hello') return [{ ok: true, pew: 1, answers: PEW_ANSWERS, maxPlayers: PEW_LIMITS.MAX_PLAYERS, timers: PEW_TIMERS }];
  const a = await deps.authed(env, body);
  if (a.error) return [{ error: a.error }, a.status];
  const me = a.user;
  const reads = path === '/pew/state' || path === '/pew/invites';
  if (!(await deps.takeRate(env, `rate:${reads ? 'pew-read' : 'pew'}:${me.code}`, reads ? PEW_LIMITS.READ_RATE : PEW_LIMITS.RATE))) return [{ error: 'Too many requests, try again in a little while' }, 429];

  if (path === '/pew/invites') {
    const now = Date.now(), live = [];
    for (const inv of await loadInvites(env, me.code)) {
      if (!inv || now - (inv.ts || 0) > PEW_LIMITS.TTL_SECONDS * 1000) continue;
      const room = await loadRoom(env, inv.room);
      if (room && room.status === 'waiting' && !room.players.some((p) => p.code === me.code)) live.push({ room: inv.room, fromName: inv.fromName });
    }
    return [{ invites: live }];
  }

  if (path === '/pew/create') {
    const deck = cleanDeck(body?.deck);
    if (!deck) return [{ error: 'That card deck is not valid' }, 400];
    let code = '';
    for (let i = 0; i < 8 && !code; i++) { const c = newCode(); if (!(await env.FRIENDS.get(`pew:${c}`))) code = c; }
    if (!code) return [{ error: 'Could not open a room' }, 500];
    const timer = Number(body?.timer ?? 0);
    if (!PEW_TIMERS.includes(timer)) return [{ error: 'Unknown timer' }, 400];
    const room = { room: code, host: me.code, status: 'waiting', createdAt: Date.now(), deck, round: 0, phase: 'vote', players: [{ code: me.code, name: me.name || 'Friend', joinedAt: Date.now() }], votes: {}, invited: [], timer, voteEndsAt: null };
    await saveRoom(env, room);
    return [publicPewRoom(room)];
  }

  const code = cleanPewCode(body?.room);
  const room = await loadRoom(env, code);
  if (!room) return path === '/pew/leave' ? [{ ok: true }] : [{ error: 'No room with that code' }, 404];
  const inRoom = room.players.some((p) => p.code === me.code);
  const isHost = room.host === me.code;

  if (path === '/pew/join') {
    if (inRoom) return [publicPewRoom(room)];
    /* friends of the host, or someone the host invited (invites only go to friends) */
    const friend = room.invited.includes(me.code) || !!(await deps.friendsBothWays(env, me, room.host));
    if (!friend) return [{ error: 'Pew Talk rooms are for friends. Add the host as a friend first.' }, 403];
    if (room.status === 'done') return [{ error: 'That room has finished' }, 409];
    if (room.players.length >= PEW_LIMITS.MAX_PLAYERS) return [{ error: 'That room is full' }, 409];
    room.players.push({ code: me.code, name: me.name || 'Friend', joinedAt: Date.now() });
    await saveRoom(env, room);
    return [publicPewRoom(room)];
  }
  if (!inRoom) return [{ error: 'You are not in that room' }, 403];

  if (path === '/pew/state') {
    if (maybeReveal(room)) await saveRoom(env, room);
    return [publicPewRoom(room)];
  }

  if (path === '/pew/invite') {
    if (!isHost) return [{ error: 'Only the host can invite' }, 403];
    if (room.status === 'done') return [{ error: 'That room has finished' }, 409];
    const friend = await deps.friendsBothWays(env, me, body?.to);
    if (!friend) return [{ error: 'You can only invite friends' }, 403];
    if (!room.invited.includes(friend.code)) { room.invited.push(friend.code); await saveRoom(env, room); }
    const list = (await loadInvites(env, friend.code)).filter((inv) => inv && inv.room !== room.room);
    list.unshift({ room: room.room, from: me.code, fromName: me.name || 'Friend', ts: Date.now() });
    await env.FRIENDS.put(`pewinv:${friend.code}`, JSON.stringify(list.slice(0, PEW_LIMITS.INVITES_MAX)), { expirationTtl: PEW_LIMITS.TTL_SECONDS });
    return [{ ok: true }];
  }

  if (path === '/pew/start') {
    if (!isHost) return [{ error: 'Only the host can start' }, 403];
    if (room.status !== 'waiting') return [publicPewRoom(room)];
    if (room.players.length < 2) return [{ error: 'Wait for a friend to join first' }, 400];
    room.status = 'active'; room.round = 0; openRound(room);
    await saveRoom(env, room);
    return [publicPewRoom(room)];
  }

  if (path === '/pew/vote') {
    if (room.status !== 'active') return [{ error: 'The game has not started' }, 409];
    if (Number(body?.round) !== room.round) return [{ error: 'That card has already moved on' }, 409];
    if (maybeReveal(room)) { await saveRoom(env, room); return [publicPewRoom(room)]; }
    if (room.phase !== 'vote') return [publicPewRoom(room)];
    const answer = String(body?.answer || '');
    if (!PEW_ANSWERS.includes(answer)) return [{ error: 'Unknown answer' }, 400];
    room.votes[me.code] = answer;
    maybeReveal(room);
    await saveRoom(env, room);
    return [publicPewRoom(room)];
  }

  if (path === '/pew/reveal') {
    if (!isHost) return [{ error: 'Only the host can show the answers' }, 403];
    if (room.status !== 'active') return [{ error: 'The game has not started' }, 409];
    room.phase = 'reveal';
    await saveRoom(env, room);
    return [publicPewRoom(room)];
  }

  if (path === '/pew/next') {
    if (!isHost) return [{ error: 'Only the host can deal the next card' }, 403];
    if (room.status !== 'active') return [{ error: 'The game has not started' }, 409];
    if (Number(body?.round) !== room.round) return [publicPewRoom(room)];
    if (room.round + 1 >= room.deck.length || body?.end) room.status = 'done';
    else { room.round += 1; openRound(room); }
    await saveRoom(env, room);
    return [publicPewRoom(room)];
  }

  if (path === '/pew/leave') {
    room.players = room.players.filter((p) => p.code !== me.code);
    delete room.votes[me.code];
    if (!room.players.length) { await env.FRIENDS.delete(`pew:${room.room}`); return [{ ok: true }]; }
    if (isHost) room.host = room.players[0].code;
    if (room.status === 'active' && room.players.length < 2) room.status = 'done';
    maybeReveal(room);
    await saveRoom(env, room);
    return [{ ok: true }];
  }

  return [{ error: 'Not found' }, 404];
}
