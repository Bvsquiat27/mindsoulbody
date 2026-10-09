/* Verses between accepted friends, and a private study notebook for two people.
   If the live worker does not have these routes yet, the screens say so
   and the rest of the app keeps working. */
(() => {
  'use strict';
  const DRAFT_KEY = 'msb_study_drafts';
  let verseRoutes = 'unknown';
  let studyRoutes = 'unknown';
  let inboxCache = null;
  let studyFriend = '';
  let bookCatalog = null;
  let flashId = '';
  const composer = { entryId: '', question: '', answer: '', book: 0, chapter: 1, verse: 1, picker: false, query: '' };

  function esc(value) {
    return String(value ?? '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
  }
  function toast(message) {
    const el = document.getElementById('toast');
    const text = window.MsbI18n ? MsbI18n.t(String(message ?? '')) : String(message ?? '');
    if (!el) return;
    el.textContent = text;
    el.classList.add('show');
    clearTimeout(toast.timer);
    toast.timer = setTimeout(() => el.classList.remove('show'), 4500);
  }
  function id() { return window.msbFriendsId ? msbFriendsId() : null; }
  function pairKey(a, b) { return [String(a || ''), String(b || '')].filter(Boolean).sort().join(':'); }
  function drafts() {
    try { const raw = JSON.parse(localStorage.getItem(DRAFT_KEY)); return raw && typeof raw === 'object' ? raw : {}; }
    catch { return {}; }
  }
  function saveDrafts(data) { try { localStorage.setItem(DRAFT_KEY, JSON.stringify(data)); } catch { /* private mode */ } }
  async function call(path, body) {
    if (!window.msbFriendsCall) throw Object.assign(Error('Friends are not available on this screen.'), { status: 404 });
    return msbFriendsCall(path, body);
  }
  function missing(error) { return error && (error.status === 404 || /not found/i.test(error.message || '')); }

  function homeInbox() {
    if (verseRoutes === 'missing' || !id()) return '';
    return `<section class="card verse-inbox-card" id="verse-inbox-home"><span class="eyebrow">VERSES FOR YOU</span><h2>Verses for you</h2><p class="muted" id="verse-inbox-status">Loading…</p></section>`;
  }

  function positiveInt(value) {
    const n = Number(value);
    return Number.isInteger(n) && n > 0 ? n : 0;
  }

  function verseCard(item) {
    const mine = item.direction === 'out';
    const who = mine ? (item.toName || 'Friend') : (item.fromName || 'Friend');
    const label = mine ? `To ${who}` : `From ${who}`;
    const book = positiveInt(item.book), chapter = positiveInt(item.chapter), verse = positiveInt(item.verse);
    const ref = book && chapter ? ` data-verse-open="1" data-book="${book}" data-chapter="${chapter}" data-verse="${verse || 1}"` : '';
    return `<button type="button" class="verse-mail ${item.read ? '' : 'verse-mail-new'}"${ref} data-id="${esc(item.id)}"><strong>${esc(item.reference || '')}</strong><span>${esc(item.text || '')}</span><small>${esc(label)}${item.note ? ' · ' + esc(item.note) : ''}</small></button>`;
  }

  async function paintInbox() {
    const host = document.getElementById('verse-inbox-home');
    if (!host || verseRoutes === 'missing') { if (host && verseRoutes === 'missing') host.remove(); return; }
    const me = id();
    if (!me) { host.remove(); return; }
    try {
      const data = await call('/verse/inbox', { code: me.code, secret: me.secret });
      verseRoutes = 'ready';
      inboxCache = Array.isArray(data.verses) ? data.verses : [];
      const incoming = inboxCache.filter(item => item.direction === 'in').slice(0, 4);
      const status = document.getElementById('verse-inbox-status');
      if (!host.isConnected) return;
      host.innerHTML = `<span class="eyebrow">VERSES FOR YOU</span><h2>Verses for you</h2>${incoming.length ? `<div class="verse-mail-list">${incoming.map(verseCard).join('')}</div>` : '<p class="muted">Nothing here yet. When a friend sends a verse, it will wait for you.</p>'}<p><button class="secondary" type="button" data-nav="verses">Verses for you</button></p>`;
      if (window.MsbI18n) MsbI18n.apply(host);
      if (status) status.remove();
    } catch (error) {
      if (missing(error)) { verseRoutes = 'missing'; host.remove(); return; }
      const status = document.getElementById('verse-inbox-status');
      if (status) status.textContent = error.message;
    }
  }

  async function versesScreen() {
    const root = document.getElementById('screen');
    const me = id();
    if (!root) return;
    if (!me) {
      root.innerHTML = `<span class="eyebrow">VERSES FOR YOU</span><h1>Verses for you</h1><p class="lead">Get a friend code on your profile first.</p><p><button class="secondary" data-nav="profile">Back to profile</button></p>`;
      return;
    }
    if (verseRoutes === 'missing') {
      root.innerHTML = `<span class="eyebrow">VERSES FOR YOU</span><h1>Verses for you</h1><p class="lead">Sending verses is coming soon.</p><p><button class="secondary" data-nav="profile">Back to profile</button></p>`;
      return;
    }
    root.innerHTML = `<span class="eyebrow">VERSES FOR YOU</span><h1>Verses for you</h1><p class="lead">A verse from someone you study with, and the ones you have sent each other.</p><div class="loading">Loading…</div>`;
    try {
      const friends = window.msbFriendsFetch ? await msbFriendsFetch() : [];
      const data = await call('/verse/inbox', { code: me.code, secret: me.secret });
      verseRoutes = 'ready';
      inboxCache = Array.isArray(data.verses) ? data.verses : [];
      const options = ['<option value="">Choose a friend</option>'].concat(friends.map(friend => `<option value="${esc(friend.code)}">${esc(friend.name || friend.code)}</option>`)).join('');
      root.innerHTML = `<button class="text-button back" data-nav="profile" type="button">← Back</button><span class="eyebrow">VERSES FOR YOU</span><h1>Verses for you</h1><p class="lead">A verse from someone you study with, and the ones you have sent each other.</p><section class="card"><label>History with this friend<select id="verse-with">${options}</select></label><div id="verse-thread" class="verse-mail-list">${inboxCache.map(verseCard).join('') || '<p class="muted">Nothing here yet. When a friend sends a verse, it will wait for you.</p>'}</div></section>`;
      if (window.MsbI18n) MsbI18n.apply(root);
    } catch (error) {
      if (missing(error)) {
        verseRoutes = 'missing';
        root.innerHTML = `<span class="eyebrow">VERSES FOR YOU</span><h1>Verses for you</h1><p class="lead">Sending verses is coming soon.</p>`;
        return;
      }
      root.innerHTML = `<p class="empty error">${esc(error.message)}</p>`;
    }
  }

  async function loadThread(code) {
    const me = id();
    const host = document.getElementById('verse-thread');
    if (!me || !host || !code) return;
    try {
      const data = await call('/verse/thread', { code: me.code, secret: me.secret, with: code });
      const rows = Array.isArray(data.verses) ? data.verses : [];
      host.innerHTML = rows.map(verseCard).join('') || '<p class="muted">Nothing here yet. When a friend sends a verse, it will wait for you.</p>';
      if (window.MsbI18n) MsbI18n.apply(host);
    } catch (error) {
      host.innerHTML = `<p class="muted">${esc(error.message)}</p>`;
    }
  }

  async function openSend(payload) {
    if (verseRoutes === 'missing') { toast('Sending verses is coming soon.'); return; }
    const me = id();
    if (!me) { toast('Get a friend code on your profile first.'); return; }
    let friends = [];
    try { friends = window.msbFriendsFetch ? await msbFriendsFetch() : []; }
    catch (error) {
      if (missing(error)) { verseRoutes = 'missing'; toast('Sending verses is coming soon.'); return; }
      toast(error.message); return;
    }
    if (!friends.length) { toast('Add a friend first — then you can send a verse.'); return; }
    if (!window.msbDialogHtml) { toast('Sending verses is coming soon.'); return; }
    const options = friends.map(friend => `<option value="${esc(friend.code)}">${esc(friend.name || 'Friend')}</option>`).join('');
    msbDialogHtml(`<span class="eyebrow">SEND A VERSE</span><h2 id="dialog-title">Send to a friend</h2><p data-i18n-skip>${esc(payload.reference || '')}</p><p class="verse-send-text" data-i18n-skip>${esc(payload.text || '')}</p><form id="verse-send-form"><label>Choose a friend<select name="to" required>${options}</select></label><label>A short note (optional)<textarea name="note" maxlength="280" rows="3" placeholder="A short note (optional)"></textarea></label><button class="primary" type="submit">Send</button></form>`);
    const form = document.getElementById('verse-send-form');
    if (!form) return;
    form.onsubmit = async event => {
      event.preventDefault();
      const data = new FormData(form);
      const note = String(data.get('note') || '').trim();
      if (note.length > 280) { toast('That note is too long.'); return; }
      const button = form.querySelector('[type=submit]');
      if (button) button.disabled = true;
      try {
        const book = positiveInt(payload.book), chapter = positiveInt(payload.chapter), verse = positiveInt(payload.verse);
        if (!book || !chapter || !verse) { toast('That verse could not be sent.'); if (button) button.disabled = false; return; }
        await call('/verse/send', {
          code: me.code, secret: me.secret, to: data.get('to'),
          book, chapter, verse,
          reference: payload.reference, text: payload.text, note, translation: payload.translation === 'rvr' ? 'rvr' : 'kjv'
        });
        verseRoutes = 'ready';
        if (window.msbCloseDialog) msbCloseDialog();
        toast('Verse sent.');
        if (typeof payload.onSent === 'function') payload.onSent();
      } catch (error) {
        if (button) button.disabled = false;
        if (missing(error)) { verseRoutes = 'missing'; if (window.msbCloseDialog) msbCloseDialog(); toast('Sending verses is coming soon.'); return; }
        toast(error.message);
      }
    };
  }

  function notebookOf(key) {
    const all = drafts();
    const note = all[key];
    if (!note || typeof note !== 'object') return { entries: [] };
    if (!Array.isArray(note.entries)) note.entries = [];
    if (!Array.isArray(note.removed)) note.removed = [];
    return note;
  }
  function writeNotebook(key, note) {
    const all = drafts();
    all[key] = note;
    saveDrafts(all);
  }

  const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  function phrase(text) { return window.MsbI18n ? MsbI18n.t(text) : text; }
  function bookName(bookId) {
    const n = Number(bookId);
    if (window.msbBookLabel) {
      const label = msbBookLabel(n, '');
      if (label) return label;
    }
    const book = (bookCatalog || []).find(item => item.id === n);
    return book ? book.name : String(n || '');
  }
  function bookNames(book) {
    const spanish = window.msbBookLabel ? msbBookLabel(book.id, '') : '';
    return [book.name, spanish].filter(Boolean).join(' ');
  }
  function fold(value) { return String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase(); }
  function relativeWhen(ts) {
    const date = new Date(Number(ts) || Date.now());
    if (Number.isNaN(date.getTime())) return '';
    const start = value => new Date(value.getFullYear(), value.getMonth(), value.getDate()).getTime();
    const days = Math.round((start(new Date()) - start(date)) / 86400000);
    if (days <= 0) return phrase('today');
    if (days === 1) return phrase('yesterday');
    return `${date.getDate()} ${phrase(MONTHS[date.getMonth()])}`;
  }
  function safeAvatar(src) {
    const raw = String(src || '').trim();
    if (/^data:image\/(?:jpeg|png|webp);base64,[a-z0-9+/]+={0,2}$/i.test(raw)) return raw;
    if (/^https:\/\/[^\s"'<>]+$/i.test(raw)) return raw;
    return '';
  }
  function avatarMarkup(src, name) {
    const photo = safeAvatar(src);
    if (photo) return `<img src="${esc(photo)}" alt="">`;
    const letter = String(name || '?').trim().charAt(0).toUpperCase() || '?';
    return esc(letter);
  }
  async function ensureBooks() {
    if (bookCatalog) return bookCatalog;
    try {
      const response = await fetch('bible/index.json');
      if (!response.ok) throw Error('missing');
      const data = await response.json();
      bookCatalog = (data.books || []).filter(book => book && book.id).map(book => ({
        id: book.id, name: book.name, chapters: book.chapters || 1, chapterStart: book.chapterStart || 1
      }));
    } catch { bookCatalog = []; }
    return bookCatalog;
  }
  function selectedBook() { return (bookCatalog || []).find(book => book.id === composer.book) || null; }
  function clampComposer() {
    const book = selectedBook();
    const min = book ? book.chapterStart : 1;
    const max = book ? book.chapters : 1;
    if (composer.chapter < min) composer.chapter = min;
    if (composer.chapter > max) composer.chapter = max;
    if (composer.verse < 1) composer.verse = 1;
    if (composer.verse > 200) composer.verse = 200;
  }
  function captureComposer() {
    const form = document.getElementById('study-form');
    if (!form) return;
    composer.entryId = form.elements.entryId.value;
    composer.question = form.elements.question.value;
    composer.answer = form.elements.answer.value;
    composer.query = document.getElementById('study-book-search')?.value || composer.query;
    if (!composer.picker) {
      composer.book = Math.floor(Number(form.elements.book.value)) || 0;
      composer.chapter = Math.floor(Number(form.elements.chapter.value)) || 1;
      composer.verse = Math.floor(Number(form.elements.verse.value)) || 1;
    }
  }
  function blankComposer() {
    composer.entryId = '';
    composer.question = '';
    composer.answer = '';
    composer.book = 0;
    composer.chapter = 1;
    composer.verse = 1;
    composer.picker = false;
    composer.query = '';
    const form = document.getElementById('study-form');
    if (!form) return;
    form.elements.entryId.value = '';
    form.elements.question.value = '';
    form.elements.answer.value = '';
    form.elements.book.value = '';
    form.elements.chapter.value = '';
    form.elements.verse.value = '';
  }
  function closeMenus() {
    document.querySelectorAll('.study-menu').forEach(menu => { menu.hidden = true; });
    document.querySelectorAll('[data-study-menu]').forEach(button => button.setAttribute('aria-expanded', 'false'));
  }
  function linkSlotHtml() {
    if (!composer.book) return `<button type="button" class="study-pill" data-study-link>Link a verse</button>`;
    const label = `${bookName(composer.book)} ${composer.chapter}:${composer.verse}`;
    return `<span class="study-pill"><button type="button" data-study-link>${esc(label)}</button><button type="button" class="study-pill-x" data-study-clear aria-label="Remove linked verse">✕</button></span>`;
  }
  function studyHtml(friends, note, unsupported) {
    const me = id();
    const removed = new Set(note.removed || []);
    const chips = friends.map(friend => {
      const name = friend.name || friend.code;
      const pressed = studyFriend === friend.code;
      return `<button type="button" class="study-chip" data-study-friend="${esc(friend.code)}" aria-pressed="${pressed ? 'true' : 'false'}"><span class="study-avatar">${avatarMarkup(friend.avatar_data, name)}</span><span>${esc(name)}</span></button>`;
    }).join('');
    const entries = (note.entries || []).filter(entry => entry && !removed.has(entry.id)).slice().sort((a, b) => (b.ts || 0) - (a.ts || 0));
    const rows = entries.map(entry => {
      const mine = me && entry.author === me.code;
      const who = entry.authorName || 'Friend';
      const photo = mine ? '' : (friends.find(friend => friend.code === entry.author)?.avatar_data || '');
      const verses = (entry.verses || []).map(link => {
        const label = link.book ? `${bookName(link.book)} ${link.chapter}:${link.verse}` : (link.reference || '');
        const book = positiveInt(link.book), chapter = positiveInt(link.chapter), verse = positiveInt(link.verse);
        if (!book || !chapter) return '';
        return `<button type="button" class="study-pill" data-verse-open="1" data-book="${book}" data-chapter="${chapter}" data-verse="${verse || 1}">${esc(label)}</button>`;
      }).join('');
      return `<article class="card study-entry ${mine ? 'study-entry-mine' : 'study-entry-theirs'}${entry.id === flashId ? ' study-entry-new' : ''}"><header class="study-entry-head"><span class="study-avatar">${avatarMarkup(photo, who)}</span><div><strong>${esc(who)}</strong><time>${esc(relativeWhen(entry.ts))}</time></div><button type="button" class="study-more" data-study-menu aria-expanded="false" aria-label="Entry actions">⋯</button></header><div class="study-menu" hidden><button type="button" data-study-edit="${esc(entry.id)}">Edit</button><button type="button" data-study-delete="${esc(entry.id)}">Delete</button></div><h3 class="study-question">${esc(entry.question || '')}</h3>${entry.answer ? `<p class="study-answer">${esc(entry.answer)}</p>` : ''}${verses ? `<div class="study-entry-verses">${verses}</div>` : ''}</article>`;
    }).join('');
    const books = bookCatalog || [];
    const query = composer.query.trim().toLowerCase();
    const bookButtons = books.map(book => {
      const label = bookName(book.id) || book.name;
      const hidden = query && !fold(bookNames(book)).includes(fold(query)) ? ' hidden' : '';
      return `<button type="button" class="study-book" data-study-book="${book.id}" data-names="${esc(bookNames(book))}" aria-pressed="${composer.book === book.id ? 'true' : 'false'}"${hidden}>${esc(label)}</button>`;
    }).join('');
    const book = selectedBook();
    const chapterMin = book ? book.chapterStart : 1;
    const chapterMax = book ? book.chapters : 1;
    const pickerHidden = composer.picker ? '' : ' hidden';
    const noMatch = books.length && books.every(item => query && !fold(bookNames(item)).includes(fold(query)));
    return `<div class="study-notebook"><button class="text-button back" data-nav="friends" type="button">← Back</button><section class="card study-hero"><div class="study-hero-top"><span class="study-mark" aria-hidden="true"><svg viewBox="0 0 48 48" width="32" height="32"><path fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round" d="M24 13c-4.2-2.6-10-3.4-16-2.4v25c6-.8 11.8.2 16 2.8 4.2-2.6 10-3.6 16-2.8v-25c-6-1-11.8-.2-16 2.4z"/><path fill="none" stroke="currentColor" stroke-width="2" d="M24 13v25"/></svg></span><div><span class="eyebrow">TOGETHER</span><h1>Study together</h1><p class="lead">A private notebook for the two of you. It is not on the scoreboard.</p></div></div>${friends.length ? `<div class="study-chips" role="group" aria-label="Choose a friend">${chips}</div>` : '<p class="muted">Add someone first, then you can write together.</p>'}${unsupported ? '<p class="muted">Study together is coming soon. A copy of what you write stays on this device.</p>' : '<p class="muted">Both of you can add and edit. Newest first. Tap a verse to open it.</p>'}</section><section class="card study-composer"><div class="study-composer-head"><h2 id="study-composer-title">${composer.entryId ? 'Edit entry' : 'New entry'}</h2><button type="button" class="text-button" id="study-cancel"${composer.entryId ? '' : ' hidden'}>Cancel</button></div><form id="study-form"><input type="hidden" name="entryId" value="${esc(composer.entryId)}"><input type="hidden" id="study-with" value="${esc(studyFriend)}"><input type="hidden" name="book" value="${composer.book || ''}"><input type="hidden" name="chapter" value="${composer.book ? composer.chapter : ''}"><input type="hidden" name="verse" value="${composer.book ? composer.verse : ''}"><label class="study-field"><span>Question</span><textarea name="question" maxlength="400" rows="3" required placeholder="What did we wonder about today?">${esc(composer.question)}</textarea></label><label class="study-field"><span>Answer</span><textarea name="answer" maxlength="2000" rows="4" placeholder="Write what you noticed, if you want.">${esc(composer.answer)}</textarea></label><div class="study-link-row" id="study-link-slot">${linkSlotHtml()}</div><div class="study-picker" id="study-picker"${pickerHidden}><label class="study-field"><span>Book</span><input id="study-book-search" class="study-search" type="search" placeholder="Search books" value="${esc(composer.query)}" autocomplete="off"></label><div class="study-book-list" id="study-book-list">${bookButtons || '<p class="muted" id="study-books-missing">The book list is unavailable right now.</p>'}</div><p class="muted" id="study-book-empty"${noMatch ? '' : ' hidden'}>No books match that search.</p><div class="study-steps"><div class="study-step"><button type="button" data-study-step="chapter" data-dir="-1" aria-label="Previous chapter" ${composer.chapter <= chapterMin ? 'disabled' : ''}>−</button><output id="study-chapter-value">${composer.chapter}</output><button type="button" data-study-step="chapter" data-dir="1" aria-label="Next chapter" ${!book || composer.chapter >= chapterMax ? 'disabled' : ''}>+</button><span>Chapter</span></div><div class="study-step"><button type="button" data-study-step="verse" data-dir="-1" aria-label="Previous verse" ${composer.verse <= 1 ? 'disabled' : ''}>−</button><output id="study-verse-value">${composer.verse}</output><button type="button" data-study-step="verse" data-dir="1" aria-label="Next verse" ${composer.verse >= 200 ? 'disabled' : ''}>+</button><span>Verse</span></div></div><button type="button" class="primary study-use" id="study-use-verse"${composer.book ? '' : ' disabled'}>Use this verse</button></div><button class="primary study-save" type="submit"${composer.question.trim() ? '' : ' disabled'}>Save entry</button></form></section><div id="study-entries">${rows || `<section class="card study-empty"><span class="study-mark" aria-hidden="true"><svg viewBox="0 0 48 48" width="36" height="36"><path fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round" d="M14 10h20a4 4 0 0 1 4 4v22H18a6 6 0 0 0-6 6V14a4 4 0 0 1 4-4z"/><path fill="none" stroke="currentColor" stroke-width="2" d="M18 18h14M18 24h10"/></svg></span><h2>Write the first question you want to explore together</h2></section>`}</div></div>`;
  }

  async function studyScreen() {
    const root = document.getElementById('screen');
    const me = id();
    if (!root) return;
    if (!me) {
      root.innerHTML = `<span class="eyebrow">TOGETHER</span><h1>Study together</h1><p>Get a friend code on your profile first.</p><p><button class="secondary" data-nav="profile">Profile</button></p>`;
      return;
    }
    let friends = [];
    try { friends = window.msbFriendsCached ? msbFriendsCached() : []; } catch { friends = []; }
    if (window.msbFriendsFetch) { try { friends = await msbFriendsFetch(); } catch { /* keep the cached list */ } }
    if (!studyFriend && friends[0]) studyFriend = friends[0].code;
    if (studyFriend && !friends.some(friend => friend.code === studyFriend)) studyFriend = friends[0] ? friends[0].code : '';
    await ensureBooks();
    const key = pairKey(me.code, studyFriend);
    let note = notebookOf(key);
    let unsupported = studyRoutes === 'missing';
    if (studyFriend && !unsupported) {
      try {
        const remote = await call('/study/get', { code: me.code, secret: me.secret, with: studyFriend });
        studyRoutes = 'ready';
        const removed = new Set(note.removed || []);
        const pending = (note.entries || []).filter(entry => entry.pending && !removed.has(entry.id));
        const remoteEntries = Array.isArray(remote.entries) ? remote.entries : [];
        const seen = new Set(remoteEntries.map(entry => entry.id));
        note = { entries: remoteEntries.concat(pending.filter(entry => !seen.has(entry.id))).filter(entry => !removed.has(entry.id)), removed: [...removed] };
        writeNotebook(key, note);
        for (const entry of pending) {
          try {
            await call('/study/add', { code: me.code, secret: me.secret, with: studyFriend, entryId: entry.id, question: entry.question, answer: entry.answer, verses: entry.verses || [] });
          } catch { /* leave it pending */ }
        }
        for (const entryId of [...removed]) {
          try {
            const saved = await call('/study/delete', { code: me.code, secret: me.secret, with: studyFriend, entryId });
            removed.delete(entryId);
            if (saved && Array.isArray(saved.entries)) note.entries = saved.entries.filter(entry => !removed.has(entry.id));
          } catch { /* try again next time the notebook opens */ }
        }
        note.removed = [...removed];
        writeNotebook(key, note);
      } catch (error) {
        if (missing(error)) unsupported = true, studyRoutes = 'missing';
      }
    }
    captureComposer();
    root.innerHTML = studyHtml(friends, note, unsupported);
    flashId = '';
    if (window.MsbI18n) MsbI18n.apply(root);
    if (composer.picker) document.getElementById('study-book-search')?.focus();
  }

  async function saveStudy(form) {
    const me = id();
    if (!me) { toast('Get a friend code on your profile first.'); return; }
    const withCode = document.getElementById('study-with')?.value || studyFriend;
    if (!withCode) { toast('Add someone first, then you can write together.'); return; }
    studyFriend = withCode;
    const data = new FormData(form);
    const question = String(data.get('question') || '').trim();
    const answer = String(data.get('answer') || '').trim();
    if (!question) return;
    const book = Math.floor(Number(data.get('book')));
    const chapter = Math.floor(Number(data.get('chapter')));
    const verse = Math.floor(Number(data.get('verse')));
    const verses = book >= 1 && chapter >= 1 && verse >= 1 ? [{ book, chapter, verse, reference: `${bookName(book)} ${chapter}:${verse}` }] : [];
    const entryId = String(data.get('entryId') || '') || Math.random().toString(16).slice(2, 10);
    const key = pairKey(me.code, withCode);
    const note = notebookOf(key);
    const entry = { id: entryId, question, answer, verses, author: me.code, authorName: me.name || 'Friend', ts: Date.now(), pending: true };
    note.entries = [entry, ...(note.entries || []).filter(item => item.id !== entryId)];
    note.removed = (note.removed || []).filter(id => id !== entryId);
    writeNotebook(key, note);
    flashId = entryId;
    blankComposer();
    if (studyRoutes === 'missing') { toast('Saved on this device. It will sync when you are back online.'); studyScreen(); return; }
    try {
      const saved = await call('/study/add', { code: me.code, secret: me.secret, with: withCode, entryId, question, answer, verses });
      studyRoutes = 'ready';
      if (saved && Array.isArray(saved.entries)) { note.entries = saved.entries; writeNotebook(key, note); }
      else { entry.pending = false; writeNotebook(key, note); }
      toast('Entry saved.');
    } catch (error) {
      if (missing(error)) { studyRoutes = 'missing'; toast('Study together is coming soon.'); }
      else if (!navigator.onLine) toast('Saved on this device. It will sync when you are back online.');
      else toast(error.message || 'Saved on this device. It will sync when you are back online.');
    }
    studyScreen();
  }

  async function deleteStudy(entryId) {
    const me = id();
    if (!me || !studyFriend || !entryId) return;
    const key = pairKey(me.code, studyFriend);
    const note = notebookOf(key);
    if (!(note.entries || []).some(entry => entry.id === entryId)) return;
    note.entries = note.entries.filter(entry => entry.id !== entryId);
    note.removed = [...new Set([...(note.removed || []), entryId])];
    writeNotebook(key, note);
    if (composer.entryId === entryId) blankComposer();
    if (studyRoutes !== 'missing' && navigator.onLine) {
      try {
        const saved = await call('/study/delete', { code: me.code, secret: me.secret, with: studyFriend, entryId });
        studyRoutes = 'ready';
        note.removed = (note.removed || []).filter(id => id !== entryId);
        if (saved && Array.isArray(saved.entries)) note.entries = saved.entries.filter(entry => !(note.removed || []).includes(entry.id));
        writeNotebook(key, note);
        toast('Entry deleted.');
        studyScreen();
        return;
      } catch (error) {
        if (missing(error)) { studyRoutes = 'missing'; toast('Study together is coming soon.'); studyScreen(); return; }
        toast(error.message || 'Saved on this device. It will sync when you are back online.');
        studyScreen();
        return;
      }
    }
    toast('Saved on this device. It will sync when you are back online.');
    studyScreen();
  }

  function paintPicker() {
    clampComposer();
    const book = selectedBook();
    document.querySelectorAll('[data-study-book]').forEach(button => {
      button.setAttribute('aria-pressed', String(Number(button.dataset.studyBook) === composer.book));
    });
    const chapter = document.getElementById('study-chapter-value');
    const verse = document.getElementById('study-verse-value');
    if (chapter) chapter.textContent = String(composer.chapter);
    if (verse) verse.textContent = String(composer.verse);
    const chapterMin = book ? book.chapterStart : 1;
    const chapterMax = book ? book.chapters : 1;
    document.querySelectorAll('[data-study-step]').forEach(button => {
      const dir = Number(button.dataset.dir);
      if (button.dataset.studyStep === 'chapter') button.disabled = !book || (dir < 0 ? composer.chapter <= chapterMin : composer.chapter >= chapterMax);
      else button.disabled = dir < 0 ? composer.verse <= 1 : composer.verse >= 200;
    });
    const use = document.getElementById('study-use-verse');
    if (use) use.disabled = !composer.book;
  }
  function paintLink() {
    const slot = document.getElementById('study-link-slot');
    if (!slot) return;
    slot.innerHTML = linkSlotHtml();
    if (window.MsbI18n) MsbI18n.apply(slot);
  }
  function openPicker() {
    composer.picker = true;
    const picker = document.getElementById('study-picker');
    if (picker) picker.hidden = false;
    paintPicker();
    const search = document.getElementById('study-book-search');
    if (search) search.focus();
  }

  document.addEventListener('keydown', event => {
    if (event.target && event.target.id === 'study-book-search' && event.key === 'Enter') event.preventDefault();
  });
  document.addEventListener('input', event => {
    const form = event.target.closest && event.target.closest('#study-form');
    if (!form) return;
    if (event.target.id === 'study-book-search') {
      composer.query = event.target.value;
      const query = fold(composer.query.trim());
      let shown = 0;
      document.querySelectorAll('[data-study-book]').forEach(button => {
        const names = fold(button.dataset.names || '');
        const match = !query || names.includes(query);
        button.hidden = !match;
        if (match) shown += 1;
      });
      const empty = document.getElementById('study-book-empty');
      if (empty) empty.hidden = shown !== 0;
      return;
    }
    if (event.target.name === 'question' || event.target.name === 'answer') {
      composer[event.target.name] = event.target.value;
      if (event.target.name === 'question') {
        const save = form.querySelector('.study-save');
        if (save) save.disabled = !event.target.value.trim();
      }
    }
  });
  document.addEventListener('change', event => {
    if (event.target && event.target.id === 'verse-with') loadThread(event.target.value);
  });
  document.addEventListener('submit', event => {
    if (event.target && event.target.id === 'study-form') { event.preventDefault(); saveStudy(event.target); }
  });
  document.addEventListener('click', async event => {
    const friend = event.target.closest('[data-study-friend]');
    if (friend && friend.dataset.studyFriend !== studyFriend) {
      captureComposer();
      studyFriend = friend.dataset.studyFriend;
      studyScreen();
      return;
    }
    const menuButton = event.target.closest('[data-study-menu]');
    if (menuButton) {
      const menu = menuButton.closest('.study-entry')?.querySelector('.study-menu');
      const willOpen = !menu || menu.hidden;
      closeMenus();
      if (willOpen && menu) { menu.hidden = false; menuButton.setAttribute('aria-expanded', 'true'); }
      return;
    }
    const edit = event.target.closest('[data-study-edit]');
    if (edit) {
      closeMenus();
      const me = id();
      const note = notebookOf(pairKey(me && me.code, studyFriend));
      const entry = (note.entries || []).find(item => item.id === edit.dataset.studyEdit);
      const form = document.getElementById('study-form');
      if (!entry || !form) return;
      const link = (entry.verses || [])[0] || {};
      composer.entryId = entry.id;
      composer.question = entry.question || '';
      composer.answer = entry.answer || '';
      composer.book = Number(link.book) || 0;
      composer.chapter = Number(link.chapter) || 1;
      composer.verse = Number(link.verse) || 1;
      composer.picker = false;
      form.elements.entryId.value = entry.id;
      form.elements.question.value = composer.question;
      form.elements.answer.value = composer.answer;
      form.elements.book.value = composer.book || '';
      form.elements.chapter.value = composer.book ? composer.chapter : '';
      form.elements.verse.value = composer.book ? composer.verse : '';
      const title = document.getElementById('study-composer-title');
      if (title) title.textContent = phrase('Edit entry');
      const cancel = document.getElementById('study-cancel');
      if (cancel) cancel.hidden = false;
      const save = form.querySelector('.study-save');
      if (save) save.disabled = !composer.question.trim();
      const picker = document.getElementById('study-picker');
      if (picker) picker.hidden = true;
      paintLink();
      form.scrollIntoView({ block: 'start' });
      return;
    }
    const remove = event.target.closest('[data-study-delete]');
    if (remove) { closeMenus(); deleteStudy(remove.dataset.studyDelete); return; }
    if (event.target.closest('#study-cancel')) { blankComposer(); studyScreen(); return; }
    if (event.target.closest('[data-study-link]')) { openPicker(); return; }
    if (event.target.closest('[data-study-clear]')) {
      composer.book = 0;
      composer.picker = false;
      const form = document.getElementById('study-form');
      if (form) { form.elements.book.value = ''; form.elements.chapter.value = ''; form.elements.verse.value = ''; }
      const picker = document.getElementById('study-picker');
      if (picker) picker.hidden = true;
      paintLink();
      return;
    }
    const bookButton = event.target.closest('[data-study-book]');
    if (bookButton) {
      composer.book = Number(bookButton.dataset.studyBook) || 0;
      const chosen = selectedBook();
      composer.chapter = chosen ? chosen.chapterStart : 1;
      composer.verse = 1;
      paintPicker();
      bookButton.scrollIntoView({ block: 'nearest' });
      return;
    }
    const step = event.target.closest('[data-study-step]');
    if (step && !step.disabled) {
      const dir = Number(step.dataset.dir) || 0;
      if (step.dataset.studyStep === 'chapter') composer.chapter += dir;
      else composer.verse += dir;
      paintPicker();
      return;
    }
    if (event.target.closest('#study-use-verse')) {
      if (!composer.book) return;
      clampComposer();
      const form = document.getElementById('study-form');
      if (form) {
        form.elements.book.value = String(composer.book);
        form.elements.chapter.value = String(composer.chapter);
        form.elements.verse.value = String(composer.verse);
      }
      composer.picker = false;
      const picker = document.getElementById('study-picker');
      if (picker) picker.hidden = true;
      paintLink();
      return;
    }
    if (!event.target.closest('.study-menu')) closeMenus();
    const open = event.target.closest('[data-verse-open]');
    if (!open) return;
    const me = id();
    if (me && open.dataset.id) {
      try { await call('/verse/read', { code: me.code, secret: me.secret, id: open.dataset.id }); } catch { /* still open the verse */ }
    }
    const book = positiveInt(open.dataset.book), chapter = positiveInt(open.dataset.chapter), verse = positiveInt(open.dataset.verse);
    if (book && chapter && window.msbOpenBibleVerse) msbOpenBibleVerse(book, chapter, verse || undefined);
  });

  window.msbOpenVerseSend = openSend;
  window.MsbBridge = { homeInbox, paintInbox, versesScreen, studyScreen, afterRender: paintInbox };
})();
