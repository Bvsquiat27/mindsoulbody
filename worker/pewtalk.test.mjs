/* Pew Talk online rooms: friends only, answers hidden until everyone answers,
   the host deals, invites reach friends, and leaving cleans up. */
import assert from 'node:assert/strict';
import test from 'node:test';
import { handleFriends } from './friends.mjs';
import { cleanDeck, cleanPewCode } from './pewtalk.mjs';

function memoryKv() {
  const d = new Map();
  return {
    async get(k) { return d.has(k) ? d.get(k) : null; },
    async put(k, v) { d.set(k, String(v)); },
    async delete(k) { d.delete(k); },
    raw: d,
  };
}
async function call(kv, path, body) {
  const r = await handleFriends(new Request(`https://friends.test${path}`, { method: 'POST', headers: { 'content-type': 'application/json', origin: 'https://bvsquiat27.github.io' }, body: JSON.stringify(body ?? {}) }), { FRIENDS: kv });
  return { status: r.status, data: await r.json() };
}
const reg = async (kv, name) => (await call(kv, '/register', { name })).data;
const as = (u, extra) => ({ code: u.code, secret: u.secret, ...extra });
async function friends(kv, a, b) {
  await call(kv, '/friend/add', as(a, { friendCode: b.code }));
  await call(kv, '/friend/accept', as(b, { friendCode: a.code }));
}
const DECK = ['same-seat', 'on-time', 'hum-along'];

test('hello answers without an account so the app can tell online play is live', async () => {
  const r = await call(memoryKv(), '/pew/hello', {});
  assert.equal(r.status, 200);
  assert.equal(r.data.pew, 1);
  assert.deepEqual(r.data.answers, ['amen', 'mercy', 'pray']);
});

test('codes and decks are cleaned', () => {
  assert.equal(cleanPewCode(' pew-ab2cd '), 'AB2CD');
  assert.equal(cleanPewCode('AB2C'), '');
  assert.deepEqual(cleanDeck(DECK), DECK);
  assert.equal(cleanDeck(['ok', 'ok']), null);
  assert.equal(cleanDeck(['<script>']), null);
  assert.equal(cleanDeck([]), null);
});

test('a full round: join, answers stay hidden, reveal when all answer, host deals, game ends', async () => {
  const kv = memoryKv();
  const a = await reg(kv, 'Ana'), b = await reg(kv, 'Ben'), c = await reg(kv, 'Cy');
  await friends(kv, a, b);
  const made = await call(kv, '/pew/create', as(a, { deck: DECK }));
  assert.equal(made.status, 200);
  const room = made.data.room;
  assert.match(room, /^[A-Z0-9]{5}$/);
  // a stranger cannot join
  assert.equal((await call(kv, '/pew/join', as(c, { room }))).status, 403);
  assert.equal((await call(kv, '/pew/state', as(c, { room }))).status, 403);
  // a friend can, with or without the PEW- prefix
  assert.equal((await call(kv, '/pew/join', as(b, { room: `pew-${room.toLowerCase()}` }))).status, 200);
  assert.equal((await call(kv, '/pew/start', as(b, { room }))).status, 403, 'only the host starts');
  let st = (await call(kv, '/pew/start', as(a, { room }))).data;
  assert.equal(st.status, 'active'); assert.equal(st.card, 'same-seat');
  st = (await call(kv, '/pew/vote', as(a, { room, round: 0, answer: 'amen' }))).data;
  assert.equal(st.phase, 'vote');
  // Ben sees that Ana answered, not what
  const seen = (await call(kv, '/pew/state', as(b, { room }))).data;
  const ana = seen.players.find((p) => p.code === a.code);
  assert.equal(ana.answered, true); assert.equal(ana.answer, null);
  assert.equal((await call(kv, '/pew/vote', as(b, { room, round: 0, answer: 'nope' }))).status, 400);
  assert.equal((await call(kv, '/pew/vote', as(b, { room, round: 3, answer: 'pray' }))).status, 409);
  st = (await call(kv, '/pew/vote', as(b, { room, round: 0, answer: 'pray' }))).data;
  assert.equal(st.phase, 'reveal');
  assert.deepEqual(st.players.map((p) => p.answer).sort(), ['amen', 'pray']);
  // only the host deals; a stale round number is ignored
  assert.equal((await call(kv, '/pew/next', as(b, { room, round: 0 }))).status, 403);
  st = (await call(kv, '/pew/next', as(a, { room, round: 0 }))).data;
  assert.equal(st.round, 1); assert.equal(st.phase, 'vote'); assert.equal(st.card, 'on-time');
  st = (await call(kv, '/pew/next', as(a, { room, round: 0 }))).data;
  assert.equal(st.round, 1, 'a double tap does not skip a card');
  // the host can reveal early when someone stepped away
  await call(kv, '/pew/vote', as(a, { room, round: 1, answer: 'mercy' }));
  st = (await call(kv, '/pew/reveal', as(a, { room }))).data;
  assert.equal(st.phase, 'reveal');
  assert.equal(st.players.find((p) => p.code === b.code).answer, null);
  st = (await call(kv, '/pew/next', as(a, { room, round: 1, end: true }))).data;
  assert.equal(st.status, 'done');
});

test('invites go to friends only and show up for the friend until they join', async () => {
  const kv = memoryKv();
  const a = await reg(kv, 'Ana'), b = await reg(kv, 'Ben'), c = await reg(kv, 'Cy');
  await friends(kv, a, b);
  const room = (await call(kv, '/pew/create', as(a, { deck: DECK }))).data.room;
  assert.equal((await call(kv, '/pew/invite', as(a, { room, to: c.code }))).status, 403);
  assert.equal((await call(kv, '/pew/invite', as(a, { room, to: b.code }))).status, 200);
  let inv = (await call(kv, '/pew/invites', as(b))).data.invites;
  assert.deepEqual(inv, [{ room, fromName: 'Ana' }]);
  assert.equal(JSON.stringify(inv).includes(a.code), false, 'the inviter friend code is not echoed');
  await call(kv, '/pew/join', as(b, { room }));
  inv = (await call(kv, '/pew/invites', as(b))).data.invites;
  assert.deepEqual(inv, []);
});

test('rooms hold six; leaving hands over the host and the last one out deletes the room', async () => {
  const kv = memoryKv();
  const host = await reg(kv, 'Host');
  const others = [];
  for (let i = 0; i < 6; i++) { const u = await reg(kv, `P${i}`); await friends(kv, host, u); others.push(u); }
  const room = (await call(kv, '/pew/create', as(host, { deck: DECK }))).data.room;
  for (let i = 0; i < 5; i++) assert.equal((await call(kv, '/pew/join', as(others[i], { room }))).status, 200);
  assert.equal((await call(kv, '/pew/join', as(others[5], { room }))).status, 409, 'the seventh is turned away');
  await call(kv, '/pew/leave', as(host, { room }));
  const st = (await call(kv, '/pew/state', as(others[0], { room }))).data;
  assert.equal(st.host, others[0].code);
  for (let i = 0; i < 5; i++) await call(kv, '/pew/leave', as(others[i], { room }));
  assert.equal(kv.raw.has(`pew:${room}`), false);
});

test('bad secrets and bad decks are refused', async () => {
  const kv = memoryKv();
  const a = await reg(kv, 'Ana');
  assert.equal((await call(kv, '/pew/create', { code: a.code, secret: 'x', deck: DECK })).status, 401);
  assert.equal((await call(kv, '/pew/create', as(a, { deck: 'nope' }))).status, 400);
});

test('a round timer reveals everyone together when time runs out, and late answers are not counted', async () => {
  const kv = memoryKv();
  const a = await reg(kv, 'Ana'), b = await reg(kv, 'Ben');
  await friends(kv, a, b);
  assert.equal((await call(kv, '/pew/create', as(a, { deck: DECK, timer: 45 }))).status, 400, 'only the offered timers');
  const room = (await call(kv, '/pew/create', as(a, { deck: DECK, timer: 30 }))).data.room;
  await call(kv, '/pew/join', as(b, { room }));
  let st = (await call(kv, '/pew/start', as(a, { room }))).data;
  assert.equal(st.timer, 30); assert.ok(st.msLeft > 25000 && st.msLeft <= 30000);
  await call(kv, '/pew/vote', as(a, { room, round: 0, answer: 'amen' }));
  // time runs out on the server clock
  const saved = JSON.parse(kv.raw.get(`pew:${room}`)); saved.voteEndsAt = Date.now() - 1; kv.raw.set(`pew:${room}`, JSON.stringify(saved));
  st = (await call(kv, '/pew/state', as(b, { room }))).data;
  assert.equal(st.phase, 'reveal'); assert.equal(st.msLeft, null);
  assert.equal(st.players.find((p) => p.code === a.code).answer, 'amen');
  st = (await call(kv, '/pew/vote', as(b, { room, round: 0, answer: 'pray' }))).data;
  assert.equal(st.players.find((p) => p.code === b.code).answer, null, 'too late for this card');
  st = (await call(kv, '/pew/next', as(a, { room, round: 0 }))).data;
  assert.equal(st.phase, 'vote'); assert.ok(st.msLeft > 25000, 'the clock restarts for the next card');
});

test('without a timer the round waits for everyone', async () => {
  const kv = memoryKv();
  const a = await reg(kv, 'Ana'), b = await reg(kv, 'Ben');
  await friends(kv, a, b);
  const room = (await call(kv, '/pew/create', as(a, { deck: DECK }))).data.room;
  await call(kv, '/pew/join', as(b, { room }));
  const st = (await call(kv, '/pew/start', as(a, { room }))).data;
  assert.equal(st.timer, 0); assert.equal(st.msLeft, null);
});
