/* My notes: devotional notes (one per day) plus the reader's study notes, listed
   on Profile and shown to accepted friends unless hidden. Loaded on demand. */
(function (root, factory) {
  const api = factory(root);
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.MsbMyNotes = api;
})(typeof self !== 'undefined' ? self : this, function (root) {
  'use strict';
  const KEY = 'msb_devotional_notes';
  const SHARE_KEY = 'msb_notes_share';
  const MAX = 2000;
  const API = 'https://mindsoulbody-api.hearthandhope.workers.dev';
  const store = () => root.localStorage;
  const es = () => !!(root.MsbI18n && root.MsbI18n.lang && root.MsbI18n.lang() === 'es');
  const tr = (en, sp) => (es() ? sp : en);
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  function readAll(ls = store()) { try { const v = JSON.parse(ls.getItem(KEY) || '{}'); return v && typeof v === 'object' && !Array.isArray(v) ? v : {}; } catch { return {}; } }
  function get(key, ls = store()) { const n = readAll(ls)[key]; return n && typeof n.text === 'string' ? n : null; }
  function save(key, text, meta = {}, ls = store()) {
    const all = readAll(ls);
    const clean = String(text || '').slice(0, MAX);
    if (!clean.trim()) delete all[key];
    else all[key] = { ...meta, text: clean, ts: Date.now() };
    ls.setItem(KEY, JSON.stringify(all));
    return all[key] || null;
  }
  function shared(ls = store()) { return ls.getItem(SHARE_KEY) !== '0'; }
  function setShared(on, ls = store()) { ls.setItem(SHARE_KEY, on ? '1' : '0'); return on; }

  /* one list, newest first: devotional notes and study notes */
  function collect(opts = {}, ls = store()) {
    const out = [];
    for (const [key, n] of Object.entries(readAll(ls))) {
      if (!n || typeof n.text !== 'string' || !n.text.trim()) continue;
      out.push({ kind: 'devotional', key, text: n.text, title: n.title || '', ref: n.ref || '', verse: n.verse || '', lang: n.lang === 'es' ? 'es' : 'en', book: n.book || null, chapter: n.chapter || null, v: n.v || null, ts: n.ts || 0 });
    }
    for (const s of opts.studyNotes || []) {
      if (!s || typeof s.body !== 'string' || !s.body.trim()) continue;
      out.push({ kind: 'study', key: String(s.study_id), text: s.body.slice(0, MAX), title: (opts.studyTitle && opts.studyTitle(s.study_id)) || '', ref: '', verse: '', lang: es() ? 'es' : 'en', ts: (s.updated_at || 0) * 1000 });
    }
    return out.sort((a, b) => b.ts - a.ts).slice(0, 200);
  }

  function when(ts) { try { return new Date(ts).toLocaleDateString(es() ? 'es' : 'en', { month: 'short', day: 'numeric', year: 'numeric' }); } catch { return ''; } }
  function cardHtml(n, own) {
    const label = n.kind === 'devotional' ? tr('Devotional', 'Devocional') : tr('Study', 'Estudio');
    return `<li class="my-note"><span class="eyebrow">${esc(label)} · ${esc(when(n.ts))}</span>${n.title ? `<strong>${esc(n.title)}</strong>` : ''}${n.verse ? `<blockquote class="my-note-verse">“${esc(n.verse)}”${n.ref ? `<cite>${esc(n.ref)}</cite>` : ''}</blockquote>` : ''}<p>${esc(n.text)}</p>${own && n.kind === 'devotional' ? `<button type="button" class="text-button" data-dev-open="${esc(n.key)}">${esc(tr('Open the devotional', 'Abrir el devocional'))}</button>` : ''}</li>`;
  }
  function listHtml(notes, own) {
    if (!notes.length) return `<p class="muted">${esc(own ? tr('No notes yet. Write one under a devotional or a study.', 'Todavía no hay notas. Escribe una debajo de un devocional o un estudio.') : tr('No notes shared yet.', 'Todavía no hay notas compartidas.'))}</p>`;
    return `<ul class="my-notes-list">${notes.map((n) => cardHtml(n, own)).join('')}</ul>`;
  }
  function switchHtml() {
    const on = shared();
    return `<div class="my-notes-share"><div><strong>${esc(tr('Friends can see my notes', 'Mis amigos pueden ver mis notas'))}</strong><p class="small muted">${esc(tr('On by default. Turn it off to keep every note on this device only.', 'Activado de forma predeterminada. Desactívalo para que tus notas se queden solo en este dispositivo.'))}</p></div><button type="button" class="tap-vibration-toggle" data-notes-share role="switch" aria-checked="${on}" aria-label="${esc(tr('Friends can see my notes', 'Mis amigos pueden ver mis notas'))}"><span class="tap-vibration-knob" aria-hidden="true"></span><span class="tap-vibration-state">${on ? tr('On', 'Sí') : tr('Off', 'No')}</span></button></div>`;
  }
  function profileHtml(opts) {
    const notes = collect(opts);
    return `<section class="card my-notes" id="my-notes" data-i18n-skip><span class="eyebrow">${esc(tr('JOURNAL', 'DIARIO'))}</span><h2>${esc(tr('My notes', 'Mis notas'))}</h2>${switchHtml()}${listHtml(notes, true)}</section>`;
  }

  /* ---------- sync (only with a friend code) ---------- */
  function ids() { try { const v = JSON.parse(store().getItem('msb_friends_id') || 'null'); return v && v.code && v.secret ? v : (root.msbFriendsId ? root.msbFriendsId() : null); } catch { return root.msbFriendsId ? root.msbFriendsId() : null; } }
  async function post(path, body) {
    const r = await fetch((root.msbFriendsApi ? root.msbFriendsApi() : API) + path, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });
    let data = {}; try { data = await r.json(); } catch { /* empty */ }
    if (!r.ok) throw Object.assign(Error(data.error || `Error ${r.status}`), { status: r.status });
    return data;
  }
  let timer = null, opts0 = {};
  function syncSoon(opts) { if (opts) opts0 = opts; clearTimeout(timer); timer = setTimeout(() => syncNow().catch(() => null), 1500); }
  async function syncNow(opts) {
    if (opts) opts0 = opts;
    const me = ids(); if (!me) return { skipped: true };
    const hidden = !shared();
    /* hiding sends no notes at all: the server keeps nothing readable */
    return post('/mynotes/sync', { code: me.code, secret: me.secret, hidden, notes: hidden ? [] : collect(opts0) });
  }
  async function friendNotes(code) {
    const me = ids(); if (!me) throw Error(tr('Get a friend code on your profile first.', 'Primero obtén un código de amigo en tu perfil.'));
    return post('/mynotes/friend', { code: me.code, secret: me.secret, friend: code });
  }
  async function fillFriend(slot, code) {
    if (!slot) return;
    slot.innerHTML = `<span class="eyebrow">${esc(tr('JOURNAL', 'DIARIO'))}</span><h2>${esc(tr('Notes', 'Notas'))}</h2><p class="muted" role="status">${esc(tr('Loading…', 'Cargando…'))}</p>`;
    try {
      const r = await friendNotes(code);
      if (!slot.isConnected) return;
      slot.innerHTML = `<span class="eyebrow">${esc(tr('JOURNAL', 'DIARIO'))}</span><h2>${esc(tr('Notes', 'Notas'))}</h2>${r.hidden ? `<p class="muted">${esc(tr('This friend keeps their notes private.', 'Este amigo mantiene sus notas en privado.'))}</p>` : listHtml(r.notes || [], false)}`;
    } catch (err) {
      if (slot.isConnected) slot.querySelector('[role=status]').textContent = err.status === 403 ? tr('Notes show once you are both friends.', 'Las notas se ven cuando los dos son amigos.') : tr('Notes could not load right now.', 'No se pudieron cargar las notas ahora.');
    }
  }

  /* ---------- devotional box ---------- */
  function boxHtml(key, meta) {
    const n = get(key);
    return `<section class="card dev-notes" id="dev-notes" data-notes-key="${esc(key)}" data-i18n-skip><span class="eyebrow">${esc(tr('MY NOTE', 'MI NOTA'))}</span><label for="dev-note-text" class="small muted">${esc(tr('What stayed with you today?', '¿Qué se quedó contigo hoy?'))}</label><textarea id="dev-note-text" class="text-input" rows="4" maxlength="${MAX}" data-dev-note>${esc(n ? n.text : '')}</textarea><div class="dev-notes-row"><span class="small muted" data-dev-note-status role="status">${n ? esc(tr('Saved', 'Guardada')) : ''}</span><button type="button" class="secondary" data-dev-note-share ${n ? '' : 'disabled'}>${esc(tr('Share', 'Compartir'))}</button></div><p class="small muted">${esc(shared() ? tr('Friends can see this note. Change it in Profile.', 'Tus amigos pueden ver esta nota. Cámbialo en Perfil.') : tr('Only you can see this note.', 'Solo tú puedes ver esta nota.'))}</p></section>`;
  }
  function shareText(n) { return `${n.title ? n.title + '\n' : ''}${n.verse ? `“${n.verse}”${n.ref ? ` (${n.ref})` : ''}\n\n` : ''}${n.text}`; }
  function shareChoices(key) {
    const n = get(key); if (!n) return;
    const host = document.querySelector('#dev-notes .dev-notes-row'); if (!host) return;
    const old = document.getElementById('dev-share-menu'); if (old) { old.remove(); return; }
    const menu = document.createElement('div'); menu.id = 'dev-share-menu'; menu.className = 'dev-share-menu';
    menu.innerHTML = `<button type="button" class="primary" data-dev-share-friend>${esc(tr('Send to a friend', 'Enviar a un amigo'))}</button>${navigator.share ? `<button type="button" class="secondary" data-dev-share-system>${esc(tr('More options…', 'Más opciones…'))}</button>` : ''}`;
    host.after(menu);
  }

  let typing = null;
  function wire(doc, ctx) {
    doc.addEventListener('input', (e) => {
      const t = e.target; if (!t || !t.matches || !t.matches('[data-dev-note]')) return;
      const box = t.closest('#dev-notes'), key = box && box.dataset.notesKey; if (!key) return;
      const st = box.querySelector('[data-dev-note-status]'); if (st) st.textContent = tr('Saving…', 'Guardando…');
      clearTimeout(typing);
      typing = setTimeout(() => {
        const meta = ctx.meta(key) || {};
        const n = save(key, t.value, meta);
        if (st && st.isConnected) st.textContent = n ? tr('Saved', 'Guardada') : '';
        const b = box.querySelector('[data-dev-note-share]'); if (b) b.disabled = !n;
        syncSoon(ctx.syncOpts());
      }, 500);
    });
    doc.addEventListener('click', async (e) => {
      const t = e.target && e.target.closest ? e.target : null; if (!t) return;
      if (t.closest('[data-notes-share]')) {
        const b = t.closest('[data-notes-share]');
        if (b.getAttribute('aria-busy') === 'true') return;
        const on = b.getAttribute('aria-checked') !== 'true';
        setShared(on);
        b.setAttribute('aria-checked', String(on)); b.querySelector('.tap-vibration-state').textContent = on ? tr('On', 'Sí') : tr('Off', 'No');
        b.setAttribute('aria-busy', 'true');
        try { await syncNow(ctx.syncOpts()); ctx.toast(on ? tr('Friends can see your notes.', 'Tus amigos pueden ver tus notas.') : tr('Your notes are private.', 'Tus notas son privadas.')); }
        catch { setShared(!on); b.setAttribute('aria-checked', String(!on)); b.querySelector('.tap-vibration-state').textContent = !on ? tr('On', 'Sí') : tr('Off', 'No'); ctx.toast(tr('Could not change it. Check your connection.', 'No se pudo cambiar. Revisa tu conexión.')); }
        finally { b.removeAttribute('aria-busy'); }
        return;
      }
      const box = t.closest('#dev-notes'); const key = box ? box.dataset.notesKey : (document.getElementById('dev-notes') || {}).dataset?.notesKey;
      if (t.closest('[data-dev-note-share]')) { shareChoices(key); return; }
      let n = key && get(key);
      /* a note saved before the devotional data arrived has no verse yet: fill it in first */
      if (n && !n.verse && (t.closest('[data-dev-share-friend]') || t.closest('[data-dev-share-system]'))) {
        try { await (ctx.ensure ? ctx.ensure() : null); } catch { /* share without the verse */ }
        const meta = ctx.meta(key) || {};
        if (meta.verse) n = save(key, n.text, { ...n, ...meta });
      }
      if (t.closest('[data-dev-share-friend]') && n) {
        if (!n.verse || !n.book) { ctx.toast(tr('The verse for this day is not loaded yet. Check your connection and try again.', 'El versículo de este día todavía no se cargó. Revisa tu conexión e inténtalo otra vez.')); return; }
        if (!root.msbOpenVerseSend) { ctx.toast(tr('Sending is not ready yet.', 'Enviar todavía no está listo.')); return; }
        root.msbOpenVerseSend({ book: n.book, chapter: n.chapter, verse: n.v, reference: n.ref, text: n.verse, note: n.text.slice(0, 280), translation: n.lang === 'es' ? 'rvr' : 'kjv' });
        return;
      }
      if (t.closest('[data-dev-share-system]') && n && navigator.share) {
        try { await navigator.share({ title: n.title || n.ref, text: shareText(n) }); } catch { /* cancelled */ }
      }
    });
  }

  return { KEY, SHARE_KEY, MAX, readAll, get, save, shared, setShared, collect, listHtml, profileHtml, boxHtml, shareText, syncNow, syncSoon, friendNotes, fillFriend, wire };
});
