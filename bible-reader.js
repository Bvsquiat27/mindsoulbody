(() => {
  'use strict';
  const esc = value => String(value ?? '').replace(/[&<>"']/g, char => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[char]));
  const reader = { index:null, rvrIndex:null, translation:'kjv', notes:null, fatherNotes:new Map(), noteKind:'All', notesOpen:false, bookData:new Map(), book:43, chapter:1, highlights:[], verseNotes:[], readLog:[], pendingVerse:null, place:null, loadedUser:null, accountRequest:0, selectedVerse:null, rotated:false, fontSize:19, requestId:0, root:null, context:null };
  const TRANSLATION_KEY = 'msb_bible_translation';
  const RVR_CACHE_NAME = 'msb-bible-rvr1909-4';
  const STORIES_CACHE_NAME = 'msb-stories-1';
  const STORY_ART_FILES = ['creation', 'noah', 'stars', 'joseph', 'moses', 'david', 'daniel', 'jonah', 'nativity', 'storm', 'children', 'feeding', 'sheep', 'easter'].flatMap(id => [`img/stories/${id}.webp`, `img/stories/${id}-512.webp`]);
  const fileName = id => `bible/${String(id).padStart(2, '0')}.json`;
  function activeTranslation(id) { return reader.translation === 'rvr' && id <= 66 ? 'rvr' : 'kjv'; }
  function dataKey(id) { return activeTranslation(id) + ':' + id; }
  const DEUTERO_ES = {67:'Tobías',68:'Judit',69:'Sabiduría',70:'Eclesiástico',71:'Baruc',72:'Carta de Jeremías',73:'Oración de Azarías',74:'Susana',75:'Bel y el Dragón',76:'1 Macabeos',77:'2 Macabeos',78:'Resto de Ester'};
  const BOOK_ES = [null,'Génesis','Éxodo','Levítico','Números','Deuteronomio','Josué','Jueces','Rut','1 Samuel','2 Samuel','1 Reyes','2 Reyes','1 Crónicas','2 Crónicas','Esdras','Nehemías','Ester','Job','Salmos','Proverbios','Eclesiastés','Cantar de los Cantares','Isaías','Jeremías','Lamentaciones','Ezequiel','Daniel','Oseas','Joel','Amós','Abdías','Jonás','Miqueas','Nahúm','Habacuc','Sofonías','Hageo','Zacarías','Malaquías','Mateo','Marcos','Lucas','Juan','Hechos','Romanos','1 Corintios','2 Corintios','Gálatas','Efesios','Filipenses','Colosenses','1 Tesalonicenses','2 Tesalonicenses','1 Timoteo','2 Timoteo','Tito','Filemón','Hebreos','Santiago','1 Pedro','2 Pedro','1 Juan','2 Juan','3 Juan','Judas','Apocalipsis','Tobías','Judit','Sabiduría','Eclesiástico','Baruc','Carta de Jeremías','Oración de Azarías','Susana','Bel y el Dragón','1 Macabeos','2 Macabeos','Resto de Ester'];
  function spanishUi() { return window.MsbI18n && MsbI18n.lang() === 'es'; }
  function displayBook(info) {
    if (!info) return '';
    if ((reader.translation === 'rvr' || spanishUi()) && info.id <= 66 && reader.rvrIndex) {
      const row = reader.rvrIndex.books.find(book => book.id === info.id);
      if (row && row.name) return row.name;
    }
    if ((reader.translation === 'rvr' || spanishUi()) && info.id <= 66 && BOOK_ES[info.id]) return BOOK_ES[info.id];
    if (spanishUi() && DEUTERO_ES[info.id]) return DEUTERO_ES[info.id];
    return info.name;
  }
  function loadTranslation() {
    try {
      const saved = localStorage.getItem(TRANSLATION_KEY);
      if (saved === 'rvr' || saved === 'kjv') { reader.translation = saved; return; }
      reader.translation = spanishUi() ? 'rvr' : 'kjv';
    } catch { reader.translation = 'kjv'; }
  }
  const RVR_SPAN = {'4:13:33':'33–34','4:30:16':'16–17','7:14:20':'20–21','9:20:42':'42–43','9:24:22':'22–23','11:22:53':'53–54','13:21:30':'30–31','14:16:14':'14–15','18:39:30':'30–38','28:12:14':'14–15','32:2:10':'10–11','64:1:14':'14–15'};
  function verseHeading(verseNumber) {
    const map = reader.bookData.get(dataKey(reader.book))?.headings;
    return map ? (map[reader.chapter + ':' + verseNumber] || '') : '';
  }
  function chapterPrologue() {
    if (reader.chapter !== 1 || activeTranslation(reader.book) === 'rvr') return '';
    return reader.bookData.get(dataKey(reader.book))?.prologue || '';
  }
  function verseLabel(verseNumber) {
    if (activeTranslation(reader.book) !== 'rvr') return String(verseNumber);
    return RVR_SPAN[reader.book + ':' + reader.chapter + ':' + verseNumber] || String(verseNumber);
  }
  function kjvAligned(display) {
    if (activeTranslation(reader.book) === 'rvr' && reader.book === 18 && reader.chapter === 40 && display >= 1 && display <= 19) return display + 5;
    return display;
  }
  function coveredIds(display) {
    if (activeTranslation(reader.book) !== 'rvr') return [display];
    const label = RVR_SPAN[reader.book + ':' + reader.chapter + ':' + display];
    const match = label && String(label).match(/^(\d+)\u2013(\d+)$/);
    if (match) {
      const ids = [];
      for (let n = Number(match[1]); n <= Number(match[2]); n++) ids.push(n);
      return ids;
    }
    return [kjvAligned(display)];
  }
  function colorFor(display) {
    const ids = new Set(coveredIds(display));
    const hit = reader.highlights.find(item => item.book_id === reader.book && item.chapter === reader.chapter && ids.has(item.verse));
    return hit ? hit.color : '';
  }
  function displayForStored(verse) {
    const n = Number(verse);
    if (!n) return n;
    if (activeTranslation(reader.book) === 'rvr' && reader.book === 18 && reader.chapter === 40 && n >= 6 && n <= 24) return n - 5;
    if (activeTranslation(reader.book) === 'rvr') {
      const prefix = reader.book + ':' + reader.chapter + ':';
      for (const key of Object.keys(RVR_SPAN)) {
        if (!key.startsWith(prefix)) continue;
        const start = Number(key.slice(prefix.length));
        const match = String(RVR_SPAN[key]).match(/^(\d+)\u2013(\d+)$/);
        if (match && n >= Number(match[1]) && n <= Number(match[2])) return start;
      }
    }
    return n;
  }
  function chapterSubscription(info) {
    if (!info || reader.chapter !== info.chapters) return '';
    if (activeTranslation(reader.book) === 'rvr') {
      const row = reader.rvrIndex && reader.rvrIndex.books.find(book => book.id === info.id);
      return row && row.subscription ? row.subscription : '';
    }
    return info.subscription || '';
  }
  function noteCopy(note) {
    const title = spanishUi() && note.titleEs ? note.titleEs : (note.title || '');
    let body = spanishUi() && note.bodyEs ? note.bodyEs : (note.body || '');
    if (spanishUi() && !note.bodyEs && body) body += '\n\n(en inglés)';
    return { title, body };
  }
  window.msbBookLabel = (id, fallback) => {
    const n = Number(id);
    if (spanishUi() && BOOK_ES[n]) return BOOK_ES[n];
    const info = reader.index?.books?.find(book => book.id === n);
    return info ? displayBook(info) : (fallback || '');
  };
  function rememberTranslation() { try { localStorage.setItem(TRANSLATION_KEY, reader.translation); } catch {} }
  const bookInfo = () => reader.index?.books.find(book => book.id === reader.book);
  const currentVerses = () => reader.bookData.get(dataKey(reader.book))?.chapters[reader.chapter - 1] || [];
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
  function plainBible(text) {
    return String(text ?? '').replace(/\S+/g, (token) => {
      if (!token.includes('\u00B4')) return token;
      return token.replace(/\u00B4/g, '').replace(/-/g, '');
    });
  }
  window.msbPlainBible = plainBible;
  function verseBody(verse){
    const verses = currentVerses(), offset = verseOffset();
    const text = verses[verse - 1 - offset] || '';
    return reader.book >= 67 ? plainBible(text) : text;
  }
  function firstSpokenVerse(){
    const verses = currentVerses(), offset = verseOffset();
    for (let i = 0; i < verses.length; i++) if (verses[i]) return i + 1 + offset;
    return 0;
  }
  function shareLine(verse){
    const info = bookInfo();
    return `${verseBody(verse)} — ${info ? displayBook(info) : 'Bible'} ${reader.chapter}:${verse}`.trim();
  }
  function clearSpeakingClass(){ reader.root?.querySelectorAll('.bible-speaking').forEach(el => el.classList.remove('bible-speaking')); }
  function markSpeaking(verse){ reader.root?.querySelectorAll('.bible-verse').forEach(el => el.classList.toggle('bible-speaking', Number(el.dataset.bibleVerse) === verse)); }
  function releaseSpeechAudio(){ if (window.msbYieldAudio) { try { window.msbYieldAudio('speech', false); } catch {} } }
  function paintSpeechButtons(){
    const pause = reader.root?.querySelector('[data-bible="speak-pause"]');
    if (pause) pause.setAttribute('aria-pressed', speech.paused ? 'true' : 'false');
  }
  function stopSpeech(){
    speech.generation++;
    speech.playing = false;
    speech.paused = false;
    try { window.speechSynthesis?.cancel(); } catch {}
    clearSpeakingClass();
    releaseSpeechAudio();
    if (window.MsbSpeech) MsbSpeech.wake(false);
    paintSpeechButtons();
  }
  function speakAt(verse){
    const synth = window.speechSynthesis;
    if (!synth || typeof SpeechSynthesisUtterance !== 'function') {
      const message = 'This browser cannot read aloud.';
      reader.context?.toast?.(window.MsbI18n ? MsbI18n.t(message) : message);
      return;
    }
    const text = verseBody(verse);
    if (!text) { stopSpeech(); return; }
    const generation = ++speech.generation;
    try { synth.cancel(); } catch {}
    speech.playing = true;
    speech.paused = false;
    speech.verse = verse;
    markSpeaking(verse);
    paintSpeechButtons();
    if (window.msbYieldAudio) { try { window.msbYieldAudio('speech', true); } catch {} }
    if (window.MsbSpeech) MsbSpeech.wake(true);
    const spanish = activeTranslation(reader.book) === 'rvr' || (spanishUi() && reader.book > 66);
    const utter = new SpeechSynthesisUtterance(text);
    utter.lang = spanish ? 'es-MX' : 'en-US';
    utter.rate = window.MsbSpeech ? MsbSpeech.rate() : 1;
    const voice = window.MsbSpeech ? MsbSpeech.pickVoice(spanish) : null;
    if (voice) utter.voice = voice;
    const advance = () => {
      if (generation !== speech.generation || speech.paused) return;
      const verses = currentVerses(), offset = verseOffset();
      let next = verse + 1;
      while (next - 1 - offset < verses.length && !verses[next - 1 - offset]) next++;
      if (next - 1 - offset < verses.length && verses[next - 1 - offset]) speakAt(next);
      else { speech.playing = false; speech.paused = false; clearSpeakingClass(); releaseSpeechAudio(); if (window.MsbSpeech) MsbSpeech.wake(false); }
    };
    utter.onend = advance;
    utter.onerror = () => { if (generation === speech.generation) { speech.playing = false; releaseSpeechAudio(); if (window.MsbSpeech) MsbSpeech.wake(false); } };
    try { synth.speak(utter); } catch { speech.playing = false; releaseSpeechAudio(); }
  }
  function pauseSpeech(){
    if (!speech.playing && !speech.verse) return;
    speech.paused = true;
    speech.playing = false;
    speech.generation++;
    try { window.speechSynthesis?.cancel(); } catch {}
    releaseSpeechAudio();
    if (window.MsbSpeech) MsbSpeech.wake(false);
    paintSpeechButtons();
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
  function fathersFile(id){ return `bible/fathers/${String(id).padStart(2, '0')}.json`; }
  function loadedNotes(){
    return (reader.notes || []).concat(reader.fatherNotes.get(reader.book) || []);
  }
  const NOTE_KIND_ES = { Father:'Padre de la Iglesia', Teaching:'Enseñanza', Apologetics:'Apologética', 'Original language':'Idioma original', 'Study Bible':'Biblia de estudio', Theology:'Teología', 'Textual study':'Estudio del texto' };
  function noteKindLabel(kind){ return spanishUi() ? (NOTE_KIND_ES[kind] || kind || '') : (kind || ''); }
  function noteVisible(note){
    return reader.noteKind === 'All' || note.kind === reader.noteKind;
  }
  function render() {
    if (!reader.root || !reader.index || !reader.root.isConnected) return;
    const books = reader.index.books, info = bookInfo(), verses = currentVerses(), highlights = reader.highlights;
    const pool = loadedNotes().filter(noteVisible);
    const chapterNotes = pool.filter(note => note.book === reader.book && note.chapter === reader.chapter);
    const relatedNotes = pool.filter(note => note.book === reader.book || (note.links || []).some(link => link.book === reader.book && link.chapter === reader.chapter));
    const displayedNotes = chapterNotes.length ? chapterNotes : relatedNotes.length ? relatedNotes.slice(0, 6) : pool.filter(note => note.book === reader.book).slice(0, 6);
    const reference = (book, chapter, verse) => `${displayBook(books[book - 1]) || ''} ${chapter}:${verse}`;
    const renderNote = note => { const copy = noteCopy(note); return `<section class="bible-study-card"><span class="tag">${esc(noteKindLabel(note.kind))} · ${esc(reference(note.book, note.chapter, note.verse))}</span><h4>${esc(copy.title)}</h4><p>${esc(copy.body)}</p><small>${esc(note.author)}</small><div class="bible-study-links"><button data-jump-book="${note.book}" data-jump-chapter="${note.chapter}" data-jump-verse="${note.verse}">${spanishUi() ? 'Leer' : 'Read'} ${esc(reference(note.book, note.chapter, note.verse))} →</button>${(note.links || []).map(link => `<button data-jump-book="${link.book}" data-jump-chapter="${link.chapter}" data-jump-verse="${link.verse}">${esc(reference(link.book, link.chapter, link.verse))} ↗</button>`).join('')}</div><a href="${esc(note.source)}" target="_blank" rel="noopener noreferrer">${esc(note.sourceLabel || "Open source ↗")}</a><button class="bible-copy-source" data-copy-source="${esc(note.source)}">Copy source link</button></section>`; };
    const kindFilters = (spanishUi() ? [['All','Todas'],['Father','Padres'],['Teaching','Enseñanza'],['Apologetics','Apologética']] : [['All','All'],['Father','Fathers'],['Teaching','Teaching'],['Apologetics','Apologetics']]).map(([id, label]) => `<button type="button" class="filter ${reader.noteKind === id ? 'active' : ''}" data-bible="note-kind" data-kind="${id}" aria-pressed="${reader.noteKind === id}">${label}</button>`).join('');
    const studyMarkup = displayedNotes.map(renderNote).join('');
    const selectedNotes = reader.selectedVerse ? chapterNotes.filter(note => note.verse === reader.selectedVerse) : [];
    const myNoteAt = verse => (reader.verseNotes || []).find(n => n.book_id === reader.book && n.chapter === reader.chapter && n.verse === verse) || null;
    const mySelected = reader.selectedVerse ? myNoteAt(reader.selectedVerse) : null;
    const loggedHere = (reader.readLog || []).some(item => item.book_id === reader.book && item.chapter === reader.chapter);
    const bookChaptersTotal = info ? info.chapters - (info.chapterStart || 1) + 1 : 0;
    const bookChaptersLogged = new Set((reader.readLog || []).filter(item => item.book_id === reader.book).map(item => item.chapter)).size;
    const myNoteBox = reader.selectedVerse ? `<div class="bible-inline-notes bible-my-note"><div class="bible-inline-title"><strong>${spanishUi() ? 'Tu nota' : 'Your note'} · ${esc(reference(reader.book, reader.chapter, reader.selectedVerse))}</strong></div>${mySelected && mySelected.from_name ? `<small class="muted">Shared by ${esc(mySelected.from_name)} — edit it freely; your copy is yours.</small>` : ''}<textarea id="bible-my-note" class="note-field" rows="3" placeholder="Write your own note on this verse…">${esc(mySelected ? mySelected.body : '')}</textarea><div class="note-actions"><button class="secondary" data-bible="save-verse-note">Save my note</button>${mySelected ? '<button class="secondary" data-bible="delete-verse-note">Delete my note</button>' : ''}</div></div>` : '';
    const shownName = displayBook(info);
    const translationNote = reader.translation === 'rvr' && reader.book > 66 ? '<p class="bible-translation-note">Reina-Valera 1909 does not include this book, so this chapter stays in English.</p>' : '';
    const prologueText = chapterPrologue();
    const prologue = prologueText ? `<p class="bible-prologue">${esc(prologueText)}</p>` : '';
    const subscriptionText = chapterSubscription(info);
    const subscription = subscriptionText ? `<p class="bible-subscription">${esc(subscriptionText)}</p>` : '';
    const missingBook = !!reader.bookData.get(dataKey(reader.book))?.missing;
    const sections = ['Old Testament', 'New Testament', 'Deuterocanon / Apocrypha'];
    const savedMarkup = !reader.context.isRegistered() ? '<p class="muted">Sign in to keep your highlights in this browser.</p>' : highlights.length ? `<div class="bible-saved-list">${highlights.map(item => `<button data-jump-book="${item.book_id}" data-jump-chapter="${item.chapter}" data-jump-verse="${item.verse}"><span class="bible-swatch ${esc(item.color)}"></span>${esc(books[item.book_id - 1]?.name)} ${item.chapter}:${item.verse}</button>`).join('')}</div>` : '<p class="muted">Tap a verse, choose a color, and it will appear here.</p>';
    reader.root.innerHTML = `<div class="bible-app"><header class="bible-heading"><div><span class="eyebrow">THE FULL READING SHELF</span><h1>Read the Bible.</h1><p class="lead">Choose a book and chapter. Tap a verse to highlight it.</p></div><span class="bible-edition">${reader.translation === 'rvr' ? 'Reina-Valera 1909' : 'KJV'}</span></header>
      ${offlineMarkup()}
      <div class="bible-layout"><div class="bible-primary"><div class="bible-controls card"><label>Book<select id="bible-book">${sections.map(section => `<optgroup label="${esc(section)}">${books.filter(book => book.section === section).map(book => `<option value="${book.id}" ${book.id === reader.book ? 'selected' : ''}>${esc(displayBook(book))}</option>`).join('')}</optgroup>`).join('')}</select></label><label>Chapter<select id="bible-chapter">${Array.from({ length:info.chapters - (info.chapterStart || 1) + 1 }, (_, i) => { const chapter = i + (info.chapterStart || 1); return `<option value="${chapter}" ${chapter === reader.chapter ? 'selected' : ''}>${chapter}</option>`; }).join('')}</select></label><label>Translation<select id="bible-translation"><option value="kjv" ${reader.translation !== 'rvr' ? 'selected' : ''}>KJV</option><option value="rvr" ${reader.translation === 'rvr' ? 'selected' : ''}>RVR1909</option></select></label><div class="bible-control-buttons"><button class="secondary" data-bible="previous" aria-label="Previous chapter">←</button><button class="secondary" data-bible="next" aria-label="Next chapter">→</button><button class="secondary" data-bible="smaller" aria-label="Smaller text">A−</button><button class="secondary" data-bible="larger" aria-label="Larger text">A+</button><button class="secondary" data-bible="speak" aria-label="Read this chapter aloud">Read aloud</button><button class="secondary" data-bible="speak-pause" aria-label="Pause reading" aria-pressed="${speech.paused}">Pause</button><button class="secondary" data-bible="speak-stop" aria-label="Stop reading">Stop</button>${window.MsbSpeech ? MsbSpeech.rateHtml() : ''}<button class="secondary" data-bible="rotate" aria-label="Rotate reading view" aria-pressed="${reader.rotated}">⤾ <span>Rotate</span></button><button class="secondary" data-bible="notes" aria-expanded="${reader.notesOpen}">${spanishUi() ? 'Notas de estudio' : 'Study notes'} (${chapterNotes.length})</button></div></div>
      <article class="bible-page card" style="--reader-size:${reader.fontSize}px"><div class="bible-page-title"><span class="eyebrow">${esc(info.section)}</span><h2>${esc(shownName)} ${reader.chapter}</h2>${translationNote}${missingBook ? `<p class="bible-translation-note">${spanishUi() ? 'Este capítulo todavía no está en el dispositivo. Conéctate o descarga la Biblia.' : 'This chapter is not on this device yet. Reconnect, or download the Bible for offline.'}</p>` : ''}<small>${verses.filter(text => String(text || '').trim()).length} ${spanishUi() ? 'versículos' : 'verses'}</small></div>${prologue}${selectedNotes.length ? `<div id="bible-verse-note" class="bible-inline-notes" aria-live="polite"><div class="bible-inline-title"><strong>${spanishUi() ? 'Notas de estudio' : 'Study notes'} · ${esc(reference(reader.book, reader.chapter, reader.selectedVerse))}</strong><button class="text-button" data-bible="close-note" aria-label="${spanishUi() ? 'Cerrar la nota de estudio' : 'Close study note'}">×</button></div>${selectedNotes.map(renderNote).join('')}</div>` : ''}${myNoteBox}${reader.selectedVerse ? `<div class="bible-highlight-tools" role="group" aria-label="${spanishUi() ? 'Subrayar el versículo' : 'Highlight verse'} ${reader.selectedVerse}"><span>${spanishUi() ? 'Versículo' : 'Verse'} ${reader.selectedVerse}</span><button data-color="teal" aria-label="Highlight teal" title="Teal"></button><button data-color="gold" aria-label="Highlight gold" title="Gold"></button><button data-color="rose" aria-label="Highlight rose" title="Rose"></button><button class="bible-clear-highlight" data-color="remove" aria-label="Clear highlight" title="Clear highlight"></button><button class="secondary" data-bible="copy-verse" aria-label="${spanishUi() ? 'Copiar el versículo' : 'Copy verse'} ${reader.selectedVerse}">Copy</button><button class="secondary" data-bible="share-verse" aria-label="${spanishUi() ? 'Compartir el versículo' : 'Share verse'} ${reader.selectedVerse}">Share</button><button class="secondary" data-bible="send-verse" aria-label="Send to a friend">Send to a friend</button><button class="secondary" data-bible="memorize-verse" aria-label="Memorize this">Memorize this</button></div>` : ''}<div class="bible-verses" data-i18n-skip>${verses.map((text, i) => {
        if (!String(text || '').trim()) return '';
        const n = i + 1 + verseOffset();
        const label = verseLabel(n);
        const heading = verseHeading(n);
        const color = colorFor(n);
        return `${heading ? `<p class="bible-verse-heading">${esc(heading)}</p>` : ''}<button class="bible-verse ${color ? 'highlight-' + color : ''} ${reader.selectedVerse === n ? 'selected' : ''}${speech.playing && speech.verse === n ? ' bible-speaking' : ''}" data-bible-verse="${n}" data-covers="${esc(coveredIds(n).join(' '))}" aria-label="${spanishUi() ? 'Versículo' : 'Verse'} ${esc(label)}: ${esc(text)}"><sup>${esc(label)}</sup>${esc(text)}${chapterNotes.some(note => note.verse === n) ? '<span class="bible-annotation" aria-label="Study note available">✦</span>' : ''}${myNoteAt(n) ? '<span class="bible-annotation bible-my-mark" aria-label="Your note on this verse">✎</span>' : ''}</button>`;
      }).join('')}</div>${subscription}<div class="bible-page-foot"><button class="text-button" data-bible="previous">← Previous</button><span class="bible-log-wrap"><button class="secondary bible-log-btn ${loggedHere ? 'bible-logged' : ''}" data-bible="log-read" aria-pressed="${loggedHere}">${loggedHere ? (spanishUi() ? `✓ ${esc(shownName)} ${reader.chapter} registrado — toca para deshacer` : `✓ ${esc(shownName)} ${reader.chapter} logged — tap to undo`) : (spanishUi() ? `✓ Marcar ${esc(shownName)} ${reader.chapter} como leído` : `✓ Log ${esc(shownName)} ${reader.chapter} as read`)}</button><span class="bible-log-progressbar" aria-hidden="true"><i style="width:${bookChaptersTotal ? Math.round(bookChaptersLogged / bookChaptersTotal * 100) : 0}%"></i></span><small class="bible-log-progress">${esc(shownName)}: ${spanishUi() ? `${bookChaptersLogged} de ${bookChaptersTotal} capítulos registrados` : `${bookChaptersLogged} of ${bookChaptersTotal} chapters logged`}</small></span><button class="text-button" data-bible="next">Next →</button></div></article></div>
      <aside class="bible-aside"><div class="card"><span class="eyebrow">YOUR MARKS</span><h3>Highlighted verses</h3>${savedMarkup}<p class="small">Your highlights stay in this browser.</p><button type="button" class="text-button" data-nav="marks">All marks</button></div>${reader.notesOpen ? `<div class="card" id="bible-notes"><span class="eyebrow">STUDY ALONGSIDE SCRIPTURE</span><h3>${chapterNotes.length ? (spanishUi() ? `Notas sobre ${esc(shownName)} ${reader.chapter}` : `Notes on ${esc(shownName)} ${reader.chapter}`) : (spanishUi() ? 'Explora la biblioteca de estudio' : 'Explore the study library')}</h3><div class="bible-note-filters" role="group" aria-label="Study note kinds">${kindFilters}</div><p class="small">${spanishUi() ? 'Padres de la Iglesia · Enseñanza · Apologética. Las citas de los Padres son breves. Usa el enlace de la fuente para leer el pasaje completo.' : 'Father · Teaching · Apologetics. Father lines are short quotations. Use the source link to read the passage.'}</p><div class="bible-study-stack">${studyMarkup || (spanishUi() ? '<p class="muted">No hay notas de este tipo en este capítulo.</p>' : '<p class="muted">No notes of this kind on this chapter.</p>')}</div></div>` : `<div class="card" id="bible-notes"><span class="eyebrow">STUDY ALONGSIDE SCRIPTURE</span><h3>${spanishUi() ? 'Notas de estudio' : 'Study notes'}</h3><p class="small">${spanishUi() ? 'Están plegadas hasta que las abras.' : 'They stay folded until you open them.'}</p></div>`}</aside></div></div>`;
    updateRotated();
    if (window.MsbI18n) MsbI18n.apply(reader.root);
    if (!reader.offline) refreshOffline();
  }
  const BIBLE_CACHE_NAME = 'msb-bible-kjv-3';
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
  async function readCachedFrom(cacheName, url){
    try {
      if (!('caches' in window)) return null;
      const previous = { 'msb-bible-kjv-3': ['msb-bible-kjv-2', 'msb-bible-kjv-1'], 'msb-bible-rvr1909-4': ['msb-bible-rvr1909-3', 'msb-bible-rvr1909-2', 'msb-bible-rvr1909-1'] };
      const names = [cacheName].concat(previous[cacheName] || []);
      const present = await caches.keys();
      for (const name of names) {
        if (!present.includes(name)) continue;
        const cache = await caches.open(name);
        const hit = cache ? await cache.match(url) : null;
        if (hit) return hit;
      }
      return null;
    } catch { return null; }
  }
  async function readCached(url){ return readCachedFrom(BIBLE_CACHE_NAME, url); }
  function offlineLabel(){
    const s = reader.offline || {books:0, bytes:0, scanning:true, busy:false, done:0};
    const es = spanishUi();
    if (s.busy) return es ? `Descargando ${s.done} de ${BIBLE_BOOK_TOTAL} libros · ${formatBytes(s.bytes)}` : `Downloading ${s.done} of ${BIBLE_BOOK_TOTAL} books · ${formatBytes(s.bytes)}`;
    if (s.unsupported) return es ? 'Este navegador no puede guardar libros para leer sin conexión.' : 'This browser cannot store books for offline reading.';
    if (s.scanning) return es ? 'Revisando los libros guardados…' : 'Checking saved books…';
    if (s.books >= BIBLE_BOOK_TOTAL) return es ? `${s.books} de ${BIBLE_BOOK_TOTAL} libros · ${formatBytes(s.bytes)} descargados` : `${s.books} of ${BIBLE_BOOK_TOTAL} books · ${formatBytes(s.bytes)} downloaded`;
    if (s.books > 0) return es ? `${s.books} de ${BIBLE_BOOK_TOTAL} libros · ${formatBytes(s.bytes)} guardados` : `${s.books} of ${BIBLE_BOOK_TOTAL} books · ${formatBytes(s.bytes)} saved`;
    return es ? `0 de ${BIBLE_BOOK_TOTAL} libros guardados para leer sin conexión` : `0 of ${BIBLE_BOOK_TOTAL} books saved for offline`;
  }
  function offlineButtonLabel(){
    const s = reader.offline || {};
    const es = spanishUi();
    if (s.busy) return es ? 'Descargando…' : 'Downloading…';
    if ((s.books || 0) >= BIBLE_BOOK_TOTAL) return es ? 'La Biblia completa ya está descargada' : 'Whole Bible downloaded';
    if ((s.books || 0) > 0) return es ? 'Descargar el resto para leer sin conexión' : 'Download the rest for offline';
    return es ? 'Descargar toda la Biblia para leer sin conexión' : 'Download whole Bible for offline';
  }
  function offlineMarkup(){
    const s = reader.offline || {books:0, bytes:0, scanning:true, busy:false};
    const books = s.books || 0;
    const pct = Math.max(0, Math.min(100, Math.round(books / BIBLE_BOOK_TOTAL * 100)));
    const done = (books >= BIBLE_BOOK_TOTAL) && !s.busy;
    return `<section class="card bible-offline"><span class="eyebrow">OFFLINE</span><h3 id="bible-offline-title">Whole Bible on this device</h3><p class="small">The download also saves the Reina-Valera 1909.</p><p id="bible-offline-label" aria-live="polite">${offlineLabel()}</p><div class="bible-offline-bar" role="progressbar" aria-valuemin="0" aria-valuemax="${BIBLE_BOOK_TOTAL}" aria-valuenow="${books}" aria-label="Bible books saved on this device"><i id="bible-offline-fill" style="width:${pct}%"></i></div><button type="button" class="primary" data-bible="download-all" ${done || s.busy ? 'disabled' : ''}>${offlineButtonLabel()}</button></section>`;
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
    const files = ['bible/index.json', ...Array.from({length:BIBLE_BOOK_TOTAL}, (_, i) => bibleFile(i + 1)), ...Array.from({length:BIBLE_BOOK_TOTAL}, (_, i) => fathersFile(i + 1))];
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
        if (/^bible\/\d\d\.json$/.test(file)) bookCount += 1;
        reader.offline = {books:bookCount, bytes, scanning:false, busy:true, done:bookCount};
        paintOffline();
      }
      const rvrCache = await caches.open(RVR_CACHE_NAME);
      const rvrFiles = ['bible/rvr/index.json', ...Array.from({ length: 66 }, (_, i) => `bible/rvr/${String(i + 1).padStart(2, '0')}.json`)];
      for (const file of rvrFiles) {
        const url = new URL(file, location.href).href;
        const response = await fetch(url);
        if (!response.ok) throw Error(`Could not download ${file}.`);
        const buffer = await response.arrayBuffer();
        bytes += buffer.byteLength;
        await rvrCache.put(url, new Response(buffer, { headers: { 'Content-Type': 'application/json' } }));
        reader.offline = { books: bookCount, bytes, scanning: false, busy: true, done: bookCount };
        paintOffline();
      }
      const storyCache = await caches.open(STORIES_CACHE_NAME);
      for (const file of STORY_ART_FILES) {
        const url = new URL(file, location.href).href;
        const response = await fetch(url);
        if (!response.ok) throw Error(`Could not download ${file}.`);
        const buffer = await response.arrayBuffer();
        bytes += buffer.byteLength;
        await storyCache.put(url, new Response(buffer, { headers: { 'Content-Type': 'image/webp' } }));
        reader.offline = { books: bookCount, bytes, scanning: false, busy: true, done: bookCount };
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
  async function ensureRvrIndex() {
    if (reader.rvrIndex) return;
    let response = null;
    try { response = await fetch('bible/rvr/index.json'); } catch { response = null; }
    if (!response || !response.ok) response = await readCachedFrom(RVR_CACHE_NAME, 'bible/rvr/index.json');
    if (!response || !response.ok) throw Error('The Spanish Bible index is unavailable.');
    reader.rvrIndex = await response.json();
  }
  async function ensureBook(id) {
    const key = dataKey(id);
    if (reader.bookData.has(key)) return;
    const rvr = activeTranslation(id) === 'rvr';
    if (rvr) await ensureRvrIndex();
    const url = rvr ? `bible/rvr/${String(id).padStart(2, '0')}.json` : bibleFile(id);
    const cacheName = rvr ? RVR_CACHE_NAME : BIBLE_CACHE_NAME;
    const expected = rvr ? reader.rvrIndex?.books?.[id - 1]?.name : reader.index.books[id - 1]?.name;
    let response = null;
    try { response = await fetch(url); } catch { response = null; }
    if (!response || !response.ok) response = await readCachedFrom(cacheName, url);
    if (!response || !response.ok) {
      reader.bookData.set(key, { book: expected || '', chapters: [], missing: true });
      return;
    }
    const data = await response.json();
    if (!Array.isArray(data.chapters) || data.book !== expected) throw Error('This book could not be verified.');
    if (!rvr && id >= 67) data.chapters = data.chapters.map(chapter => Array.isArray(chapter) ? chapter.map(verse => typeof verse === 'string' ? plainBible(verse) : verse) : chapter);
    reader.bookData.set(key, data);
  }
  async function ensureFathers(id) {
    if (reader.fatherNotes.has(id)) return;
    const url = fathersFile(id);
    let response = null;
    try { response = await fetch(url); } catch { response = null; }
    if (!response || !response.ok) response = await readCached(url);
    let notes = [];
    if (response && response.ok) {
      try { notes = await response.json(); } catch { notes = []; }
    }
    reader.fatherNotes.set(id, Array.isArray(notes) ? notes : []);
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
    reader.root = root; reader.context = context; loadFont(); loadTranslation();
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
      try { await ensureRvrIndex(); }
      catch (error) { if (reader.translation === 'rvr') throw error; }
      if (!reader.notes) {
        try {
          const response = await fetch('bible/study-notes.json', { cache:'no-store' });
          reader.notes = response.ok ? await response.json() : [];
        } catch { reader.notes = []; }
      }
      await loadAccount();
      if (!reader.index.books[reader.book - 1] || reader.chapter < (reader.index.books[reader.book - 1].chapterStart || 1) || reader.chapter > reader.index.books[reader.book - 1].chapters) { reader.book = 43; reader.chapter = 1; }
      await Promise.all([ensureBook(reader.book), ensureFathers(reader.book)]);
      if (requestId === reader.requestId && root.isConnected) {
        render();
        if (reader.pendingVerse) {
          const verse = reader.pendingVerse; reader.pendingVerse = null;
          reader.selectedVerse = displayForStored(verse); render();
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
      reader.book = book; reader.chapter = chapter; reader.selectedVerse = verse ? displayForStored(verse) : null; reader.explicitOpen = false;
    const requestId = ++reader.requestId;
    reader.root.innerHTML = '<div class="loading">Turning the page…</div>';
    try {
      await Promise.all([ensureBook(book), ensureFathers(book)]);
      if (requestId !== reader.requestId) return;
      render();
      localStorage.setItem('lampstand_bible_place', `${book}:${chapter}`);
      if (reader.context.isRegistered()) reader.context.api('/bible/place', 'POST', { book_id:book, chapter }).catch(error => reader.context.toast(error.message));
      if (verse) setTimeout(() => {
        const shown = reader.selectedVerse;
        const direct = reader.root?.querySelector(`[data-bible-verse="${shown}"]`);
        const covered = direct || [...(reader.root?.querySelectorAll('[data-covers]') || [])].find(node => (node.dataset.covers || '').split(/\s+/).includes(String(verse)));
        covered?.scrollIntoView({block:'center'});
      }, 0);
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
    if (event.target.id === 'bible-translation') { reader.translation = event.target.value === 'rvr' ? 'rvr' : 'kjv'; rememberTranslation(); move(reader.book, reader.chapter, reader.selectedVerse || null); }
  });
  document.addEventListener('click', async event => {
    const target = event.target.closest('[data-bible-verse],[data-bible],[data-color],[data-jump-book],[data-copy-source]');
    if (!target || (!target.closest('.bible-app') && target.dataset.bible !== 'retry')) return;
    if (target.dataset.bibleVerse) { reader.selectedVerse = Number(target.dataset.bibleVerse); render(); if (reader.root?.querySelector('#bible-verse-note')) reader.root.querySelector('#bible-verse-note').scrollIntoView({block:'start', behavior:'smooth'}); return; }
    if (target.dataset.copySource) { try { await navigator.clipboard.writeText(target.dataset.copySource); reader.context.toast('Source link copied.'); } catch { reader.context.toast('Use the Open source link instead.'); } return; }
    if (target.dataset.jumpBook) { await move(Number(target.dataset.jumpBook), Number(target.dataset.jumpChapter), Number(target.dataset.jumpVerse)); return; }
    if (target.dataset.color) {
      if (!reader.context.isRegistered()) { reader.context.promptSignup(); return; }
      const verse = coveredIds(reader.selectedVerse)[0], book = reader.book, chapter = reader.chapter, color = target.dataset.color === 'remove' ? null : target.dataset.color;
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
      case 'notes': reader.notesOpen = !reader.notesOpen; render(); if (reader.notesOpen) reader.root?.querySelector('#bible-notes')?.scrollIntoView({block:'start',behavior:'smooth'}); break;
      case 'note-kind': reader.noteKind = target.dataset.kind || 'All'; render(); break;
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
      case 'memorize-verse': {
        if (!reader.selectedVerse || !window.MsbMemory) break;
        const info = bookInfo();
        const canonical = coveredIds(reader.selectedVerse)[0];
        const text = verseBody(reader.selectedVerse);
        window.MsbMemory.add({
          book: reader.book,
          chapter: reader.chapter,
          verse: canonical,
          text,
          translation: activeTranslation(reader.book) === 'rvr' ? 'rvr' : 'kjv',
          reference: `${displayBook(info)} ${reader.chapter}:${verseLabel(reader.selectedVerse)}`
        });
        break;
      }
      case 'send-verse': {
        if (!reader.selectedVerse) break;
        const info = bookInfo();
        const canonical = coveredIds(reader.selectedVerse)[0];
        const payload = { book: reader.book, chapter: reader.chapter, verse: canonical, text: verseBody(reader.selectedVerse), reference: `${displayBook(info)} ${reader.chapter}:${verseLabel(reader.selectedVerse)}`, translation: activeTranslation(reader.book) === 'rvr' ? 'rvr' : 'kjv' };
        if (window.msbOpenVerseSend) window.msbOpenVerseSend(payload);
        else reader.context?.toast?.('Sending verses is coming soon.');
        break;
      }
      case 'smaller': reader.fontSize = Math.max(15, reader.fontSize - 2); rememberFont(); render(); break;
      case 'larger': reader.fontSize = Math.min(29, reader.fontSize + 2); rememberFont(); render(); break;
      case 'previous': if (reader.chapter > (bookInfo().chapterStart || 1)) move(reader.book, reader.chapter - 1); else if (reader.book > 1) move(reader.book - 1, reader.index.books[reader.book - 2].chapters); break;
      case 'next': if (reader.chapter < bookInfo().chapters) move(reader.book, reader.chapter + 1); else if (reader.book < reader.index.books.length) move(reader.book + 1, reader.index.books[reader.book].chapterStart || 1); break;
    }
  });
  window.BibleReader = { show, open, hide, resetAccount, applyVerseNotes };
})();
