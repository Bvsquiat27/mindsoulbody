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

test('tablets are legendary everywhere: the room, the code trades, the worker list and the data', () => {
  assert.ok(R.LEGENDARY.includes('tablets'));
  assert.ok(require('./squishy-trade.js').LEGENDARY.includes('tablets'));
  assert.equal(C.tierOf('tablets'), 'legendary');
  const m = R.model(trade({ offers: { 'MSB-AAAAAA': ['ark'], 'MSB-BBBBBB': ['tablets'] }, want: { 'MSB-AAAAAA': 5 } }), SQUISHIES);
  assert.equal(m.theirLegend, true); assert.equal(m.short, 4);
});

test('live from the first tap: a waiting request is already a board you can change, but ✓ waits for the room', () => {
  const m = R.model(trade({ status: 'requested', offers: { 'MSB-AAAAAA': ['ark'], 'MSB-BBBBBB': [] } }), SQUISHIES);
  assert.equal(m.editable, true); assert.equal(m.open, false); assert.equal(m.canConfirm, false);
  assert.equal(R.model(trade({ status: 'done' }), SQUISHIES).editable, false);
  assert.equal(R.POLL_MS, 1500, 'live board');
});

test('the Trade tab shows the board, your squishies and every friend at once; sending carries your side', async () => {
  const s = mem();
  s.setItem('msb_squishy_unlocked', JSON.stringify(['ark', 'tablets', 'coin']));
  globalThis.window = { MsbSquishyData: { SQUISHIES }, MsbSquishyCore: C };
  globalThis.document = { hidden: false };
  const calls = [];
  const call = async (path, body) => { calls.push([path, body]); if (path === '/trade/list') return { trades: [] }; if (path === '/trade/request') return { trade: trade({ status: 'requested', offers: { 'MSB-AAAAAA': body.offer, 'MSB-BBBBBB': [] }, names: { 'MSB-BBBBBB': 'Sam' } }) }; return {}; };
  let handler = null;
  const root = { innerHTML: '', isConnected: true, addEventListener: (k, f) => { handler = f; }, removeEventListener() {}, contains: () => true, querySelector: () => null };
  const btn = sel => ({ target: { closest: () => ({ matches: q => q.split(',').some(x => x.trim() === sel.q), dataset: sel.d || {} }) } });
  R.open(root, { friends: [{ code: 'MSB-BBBBBB', name: 'Sam' }, { code: 'MSB-CCCCCC', name: 'Lee' }], ready: true, call, storage: s, lang: 'es' });
  try {
    assert.match(root.innerHTML, /Sala de intercambio/);
    assert.match(root.innerHTML, /data-sr-friend="MSB-BBBBBB"/); assert.match(root.innerHTML, /data-sr-friend="MSB-CCCCCC"/);
    assert.match(root.innerHTML, /data-sr-pick="tablets"/, 'your squishies are ready to tap');
    assert.match(root.innerHTML, /data-sr-send disabled/, 'choose a friend first');
    handler(btn({ q: '[data-sr-friend]', d: { srFriend: 'MSB-BBBBBB' } }));
    handler(btn({ q: '[data-sr-pick]', d: { srPick: 'tablets' } }));
    assert.match(root.innerHTML, /Enviar solicitud a Sam/);
    await handler(btn({ q: '[data-sr-send]' }));
    const req = calls.find(c => c[0] === '/trade/request');
    assert.deepEqual(req[1], { with: 'MSB-BBBBBB', offer: ['tablets'] });
    assert.match(root.innerHTML, /Solicitud enviada/);
    assert.ok(R._ui.timer, 'the board polls while the room shows');
  } finally { R.close(); delete globalThis.window; delete globalThis.document; }
  assert.equal(R._ui.timer, null); assert.equal(R._ui.listTimer, null);
});

test('the Trade tab and the friend profile open the room straight away', () => {
  const sq = read('./squishy.js'), aura = read('./aura.js');
  assert.match(sq, /data-sq-room/); assert.match(sq, /R\.attach\(host\)/);
  assert.match(aura, /kind==='trade-open'\)\{msbTradeLobby\(button\.dataset\.code\)/);
  assert.match(read('./kidgames.css'), /\.sr-friend\{/);
});

test('one legendary list: the room reuses squishy-trade.js, and the code screen points legendaries to the Trade Room', () => {
  assert.equal(R.LEGENDARY, require('./squishy-trade.js').LEGENDARY);
  assert.doesNotMatch(read('./squishy-room.js'), /LEGENDARY = \[/);
  for (const f of ['./squishy.js', './i18n.js']) assert.doesNotMatch(read(f), /Legendary squishies stay on your shelf|se quedan en tu estante/);
  assert.match(read('./i18n.js'), /Los códigos no pueden enviar squishies legendarios: cámbialos en la Sala de intercambio\./);
});
