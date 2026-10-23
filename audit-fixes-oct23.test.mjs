import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = (p) => readFileSync(new URL(p, import.meta.url), 'utf8');

test('oct23 fix: Profile has a two-step account delete in EN and ES that calls /account/delete', () => {
  const aura = read('./aura.js');
  assert.match(aura, /\$\{msbBackupHtml\(\)\}\$\{msbDeleteAccountHtml\(\)\}/);
  assert.match(aura, /function msbDeleteAccountHtml\(\)\{if\(!msbFriendsId\(\)\)return '';/);
  for (const s of ['Delete my account…', 'Eliminar mi cuenta…', 'Are you sure? This cannot be undone.', '¿Seguro? Esto no se puede deshacer.', 'Yes, delete it forever', 'Sí, eliminarla para siempre', 'Cancel', 'Cancelar']) assert.ok(aura.includes(s), s);
  assert.match(aura, /class="delete-account-step2" hidden/);
  assert.match(aura, /msbFriendsCall\('\/account\/delete',\{code:id\.code,secret:id\.secret,confirm:'DELETE'\}\)/);
  assert.match(aura, /if\(kind==='account-delete'\)\{one\.hidden=true;two\.hidden=false;/, 'first click only reveals the confirm');
  assert.match(aura, /MSB_DELETE_LOCAL_KEYS=\['msb_friends_id'/);
});

test('oct23 fix: Bible footer wraps at 320px', () => {
  const css = read('./aura.css');
  assert.match(css, /\.bible-page-foot\{display:flex;flex-wrap:wrap;/);
  assert.match(css, /\.bible-page-foot>\.text-button\{white-space:nowrap/);
});

test('oct23 fix: locked badges dim only the icon, not the goal text', () => {
  const css = read('./kidgames.css');
  const base = css.match(/\.kg-badge\{[^}]*\}/)[0];
  assert.doesNotMatch(base, /opacity/);
  assert.match(css, /\.kg-badge:not\(\.earned\)>span\{opacity:\.6\}/);
});

test('oct23 fix: bundled data uses normal cache and is versioned in the service worker', () => {
  assert.match(read('./aura.js'), /async function msbBundled\(url\)\{const res=await fetch\(url\);/);
  const sw = read('./sw.js');
  for (const f of ['study-library', 'study-index', 'trivia']) assert.match(sw.match(/const VERSIONED_DATA = \[[^\]]*\]/)[0], new RegExp(`/data/${f}\\.json`));
});
