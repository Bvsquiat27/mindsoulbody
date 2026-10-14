import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const D = require('./devotional-data.js');
const M = require('./devotional.js');
import { PUSH_TEXT, PUSH_ORDER } from './worker/devotional-push-data.mjs';
import { pickId } from './worker/push.mjs';
const bible = (b, es) => JSON.parse(readFileSync(new URL(`./bible/${es ? 'rvr/' : ''}${String(b).padStart(2, '0')}.json`, import.meta.url), 'utf8'));

test('at least 60 daily devotionals plus feasts, each EN and ES with verse, reflection, prayer', () => {
  assert.ok(D.ordinary.length >= 60);
  assert.ok(D.feasts.length >= 15);
  for (const e of [...D.ordinary, ...D.feasts]) for (const l of ['en', 'es']) {
    const x = e[l];
    assert.ok(x.title && x.ref && x.verses.length && x.reflection.length > 150 && x.prayer.length > 30, `${e.id} ${l}`);
  }
});
test('verses are the exact KJV and RV1909 text from the app Bible', () => {
  for (const e of [...D.ordinary, ...D.feasts]) {
    const k = bible(e.book).chapters[e.chapter - 1], r = bible(e.book, true).chapters[e.chapter - 1];
    assert.deepEqual(e.en.verses, k.slice(e.verse - 1, e.verseEnd), e.id);
    assert.deepEqual(e.es.verses, r.slice(e.verse - 1, e.verseEnd), e.id);
  }
});
test('Orthodox framing: no Protestant-only formulas, Spanish uses tú', () => {
  const all = JSON.stringify(D);
  assert.doesNotMatch(all, /penal substitution|sola scriptura|sola fide|sustitución penal/i);
  for (const e of [...D.ordinary, ...D.feasts]) assert.doesNotMatch(e.es.reflection + e.es.prayer, /\busted(es)?\b|\bvosotros\b/i, e.id);
  assert.match(all, /theosis/);
});
test('Father quotes carry a public source', () => {
  for (const e of [...D.ordinary, ...D.feasts]) if (e.father) { assert.match(e.father.source, /^https:\/\//); assert.ok(e.father.author && e.father.bodyEs); }
});
test('no personal names in the devotional code or content', () => {
  for (const f of ['devotional.js', 'devotional-data.js', 'worker/push.mjs']) assert.doesNotMatch(readFileSync(new URL(`./${f}`, import.meta.url), 'utf8'), /Karen|Angel\b/);
});
test('client calendar matches the push worker for two years', () => {
  for (let i = 0; i < 730; i++) {
    const d = new Date(Date.UTC(2026, 0, 1 + i)), y = d.getUTCFullYear(), m = d.getUTCMonth() + 1, day = d.getUTCDate();
    assert.equal(M.forDate(y, m, day).id, pickId(y, m, day), `${y}-${m}-${day}`);
  }
});
test('push text table is generated from the same content', () => {
  for (const e of [...D.ordinary, ...D.feasts]) {
    assert.deepEqual(PUSH_TEXT[e.id].en, [e.en.title, e.en.verses[0]]);
    assert.deepEqual(PUSH_TEXT[e.id].es, [e.es.title, e.es.verses[0]]);
  }
  assert.deepEqual(PUSH_ORDER.ordinary, D.ordinary.map((e) => e.id));
});
test('reminder is off by default at 07:00 and stored under an msb_ key', () => {
  const store = { m: {}, getItem(k) { return this.m[k] ?? null; }, setItem(k, v) { this.m[k] = v; } };
  assert.deepEqual(M.readSettings(store), { on: false, time: '07:00', endpoint: '', auth: '', synced: '', reenable: false });
  assert.match(M.PUSH_KEY, /^msb_/);
});
test('wired in: script tags, home card, profile setting, SW precache and push handlers', () => {
  const html = readFileSync(new URL('./index.html', import.meta.url), 'utf8'), aura = readFileSync(new URL('./aura.js', import.meta.url), 'utf8'), sw = readFileSync(new URL('./sw.js', import.meta.url), 'utf8');
  assert.match(html, /<script src="devotional\.js" defer>/); assert.doesNotMatch(html, /devotional-data\.js/, 'devotional data loads on demand');
  assert.match(aura, /MsbDevotional\.homeCard\(\)/); assert.match(aura, /MsbDevotional\.settingsHtml\(\)/);
  assert.match(sw, /'\.\/devotional\.js'/); assert.match(sw, /addEventListener\('push'/); assert.match(sw, /addEventListener\('notificationclick'/);
  const toml = readFileSync(new URL('./worker/wrangler.friends.toml', import.meta.url), 'utf8');
  assert.match(toml, /crons = \["\*\/5 \* \* \* \*"\]/); assert.doesNotMatch(toml, /VAPID_PRIVATE_KEY\s*=/);
  assert.match(toml, new RegExp(M.VAPID_PUBLIC));
});

test('a restored on:true without notification permission shows as off with a re-enable prompt', () => {
  const store = { m: {}, getItem(k) { return this.m[k] ?? null; }, setItem(k, v) { this.m[k] = v; } };
  M.saveSettings({ on: true, time: '06:30', endpoint: 'https://fcm.googleapis.com/x', auth: 'a', synced: '2026-01-01' }, store);
  assert.equal(M.reconcile('granted', store).on, true);
  const s = M.reconcile('default', store);
  assert.deepEqual([s.on, s.reenable, s.time, s.endpoint], [false, true, '06:30', '']);
  assert.equal(M.readSettings(store).reenable, true);
  const src = readFileSync(new URL('./devotional.js', import.meta.url), 'utf8');
  assert.match(src, /Turn it on again/); assert.match(src, /Actívalo otra vez/);
});
test('the notification deep link uses window.msbNav from aura.js', () => {
  const src = readFileSync(new URL('./devotional.js', import.meta.url), 'utf8'), aura = readFileSync(new URL('./aura.js', import.meta.url), 'utf8');
  assert.match(aura, /window\.msbNav=nav/);
  assert.match(src, /root\.msbNav/);
  assert.doesNotMatch(src, /typeof root\.nav === 'function' &&/);
});

test('startup stays light: devotional data, games and the challenge bank load after the first screen', () => {
  const html = readFileSync(new URL('./index.html', import.meta.url), 'utf8'), aura = readFileSync(new URL('./aura.js', import.meta.url), 'utf8'), dev = readFileSync(new URL('./devotional.js', import.meta.url), 'utf8'), sw = readFileSync(new URL('./sw.js', import.meta.url), 'utf8');
  for (const f of ['games.js', 'trivia-game.js', 'squishy.js', 'squishy-data.js', 'kidgames-data.js', 'match3-data.js', 'kg-sling.js', 'stories.js', 'devotional-data.js']) {
    assert.doesNotMatch(html, new RegExp(`<script src="${f.replace('.', '\\.')}"`), f);
    assert.ok(sw.includes(`'./${f}'`), `${f} is still precached for offline use`);
  }
  assert.match(aura, /render\(\);setTimeout\(msbLoadDeferred,0\)/);
  assert.doesNotMatch(aura, /api\('\/auth\/session'\),api\('\/study\/challenges'\)\]/, 'the first screen does not wait for the challenge bank');
  assert.match(aura, /MSB_DEFERRED_SCREENS\.includes\(state\.screen\)/);
  assert.match(dev, /function ensureData\(\)/);
  assert.match(dev, /setTimeout\(resync, 3000\)/, 'the push resync never blocks the first screen');
});
test('switches flip at once, ignore double taps, and match their saved state', () => {
  const css = readFileSync(new URL('./study-design.css', import.meta.url), 'utf8'), dev = readFileSync(new URL('./devotional.js', import.meta.url), 'utf8'), aura = readFileSync(new URL('./aura.js', import.meta.url), 'utf8');
  assert.match(css, /\.tap-vibration-toggle\[aria-checked="true"\] \.tap-vibration-knob::after/, 'the knob follows aria-checked');
  assert.match(dev, /if \(busy \|\| t\.getAttribute\('aria-busy'\) === 'true'\) return;/);
  assert.match(dev, /flipSwitch\(t, want\)/);
  assert.match(dev, /function failed\(msg\) \{ repaintSettings\(msg\); toast\(msg\); \}/);
  assert.match(aura, /MsbI18n\.t\(on\?'On':'Off'\)/);
});
