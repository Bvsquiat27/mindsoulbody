/* Prayer rope: a short pulse on every knot, a double tap when a round ends,
   through the app's tap vibration setting. */
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = (p) => readFileSync(new URL(p, import.meta.url), 'utf8');
const prayers = read('./prayers.js');
const aura = read('./aura.js');

/* The haptics block at the top of aura.js, run on its own. */
function loadHaptics({ setting = null, vibrate } = {}) {
  const block = aura.slice(aura.indexOf("const HAPTIC_KEY="), aura.indexOf('function hapticControl('));
  const calls = [];
  const store = new Map(setting === null ? [] : [['msb_tap_vibration', setting]]);
  const localStorage = { getItem: (k) => (store.has(k) ? store.get(k) : null), setItem: (k, v) => store.set(k, String(v)) };
  const navigator = vibrate === undefined ? { vibrate: (p) => { calls.push(p); return true; } } : vibrate;
  const window = {};
  new Function('window', 'localStorage', 'navigator', 'performance', block)(window, localStorage, navigator, { now: () => 1000 });
  return { window, calls };
}

/* prayers.js with a fake page, so a tap on the rope button runs the real click handler. */
function loadRope({ preset = 33, count = 0, haptics } = {}) {
  const store = new Map([['msb_prayer_rope', JSON.stringify({ preset, count, day: new Date().toISOString().slice(0, 10), ropes: 0, today: 0, complete: false })]]);
  const localStorage = { getItem: (k) => (store.has(k) ? store.get(k) : null), setItem: (k, v) => store.set(k, String(v)) };
  const listeners = {};
  const document = { addEventListener: (t, fn) => { (listeners[t] = listeners[t] || []).push(fn); }, getElementById: () => null, visibilityState: 'visible' };
  const window = { MsbI18n: null, ...(haptics || {}) };
  new Function('window', 'document', 'localStorage', 'navigator', 'HTMLInputElement', prayers)(window, document, localStorage, {}, class {});
  const ropeBtn = { dataset: {}, closest: (sel) => (sel === '[data-rope-tap]' ? ropeBtn : null) };
  const tap = () => listeners.click.forEach((fn) => fn({ target: ropeBtn }));
  const state = () => JSON.parse(store.get('msb_prayer_rope'));
  return { tap, state };
}

test('every knot pulses (12-20 ms) and the end of a round is a double tap', () => {
  const kinds = [];
  const { tap, state } = loadRope({ preset: 33, count: 30, haptics: { hapticKnot: (k) => kinds.push(k) } });
  tap(); tap(); // knots 31, 32
  tap(); // knot 33 finishes the round
  assert.equal(state().complete, true);
  tap(); // knot 1 of the next round
  assert.deepEqual(kinds, ['knot', 'knot', 'round', 'knot']);
  const m = aura.match(/const HAPTIC_KNOT_MS=(\d+);/);
  assert.ok(+m[1] >= 12 && +m[1] <= 20, `knot pulse ${m[1]} ms`);
  const r = JSON.parse(aura.match(/const HAPTIC_ROUND=(\[[\d,]+\]);/)[1]);
  assert.equal(r.length, 3, 'two pulses with a gap between');
});

test('hapticKnot vibrates, follows the tap vibration setting, and has no tap-rate gap', () => {
  const on = loadHaptics();
  on.window.hapticKnot('knot'); on.window.hapticKnot('knot'); on.window.hapticKnot('round');
  assert.deepEqual(on.calls, [16, 16, [22, 70, 22]]);
  const off = loadHaptics({ setting: 'off' });
  off.window.hapticKnot('knot'); off.window.hapticKnot('round');
  assert.deepEqual(off.calls, []);
  const onExplicit = loadHaptics({ setting: 'on' });
  onExplicit.window.hapticKnot('knot');
  assert.deepEqual(onExplicit.calls, [16]);
});

test('no vibration support (iOS) or a throwing vibrate fails silently', () => {
  const none = loadHaptics({ vibrate: {} });
  assert.doesNotThrow(() => { none.window.hapticKnot('knot'); none.window.hapticKnot('round'); });
  const bad = loadHaptics({ vibrate: { vibrate() { throw new Error('blocked'); } } });
  assert.doesNotThrow(() => bad.window.hapticKnot('knot'));
  // and the rope still counts with no haptics at all, or with a helper that throws
  const bare = loadRope({ preset: 33, count: 0 });
  assert.doesNotThrow(() => bare.tap());
  assert.equal(bare.state().count, 1);
  const throwing = loadRope({ preset: 33, count: 0, haptics: { hapticKnot() { throw new Error('x'); } } });
  assert.doesNotThrow(() => throwing.tap());
  assert.equal(throwing.state().count, 1);
});

test('older app shells without hapticKnot fall back to haptic / hapticStrong', () => {
  const seen = [];
  const { tap } = loadRope({ preset: 33, count: 31, haptics: { haptic: () => seen.push('haptic'), hapticStrong: () => seen.push('strong') } });
  tap(); tap();
  assert.deepEqual(seen, ['haptic', 'strong']);
});

test('the rope button is a real button (Enter and Space advance it) and the general tap pulse skips it, so one knot is one pulse', () => {
  assert.match(prayers, /<button type="button" class="rope-tap [^"]*" data-rope-tap/);
  assert.match(aura, /if\(button\.hasAttribute\('data-rope-tap'\)\)return null;/);
  assert.equal((prayers.match(/knotPulse\(/g) || []).length, 2, 'one definition, one call in advance()');
  assert.match(prayers, /A double pulse marks a finished rope\./);
  assert.match(read('./i18n.js'), /Un pulso doble marca un cordón terminado\./);
  assert.match(aura, /window\.hapticKnot=hapticKnot;/);
});
