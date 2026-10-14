/* Bible Word Search: find the hidden words (across, down or diagonal, either
   way round) by dragging or by tapping the first and last letter. Finding
   every word unlocks the puzzle's verse. */
(() => {
  'use strict';
  const K = window.MsbKidGames; if (!K) return;
  const { t, esc, lang, name, sound, buzz, prog, award, render, verseHtml, gameHead, celebrate } = K._helpers;
  const D = () => window.MsbKidGamesData, C = () => window.MsbKidGamesCore;
  const SIZE = 10;
  const COLORS = 6;
  const list = () => D().WORDSEARCH;

  function start() { return { view: 'pick', at: 0, puzzle: null, found: [], anchor: -1, preview: [], won: false }; }
  function begin(s, i) {
    const p = list()[i], l = lang();
    s.view = 'play'; s.at = i; s.found = []; s.anchor = -1; s.preview = []; s.won = false;
    s.puzzle = C().wordSearch(p.words[l], SIZE, `${p.id}|${l}`, l);
    s.lang = l;
  }
  function pickHtml(s) {
    const done = prog().done('wordsearch');
    const items = list().map((p, i) => `<li><button type="button" class="card kg-pick${done.includes(p.id) ? ' done' : ''}" data-ws-pick="${i}"><span class="kg-pick-icon" aria-hidden="true">${p.icon}</span><span><strong>${esc(name(p.title))}</strong><small>${esc(done.includes(p.id) ? t('Found it all ✓', '¡Todo encontrado! ✓') : t('{n} words', '{n} palabras', { n: p.words[lang()].length }))}</small></span></button></li>`).join('');
    return `<p class="kg-lead">${esc(t('Pick a puzzle. Find every hidden word to unlock its verse.', 'Escoge una sopa de letras. Encuentra todas las palabras para descubrir su versículo.'))}</p><ul class="kg-picks">${items}</ul>`;
  }
  function playHtml(s) {
    const p = list()[s.at], z = s.puzzle;
    const owner = new Map();
    s.found.forEach((wi, k) => z.placed[wi].cells.forEach(c => owner.set(c, k % COLORS)));
    const prev = new Set(s.preview);
    const cells = z.grid.map((ch, i) => {
      const own = owner.get(i);
      return `<button type="button" class="kg-ws-cell${own !== undefined ? ' found c' + own : ''}${prev.has(i) ? ' sel' : ''}${s.anchor === i ? ' anchor' : ''}" data-ws-cell="${i}" aria-label="${esc(t('Row {r}, column {c}: {ch}', 'Fila {r}, columna {c}: {ch}', { r: Math.floor(i / SIZE) + 1, c: i % SIZE + 1, ch }))}">${esc(ch)}</button>`;
    }).join('');
    const words = z.placed.map((w, i) => `<li class="${s.found.includes(i) ? 'got' : ''}">${esc(w.word)}</li>`).join('');
    const status = s.won ? '' : t('Found {n} of {total}', 'Encontradas {n} de {total}', { n: s.found.length, total: z.placed.length });
    return `<p class="kg-sub"><span aria-hidden="true">${p.icon}</span> ${esc(name(p.title))}</p><ul class="kg-ws-words" aria-label="${esc(t('Words to find', 'Palabras para encontrar'))}">${words}</ul><p class="kg-msg" role="status" aria-live="polite" data-kg-msg>${esc(s.msg || status)}</p><div class="kg-ws-grid" data-ws-grid style="--n:${SIZE}">${cells}</div>${s.won ? verseHtml(p.verse, t('YOU FOUND THEM ALL!', '¡LAS ENCONTRASTE TODAS!'), `<button type="button" class="primary" data-ws-next>${esc(s.at + 1 < list().length ? t('Next puzzle', 'Siguiente sopa') : t('All puzzles', 'Todas las sopas'))}</button><button type="button" class="secondary" data-ws-list>${esc(t('Pick another', 'Escoger otra'))}</button>`) : `<p class="small muted kg-help">${esc(t('Drag across a word, or tap its first and last letter.', 'Arrastra sobre una palabra, o toca su primera y última letra.'))}</p>`}`;
  }
  function paint(screen, s) {
    const z = s.puzzle; if (!z) return;
    const prev = new Set(s.preview);
    screen.querySelectorAll('[data-ws-cell]').forEach(b => { const i = +b.dataset.wsCell; b.classList.toggle('sel', prev.has(i)); b.classList.toggle('anchor', i === s.anchor); });
  }
  function tryLine(ui, cells) {
    const s = ui.state, z = s.puzzle;
    const wi = C().findWord(z, cells);
    if (wi >= 0 && !s.found.includes(wi)) {
      s.found.push(wi); s.msg = t('You found {w}!', '¡Encontraste {w}!', { w: z.placed[wi].word });
      sound('good'); buzz(20);
      if (s.found.length === z.placed.length) {
        s.won = true; s.msg = '';
        prog().finish('wordsearch', list()[s.at].id);
        setTimeout(() => sound('win'), 250); celebrate(); buzz([20, 40, 30]);
      }
      s.anchor = -1; s.preview = [];
      render();
      if (s.won) { const v = document.querySelector('.kg-verse'); if (v && v.scrollIntoView) v.scrollIntoView({ block: 'center', behavior: K._helpers.reduced() ? 'auto' : 'smooth' }); }
      award();
      return true;
    }
    if (wi >= 0) s.msg = t('Already found that one.', 'Esa ya la encontraste.');
    else s.msg = t('Not a hidden word. Try again!', 'No es una palabra escondida. ¡Inténtalo otra vez!');
    sound('bad'); buzz(8);
    s.anchor = -1; s.preview = [];
    const m = document.querySelector('[data-kg-msg]'); if (m) m.textContent = s.msg;
    return false;
  }
  /* a tap (or Enter/Space): the first picks a letter, the second ends the line */
  function tapCell(ui, screen, i) {
    const s = ui.state;
    if (s.anchor < 0 || s.anchor === i) { s.anchor = s.anchor === i ? -1 : i; s.preview = s.anchor < 0 ? [] : [i]; sound('pick'); paint(screen, s); return; }
    const line = C().lineCells(s.anchor, i, SIZE);
    if (!line) { s.anchor = i; s.preview = [i]; sound('pick'); paint(screen, s); return; }
    tryLine(ui, line); paint(document.querySelector('.kg-screen') || screen, s);
  }
  function mount(screen, ui) {
    const s = ui.state;
    const grid = screen.querySelector('[data-ws-grid]');
    if (!grid || s.won) return;
    let drag = null;
    const cellAt = (x, y) => { const el = document.elementFromPoint(x, y); const b = el && el.closest && el.closest('[data-ws-cell]'); return b && grid.contains(b) ? +b.dataset.wsCell : -1; };
    grid.addEventListener('pointerdown', e => {
      const i = cellAt(e.clientX, e.clientY); if (i < 0) return;
      e.preventDefault();
      drag = { from: i, to: i, id: e.pointerId };
      try { grid.setPointerCapture(e.pointerId); } catch { /* ignore */ }
    });
    grid.addEventListener('pointermove', e => {
      if (!drag || e.pointerId !== drag.id) return;
      const i = cellAt(e.clientX, e.clientY); if (i < 0 || i === drag.to) return;
      const line = C().lineCells(drag.from, i, SIZE);
      if (!line) return;
      drag.to = i; s.preview = line; s.anchor = -1; sound('tap'); paint(screen, s);
    });
    const end = e => {
      if (!drag || e.pointerId !== drag.id) return;
      const d = drag; drag = null;
      if (d.from !== d.to) { tryLine(ui, C().lineCells(d.from, d.to, SIZE)); paint(screen, s); return; }
      tapCell(ui, screen, d.from);
    };
    grid.addEventListener('pointerup', end);
    grid.addEventListener('pointercancel', () => { drag = null; s.preview = s.anchor < 0 ? [] : [s.anchor]; paint(screen, s); });
  }
  K._helpers.register({
    id: 'wordsearch', icon: '🔎',
    name: { en: 'Bible Word Search', es: 'Sopa de letras bíblica' },
    blurb: { en: 'Find hidden words and unlock a verse', es: 'Encuentra palabras y descubre un versículo' },
    total: () => list().length,
    start,
    render(ui) { const s = ui.state; if (s.view === 'play' && s.lang !== lang()) begin(s, s.at); return gameHead(this) + (s.view === 'play' ? playHtml(s) : pickHtml(s)); },
    mount,
    click(event, ui) {
      const s = ui.state, el = event.target;
      const cell = el.closest('[data-ws-cell]');
      if (cell && event.detail === 0 && !s.won) { const i = +cell.dataset.wsCell; tapCell(ui, el.closest('.kg-screen'), i); const again = document.querySelector(`[data-ws-cell="${i}"]`); if (again) again.focus(); return; }
      const pick = el.closest('[data-ws-pick]');
      if (pick) { begin(s, +pick.dataset.wsPick); s.msg = ''; sound('pick'); render(); window.scrollTo({ top: 0, behavior: 'auto' }); return; }
      if (el.closest('[data-ws-next]')) { if (s.at + 1 < list().length) begin(s, s.at + 1); else s.view = 'pick'; s.msg = ''; sound('pick'); render(); window.scrollTo({ top: 0, behavior: 'auto' }); return; }
      if (el.closest('[data-ws-list]')) { s.view = 'pick'; s.msg = ''; sound('tap'); render(); window.scrollTo({ top: 0, behavior: 'auto' }); }
    }
  });
})();
