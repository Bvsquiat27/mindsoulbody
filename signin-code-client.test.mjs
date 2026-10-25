import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';

const aura = readFileSync(new URL('./aura.js', import.meta.url), 'utf8');
const i18n = readFileSync(new URL('./i18n.js', import.meta.url), 'utf8');

test('the welcome screen offers a sign-in code in English and Spanish', () => {
  assert.match(aura, /data-action="signin-code">\$\{msbEs\(\)\?'¿Tienes un código para entrar\?':'Got a sign-in code\?'\}/);
});

test('a phone with no saved password goes straight to the sign-in code screen', () => {
  assert.ok(aura.includes("if(kind==='signin'){if(msbNoLocalPassword())return showDialog('signin-code');"));
  assert.ok(aura.includes("if(kind==='signin'){if(msbNoLocalPassword()){showDialog('signin-code');return}"));
});

test('the old no-password message now points to the sign-in code', () => {
  assert.equal(aura.includes('No password is saved on this device yet. Create an account first.'), false);
  assert.ok(aura.includes('Tap Got a sign-in code? to get back in'));
  assert.ok(i18n.includes('"This phone does not have your account yet. Tap Got a sign-in code? to get back in, or create an account."'));
});

test('sign-in codes are cleaned the same way as the server', () => {
  const src = aura.match(/function msbSigninCodeClean\(value\)\{[^\n]*?\}(?=\nfunction|\n)/)[0];
  const clean = new Function(`${src}; return msbSigninCodeClean;`)();
  assert.equal(clean('abcd-ef23'), 'ABCDEF23');
  assert.equal(clean('ABCD EF2O'), '');
  assert.equal(clean('ABC'), '');
});

test('the code alone signs in: no password field, and the phone is marked as a code sign-in', () => {
  const dlg = aura.slice(aura.indexOf('function msbSigninCodeDialog'), aura.indexOf('async function msbSigninCodeSubmit'));
  assert.equal(dlg.includes('new_password'), false);
  assert.ok(dlg.includes('signin-code-input'));
  const body = aura.slice(aura.indexOf('async function msbSigninCodeSubmit'), aura.indexOf('async function msbSigninCodeSubmit') + 4000);
  assert.equal(body.includes('pw.length'), false);
  assert.ok(body.includes('store.codeSignin=true'));
  assert.ok(body.includes('restored:true'));
  assert.ok(body.includes('msbFriendsSync()'));
});

test('a code sign-in stays signed in and can add a password later, never required', () => {
  assert.ok(aura.includes("(store.passwordHash||store.codeSignin===true)&&p.registered"));
  assert.ok(aura.includes("if(!store.password&&!store.passwordHash&&store.codeSignin!==true){store.signedOut=true"));
  assert.ok(aura.includes("Add a password for this phone','Agrega una contraseña para este teléfono'"));
  assert.ok(aura.includes('${msbAddPasswordHtml()}${msbAccountKeyHtml()}'));
  assert.ok(aura.includes("if(!(store.codeSignin===true&&!store.passwordHash)&&!await msbPasswordMatches"));
});

const line = (start) => aura.split('\n').find((l) => l.startsWith(start));
function codeEnv(store, friendsId, call) {
  const ls = new Map(friendsId ? [['msb_friends_id', JSON.stringify(friendsId)]] : []), calls = [];
  const env = {
    MSB_LOCAL: true, MSB_FRIENDS_KEY: 'msb_friends_id', MSB_DELETE_LOCAL_KEYS: ['msb_friends_id', 'msb_friends_list'],
    state: { token: 'local', user: { id: 'local' }, profile: {} },
    localStorage: { getItem: (k) => ls.get(k) ?? null, setItem: (k, v) => ls.set(k, String(v)), removeItem: (k) => ls.delete(k) },
    msbStore: () => store, msbSave: () => {}, msbEs: () => false, navigator: { onLine: true },
    msbFriendsId: () => (ls.has('msb_friends_id') ? JSON.parse(ls.get('msb_friends_id')) : null),
    msbFriendsCall: async (path, body) => { calls.push({ path, body }); return call(path, body); },
    closeDialog: () => {}, loadAccount: async () => {}, nav: () => {}, toast: () => {}, msbFriendsFetch: async () => {}, msbFriendsSync: async () => {}
  };
  const src = ['function msbSigninCodeClean(', 'async function msbSigninCodeSubmit(', 'function msbNoLocalPassword(', 'function msbCodeSigninNoPassword(', 'function msbCodeSigninForget('].map(line).join('\n');
  const fns = new Function(...Object.keys(env), `${src}\nreturn {msbSigninCodeSubmit,msbNoLocalPassword,msbCodeSigninNoPassword,msbCodeSigninForget};`)(...Object.values(env));
  return { ...fns, env, ls, calls };
}
const form = (v) => ({ get: () => v });
const redeemed = (code) => () => ({ ok: true, code, secret: 'c'.repeat(32), publicId: 'p1', profile: { name: 'Test' } });

test('Delete account on a code-only phone clears the code sign-in and signs the phone out', () => {
  const store = { codeSignin: true, profile: { registered: true, id: 'local' }, signedOut: false };
  const h = codeEnv(store, null, () => ({}));
  h.msbCodeSigninForget();
  assert.equal('codeSignin' in store, false);
  assert.equal(store.signedOut, true);
  assert.equal(store.profile.registered, false);
  assert.equal(h.env.state.user, null);
  const withPw = { codeSignin: true, passwordHash: 'x', profile: { registered: true } };
  codeEnv(withPw, null, () => ({})).msbCodeSigninForget();
  assert.equal('codeSignin' in withPw, false);
  assert.equal(withPw.profile.registered, true);
  assert.ok(line('async function msbDeleteAccount(').includes('msbCodeSigninForget();toast('));
});

test('a code-only phone that lost its friend key goes to the sign-in code screen, not a password form', () => {
  const store = { codeSignin: true, profile: {} };
  assert.equal(codeEnv(store, null, () => ({})).msbNoLocalPassword(), true);
  assert.equal(codeEnv(store, { code: 'MSB-ABC234', secret: 'a'.repeat(32) }, () => ({})).msbNoLocalPassword(), false);
  assert.equal(codeEnv({ passwordHash: 'x', profile: {} }, null, () => ({})).msbNoLocalPassword(), false);
});

test('a sign-in code asks before it replaces a different friend account on this phone', async () => {
  const store = { profile: {} };
  const h = codeEnv(store, { code: 'MSB-OLD234', secret: 'a'.repeat(32) }, redeemed('MSB-NEW234'));
  await assert.rejects(h.msbSigninCodeSubmit(form('abcd-ef23')), /already uses friend code MSB-OLD234[^]*Tap Sign in again/);
  assert.equal(h.calls.length, 0);
  assert.equal(JSON.parse(h.ls.get('msb_friends_id')).code, 'MSB-OLD234');
  await h.msbSigninCodeSubmit(form('ABCDEF23'));
  assert.equal(h.calls.length, 1);
  assert.equal(JSON.parse(h.ls.get('msb_friends_id')).code, 'MSB-NEW234');
  assert.equal(store.codeSignin, true);
  const fresh = codeEnv({ profile: {} }, null, redeemed('MSB-NEW234'));
  await fresh.msbSigninCodeSubmit(form('ABCDEF23'));
  assert.equal(fresh.calls.length, 1);
});

test('New recovery code and Change password wait until a code-only phone has a password', () => {
  assert.ok(aura.includes("${state.user&&p.registered?(msbCodeSigninNoPassword()?'':'<button class=\"secondary\" data-action=\"change-password\">"));
  assert.ok(aura.includes("if((kind==='change-password'||kind==='recovery-code')&&msbCodeSigninNoPassword())return showDialog('add-password');"));
});

test('Add a password sets up a username, email and recovery code like a new account', () => {
  const route = aura.slice(aura.indexOf("if(clean==='/auth/add-password')"), aura.indexOf("if(clean==='/auth/password')"));
  for (const bit of ['store.recoveryHash=await msbDigest(recovery)', 'delete store.codeSignin', 'Object.assign(p,{handle,email,registered:true', 'return{recovery_code:recovery}', "if(!email.includes('@'))", '/^[a-zA-Z0-9_]{3,24}$/.test(handle)']) assert.ok(route.includes(bit), bit);
  const submit = line("if(kind==='add-password'){const result=");
  assert.ok(submit.includes("api('/auth/add-password'") && submit.includes('showRecovery(result.recovery_code)'));
  const dlg = line("if(kind==='add-password'){const t=");
  for (const name of ["'handle','text'", "'email','email'", "'new_password','password'"]) assert.ok(dlg.includes(name), name);
  const card = line('function msbAddPasswordHtml(');
  assert.ok(card.includes('pick a username and password') && card.includes('recovery code'));
  assert.equal(card.includes('sign in with your username here'), false);
  for (const s of ['This phone already has a password. Use Change password instead.', 'The password was not saved. Try again.']) assert.ok(i18n.includes(`"${s}"`), s);
});

test('the password reset screens offer the sign-in code, and say so on a phone without a password', () => {
  for (const kind of ['forgot', 'recovery-reset', 'email-code']) {
    const l = aura.split('\n').find((x) => x.startsWith(`if(kind==='${kind}')`) && x.includes('dialog('));
    assert.ok(l.includes('data-action="signin-code"'), kind);
  }
  assert.ok(aura.includes("if(clean==='/auth/email-reset'||clean==='/auth/reset'){if(!store.passwordHash)throw Error('This phone does not have your account yet. Tap Got a sign-in code?"));
});
