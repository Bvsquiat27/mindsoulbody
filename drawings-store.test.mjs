import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';

const require = createRequire(import.meta.url);
const S = require('./drawings-store.js');
const blob = (text, type = 'image/jpeg') => new Blob([text], { type });

function clockFrom(start) { let t = start; return () => (t += 1000); }

test('save stores a drawing with page, title, dates and pictures', async () => {
  const store = S.createStore(S.memoryBackend(), { now: clockFrom(1_700_000_000_000) });
  const row = await store.save({ page: 'noah', title: 'Noah and the Ark', image: blob('a'), layer: blob('l', 'image/webp'), thumb: blob('t') });
  assert.match(row.id, /^[a-z0-9]{4,40}$/);
  assert.equal(row.page, 'noah');
  assert.equal(row.title, 'Noah and the Ark');
  assert.equal(row.created, row.updated);
  assert.equal(row.layer.type, 'image/webp');
  const again = await store.get(row.id);
  assert.equal(again.image.size, 1);
});

test('save refuses entries without a page or a picture', async () => {
  const store = S.createStore(S.memoryBackend());
  await assert.rejects(store.save({ title: 'x', image: blob('a') }));
  await assert.rejects(store.save({ page: 'noah', image: 'not a blob' }));
});

test('list returns the newest drawings first', async () => {
  const store = S.createStore(S.memoryBackend(), { now: clockFrom(0) });
  const a = await store.save({ page: 'noah', image: blob('a') });
  const b = await store.save({ page: 'jonah', image: blob('b') });
  const c = await store.save({ page: 'david', image: blob('c') });
  assert.deepEqual((await store.list()).map(r => r.id), [c.id, b.id, a.id]);
});

test('update keeps the id and creation date, replaces the picture, moves it to the top', async () => {
  const store = S.createStore(S.memoryBackend(), { now: clockFrom(0) });
  const a = await store.save({ page: 'noah', image: blob('first') });
  const b = await store.save({ page: 'jonah', image: blob('b') });
  const a2 = await store.save({ page: 'noah', image: blob('second!') }, { updateId: a.id });
  assert.equal(a2.id, a.id);
  assert.equal(a2.created, a.created);
  assert.ok(a2.updated > a.updated);
  const rows = await store.list();
  assert.equal(rows.length, 2);
  assert.equal(rows[0].id, a.id);
  assert.equal(rows[0].image.size, 7);
  assert.equal(rows[1].id, b.id);
});

test('saving as a new copy keeps both versions', async () => {
  const store = S.createStore(S.memoryBackend(), { now: clockFrom(0) });
  const a = await store.save({ page: 'noah', image: blob('1') });
  const copy = await store.save({ page: 'noah', image: blob('2') });
  assert.notEqual(copy.id, a.id);
  assert.equal((await store.list()).length, 2);
  assert.equal((await store.latestFor('noah')).id, copy.id);
  assert.equal(await store.latestFor('jonah'), null);
});

test('update of a drawing that no longer exists makes a new entry', async () => {
  const store = S.createStore(S.memoryBackend(), { now: clockFrom(0) });
  const row = await store.save({ page: 'noah', image: blob('1') }, { updateId: 'dgone123' });
  assert.notEqual(row.id, 'dgone123');
  assert.equal((await store.list()).length, 1);
});

test('delete removes only that drawing', async () => {
  const store = S.createStore(S.memoryBackend(), { now: clockFrom(0) });
  const a = await store.save({ page: 'noah', image: blob('1') });
  const b = await store.save({ page: 'jonah', image: blob('2') });
  await store.remove(a.id);
  assert.equal(await store.get(a.id), null);
  assert.deepEqual((await store.list()).map(r => r.id), [b.id]);
  await store.remove('missing');
  assert.equal((await store.list()).length, 1);
});

test('titles are trimmed to a sensible length', async () => {
  const store = S.createStore(S.memoryBackend());
  const row = await store.save({ page: 'noah', title: 'x'.repeat(500), image: blob('1') });
  assert.equal(row.title.length, 120);
});

test('backup entries are checked before restoring', () => {
  const png = 'data:image/png;base64,iVBORw0KGgo=';
  const good = { id: 'dabc123', page: 'noah', title: 'Noah', created: 1, updated: 2, image: 'data:image/jpeg;base64,/9j/4AAQ', layer: png, thumb: null };
  assert.equal(S.validBackupEntry(good), true);
  assert.equal(S.validBackupEntry({ ...good, image: 'javascript:alert(1)' }), false);
  assert.equal(S.validBackupEntry({ ...good, image: 'data:text/html;base64,PGI+' }), false);
  assert.equal(S.validBackupEntry({ ...good, id: '../x' }), false);
  assert.equal(S.validBackupEntry({ ...good, page: '<b>' }), false);
  assert.equal(S.validBackupEntry({ ...good, created: 'soon' }), false);
  assert.equal(S.validBackupEntry({ ...good, layer: 'data:image/gif;base64,R0lG' }), false);
  assert.equal(S.validBackupEntry(null), false);
});

test('drawings stay on the device: IndexedDB store, no network calls', () => {
  const src = readFileSync(new URL('./drawings-store.js', import.meta.url), 'utf8') + readFileSync(new URL('./drawings.js', import.meta.url), 'utf8');
  assert.equal(S.DB_NAME, 'msb-drawings');
  assert.doesNotMatch(src, /fetch\(|XMLHttpRequest|localStorage|msbFriends/);
  assert.match(src, /navigator\.canShare\(\{ files: \[file\] \}\)/);
  assert.match(src, /a\.download = name/);
});

test('the app loads and precaches the drawings scripts', () => {
  const html = readFileSync(new URL('./index.html', import.meta.url), 'utf8');
  const sw = readFileSync(new URL('./sw.js', import.meta.url), 'utf8');
  assert.ok(html.indexOf('drawings-store.js') < html.indexOf('drawings.js"') && html.indexOf('drawings.js"') < html.indexOf('coloring.js"'));
  assert.match(sw, /'\.\/drawings-store\.js'/);
  assert.match(sw, /'\.\/drawings\.js'/);
});

test('every new coloring-save string has a Spanish translation', () => {
  const i18n = readFileSync(new URL('./i18n.js', import.meta.url), 'utf8');
  for (const key of ['My drawings', '📱 Save to phone', '💾 Save to My drawings', 'Update the saved drawing', 'Save as a new copy', '🖍️ Keep coloring', '🗑️ Delete', 'Yes, delete it', 'Pictures you save from the coloring book stay on this phone. They are not sent anywhere.']) {
    assert.ok(i18n.includes(`"${key}":`), key);
  }
  assert.match(i18n, /"My drawings": "Mis dibujos"/);
  assert.match(i18n, /"📱 Save to phone": "📱 Guardar en el teléfono"/);
});
