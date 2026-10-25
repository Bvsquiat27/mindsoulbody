import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const aura = readFileSync(new URL('./aura.js', import.meta.url), 'utf8');
const line = (start) => aura.split('\n').find((l) => l.startsWith(start));
const fns = ['function msbAccountKeyParse(', 'function msbStatsHaveProgress(', 'function msbSquishiesEarnedHere(', 'async function msbFriendsRelink(', 'async function msbFriendsSync('].map(line);
const KEY = 'a'.repeat(16) + '0123456789abcdef';

function harness(saved, call) {
  const ls = new Map(saved ? [['msb_friends_id', JSON.stringify(saved)]] : []), calls = [];
  ls.set('msb_friends_list', '[]');
  const env = {
    MSB_FRIENDS_KEY: 'msb_friends_id', MSB_DELETE_LOCAL_KEYS: ['msb_friends_id', 'msb_friends_list'],
    localStorage: { getItem: (k) => ls.get(k) ?? null, setItem: (k, v) => ls.set(k, String(v)), removeItem: (k) => ls.delete(k) },
    msbFriendsId: () => (ls.has('msb_friends_id') ? JSON.parse(ls.get('msb_friends_id')) : null),
    msbFriendsPublicProfile: () => ({}), msbFriendsStats: () => ({ studies: 0, bests: { a: 0 }, levels: {} }),
    msbStore: () => ({ profile: {} }), msbPublicImage: () => '', msbEs: () => false,
    msbFriendsCall: async (path, body) => { calls.push({ path, body }); return call ? call(path, body) : { ok: true }; },
    toast: () => {}, msbDenomPending: () => '', MSB_DENOM_PENDING_KEY: 'msb_denom_pending', navigator: { onLine: true }
  };
  const out = new Function(...Object.keys(env), `${fns.join('\n')}\nreturn {msbAccountKeyParse,msbStatsHaveProgress,msbFriendsRelink,msbFriendsSync};`)(...Object.values(env));
  return { ...out, calls, ls };
}

test('the code and key are found in either box, even when the copied text is pasted whole', () => {
  const h = harness();
  assert.deepEqual(h.msbAccountKeyParse('msb-abc234', KEY.toUpperCase()), { code: 'MSB-ABC234', secret: KEY });
  assert.deepEqual(h.msbAccountKeyParse(`Friend code: MSB-ABC234\nSign-in key: ${KEY}`, ''), { code: 'MSB-ABC234', secret: KEY });
  assert.equal(h.msbAccountKeyParse('MSB-ABC234', 'short').secret, '');
});

test('signing back in checks the key with the server, then saves it on this phone', async () => {
  const h = harness(null, () => []);
  const res = await h.msbFriendsRelink(' MSB-ABC234 ', KEY);
  assert.equal(res.code, 'MSB-ABC234');
  assert.deepEqual(h.calls[0], { path: '/friends', body: { code: 'MSB-ABC234', secret: KEY } });
  const saved = JSON.parse(h.ls.get('msb_friends_id'));
  assert.equal(saved.secret, KEY);
  assert.equal(saved.restored, true);
});

test('a wrong key or code gives a clear message and saves nothing', async () => {
  for (const [status, text] of [[401, /does not match/], [404, /could not find/], [429, /Too many tries/]]) {
    const h = harness(null, () => { const e = new Error('x'); e.status = status; throw e; });
    await assert.rejects(h.msbFriendsRelink('MSB-ABC234', KEY), text);
    assert.equal(h.ls.has('msb_friends_id'), false);
  }
  await assert.rejects(harness().msbFriendsRelink('', KEY), /MSB-ABC123/);
});

test('switching away from another code on this phone asks first', async () => {
  const h = harness({ code: 'MSB-ZZZZZZ', secret: 'b'.repeat(32) }, () => []);
  const first = await h.msbFriendsRelink('MSB-ABC234', KEY);
  assert.equal(first.needsConfirm, true);
  assert.equal(h.calls.length, 0);
  await h.msbFriendsRelink('MSB-ABC234', KEY, { replace: 'MSB-ABC234' });
  assert.equal(JSON.parse(h.ls.get('msb_friends_id')).code, 'MSB-ABC234');
  assert.equal(h.ls.has('msb_friends_list'), false);
});

test('the first sync after signing back in keeps the picture, stats and squishies saved on the server', async () => {
  const h = harness({ code: 'MSB-ABC234', secret: KEY, restored: true });
  await h.msbFriendsSync();
  const body = h.calls[0].body;
  assert.equal('avatar_data' in body, false);
  assert.equal('stats' in body, false);
  assert.equal('squishies' in body, false);
  const fresh = harness({ code: 'MSB-ABC234', secret: KEY });
  await fresh.msbFriendsSync();
  assert.equal(fresh.calls[0].body.avatar_data, '');
  assert.ok('stats' in fresh.calls[0].body);
});

test('sign in points people to the sign-back-in path and Profile shows the key only on tap', () => {
  assert.match(aura, /Already have an account\? Sign back in/);
  assert.match(aura, /if\(kind==='friends-relink'\)return msbRelinkDialog\(\)/);
  assert.match(aura, /\$\{msbAccountKeyHtml\(\)\}\$\{msbBackupHtml\(\)\}/);
  assert.match(line('function msbAccountKeyHtml('), /value=""/);
  assert.match(readFileSync('sw.js', 'utf8'), /const CACHE_VERSION = 'v171'/);
});

test('a phone that just signed back in does not replace saved notes or lessons with an empty list', () => {
  const src = readFileSync('my-notes.js', 'utf8');
  assert.match(src, /if \(me\.restored && !hidden && !notes\.length\) return \{ skipped: true \};/);
  assert.match(src, /if \(me\.restored && !hidden && !lessons\.current && !lessons\.done\.length\) return \{ skipped: true \};/);
});
