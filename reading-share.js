/* Share what I'm reading with friends (opt-in, off by default).
   When on, the friends sync carries a small "reading" note inside stats:
   the Bible chapter last opened, the study in progress and how many studies
   are done. Friends see it on the friend profile and in the chat header.
   Nothing is sent while it is off, and turning it off clears it on the next
   sync. The same cleaning runs on both sides (and in the friends server). */
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.MsbReadingShare = api;
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';
  const KEY = 'msb_share_reading';
  const PLACE_KEY = 'lampstand_bible_place';
  const LAST_STUDY_KEY = 'msb_last_study';
  const int = v => { const n = Math.floor(Number(v)); return Number.isFinite(n) ? n : 0; };
  const text = (v, max) => String(v ?? '').replace(/[\u0000-\u001f<>]/g, '').trim().slice(0, max);

  function pref(storage) {
    return {
      get() { try { return storage.getItem(KEY) === 'on'; } catch { return false; } },
      set(on) { try { storage.setItem(KEY, on ? 'on' : 'off'); } catch { /* ignore */ } return !!on; }
    };
  }
  /* Only known, small fields survive. Returns null when there is nothing. */
  function clean(input) {
    if (!input || typeof input !== 'object' || Array.isArray(input)) return null;
    const out = {};
    const book = int(input.book), chapter = int(input.chapter);
    if (book >= 1 && book <= 78 && chapter >= 1 && chapter <= 150) { out.book = book; out.chapter = chapter; }
    const study = String(input.study ?? '').trim().toLowerCase();
    if (/^[a-z0-9-]{1,60}$/.test(study)) { out.study = study; const t = text(input.studyTitle, 120); if (t) out.studyTitle = t; }
    const total = int(input.total), done = int(input.done);
    if (total >= 1 && total <= 500 && done >= 0 && done <= total) { out.done = done; out.total = total; }
    const at = int(input.at);
    if (at > 0) out.at = at;
    return out.book || out.study || out.total ? out : null;
  }
  /* What this phone shares: the last Bible place and the next unfinished
     study, from the app's own data. */
  function snapshot(o) {
    const place = String(o.place || '').match(/^(\d+):(\d+)$/);
    const studies = Array.isArray(o.studies) ? o.studies : [], progress = Array.isArray(o.progress) ? o.progress : [];
    const isDone = id => progress.some(p => p && p.study_id === id && p.completed_at);
    /* the study last opened; before any is opened, the next unfinished one */
    const next = o.last && o.last.id ? o.last : studies.find(s => s && s.id && !isDone(s.id));
    return clean({
      book: place ? place[1] : 0, chapter: place ? place[2] : 0,
      study: next ? next.id : '', studyTitle: next ? next.title : '',
      done: studies.filter(s => s && isDone(s.id)).length, total: studies.length,
      at: o.now || Date.now()
    });
  }
  /* One line for people: "Reading John 3 · Study: The Good Shepherd · 4 of 12 studies done" */
  function line(r, lang, bookName, studyTitle) {
    const c = clean(r); if (!c) return '';
    const es = lang === 'es', parts = [];
    if (c.book) parts.push(`${es ? 'Leyendo' : 'Reading'} ${bookName ? bookName(c.book) || (es ? 'Libro' : 'Book') + ' ' + c.book : (es ? 'Libro' : 'Book') + ' ' + c.book} ${c.chapter}`);
    if (c.study) parts.push(`${es ? 'Estudio' : 'Study'}: ${(studyTitle && studyTitle(c.study)) || c.studyTitle || c.study}`);
    if (c.total) parts.push(es ? `${c.done} de ${c.total} estudios hechos` : `${c.done} of ${c.total} studies done`);
    return parts.join(' · ');
  }
  /* Book names in either language, loaded once from the app's Bible index. */
  const names = { en: null, es: null };
  function loadNames(lang, fetcher) {
    const l = lang === 'es' ? 'es' : 'en';
    if (names[l]) return Promise.resolve(names[l]);
    const url = l === 'es' ? 'bible/rvr/index.json' : 'bible/index.json';
    return (fetcher || fetch)(url).then(r => r.json()).then(j => { const m = {}; for (const b of (j && j.books) || []) m[b.id] = b.name; names[l] = m; return m; }).catch(() => ({}));
  }
  const bookNameNow = lang => id => ((names[lang === 'es' ? 'es' : 'en'] || {})[id] || '');
  return { KEY, PLACE_KEY, LAST_STUDY_KEY, pref, clean, snapshot, line, loadNames, bookNameNow };
});
