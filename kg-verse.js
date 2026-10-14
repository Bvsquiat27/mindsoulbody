/* Verse Builder: words of a memory verse fall down; tap them in order to
   build the verse. With reduced motion the words stay still instead. */
(() => {
  'use strict';
  const K = window.MsbKidGames; if (!K) return;
  const { t, esc, lang, name, sound, buzz, prog, award, render, verseHtml, gameHead, reduced } = K._helpers;
  const D = () => window.MsbKidGamesData, C = () => window.MsbKidGamesCore;
  const list = () => D().VERSES;
  const COLS = 3, MAX_FALL = 4, CALM_SLOTS = 6;
  let loop = 0;
  const stop = () => { if (loop) cancelAnimationFrame(loop); loop = 0; };

  function start() { return { view: 'pick', at: 0 }; }
  function begin(s, i) {
    const v = list()[i].verse, l = lang();
    Object.assign(s, { view: 'play', at: i, lang: l, words: C().verseWords(v.text[l]), have: 0, mistakes: 0, falling: [], uid: 0, lastSpawn: 0, won: false, msg: '', calm: reduced() });
  }
  const starRow = n => `<span class="kg-stars" aria-label="${esc(t('{n} of 3 stars', '{n} de 3 estrellas', { n }))}">${[1, 2, 3].map(k => `<i class="${k <= n ? 'on' : ''}" aria-hidden="true">★</i>`).join('')}</span>`;
  function pickHtml() {
    const v = prog().get();
    return `<p class="kg-lead">${esc(t('Tap the falling words in order to build the verse. Then say it out loud!', 'Toca las palabras que caen, en orden, para armar el versículo. ¡Luego dilo en voz alta!'))}</p><ul class="kg-picks">${list().map((x, i) => { const st = Number(v.best[`verse:${x.id}`]) || 0; return `<li><button type="button" class="card kg-pick${st ? ' done' : ''}" data-vb-pick="${i}"><span class="kg-pick-icon" aria-hidden="true">📜</span><span><strong>${esc(name(x.title))}</strong><small>${esc(x.verse.ref[lang()])}</small>${st ? starRow(st) : ''}</span></button></li>`; }).join('')}</ul>`;
  }
  function builtHtml(s) {
    return s.words.map((w, i) => i < s.have ? `<span class="kg-vb-w got">${esc(w)}</span>` : `<span class="kg-vb-w gap" aria-hidden="true">${'_'.repeat(Math.min(6, Math.max(2, w.length)))}</span>`).join(' ');
  }
  function playHtml(s) {
    const x = list()[s.at];
    const head = `<p class="kg-sub">${esc(name(x.title))} · <span class="kg-verse-ref">${esc(x.verse.ref[lang()])}</span></p><p class="kg-vb-built" aria-label="${esc(t('Built so far: {w}', 'Armado hasta ahora: {w}', { w: s.words.slice(0, s.have).join(' ') || '—' }))}">${builtHtml(s)}</p>`;
    if (s.won) {
      const n = C().stars(s.mistakes);
      return `${head}${verseHtml(x.verse, t('VERSE BUILT!', '¡VERSÍCULO ARMADO!'), `${starRow(n)}<button type="button" class="primary" data-vb-next>${esc(s.at + 1 < list().length ? t('Next verse', 'Siguiente versículo') : t('All verses', 'Todos los versículos'))}</button><button type="button" class="secondary" data-vb-again>${esc(t('Build it again', 'Armarlo otra vez'))}</button>`)}`;
    }
    return `${head}<p class="kg-msg" role="status" aria-live="polite" data-kg-msg>${esc(s.msg || t('Find: word {n} of {total}', 'Busca: palabra {n} de {total}', { n: s.have + 1, total: s.words.length }))}</p><div class="kg-vb-lane${s.calm ? ' calm' : ''}" data-vb-lane></div><p class="small muted kg-help">${esc(s.calm ? t('Tap the words in order.', 'Toca las palabras en orden.') : t('Missed one? It comes back. Wrong taps cost a star.', '¿Se te pasó una? Vuelve a caer. Los toques equivocados quitan una estrella.'))}</p>`;
  }
  function wordButton(s, f) {
    return `<button type="button" class="kg-vb-drop" data-vb-word="${f.uid}" style="left:${f.col * (100 / COLS) + 1.5}%;top:${s.calm ? 0 : f.y}px">${esc(s.words[f.i])}</button>`;
  }
  function paintLane(lane, s) {
    lane.innerHTML = s.falling.map(f => wordButton(s, f)).join('');
  }
  function spawn(s, laneH) {
    const i = C().nextFalling(s.words, s.have, s.falling.map(f => f.i));
    if (i === null) return false;
    const used = new Set(s.falling.filter(f => f.y < 70).map(f => f.col));
    const free = [0, 1, 2].filter(c => !used.has(c));
    const col = free.length ? free[Math.floor(Math.random() * free.length)] : Math.floor(Math.random() * COLS);
    s.falling.push({ uid: ++s.uid, i, col, y: -44, speed: 38 + s.at * 4 + Math.random() * 14 });
    return true;
  }
  function calmFill(s) {
    s.falling = s.falling.filter(f => f.i >= s.have);
    while (s.falling.length < CALM_SLOTS) { if (!spawn(s)) break; }
    s.falling = C().shuffle(s.falling).map((f, k) => ({ ...f, col: k }));
  }
  function mount(screen, ui) {
    stop();
    const s = ui.state, lane = screen.querySelector('[data-vb-lane]');
    if (!lane || s.won) return;
    lane.addEventListener('pointerdown', e => { const b = e.target.closest('[data-vb-word]'); if (!b) return; e.preventDefault(); tapWord(ui, +b.dataset.vbWord, b); });
    if (s.calm) { calmFill(s); lane.innerHTML = s.falling.map(f => `<button type="button" class="kg-vb-drop still" data-vb-word="${f.uid}">${esc(s.words[f.i])}</button>`).join(''); return; }
    let last = performance.now();
    const H = () => lane.clientHeight || 320;
    const frame = now => {
      if (!lane.isConnected || ui.state !== s || s.won) { loop = 0; return; }
      const dt = Math.min(0.05, (now - last) / 1000); last = now;
      if (document.hidden) { loop = requestAnimationFrame(frame); return; }
      let added = false;
      if (s.falling.length < MAX_FALL && now - s.lastSpawn > 900) { if (spawn(s)) { s.lastSpawn = now; added = true; } }
      const h = H();
      let fell = false;
      for (const f of s.falling) f.y += f.speed * dt;
      const keep = [];
      for (const f of s.falling) { if (f.y > h) { if (f.i === s.have) fell = true; } else keep.push(f); }
      const changed = added || keep.length !== s.falling.length;
      s.falling = keep;
      if (changed) paintLane(lane, s);
      else lane.querySelectorAll('[data-vb-word]').forEach(b => { const f = s.falling.find(x => x.uid === +b.dataset.vbWord); if (f) b.style.top = `${f.y}px`; });
      if (fell) { const m = document.querySelector('[data-kg-msg]'); if (m) m.textContent = t('It fell! Here it comes again: "{w}"', '¡Se cayó! Ahí viene otra vez: «{w}»', { w: s.words[s.have] }); }
      loop = requestAnimationFrame(frame);
    };
    loop = requestAnimationFrame(frame);
  }
  function tapWord(ui, uid, btn) {
    const s = ui.state, f = s.falling.find(x => x.uid === uid);
    if (!f || s.won) return;
    if (C().wordFits(s.words, s.have, f.i)) {
      s.falling = s.falling.filter(x => x !== f);
      /* if a copy of the same word was tapped, keep the real one falling */
      s.have += 1; s.msg = '';
      sound('pick'); buzz(10);
      if (s.have >= s.words.length) {
        s.won = true; stop();
        const x = list()[s.at];
        prog().finish('verse', x.id); prog().best(`verse:${x.id}`, C().stars(s.mistakes));
        setTimeout(() => sound('win'), 150); buzz([20, 40, 30]);
        render(); award();
        const v = document.querySelector('.kg-verse'); if (v && v.scrollIntoView) v.scrollIntoView({ block: 'center', behavior: reduced() ? 'auto' : 'smooth' });
        return;
      }
      const screen = document.querySelector('.kg-screen');
      const built = screen && screen.querySelector('.kg-vb-built'); if (built) built.innerHTML = builtHtml(s);
      const m = screen && screen.querySelector('[data-kg-msg]'); if (m) m.textContent = t('Find: word {n} of {total}', 'Busca: palabra {n} de {total}', { n: s.have + 1, total: s.words.length });
      if (s.calm) { const lane = screen.querySelector('[data-vb-lane]'); calmFill(s); lane.innerHTML = s.falling.map(g => `<button type="button" class="kg-vb-drop still" data-vb-word="${g.uid}">${esc(s.words[g.i])}</button>`).join(''); const first = lane.querySelector('button'); if (first && btn && document.activeElement === btn) first.focus(); }
      else if (btn) btn.remove();
      return;
    }
    s.mistakes += 1; sound('bad'); buzz(8);
    if (btn) { btn.classList.remove('nope'); void btn.offsetWidth; btn.classList.add('nope'); }
    const m = document.querySelector('[data-kg-msg]'); if (m) m.textContent = t('Not yet! Look for the next word.', '¡Todavía no! Busca la siguiente palabra.');
  }
  K._helpers.register({
    id: 'verse', icon: '🧩',
    name: { en: 'Verse Builder', es: 'Arma el versículo' },
    blurb: { en: 'Catch the falling words in order', es: 'Atrapa las palabras que caen, en orden' },
    total: () => list().length,
    start,
    leave: stop,
    render(ui) { const s = ui.state; if (s.view === 'play' && !s.won && s.lang !== lang()) begin(s, s.at); return gameHead(this) + (s.view === 'play' ? playHtml(s) : pickHtml()); },
    mount,
    click(event, ui) {
      const s = ui.state, el = event.target;
      const w = el.closest('[data-vb-word]'); if (w) { if (event.detail === 0) tapWord(ui, +w.dataset.vbWord, w); return; }
      const pick = el.closest('[data-vb-pick]'); if (pick) { begin(s, +pick.dataset.vbPick); sound('pick'); render(); window.scrollTo({ top: 0, behavior: 'auto' }); return; }
      if (el.closest('[data-vb-again]')) { begin(s, s.at); sound('pick'); render(); window.scrollTo({ top: 0, behavior: 'auto' }); return; }
      if (el.closest('[data-vb-next]')) { stop(); if (s.at + 1 < list().length) begin(s, s.at + 1); else s.view = 'pick'; sound('pick'); render(); window.scrollTo({ top: 0, behavior: 'auto' }); }
    }
  });
})();
