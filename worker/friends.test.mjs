import assert from 'node:assert/strict';
import test from 'node:test';
import { handleFriends } from './friends.mjs';

function memoryKv() {
  const data = new Map();
  return {
    async get(key, type) {
      if (!data.has(key)) return null;
      const value = data.get(key);
      return type === 'json' ? JSON.parse(value) : value;
    },
    async put(key, value) { data.set(key, String(value)); },
    async delete(key) { data.delete(key); },
    snapshot() { return data; }
  };
}

function call(kv, path, body, method = 'POST') {
  const request = new Request(`https://friends.test${path}`, {
    method,
    headers: { 'content-type': 'application/json' },
    body: method === 'GET' || method === 'OPTIONS' ? undefined : JSON.stringify(body ?? {})
  });
  return handleFriends(request, { FRIENDS: kv });
}

async function read(response) {
  const text = await response.text();
  let data = null;
  try { data = text ? JSON.parse(text) : null; } catch { data = text; }
  return { status: response.status, data, text };
}

function hasSecretKey(value) {
  if (Array.isArray(value)) return value.some(hasSecretKey);
  if (value && typeof value === 'object') {
    if (Object.prototype.hasOwnProperty.call(value, 'secret')) return true;
    return Object.values(value).some(hasSecretKey);
  }
  return false;
}

const AVATAR = 'data:image/png;base64,aaaa';
const COVER = 'https://cdn.example/cover.webp';

test('sync stores public profile fields and another browser receives them without the secret', async () => {
  const kv = memoryKv();
  const mary = (await read(await call(kv, '/register', { name: 'Mary' }))).data;
  const angel = (await read(await call(kv, '/register', { name: 'Angel' }))).data;
  assert.equal(mary.name, undefined);
  assert.equal(typeof mary.secret, 'string');
  assert.equal(mary.secret.length, 32);

  const sync = await read(await call(kv, '/sync', {
    code: mary.code,
    secret: mary.secret,
    name: 'Mary',
    stats: { studies: 1, levels: { jeopardy: 2, extra: 9 }, bests: { feud: 4 }, ignored: 1 },
    handle: 'maryh',
    city: 'Antioch',
    bio: 'Reads in the morning',
    avatar_data: AVATAR,
    cover_data: COVER,
    email: 'mary@example.com',
    profile: {
      handle: 'maryh',
      city: 'Antioch',
      bio: 'Reads in the morning',
      avatar_data: AVATAR,
      cover_data: COVER,
      secret: mary.secret,
      email: 'mary@example.com',
      password: 'nope'
    }
  }));
  assert.equal(sync.status, 200);
  assert.deepEqual(sync.data, { ok: true });
  assert.equal(sync.text.includes(mary.secret), false);

  const kept = await read(await call(kv, '/sync', { code: mary.code, secret: mary.secret }));
  assert.equal(kept.status, 200);

  await call(kv, '/friend/add', { code: angel.code, secret: angel.secret, friendCode: mary.code.toLowerCase() });
  const friends = await read(await call(kv, '/friends', { code: angel.code, secret: angel.secret }));
  assert.equal(friends.status, 200);
  assert.equal(friends.data.length, 1);
  const row = friends.data[0];
  assert.equal(row.code, mary.code);
  assert.equal(row.name, 'Mary');
  assert.equal(row.handle, 'maryh');
  assert.equal(row.city, 'Antioch');
  assert.equal(row.bio, 'Reads in the morning');
  assert.equal(row.avatar_data, AVATAR);
  assert.equal(row.cover_data, COVER);
  assert.equal(row.profile.handle, 'maryh');
  assert.equal(row.profile.city, 'Antioch');
  assert.equal(row.profile.bio, 'Reads in the morning');
  assert.equal(row.profile.avatar_data, AVATAR);
  assert.equal(row.profile.cover_data, COVER);
  assert.equal(row.stats.studies, 1);
  assert.equal(row.stats.levels.jeopardy, 2);
  assert.equal(row.stats.bests.feud, 4);
  assert.equal(row.stats.extra, undefined);
  assert.equal(row.stats.levels.extra, undefined);
  assert.equal(hasSecretKey(row), false);
  assert.equal(friends.text.includes(mary.secret), false);
  assert.equal(friends.text.includes(angel.secret), false);
  assert.equal(row.email, undefined);

  const stored = await kv.get(`user:${mary.code}`, 'json');
  assert.equal(stored.secret, undefined);
  assert.equal(stored.email, undefined);
  assert.equal(stored.handle, 'maryh');
  assert.equal(stored.avatar_data, AVATAR);
  assert.equal(stored.cover_data, COVER);
  assert.equal(JSON.stringify(stored).includes(mary.secret), false);
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
  const angel = (await read(await call(kv, '/register', { name: 'Angel' }))).data;
  const ruth = (await read(await call(kv, '/register', { name: 'Ruth' }))).data;

  await call(kv, '/friend/add', { code: mary.code, secret: mary.secret, friendCode: angel.code });
  await call(kv, '/friend/add', { code: mary.code, secret: mary.secret, friendCode: ruth.code });

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
  assert.deepEqual(stored.friends, [angel.code, ruth.code]);
  assert.equal(JSON.stringify(stored.profile || {}).includes(injected), false);

  const asAngel = await read(await call(kv, '/friends', { code: angel.code, secret: angel.secret }));
  assert.equal(asAngel.status, 200);
  assert.deepEqual(asAngel.data.map(row => row.code), [mary.code]);
  assert.equal(asAngel.data[0].friends, undefined);
  assert.equal(asAngel.data[0].profile.friends, undefined);
  assert.equal(asAngel.data[0].profile.handle, 'maryh');
  assert.equal(asAngel.text.includes(ruth.code), false);
  assert.equal(asAngel.text.includes(injected), false);
  assert.equal(asAngel.text.includes(mary.secret), false);

  const asMary = await read(await call(kv, '/friends', { code: mary.code, secret: mary.secret }));
  assert.equal(asMary.status, 200);
  assert.deepEqual(asMary.data.map(row => row.code).sort(), [angel.code, ruth.code].sort());
  for (const row of asMary.data) {
    assert.equal(row.friends, undefined);
    assert.equal(row.profile && row.profile.friends, undefined);
  }

  const stolen = await read(await call(kv, '/friends', { code: mary.code, secret: angel.secret }));
  assert.equal(stolen.status, 401);
  assert.equal(stolen.text.includes(ruth.code), false);
  assert.equal(stolen.text.includes(angel.code), false);
});

test('a saint portrait id is saved for friends, and a bad id is dropped', async () => {
  const kv = memoryKv();
  const mary = (await read(await call(kv, '/register', { name: 'Mary' }))).data;
  const angel = (await read(await call(kv, '/register', { name: 'Angel' }))).data;
  await call(kv, '/sync', {
    code: mary.code,
    secret: mary.secret,
    name: 'Mary',
    avatar_data: AVATAR,
    avatar_saint: 'nicholas'
  });
  let stored = await kv.get(`user:${mary.code}`, 'json');
  assert.equal(stored.avatar_data, AVATAR);
  assert.equal(stored.avatar_saint, 'nicholas');

  await call(kv, '/sync', {
    code: mary.code,
    secret: mary.secret,
    avatar_data: '',
    avatar_saint: 'Nicholas',
    profile: { avatar_saint: '../saints/nicholas.svg' }
  });
  stored = await kv.get(`user:${mary.code}`, 'json');
  assert.equal(stored.avatar_data, undefined);
  assert.equal(stored.avatar_saint, 'nicholas');

  await call(kv, '/friend/add', { code: angel.code, secret: angel.secret, friendCode: mary.code });
  const friends = await read(await call(kv, '/friends', { code: angel.code, secret: angel.secret }));
  assert.equal(friends.data[0].avatar_saint, 'nicholas');
  assert.equal(friends.data[0].profile.avatar_saint, 'nicholas');
  assert.equal(friends.data[0].avatar_data, undefined);

  await call(kv, '/sync', { code: mary.code, secret: mary.secret, avatar_saint: 'javascript:alert(1)' });
  stored = await kv.get(`user:${mary.code}`, 'json');
  assert.equal(stored.avatar_saint, undefined);
  const cleared = await read(await call(kv, '/friends', { code: angel.code, secret: angel.secret }));
  assert.equal(cleared.data[0].avatar_saint, undefined);
});

test('wrong secret does not echo the secret, and friend responses stay public', async () => {
  const kv = memoryKv();
  const user = (await read(await call(kv, '/register', { name: 'Mary' }))).data;
  const wrong = await read(await call(kv, '/friends', { code: user.code, secret: 'not-the-secret' }));
  assert.equal(wrong.status, 401);
  assert.equal(wrong.data.error, 'Wrong account secret');
  assert.equal(wrong.text.includes('not-the-secret'), false);
  assert.equal(wrong.text.includes(user.secret), false);

  const note = await read(await call(kv, '/note/send', {
    code: user.code,
    secret: user.secret,
    to: user.code,
    body: 'hello',
    secretNote: user.secret
  }));
  assert.equal(note.status, 403);
  assert.equal(note.text.includes(user.secret), false);
});
