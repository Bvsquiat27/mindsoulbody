import assert from 'node:assert/strict';
import test from 'node:test';
import { FRIEND_LIMITS, RATE_LIMITS, handleFriends } from './friends.mjs';

function memoryKv() {
  const data = new Map();
  const options = new Map();
  return {
    async get(key, type) {
      if (!data.has(key)) return null;
      const value = data.get(key);
      return type === 'json' ? JSON.parse(value) : value;
    },
    async put(key, value, opts) {
      data.set(key, String(value));
      if (opts) options.set(key, opts);
    },
    async delete(key) {
      data.delete(key);
      options.delete(key);
    },
    options() { return options; },
    keys() { return [...data.keys()]; }
  };
}

function call(kv, path, body, method = 'POST', origin = 'https://bvsquiat27.github.io') {
  const request = new Request(`https://friends.test${path}`, {
    method,
    headers: { 'content-type': 'application/json', origin },
    body: method === 'GET' || method === 'OPTIONS' ? undefined : JSON.stringify(body ?? {})
  });
  return handleFriends(request, { FRIENDS: kv });
}

async function read(response) {
  const text = await response.text();
  let data = null;
  try { data = text ? JSON.parse(text) : null; } catch { data = text; }
  return { status: response.status, data, text, headers: response.headers };
}

function hasSecretKey(value) {
  if (Array.isArray(value)) return value.some(hasSecretKey);
  if (value && typeof value === 'object') {
    if (Object.prototype.hasOwnProperty.call(value, 'secret') || Object.prototype.hasOwnProperty.call(value, 'secretHash')) return true;
    return Object.values(value).some(hasSecretKey);
  }
  return false;
}

async function sha256hex(text) {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

const AVATAR = 'data:image/png;base64,aaaa';
const COVER = 'https://cdn.example/cover.webp';

test('sync stores public profile fields and another browser receives them without the secret', async () => {
  const kv = memoryKv();
  const mary = (await read(await call(kv, '/register', { name: 'Mary' }))).data;
  const alex = (await read(await call(kv, '/register', { name: 'Alex' }))).data;
  assert.equal(mary.name, undefined);
  assert.equal(typeof mary.secret, 'string');
  assert.equal(mary.secret.length, 32);
  assert.match(mary.publicId, /^[a-f0-9]{16}$/);
  assert.equal(mary.secretHash, undefined);

  const sync = await read(await call(kv, '/sync', {
    code: mary.code,
    secret: mary.secret,
    name: 'Mary',
    stats: { studies: 1, levels: { jeopardy: 2, extra: 9 }, bests: { feud: 4 }, ignored: 1 },
    handle: 'maryh',
    city: 'Antioch',
    bio: 'Reads in the morning',
    denomination: 'Basically Orthodox',
    avatar_data: AVATAR,
    cover_data: COVER,
    email: 'mary@example.com',
    profile: {
      handle: 'maryh',
      city: 'Antioch',
      bio: 'Reads in the morning',
      denomination: 'Basically Orthodox',
      avatar_data: AVATAR,
      cover_data: COVER,
      secret: mary.secret,
      email: 'mary@example.com',
      password: 'nope'
    }
  }));
  assert.equal(sync.status, 200);
  assert.equal(sync.data.ok, true);
  assert.equal(sync.data.publicId, mary.publicId);
  assert.equal(sync.text.includes(mary.secret), false);
  assert.equal(sync.headers.get('access-control-allow-origin'), 'https://bvsquiat27.github.io');

  const requested = await read(await call(kv, '/friend/add', { code: alex.code, secret: alex.secret, friendCode: mary.code.toLowerCase() }));
  assert.equal(requested.data.status, 'pending');
  const notYet = await read(await call(kv, '/friends', { code: alex.code, secret: alex.secret }));
  assert.deepEqual(notYet.data, []);
  await call(kv, '/friend/accept', { code: mary.code, secret: mary.secret, friendCode: alex.code });
  const friends = await read(await call(kv, '/friends', { code: alex.code, secret: alex.secret }));
  assert.equal(friends.status, 200);
  assert.equal(friends.data.length, 1);
  const row = friends.data[0];
  assert.equal(row.code, mary.code);
  assert.equal(row.name, 'Mary');
  assert.equal(row.handle, 'maryh');
  assert.equal(row.city, 'Antioch');
  assert.equal(row.bio, 'Reads in the morning');
  assert.equal(row.denomination, 'Basically Orthodox');
  assert.equal(row.avatar_data, AVATAR);
  assert.equal(row.cover_data, COVER);
  assert.equal(row.profile.handle, 'maryh');
  assert.equal(row.profile.city, 'Antioch');
  assert.equal(row.profile.bio, 'Reads in the morning');
  assert.equal(row.profile.denomination, 'Basically Orthodox');
  assert.equal(row.profile.avatar_data, AVATAR);
  assert.equal(row.profile.cover_data, COVER);
  assert.equal(row.stats.studies, 1);
  assert.equal(row.stats.levels.jeopardy, 2);
  assert.equal(row.stats.bests.feud, 4);
  assert.equal(row.stats.extra, undefined);
  assert.equal(row.stats.levels.extra, undefined);
  assert.equal(hasSecretKey(row), false);
  assert.equal(friends.text.includes(mary.secret), false);
  assert.equal(friends.text.includes(alex.secret), false);
  assert.equal(row.email, undefined);

  const stored = await kv.get(`user:${mary.code}`, 'json');
  assert.equal(stored.secret, undefined);
  assert.equal(stored.secretHash, await sha256hex(mary.secret));
  assert.equal(stored.email, undefined);
  assert.equal(stored.handle, 'maryh');
  assert.equal(stored.avatar_data, AVATAR);
  assert.equal(stored.cover_data, COVER);
  assert.equal(stored.publicId, mary.publicId);
  assert.equal(JSON.stringify(stored).includes(mary.secret), false);
  const kept = await read(await call(kv, '/sync', { code: mary.code, secret: mary.secret }));
  assert.equal(kept.status, 200);
  assert.equal(kept.data.publicId, mary.publicId);
  const keptUser = await kv.get(`user:${mary.code}`, 'json');
  assert.equal(keptUser.stats.studies, 1);
  assert.equal(keptUser.stats.levels.jeopardy, 2);
  assert.equal(keptUser.stats.bests.feud, 4);
  assert.equal(kv.keys().some((key) => key.startsWith('auth:')), false);
  assert.equal(kv.keys().some((key) => key.startsWith('board:')), false);
});

test('javascript and empty images are not stored, and an omitted name stays', async () => {
  const kv = memoryKv();
  const user = (await read(await call(kv, '/register', { name: 'Mary' }))).data;
  await call(kv, '/sync', {
    code: user.code,
    secret: user.secret,
    name: 'Mary',
    handle: 'maryh',
    avatar: 'javascript:alert(1)',
    cover: 'http://example.com/cover.png',
    profile: { cover_data: 'javascript:alert(1)' }
  });
  let stored = await kv.get(`user:${user.code}`, 'json');
  assert.equal(stored.name, 'Mary');
  assert.equal(stored.handle, 'maryh');
  assert.equal(stored.avatar_data, undefined);
  assert.equal(stored.cover_data, undefined);

  await call(kv, '/sync', {
    code: user.code,
    secret: user.secret,
    avatar_data: AVATAR,
    cover_data: COVER
  });
  await call(kv, '/sync', {
    code: user.code,
    secret: user.secret,
    handle: '',
    avatar_data: 'javascript:alert(1)',
    profile: { cover_data: '' }
  });
  stored = await kv.get(`user:${user.code}`, 'json');
  assert.equal(stored.name, 'Mary');
  assert.equal(stored.handle, undefined);
  assert.equal(stored.avatar_data, undefined);
  assert.equal(stored.cover_data, undefined);
});

test('only the list owner receives friend records, and those records omit everyone else’s friends', async () => {
  const kv = memoryKv();
  const mary = (await read(await call(kv, '/register', { name: 'Mary' }))).data;
  const alex = (await read(await call(kv, '/register', { name: 'Alex' }))).data;
  const ruth = (await read(await call(kv, '/register', { name: 'Ruth' }))).data;

  await call(kv, '/friend/add', { code: mary.code, secret: mary.secret, friendCode: alex.code });
  await call(kv, '/friend/accept', { code: alex.code, secret: alex.secret, friendCode: mary.code });
  await call(kv, '/friend/add', { code: mary.code, secret: mary.secret, friendCode: ruth.code });
  await call(kv, '/friend/accept', { code: ruth.code, secret: ruth.secret, friendCode: mary.code });

  const injected = 'MSB-ZZZZZZ';
  const sync = await read(await call(kv, '/sync', {
    code: mary.code,
    secret: mary.secret,
    friends: [injected, ruth.code],
    profile: { handle: 'maryh', friends: [injected], secret: mary.secret }
  }));
  assert.equal(sync.status, 200);
  assert.equal(sync.text.includes(injected), false);
  assert.equal(sync.text.includes(ruth.code), false);

  const stored = await kv.get(`user:${mary.code}`, 'json');
  assert.deepEqual(stored.friends, [alex.code, ruth.code]);
  assert.equal(JSON.stringify(stored.profile || {}).includes(injected), false);

  const asAlex = await read(await call(kv, '/friends', { code: alex.code, secret: alex.secret }));
  assert.equal(asAlex.status, 200);
  assert.deepEqual(asAlex.data.map((row) => row.code), [mary.code]);
  assert.equal(asAlex.data[0].friends, undefined);
  assert.equal(asAlex.data[0].profile.friends, undefined);
  assert.equal(asAlex.data[0].profile.handle, 'maryh');
  assert.equal(asAlex.text.includes(ruth.code), false);
  assert.equal(asAlex.text.includes(injected), false);
  assert.equal(asAlex.text.includes(mary.secret), false);

  const asMary = await read(await call(kv, '/friends', { code: mary.code, secret: mary.secret }));
  assert.equal(asMary.status, 200);
  assert.deepEqual(asMary.data.map((row) => row.code).sort(), [alex.code, ruth.code].sort());
  for (const row of asMary.data) {
    assert.equal(row.friends, undefined);
    assert.equal(row.profile && row.profile.friends, undefined);
  }

  const stolen = await read(await call(kv, '/friends', { code: mary.code, secret: alex.secret }));
  assert.equal(stolen.status, 401);
  assert.equal(stolen.text.includes(ruth.code), false);
  assert.equal(stolen.text.includes(alex.code), false);
});

test('a stored saint portrait id is stripped and does not replace a photo', async () => {
  const kv = memoryKv();
  const mary = (await read(await call(kv, '/register', { name: 'Mary' }))).data;
  const alex = (await read(await call(kv, '/register', { name: 'Alex' }))).data;
  await call(kv, '/sync', {
    code: mary.code,
    secret: mary.secret,
    name: 'Mary',
    avatar_data: AVATAR,
    avatar_saint: 'nicholas'
  });
  let stored = await kv.get(`user:${mary.code}`, 'json');
  assert.equal(stored.avatar_data, AVATAR);
  assert.equal(stored.avatar_saint, undefined);

  stored.avatar_saint = 'nicholas';
  stored.profile = { ...(stored.profile || {}), avatar_saint: 'nicholas' };
  await kv.put(`user:${mary.code}`, JSON.stringify(stored));
  await call(kv, '/friend/add', { code: alex.code, secret: alex.secret, friendCode: mary.code });
  await call(kv, '/friend/accept', { code: mary.code, secret: mary.secret, friendCode: alex.code });
  const legacy = await read(await call(kv, '/friends', { code: alex.code, secret: alex.secret }));
  assert.equal(legacy.data[0].avatar_saint, undefined);
  assert.equal(legacy.data[0].profile.avatar_saint, undefined);
  assert.equal(legacy.data[0].avatar_data, AVATAR);
  assert.equal(legacy.data[0].profile.avatar_data, AVATAR);

  await call(kv, '/sync', {
    code: mary.code,
    secret: mary.secret,
    avatar_saint: 'Nicholas',
    profile: { avatar_saint: '../saints/nicholas.svg' }
  });
  stored = await kv.get(`user:${mary.code}`, 'json');
  assert.equal(stored.avatar_data, AVATAR);
  assert.equal(stored.avatar_saint, undefined);
  assert.equal(stored.profile && stored.profile.avatar_saint, undefined);

  await call(kv, '/sync', { code: mary.code, secret: mary.secret, avatar_saint: 'javascript:alert(1)' });
  stored = await kv.get(`user:${mary.code}`, 'json');
  assert.equal(stored.avatar_saint, undefined);
  const cleared = await read(await call(kv, '/friends', { code: alex.code, secret: alex.secret }));
  assert.equal(cleared.data[0].avatar_saint, undefined);
  assert.equal(JSON.stringify(cleared.data).includes('nicholas'), false);
  assert.equal(JSON.stringify(cleared.data).includes('saints/'), false);
});

test('a friend request stays pending until the other person accepts, and public scores omit friend codes', async () => {
  const kv = memoryKv();
  const mary = (await read(await call(kv, '/register', { name: 'Mary' }))).data;
  const alex = (await read(await call(kv, '/register', { name: 'Alex' }))).data;
  const ruth = (await read(await call(kv, '/register', { name: 'Ruth' }))).data;

  const add = await read(await call(kv, '/friend/add', { code: alex.code, secret: alex.secret, friendCode: mary.code }));
  assert.equal(add.status, 200);
  assert.equal(add.data.ok, true);
  assert.equal(add.data.status, 'pending');
  assert.equal(add.text.includes(alex.secret), false);
  assert.equal(add.text.includes(mary.secret), false);

  const maryFriends = await read(await call(kv, '/friends', { code: mary.code, secret: mary.secret }));
  const alexFriends = await read(await call(kv, '/friends', { code: alex.code, secret: alex.secret }));
  assert.deepEqual(maryFriends.data, []);
  assert.deepEqual(alexFriends.data, []);

  const maryRequests = await read(await call(kv, '/friend/requests', { code: mary.code, secret: mary.secret }));
  assert.equal(maryRequests.status, 200);
  assert.deepEqual(maryRequests.data.incoming.map((row) => row.code), [alex.code]);
  assert.equal(maryRequests.data.incoming[0].name, 'Alex');
  assert.deepEqual(maryRequests.data.outgoing, []);
  assert.equal(maryRequests.text.includes(ruth.code), false);
  assert.equal(maryRequests.text.includes(alex.secret), false);

  const alexRequests = await read(await call(kv, '/friend/requests', { code: alex.code, secret: alex.secret }));
  assert.deepEqual(alexRequests.data.outgoing.map((row) => row.code), [mary.code]);
  assert.deepEqual(alexRequests.data.incoming, []);

  const stolen = await read(await call(kv, '/friend/requests', { code: mary.code, secret: alex.secret }));
  assert.equal(stolen.status, 401);
  assert.equal(stolen.text.includes(alex.code), false);

  const declined = await read(await call(kv, '/friend/decline', { code: mary.code, secret: mary.secret, friendCode: alex.code }));
  assert.equal(declined.status, 200);
  const afterDecline = await read(await call(kv, '/friend/requests', { code: mary.code, secret: mary.secret }));
  assert.deepEqual(afterDecline.data.incoming, []);
  const alexAfter = await read(await call(kv, '/friends', { code: alex.code, secret: alex.secret }));
  assert.deepEqual(alexAfter.data, []);

  await call(kv, '/friend/add', { code: alex.code, secret: alex.secret, friendCode: mary.code });
  const accepted = await read(await call(kv, '/friend/accept', { code: mary.code, secret: mary.secret, friendCode: alex.code }));
  assert.equal(accepted.data.status, 'friends');
  const paired = await read(await call(kv, '/friends', { code: mary.code, secret: mary.secret }));
  assert.deepEqual(paired.data.map((row) => row.code), [alex.code]);
  assert.equal(paired.text.includes(ruth.code), false);
  const cleared = await read(await call(kv, '/friend/requests', { code: mary.code, secret: mary.secret }));
  assert.deepEqual(cleared.data.incoming, []);
  assert.deepEqual(cleared.data.outgoing, []);

  const again = await read(await call(kv, '/friend/add', { code: alex.code, secret: alex.secret, friendCode: mary.code }));
  assert.equal(again.data.status, 'friends');

  await call(kv, '/scores/submit', { code: mary.code, secret: mary.secret, show: 'jeopardy', score: 400, level: 2 });
  await call(kv, '/scores/submit', { code: ruth.code, secret: ruth.secret, show: 'jeopardy', score: 100, level: 1 });
  const board = await read(await call(kv, '/scores?show=jeopardy', null, 'GET'));
  assert.equal(board.status, 200);
  assert.equal(board.text.includes(mary.code), false);
  assert.equal(board.text.includes(ruth.code), false);
  assert.equal(board.text.includes('MSB-'), false);
  assert.deepEqual(board.data.scores.map((row) => row.name), ['Mary', 'Ruth']);
  assert.equal(board.data.scores[0].id, mary.publicId);
  assert.equal(board.data.scores[0].code, undefined);
  assert.equal(board.data.scores[1].id, ruth.publicId);
  const raw = await kv.get('leaderboard', 'json');
  assert.equal(raw.jeopardy[0].code, mary.code);
  assert.equal(raw.jeopardy[0].score, 400);
  assert.equal(raw.jeopardy[1].code, ruth.code);
});

test('adding someone who already asked completes the friendship', async () => {
  const kv = memoryKv();
  const mary = (await read(await call(kv, '/register', { name: 'Mary' }))).data;
  const alex = (await read(await call(kv, '/register', { name: 'Alex' }))).data;
  await call(kv, '/friend/add', { code: alex.code, secret: alex.secret, friendCode: mary.code });
  const back = await read(await call(kv, '/friend/add', { code: mary.code, secret: mary.secret, friendCode: alex.code }));
  assert.equal(back.data.status, 'friends');
  const friends = await read(await call(kv, '/friends', { code: mary.code, secret: mary.secret }));
  assert.deepEqual(friends.data.map((row) => row.code), [alex.code]);
  const requests = await read(await call(kv, '/friend/requests', { code: alex.code, secret: alex.secret }));
  assert.deepEqual(requests.data.outgoing, []);
  assert.deepEqual(requests.data.incoming, []);
});

test('wrong secret does not echo the secret, and friend responses stay public', async () => {
  const kv = memoryKv();
  const user = (await read(await call(kv, '/register', { name: 'Mary' }))).data;
  const wrong = await read(await call(kv, '/friends', { code: user.code, secret: 'not-the-secret' }));
  assert.equal(wrong.status, 401);
  assert.equal(wrong.data.error, 'Wrong account secret');
  assert.equal(wrong.text.includes('not-the-secret'), false);
  assert.equal(wrong.text.includes(user.secret), false);

  const missing = await read(await call(kv, '/friends', { code: 'MSB-MISSING', secret: user.secret }));
  assert.equal(missing.status, 404);
  assert.equal(missing.data.error, 'Unknown friend code');

  const self = await read(await call(kv, '/note/send', {
    code: user.code,
    secret: user.secret,
    to: user.code,
    body: 'hello',
    secretNote: user.secret
  }));
  assert.equal(self.status, 400);
  assert.equal(self.text.includes(user.secret), false);

  const stranger = (await read(await call(kv, '/register', { name: 'Ruth' }))).data;
  const forbidden = await read(await call(kv, '/note/send', {
    code: user.code,
    secret: user.secret,
    to: stranger.code,
    body: 'hello'
  }));
  assert.equal(forbidden.status, 403);
  assert.equal(forbidden.data.error, 'Add that person as a friend first');
});

test('live KV records keep their secret, friends, and code-only scores', async () => {
  const kv = memoryKv();
  const secret = 'legacy-secret-kept-for-this-account';
  const palSecret = 'pal-secret-kept-for-this-account';
  const legacy = {
    code: 'MSB-LEGACY',
    name: 'Legacy',
    secretHash: await sha256hex(secret),
    stats: { bests: { jeopardy: 10 }, levels: { jeopardy: 2 }, studies: 3 },
    friends: ['MSB-PAL001'],
    updatedAt: 1000
  };
  const pal = {
    code: 'MSB-PAL001',
    name: 'Pal',
    secretHash: await sha256hex(palSecret),
    stats: { bests: {}, levels: {}, studies: 1 },
    friends: ['MSB-LEGACY'],
    updatedAt: 1000
  };
  await kv.put('user:MSB-LEGACY', JSON.stringify(legacy));
  await kv.put('user:MSB-PAL001', JSON.stringify(pal));
  await kv.put('leaderboard', JSON.stringify({
    jeopardy: [{ code: 'MSB-LEGACY', name: 'Legacy', score: 500, level: 3, ts: 1000 }]
  }));

  const auth = await read(await call(kv, '/friends', { code: 'MSB-LEGACY', secret }));
  assert.equal(auth.status, 200);
  assert.deepEqual(auth.data.map((row) => row.code), ['MSB-PAL001']);
  assert.equal(auth.data[0].name, 'Pal');
  assert.equal(auth.data[0].stats.studies, 1);
  assert.equal(auth.text.includes(secret), false);
  assert.equal(auth.text.includes(legacy.secretHash), false);

  const wrong = await read(await call(kv, '/sync', { code: 'MSB-LEGACY', secret: 'nope' }));
  assert.equal(wrong.status, 401);

  const userBefore = await kv.get('user:MSB-LEGACY');
  const boardBefore = await kv.get('leaderboard');
  const board = await read(await call(kv, '/scores?show=jeopardy', null, 'GET'));
  assert.equal(board.status, 200);
  assert.equal(board.data.scores.length, 1);
  assert.equal(board.data.scores[0].name, 'Legacy');
  assert.equal(board.data.scores[0].score, 500);
  assert.equal(board.data.scores[0].level, 3);
  assert.equal(board.data.scores[0].ts, 1000);
  assert.equal(board.data.scores[0].id, '');
  assert.equal(board.data.scores[0].code, undefined);
  assert.equal(board.text.includes('MSB-LEGACY'), false);
  assert.equal(board.text.includes('MSB-'), false);
  assert.equal(await kv.get('user:MSB-LEGACY'), userBefore);
  assert.equal(await kv.get('leaderboard'), boardBefore);

  const storedBefore = await kv.get('user:MSB-LEGACY', 'json');
  assert.equal(storedBefore.secretHash, legacy.secretHash);
  assert.deepEqual(storedBefore.friends, ['MSB-PAL001']);
  assert.equal(storedBefore.name, 'Legacy');
  assert.equal(storedBefore.stats.bests.jeopardy, 10);
  assert.equal(storedBefore.publicId, undefined);
  const rawBefore = await kv.get('leaderboard', 'json');
  assert.equal(rawBefore.jeopardy[0].code, 'MSB-LEGACY');
  assert.equal(rawBefore.jeopardy[0].score, 500);
  assert.equal(rawBefore.jeopardy[0].id, undefined);

  const gone = await read(await call(kv, '/account/public-id', { code: 'MSB-LEGACY', secret }));
  assert.equal(gone.status, 404);
  const claimed = await read(await call(kv, '/sync', {
    code: 'MSB-LEGACY',
    secret,
    name: 'Legacy',
    stats: legacy.stats
  }));
  assert.equal(claimed.status, 200);
  assert.match(claimed.data.publicId, /^[a-f0-9]{16}$/);
  const stored = await kv.get('user:MSB-LEGACY', 'json');
  assert.equal(stored.publicId, claimed.data.publicId);
  assert.equal(stored.secretHash, legacy.secretHash);
  assert.equal(stored.stats.bests.jeopardy, 10);
  const rawBoard = await kv.get('leaderboard', 'json');
  assert.equal(rawBoard.jeopardy[0].code, 'MSB-LEGACY');
  assert.equal(rawBoard.jeopardy[0].score, 500);
  assert.equal(rawBoard.jeopardy[0].id, stored.publicId);

  const userAfterClaim = await kv.get('user:MSB-LEGACY');
  const boardAfterClaim = await kv.get('leaderboard');
  const again = await read(await call(kv, '/scores?show=jeopardy', null, 'GET'));
  assert.equal(again.data.scores[0].id, stored.publicId);
  assert.equal(again.data.scores[0].score, 500);
  assert.equal(again.data.scores[0].code, undefined);
  assert.equal(again.text.includes('MSB-'), false);
  assert.equal(await kv.get('user:MSB-LEGACY'), userAfterClaim);
  assert.equal(await kv.get('leaderboard'), boardAfterClaim);

  const synced = await read(await call(kv, '/sync', {
    code: 'MSB-LEGACY',
    secret,
    name: 'Legacy',
    stats: legacy.stats,
    city: 'Antioch',
    bio: 'Still here',
    denomination: 'Basically Orthodox'
  }));
  assert.equal(synced.data.publicId, stored.publicId);
  const after = await kv.get('user:MSB-LEGACY', 'json');
  assert.equal(after.secretHash, legacy.secretHash);
  assert.deepEqual(after.friends, ['MSB-PAL001']);
  assert.equal(after.city, 'Antioch');
  assert.equal(after.denomination, 'Basically Orthodox');
  const palView = await read(await call(kv, '/friends', { code: 'MSB-PAL001', secret: palSecret }));
  assert.equal(palView.data[0].city, 'Antioch');
  assert.equal(palView.data[0].denomination, 'Basically Orthodox');
  assert.equal(palView.data[0].profile.bio, 'Still here');

  const outsider = (await read(await call(kv, '/register', { name: 'New' }))).data;
  await call(kv, '/friend/add', { code: outsider.code, secret: outsider.secret, friendCode: 'MSB-LEGACY' });
  const still = await read(await call(kv, '/friends', { code: 'MSB-LEGACY', secret }));
  assert.deepEqual(still.data.map((row) => row.code), ['MSB-PAL001']);
  const incoming = await read(await call(kv, '/friend/requests', { code: 'MSB-LEGACY', secret }));
  assert.deepEqual(incoming.data.incoming.map((row) => row.code), [outsider.code]);
  await call(kv, '/friend/decline', { code: 'MSB-LEGACY', secret, friendCode: outsider.code });
  const declined = await read(await call(kv, '/friend/requests', { code: 'MSB-LEGACY', secret }));
  assert.deepEqual(declined.data.incoming, []);
  const friendsAfter = await read(await call(kv, '/friends', { code: 'MSB-LEGACY', secret }));
  assert.deepEqual(friendsAfter.data.map((row) => row.code), ['MSB-PAL001']);
});

test('legacy records without inbox, threads, or shared still exchange notes, messages, and rooms', async () => {
  const kv = memoryKv();
  const secret = 'note-secret-for-legacy-owner';
  const palSecret = 'note-secret-for-legacy-pal';
  await kv.put('user:MSB-OWNER1', JSON.stringify({
    code: 'MSB-OWNER1', name: 'Owner', secretHash: await sha256hex(secret),
    stats: { bests: {}, levels: {}, studies: 0 }, friends: ['MSB-PAL002'], updatedAt: 50
  }));
  await kv.put('user:MSB-PAL002', JSON.stringify({
    code: 'MSB-PAL002', name: 'Pal', secretHash: await sha256hex(palSecret),
    stats: { bests: {}, levels: {}, studies: 0 }, friends: ['MSB-OWNER1'], updatedAt: 50
  }));
  const owner = { code: 'MSB-OWNER1', secret };
  const pal = { code: 'MSB-PAL002', secret: palSecret };

  const sent = await read(await call(kv, '/note/send', {
    ...owner, to: pal.code, title: 'Peace', body: 'Read John 1', studyId: 'john-1', ref: { book: 43, chapter: 1, verse: 1, label: 'John 1:1' }
  }));
  assert.equal(sent.status, 200);
  assert.match(sent.data.id, /^[a-f0-9]{16}$/);
  const notes = await read(await call(kv, '/notes', pal));
  assert.equal(notes.data.inbox[0].body, 'Read John 1');
  assert.equal(notes.data.inbox[0].from, owner.code);
  const ownerNotes = await read(await call(kv, '/notes', owner));
  assert.equal(ownerNotes.data.sent[0].id, sent.data.id);
  assert.equal((await read(await call(kv, '/note/read', { ...pal, id: sent.data.id }))).data.ok, true);
  assert.equal((await read(await call(kv, '/notes', pal))).data.inbox[0].read, true);
  assert.equal((await read(await call(kv, '/note/delete', { ...pal, id: sent.data.id, box: 'inbox' }))).data.ok, true);
  assert.deepEqual((await read(await call(kv, '/notes', pal))).data.inbox, []);

  const msg = await read(await call(kv, '/msg/send', { ...owner, to: pal.code, body: 'Hello' }));
  assert.equal(msg.status, 200);
  const thread = await read(await call(kv, '/msg/thread', { ...pal, with: owner.code }));
  assert.equal(thread.data.messages[0].body, 'Hello');
  assert.equal(thread.data.messages[0].read, true);
  const storedPal = await kv.get('user:MSB-PAL002', 'json');
  assert.equal(storedPal.secretHash, await sha256hex(palSecret));
  assert.deepEqual(storedPal.friends, ['MSB-OWNER1']);

  const shared = await read(await call(kv, '/shared/create', { ...owner, to: pal.code, title: 'Together', body: 'First line' }));
  assert.equal(shared.status, 200);
  assert.match(shared.data.id, /^[a-f0-9]{16}$/);
  assert.equal((await kv.get(`shared:${shared.data.id}`)) != null, true);
  const listed = await read(await call(kv, '/shared/list', pal));
  assert.equal(listed.data.notes[0].body, 'First line');
  const got = await read(await call(kv, '/shared/get', { ...pal, id: shared.data.id }));
  assert.equal(got.status, 200);
  const updated = await read(await call(kv, '/shared/update', { ...pal, id: shared.data.id, title: 'Together', body: 'Second line' }));
  assert.equal(updated.data.body, 'Second line');
  assert.equal(updated.data.updatedBy, pal.code);
  assert.equal((await read(await call(kv, '/shared/delete', { ...owner, id: shared.data.id }))).data.ok, true);
  assert.equal(await kv.get(`shared:${shared.data.id}`), null);

  const room = await read(await call(kv, '/room/create', { ...owner, show: 'jeopardy', level: 2 }));
  assert.equal(room.status, 200);
  assert.match(room.data.room, /^ROOM-/);
  assert.equal(kv.options().get(`room:${room.data.room}`).expirationTtl, 7200);
  const joined = await read(await call(kv, '/room/join', { ...pal, room: room.data.room }));
  assert.equal(joined.status, 200);
  assert.equal(joined.data.players.length, 2);
  const started = await read(await call(kv, '/room/start', { ...owner, room: room.data.room }));
  assert.equal(started.data.status, 'active');
  const scored = await read(await call(kv, '/room/score', { ...pal, room: room.data.room, score: 40, finished: true }));
  assert.equal(scored.data.players.find((p) => p.code === pal.code).score, 40);
  const state = await read(await call(kv, '/room/state', { ...owner, room: room.data.room }));
  assert.equal(state.data.room, room.data.room);
  const left = await read(await call(kv, '/room/leave', { ...pal, room: room.data.room }));
  assert.equal(left.data.players.length, 1);

  const stranger = (await read(await call(kv, '/register', { name: 'Nope' }))).data;
  const blocked = await read(await call(kv, '/room/join', { code: stranger.code, secret: stranger.secret, room: room.data.room }));
  assert.equal(blocked.status, 403);
});

test('health, missing routes, and the body limit keep the live status codes', async () => {
  const kv = memoryKv();
  const health = await read(await call(kv, '/health', null, 'GET'));
  assert.equal(health.status, 200);
  assert.deepEqual(health.data, { ok: true });
  assert.equal(health.headers.get('access-control-allow-origin'), 'https://bvsquiat27.github.io');

  const options = await handleFriends(new Request('https://friends.test/friends', { method: 'OPTIONS' }), { FRIENDS: kv });
  assert.equal(options.status, 204);
  assert.equal(options.headers.get('access-control-allow-origin'), 'https://bvsquiat27.github.io');

  const missingGet = await read(await call(kv, '/missing', null, 'GET'));
  assert.equal(missingGet.status, 404);
  const missingPost = await read(await call(kv, '/missing', {}));
  assert.equal(missingPost.status, 404);

  const malformed = await handleFriends(new Request('https://friends.test/sync', { method: 'POST', body: '{' }), { FRIENDS: kv });
  assert.equal(malformed.status, 400);
  assert.equal((await malformed.json()).error, 'Malformed JSON body');

  const huge = await handleFriends(new Request('https://friends.test/sync', { method: 'POST', body: 'x'.repeat(FRIEND_LIMITS.MAX_BODY + 1) }), { FRIENDS: kv });
  assert.equal(huge.status, 413);
  assert.equal((await huge.json()).error, 'Request too large');

  const badShow = await read(await call(kv, '/scores?show=chess', null, 'GET'));
  assert.equal(badShow.status, 400);

  const mail = await read(await call(kv, '/recovery-email', null, 'GET'));
  assert.equal(mail.status, 200);
  assert.equal(mail.data.ready, false);
  assert.equal(mail.data.configured, false);
  assert.equal(mail.data.sent, false);
  assert.match(mail.data.error, /No mailbox or sending key/);
  const mailPost = await read(await call(kv, '/recovery-email', { to: 'reader@example.com', subject: 'code', text: 'Your code is 12345678' }));
  assert.equal(mailPost.status, 200);
  assert.equal(mailPost.data.sent, false);
  assert.equal(mailPost.data.ready, false);
});

test('a photo the client can upload is stored, and an oversized photo does not drop the text fields', async () => {
  const kv = memoryKv();
  const mary = (await read(await call(kv, '/register', { name: 'Mary' }))).data;
  const photo = `data:image/jpeg;base64,${'a'.repeat(20000)}`;
  const cover = `data:image/jpeg;base64,${'b'.repeat(80000)}`;
  assert.ok(photo.length > 12000);
  assert.ok(photo.length <= FRIEND_LIMITS.AVATAR_MAX);
  assert.ok(cover.length <= FRIEND_LIMITS.COVER_MAX);
  const sync = await read(await call(kv, '/sync', {
    code: mary.code,
    secret: mary.secret,
    name: 'Mary',
    city: 'Antioch',
    denomination: 'Basically Orthodox',
    avatar_data: photo,
    cover_data: cover
  }));
  assert.equal(sync.status, 200);
  assert.equal(sync.data.ok, true);
  assert.equal(sync.data.warning, undefined);
  let stored = await kv.get(`user:${mary.code}`, 'json');
  assert.equal(stored.avatar_data, photo);
  assert.equal(stored.cover_data, cover);
  assert.equal(stored.city, 'Antioch');
  assert.equal(stored.denomination, 'Basically Orthodox');

  const tooBig = `data:image/jpeg;base64,${'c'.repeat(FRIEND_LIMITS.AVATAR_MAX)}`;
  assert.ok(tooBig.length > FRIEND_LIMITS.AVATAR_MAX);
  assert.ok(JSON.stringify({ avatar_data: tooBig, bio: 'Still reading' }).length < FRIEND_LIMITS.MAX_BODY);
  const skipped = await read(await call(kv, '/sync', {
    code: mary.code,
    secret: mary.secret,
    bio: 'Still reading',
    avatar_data: tooBig
  }));
  assert.equal(skipped.status, 200);
  assert.match(skipped.data.warning, /profile photo was too large/);
  stored = await kv.get(`user:${mary.code}`, 'json');
  assert.equal(stored.avatar_data, photo);
  assert.equal(stored.cover_data, cover);
  assert.equal(stored.bio, 'Still reading');
  assert.equal(stored.city, 'Antioch');
  assert.equal(stored.stats.studies, 0);
});

test('a full inbox rejects a new request, a stranded outgoing request is rewritten, and cancel clears both sides', async () => {
  const kv = memoryKv();
  const mary = (await read(await call(kv, '/register', { name: 'Mary' }))).data;
  const senders = [];
  for (let i = 0; i < FRIEND_LIMITS.REQUEST_MAX; i++) {
    const sender = (await read(await call(kv, '/register', { name: `Sender ${i}` }))).data;
    senders.push(sender);
    const added = await read(await call(kv, '/friend/add', { code: sender.code, secret: sender.secret, friendCode: mary.code }));
    assert.equal(added.status, 200);
    assert.equal(added.data.status, 'pending');
  }
  const extra = (await read(await call(kv, '/register', { name: 'Extra' }))).data;
  const rejected = await read(await call(kv, '/friend/add', { code: extra.code, secret: extra.secret, friendCode: mary.code }));
  assert.equal(rejected.status, 409);
  assert.match(rejected.data.error, /inbox is full/);
  const extraStored = await kv.get(`user:${extra.code}`, 'json');
  assert.deepEqual(extraStored.requestsOut, []);
  let maryStored = await kv.get(`user:${mary.code}`, 'json');
  assert.equal(maryStored.requestsIn.length, FRIEND_LIMITS.REQUEST_MAX);
  assert.equal(maryStored.requestsIn.some((row) => row.code === extra.code), false);

  const stranded = senders[0];
  maryStored.requestsIn = maryStored.requestsIn.filter((row) => row.code !== stranded.code);
  await kv.put(`user:${mary.code}`, JSON.stringify(maryStored));
  const retry = await read(await call(kv, '/friend/add', { code: stranded.code, secret: stranded.secret, friendCode: mary.code }));
  assert.equal(retry.status, 200);
  assert.equal(retry.data.status, 'pending');
  maryStored = await kv.get(`user:${mary.code}`, 'json');
  assert.equal(maryStored.requestsIn.some((row) => row.code === stranded.code), true);
  const accepted = await read(await call(kv, '/friend/accept', { code: mary.code, secret: mary.secret, friendCode: stranded.code }));
  assert.equal(accepted.status, 200);
  assert.equal(accepted.data.status, 'friends');

  const canceller = senders[1];
  const cancelled = await read(await call(kv, '/friend/cancel', { code: canceller.code, secret: canceller.secret, friendCode: mary.code }));
  assert.equal(cancelled.status, 200);
  assert.equal(cancelled.data.ok, true);
  const maryRequests = await read(await call(kv, '/friend/requests', { code: mary.code, secret: mary.secret }));
  assert.equal(maryRequests.data.incoming.some((row) => row.code === canceller.code), false);
  const cancellerRequests = await read(await call(kv, '/friend/requests', { code: canceller.code, secret: canceller.secret }));
  assert.deepEqual(cancellerRequests.data.outgoing, []);
  const late = await read(await call(kv, '/friend/accept', { code: mary.code, secret: mary.secret, friendCode: canceller.code }));
  assert.equal(late.status, 404);

  const busy = (await read(await call(kv, '/register', { name: 'Busy' }))).data;
  for (let i = 0; i < FRIEND_LIMITS.REQUEST_MAX; i++) {
    const target = (await read(await call(kv, '/register', { name: `Target ${i}` }))).data;
    const sent = await read(await call(kv, '/friend/add', { code: busy.code, secret: busy.secret, friendCode: target.code }));
    assert.equal(sent.data.status, 'pending');
  }
  const oneMore = (await read(await call(kv, '/register', { name: 'One more' }))).data;
  const outFull = await read(await call(kv, '/friend/add', { code: busy.code, secret: busy.secret, friendCode: oneMore.code }));
  assert.equal(outFull.status, 409);
  assert.match(outFull.data.error, /outgoing requests are full/);
  const oneMoreStored = await kv.get(`user:${oneMore.code}`, 'json');
  assert.deepEqual(oneMoreStored.requestsIn, []);
});

test('room scores wait until the room is active', async () => {
  const kv = memoryKv();
  const mary = (await read(await call(kv, '/register', { name: 'Mary' }))).data;
  const alex = (await read(await call(kv, '/register', { name: 'Alex' }))).data;
  await call(kv, '/friend/add', { code: mary.code, secret: mary.secret, friendCode: alex.code });
  await call(kv, '/friend/accept', { code: alex.code, secret: alex.secret, friendCode: mary.code });
  const room = (await read(await call(kv, '/room/create', { code: mary.code, secret: mary.secret, show: 'jeopardy', level: 1 }))).data;
  await call(kv, '/room/join', { code: alex.code, secret: alex.secret, room: room.room });
  const early = await read(await call(kv, '/room/score', { code: alex.code, secret: alex.secret, room: room.room, score: 90 }));
  assert.equal(early.status, 409);
  assert.equal(early.data.error, 'That room is not active');
  const waiting = await read(await call(kv, '/room/state', { code: mary.code, secret: mary.secret, room: room.room }));
  assert.equal(waiting.data.status, 'waiting');
  assert.equal(waiting.data.players.find((player) => player.code === alex.code).score, 0);
  await call(kv, '/room/start', { code: mary.code, secret: mary.secret, room: room.room });
  const scored = await read(await call(kv, '/room/score', { code: alex.code, secret: alex.secret, room: room.room, score: 90 }));
  assert.equal(scored.status, 200);
  assert.equal(scored.data.players.find((player) => player.code === alex.code).score, 90);
});

test('shared list applies the same editor check as shared get', async () => {
  const kv = memoryKv();
  const mary = (await read(await call(kv, '/register', { name: 'Mary' }))).data;
  const alex = (await read(await call(kv, '/register', { name: 'Alex' }))).data;
  const ruth = (await read(await call(kv, '/register', { name: 'Ruth' }))).data;
  await call(kv, '/friend/add', { code: mary.code, secret: mary.secret, friendCode: alex.code });
  await call(kv, '/friend/accept', { code: alex.code, secret: alex.secret, friendCode: mary.code });
  const note = (await read(await call(kv, '/shared/create', { code: mary.code, secret: mary.secret, to: alex.code, title: 'Together', body: 'A private line' }))).data;
  const ruthUser = await kv.get(`user:${ruth.code}`, 'json');
  ruthUser.shared = [note.id];
  await kv.put(`user:${ruth.code}`, JSON.stringify(ruthUser));
  const hidden = await read(await call(kv, '/shared/list', { code: ruth.code, secret: ruth.secret }));
  assert.equal(hidden.status, 200);
  assert.deepEqual(hidden.data.notes, []);
  assert.equal(hidden.text.includes('A private line'), false);
  const denied = await read(await call(kv, '/shared/get', { code: ruth.code, secret: ruth.secret, id: note.id }));
  assert.equal(denied.status, 403);
  assert.equal(denied.data.error, 'That note is not shared with you');
  const visible = await read(await call(kv, '/shared/list', { code: alex.code, secret: alex.secret }));
  assert.equal(visible.data.notes.length, 1);
  assert.equal(visible.data.notes[0].body, 'A private line');
});

test('a message thread is hidden after the two people are no longer friends', async () => {
  const kv = memoryKv();
  const mary = (await read(await call(kv, '/register', { name: 'Mary' }))).data;
  const alex = (await read(await call(kv, '/register', { name: 'Alex' }))).data;
  await call(kv, '/friend/add', { code: mary.code, secret: mary.secret, friendCode: alex.code });
  await call(kv, '/friend/accept', { code: alex.code, secret: alex.secret, friendCode: mary.code });
  await call(kv, '/msg/send', { code: mary.code, secret: mary.secret, to: alex.code, body: 'Remember the verse' });
  const open = await read(await call(kv, '/msg/thread', { code: alex.code, secret: alex.secret, with: mary.code }));
  assert.equal(open.status, 200);
  assert.equal(open.data.messages[0].body, 'Remember the verse');
  await call(kv, '/friend/remove', { code: mary.code, secret: mary.secret, friendCode: alex.code });
  const hidden = await read(await call(kv, '/msg/thread', { code: alex.code, secret: alex.secret, with: mary.code }));
  assert.equal(hidden.status, 403);
  assert.match(hidden.data.error, /not friends/);
  assert.equal(hidden.text.includes('Remember the verse'), false);
  const other = await read(await call(kv, '/msg/thread', { code: mary.code, secret: mary.secret, with: alex.code }));
  assert.equal(other.status, 403);
  assert.equal(other.text.includes('Remember the verse'), false);
  const stored = await kv.get(`user:${alex.code}`, 'json');
  assert.equal(stored.threads[mary.code][0].body, 'Remember the verse');
});

async function befriend(kv, left, right) {
  await call(kv, '/friend/add', { code: left.code, secret: left.secret, friendCode: right.code });
  await call(kv, '/friend/accept', { code: right.code, secret: right.secret, friendCode: left.code });
}

test('accepted friends can send a verse, and a stranger or an unfriended person cannot', async () => {
  const kv = memoryKv();
  const mary = (await read(await call(kv, '/register', { name: 'Mary' }))).data;
  const alex = (await read(await call(kv, '/register', { name: 'Alex' }))).data;
  const ruth = (await read(await call(kv, '/register', { name: 'Ruth' }))).data;
  await befriend(kv, mary, alex);
  const stranger = await read(await call(kv, '/verse/send', {
    code: ruth.code, secret: ruth.secret, to: mary.code,
    book: 43, chapter: 1, verse: 1, reference: 'John 1:1', text: 'In the beginning was the Word', note: 'hello'
  }));
  assert.equal(stranger.status, 403);
  const tooLong = await read(await call(kv, '/verse/send', {
    code: mary.code, secret: mary.secret, to: alex.code,
    book: 43, chapter: 1, verse: 1, reference: 'John 1:1', text: 'In the beginning was the Word', note: 'n'.repeat(281)
  }));
  assert.equal(tooLong.status, 400);
  const sent = await read(await call(kv, '/verse/send', {
    code: mary.code, secret: mary.secret, to: alex.code,
    book: 43, chapter: 1, verse: 1, reference: 'John 1:1', text: 'In the beginning was the Word', note: 'for your morning', translation: 'kjv'
  }));
  assert.equal(sent.status, 200);
  assert.match(sent.data.id, /^[a-f0-9]{16}$/);
  const inbox = await read(await call(kv, '/verse/inbox', { code: alex.code, secret: alex.secret }));
  assert.equal(inbox.status, 200);
  assert.equal(inbox.data.verses.length, 1);
  assert.equal(inbox.data.verses[0].text, 'In the beginning was the Word');
  assert.equal(inbox.data.verses[0].note, 'for your morning');
  assert.equal(inbox.data.verses[0].direction, 'in');
  assert.equal(inbox.data.verses[0].read, false);
  const thread = await read(await call(kv, '/verse/thread', { code: mary.code, secret: mary.secret, with: alex.code }));
  assert.equal(thread.data.verses[0].direction, 'out');
  const user = await kv.get(`user:${alex.code}`, 'json');
  assert.equal(JSON.stringify(user).includes('In the beginning was the Word'), false);
  await call(kv, '/friend/remove', { code: mary.code, secret: mary.secret, friendCode: alex.code });
  const blocked = await read(await call(kv, '/verse/send', {
    code: mary.code, secret: mary.secret, to: alex.code,
    book: 43, chapter: 1, verse: 1, reference: 'John 1:1', text: 'should not arrive', note: ''
  }));
  assert.equal(blocked.status, 403);
  const hidden = await read(await call(kv, '/verse/inbox', { code: alex.code, secret: alex.secret }));
  assert.equal(hidden.status, 200);
  assert.deepEqual(hidden.data.verses, []);
  assert.equal(hidden.text.includes('In the beginning was the Word'), false);
  const deniedRead = await read(await call(kv, '/verse/read', { code: alex.code, secret: alex.secret, id: sent.data.id }));
  assert.equal(deniedRead.status, 403);
});

test('verse sends are limited to 30 an hour', async () => {
  const kv = memoryKv();
  const mary = (await read(await call(kv, '/register', { name: 'Mary' }))).data;
  const alex = (await read(await call(kv, '/register', { name: 'Alex' }))).data;
  await befriend(kv, mary, alex);
  for (let i = 0; i < 30; i++) {
    const ok = await read(await call(kv, '/verse/send', {
      code: mary.code, secret: mary.secret, to: alex.code,
      book: 19, chapter: 23, verse: 1, reference: 'Psalm 23:1', text: `line ${i}`, note: ''
    }));
    assert.equal(ok.status, 200);
  }
  const limited = await read(await call(kv, '/verse/send', {
    code: mary.code, secret: mary.secret, to: alex.code,
    book: 19, chapter: 23, verse: 1, reference: 'Psalm 23:1', text: 'one more', note: ''
  }));
  assert.equal(limited.status, 429);
});

test('a study notebook is private to the two friends and stays off the scoreboard', async () => {
  const kv = memoryKv();
  const mary = (await read(await call(kv, '/register', { name: 'Mary' }))).data;
  const alex = (await read(await call(kv, '/register', { name: 'Alex' }))).data;
  const ruth = (await read(await call(kv, '/register', { name: 'Ruth' }))).data;
  await befriend(kv, mary, alex);
  const question = 'What does the morning verse ask of us?';
  const added = await read(await call(kv, '/study/add', {
    code: mary.code, secret: mary.secret, with: alex.code, entryId: 'abc12345',
    question, answer: 'To look up.', verses: [{ book: 19, chapter: 5, verse: 3, reference: 'Psalm 5:3' }]
  }));
  assert.equal(added.status, 200);
  assert.equal(added.data.entries[0].id, 'abc12345');
  assert.equal(added.data.entries[0].question, question);
  const edited = await read(await call(kv, '/study/add', {
    code: alex.code, secret: alex.secret, with: mary.code, entryId: 'abc12345',
    question, answer: 'To look up, and to wait.', verses: [{ book: 19, chapter: 5, verse: 3, reference: 'Psalm 5:3' }]
  }));
  assert.equal(edited.status, 200);
  assert.equal(edited.data.entries.length, 1);
  assert.equal(edited.data.entries[0].answer, 'To look up, and to wait.');
  assert.equal(edited.data.entries[0].updatedBy, alex.code);
  const peek = await read(await call(kv, '/study/get', { code: ruth.code, secret: ruth.secret, with: mary.code }));
  assert.equal(peek.status, 403);
  assert.equal(peek.text.includes(question), false);
  const scores = await read(await call(kv, '/scores', {}, 'GET'));
  assert.equal(scores.status, 200);
  assert.equal(scores.text.includes(question), false);
  await call(kv, '/friend/remove', { code: mary.code, secret: mary.secret, friendCode: alex.code });
  const closed = await read(await call(kv, '/study/get', { code: alex.code, secret: alex.secret, with: mary.code }));
  assert.equal(closed.status, 403);
  assert.equal(closed.text.includes(question), false);
  const local = await read(await call(kv, '/verse/inbox', { code: mary.code, secret: mary.secret }, 'POST', 'http://127.0.0.1:8787'));
  assert.equal(local.headers.get('access-control-allow-origin'), 'http://127.0.0.1:8787');
});

test('overlapping requests keep their own Access-Control-Allow-Origin', async () => {
  const kv = memoryKv();
  let waiting = 0;
  let release = () => {};
  const gate = new Promise((resolve) => { release = resolve; });
  const orig = kv.get.bind(kv);
  kv.get = async (...args) => {
    waiting += 1;
    if (waiting >= 2) release();
    await gate;
    return orig(...args);
  };
  const [githubRes, localRes] = await Promise.all([
    call(kv, '/scores', null, 'GET', 'https://bvsquiat27.github.io'),
    call(kv, '/scores', null, 'GET', 'http://127.0.0.1:8787'),
  ]);
  const github = await read(githubRes);
  const local = await read(localRes);
  assert.equal(waiting >= 2, true);
  assert.equal(github.status, 200);
  assert.equal(local.status, 200);
  assert.equal(github.headers.get('access-control-allow-origin'), 'https://bvsquiat27.github.io');
  assert.equal(local.headers.get('access-control-allow-origin'), 'http://127.0.0.1:8787');
  assert.equal(github.headers.get('vary'), 'Origin');
  assert.equal(local.headers.get('vary'), 'Origin');
});

test('verse numbers must be integers in range', async () => {
  const kv = memoryKv();
  const mary = (await read(await call(kv, '/register', { name: 'Mary' }))).data;
  const alex = (await read(await call(kv, '/register', { name: 'Alex' }))).data;
  await befriend(kv, mary, alex);
  const base = { code: mary.code, secret: mary.secret, to: alex.code, reference: 'John 3:16', text: 'For God so loved the world', note: '' };
  for (const broken of [
    { ...base, chapter: 3, verse: 16 },
    { ...base, book: null, chapter: 3, verse: 16 },
    { ...base, book: 'nope', chapter: 3, verse: 16 },
    { ...base, book: 43, chapter: 1.5, verse: 16 },
    { ...base, book: 43, chapter: 3, verse: 0 },
  ]) {
    const denied = await read(await call(kv, '/verse/send', broken));
    assert.equal(denied.status, 400);
  }
  assert.equal(await kv.get(`versebox:${alex.code}`), null);
  const study = await read(await call(kv, '/study/add', {
    code: mary.code, secret: mary.secret, with: alex.code, entryId: 'abc12345',
    question: 'Where?', answer: 'Here.', verses: [{ book: null, chapter: 1, verse: 1, reference: 'x' }]
  }));
  assert.equal(study.status, 400);
  const missing = await read(await call(kv, '/study/add', {
    code: mary.code, secret: mary.secret, with: alex.code, entryId: 'abc12345',
    question: 'Where?', answer: 'Here.', verses: [{ chapter: 1, verse: 1 }]
  }));
  assert.equal(missing.status, 400);
  assert.equal(kv.keys().some((key) => key.startsWith('study:')), false);
  const ok = await read(await call(kv, '/verse/send', { ...base, book: 43, chapter: 3, verse: 16 }));
  assert.equal(ok.status, 200);
});

test('verse reads and study deletes are rate limited on their own hourly buckets', async () => {
  const kv = memoryKv();
  const mary = (await read(await call(kv, '/register', { name: 'Mary' }))).data;
  const alex = (await read(await call(kv, '/register', { name: 'Alex' }))).data;
  await befriend(kv, mary, alex);
  const sent = await read(await call(kv, '/verse/send', {
    code: mary.code, secret: mary.secret, to: alex.code,
    book: 43, chapter: 3, verse: 16, reference: 'John 3:16', text: 'For God so loved the world', note: ''
  }));
  assert.equal(sent.status, 200);
  for (let i = 0; i < 200; i++) {
    const ok = await read(await call(kv, '/verse/read', { code: alex.code, secret: alex.secret, id: sent.data.id }));
    assert.equal(ok.status, 200);
  }
  const limitedRead = await read(await call(kv, '/verse/read', { code: alex.code, secret: alex.secret, id: sent.data.id }));
  assert.equal(limitedRead.status, 429);
  await call(kv, '/study/add', {
    code: mary.code, secret: mary.secret, with: alex.code, entryId: 'abc12345',
    question: 'A question', answer: 'An answer', verses: []
  });
  for (let i = 0; i < 200; i++) {
    const ok = await read(await call(kv, '/study/delete', { code: mary.code, secret: mary.secret, with: alex.code, entryId: 'abc12345' }));
    assert.equal(ok.status, 200);
  }
  const limitedDelete = await read(await call(kv, '/study/delete', { code: mary.code, secret: mary.secret, with: alex.code, entryId: 'abc12345' }));
  assert.equal(limitedDelete.status, 429);
  const stillSends = await read(await call(kv, '/verse/send', {
    code: mary.code, secret: mary.secret, to: alex.code,
    book: 19, chapter: 23, verse: 1, reference: 'Psalm 23:1', text: 'The LORD is my shepherd', note: ''
  }));
  assert.equal(stillSends.status, 200);
});

test('a full rate bucket stays full and the next call is refused', async () => {
  assert.deepEqual(RATE_LIMITS, {
    register: 80, sync: 60, msg: 60, note: 40, friendAdd: 40, shared: 20, scores: 60
  });
  const kv = memoryKv();
  const now = Date.now();
  const mary = (await read(await call(kv, '/register', { name: 'Mary' }))).data;
  const pal = (await read(await call(kv, '/register', { name: 'Pal' }))).data;
  await kv.put('rate:register:unknown', JSON.stringify({ start: now, n: RATE_LIMITS.register }));
  const blocked = await read(await call(kv, '/register', { name: 'Extra' }));
  assert.equal(blocked.status, 429);
  assert.equal((await kv.get('rate:register:unknown', 'json')).n, RATE_LIMITS.register);
  await befriend(kv, mary, pal);
  const seed = async (key, limit) => kv.put(key, JSON.stringify({ start: now, n: limit }));
  await seed(`rate:sync:${mary.code}`, RATE_LIMITS.sync);
  await seed(`rate:msg:${mary.code}`, RATE_LIMITS.msg);
  await seed(`rate:note:${mary.code}`, RATE_LIMITS.note);
  await seed(`rate:friend-add:${mary.code}`, RATE_LIMITS.friendAdd);
  await seed(`rate:shared:${mary.code}`, RATE_LIMITS.shared);
  await seed(`rate:scores:${mary.code}`, RATE_LIMITS.scores);

  const sync = await read(await call(kv, '/sync', { code: mary.code, secret: mary.secret, name: 'Mary' }));
  const msg = await read(await call(kv, '/msg/send', { code: mary.code, secret: mary.secret, to: pal.code, body: 'Hello' }));
  const note = await read(await call(kv, '/note/send', { code: mary.code, secret: mary.secret, to: pal.code, body: 'A note' }));
  const added = await read(await call(kv, '/friend/add', { code: mary.code, secret: mary.secret, friendCode: pal.code }));
  const shared = await read(await call(kv, '/shared/create', { code: mary.code, secret: mary.secret, to: pal.code, body: 'Together' }));
  const score = await read(await call(kv, '/scores/submit', { code: mary.code, secret: mary.secret, show: 'jeopardy', score: 12, level: 1 }));
  for (const result of [sync, msg, note, added, shared, score]) assert.equal(result.status, 429);
  assert.equal((await kv.get(`rate:sync:${mary.code}`, 'json')).n, RATE_LIMITS.sync);
  assert.equal((await kv.get(`rate:msg:${mary.code}`, 'json')).n, RATE_LIMITS.msg);
  assert.equal((await kv.get(`rate:note:${mary.code}`, 'json')).n, RATE_LIMITS.note);
  assert.equal((await kv.get(`rate:friend-add:${mary.code}`, 'json')).n, RATE_LIMITS.friendAdd);
  assert.equal((await kv.get(`rate:shared:${mary.code}`, 'json')).n, RATE_LIMITS.shared);
  assert.equal((await kv.get(`rate:scores:${mary.code}`, 'json')).n, RATE_LIMITS.scores);
  assert.deepEqual((await kv.get(`user:${pal.code}`, 'json')).threads, {});
});

test('a score above the cap is rejected and is not stored', async () => {
  const kv = memoryKv();
  const mary = (await read(await call(kv, '/register', { name: 'Mary' }))).data;
  const high = await read(await call(kv, '/scores/submit', {
    code: mary.code, secret: mary.secret, show: 'jeopardy', score: 1000001, level: 1
  }));
  assert.equal(high.status, 400);
  assert.equal(high.data.error, 'That score is too high');
  assert.equal(await kv.get(`rate:scores:${mary.code}`), null);
  assert.equal(await kv.get('leaderboard'), null);
  const ok = await read(await call(kv, '/scores/submit', {
    code: mary.code, secret: mary.secret, show: 'jeopardy', score: 40, level: 1
  }));
  assert.equal(ok.status, 200);
  assert.equal((await kv.get('leaderboard', 'json')).jeopardy[0].score, 40);
});

test('messages, notes, and shared notes require friendship in both directions', async () => {
  const kv = memoryKv();
  const mary = (await read(await call(kv, '/register', { name: 'Mary' }))).data;
  const pal = (await read(await call(kv, '/register', { name: 'Pal' }))).data;
  const pending = await read(await call(kv, '/friend/add', { code: mary.code, secret: mary.secret, friendCode: pal.code }));
  assert.equal(pending.data.status, 'pending');
  const msg = await read(await call(kv, '/msg/send', { code: mary.code, secret: mary.secret, to: pal.code, body: 'Hello' }));
  const note = await read(await call(kv, '/note/send', { code: mary.code, secret: mary.secret, to: pal.code, body: 'A note' }));
  const shared = await read(await call(kv, '/shared/create', { code: mary.code, secret: mary.secret, to: pal.code, body: 'Together' }));
  for (const result of [msg, note, shared]) {
    assert.equal(result.status, 403);
    assert.equal(result.data.error, 'Add that person as a friend first');
  }
  await befriend(kv, mary, pal);
  const stored = await kv.get(`user:${mary.code}`, 'json');
  stored.friends = stored.friends.filter((code) => code !== pal.code);
  await kv.put(`user:${mary.code}`, JSON.stringify(stored));
  const oneWay = await read(await call(kv, '/msg/send', { code: pal.code, secret: pal.secret, to: mary.code, body: 'Still here' }));
  assert.equal(oneWay.status, 403);
  assert.deepEqual((await kv.get(`user:${mary.code}`, 'json')).threads || {}, {});
});
