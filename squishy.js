/* Bible squishies for little ones: squish a soft friend, hear its little
   sound, and learn its Bible story with the verse from the app's own KJV or
   RV1909 text. Some squishies start locked; winning a round of the memory
   game or the Bible questions opens the next one. Everything stays on this
   device (localStorage) and works offline. */
(() => {
  'use strict';
  const D = () => window.MsbSquishyData;
  const C = () => window.MsbSquishyCore;
  const A = () => window.MsbSquishyArt;
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
  const prog = () => C().progress(store() || fallbackStore, D().SQUISHIES);
  const sounds = () => C().soundPref(store() || fallbackStore);
  const byId = id => D().SQUISHIES.find(x => x.id === id);
  const nameOf = x => x.name[lang()];

  const ui = { root: null, view: 'shelf', selected: 'lamb', card: null, memory: null, round: null, guess: null, msg: '' };

  /* ---------- Sound (made on the device with Web Audio) ---------- */
  let ac = null, master = null;
  function audio() {
    if (!sounds().get()) return null;
    if (window.MsbStories && MsbStories.bedtimeOn && MsbStories.bedtimeOn()) return null;
    if (!ac) {
      const Ctor = window.AudioContext || window.webkitAudioContext;
      if (!Ctor) return null;
      try { ac = new Ctor(); master = ac.createGain(); master.gain.value = 0.6; master.connect(ac.destination); } catch { ac = null; return null; }
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
      if (o.vib) { const l = a.createOscillator(), lg = a.createGain(); l.frequency.value = o.vib[0]; lg.gain.value = o.vib[1]; l.connect(lg); lg.connect(osc.frequency); l.start(t); l.stop(t + dur + 0.05); }
      gain.gain.setValueAtTime(0.0001, t);
      gain.gain.exponentialRampToValueAtTime(o.peak || 0.05, t + (o.attack || 0.012));
      gain.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      let node = osc;
      if (o.filter) { const f = a.createBiquadFilter(); f.type = o.filter[0]; f.frequency.value = o.filter[1]; f.Q.value = o.filter[2] || 0.8; node.connect(f); node = f; }
      if (o.trem) { const tg = a.createGain(), l = a.createOscillator(), lg = a.createGain(); tg.gain.value = 0.6; l.frequency.value = o.trem; lg.gain.value = 0.4; l.connect(lg); lg.connect(tg.gain); l.start(t); l.stop(t + dur + 0.05); node.connect(tg); node = tg; }
      node.connect(gain); gain.connect(master);
      osc.start(t); osc.stop(t + dur + 0.05);
    } catch { /* ignore */ }
  }
  let noiseBuf = null;
  function noise(o) {
    const a = audio(); if (!a) return;
    try {
      if (!noiseBuf) { noiseBuf = a.createBuffer(1, a.sampleRate, a.sampleRate); const d = noiseBuf.getChannelData(0); for (let i = 0; i < d.length; i += 1) d[i] = Math.random() * 2 - 1; }
      const t = a.currentTime + (o.delay || 0), dur = o.dur || 0.2;
      const src = a.createBufferSource(), f = a.createBiquadFilter(), gain = a.createGain();
      src.buffer = noiseBuf; f.type = o.filter || 'bandpass'; f.Q.value = o.q || 0.9;
      f.frequency.setValueAtTime(o.f0 || 1000, t); if (o.f1) f.frequency.exponentialRampToValueAtTime(o.f1, t + dur);
      gain.gain.setValueAtTime(0.0001, t); gain.gain.exponentialRampToValueAtTime(o.peak || 0.04, t + 0.03); gain.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      src.connect(f); f.connect(gain); gain.connect(master); src.start(t); src.stop(t + dur + 0.05);
    } catch { /* ignore */ }
  }
  const notes = (list, o) => list.forEach((f, i) => voice({ ...o, f0: f, delay: (o.step || 0.08) * i }));
  const SOUNDS = {
    baa: () => voice({ type: 'sawtooth', f0: 340, f1: 300, dur: 0.5, peak: 0.05, vib: [7, 14], filter: ['bandpass', 1100, 1.2], attack: 0.05 }),
    coo: () => { voice({ f0: 460, f1: 400, dur: 0.18, peak: 0.06, attack: 0.04 }); voice({ f0: 400, f1: 340, dur: 0.32, peak: 0.06, attack: 0.05, delay: 0.2 }); },
    bubbles: () => { noise({ f0: 300, f1: 1400, dur: 0.38, peak: 0.035 }); [0.05, 0.13, 0.2, 0.29].forEach(d => voice({ f0: 320, f1: 950, dur: 0.07, peak: 0.045, delay: d })); },
    purr: () => voice({ type: 'sawtooth', f0: 130, f1: 105, dur: 0.6, peak: 0.06, filter: ['lowpass', 520], trem: 24, attack: 0.06 }),
    twinkle: () => notes([1568, 2093, 2637, 3136], { dur: 0.3, peak: 0.035 }),
    chime: () => notes([523, 659, 784, 1047], { type: 'triangle', dur: 0.45, peak: 0.04, step: 0.07 }),
    boing: () => voice({ f0: 280, f1: 130, dur: 0.38, peak: 0.07, vib: [14, 28] }),
    squish: () => { noise({ filter: 'lowpass', f0: 1000, f1: 300, dur: 0.25, peak: 0.05 }); voice({ f0: 520, f1: 820, dur: 0.12, peak: 0.04, delay: 0.05 }); },
    pip: () => { voice({ f0: 1200, f1: 1800, dur: 0.08, peak: 0.05 }); voice({ f0: 1400, f1: 2100, dur: 0.09, peak: 0.045, delay: 0.1 }); },
    whoosh: () => { noise({ f0: 500, f1: 2200, dur: 0.45, peak: 0.045 }); voice({ f0: 210, f1: 120, dur: 0.4, peak: 0.03 }); },
    giggle: () => notes([720, 840, 780, 920], { dur: 0.08, peak: 0.04, step: 0.09, vib: [20, 25] }),
    rustle: () => { noise({ filter: 'highpass', f0: 3000, dur: 0.12, peak: 0.03 }); noise({ filter: 'highpass', f0: 2600, dur: 0.12, peak: 0.03, delay: 0.14 }); voice({ f0: 2400, f1: 3300, dur: 0.09, peak: 0.03, delay: 0.3 }); },
    creak: () => { voice({ type: 'sawtooth', f0: 190, f1: 150, dur: 0.42, peak: 0.035, filter: ['lowpass', 700], vib: [9, 18] }); noise({ f0: 400, dur: 0.15, peak: 0.02, delay: 0.3 }); },
    swish: () => noise({ f0: 1500, f1: 4200, dur: 0.32, peak: 0.04 }),
    release: () => voice({ f0: 620, f1: 420, dur: 0.12, peak: 0.025 }),
    flip: () => noise({ filter: 'highpass', f0: 2500, dur: 0.06, peak: 0.02 }),
    match: () => notes([880, 1320], { dur: 0.16, peak: 0.04, step: 0.09 }),
    wrong: () => voice({ f0: 330, f1: 262, dur: 0.22, peak: 0.035 }),
    fanfare: () => { notes([523, 659, 784], { type: 'triangle', dur: 0.25, peak: 0.06, step: 0.12 }); voice({ type: 'triangle', f0: 1047, dur: 0.7, peak: 0.06, delay: 0.36 }); notes([1568, 2093, 2637], { dur: 0.3, peak: 0.03, step: 0.07 }); }
  };
  function play(name) { if (SOUNDS[name]) SOUNDS[name](); }

  /* ---------- Vibration (Android; iPhones have no Vibration API) ---------- */
  function vibrate(pattern) {
    try { if (localStorage.getItem('msb_tap_vibration') === 'off') return; } catch { /* on */ }
    if (typeof navigator === 'undefined' || typeof navigator.vibrate !== 'function') return;
    try { navigator.vibrate(pattern); } catch { /* ignore */ }
  }

  /* ---------- Screen ---------- */
  function topBar() {
    const p = prog(), on = sounds().get();
    return `<div class="sq-topbar"><span class="sq-count" aria-label="${esc(L('Stars: {n} of {total}', { n: p.stars().length, total: p.total }))}">⭐ ${p.stars().length}/${p.total}</span><span class="sq-count" aria-label="${esc(L('Unlocked: {n} of {total}', { n: p.unlocked().length, total: p.total }))}">🔓 ${p.unlocked().length}/${p.total}</span><button type="button" class="sq-sound" role="switch" aria-checked="${on}" data-sq-sound>${on ? '🔊' : '🔈'} ${esc(L('Sounds'))}: ${esc(on ? L('On') : L('Off'))}</button></div>`;
  }
  function tabs() {
    const t = [['shelf', '🧸 ' + L('Shelf')], ['memory', '🃏 ' + L('Memory')], ['questions', '❓ ' + L('Questions')], ['guess', '🔍 ' + L('Which squishy?')]];
    return `<div class="sq-tabs" role="tablist" aria-label="${esc(L('Squishy games'))}">${t.map(([id, label]) => `<button type="button" role="tab" class="sq-tab${ui.view === id ? ' active' : ''}" aria-selected="${ui.view === id}" data-sq-view="${id}">${esc(label)}</button>`).join('')}</div>`;
  }
  function render() {
    const root = ui.root;
    if (!root || !root.isConnected) return;
    const body = ui.view === 'memory' ? memoryHtml() : ui.view === 'questions' ? questionsHtml() : ui.view === 'guess' ? guessHtml() : shelfHtml();
    root.innerHTML = `<div class="squishy-screen" data-i18n-skip><button class="text-button back" type="button" data-squishy-exit>${esc(L('← Stories'))}</button><span class="eyebrow">${esc(L('BIBLE SQUISHIES'))}</span><h1>${esc(L('Bible squishies'))}</h1>${topBar()}${tabs()}<div class="sq-body" data-sq-body>${body}</div><div class="sq-celebrate" data-sq-celebrate hidden></div></div>`;
    bindStage();
  }

  /* Shelf: the big squishy to squish, its lesson card, and the shelf. */
  function shelfHtml() {
    const p = prog(), open = p.unlocked(), stars = p.stars();
    if (!open.includes(ui.selected)) ui.selected = open[0];
    const x = byId(ui.selected);
    const tiles = D().SQUISHIES.map(s => {
      if (!open.includes(s.id)) return `<button type="button" class="sq-tile locked" data-sq-locked aria-label="${esc(L('Locked squishy. Win a game to unlock it.'))}"><span class="sq-art">${A().svg(s.id)}</span><span class="sq-lock" aria-hidden="true">🔒</span><span class="sq-name">${esc(L('Locked'))}</span></button>`;
      return `<button type="button" class="sq-tile${s.id === ui.selected ? ' active' : ''}" data-sq-pick="${s.id}" aria-pressed="${s.id === ui.selected}" aria-label="${esc(nameOf(s) + (stars.includes(s.id) ? ' ⭐' : ''))}"><span class="sq-art">${A().svg(s.id)}</span>${stars.includes(s.id) ? '<span class="sq-star" aria-hidden="true">⭐</span>' : ''}<span class="sq-name">${esc(nameOf(s))}</span></button>`;
    }).join('');
    return `<div class="sq-stage" data-sq-stage><div class="sq-shadow" aria-hidden="true"></div><button type="button" class="sq-squishy" data-sq-squishy="${x.id}" data-haptic-self aria-label="${esc(L('Squish {name}', { name: nameOf(x) }))}">${A().svg(x.id, nameOf(x))}</button></div>
      <p class="sq-hint muted" data-sq-hint>${esc(L('Press and hold to squish. Drag to poke. Let go and watch it rise!'))}</p>
      <div data-sq-card>${ui.card === x.id ? cardHtml(x) : ''}</div>
      ${ui.msg ? `<p class="sq-msg" role="status">${esc(ui.msg)}</p>` : ''}
      <h2 class="sq-h2">${esc(L('Squishy shelf'))}</h2><div class="sq-grid">${tiles}</div>
      ${p.nextLocked() ? `<p class="small muted sq-unlock-note">${esc(L('Win a round of Memory or Questions to unlock the next squishy.'))}</p>` : ''}`;
  }

  function cardHtml(x) {
    const l = lang(), has = prog().stars().includes(x.id);
    const canSpeak = !!(window.MsbSpeech && MsbSpeech.supported && MsbSpeech.supported());
    return `<article class="card sq-card" aria-live="polite"><span class="eyebrow">${esc(L('BIBLE LESSON'))}</span><h2>${esc(nameOf(x))}</h2><p>${esc(x.lesson[l])}</p>
      <blockquote class="sq-verse"><p>“${esc(x.verse[l])}”</p><cite>${esc(x.ref[l])} · ${l === 'es' ? 'RV1909' : 'KJV'}</cite></blockquote>
      <div class="sq-card-actions">${canSpeak ? `<button type="button" class="secondary" data-sq-speak="${x.id}">🔊 ${esc(L('Read aloud'))}</button>` : ''}${has ? `<span class="sq-got">⭐ ${esc(L('Star collected'))}</span>` : `<button type="button" class="primary" data-sq-star="${x.id}">⭐ ${esc(L('I learned it!'))}</button>`}</div></article>`;
  }

  /* ---------- Squish physics ---------- */
  let anim = null;
  function bindStage() {
    if (anim && anim.frame) cancelAnimationFrame(anim.frame);
    const btn = ui.root.querySelector('[data-sq-squishy]');
    if (!btn) { anim = null; return; }
    anim = { el: btn, shadow: ui.root.querySelector('.sq-shadow'), st: { s: 0, vs: 0, dx: 0, vx: 0, dy: 0, vy: 0 }, held: false, start: 0, from: null, poke: { dx: 0, dy: 0 }, frame: 0, last: 0, squeezed: false, pointer: null };
  }
  function paint(a) {
    const { s, dx, dy } = a.st;
    a.el.style.transform = `translate(${dx.toFixed(2)}px, ${dy.toFixed(2)}px) skewX(${(-dx * 0.25).toFixed(2)}deg) scale(${(1 + s * 0.55).toFixed(4)}, ${(1 - s).toFixed(4)})`;
    if (a.shadow) a.shadow.style.transform = `translateX(-50%) scale(${(1 + s * 0.6).toFixed(3)}, ${(1 + s * 0.3).toFixed(3)})`;
    const sq = s > 0.17;
    if (sq !== a.squeezed) { a.squeezed = sq; a.el.classList.toggle('squeezed', sq); }
  }
  function tick(now) {
    const a = anim;
    if (!a) return;
    const dt = a.last ? (now - a.last) / 1000 : 0.016;
    a.last = now;
    const target = a.held ? { s: C().pressDepth(now - a.start, reduced()), ...a.poke } : { s: 0, dx: 0, dy: 0 };
    a.st = C().springStep(a.st, dt, target, a.held, reduced());
    paint(a);
    if (!a.held && C().atRest(a.st)) { a.st = { s: 0, vs: 0, dx: 0, vx: 0, dy: 0, vy: 0 }; paint(a); a.frame = 0; a.last = 0; return; }
    a.frame = requestAnimationFrame(tick);
  }
  function kick() { if (anim && !anim.frame) { anim.last = 0; anim.frame = requestAnimationFrame(tick); } }
  function press(clientX, clientY) {
    const a = anim; if (!a || a.held) return;
    a.held = true; a.start = performance.now(); a.from = { x: clientX, y: clientY }; a.poke = { dx: 0, dy: 0 };
    play(byId(a.el.dataset.sqSquishy).sound);
    vibrate(8);
    kick();
  }
  function release() {
    const a = anim; if (!a || !a.held) return;
    a.held = false;
    const held = performance.now() - a.start;
    vibrate(C().vibeMs(held));
    play('release');
    kick();
    const id = a.el.dataset.sqSquishy;
    if (ui.card !== id) {
      ui.card = id;
      const host = ui.root.querySelector('[data-sq-card]');
      if (host) host.innerHTML = cardHtml(byId(id));
    }
  }
  document.addEventListener('pointerdown', e => {
    const a = anim;
    if (!a || !a.el.isConnected || !e.target.closest('[data-sq-squishy]')) return;
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    e.preventDefault();
    a.pointer = e.pointerId;
    try { a.el.setPointerCapture(e.pointerId); } catch { /* ignore */ }
    press(e.clientX, e.clientY);
  });
  document.addEventListener('pointermove', e => {
    const a = anim;
    if (!a || !a.held || a.pointer !== e.pointerId) return;
    const size = a.el.getBoundingClientRect().width || 200;
    a.poke = C().pokeOffset(e.clientX - a.from.x, e.clientY - a.from.y, reduced() ? size * 0.4 : size);
  });
  const up = e => { const a = anim; if (a && a.pointer === e.pointerId) { a.pointer = null; release(); } };
  document.addEventListener('pointerup', up);
  document.addEventListener('pointercancel', up);
  document.addEventListener('keydown', e => {
    const btn = e.target instanceof Element && e.target.closest('[data-sq-squishy]');
    if (!btn || !anim || (e.key !== 'Enter' && e.key !== ' ') || e.repeat) return;
    e.preventDefault();
    press(0, 0);
    setTimeout(release, 450);
  });

  /* ---------- Memory game ---------- */
  function newMemory() {
    const open = prog().unlocked();
    ui.memory = { deck: C().memoryDeck(open, Math.min(6, open.length), Date.now() & 0xffff), up: [], done: [], moves: 0, lock: false, won: false };
  }
  function memoryHtml() {
    if (!ui.memory) newMemory();
    const m = ui.memory;
    const cards = m.deck.map(card => {
      const x = byId(card.id), shown = m.up.includes(card.n) || m.done.includes(card.n);
      const front = card.face === 'pic' ? `<span class="sq-art">${A().svg(card.id)}</span>` : `<span class="sq-cardname">${esc(nameOf(x))}</span>`;
      const label = shown ? (card.face === 'pic' ? L('Picture: {name}', { name: nameOf(x) }) : L('Name: {name}', { name: nameOf(x) })) : L('Card {n}, face down', { n: card.n + 1 });
      return `<button type="button" class="sq-mcard${shown ? ' up' : ''}${m.done.includes(card.n) ? ' done' : ''}" data-sq-card-n="${card.n}" aria-label="${esc(label)}" ${m.done.includes(card.n) ? 'disabled' : ''}><span class="sq-mback" aria-hidden="true">✦</span><span class="sq-mfront">${front}</span></button>`;
    }).join('');
    return `<p class="muted">${esc(L('Match each squishy with its name. Find all the pairs to win!'))}</p><p class="sq-moves" aria-live="polite">${esc(L('Moves: {n}', { n: m.moves }))} · ${esc(L('Pairs: {n} of {total}', { n: m.done.length / 2, total: m.deck.length / 2 }))}</p><div class="sq-memory">${cards}</div><button type="button" class="secondary" data-sq-memory-new>${esc(L('New game'))}</button>`;
  }
  function flip(n) {
    const m = ui.memory;
    if (!m || m.lock || m.won || m.up.includes(n) || m.done.includes(n)) return;
    m.up.push(n); play('flip');
    if (m.up.length === 2) {
      m.moves += 1;
      const [a, b] = m.up.map(i => m.deck[i]);
      if (C().isMatch(a, b)) {
        m.done.push(a.n, b.n); m.up = []; play('match'); vibrate(12);
        setTimeout(() => play(byId(a.id).sound), 200);
        if (m.done.length === m.deck.length) { m.won = true; render(); setTimeout(() => celebrate('memory'), 350); return; }
      } else {
        m.lock = true;
        setTimeout(() => { m.up = []; m.lock = false; if (ui.view === 'memory') render(); }, 900);
      }
    }
    render();
  }

  /* ---------- Bible questions ---------- */
  function newRound() { ui.round = { qs: C().questionRound(D().QUESTIONS, 5, Date.now() & 0xffff, lang()), i: 0, picked: null, correct: 0, done: false }; }
  function questionsHtml() {
    if (!ui.round) newRound();
    const r = ui.round;
    if (r.done) {
      const won = C().roundWon(r.correct, r.qs.length);
      return `<div class="card sq-result"><h2>${esc(won ? L('Great job!') : L('Almost!'))}</h2><p>${esc(L('You got {n} of {total} right.', { n: r.correct, total: r.qs.length }))}</p>${won ? '' : `<p class="muted">${esc(L('Get {n} right to unlock a squishy. Try again!', { n: C().PASS }))}</p>`}<button type="button" class="primary" data-sq-round-new>${esc(L('Play again'))}</button></div>`;
    }
    const q = r.qs[r.i];
    const choices = q.choices.map((c, i) => {
      let cls = '';
      if (r.picked !== null) cls = i === q.answer ? ' right' : i === r.picked ? ' wrong' : '';
      return `<button type="button" class="sq-choice${cls}" data-sq-choice="${i}" ${r.picked !== null ? 'disabled' : ''}>${esc(c)}</button>`;
    }).join('');
    const after = r.picked === null ? '' : `<p class="sq-feedback" role="status">${esc(r.picked === q.answer ? L('Yes! That’s right.') : L('Not quite. The answer is: {a}', { a: q.choices[q.answer] }))} <span class="muted">(${esc(q.ref)})</span></p><button type="button" class="primary" data-sq-next>${esc(r.i + 1 < r.qs.length ? L('Next') : L('See my score'))}</button>`;
    return `<p class="muted">${esc(L('Answer 5 Bible questions. Get {n} right to unlock a squishy!', { n: C().PASS }))}</p><div class="card sq-question"><span class="eyebrow">${esc(L('Question {n} of {total}', { n: r.i + 1, total: r.qs.length }))}</span><h2>${esc(q.q)}</h2><div class="sq-choices">${choices}</div>${after}</div>`;
  }
  function answer(i) {
    const r = ui.round; if (!r || r.done || r.picked !== null) return;
    r.picked = i;
    const ok = i === r.qs[r.i].answer;
    if (ok) { r.correct += 1; play('match'); vibrate(12); } else play('wrong');
    render();
  }
  function nextQuestion() {
    const r = ui.round; if (!r) return;
    if (r.i + 1 < r.qs.length) { r.i += 1; r.picked = null; render(); return; }
    r.done = true; render();
    if (C().roundWon(r.correct, r.qs.length)) setTimeout(() => celebrate('questions'), 300);
  }

  /* ---------- Which squishy? ---------- */
  function newGuess() {
    const open = prog().unlocked(), rand = C().rng(Date.now() & 0xffff);
    const answer = open[Math.floor(rand() * open.length)];
    const options = C().shuffle([answer, ...C().shuffle(open.filter(id => id !== answer), rand).slice(0, 3)], rand);
    ui.guess = { answer, options, picked: null };
  }
  function guessHtml() {
    if (!ui.guess) newGuess();
    const g = ui.guess, x = byId(g.answer);
    const opts = g.options.map(id => {
      const cls = g.picked === null ? '' : id === g.answer ? ' right' : id === g.picked ? ' wrong' : '';
      return `<button type="button" class="sq-tile${cls}" data-sq-guess="${id}" aria-label="${esc(nameOf(byId(id)))}" ${g.picked !== null ? 'disabled' : ''}><span class="sq-art">${A().svg(id)}</span><span class="sq-name">${esc(nameOf(byId(id)))}</span></button>`;
    }).join('');
    const after = g.picked === null ? '' : `<p class="sq-feedback" role="status">${esc(g.picked === g.answer ? L('Yes! It’s {name}.', { name: nameOf(x) }) : L('It’s {name}!', { name: nameOf(x) }))} <span class="muted">(${esc(x.ref[lang()])})</span></p><button type="button" class="primary" data-sq-guess-next>${esc(L('Next'))}</button>`;
    return `<div class="card sq-question"><span class="eyebrow">${esc(L('WHICH SQUISHY?'))}</span><h2>${esc(x.quiz[lang()])}</h2><div class="sq-grid sq-guess">${opts}</div>${after}</div>`;
  }

  /* ---------- Unlock celebration ---------- */
  function celebrate() {
    const box = ui.root && ui.root.querySelector('[data-sq-celebrate]');
    if (!box) return;
    const next = prog().unlockNext();
    play('fanfare');
    vibrate([20, 40, 30]);
    const confetti = reduced() ? '' : `<div class="sq-confetti" aria-hidden="true">${Array.from({ length: 28 }, (_, i) => `<i style="--x:${(i * 37) % 100}%;--d:${(i % 7) * 0.12}s;--r:${(i * 53) % 360}deg;--c:${i % 5}"></i>`).join('')}</div>`;
    const inner = next
      ? `<span class="eyebrow">${esc(L('NEW SQUISHY!'))}</span><h2>${esc(L('You unlocked {name}!', { name: nameOf(next) }))}</h2><div class="sq-new">${A().svg(next.id, nameOf(next))}</div><button type="button" class="primary" data-sq-meet="${next.id}">${esc(L('Squish it!'))}</button>`
      : `<span class="eyebrow">${esc(L('YOU WON!'))}</span><h2>${esc(L('You already have every squishy. Well done!'))}</h2><button type="button" class="primary" data-sq-meet="">${esc(L('Back to the shelf'))}</button>`;
    box.innerHTML = `${confetti}<div class="sq-celebrate-card card" role="dialog" aria-modal="true" aria-labelledby="sq-cele-title">${inner.replace('<h2>', '<h2 id="sq-cele-title">')}</div>`;
    box.hidden = false;
    box.querySelector('[data-sq-meet]')?.focus();
  }

  /* ---------- Clicks ---------- */
  document.addEventListener('click', e => {
    const t = e.target instanceof Element ? e.target : null;
    if (!t || !ui.root || !t.closest('.squishy-screen')) return;
    const view = t.closest('[data-sq-view]');
    if (view) { ui.view = view.dataset.sqView; ui.msg = ''; if (ui.view === 'guess') newGuess(); render(); return; }
    if (t.closest('[data-sq-sound]')) { const on = sounds().set(!sounds().get()); render(); if (on) play('match'); return; }
    const pick = t.closest('[data-sq-pick]');
    if (pick) { ui.selected = pick.dataset.sqPick; ui.card = null; ui.msg = ''; render(); ui.root.querySelector('[data-sq-stage]')?.scrollIntoView({ block: 'center', behavior: reduced() ? 'auto' : 'smooth' }); return; }
    if (t.closest('[data-sq-locked]')) { ui.msg = L('This squishy is locked. Win a round of Memory or Questions to unlock it!'); render(); ui.root.querySelector('.sq-msg')?.scrollIntoView({ block: 'center' }); return; }
    const star = t.closest('[data-sq-star]');
    if (star) { prog().addStar(star.dataset.sqStar); play('twinkle'); vibrate(15); render(); return; }
    const speak = t.closest('[data-sq-speak]');
    if (speak && window.MsbSpeech) {
      const x = byId(speak.dataset.sqSpeak), l = lang();
      MsbSpeech.speak({ lang: l, chunks: [{ text: nameOf(x) }, { text: x.lesson[l] }, { text: x.verse[l] }, { text: x.ref[l] }] });
      return;
    }
    const card = t.closest('[data-sq-card-n]');
    if (card) { flip(Number(card.dataset.sqCardN)); return; }
    if (t.closest('[data-sq-memory-new]')) { newMemory(); render(); return; }
    const choice = t.closest('[data-sq-choice]');
    if (choice) { answer(Number(choice.dataset.sqChoice)); return; }
    if (t.closest('[data-sq-next]')) { nextQuestion(); return; }
    if (t.closest('[data-sq-round-new]')) { newRound(); render(); return; }
    const guess = t.closest('[data-sq-guess]');
    if (guess && ui.guess && ui.guess.picked === null) { ui.guess.picked = guess.dataset.sqGuess; if (ui.guess.picked === ui.guess.answer) { play(byId(ui.guess.answer).sound); vibrate(12); } else play('wrong'); render(); return; }
    if (t.closest('[data-sq-guess-next]')) { newGuess(); render(); return; }
    const meet = t.closest('[data-sq-meet]');
    if (meet) {
      if (meet.dataset.sqMeet) ui.selected = meet.dataset.sqMeet;
      ui.view = 'shelf'; ui.card = null; ui.memory = null; ui.round = null; ui.msg = '';
      render(); window.scrollTo({ top: 0, behavior: 'auto' });
    }
  });

  window.MsbSquishy = {
    open(root) { ui.root = root; render(); },
    close() { if (anim && anim.frame) cancelAnimationFrame(anim.frame); anim = null; ui.root = null; ui.view = 'shelf'; ui.card = null; ui.memory = null; ui.round = null; ui.guess = null; ui.msg = ''; if (window.MsbSpeech) MsbSpeech.stop(); },
    _celebrate: celebrate
  };
})();
