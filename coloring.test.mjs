import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { lineLayer, flatten, undoStack, stampPoints, sparkleStroke, paintOps, GLITTER } = require('./coloring-core.js');

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

const W = 120, H = 40, SIZE = 10;
const drawSparkle = (glitter, seed, buffer = new Uint8ClampedArray(W * H * 4)) => {
  const pen = sparkleStroke(glitter, SIZE, seed);
  const ops = [];
  for (let x = 12; x <= 108; x += 6) ops.push(...pen.add({ x, y: 20 }));
  ops.push(...pen.end());
  paintOps(buffer, W, H, ops, SIZE);
  return { buffer, ops };
};
const brightness = (b, i) => b[i * 4] + b[i * 4 + 1] + b[i * 4 + 2];

test('a gold sparkle stroke paints glitter ink with brighter specks on top', () => {
  const { buffer, ops } = drawSparkle('gold', 11);
  const tips = ops.filter(op => op.t === 'tip'), specks = ops.filter(op => op.t === 'speck');
  assert.ok(tips.length > 10 && specks.length > 3);
  assert.ok(tips.every(op => op.hex === GLITTER.gold[0]));
  // every speck is drawn after the ink stamps that would cover it
  const lastTip = ops.map(op => op.t).lastIndexOf('tip');
  for (const speck of specks.filter(op => ops.indexOf(op) < lastTip)) {
    const later = ops.slice(ops.indexOf(speck)).filter(op => op.t === 'tip');
    assert.ok(later.every(tip => Math.hypot(tip.x - speck.x, tip.y - speck.y) > SIZE - 1), 'ink stamped over a speck');
  }
  const painted = [];
  for (let i = 0; i < W * H; i += 1) if (buffer[i * 4 + 3] > 0) painted.push(i);
  assert.ok(painted.length > 400);
  const hex = GLITTER.gold[0];
  const ink = parseInt(hex.slice(1, 3), 16) + parseInt(hex.slice(3, 5), 16) + parseInt(hex.slice(5, 7), 16);
  const brightest = Math.max(...painted.map(i => brightness(buffer, i)));
  assert.ok(brightest > ink + 60, 'specks should be brighter than the ink');
});

test('sparkle strokes are deterministic and rainbow changes hue along the stroke', () => {
  assert.deepEqual(drawSparkle('pink', 5).ops, drawSparkle('pink', 5).ops);
  assert.notDeepEqual(drawSparkle('pink', 5).ops, drawSparkle('pink', 6).ops);
  const hues = new Set(drawSparkle('rainbow', 3).ops.filter(op => op.t === 'tip').map(op => op.hex));
  assert.ok(hues.size >= 3, `rainbow used ${hues.size} hues`);
});

test('undo restores the page from before a sparkle stroke', () => {
  const stack = undoStack(20);
  const page = new Uint8ClampedArray(W * H * 4);
  stack.push(page.slice());
  drawSparkle('rainbow', 9, page);
  assert.ok(page.some((v, i) => i % 4 === 3 && v > 0));
  page.set(stack.pop());
  assert.ok(page.every(v => v === 0));
});

test('the eraser removes glitter, and the outlines stay on top of it', () => {
  const { buffer } = drawSparkle('silver', 4);
  const lines = new Uint8ClampedArray(W * H * 4);
  const onLine = 20 * W + 60;
  lines[onLine * 4 + 3] = 255; // a black outline pixel inside the stroke
  assert.deepEqual(px(flatten(buffer, lines), onLine), [0, 0, 0, 255]);
  const eraser = [];
  for (let x = 0; x <= W; x += 3) eraser.push({ t: 'erase', x, y: 20 });
  paintOps(buffer, W, H, eraser, SIZE * 2);
  assert.ok(buffer.every((v, i) => i % 4 !== 3 || v === 0), 'glitter left behind after erasing');
  assert.deepEqual(px(flatten(buffer, lines), onLine), [0, 0, 0, 255]);
  assert.deepEqual(px(flatten(buffer, lines), 20 * W + 30), [255, 255, 255, 255]);
});
