import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { dayNumber, hideCount, hiddenWordIndexes, tokenize, wordsMatch } = require('./memory-schedule.js');
const read = (path) => readFileSync(path, 'utf8');
const verse = 'The LORD is my shepherd; I shall not want.';

test('day 1 shows the whole verse and later days only add blanks', () => {
  assert.equal(dayNumber('2026-03-01', '2026-03-01'), 1);
  assert.equal(dayNumber('2026-03-01', '2026-03-02'), 2);
  assert.equal(dayNumber('2026-01-31', '2026-02-01'), 2);
  assert.equal(dayNumber('2026-03-05', '2026-03-01'), 1);
  const words = tokenize(verse).filter(token => token.word).length;
  assert.equal(hideCount(words, 1), 0);
  assert.equal(hideCount(words, 6), words);
  const days = [1, 2, 3, 4, 5, 6, 9].map(day => new Set(hiddenWordIndexes(verse, day, 'psalm-23')));
  assert.equal(days[0].size, 0);
  for (let i = 1; i < days.length; i += 1) {
    for (const index of days[i - 1]) assert.equal(days[i].has(index), true);
    assert.equal(days[i].size >= days[i - 1].size, true);
  }
  assert.equal(days[5].size, words);
  assert.equal(days[6].size, words);
});

test('typed answers match without caring about case or side punctuation', () => {
  assert.equal(wordsMatch('shepherd;', 'Shepherd'), true);
  assert.equal(wordsMatch('señor', 'Señor'), true);
  assert.equal(wordsMatch('love', 'loved'), false);
  assert.equal(wordsMatch('  ', 'word'), false);
});

test('memory verses stay on this device and in the backup', () => {
  const memory = read('memory.js');
  const aura = read('aura.js');
  const sw = read('sw.js');
  assert.match(memory, /msb_memory_verses/);
  assert.equal(memory.includes('/api/'), false);
  assert.match(aura, /MSB_BACKUP_PREFIXES=\['msb_'/);
  assert.match(sw, /memory\.js/);
  assert.match(sw, /memory-schedule\.js/);
});
