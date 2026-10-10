/* Memory verse. Progress stays in this browser and rides along in backup. */
(() => {
  'use strict';
  const KEY = 'msb_memory_verses';
  const schedule = () => window.MsbMemorySchedule;
  const esc = value => String(value ?? '').replace(/[&<>"']/g, char => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[char]));
  const es = () => !!(window.MsbI18n && MsbI18n.lang() === 'es');
  const CURATED = [
    { book: 43, chapter: 3, verse: 16, ref: 'John 3:16', refEs: 'Juan 3:16' },
    { book: 19, chapter: 23, verse: 1, ref: 'Psalm 23:1', refEs: 'Salmo 23:1' },
    { book: 19, chapter: 23, verse: 6, ref: 'Psalm 23:6', refEs: 'Salmo 23:6' },
    { book: 19, chapter: 119, verse: 105, ref: 'Psalm 119:105', refEs: 'Salmo 119:105' },
    { book: 19, chapter: 46, verse: 1, ref: 'Psalm 46:1', refEs: 'Salmo 46:1' },
    { book: 19, chapter: 46, verse: 10, ref: 'Psalm 46:10', refEs: 'Salmo 46:10' },
    { book: 19, chapter: 56, verse: 3, ref: 'Psalm 56:3', refEs: 'Salmo 56:3' },
    { book: 19, chapter: 121, verse: 2, ref: 'Psalm 121:2', refEs: 'Salmo 121:2' },
    { book: 19, chapter: 27, verse: 1, ref: 'Psalm 27:1', refEs: 'Salmo 27:1' },
    { book: 19, chapter: 4, verse: 8, ref: 'Psalm 4:8', refEs: 'Salmo 4:8' },
    { book: 20, chapter: 3, verse: 5, ref: 'Proverbs 3:5', refEs: 'Proverbios 3:5' },
    { book: 20, chapter: 3, verse: 6, ref: 'Proverbs 3:6', refEs: 'Proverbios 3:6' },
    { book: 40, chapter: 11, verse: 28, ref: 'Matthew 11:28', refEs: 'Mateo 11:28' },
    { book: 40, chapter: 5, verse: 9, ref: 'Matthew 5:9', refEs: 'Mateo 5:9' },
    { book: 40, chapter: 5, verse: 8, ref: 'Matthew 5:8', refEs: 'Mateo 5:8' },
    { book: 40, chapter: 7, verse: 7, ref: 'Matthew 7:7', refEs: 'Mateo 7:7' },
    { book: 43, chapter: 1, verse: 5, ref: 'John 1:5', refEs: 'Juan 1:5' },
    { book: 43, chapter: 14, verse: 6, ref: 'John 14:6', refEs: 'Juan 14:6' },
    { book: 43, chapter: 15, verse: 13, ref: 'John 15:13', refEs: 'Juan 15:13' },
    { book: 45, chapter: 8, verse: 28, ref: 'Romans 8:28', refEs: 'Romanos 8:28' },
    { book: 50, chapter: 4, verse: 4, ref: 'Philippians 4:4', refEs: 'Filipenses 4:4' },
    { book: 50, chapter: 4, verse: 13, ref: 'Philippians 4:13', refEs: 'Filipenses 4:13' },
    { book: 55, chapter: 1, verse: 7, ref: '2 Timothy 1:7', refEs: '2 Timoteo 1:7' },
    { book: 58, chapter: 13, verse: 8, ref: 'Hebrews 13:8', refEs: 'Hebreos 13:8' },
    { book: 62, chapter: 4, verse: 8, ref: '1 John 4:8', refEs: '1 Juan 4:8' },
    { book: 62, chapter: 4, verse: 19, ref: '1 John 4:19', refEs: '1 Juan 4:19' },
    { book: 23, chapter: 26, verse: 3, ref: 'Isaiah 26:3', refEs: 'Isaías 26:3' },
    { book: 23, chapter: 40, verse: 8, ref: 'Isaiah 40:8', refEs: 'Isaías 40:8' },
    { book: 24, chapter: 29, verse: 11, ref: 'Jeremiah 29:11', refEs: 'Jeremías 29:11' },
    { book: 25, chapter: 3, verse: 23, ref: 'Lamentations 3:23', refEs: 'Lamentaciones 3:23' }
  ];
  let screenMode = 'list';
  let activeId = null;
  let typing = false;
  let fromMemory = false;
  const revealed = new Set();

  function todayKey(date) {
    const now = date || new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  }

  function load() {
    try {
      const parsed = JSON.parse(localStorage.getItem(KEY) || '[]');
      return Array.isArray(parsed) ? parsed.filter(item => item && item.id && item.text) : [];
    } catch { return []; }
  }

  function save(rows) {
    try { localStorage.setItem(KEY, JSON.stringify(rows)); } catch { /* private mode */ }
  }

  function toast(message) {
    const text = window.MsbI18n ? MsbI18n.t(message) : message;
    const el = document.getElementById('toast');
    if (!el) return;
    el.textContent = text;
    el.classList.add('show');
    clearTimeout(toast._timer);
    toast._timer = setTimeout(() => el.classList.remove('show'), 2400);
  }

  function verseId(item) {
    const translation = item.translation === 'rvr' ? 'rvr' : 'kjv';
    return `${item.book}:${item.chapter}:${item.verse}:${translation}`;
  }

  function stats() {
    const rows = load();
    return { active: rows.filter(item => !item.mastered).length, mastered: rows.filter(item => item.mastered).length };
  }

  async function textFor(item) {
    if (item.text) return String(item.text).trim();
    const id = String(item.book).padStart(2, '0');
    const spanish = (item.translation === 'rvr' || (!item.translation && es())) && item.book <= 66;
    try {
      const saved = await fetch('data/offline-verses.json').then(r => r.ok ? r.json() : null);
      const hit = saved && saved.verses && saved.verses[`${item.book}:${item.chapter}:${item.verse}`];
      if (hit && hit[spanish ? 'rvr' : 'kjv']) return String(hit[spanish ? 'rvr' : 'kjv']).trim();
    } catch { /* fall through to the book file */ }
    const file = spanish ? `bible/rvr/${id}.json` : `bible/${id}.json`;
    let response;
    try { response = await fetch(file); } catch { throw Error('That verse is not on this device yet.'); }
    if (!response.ok) throw Error('That verse is not on this device yet.');
    const data = await response.json();
    return String((data.chapters[item.chapter - 1] || [])[item.verse - 1] || '').trim();
  }

  async function add(item) {
    const text = await textFor(item);
    if (!text) { toast('That verse is not on this device yet.'); return { added: false }; }
    const translation = item.book > 66 ? 'kjv' : (item.translation === 'rvr' || (!item.translation && es()) ? 'rvr' : 'kjv');
    const row = {
      id: verseId({ book: item.book, chapter: item.chapter, verse: item.verse, translation }),
      book: Number(item.book),
      chapter: Number(item.chapter),
      verse: Number(item.verse),
      translation,
      reference: item.reference || `${item.book}:${item.chapter}:${item.verse}`,
      text,
      startedOn: todayKey(),
      mastered: false,
      masteredOn: ''
    };
    const rows = load();
    if (rows.some(entry => entry.id === row.id)) {
      toast('That verse is already in your list.');
      activeId = row.id;
      return { added: false, id: row.id };
    }
    rows.unshift(row);
    save(rows);
    toast('Verse saved to memorize.');
    activeId = row.id;
    return { added: true, id: row.id };
  }

  function hiddenSet(row, forceAll) {
    const api = schedule();
    if (!api) return new Set();
    if (forceAll || row.mastered) {
      const tokens = api.tokenize(row.text);
      return new Set(tokens.map((token, index) => token.word ? index : -1).filter(index => index >= 0));
    }
    return new Set(api.hiddenWordIndexes(row.text, api.dayNumber(row.startedOn, todayKey()), row.id));
  }

  function lineHtml(row) {
    const api = schedule();
    const tokens = api.tokenize(row.text);
    const hidden = hiddenSet(row, fromMemory);
    return tokens.map((token, index) => {
      if (!token.word || !hidden.has(index)) return `<span>${esc(token.text)}</span>`;
      if (revealed.has(index)) return `<span class="memory-peek">${esc(token.text)}</span>`;
      if (typing || fromMemory || row.mastered) {
        return `<input class="memory-input" data-memory-word="${index}" aria-label="Missing word" autocomplete="off" enterkeyhint="next" value="">`;
      }
      return `<button type="button" class="memory-blank" data-memory-reveal="${index}" aria-label="Show this word">____</button>`;
    }).join('');
  }

  function showList(root) {
    const rows = load();
    const cards = rows.map(row => {
      const api = schedule();
      const day = api ? api.dayNumber(row.startedOn, todayKey()) : 1;
      const badge = row.mastered ? '<span class="memory-badge">Mastered</span>' : `<span class="tag">Day ${Math.min(day, 6)} of 6</span>`;
      return `<article class="card memory-card"><div class="memory-card-top"><strong>${esc(row.reference)}</strong>${badge}</div><p class="small">${row.translation === 'rvr' ? 'RVR1909' : 'KJV'}</p><div class="memory-actions"><button type="button" class="primary" data-memory-open="${esc(row.id)}">Practice</button><button type="button" class="secondary" data-lection-book="${row.book}" data-lection-chapter="${row.chapter}" data-lection-verse="${row.verse}">Open the verse</button><button type="button" class="text-button" data-memory-remove="${esc(row.id)}">Remove</button></div></article>`;
    }).join('');
    root.innerHTML = `<button class="text-button back" data-nav="today" type="button">← Home</button><span class="eyebrow">LEARN BY HEART</span><h1>Memory verse</h1><p class="lead">A short verse, a little more hidden each day, until you can say it.</p><p><button class="primary" type="button" data-memory-pick>Choose a verse</button></p>${cards || '<p class="muted">Your list is empty. Choose a short verse, or tap Memorize this on any verse you are reading.</p>'}<p class="small">These verses stay on this device. They are included when you export a backup.</p>`;
  }

  function showPick(root) {
    const cards = CURATED.map(item => `<button type="button" class="card memory-pick" data-memory-choose="${item.book}:${item.chapter}:${item.verse}"><strong>${esc(es() ? item.refEs : item.ref)}</strong><span>${es() ? 'Agregar a tu lista' : 'Add to your list'}</span></button>`).join('');
    root.innerHTML = `<button class="text-button back" data-memory-list type="button">← Memory verse</button><span class="eyebrow">SHORT VERSES</span><h1>Choose a verse</h1><p class="lead">Thirty short verses, in the translation you are reading.</p><div class="memory-grid">${cards}</div>`;
  }

  function showPractice(root) {
    const row = load().find(item => item.id === activeId);
    if (!row) { screenMode = 'list'; showList(root); return; }
    const api = schedule();
    const day = api ? api.dayNumber(row.startedOn, todayKey()) : 1;
    const badge = row.mastered ? '<span class="memory-badge">Mastered</span>' : '';
    root.innerHTML = `<button class="text-button back" data-memory-list type="button">← Memory verse</button><span class="eyebrow">${esc(row.reference)}</span><h1>Practice</h1>${badge}<p class="small">${row.mastered ? 'You know this one. Practice it again whenever you like.' : `Day ${Math.min(day, 6)} of 6. A few more words hide each day.`}</p><p class="memory-line" data-i18n-skip>${lineHtml(row)}</p><div class="memory-actions"><button type="button" class="secondary" data-memory-mode="${typing || fromMemory ? 'peek' : 'type'}">${typing || fromMemory ? 'Tap to reveal' : 'Type the missing words'}</button><button type="button" class="secondary" data-memory-all>Try from memory</button><button type="button" class="primary" data-memory-check>Check</button></div>`;
  }

  function paint() {
    const root = document.getElementById('screen');
    if (!root) return;
    if (screenMode === 'pick') showPick(root);
    else if (screenMode === 'practice') showPractice(root);
    else showList(root);
    if (window.MsbI18n) MsbI18n.apply(root);
  }

  function show(root) {
    if (screenMode === 'practice' && !load().some(item => item.id === activeId)) screenMode = 'list';
    if (screenMode === 'pick') showPick(root);
    else if (screenMode === 'practice') showPractice(root);
    else showList(root);
  }

  function checkPractice() {
    const row = load().find(item => item.id === activeId);
    const api = schedule();
    if (!row || !api) return;
    const tokens = api.tokenize(row.text);
    const hidden = hiddenSet(row, fromMemory);
    let pending = 0;
    let wrong = 0;
    tokens.forEach((token, index) => {
      if (!token.word || !hidden.has(index) || revealed.has(index)) return;
      pending += 1;
      const input = document.querySelector(`[data-memory-word="${index}"]`);
      const ok = input && api.wordsMatch(token.text, input.value);
      if (input) input.classList.toggle('memory-wrong', !ok);
      if (!ok) wrong += 1;
    });
    if (!pending) { toast('Tap Type the missing words, then fill each blank.'); return; }
    if (wrong) { toast('Not yet. Look once, then try the blank again.'); return; }
    const everyWordHidden = tokens.every((token, index) => !token.word || hidden.has(index));
    const peeked = [...hidden].some(index => revealed.has(index));
    if (everyWordHidden && !peeked) {
      const rows = load();
      const found = rows.find(item => item.id === row.id);
      if (found && !found.mastered) {
        found.mastered = true;
        found.masteredOn = todayKey();
        save(rows);
      }
      toast('Mastered. That verse is yours.');
      fromMemory = false;
      typing = false;
      revealed.clear();
      paint();
      return;
    }
    toast('That is right. More words will hide as the days pass.');
  }

  document.addEventListener('click', async event => {
    const choose = event.target.closest('[data-memory-choose]');
    if (choose) {
      const [book, chapter, verse] = choose.dataset.memoryChoose.split(':').map(Number);
      const item = CURATED.find(entry => entry.book === book && entry.chapter === chapter && entry.verse === verse);
      if (!item) return;
      choose.disabled = true;
      try {
        await add({ book, chapter, verse, reference: es() ? item.refEs : item.ref, translation: es() ? 'rvr' : 'kjv' });
        screenMode = 'practice';
        typing = false;
        fromMemory = false;
        revealed.clear();
        paint();
      } catch { toast('That verse is not on this device yet.'); choose.disabled = false; }
      return;
    }
    const received = event.target.closest('[data-memory-add]');
    if (received) {
      event.preventDefault();
      event.stopPropagation();
      const book = Number(received.dataset.book);
      const chapter = Number(received.dataset.chapter);
      const verse = Number(received.dataset.verse);
      try {
        await add({
          book, chapter, verse,
          translation: received.dataset.translation === 'rvr' ? 'rvr' : 'kjv',
          reference: received.dataset.reference || '',
          text: received.dataset.text || ''
        });
      } catch { toast('That verse is not on this device yet.'); }
      return;
    }
    if (!event.target.closest('#screen')) return;
    if (event.target.closest('[data-memory-pick]')) { screenMode = 'pick'; paint(); return; }
    if (event.target.closest('[data-memory-list]')) { screenMode = 'list'; fromMemory = false; typing = false; revealed.clear(); paint(); return; }
    const open = event.target.closest('[data-memory-open]');
    if (open) { activeId = open.dataset.memoryOpen; screenMode = 'practice'; typing = false; fromMemory = false; revealed.clear(); paint(); return; }
    const remove = event.target.closest('[data-memory-remove]');
    if (remove) { save(load().filter(item => item.id !== remove.dataset.memoryRemove)); paint(); return; }
    const reveal = event.target.closest('[data-memory-reveal]');
    if (reveal) { revealed.add(Number(reveal.dataset.memoryReveal)); paint(); return; }
    const mode = event.target.closest('[data-memory-mode]');
    if (mode) {
      if (mode.dataset.memoryMode === 'type') { typing = true; fromMemory = false; }
      else { typing = false; fromMemory = false; revealed.clear(); }
      paint();
      return;
    }
    if (event.target.closest('[data-memory-all]')) { fromMemory = true; typing = true; revealed.clear(); paint(); return; }
    if (event.target.closest('[data-memory-check]')) checkPractice();
  });

  window.MsbMemory = { show, add, stats, load, KEY };
})();
