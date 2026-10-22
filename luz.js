/* Lessons for Luz / Lecciones para Luz.
   Questions and answers about the Orthodox faith, written for Luz.
   Spanish is the default for this section (its own language switch, kept
   apart from the app language). Large text with a size control, high
   contrast, big tap targets, read-aloud through MsbSpeech, and a video that
   loads its YouTube (nocookie) frame only when tapped. Content lives in
   luz-data.js; everything here works offline except the video itself. */
(() => {
  'use strict';
  const LANG_KEY = 'msb_luz_lang';
  const SIZE_KEY = 'msb_luz_size';
  const SIZES = [18, 21, 24, 28];
  const DEFAULT_SIZE = 1;
  const VIDEO = {
    id: 'DeBUvb2ul5A',
    title: 'La verdad que permaneció intacta por 2000 años I Por qué la Ortodoxia no es lo que tú piensas?',
    channel: 'Luz Ortodoxa',
    watch: 'https://www.youtube.com/watch?v=DeBUvb2ul5A',
    embed: 'https://www.youtube-nocookie.com/embed/DeBUvb2ul5A?playsinline=1&autoplay=1&rel=0',
    thumb: 'img/luz/luz-video-thumb.jpg'
  };
  const SOURCES = [
    { url: 'https://nvny.org/creemos-en-un-solo-dios/', es: 'Creemos en un solo Dios', en: 'We believe in one God' },
    { url: 'https://nvny.org/la-biblia-nuestra-autoridad-final/', es: 'La Biblia, nuestra autoridad final', en: 'The Bible, our final authority' },
    { url: 'https://nvny.org/el-espiritu-santo/', es: 'El Espíritu Santo', en: 'The Holy Spirit' },
    { url: 'https://nvny.org/sanidad-divina/', es: 'Sanidad divina', en: 'Divine healing' },
    { url: 'https://nvny.org/la-santificacion/', es: 'La santificación', en: 'Sanctification' },
    { url: 'https://nvny.org/perseverar-en-el-camino-que-lleva-a-la-salvacion/', es: 'Perseverar en el camino', en: 'Persevering on the way' },
    { url: 'https://nvny.org/ordenanzas-de-la-iglesia/', es: 'Ordenanzas de la Iglesia', en: 'Ordinances of the Church' },
    { url: 'https://nvny.org/creacion-de-la-iglesia/', es: 'Creación de la Iglesia', en: 'The Church' },
    { url: 'https://nvny.org/la-segunda-venida-de-cristo-y-reinado-milenial/', es: 'La segunda venida de Cristo', en: 'The Second Coming of Christ' }
  ];
  const PENTECOSTAL_SOURCES = [
    { url: 'https://ag.org/Beliefs/Statement-of-Fundamental-Truths', es: 'Asambleas de Dios: Declaración de Verdades Fundamentales (en inglés)', en: 'Assemblies of God: Statement of Fundamental Truths' }
  ];
  const T = {
    es: {
      loading: 'Abriendo las lecciones…', loadFailed: 'Las lecciones no se pudieron abrir. Revisa tu conexión y vuelve a intentarlo.', retry: 'Intentar otra vez',
      home: '← Inicio', eyebrow: 'LECCIONES PARA LUZ', title: 'Lecciones para Luz',
      lead: 'Preguntas y respuestas sobre la fe ortodoxa, escritas con cariño para ti. Toca una pregunta para leer la respuesta.',
      lang: 'Idioma', size: 'Tamaño de letra', smaller: 'Letra más pequeña', bigger: 'Letra más grande',
      sizes: ['Normal', 'Grande', 'Más grande', 'Muy grande'],
      questions: 'Preguntas', of: (n, t) => `PREGUNTA ${n} DE ${t}`, short: 'RESPUESTA CORTA', bible: 'La Biblia dice', father: 'Un Padre de la Iglesia',
      sources: 'De la página de tu iglesia, Nueva Vida', pentecostal: 'Una declaración pentecostal común', listen: 'Escuchar', pause: 'Pausa', stop: 'Parar',
      prev: '← Anterior', next: 'Siguiente →', back: 'Volver a mis lecciones', seeAlso: 'Ver también', pager: 'Moverse entre lecciones', prevOf: 'Lección anterior', nextOf: 'Lección siguiente', video: 'VIDEO', play: 'Ver el video', open: 'Abrir en YouTube',
      offline: 'Este video necesita internet. Cuando tengas conexión, tócalo otra vez. Las lecciones sí funcionan sin internet.',
      version: 'RV1909', by: 'Canal'
    },
    en: {
      loading: 'Opening the lessons…', loadFailed: 'The lessons could not open. Check your connection and try again.', retry: 'Try again',
      home: '← Home', eyebrow: 'LESSONS FOR LUZ', title: 'Lessons for Luz',
      lead: 'Questions and answers about the Orthodox faith, written with love for you. Tap a question to read the answer.',
      lang: 'Language', size: 'Text size', smaller: 'Smaller text', bigger: 'Bigger text',
      sizes: ['Normal', 'Large', 'Larger', 'Largest'],
      questions: 'Questions', of: (n, t) => `QUESTION ${n} OF ${t}`, short: 'SHORT ANSWER', bible: 'The Bible says', father: 'A Father of the Church',
      sources: 'From your church’s website, Nueva Vida', pentecostal: 'A common Pentecostal statement', listen: 'Read aloud', pause: 'Pause', stop: 'Stop',
      prev: '← Previous', next: 'Next →', back: 'Back to my lessons', seeAlso: 'See also', pager: 'Move between lessons', prevOf: 'Previous lesson', nextOf: 'Next lesson', video: 'VIDEO', play: 'Play the video', open: 'Open in YouTube',
      offline: 'This video needs the internet. When you are connected, tap it again. The lessons work without internet.',
      version: 'KJV', by: 'Channel'
    }
  };
  const view = { lesson: null, root: null, active: false, last: null };
  const HISTORY_KIND = 'msb-luz-lesson';
  const inLessonEntry = () => { try { return !!(history.state && history.state.msbLuz === HISTORY_KIND); } catch { return false; } };

  const esc = value => String(value ?? '').replace(/[&<>"']/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));
  const lessons = () => (window.MsbLuzData && window.MsbLuzData.lessons) || [];
  /* luz-data.js (~125 KB) is not loaded at startup: it is fetched when the
     section opens. sw.js precaches it with the shell, so it opens offline too.
     The Home card shows LESSON_COUNT until then (luz.test.mjs keeps it equal
     to the number of lessons). */
  const LESSON_COUNT = 23;
  let dataLoad = null;
  function ensureData() {
    if (window.MsbLuzData) return Promise.resolve(window.MsbLuzData);
    if (!dataLoad) dataLoad = new Promise((ok, fail) => {
      const el = document.createElement('script'); el.src = 'luz-data.js'; el.async = true;
      el.onload = () => (window.MsbLuzData ? ok(window.MsbLuzData) : fail(Error('no data')));
      el.onerror = () => { dataLoad = null; el.remove(); fail(Error('no data')); };
      document.head.appendChild(el);
    });
    return dataLoad;
  }
  function lang() {
    try { return localStorage.getItem(LANG_KEY) === 'en' ? 'en' : 'es'; } catch { return 'es'; }
  }
  function sizeIndex() {
    let n = DEFAULT_SIZE;
    try { const raw = localStorage.getItem(SIZE_KEY); if (raw !== null && SIZES[Number(raw)]) n = Number(raw); } catch { /* private mode */ }
    return n;
  }
  function save(key, value) { try { localStorage.setItem(key, String(value)); } catch { /* private mode */ } }

  function homeCard() {
    // Follows the app language (Spanish when the app language is unknown).
    const n = lessons().length || LESSON_COUNT;
    const en = !!(window.MsbI18n && MsbI18n.lang && MsbI18n.lang() === 'en');
    const sub = en ? `${n ? `${n} ` : ''}questions about the Orthodox faith` : `${n ? `${n} ` : ''}preguntas sobre la fe ortodoxa`;
    return `<button type="button" class="luz-home-card" data-nav="luz" data-i18n-skip lang="${en ? 'en' : 'es'}"><span class="eyebrow">${en ? 'FOR LUZ' : 'PARA LUZ'}</span><strong>${en ? 'Lessons for Luz' : 'Lecciones para Luz'}</strong><span>${sub}</span></button>`;
  }

  function tools(t, l) {
    const s = sizeIndex();
    return `<div class="luz-tools" role="group" aria-label="${esc(t.lang)} / ${esc(t.size)}">
      <div class="luz-tool"><span class="luz-tool-label">${esc(t.lang)}</span><div class="luz-seg">
        <button type="button" class="luz-btn${l === 'es' ? ' on' : ''}" data-luz-lang="es" aria-pressed="${l === 'es'}" lang="es">Español</button>
        <button type="button" class="luz-btn${l === 'en' ? ' on' : ''}" data-luz-lang="en" aria-pressed="${l === 'en'}" lang="en">English</button></div></div>
      <div class="luz-tool"><span class="luz-tool-label">${esc(t.size)}: <b>${esc(t.sizes[s])}</b></span><div class="luz-seg">
        <button type="button" class="luz-btn" data-luz-size="-1" aria-label="${esc(t.smaller)}" ${s === 0 ? 'disabled' : ''}>A−</button>
        <button type="button" class="luz-btn luz-btn-big" data-luz-size="1" aria-label="${esc(t.bigger)}" ${s === SIZES.length - 1 ? 'disabled' : ''}>A+</button></div></div>
    </div>`;
  }

  function videoCard(t) {
    const offline = navigator.onLine === false;
    return `<section class="luz-card luz-video" aria-labelledby="luz-video-title">
      <span class="eyebrow">${esc(t.video)}</span>
      <h2 id="luz-video-title" class="luz-video-title" lang="es">${esc(VIDEO.title)}</h2>
      <p class="luz-video-channel">${esc(t.by)}: ${esc(VIDEO.channel)}</p>
      <div class="luz-video-frame" data-luz-frame>
        <button type="button" class="luz-video-play" data-luz-play aria-label="${esc(t.play)}: ${esc(VIDEO.title)}">
          <img src="${VIDEO.thumb}" alt="" width="480" height="360" decoding="async">
          <span class="luz-play-badge" aria-hidden="true"><svg viewBox="0 0 24 24" fill="currentColor" focusable="false"><path d="m9 6 9 6-9 6z"/></svg></span>
          <span class="luz-play-label">${esc(t.play)}</span>
        </button>
      </div>
      <p class="luz-video-offline" data-luz-offline role="status" ${offline ? '' : 'hidden'}>${esc(t.offline)}</p>
      <a class="luz-btn luz-yt" href="${VIDEO.watch}" target="_blank" rel="noopener noreferrer">${esc(t.open)} ↗</a>
    </section>`;
  }

  function listHtml(t, l) {
    const items = lessons().map((lesson, i) => `<li><button type="button" class="luz-q-btn${lesson.id === view.last ? ' luz-q-last' : ''}" data-luz-open="${esc(lesson.id)}" data-luz-from="board"><span class="luz-num" aria-hidden="true">${i + 1}</span><span class="luz-q-text">${esc(lesson.q[l])}</span></button></li>`).join('');
    return `<button type="button" class="luz-btn luz-back" data-nav="today">${esc(t.home)}</button>
      <span class="eyebrow">${esc(t.eyebrow)}</span><h1>${esc(t.title)}</h1><p class="luz-lead">${esc(t.lead)}</p>
      ${tools(t, l)}${videoCard(t)}
      <h2 class="luz-list-title">${esc(t.questions)}</h2><ol class="luz-list">${items}</ol>`;
  }

  function lessonHtml(t, l, lesson) {
    const all = lessons();
    const i = all.indexOf(lesson);
    const prev = all[i - 1], next = all[i + 1];
    const verses = lesson.verses.map(v => `<blockquote class="luz-verse"><p data-luz-say>${esc(v.text[l])}</p><cite data-luz-say>${esc(v.ref[l])} (${esc(t.version)})</cite></blockquote>`).join('');
    const father = lesson.father ? `<h2>${esc(t.father)}</h2><blockquote class="luz-father"><p data-luz-say>${esc(lesson.father[l])}</p><cite data-luz-say>${esc(lesson.father.who[l])}</cite>${lesson.father.note ? `<p class="luz-note">${esc(lesson.father.note[l])}</p>` : ''}</blockquote>` : '';
    const links = list => `<ul class="luz-sources">${list.map(s => `<li><a href="${esc(s.url)}" target="_blank" rel="noopener noreferrer">${esc(s[l])} ↗</a></li>`).join('')}</ul>`;
    const kinds = lesson.sources || [];
    const sources = (kinds.includes('nvny') ? `<h2>${esc(t.sources)}</h2>${links(SOURCES)}` : '')
      + (kinds.includes('ag') ? `<h2>${esc(t.pentecostal)}</h2>${links(PENTECOSTAL_SOURCES)}` : '');
    const related = (lesson.see || []).map(id => all.find(x => x.id === id)).filter(Boolean);
    const seeAlso = related.length ? `<h2>${esc(t.seeAlso)}</h2><ul class="luz-see">${related.map(r => `<li><button type="button" class="luz-q-btn" data-luz-open="${esc(r.id)}" data-luz-see><span class="luz-num" aria-hidden="true">${all.indexOf(r) + 1}</span><span class="luz-q-text">${esc(r.q[l])}</span></button></li>`).join('')}</ul>` : '';
    const backBtn = where => `<button type="button" class="luz-btn luz-board-btn" data-luz-list data-luz-back="${where}"><span aria-hidden="true">←</span> ${esc(t.back)}</button>`;
    const prevBtn = prev ? `<button type="button" class="luz-btn luz-prev" data-luz-open="${esc(prev.id)}" data-luz-step="prev" aria-label="${esc(t.prevOf)}: ${esc(prev.q[l])}">${esc(t.prev)}</button>` : '';
    const nextBtn = next ? `<button type="button" class="luz-btn luz-next" data-luz-open="${esc(next.id)}" data-luz-step="next" aria-label="${esc(t.nextOf)}: ${esc(next.q[l])}">${esc(t.next)}</button>` : '';
    return `${backBtn('top')}
      ${tools(t, l)}
      <article class="luz-lesson" data-luz-lesson="${esc(lesson.id)}">
        <span class="eyebrow">${esc(t.of(i + 1, all.length))}</span>
        <h1 class="luz-question" data-luz-say tabindex="-1">${esc(lesson.q[l])}</h1>
        <section class="luz-short"><span class="eyebrow">${esc(t.short)}</span><p data-luz-say>${esc(lesson.short[l])}</p></section>
        <div class="speech-row luz-speech"><button type="button" class="luz-btn luz-listen" data-luz-read>${esc(t.listen)}</button><button type="button" class="luz-btn" data-speech-pause>${esc(t.pause)}</button><button type="button" class="luz-btn" data-speech-stop>${esc(t.stop)}</button>${window.MsbSpeech ? MsbSpeech.rateHtml() : ''}</div>
        <div class="luz-body">${lesson.body[l].map(p => `<p data-luz-say>${esc(p)}</p>`).join('')}</div>
        <h2>${esc(t.bible)}</h2>${verses}${father}${sources}${seeAlso}
      </article>
      <nav class="luz-pager" aria-label="${esc(t.pager)}">${prevBtn}${nextBtn}</nav>
      ${backBtn('bottom')}`;
  }

  function paint() {
    const root = view.root;
    if (!root) return;
    const l = lang();
    const t = T[l];
    if (!window.MsbLuzData) {
      root.innerHTML = `<div class="luz" data-i18n-skip lang="${l}"><p class="luz-lead" role="status">${esc(t.loading)}</p></div>`;
      ensureData().then(() => { if (view.active && view.root === root) paint(); }, () => {
        if (view.active && view.root === root) root.innerHTML = `<div class="luz" data-i18n-skip lang="${l}"><p class="luz-lead" role="alert">${esc(t.loadFailed)}</p><button type="button" class="luz-btn" data-luz-retry>${esc(t.retry)}</button></div>`;
      });
      return;
    }
    const lesson = view.lesson && lessons().find(x => x.id === view.lesson);
    root.innerHTML = `<div class="luz" data-i18n-skip lang="${l}" style="--luz-size:${SIZES[sizeIndex()]}px">${lesson ? lessonHtml(t, l, lesson) : listHtml(t, l)}</div>`;
  }

  function show(root, opts) {
    view.root = root;
    view.active = true;
    if (opts && 'lesson' in opts) view.lesson = opts.lesson;
    paint();
  }

  function hide() {
    if (window.MsbSpeech) MsbSpeech.stop();
    const frame = document.querySelector('.luz-video-frame iframe');
    if (frame) frame.remove();
    view.lesson = null;
    view.last = null;
    view.active = false;
    // Leaving the section from inside a lesson: drop the lesson's history entry
    // so the next Back press is not a dead step.
    if (inLessonEntry()) { try { history.back(); } catch { /* no history */ } }
  }

  function openLesson(id, how) {
    if (window.MsbSpeech) MsbSpeech.stop();
    view.lesson = id;
    view.last = id;
    // From the board a lesson gets its own history entry, so the Android or
    // browser Back button returns to the board. Previous / Next replace that
    // entry, so Back always means "back to my lessons".
    try {
      history.scrollRestoration = 'manual';
      const entry = { msbLuz: HISTORY_KIND, id };
      if (how === 'push' && !inLessonEntry()) history.pushState(entry, '');
      else if (inLessonEntry()) history.replaceState(entry, '');
    } catch { /* history unavailable */ }
    paint();
    window.scrollTo({ top: 0, behavior: 'instant' });
    const h = view.root.querySelector('.luz-question');
    if (h) h.focus({ preventScroll: true });
  }

  function showBoard() {
    if (window.MsbSpeech) MsbSpeech.stop();
    const was = view.lesson || view.last;
    view.lesson = null;
    paint();
    const btn = was && view.root.querySelector(`[data-luz-open="${CSS.escape(was)}"]`);
    if (btn) { btn.scrollIntoView({ block: 'center', behavior: 'instant' }); btn.focus({ preventScroll: true }); } else window.scrollTo({ top: 0, behavior: 'instant' });
  }

  function onPopState(event) {
    if (!view.active || !view.root || !view.root.isConnected) return;
    const state = event && event.state;
    if (state && state.msbLuz === HISTORY_KIND && lessons().some(x => x.id === state.id)) {
      if (view.lesson !== state.id) openLesson(state.id, 'none');
      return;
    }
    if (view.lesson) showBoard();
  }

  function loadVideo(frameHost) {
    const note = view.root && view.root.querySelector('[data-luz-offline]');
    if (navigator.onLine === false) { if (note) note.hidden = false; return; }
    if (note) note.hidden = true;
    const t = T[lang()];
    const iframe = document.createElement('iframe');
    iframe.src = VIDEO.embed;
    iframe.title = VIDEO.title;
    iframe.setAttribute('allow', 'autoplay; encrypted-media; picture-in-picture; fullscreen');
    iframe.setAttribute('allowfullscreen', '');
    iframe.setAttribute('referrerpolicy', 'strict-origin-when-cross-origin');
    iframe.setAttribute('aria-label', `${t.video}: ${VIDEO.title}`);
    frameHost.replaceChildren(iframe);
  }

  function readAloud() {
    if (!window.MsbSpeech || !view.root) return;
    const article = view.root.querySelector('.luz-lesson');
    if (!article) return;
    const chunks = [...article.querySelectorAll('[data-luz-say]')].map(el => ({ text: el.textContent.trim(), el })).filter(c => c.text);
    MsbSpeech.speak({ lang: lang(), chunks, onChunk: chunk => { if (chunk.el) chunk.el.scrollIntoView({ block: 'nearest', behavior: 'smooth' }); } });
  }

  document.addEventListener('click', event => {
    if (!view.root || !view.root.isConnected) return;
    const target = event.target;
    if (!(target instanceof Element) || !target.closest('.luz')) return;
    if (target.closest('[data-luz-retry]')) { paint(); return; }
    const open = target.closest('[data-luz-open]');
    if (open) { openLesson(open.dataset.luzOpen, open.dataset.luzFrom === 'board' ? 'push' : 'replace'); return; }
    if (target.closest('[data-luz-list]')) {
      // Use the real history step when there is one, so Back and this button agree.
      if (inLessonEntry()) history.back(); else showBoard();
      return;
    }
    const langBtn = target.closest('[data-luz-lang]');
    if (langBtn) { if (window.MsbSpeech) MsbSpeech.stop(); save(LANG_KEY, langBtn.dataset.luzLang); paint(); return; }
    const sizeBtn = target.closest('[data-luz-size]');
    if (sizeBtn) {
      const next = Math.max(0, Math.min(SIZES.length - 1, sizeIndex() + Number(sizeBtn.dataset.luzSize)));
      save(SIZE_KEY, next);
      const y = window.scrollY;
      paint();
      window.scrollTo({ top: y, behavior: 'instant' });
      const again = view.root.querySelector(`[data-luz-size="${sizeBtn.dataset.luzSize}"]`);
      if (again && !again.disabled) again.focus({ preventScroll: true });
      return;
    }
    const play = target.closest('[data-luz-play]');
    if (play) { loadVideo(play.closest('[data-luz-frame]')); return; }
    if (target.closest('[data-luz-read]')) readAloud();
  });

  const syncOnline = () => {
    const note = view.root && view.root.isConnected && view.root.querySelector('[data-luz-offline]');
    if (note && !view.root.querySelector('.luz-video-frame iframe')) note.hidden = navigator.onLine !== false;
  };
  window.addEventListener('online', syncOnline);
  window.addEventListener('offline', syncOnline);
  window.addEventListener('popstate', onPopState);

  window.MsbLuz = { show, hide, homeCard, ensureData, LESSON_COUNT, VIDEO, SIZES, DEFAULT_SIZE, _onPopState: onPopState };
})();
