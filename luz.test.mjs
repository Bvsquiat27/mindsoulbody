import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import vm from 'node:vm';

const read = (path) => readFileSync(new URL(path, import.meta.url), 'utf8');
const book = (translation, n) => JSON.parse(read(`./bible/${translation === 'rvr' ? 'rvr/' : ''}${String(n).padStart(2, '0')}.json`));
const verse = (translation, b, c, v) => String(book(translation, b).chapters[c - 1][v - 1]).trim();

function loadData() {
  const ctx = { window: {} };
  vm.runInNewContext(read('./luz-data.js'), ctx);
  return ctx.window.MsbLuzData;
}

function loadUi(store = {}) {
  const listeners = {};
  const ctx = {
    window: { MsbLuzData: loadData(), addEventListener() {}, scrollTo() {} },
    document: { addEventListener: (type, fn) => { listeners[type] = fn; }, querySelector: () => null },
    localStorage: { getItem: (k) => (k in store ? store[k] : null), setItem: (k, v) => { store[k] = String(v); } },
    navigator: { onLine: true },
    Element: class {},
    CSS: { escape: (s) => s },
  };
  ctx.window.window = ctx.window;
  vm.runInNewContext(`with (window) { ${read('./luz.js')} }`, ctx);
  return ctx.window.MsbLuz;
}

const REQUIRED = ['same', 'pentecost', 'tongues', 'healing', 'worship', 'relationship', 'tradition', 'saints', 'theotokos', 'icons', 'cross', 'prayer', 'baptism', 'eucharist', 'confession', 'father', 'salvation', 'catholic', 'denominations', 'gap', 'leave', 'kept'];

test('Lessons for Luz has its 22 lessons, each complete in Spanish and English', () => {
  const { lessons } = loadData();
  assert.equal(lessons.length, 22);
  assert.equal(JSON.stringify(lessons.map((l) => l.id)), JSON.stringify(REQUIRED));
  assert.equal(lessons.at(-1).id, 'kept', 'ends with why Orthodoxy kept the apostolic faith');
  for (const l of lessons) {
    for (const lang of ['es', 'en']) {
      assert.ok(l.q[lang] && l.q[lang].length > 10, `${l.id} question ${lang}`);
      assert.ok(l.short[lang] && l.short[lang].length > 20, `${l.id} short ${lang}`);
      assert.equal(/[.!?]\s+\S/.test(l.short[lang].replace(/\b(d\.C|a\.C|St)\./g, '')), false, `${l.id} short answer is one sentence (${lang})`);
      assert.ok(l.body[lang].length >= 4, `${l.id} body ${lang}`);
      for (const p of l.body[lang]) assert.ok(p.trim().length > 0 && p.length < 700, `${l.id} short paragraphs (${lang})`);
    }
    assert.equal(l.body.es.length, l.body.en.length, `${l.id} same paragraph count in both languages`);
    if (l.father) for (const lang of ['es', 'en']) assert.ok(l.father[lang] && l.father.who[lang], `${l.id} father ${lang}`);
  }
});

test('every Luz verse matches the app Bible word for word (RV1909 and KJV)', () => {
  const { lessons } = loadData();
  for (const l of lessons) {
    assert.ok(l.verses.length >= 1 && l.verses.length <= 4, `${l.id} verse count`);
    for (const v of l.verses) {
      assert.ok(v.book >= 1 && v.book <= 66, `${l.id} canonical book`);
      assert.equal(v.text.es, v.verses.map((n) => verse('rvr', v.book, v.chapter, n)).join(' '), `${l.id} ${v.ref.es}`);
      assert.equal(v.text.en, v.verses.map((n) => verse('kjv', v.book, v.chapter, n)).join(' '), `${l.id} ${v.ref.en}`);
      assert.match(v.ref.es, new RegExp(`${v.chapter === 1 && v.book === 65 ? '3' : `${v.chapter}:${v.verses[0]}`}`));
    }
  }
  const saints = lessons.find((l) => l.id === 'saints');
  const refs = saints.verses.map((v) => v.ref.en);
  for (const r of ['Hebrews 12:1', 'Revelation 5:8', 'James 5:16', 'Luke 20:38']) assert.ok(refs.includes(r), r);
  const kept = lessons.find((l) => l.id === 'kept').verses.map((v) => v.ref.en);
  for (const r of ['Jude 3', '2 Thessalonians 2:15', '1 Timothy 3:15']) assert.ok(kept.includes(r), r);
});

test('required teaching is present in both languages', () => {
  const { lessons } = loadData();
  const text = (id, lang) => { const l = lessons.find((x) => x.id === id); return [l.q[lang], l.short[lang], ...l.body[lang]].join(' '); };
  assert.match(text('saints', 'es'), /Latreía/); assert.match(text('saints', 'es'), /Dulía/);
  assert.match(text('saints', 'en'), /Latreia/); assert.match(text('saints', 'en'), /Dulia/);
  assert.match(text('saints', 'es'), /Dios no es Dios de muertos, mas de vivos/);
  for (const lang of ['es', 'en']) {
    const c = text('catholic', lang);
    for (const re of [/1054/, /[Ff]ilioque/, /1870/, /purgatorio|[Pp]urgatory/, /indulgencias|indulgences/]) assert.match(c, re, `${lang} ${re}`);
    assert.match(text('pentecost', lang), /Pentecost/);
    assert.match(text('denominations', lang), /1517/);
    assert.match(text('same', lang), /Nueva Vida/);
    assert.match(text('gap', lang), /Nueva Vida|your church|tu iglesia/);
  }
});

test('the same/gap lessons quote Nueva Vida’s own published statements', () => {
  const { lessons } = loadData();
  const same = lessons.find((l) => l.id === 'same').body.es.join(' ');
  assert.ok(same.includes('En la unidad de la Deidad hay tres Personas eternamente co-existentes y co-iguales: Padre, Hijo y Espíritu Santo.'));
  assert.ok(same.includes('La sanidad divina es parte integrante del evangelio'));
  const gap = lessons.find((l) => l.id === 'gap').body.es.join(' ');
  assert.ok(gap.includes('la Biblia, solo la Biblia y toda la Biblia, en sus 66 libros'));
  assert.ok(gap.includes('La iglesia no es una institución o denominación religiosa'));
  const ui = read('./luz.js');
  assert.match(ui, /https:\/\/nvny\.org\/creemos-en-un-solo-dios\//);
  assert.match(ui, /https:\/\/ag\.org\/Beliefs\/Statement-of-Fundamental-Truths/);
});

test('Pentecostal beliefs are addressed as common Pentecostal teaching, not as Nueva Vida doctrine', () => {
  const { lessons } = loadData();
  const get = (id) => lessons.find((x) => x.id === id);
  const all = (id, lang) => { const l = get(id); return [l.q[lang], l.short[lang], ...l.body[lang]].join(' '); };
  for (const lang of ['es', 'en']) {
    const gap = all('gap', lang);
    for (const re of lang === 'es'
      ? [/segunda experiencia/, /lenguas/, /inmersión/, /rapto/, /única autoridad/, /espontáneo/, /pentecostales/]
      : [/second experience/, /tongues/, /immersion/, /rapture/, /only authority/, /spontaneous/, /Pentecostals/]) assert.match(gap, re, `gap ${lang} ${re}`);
    const same = all('same', lang);
    for (const re of lang === 'es' ? [/pentecostal trinitaria/, /profecía/, /santidad/, /Nueva Vida/] : [/Trinitarian Pentecostal/, /prophecy/, /holiness/, /Nueva Vida/]) assert.match(same, re, `same ${lang} ${re}`);
    assert.match(all('tongues', lang), lang === 'es' ? /crismación/ : /chrismation/);
    assert.match(all('tongues', lang), lang === 'es' ? /Pentecostés personal/ : /personal Pentecost/);
    assert.match(all('healing', lang), lang === 'es' ? /Santa Unción/ : /Holy Unction/);
    assert.match(all('worship', lang), lang === 'es' ? /gozo/ : /joy/);
    // Nueva Vida's site never mentions tongues or Spirit baptism: never attribute them to it.
    for (const l of lessons) for (const p of l.body[lang]) {
      if (/Nueva Vida/.test(p) && (lang === 'es' ? /lenguas|bautismo en el Espíritu/ : /tongues|baptism in the (Holy )?Spirit/).test(p)) {
        assert.match(p, lang === 'es' ? /no menciona/ : /does not mention/, `${l.id}: ${p.slice(0, 80)}`);
      }
    }
  }
  const refs = (id) => get(id).verses.map((v) => v.ref.en);
  assert.ok(refs('tongues').includes('Acts 8:14–17') && refs('tongues').includes('Acts 19:6'));
  assert.equal(JSON.stringify(get('tongues').verses[0].verses), JSON.stringify([14, 15, 16, 17]));
  assert.ok(refs('healing').some((r) => r.startsWith('James 5:14')));
});

test('the section opens in Spanish by default, with large text and an English switch', () => {
  const store = {};
  const luz = loadUi(store);
  const root = { innerHTML: '', isConnected: true, querySelector: () => null };
  luz.show(root, { lesson: null });
  assert.match(root.innerHTML, /data-i18n-skip lang="es"/);
  assert.match(root.innerHTML, /Lecciones para Luz/);
  assert.match(root.innerHTML, /--luz-size:21px/);
  assert.equal((root.innerHTML.match(/data-luz-open=/g) || []).length, 22);
  assert.match(root.innerHTML, /data-luz-size="1"/);
  luz.show(root, { lesson: 'saints' });
  assert.match(root.innerHTML, /RESPUESTA CORTA/);
  assert.match(root.innerHTML, /data-luz-read/);
  assert.match(root.innerHTML, /data-speech-pause/);
  assert.match(root.innerHTML, /\(RV1909\)/);
  store.msb_luz_lang = 'en';
  store.msb_luz_size = '3';
  luz.show(root, { lesson: 'saints' });
  assert.match(root.innerHTML, /lang="en"/);
  assert.match(root.innerHTML, /SHORT ANSWER/);
  assert.match(root.innerHTML, /\(KJV\)/);
  assert.match(root.innerHTML, /--luz-size:28px/);
  assert.match(luz.homeCard(), /data-nav="luz"/);
  assert.match(luz.homeCard(), /Lecciones para Luz/);
});

test('video: nocookie embed loads on tap, plays inline from the start, local thumbnail, YouTube fallback', () => {
  const luz = loadUi();
  assert.equal(luz.VIDEO.embed, 'https://www.youtube-nocookie.com/embed/DeBUvb2ul5A?playsinline=1&autoplay=1&rel=0');
  assert.doesNotMatch(luz.VIDEO.embed, /start=|[?&]t=/);
  assert.equal(luz.VIDEO.watch, 'https://www.youtube.com/watch?v=DeBUvb2ul5A');
  assert.equal(luz.VIDEO.channel, 'Luz Ortodoxa');
  assert.ok(existsSync(new URL('./img/luz/luz-video-thumb.jpg', import.meta.url)));
  const root = { innerHTML: '', isConnected: true, querySelector: () => null };
  luz.show(root, { lesson: null });
  assert.match(root.innerHTML, /src="img\/luz\/luz-video-thumb\.jpg"/);
  assert.doesNotMatch(root.innerHTML, /<iframe/, 'no iframe until tapped');
  assert.match(root.innerHTML, /Abrir en YouTube/);
  assert.match(root.innerHTML, /necesita internet/);
  assert.match(read('./luz.js'), /needs the internet/);
});

test('CSP allows only the YouTube nocookie frame, nothing else loosened', () => {
  const html = read('./index.html');
  const csp = html.match(/Content-Security-Policy" content="([^"]+)"/)[1];
  assert.match(csp, /frame-src https:\/\/www\.youtube-nocookie\.com;/);
  const without = csp.replace(' frame-src https://www.youtube-nocookie.com;', '');
  assert.equal(without, "default-src 'self'; script-src 'self' 'sha256-5jlX9GTmdBDmDU0eq66Ixcj4TAXydkWG524iS4oZdHU='; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data: blob:; connect-src 'self' https://mindsoulbody-api.hearthandhope.workers.dev https://orthocal.info; media-src 'self'; worker-src 'self'; manifest-src 'self'; base-uri 'self'; form-action 'self'");
});

test('Luz is wired into Home, the router, and the offline shell', () => {
  const html = read('./index.html');
  assert.ok(html.includes('<script src="luz-data.js" defer></script><script src="luz.js" defer></script>'));
  assert.ok(html.includes('<link rel="stylesheet" href="luz.css">'));
  const aura = read('./aura.js');
  assert.ok(aura.includes("else if(state.screen==='luz'&&window.MsbLuz)MsbLuz.show(screen);"));
  assert.ok(aura.includes("if(state.screen==='luz'&&name!=='luz'&&window.MsbLuz)MsbLuz.hide();"));
  assert.equal((aura.match(/MsbLuz\.homeCard\(\)/g) || []).length, 2, 'card on both Home screens');
  const sw = read('./sw.js');
  assert.match(sw, /const CACHE_VERSION = 'v156'/);
  for (const f of ['./luz-data.js', './luz.js', './luz.css', './img/luz/luz-video-thumb.jpg']) assert.ok(sw.includes(`'${f}'`), f);
  assert.match(sw, /if \(url\.origin !== self\.location\.origin\) return;/, 'cross-origin (YouTube frame) requests are never cached');
  assert.equal(sw.includes('youtube'), false);
});

test('Luz files carry no emoji', () => {
  const emoji = /[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/u;
  for (const f of ['./luz.js', './luz-data.js', './luz.css']) assert.equal(emoji.test(read(f)), false, f);
});
