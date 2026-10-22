/* data/study-index.json: the small part of data/study-library.json the first
   screen needs (titles, references, themes, the short context and practice).
   The full library (passages, quizzes, the closer look, questions) loads
   only when a study is opened or searched. Re-run after editing the library:
   node scripts/build-study-index.mjs   (add --check to only compare) */
import { readFileSync, writeFileSync } from 'node:fs';
export const HEAVY = ['passage', 'passageEs', 'quiz', 'quizEs', 'orthodox', 'orthodoxEs', 'questions', 'questionsEs'];
export function buildIndex(library) {
  return { index: true, note: 'Generated from study-library.json by scripts/build-study-index.mjs. Do not edit by hand.', studies: (library.studies || []).map((s) => Object.fromEntries(Object.entries(s).filter(([k]) => !HEAVY.includes(k)))) };
}
if (import.meta.url === `file://${process.argv[1]}`) {
  const root = new URL('../', import.meta.url);
  const lib = JSON.parse(readFileSync(new URL('data/study-library.json', root), 'utf8'));
  const out = JSON.stringify(buildIndex(lib));
  const file = new URL('data/study-index.json', root);
  if (process.argv.includes('--check')) { let have = ''; try { have = readFileSync(file, 'utf8'); } catch {} if (have !== out) { console.error('data/study-index.json is out of date'); process.exit(1); } console.log('study-index.json is current'); }
  else { writeFileSync(file, out); console.log(`wrote data/study-index.json (${out.length} bytes)`); }
}
