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
  const store2 = () => store() || fallbackStore;
  const stats = () => C().stats(store2());
  const ctx = () => C().challengeContext(store2(), D().SQUISHIES);
  const TIER_LABEL = { rare: 'RARE', legendary: 'LEGENDARY' };
  /* What a challenge asks, in words. */
  function challengeText(ch) {
    switch (ch.kind) {
      case 'memoryWins': return ch.n === 1 ? L('Win a round of Memory') : L('Win {n} rounds of Memory', { n: ch.n });
      case 'lessons': return L('Learn {n} squishy lessons', { n: ch.n });
      case 'squishes': return ch.n === 1 ? L('Squish your first squishy') : L('Squish squishies {n} times', { n: ch.n });
      case 'questionWins': return L('Win {n} rounds of Questions', { n: ch.n });
      case 'matchChapter': return L('Finish the Noah chapter in Manna Match');
      case 'memoryFast': return L('Win Memory in {n} moves or fewer', { n: ch.n });
      case 'perfectRound': return L('Get 5 of 5 right in Questions');
      case 'streak': return L('Play {n} days in a row', { n: ch.n });
      case 'matchThreeStars': return L('Get 3 stars on a Manna Match level');
      case 'final': return L('Unlock every squishy and get 3 stars on a Manna Match level');
      default: return '';
    }
  }
  const BADGE_NAME = { stone: 'Good memory', loaves: 'Little learner', seed: 'Super squisher', bush: 'Question pro', basket: 'Noah’s helper', tree: 'Quick memory', ark: 'Perfect score', coat: 'Three days in a row', lamp: 'Light of the world', 'first-squish': 'First squish', 'squish-200': 'Squish galore', 'all-lessons': 'Every lesson learned', 'match-3star': 'Three-star match' };
  const BADGE_ICON = { stone: '🃏', loaves: '📖', seed: '🤲', bush: '❓', basket: '🌈', tree: '⚡', ark: '💯', coat: '📅', lamp: '💡', 'first-squish': '👆', 'squish-200': '🎉', 'all-lessons': '🎓', 'match-3star': '⭐' };
  /* "2026-10-11" -> "11 oct 2026" / "Oct 11, 2026" in the app language */
  function niceDate(key) {
    const [y, m, d] = String(key).split('-').map(Number);
    if (!y || !m || !d) return key;
    try { return new Date(y, m - 1, d).toLocaleDateString(lang() === 'es' ? 'es' : 'en', { year: 'numeric', month: 'short', day: 'numeric' }); } catch { return key; }
  }
  function progressBar(pr, text) {
    const pct = Math.round((pr.have / Math.max(1, pr.need)) * 100);
    return `<span class="sq-req">${esc(text)}${pr.done ? ' ✓' : ` <b>${pr.have}/${pr.need}</b>`}</span><span class="sq-bar" role="progressbar" aria-valuemin="0" aria-valuemax="${pr.need}" aria-valuenow="${pr.have}" aria-label="${esc(text)}"><i style="width:${pct}%"></i></span>${pr.best && !pr.done ? `<span class="sq-req-best">${esc(L('Your best: {n} moves', { n: pr.best }))}</span>` : ''}`;
  }

  const ui = { queue: [], root: null, view: 'shelf', playing: null, memory: null, round: null, guess: null, msg: '' };

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
  /* Crunchy slime / ASMR crackle: many tiny filtered noise clicks at random
     moments. More and louder clicks the harder you squish or stretch; the
     release "tail" is longer and thins out at the end. */
  function crunch(intensity, tail) {
    const a = audio(); if (!a) return;
    try {
      if (!noiseBuf) { noiseBuf = a.createBuffer(1, a.sampleRate, a.sampleRate); const d = noiseBuf.getChannelData(0); for (let i = 0; i < d.length; i += 1) d[i] = Math.random() * 2 - 1; }
      const sh = C().crunchShape(intensity), t0 = a.currentTime + 0.005, span = sh.spanMs / 1000 * (tail ? 2 : 1), count = Math.round(sh.clicks * (tail ? 1.6 : 1));
      for (let k = 0; k < count; k += 1) {
        const u = Math.random(), at = t0 + (tail ? Math.pow(u, 1.7) : u) * span, d = 0.004 + Math.random() * 0.012;
        const src = a.createBufferSource(), bp = a.createBiquadFilter(), g = a.createGain();
        src.buffer = noiseBuf; bp.type = 'bandpass'; bp.frequency.value = 1300 + Math.random() * 4400; bp.Q.value = 1.5 + Math.random() * 4;
        g.gain.setValueAtTime(0.0001, at); g.gain.linearRampToValueAtTime(sh.peak * (0.4 + Math.random() * 0.8), at + 0.0015); g.gain.exponentialRampToValueAtTime(0.0001, at + d);
        src.connect(bp); bp.connect(g); g.connect(master); src.start(at, Math.random() * 0.9, d + 0.01);
      }
      noise({ filter: 'lowpass', f0: 800, f1: 260, dur: 0.06 + 0.07 * intensity, peak: 0.01 + 0.018 * intensity });
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
    crunch: () => crunch(0.45),
    /* rare unlock: fanfare, then a sparkly climb; legendary adds a big bell */
    rare: () => { SOUNDS.fanfare(); setTimeout(() => notes([1047, 1319, 1568, 2093, 2637], { type: 'sine', dur: 0.28, peak: 0.04, step: 0.07 }), 700); },
    legendary: () => { SOUNDS.fanfare(); setTimeout(() => notes([784, 1047, 1319, 1568, 2093, 2637, 3136], { type: 'triangle', dur: 0.35, peak: 0.045, step: 0.08 }), 650); setTimeout(() => voice({ type: 'sine', f0: 523, dur: 1.6, peak: 0.06, vib: [5, 4] }), 1300); },
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
    const t = [['shelf', '🧸 ' + L('Shelf')], ['memory', '🃏 ' + L('Memory')], ['questions', '❓ ' + L('Questions')], ['guess', '🔍 ' + L('Which squishy?')], ['badges', '🏅 ' + L('Badges')]];
    return `<div class="sq-tabs" role="tablist" aria-label="${esc(L('Squishy games'))}">${t.map(([id, label]) => `<button type="button" role="tab" class="sq-tab${ui.view === id ? ' active' : ''}" aria-selected="${ui.view === id}" data-sq-view="${id}">${esc(label)}</button>`).join('')}</div>`;
  }
  function render() {
    const root = ui.root;
    if (!root || !root.isConnected) return;
    const body = ui.view === 'badges' ? badgesHtml() : ui.view === 'memory' ? memoryHtml() : ui.view === 'questions' ? questionsHtml() : ui.view === 'guess' ? guessHtml() : shelfHtml();
    root.innerHTML = `<div class="squishy-screen" data-i18n-skip><button class="text-button back" type="button" data-squishy-exit>${esc(L('← Stories'))}</button><span class="eyebrow">${esc(L('BIBLE SQUISHIES'))}</span><h1>${esc(L('Bible squishies'))}</h1>${topBar()}${tabs()}<div class="sq-body" data-sq-body>${body}</div><div class="sq-play-host" data-sq-play-host></div><div class="sq-celebrate" data-sq-celebrate hidden></div></div>`;
    if (ui.playing) openPlay(ui.playing);
  }

  /* Shelf: tap a squishy to play with it. */
  function shelfHtml() {
    const p = prog(), open = p.unlocked(), stars = p.stars();
    const c = ctx();
    const tiles = D().SQUISHIES.map(s => {
      const tier = C().tierOf(s.id), ch = C().challengeFor(s.id);
      const tierCls = tier === 'common' ? '' : ` ${tier}`;
      const tag = TIER_LABEL[tier] ? `<span class="sq-tier" aria-hidden="true">${esc(L(TIER_LABEL[tier]))}</span>` : '';
      if (!open.includes(s.id)) {
        const text = ch ? challengeText(ch) : L('Locked');
        const pr = ch ? C().challengeProgress(ch, c) : { have: 0, need: 1, done: false };
        const label = `${s.final ? L('The final squishy is locked.') : L('Locked squishy.')} ${TIER_LABEL[tier] ? L(TIER_LABEL[tier]) + '. ' : ''}${text}: ${pr.have} / ${pr.need}`;
        return `<button type="button" class="sq-tile locked${s.final ? ' final' : ''}${tierCls}" data-sq-locked="${s.id}" aria-label="${esc(label)}">${tag}<span class="sq-art">${A().svg(s.id)}</span><span class="sq-lock" aria-hidden="true">🔒</span><span class="sq-name">${esc(s.final ? L('✨ Final squishy') : L('Locked'))}</span>${progressBar(pr, text)}</button>`;
      }
      return `<button type="button" class="sq-tile${s.glow ? ' glow' : ''}${tierCls}" data-sq-pick="${s.id}" aria-label="${esc(L('Play with {name}', { name: nameOf(s) }) + (TIER_LABEL[tier] ? ' (' + L(TIER_LABEL[tier]) + ')' : '') + (stars.includes(s.id) ? ' ⭐' : ''))}">${tag}${s.glow ? '<span class="sq-sparks" aria-hidden="true"><i></i><i></i><i></i><i></i></span>' : ''}<span class="sq-art">${A().svg(s.id)}</span>${stars.includes(s.id) ? '<span class="sq-star" aria-hidden="true">⭐</span>' : ''}<span class="sq-name">${esc(nameOf(s))}</span></button>`;
    }).join('');
    return `<p class="sq-hint">${esc(L('Tap a squishy to play with it: squish it, stretch it, and learn its Bible story.'))}</p>
      ${ui.msg ? `<p class="sq-msg" role="status">${esc(ui.msg)}</p>` : ''}
      <h2 class="sq-h2">${esc(L('Squishy shelf'))}</h2><div class="sq-grid">${tiles}</div>
      ${p.nextLocked() ? `<p class="small muted sq-unlock-note">${esc(L('Each locked squishy has its own challenge. Rare ones are harder!'))}</p>` : ''}`;
  }

  /* Achievements: every badge, earned or not, with progress. */
  function badgesHtml() {
    const list = C().badges(store2(), D().SQUISHIES);
    const got = list.filter(b => b.earned).length;
    const rows = list.map(b => {
      const text = challengeText(b), tierCls = b.tier === 'common' ? '' : ` ${b.tier}`;
      const art = b.squishy ? `<span class="sq-badge-art${b.earned ? '' : ' dim'}">${A().svg(b.squishy)}</span>` : `<span class="sq-badge-art emoji" aria-hidden="true">${BADGE_ICON[b.id] || '🏅'}</span>`;
      const status = b.earned ? `<span class="sq-badge-date">✓ ${esc(L('Earned {date}', { date: niceDate(b.earned) }))}</span>` : progressBar(b.progress, text);
      return `<li class="sq-badge${b.earned ? ' earned' : ''}${tierCls}"><span class="sq-medal" aria-hidden="true">${b.earned ? BADGE_ICON[b.id] || '🏅' : '🔒'}</span>${art}<span class="sq-badge-body"><strong>${esc(L(BADGE_NAME[b.id] || b.id))}</strong>${TIER_LABEL[b.tier] ? `<span class="sq-tier inline">${esc(L(TIER_LABEL[b.tier]))}</span>` : ''}${b.earned ? `<span class="sq-req">${esc(text)}</span>` : ''}${status}</span></li>`;
    }).join('');
    return `<h2 class="sq-h2">${esc(L('Achievements'))}</h2><p class="sq-hint">${esc(L('Badges earned: {n} of {total}', { n: got, total: list.length }))}</p><ul class="sq-badges">${rows}</ul>`;
  }

  /* Something counted toward the challenges: open any squishy whose
     challenge is now met and celebrate it (rare ones get a special screen). */
  function afterProgress(win) {
    const opened = C().checkUnlocks(store2(), D().SQUISHIES);
    if (opened.length) { ui.queue.push(...opened); if (!ui.root?.querySelector('[data-sq-celebrate]:not([hidden])')) setTimeout(() => celebrate(ui.queue.shift()), win ? 350 : 150); return true; }
    if (win) setTimeout(() => celebrate(null), 350);
    return false;
  }

  function cardHtml(x) {
    const l = lang(), has = prog().stars().includes(x.id);
    const canSpeak = !!(window.MsbSpeech && MsbSpeech.supported && MsbSpeech.supported());
    return `<article class="card sq-card"><span class="eyebrow">${esc(L('BIBLE LESSON'))}</span><h2 id="sq-card-title">${esc(nameOf(x))}</h2><p>${esc(x.lesson[l])}</p>
      <blockquote class="sq-verse"><p>“${esc(x.verse[l])}”</p><cite>${esc(x.ref[l])} · ${l === 'es' ? 'RV1909' : 'KJV'}</cite></blockquote>
      <div class="sq-card-actions">${canSpeak ? `<button type="button" class="secondary" data-sq-speak="${x.id}">🔊 ${esc(L('Read aloud'))}</button>` : ''}${has ? `<span class="sq-got">⭐ ${esc(L('Star collected'))}</span>` : `<button type="button" class="primary" data-sq-star="${x.id}">⭐ ${esc(L('I learned it!'))}</button>`}<button type="button" class="secondary" data-sq-sheet-close>${esc(L('Keep playing'))}</button></div></article>`;
  }

  /* ---------- Play view: a big soft-body squishy ---------- */
  let pv = null;
  const textures = new Map();
  /* kind: 'body' (the picture without its face, warped by the mesh) or a face
     mood: 'happy' | 'squint' | 'wow' (the face alone, drawn as one stiff piece). */
  /* The picture is drawn into an offscreen canvas at the size it really shows
     on this screen (device pixels, with room for stretching), so it stays crisp. */
  const RENDER = 24; /* render mesh: 24 x 24 cells, smoothly sampled from the physics grid */
  function texSize() {
    const p = pv; if (!p) return 512;
    const px = p.body.size * p.scale * p.dpr * 1.6;
    return Math.max(512, Math.min(2048, Math.ceil(px / 64) * 64));
  }
  function texture(id, kind) {
    /* the at-rest picture is made at exactly its on-screen size: no resampling */
    const T = kind === 'full' && pv ? Math.round(pv.body.size * pv.scale * pv.dpr) : texSize(), key = `${id}:${kind}:${T}`;
    if (textures.has(key)) return textures.get(key);
    const entry = { ready: false, T, canvas: document.createElement('canvas'), mask: null };
    entry.canvas.width = entry.canvas.height = T;
    const img = new Image();
    img.onload = () => {
      const g = entry.canvas.getContext('2d');
      g.imageSmoothingEnabled = true; g.imageSmoothingQuality = 'high';
      g.drawImage(img, 0, 0, T, T);
      entry.ready = true;
      if (kind === 'body') {
        /* which render cells have any ink, so empty corners are skipped */
        const data = g.getImageData(0, 0, T, T).data, cell = T / RENDER, mask = new Uint8Array(RENDER * RENDER), step = Math.max(2, Math.floor(cell / 6));
        for (let j = 0; j < RENDER; j += 1) for (let i = 0; i < RENDER; i += 1) {
          let any = 0;
          const y0 = Math.max(0, Math.floor(j * cell) - 2), y1 = Math.min(T, Math.ceil((j + 1) * cell) + 2), x0 = Math.max(0, Math.floor(i * cell) - 2), x1 = Math.min(T, Math.ceil((i + 1) * cell) + 2);
          for (let yy = y0; yy < y1 && !any; yy += step) for (let xx = x0; xx < x1; xx += step) if (data[(yy * T + xx) * 4 + 3] > 4) { any = 1; break; }
          mask[j * RENDER + i] = any;
        }
        entry.mask = mask;
      }
      if (pv) { pv.dirty = true; kick(); }
    };
    /* SVG drawn at the target size (not upscaled from a small bitmap) */
    const svgText = (kind === 'full' ? A().svg(id, '', 'happy') : kind === 'body' ? A().svg(id, '', 'happy', 'body') : A().svg(id, '', kind, 'face')).replace('width="120" height="120"', `width="${T}" height="${T}"`);
    img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svgText);
    textures.set(key, entry);
    return entry;
  }

  function playHtml(x) {
    const on = sounds().get();
    return `<div class="sq-play" data-sq-play role="dialog" aria-modal="true" aria-labelledby="sq-play-title">
      <div class="sq-play-top"><button type="button" class="sq-play-back" data-sq-play-back>${esc(L('← Shelf'))}</button><strong id="sq-play-title">${esc(nameOf(x))}</strong><button type="button" class="sq-sound" role="switch" aria-checked="${on}" data-sq-sound aria-label="${esc(L('Sounds'))}">${on ? '🔊' : '🔈'}</button></div>
      <div class="sq-play-area" data-sq-area><canvas class="sq-canvas" data-sq-canvas tabindex="0" role="img" aria-label="${esc(L('{name}. Press to squish, drag to stretch, two fingers to squeeze or spread. Keys: Enter or Space squishes, arrows stretch.', { name: nameOf(x) }))}"></canvas>
        <button type="button" class="sq-learn" data-sq-learn hidden>📖 ${esc(L('Learn'))}</button></div>
      <p class="sq-play-hint">${esc(L('Press to squish · drag to stretch · two fingers to squeeze or spread'))}</p>
      <div class="sq-sheet" data-sq-sheet hidden></div></div>`;
  }

  function openPlay(id) {
    const host = ui.root && ui.root.querySelector('[data-sq-play-host]');
    const x = byId(id);
    if (!host || !x) return;
    closePlay(true);
    ui.playing = id;
    host.innerHTML = playHtml(x);
    document.documentElement.classList.add('sq-locked');
    const canvas = host.querySelector('[data-sq-canvas]'), area = host.querySelector('[data-sq-area]');
    pv = { id, x, canvas, area, ctx: canvas.getContext('2d'), body: C().softBody({ reduced: reduced() }), pointers: new Map(), mode: null, anchor: null, start: 0, pinch0: null, frame: 0, last: 0, dirty: true, mood: 'happy', dpr: 1, scale: 1, ox: 0, oy: 0, buzzAt: 0, buzzLevel: 0, squelch: 0, gestured: false, held: false, tone: null, lastStretch: 0, giggleAt: 0, glow: !!x.glow, glowI: 0, glowNow: 0, sparks: [], sparkAcc: 0, crunchAt: 0, crunchLevel: 0 };
    pv.face = A().faceAt(id);
    layout();
    kick();
    canvas.focus({ preventScroll: true });
  }
  function closePlay(silent) {
    if (!pv) return;
    if (pv.frame) cancelAnimationFrame(pv.frame);
    toneStop();
    pv = null;
    if (!silent) ui.playing = null;
    document.documentElement.classList.remove('sq-locked');
    const host = ui.root && ui.root.querySelector('[data-sq-play-host]');
    if (host && !silent) host.innerHTML = '';
  }
  function layout() {
    const p = pv; if (!p) return;
    const r = p.area.getBoundingClientRect(), dpr = Math.min(3, Math.max(1, window.devicePixelRatio || 1));
    p.cw = Math.max(200, r.width); p.ch = Math.max(240, r.height); p.dpr = dpr;
    p.canvas.width = Math.round(p.cw * dpr); p.canvas.height = Math.round(p.ch * dpr);
    p.canvas.style.width = `${p.cw}px`; p.canvas.style.height = `${p.ch}px`;
    p.scale = Math.min(p.cw, p.ch) * 0.58 / p.body.size;
    p.ox = (p.cw - p.body.size * p.scale) / 2;
    p.oy = p.ch * 0.58 - p.body.size * p.scale / 2;
    p.ctx.imageSmoothingEnabled = true; p.ctx.imageSmoothingQuality = 'high';
    for (const m of ['full', 'body', 'happy', 'squint', 'wow']) texture(p.id, m);
    p.dirty = true;
  }
  window.addEventListener('resize', () => { if (pv) layout(); });
  const toBody = (p, cx, cy) => { const r = p.canvas.getBoundingClientRect(); return { x: (cx - r.left - p.ox) / p.scale, y: (cy - r.top - p.oy) / p.scale }; };

  /* Draw the picture warped over a fine render mesh (smoothly sampled from the
     physics grid). Each cell is one clipped quad, slightly enlarged so cells
     overlap a hair and no seams show. */
  const RP = new Float64Array((RENDER + 1) * (RENDER + 1) * 2);
  function draw() {
    const p = pv; if (!p) return;
    const g = p.ctx, b = p.body, base = texture(p.id, 'body');
    g.setTransform(1, 0, 0, 1, 0, 0);
    g.clearRect(0, 0, p.canvas.width, p.canvas.height);
    if (!base.ready) return;
    const img = base.canvas, T = base.T, k = T / b.size;
    const s = p.scale * p.dpr, ox = p.ox * p.dpr, oy = p.oy * p.dpr;
    const bb = b.bounds();
    const gx = ox + (bb.minX + bb.maxX) / 2 * s, gy = oy + (bb.minY + bb.maxY) / 2 * s, gr = Math.max(bb.maxX - bb.minX, bb.maxY - bb.minY) * s;
    if (p.glow) {
      const G = p.glowNow, halo = g.createRadialGradient(gx, gy, gr * 0.15, gx, gy, gr * 0.95);
      halo.addColorStop(0, `rgba(255,236,160,${(0.6 * G).toFixed(3)})`); halo.addColorStop(0.5, `rgba(255,205,90,${(0.28 * G).toFixed(3)})`); halo.addColorStop(1, 'rgba(255,190,70,0)');
      g.fillStyle = halo; g.fillRect(0, 0, p.canvas.width, p.canvas.height);
    }
    g.fillStyle = 'rgba(0,0,0,0.28)';
    g.beginPath();
    g.ellipse(ox + (bb.minX + bb.maxX) / 2 * s, oy + Math.min(bb.maxY, b.size * 1.02) * s, (bb.maxX - bb.minX) * s * 0.36, 9 * p.dpr, 0, 0, Math.PI * 2);
    g.fill();
    /* At rest: the original picture, drawn straight (no mesh, no warping). */
    const full = texture(p.id, 'full');
    if (full.ready && !b.state.mode && b.maxOffset() < 0.3) {
      g.imageSmoothingEnabled = true; g.imageSmoothingQuality = 'high';
      g.drawImage(full.canvas, Math.round(ox), Math.round(oy));
      p.drawn = 'rest';
      if (p.glow) glowOver(g, gx, gy, gr, p.dpr);
      return;
    }
    p.drawn = 'mesh';
    const R = RENDER, step = b.size / R, mask = base.mask;
    for (let j = 0; j <= R; j += 1) for (let i = 0; i <= R; i += 1) {
      const q = b.smooth(i * step, j * step), o = (j * (R + 1) + i) * 2;
      RP[o] = ox + q.x * s; RP[o + 1] = oy + q.y * s;
    }
    g.imageSmoothingEnabled = true; g.imageSmoothingQuality = 'high';
    const cellT = step * k;
    for (let j = 0; j < R; j += 1) for (let i = 0; i < R; i += 1) {
      if (mask && !mask[j * R + i]) continue;
      const a = (j * (R + 1) + i) * 2, bq = a + 2, c = a + (R + 1) * 2, d = c + 2;
      quad(g, img, T, i * cellT, j * cellT, cellT, RP[a], RP[a + 1], RP[bq], RP[bq + 1], RP[c], RP[c + 1], RP[d], RP[d + 1]);
    }
    drawFace(g, s, ox, oy);
    if (p.glow) glowOver(g, gx, gy, gr, p.dpr);
  }
  /* The face is not warped: it rides on the body with a mild stretch and tilt. */
  function drawFace(g, s, ox, oy) {
    const p = pv, f = p.face;
    if (!f) return;
    const tex = texture(p.id, p.mood), happy = texture(p.id, 'happy');
    const use = tex.ready ? tex : happy.ready ? happy : null;
    if (!use) return;
    const img = use.canvas, T = use.T;
    const fr = p.body.faceFrame(f.x, f.y, 26 * f.k), q = p.body.size / T, cs = Math.cos(fr.rot), sn = Math.sin(fr.rot);
    const a = s * q * cs * fr.sx, b = s * q * sn * fr.sx, c = -s * q * sn * fr.sy, d = s * q * cs * fr.sy;
    const cx = ox + fr.x * s, cy = oy + fr.y * s;
    g.save();
    g.setTransform(a, b, c, d, cx - (a * f.x + c * f.y) / q, cy - (b * f.x + d * f.y) / q);
    /* only the face's own square of the texture */
    const half = 34 * f.k / q, fx = f.x / q, fy = f.y / q, sx = Math.max(0, fx - half), sy = Math.max(0, fy - half), sw = Math.min(T - sx, half * 2), sh = Math.min(T - sy, half * 2);
    g.drawImage(img, sx, sy, sw, sh, sx, sy, sw, sh);
    g.restore();
  }
  /* Inner glow that brightens with squish/stretch, and tiny floating lights. */
  function glowOver(g, gx, gy, gr, dpr) {
    const p = pv;
    g.save();
    g.globalCompositeOperation = 'lighter';
    if (p.glowI > 0.02) {
      const inner = g.createRadialGradient(gx, gy, 0, gx, gy, gr * 0.42);
      inner.addColorStop(0, `rgba(255,236,170,${(0.22 * p.glowI).toFixed(3)})`); inner.addColorStop(1, "rgba(255,220,120,0)");
      g.fillStyle = inner; g.fillRect(gx - gr, gy - gr, gr * 2, gr * 2);
    }
    for (const sp of p.sparks) {
      const a = Math.sin(Math.PI * Math.min(1, sp.age / sp.life)), r = sp.r * dpr, x = sp.x * dpr, y = sp.y * dpr;
      g.fillStyle = `rgba(255,236,170,${(0.9 * a).toFixed(3)})`;
      g.beginPath(); g.moveTo(x, y - r * 2); g.quadraticCurveTo(x, y, x + r * 2, y); g.quadraticCurveTo(x, y, x, y + r * 2); g.quadraticCurveTo(x, y, x - r * 2, y); g.quadraticCurveTo(x, y, x, y - r * 2); g.fill();
    }
    g.restore();
  }
  function stepSparks(dt) {
    const p = pv, b = p.body;
    if (reduced()) { p.sparks.length = 0; return; }
    p.sparkAcc += dt * (2.5 + 14 * p.glowI);
    const bb = b.bounds();
    while (p.sparkAcc >= 1 && p.sparks.length < 40) {
      p.sparkAcc -= 1;
      p.sparks.push({ x: p.ox + (bb.minX + Math.random() * (bb.maxX - bb.minX)) * p.scale, y: p.oy + (bb.minY + Math.random() * (bb.maxY - bb.minY) * 0.8) * p.scale, vx: (Math.random() - 0.5) * 14, vy: -(12 + Math.random() * 26), r: 1.4 + Math.random() * 2.2, age: 0, life: 1.1 + Math.random() * 1.3 });
    }
    if (p.sparkAcc > 1) p.sparkAcc = 0;
    for (const sp of p.sparks) { sp.age += dt; sp.x += sp.vx * dt; sp.y += sp.vy * dt; }
    p.sparks = p.sparks.filter(sp => sp.age < sp.life);
  }
  /* One mesh cell: the texture square (u0, v0, size) mapped onto the screen
     quad (a b / c d). The cells are small, so one affine map (fitted to the
     a-b-c corners) is exact to well under a pixel; the clip is the real quad,
     pushed out 0.6 px so neighbours overlap instead of leaving hairlines, and
     only that square of the texture is sampled. */
  function quad(g, img, T, u0, v0, w, ax, ay, bx, by, cx, cy, dx, dy) {
    const a = (bx - ax) / w, b = (by - ay) / w, c = (cx - ax) / w, d = (cy - ay) / w;
    const e = ax - a * u0 - c * v0, f = ay - b * u0 - d * v0;
    const mx = (ax + bx + cx + dx) / 4, my = (ay + by + cy + dy) / 4, out = (px, py) => { const vx = px - mx, vy = py - my, l = Math.hypot(vx, vy) || 1; return [px + vx / l * 0.6, py + vy / l * 0.6]; };
    const A1 = out(ax, ay), B1 = out(bx, by), D1 = out(dx, dy), C1 = out(cx, cy);
    g.save();
    g.beginPath(); g.moveTo(A1[0], A1[1]); g.lineTo(B1[0], B1[1]); g.lineTo(D1[0], D1[1]); g.lineTo(C1[0], C1[1]); g.closePath(); g.clip();
    g.setTransform(a, b, c, d, e, f);
    const m = 2, sx = Math.max(0, u0 - m), sy = Math.max(0, v0 - m), sw = Math.min(T - sx, w + 2 * m), sh = Math.min(T - sy, w + 2 * m);
    g.drawImage(img, sx, sy, sw, sh, sx, sy, sw, sh);
    g.restore();
  }

  /* Continuous stretchy tone: pitch rises with the stretch, only sounds while it changes. */
  function toneStart() {
    if (pv && pv.glow) return;
    const a = audio(); if (!a || !pv || pv.tone) return;
    try {
      const osc = a.createOscillator(), f = a.createBiquadFilter(), gain = a.createGain(), lfo = a.createOscillator(), lg = a.createGain();
      osc.type = 'triangle'; osc.frequency.value = 180; f.type = 'lowpass'; f.frequency.value = 900; gain.gain.value = 0;
      lfo.frequency.value = 9; lg.gain.value = 6; lfo.connect(lg); lg.connect(osc.frequency);
      osc.connect(f); f.connect(gain); gain.connect(master); osc.start(); lfo.start();
      pv.tone = { osc, gain, lfo };
    } catch { /* ignore */ }
  }
  function toneSet(amount, speed) {
    const t = pv && pv.tone; if (!t || !ac) return;
    const now = ac.currentTime;
    t.osc.frequency.setTargetAtTime(170 + amount * 560, now, 0.03);
    t.gain.gain.setTargetAtTime(Math.min(0.055, speed * 0.04), now, speed > 0.02 ? 0.03 : 0.08);
  }
  function toneStop() {
    const t = pv && pv.tone; if (!t) return;
    pv.tone = null;
    try { t.gain.gain.setTargetAtTime(0, ac.currentTime, 0.04); t.osc.stop(ac.currentTime + 0.2); t.lfo.stop(ac.currentTime + 0.2); } catch { /* ignore */ }
  }
  function squelch(depth) { noise({ filter: 'lowpass', f0: 900, f1: 220, dur: 0.22, peak: 0.03 + depth * 0.03 }); voice({ f0: 240, f1: 140, dur: 0.18, peak: 0.025 + depth * 0.02 }); }
  function boing(amount) { voice({ f0: 200 + amount * 340, f1: 95, dur: 0.45, peak: 0.04 + amount * 0.04, vib: [13, 26 + amount * 30] }); }

  function buzz(level, now) {
    const p = pv; if (!p) return;
    if (now - p.buzzAt < (p.glow ? 160 : 110) || Math.abs(level - p.buzzLevel) < 0.06 || level < 0.05) return;
    p.buzzAt = now; p.buzzLevel = level;
    vibrate(p.glow ? C().crunchPattern(level) : C().pulseMs(level));
  }

  function tick(now) {
    const p = pv; if (!p) return;
    p.frame = 0;
    const dt = p.last ? (now - p.last) / 1000 : 1 / 60;
    p.last = now;
    const b = p.body, list = [...p.pointers.values()];
    if (p.mode === 'pinch' && list.length >= 2) {
      const [f0, f1] = list, d0 = p.pinch0.d, d1 = Math.hypot(f1.x - f0.x, f1.y - f0.y);
      b.pinch(p.pinch0.cx, p.pinch0.cy, p.pinch0.ux, p.pinch0.uy, d1 / d0);
    } else if (p.mode === 'grab' && list.length) {
      const f = list[0];
      b.grab(p.anchor.x, p.anchor.y, (f.x - f.x0) / p.scale, (f.y - f.y0) / p.scale);
    } else if (p.mode === 'press') {
      const hold = now - p.start, depth = 1 - Math.exp(-hold / 650);
      b.press(p.anchor.x, p.anchor.y, depth);
      const step = depth > 0.75 ? 2 : depth > 0.35 ? 1 : 0;
      if (step > p.squelch) { p.squelch = step; squelch(depth); }
    }
    b.step(dt);
    const st = b.state, amount = Math.max(st.stretch, st.squish);
    if (st.mode === 'grab' || st.mode === 'pinch') { const sp = Math.abs(amount - p.lastStretch) / Math.max(dt, 0.008); toneSet(amount, sp); }
    p.lastStretch = amount;
    if (st.mode) buzz(amount, now);
    if (p.glow) {
      if (st.mode && now - p.crunchAt > 85 + Math.random() * 70 && Math.abs(amount - p.crunchLevel) > 0.035) { p.crunchAt = now; p.crunchLevel = amount; crunch(amount); }
      p.glowI = st.mode ? Math.max(amount, p.glowI * 0.9) : p.glowI * 0.95;
      p.glowNow = C().glowLevel(p.glowI, now / 1000, reduced());
      stepSparks(Math.min(0.05, dt));
    }
    const m = st.mode ? C().mood(st) : 'happy';
    if (m !== p.mood) { p.mood = m; }
    if (!st.mode && now - p.giggleAt > 1400 && b.energy() > 900) { p.giggleAt = now; play('giggle'); }
    draw();
    const live = p.glow && (!reduced() || p.glowI > 0.01);
    if (st.mode || !b.atRest() || live) {
      if (!st.mode && b.atRest()) b.settle();
      p.frame = requestAnimationFrame(tick);
    } else { b.settle(); p.mood = 'happy'; draw(); p.last = 0; }
  }
    function kick() { if (pv && !pv.frame) { pv.last = 0; pv.frame = requestAnimationFrame(tick); } }

  function beginGesture(p) {
    if (!p.gestured) { p.gestured = true; play(byId(p.id).sound); stats().squished(); afterProgress(false); }
  }
  function endGesture() {
    const p = pv; if (!p) return;
    const f = [...p.pointers.values()][0];
    const was = p.body.release(f ? f.vx / p.scale : 0, f ? f.vy / p.scale : 0);
    toneStop();
    if (p.glow && was.mode) { crunch(Math.max(0.5, was.stretch, was.squish), true); vibrate(C().crunchPattern(Math.max(was.stretch, was.squish))); }
    else if (was.mode === 'grab' || was.mode === 'pinch') { if (was.stretch > 0.15) boing(was.stretch); else play('release'); vibrate(C().pulseMs(Math.max(was.stretch, was.squish))); }
    else if (was.mode === 'press') { play('release'); vibrate(C().pulseMs(was.squish)); }
    p.mode = null; p.squelch = 0; p.gestured = false; p.buzzLevel = 0;
    const learn = p.area.querySelector('[data-sq-learn]');
    if (learn && learn.hidden) learn.hidden = false;
    kick();
  }

  document.addEventListener('pointerdown', e => {
    const p = pv;
    if (!p || e.target !== p.canvas) return;
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    e.preventDefault();
    try { p.canvas.setPointerCapture(e.pointerId); } catch { /* ignore */ }
    const now = performance.now();
    p.pointers.set(e.pointerId, { x: e.clientX, y: e.clientY, x0: e.clientX, y0: e.clientY, t: now, vx: 0, vy: 0 });
    if (p.pointers.size === 2) {
      const [a, b] = [...p.pointers.values()];
      if (p.mode) { p.body.release(0, 0); }
      const pa = toBody(p, a.x, a.y), pb = toBody(p, b.x, b.y);
      p.pinch0 = { d: Math.max(20, Math.hypot(b.x - a.x, b.y - a.y)), cx: (pa.x + pb.x) / 2, cy: (pa.y + pb.y) / 2, ux: pb.x - pa.x, uy: pb.y - pa.y };
      p.mode = 'pinch'; toneStart(); beginGesture(p); kick(); return;
    }
    if (p.pointers.size > 2 || p.mode) return;
    const at = toBody(p, e.clientX, e.clientY);
    p.anchor = p.body.nearest(at.x, at.y);
    p.mode = 'press'; p.start = now; p.squelch = 0;
    beginGesture(p); vibrate(8); kick();
  });
  document.addEventListener('pointermove', e => {
    const p = pv;
    if (!p || !p.pointers.has(e.pointerId)) return;
    e.preventDefault();
    const f = p.pointers.get(e.pointerId), now = performance.now(), dt = Math.max(8, now - f.t);
    f.vx = f.vx * 0.5 + (e.clientX - f.x) / dt * 1000 * 0.5; f.vy = f.vy * 0.5 + (e.clientY - f.y) / dt * 1000 * 0.5;
    f.x = e.clientX; f.y = e.clientY; f.t = now;
    if (p.mode === 'press' && Math.hypot(f.x - f.x0, f.y - f.y0) > 10) { p.mode = 'grab'; toneStart(); }
    kick();
  });
  const lift = e => {
    const p = pv;
    if (!p || !p.pointers.has(e.pointerId)) return;
    if (p.pointers.size === 1 || p.mode !== 'pinch') { endGesture(); p.pointers.delete(e.pointerId); return; }
    /* pinch ended with one finger still down: let go of the pinch, wait for the last finger */
    endGesture(); p.pointers.delete(e.pointerId); p.mode = 'wait';
  };
  document.addEventListener('pointerup', lift);
  document.addEventListener('pointercancel', lift);
  document.addEventListener('pointerup', () => { if (pv && pv.mode === 'wait' && pv.pointers.size === 0) pv.mode = null; });

  /* Keyboard: Enter/Space squish, arrows stretch that way, Escape goes back. */
  const ARROWS = { ArrowUp: [60, 6, 0, -1], ArrowDown: [60, 114, 0, 1], ArrowLeft: [6, 60, -1, 0], ArrowRight: [114, 60, 1, 0] };
  document.addEventListener('keydown', e => {
    const p = pv;
    if (!p || e.target !== p.canvas) return;
    if (e.key === 'Escape') { e.preventDefault(); closePlay(); render(); return; }
    if (p.mode || e.repeat) { if (ARROWS[e.key] || e.key === ' ' || e.key === 'Enter') e.preventDefault(); return; }
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      p.anchor = { x: 60, y: 30 }; p.mode = 'press'; p.start = performance.now(); beginGesture(p); kick();
      setTimeout(() => { if (pv === p && p.mode === 'press') endGesture(); }, 600);
    } else if (ARROWS[e.key]) {
      e.preventDefault();
      const [ax, ay, dx, dy] = ARROWS[e.key], t0 = performance.now();
      p.anchor = { x: ax, y: ay }; p.mode = 'key'; beginGesture(p); toneStart();
      const pull = now => {
        if (pv !== p || p.mode !== 'key') return;
        const k = Math.min(1, (now - t0) / 450);
        p.body.grab(ax, ay, dx * 90 * k, dy * 90 * k);
        if (k < 1) requestAnimationFrame(pull); else setTimeout(() => { if (pv === p) endGesture(); }, 120);
      };
      requestAnimationFrame(pull); kick();
    }
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
        if (m.done.length === m.deck.length) { m.won = true; stats().memoryWon(m.moves); render(); afterProgress(true); return; }
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
      return `<div class="card sq-result"><h2>${esc(won ? L('Great job!') : L('Almost!'))}</h2><p>${esc(L('You got {n} of {total} right.', { n: r.correct, total: r.qs.length }))}</p>${won ? '' : `<p class="muted">${esc(L('Get {n} right to win the round. Try again!', { n: C().PASS }))}</p>`}<button type="button" class="primary" data-sq-round-new>${esc(L('Play again'))}</button></div>`;
    }
    const q = r.qs[r.i];
    const choices = q.choices.map((c, i) => {
      let cls = '';
      if (r.picked !== null) cls = i === q.answer ? ' right' : i === r.picked ? ' wrong' : '';
      return `<button type="button" class="sq-choice${cls}" data-sq-choice="${i}" ${r.picked !== null ? 'disabled' : ''}>${esc(c)}</button>`;
    }).join('');
    const after = r.picked === null ? '' : `<p class="sq-feedback" role="status">${esc(r.picked === q.answer ? L('Yes! That’s right.') : L('Not quite. The answer is: {a}', { a: q.choices[q.answer] }))} <span class="muted">(${esc(q.ref)})</span></p><button type="button" class="primary" data-sq-next>${esc(r.i + 1 < r.qs.length ? L('Next') : L('See my score'))}</button>`;
    return `<p class="muted">${esc(L('Answer 5 Bible questions. Get {n} right to win the round!', { n: C().PASS }))}</p><div class="card sq-question"><span class="eyebrow">${esc(L('Question {n} of {total}', { n: r.i + 1, total: r.qs.length }))}</span><h2>${esc(q.q)}</h2><div class="sq-choices">${choices}</div>${after}</div>`;
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
    r.done = true; stats().roundDone(r.correct, r.qs.length); render();
    afterProgress(C().roundWon(r.correct, r.qs.length));
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

  /* ---------- Unlock celebration ----------
     id: the squishy just opened, or null for a plain "you won" card.
     Rare squishies get an achievement screen with a trophy badge and shine;
     the legendary lamp gets an even grander one. */
  function celebrate(id) {
    const box = ui.root && ui.root.querySelector('[data-sq-celebrate]');
    if (!box) return;
    const x = id ? byId(id) : null, tier = id ? C().tierOf(id) : 'common', ch = id ? C().challengeFor(id) : null;
    const big = tier !== 'common';
    play(tier === 'legendary' ? 'legendary' : tier === 'rare' ? 'rare' : 'fanfare');
    if (tier === 'legendary') { setTimeout(() => play('twinkle'), 900); setTimeout(() => crunch(0.8, true), 1500); }
    vibrate(tier === 'legendary' ? [20, 40, 30, 60, 8, 20, 8, 20, 10, 40, 60] : tier === 'rare' ? [25, 40, 25, 40, 60] : [20, 40, 30]);
    const conf = reduced() ? '' : `<div class="sq-confetti${big ? ' gold' : ''}" aria-hidden="true">${Array.from({ length: big ? 36 : 28 }, (_, i) => `<i style="--x:${(i * 37) % 100}%;--d:${(i % 7) * 0.12}s;--r:${(i * 53) % 360}deg;--c:${i % 5}"></i>`).join('')}</div>`;
    const more = ui.queue.length ? `<p class="small muted">${esc(L('And there is more!'))}</p>` : '';
    const button = x ? `<button type="button" class="primary" data-sq-meet="${x.id}">${esc(ui.queue.length ? L('Next') : L('Squish it!'))}</button>` : `<button type="button" class="primary" data-sq-meet="">${esc(L('Keep playing'))}</button>`;
    let inner;
    if (!x) {
      /* a win that did not open a squishy: show the nearest challenge */
      const c = ctx(), next = C().CHALLENGES.filter(k => !c.unlocked.includes(k.id)).map(k => ({ k, pr: C().challengeProgress(k, c) })).sort((a, b) => b.pr.have / b.pr.need - a.pr.have / a.pr.need)[0];
      inner = `<span class="eyebrow">${esc(L('YOU WON!'))}</span><h2>${esc(L('Great job!'))}</h2>${next ? `<p>${esc(L('Next challenge:'))}</p><div class="sq-next-ch">${progressBar(next.pr, challengeText(next.k))}</div>` : `<p>${esc(L('You already have every squishy. Well done!'))}</p>`}${button}`;
    } else if (big) {
      const legend = tier === 'legendary';
      inner = `<div class="sq-trophy${legend ? ' legendary' : ''}" aria-hidden="true"><span class="sq-trophy-rays"></span><span class="sq-trophy-medal">${legend ? '👑' : '🏆'}</span></div>
        <span class="eyebrow">${esc(legend ? L('LEGENDARY ACHIEVEMENT') : L('RARE ACHIEVEMENT'))}</span><h2>${esc(legend ? L('Legendary squishy unlocked!') : L('Rare squishy unlocked!'))}</h2>
        <p class="sq-ach-name">${esc(L('You unlocked {name}!', { name: nameOf(x) }))}</p>
        <div class="sq-new sq-new-big${x.glow ? ' sq-new-glow' : ''}">${A().svg(x.id, nameOf(x))}</div>
        <p class="sq-ach-badge"><span aria-hidden="true">${BADGE_ICON[x.id] || '🏅'}</span> ${esc(L('Badge: {name}', { name: L(BADGE_NAME[x.id]) }))}<br><span class="muted">${esc(challengeText(ch))}</span></p>${more}${button}`;
    } else {
      inner = `<span class="eyebrow">${esc(L('NEW SQUISHY!'))}</span><h2>${esc(L('You unlocked {name}!', { name: nameOf(x) }))}</h2><div class="sq-new">${A().svg(x.id, nameOf(x))}</div><p class="sq-ach-badge"><span aria-hidden="true">${BADGE_ICON[x.id] || '🏅'}</span> ${esc(L('Badge: {name}', { name: L(BADGE_NAME[x.id]) }))}</p>${more}${button}`;
    }
    box.classList.toggle('final', tier === 'legendary');
    box.classList.toggle('rare', tier === 'rare');
    const shine = big && !reduced() ? '<div class="sq-burst" aria-hidden="true"></div><div class="sq-shine" aria-hidden="true"></div>' : '';
    box.innerHTML = `${conf}${shine}<div class="sq-celebrate-card card${big ? ' sq-ach ' + tier : ''}" role="dialog" aria-modal="true" aria-labelledby="sq-cele-title">${inner.replace('<h2>', '<h2 id="sq-cele-title">')}</div>`;
    box.hidden = false;
    box.querySelector('[data-sq-meet]')?.focus();
  }

  /* ---------- Clicks ---------- */
  document.addEventListener('click', e => {
    const t = e.target instanceof Element ? e.target : null;
    if (!t || !ui.root || !t.closest('.squishy-screen')) return;
    const view = t.closest('[data-sq-view]');
    if (view) { ui.view = view.dataset.sqView; ui.msg = ''; if (ui.view === 'guess') newGuess(); render(); return; }
    const snd = t.closest('[data-sq-sound]');
    if (snd) {
      const on = sounds().set(!sounds().get());
      ui.root.querySelectorAll('[data-sq-sound]').forEach(b => { b.setAttribute('aria-checked', String(on)); b.textContent = b.closest('.sq-play') ? (on ? '🔊' : '🔈') : `${on ? '🔊' : '🔈'} ${L('Sounds')}: ${on ? L('On') : L('Off')}`; });
      if (on) play('match');
      return;
    }
    const pick = t.closest('[data-sq-pick]');
    if (pick) { ui.msg = ''; openPlay(pick.dataset.sqPick); return; }
    if (t.closest('[data-sq-play-back]')) { closePlay(); if (window.MsbSpeech) MsbSpeech.stop(); render(); ui.root.querySelector('.sq-grid')?.scrollIntoView({ block: 'center' }); return; }
    const sheet = ui.root.querySelector('[data-sq-sheet]');
    if (t.closest('[data-sq-learn]') && pv && sheet) { sheet.innerHTML = cardHtml(pv.x); sheet.hidden = false; play('twinkle'); sheet.querySelector('button')?.focus(); return; }
    if (t.closest('[data-sq-sheet-close]') && sheet) { sheet.hidden = true; if (window.MsbSpeech) MsbSpeech.stop(); pv && pv.canvas.focus({ preventScroll: true }); return; }
    const lockedTile = t.closest('[data-sq-locked]');
    if (lockedTile) { const ch = C().challengeFor(lockedTile.dataset.sqLocked); ui.msg = ch ? L('To unlock it: {task}', { task: challengeText(ch) }) : L('Locked'); render(); ui.root.querySelector('.sq-msg')?.scrollIntoView({ block: 'center' }); return; }
    const star = t.closest('[data-sq-star]');
    if (star) {
      prog().addStar(star.dataset.sqStar); play('twinkle'); vibrate(15); afterProgress(false);
      if (sheet && pv) { sheet.innerHTML = cardHtml(pv.x); const c = ui.root.querySelector('.sq-count'); if (c) c.outerHTML = topBar().match(/<span class="sq-count"[^]*?<\/span>/)[0]; }
      else render();
      return;
    }
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
      const box = ui.root.querySelector('[data-sq-celebrate]');
      if (ui.queue.length) { celebrate(ui.queue.shift()); return; }
      if (!meet.dataset.sqMeet) { if (box) box.hidden = true; if (ui.view === 'memory') { newMemory(); render(); } else if (ui.view === 'questions') { newRound(); render(); } else render(); return; }
      ui.view = 'shelf'; ui.memory = null; ui.round = null; ui.msg = '';
      ui.playing = meet.dataset.sqMeet || null;
      render(); window.scrollTo({ top: 0, behavior: 'auto' });
    }
  });

  window.MsbSquishy = {
    open(root) { ui.root = root; stats().played(); render(); afterProgress(false); },
    close() { closePlay(); ui.root = null; ui.view = 'shelf'; ui.memory = null; ui.round = null; ui.guess = null; ui.msg = ''; if (window.MsbSpeech) MsbSpeech.stop(); },
    _celebrate: celebrate,
    /* read-only snapshot of the play view, for checks */
    _play() {
      if (!pv) return null;
      const r = pv.canvas.getBoundingClientRect(), b = pv.body, bb = b.bounds();
      return { id: pv.id, drawn: pv.drawn, tex: texture(pv.id, 'full').T, dpr: pv.dpr, glow: pv.glowNow, glowIntensity: pv.glowI, sparks: pv.sparks.length, mode: b.state.mode, stretch: b.state.stretch, squish: b.state.squish, mood: pv.mood, atRest: b.atRest(), area: b.area() / b.A0, w: bb.maxX - bb.minX, h: bb.maxY - bb.minY, minY: bb.minY, box: { x: r.left + pv.ox, y: r.top + pv.oy, size: b.size * pv.scale } };
    }
  };
})();
