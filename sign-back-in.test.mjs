import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const aura = readFileSync(new URL('./aura.js', import.meta.url), 'utf8');
const line = (start) => aura.split('\n').find((l) => l.startsWith(start));
const fns = ['function msbAccountKeyParse(', 'function msbStatsHaveProgress(', 'async function msbFriendsRelink(', 'let msbRestorePullAt=', 'const MSB_RESTORE_FAIL_KEY=', 'async function msbRestorePull(', 'async function msbRestorePullOnce(', 'async function msbFriendsSync('].map(line);
const KEY = 'a'.repeat(16) + '0123456789abcdef';

function harness(saved, call, extra = {}) {
  const ls = new Map(saved ? [['msb_friends_id', JSON.stringify(saved)]] : []), calls = [];
  ls.set('msb_friends_list', '[]');
  const store = extra.store || { profile: {}, notes: [], progress: [] };
  const env = {
    state: {}, msbSave: (st) => { store.saved = (store.saved || 0) + 1; Object.assign(store, st); },
    msbLoadMyNotes: async () => extra.notes || { setShared() {}, setLessonsShared() {}, mergeDevotional() {}, mergeStudyNotes: (a) => a, mergeProgress: (a) => a, syncSoon() {}, syncLessonsSoon() {} },
    msbMyNotesOpts: () => ({}),
    MSB_FRIENDS_KEY: 'msb_friends_id', MSB_DELETE_LOCAL_KEYS: ['msb_friends_id', 'msb_friends_list'],
    localStorage: { getItem: (k) => ls.get(k) ?? null, setItem: (k, v) => ls.set(k, String(v)), removeItem: (k) => ls.delete(k) },
    msbFriendsId: () => (ls.has('msb_friends_id') ? JSON.parse(ls.get('msb_friends_id')) : null),
    msbFriendsPublicProfile: () => ({}), msbFriendsStats: () => ({ studies: 0, bests: { a: 0 }, levels: {} }),
    msbStore: () => store, msbPublicImage: () => '', msbEs: () => false,
    msbFriendsCall: async (path, body) => { calls.push({ path, body }); return call ? call(path, body) : { ok: true }; },
    toast: () => {}, msbDenomPending: () => '', MSB_DENOM_PENDING_KEY: 'msb_denom_pending', navigator: { onLine: true }
  };
  const out = new Function(...Object.keys(env), `${fns.join('\n')}\nreturn {msbAccountKeyParse,msbStatsHaveProgress,msbFriendsRelink,msbFriendsSync};`)(...Object.values(env));
  return { ...out, calls, ls, store };
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
  const noRoute = (path) => { if (path === '/me/state') { const e = new Error('Not found'); e.status = 404; throw e; } return { ok: true }; };
  const h = harness({ code: 'MSB-ABC234', secret: KEY, restored: true }, noRoute);
  h.ls.set('msb_squishy_unlocked', '["cloud"]');
  await h.msbFriendsSync();
  assert.equal(h.calls[0].path, '/me/state');
  const body = h.calls.find((c) => c.path === '/sync').body;
  assert.equal('avatar_data' in body, false);
  assert.equal('stats' in body, false);
  assert.equal('squishies' in body, false);
  /* the worker has no /me/state yet: the phone stays in the safe mode */
  assert.equal(JSON.parse(h.ls.get('msb_friends_id')).restored, true);
  const fresh = harness({ code: 'MSB-ABC234', secret: KEY });
  await fresh.msbFriendsSync();
  assert.equal(fresh.calls[0].path, '/sync');
  assert.equal(fresh.calls[0].body.avatar_data, '');
  assert.ok('stats' in fresh.calls[0].body);
});

test('once the saved copy is pulled and merged, restored is cleared and full syncs resume', async () => {
  const M = require('./my-notes.js');
  const merged = [];
  const notes = { ...M, setShared() {}, setLessonsShared() {}, mergeDevotional: (n) => { merged.push(n.length); return n.length; }, syncSoon() {}, syncLessonsSoon() {} };
  const server = { ok: true, notes: { hidden: false, notes: [{ kind: 'study', key: 'shepherd', text: 'old phone note', ts: 1700000000000 }, { kind: 'devotional', key: '2026-10-01', text: 'day note', ts: 1 }] }, lessons: { hidden: false, done: [{ id: 'shepherd', ts: 1700000000000, score: 4 }] } };
  const h = harness({ code: 'MSB-ABC234', secret: KEY, restored: true }, (path) => (path === '/me/state' ? server : { ok: true }), { notes, store: { profile: {}, notes: [{ study_id: 'word-flesh', body: 'new phone note', updated_at: 5 }], progress: [] } });
  await h.msbFriendsSync();
  assert.deepEqual(h.calls.map((c) => c.path), ['/me/state', '/sync']);
  assert.equal('restored' in JSON.parse(h.ls.get('msb_friends_id')), false);
  assert.deepEqual(merged, [2]);
  assert.deepEqual(h.store.notes.map((n) => n.study_id).sort(), ['shepherd', 'word-flesh']);
  assert.equal(h.store.progress[0].study_id, 'shepherd');
  assert.equal(h.store.progress[0].quiz_score, 4);
});

test('sign in points people to the sign-back-in path and Profile shows the key only on tap', () => {
  assert.match(aura, /Already have an account\? Sign back in/);
  assert.match(aura, /if\(kind==='friends-relink'\)return msbRelinkDialog\(\)/);
  assert.match(aura, /\$\{msbAccountKeyHtml\(\)\}\$\{msbBackupHtml\(\)\}/);
  assert.match(line('function msbAccountKeyHtml('), /value=""/);
  assert.match(readFileSync('sw.js', 'utf8'), /const CACHE_VERSION = 'v175'/);
});

test('a phone that just signed back in does not replace saved notes or lessons until the saved copy is merged', () => {
  const src = readFileSync('my-notes.js', 'utf8');
  assert.match(src, /if \(me\.restored && !hidden\) return \{ skipped: true, restored: true \};[^]*if \(me\.restored && !hidden\) return \{ skipped: true, restored: true \};/);
});

test('merging the saved copy keeps this phone first and never loses a finished lesson', () => {
  const M = require('./my-notes.js');
  const mem = new Map(); const ls = { getItem: (k) => mem.get(k) ?? null, setItem: (k, v) => mem.set(k, String(v)) };
  ls.setItem(M.KEY, JSON.stringify({ a: { text: 'mine', ts: 9 } }));
  assert.equal(M.mergeDevotional([{ kind: 'devotional', key: 'a', text: 'theirs', ts: 1 }, { kind: 'devotional', key: 'b', text: 'old', ts: 2, title: 'T' }, { kind: 'study', key: 'c', text: 'x' }], ls), 1);
  const all = JSON.parse(mem.get(M.KEY));
  assert.equal(all.a.text, 'mine'); assert.equal(all.b.text, 'old'); assert.equal(all.b.title, 'T'); assert.equal('c' in all, false);
  const notes = M.mergeStudyNotes([{ study_id: 's1', body: 'here', updated_at: 1 }, { study_id: 's2', body: '', updated_at: 1 }], [{ kind: 'study', key: 's1', text: 'there', ts: 1000 }, { kind: 'study', key: 's2', text: 'saved', ts: 2000 }]);
  assert.deepEqual(notes, [{ study_id: 's1', body: 'here', updated_at: 1 }, { study_id: 's2', body: 'saved', updated_at: 2 }]);
  const prog = M.mergeProgress([{ study_id: 's1', completed_at: null, quiz_score: 3 }], { done: [{ id: 's1', ts: 5000, score: 1 }, { id: 's3', ts: 7000, score: null }, { id: 'bad id!', ts: 1 }] });
  assert.deepEqual(prog, [{ study_id: 's1', completed_at: 5, quiz_score: 3 }, { study_id: 's3', completed_at: 7, quiz_score: null }]);
});

test('squishies the server already has come back to a restored phone (not the lamp, not starters)', () => {
  const { SQUISHIES } = require('./squishy-data.js'); const C = require('./squishy-core.js'); const S = require('./squishy-social.js');
  const mem = new Map(); const ls = { getItem: (k) => mem.get(k) ?? null, setItem: (k, v) => mem.set(k, String(v)), removeItem: (k) => mem.delete(k) };
  const starter = SQUISHIES.find((x) => !x.locked).id, locked = SQUISHIES.filter((x) => x.locked && x.id !== 'lamp').slice(0, 2).map((x) => x.id);
  const added = S.restoreIds(ls, [starter, 'lamp', 'nope', ...locked, locked[0]], SQUISHIES, C);
  assert.deepEqual(added, locked);
  assert.deepEqual(JSON.parse(mem.get('msb_squishy_unlocked')), locked);
  assert.deepEqual(S.restoreIds(ls, locked, SQUISHIES, C), []);
});

test('if the saved copy keeps not coming back, a gentle note shows once and the phone keeps trying', async () => {
  const fail = (path) => { if (path === '/me/state') throw new Error('offline'); return { ok: true }; };
  const toasts = [];
  const src = ['let msbRestorePullAt=', 'const MSB_RESTORE_FAIL_KEY=', 'async function msbRestorePull(', 'async function msbRestorePullOnce('].map(line).join('\n');
  const ls = new Map();
  const mk = () => new Function('msbFriendsCall', 'localStorage', 'toast', 'msbEs', 'msbStore', 'msbSave', 'msbLoadMyNotes', 'MSB_FRIENDS_KEY', 'msbFriendsId', `${src}\nreturn msbRestorePull;`)(
    async (p) => fail(p), { getItem: (k) => ls.get(k) ?? null, setItem: (k, v) => ls.set(k, String(v)), removeItem: (k) => ls.delete(k) },
    (m) => toasts.push(m), () => false, () => ({ profile: {} }), () => {}, async () => null, 'msb_friends_id', () => null);
  const id = { code: 'MSB-ABC234', secret: KEY, restored: true };
  for (let i = 0; i < 4; i++) assert.equal(await mk()(id), false); /* a fresh load each time, like reopening the app */
  assert.equal(ls.get('msb_restore_fail'), '4');
  assert.ok(toasts.length >= 1 && toasts.every((m) => /still on their way[^]*Nothing is lost/.test(m)));
  assert.equal(id.restored, true);
});

test('a restored phone fills empty profile fields from the saved copy and keeps what it has', async () => {
  const store = { profile: { name: 'Kept' }, notes: [], progress: [] };
  const h = harness({ code: 'MSB-ABC234', secret: KEY, restored: true }, (path) => (path === '/me/state' ? { ok: true, code: 'MSB-ABC234', profile: { name: 'Other', city: 'Town', bio: 'Hi' }, notes: { hidden: true, notes: [] }, lessons: { hidden: true, done: [] } } : { ok: true }), { store });
  await h.msbFriendsSync();
  assert.equal(h.store.profile.name, 'Kept');
  assert.equal(h.store.profile.city, 'Town');
  assert.equal(h.store.profile.bio, 'Hi');
});
