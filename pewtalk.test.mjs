/* Pew Talk: original cards in English and Spanish with exact KJV / RV1909
   verses, wired into Games, offline shell, and online play hidden until the
   worker answers /pew/hello. */
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

test('about 60 original cards, each with English, Spanish and a category', () => {
  const { window } = load();
  const { cards, categories } = window.MsbPewTalkData;
  assert.ok(cards.length >= 55 && cards.length <= 80, `${cards.length} cards`);
  assert.equal(new Set(cards.map((c) => c.id)).size, cards.length);
  for (const c of cards) {
    assert.ok(categories[c.cat], c.id);
    assert.match(c.en, /\?$/, c.id); assert.match(c.es, /¿[^?]+\?$/, c.id);
    assert.doesNotMatch(c.es, /\busted(es)?\b/i, `${c.id} uses tú`);
  }
  for (const cat of Object.keys(categories)) assert.ok(cards.filter((c) => c.cat === cat).length >= 8, cat);
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
  const fam = buildDeck('home');
  assert.ok(fam.every((id) => ctx.window.MsbPewTalkData.cards.find((c) => c.id === id).cat === 'home'));
  ctx.localStorage.setItem('msb_pew_seen', JSON.stringify([fam[0]]));
  assert.notEqual(buildDeck('home')[0], fam[0]);
  assert.equal(buildDeck('home').at(-1), fam[0]);
});

test('wired into Games, the router, the offline shell, and online waits for the worker', () => {
  const aura = read('./aura.js'), sw = read('./sw.js'), ui = read('./pewtalk.js'), html = appHtml();
  assert.match(aura, /data-nav="pew"/);
  assert.match(aura, /const MSB_PEW_TALK_LIVE=false;/, 'hidden from Games until the worker is live');
  assert.match(aura, /if\(MSB_PEW_TALK_LIVE&&/);
  assert.match(aura, /state\.screen==='pew'\)MsbPewTalk\.show/);
  assert.match(aura, /MSB_DEFERRED_SCREENS=\['trivia','show','pew'/);
  assert.ok(html.indexOf('pewtalk-data.js') < html.indexOf('pewtalk.js"'));
  for (const f of ['pewtalk-data.js', 'pewtalk.js']) assert.ok(sw.includes(`'./${f}'`), f);
  assert.match(ui, /msbFriendsCall\('\/pew\/hello'/);
  assert.match(ui, /COMING SOON/);
  assert.match(ui, /MUY PRONTO/);
});
