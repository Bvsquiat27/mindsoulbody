import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
globalThis.self = globalThis;

test('the David’s Sling squishy (shield) is legendary in the app, same unlock, with a story trick', () => {
  const C = require('./squishy-core.js');
  const ch = C.CHALLENGES.find((c) => c.id === 'shield');
  assert.equal(ch.tier, 'legendary');
  assert.deepEqual([ch.kind, ch.game, ch.n], ['kgDone', 'sling', 4], 'existing unlock kept');
  const T = require('./squishy-trade.js');
  assert.ok(T.LEGENDARY.includes('shield'));
  const room = readFileSync('squishy-room.js', 'utf8');
  assert.match(room, /LEGEND_MIN = 5/);
  assert.match(room, /const LEGENDARY = TRADE\.LEGENDARY;/);
  assert.match(room, /tablets, shield of faith\) needs at least 5/);
  assert.match(room, /tablas, escudo de la fe\) pide al menos 5/);
  const F = require('./squishy-fx.js');
  assert.ok(F.STORIES.shield.dur >= 3000 && typeof F.STORIES.shield.over === 'function');
  assert.match(readFileSync('squishy.js', 'utf8'), /shield: \{ text: 'The battle is the LORD’s'/);
  const i18n = readFileSync('i18n.js', 'utf8');
  assert.match(i18n, /"The battle is the LORD’s": "De Jehová es la guerra"/);
  assert.match(i18n, /"David put a stone in his sling and slung it;[^"]*\(1 Samuel 17:49\)\.": "David puso una piedra en su honda/);
});

test('the shield trick is drawn in squishy style and stays on screen', () => {
  const fx = readFileSync('squishy-fx.js', 'utf8');
  const block = fx.slice(fx.indexOf('    shield: {'), fx.indexOf('  const api'));
  assert.match(block, /squishyGoliath\(/);
  assert.match(block, /squishyDavid\(/);
  assert.match(block, /G\.W - u \* 0\.4/);
  assert.match(fx, /const SQ_INK = '#5b4660'/);
  assert.doesNotMatch(block, /rgba\(52,44,58/, 'no old code-drawn giant');
});
