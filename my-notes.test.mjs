import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);

function ls() { const m = new Map(); return { getItem: (k) => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, String(v)), removeItem: (k) => m.delete(k), m }; }
globalThis.self = globalThis;
const N = require('./my-notes.js');

test('devotional notes live in msb_ keys and collect with study notes, newest first', () => {
  const s = ls();
  assert.ok(N.KEY.startsWith('msb_') && N.SHARE_KEY.startsWith('msb_'));
  N.save('2026-10-13', 'First', { title: 'A', ref: 'Psalm 23:1', verse: 'The LORD is my shepherd', book: 19, chapter: 23, v: 1 }, s);
  N.save('2026-10-14', 'Second', { title: 'B' }, s);
  const all = JSON.parse(s.getItem(N.KEY)); all['2026-10-13'].ts = 5000; all['2026-10-14'].ts = 9000; s.setItem(N.KEY, JSON.stringify(all));
  const list = N.collect({ studyNotes: [{ study_id: 'grace', body: 'Study note', updated_at: 1 }, { study_id: 'x', body: '  ' }], studyTitle: () => 'Grace' }, s);
  assert.deepEqual(list.map((n) => n.text), ['Second', 'First', 'Study note']);
  assert.equal(list[2].kind, 'study'); assert.equal(list[2].title, 'Grace');
  N.save('2026-10-14', '   ', {}, s);
  assert.equal(N.get('2026-10-14', s), null);
  assert.equal(N.save('k', 'x'.repeat(N.MAX + 50), {}, s).text.length, N.MAX);
});

test('notes are visible to friends by default; the switch hides them', () => {
  const s = ls();
  assert.equal(N.shared(s), true);
  N.setShared(false, s); assert.equal(N.shared(s), false);
  N.setShared(true, s); assert.equal(N.shared(s), true);
});

test('share text carries the verse card', () => {
  assert.equal(N.shareText({ title: 'T', verse: 'V', ref: 'R 1:1', text: 'Note' }), 'T\n“V” (R 1:1)\n\nNote');
});

test('notes load lazily and are wired into the devotional, Profile and friend profile', () => {
  const html = readFileSync('index.html', 'utf8');
  assert.doesNotMatch(html, /my-notes\.js/);
  const aura = readFileSync('aura.js', 'utf8');
  assert.match(aura, /el\.src='my-notes\.js'/);
  assert.match(aura, /id="my-notes-slot"/);
  assert.match(aura, /id="friend-notes"/);
  const dev = readFileSync('devotional.js', 'utf8');
  assert.match(dev, /dev-notes-slot/);
  assert.match(dev, /noteMeta/);
  const src = readFileSync('my-notes.js', 'utf8');
  assert.match(src, /hidden \? \[\] : collect/);
  assert.match(src, /navigator\.share/);
  assert.match(src, /msbOpenVerseSend/);
});
