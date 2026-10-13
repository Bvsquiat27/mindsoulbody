import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const aura = readFileSync(new URL('./aura.js', import.meta.url), 'utf8');
const src = aura.split('\n').find(l => l.startsWith('async function msbFriendsSync('));

function harness(saved) {
  const ls = new Map([['msb_friends_id', JSON.stringify(saved)]]), calls = [];
  const env = {
    MSB_FRIENDS_KEY: 'msb_friends_id',
    localStorage: { getItem: k => ls.get(k) ?? null, setItem: (k, v) => ls.set(k, String(v)) },
    msbFriendsId: () => JSON.parse(ls.get('msb_friends_id')),
    msbFriendsPublicProfile: () => ({ handle: 'reader_1', city: 'Town' }),
    msbFriendsStats: () => ({}), msbStore: () => ({ profile: { name: 'Profile Name' } }), msbPublicImage: () => '',
    msbFriendsCall: async (path, body) => { calls.push({ path, body }); return { ok: true }; }, toast: () => {},
    msbDenomPending: () => '', MSB_DENOM_PENDING_KEY: 'msb_denom_pending'
  };
  const sync = new Function(...Object.keys(env), `${src}\nreturn msbFriendsSync;`)(...Object.values(env));
  return { sync, calls, saved: () => JSON.parse(ls.get('msb_friends_id')) };
}

test('background syncs never send the saved friends name, so a server-side name stays', async () => {
  const h = harness({ code: 'MSB-AAAAAA', secret: 's', name: 'Old Name' });
  await h.sync();
  assert.equal(h.calls.length, 1);
  assert.equal('name' in h.calls[0].body, false);
  assert.equal(h.calls[0].body.handle, 'reader_1');
});

test('a name the user just chose is sent once and remembered on this phone', async () => {
  const h = harness({ code: 'MSB-AAAAAA', secret: 's', name: 'Old Name' });
  await h.sync({ name: '  New Name  ' });
  assert.equal(h.calls[0].body.name, 'New Name');
  assert.equal(h.saved().name, 'New Name');
  await h.sync({ name: '' });
  assert.equal('name' in h.calls[1].body, false, 'an empty name is never sent');
});

test('sign-up and profile edits pass the chosen name; nothing else does', () => {
  assert.match(aura, /msbFriendsCall\('\/register',\{name\}\)[^\n]*await msbFriendsSync\(\{name\}\)/);
  assert.match(aura, /await loadAccount\(\);msbFriendsSync\(\{name:String\(data\.get\('name'\)\|\|''\)\}\)/);
  assert.equal((aura.match(/msbFriendsSync\(\{/g) || []).length, 2);
});

test('verified cross: shown only when the server says so, on friends list, friend profile and own profile', async () => {
  assert.match(aura, /if\(friend\.verified===true\)view\.verified=true;/, 'kept when the friends list is cleaned');
  assert.match(aura, /function msbVerifiedHtml\(on\)\{return on===true\?/);
  assert.match(aura, /<strong>\$\{esc\(f\.name\|\|'Friend'\)\}<\/strong>\$\{msbVerifiedHtml\(f\.verified\)\}/);
  assert.match(aura, /<h1>\$\{esc\(name\)\}\$\{msbVerifiedHtml\(f\.verified\)\}<\/h1>/);
  assert.match(aura, /msbVerifiedHtml\(\(msbFriendsId\(\)\|\|\{\}\)\.verified\)/);
  const html = new Function(`${aura.split('\n').find(l => l.startsWith('function msbVerifiedHtml'))}\nreturn msbVerifiedHtml;`)();
  assert.match(html(true), /msb-verified/);
  for (const v of [false, undefined, 'true', 1]) assert.equal(html(v), '');
  /* own flag comes from the sync reply and is cleared when the server stops sending it */
  const h = harness({ code: 'MSB-AAAAAA', secret: 's' });
  h.calls.length = 0;
  const sync = new Function('MSB_FRIENDS_KEY', 'localStorage', 'msbFriendsId', 'msbFriendsPublicProfile', 'msbFriendsStats', 'msbStore', 'msbPublicImage', 'msbFriendsCall', 'toast', `const msbDenomPending = () => '';\n${src}\nreturn msbFriendsSync;`);
  const ls = new Map([['msb_friends_id', JSON.stringify({ code: 'MSB-AAAAAA', secret: 's' })]]);
  let reply = { ok: true, verified: true };
  const run = sync('msb_friends_id', { getItem: k => ls.get(k) ?? null, setItem: (k, v) => ls.set(k, v) }, () => JSON.parse(ls.get('msb_friends_id')), () => ({}), () => ({}), () => ({ profile: {} }), () => '', async () => reply, () => {});
  await run();
  assert.equal(JSON.parse(ls.get('msb_friends_id')).verified, true);
  reply = { ok: true };
  await run();
  assert.equal('verified' in JSON.parse(ls.get('msb_friends_id')), false);
});
