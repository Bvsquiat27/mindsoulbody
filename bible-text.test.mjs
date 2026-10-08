import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';

const read = (path) => readFileSync(path, 'utf8');
const book = (id) => JSON.parse(read(`bible/${String(id).padStart(2, '0')}.json`));

test('Song of Solomon 5:9 includes the repeated line', () => {
  const chapter = book(22).chapters[4];
  assert.equal(chapter[7], 'I charge you, O daughters of Jerusalem, If ye find my beloved, That ye tell him, that I am sick of love.');
  assert.equal(chapter[8], 'What is thy beloved more than another beloved, O thou fairest among women? What is thy beloved more than another beloved, That thou dost so charge us?');
  assert.equal(chapter[9], 'My beloved is white and ruddy, The chiefest among ten thousand.');
});

test('apocrypha pronunciation marks are removed without stripping real hyphens', () => {
  const acute = '\u00B4';
  for (const id of [67, 68, 70, 71, 72, 73, 74, 75, 76, 77, 78]) {
    assert.equal(read(`bible/${String(id).padStart(2, '0')}.json`).includes(acute), false, `book ${id} still has a pronunciation mark`);
  }
  assert.match(book(68).chapters.flat().join('\n'), /Holofernes/);
  assert.match(book(76).chapters.flat().join('\n'), /Antiochus/);
  assert.match(book(76).chapters.flat().join('\n'), /Maccabeus/);
  assert.match(book(76).chapters.flat().join('\n'), /strong-holds/);
  assert.match(book(67).chapters.flat().join('\n'), /daughter-in-law/);
});

test('epistle subscriptions sit outside the last verse', () => {
  const index = JSON.parse(read('bible/index.json'));
  const romans = index.books.find((item) => item.name === 'Romans');
  const last = book(45).chapters.at(-1).at(-1);
  assert.equal(last.endsWith('Amen.'), true);
  assert.equal(last.includes('Written to the Romans'), false);
  assert.equal(romans.subscription, 'Written to the Romans from Corinthus, and sent by Phebe servant of the church at Cenchrea.');
  for (let id = 45; id <= 58; id += 1) {
    const info = index.books.find((item) => item.id === id);
    const verse = book(id).chapters.at(-1).at(-1);
    assert.equal(verse.includes(info.subscription), false, info.name);
    assert.match(info.subscription, /written/i);
  }
});

test('Wisdom 2:23 game answer matches the verse', () => {
  assert.match(book(69).chapters[1][22], /immortal/);
  const bank = JSON.parse(read('data/game-bank.json'));
  const rows = Object.values(bank.millionaire || {}).flat();
  const item = rows.find((row) => row && row.reference === 'Wisdom of Solomon 2:23');
  assert.equal(item.answer, 'immortal');
  assert.equal(item.choices.includes('immortal'), true);
  assert.equal(item.choices.includes('Incorruption'), false);
});

test('Rest of Esther chapter 10 is labeled from verse 4', () => {
  const esther = book(78);
  assert.equal(esther.chapters[9].length, 10);
  assert.match(read('study-tools.js'), /book\.id === 78 && chapter === 10 \? verseIndex \+ 4 : verseIndex \+ 1/);
});

test('service worker refreshes Bible caches and only deletes this app', () => {
  const sw = read('sw.js');
  assert.match(sw, /const CACHE_VERSION = 'v76'/);
  assert.match(sw, /const BIBLE_DATA_VERSION = 'kjv-2'/);
  assert.match(sw, /const RVR_DATA_VERSION = 'rvr1909-2'/);
  assert.match(sw, /function freshOrCached/);
  assert.match(sw, /k\.startsWith\(APP_CACHE_PREFIX\) && !kept\.has\(k\)/);
});
