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
