import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
const require = createRequire(import.meta.url);
const { SQUISHIES } = require('./squishy-data.js');
const C = require('./squishy-core.js');
const R = require('./squishy-room.js');
const read = f => readFileSync(new URL(f, import.meta.url), 'utf8');
function mem() { const m = new Map(); return { getItem: k => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, String(v)), m }; }
const trade = (o = {}) => ({ id: 'a'.repeat(16), me: 'MSB-AAAAAA', other: 'MSB-BBBBBB', from: 'MSB-AAAAAA', to: 'MSB-BBBBBB', status: 'open', rev: 3, offers: { 'MSB-AAAAAA': [], 'MSB-BBBBBB': [] }, need: {}, checks: {}, want: {}, ready: false, ...o });

test('a legendary on the board asks for at least 5 back; the board shows how many are missing', () => {
  const m = R.model(trade({ offers: { 'MSB-AAAAAA': ['ark', 'key'], 'MSB-BBBBBB': ['tomb'] }, want: { 'MSB-AAAAAA': 5, 'MSB-BBBBBB': 0 } }), SQUISHIES);
  assert.equal(m.theirLegend, true);
  assert.equal(m.short, 3);
  assert.equal(m.canConfirm, false, 'not ready yet');
  assert.equal(R.LEGEND_MIN, 5);
});

test('both checks must be on the same board: a check from an older revision does not count', () => {
  const t = trade({ offers: { 'MSB-AAAAAA': ['ark'], 'MSB-BBBBBB': ['key'] }, ready: true, checks: { 'MSB-AAAAAA': 2, 'MSB-BBBBBB': 3 } });
  const m = R.model(t, SQUISHIES);
  assert.equal(m.myCheck, false, 'my ✓ was for revision 2: the board changed, it is cleared');
  assert.equal(m.theirCheck, true);
  assert.equal(m.canConfirm, true);
  assert.equal(R.model({ ...t, status: 'done' }, SQUISHIES).over, true);
});

test('only squishies you have can go on the board: never starters, never the lamp', () => {
  const s = mem();
  s.setItem('msb_squishy_unlocked', JSON.stringify(['ark', 'lamp', 'tomb']));
  const ids = R.tradableMine(s, SQUISHIES, C);
  assert.ok(ids.includes('ark') && ids.includes('tomb'));
  assert.ok(!ids.includes('lamp'));
  assert.ok(!ids.some(id => ['lamb', 'dove', 'fish', 'lion', 'star', 'rainbow'].includes(id)));
});

test('the Friends list shows open requests and rooms in EN and ES', () => {
  const list = [trade({ status: 'requested', from: 'MSB-BBBBBB', to: 'MSB-AAAAAA', names: { 'MSB-BBBBBB': 'Sam' } }), trade({ status: 'done' })];
  const es = R.listHtml(list, 'es');
  assert.match(es, /Sam quiere cambiar squishies/);
  assert.match(es, /data-action="trade-resume"/);
  assert.equal((es.match(/<li>/g) || []).length, 1, 'finished trades are not listed');
  assert.match(R.listHtml([], 'en'), /No trades right now/);
});

test('the board polls only while it is open and visible, and is wired into the app', () => {
  const src = read('./squishy-room.js'), aura = read('./aura.js');
  assert.match(src, /document\.hidden\) return/);
  assert.match(src, /!ui\.root\.isConnected\) \{ close\(\); return; \}/);
  assert.match(src, /Sala de intercambio/);
  assert.match(src, /La lámpara nunca se cambia/);
  assert.ok(read('./index.html').includes('<script src="squishy-room.js" defer></script>'));
  assert.ok(read('./sw.js').includes("'./squishy-room.js'"));
  assert.match(aura, /data-action="trade-open"/);
  assert.match(aura, /kind==='trade-resume'/);
  assert.match(aura, /failure\.data=data/);
  assert.match(aura, /msb_squishy_celebrate/, 'squishies won in a trade get their celebration');
  assert.match(read('./kidgames.css'), /prefers-reduced-motion:reduce\)\{\.sr-board/);
});
