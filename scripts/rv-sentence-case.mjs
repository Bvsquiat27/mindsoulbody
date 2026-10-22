/* One-off (re-runnable) pass: RV1909 drop-cap first words -> sentence case.
   node scripts/rv-sentence-case.mjs [--check]
   Bible books: the start of every verse. Lesson and game copies: Spanish
   strings only, at the start and after each sentence end. See rv-case.js. */
import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const R = require('../rv-case.js');
const root = new URL('../', import.meta.url);
/* The push reminder text in worker/devotional-push-data.mjs is generated from
   devotional-data.js and must match it; it is sentence-cased the same way
   (the worker copy is fixed by the same rule, see devotional.test.mjs). */
const check = process.argv.includes('--check');
let changed = 0; const touched = [];
const write = (file, before, after) => { if (before === after) return; touched.push(file); if (!check) writeFileSync(new URL(file, root), after); };

for (const f of readdirSync(new URL('bible/rvr/', root)).filter((n) => /^\d\d\.json$/.test(n))) {
  const file = `bible/rvr/${f}`, raw = readFileSync(new URL(file, root), 'utf8'), d = JSON.parse(raw);
  d.chapters = d.chapters.map((ch) => ch.map((v) => { const n = R.fixStart(v); if (n !== v) changed += 1; return n; }));
  write(file, raw, JSON.stringify(d));
}
/* Spanish fields in the JSON copies */
const esKey = (k) => k === 'es' || k === 'rvr' || /Es$/.test(k);
function walk(node, spanish) {
  if (typeof node === 'string') { if (!spanish) return node; const n = R.fixText(node); if (n !== node) changed += 1; return n; }
  if (Array.isArray(node)) return node.map((x) => walk(x, spanish));
  if (node && typeof node === 'object') { for (const k of Object.keys(node)) node[k] = walk(node[k], spanish || esKey(k)); }
  return node;
}
for (const [file, indent] of [['data/study-library.json', 2], ['data/study-challenges.json', 2], ['data/game-bank.json', 2], ['data/offline-verses.json', 0], ['data/holy-spirit.json', 2]]) {
  const raw = readFileSync(new URL(file, root), 'utf8'), d = walk(JSON.parse(raw), false);
  const out = indent ? JSON.stringify(d, null, indent) + (raw.endsWith('\n') ? '\n' : '') : JSON.stringify(d);
  write(file, raw, out);
}
/* JS data files: string literals in Spanish fields ("es": "...", textEs: '...') */
const JS = ['kidgames-data.js', 'devotional-data.js', 'luz-data.js', 'match3-data.js', 'squishy-data.js', 'stories.js', 'moments.js', 'love.js', 'memory.js'];
const lit = /((?:"(?:es|rvr|[A-Za-z]*Es)"|\b(?:es|rvr|[A-Za-z]*Es))\s*:\s*)"((?:[^"\\\n]|\\.)*)"/g;
for (const file of JS) {
  let raw; try { raw = readFileSync(new URL(file, root), 'utf8'); } catch { continue; }
  const out = raw.replace(lit, (all, head, body) => { const n = R.fixText(body); if (n !== body) changed += 1; return `${head}"${n}"`; });
  write(file, raw, out);
}
/* devotional-data.js keeps RV1909 verses in "verses": [...] arrays under Spanish entries */
{
  const file = 'devotional-data.js', raw = readFileSync(new URL(file, root), 'utf8');
  const out = raw.replace(/^"((?:[^"\\\n]|\\.)*)"(,?)$/gm, (all, body, comma) => { if (!/[áéíóúñ¿¡]|\bá\b|Jehová|Dios/.test(body)) return all; const n = R.fixText(body); if (n !== body) changed += 1; return `"${n}"${comma}`; });
  write(file, raw, out);
}
console.log(`${check ? 'would change' : 'changed'} ${changed} strings in ${touched.length} files`);
if (check && changed) process.exit(1);
