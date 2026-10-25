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
