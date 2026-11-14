/* Pew Talk: original cards in English and Spanish with exact KJV / RV1909
   verses, wired into Games and the offline shell. Online only; it shows as
   coming soon until the worker answers /pew/hello. */
import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import { appHtml } from './app-scripts.test-helper.mjs';
const read = (f) => readFileSync(new URL(f, import.meta.url), 'utf8');
function load() {
  const store = new Map();
  const ctx = { window: {}, document: { addEventListener() {} }, localStorage: { getItem: (k) => store.get(k) ?? null, setItem: (k, v) => store.set(k, String(v)) }, setTimeout, clearInterval, setInterval };
  vm.runInNewContext(read('./pewtalk-data.js'), ctx);
  ctx.MsbPewTalkData = ctx.window.MsbPewTalkData;
  vm.runInNewContext(read('./pewtalk.js'), ctx);
  return ctx;
}

test('about 80 original cards, each with English, Spanish and a category', () => {
  const { window } = load();
  const { cards, categories } = window.MsbPewTalkData;
  assert.ok(cards.length >= 70 && cards.length <= 95, `${cards.length} cards`);
  assert.equal(new Set(cards.map((c) => c.id)).size, cards.length);
  for (const c of cards) {
    assert.ok(categories[c.cat], c.id);
    assert.match(c.en, /\?$/, c.id); assert.match(c.es, /¿[^?]+\?$/, c.id);
    assert.doesNotMatch(c.es, /\busted(es)?\b/i, `${c.id} uses tú`);
  }
  for (const cat of Object.keys(categories)) assert.ok(cards.filter((c) => c.cat === cat).length >= 8, cat);
});

test('the deck is built around "Is it okay for Christians to..." questions, including Angel\'s own five', () => {
  const { window } = load();
  const cards = window.MsbPewTalkData.cards;
  for (const q of ['Is it okay for Christians to stay friends with an ex while married?', 'Is it okay for Christians to wear whatever they want to church because God looks at the heart?', 'Is it okay for Christians to sign a prenuptial agreement?', 'Is it ever okay for Christians to bend the truth on taxes or timesheets?', 'Is it okay for Christians to listen to secular music that contains sexual or explicit lyrics?']) assert.ok(cards.some((c) => c.en === q), q);
  const light = cards.filter((c) => !/\b(Christians?|Christian (couples?|parents|families|husband|couple)|pastors)\b/.test(c.en));
  assert.ok(light.length <= 10, `${light.length} lighter cards`);
  assert.deepEqual(Object.keys(window.MsbPewTalkData.categories), ['dating', 'family', 'church', 'money', 'culture']);
});

test('cards speak to Christians of every tradition, with nothing tied to one church', () => {
  const { window } = load();
  const text = window.MsbPewTalkData.cards.map((c) => `${c.en} ${c.es}`).join(' ');
  for (const w of ['icon', 'ícono', 'Pascha', 'Lent', 'Cuaresma', 'homily', 'homilía', 'prayer rope', 'cordón', 'name day', 'Many Years', 'chant', 'sign of the cross', 'persign', 'shrimp', 'blessed bread', 'pan bendito']) assert.equal(text.toLowerCase().includes(w.toLowerCase()), false, w);
  assert.equal(window.MsbPewTalkData.categories.feast, undefined);
});

test('nothing is lifted from the retail game: its name and answer cards are not used', () => {
  const all = ['./pewtalk.js', './pewtalk-data.js', './scripts/pew-talk-cards.mjs'].map(read).join('\n').toLowerCase();
  for (const phrase of ['let the church say', 'i rebuke that', 'i convert', 'pray about it when']) assert.equal(all.includes(phrase), false, phrase);
});

test('every linked verse is word for word from the app KJV and RV1909', () => {
  const { window } = load();
  const pad = (n) => String(n).padStart(2, '0');
  for (const c of window.MsbPewTalkData.cards) {
    const { book, chapter, verse } = c.ref;
    assert.equal(c.ref.textEn, JSON.parse(read(`./bible/${pad(book)}.json`)).chapters[chapter - 1][verse - 1].trim(), c.id);
    assert.equal(c.ref.textEs, JSON.parse(read(`./bible/rvr/${pad(book)}.json`)).chapters[chapter - 1][verse - 1].trim(), c.id);
  }
});

test('three answers in both languages, and no emoji in the game files', () => {
  const { window } = load();
  assert.deepEqual([...window.MsbPewTalk.ANSWERS.map((a) => a.id)], ['amen', 'mercy', 'pray']);
  assert.deepEqual([...window.MsbPewTalk.ANSWERS.map((a) => a.en)], ['Amen', 'Lord, have mercy', 'Let me pray on it']);
  assert.deepEqual([...window.MsbPewTalk.ANSWERS.map((a) => a.es)], ['Amén', 'Señor, ten piedad', 'Lo voy a orar']);
  const emoji = /[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/u;
  for (const f of ['./pewtalk.js', './pewtalk-data.js']) assert.equal(emoji.test(read(f)), false, f);
});

test('decks deal unseen cards first and can be narrowed to one category', () => {
  const ctx = load();
  const { buildDeck } = ctx.window.MsbPewTalk._test;
  const all = buildDeck('all');
  assert.equal(all.length, ctx.window.MsbPewTalkData.cards.length);
  const fam = buildDeck('family');
  assert.ok(fam.every((id) => ctx.window.MsbPewTalkData.cards.find((c) => c.id === id).cat === 'family'));
  ctx.localStorage.setItem('msb_pew_seen', JSON.stringify([fam[0]]));
  assert.notEqual(buildDeck('family')[0], fam[0]);
  assert.equal(buildDeck('family').at(-1), fam[0]);
});

test('wired into Games, the router, the offline shell, and online waits for the worker', () => {
  const aura = read('./aura.js'), sw = read('./sw.js'), ui = read('./pewtalk.js'), html = appHtml();
  assert.match(aura, /data-nav="pew"/);
  assert.match(aura, /const MSB_PEW_TALK_LIVE=true;/, 'shown in Games once this branch ships with the worker');
  assert.match(aura, /if\(MSB_PEW_TALK_LIVE&&/);
  assert.match(aura, /state\.screen==='pew'\)MsbPewTalk\.show/);
  assert.match(aura, /MSB_DEFERRED_SCREENS=\['trivia','show','pew'/);
  assert.ok(html.indexOf('pewtalk-data.js') < html.indexOf('pewtalk.js"'));
  for (const f of ['pewtalk-data.js', 'pewtalk.js']) assert.ok(sw.includes(`'./${f}'`), f);
  assert.match(ui, /msbFriendsCall\('\/pew\/hello'/);
  assert.match(ui, /Rooms are not open right now/);
  assert.match(ui, /Las salas no están abiertas ahora/);
});

test('online only: no pass-the-phone mode, a round timer, and the countdown follows the server', () => {
  const ui = read('./pewtalk.js');
  assert.doesNotMatch(ui, /local-setup|local-vote|Pass the phone|Pasa el teléfono/);
  assert.match(ui, /timer: S\.timer/);
  assert.match(ui, /st\.msLeft != null \? Date\.now\(\) \+ st\.msLeft/);
  assert.match(ui, /'\/pew\/state'/);
});

test('a phone the room lost joins again, and a lost vote is sent again', async () => {
  const store = new Map(), intervals = [], calls = [];
  let clickHandler = null;
  const room = (over) => ({ room: 'ABCDE', host: 'MSB-HOST', status: 'waiting', round: 0, phase: 'vote', total: 3, card: null, deck: [], timer: 0, msLeft: null, players: [{ code: 'MSB-HOST', name: 'Host', answered: false, answer: null }, { code: 'MSB-ME', name: 'Me', answered: false, answer: null }], ...over });
  let stateReply = () => { const e = Error('You are not in that room'); e.status = 403; throw e; };
  const api = async (path, body) => {
    calls.push([path, body]);
    if (path === '/pew/join') return room();
    if (path === '/pew/state') return stateReply();
    if (path === '/pew/vote') return room({ status: 'active', card: window.MsbPewTalkData.cards[0].id, players: [{ code: 'MSB-HOST', name: 'Host', answered: false }, { code: 'MSB-ME', name: 'Me', answered: true }] });
    return { ok: true };
  };
  const ctx = { window: {}, document: { addEventListener(type, fn) { if (type === 'click') clickHandler = fn; } }, localStorage: { getItem: (k) => store.get(k) ?? null, setItem: (k, v) => store.set(k, String(v)) }, setTimeout, clearInterval() {}, setInterval(fn) { intervals.push(fn); return intervals.length; } };
  ctx.msbFriendsId = ctx.window.msbFriendsId = () => ({ code: 'MSB-ME', secret: 's' });
  ctx.msbFriendsCall = ctx.window.msbFriendsCall = api;
  vm.runInNewContext(read('./pewtalk-data.js'), ctx);
  ctx.MsbPewTalkData = ctx.window.MsbPewTalkData;
  const window = ctx.window;
  vm.runInNewContext(read('./pewtalk.js'), ctx);
  const root = { innerHTML: '', querySelector: () => null, contains: () => true };
  const P = window.MsbPewTalk;
  P._test.setOnline(true); P.show(root, {});
  const tap = async (dataset) => { clickHandler({ target: { closest: () => ({ dataset, disabled: false }) } }); await new Promise((r) => setTimeout(r, 0)); };
  await tap({ pew: 'join', room: 'ABCDE' });
  assert.equal(calls.filter(([p]) => p === '/pew/join').length, 1);
  await intervals.at(-2)(); await new Promise((r) => setTimeout(r, 0));
  assert.equal(calls.filter(([p]) => p === '/pew/join').length, 2, 'a 403 from /pew/state joins the room again');
  assert.equal(P._test.S.view, 'online'); assert.ok(!P._test.S.gone);
  stateReply = () => room({ status: 'active', card: window.MsbPewTalkData.cards[0].id });
  await intervals.at(-2)(); await new Promise((r) => setTimeout(r, 0));
  await tap({ pew: 'vote', answer: 'pray' });
  assert.equal(calls.filter(([p]) => p === '/pew/vote').length, 1);
  await intervals.at(-2)(); await new Promise((r) => setTimeout(r, 0));
  const votes = calls.filter(([p]) => p === '/pew/vote');
  assert.equal(votes.length, 2, 'the room forgot the vote, so it is sent again');
  assert.equal(votes[1][1].answer, 'pray');
});

test('solo play works with no room and no server: pick, reflection with the verse, next, and a tally', async () => {
  const store = new Map(); let clickHandler = null; const calls = [];
  const ctx = { window: {}, document: { addEventListener(type, fn) { if (type === 'click') clickHandler = fn; } }, localStorage: { getItem: (k) => store.get(k) ?? null, setItem: (k, v) => store.set(k, String(v)) }, setTimeout, clearInterval() {}, setInterval() { return 1; } };
  ctx.msbFriendsCall = ctx.window.msbFriendsCall = async (path) => { calls.push(path); throw Error('offline'); };
  vm.runInNewContext(read('./pewtalk-data.js'), ctx);
  ctx.MsbPewTalkData = ctx.window.MsbPewTalkData;
  vm.runInNewContext(read('./pewtalk.js'), ctx);
  const P = ctx.window.MsbPewTalk;
  const root = { innerHTML: '', querySelector: () => null, contains: () => true };
  P._test.setOnline(false); P.show(root, {});
  assert.match(root.innerHTML, /data-pew="solo"/, 'Play solo shows even when rooms are offline');
  assert.match(root.innerHTML, /Play solo/);
  const tap = (dataset) => clickHandler({ target: { closest: () => ({ dataset, disabled: false }) } });
  tap({ pew: 'cat', cat: 'money' }); tap({ pew: 'solo' });
  const S = () => P._test.S;
  assert.equal(S().view, 'solo'); assert.equal(S().deck.length, 16);
  assert.match(root.innerHTML, /data-pew="solo-pick"/);
  const first = S().deck[0];
  tap({ pew: 'solo-pick', answer: 'mercy' });
  assert.match(root.innerHTML, /You said Lord, have mercy/);
  assert.match(root.innerHTML, /<details class="pew-verse" open>/);
  assert.match(root.innerHTML, /data-pew="solo-next"/);
  tap({ pew: 'solo-pick', answer: 'amen' });
  assert.deepEqual({ ...S().picks }, { amen: 0, mercy: 1, pray: 0 }, 'one pick per card');
  tap({ pew: 'solo-next' });
  assert.notEqual(S().deck[S().i], first);
  tap({ pew: 'solo-pick', answer: 'pray' }); tap({ pew: 'solo-end' });
  assert.match(root.innerHTML, /Your tally/);
  assert.match(root.innerHTML, /You answered 2 cards/);
  assert.match(root.innerHTML, /Prove all things; hold fast that which is good/);
  assert.equal(calls.filter((p) => p !== '/pew/hello').length, 0, 'solo never calls the server');
});
