import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
globalThis.self = globalThis;
const N = require('./my-notes.js');
const look = (id) => ({ grace: { title: 'Grace', reference: 'Eph 2:8', quizTotal: 3 }, mercy: { title: 'Mercy', reference: 'Lk 6:36', quizTotal: 2 } }[id] || null);

test('lesson payload: finished with date and quiz, current only if unfinished', () => {
  const p = N.lessonsPayload({ progress: [{ study_id: 'grace', completed_at: 100, quiz_score: 2 }, { study_id: 'mercy', completed_at: null, quiz_score: 1 }, { study_id: '../x', completed_at: 5 }], lastStudy: 'mercy' });
  assert.deepEqual(p.done, [{ id: 'grace', ts: 100000, score: 2 }]);
  assert.equal(p.current.id, 'mercy');
  assert.equal(N.lessonsPayload({ progress: [{ study_id: 'grace', completed_at: 1 }], lastStudy: 'grace' }).current, null);
});

test('lesson sharing is on by default with its own switch', () => {
  const m = new Map(); const ls = { getItem: (k) => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, String(v)) };
  assert.equal(N.lessonsShared(ls), true); N.setLessonsShared(false, ls); assert.equal(N.lessonsShared(ls), false);
  assert.ok(N.LESSONS_SHARE_KEY.startsWith('msb_'));
});

test('friend lessons view: current, finished with progress, their notes (unless hidden), tappable', () => {
  const html = N.friendLessonsHtml('Mary', { code: 'MSB-1', current: { id: 'mercy' }, done: [{ id: 'grace', ts: Date.UTC(2026, 9, 1), score: 2 }, { id: 'unknown' }] }, { hidden: false, notes: [{ kind: 'study', key: 'grace', text: 'Saved by grace' }] }, look);
  assert.match(html, /data-lesson="mercy"/); assert.match(html, /data-lesson="grace"/);
  assert.doesNotMatch(html, /unknown/);
  assert.match(html, /Quiz 2\/3/); assert.match(html, /Saved by grace/); assert.match(html, /Finished · 1/);
  const hiddenNotes = N.friendLessonsHtml('Mary', { current: null, done: [{ id: 'grace' }] }, { hidden: true, notes: [] }, look);
  assert.doesNotMatch(hiddenNotes, /THEIR NOTE/); assert.match(hiddenNotes, /Their notes are private/);
  assert.match(N.friendLessonsHtml('Mary', { hidden: true }, null, look), /keeps their lessons private/);
  const hiddenView = N.friendLessonsHtml('Mary', { hidden: true }, null, look);
  assert.doesNotMatch(hiddenView, /Tap a lesson to open it for yourself/, 'no tap hint above the private message');
  assert.match(N.friendLessonsHtml('Mary', { current: null, done: [{ id: 'grace' }] }, null, look), /Tap a lesson to open it for yourself/);
});

test('aura wires the tappable studies chip, the screen and lesson syncs (lazy)', () => {
  const aura = readFileSync('aura.js', 'utf8');
  assert.match(aura, /msbFriendsChips\(f,true\)/);
  assert.match(aura, /data-action=\\"friend-lessons\\"|data-action="friend-lessons"/);
  assert.match(aura, /state\.screen==='friend-lessons'\)msbFriendLessonsScreen\(\)/);
  assert.match(aura, /quiz_score:result\.score\}\);msbLessonsSyncSoon\(\)/);
  assert.match(aura, /Study completed\.'\);msbLessonsSyncSoon\(\)/);
  assert.doesNotMatch(readFileSync('index.html', 'utf8'), /my-notes\.js/);
});

test('guest banner follows the share switch in EN and ES', () => {
  const aura = readFileSync('aura.js', 'utf8'), i18n = readFileSync('i18n.js', 'utf8');
  assert.match(aura, /msbNotesShared\(\)\?'Your guest space is temporary\. Create an account to keep your notes\. With a friend code/);
  assert.match(aura, /'Your guest space is temporary\. Create an account to keep your notes\. Sharing is off, so only you can see them\.'/);
  assert.match(i18n, /Compartir está desactivado, así que solo tú puedes verlas\./);
});

test('the worker lists shield as legendary with the 5-squishy minimum', async () => {
  const W = await import('./worker/friends.mjs');
  assert.ok(W.SQUISHY_LEGENDARY.includes('shield'));
  assert.equal(W.TRADE_RULES.LEGEND_MIN, 5);
});

test('lesson sync sends only lesson ids, dates and scores; with the switch off it sends nothing', async () => {
  const m = new Map([['msb_friends_id', JSON.stringify({ code: 'MSB-ME', secret: 's3cret' })]]);
  globalThis.localStorage = { getItem: (k) => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, String(v)) };
  const sent = [];
  globalThis.fetch = async (url, init) => { sent.push({ url, body: JSON.parse(init.body) }); return { ok: true, status: 200, json: async () => ({ ok: true }) }; };
  try {
    const opts = { progress: [{ study_id: 'grace', completed_at: 100, quiz_score: 2, notes: 'private words' }], lastStudy: 'mercy' };
    await N.syncLessons(opts, true);
    const on = sent.pop();
    assert.match(on.url, /\/lessons\/sync$/);
    assert.equal(on.body.hidden, false);
    assert.deepEqual(Object.keys(on.body).sort(), ['code', 'hidden', 'lessons', 'secret']);
    assert.deepEqual(on.body.lessons.done, [{ id: 'grace', ts: 100000, score: 2 }]);
    assert.deepEqual(Object.keys(on.body.lessons.current).sort(), ['id', 'ts']);
    assert.doesNotMatch(JSON.stringify(on.body), /private words/);
    N.setLessonsShared(false);
    await N.syncLessons(opts, true);
    const off = sent.pop();
    assert.deepEqual(off.body.lessons, { current: null, done: [] });
    assert.equal(off.body.hidden, true);
    // no friend code: nothing leaves the device
    m.delete('msb_friends_id'); N.setLessonsShared(true);
    assert.deepEqual(await N.syncLessons(opts, true), { skipped: true });
    assert.equal(sent.length, 0);
  } finally { delete globalThis.fetch; delete globalThis.localStorage; }
});

test('the lessons switch and the friend lessons view have EN and ES text', () => {
  const src = readFileSync('my-notes.js', 'utf8');
  for (const [en, es] of [['Friends can see my lessons', 'Mis amigos pueden ver mis lecciones'], ['Friends can see your lessons.', 'Tus amigos pueden ver tus lecciones.'], ['Your lessons are private.', 'Tus lecciones son privadas.'], ['This friend keeps their lessons private.', 'Este amigo mantiene sus lecciones en privado.'], ['Lessons could not load right now.', 'No se pudieron cargar las lecciones ahora.']]) {
    assert.ok(src.includes(`tr('${en}', '${es}')`), en);
  }
  const html = N.friendLessonsHtml('Mary', { current: null, done: [] }, null, look);
  assert.match(html, /Mary’s lessons/);
  globalThis.localStorage = { getItem: () => null, setItem() {} };
  try { assert.match(N.profileHtml({}), /data-lessons-share role="switch" aria-checked="true"/, 'on by default'); }
  finally { delete globalThis.localStorage; }
});
