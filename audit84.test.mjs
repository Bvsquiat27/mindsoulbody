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
test('Pause holds rather than ends the bedtime chain', () => {
  assert.match(readFileSync('stories.js', 'utf8'), /bedtime\.held = !resuming/);
});
test('no wording says notes stay private, in EN or ES', () => {
  for (const src of [aura, i18n]) {
    assert.doesNotMatch(src, /notes stay private|journal itself stays private|private notes|notas siguen|diario se queda privado|No se sincronizan con otros|PRIVATE JOURNAL|not uploaded|DIARIO PRIVADO|No se suben|(They|Notes and progress) stay in this browser|Se quedan en este navegador|SAVED IN THIS BROWSER/);
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
  assert.match(aura, /!state\.user\?\.registered\?'Create a study profile to save notes/);
  assert.match(aura, /!msbNotesShared\(\)\?'Only you can see these notes/);
  assert.match(i18n, /Tus amigos pueden ver estas notas/);
  assert.match(i18n, /Solo tú puedes ver estas notas/);
});

test('bedtime Pause holds the chain and resume carries it on; Stop ends it', () => {
  const src = readFileSync('stories.js', 'utf8');
  assert.doesNotMatch(src, /\[data-speech-stop\], #screen \[data-speech-pause\]/);
  assert.match(src, /if \(bedtime\.held\) \{ bedtime\.pendingAdvance = next; return; \}/);
  assert.match(src, /resuming && bedtime\.pendingAdvance/);
});
test('devotional data is prefetched so share runs inside the tap', () => {
  const src = readFileSync('my-notes.js', 'utf8');
  assert.match(src, /prefetch so Share can run inside the tap/);
  assert.match(src, /if \(!meta\.verse\) \{ try \{ await/);
});

/* General sweep: any sentence saying something stays on this device / in this
   browser must be about data that really is local. Notes and lessons are shared
   with friends unless the switch is off, so such a sentence about them fails. */
test('privacy sweep: no "stays local" claim about notes or lessons', async () => {
  const { readdirSync } = await import('node:fs');
  const files = readdirSync('.').filter((f) => /\.(js|html)$/.test(f));
  const PHRASE = /(stays? on this device|stays? in this browser|in this browser|se quedan?\b|en este navegador)/i;
  /* local-only topics that may keep the wording */
  const EXEMPT = /highlight|subrayado|memory verse|These verses|versículos para memorizar|Today’s count|rope|knot|drawings? is not available|dibujos|password|contraseña|This account|Esta cuenta|Reina-Valera 1909 no incluye|The lines stay on top|líneas se quedan|amigos se quedan cerca|Study together is coming soon|Estudiar juntos|persistent storage|almacenamiento persistente|live in this browser|viven en este navegador|kidgames|match3|Signed-out reading|Progress stays|With a friend code|Con un código de amigo|Sharing is off|Compartir está desactivado|Saving drawings|are saved in this browser|se guardan en este navegador|Export a backup|Exporta una copia|Exporta un archivo/i;
  const bad = [];
  for (const f of files) {
    for (const sentence of readFileSync(f, 'utf8').split(/(?<=[.!?])\s+|\n/)) {
      if (PHRASE.test(sentence) && !EXEMPT.test(sentence) && /note|nota|lesson|lecci|progress|avance|journal|diario/i.test(sentence)) bad.push(`${f}: ${sentence.trim().slice(0, 140)}`);
    }
  }
  assert.deepEqual(bad, []);
});
