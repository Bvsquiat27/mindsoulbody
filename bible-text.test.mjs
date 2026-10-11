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

const rvr = (id) => JSON.parse(read(`bible/rvr/${String(id).padStart(2, '0')}.json`));
const at = (id, chapter, verse) => rvr(id).chapters[chapter - 1][verse - 1];

test('RV1909 word fixes stay inside the listed words', () => {
  assert.match(at(2, 20, 21), /obscuridad/);
  assert.equal(at(2, 20, 21).includes('osbcuridad'), false);
  assert.match(at(2, 20, 21), /á la/);
  assert.match(at(13, 2, 39), /engendró/);
  assert.match(at(13, 2, 39), /y Heles engendró/);
  assert.match(at(24, 29, 18), /todas las gentes/);
  assert.match(at(24, 50, 30), /todos sus hombres/);
  assert.match(at(24, 50, 30), /en sus plazas/);
  assert.match(at(19, 132, 11), /de ello/);
  assert.equal(at(14, 3, 3).includes('strong='), false);
  assert.match(at(14, 3, 3), /^Estas son las medidas de que Salomón/);
  assert.equal(at(18, 41, 15).includes('strong='), false);
  assert.match(at(18, 41, 15), /cerrados entre sí/);
  assert.equal(rvr(40).book, 'Mateo');
  assert.equal(rvr(42).book, 'Lucas');
  assert.equal(rvr(34).book, 'Nahúm');
  const index = JSON.parse(read('bible/rvr/index.json'));
  assert.equal(index.books[39].name, 'Mateo');
  assert.equal(index.books[40].name, 'Marcos');
  assert.equal(index.books[41].name, 'Lucas');
  assert.equal(index.books[42].name, 'Juan');
});

test('Spanish psalm titles are headings, and blank verses stay empty slots', () => {
  const psalms = rvr(19);
  assert.equal(psalms.headings['3:1'].startsWith('Salmo de David'), true);
  assert.match(psalms.chapters[2][0], /^¡OH /);
  assert.equal(psalms.headings['119:1'], 'ALEPH.');
  assert.equal(psalms.headings['119:9'], 'BETH');
  assert.match(psalms.chapters[118][0], /^BIENAVENTURADOS/);
  assert.equal(Object.keys(psalms.headings).filter((key) => !key.startsWith('119:')).length, 125);
  const proverbs = rvr(20);
  assert.equal(proverbs.headings['10:1'], 'Las sentencias de Salomón.');
  assert.match(proverbs.chapters[9][0], /^EL hijo/);
  const blanks = [[4, 12, 16], [4, 29, 40], [9, 23, 29], [10, 20, 26], [14, 33, 25], [18, 35, 16], [18, 38, 39], [18, 38, 40], [18, 38, 41], [18, 40, 20], [18, 40, 21], [18, 40, 22], [18, 40, 23], [18, 40, 24], [28, 11, 12], [32, 1, 17], [44, 19, 41], [47, 13, 14]];
  assert.equal(blanks.length, 18);
  for (const [id, chapter, verse] of blanks) assert.equal(at(id, chapter, verse), '');
  const reader = read('bible-reader.js');
  assert.match(reader, /String\(text \|\| ''\)\.trim\(\)/);
  assert.match(reader, /33–34/);
  assert.match(reader, /bible-verse-heading/);
  assert.match(reader, /msb_bible_translation is unset|saved === 'rvr' \|\| saved === 'kjv'/);
  assert.equal(book(19).chapters[2][0].includes('Salmo de David'), false);
});

test('Holy Spirit answers are not always first, in the same order in both languages', () => {
  const data = JSON.parse(read('data/holy-spirit.json'));
  const pentecost = data.challenges.find((item) => item.id === 'spirit-pentecost');
  assert.equal(pentecost.sourceUrl, '');
  assert.match(pentecost.source, /Acts 2/);
  assert.match(pentecost.sourceEs, /dominio público/);
  const positions = [];
  for (const item of data.challenges) {
    item.questions.forEach((question, index) => {
      const spanish = item.questionsEs[index];
      assert.equal(question.correct, spanish.correct);
      assert.equal(question.choices.length, spanish.choices.length);
      positions.push(question.correct);
      assert.equal(JSON.stringify(item.lessonsEs).includes('For from the same Fountain'), false);
    });
  }
  assert.equal(positions.every((n) => n === 0), false);
});

test('study together notebook names verses and keeps the worker payload', () => {
  const bridge = read('bridge.js');
  const i18n = read('i18n.js');
  const css = read('study-design.css');
  assert.match(bridge, /data-study-friend/);
  assert.match(bridge, /What did we wonder about today\?/);
  assert.match(bridge, /study-entry-new/);
  assert.match(bridge, /\/study\/delete/);
  assert.match(bridge, /name="book"/);
  assert.equal(bridge.includes('inputmode="numeric"'), false);
  assert.match(i18n, /¿Qué nos preguntamos hoy\?/);
  assert.match(i18n, /"today": "hoy"/);
  assert.match(css, /prefers-reduced-motion/);
  assert.match(css, /var\(--serif\)/);
  assert.match(css, /var\(--teal\)/);
  assert.equal(/#[0-9a-fA-F]{3,8}/.test(css.slice(css.indexOf('.study-notebook'))), false);
});

test('service worker refreshes Bible caches and only deletes this app', () => {
  const sw = read('sw.js');
  assert.match(sw, /const CACHE_VERSION = 'v91'/);
  assert.match(sw, /const BIBLE_DATA_VERSION = 'kjv-3'/);
  assert.match(sw, /const RVR_DATA_VERSION = 'rvr1909-4'/);
  assert.match(sw, /function freshOrCached/);
  assert.match(sw, /k\.startsWith\(APP_CACHE_PREFIX\) && !kept\.has\(k\)/);
  const shell = sw.slice(sw.indexOf('const SHELL = ['), sw.indexOf('const DATA_FILES'));
  const data = sw.slice(sw.indexOf('const DATA_FILES'), sw.indexOf('const STORY_FILES'));
  assert.equal(shell.includes('.webp'), false);
  assert.equal(shell.includes('audio/'), false);
  assert.equal(sw.includes('still-waters'), false);
  assert.match(sw, /const AUDIO_CACHE = 'msb-audio-1'/);
  assert.match(sw, /if \(isWorshipAudio\(url\)\)/);
  assert.match(sw, /STORIES_CACHE, AUDIO_CACHE\]\)/);
  for (const file of [
    './data/study-challenges.json',
    './data/study-library.json',
    './data/holy-spirit.json',
    './data/game-bank.json',
    './data/trivia.json',
    './bible/study-notes.json',
  ]) assert.match(data, new RegExp(file.replace(/[./]/g, '\\$&')));
  assert.match(sw, /await bible\.addAll\(\['\.\/bible\/index\.json'\]\)/);
  assert.match(sw, /await rvr\.addAll\(\['\.\/bible\/rvr\/index\.json'\]\)/);
  assert.match(sw, /await stories\.addAll\(STORY_FILES\)/);
  const reader = read('bible-reader.js');
  assert.match(reader, /msb-bible-rvr1909-4/);
  assert.match(reader, /msb-bible-rvr1909-3/);
});

test('Job 40 display numbers map onto the later KJV verses', () => {
  const reader = read('bible-reader.js');
  assert.match(reader, /reader\.book === 18 && reader\.chapter === 40 && display >= 1 && display <= 19\) return display \+ 5/);
  assert.equal(book(18).chapters[39].length, 24);
  assert.equal(JSON.parse(read('bible/rvr/18.json')).chapters[39].length, 24);
});

test('tapping a verse shows its notes and every note kind reaches the reader', () => {
  const reader = read('bible-reader.js');
  assert.match(reader, /notesOpen:false/);
  assert.doesNotMatch(reader, /!note\.deeper/);
  assert.match(reader, /const selectedNotes = reader\.selectedVerse \? chapterNotes/);
  assert.match(reader, /\['Father','Padres'\]/);
  assert.match(reader, /Father:'Padre de la Iglesia'/);
  assert.match(reader, /aria-expanded="\$\{reader\.notesOpen\}"/);
  assert.match(reader, /data-bible="notes"/);
});

test('KJV Psalm titles and the Sirach prologue sit outside the verses', () => {
  const psalms = book(19);
  assert.equal(Object.keys(psalms.headings).length, 116);
  assert.equal(psalms.headings['23:1'], 'A Psalm of David.');
  assert.equal(psalms.headings['3:1'].startsWith('A Psalm of David'), true);
  assert.equal(psalms.headings['119:1'], undefined);
  assert.equal(psalms.chapters[22][0].includes('A Psalm of David'), false);
  assert.match(psalms.chapters[2][0], /^LORD/);
  const sirach = book(70);
  assert.match(sirach.prologue, /Prologue of the Wisdom of Jesus the Son of Sirach/);
  assert.equal(sirach.chapters[0][0].includes('Prologue'), false);
  assert.match(sirach.chapters[0][0], /^All wisdom cometh/);
  const reader = read('bible-reader.js');
  assert.match(reader, /bible-prologue/);
  assert.match(reader, /verseBody/);
  const speech = read('speech.js');
  assert.match(speech, /es-us/);
  assert.match(speech, /wakeLock/);
  assert.match(speech, /0\.8/);
  assert.match(read('love.js'), /Send to my person/);
  assert.match(read('stories.js'), /Abrázame mientras duermo/);
  assert.match(read('stories.js'), /AudioContext/);
  assert.match(read('sw.js'), /speech\.js/);
  assert.match(read('sw.js'), /love\.js/);
});

test('RV epistle subscriptions sit on the index, not inside a verse', () => {
  const index = JSON.parse(read('bible/rvr/index.json'));
  const reader = read('bible-reader.js');
  assert.match(reader, /bible-subscription/);
  for (let id = 45; id <= 58; id += 1) {
    const info = index.books.find((item) => item.id === id);
    const chapters = JSON.parse(read(`bible/rvr/${String(id).padStart(2, '0')}.json`)).chapters;
    const joined = chapters.flat().join('\n');
    assert.equal(typeof info.subscription, 'string');
    assert.equal(info.subscription.length > 8, true, info.name);
    assert.equal(joined.includes(info.subscription), false, info.name);
  }
  const second = JSON.parse(read('bible/rvr/47.json')).chapters.at(-1);
  assert.equal(second.at(-1).includes('Filipos de Macedonia'), false);
  assert.equal(second[12].includes('Filipos de Macedonia'), false);
});

test('worship audio cache answers Range requests from the full cached file', async () => {
  const sw = read('sw.js');
  const start = sw.indexOf('async function rangeResponse');
  const end = sw.indexOf('// Worship audio: cache-first');
  const rangeResponse = new Function(`${sw.slice(start, end)}; return rangeResponse;`)();
  const full = () => new Response(new Uint8Array([0, 1, 2, 3, 4, 5, 6, 7, 8, 9]), { headers: { 'Content-Type': 'audio/ogg' } });
  const whole = await rangeResponse(full(), null);
  assert.equal(whole.status, 200);
  assert.equal((await whole.arrayBuffer()).byteLength, 10);
  const open = await rangeResponse(full(), 'bytes=0-');
  assert.equal(open.status, 206);
  assert.equal(open.headers.get('Content-Range'), 'bytes 0-9/10');
  const mid = await rangeResponse(full(), 'bytes=2-4');
  assert.deepEqual([...new Uint8Array(await mid.arrayBuffer())], [2, 3, 4]);
  const tail = await rangeResponse(full(), 'bytes=-3');
  assert.equal(tail.headers.get('Content-Range'), 'bytes 7-9/10');
  assert.equal((await rangeResponse(full(), 'bytes=20-')).status, 416);
});

test('original study practices keep their older-practice notes and Scripture', () => {
  const studies = JSON.parse(read('data/study-library.json')).studies;
  const byId = Object.fromEntries(studies.map((item) => [item.id, item]));
  const ids = ['mercy', 'cana', 'cloud-witnesses', 'persistent-widow', 'tax-collector', 'magnificat', 'anointing-elders'];
  for (const id of ids) {
    assert.ok(byId[id].deeperPractice, `${id} deeperPractice`);
    assert.ok(byId[id].deeperPracticeEs, `${id} deeperPracticeEs`);
  }
  assert.equal(studies.filter((item) => item.deeperPractice).length, 7);
  assert.match(byId.cana.practice, /"Whatsoever he saith unto you, do it" \(John 2:5\)/);
  assert.equal(byId.cana.practice.includes('Do whatever he tells you'), false);
  assert.match(byId.cana.practiceEs, /“Haced todo lo que os dijere” \(Juan 2:5, RV1909\)/);
  assert.match(byId.mercy.practice, /\(James 5:16\)/);
  assert.match(byId.mercy.practiceEs, /\(Santiago 5:16, RV1909\)/);
  assert.match(byId['cloud-witnesses'].orthodox, /\(Luke 20:38\)/);
  assert.match(byId['cloud-witnesses'].orthodoxEs, /\(Lucas 20:38\)/);
  assert.match(byId['persistent-widow'].orthodox, /"Pray without ceasing" \(1 Thessalonians 5:17\)/);
  assert.match(byId['persistent-widow'].orthodoxEs, /“Orad sin cesar” \(1 Tesalonicenses 5:17, RV1909\)/);
  assert.match(byId['tax-collector'].practice, /"God be merciful to me a sinner" \(Luke 18:13\)/);
  assert.match(byId['tax-collector'].practiceEs, /“Dios, sé propicio á mí pecador” \(Lucas 18:13, RV1909\)/);
  assert.match(byId['persistent-widow'].deeperPractice, /Lord Jesus Christ, Son of God, have mercy on me, a sinner/);
  assert.match(byId.magnificat.deeperPractice, /Theotokos/);
  assert.match(byId['anointing-elders'].deeperPractice, /Holy Unction/);
});

test('Spanish chrome covers lesson tags, Bible notes, and game-show menus', () => {
  const i18n = read('i18n.js');
  for (const key of ['STUDY', 'Compare the sources', 'Study note available', 'Read this passage ↗', 'Your name', '← Games', 'GAME SHOW',
    'Play a friend online — you both need the app open with internet.', 'Open a room at the level picked above',
    'Six cards from the level above.', 'Built from your study rule:', 'Level {n}', '{n} points']) {
    assert.ok(i18n.includes(`"${key}`) || i18n.includes(`'${key}`), `missing Spanish entry for ${key}`);
  }
  const games = read('games.js');
  assert.match(games, /\$\{T\('← Games'\)\}/);
  assert.match(games, /\$\{T\('GAME SHOW'\)\}/);
  assert.match(games, /MsbI18n\.apply\(root\)/);
  assert.match(read('aura.js'), /msbT\('STUDY'\)/);
  assert.match(read('bible-reader.js'), /uiT\('Study note available'\)/);
  assert.match(read('study-design.css'), /\.bible-controls select\{min-height:44px;font-size:16px/);
});
