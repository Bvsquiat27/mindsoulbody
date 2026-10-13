/* Direct messages: an inbox of conversations and a chat view with bubbles,
   day separators, "Seen", and shared-scripture cards. Uses only what the
   friends server already offers: /msg/thread, /msg/send and /verse/thread.
   Opening a thread marks it read on the server, so the inbox preview comes
   from a small cache on this phone (msb_dm_last), never by opening threads. */
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.MsbDM = api;
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';
  const LAST_KEY = 'msb_dm_last';
  const GROUP_GAP = 5 * 60 * 1000;
  const pad = n => String(n).padStart(2, '0');
  const dayKey = ts => { const d = new Date(ts); return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`; };
  const T = (en, vars) => {
    let s = typeof window !== 'undefined' && window.MsbI18n ? window.MsbI18n.t(en) : en;
    for (const [k, v] of Object.entries(vars || {})) s = s.split(`{${k}}`).join(String(v));
    return s;
  };
  const lang = () => (typeof window !== 'undefined' && window.MsbI18n && window.MsbI18n.lang() === 'es' ? 'es' : 'en');
  const locale = l => (l === 'es' ? 'es' : 'en-US');
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  /* ---------- pure helpers (tested) ---------- */
  function timeline(messages, verses, me) {
    const out = [];
    for (const m of Array.isArray(messages) ? messages : []) {
      if (!m || typeof m.body !== 'string' || !Number.isFinite(Number(m.ts))) continue;
      out.push({ kind: 'msg', id: String(m.id || ''), mine: m.from === me, ts: Number(m.ts), body: m.body, read: m.read === true });
    }
    for (const v of Array.isArray(verses) ? verses : []) {
      if (!v || typeof v.text !== 'string' || !Number.isFinite(Number(v.ts))) continue;
      out.push({ kind: 'verse', id: String(v.id || ''), mine: v.from === me, ts: Number(v.ts), text: v.text, reference: String(v.reference || ''), note: String(v.note || ''), book: Number(v.book) || 0, chapter: Number(v.chapter) || 0, verse: Number(v.verse) || 0, translation: v.translation === 'rvr' ? 'rvr' : 'kjv' });
    }
    return out.sort((a, b) => a.ts - b.ts || (a.id < b.id ? -1 : 1));
  }
  function dayLabel(ts, now, l) {
    const today = dayKey(now), d = new Date(now); d.setDate(d.getDate() - 1);
    const k = dayKey(ts);
    if (k === today) return T('Today');
    if (k === dayKey(d.getTime())) return T('Yesterday');
    const opts = new Date(ts).getFullYear() === new Date(now).getFullYear() ? { weekday: 'short', month: 'short', day: 'numeric' } : { month: 'short', day: 'numeric', year: 'numeric' };
    return new Date(ts).toLocaleDateString(locale(l), opts);
  }
  const clock = (ts, l) => new Date(ts).toLocaleTimeString(locale(l), { hour: 'numeric', minute: '2-digit' });
  /* Rows for the chat: day separators, then items grouped by sender within
     a few minutes; the time shows under the last bubble of a group, and
     "Seen" under my last message once the friend has read it. */
  function layout(items, now, l) {
    const rows = [];
    let lastDay = null;
    items.forEach((it, i) => {
      const day = dayKey(it.ts);
      if (day !== lastDay) { rows.push({ type: 'day', label: dayLabel(it.ts, now, l) }); lastDay = day; }
      const prev = items[i - 1], next = items[i + 1];
      const joins = (a, b) => a && b && a.mine === b.mine && dayKey(a.ts) === dayKey(b.ts) && Math.abs(b.ts - a.ts) <= GROUP_GAP;
      const first = !joins(prev, it), last = !joins(it, next);
      rows.push({ type: 'item', item: it, first, last, time: last ? clock(it.ts, l) : '' });
    });
    let lastMine = -1;
    rows.forEach((r, i) => { if (r.type === 'item' && r.item.mine && r.item.kind === 'msg') lastMine = i; });
    if (lastMine >= 0 && rows[lastMine].item.read && rows.slice(lastMine + 1).every(r => r.type !== 'item' || r.item.mine)) rows[lastMine].seen = true;
    return rows;
  }
  function shortAgo(ts, now, l) {
    const s = Math.max(0, (now - ts) / 1000);
    if (s < 60) return T('now');
    if (s < 3600) return T('{n} min', { n: Math.floor(s / 60) });
    if (dayKey(ts) === dayKey(now)) return clock(ts, l);
    const d = new Date(now); d.setDate(d.getDate() - 1);
    if (dayKey(ts) === dayKey(d.getTime())) return T('Yesterday');
    return new Date(ts).toLocaleDateString(locale(l), { month: 'short', day: 'numeric' });
  }
  function previewOf(it) {
    if (!it) return '';
    const who = it.mine ? T('You: ') : '';
    if (it.kind === 'verse') return `${who}📖 ${it.reference || T('A verse')}`;
    const line = String(it.body || '').replace(/\s+/g, ' ').trim();
    return who + (line.length > 70 ? line.slice(0, 69) + '…' : line);
  }
  function lastStore(storage) {
    const read = () => { try { const v = JSON.parse(storage.getItem(LAST_KEY)); return v && typeof v === 'object' && !Array.isArray(v) ? v : {}; } catch { return {}; } };
    return {
      get: code => { const v = read()[code]; return v && Number.isFinite(v.ts) ? v : null; },
      set(code, it) {
        if (!it) return;
        const all = read();
        if (all[code] && all[code].ts > it.ts) return;
        all[code] = { ts: it.ts, text: previewOf(it).slice(0, 90) };
        try { storage.setItem(LAST_KEY, JSON.stringify(all)); } catch { /* full */ }
      }
    };
  }

  /* Polling: new messages every 4 s while the chat is open and the tab is
     visible; shared verses only when the chat opens, when the tab comes back,
     or once a minute. Nothing is fetched while the tab is hidden. */
  const MSG_EVERY = 4000, VERSE_EVERY = 60000;
  function pollPlan(now, lastVerseAt, hidden, force) {
    if (hidden) return { messages: false, verses: false };
    return { messages: true, verses: !!force || !lastVerseAt || now - lastVerseAt >= VERSE_EVERY };
  }
  /* After a chat is read, its unread count in the cached friends list is 0,
     so the inbox badge clears without reopening Friends. */
  function clearUnread(list, code) {
    let changed = false;
    const next = (Array.isArray(list) ? list : []).map(f => { if (f && f.code === code && f.unread) { changed = true; return { ...f, unread: 0 }; } return f; });
    return { list: next, changed };
  }

  /* Read markers kept on this phone (msb_dm_read), so a friends refresh from
     the server cannot bring a read badge back: { code: { at, n } } where n is
     the server's unread count when the chat was read. Only messages beyond
     that count are new; once the server says 0 the marker is dropped. */
  const READ_KEY = 'msb_dm_read';
  function unreadAfterRead(serverUnread, mark) {
    const n = Math.max(0, Math.floor(Number(serverUnread) || 0));
    if (!mark || !n) return n;
    return Math.max(0, n - Math.max(0, Math.floor(Number(mark.n) || 0)));
  }
  function readStore(storage) {
    const read = () => { try { const v = JSON.parse(storage.getItem(READ_KEY)); return v && typeof v === 'object' && !Array.isArray(v) ? v : {}; } catch { return {}; } };
    const save = v => { try { storage.setItem(READ_KEY, JSON.stringify(v)); } catch { /* full */ } };
    return {
      mark(code, serverUnread, now = Date.now()) { const all = read(); all[code] = { at: now, n: Math.max(0, Math.floor(Number(serverUnread) || 0)) }; save(all); },
      /* friends with their unread counts as this phone should show them */
      apply(list) {
        const all = read(); let changed = false;
        const out = (Array.isArray(list) ? list : []).map(f => {
          if (!f || !all[f.code]) return f;
          if (!f.unread) { delete all[f.code]; changed = true; return f; }
          return { ...f, unread: unreadAfterRead(f.unread, all[f.code]) };
        });
        if (changed) save(all);
        return out;
      }
    };
  }

  /* ---------- screens (browser only) ---------- */
  const w = () => window;
  let poll = null, current = null, verseCache = { code: null, at: 0, list: [] };
  function stop() { if (poll) { clearInterval(poll); poll = null; } current = null; }
  function markRead(code) {
    try {
      const raw = JSON.parse(localStorage.getItem('msb_friends_list'));
      const f = (Array.isArray(raw) ? raw : []).find(x => x && x.code === code);
      const marks = readStore(localStorage), prev = (() => { try { return (JSON.parse(localStorage.getItem(READ_KEY)) || {})[code]; } catch { return null; } })();
      /* remember the server count that is now read (keep the higher one) */
      marks.mark(code, Math.max(f ? Number(f.unread) || 0 : 0, prev ? prev.n : 0));
      const r = clearUnread(raw, code);
      if (r.changed) localStorage.setItem('msb_friends_list', JSON.stringify(r.list));
    } catch { /* no cache */ }
  }
  const me = () => (w().msbFriendsId ? w().msbFriendsId() : null);
  const friends = () => (w().msbFriendsCached ? w().msbFriendsCached() || [] : []);
  const friendOf = code => friends().find(f => f && f.code === code) || null;
  const imgOf = f => { const p = f && f.profile && typeof f.profile === 'object' ? f.profile : {}; const src = String((f && f.avatar_data) || p.avatar_data || ''); return /^data:image\/(png|jpe?g|webp);base64,[a-z0-9+/=]+$/i.test(src) ? src : ''; };
  function avatar(f, size) {
    const name = (f && f.name) || '?', src = imgOf(f);
    return `<span class="dm-avatar${size === 'sm' ? ' sm' : ''}" aria-hidden="true">${src ? `<img src="${src}" alt="">` : esc(name.trim().charAt(0).toUpperCase() || '?')}</span>`;
  }
  const verified = f => (w().msbVerifiedHtml ? w().msbVerifiedHtml(f && f.verified) : '');
  const setScreen = name => { try { if (typeof state !== 'undefined') state.screen = name; } catch { /* no app state */ } };
  const onScreen = name => { try { return typeof state === 'undefined' || state.screen === name; } catch { return true; } };

  function openInbox(host) {
    stop(); setScreen('dms');
    const now = Date.now(), cache = lastStore(localStorage), l = lang();
    const rows = friends().map(f => ({ f, last: cache.get(f.code) })).sort((a, b) => ((b.last && b.last.ts) || 0) - ((a.last && a.last.ts) || 0) || (b.f.unread || 0) - (a.f.unread || 0));
    const list = rows.map(({ f, last }) => {
      const unread = Math.max(0, Math.floor(Number(f.unread) || 0));
      return `<li><button type="button" class="dm-conv${unread ? ' unread' : ''}" data-dm-open="${esc(f.code)}">${avatar(f)}<span class="dm-conv-body"><span class="dm-conv-top"><strong data-i18n-skip>${esc(f.name || T('Friend'))}${verified(f)}</strong>${last ? `<time>${esc(shortAgo(last.ts, now, l))}</time>` : ''}</span><span class="dm-conv-preview" data-i18n-skip>${unread ? esc(T(unread === 1 ? '1 new message' : '{n} new messages', { n: unread })) : esc(last ? last.text : T('Say hello 👋'))}</span></span>${unread ? `<span class="dm-dot" aria-hidden="true">${unread > 9 ? '9+' : unread}</span>` : ''}</button></li>`;
    }).join('');
    host.innerHTML = `<div class="dm-screen" data-dm-inbox><button class="text-button back" data-action="friends" type="button">← ${esc(T('Friends'))}</button><h1 class="dm-title">${esc(T('Messages'))}</h1>${rows.length ? `<ul class="dm-list">${list}</ul>` : `<p class="muted">${esc(T('Add a friend to start a conversation.'))}</p>`}</div>`;
    window.scrollTo({ top: 0, behavior: 'auto' });
  }

  function verseCard(it) {
    const can = it.book && it.chapter;
    const inner = `<span class="dm-verse-ref">📖 ${esc(it.reference || T('A verse'))}<small>${it.translation === 'rvr' ? 'RV1909' : 'KJV'}</small></span><span class="dm-verse-text">“${esc(it.text)}”</span>${it.note ? `<span class="dm-verse-note">${esc(it.note)}</span>` : ''}${can ? `<span class="dm-verse-open">${esc(T('Open in the Bible'))} →</span>` : ''}`;
    return can ? `<button type="button" class="dm-verse" data-dm-verse="${it.book}:${it.chapter}:${it.verse || ''}" data-i18n-skip>${inner}</button>` : `<div class="dm-verse" data-i18n-skip>${inner}</div>`;
  }
  function threadRows(items) {
    const l = lang();
    return layout(items, Date.now(), l).map(r => {
      if (r.type === 'day') return `<div class="dm-day" role="separator"><span>${esc(r.label)}</span></div>`;
      const it = r.item, cls = `dm-row ${it.mine ? 'mine' : 'theirs'}${r.first ? ' first' : ''}${r.last ? ' last' : ''}`;
      const bubble = it.kind === 'verse' ? verseCard(it) : `<div class="dm-bubble" data-i18n-skip>${esc(it.body)}</div>`;
      const meta = r.last || r.seen ? `<div class="dm-meta">${esc(r.time)}${r.seen ? ` · ${esc(T('Seen'))}` : ''}</div>` : '';
      return `<div class="${cls}">${bubble}${meta}</div>`;
    }).join('');
  }
  async function load(code, force) {
    const id = me();
    if (!id) return null;
    const call = w().msbFriendsCall;
    if (verseCache.code !== code) verseCache = { code, at: 0, list: [] };
    const plan = pollPlan(Date.now(), verseCache.at, false, force);
    const [msgs, verses] = await Promise.all([
      call('/msg/thread', { code: id.code, secret: id.secret, with: code }).then(r => (Array.isArray(r && r.messages) ? r.messages : [])),
      plan.verses ? call('/verse/thread', { code: id.code, secret: id.secret, with: code }).then(r => { const list = Array.isArray(r && r.verses) ? r.verses : []; if (verseCache.code === code) { verseCache.at = Date.now(); verseCache.list = list; } return list; }).catch(() => verseCache.list) : Promise.resolve(verseCache.list)
    ]);
    markRead(code);
    const items = timeline(msgs, verses, id.code);
    if (items.length) lastStore(localStorage).set(code, items[items.length - 1]);
    return items;
  }
  function paint(code, items, force) {
    const box = document.querySelector('[data-dm-thread]');
    if (!box || current !== code) return;
    const sig = items.map(i => `${i.id}${i.read ? 'r' : ''}`).join(',');
    if (!force && box.dataset.sig === sig) return;
    const near = box.dataset.sig === undefined || window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 160;
    box.dataset.sig = sig;
    box.innerHTML = items.length ? threadRows(items) : `<p class="dm-empty muted">${esc(T('No messages yet. Say the first word.'))}</p>`;
    if (near) requestAnimationFrame(() => window.scrollTo({ top: document.documentElement.scrollHeight, behavior: box.dataset.first ? 'smooth' : 'auto' }));
    box.dataset.first = '1';
  }
  function openThread(host, code, fallbackName) {
    stop(); setScreen('messages'); current = code;
    const f = friendOf(code) || { code, name: fallbackName || T('Friend') };
    host.innerHTML = `<div class="dm-screen dm-chat" data-dm-chat="${esc(code)}"><header class="dm-head"><button type="button" class="dm-back" data-dm-inbox-open aria-label="${esc(T('Back to messages'))}">←</button>${avatar(f, 'sm')}<button type="button" class="dm-head-name" data-action="friend-open" data-code="${esc(code)}"><strong data-i18n-skip>${esc(f.name || T('Friend'))}${verified(f)}</strong><small>${esc(T('Just between you two'))}</small></button></header><div class="dm-thread" data-dm-thread aria-live="polite"><p class="dm-empty muted">${esc(T('Loading messages…'))}</p></div><form class="dm-composer" data-dm-form><textarea data-dm-input rows="1" maxlength="2000" placeholder="${esc(T('Message…'))}" aria-label="${esc(T('Message'))}"></textarea><button type="submit" class="dm-send" aria-label="${esc(T('Send'))}" data-dm-send disabled>➤</button></form></div>`;
    const run = force => load(code, force).then(items => { if (items && current === code && onScreen('messages')) paint(code, items); }).catch(e => { const box = document.querySelector('[data-dm-thread]'); if (box && !box.dataset.sig) box.innerHTML = `<p class="dm-empty muted">${esc(e && e.message ? e.message : T('Could not load messages.'))}</p>`; });
    run(true);
    poll = setInterval(() => { if (current !== code || !document.querySelector(`[data-dm-chat="${CSS.escape(code)}"]`)) { stop(); return; } if (pollPlan(Date.now(), verseCache.at, document.hidden).messages) run(false); }, MSG_EVERY);
    const back = () => { if (current !== code || !document.querySelector(`[data-dm-chat="${CSS.escape(code)}"]`)) { document.removeEventListener('visibilitychange', back); window.removeEventListener('focus', back); return; } if (!document.hidden) run(Date.now() - verseCache.at > 3000); };
    document.addEventListener('visibilitychange', back); window.addEventListener('focus', back);
  }
  async function send(form) {
    const code = current, id = me(), input = form.querySelector('[data-dm-input]'), btn = form.querySelector('[data-dm-send]');
    const text = String(input.value || '').trim();
    if (!code || !id || !text) return;
    btn.disabled = true;
    try {
      await w().msbFriendsCall('/msg/send', { code: id.code, secret: id.secret, to: code, body: text });
      input.value = ''; grow(input);
      const items = await load(code);
      if (items) paint(code, items, true);
      requestAnimationFrame(() => window.scrollTo({ top: document.documentElement.scrollHeight, behavior: 'smooth' }));
    } catch (e) { if (w().toast) w().toast(e && e.message ? e.message : T('Could not send.')); }
    finally { btn.disabled = !String(input.value || '').trim(); input.focus(); }
  }
  function grow(t) { t.style.height = 'auto'; t.style.height = Math.min(t.scrollHeight, 140) + 'px'; }

  if (typeof document !== 'undefined') {
    document.addEventListener('click', e => {
      const t = e.target instanceof Element ? e.target : null;
      if (!t) return;
      const open = t.closest('[data-dm-open]');
      if (open) { e.preventDefault(); openThread(document.getElementById('screen') || document.querySelector('main'), open.dataset.dmOpen); window.scrollTo({ top: 0 }); return; }
      if (t.closest('[data-dm-inbox-open]')) { e.preventDefault(); openInbox(document.getElementById('screen') || document.querySelector('main')); return; }
      const v = t.closest('[data-dm-verse]');
      if (v) {
        const [b, c, vv] = v.dataset.dmVerse.split(':').map(Number);
        stop();
        if (w().msbOpenBibleVerse) w().msbOpenBibleVerse(b, c, vv || undefined);
      }
    });
    document.addEventListener('input', e => { const t = e.target; if (t && t.matches && t.matches('[data-dm-input]')) { grow(t); const b = t.form && t.form.querySelector('[data-dm-send]'); if (b) b.disabled = !t.value.trim(); } });
    document.addEventListener('keydown', e => { const t = e.target; if (t && t.matches && t.matches('[data-dm-input]') && e.key === 'Enter' && !e.shiftKey && !e.isComposing && window.matchMedia('(pointer:fine)').matches) { e.preventDefault(); t.form.requestSubmit(); } });
    document.addEventListener('submit', e => { const f = e.target; if (f && f.matches && f.matches('[data-dm-form]')) { e.preventDefault(); send(f); } });
  }
  return { LAST_KEY, READ_KEY, unreadAfterRead, readStore, MSG_EVERY, VERSE_EVERY, pollPlan, clearUnread, timeline, layout, dayLabel, shortAgo, previewOf, lastStore, openInbox, openThread, stop };
});
