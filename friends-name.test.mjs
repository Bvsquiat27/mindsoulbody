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
    msbFriendsCall: async (path, body) => { calls.push({ path, body }); return { ok: true }; }, toast: () => {}
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
