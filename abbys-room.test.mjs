import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';

const read = (f) => readFileSync(f, 'utf8');
const ROOM_ART = ['abbys-room-icon-96', 'abbys-room-icon-192', 'abbys-room-icon-384', 'abbys-room-banner-640', 'abbys-room-banner-1280'];

test('the kids section is called Abby’s Room / El cuarto de Abby everywhere it is named', () => {
  const files = ['aura.js', 'stories.js', 'kidgames.js', 'coloring.js', 'drawings.js', 'i18n.js', 'index.html', 'manifest.webmanifest'];
  for (const f of files) {
    const src = read(f);
    assert.doesNotMatch(src, /Stories for little ones|Historias para los pequeños|LITTLE ONES|PARA LOS PEQUEÑOS/, `${f} still names the old section`);
  }
  const aura = read('aura.js');
  assert.equal((aura.match(/data-nav="stories">[^]*?<strong>Abby’s Room<\/strong>/g) || []).length >= 2, true);
  assert.match(aura, /data-nav="stories">Abby’s Room<\/button>/);
  assert.match(read('stories.js'), /<h1 class="abby-title">Abby’s Room<\/h1>/);
  assert.match(read('stories.js'), /'El cuarto de Abby' : 'Abby’s Room'/);
  for (const f of ['kidgames.js', 'coloring.js']) assert.match(read(f), /'← Abby’s Room', '← El cuarto de Abby'/);
  const i18n = read('i18n.js');
  assert.match(i18n, /'Abby’s Room': 'El cuarto de Abby'/);
  assert.match(i18n, /'← Abby’s Room': '← El cuarto de Abby'/);
  assert.match(i18n, /In Abby’s Room, open the coloring book[^"]*": "Todavía no hay dibujos\. En el cuarto de Abby/);
});

test('the rename keeps the internal screen id, so routes and progress are untouched', () => {
  const aura = read('aura.js');
  assert.match(aura, /MSB_DEFERRED_SCREENS=\[[^\]]*'stories'/);
  assert.match(aura, /state\.screen==='stories'&&window\.MsbStories/);
  assert.match(read('sw.js'), /const STORIES_CACHE = 'msb-stories-1'/);
});

test('Abby’s Room uses its painted icon and header, precached, with no emoji collage', () => {
  for (const n of ROOM_ART) assert.ok(existsSync(`img/room/${n}.webp`), n);
  const stories = read('stories.js');
  assert.match(stories, /class="abby-hero-art" src="img\/room\/abbys-room-banner-1280\.webp"/);
  assert.match(stories, /class="kg-entry-art abby-entry-icon" src="img\/room\/abbys-room-icon-192\.webp"/);
  assert.doesNotMatch(stories, /🔎🖼️💬/);
  assert.match(read('aura.js'), /class="abby-hub-icon" src="img\/room\/abbys-room-icon-192\.webp"/);
  const sw = read('sw.js');
  assert.match(sw, /'abbys-room-icon-96', 'abbys-room-icon-192', 'abbys-room-icon-384', 'abbys-room-banner-640', 'abbys-room-banner-1280'\]\.map\(\(n\) => `\.\/img\/room\/\$\{n\}\.webp`\)/);
  assert.match(sw, /room\\\/\[a-z0-9-\]\+\\\.webp/);
  const hashes = JSON.parse(read('img/art-hashes.json'));
  for (const n of ROOM_ART) assert.ok(hashes[`img/room/${n}.webp`], `${n} hash`);
  const css = read('kidgames.css');
  assert.match(css, /\.abby-hero::after/);
  assert.match(css, /:root\[data-theme="light"\] \.abby-room/);
});
