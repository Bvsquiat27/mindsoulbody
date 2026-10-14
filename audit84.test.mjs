import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const aura = readFileSync('aura.js', 'utf8');
const i18n = readFileSync('i18n.js', 'utf8');

test('bank wait: one block, localized Try again, also on Go deeper', () => {
  assert.match(aura, /es\?'Intentar de nuevo':'Try again'/);
  assert.match(aura, /lessons\.join\(''\)\|\|\(bankWait\?\(games\.length\?bankWait:''\):/);
  assert.match(aura, /\$\{msbBankWait\(\)\}\$\{prayers\}/);
});
test('trade redraw waits for the deferred scripts', () => {
  assert.match(aura, /function msbTradeRedraw\(\)\{if\(!window\.MsbSquishyRoom\)\{screen\.innerHTML=msbLoadingHtml\(\)/);
});
test('reader art list includes the new stories', () => {
  const br = readFileSync('bible-reader.js', 'utf8');
  for (const id of ['ladder', 'redsea', 'samuel']) assert.match(br.split('\n').find((l) => l.includes('STORY_ART_FILES =')), new RegExp(`'${id}'`));
});
test('Pause ends the bedtime read-aloud chain', () => {
  assert.match(readFileSync('stories.js', 'utf8'), /#screen \[data-speech-stop\], #screen \[data-speech-pause\]/);
});
test('no wording says notes stay private, in EN or ES', () => {
  for (const src of [aura, i18n]) {
    assert.doesNotMatch(src, /notes stay private|journal itself stays private|private notes|notas siguen|diario se queda privado|No se sincronizan con otros|PRIVATE JOURNAL|not uploaded|DIARIO PRIVADO|No se suben/);
  }
});
test('study notes sync when saved', () => {
  assert.match(aura, /toast\('Note saved\.'\);if\(msbFriendsId\(\)\)msbLoadMyNotes\(\)\.then\(m=>m\.syncSoon/);
});
test('shared text never contains an empty verse', () => {
  globalThis.self = globalThis;
  const N = require('./my-notes.js');
  assert.equal(N.shareText({ title: '', verse: '', ref: '', text: 'Only me' }), 'Only me');
  assert.doesNotMatch(N.shareText({ verse: '', ref: 'X', text: 'a' }), /“”|\(\)/);
  const src = readFileSync('my-notes.js', 'utf8');
  assert.match(src, /ctx\.ensure \? ctx\.ensure\(\)/);
  assert.match(src, /if \(!n\.verse \|\| !n\.book\)/);
});

test('study journal box follows the share switch', () => {
  assert.match(aura, /localStorage\.getItem\('msb_notes_share'\)==='0'\?'Only you can see these notes/);
  assert.match(i18n, /Tus amigos pueden ver estas notas/);
  assert.match(i18n, /Solo tú puedes ver estas notas/);
});
