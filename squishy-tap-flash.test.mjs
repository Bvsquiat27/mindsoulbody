import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

/* Opening a squishy put a blue square on the play screen for a moment: the
   default mobile tap highlight of the tapped shelf tile stayed painted on top
   of the play view that opens over it. */
const css = readFileSync('study-design.css', 'utf8');

function rulesFor(selector) {
  const out = [];
  const re = /([^{}]+)\{([^{}]*)\}/g;
  let m;
  while ((m = re.exec(css))) {
    const sels = m[1].replace(/\/\*[\s\S]*?\*\//g, '').split(',').map((s) => s.trim());
    if (sels.includes(selector)) out.push(m[2]);
  }
  return out;
}

test('the squishy screen and the game tiles turn off the blue tap highlight', () => {
  for (const sel of ['.squishy-screen', '.squishy-screen *', '.kg-tile']) {
    assert.ok(rulesFor(sel).some((r) => /-webkit-tap-highlight-color:\s*transparent/.test(r)), `${sel} has a transparent tap highlight`);
  }
});

test('tiles still answer a press without the highlight', () => {
  assert.ok(rulesFor('.sq-tile:active').some((r) => /transform:\s*scale\(/.test(r)));
  assert.ok(rulesFor('.kg-tile:active').some((r) => /transform:\s*scale\(/.test(r)));
});

test('the play screen markup lives inside .squishy-screen so the rule reaches it', () => {
  const js = readFileSync('squishy.js', 'utf8');
  const i = js.indexOf('<div class="squishy-screen"');
  assert.ok(i > 0);
  assert.ok(js.indexOf('data-sq-play-host', i) > i, 'play host is rendered inside the squishy screen');
  assert.match(js, /class="sq-play" data-sq-play/);
});

test('the play view is never painted blue before its first frame', () => {
  const play = rulesFor('.sq-play').join(';');
  assert.match(play, /background:radial-gradient\(/);
  assert.doesNotMatch(play, /rgb\(\s*0\s*,\s*0\s*,\s*255|#00f\b|blue/i);
  const canvas = rulesFor('.sq-canvas').join(';');
  assert.doesNotMatch(canvas, /background/, 'canvas stays transparent until the squishy is drawn');
});

test('service worker cache is bumped for the fix', () => {
  assert.match(readFileSync('sw.js', 'utf8'), /const CACHE_VERSION = 'v166'/);
});
