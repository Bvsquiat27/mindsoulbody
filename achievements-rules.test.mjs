import assert from 'node:assert/strict';
import test from 'node:test';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { msbBadgeLocalDay, msbBadgeMultitask, msbBadgeStrong } = require('./achievements-rules.js');

function dayStamp(offset) {
  const date = new Date();
  date.setHours(12, 0, 0, 0);
  date.setDate(date.getDate() + offset);
  return Math.floor(date.getTime() / 1000);
}

test('multitask unlocks only when a lesson and a game share a local day', () => {
  const today = dayStamp(0);
  const yesterday = dayStamp(-1);
  assert.equal(msbBadgeMultitask({
    progress: [{ study_id: 'a', completed_at: today }],
    gameScores: { jeopardy: { best: 10, plays: 1, days: [msbBadgeLocalDay(today)] } }
  }), true);
  assert.equal(msbBadgeMultitask({
    progress: [{ study_id: 'a', completed_at: yesterday }],
    gameScores: { feud: { best: 4, plays: 1, days: [msbBadgeLocalDay(today)] } }
  }), false);
  assert.equal(msbBadgeMultitask({
    challenges: [{ activity_id: 'idea-god-exists', finishedOn: msbBadgeLocalDay(today), kind: 'lesson' }],
    gameScores: {}
  }), false);
  assert.equal(msbBadgeMultitask({
    challenges: [
      { activity_id: 'spirit-pentecost', finishedOn: msbBadgeLocalDay(today), kind: 'lesson' },
      { activity_id: 'councils', finishedOn: msbBadgeLocalDay(today), kind: 'game' }
    ]
  }), true);
});

test('strong-woman badge uses a 7-day streak threshold', () => {
  assert.equal(msbBadgeStrong(6), false);
  assert.equal(msbBadgeStrong(7), true);
  assert.equal(msbBadgeStrong(8), true);
  assert.equal(msbBadgeStrong(0), false);
});
