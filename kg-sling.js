/* David's Sling: a chain of colored stones rolls along a winding path toward
   Goliath. David stands in the middle and slings stones into the chain: tap
   or drag to aim, let go to throw, tap David (or Swap) to change stones.
   Three or more of a color pop, and when the gap closes the next match pops
   too (chain reaction). Power stones: slow, reverse and bomb. Clear the
   chain, then one last stone brings the giant down. If the chain reaches
   him, try again. Original cartoon art; reduced motion turns off the shakes,
   freezes and most particles. */
(() => {
  'use strict';
  const K = window.MsbKidGames; if (!K) return;
  const { t, esc, lang, sound, buzz, prog, award, render, verseHtml, gameHead, reduced, celebrate, coach, levelCard, starPings, tone, noise } = K._helpers;
  const D = () => window.MsbKidGamesData, C = () => window.MsbKidGamesCore;
  const S = () => D().SLING;
  const TAU = Math.PI * 2;
  /* five stone colors, each with its own mark so color is never the only cue */
  const STONES = [
    { fill: '#e5484d', dark: '#9c1f25', mark: 'circle', en: 'red', es: 'roja' },
    { fill: '#3b82f6', dark: '#1d4ea8', mark: 'triangle', en: 'blue', es: 'azul' },
    { fill: '#f5c518', dark: '#a37f00', mark: 'square', en: 'yellow', es: 'amarilla' },
    { fill: '#2fbf71', dark: '#16794a', mark: 'diamond', en: 'green', es: 'verde' },
    { fill: '#9b5de5', dark: '#5d2b9e', mark: 'star', en: 'purple', es: 'morada' },
  ];
  const POWER = { slow: { icon: '🐢', en: 'Slow!', es: '¡Lento!' }, reverse: { icon: '↩', en: 'Back up!', es: '¡Atrás!' }, bomb: { icon: '💥', en: 'Boom!', es: '¡Bum!' } };
  let raf = 0;
  const stop = () => { if (raf) cancelAnimationFrame(raf); raf = 0; };

  function start() { return { view: 'pick', at: 0 }; }
  function begin(s, i) {
    stop();
    const lv = S().levels[i], path = C().zumaPath(lv.path), z = C().zumaStart(lv);
    Object.assign(s, { view: 'play', at: i, z, path, cur: C().zumaNext(z), next: C().zumaNext(z), aim: -Math.PI / 2, shot: null, parts: [], texts: [], shake: 0, freeze: 0, time: 0, popped: 0, best: 0,
      gpose: 'idle', gT: 0, dpose: 'idle', dT: 0, final: false, falling: 0, won: false, lost: false, record: false, beat: 0, msg: '' });
  }
  const starRow = n => `<span class="kg-stars" aria-label="${esc(t('{n} of 3 stars', '{n} de 3 estrellas', { n }))}">${[1, 2, 3].map(k => `<i class="${k <= n ? 'on' : ''}" aria-hidden="true">★</i>`).join('')}</span>`;
  let moved = false;
  function pickHtml() {
    if (prog().migrateSling()) moved = true;
    const note = moved ? `<p class="kg-msg kg-new-sling" role="status">${esc(t('New Sling! Your cleared levels are open in the new game.', '¡Nueva Honda! Tus niveles superados están abiertos en el juego nuevo.'))}</p>` : '';
    const v = prog().get(), l = lang(), intro = S().intro;
    const lv = S().levels.map((x, i) => { const st = Number(v.best[`sling:${x.id}`]) || 0; const open = i === 0 || (v.done.sling || []).includes(S().levels[i - 1].id); return `<li><button type="button" class="card kg-pick zm-pick${st ? ' done' : ''}" ${open ? `data-sl-pick="${i}"` : 'disabled'}><span class="kg-pick-icon" aria-hidden="true">${open ? ['🏞️', '🌊', '🌀', '⛰️', '⛺'][i] || '🪨' : '🔒'}</span><span><strong>${esc(t('Level {n}', 'Nivel {n}', { n: i + 1 }))} · ${esc(x.title[l])}</strong><small>${esc(open ? t('{n} stones in the chain', '{n} piedras en la cadena', { n: x.count }) : t('Finish level {n} first', 'Termina primero el nivel {n}', { n: i }))}</small>${st ? starRow(st) : ''}</span></button></li>`; }).join('');
    return `${note}<blockquote class="kg-quote kg-sl-intro">“${esc(intro.text[l])}” <span class="kg-verse-ref">${esc(intro.ref[l])}</span></blockquote><p class="kg-lead">${esc(t('Stop the stones before they reach Goliath! Match 3 of a color to pop them.', '¡Detén las piedras antes de que lleguen a Goliat! Junta 3 del mismo color para reventarlas.'))}</p><ul class="kg-picks">${lv}</ul>`;
  }
  const stoneName = c => (lang() === 'es' ? STONES[c].es : STONES[c].en);
  function stoneDot(st, big) { const c = STONES[st.c]; return `<span class="zm-dot${big ? ' big' : ''}" style="--c:${c.fill};--d:${c.dark}" aria-hidden="true"><i class="m-${c.mark}"></i></span>`; }
  function playHtml(s) {
    const lv = S().levels[s.at], l = lang();
    const head = `<div class="zm-top"><span class="kg-chip">${esc(t('Level {n}', 'Nivel {n}', { n: s.at + 1 }))} · ${esc(lv.title[l])}</span><span class="kg-chip" data-zm-count>💥 ${s.popped}</span></div>`;
    const field = `<div class="zm-field" data-zm-field><canvas class="zm-canvas" data-sl-canvas tabindex="0" role="application" aria-roledescription="${esc(t('game', 'juego'))}" aria-label="${esc(t('Field: the stone chain rolls toward Goliath. Arrow keys aim, Space throws, S swaps.', 'Campo: la cadena de piedras rueda hacia Goliat. Las flechas apuntan, Espacio lanza, S cambia.'))}"></canvas><div class="zm-danger" data-zm-danger aria-hidden="true"></div></div>`;
    if (s.won) {
      const n = C().zumaStars(s.z.maxFrac), last = s.at + 1 >= S().levels.length;
      return `${head}${field}${levelCard({ eyebrow: t('THE GIANT FELL!', '¡CAYÓ EL GIGANTE!'), title: t('Level {n} complete', 'Nivel {n} completo', { n: s.at + 1 }), stars: n, record: s.record, text: t('{n} stones popped · best combo x{c}', '{n} piedras reventadas · mejor combo x{c}', { n: s.popped, c: Math.max(1, s.best) }), reward: last ? t('You beat every level, brave shepherd!', '¡Superaste todos los niveles, pastor valiente!') : t('Next level unlocked: a new path, faster stones', 'Siguiente nivel abierto: un camino nuevo y piedras más rápidas'), actions: `${!last ? `<button type="button" class="primary" data-sl-next>${esc(t('Next level', 'Siguiente nivel'))} →</button>` : ''}<button type="button" class="secondary" data-sl-again>${esc(t('Play again', 'Jugar otra vez'))}</button><button type="button" class="secondary" data-sl-list>${esc(t('Levels', 'Niveles'))}</button>` })}<div class="kg-lesson"><span class="eyebrow">${esc(t('COURAGE', 'VALENTÍA'))}</span><p>${esc(S().lesson[l])}</p></div>${verseHtml(lv.verse, t('A VERSE FOR COURAGE', 'UN VERSÍCULO PARA SER VALIENTE'), '')}`;
    }
    if (s.lost) return `${head}${field}${levelCard({ lost: true, art: '🪨', eyebrow: t('THE STONES REACHED GOLIATH', 'LAS PIEDRAS LLEGARON A GOLIAT'), title: t('So close!', '¡Casi!'), text: t('David trusted God and kept going. Try again!', 'David confió en Dios y siguió adelante. ¡Inténtalo otra vez!'), actions: `<button type="button" class="primary" data-sl-again>${esc(t('Try again', 'Intentar otra vez'))}</button><button type="button" class="secondary" data-sl-list>${esc(t('Levels', 'Niveles'))}</button>` })}${verseHtml(lv.verse, t('A VERSE FOR COURAGE', 'UN VERSÍCULO PARA SER VALIENTE'), '')}`;
    const tut = coach('sling', t('David’s Sling', 'La honda de David'), [
      { icon: '👆', text: t('Tap or drag to aim. Let go to sling the stone.', 'Toca o arrastra para apuntar. Suelta para lanzar la piedra.') },
      { icon: '🔴', text: t('Make 3 or more of a color touch to pop them. Gaps that close can pop again!', 'Junta 3 o más del mismo color para reventarlas. ¡Los huecos que se cierran pueden reventar otra vez!') },
      { icon: '🔁', text: t('Tap David or Swap to use your next stone.', 'Toca a David o Cambiar para usar tu siguiente piedra.') },
      { icon: '🛡️', text: t('Clear the chain, then hit Goliath to win. Do not let the stones reach him!', 'Vacía la cadena y luego golpea a Goliat para ganar. ¡No dejes que las piedras lleguen a él!') },
    ], K._ui.coachForce === 'sling');
    const hint = s.final ? t('Now aim at Goliath and let go!', '¡Ahora apunta a Goliat y suelta!') : s.msg || t('Tap or drag to aim, let go to throw.', 'Toca o arrastra para apuntar, suelta para lanzar.');
    return `${tut}${head}${field}<div class="zm-bar"><span class="zm-hold"><span class="small">${esc(t('Now', 'Ahora'))}</span>${stoneDot(s.cur, true)}<span class="sr-only">${esc(stoneName(s.cur.c))}</span></span><button type="button" class="secondary zm-swap" data-sl-swap aria-label="${esc(t('Swap: use the {b} stone next', 'Cambiar: usar la piedra {b}', { b: stoneName(s.next.c) }))}">🔁 ${esc(t('Swap', 'Cambiar'))}</button><span class="zm-hold"><span class="small">${esc(t('Next', 'Siguiente'))}</span>${stoneDot(s.next)}</span></div><p class="kg-msg" role="status" aria-live="polite" data-kg-msg>${esc(hint)}</p>`;
  }

  /* ---------- drawing ---------- */
  const rr = (g, x, y, w, h, r) => { g.beginPath(); if (g.roundRect) g.roundRect(x, y, w, h, r); else g.rect(x, y, w, h); };
  let bg = null, bgKey = '';
  function background(w, h, path) {
    const key = `${w}x${h}:${path.name}`; if (bg && bgKey === key) return bg;
    const c = document.createElement('canvas'); c.width = w; c.height = h;
    const g = c.getContext('2d'); if (!g) return null;
    const k = w / 360; g.setTransform(k, 0, 0, k, 0, 0);
    /* the valley of Elah from above: warm grass, a brook, flowers and rocks */
    const ground = g.createLinearGradient(0, 0, 0, 480); ground.addColorStop(0, '#b9d98a'); ground.addColorStop(0.5, '#a3cc72'); ground.addColorStop(1, '#8fbf5f');
    g.fillStyle = ground; g.fillRect(0, 0, 360, 480);
    g.fillStyle = 'rgba(255,255,255,.08)'; for (let i = 0; i < 40; i += 1) { g.beginPath(); g.ellipse((i * 97) % 360, (i * 61) % 480, 28, 12, 0, 0, TAU); g.fill(); }
    g.strokeStyle = 'rgba(120,200,240,.55)'; g.lineWidth = 9; g.lineCap = 'round'; g.beginPath(); g.moveTo(-10, 300); g.bezierCurveTo(90, 270, 120, 340, 200, 320); g.bezierCurveTo(280, 300, 300, 360, 370, 340); g.stroke();
    g.strokeStyle = 'rgba(255,255,255,.4)'; g.lineWidth = 2; g.beginPath(); g.moveTo(-10, 298); g.bezierCurveTo(90, 268, 120, 338, 200, 318); g.stroke();
    for (let i = 0; i < 26; i += 1) { const x = (i * 131) % 360, y = (i * 83 + 20) % 480; g.fillStyle = ['#ffd166', '#ff9db5', '#ffffff', '#c9a7ff'][i % 4]; for (let a = 0; a < 5; a += 1) { g.beginPath(); g.arc(x + Math.cos(a * 1.26) * 2.6, y + Math.sin(a * 1.26) * 2.6, 1.8, 0, TAU); g.fill(); } g.fillStyle = '#f4a300'; g.beginPath(); g.arc(x, y, 1.3, 0, TAU); g.fill(); }
    for (let i = 0; i < 12; i += 1) { const x = (i * 173 + 40) % 360, y = (i * 113 + 60) % 480; g.fillStyle = '#9e9a8f'; g.beginPath(); g.ellipse(x, y, 7, 5, 0.4, 0, TAU); g.fill(); g.fillStyle = 'rgba(255,255,255,.35)'; g.beginPath(); g.ellipse(x - 2, y - 2, 3, 1.6, 0.4, 0, TAU); g.fill(); }
    g.strokeStyle = '#6fa34a'; g.lineWidth = 1.4; for (let i = 0; i < 60; i += 1) { const x = (i * 59) % 360, y = (i * 137) % 480; g.beginPath(); g.moveTo(x, y + 5); g.lineTo(x - 2, y - 2); g.moveTo(x, y + 5); g.lineTo(x + 2, y - 3); g.stroke(); }
    /* the carved stone track */
    const line = (wd, col, dash) => { g.strokeStyle = col; g.lineWidth = wd; g.lineJoin = 'round'; g.lineCap = 'round'; g.setLineDash(dash || []); g.beginPath(); path.pts.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y))); g.stroke(); g.setLineDash([]); };
    line(34, 'rgba(60,40,20,.25)'); line(30, '#7a5a34'); line(25, '#b08a57'); line(19, '#9c7748'); line(2, 'rgba(255,240,210,.45)', [6, 8]);
    /* the giant's camp: tents and a dark pit at the end of the track */
    const e = path.goliath;
    g.fillStyle = 'rgba(40,25,10,.55)'; g.beginPath(); g.ellipse(e.x, e.y + 4, 20, 10, 0, 0, TAU); g.fill();
    for (const [dx, dy, cl] of [[-46, -10, '#e8d4b0'], [40, -4, '#d9b98a']]) { const x = e.x + dx, y = e.y + dy; if (x < 10 || x > 350) continue; g.fillStyle = cl; g.beginPath(); g.moveTo(x - 13, y + 9); g.lineTo(x, y - 9); g.lineTo(x + 13, y + 9); g.closePath(); g.fill(); g.strokeStyle = '#8a6a3a'; g.lineWidth = 1; g.stroke(); g.strokeStyle = '#c0392b'; g.beginPath(); g.moveTo(x, y - 9); g.lineTo(x, y - 17); g.stroke(); }
    bg = c; bgKey = key; return c;
  }
  function stoneArt(g, x, y, st, r, glow) {
    const c = STONES[st.c] || STONES[0];
    g.save(); g.translate(x, y);
    g.fillStyle = 'rgba(0,0,0,.22)'; g.beginPath(); g.ellipse(1.5, r * 0.75, r * 0.85, r * 0.35, 0, 0, TAU); g.fill();
    const gr = g.createRadialGradient(-r * 0.35, -r * 0.4, r * 0.15, 0, 0, r); gr.addColorStop(0, '#ffffff'); gr.addColorStop(0.18, c.fill); gr.addColorStop(1, c.dark);
    g.fillStyle = gr; g.beginPath(); g.arc(0, 0, r, 0, TAU); g.fill();
    if (glow) { g.strokeStyle = 'rgba(255,255,255,.9)'; g.lineWidth = 2; g.stroke(); }
    g.fillStyle = 'rgba(255,255,255,.75)';
    const m = r * 0.38; g.beginPath();
    if (c.mark === 'circle') g.arc(0, 1, m * 0.8, 0, TAU);
    else if (c.mark === 'triangle') { g.moveTo(0, -m); g.lineTo(m, m * 0.8); g.lineTo(-m, m * 0.8); g.closePath(); }
    else if (c.mark === 'square') g.rect(-m * 0.75, -m * 0.6, m * 1.5, m * 1.5);
    else if (c.mark === 'diamond') { g.moveTo(0, -m); g.lineTo(m, 0.1); g.lineTo(0, m * 1.1); g.lineTo(-m, 0.1); g.closePath(); }
    else { for (let i = 0; i < 10; i += 1) { const a = -Math.PI / 2 + i * Math.PI / 5, rr2 = i % 2 ? m * 0.45 : m; g.lineTo(Math.cos(a) * rr2, Math.sin(a) * rr2 + 1); } g.closePath(); }
    g.fill();
    if (st.p) { g.font = `${Math.round(r * 1.05)}px system-ui, sans-serif`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillStyle = '#fff'; g.strokeStyle = 'rgba(0,0,0,.5)'; g.lineWidth = 3; g.strokeText(POWER[st.p].icon, 0, 1); g.fillText(POWER[st.p].icon, 0, 1); }
    g.fillStyle = 'rgba(255,255,255,.55)'; g.beginPath(); g.ellipse(-r * 0.38, -r * 0.42, r * 0.28, r * 0.16, -0.6, 0, TAU); g.fill();
    g.restore();
  }
  /* Goliath: an original, exaggerated cartoon giant. Bronze helmet with a red
     plume, bronze scale armor, red tunic, a huge beard and a long spear.
     Poses: idle, angry, hit and falling. */
  function goliath(g, s, time) {
    const e = s.path.goliath, calm = reduced();
    const pose = s.falling > 0 ? 'fall' : s.gT > 0 ? s.gpose : (s.z.head / s.path.len > 0.7 || s.final) ? 'angry' : s.lost ? 'laugh' : 'idle';
    const sc = 0.82;
    g.save(); g.translate(e.x, e.y + 6);
    if (pose === 'fall') { const f = Math.min(1, s.falling); g.translate(f * 8, 0); g.rotate(-f * 1.45); }
    let shakeX = 0; if (!calm && (pose === 'angry' || pose === 'laugh')) shakeX = Math.sin(time * 40) * (pose === 'angry' ? 1.2 : 0.8);
    if (!calm && pose === 'hit') shakeX = Math.sin(time * 70) * 3;
    const breathe = calm ? 0 : Math.sin(time * 2.2) * 1.4;
    g.translate(shakeX, 0); g.scale(sc, sc);
    /* shadow */
    if (pose !== 'fall') { g.fillStyle = 'rgba(0,0,0,.25)'; g.beginPath(); g.ellipse(0, 2, 34, 7, 0, 0, TAU); g.fill(); }
    /* spear behind */
    g.strokeStyle = '#6b4a2b'; g.lineWidth = 5; g.lineCap = 'round'; g.beginPath(); g.moveTo(34, 4); g.lineTo(34, -128); g.stroke();
    g.fillStyle = '#c9d0d8'; g.strokeStyle = '#5c646d'; g.lineWidth = 1.5; g.beginPath(); g.moveTo(34, -146); g.lineTo(42, -126); g.lineTo(26, -126); g.closePath(); g.fill(); g.stroke();
    /* legs with bronze greaves and sandals */
    for (const lx of [-13, 13]) { g.fillStyle = '#e2b48a'; rr(g, lx - 8, -30, 16, 30, 6); g.fill(); const gv = g.createLinearGradient(lx - 8, 0, lx + 8, 0); gv.addColorStop(0, '#9c6a22'); gv.addColorStop(0.5, '#e8b75a'); gv.addColorStop(1, '#8a5a18'); g.fillStyle = gv; rr(g, lx - 9, -24, 18, 20, 5); g.fill(); g.fillStyle = '#5a3a1e'; rr(g, lx - 11, -3, 22, 6, 3); g.fill(); }
    g.translate(0, breathe);
    /* red tunic skirt with stripes */
    g.fillStyle = '#c62f2f'; g.beginPath(); g.moveTo(-30, -62); g.lineTo(30, -62); g.lineTo(36, -26); g.lineTo(-36, -26); g.closePath(); g.fill();
    g.fillStyle = '#e8b75a'; for (let x = -30; x <= 26; x += 12) { g.beginPath(); g.moveTo(x, -26); g.lineTo(x + 6, -26); g.lineTo(x + 5, -58); g.lineTo(x + 1, -58); g.closePath(); g.fill(); }
    /* barrel chest: bronze scale armor */
    const ar = g.createLinearGradient(-38, -120, 38, -60); ar.addColorStop(0, '#f0c66e'); ar.addColorStop(0.5, '#c98d2e'); ar.addColorStop(1, '#8a5a18');
    g.fillStyle = ar; g.beginPath(); g.ellipse(0, -90, 40, 34, 0, 0, TAU); g.fill();
    g.strokeStyle = 'rgba(90,55,15,.55)'; g.lineWidth = 1.2;
    for (let row = 0; row < 5; row += 1) for (let col = -3; col <= 3; col += 1) { const x = col * 10 + (row % 2) * 5, y = -112 + row * 10; if (Math.hypot(x / 40, (y + 90) / 34) > 0.95) continue; g.beginPath(); g.arc(x, y, 5, 0, Math.PI); g.stroke(); }
    g.fillStyle = '#7a4a1a'; rr(g, -38, -64, 76, 7, 3); g.fill();
    /* arms: the right one holds the spear; angry fists shake */
    const armUp = pose === 'angry' && !calm ? Math.sin(time * 12) * 4 : 0;
    g.fillStyle = '#e2b48a'; g.beginPath(); g.ellipse(-44, -86 + armUp, 10, 20, 0.35, 0, TAU); g.fill(); g.beginPath(); g.arc(-50, -66 + armUp, 9, 0, TAU); g.fill();
    g.beginPath(); g.ellipse(40, -88, 10, 18, -0.3, 0, TAU); g.fill(); g.beginPath(); g.arc(34, -72, 9, 0, TAU); g.fill();
    g.fillStyle = '#c98d2e'; g.beginPath(); g.arc(-40, -104, 12, Math.PI, 0); g.fill(); g.beginPath(); g.arc(38, -104, 12, Math.PI, 0); g.fill();
    /* the big head */
    const face = pose === 'angry' ? '#e89a7a' : pose === 'hit' ? '#ffffff' : '#e8b48c';
    g.fillStyle = face; g.beginPath(); g.ellipse(0, -136, 22, 22, 0, 0, TAU); g.fill();
    /* bushy beard */
    g.fillStyle = '#2b1a10'; g.beginPath(); g.moveTo(-22, -138); g.quadraticCurveTo(-26, -104, 0, -98); g.quadraticCurveTo(26, -104, 22, -138); g.quadraticCurveTo(12, -122, 0, -124); g.quadraticCurveTo(-12, -122, -22, -138); g.fill();
    for (let i = -2; i <= 2; i += 1) { g.beginPath(); g.arc(i * 8, -104 + Math.abs(i) * 2, 5, 0, TAU); g.fill(); }
    /* mouth */
    g.fillStyle = '#5a1a12';
    if (pose === 'laugh') { g.beginPath(); g.ellipse(0, -122, 8, 6, 0, 0, Math.PI); g.fill(); }
    else if (pose === 'hit' || pose === 'fall') { g.beginPath(); g.ellipse(0, -121, 5, 6, 0, 0, TAU); g.fill(); }
    else if (pose === 'angry') { g.fillRect(-7, -123, 14, 3); g.fillStyle = '#fff'; g.fillRect(-6, -123, 12, 1.6); }
    else { g.beginPath(); g.arc(0, -124, 5, 0.1, Math.PI - 0.1); g.fill(); }
    /* nose */
    g.fillStyle = pose === 'angry' ? '#d9705a' : '#d99a72'; g.beginPath(); g.ellipse(0, -133, 6, 5, 0, 0, TAU); g.fill();
    /* eyes and brows */
    const blink = !calm && pose === 'idle' && (time % 3.7) < 0.12;
    if (pose === 'hit' || pose === 'fall') { g.strokeStyle = '#2b1a10'; g.lineWidth = 2; for (const ex of [-8, 8]) { g.beginPath(); g.moveTo(ex - 3, -144); g.lineTo(ex + 3, -138); g.moveTo(ex + 3, -144); g.lineTo(ex - 3, -138); g.stroke(); } }
    else if (blink) { g.strokeStyle = '#2b1a10'; g.lineWidth = 2; g.beginPath(); g.moveTo(-11, -141); g.lineTo(-5, -141); g.moveTo(5, -141); g.lineTo(11, -141); g.stroke(); }
    else { g.fillStyle = '#fff'; g.beginPath(); g.ellipse(-8, -141, 4.2, 3.6, 0, 0, TAU); g.ellipse(8, -141, 4.2, 3.6, 0, 0, TAU); g.fill(); g.fillStyle = '#2b1a10'; g.beginPath(); g.arc(-7, -140.5, 2, 0, TAU); g.arc(7, -140.5, 2, 0, TAU); g.fill(); }
    g.strokeStyle = '#2b1a10'; g.lineWidth = 3.4; g.lineCap = 'round'; g.beginPath();
    if (pose === 'angry') { g.moveTo(-14, -151); g.lineTo(-3, -146); g.moveTo(14, -151); g.lineTo(3, -146); } else { g.moveTo(-13, -148); g.lineTo(-4, -149); g.moveTo(13, -148); g.lineTo(4, -149); }
    g.stroke();
    /* bronze helmet with cheek guards and a tall red plume */
    const hl = g.createLinearGradient(-24, -170, 24, -140); hl.addColorStop(0, '#f6d27e'); hl.addColorStop(1, '#a06a1e');
    g.fillStyle = hl; g.beginPath(); g.arc(0, -146, 24, Math.PI, 0); g.lineTo(24, -142); g.lineTo(-24, -142); g.closePath(); g.fill();
    g.fillStyle = '#8a5a18'; rr(g, -26, -150, 52, 6, 3); g.fill();
    g.fillStyle = '#c98d2e'; g.beginPath(); g.moveTo(-24, -146); g.lineTo(-20, -126); g.lineTo(-15, -146); g.closePath(); g.fill(); g.beginPath(); g.moveTo(24, -146); g.lineTo(20, -126); g.lineTo(15, -146); g.closePath(); g.fill();
    g.fillStyle = '#c62f2f'; g.beginPath(); g.moveTo(-4, -170); g.quadraticCurveTo(-30, -196, -2, -200); g.quadraticCurveTo(26, -198, 12, -170); g.closePath(); g.fill();
    g.strokeStyle = '#8e1c1c'; g.lineWidth = 1.2; for (let i = -2; i <= 2; i += 1) { g.beginPath(); g.moveTo(i * 4 + 2, -170); g.quadraticCurveTo(i * 6, -186, i * 5, -196); g.stroke(); }
    /* angry steam, dizzy stars */
    if (pose === 'angry' && !calm) { g.fillStyle = 'rgba(255,255,255,.7)'; for (const sx of [-30, 30]) { const f = (time * 1.5 + (sx > 0 ? 0.5 : 0)) % 1; g.beginPath(); g.arc(sx + sx * f * 0.3, -160 - f * 20, 4 + f * 5, 0, TAU); g.globalAlpha = 1 - f; g.fill(); g.globalAlpha = 1; } }
    if ((pose === 'hit' || pose === 'fall') && !calm) { g.fillStyle = '#ffd35a'; for (let i = 0; i < 4; i += 1) { const a = time * 5 + i * TAU / 4; g.font = '12px system-ui'; g.fillText('★', Math.cos(a) * 26 - 5, -172 + Math.sin(a) * 6); } }
    g.restore();
    /* "Ha ha!" when the chain reaches him */
    if (s.lost) { g.font = 'bold 15px system-ui, sans-serif'; g.textAlign = 'center'; g.lineWidth = 4; g.strokeStyle = 'rgba(0,0,0,.5)'; g.fillStyle = '#fff'; const tx = Math.min(320, Math.max(40, e.x)), ty = Math.max(20, e.y - 150); g.strokeText(t('Ha ha!', '¡Ja ja!'), tx, ty); g.fillText(t('Ha ha!', '¡Ja ja!'), tx, ty); }
    /* the target ring for the final stone */
    if (s.final && !s.won && !s.falling) { const r = 34 + (calm ? 0 : Math.sin(time * 6) * 4); g.strokeStyle = 'rgba(255,211,90,.95)'; g.lineWidth = 3; g.setLineDash([6, 6]); g.beginPath(); g.arc(e.x, e.y - 100 * sc, r, 0, TAU); g.stroke(); g.setLineDash([]); }
  }
  /* David in the middle: turns to aim, whirls the sling, cheers, worries, jumps */
  function david(g, s, time) {
    const d = s.path.david, calm = reduced();
    const pose = s.won ? 'win' : s.lost ? 'sad' : s.dT > 0 ? s.dpose : (s.z.head / s.path.len > 0.7 ? 'worried' : 'idle');
    const hop = (pose === 'win' || pose === 'cheer') && !calm ? -Math.abs(Math.sin(time * 10)) * 6 : 0;
    g.save(); g.translate(d.x, d.y);
    /* a flat rock to stand on */
    g.fillStyle = 'rgba(0,0,0,.2)'; g.beginPath(); g.ellipse(0, 22, 32, 10, 0, 0, TAU); g.fill();
    const rk = g.createLinearGradient(0, 8, 0, 28); rk.addColorStop(0, '#cfc6b8'); rk.addColorStop(1, '#8f877b'); g.fillStyle = rk; g.beginPath(); g.ellipse(0, 18, 30, 10, 0, 0, TAU); g.fill();
    /* the aim guide is drawn by the caller; here the body */
    g.translate(0, hop);
    g.fillStyle = '#e8b64c'; g.beginPath(); g.moveTo(-10, -4); g.lineTo(10, -4); g.lineTo(13, 16); g.lineTo(-13, 16); g.closePath(); g.fill();
    g.fillStyle = '#8b5a2b'; g.fillRect(-11, 4, 22, 3);
    g.fillStyle = '#a0703c'; rr(g, 6, 6, 8, 8, 2); g.fill();
    /* head */
    const bob = calm ? 0 : Math.sin(time * 3) * 0.7;
    g.fillStyle = '#f5cfa6'; g.beginPath(); g.arc(0, -14 + bob, 11, 0, TAU); g.fill();
    g.fillStyle = '#7b4a2a'; for (const [cx, cy, r] of [[-7, -20, 4.6], [-1, -23, 5], [5, -22, 4.6], [9, -17, 3.6], [-10, -14, 3.2]]) { g.beginPath(); g.arc(cx, cy + bob, r, 0, TAU); g.fill(); }
    const blink = !calm && (time % 3.1) < 0.12;
    if (blink || pose === 'win') { g.strokeStyle = '#3a2a20'; g.lineWidth = 1.4; g.beginPath(); g.arc(-3.5, -13 + bob, 1.6, Math.PI * 1.1, Math.PI * 1.9); g.moveTo(6.1, -13.5 + bob); g.arc(4.5, -13 + bob, 1.6, Math.PI * 1.1, Math.PI * 1.9); g.stroke(); }
    else { g.fillStyle = '#3a2a20'; g.beginPath(); g.arc(-3.5, -14 + bob, 1.5, 0, TAU); g.arc(4.5, -14 + bob, 1.5, 0, TAU); g.fill(); }
    g.fillStyle = 'rgba(255,140,140,.5)'; g.beginPath(); g.ellipse(-7, -10 + bob, 2.4, 1.4, 0, 0, TAU); g.ellipse(8, -10 + bob, 2.4, 1.4, 0, 0, TAU); g.fill();
    g.strokeStyle = '#7a3a2a'; g.lineWidth = 1.3; g.beginPath();
    if (pose === 'sad' || pose === 'worried') g.arc(0.5, -6 + bob, 2.4, 1.15 * Math.PI, 1.85 * Math.PI); else g.arc(0.5, -10 + bob, pose === 'cheer' || pose === 'win' ? 3.4 : 2.6, 0.15 * Math.PI, 0.85 * Math.PI);
    g.stroke();
    if (pose === 'worried' && !calm) { g.fillStyle = '#7ad3ff'; g.beginPath(); g.moveTo(12, -22); g.quadraticCurveTo(16, -15, 12, -13); g.quadraticCurveTo(8, -15, 12, -22); g.fill(); }
    /* the sling arm follows the aim; the stone whirls in the pouch */
    const a = s.aim, throwing = s.dT > 0 && s.dpose === 'throw';
    const hx = Math.cos(a) * 16, hy = -2 + Math.sin(a) * 16;
    g.strokeStyle = '#f2c9a0'; g.lineWidth = 4; g.lineCap = 'round'; g.beginPath(); g.moveTo(6, 0); g.lineTo(hx, hy); g.stroke();
    if (pose === 'win' || pose === 'cheer') { g.beginPath(); g.moveTo(-6, 0); g.lineTo(-12, -24); g.stroke(); }
    if (!s.won && !s.lost) {
      const whirl = throwing ? 0 : (calm ? 0 : time * 9);
      const px = hx + Math.cos(a + Math.sin(whirl) * 0.5) * 12, py = hy + Math.sin(a + Math.sin(whirl) * 0.5) * 12;
      g.strokeStyle = '#7a5a3a'; g.lineWidth = 1.6; g.beginPath(); g.moveTo(hx, hy); g.lineTo(px, py); g.stroke();
      if (!s.shot) stoneArt(g, px, py, s.cur, 8);
      /* the next stone peeks out of the shepherd's bag */
      stoneArt(g, 13, 13, s.next, 4.5);
    }
    g.restore();
  }
  /* where a shot would first touch the chain, for the aim guide */
  function aimGuide(s) {
    const d = s.path.david, dx = Math.cos(s.aim), dy = Math.sin(s.aim);
    for (let k = 20; k < 620; k += 6) {
      const x = d.x + dx * k, y = d.y + dy * k;
      if (x < -10 || x > 370 || y < -10 || y > 490) return { x, y, hit: false };
      if (s.final) { const e = s.path.goliath; if (Math.hypot(x - e.x, y - (e.y - 82)) < 34) return { x, y, hit: true }; }
      else if (C().zumaHit(s.z, s.path, x, y) >= 0) return { x, y, hit: true };
    }
    return null;
  }
  function draw(cv, s) {
    const g = cv.getContext('2d'); if (!g) return;
    const k = cv.width / 360, b = background(cv.width, cv.height, s.path), time = s.time;
    const sh = s.shake > 0 && !reduced() ? s.shake * 7 : 0, ox = sh ? (Math.random() - 0.5) * sh : 0, oy = sh ? (Math.random() - 0.5) * sh : 0;
    g.setTransform(1, 0, 0, 1, 0, 0);
    if (b) g.drawImage(b, ox * k, oy * k);
    g.setTransform(k, 0, 0, k, ox * k, oy * k);
    /* aim guide */
    if (!s.won && !s.lost && !s.shot) {
      const end = aimGuide(s), d = s.path.david;
      if (end) { g.strokeStyle = end.hit ? 'rgba(255,255,255,.85)' : 'rgba(255,255,255,.4)'; g.lineWidth = 2; g.setLineDash([3, 7]); g.lineDashOffset = -time * 30; g.beginPath(); g.moveTo(d.x + Math.cos(s.aim) * 26, d.y + Math.sin(s.aim) * 26); g.lineTo(end.x, end.y); g.stroke(); g.setLineDash([]); if (end.hit) { g.strokeStyle = STONES[s.cur.c].fill; g.lineWidth = 2.5; g.beginPath(); g.arc(end.x, end.y, 6, 0, TAU); g.stroke(); } }
    }
    /* the chain: front first so the back sits under it */
    const z = s.z;
    for (let i = z.balls.length - 1; i >= 0; i -= 1) {
      const dd = C().zumaPos(z, i); if (dd < 0) continue;
      const p = s.path.at(dd), bl = z.balls[i];
      const roll = reduced() ? 0 : Math.sin(dd / 6) * 0.6;
      stoneArt(g, p.x, p.y + roll, bl, C().ZUMA.R, !!bl.p);
    }
    goliath(g, s, time);
    david(g, s, time);
    if (s.shot) { const sp = s.shot; if (!reduced()) for (let i = 1; i <= 4; i += 1) { g.globalAlpha = 0.18 * (5 - i) / 4; stoneArt(g, sp.x - sp.vx * 0.012 * i, sp.y - sp.vy * 0.012 * i, sp, C().ZUMA.R * (1 - i * 0.1)); } g.globalAlpha = 1; stoneArt(g, sp.x, sp.y, sp, C().ZUMA.R); }
    for (const q of s.parts) {
      const a = Math.max(0, 1 - q.age / q.life); g.globalAlpha = a; g.fillStyle = q.c;
      if (q.kind === 'ring') { g.strokeStyle = q.c; g.lineWidth = 3 * a; g.beginPath(); g.arc(q.x, q.y, 6 + q.age * 90, 0, TAU); g.stroke(); }
      else { g.beginPath(); g.arc(q.x, q.y, q.s * (0.4 + a * 0.6), 0, TAU); g.fill(); }
      g.globalAlpha = 1;
    }
    for (const q of s.texts) {
      const a = Math.max(0, 1 - q.age / q.life), sc = q.age < 0.15 ? 0.6 + q.age / 0.15 * 0.6 : 1.2 - Math.min(0.2, (q.age - 0.15));
      g.save(); g.translate(q.x, q.y - q.age * 30); g.scale(sc, sc); g.globalAlpha = a; g.font = `900 ${q.size}px system-ui, sans-serif`; g.textAlign = 'center'; g.lineWidth = 5; g.strokeStyle = 'rgba(40,20,0,.55)'; g.fillStyle = q.c; g.strokeText(q.text, 0, 0); g.fillText(q.text, 0, 0); g.restore();
    }
    g.globalAlpha = 1;
  }

  /* ---------- feel: particles, words, sounds ---------- */
  const popSound = combo => { const f = 520 * Math.pow(1.19, Math.min(8, combo - 1)); tone(f, { f1: f * 1.5, dur: 0.12, peak: 0.05, type: 'triangle' }); tone(f * 1.5, { dur: 0.16, peak: 0.03, delay: 0.06 }); noise({ f0: 2400, q: 1.2, dur: 0.08, peak: 0.03 }); };
  const POW_SOUND = {
    slow: () => tone(660, { f1: 220, dur: 0.6, peak: 0.05, type: 'triangle' }),
    reverse: () => { tone(300, { f1: 900, dur: 0.25, peak: 0.04, type: 'sawtooth' }); tone(900, { f1: 300, dur: 0.25, peak: 0.03, type: 'sawtooth', delay: 0.22 }); },
    bomb: () => { sound('thud'); noise({ filter: 'lowpass', f0: 900, f1: 120, dur: 0.6, peak: 0.08 }); },
  };
  function say(s, text, x, y, c = '#fff', size = 18) { s.texts.push({ text, x, y, c, size, age: 0, life: 1.1 }); }
  function burstAt(s, x, y, color, n) { const few = reduced() ? 3 : n; for (let i = 0; i < few; i += 1) { const a = Math.random() * TAU, sp = 40 + Math.random() * 140; s.parts.push({ x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, g: 160, s: 2 + Math.random() * 3, c: i % 3 ? color : '#fff6c9', age: 0, life: 0.6 + Math.random() * 0.4 }); } if (!reduced()) s.parts.push({ kind: 'ring', x, y, c: color, age: 0, life: 0.4 }); }

  function landShot(ui, s, i, x, y) {
    const k = C().zumaInsert(s.z, s.path, i, s.shot, x, y);
    s.shot = null; sound('tock'); buzz(6);
    const ev = C().zumaResolve(s.z, k);
    if (!ev.length) { s.streak = 0; s.cur = s.next; s.next = C().zumaNext(s.z); return; }
    let total = 0;
    ev.forEach((e, n) => {
      total += e.count; s.popped += e.count;
      const mid = s.path.at(Math.max(0, C().zumaPos(s.z, Math.max(0, e.from - 1)))), col = STONES[e.color].fill;
      setTimeout(() => popSound(e.combo), n * 140);
      for (let j = 0; j < e.count; j += 1) { const p = s.path.at(Math.max(0, C().zumaPos(s.z, e.from) + (e.count - j) * C().ZUMA.D * 0.5)); burstAt(s, p.x, p.y, col, 6); }
      if (e.combo > 1) say(s, t('Chain x{n}!', '¡Cadena x{n}!', { n: e.combo }), mid.x, mid.y - 16, '#ffd35a', 22);
      else say(s, `+${e.count}`, mid.x, mid.y - 12, '#ffffff', 18);
      for (const pw of e.powers) { POW_SOUND[pw](); say(s, lang() === 'es' ? POWER[pw].es : POWER[pw].en, mid.x, mid.y - 34, pw === 'bomb' ? '#ff9b5a' : '#7ad3ff', 22); if (pw === 'bomb') { s.shake = 0.5; buzz([30, 20, 40]); } }
    });
    const combo = ev.length; s.best = Math.max(s.best, combo);
    s.streak = (s.streak || 0) + 1;
    if (combo > 1 || total >= 5) { s.freeze = reduced() ? 0 : 0.08; s.gpose = 'hit'; s.gT = 0.5; s.dpose = 'cheer'; s.dT = 0.9; sound('combo'); buzz([15, 25, 30]); if (!reduced()) s.shake = Math.max(s.shake, 0.25); }
    else { s.dpose = 'cheer'; s.dT = 0.5; buzz(12); }
    if (s.streak >= 3) say(s, t('{n} in a row!', '¡{n} seguidas!', { n: s.streak }), 180, 470, '#ffd35a', 16);
    const cnt = document.querySelector('[data-zm-count]'); if (cnt) cnt.textContent = `💥 ${s.popped}`;
    if (s.z.cleared) { s.final = true; sound('fanfare'); s.gpose = 'angry'; s.gT = 1; const m = document.querySelector('[data-kg-msg]'); if (m) m.textContent = t('Now aim at Goliath and let go!', '¡Ahora apunta a Goliat y suelta!'); }
    s.cur = s.next; s.next = C().zumaNext(s.z);
    if (s.final) { s.cur = { c: s.cur.c }; }
  }
  function refreshBar(s) {
    const bar = document.querySelector('.zm-bar'); if (!bar) return;
    const holds = bar.querySelectorAll('.zm-hold');
    if (holds[0]) holds[0].innerHTML = `<span class="small">${esc(t('Now', 'Ahora'))}</span>${stoneDot(s.cur, true)}<span class="sr-only">${esc(stoneName(s.cur.c))}</span>`;
    if (holds[1]) holds[1].innerHTML = `<span class="small">${esc(t('Next', 'Siguiente'))}</span>${stoneDot(s.next)}`;
    const sw = bar.querySelector('[data-sl-swap]'); if (sw) sw.setAttribute('aria-label', t('Swap: use the {b} stone next', 'Cambiar: usar la piedra {b}', { b: stoneName(s.next.c) }));
  }
  function swap(s) { if (s.won || s.lost) return; [s.cur, s.next] = [s.next, s.cur]; sound('pick'); buzz(5); refreshBar(s); }
  function shoot(ui) {
    const s = ui.state;
    if (s.shot || s.won || s.lost || s.falling) return;
    const d = s.path.david, v = C().ZUMA.shot;
    s.shot = { ...s.cur, x: d.x + Math.cos(s.aim) * 22, y: d.y + Math.sin(s.aim) * 22, vx: Math.cos(s.aim) * v, vy: Math.sin(s.aim) * v };
    s.dpose = 'throw'; s.dT = 0.25; sound('sling'); buzz(8);
    loop(ui);
  }
  function finish(ui, won) {
    const s = ui.state, lv = S().levels[s.at];
    if (won) {
      const n = C().zumaStars(s.z.maxFrac);
      s.record = n > (Number(prog().get().best[`sling:${lv.id}`]) || 0);
      prog().finish('sling', lv.id); prog().best(`sling:${lv.id}`, n);
      s.won = true; sound('fanfare'); starPings(n); if (s.record) setTimeout(() => sound('record'), 1500); setTimeout(() => sound('hooray'), 600);
      buzz([20, 40, 30, 40, 60]); celebrate('gold'); render(); award();
    } else { s.lost = true; sound('sad'); buzz([40, 30, 40]); render(); }
    window.scrollTo({ top: 0, behavior: 'auto' });
  }

  /* one loop while the level runs; it pauses when hidden or while the tutorial is open */
  function loop(ui) {
    if (raf) return;
    const s = ui.state, cv = document.querySelector('[data-sl-canvas]'); if (!cv) return;
    let last = performance.now();
    const frame = now => {
      raf = 0;
      if (!cv.isConnected || ui.state !== s || s.view !== 'play') return;
      const dt = Math.min(0.04, (now - last) / 1000); last = now;
      const paused = document.hidden || !!document.querySelector('.kg-coach');
      if (!paused) {
        s.time += dt;
        const frozen = s.freeze > 0; if (frozen) s.freeze -= dt;
        if (!frozen) {
          if (!s.final && !s.won && !s.lost) C().zumaStep(s.z, dt, s.path);
          if (s.z.lost && !s.lost) { s.gpose = 'laugh'; finish(ui, false); return; }
          if (s.shot) {
            const sp = s.shot, steps = 3;
            for (let i = 0; i < steps && s.shot; i += 1) {
              sp.x += sp.vx * dt / steps; sp.y += sp.vy * dt / steps;
              if (s.final) { const e = s.path.goliath; if (Math.hypot(sp.x - e.x, sp.y - (e.y - 82)) < 36) { s.shot = null; s.gpose = 'hit'; s.gT = 0.6; s.freeze = reduced() ? 0 : 0.18; s.shake = 0.6; sound('bong'); sound('crack'); buzz([40, 30, 60]); burstAt(s, e.x, e.y - 82, '#ffd35a', 22); say(s, t('Down he goes!', '¡Al suelo!'), 180, 120, '#ffd35a', 24); s.falling = 0.001; sound('giantfall'); } }
              else { const hit = C().zumaHit(s.z, s.path, sp.x, sp.y); if (hit >= 0) { landShot(ui, s, hit, sp.x, sp.y); refreshBar(s); } }
              if (s.shot && (sp.x < -20 || sp.x > 380 || sp.y < -20 || sp.y > 500)) { s.shot = null; s.cur = s.next; s.next = C().zumaNext(s.z); refreshBar(s); }
            }
          }
          if (s.falling > 0) { s.falling += dt * 0.9; if (s.falling >= 1.15 && !s.won) { s.falling = 1; finish(ui, true); return; } }
          for (const q of s.parts) { q.age += dt; q.x += (q.vx || 0) * dt; q.y += (q.vy || 0) * dt; q.vy = (q.vy || 0) + (q.g || 0) * dt; }
          s.parts = s.parts.filter(q => q.age < q.life);
          for (const q of s.texts) q.age += dt; s.texts = s.texts.filter(q => q.age < q.life);
          s.shake = Math.max(0, s.shake - dt * 1.6); s.gT = Math.max(0, s.gT - dt); s.dT = Math.max(0, s.dT - dt);
        }
        /* danger: a red glow and a heartbeat when the chain is close */
        const frac = s.z.head / s.path.len, dz = document.querySelector('[data-zm-danger]');
        if (dz) dz.style.opacity = !s.final && frac > 0.72 ? String(Math.min(1, (frac - 0.72) / 0.2)) : '0';
        if (!s.final && frac > 0.78 && !s.won && !s.lost) { s.beat -= dt; if (s.beat <= 0) { s.beat = Math.max(0.45, 1.2 - (frac - 0.78) * 3); tone(70, { f1: 50, dur: 0.12, peak: 0.06 }); tone(70, { f1: 50, dur: 0.12, peak: 0.045, delay: 0.16 }); } }
        draw(cv, s);
      }
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);
  }
  function size(cv) {
    const w = Math.min(cv.parentElement.clientWidth || 340, 520), dpr = Math.min(2, window.devicePixelRatio || 1);
    cv.style.width = `${w}px`; cv.style.height = `${w * 4 / 3}px`;
    cv.width = Math.round(w * dpr); cv.height = Math.round(w * 4 / 3 * dpr);
  }
  function mount(screen, ui) {
    stop();
    const s = ui.state, cv = screen.querySelector('[data-sl-canvas]');
    if (!cv || s.view !== 'play') return;
    size(cv); draw(cv, s);
    if (s.won || s.lost) { if (s.won && !reduced()) loop(ui); return; }
    loop(ui);
    const toWorld = e => { const r = cv.getBoundingClientRect(); return { x: (e.clientX - r.left) / r.width * 360, y: (e.clientY - r.top) / r.height * 480 }; };
    const aimAt = p => { const d = s.path.david; s.aim = Math.atan2(p.y - d.y, p.x - d.x); };
    let down = null;
    cv.addEventListener('pointerdown', e => {
      e.preventDefault(); const p = toWorld(e), d = s.path.david;
      if (Math.hypot(p.x - d.x, p.y - d.y) < 26) { swap(s); return; }
      down = e.pointerId; aimAt(p); try { cv.setPointerCapture(e.pointerId); } catch { /* ignore */ }
    });
    cv.addEventListener('pointermove', e => { if (down === e.pointerId) aimAt(toWorld(e)); else if (e.pointerType === 'mouse') aimAt(toWorld(e)); });
    cv.addEventListener('pointerup', e => { if (down !== e.pointerId) return; down = null; aimAt(toWorld(e)); shoot(ui); });
    cv.addEventListener('pointercancel', () => { down = null; });
    cv.addEventListener('keydown', e => {
      if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') { s.aim -= 0.08; e.preventDefault(); }
      else if (e.key === 'ArrowRight' || e.key === 'ArrowDown') { s.aim += 0.08; e.preventDefault(); }
      else if (e.key === ' ' || e.key === 'Enter') { shoot(ui); e.preventDefault(); }
      else if (e.key === 's' || e.key === 'S' || e.key === 'x' || e.key === 'X') swap(s);
    });
  }
  K._helpers.register({
    id: 'sling', icon: '🪨',
    name: { en: 'David\u2019s Sling', es: 'La honda de David' },
    blurb: { en: 'Stop the rolling stones and face the giant', es: 'Detén las piedras y enfrenta al gigante' },
    total: () => S().levels.length,
    start,
    leave: stop,
    render(ui) { return gameHead(this) + (ui.state.view === 'play' ? playHtml(ui.state) : pickHtml()); },
    mount,
    click(event, ui) {
      const s = ui.state, el = event.target;
      if (el.closest('[data-sl-swap]')) { swap(s); return; }
      const pick = el.closest('[data-sl-pick]'); if (pick) { begin(s, +pick.dataset.slPick); sound('start'); render(); window.scrollTo({ top: 0, behavior: 'auto' }); return; }
      if (el.closest('[data-sl-again]')) { begin(s, s.at); sound('start'); render(); window.scrollTo({ top: 0, behavior: 'auto' }); return; }
      if (el.closest('[data-sl-next]')) { begin(s, s.at + 1); sound('start'); render(); window.scrollTo({ top: 0, behavior: 'auto' }); return; }
      if (el.closest('[data-sl-list]')) { stop(); s.view = 'pick'; sound('tap'); render(); window.scrollTo({ top: 0, behavior: 'auto' }); }
    }
  });
})();
