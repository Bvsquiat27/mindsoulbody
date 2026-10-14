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
  const run = (fs, o = {}) => fs.forEach((f, i) => tone(f, { ...o, delay: (o.delay || 0) + i * (o.step || 0.09) }));
  const SOUND = {
    tap: () => tone(740, { dur: 0.06, peak: 0.03 }),
    pick: () => tone(880, { f1: 990, dur: 0.07, peak: 0.035 }),
    good: () => run([659, 880, 1175], { dur: 0.16, peak: 0.05, type: 'triangle' }),
    bad: () => { tone(330, { f1: 262, dur: 0.14, type: 'triangle', peak: 0.05 }); tone(294, { f1: 233, dur: 0.14, type: 'triangle', peak: 0.04, delay: 0.13 }); },
    win: () => run([523, 659, 784, 1047, 1319], { dur: 0.22, peak: 0.055, type: 'triangle', step: 0.11 }),
    badge: () => run([784, 988, 1175, 1568], { dur: 0.3, peak: 0.05, step: 0.12 }),
    whoosh: () => tone(300, { f1: 900, dur: 0.18, peak: 0.03, type: 'sawtooth' }),
    thud: () => tone(140, { f1: 70, dur: 0.18, peak: 0.07 }),
  };
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
  const badgeDefs = () => C().badgeDefs(totals()).filter(b => GAMES.some(g => g.id === b.game));

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
      + squishies.map(x => `<span class="kg-badge-pop kg-squishy-pop"><span aria-hidden="true">🧸</span> ${esc(t('New squishy: {name}!', '¡Nuevo squishy: {name}!', { name: x.name }))}</span>`).join('');
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
    const defs = badgeDefs();
    const badges = defs.map(b => { const got = v.badges[b.id]; return `<li class="kg-badge${got ? ' earned' : ''}"><span aria-hidden="true">${got ? b.icon : '🔒'}</span><strong>${esc(name(b.name))}</strong><small>${esc(got ? t('Earned', 'Ganada') : name(b.goal))}</small></li>`; }).join('');
    return `<button class="text-button back" type="button" data-kg-exit>${esc(t('← Stories', '← Historias'))}</button><span class="eyebrow">${esc(t('BIBLE GAMES · AGES 9+', 'JUEGOS BÍBLICOS · 9+ AÑOS'))}</span><h1>${esc(t('Bible games', 'Juegos bíblicos'))}</h1><p class="lead">${esc(t('Play, think, and finish each game with a verse to keep.', 'Juega, piensa y termina cada juego con un versículo para guardar.'))}</p><div class="kg-topbar">${soundButton()}</div><div class="kg-tiles">${tiles}</div><h2 class="kg-h2">${esc(t('Game badges', 'Insignias de juegos'))}</h2><p class="small muted">${esc(t('Earned {n} of {total}. They also show in your Kids\u2019 badges.', 'Ganadas {n} de {total}. También salen en tus Insignias de niños.', { n: defs.filter(b => v.badges[b.id]).length, total: defs.length }))}</p><ul class="kg-badges">${badges}</ul>`;
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
    _helpers: { t, esc, lang, name, sound, buzz, prog, award, render, verseHtml, gameHead, reduced, register }
  };
  window.MsbKidGames = api;
})();
