/* Bible match-3 for little ones ("Manna Match"): swap two neighbours to make
   lines of 3 or more of the same picture. Each level belongs to a Bible story
   chapter; winning shows a short lesson with a verse from the app's own KJV or
   RV1909 text. Progress stays on this device (localStorage) and the game works
   offline. */
(() => {
  'use strict';
  const D = () => window.MsbMatchData;
  const C = () => window.MsbMatchCore;
  const A = () => window.MsbMatchArt;
  const lang = () => (window.MsbI18n && MsbI18n.lang() === 'es' ? 'es' : 'en');
  const L = (en, vars) => {
    let text = window.MsbI18n ? MsbI18n.t(en) : en;
    if (vars) for (const [k, v] of Object.entries(vars)) text = text.split(`{${k}}`).join(String(v));
    return text;
  };
  const esc = v => String(v ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const reduced = () => !!(window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches);
  const store = () => { try { return window.localStorage; } catch { return null; } };
  const mem = new Map();
  const fallbackStore = { getItem: k => (mem.has(k) ? mem.get(k) : null), setItem: (k, v) => mem.set(k, String(v)) };
  const prog = () => C().progress(store() || fallbackStore, D().LEVELS.length);
  const sounds = () => C().soundPref(store() || fallbackStore);
  const levelOf = n => D().LEVELS[n - 1];
  const chapterOf = lv => D().CHAPTERS.find(c => c.id === lv.chapter);
  const wait = ms => new Promise(r => setTimeout(r, ms));
  const T = () => (reduced() ? { swap: 60, pop: 60, fall: 80, gap: 20 } : { swap: 170, pop: 210, fall: 260, gap: 60 });
  const PIECE_NAME = { star: 'stars', fish: 'fish', grapes: 'grapes', loaf: 'loaves', leaf: 'olive leaves', heart: 'hearts' };
  const PIECE_ONE = { star: 'Star', fish: 'Fish', grapes: 'Grapes', loaf: 'Bread', leaf: 'Olive leaf', heart: 'Heart' };
  const SPECIAL_NAME = { 1: 'trumpet (clears a row)', 2: 'trumpet (clears a column)', 3: 'light (clears around it)' };

  const ui = { showMoves: null, root: null, view: 'map', n: 1, g: null, busy: false, sel: -1, els: new Map(), stone: null, hintTimer: 0, hinted: null, drag: null, msg: '', result: null, collected: {}, score: 0 };

  /* ---------- Sound (made on the device with Web Audio) ---------- */
  let ac = null, master = null, noiseBuf = null;
  function audio() {
    if (!sounds().get()) return null;
    if (window.MsbStories && MsbStories.bedtimeOn && MsbStories.bedtimeOn()) return null;
    if (!ac) {
      const Ctor = window.AudioContext || window.webkitAudioContext;
      if (!Ctor) return null;
      try { ac = new Ctor(); master = ac.createGain(); master.gain.value = 0.55; master.connect(ac.destination); } catch { ac = null; return null; }
    }
    if (ac.state === 'suspended') ac.resume().catch(() => {});
    return ac;
  }
  function voice(o) {
    const a = audio(); if (!a) return;
    try {
      const t = a.currentTime + (o.delay || 0), dur = o.dur || 0.2;
      const osc = a.createOscillator(), gain = a.createGain();
      osc.type = o.type || 'sine';
      osc.frequency.setValueAtTime(o.f0, t);
      if (o.f1) osc.frequency.exponentialRampToValueAtTime(o.f1, t + dur * 0.9);
      gain.gain.setValueAtTime(0.0001, t);
      gain.gain.exponentialRampToValueAtTime(o.peak || 0.05, t + (o.attack || 0.01));
      gain.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      osc.connect(gain); gain.connect(master);
      osc.start(t); osc.stop(t + dur + 0.05);
    } catch { /* ignore */ }
  }
  function noise(o) {
    const a = audio(); if (!a) return;
    try {
      if (!noiseBuf) { noiseBuf = a.createBuffer(1, a.sampleRate, a.sampleRate); const d = noiseBuf.getChannelData(0); for (let i = 0; i < d.length; i += 1) d[i] = Math.random() * 2 - 1; }
      const t = a.currentTime + (o.delay || 0), dur = o.dur || 0.3;
      const src = a.createBufferSource(), f = a.createBiquadFilter(), gain = a.createGain();
      src.buffer = noiseBuf; f.type = 'bandpass'; f.Q.value = o.q || 1.2;
      f.frequency.setValueAtTime(o.f0 || 400, t); f.frequency.exponentialRampToValueAtTime(o.f1 || 3000, t + dur);
      gain.gain.setValueAtTime(0.0001, t); gain.gain.exponentialRampToValueAtTime(o.peak || 0.08, t + dur * 0.35); gain.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      src.connect(f); f.connect(gain); gain.connect(master); src.start(t); src.stop(t + dur + 0.05);
    } catch { /* ignore */ }
  }
  const notes = (list, o) => list.forEach((f, i) => voice({ ...o, f0: f, delay: (o.delay || 0) + i * (o.step || 0.08) }));
  const SCALE = [523, 587, 659, 784, 880, 1047, 1175, 1319, 1568];
  const SOUNDS = {
    select: () => voice({ type: 'sine', f0: 880, f1: 990, dur: 0.07, peak: 0.03 }),
    swap: () => noise({ f0: 900, f1: 2200, dur: 0.12, peak: 0.025, q: 0.8 }),
    nope: () => { voice({ type: 'triangle', f0: 330, f1: 260, dur: 0.12, peak: 0.05 }); voice({ type: 'triangle', f0: 300, f1: 240, dur: 0.12, peak: 0.04, delay: 0.12 }); },
    /* a bubbly pop that climbs a step higher with every cascade */
    pop: combo => {
      const f = SCALE[Math.min(SCALE.length - 1, combo - 1)];
      voice({ type: 'sine', f0: f * 0.6, f1: f * 1.4, dur: 0.1, peak: 0.07, attack: 0.004 });
      if (combo > 1) notes([f, f * 1.25, f * 1.5], { type: 'triangle', dur: 0.18, peak: 0.035, step: 0.05, delay: 0.04 });
    },
    whoosh: () => { noise({ f0: 300, f1: 5000, dur: 0.38, peak: 0.1, q: 0.9 }); voice({ type: 'sine', f0: 600, f1: 1800, dur: 0.3, peak: 0.03 }); },
    star: () => notes([1047, 1319, 1568, 2093], { type: 'sine', dur: 0.22, peak: 0.04, step: 0.06 }),
    fanfare: () => { notes([523, 659, 784], { type: 'triangle', dur: 0.25, peak: 0.06, step: 0.12 }); voice({ type: 'triangle', f0: 1047, dur: 0.7, peak: 0.06, delay: 0.36 }); notes([1568, 2093, 2637], { dur: 0.3, peak: 0.03, step: 0.07, delay: 0.5 }); },
    soft: () => notes([523, 494, 440], { type: 'sine', dur: 0.3, peak: 0.04, step: 0.16 }),
    shuffle: () => noise({ f0: 500, f1: 1500, dur: 0.5, peak: 0.05, q: 0.6 })
  };
  function sound(name, arg) { if (SOUNDS[name]) SOUNDS[name](arg); }

  /* ---------- Vibration (Android; iPhones have no Vibration API) ---------- */
  function vibrate(pattern) {
    try { if (localStorage.getItem('msb_tap_vibration') === 'off') return; } catch { /* on */ }
    if (typeof navigator === 'undefined' || typeof navigator.vibrate !== 'function') return;
    try { navigator.vibrate(pattern); } catch { /* ignore */ }
  }

  /* ---------- Shared bits ---------- */
  const starRow = (n, cls = '') => `<span class="m3-stars ${cls}" aria-label="${esc(L('{n} of 3 stars', { n }))}">${[1, 2, 3].map(k => `<i class="${k <= n ? 'on' : ''}" aria-hidden="true">★</i>`).join('')}</span>`;
  const pieceImg = (name, sp, cls = '') => `<img class="${cls}" src="${A().uri(name, sp)}" alt="" draggable="false">`;
  function goalText(goal) {
    if (goal.kind === 'score') return L('Reach {n} points', { n: goal.n });
    if (goal.kind === 'collect') return L('Collect {n} {piece}', { n: goal.n, piece: L(PIECE_NAME[goal.piece]) });
    return L('Break all the stones');
  }
  const goalsText = lv => lv.goals.map(goalText).join(' · ');
  function soundButton() {
    const on = sounds().get();
    return `<button type="button" class="m3-chip m3-sound" role="switch" aria-checked="${on}" data-m3-sound>${on ? '🔊' : '🔈'} ${esc(L('Sounds'))}: ${esc(on ? L('On') : L('Off'))}</button>`;
  }
  function header(back) {
    return `${back}<span class="eyebrow">${esc(L('BIBLE MATCH'))}</span><h1>${esc(L('Manna Match'))}</h1>`;
  }

  /* ---------- Screens ---------- */
  function render() {
    const root = ui.root;
    if (!root || !root.isConnected) return;
    clearHint();
    let body;
    if (ui.view === 'board') body = boardHtml();
    else if (ui.view === 'intro') body = introHtml();
    else body = mapHtml();
    root.innerHTML = `<div class="match-screen m3-view-${ui.view}" data-i18n-skip>${body}<div class="m3-overlay" data-m3-overlay hidden></div></div>`;
    if (ui.view === 'board') { mountBoard(); armHint(); }
    if (ui.view === 'map') { const cur = root.querySelector('.m3-node.current'); if (cur && cur.scrollIntoView) cur.scrollIntoView({ block: 'center' }); }
  }

  /* Map: the levels along a winding path, chapter by chapter. Nodes sit at
     fixed rows; a dashed trail (SVG) joins them. */
  function mapHtml() {
    const p = prog().get(), total = D().LEVELS.length;
    const starsNow = Object.values(p.stars).reduce((a, b) => a + b, 0);
    const STEP = 92, HEAD = 52;
    let y = 8, k = 0, html = '';
    const pts = [];
    for (const ch of D().CHAPTERS) {
      const lvls = D().LEVELS.filter(lv => lv.chapter === ch.id);
      const open = lvls[0].n <= p.open;
      html += `<li class="m3-chapter${open ? '' : ' locked'}" style="top:${y}px"><span class="m3-ch-icon" aria-hidden="true">${ch.icon}</span><span>${esc(ch.name[lang()])}</span></li>`;
      y += HEAD;
      for (const lv of lvls) {
        const pos = [0, 1, 2, 3, 2, 1][k % 6]; k += 1;
        const x = 18 + pos * 21.3;
        const s = p.stars[lv.n] || 0, isOpen = lv.n <= p.open, current = lv.n === p.open;
        const label = isOpen
          ? L('Level {n}: {title}', { n: lv.n, title: lv.title[lang()] }) + (s ? ', ' + L('{n} of 3 stars', { n: s }) : '')
          : L('Level {n} is locked', { n: lv.n });
        pts.push([x, y + 30]);
        html += `<li class="m3-step" style="top:${y}px;left:${x}%"><button type="button" class="m3-node${isOpen ? '' : ' locked'}${current ? ' current' : ''}${s ? ' done' : ''}" ${isOpen ? `data-m3-level="${lv.n}"` : 'data-m3-locked'} aria-label="${esc(label)}"><span class="m3-num">${isOpen ? lv.n : '🔒'}</span></button>${isOpen ? starRow(s, 'small') : ''}<span class="m3-node-title" aria-hidden="true">${esc(lv.title[lang()])}</span></li>`;
        y += STEP;
      }
    }
    const H = y + 8;
    const done = pts.slice(0, Math.max(1, p.open));
    const path = list => list.map(([px, py], i) => `${i ? 'L' : 'M'}${px} ${py}`).join(' ');
    return `${header(`<button class="text-button back" type="button" data-match-exit>${esc(L('← Stories'))}</button>`)}
      <div class="m3-topbar"><span class="m3-chip" aria-label="${esc(L('Stars: {n} of {total}', { n: starsNow, total: total * 3 }))}">⭐ ${starsNow}/${total * 3}</span>${soundButton()}</div>
      <p class="m3-hint-text">${esc(L('Swap two pictures side by side to make a line of 3 or more. Every level has a Bible lesson!'))}</p>
      ${ui.msg ? `<p class="m3-msg" role="status">${esc(ui.msg)}</p>` : ''}
      <div class="m3-map-wrap" style="height:${H}px"><svg class="m3-trail" viewBox="0 0 100 ${H}" preserveAspectRatio="none" aria-hidden="true"><path class="all" d="${path(pts)}"/><path class="done" d="${path(done)}"/></svg>
      <ol class="m3-map" aria-label="${esc(L('Levels'))}">${html}</ol></div>`;
  }

  /* Before a level: its chapter's story in a few sentences. */
  function introHtml() {
    const lv = levelOf(ui.n), ch = chapterOf(lv), l = lang();
    const first = D().LEVELS.find(x => x.chapter === lv.chapter).n === lv.n;
    const canSpeak = !!(window.MsbSpeech && MsbSpeech.supported && MsbSpeech.supported());
    return `${header(`<button class="text-button back" type="button" data-m3-map>${esc(L('← Map'))}</button>`)}
      <article class="card m3-intro" aria-labelledby="m3-intro-title"><span class="m3-intro-icon" aria-hidden="true">${ch.icon}</span><span class="eyebrow">${esc(first ? L('NEW STORY') : L('THE STORY CONTINUES'))}</span><h2 id="m3-intro-title">${esc(ch.name[l])}</h2><p>${esc(ch.intro[l])}</p>
      <div class="m3-intro-level"><strong>${esc(L('Level {n}: {title}', { n: lv.n, title: lv.title[l] }))}</strong><span>🎯 ${esc(goalsText(lv))}</span><span>👣 ${esc(L('{n} moves', { n: lv.moves }))}</span></div>
      <div class="m3-actions"><button type="button" class="primary" data-m3-start>${esc(L('Play'))}</button>${canSpeak ? `<button type="button" class="secondary" data-m3-speak-intro>🔊 ${esc(L('Read aloud'))}</button>` : ''}</div></article>`;
  }

  function goalChips() {
    const lv = levelOf(ui.n), g = ui.g;
    return lv.goals.map(goal => {
      if (goal.kind === 'collect') {
        const have = Math.min(goal.n, ui.collected[goal.piece] || 0);
        return `<span class="m3-goal${have >= goal.n ? ' done' : ''}" aria-label="${esc(L('{piece}: {have} of {n}', { piece: L(PIECE_NAME[goal.piece]), have, n: goal.n }))}">${pieceImg(goal.piece, 0)}<b>${have >= goal.n ? '✓' : `${have}/${goal.n}`}</b></span>`;
      }
      if (goal.kind === 'stones') {
        const left = ui.stone.reduce((a, b) => a + b, 0);
        return `<span class="m3-goal${left ? '' : ' done'}" aria-label="${esc(L('Stones left: {n}', { n: left }))}"><i class="m3-stone-icon" aria-hidden="true"></i><b>${left ? left : '✓'}</b></span>`;
      }
      return `<span class="m3-goal${ui.score >= goal.n ? ' done' : ''}" aria-label="${esc(L('Points: {have} of {n}', { have: Math.min(ui.score, goal.n), n: goal.n }))}">🎯<b>${ui.score >= goal.n ? '✓' : goal.n}</b></span>`;
    }).join('');
  }
  function statusHtml() {
    const lv = levelOf(ui.n);
    const top = Math.max(lv.stars[1], 1), pct = Math.min(100, (ui.score / top) * 100);
    return `<div class="m3-hud" data-m3-hud><div class="m3-moves" aria-label="${esc(L('Moves left: {n}', { n: ui.showMoves ?? ui.g.movesLeft }))}"><span>${esc(L('Moves'))}</span><b>${ui.showMoves ?? ui.g.movesLeft}</b></div><div class="m3-goals">${goalChips()}</div><div class="m3-score" aria-label="${esc(L('Score: {n}', { n: ui.score }))}"><span>${esc(L('Score'))}</span><b>${ui.score}</b></div></div>
      <div class="m3-meter" aria-hidden="true"><i style="width:${pct.toFixed(1)}%"></i><em style="left:${((lv.stars[0] / top) * 100).toFixed(1)}%">★</em><em style="left:99%">★</em></div>`;
  }
  function boardHtml() {
    const lv = levelOf(ui.n);
    return `<div class="m3-board-top"><button class="text-button back" type="button" data-m3-map>${esc(L('← Map'))}</button>${soundButton()}</div>
      <h2 class="m3-level-title">${esc(L('Level {n}: {title}', { n: lv.n, title: lv.title[lang()] }))}</h2>
      <div data-m3-status>${statusHtml()}</div>
      <div class="m3-board-wrap"><div class="m3-board" data-m3-board role="grid" aria-label="${esc(L('Game board, 8 by 8. Choose a picture, then a neighbour to swap them.'))}"><div class="m3-cells" aria-hidden="true">${Array.from({ length: C().N }, (_, i) => `<i class="m3-cell${(i + Math.floor(i / 8)) % 2 ? ' alt' : ''}" data-cell="${i}"></i>`).join('')}</div><div class="m3-fx" data-m3-fx aria-hidden="true"></div></div></div>
      <p class="m3-msg" role="status" aria-live="polite" data-m3-say>${esc(ui.msg)}</p>`;
  }
  function updateStatus() { const s = ui.root && ui.root.querySelector('[data-m3-status]'); if (s) s.innerHTML = statusHtml(); }

  /* ---------- The board ---------- */
  const board = () => ui.root && ui.root.querySelector('[data-m3-board]');
  const nameAt = (t) => (t === C().BOMB ? 'bomb' : ui.g.pieces[t]);
  function labelFor(t, sp, i) {
    const [x, y] = C().xy(i);
    const what = t === C().BOMB ? L('Star of Bethlehem (clears every piece of one kind)') : L(PIECE_ONE[ui.g.pieces[t]]) + (sp && SPECIAL_NAME[sp] ? ', ' + L(SPECIAL_NAME[sp]) : '');
    return `${what}, ${L('row {r}, column {c}', { r: y + 1, c: x + 1 })}`;
  }
  function place(el, i, rowOverride) {
    const [x, y] = C().xy(i);
    el.style.transform = `translate(${x * 100}%, ${(rowOverride ?? y) * 100}%)`;
  }
  function makePiece(id, i, t, sp, fromRow) {
    const el = document.createElement('button');
    el.type = 'button';
    el.className = 'm3-piece' + (sp ? ` sp${sp}` : '') + (t === C().BOMB ? ' bomb' : '');
    el.dataset.id = id;
    el.dataset.i = i;
    el.tabIndex = -1;
    el.setAttribute('aria-label', labelFor(t, sp, i));
    el.innerHTML = pieceImg(nameAt(t), t === C().BOMB ? 0 : sp);
    place(el, i, fromRow);
    board().appendChild(el);
    ui.els.set(id, el);
    return el;
  }
  function renderStones() {
    const b = board(); if (!b) return;
    b.querySelectorAll('.m3-cell').forEach((c, i) => c.classList.toggle('stone', !!ui.stone[i]));
  }
  function mountBoard() {
    const b = board(), g = ui.g;
    ui.els.clear();
    b.querySelectorAll('.m3-piece').forEach(el => el.remove());
    for (let i = 0; i < C().N; i += 1) if (g.t[i] !== C().EMPTY) makePiece(g.id[i], i, g.t[i], g.sp[i]);
    renderStones();
    roving(ui.sel >= 0 ? ui.sel : 0);
    if (b.dataset.wired) return;
    b.dataset.wired = '1';
    b.addEventListener('pointerdown', onDown);
    b.addEventListener('pointermove', onMove);
    b.addEventListener('pointerup', onUp);
    b.addEventListener('pointercancel', () => { ui.drag = null; });
    b.addEventListener('keydown', onKey);
    b.addEventListener('click', onKeyClick);
  }
  const elAt = i => ui.els.get(ui.g.id[i]);
  function roving(i) {
    ui.els.forEach(el => { el.tabIndex = -1; });
    const el = elAt(i); if (el) el.tabIndex = 0;
    return el;
  }
  function select(i) {
    ui.els.forEach(el => { el.classList.remove('sel'); el.removeAttribute('aria-pressed'); });
    ui.sel = i;
    if (i >= 0) { const el = elAt(i); if (el) { el.classList.add('sel'); el.setAttribute('aria-pressed', 'true'); } sound('select'); }
  }
  function cellFromEvent(e) {
    const r = board().getBoundingClientRect(), s = r.width / 8;
    const x = Math.floor((e.clientX - r.left) / s), y = Math.floor((e.clientY - r.top) / s);
    if (x < 0 || x > 7 || y < 0 || y > 7) return -1;
    return C().idx(x, y);
  }

  /* Swipe a piece toward a neighbour, or tap one and then the other. */
  function onDown(e) {
    if (ui.busy || ui.view !== 'board') return;
    const i = cellFromEvent(e); if (i < 0) return;
    poke();
    ui.drag = { i, x: e.clientX, y: e.clientY, id: e.pointerId, moved: false };
    try { board().setPointerCapture(e.pointerId); } catch { /* ignore */ }
    e.preventDefault();
  }
  function onMove(e) {
    const d = ui.drag; if (!d || d.id !== e.pointerId || d.moved || ui.busy) return;
    const s = board().getBoundingClientRect().width / 8;
    const dx = e.clientX - d.x, dy = e.clientY - d.y;
    if (Math.max(Math.abs(dx), Math.abs(dy)) < s * 0.33) return;
    d.moved = true;
    const [x, y] = C().xy(d.i);
    const nx = x + (Math.abs(dx) > Math.abs(dy) ? Math.sign(dx) : 0), ny = y + (Math.abs(dx) > Math.abs(dy) ? 0 : Math.sign(dy));
    if (nx < 0 || nx > 7 || ny < 0 || ny > 7) return;
    select(-1);
    trySwap(d.i, C().idx(nx, ny));
  }
  function onUp(e) {
    const d = ui.drag; ui.drag = null;
    if (!d || d.moved || ui.busy) return;
    tapCell(d.i);
    e.preventDefault();
  }
  function tapCell(i) {
    if (ui.sel === i) { select(-1); return; }
    if (ui.sel >= 0 && C().adjacent(ui.sel, i)) { const a = ui.sel; select(-1); trySwap(a, i); return; }
    select(i);
  }
  /* Keyboard: arrows move, Enter or Space picks (then pick a neighbour). */
  function onKey(e) {
    const el = e.target.closest('.m3-piece'); if (!el || ui.busy) return;
    const i = Number(el.dataset.i), [x, y] = C().xy(i);
    const move = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] }[e.key];
    if (move) {
      e.preventDefault(); poke();
      const nx = Math.max(0, Math.min(7, x + move[0])), ny = Math.max(0, Math.min(7, y + move[1]));
      const next = roving(C().idx(nx, ny)); if (next) next.focus();
    }
  }
  function onKeyClick(e) {
    if (e.detail !== 0) return; /* pointer taps are handled above */
    const el = e.target.closest('.m3-piece'); if (!el || ui.busy) return;
    poke(); tapCell(Number(el.dataset.i));
  }

  /* ---------- Playing a move, with animation ---------- */
  function say(text) { ui.msg = text; const s = ui.root && ui.root.querySelector('[data-m3-say]'); if (s) s.textContent = text; }
  function setPos(id, i) { const el = ui.els.get(id); if (el) { el.dataset.i = i; place(el, i); } }
  async function trySwap(a, b) {
    if (ui.busy || ui.view !== 'board') return false;
    ui.busy = true; clearHint(); say('');
    const ea = elAt(a), eb = elAt(b);
    sound('swap');
    if (ea) place(ea, b); if (eb) place(eb, a);
    await wait(T().swap);
    const result = C().play(ui.g, a, b);
    if (!result) {
      /* not a match: bounce back */
      sound('nope'); vibrate(8);
      if (ea) { place(ea, a); ea.classList.add('nope'); }
      if (eb) { place(eb, b); eb.classList.add('nope'); }
      await wait(T().swap + 120);
      ea && ea.classList.remove('nope'); eb && eb.classList.remove('nope');
      ui.busy = false; armHint();
      return false;
    }
    if (ea) ea.dataset.i = b; if (eb) eb.dataset.i = a;
    for (const step of result.steps) await animateStep(step);
    if (result.shuffled) {
      say(L('No moves left, so the pictures get mixed up!'));
      sound('shuffle');
      await wait(reduced() ? 50 : 350);
      mountBoard();
    }
    updateStatus();
    ui.busy = false;
    const st = C().status(ui.g, levelOf(ui.n));
    if (st !== 'playing') { await wait(reduced() ? 50 : 350); if (st === 'won') await sugarCrush(); finish(st); return true; }
    roving(Math.max(0, Math.min(63, b)));
    armHint();
    return true;
  }
  async function animateStep(step) {
    const fx = ui.root.querySelector('[data-m3-fx]');
    if (step.fired.length) { sound('whoosh'); step.fired.forEach(f => beam(fx, f)); }
    sound('pop', step.combo);
    vibrate(C().buzzMs(step.combo, step.fired.length));
    if (step.combo > 1) bubble(fx, L('Combo x{n}!', { n: step.combo }));
    for (const c of step.cleared) {
      const el = ui.els.get(c.id);
      if (c.t >= 0 && c.t < C().BOMB) { const name = ui.g.pieces[c.t]; ui.collected[name] = (ui.collected[name] || 0) + 1; }
      if (ui.stone[c.i]) { ui.stone[c.i] = 0; crack(fx, c.i); }
      if (el) { el.classList.add('pop'); ui.els.delete(c.id); setTimeout(() => el.remove(), T().pop + 40); }
      sparkle(fx, c.i, c.t);
    }
    renderStones();
    ui.score = step.score;
    updateStatus();
    await wait(T().pop);
    for (const s of step.spawned) {
      const el = makePiece(s.id, s.i, s.t, s.sp);
      el.classList.add('born');
      if (s.sp) sound('star');
    }
    if (step.spawned.length) say(step.spawned.map(s => s.t === C().BOMB ? L('You made a Star of Bethlehem!') : s.sp === 3 ? L('You made a burst of light!') : L('You made a trumpet of Jericho!')).join(' '));
    for (const m of step.moves) setPos(m.id, m.to);
    for (const n of step.added) makePiece(n.id, n.to, n.t, 0, n.fromRow);
    /* let the new pieces appear above the board, then drop them in */
    if (step.added.length) { board().getBoundingClientRect(); await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r))); for (const n of step.added) setPos(n.id, n.to); }
    await wait(T().fall + T().gap);
    /* labels follow the pieces */
    ui.els.forEach(el => { const i = Number(el.dataset.i); el.setAttribute('aria-label', labelFor(ui.g.t[i] === C().EMPTY ? 0 : ui.g.t[i], ui.g.sp[i], i)); });
  }

  /* ---------- Little effects ---------- */
  function cellCenter(i) { const [x, y] = C().xy(i); return [(x + 0.5) * 12.5, (y + 0.5) * 12.5]; }
  function sparkle(fx, i, t) {
    if (!fx || reduced()) return;
    const [cx, cy] = cellCenter(i);
    for (let k = 0; k < 5; k += 1) {
      const s = document.createElement('i');
      const ang = (k / 5) * Math.PI * 2 + i;
      s.className = `m3-spark c${t === C().BOMB ? 9 : t}`;
      s.style.cssText = `left:${cx}%;top:${cy}%;--dx:${(Math.cos(ang) * 26).toFixed(1)}px;--dy:${(Math.sin(ang) * 26).toFixed(1)}px`;
      fx.appendChild(s);
      setTimeout(() => s.remove(), 650);
    }
  }
  function crack(fx, i) {
    if (!fx) return;
    const [cx, cy] = cellCenter(i), s = document.createElement('i');
    s.className = 'm3-crack'; s.style.cssText = `left:${cx}%;top:${cy}%`;
    fx.appendChild(s); setTimeout(() => s.remove(), 600);
  }
  function beam(fx, f) {
    if (!fx) return;
    const [x, y] = C().xy(f.i), s = document.createElement('i');
    if (f.sp === 1) { s.className = 'm3-beam row'; s.style.top = `${y * 12.5}%`; }
    else if (f.sp === 2) { s.className = 'm3-beam col'; s.style.left = `${x * 12.5}%`; }
    else if (f.sp === 3) { s.className = 'm3-beam burst'; s.style.cssText = `left:${(x - 1) * 12.5}%;top:${(y - 1) * 12.5}%`; }
    else { s.className = 'm3-beam nova'; }
    fx.appendChild(s); setTimeout(() => s.remove(), 700);
  }
  function bubble(fx, text) {
    if (!fx) return;
    const s = document.createElement('b');
    s.className = 'm3-combo'; s.textContent = text;
    fx.appendChild(s); setTimeout(() => s.remove(), 900);
  }

  /* After about 5 seconds without a move, two pieces glow to show a move. */
  function clearHint() {
    clearTimeout(ui.hintTimer); ui.hintTimer = 0;
    if (ui.hinted) { ui.hinted.forEach(el => el && el.classList.remove('hint')); ui.hinted = null; }
  }
  function armHint() {
    clearHint();
    ui.hintTimer = setTimeout(() => {
      if (ui.busy || ui.view !== 'board' || !ui.g) return;
      const h = C().hint(ui.g, levelOf(ui.n));
      if (!h) return;
      ui.hinted = h.map(elAt);
      ui.hinted.forEach(el => el && el.classList.add('hint'));
    }, 5000);
  }
  function poke() { if (ui.view === 'board' && !ui.busy) armHint(); }

  /* Sugar crush: after a win, each unused move turns into bonus points, one
     by one, with a sparkle and a rising chime. */
  async function sugarCrush() {
    const left = Math.max(0, ui.g.movesLeft);
    if (!left) return;
    const fx = ui.root && ui.root.querySelector('[data-m3-fx]');
    bubble(fx, L('Moves bonus!'));
    if (reduced()) { ui.score += C().moveBonus(ui.g); updateStatus(); return; }
    for (let k = 1; k <= left; k += 1) {
      ui.showMoves = left - k;
      ui.score += C().MOVE_BONUS;
      const cell = (k * 23 + 11) % C().N;
      sparkle(fx, cell, ui.g.t[cell]);
      const el = elAt(cell); if (el) { el.classList.remove('born'); void el.offsetWidth; el.classList.add('born'); }
      sound('pop', Math.min(9, 1 + Math.floor(k / 2)));
      updateStatus();
      await wait(left > 15 ? 70 : 110);
    }
    ui.showMoves = null;
    await wait(300);
  }

  /* ---------- Win and try again ---------- */
  function finish(st) {
    clearHint();
    const box = ui.root && ui.root.querySelector('[data-m3-overlay]'); if (!box) return;
    const lv = levelOf(ui.n), l = lang();
    if (st === 'won') {
      const bonus = C().moveBonus(ui.g), total = C().finalScore(ui.g), stars = C().stars(lv, total, ui.g.movesLeft);
      prog().win(lv.n, stars, total);
      ui.result = { won: true, stars, total, bonus };
      sound('fanfare'); vibrate([20, 40, 30]);
      const last = lv.n === D().LEVELS.length;
      const canSpeak = !!(window.MsbSpeech && MsbSpeech.supported && MsbSpeech.supported());
      const confetti = reduced() ? '' : `<div class="m3-confetti" aria-hidden="true">${Array.from({ length: 26 }, (_, i) => `<i style="--x:${(i * 37) % 100}%;--d:${(i % 7) * 0.12}s;--r:${(i * 53) % 360}deg;--c:${i % 5}"></i>`).join('')}</div>`;
      box.innerHTML = `${confetti}<article class="card m3-lesson" role="dialog" aria-modal="true" aria-labelledby="m3-win-title">
        <span class="eyebrow">${esc(L('BIBLE LESSON'))}</span><h2 id="m3-win-title">${esc(last ? L('You finished every level!') : L('You did it!'))}</h2>
        ${starRow(stars, 'big')}
        <p class="m3-total">${esc(L('Score: {n}', { n: total }))}${bonus ? ` <span class="muted">(${esc(L('+{n} for moves left', { n: bonus }))})</span>` : ''}</p>
        <h3>${esc(lv.title[l])}</h3><p>${esc(lv.lesson[l])}</p>
        <blockquote class="m3-verse"><p>“${esc(lv.verse[l])}”</p><cite>${esc(lv.ref[l])} · ${l === 'es' ? 'RV1909' : 'KJV'}</cite></blockquote>
        <div class="m3-actions">${canSpeak ? `<button type="button" class="secondary" data-m3-speak>🔊 ${esc(L('Read aloud'))}</button>` : ''}${last ? '' : `<button type="button" class="primary" data-m3-next>${esc(L('Next level'))}</button>`}<button type="button" class="secondary" data-m3-map>${esc(L('Map'))}</button></div></article>`;
    } else {
      ui.result = { won: false };
      sound('soft');
      box.innerHTML = `<article class="card m3-lesson m3-lost" role="dialog" aria-modal="true" aria-labelledby="m3-lost-title"><span class="m3-intro-icon" aria-hidden="true">🌱</span><h2 id="m3-lost-title">${esc(L('So close!'))}</h2><p>${esc(L('You ran out of moves this time. Every try helps you get better. Want to try again?'))}</p>
        <div class="m3-actions"><button type="button" class="primary" data-m3-retry>${esc(L('Try again'))}</button><button type="button" class="secondary" data-m3-map>${esc(L('Map'))}</button></div></article>`;
    }
    box.hidden = false;
    const btn = box.querySelector('.primary'); if (btn) btn.focus({ preventScroll: true });
  }

  function startLevel(n) {
    const lv = levelOf(n);
    ui.n = n; ui.showMoves = null; ui.g = C().createGame(lv); ui.view = 'board'; ui.sel = -1; ui.busy = false; ui.msg = ''; ui.result = null;
    ui.collected = {}; ui.score = 0; ui.stone = ui.g.stone.slice();
    render();
    window.scrollTo({ top: 0, behavior: 'auto' });
  }
  function toIntro(n) { ui.n = n; ui.view = 'intro'; ui.g = null; render(); window.scrollTo({ top: 0, behavior: 'auto' }); }
  function toMap(msg) { ui.view = 'map'; ui.g = null; ui.msg = msg || ''; if (window.MsbSpeech) MsbSpeech.stop(); render(); }

  document.addEventListener('click', event => {
    if (!ui.root || !ui.root.contains(event.target)) return;
    const t = event.target;
    if (t.closest('[data-m3-sound]')) { const on = sounds().set(!sounds().get()); t.closest('[data-m3-sound]').outerHTML = soundButton(); if (on) sound('select'); return; }
    const lvl = t.closest('[data-m3-level]');
    if (lvl) { toIntro(Number(lvl.dataset.m3Level)); return; }
    if (t.closest('[data-m3-locked]')) { ui.msg = L('Win the level before it to open this one.'); render(); return; }
    if (t.closest('[data-m3-start]')) { if (window.MsbSpeech) MsbSpeech.stop(); startLevel(ui.n); return; }
    if (t.closest('[data-m3-retry]')) { startLevel(ui.n); return; }
    if (t.closest('[data-m3-next]')) { if (window.MsbSpeech) MsbSpeech.stop(); toIntro(Math.min(D().LEVELS.length, ui.n + 1)); return; }
    if (t.closest('[data-m3-map]')) { toMap(); return; }
    if (t.closest('[data-m3-speak-intro]') && window.MsbSpeech) {
      const lv = levelOf(ui.n), ch = chapterOf(lv), l = lang();
      MsbSpeech.speak({ lang: l, chunks: [{ text: ch.name[l] }, { text: ch.intro[l] }] });
      return;
    }
    if (t.closest('[data-m3-speak]') && window.MsbSpeech) {
      const lv = levelOf(ui.n), l = lang();
      MsbSpeech.speak({ lang: l, chunks: [{ text: lv.title[l] }, { text: lv.lesson[l] }, { text: lv.verse[l] }, { text: lv.ref[l] }] });
    }
  });

  window.MsbMatch = {
    open(root) { ui.root = root; render(); },
    close() { clearHint(); ui.root = null; ui.view = 'map'; ui.g = null; ui.busy = false; ui.msg = ''; if (window.MsbSpeech) MsbSpeech.stop(); },
    /* for checks: a snapshot, the hint move and a scripted swap */
    _state() {
      return { view: ui.view, level: ui.n, busy: ui.busy, score: ui.score, moves: ui.g ? ui.g.movesLeft : null, status: ui.g ? C().status(ui.g, levelOf(ui.n)) : null, result: ui.result, pieces: ui.els.size, specials: ui.g ? Array.from(ui.g.sp).filter(Boolean).length : 0, stones: ui.stone ? ui.stone.reduce((a, b) => a + b, 0) : 0 };
    },
    _hint() { return ui.g ? C().hint(ui.g, levelOf(ui.n)) : null; },
    _moves() { return ui.g ? C().allMoves(ui.g) : []; },
    _peek(a, b) { if (!ui.g) return null; const g = C().clone(ui.g); return C().play(g, a, b); },
    _swap: (a, b) => trySwap(a, b)
  };
})();
