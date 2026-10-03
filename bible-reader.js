(() => {
  'use strict';
  const esc = value => String(value ?? '').replace(/[&<>"']/g, char => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[char]));
  const reader = { index:null, notes:null, bookData:new Map(), book:43, chapter:1, highlights:[], verseNotes:[], readLog:[], pendingVerse:null, place:null, loadedUser:null, selectedVerse:null, rotated:false, fontSize:19, requestId:0, root:null, context:null };
  const fileName = id => `bible/${String(id).padStart(2, '0')}.json`;
  const bookInfo = () => reader.index?.books.find(book => book.id === reader.book);
  const currentVerses = () => reader.bookData.get(reader.book)?.chapters[reader.chapter - 1] || [];
  const verseOffset = () => { const info = bookInfo(); return info && reader.chapter === (info.chapterStart || 1) ? (info.verseStart || 1) - 1 : 0; };
  const savedColor = verse => reader.highlights.find(item => item.book_id === reader.book && item.chapter === reader.chapter && item.verse === verse)?.color || '';
  function updateRotated() {
    reader.root?.querySelector('.bible-app')?.classList.toggle('rotated', reader.rotated);
    document.body.classList.toggle('bible-rotated', reader.rotated);
  }
  function clearRotation() { reader.rotated = false; document.body.classList.remove('bible-rotated'); }
  function render() {
    if (!reader.root || !reader.index || !reader.root.isConnected) return;
    const books = reader.index.books, info = bookInfo(), verses = currentVerses(), highlights = reader.highlights.slice(0, 30);
    const chapterNotes = (reader.notes || []).filter(note => note.book === reader.book && note.chapter === reader.chapter);
    const relatedNotes = (reader.notes || []).filter(note => note.book === reader.book || note.links.some(link => link.book === reader.book && link.chapter === reader.chapter));
    const displayedNotes = chapterNotes.length ? chapterNotes : relatedNotes.length ? relatedNotes.slice(0, 6) : (reader.notes || []).slice(0, 6);
    const reference = (book, chapter, verse) => `${books[book - 1]?.name || ''} ${chapter}:${verse}`;
    const renderNote = note => `<section class="bible-study-card"><span class="tag">${esc(note.kind)} · ${esc(reference(note.book, note.chapter, note.verse))}</span><h4>${esc(note.title)}</h4><p>${esc(note.body)}</p><small>${esc(note.author)}</small><div class="bible-study-links"><button data-jump-book="${note.book}" data-jump-chapter="${note.chapter}" data-jump-verse="${note.verse}">Read ${esc(reference(note.book, note.chapter, note.verse))} →</button>${note.links.map(link => `<button data-jump-book="${link.book}" data-jump-chapter="${link.chapter}" data-jump-verse="${link.verse}">${esc(reference(link.book, link.chapter, link.verse))} ↗</button>`).join('')}</div><a href="${esc(note.source)}" target="_blank" rel="noopener noreferrer">${esc(note.sourceLabel || "Open source ↗")}</a><button class="bible-copy-source" data-copy-source="${esc(note.source)}">Copy source link</button></section>`;
    const studyMarkup = displayedNotes.map(renderNote).join('');
    const selectedNotes = chapterNotes.filter(note => note.verse === reader.selectedVerse);
    const myNoteAt = verse => (reader.verseNotes || []).find(n => n.book_id === reader.book && n.chapter === reader.chapter && n.verse === verse) || null;
    const mySelected = reader.selectedVerse ? myNoteAt(reader.selectedVerse) : null;
    const loggedHere = (reader.readLog || []).some(item => item.book_id === reader.book && item.chapter === reader.chapter);
    const bookChaptersTotal = info ? info.chapters - (info.chapterStart || 1) + 1 : 0;
    const bookChaptersLogged = new Set((reader.readLog || []).filter(item => item.book_id === reader.book).map(item => item.chapter)).size;
    const myNoteBox = reader.selectedVerse ? `<div class="bible-inline-notes bible-my-note"><div class="bible-inline-title"><strong>Your note · ${esc(reference(reader.book, reader.chapter, reader.selectedVerse))}</strong></div>${mySelected && mySelected.from_name ? `<small class="muted">Shared by ${esc(mySelected.from_name)} — edit it freely; your copy is yours.</small>` : ''}<textarea id="bible-my-note" class="note-field" rows="3" placeholder="Write your own note on this verse…">${esc(mySelected ? mySelected.body : '')}</textarea><div class="note-actions"><button class="secondary" data-bible="save-verse-note">Save my note</button>${mySelected ? '<button class="secondary" data-bible="delete-verse-note">Delete my note</button>' : ''}</div></div>` : '';
    const sections = ['Old Testament', 'New Testament', 'Deuterocanon / Apocrypha'];
    const savedMarkup = !reader.context.isRegistered() ? '<p class="muted">Sign in to keep your highlights across devices.</p>' : highlights.length ? `<div class="bible-saved-list">${highlights.map(item => `<button data-jump-book="${item.book_id}" data-jump-chapter="${item.chapter}" data-jump-verse="${item.verse}"><span class="bible-swatch ${esc(item.color)}"></span>${esc(books[item.book_id - 1]?.name)} ${item.chapter}:${item.verse}</button>`).join('')}</div>` : '<p class="muted">Tap a verse, choose a color, and it will appear here.</p>';
    reader.root.innerHTML = `<div class="bible-app"><header class="bible-heading"><div><span class="eyebrow">THE FULL READING SHELF</span><h1>Read the Bible.</h1><p class="lead">Choose a book and chapter. Tap a verse to highlight it.</p></div><span class="bible-edition">KJV · ${books.length} BOOKS</span></header>
      <div class="bible-layout"><div class="bible-primary"><div class="bible-controls card"><label>Book<select id="bible-book">${sections.map(section => `<optgroup label="${esc(section)}">${books.filter(book => book.section === section).map(book => `<option value="${book.id}" ${book.id === reader.book ? 'selected' : ''}>${esc(book.name)}</option>`).join('')}</optgroup>`).join('')}</select></label><label>Chapter<select id="bible-chapter">${Array.from({ length:info.chapters - (info.chapterStart || 1) + 1 }, (_, i) => { const chapter = i + (info.chapterStart || 1); return `<option value="${chapter}" ${chapter === reader.chapter ? 'selected' : ''}>${chapter}</option>`; }).join('')}</select></label><div class="bible-control-buttons"><button class="secondary" data-bible="previous" aria-label="Previous chapter">←</button><button class="secondary" data-bible="next" aria-label="Next chapter">→</button><button class="secondary" data-bible="smaller" aria-label="Smaller text">A−</button><button class="secondary" data-bible="larger" aria-label="Larger text">A+</button><button class="secondary" data-bible="rotate" aria-label="Rotate reading view" aria-pressed="${reader.rotated}">⤾ <span>Rotate</span></button><button class="secondary" data-bible="notes">Study notes (${chapterNotes.length})</button></div></div>
      <article class="bible-page card" style="--reader-size:${reader.fontSize}px"><div class="bible-page-title"><span class="eyebrow">${esc(info.section)}</span><h2>${esc(info.name)} ${reader.chapter}</h2><small>${verses.filter(Boolean).length} verses · King James Version</small></div>${selectedNotes.length ? `<div id="bible-verse-note" class="bible-inline-notes" aria-live="polite"><div class="bible-inline-title"><strong>Study notes · ${esc(reference(reader.book, reader.chapter, reader.selectedVerse))}</strong><button class="text-button" data-bible="close-note" aria-label="Close study note">×</button></div>${selectedNotes.map(renderNote).join('')}</div>` : ''}${myNoteBox}${reader.selectedVerse ? `<div class="bible-highlight-tools" role="group" aria-label="Highlight verse ${reader.selectedVerse}"><span>Verse ${reader.selectedVerse}</span><button data-color="teal" aria-label="Highlight teal" title="Teal"></button><button data-color="gold" aria-label="Highlight gold" title="Gold"></button><button data-color="rose" aria-label="Highlight rose" title="Rose"></button><button class="bible-clear-highlight" data-color="remove" aria-label="Clear highlight" title="Clear highlight"></button></div>` : ''}<div class="bible-verses">${verses.map((text, i) => text ? `<button class="bible-verse ${savedColor(i + 1 + verseOffset()) ? 'highlight-' + savedColor(i + 1 + verseOffset()) : ''} ${reader.selectedVerse === i + 1 + verseOffset() ? 'selected' : ''}" data-bible-verse="${i + 1 + verseOffset()}" aria-label="Verse ${i + 1 + verseOffset()}: ${esc(text)}"><sup>${i + 1 + verseOffset()}</sup>${esc(text)}${chapterNotes.some(note => note.verse === i + 1 + verseOffset()) ? '<span class="bible-annotation" aria-label="Study note available">✦</span>' : ''}${myNoteAt(i + 1 + verseOffset()) ? '<span class="bible-annotation bible-my-mark" aria-label="Your note on this verse">✎</span>' : ''}</button>` : '').join('')}</div><div class="bible-page-foot"><button class="text-button" data-bible="previous">← Previous</button><span class="bible-log-wrap"><button class="secondary bible-log-btn ${loggedHere ? 'bible-logged' : ''}" data-bible="log-read" aria-pressed="${loggedHere}">${loggedHere ? `✓ ${esc(info.name)} ${reader.chapter} logged — tap to undo` : `✓ Log ${esc(info.name)} ${reader.chapter} as read`}</button><span class="bible-log-progressbar" aria-hidden="true"><i style="width:${bookChaptersTotal ? Math.round(bookChaptersLogged / bookChaptersTotal * 100) : 0}%"></i></span><small class="bible-log-progress">${esc(info.name)}: ${bookChaptersLogged} of ${bookChaptersTotal} chapters logged</small></span><button class="text-button" data-bible="next">Next →</button></div></article></div>
      <aside class="bible-aside"><div class="card"><span class="eyebrow">YOUR MARKS</span><h3>Highlighted verses</h3>${savedMarkup}<p class="small">Your highlights are private to your profile.</p></div><div class="card" id="bible-notes"><span class="eyebrow">STUDY ALONGSIDE SCRIPTURE</span><h3>${chapterNotes.length ? `Notes on ${esc(info.name)} ${reader.chapter}` : 'Explore the study library'}</h3><p class="small">Father · Teaching · Apologetics. Summaries are editorial; use the source links to read further.</p><div class="bible-study-stack">${studyMarkup}</div></div><div class="card bible-source"><span class="eyebrow">ABOUT THIS EDITION</span><p>${esc(reader.index.notice)}</p><p class="small">Psalm numbers here follow the Hebrew numbering used by the KJV. The Orthodox Septuagint Psalter sometimes numbers them differently: KJV Psalm 23 is LXX Psalm 22.</p><a href="${esc(reader.index.source)}" target="_blank" rel="noopener noreferrer">Main text source ↗</a>${reader.index.supplementSource ? `<p><a href="${esc(reader.index.supplementSource)}" target="_blank" rel="noopener noreferrer">Rest of Esther source ↗</a></p>` : ''}</div></aside></div></div>`;
    updateRotated();
  }
  async function ensureBook(id) {
    if (reader.bookData.has(id)) return;
    const response = await fetch(fileName(id), { cache:'no-store' });
    if (!response.ok) throw Error(`Could not open this book (${response.status}).`);
    const data = await response.json();
    if (!Array.isArray(data.chapters) || data.book !== reader.index.books[id - 1]?.name) throw Error('This book could not be verified.');
    reader.bookData.set(id, data);
  }
  async function loadAccount() {
    const userId = reader.context.userId();
    if (!userId || reader.loadedUser === userId) return;
    const result = await reader.context.api('/bible/state');
    reader.highlights = result.highlights || [];
    reader.verseNotes = result.verseNotes || [];
    reader.readLog = result.readLog || [];
    reader.place = result.place || null;
    reader.loadedUser = userId;
    if (reader.place && !reader.explicitOpen) { reader.book = reader.place.book_id; reader.chapter = reader.place.chapter; }
  }
  async function show(root, context) {
    reader.root = root; reader.context = context;
    const requestId = ++reader.requestId;
    root.innerHTML = '<div class="loading">Opening the Bible…</div>';
    try {
      if (!reader.index) {
        const response = await fetch('bible/index.json', { cache:'no-store' });
        if (!response.ok) throw Error('The Bible index is unavailable.');
        reader.index = await response.json();
        const local = localStorage.getItem('lampstand_bible_place');
        const match = local?.match(/^(\d+):(\d+)$/);
        if (match && !reader.explicitOpen) { reader.book = Number(match[1]); reader.chapter = Number(match[2]); }
      }
      if (!reader.notes) {
        const response = await fetch('bible/study-notes.json', { cache:'force-cache' });
        if (!response.ok) throw Error('Study notes are unavailable. Please try again.');
        reader.notes = await response.json();
      }
      if (context.userId()) await loadAccount();
      if (!reader.index.books[reader.book - 1] || reader.chapter < (reader.index.books[reader.book - 1].chapterStart || 1) || reader.chapter > reader.index.books[reader.book - 1].chapters) { reader.book = 43; reader.chapter = 1; }
      await ensureBook(reader.book);
      if (requestId === reader.requestId && root.isConnected) {
        render();
        if (reader.pendingVerse) {
          const verse = reader.pendingVerse; reader.pendingVerse = null;
          reader.selectedVerse = verse; render();
          setTimeout(() => reader.root?.querySelector('#bible-my-note')?.scrollIntoView({block:'center', behavior:'smooth'}), 60);
        }
      }
    } catch(error) {
      if (requestId === reader.requestId && root.isConnected) root.innerHTML = `<div class="empty error">${esc(error.message)} <button class="secondary" data-bible="retry">Try again</button></div>`;
    }
  }
  async function move(book, chapter, verse) {
    if (!reader.index || !reader.index.books[book - 1] || chapter < (reader.index.books[book - 1].chapterStart || 1) || chapter > reader.index.books[book - 1].chapters) return;
    reader.book = book; reader.chapter = chapter; reader.selectedVerse = verse || null; reader.explicitOpen = false;
    const requestId = ++reader.requestId;
    reader.root.innerHTML = '<div class="loading">Turning the page…</div>';
    try {
      await ensureBook(book);
      if (requestId !== reader.requestId) return;
      render();
      localStorage.setItem('lampstand_bible_place', `${book}:${chapter}`);
      if (reader.context.isRegistered()) reader.context.api('/bible/place', 'POST', { book_id:book, chapter }).catch(error => reader.context.toast(error.message));
      if (verse) setTimeout(() => reader.root?.querySelector(`[data-bible-verse="${verse}"]`)?.scrollIntoView({block:'center'}), 0);
      else window.scrollTo({top:0,behavior:'auto'});
    } catch(error) { if (requestId === reader.requestId) reader.root.innerHTML = `<div class="empty error">${esc(error.message)} <button class="secondary" data-bible="retry">Try again</button></div>`; }
  }
  function open(book, chapter, verse) { reader.book = book; reader.chapter = chapter; reader.explicitOpen = true; reader.pendingVerse = verse || null; }
  function resetAccount() { reader.loadedUser = null; reader.highlights = []; reader.verseNotes = []; reader.readLog = []; reader.place = null; }
  function hide() { reader.requestId++; reader.root = null; clearRotation(); }
  document.addEventListener('change', event => {
    if (!event.target.closest('.bible-app')) return;
    if (event.target.id === 'bible-book') { const chosen = reader.index.books[Number(event.target.value) - 1]; move(chosen.id, chosen.chapterStart || 1); }
    if (event.target.id === 'bible-chapter') move(reader.book, Number(event.target.value));
  });
  document.addEventListener('click', async event => {
    const target = event.target.closest('[data-bible-verse],[data-bible],[data-color],[data-jump-book],[data-copy-source]');
    if (!target || (!target.closest('.bible-app') && target.dataset.bible !== 'retry')) return;
    if (target.dataset.bibleVerse) { reader.selectedVerse = Number(target.dataset.bibleVerse); render(); if (reader.root?.querySelector('#bible-verse-note')) reader.root.querySelector('#bible-verse-note').scrollIntoView({block:'start', behavior:'smooth'}); return; }
    if (target.dataset.copySource) { try { await navigator.clipboard.writeText(target.dataset.copySource); reader.context.toast('Source link copied.'); } catch { reader.context.toast('Use the Open source link instead.'); } return; }
    if (target.dataset.jumpBook) { await move(Number(target.dataset.jumpBook), Number(target.dataset.jumpChapter), Number(target.dataset.jumpVerse)); return; }
    if (target.dataset.color) {
      if (!reader.context.isRegistered()) { reader.context.promptSignup(); return; }
      const verse = reader.selectedVerse, book = reader.book, chapter = reader.chapter, color = target.dataset.color === 'remove' ? null : target.dataset.color;
      target.disabled = true;
      try {
        const result = await reader.context.api('/bible/highlight', 'POST', { book_id:book, chapter, verse, color });
        reader.highlights = reader.highlights.filter(item => !(item.book_id === book && item.chapter === chapter && item.verse === verse));
        if (color) reader.highlights.unshift(result);
        reader.selectedVerse = null; render(); reader.context.toast(color ? 'Verse highlighted.' : 'Highlight removed.');
      } catch(error) { target.disabled = false; reader.context.toast(error.message); }
      return;
    }
    switch(target.dataset.bible) {
      case 'retry': show(reader.root, reader.context); break;
      case 'notes': reader.root?.querySelector('#bible-notes')?.scrollIntoView({block:'start',behavior:'smooth'}); break;
      case 'close-note': reader.selectedVerse = null; render(); break;
      case 'log-read': {
        const book = reader.book, chapter = reader.chapter;
        const logged = (reader.readLog || []).some(item => item.book_id === book && item.chapter === chapter);
        target.disabled = true;
        try {
          const result = await reader.context.api('/bible/read-log', 'POST', { book_id: book, chapter, read: !logged });
          reader.readLog = result.readLog || reader.readLog;
          render();
          reader.context.toast(logged ? 'Chapter un-logged.' : 'Chapter logged as read. It counts on Home now.');
          if (!logged && reader.context.celebrate) { const check = await reader.context.api('/bible/achievements/check', 'POST', {}).catch(() => null); if (check && check.newly && check.newly.length) reader.context.celebrate(check.newly); }
        } catch (error) { target.disabled = false; reader.context.toast(error.message); }
        break;
      }
      case 'save-verse-note': {
        const field = reader.root?.querySelector('#bible-my-note');
        const text = (field ? field.value : '').trim();
        const book = reader.book, chapter = reader.chapter, verse = reader.selectedVerse;
        target.disabled = true;
        try {
          const result = await reader.context.api('/bible/verse-note', 'POST', { book_id: book, chapter, verse, body: text, from_name: '' });
          reader.verseNotes = result.verseNotes || reader.verseNotes;
          render();
          reader.context.toast(text ? 'Your note is saved on this verse.' : 'Your note on this verse was cleared.');
          if (text && reader.context.celebrate) { const check = await reader.context.api('/bible/achievements/check', 'POST', {}).catch(() => null); if (check && check.newly && check.newly.length) reader.context.celebrate(check.newly); }
        } catch (error) { target.disabled = false; reader.context.toast(error.message); }
        break;
      }
      case 'delete-verse-note': {
        const book = reader.book, chapter = reader.chapter, verse = reader.selectedVerse;
        target.disabled = true;
        try {
          const result = await reader.context.api('/bible/verse-note', 'POST', { book_id: book, chapter, verse, body: '', from_name: '' });
          reader.verseNotes = result.verseNotes || reader.verseNotes;
          render();
          reader.context.toast('Your note on this verse was deleted.');
        } catch (error) { target.disabled = false; reader.context.toast(error.message); }
        break;
      }
      case 'rotate': reader.rotated = !reader.rotated; updateRotated(); break;
      case 'smaller': reader.fontSize = Math.max(15, reader.fontSize - 2); render(); break;
      case 'larger': reader.fontSize = Math.min(29, reader.fontSize + 2); render(); break;
      case 'previous': if (reader.chapter > (bookInfo().chapterStart || 1)) move(reader.book, reader.chapter - 1); else if (reader.book > 1) move(reader.book - 1, reader.index.books[reader.book - 2].chapters); break;
      case 'next': if (reader.chapter < bookInfo().chapters) move(reader.book, reader.chapter + 1); else if (reader.book < reader.index.books.length) move(reader.book + 1, reader.index.books[reader.book].chapterStart || 1); break;
    }
  });
  window.BibleReader = { show, open, hide, resetAccount };
})();
