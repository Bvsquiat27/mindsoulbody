import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const aura = readFileSync('aura.js', 'utf8');
const dev = readFileSync('devotional.js', 'utf8');

test('a failed deferred script is a failure with a retry, not success', () => {
  assert.match(aura, /el\.onerror=\(\)=>\{bad=bad\|\|src;one\(\)\}/);
  assert.match(aura, /msbLoadDeferred\.failed=true/);
  assert.match(aura, /function msbLoadFailedHtml\(\)[^\n]*location\.reload\(\)/);
});
test('games screen shows loading or Try again instead of "No lessons"', () => {
  assert.match(aura, /lessons\.join\(''\)\|\|\(bankWait\?\(games\.length\?bankWait:''\):/);
  assert.match(aura, /data-action="challenges-retry">\$\{es\?/);
  assert.match(aura, /kind==='challenges-retry'/);
});
test('trade, achievements and trivia wait for the deferred scripts', () => {
  assert.match(aura, /function msbTradeLobby\(code\)\{if\(!window\.MsbSquishyRoom\)\{[^}]*msbLoadingHtml/);
  assert.match(aura, /function msbTradeStart\(body,path\)\{if\(!window\.MsbSquishyRoom\)/);
  assert.match(aura, /kind==='achievements'\)\{state\.screen='achievements';render\(\)/);
  assert.match(aura, /if\(window\.TriviaGame\)TriviaGame\.click\(event\)/);
  assert.doesNotMatch(aura, /window\.TriviaGame\.pending=/);
});
test('devotional home card falls back to a verse when its data fails', () => {
  assert.match(dev, /They are new every morning: Great is thy faithfulness\./);
  assert.match(dev, /Nuevas son cada mañana; grande es tu fidelidad\./);
  const en = JSON.parse(readFileSync('bible/25.json', 'utf8')).chapters[2][22];
  const es = JSON.parse(readFileSync('bible/rvr/25.json', 'utf8')).chapters[2][22];
  assert.equal(en, 'They are new every morning: Great is thy faithfulness.');
  assert.equal(es, 'Nuevas son cada mañana; grande es tu fidelidad.');
  assert.match(dev, /data-dev-fallback/);
});
