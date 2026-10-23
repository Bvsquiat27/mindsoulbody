/* Fixes from the Oct 22 audit. */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync, readdirSync } from 'node:fs';
import { createHash } from 'node:crypto';
import vm from 'node:vm';

const read = (p) => readFileSync(new URL(p, import.meta.url), 'utf8');
const hex = (h) => { h = h.replace('#', ''); if (h.length === 3) h = [...h].map((c) => c + c).join(''); return [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16)); };
const lum = (rgb) => { const f = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; }; const [r, g, b] = rgb.map(f); return 0.2126 * r + 0.7152 * g + 0.0722 * b; };
const ratio = (a, b) => { const x = lum(hex(a)), y = lum(hex(b)); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); };

/* The last value each theme gives a custom property, across the app's style sheets. */
function themeVars() {
  const css = read('./aura.css') + read('./study-design.css');
  const out = {};
  for (const m of css.matchAll(/:root(\[data-theme="([a-z]+)"\])?\{([^}]*)\}/g)) {
    const theme = m[2] || 'teal';
    const vars = out[theme] || (out[theme] = {});
    for (const d of m[3].matchAll(/--([a-z0-9-]+):(#[0-9a-fA-F]{3,8})\b/g)) vars[d[1]] = d[2].slice(0, 7);
  }
  for (const t of Object.keys(out)) if (t !== 'teal') out[t] = { ...out.teal, ...out[t] };
  return out;
}

test('M2: Story Order up/down buttons use theme colors and reach 4.5:1 in every theme', () => {
  const css = read('./kidgames.css');
  const rule = css.match(/\.kg-or-move\{([^}]*)\}/)[1];
  assert.match(rule, /background:var\(--surface2\)/);
  assert.match(rule, /color:var\(--text\)/);
  assert.doesNotMatch(rule, /#233438/);
  const vars = themeVars();
  for (const theme of ['light', 'sepia', 'teal', 'black', 'grey', 'navy', 'green', 'brown']) {
    const v = vars[theme];
    assert.ok(v && v.surface2 && v.text, `${theme} defines --surface2 and --text`);
    assert.ok(ratio(v.text, v.surface2) >= 4.5, `${theme}: ${v.text} on ${v.surface2} is ${ratio(v.text, v.surface2).toFixed(2)}:1`);
  }
});

test('L2: the How to play label is #7d5420 and passes 4.5:1 on the coach card', () => {
  const css = read('./kidgames.css');
  assert.match(css, /\.kg-coach-card \.eyebrow\{color:#7d5420\}/);
  for (const bg of ['#fff8e6', '#f3e2b5']) assert.ok(ratio('#7d5420', bg) >= 4.5, bg);
});

test('L1: Home hub cards use the softened card glow behind their labels', () => {
  const css = read('./study-design.css');
  assert.match(css, /\.hub-card,\.hub-card:nth-child\(2\)\{[^}]*radial-gradient\(circle at 90% 8%,var\(--card-glow\)/);
  assert.match(css, /\.hub-card:nth-child\(2\)\{background:radial-gradient\(circle at 88% 16%,var\(--card-glow\)/);
  assert.match(css, /--card-glow:color-mix\(in srgb,var\(--app-hero-glow\) 40%,transparent\)/);
});

/* Every literal status or error message aura.js shows has Spanish in i18n.js. */
function i18n() {
  const ctx = { window: {}, localStorage: { getItem: () => 'es', setItem() {} }, navigator: { language: 'es' }, document: { documentElement: { lang: '' }, title: '' }, requestAnimationFrame: () => 0, MutationObserver: class { observe() {} } };
  vm.runInNewContext(read('./i18n.js'), ctx);
  return ctx.window.MsbI18n;
}
test('M3: aura.js status and error messages all have Spanish, in tú form', () => {
  const aura = read('./aura.js'), I = i18n();
  const msgs = new Set();
  for (const m of aura.matchAll(/\b(?:toast|Error|showFormError\([a-z]+,)\(\s*'((?:[^'\\]|\\.){8,})'/g)) msgs.add(m[1].replace(/\\'/g, "'"));
  for (const m of aura.matchAll(/\|\|'((?:[^'\\]|\\.){8,})'\)/g)) msgs.add(m[1].replace(/\\'/g, "'"));
  for (const m of aura.matchAll(/toast\(([^;]{0,240}?)\)[;,}]/g)) for (const q of m[1].matchAll(/'((?:[^'\\]|\\.){8,})'/g)) msgs.add(q[1].replace(/\\'/g, "'"));
  // Not messages: internal loader errors, page text fallbacks, and lines that are already Spanish.
  const notMessages = new Set(['no notes', 'no-audio', 'APOLOGETICS', 'your friend', 'Tus amigos pueden ver tus squishies.', 'Tus squishies son privados.']);
  const english = [...msgs].filter((t) => /[A-Za-z]{3}/.test(t) && !/[áéíóúñ¿¡]/.test(t) && !t.startsWith('#') && !t.includes('MsbI18n') && !notMessages.has(t));
  assert.ok(english.length >= 80, `found ${english.length} messages`);
  const missing = english.filter((t) => I.t(t) === t);
  assert.deepEqual(missing, []);
  for (const t of english) assert.doesNotMatch(I.t(t), /\busted(es)?\b|\bIngrese\b|\bIntente\b|\bVuelva\b/, t);
  assert.equal(I.t('That password does not match this device profile.'), 'Esa contraseña no coincide con el perfil de este dispositivo.');
  assert.equal(I.t('Signed out.'), 'Sesión cerrada.');
  // form errors and screen errors go through the dictionary too
  assert.match(aura, /el\.textContent=msbTr\(message\)/);
  assert.equal((aura.match(/\$\{esc\(msbTr\(error\.message\)\)\}/g) || []).length, 2);
  assert.match(aura, /msbTr\('Bundled content is missing \(\{n\}\)\.',\{n:res\.status\}\)/);
  assert.equal(I.t('Bundled content is missing ({n}).'), 'Falta contenido de la app ({n}).');
});

test('M4: Council map and Build the response have Spanish prompts, options and explanations', () => {
  const data = JSON.parse(read('./data/study-challenges.json'));
  for (const id of ['councils', 'argument']) {
    const g = data.games.find((x) => x.id === id);
    for (const k of ['prompts', 'options', 'explanations']) {
      assert.ok(Array.isArray(g[k + 'Es']), `${id} ${k}Es`);
      assert.equal(g[k + 'Es'].length, g[k].length, `${id} ${k}Es length`);
      for (const s of g[k + 'Es']) { assert.ok(s.trim()); assert.doesNotMatch(s, /\busted(es)?\b|\bthe\b|\band\b/i); }
    }
    assert.ok(g.categoryEs && g.titleEs && g.summaryEs);
  }
  const aura = read('./aura.js');
  assert.match(aura, /item\.prompts\?\{prompts:item\.promptsEs\|\|item\.prompts,options:item\.optionsEs\|\|item\.options,explanations:item\.explanationsEs\|\|item\.explanations\}:\{\}/);
  assert.match(aura, /if\(item\.explanationsEs\)return item\.explanationsEs\[index\]\|\|'';/);
});

const luzLessons = () => { const ctx = { window: {} }; vm.runInNewContext(read('./luz-data.js'), ctx); return ctx.window.MsbLuzData.lessons; };
test('L5: Theotokos and Saints put the Scripture before the council history, in both languages', () => {
  const L = luzLessons();
  const council = { es: /año (431|787)/, en: /year (431|787)/ };
  const bible = { es: /La Biblia|Jesús responde|Hebreos 12|Isabel/, en: /The Bible|Jesus answers|Hebrews 12|Elizabeth/ };
  for (const id of ['theotokos', 'saints']) for (const g of ['es', 'en']) {
    const b = L.find((l) => l.id === id).body[g];
    const c = b.findIndex((p) => council[g].test(p)), s = b.findIndex((p) => bible[g].test(p));
    assert.ok(s >= 0 && c > s, `${id} ${g}: Scripture at ${s}, council at ${c}`);
    for (const re of [/historiadores|estudiosos|quizás|tal vez|probablemente/i, /historians|scholars|perhaps|probably|may have/i]) assert.doesNotMatch(b.join(' '), re);
  }
  const t = L.find((l) => l.id === 'theotokos');
  assert.match(t.body.es[1], /^La Biblia lo dice primero\./); assert.match(t.body.en[1], /^The Bible says it first\./);
});

test('L6: luz-data.js loads when Lessons for Luz opens, and stays precached for offline use', async () => {
  assert.equal(read('./index.html').includes('luz-data.js'), false);
  assert.match(read('./sw.js'), /'\.\/luz-data\.js'/);
  const added = [];
  const ctx = {
    window: { addEventListener() {}, scrollTo() {} },
    document: { addEventListener() {}, querySelector: () => null, head: { appendChild: (el) => added.push(el) }, createElement: () => ({ remove() {} }) },
    localStorage: { getItem: () => null, setItem() {} }, navigator: { onLine: true }, Element: class {}, CSS: { escape: (s) => s },
  };
  ctx.window.window = ctx.window;
  vm.runInNewContext(`with (window) { ${read('./luz.js')} }`, ctx);
  const luz = ctx.window.MsbLuz;
  assert.equal(luz.LESSON_COUNT, luzLessons().length);
  assert.match(luz.homeCard(), /23 preguntas sobre la fe ortodoxa/, 'Home card counts the lessons before the data loads');
  const root = { innerHTML: '', isConnected: true, querySelector: () => null };
  luz.show(root, {});
  assert.match(root.innerHTML, /Abriendo las lecciones/);
  assert.equal(added.length, 1); assert.equal(added[0].src, 'luz-data.js');
  const data = {}; vm.runInNewContext(read('./luz-data.js'), { window: data });
  ctx.window.MsbLuzData = data.MsbLuzData; added[0].onload();
  await new Promise((r) => setTimeout(r, 0));
  assert.equal((root.innerHTML.match(/data-luz-open=/g) || []).length, 23);
});

test('L7: the game packs are cache-first per service worker version, not fetched no-store', () => {
  const aura = read('./aura.js'), sw = read('./sw.js');
  assert.doesNotMatch(aura, /fetch\('data\/(study-challenges|holy-spirit)\.json',\{cache:'no-store'\}\)/);
  assert.match(sw, /const VERSIONED_DATA = \['\/data\/study-challenges\.json', '\/data\/holy-spirit\.json'[^\]]*\];/);
  assert.match(sw, /if \(isVersionedData\(url\)\) \{\n    event\.respondWith\(versionedData\(request\)\);/);
  assert.ok(sw.indexOf('if (isVersionedData(url))') < sw.indexOf('if (isStudyNotes(url) || isDataRequest(url))'));
  assert.match(sw, /const DATA_CACHE = `msb-data-\$\{CACHE_VERSION\}`;/, 'a new version brings new copies');
  assert.match(sw, /data\.addAll\(DATA_FILES\.map\(\(f\) => new Request\(f, \{ cache: 'reload' \}\)\)\)/);
  for (const f of ['study-challenges', 'holy-spirit']) assert.match(sw, new RegExp(`'\\./data/${f}\\.json'`));
});

test('L8: the Luz video thumbnail is in art-hashes.json', () => {
  const H = JSON.parse(read('./img/art-hashes.json'));
  const sum = createHash('sha256').update(readFileSync(new URL('./img/luz/luz-video-thumb.jpg', import.meta.url))).digest('hex');
  assert.equal(H['img/luz/luz-video-thumb.jpg'], sum);
});

test('L9: no personal names written out in the tests', () => {
  const names = ['S2FyZW4=', 'QW5nZWw='].map((x) => Buffer.from(x, 'base64').toString('utf8'));
  assert.doesNotMatch(read('./devotional.test.mjs'), new RegExp(names[0]));
  assert.doesNotMatch(read('./luz.test.mjs'), new RegExp(`${names[1]} asked`));
});

test('L3: achievement badges swap in painted art when it is listed, emoji until then', () => {
  const aura = read('./aura.js'), sw = read('./sw.js');
  const list = (src, re) => JSON.parse((src.match(re)[1] || '').replace(/'/g, '"') || '[]');
  const app = list(aura, /const MSB_ACH_ART=new Set\((\[[^\]]*\])\)/), cached = list(sw, /const ACH_ART = (\[[^\]]*\]);/);
  assert.deepEqual(app, cached, 'aura.js and sw.js list the same painted badges');
  const ids = [...aura.matchAll(/\{id:'([a-z0-9-]+)',icon:'/g)].map((m) => m[1]);
  assert.equal(ids.length, 21);
  const H = JSON.parse(read('./img/art-hashes.json'));
  const files = existsSync(new URL('./img/ach', import.meta.url)) ? readdirSync(new URL('./img/ach', import.meta.url)).filter((f) => f.endsWith('.webp')) : [];
  for (const id of app) { assert.ok(ids.includes(id), id); for (const px of [128, 256]) { assert.ok(files.includes(`${id}-${px}.webp`), `${id}-${px}.webp`); assert.ok(H[`img/ach/${id}-${px}.webp`]); } }
  for (const f of files) assert.ok(app.includes(f.replace(/-(128|256)\.webp$/, '')), `${f} is painted: list it in MSB_ACH_ART and ACH_ART`);
  assert.match(aura, /function msbAchIcon\(a\)\{if\(a&&MSB_ACH_ART\.has\(a\.id\)\)return msbAchArt\(a\.id\);/);
  assert.match(sw, /ach\\\/\[a-z0-9-\]\+-\(\?:128\|256\)\\\.webp/);
});
