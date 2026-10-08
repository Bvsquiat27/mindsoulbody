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

  function verseCard(item) {
    const mine = item.direction === 'out';
    const who = mine ? (item.toName || 'Friend') : (item.fromName || 'Friend');
    const label = mine ? `To ${who}` : `From ${who}`;
    return `<button type="button" class="verse-mail ${item.read ? '' : 'verse-mail-new'}" data-verse-open="1" data-book="${item.book}" data-chapter="${item.chapter}" data-verse="${item.verse}" data-id="${esc(item.id)}"><strong>${esc(item.reference || '')}</strong><span>${esc(item.text || '')}</span><small>${esc(label)}${item.note ? ' · ' + esc(item.note) : ''}</small></button>`;
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
        await call('/verse/send', {
          code: me.code, secret: me.secret, to: data.get('to'),
          book: payload.book, chapter: payload.chapter, verse: payload.verse,
          reference: payload.reference, text: payload.text, note, translation: payload.translation === 'rvr' ? 'rvr' : 'kjv'
        });
        verseRoutes = 'ready';
        if (window.msbCloseDialog) msbCloseDialog();
        toast('Verse sent.');
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
    return note;
  }
  function writeNotebook(key, note) {
    const all = drafts();
    all[key] = note;
    saveDrafts(all);
  }

  function studyHtml(friends, note, unsupported) {
    const options = friends.map(friend => `<option value="${esc(friend.code)}" ${studyFriend === friend.code ? 'selected' : ''}>${esc(friend.name || friend.code)}</option>`).join('');
    const entries = (note.entries || []).slice().sort((a, b) => (b.ts || 0) - (a.ts || 0));
    const rows = entries.map(entry => `<article class="card study-entry"><p><strong>${esc(entry.question || '')}</strong></p><p>${esc(entry.answer || '')}</p>${(entry.verses || []).map(link => `<button type="button" class="secondary" data-verse-open="1" data-book="${link.book}" data-chapter="${link.chapter}" data-verse="${link.verse}">${esc(link.reference || '')}</button>`).join(' ')}<p class="small muted">${esc(entry.authorName || '')}</p><button type="button" class="text-button" data-study-edit="${esc(entry.id)}">Edit</button></article>`).join('');
    return `<button class="text-button back" data-nav="friends" type="button">← Back</button><span class="eyebrow">TOGETHER</span><h1>Study together</h1><p class="lead">A private notebook for the two of you. It is not on the scoreboard.</p>${unsupported ? '<p class="muted">Study together is coming soon. A copy of what you write stays on this device.</p>' : '<p class="muted">Both of you can add and edit. Newest first. Tap a verse to open it.</p>'}<section class="card"><label>Choose a friend<select id="study-with">${options || '<option value="">Choose a friend</option>'}</select></label><form id="study-form"><input type="hidden" name="entryId" value=""><label>Question<textarea name="question" maxlength="400" rows="2" required></textarea></label><label>Answer<textarea name="answer" maxlength="2000" rows="4"></textarea></label><p class="small">Linked verse</p><div class="study-verse-row"><label>Book<input name="book" inputmode="numeric" maxlength="3"></label><label>Chapter<input name="chapter" inputmode="numeric" maxlength="3"></label><label>Verse<input name="verse" inputmode="numeric" maxlength="3"></label></div><button class="primary" type="submit">Save entry</button></form></section><div id="study-entries">${rows || '<p class="muted">No entries yet. Write the first question from your study time.</p>'}</div>`;
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
    const key = pairKey(me.code, studyFriend);
    let note = notebookOf(key);
    let unsupported = studyRoutes === 'missing';
    if (studyFriend && !unsupported) {
      try {
        const remote = await call('/study/get', { code: me.code, secret: me.secret, with: studyFriend });
        studyRoutes = 'ready';
        const pending = (note.entries || []).filter(entry => entry.pending);
        const remoteEntries = Array.isArray(remote.entries) ? remote.entries : [];
        const seen = new Set(remoteEntries.map(entry => entry.id));
        note = { entries: remoteEntries.concat(pending.filter(entry => !seen.has(entry.id))) };
        writeNotebook(key, note);
        for (const entry of pending) {
          try {
            await call('/study/add', { code: me.code, secret: me.secret, with: studyFriend, entryId: entry.id, question: entry.question, answer: entry.answer, verses: entry.verses || [] });
          } catch { /* leave it pending */ }
        }
      } catch (error) {
        if (missing(error)) unsupported = true, studyRoutes = 'missing';
      }
    }
    root.innerHTML = studyHtml(friends, note, unsupported);
    if (window.MsbI18n) MsbI18n.apply(root);
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
    const verses = book >= 1 && chapter >= 1 && verse >= 1 ? [{ book, chapter, verse, reference: `${window.msbBookLabel ? msbBookLabel(book) : book} ${chapter}:${verse}` }] : [];
    const entryId = String(data.get('entryId') || '') || Math.random().toString(16).slice(2, 10);
    const key = pairKey(me.code, withCode);
    const note = notebookOf(key);
    const entry = { id: entryId, question, answer, verses, author: me.code, authorName: me.name || 'Friend', ts: Date.now(), pending: true };
    note.entries = [entry, ...(note.entries || []).filter(item => item.id !== entryId)];
    writeNotebook(key, note);
    if (studyRoutes === 'missing') { toast('Saved on this device. It will sync when you are back online.'); studyScreen(); return; }
    try {
      const saved = await call('/study/add', { code: me.code, secret: me.secret, with: withCode, entryId, question, answer, verses });
      studyRoutes = 'ready';
      if (saved && Array.isArray(saved.entries)) writeNotebook(key, { entries: saved.entries });
      else { entry.pending = false; writeNotebook(key, note); }
      toast('Entry saved.');
    } catch (error) {
      if (missing(error)) { studyRoutes = 'missing'; toast('Study together is coming soon.'); }
      else if (!navigator.onLine) toast('Saved on this device. It will sync when you are back online.');
      else toast(error.message || 'Saved on this device. It will sync when you are back online.');
    }
    studyScreen();
  }

  document.addEventListener('change', event => {
    if (event.target && event.target.id === 'verse-with') loadThread(event.target.value);
    if (event.target && event.target.id === 'study-with') { studyFriend = event.target.value; studyScreen(); }
  });
  document.addEventListener('submit', event => {
    if (event.target && event.target.id === 'study-form') { event.preventDefault(); saveStudy(event.target); }
  });
  document.addEventListener('click', async event => {
    const edit = event.target.closest('[data-study-edit]');
    if (edit) {
      const me = id();
      const note = notebookOf(pairKey(me && me.code, studyFriend));
      const entry = (note.entries || []).find(item => item.id === edit.dataset.studyEdit);
      const form = document.getElementById('study-form');
      if (!entry || !form) return;
      form.elements.entryId.value = entry.id;
      form.elements.question.value = entry.question || '';
      form.elements.answer.value = entry.answer || '';
      const link = (entry.verses || [])[0] || {};
      form.elements.book.value = link.book || '';
      form.elements.chapter.value = link.chapter || '';
      form.elements.verse.value = link.verse || '';
      form.scrollIntoView({ block: 'center' });
      return;
    }
    const open = event.target.closest('[data-verse-open]');
    if (!open) return;
    const me = id();
    if (me && open.dataset.id) {
      try { await call('/verse/read', { code: me.code, secret: me.secret, id: open.dataset.id }); } catch { /* still open the verse */ }
    }
    const book = Number(open.dataset.book), chapter = Number(open.dataset.chapter), verse = Number(open.dataset.verse);
    if (book && chapter && window.msbOpenBibleVerse) msbOpenBibleVerse(book, chapter, verse);
  });

  window.msbOpenVerseSend = openSend;
  window.MsbBridge = { homeInbox, paintInbox, versesScreen, studyScreen, afterRender: paintInbox };
})();
