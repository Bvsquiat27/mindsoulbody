/* Fixes from the Oct 21 audit: contrast in Light/Sepia, Spanish trivia,
   backup without sign-in, the lamp's Go button, RV1909 drop caps, the DM
   verse attribute, PBKDF2 passwords, no remote pictures, offline fonts,
   dialog focus, the read log on an empty chapter, and the lazy library. */
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { createRequire } from 'node:module';
import vm from 'node:vm';
const require = createRequire(import.meta.url);
const read = (p) => readFileSync(new URL(p, import.meta.url), 'utf8');
const aura = read('aura.js'), sw = read('sw.js'), html = read('index.html');

/* Pull top-level declarations out of aura.js by name. A one-line function
   is its own line; a multi-line one runs to the next line that is just "}". */
function pick(src, names) {
  const lines = src.split('\n'), out = [];
  for (const name of names) {
    const i = lines.findIndex((l) => new RegExp(`^(?:async )?function ${name}\\(|^const ${name}=`).test(l));
    assert.ok(i >= 0, `aura.js declares ${name}`);
    if (/\{\s*$/.test(lines[i]) && !lines[i].trim().endsWith('}')) { let j = i; while (lines[j] !== '}') j += 1; out.push(lines.slice(i, j + 1).join('\n')); }
    else out.push(lines[i]);
  }
  return out.join('\n');
}
function fakeStorage(init = {}) {
  const m = new Map(Object.entries(init));
  return { get length() { return m.size; }, key: (i) => [...m.keys()][i] ?? null, getItem: (k) => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, String(v)), removeItem: (k) => m.delete(k), _m: m };
}

/* ---- 1. contrast ---- */
test('audited rules use theme variables, not hard-coded dark colors', () => {
  const kg = read('kidgames.css'), au = read('aura.css'), sd = read('study-design.css');
  assert.match(kg, /\.kg-ws-cell\{[^}]*background:var\(--surface2\);color:var\(--text\)/);
  assert.match(kg, /\.kg-or-card\{[^}]*background:var\(--surface\);color:var\(--text\)/);
  assert.match(kg, /\.kg-lead\{[^}]*color:var\(--muted\)/);
  assert.match(au, /\.choice\{[^}]*color:var\(--text\)/);
  assert.match(au, /\.text-input\{[^}]*background:var\(--app-input,var\(--surface\)\)/);
  assert.doesNotMatch(au + kg + sd, /var\(--card[,)]/, 'no use of the undefined --card');
  assert.match(sd, /\.sq-sheet \.sq-card\{[^}]*color:var\(--text\)/, 'squishy lesson card follows the theme');
  for (const bad of ['#1f2e30', '#172324', '#cfdad7', '#d8e1db', '#1d2f35']) assert.ok(!(au + kg).includes(bad), `${bad} is gone`);
});
test('light and sepia text colors keep 4.5:1 on their surfaces', () => {
  const sd = read('study-design.css');
  const lum = (h) => { const n = h.replace('#', ''); const [r, g, b] = [0, 2, 4].map((i) => parseInt(n.slice(i, i + 2), 16) / 255).map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4)); return 0.2126 * r + 0.7152 * g + 0.0722 * b; };
  const ratio = (a, b) => { const x = lum(a), y = lum(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); };
  for (const theme of ['light', 'sepia']) {
    const block = sd.match(new RegExp(`:root\\[data-theme="${theme}"\\]\\{color-scheme:light;([^}]*)\\}`))[1];
    const v = Object.fromEntries(block.split(';').map((d) => d.split(':')).filter((d) => d.length === 2).map(([k, x]) => [k.trim(), x.trim()]));
    for (const fg of ['--text', '--muted', '--teal', '--gold']) for (const bg of ['--bg', '--surface', '--surface2']) assert.ok(ratio(v[fg].slice(0, 7), v[bg].slice(0, 7)) >= 4.5, `${theme} ${fg} on ${bg}`);
  }
});
test('found word-search letters are dark on every color', () => {
  assert.match(read('kidgames.css'), /\.kg-ws-cell\.found\{color:#111\}/);
});

/* ---- 2. Spanish trivia ---- */
test('every trivia card has Spanish text with matching choices', () => {
  const t = JSON.parse(read('data/trivia.json'));
  for (const q of t.jeopardy) {
    for (const k of ['promptEs', 'categoryEs', 'answerFormEs', 'referenceEs']) assert.ok(typeof q[k] === 'string' && q[k].trim(), `${q.id} ${k}`);
    assert.equal(q.choicesEs.length, q.choices.length, q.id);
    assert.match(q.answerFormEs, /^¿/);
  }
  for (const q of t.answerBoard) { assert.ok(q.promptEs && q.referenceEs, q.id); assert.equal(q.choicesEs.length, q.choices.length, q.id); }
  const all = JSON.stringify(t.jeopardy.map((q) => [q.promptEs, q.choicesEs]).concat(t.answerBoard.map((q) => [q.promptEs, q.choicesEs])));
  for (const name of ['Rachêl', 'Beth-el', 'Sichêm', 'Emmaús', 'Tomás', 'Jonás']) assert.ok(all.includes(name), `RV1909 spelling ${name}`);
  assert.doesNotMatch(all, /\b(usted|ustedes)\b/i, 'tú form');
});
test('the trivia boards render Spanish fields and no hard-coded English count', () => {
  const g = read('trivia-game.js');
  assert.doesNotMatch(g, /\.length\} choices</);
  assert.match(g, /'opción':'opciones'/);
  for (const k of ['prompt', 'choices', 'category', 'answerForm', 'reference']) assert.match(g, new RegExp(`pick\\(q,'${k}'\\)`));
});

/* ---- 3. backup without sign-in ---- */
function backupSandbox(storage) {
  const ctx = { localStorage: storage, JSON, Object, String, Date, Array };
  vm.createContext(ctx);
  vm.runInContext(pick(aura, ['MSB_BACKUP_PREFIXES', 'msbIsAppKey', 'MSB_STORE_KEY', 'MSB_BACKUP_SKIP_KEYS', 'MSB_BACKUP_SKIP_FIELDS', 'msbBackupSkipKey', 'msbBackupStripStore', 'msbCollectBackup', 'msbApplyBackup']) + '\nthis.collect=msbCollectBackup;this.apply=msbApplyBackup;', ctx);
  return ctx;
}
test('export leaves out tokens, the friends secret and password hashes', () => {
  const store = { profile: { name: 'A', registered: true }, notes: [{ study_id: 'word', body: 'hi' }], passwordHash: 'h', passwordSalt: 's', passwordAlgo: 'pbkdf2-sha256', passwordIterations: 210000, recoveryHash: 'r', emailCodeHash: 'e', emailCodeExpires: 1 };
  const ctx = backupSandbox(fakeStorage({ msb_local_v1: JSON.stringify(store), aura_token: 'T', ic_token: 'T2', msb_friends_id: JSON.stringify({ code: 'ABC', secret: 'S3CRET' }), msb_theme: 'light', msb_friends_list: '[]' }));
  const data = ctx.collect(), text = JSON.stringify(data);
  assert.equal(data.signIn, false);
  for (const k of ['aura_token', 'ic_token', 'msb_friends_id']) assert.ok(!(k in data.keys), k);
  for (const s of ['S3CRET', 'passwordHash', 'passwordSalt', 'recoveryHash', 'emailCodeHash']) assert.ok(!text.includes(s), s);
  assert.equal(JSON.parse(data.keys.msb_local_v1).notes[0].body, 'hi');
  assert.equal(data.keys.msb_theme, 'light');
});
test('restoring keeps this device’s own sign-in and ignores credentials in old backups', () => {
  const here = { profile: { name: 'Me', registered: true }, passwordHash: 'mine', passwordSalt: 'salt', passwordAlgo: 'pbkdf2-sha256', signedOut: false, notes: [] };
  const storage = fakeStorage({ msb_local_v1: JSON.stringify(here), aura_token: 'mine', msb_friends_id: JSON.stringify({ code: 'ME', secret: 'mysecret' }), msb_old: 'x' });
  const ctx = backupSandbox(storage);
  ctx.apply({ keys: { msb_local_v1: JSON.stringify({ profile: { name: 'Old' }, passwordHash: 'theirs', passwordSalt: 'x', notes: [{ study_id: 'a', body: 'n' }] }), aura_token: 'theirs', msb_friends_id: JSON.stringify({ code: 'THEM', secret: 'theirs' }) } });
  const after = JSON.parse(storage.getItem('msb_local_v1'));
  assert.equal(after.passwordHash, 'mine');
  assert.equal(after.passwordSalt, 'salt');
  assert.equal(after.notes[0].body, 'n');
  assert.equal(after.profile.registered, true);
  assert.equal(storage.getItem('aura_token'), 'mine');
  assert.match(storage.getItem('msb_friends_id'), /mysecret/);
  assert.equal(storage.getItem('msb_old'), null, 'other app data is replaced as before');
});
test('the backup card says sign-in is not included, in English and Spanish', () => {
  assert.match(aura, /The backup does not include sign-in/);
  assert.match(read('i18n.js'), /"The backup does not include sign-in: [^"]*": "La copia de seguridad no incluye tu inicio de sesión/);
});

/* ---- 4. the lamp ---- */
test('the lamp is named La lámpara de la Luz del mundo', () => {
  const { SQUISHIES } = require('./squishy-data.js');
  assert.equal(SQUISHIES.find((s) => s.id === 'lamp').name.es, 'La lámpara de la Luz del mundo');
  assert.doesNotMatch(read('squishy-data.js'), /"Lámpara de la luz"/);
});
test('the lamp lists what is left, and its Go buttons point to the next squishy and Manna Match', () => {
  const C = require('./squishy-core.js'), { SQUISHIES } = require('./squishy-data.js');
  const ch = C.challengeFor('lamp');
  const others = SQUISHIES.filter((x) => x.id !== 'lamp' && x.locked).map((x) => x.id);
  const ctx = { squishies: SQUISHIES, unlocked: others.slice(1), match: { 1: 2 }, stats: { badges: {} }, gifts: [], away: [] };
  const left = C.finalLeft(ch, ctx);
  assert.deepEqual(left.locked, [others[0]]);
  assert.equal(left.three, false);
  assert.deepEqual(C.challengeProgress(ch, ctx), { have: others.length - 1, need: others.length + 1, done: false });
  const done = C.finalLeft(ch, { ...ctx, unlocked: others, match: { 3: 3 } });
  assert.deepEqual(done, { others: others.length, locked: [], three: true });
  const sq = read('squishy.js');
  assert.match(sq, /case 'final': \{[\s\S]*?data-sq-go-locked=[\s\S]*?data-sq-go-match/);
  assert.match(sq, /const goLocked = t\.closest\('\[data-sq-go-locked\]'\)/);
  assert.match(sq, /function finalLeftHtml\(ch\)/);
  for (const k of ['Next: {name}', 'Still locked ({n}): {names}', 'Still to do: 3 stars on a Manna Match level']) assert.ok(read('i18n.js').includes(`"${k}":`), k);
});

/* ---- 5. RV1909 drop caps ---- */
test('sentence case for drop caps, with names and inscriptions kept', () => {
  const R = require('./rv-case.js');
  const cases = [['EN el principio crió Dios', 'En el principio crió Dios'], ['Y DESPUÉS de esto', 'Y después de esto'], ['DE SIETE años era Joas', 'De siete años era Joas'], ['¿POR qué se amotinan', '¿Por qué se amotinan'], ['Y JACOB dijo', 'Y Jacob dijo'], ['JEHOVÁ es mi pastor', 'Jehová es mi pastor'], ['PABLO, siervo', 'Pablo, siervo'], ['Y Á SUS discípulos dice', 'Y á sus discípulos dice'], ['JAH, si mirares', 'JAH, si mirares'], ['TEKEL: Pesado', 'TEKEL: Pesado'], ['REY DE REYES Y SEÑOR DE SEÑORES.', 'REY DE REYES Y SEÑOR DE SEÑORES.']];
  for (const [a, b] of cases) assert.equal(R.fixStart(a), b);
  assert.equal(R.fixText('el día sexto. ESTE es el libro. es CRISTO el Señor. MENE, MENE, TEKEL, UPHARSIN.'), 'el día sexto. Este es el libro. es CRISTO el Señor. MENE, MENE, TEKEL, UPHARSIN.');
});
test('no RV1909 chapter opens with a printed drop cap, and JEHOVÁ stays where it is meant', () => {
  let chapters = 0, caps = 0, keptJehova = 0;
  for (const f of readdirSync(new URL('./bible/rvr/', import.meta.url)).filter((n) => /^\d\d\.json$/.test(n))) {
    const d = JSON.parse(read(`./bible/rvr/${f}`));
    for (const ch of d.chapters) {
      chapters += 1;
      ch.forEach((v, i) => { if (/^[¿¡(«“]*(?:[A-ZÁÉÍÓÚÑÜÂÊÎÔÛ] )*[A-ZÁÉÍÓÚÑÜÂÊÎÔÛ]{2,}\b/.test(v) && !/^(JAH|TEKEL|PERES)\b/.test(v)) caps += 1; keptJehova += (v.match(/JEHOVÁ/g) || []).length; void i; });
    }
  }
  assert.ok(chapters > 1100);
  assert.equal(caps, 0);
  assert.ok(keptJehova >= 10, 'inscriptions such as JEHOVÁ, JUSTICIA NUESTRA keep their capitals');
  assert.equal(JSON.parse(read('./bible/rvr/01.json')).chapters[0][0].slice(0, 15), 'En el principio');
});
test('lesson and game copies are already in sentence case', () => {
  const out = execFileSync(process.execPath, ['scripts/rv-sentence-case.mjs', '--check'], { cwd: new URL('.', import.meta.url) }).toString();
  assert.match(out, /would change 0 strings/);
  assert.match(read('bible-reader.js'), /window\.MsbRvCase\.fixStart\(verse\)/, 'older cached books are fixed when shown');
});

/* ---- 6. DM verse attribute ---- */
test('a DM verse card escapes its book, chapter and verse', () => {
  const dm = read('dm.js');
  assert.match(dm, /data-dm-verse="\$\{esc\(book\)\}:\$\{esc\(chapter\)\}:\$\{verse > 0 \? esc\(verse\) : ''\}"/);
  assert.match(dm, /const book = Math\.floor\(Number\(it\.book\)\) \|\| 0/);
});

/* ---- 7. PBKDF2 ---- */
function authSandbox() {
  const ctx = { crypto: globalThis.crypto, TextEncoder, Uint8Array, Error, String, Number, Math, parseInt };
  vm.createContext(ctx);
  vm.runInContext(pick(aura, ['msbHex', 'msbRandomSalt', 'msbDigest', 'MSB_PBKDF2_ITERATIONS', 'msbPbkdf2', 'msbSetPassword', 'msbPasswordLegacy', 'msbPasswordMatches']) + '\nthis.api={msbSetPassword,msbPasswordMatches,msbPasswordLegacy,msbDigest,MSB_PBKDF2_ITERATIONS};', ctx);
  return ctx.api;
}
test('new passwords use PBKDF2-SHA-256 with at least 100,000 iterations', async () => {
  const A = authSandbox(), store = {};
  await A.msbSetPassword(store, 'correct horse battery');
  assert.equal(store.passwordAlgo, 'pbkdf2-sha256');
  assert.ok(store.passwordIterations >= 100000);
  assert.match(store.passwordHash, /^[0-9a-f]{64}$/);
  assert.equal(await A.msbPasswordMatches(store, 'correct horse battery'), true);
  assert.equal(await A.msbPasswordMatches(store, 'wrong password!'), false);
});
test('an old SHA-256 hash still signs in, and the sign-in upgrades it', async () => {
  const A = authSandbox();
  const old = { passwordSalt: 'ab'.repeat(16) };
  old.passwordHash = await A.msbDigest(old.passwordSalt + ':' + 'old password 1');
  assert.equal(A.msbPasswordLegacy(old), true);
  assert.equal(await A.msbPasswordMatches(old, 'old password 1'), true);
  assert.match(aura, /if\(!await msbPasswordMatches\(store,body\?\.password\)\)throw Error\('That password does not match this device profile\.'\);if\(msbPasswordLegacy\(store\)\|\|Number\(store\.passwordIterations\)<MSB_PBKDF2_ITERATIONS\)await msbSetPassword\(store,body\?\.password\);/);
});

/* ---- 8. no remote pictures ---- */
test('friend and profile pictures accept only data: images, matching the CSP', () => {
  const ctx = { esc: (s) => String(s) }; vm.createContext(ctx);
  vm.runInContext(pick(aura, ['safeImageSrc', 'msbPublicImage']) + '\nthis.a=safeImageSrc;this.b=msbPublicImage;', ctx);
  assert.equal(ctx.a('https://evil.example/pixel.png'), '');
  assert.equal(ctx.b('https://evil.example/pixel.png'), '');
  assert.equal(ctx.a('data:image/png;base64,AAAA'), 'data:image/png;base64,AAAA');
  assert.doesNotMatch(read('bridge.js'), /https:\\\/\\\/\[\^\\s"'<>\]\+\$\/i\.test\(raw\)\) return raw/);
  assert.match(html, /img-src 'self' data: blob:;/);
});

/* ---- 9. offline fonts ---- */
test('Google Fonts are cached stale-while-revalidate across updates', () => {
  assert.match(sw, /const FONTS_CACHE = 'msb-fonts-1'/);
  assert.match(sw, /FONT_HOSTS = \['fonts\.googleapis\.com', 'fonts\.gstatic\.com'\]/);
  assert.match(sw, /if \(FONT_HOSTS\.includes\(url\.hostname\)[^\n]*\n\s*event\.respondWith\(googleFont\(event, request\)\)/);
  assert.match(sw, /kept = new Set\(\[[^\]]*FONTS_CACHE[^\]]*\]\)/);
  assert.ok(sw.indexOf('googleFont(event, request)') < sw.indexOf('if (url.origin !== self.location.origin) return;'));
});

/* ---- 10. dialogs ---- */
test('dialog focus is managed for every modal dialog', () => {
  const df = read('dialog-focus.js');
  assert.match(html, /<script src="dialog-focus\.js" defer><\/script>/);
  assert.match(sw, /'\.\/dialog-focus\.js'/);
  assert.match(df, /\[role="dialog"\]\[aria-modal="true"\]/);
  assert.match(df, /e\.key !== 'Tab'/);
  assert.match(df, /before\.focus\(/);
  assert.match(df, /new MutationObserver\(schedule\)/);
});

/* ---- 11. read log ---- */
test('an empty offline chapter has no Log as read button', () => {
  const br = read('bible-reader.js');
  assert.match(br, /const canLog = loggedHere \|\| verseCount > 0;/);
  assert.match(br, /\$\{canLog \? `<button class="secondary bible-log-btn/);
  assert.match(br, /if \(!logged && !currentVerses\(\)\.some\(text => String\(text \|\| ''\)\.trim\(\)\)\) \{ render\(\); break; \}/);
});

/* ---- 12. lazy library ---- */
test('boot reads the small study index; the full library waits for a study or search', () => {
  const idx = JSON.parse(read('data/study-index.json')), lib = JSON.parse(read('data/study-library.json'));
  assert.equal(idx.index, true);
  assert.deepEqual(idx.studies.map((s) => s.id), lib.studies.map((s) => s.id));
  for (const s of idx.studies) for (const k of ['passage', 'passageEs', 'quiz', 'quizEs', 'orthodox', 'orthodoxEs', 'questions', 'questionsEs']) assert.ok(!(k in s), `${s.id} has no ${k}`);
  for (const s of idx.studies) for (const k of ['title', 'reference', 'theme', 'context']) assert.ok(s[k], `${s.id} keeps ${k}`);
  assert.ok(read('data/study-index.json').length < 120000);
  execFileSync(process.execPath, ['scripts/build-study-index.mjs', '--check'], { cwd: new URL('.', import.meta.url) });
  assert.match(aura, /Promise\.all\(\[msbLibraryForBoot\(\),/);
  assert.match(aura, /if\(clean==='\/study\/library-index'\)/);
  assert.match(aura, /const MSB_FULL_LIBRARY_SCREENS=\['study','search'\]/);
  assert.match(sw, /'\.\/data\/study-index\.json'/);
  assert.match(sw, /'\.\/data\/study-library\.json'/, 'the full library is still precached for offline use');
  assert.match(sw, /'\.\/luz-data\.js'/, 'Lessons for Luz data is still precached with the shell (it loads when the section opens)');
});
