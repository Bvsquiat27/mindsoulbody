(() => {
  'use strict';
  const esc = value => String(value ?? '').replace(/[&<>"']/g, char => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[char]));
  const reader = { index:null, notes:null, bookData:new Map(), book:43, chapter:1, highlights:[], verseNotes:[], readLog:[], pendingVerse:null, place:null, loadedUser:null, accountRequest:0, selectedVerse:null, rotated:false, fontSize:19, requestId:0, root:null, context:null };
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
  const FONT_KEY = 'msb_bible_font';
  const speech = { playing:false, paused:false, verse:0, generation:0 };
  function loadFont(){
    try {
      const saved = Number(localStorage.getItem(FONT_KEY));
      if (Number.isFinite(saved) && saved >= 15 && saved <= 29) reader.fontSize = saved;
    } catch {}
  }
  function rememberFont(){ try { localStorage.setItem(FONT_KEY, String(reader.fontSize)); } catch {} }
  function verseBody(verse){
    const verses = currentVerses(), offset = verseOffset();
    return verses[verse - 1 - offset] || '';
  }
  function firstSpokenVerse(){
    const verses = currentVerses(), offset = verseOffset();
    for (let i = 0; i < verses.length; i++) if (verses[i]) return i + 1 + offset;
    return 0;
  }
  function shareLine(verse){
    const info = bookInfo();
    return `${verseBody(verse)} — ${info ? info.name : 'Bible'} ${reader.chapter}:${verse}`.trim();
  }
  function clearSpeakingClass(){ reader.root?.querySelectorAll('.bible-speaking').forEach(el => el.classList.remove('bible-speaking')); }
  function markSpeaking(verse){ reader.root?.querySelectorAll('.bible-verse').forEach(el => el.classList.toggle('bible-speaking', Number(el.dataset.bibleVerse) === verse)); }
  function releaseSpeechAudio(){ if (window.msbYieldAudio) { try { window.msbYieldAudio('speech', false); } catch {} } }
  function stopSpeech(){
    speech.generation++;
    speech.playing = false;
    speech.paused = false;
    try { window.speechSynthesis?.cancel(); } catch {}
    clearSpeakingClass();
    releaseSpeechAudio();
  }
  function speakAt(verse){
    const synth = window.speechSynthesis;
    if (!synth || typeof SpeechSynthesisUtterance !== 'function') { reader.context?.toast?.('This browser cannot read aloud.'); return; }
    const text = verseBody(verse);
    if (!text) { stopSpeech(); return; }
    const generation = ++speech.generation;
    try { synth.cancel(); } catch {}
    speech.playing = true;
    speech.paused = false;
    speech.verse = verse;
    markSpeaking(verse);
    if (window.msbYieldAudio) { try { window.msbYieldAudio('speech', true); } catch {} }
    const utter = new SpeechSynthesisUtterance(text);
    const advance = () => {
      if (generation !== speech.generation || speech.paused) return;
      const verses = currentVerses(), offset = verseOffset();
      let next = verse + 1;
      while (next - 1 - offset < verses.length && !verses[next - 1 - offset]) next++;
      if (next - 1 - offset < verses.length && verses[next - 1 - offset]) speakAt(next);
      else { speech.playing = false; speech.paused = false; clearSpeakingClass(); releaseSpeechAudio(); }
    };
    utter.onend = advance;
    utter.onerror = () => { if (generation === speech.generation) { speech.playing = false; releaseSpeechAudio(); } };
    try { synth.speak(utter); } catch { speech.playing = false; releaseSpeechAudio(); }
  }
  function pauseSpeech(){
    if (!speech.playing) return;
    speech.paused = true;
    speech.playing = false;
    speech.generation++;
    try { window.speechSynthesis?.cancel(); } catch {}
    releaseSpeechAudio();
  }
  async function copyVerse(verse){
    try { await navigator.clipboard.writeText(shareLine(verse)); reader.context.toast('Verse copied.'); }
    catch { reader.context.toast('Could not copy that verse.'); }
  }
  async function shareVerse(verse){
    const text = shareLine(verse);
    if (navigator.share) {
      try { await navigator.share({ text }); return; }
      catch (error) { if (error && error.name === 'AbortError') return; }
    }
    await copyVerse(verse);
  }
  function render() {
    if (!reader.root || !reader.index || !reader.root.isConnected) return;
    const books = reader.index.books, info = bookInfo(), verses = currentVerses(), highlights = reader.highlights;
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
    const savedMarkup = !reader.context.isRegistered() ? '<p class="muted">Sign in to keep your highlights in this browser.</p>' : highlights.length ? `<div class="bible-saved-list">${highlights.map(item => `<button data-jump-book="${item.book_id}" data-jump-chapter="${item.chapter}" data-jump-verse="${item.verse}"><span class="bible-swatch ${esc(item.color)}"></span>${esc(books[item.book_id - 1]?.name)} ${item.chapter}:${item.verse}</button>`).join('')}</div>` : '<p class="muted">Tap a verse, choose a color, and it will appear here.</p>';
    reader.root.innerHTML = `<div class="bible-app"><header class="bible-heading"><div><span class="eyebrow">THE FULL READING SHELF</span><h1>Read the Bible.</h1><p class="lead">Choose a book and chapter. Tap a verse to highlight it.</p></div><span class="bible-edition">The Bible</span></header>
      ${offlineMarkup()}
      <div class="bible-layout"><div class="bible-primary"><div class="bible-controls card"><label>Book<select id="bible-book">${sections.map(section => `<optgroup label="${esc(section)}">${books.filter(book => book.section === section).map(book => `<option value="${book.id}" ${book.id === reader.book ? 'selected' : ''}>${esc(book.name)}</option>`).join('')}</optgroup>`).join('')}</select></label><label>Chapter<select id="bible-chapter">${Array.from({ length:info.chapters - (info.chapterStart || 1) + 1 }, (_, i) => { const chapter = i + (info.chapterStart || 1); return `<option value="${chapter}" ${chapter === reader.chapter ? 'selected' : ''}>${chapter}</option>`; }).join('')}</select></label><div class="bible-control-buttons"><button class="secondary" data-bible="previous" aria-label="Previous chapter">←</button><button class="secondary" data-bible="next" aria-label="Next chapter">→</button><button class="secondary" data-bible="smaller" aria-label="Smaller text">A−</button><button class="secondary" data-bible="larger" aria-label="Larger text">A+</button><button class="secondary" data-bible="speak" aria-label="Read this chapter aloud">Read aloud</button><button class="secondary" data-bible="speak-pause" aria-label="Pause reading" aria-pressed="${speech.paused}">Pause</button><button class="secondary" data-bible="speak-stop" aria-label="Stop reading">Stop</button><button class="secondary" data-bible="rotate" aria-label="Rotate reading view" aria-pressed="${reader.rotated}">⤾ <span>Rotate</span></button><button class="secondary" data-bible="notes">Study notes (${chapterNotes.length})</button></div></div>
      <article class="bible-page card" style="--reader-size:${reader.fontSize}px"><div class="bible-page-title"><span class="eyebrow">${esc(info.section)}</span><h2>${esc(info.name)} ${reader.chapter}</h2><small>${verses.filter(Boolean).length} verses</small></div>${selectedNotes.length ? `<div id="bible-verse-note" class="bible-inline-notes" aria-live="polite"><div class="bible-inline-title"><strong>Study notes · ${esc(reference(reader.book, reader.chapter, reader.selectedVerse))}</strong><button class="text-button" data-bible="close-note" aria-label="Close study note">×</button></div>${selectedNotes.map(renderNote).join('')}</div>` : ''}${myNoteBox}${reader.selectedVerse ? `<div class="bible-highlight-tools" role="group" aria-label="Highlight verse ${reader.selectedVerse}"><span>Verse ${reader.selectedVerse}</span><button data-color="teal" aria-label="Highlight teal" title="Teal"></button><button data-color="gold" aria-label="Highlight gold" title="Gold"></button><button data-color="rose" aria-label="Highlight rose" title="Rose"></button><button class="bible-clear-highlight" data-color="remove" aria-label="Clear highlight" title="Clear highlight"></button><button class="secondary" data-bible="copy-verse" aria-label="Copy verse ${reader.selectedVerse}">Copy</button><button class="secondary" data-bible="share-verse" aria-label="Share verse ${reader.selectedVerse}">Share</button></div>` : ''}<div class="bible-verses">${verses.map((text, i) => text ? `<button class="bible-verse ${savedColor(i + 1 + verseOffset()) ? 'highlight-' + savedColor(i + 1 + verseOffset()) : ''} ${reader.selectedVerse === i + 1 + verseOffset() ? 'selected' : ''}${speech.playing && speech.verse === i + 1 + verseOffset() ? ' bible-speaking' : ''}" data-bible-verse="${i + 1 + verseOffset()}" aria-label="Verse ${i + 1 + verseOffset()}: ${esc(text)}"><sup>${i + 1 + verseOffset()}</sup>${esc(text)}${chapterNotes.some(note => note.verse === i + 1 + verseOffset()) ? '<span class="bible-annotation" aria-label="Study note available">✦</span>' : ''}${myNoteAt(i + 1 + verseOffset()) ? '<span class="bible-annotation bible-my-mark" aria-label="Your note on this verse">✎</span>' : ''}</button>` : '').join('')}</div><div class="bible-page-foot"><button class="text-button" data-bible="previous">← Previous</button><span class="bible-log-wrap"><button class="secondary bible-log-btn ${loggedHere ? 'bible-logged' : ''}" data-bible="log-read" aria-pressed="${loggedHere}">${loggedHere ? `✓ ${esc(info.name)} ${reader.chapter} logged — tap to undo` : `✓ Log ${esc(info.name)} ${reader.chapter} as read`}</button><span class="bible-log-progressbar" aria-hidden="true"><i style="width:${bookChaptersTotal ? Math.round(bookChaptersLogged / bookChaptersTotal * 100) : 0}%"></i></span><small class="bible-log-progress">${esc(info.name)}: ${bookChaptersLogged} of ${bookChaptersTotal} chapters logged</small></span><button class="text-button" data-bible="next">Next →</button></div></article></div>
      <aside class="bible-aside"><div class="card"><span class="eyebrow">YOUR MARKS</span><h3>Highlighted verses</h3>${savedMarkup}<p class="small">Your highlights stay in this browser.</p><button type="button" class="text-button" data-nav="marks">All marks</button></div><div class="card" id="bible-notes"><span class="eyebrow">STUDY ALONGSIDE SCRIPTURE</span><h3>${chapterNotes.length ? `Notes on ${esc(info.name)} ${reader.chapter}` : 'Explore the study library'}</h3><p class="small">Father · Teaching · Apologetics. Summaries are editorial; use the source links to read further.</p><div class="bible-study-stack">${studyMarkup}</div></div></aside></div></div>`;
    updateRotated();
    if (!reader.offline) refreshOffline();
  }
  const BIBLE_CACHE_NAME = 'msb-bible-kjv-1';
  const BIBLE_BOOK_TOTAL = 78;
  function bibleFile(id){ return `bible/${String(id).padStart(2,'0')}.json`; }
  function formatBytes(bytes){
    const n = Number(bytes) || 0;
    if (n < 1024) return `${n} B`;
    if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
    return `${(n / (1024 * 1024)).toFixed(1)} MB`;
  }
  async function openBibleCache(){
    if (!('caches' in window)) return null;
    return caches.open(BIBLE_CACHE_NAME);
  }
  async function readCached(url){
    try {
      const cache = await openBibleCache();
      return cache ? await cache.match(url) : null;
    } catch { return null; }
  }
  function offlineLabel(){
    const s = reader.offline || {books:0, bytes:0, scanning:true, busy:false, done:0};
    if (s.busy) return `Downloading ${s.done} of ${BIBLE_BOOK_TOTAL} books · ${formatBytes(s.bytes)}`;
    if (s.unsupported) return 'This browser cannot store books for offline reading.';
    if (s.scanning) return 'Checking saved books…';
    if (s.books >= BIBLE_BOOK_TOTAL) return `${s.books} of ${BIBLE_BOOK_TOTAL} books · ${formatBytes(s.bytes)} downloaded`;
    if (s.books > 0) return `${s.books} of ${BIBLE_BOOK_TOTAL} books · ${formatBytes(s.bytes)} saved`;
    return `0 of ${BIBLE_BOOK_TOTAL} books saved for offline`;
  }
  function offlineButtonLabel(){
    const s = reader.offline || {};
    if (s.busy) return 'Downloading…';
    if ((s.books || 0) >= BIBLE_BOOK_TOTAL) return 'Whole Bible downloaded';
    if ((s.books || 0) > 0) return 'Download the rest for offline';
    return 'Download whole Bible for offline';
  }
  function offlineMarkup(){
    const s = reader.offline || {books:0, bytes:0, scanning:true, busy:false};
    const books = s.books || 0;
    const pct = Math.max(0, Math.min(100, Math.round(books / BIBLE_BOOK_TOTAL * 100)));
    const done = (books >= BIBLE_BOOK_TOTAL) && !s.busy;
    return `<section class="card bible-offline"><span class="eyebrow">OFFLINE</span><h3 id="bible-offline-title">Whole Bible on this device</h3><p id="bible-offline-label" aria-live="polite">${offlineLabel()}</p><div class="bible-offline-bar" role="progressbar" aria-valuemin="0" aria-valuemax="${BIBLE_BOOK_TOTAL}" aria-valuenow="${books}" aria-label="Bible books saved on this device"><i id="bible-offline-fill" style="width:${pct}%"></i></div><button type="button" class="primary" data-bible="download-all" ${done || s.busy ? 'disabled' : ''}>${offlineButtonLabel()}</button></section>`;
  }
  function paintOffline(){
    const label = reader.root?.querySelector('#bible-offline-label');
    const fill = reader.root?.querySelector('#bible-offline-fill');
    const bar = reader.root?.querySelector('.bible-offline-bar');
    const button = reader.root?.querySelector('[data-bible="download-all"]');
    if (!label || !fill || !button) return;
    const s = reader.offline || {books:0, bytes:0};
    const books = s.books || 0;
    label.textContent = offlineLabel();
    fill.style.width = `${Math.max(0, Math.min(100, Math.round(books / BIBLE_BOOK_TOTAL * 100)))}%`;
    if (bar) bar.setAttribute('aria-valuenow', String(books));
    button.textContent = offlineButtonLabel();
    button.disabled = !!s.busy || books >= BIBLE_BOOK_TOTAL;
  }
  async function refreshOffline(){
    if (reader.offlineBusy) return;
    reader.offline = Object.assign({books:0, bytes:0, scanning:true, busy:false, done:0}, reader.offline, {scanning:true});
    try {
      const cache = await openBibleCache();
      if (!cache) {
        reader.offline = {books:0, bytes:0, scanning:false, busy:false, unsupported:true};
        paintOffline();
        return;
      }
      const keys = await cache.keys();
      const books = keys.filter(request => /\/bible\/\d\d\.json$/.test(new URL(request.url).pathname));
      let bytes = 0;
      for (const request of keys) {
        const path = new URL(request.url).pathname;
        if (!/\/bible\/(?:index|\d\d)\.json$/.test(path)) continue;
        const hit = await cache.match(request);
        if (!hit) continue;
        const blob = await hit.blob();
        bytes += blob.size;
      }
      reader.offline = {books:books.length, bytes, scanning:false, busy:false, done:books.length};
    } catch {
      reader.offline = {books:0, bytes:0, scanning:false, busy:false};
    }
    paintOffline();
  }
  async function downloadBible(){
    if (reader.offlineBusy) return;
    if (!('caches' in window)) { reader.context.toast('This browser cannot store the Bible for offline reading.'); return; }
    reader.offlineBusy = true;
    reader.offline = Object.assign({books:0, bytes:0, scanning:false, busy:true, done:0}, reader.offline, {busy:true, done:reader.offline?.books || 0});
    paintOffline();
    const files = ['bible/index.json', ...Array.from({length:BIBLE_BOOK_TOTAL}, (_, i) => bibleFile(i + 1))];
    let bytes = 0;
    let bookCount = 0;
    try {
      const cache = await caches.open(BIBLE_CACHE_NAME);
      for (const file of files) {
        const url = new URL(file, location.href).href;
        const response = await fetch(url);
        if (!response.ok) throw Error(`Could not download ${file}.`);
        const buffer = await response.arrayBuffer();
        bytes += buffer.byteLength;
        await cache.put(url, new Response(buffer, {headers:{'Content-Type':'application/json'}}));
        if (file !== 'bible/index.json') bookCount += 1;
        reader.offline = {books:bookCount, bytes, scanning:false, busy:true, done:bookCount};
        paintOffline();
      }
      reader.offline = {books:bookCount, bytes, scanning:false, busy:false, done:bookCount};
      reader.context.toast('The whole Bible is saved on this device.');
    } catch (error) {
      reader.offline = Object.assign({}, reader.offline, {busy:false, scanning:false});
      reader.context.toast(error.message || 'The download stopped. Tap again to continue.');
    } finally {
      reader.offlineBusy = false;
      if (!reader.offline?.busy) await refreshOffline();
      else paintOffline();
    }
  }
  async function ensureBook(id) {
    if (reader.bookData.has(id)) return;
    const url = bibleFile(id);
    let response = null;
    try { response = await fetch(url); } catch { response = null; }
    if (!response || !response.ok) response = await readCached(url);
    if (!response || !response.ok) throw Error(`Could not open this book (${response ? response.status : 'offline'}).`);
    const data = await response.json();
    if (!Array.isArray(data.chapters) || data.book !== reader.index.books[id - 1]?.name) throw Error('This book could not be verified.');
    reader.bookData.set(id, data);
  }
  async function loadAccount() {
    const userId = reader.context.userId() || 'device';
    const firstLoad = reader.loadedUser !== userId;
    const generation = ++reader.accountRequest;
    const result = await reader.context.api('/bible/state');
    if (generation !== reader.accountRequest) return;
    reader.highlights = result.highlights || [];
    reader.verseNotes = result.verseNotes || [];
    reader.readLog = result.readLog || [];
    reader.place = result.place || null;
    reader.loadedUser = userId;
    // Stored place is the last signed-in chapter. Signed-out reading stays on this device's chapter.
    if (firstLoad && reader.context.userId() && reader.place && !reader.explicitOpen) {
      reader.book = reader.place.book_id;
      reader.chapter = reader.place.chapter;
    }
  }
  async function show(root, context) {
    reader.root = root; reader.context = context; loadFont();
    const requestId = ++reader.requestId;
    root.innerHTML = '<div class="loading">Opening the Bible…</div>';
    try {
      if (!reader.index) {
        let response = null;
        try { response = await fetch('bible/index.json'); } catch { response = null; }
        if (!response || !response.ok) response = await readCached('bible/index.json');
        if (!response || !response.ok) throw Error('The Bible index is unavailable.');
        reader.index = await response.json();
        const local = localStorage.getItem('lampstand_bible_place');
        const match = local?.match(/^(\d+):(\d+)$/);
        if (match && !reader.explicitOpen) { reader.book = Number(match[1]); reader.chapter = Number(match[2]); }
      }
      if (!reader.notes) {
        const response = await fetch('bible/study-notes.json', { cache:'no-store' });
        if (!response.ok) throw Error('Study notes are unavailable. Please try again.');
        reader.notes = await response.json();
      }
      await loadAccount();
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
    stopSpeech();
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
  function applyVerseNotes(notes) {
    if (!Array.isArray(notes)) return;
    reader.accountRequest++;
    reader.verseNotes = notes;
    if (reader.root?.isConnected && reader.index) render();
  }
  function resetAccount() { reader.accountRequest++; reader.loadedUser = null; reader.highlights = []; reader.verseNotes = []; reader.readLog = []; reader.place = null; }
  function hide() { stopSpeech(); reader.requestId++; reader.root = null; clearRotation(); }
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
          if (logged && reader.context.celebrate) await reader.context.api('/bible/achievements/check', 'POST', {}).catch(() => null);
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
      case 'download-all': downloadBible(); break;
      case 'rotate': reader.rotated = !reader.rotated; updateRotated(); break;
      case 'speak': speakAt(speech.paused && speech.verse ? speech.verse : (reader.selectedVerse || firstSpokenVerse())); break;
      case 'speak-pause': pauseSpeech(); break;
      case 'speak-stop': stopSpeech(); break;
      case 'copy-verse': if (reader.selectedVerse) copyVerse(reader.selectedVerse); break;
      case 'share-verse': if (reader.selectedVerse) shareVerse(reader.selectedVerse); break;
      case 'smaller': reader.fontSize = Math.max(15, reader.fontSize - 2); rememberFont(); render(); break;
      case 'larger': reader.fontSize = Math.min(29, reader.fontSize + 2); rememberFont(); render(); break;
      case 'previous': if (reader.chapter > (bookInfo().chapterStart || 1)) move(reader.book, reader.chapter - 1); else if (reader.book > 1) move(reader.book - 1, reader.index.books[reader.book - 2].chapters); break;
      case 'next': if (reader.chapter < bookInfo().chapters) move(reader.book, reader.chapter + 1); else if (reader.book < reader.index.books.length) move(reader.book + 1, reader.index.books[reader.book].chapterStart || 1); break;
    }
  });
  window.BibleReader = { show, open, hide, resetAccount, applyVerseNotes };
})();
