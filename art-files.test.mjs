import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { createHash } from 'node:crypto';

/* sw.js keeps art in a persistent cache and only fetches names it has not seen,
   so changed art must ship under a new file name. */
test('art files are never edited in place', () => {
  const known = JSON.parse(readFileSync('img/art-hashes.json', 'utf8'));
  for (const dir of ['stories', 'coloring', 'sling', 'map', 'room']) {
    for (const name of readdirSync(`img/${dir}`)) {
      if (name.endsWith('.md')) continue;
      const path = `img/${dir}/${name}`;
      const sum = createHash('sha256').update(readFileSync(path)).digest('hex');
      assert.ok(known[path], `${path} is new: add it to img/art-hashes.json`);
      assert.equal(sum, known[path], `${path} changed under the same name; give the new art a new file name`);
    }
  }
  const sw = readFileSync('sw.js', 'utf8');
  assert.match(sw, /never edited in place/);
});
