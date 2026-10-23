/* Oct 23 audit fixes: ✓ pressed at the same moment, deleting an account,
   short public names on the leaderboard, fewer lost board writes, and the
   security headers on every reply. */
import assert from 'node:assert/strict';
import test from 'node:test';
import { handleFriends, boardName, SECURITY_HEADERS } from './friends.mjs';

/* memory KV where each read or write takes 0..latency ms, so Promise.all interleaves */
function memoryKv(latency = 0) {
  const d = new Map();
  const tick = () => new Promise((r) => (latency ? setTimeout(r, Math.random() * latency) : setImmediate(r)));
  return {
    async get(k) { await tick(); return d.has(k) ? d.get(k) : null; },
    async put(k, v) { await tick(); d.set(k, String(v)); },
    async delete(k) { await tick(); d.delete(k); },
    raw: d,
  };
}
const ORIGIN = 'https://bvsquiat27.github.io';
async function call(kv, path, body, method = 'POST') {
  const init = { method, headers: { 'content-type': 'application/json', origin: ORIGIN } };
  if (method === 'POST') init.body = JSON.stringify(body ?? {});
  const r = await handleFriends(new Request(`https://friends.test${path}`, init), { FRIENDS: kv });
  return { status: r.status, headers: r.headers, data: r.status === 204 ? null : await r.json() };
}
const as = (u, extra) => ({ code: u.code, secret: u.secret, ...extra });
const reg = async (kv, name) => (await call(kv, '/register', { name })).data;
async function friends(kv, a, b) {
  await call(kv, '/friend/add', as(a, { friendCode: b.code }));
  await call(kv, '/friend/accept', as(b, { friendCode: a.code }));
}
const user = (kv, code) => JSON.parse(kv.raw.get(`user:${code}`));

test('both people pressing ✓ at the same moment finish the trade, every time', async () => {
  for (let round = 0; round < 3; round++) {
    const kv = memoryKv(20);
    const a = await reg(kv, 'Ana'), b = await reg(kv, 'Ben');
    await friends(kv, a, b);
    await call(kv, '/sync', as(a, { squishies: { ids: ['lamb', 'stone'] } }));
    await call(kv, '/sync', as(b, { squishies: { ids: ['lamb', 'basket'] } }));
    const t = (await call(kv, '/trade/request', as(a, { with: b.code, offer: ['stone'] }))).data.trade;
    const up = (await call(kv, '/trade/update', as(b, { trade: t.id, offer: ['basket'] }))).data.trade;
    assert.equal(up.status, 'open');
    const [ra, rb] = await Promise.all([
      call(kv, '/trade/confirm', as(a, { trade: t.id, rev: up.rev })),
      call(kv, '/trade/confirm', as(b, { trade: t.id, rev: up.rev })),
    ]);
    assert.equal(ra.status, 200); assert.equal(rb.status, 200);
    const state = (await call(kv, '/trade/state', as(a, { trade: t.id }))).data.trade;
    assert.equal(state.status, 'done', `round ${round}: the trade completed`);
    assert.deepEqual(user(kv, a.code).squishies.ids.sort(), ['basket', 'lamb'], `round ${round}: Ana got the basket once`);
    assert.deepEqual(user(kv, b.code).squishies.ids.sort(), ['lamb', 'stone'], `round ${round}: Ben got the stone once`);
    assert.equal(user(kv, a.code).squishies.pending.filter((p) => p.trade === t.id).length, 1, 'one pending swap, not two');
  }
});

test('a ✓ that neither confirm saw is finished by the next look at the trade', async () => {
  const kv = memoryKv();
  const a = await reg(kv, 'Ana'), b = await reg(kv, 'Ben');
  await friends(kv, a, b);
  await call(kv, '/sync', as(a, { squishies: { ids: ['stone'] } }));
  await call(kv, '/sync', as(b, { squishies: { ids: ['basket'] } }));
  const t = (await call(kv, '/trade/request', as(a, { with: b.code, offer: ['stone'] }))).data.trade;
  const up = (await call(kv, '/trade/update', as(b, { trade: t.id, offer: ['basket'] }))).data.trade;
  await call(kv, '/trade/confirm', as(a, { trade: t.id, rev: up.rev }));
  // Ben's ✓ lands in its key, as if his confirm answered before Ana's ✓ spread
  kv.raw.set(`tc:${t.id}:${b.code}`, String(up.rev));
  const list = (await call(kv, '/trade/list', as(b))).data.trades;
  assert.equal(list[0].status, 'done');
  assert.deepEqual(user(kv, b.code).squishies.ids, ['stone']);
});

test('a changed board still needs a fresh ✓ from both', async () => {
  const kv = memoryKv();
  const a = await reg(kv, 'Ana'), b = await reg(kv, 'Ben');
  await friends(kv, a, b);
  await call(kv, '/sync', as(a, { squishies: { ids: ['stone', 'tree'] } }));
  await call(kv, '/sync', as(b, { squishies: { ids: ['basket'] } }));
  const t = (await call(kv, '/trade/request', as(a, { with: b.code, offer: ['stone'] }))).data.trade;
  const up = (await call(kv, '/trade/update', as(b, { trade: t.id, offer: ['basket'] }))).data.trade;
  assert.equal((await call(kv, '/trade/confirm', as(b, { trade: t.id, rev: up.rev }))).data.trade.checks[b.code], up.rev);
  const changed = (await call(kv, '/trade/update', as(a, { trade: t.id, offer: ['tree'] }))).data.trade;
  assert.equal((await call(kv, '/trade/confirm', as(a, { trade: t.id, rev: up.rev }))).status, 409, 'old board');
  const r = await call(kv, '/trade/confirm', as(a, { trade: t.id, rev: changed.rev }));
  assert.equal(r.data.trade.status, 'open', 'Ben has not pressed ✓ on the new board');
});

test('deleting an account removes its keys and every link to it', async () => {
  const kv = memoryKv();
  const a = await reg(kv, 'Ana Maria Lopez'), b = await reg(kv, 'Ben'), c = await reg(kv, 'Cy');
  await friends(kv, a, b);
  await call(kv, '/friend/add', as(a, { friendCode: c.code })); // a waiting request
  await call(kv, '/msg/send', as(a, { to: b.code, body: 'hi' }));
  await call(kv, '/note/send', as(a, { to: b.code, body: 'note' }));
  await call(kv, '/msg/send', as(b, { to: a.code, body: 'hello' }));
  await call(kv, '/shared/create', as(a, { to: b.code, body: 'together' }));
  await call(kv, '/study/add', as(a, { with: b.code, question: 'q?', answer: 'a' }));
  await call(kv, '/verse/send', as(a, { to: b.code, text: 'In the beginning', reference: 'Gen 1:1', book: 1, chapter: 1, verse: 1 }));
  assert.equal((await call(kv, '/lessons/sync', as(a, { lessons: { current: null, done: [] } }))).status, 200);
  assert.equal((await call(kv, '/mynotes/sync', as(a, { notes: [] }))).status, 200);
  assert.ok(kv.raw.has(`lessons:${a.code}`) && kv.raw.has(`mynotes:${a.code}`) && kv.raw.has(`versebox:${b.code}`));
  assert.ok([...kv.raw.keys()].some((k) => k.startsWith('study:')) && [...kv.raw.keys()].some((k) => k.startsWith('shared:')));
  await call(kv, '/scores/submit', as(a, { show: 'jeopardy', score: 50, level: 1 }));
  await call(kv, '/scores/submit', as(b, { show: 'jeopardy', score: 40, level: 1 }));
  await call(kv, '/sync', as(a, { squishies: { ids: ['stone'] } }));
  await call(kv, '/sync', as(b, { squishies: { ids: ['basket'] } }));
  const t = (await call(kv, '/trade/request', as(a, { with: b.code, offer: ['stone'] }))).data.trade;

  assert.equal((await call(kv, '/account/delete', { code: a.code, secret: 'nope', confirm: 'DELETE' })).status, 401, 'needs the account secret');
  assert.equal((await call(kv, '/account/delete', as(a))).status, 400, 'needs the confirm word');
  assert.ok(kv.raw.has(`user:${a.code}`), 'nothing deleted yet');
  const r = await call(kv, '/account/delete', as(a, { confirm: 'DELETE' }));
  assert.equal(r.status, 200);

  const left = [...kv.raw.entries()].filter(([k, v]) => k.includes(a.code) || v.includes(a.code));
  assert.deepEqual(left.map(([k]) => k), [`trade:${t.id}`], 'only the closed trade record names the account, until it expires');
  assert.equal(JSON.parse(kv.raw.get(`trade:${t.id}`)).status, 'cancelled');
  const ben = user(kv, b.code);
  assert.deepEqual(ben.friends, []);
  assert.equal(ben.threads[a.code], undefined);
  assert.deepEqual(ben.inbox, []);
  assert.deepEqual(ben.shared, []);
  assert.deepEqual(user(kv, c.code).requestsIn, []);
  const board = JSON.parse(kv.raw.get('leaderboard'));
  assert.deepEqual(board.jeopardy.map((e) => e.name), ['Ben']);
  assert.equal((await call(kv, '/sync', as(a))).status, 404, 'the account is gone');
  assert.equal((await call(kv, '/friends', as(b))).data.length, 0);
});

test('the leaderboard shows a handle or a first name, never a full name', async () => {
  assert.equal(boardName('Ana Maria Lopez'), 'Ana');
  assert.equal(boardName('  Ben  '), 'Ben');
  assert.equal(boardName('Ana Lopez', '@ana_l'), 'ana_l');
  assert.equal(boardName(''), '');
  const kv = memoryKv();
  const a = await reg(kv, 'Ana Maria Lopez'), b = await reg(kv, 'Ben Stone');
  await call(kv, '/sync', as(b, { handle: 'benny' }));
  await call(kv, '/scores/submit', as(a, { show: 'jeopardy', score: 50, level: 1 }));
  await call(kv, '/scores/submit', as(b, { show: 'jeopardy', score: 40, level: 1 }));
  // an old row stored before the fix still comes out short
  const board = JSON.parse(kv.raw.get('leaderboard'));
  board.jeopardy.push({ code: 'MSB-OLD000', name: 'Old Full Name', score: 1, level: 1, ts: 1 });
  kv.raw.set('leaderboard', JSON.stringify(board));
  const names = (await call(kv, '/scores?show=jeopardy', null, 'GET')).data.scores.map((s) => s.name);
  assert.deepEqual(names, ['Ana', 'benny', 'Old']);
  assert.ok(!kv.raw.get('leaderboard').includes('Lopez'), 'the full name is not stored on the board');
});

test('scores sent at the same moment are all kept on the board', async () => {
  for (let round = 0; round < 3; round++) {
    const kv = memoryKv(20);
    const players = [];
    for (let i = 0; i < 6; i++) players.push(await reg(kv, `P${i}`));
    await Promise.all(players.map((p, i) => call(kv, '/scores/submit', as(p, { show: 'jeopardy', score: 10 + i, level: 1 }))));
    const rows = JSON.parse(kv.raw.get('leaderboard')).jeopardy;
    assert.equal(rows.length, 6, `round ${round}: no score was lost`);
  }
});

test('API replies carry security headers and CORS still works', async () => {
  const kv = memoryKv();
  for (const r of [await call(kv, '/health', null, 'GET'), await call(kv, '/scores', null, 'GET'), await call(kv, '/sync', {}), await call(kv, '/sync', null, 'OPTIONS')]) {
    for (const [k, v] of Object.entries(SECURITY_HEADERS)) assert.equal(r.headers.get(k), v, k);
    assert.equal(r.headers.get('access-control-allow-origin'), ORIGIN);
    assert.equal(r.headers.get('x-content-type-options'), 'nosniff');
    assert.equal(r.headers.get('referrer-policy'), 'no-referrer');
  }
});
