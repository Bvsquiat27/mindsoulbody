import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
const require = createRequire(import.meta.url);
const DM = require('./dm.js');
const read = f => readFileSync(new URL(f, import.meta.url), 'utf8');
const ME = 'MSB-AAAAAA', YOU = 'MSB-BBBBBB';
const at = (d, h, m = 0) => new Date(2026, 9, d, h, m).getTime();

test('messages and shared verses merge into one timeline, oldest first; junk is dropped', () => {
  const items = DM.timeline(
    [{ id: 'm2', from: YOU, body: 'hi back', ts: at(13, 9, 2) }, { id: 'm1', from: ME, body: 'hi', ts: at(13, 9, 0), read: true }, { from: ME, ts: 5 }, null],
    [{ id: 'v1', from: YOU, ts: at(13, 9, 1), text: 'In the beginning…', reference: 'Genesis 1:1', book: 1, chapter: 1, verse: 1, translation: 'rvr' }, { id: 'bad' }],
    ME);
  assert.deepEqual(items.map(i => i.id), ['m1', 'v1', 'm2']);
  assert.equal(items[0].mine, true); assert.equal(items[1].kind, 'verse'); assert.equal(items[1].translation, 'rvr'); assert.equal(items[2].mine, false);
});

test('bubbles group by sender within 5 minutes, with day separators and the time on the last bubble', () => {
  const items = DM.timeline([
    { id: 'a', from: YOU, body: '1', ts: at(12, 20, 0) },
    { id: 'b', from: ME, body: '2', ts: at(13, 9, 0) },
    { id: 'c', from: ME, body: '3', ts: at(13, 9, 3) },
    { id: 'd', from: ME, body: '4', ts: at(13, 9, 20) },
    { id: 'e', from: YOU, body: '5', ts: at(13, 9, 21) }
  ], [], ME);
  const rows = DM.layout(items, at(13, 10), 'en');
  assert.deepEqual(rows.filter(r => r.type === 'day').map(r => r.label), ['Yesterday', 'Today']);
  const it = Object.fromEntries(rows.filter(r => r.type === 'item').map(r => [r.item.id, r]));
  assert.deepEqual([it.b.first, it.b.last, it.c.first, it.c.last], [true, false, false, true], 'b and c are one group');
  assert.equal(it.b.time, ''); assert.ok(it.c.time);
  assert.equal(it.d.first, true, 'a long gap starts a new group');
});

test('"Seen" shows under my last message only when it was read and nothing newer came from them', () => {
  const mk = (readFlag, theyReplied) => DM.layout(DM.timeline([{ id: 'a', from: ME, body: 'x', ts: at(13, 9), read: readFlag }, ...(theyReplied ? [{ id: 'b', from: YOU, body: 'y', ts: at(13, 9, 1) }] : [])], [], ME), at(13, 10), 'en');
  assert.equal(mk(true, false).some(r => r.seen), true);
  assert.equal(mk(false, false).some(r => r.seen), false);
  assert.equal(mk(true, true).some(r => r.seen), false);
});

test('inbox preview and time: short, cached on this phone, never older than what is saved', () => {
  const m = new Map(), s = { getItem: k => m.get(k) ?? null, setItem: (k, v) => m.set(k, v) };
  const last = DM.lastStore(s);
  last.set(YOU, { kind: 'msg', mine: true, ts: 200, body: 'Line one\n\nline two ' + 'x'.repeat(100) });
  assert.match(last.get(YOU).text, /^You: Line one line two x+…$/);
  last.set(YOU, { kind: 'msg', mine: false, ts: 100, body: 'older' });
  assert.equal(last.get(YOU).ts, 200, 'an older message never replaces a newer one');
  last.set(YOU, { kind: 'verse', mine: false, ts: 300, reference: 'John 3:16' });
  assert.equal(last.get(YOU).text, '📖 John 3:16');
  assert.ok(DM.LAST_KEY.startsWith('msb_'));
  s.setItem(DM.LAST_KEY, '[1,2]'); assert.equal(DM.lastStore(s).get(YOU), null);
  assert.equal(DM.shortAgo(at(13, 10) - 30000, at(13, 10), 'en'), 'now');
  assert.equal(DM.shortAgo(at(13, 9, 30), at(13, 10), 'en'), '30 min');
  assert.equal(DM.shortAgo(at(12, 9), at(13, 10), 'en'), 'Yesterday');
});

test('DM screens: wired in, precached, sticky composer, verse cards open the reader, Spanish for every word', () => {
  const dm = read('./dm.js'), aura = read('./aura.js'), html = read('./index.html'), sw = read('./sw.js'), css = read('./aura.css'), i18n = read('./i18n.js');
  assert.ok(html.includes('<script src="dm.js" defer>') && sw.includes("'./dm.js'"));
  assert.match(aura, /if\(window\.MsbDM\)\{msbStopMsgPoll\(\);[^}]*MsbDM\.openThread\(screen,code,name\)/);
  assert.match(aura, /data-action="dm-inbox"/);
  assert.match(css, /\.dm-composer\{position:sticky;bottom:0/);
  assert.match(dm, /data-dm-verse=/); assert.match(dm, /msbOpenBibleVerse\(b, c, vv \|\| undefined\)/);
  assert.match(dm, /\/msg\/thread/); assert.match(dm, /\/verse\/thread/); assert.doesNotMatch(dm, /typing|\/msg\/read/, 'nothing that needs a server change');
  for (const k of new Set([...dm.matchAll(/T\('([^']+)'/g)].map(m => m[1]))) assert.ok(i18n.includes(`${JSON.stringify(k)}:`), `missing Spanish for: ${k}`);
  assert.ok(i18n.includes('"💬 Messages":'));
  const bubbles = dm.match(/class="dm-bubble"[^>]*>/)[0]; assert.match(bubbles, /data-i18n-skip/, 'message text is never translated');
});

test('polling: messages every 4 s, verses on open/return or once a minute, nothing while hidden', () => {
  assert.equal(DM.MSG_EVERY, 4000);
  assert.ok(DM.VERSE_EVERY >= 60000);
  assert.deepEqual(DM.pollPlan(100000, 0, false), { messages: true, verses: true }, 'first load fetches verses');
  assert.deepEqual(DM.pollPlan(100000, 96000, false), { messages: true, verses: false }, 'a 4 s tick skips verses');
  assert.deepEqual(DM.pollPlan(100000, 96000, false, true), { messages: true, verses: true }, 'opening or coming back fetches verses');
  assert.deepEqual(DM.pollPlan(200000, 100000, false), { messages: true, verses: true }, 'once a minute');
  assert.deepEqual(DM.pollPlan(200000, 0, true, true), { messages: false, verses: false }, 'hidden tab: no polling');
  const src = readFileSync(new URL('./dm.js', import.meta.url), 'utf8');
  assert.match(src, /document\.hidden/);
  assert.match(src, /visibilitychange/);
});

test('reading a chat clears its unread badge in the cached friends list', () => {
  const list = [{ code: 'A', name: 'a', unread: 3 }, { code: 'B', name: 'b', unread: 1 }];
  const r = DM.clearUnread(list, 'A');
  assert.equal(r.changed, true);
  assert.deepEqual(r.list.map(f => f.unread), [0, 1]);
  assert.equal(list[0].unread, 3, 'the input is not changed');
  assert.equal(DM.clearUnread(r.list, 'A').changed, false);
  assert.deepEqual(DM.clearUnread(null, 'A'), { list: [], changed: false });
});

test('a read chat stays read when the friends list is refreshed from the server', () => {
  const m = new Map(), st = { getItem: k => m.get(k) ?? null, setItem: (k, v) => m.set(k, String(v)) };
  const rs = DM.readStore(st);
  rs.mark('A', 3, 1000);
  assert.equal(DM.READ_KEY, 'msb_dm_read');
  assert.ok(DM.READ_KEY !== 'msb_friends_list', 'its own key, so a fetch cannot overwrite it');
  /* the server still reports the old 3: no badge */
  assert.deepEqual(rs.apply([{ code: 'A', unread: 3 }, { code: 'B', unread: 2 }]).map(f => f.unread), [0, 2]);
  /* two new messages arrive: only those show */
  assert.equal(rs.apply([{ code: 'A', unread: 5 }])[0].unread, 2);
  /* the server catches up to 0: the marker is dropped, later counts show in full */
  rs.apply([{ code: 'A', unread: 0 }]);
  assert.equal(rs.apply([{ code: 'A', unread: 1 }])[0].unread, 1);
  assert.equal(DM.unreadAfterRead(4, null), 4);
  const aura = readFileSync(new URL('./aura.js', import.meta.url), 'utf8');
  assert.match(aura, /MsbDM\.readStore\(localStorage\)\.apply\(rows\)/);
  assert.doesNotMatch(aura, /DENOM_HELP|denom-help/);
});
