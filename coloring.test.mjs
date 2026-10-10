import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { lineLayer, flatten, undoStack, stampPoints } = require('./coloring-core.js');

const px = (arr, i) => Array.from(arr.slice(i * 4, i * 4 + 4));

test('line art becomes black ink on a transparent layer', () => {
  // white paper, black line, light-gray anti-aliased edge
  const art = new Uint8ClampedArray([255, 255, 255, 255, 0, 0, 0, 255, 180, 180, 180, 255]);
  const layer = lineLayer(art, 3, 1);
  assert.deepEqual(px(layer, 0), [0, 0, 0, 0]);
  assert.deepEqual(px(layer, 1), [0, 0, 0, 255]);
  assert.equal(px(layer, 2)[3] > 0 && px(layer, 2)[3] < 255, true);
});

test('flattening keeps the lines black on top of any color', () => {
  const color = new Uint8ClampedArray([255, 0, 0, 255, 255, 0, 0, 255, 0, 0, 0, 0]);
  const lines = new Uint8ClampedArray([0, 0, 0, 0, 0, 0, 0, 255, 0, 0, 0, 0]);
  const flat = flatten(color, lines);
  assert.deepEqual(px(flat, 0), [255, 0, 0, 255]); // red stroke shows
  assert.deepEqual(px(flat, 1), [0, 0, 0, 255]);   // line stays black over red
  assert.deepEqual(px(flat, 2), [255, 255, 255, 255]); // untouched paper is white
});

test('undo pops strokes in reverse order and drops the oldest past the limit', () => {
  const stack = undoStack(2);
  stack.push('a'); stack.push('b'); stack.push('c');
  assert.equal(stack.size, 2);
  assert.equal(stack.pop(), 'c');
  assert.equal(stack.pop(), 'b');
  assert.equal(stack.pop(), null);
});

test('stroke stamps are evenly spaced and end on the finger', () => {
  const pts = stampPoints({ x: 0, y: 0 }, { x: 10, y: 0 }, 2);
  assert.equal(pts.length, 5);
  assert.deepEqual(pts.at(-1), { x: 10, y: 0 });
});
