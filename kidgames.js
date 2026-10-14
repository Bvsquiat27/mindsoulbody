/* Kids' Bible games (ages 9+), opened from the Stories (little ones) page.
   Each game ends on a verse from the app's own KJV / RV1909 text. Progress
   and badges stay on this device in msb_kidgames (Export/Restore keeps it).
   Sounds follow the in-game switch; vibration follows the app's tap
   vibration setting; motion calms down with reduced motion. */
(() => {
  'use strict';
  const D = () => window.MsbKidGamesData;
  const C = () => window.MsbKidGamesCore;
  const es = () => !!(window.MsbI18n && MsbI18n.lang() === 'es');
  const lang = () => (es() ? 'es' : 'en');
  const t = (en, sp, vars) => { let s = es() ? sp : en; if (vars) for (const [k, v] of Object.entries(vars)) s = s.split(`{${k}}`).join(String(v)); return s; };
  const esc = v => String(v ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const reduced = () => !!(window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches);
  const mem = new Map();
  const memStore = { getItem: k => (mem.has(k) ? mem.get(k) : null), setItem: (k, v) => mem.set(k, String(v)) };
  const store = () => { try { return window.localStorage || memStore; } catch { return memStore; } };
  const prog = () => C().progress(store());
  const sounds = () => C().soundPref(store());

  /* ---------- Sound (Web Audio, made on the device) ---------- */
  let ac = null, master = null;
  function audio() {
    if (!sounds().get()) return null;
    if (window.MsbStories && MsbStories.bedtimeOn && MsbStories.bedtimeOn()) return null;
    if (!ac) {
      const Ctor = window.AudioContext || window.webkitAudioContext;
      if (!Ctor) return null;
      try { ac = new Ctor(); master = ac.createGain(); master.gain.value = 0.5; master.connect(ac.destination); } catch { ac = null; return null; }
    }
    if (ac.state === 'suspended') ac.resume().catch(() => {});
    return ac;
  }
  function tone(f0, o = {}) {
    const a = audio(); if (!a) return;
    try {
      const at = a.currentTime + (o.delay || 0), dur = o.dur || 0.14;
      const osc = a.createOscillator(), g = a.createGain();
      osc.type = o.type || 'sine'; osc.frequency.setValueAtTime(f0, at);
      if (o.f1) osc.frequency.exponentialRampToValueAtTime(o.f1, at + dur * 0.9);
      g.gain.setValueAtTime(0.0001, at); g.gain.exponentialRampToValueAtTime(o.peak || 0.05, at + 0.012); g.gain.exponentialRampToValueAtTime(0.0001, at + dur);
      osc.connect(g); g.connect(master); osc.start(at); osc.stop(at + dur + 0.05);
    } catch { /* ignore */ }
  }
  /* filtered noise: cracks, rain, whooshes, splashes */
  function noise(o = {}) {
    const a = audio(); if (!a) return;
    try {
      const at = a.currentTime + (o.delay || 0), dur = o.dur || 0.2;
      const len = Math.max(1, Math.floor(a.sampleRate * dur)), buf = a.createBuffer(1, len, a.sampleRate), d = buf.getChannelData(0);
      for (let i = 0; i < len; i += 1) d[i] = Math.random() * 2 - 1;
      const src = a.createBufferSource(), f = a.createBiquadFilter(), g = a.createGain();
      src.buffer = buf; f.type = o.filter || 'bandpass'; f.Q.value = o.q || 1;
      f.frequency.setValueAtTime(o.f0 || 1200, at); if (o.f1) f.frequency.exponentialRampToValueAtTime(o.f1, at + dur);
      g.gain.setValueAtTime(0.0001, at); g.gain.exponentialRampToValueAtTime(o.peak || 0.05, at + (o.attack || 0.008)); g.gain.exponentialRampToValueAtTime(0.0001, at + dur);
      src.connect(f); f.connect(g); g.connect(master); src.start(at); src.stop(at + dur + 0.05);
    } catch { /* ignore */ }
  }
  const run = (fs, o = {}) => fs.forEach((f, i) => tone(f, { ...o, delay: (o.delay || 0) + i * (o.step || 0.09) }));
  const SOUND = {
    tap: () => tone(740, { dur: 0.06, peak: 0.03 }),
    pick: () => tone(880, { f1: 990, dur: 0.07, peak: 0.035 }),
    good: () => run([659, 880, 1175], { dur: 0.16, peak: 0.05, type: 'triangle' }),
    bad: () => { tone(330, { f1: 262, dur: 0.14, type: 'triangle', peak: 0.05 }); tone(294, { f1: 233, dur: 0.14, type: 'triangle', peak: 0.04, delay: 0.13 }); },
    win: () => run([523, 659, 784, 1047, 1319], { dur: 0.22, peak: 0.055, type: 'triangle', step: 0.11 }),
    badge: () => run([784, 988, 1175, 1568], { dur: 0.3, peak: 0.05, step: 0.12 }),
    whoosh: () => tone(300, { f1: 900, dur: 0.18, peak: 0.03, type: 'sawtooth' }),
    thud: () => { tone(140, { f1: 70, dur: 0.18, peak: 0.07 }); noise({ filter: 'lowpass', f0: 500, dur: 0.12, peak: 0.04 }); },
    /* David's Sling */
    whirl: () => [0, 0.11, 0.22].forEach((d, i) => noise({ f0: 500 + i * 250, f1: 1400 + i * 300, q: 2, dur: 0.1, peak: 0.022, delay: d })),
    sling: () => { noise({ f0: 400, f1: 2600, q: 1.4, dur: 0.28, peak: 0.05 }); tone(220, { f1: 520, dur: 0.12, peak: 0.02, type: 'triangle' }); },
    crack: () => { noise({ filter: 'highpass', f0: 1800, dur: 0.09, peak: 0.07 }); [0.03, 0.07, 0.12].forEach(d => tone(1800 + Math.random() * 1600, { dur: 0.05, peak: 0.02, delay: d })); },
    clang: () => { tone(620, { dur: 0.5, peak: 0.04, type: 'square' }); tone(1480, { dur: 0.35, peak: 0.02 }); tone(2210, { dur: 0.25, peak: 0.012 }); },
    tock: () => { tone(420, { f1: 300, dur: 0.08, peak: 0.06, type: 'triangle' }); noise({ f0: 900, q: 4, dur: 0.05, peak: 0.03 }); },
    bong: () => { tone(330, { f1: 300, dur: 0.6, peak: 0.05 }); tone(660, { dur: 0.4, peak: 0.02 }); },
    hooray: () => { run([523, 659, 784, 1047, 1319, 1568], { dur: 0.24, peak: 0.05, type: 'triangle', step: 0.09 }); noise({ f0: 1500, q: 0.6, dur: 0.9, peak: 0.02, attack: 0.2, delay: 0.3 }); },
    giantfall: () => { tone(110, { f1: 50, dur: 0.7, peak: 0.08 }); noise({ filter: 'lowpass', f0: 380, dur: 0.6, peak: 0.06, delay: 0.25 }); },
    /* Ark Builder */
    knock: () => [0, 0.09].forEach(d => { tone(240, { f1: 170, dur: 0.07, peak: 0.06, type: 'triangle', delay: d }); noise({ f0: 700, q: 3, dur: 0.04, peak: 0.025, delay: d }); }),
    hop: () => { tone(500, { f1: 900, dur: 0.1, peak: 0.035, type: 'triangle' }); tone(650, { f1: 1150, dur: 0.1, peak: 0.03, type: 'triangle', delay: 0.12 }); },
    thunder: () => { noise({ filter: 'lowpass', f0: 600, f1: 80, dur: 1.4, peak: 0.08, attack: 0.03 }); tone(60, { f1: 40, dur: 1, peak: 0.05 }); },
    rain: () => noise({ filter: 'highpass', f0: 3000, dur: 1.2, peak: 0.018, attack: 0.3 }),
    rainbow: () => run([784, 988, 1175, 1568, 1976, 2349], { dur: 0.5, peak: 0.035, step: 0.07 }),
    combo: () => run([880, 1175, 1568], { dur: 0.1, peak: 0.04, step: 0.05, type: 'triangle' }),
    /* music stingers: little chords so levels open and close like a real game */
    start: () => { chord([392, 494, 587], { dur: 0.22, peak: 0.025, type: 'triangle' }); chord([523, 659, 784], { dur: 0.42, peak: 0.028, type: 'triangle', delay: 0.2 }); },
    fanfare: () => { chord([523, 659, 784], { dur: 0.2, peak: 0.025, type: 'triangle' }); chord([587, 740, 880], { dur: 0.2, peak: 0.025, type: 'triangle', delay: 0.18 }); chord([659, 831, 988], { dur: 0.2, peak: 0.025, type: 'triangle', delay: 0.36 }); chord([784, 988, 1175, 1568], { dur: 0.9, peak: 0.03, type: 'triangle', delay: 0.56 }); tone(196, { dur: 0.9, peak: 0.04, delay: 0.56 }); },
    sad: () => run([494, 440, 392, 330], { dur: 0.22, peak: 0.035, type: 'triangle', step: 0.16 }),
    star: () => { tone(1568, { dur: 0.25, peak: 0.04 }); tone(2349, { dur: 0.3, peak: 0.02, delay: 0.04 }); },
    record: () => run([1047, 1319, 1568, 2093], { dur: 0.16, peak: 0.035, step: 0.06 }),
    cheer: () => { noise({ f0: 1300, q: 0.5, dur: 0.7, peak: 0.025, attack: 0.08 }); run([659, 784], { dur: 0.12, peak: 0.03, type: 'triangle' }); },
    squash: () => tone(260, { f1: 140, dur: 0.12, peak: 0.05, type: 'triangle' }),
    /* Map Journey */
    stamp: () => { noise({ filter: 'lowpass', f0: 900, dur: 0.09, peak: 0.08 }); tone(150, { f1: 90, dur: 0.12, peak: 0.07 }); },
    page: () => noise({ f0: 2400, f1: 900, q: 0.7, dur: 0.22, peak: 0.03, attack: 0.04 }),
    coin: () => { tone(988, { dur: 0.08, peak: 0.035, type: 'square' }); tone(1319, { dur: 0.22, peak: 0.03, type: 'square', delay: 0.08 }); },
    wind: () => noise({ f0: 400, f1: 900, q: 0.8, dur: 1.4, peak: 0.025, attack: 0.5 }),
    wave: () => noise({ filter: 'lowpass', f0: 700, f1: 250, dur: 1.1, peak: 0.04, attack: 0.35 }),
    gull: () => { tone(1500, { f1: 1100, dur: 0.14, peak: 0.02 }); tone(1600, { f1: 1150, dur: 0.16, peak: 0.02, delay: 0.18 }); },
    bells: () => run([1319, 1175, 1047, 1175], { dur: 0.25, peak: 0.025, step: 0.14 }),
    steps: () => [0, 0.16, 0.32, 0.48].forEach(d => noise({ filter: 'lowpass', f0: 500, dur: 0.05, peak: 0.04, delay: d })),
  };
  function chord(fs, o = {}) { fs.forEach(f => tone(f, o)); }
  /* one cute call per animal: a short pitch pattern */
  function animalCall(i) {
    const base = [330, 392, 440, 523, 587, 659, 740, 784][i % 8];
    tone(base, { f1: base * 1.25, dur: 0.12, peak: 0.04, type: i % 2 ? 'triangle' : 'square' });
    tone(base * 1.5, { f1: base * 1.1, dur: 0.14, peak: 0.03, type: 'triangle', delay: 0.12 });
  }
  /* A burst of confetti, stars and doves over the screen (skipped with reduced motion). */
  function celebrate(kind) {
    if (reduced()) return;
    const host = document.body; if (!host) return;
    const box = document.createElement('div');
    box.className = 'kg-celebrate' + (kind === 'gold' ? ' gold' : ''); box.setAttribute('aria-hidden', 'true');
    const bits = ['★', '✦', '🕊️', '✿', '★', '✦', '❤'];
    box.innerHTML = Array.from({ length: 34 }, (_, i) => `<i style="--x:${(i * 29) % 100}vw;--d:${(i % 9) * 0.07}s;--r:${(i * 47) % 360}deg;--c:${['#ffd35a', '#7ad3ff', '#ff9db5', '#9be37a', '#c9a7ff'][i % 5]}">${bits[i % bits.length]}</i>`).join('');
    host.appendChild(box);
    setTimeout(() => box.remove(), 2600);
  }
  /* ---------- shared game feel: first-play coach, level card, floating text ---------- */
  const COACH_KEY = 'msb_kg_coach';
  function coachSeen(id) { try { return (JSON.parse(localStorage.getItem(COACH_KEY) || '[]') || []).includes(id); } catch { return false; } }
  function coachDone(id) { try { const v = JSON.parse(localStorage.getItem(COACH_KEY) || '[]') || []; if (!v.includes(id)) localStorage.setItem(COACH_KEY, JSON.stringify([...v, id].slice(-30))); } catch { /* private mode */ } }
  /* steps: [{ icon, text }] (already translated). Shown once per game, again from the "?" button. */
  function coach(id, title, steps, force) {
    if (!force && coachSeen(id)) return `<button type="button" class="kg-coach-again" data-kg-coach-show="${esc(id)}" aria-label="${esc(t('How to play', 'Cómo se juega'))}">?</button>`;
    return `<div class="kg-coach" role="dialog" aria-modal="false" aria-labelledby="kg-coach-t"><div class="kg-coach-card"><span class="eyebrow">${esc(t('HOW TO PLAY', 'CÓMO SE JUEGA'))}</span><h2 id="kg-coach-t">${esc(title)}</h2><ol>${steps.map((x, i) => `<li style="--i:${i}"><span class="kg-coach-ico" aria-hidden="true">${x.icon}</span><span>${esc(x.text)}</span></li>`).join('')}</ol><button type="button" class="primary" data-kg-coach-ok="${esc(id)}">${esc(t('Let’s go!', '¡Vamos!'))}</button></div></div>`;
  }
  /* The level card: stars pop in one by one, a "new best" ribbon and a small reward line. */
  function levelCard(o) {
    const n = Math.max(0, Math.min(3, o.stars || 0));
    const stars = `<div class="kg-lc-stars" role="img" aria-label="${esc(t('{n} of 3 stars', '{n} de 3 estrellas', { n }))}">${[1, 2, 3].map(k => `<i class="${k <= n ? 'on' : ''}" style="--k:${k}" aria-hidden="true">★</i>`).join('')}</div>`;
    return `<div class="kg-levelcard${o.lost ? ' lost' : ''}" role="status" aria-live="polite">${o.art ? `<div class="kg-lc-art" aria-hidden="true">${o.art}</div>` : ''}<span class="eyebrow">${esc(o.eyebrow)}</span><h2>${esc(o.title)}</h2>${o.lost ? '' : stars}${o.record ? `<span class="kg-lc-record">${esc(t('New best!', '¡Nuevo récord!'))}</span>` : ''}${o.text ? `<p>${esc(o.text)}</p>` : ''}${o.reward ? `<p class="kg-lc-reward"><span aria-hidden="true">🎁</span> ${esc(o.reward)}</p>` : ''}${o.extra || ''}<div class="kg-actions">${o.actions || ''}</div></div>`;
  }
  /* play the star pings in time with the card's animation */
  function starPings(n) { for (let k = 0; k < n; k += 1) setTimeout(() => { sound('star'); buzz(10); }, reduced() ? 0 : 450 + k * 260); }
  function floatText(host, text, xPct, yPct, cls) {
    if (!host || reduced()) return;
    const el = document.createElement('span');
    el.className = 'kg-float' + (cls ? ' ' + cls : ''); el.setAttribute('aria-hidden', 'true'); el.textContent = text;
    el.style.left = xPct + '%'; el.style.top = yPct + '%';
    host.appendChild(el); setTimeout(() => el.remove(), 1100);
  }
  const sound = n => { try { SOUND[n] && SOUND[n](); } catch { /* ignore */ } };
  /* Vibration follows the app's tap-vibration setting (Android only). */
  function buzz(pattern) {
    try { if (localStorage.getItem('msb_tap_vibration') === 'off') return; } catch { /* on */ }
    if (typeof navigator === 'undefined' || typeof navigator.vibrate !== 'function') return;
    try { navigator.vibrate(pattern); } catch { /* ignore */ }
  }

  /* ---------- Games list (each batch adds its games here) ---------- */
  const GAMES = [];
  const register = g => { GAMES.push(g); };
  const totals = () => Object.fromEntries(GAMES.map(g => [g.id, g.total ? g.total() : 0]));
  /* a retired game's badges stay visible to anyone who earned them */
  const badgeDefs = () => C().badgeDefs(totals()).filter(b => GAMES.some(g => g.id === b.game) || (b.retired && prog().get().badges[b.id]));

  const ui = { root: null, game: null, state: null, msg: '' };
  const name = o => (o && typeof o === 'object' ? o[lang()] || o.en : o);

  function soundButton() {
    const on = sounds().get();
    return `<button type="button" class="kg-chip kg-sound" role="switch" aria-checked="${on}" data-kg-sound>${on ? '🔊' : '🔈'} ${esc(t('Sounds', 'Sonidos'))}: ${esc(on ? t('On', 'Sí') : t('Off', 'No'))}</button>`;
  }
  /* Shared verse card: what every finished puzzle unlocks. */
  function verseHtml(v, heading, actions) {
    const l = lang();
    return `<div class="kg-verse" role="status" aria-live="polite"><span class="eyebrow">${esc(heading)}</span><blockquote class="kg-verse-text">${esc(v.text[l])}</blockquote><p class="kg-verse-ref">${esc(v.ref[l])} · ${l === 'es' ? 'RV1909' : 'KJV'}</p>${actions ? `<div class="kg-actions">${actions}</div>` : ''}</div>`;
  }
  function badgeToast(ids, squishies = []) {
    if ((!ids.length && !squishies.length) || !ui.root) return;
    const defs = badgeDefs();
    const list = ids.map(id => defs.find(b => b.id === id)).filter(Boolean);
    if (!list.length && !squishies.length) return;
    sound('badge'); buzz([20, 50, 30]);
    const box = ui.root.querySelector('[data-kg-badge-pop]');
    if (!box) return;
    box.innerHTML = list.map(b => `<span class="kg-badge-pop"><span aria-hidden="true">${b.icon}</span> ${esc(t('New badge: {name}', '¡Nueva insignia: {name}!', { name: name(b.name) }))}</span>`).join('')
      + squishies.map(x => `<span class="kg-badge-pop kg-squishy-pop tier-${esc(x.tier || 'common')}"><span aria-hidden="true">${x.tier === 'legendary' ? '👑' : x.tier === 'rare' ? '💎' : '🧸'}</span> ${esc(x.tier === 'legendary' ? t('LEGENDARY squishy: {name}!', '¡Squishy LEGENDARIO: {name}!', { name: x.name }) : x.tier === 'rare' ? t('Rare squishy: {name}!', '¡Squishy raro: {name}!', { name: x.name }) : t('New squishy: {name}!', '¡Nuevo squishy: {name}!', { name: x.name }))}<small>${esc(t('Open Bible squishies to celebrate', 'Abre Squishies de la Biblia para celebrar'))}</small></span>`).join('');
    box.hidden = false;
    clearTimeout(badgeToast.timer);
    badgeToast.timer = setTimeout(() => { if (box.isConnected) box.hidden = true; }, 4200);
  }
  const award = () => {
    const ids = prog().award(badgeDefs());
    const sq = window.MsbSquishy && MsbSquishy.gameProgress ? MsbSquishy.gameProgress() : [];
    badgeToast(ids, sq);
  };

  function hubHtml() {
    const v = prog().get();
    const tiles = GAMES.map(g => {
      const total = g.total ? g.total() : 0, done = (v.done[g.id] || []).length;
      const status = g.status ? g.status(v) : total ? t('{n} of {total} done', '{n} de {total} hechos', { n: Math.min(done, total), total }) : '';
      return `<button type="button" class="card kg-tile" data-kg-open="${g.id}"><span class="kg-tile-icon" aria-hidden="true">${g.icon}</span><span class="kg-tile-body"><strong>${esc(name(g.name))}</strong><span>${esc(name(g.blurb))}</span>${status ? `<small class="kg-tile-status">${esc(status)}</small>` : ''}</span></button>`;
    }).join('');
    /* Bible squishies and Manna Match moved here from Stories; their own
       screens still open through data-squishy-open / data-match-open */
    const extra = (window.MsbSquishy ? `<button type="button" class="card kg-tile kg-tile-art" data-squishy-open><span class="kg-tile-icon" aria-hidden="true">${window.MsbSquishyArt ? MsbSquishyArt.svg('lamb') : '🧸'}</span><span class="kg-tile-body"><strong>${esc(t('Bible squishies', 'Squishies de la Biblia'))}</strong><span>${esc(t('Squish a soft friend and learn its Bible story', 'Aprieta a un amiguito suave y aprende su historia de la Biblia'))}</span></span></button>` : '')
      + (window.MsbMatch ? `<button type="button" class="card kg-tile kg-tile-art" data-match-open><span class="kg-tile-icon" aria-hidden="true">${window.MsbMatchArt ? MsbMatchArt.svg('loaf') : '🍞'}</span><span class="kg-tile-body"><strong>${esc(t('Manna Match', 'Combina el maná'))}</strong><span>${esc(t('Match Bible pictures and learn a lesson in every level', 'Combina dibujos de la Biblia y aprende una lección en cada nivel'))}</span></span></button>` : '');
    const defs = badgeDefs();
    const badges = defs.map(b => { const got = v.badges[b.id]; return `<li class="kg-badge${got ? ' earned' : ''}"><span aria-hidden="true">${got ? b.icon : '🔒'}</span><strong>${esc(name(b.name))}</strong><small>${esc(got ? t('Earned', 'Ganada') : name(b.goal))}</small></li>`; }).join('');
    return `<button class="text-button back" type="button" data-kg-exit>${esc(t('← Stories', '← Historias'))}</button><span class="eyebrow">${esc(t('BIBLE GAMES', 'JUEGOS BÍBLICOS'))}</span><h1>${esc(t('Bible games', 'Juegos bíblicos'))}</h1><p class="lead">${esc(t('Play, think, and finish each game with a verse to keep.', 'Juega, piensa y termina cada juego con un versículo para guardar.'))}</p><div class="kg-topbar">${soundButton()}</div><div class="kg-tiles">${extra}${tiles}</div><h2 class="kg-h2">${esc(t('Game badges', 'Insignias de juegos'))}</h2><p class="small muted">${esc(t('Earned {n} of {total}. They also show in your Kids\u2019 badges.', 'Ganadas {n} de {total}. También salen en tus Insignias de niños.', { n: defs.filter(b => v.badges[b.id]).length, total: defs.length }))}</p><ul class="kg-badges">${badges}</ul>`;
  }

  function render() {
    const root = ui.root;
    if (!root || !root.isConnected) return;
    const g = GAMES.find(x => x.id === ui.game);
    const body = g ? g.render(ui) : hubHtml();
    root.innerHTML = `<div class="kg-screen${g ? ' kg-in-' + g.id : ''}${reduced() ? ' kg-calm' : ''}" data-i18n-skip>${body}<div class="kg-badge-pops" data-kg-badge-pop role="status" aria-live="polite" hidden></div></div>`;
    if (g && g.mount) g.mount(root.querySelector('.kg-screen'), ui);
  }
  const gameHead = (g, sub) => `<div class="kg-gamebar"><button class="text-button back" type="button" data-kg-hub>${esc(t('← Games', '← Juegos'))}</button>${soundButton()}</div><span class="eyebrow">${esc(name(g.eyebrow || g.name).toUpperCase())}</span><h1 class="kg-title">${esc(sub || name(g.name))}</h1>`;

  document.addEventListener('click', event => {
    if (!ui.root || !ui.root.contains(event.target)) return;
    const el = event.target;
    const cok = el.closest('[data-kg-coach-ok]');
    if (cok) { coachDone(cok.dataset.kgCoachOk); ui.coachForce = null; sound('start'); render(); return; }
    const cshow = el.closest('[data-kg-coach-show]');
    if (cshow) { ui.coachForce = cshow.dataset.kgCoachShow; sound('page'); render(); return; }
    if (el.closest('[data-kg-sound]')) { const on = sounds().set(!sounds().get()); el.closest('[data-kg-sound]').outerHTML = soundButton(); if (on) sound('pick'); return; }
    if (el.closest('[data-kg-hub]')) { const g = GAMES.find(x => x.id === ui.game); if (g && g.leave) g.leave(ui); ui.game = null; ui.state = null; sound('tap'); render(); window.scrollTo({ top: 0, behavior: 'auto' }); return; }
    const open = el.closest('[data-kg-open]');
    if (open) { const g = GAMES.find(x => x.id === open.dataset.kgOpen); if (!g) return; ui.game = g.id; ui.state = g.start ? g.start() : {}; prog().played(g.id); sound('pick'); render(); window.scrollTo({ top: 0, behavior: 'auto' }); return; }
    const g = GAMES.find(x => x.id === ui.game);
    if (g && g.click) g.click(event, ui);
  });

  const api = {
    open(root) { ui.root = root; render(); },
    close() { const g = GAMES.find(x => x.id === ui.game); if (g && g.leave) g.leave(ui); ui.root = null; ui.game = null; ui.state = null; },
    /* Badges for the Profile "Kids' badges" card */
    kidBadges() {
      if (!C() || !D()) return null;
      const v = prog().get();
      return badgeDefs().map(b => ({ id: b.id, name: name(b.name), icon: b.icon, tier: 'common', earned: v.badges[b.id] || null }));
    },
    _ui: ui,
    _helpers: { t, esc, lang, name, sound, buzz, prog, award, render, verseHtml, gameHead, reduced, register, celebrate, animalCall, noise, coach, coachSeen, levelCard, starPings, floatText, tone, chord }
  };
  window.MsbKidGames = api;
})();
