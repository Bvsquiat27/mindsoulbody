import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
const require = createRequire(import.meta.url);
const RS = require('./reading-share.js');
const read = f => readFileSync(new URL(f, import.meta.url), 'utf8');
const mem = () => { const m = new Map(); return { getItem: k => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, String(v)) }; };

test('sharing is off by default and remembered when turned on', () => {
  const s = mem(), p = RS.pref(s);
  assert.equal(p.get(), false);
  assert.equal(p.set(true), true); assert.equal(p.get(), true);
  p.set(false); assert.equal(p.get(), false);
  assert.ok(RS.KEY.startsWith('msb_'));
});

test('the snapshot is the last Bible chapter, the next unfinished study and studies done', () => {
  const studies = [{ id: 'one', title: 'First' }, { id: 'two', title: 'Second' }, { id: 'three', title: 'Third' }];
  const r = RS.snapshot({ place: '43:3', studies, progress: [{ study_id: 'one', completed_at: 5 }, { study_id: 'two' }], now: 1000 });
  assert.deepEqual(r, { book: 43, chapter: 3, study: 'two', studyTitle: 'Second', done: 1, total: 3, at: 1000 });
  assert.equal(RS.snapshot({ place: '', studies: [], progress: [] }), null, 'nothing to share');
});

test('cleaning keeps only small known fields', () => {
  assert.deepEqual(RS.clean({ book: 99, chapter: 1, study: '<b>x', total: 3, done: 9, note: 'secret', at: 'x' }), null);
  assert.deepEqual(RS.clean({ book: 1, chapter: 1, note: 'secret journal text' }), { book: 1, chapter: 1 });
  assert.equal(RS.clean([1, 2]), null);
  assert.equal(RS.clean({ study: 'ok-id', studyTitle: 'T'.repeat(500) }).studyTitle.length, 120);
});

test('friends read it in their own language', () => {
  const r = { book: 43, chapter: 3, study: 'two', studyTitle: 'Second', done: 1, total: 3 };
  const names = { en: { 43: 'John' }, es: { 43: 'Juan' } };
  assert.equal(RS.line(r, 'en', id => names.en[id]), 'Reading John 3 · Study: Second · 1 of 3 studies done');
  assert.equal(RS.line(r, 'es', id => names.es[id], () => 'Segundo'), 'Leyendo Juan 3 · Estudio: Segundo · 1 de 3 estudios hechos');
  assert.equal(RS.line(null, 'en'), '');
});

test('wired in: opt-in toggle, sync only when on, friend profile, chat header, offline cache', () => {
  const aura = read('./aura.js'), dm = read('./dm.js'), html = read('./index.html'), sw = read('./sw.js'), i18n = read('./i18n.js');
  assert.match(aura, /if\(RS&&RS\.pref\(localStorage\)\.get\(\)\)\{.{0,500}if\(reading\)out\.reading=reading\}return out\}/, 'stats carry reading only when sharing is on');
  assert.match(aura, /id="reading-share" \$\{on\?'checked':''\}/);
  assert.match(aura, /event\.target\.id==='reading-share'[^}]*msbFriendsSync\(\)/, 'turning it on or off syncs at once');
  assert.match(aura, /READING NOW/);
  assert.match(aura, /MsbReadingShare\.clean\(src\.reading\)/, 'friend data is cleaned again on this phone');
  assert.match(dm, /data-reading-code=/);
  assert.ok(html.indexOf('reading-share.js') > 0 && html.indexOf('reading-share.js') < html.indexOf('src="dm.js"'));
  assert.ok(sw.includes("'./reading-share.js'"));
  assert.ok(i18n.includes(`"Share what I'm reading with friends": "Compartir con mis amigos lo que estoy leyendo"`));
});

test('the shared study is the one last opened, not just the first unfinished', () => {
  const studies = [{ id: 'one', title: 'First' }, { id: 'two', title: 'Second' }];
  const r = RS.snapshot({ place: '', studies, progress: [], last: { id: 'deep-dive', title: 'A deeper study' }, now: 1 });
  assert.equal(r.study, 'deep-dive'); assert.equal(r.studyTitle, 'A deeper study');
  assert.equal(RS.snapshot({ place: '', studies, progress: [], last: null }).study, 'one', 'before any study is opened');
  assert.ok(RS.LAST_STUDY_KEY.startsWith('msb_'));
  const aura = read('./aura.js');
  assert.match(aura, /if\(name==='study'&&id&&window\.MsbReadingShare\)\{try\{localStorage\.setItem\(MsbReadingShare\.LAST_STUDY_KEY,String\(id\)\)/, 'opening a study remembers it');
  assert.match(aura, /const last=lastId\?study\(lastId\):null;const reading=RS\.snapshot\(\{[^}]*last\}\)/);
});

test('the friend profile speaks Spanish too', () => {
  const aura = read('./aura.js'), i18n = read('./i18n.js');
  for (const [en, es] of [['FRIEND', 'AMIGO'], ['Back to friends', 'Volver a amigos'], ['← Friends', '← Amigos']]) assert.ok(i18n.includes(`"${en}": "${es}"`), en);
  assert.match(aura, /msbEs\(\)\?\(studies===1\?'estudio':'estudios'\)/);
  assert.match(aura, /msbEs\(\)\?'Código de amigo':'Friend code'/);
  assert.match(aura, /es\?'activo hace un momento':'active just now'/);
});

test('app scripts parse (a syntax error would break the whole app)', async () => {
  const { execFileSync } = await import('node:child_process');
  for (const f of ['aura.js', 'dm.js', 'reading-share.js', 'squishy.js', 'squishy-core.js', 'squishy-trade.js', 'match3.js', 'i18n.js']) {
    execFileSync(process.execPath, ['--check', new URL(f, import.meta.url).pathname]);
  }
});

test('deuterocanonical books share too, up to the app\'s highest book number', () => {
  const rows = read('./study-tools.js').match(/BOOK_ROWS = '([^']+)'/)[1].split(';').map(r => +r.split('|')[0]);
  const max = Math.max(...rows);
  assert.deepEqual(RS.clean({ book: 67, chapter: 3 }), { book: 67, chapter: 3 });
  assert.deepEqual(RS.clean({ book: max, chapter: 1 }), { book: max, chapter: 1 });
  assert.equal(RS.clean({ book: max + 1, chapter: 1 }), null);
  assert.match(read('./reading-share.js'), new RegExp(`book <= ${max} &&`));
});
