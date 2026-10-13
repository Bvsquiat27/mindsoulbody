import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const aura = readFileSync(new URL('./aura.js', import.meta.url), 'utf8');
const line = start => aura.split('\n').find(l => l.startsWith(start));

function harness(localDenom, pending) {
  const ls = new Map([['msb_friends_id', JSON.stringify({ code: 'MSB-AAAAAA', secret: 's' })]]), calls = [];
  if (pending) ls.set('msb_denom_pending', pending);
  const localStorage = { getItem: k => ls.get(k) ?? null, setItem: (k, v) => ls.set(k, String(v)), removeItem: k => ls.delete(k) };
  const env = {
    MSB_FRIENDS_KEY: 'msb_friends_id', localStorage,
    msbFriendsId: () => JSON.parse(ls.get('msb_friends_id')),
    msbFriendsPublicProfile: () => ({ handle: 'reader_1', denomination: localDenom }),
    msbFriendsStats: () => ({}), msbStore: () => ({ profile: {} }), msbPublicImage: () => '',
    msbFriendsCall: async (path, body) => { calls.push({ path, body }); return { ok: true }; }, toast: () => {}
  };
  const code = `${line('const MSB_DENOM_PENDING_KEY=')}\n${line('function msbDenomPending(')}\n${line('async function msbFriendsSync(')}\nreturn msbFriendsSync;`;
  const sync = new Function(...Object.keys(env), code)(...Object.values(env));
  return { sync, calls, ls };
}

test('a stale local denomination is never sent, so the server value stays', async () => {
  const h = harness('Basically Orthodox', '');
  await h.sync();
  assert.equal('denomination' in h.calls[0].body, false);
});

test('a denomination picked on this phone is sent once, then cleared', async () => {
  const h = harness('Pentecostal', 'Pentecostal');
  await h.sync();
  assert.equal(h.calls[0].body.denomination, 'Pentecostal');
  assert.equal(h.ls.has('msb_denom_pending'), false);
  await h.sync();
  assert.equal('denomination' in h.calls[1].body, false);
});

test('every listed denomination can be chosen and saved (Yes saves the pick)', () => {
  const choices = eval(line('const DENOM_CHOICES=').replace(/^const DENOM_CHOICES=/, '').replace(/;$/, ''));
  for (const c of ['Pentecostal', 'Catholic', 'Baptist', 'Orthodox']) assert.ok(choices.includes(c));
  const save = line('function saveDenomination(');
  assert.match(save, /DENOM_CHOICES\.includes\(choice\)/);
  assert.match(save, /localStorage\.setItem\(MSB_DENOM_PENDING_KEY,shown\)/);
  assert.match(aura, /if\(kind==='denom-yes'\)\{const choice=state\.denomChoice;state\.denomChoice=null;if\(DENOM_CHOICES\.includes\(choice\)\)saveDenomination\(choice\)/);
  assert.doesNotMatch(aura, /finger must have slipped/);
});

test('restore asks with the count of saved items and drawings, in EN and ES', () => {
  const prompt = new Function(`${line('function msbRestorePrompt(')}\n${aura.split('\n').slice(aura.split('\n').findIndex(l => l.startsWith('function msbRestorePrompt(')) + 1, aura.split('\n').findIndex(l => l.startsWith('function msbRestorePrompt(')) + 5).join('\n')}\nreturn msbRestorePrompt;`)();
  assert.equal(prompt('2026-10-13', 12, 3, 'en'), 'Restore this backup from 2026-10-13 (12 saved items, 3 drawings)? This replaces notes, progress, settings, friends data, and drawings on this device.');
  assert.equal(prompt('2026-10-13', 1, 0, 'en'), 'Restore this backup from 2026-10-13 (1 saved item)? This replaces notes, progress, settings, friends data on this device.');
  assert.match(prompt('2026-10-13', 5, 1, 'es'), /5 datos guardados, 1 dibujo\)\?.*y los dibujos/);
  assert.match(aura, /window\.confirm\(msbRestorePrompt\(/);
});
