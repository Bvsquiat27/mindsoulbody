import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
const require = createRequire(import.meta.url);
const C = require('./coloring-core.js');

const W = 1200, H = 675, w = 358, h = 358 * 675 / 1200;
const near = (a, b, eps = 1e-6) => assert.ok(Math.abs(a - b) < eps, `${a} != ${b}`);
const FIT = { scale: 1, tx: 0, ty: 0 };

test('at fit, a finger maps straight onto the picture', () => {
  const p = C.toPicture(w / 2, h / 2, FIT, w, h, W, H);
  near(p.x, 600); near(p.y, 337.5);
  const c = C.toPicture(w, h, FIT, w, h, W, H);
  near(c.x, W); near(c.y, H);
});

test('zooming keeps the point under the finger and strokes land on the right spot', () => {
  const cx = 100, cy = 60;
  const before = C.toPicture(cx, cy, FIT, w, h, W, H);
  const v = C.zoomAt(FIT, 2, cx, cy, w, h);
  near(v.scale, 2);
  const after = C.toPicture(cx, cy, v, w, h, W, H);
  near(after.x, before.x); near(after.y, before.y);
  // the stage corner at 2x shows the picture point under (0,0) of the zoomed content
  const corner = C.toPicture(0, 0, v, w, h, W, H);
  near(corner.x, -v.tx / 2 * W / w); near(corner.y, -v.ty / 2 * H / h);
  // a picture point drawn at 2x appears where the finger was (inverse mapping)
  const pic = C.toPicture(250, 150, v, w, h, W, H);
  near(pic.x * w / W * v.scale + v.tx, 250); near(pic.y * h / H * v.scale + v.ty, 150);
});

test('zoom stays between fit and 4x and the picture always covers the stage', () => {
  let v = FIT;
  for (let i = 0; i < 10; i += 1) v = C.zoomAt(v, 1.5, w, h, w, h);
  assert.equal(v.scale, C.MAX_ZOOM);
  assert.equal(C.MAX_ZOOM, 4);
  assert.ok(v.tx <= 0 && v.tx >= w - w * v.scale && v.ty <= 0 && v.ty >= h - h * v.scale);
  for (let i = 0; i < 10; i += 1) v = C.zoomAt(v, 1 / 1.5, 10, 10, w, h);
  assert.deepEqual(v, { scale: 1, tx: 0, ty: 0 });
  const panned = C.panView(C.zoomAt(FIT, 2, 0, 0, w, h), 999, 999, w, h);
  assert.deepEqual([panned.tx, panned.ty], [0, 0]);
  const far = C.panView(C.zoomAt(FIT, 2, 0, 0, w, h), -9999, -9999, w, h);
  near(far.tx, -w); near(far.ty, -h);
});

test('two-finger pinch zooms by the finger spread and pans with the midpoint', () => {
  const a0 = { x: 150, y: 100 }, b0 = { x: 200, y: 100 };
  const start = C.toPicture(175, 100, FIT, w, h, W, H);
  const v = C.pinchView(FIT, a0, b0, { x: 125, y: 100 }, { x: 225, y: 100 }, w, h);
  near(v.scale, 2);
  const mid = C.toPicture(175, 100, v, w, h, W, H);
  near(mid.x, start.x); near(mid.y, start.y);
  // move both fingers 30px left: the same picture point follows the midpoint
  const v2 = C.pinchView(FIT, a0, b0, { x: 95, y: 100 }, { x: 195, y: 100 }, w, h);
  const mid2 = C.toPicture(145, 100, v2, w, h, W, H);
  near(mid2.x, start.x); near(mid2.y, start.y);
  // never past 4x
  assert.equal(C.pinchView(FIT, a0, b0, { x: 0, y: 100 }, { x: 358, y: 100 }, w, h).scale, 4);
});

test('the brush feels the same size on screen at any zoom', () => {
  assert.equal(C.brushAt(22, 1), 22);
  assert.equal(C.brushAt(22, 2), 11);
  assert.equal(C.brushAt(40, 4), 10);
  assert.equal(C.brushAt(10, 4), 3);
  assert.equal(C.brushAt(10, 100), 2);
});

function memoryStorage() {
  const m = new Map();
  return { getItem: k => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, String(v)), m };
}

test('sound and vibration switches are on by default and remembered', () => {
  const store = memoryStorage();
  const p = C.prefs(store);
  assert.equal(p.get('sounds'), true);
  assert.equal(p.get('vibration'), true);
  p.set('sounds', false);
  assert.equal(store.m.get('msb_coloring_sounds'), 'off');
  assert.equal(C.prefs(store).get('sounds'), false, 'a new page load reads the saved choice');
  assert.equal(C.prefs(store).get('vibration'), true);
  p.set('sounds', true); p.set('vibration', false);
  assert.equal(C.prefs(store).get('sounds'), true);
  assert.equal(C.prefs(store).get('vibration'), false);
  const broken = C.prefs({ getItem() { throw Error('x'); }, setItem() { throw Error('x'); } });
  assert.equal(broken.get('sounds'), true);
  assert.equal(broken.set('sounds', false), false);
});

test('drawing vibration ticks are throttled and need real movement', () => {
  const g = C.tickGate(120, 6);
  assert.equal(g.move(10, 0), true);
  assert.equal(g.move(10, 50), false);
  assert.equal(g.move(10, 119), false);
  assert.equal(g.move(10, 125), true);
  assert.equal(g.move(1, 400), false, 'a resting finger does not buzz');
  assert.equal(g.move(6, 410), true);
  let n = 0;
  for (let t = 0; t <= 1200; t += 16) if (g.move(5, 1000 + t)) n += 1;
  assert.ok(n >= 8 && n <= 11, `ticks per 1.2s: ${n}`);
});

test('effects, sounds and vibration stay out of the saved picture and work offline', () => {
  const fx = readFileSync(new URL('./coloring-fx.js', import.meta.url), 'utf8');
  const col = readFileSync(new URL('./coloring.js', import.meta.url), 'utf8');
  const sw = readFileSync(new URL('./sw.js', import.meta.url), 'utf8');
  const html = readFileSync(new URL('./index.html', import.meta.url), 'utf8');
  assert.doesNotMatch(fx, /fetch\(|new Audio\(|\.mp3|\.ogg|\.wav|https?:/, 'no sound files to download');
  assert.match(fx, /typeof navigator\.vibrate === 'function'/, 'no vibrate call where the API is missing (iPhone)');
  assert.match(col, /class="coloring-fx"[^>]*aria-hidden="true"/);
  assert.doesNotMatch(col.slice(col.indexOf('function flatCanvas'), col.indexOf('function toBlob')), /fx/, 'the saved picture uses only color + lines');
  assert.match(col, /msb_tap_vibration/, 'drawing ticks respect the app tap-vibration setting');
  assert.match(col, /bedtimeOn/, 'quiet during bedtime');
  assert.match(sw, /'\.\/coloring-fx\.js'/);
  assert.ok(html.indexOf('coloring-fx.js') > html.indexOf('coloring-core.js') && html.indexOf('coloring-fx.js') < html.indexOf('coloring.js"'));
});

test('zoom, sound and vibration labels have Spanish', () => {
  const i18n = readFileSync(new URL('./i18n.js', import.meta.url), 'utf8');
  assert.match(i18n, /"Drawing sounds": "Sonidos del dibujo"/);
  for (const k of ['Zoom in', 'Zoom out', '⤢ Fit', '✋ Move', 'Drawing vibration', 'On', 'Off', 'Pinch with two fingers to zoom and move the picture. One finger colors.']) assert.ok(i18n.includes(`"${k}":`), k);
});
