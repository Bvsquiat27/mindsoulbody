/* David's Sling: pull back and let go to sling a stone at the targets, with
   five smooth stones per level (1 Samuel 17:40). Light physics; sliders and
   a Throw button work too (keyboard and switch friendly). */
(() => {
  'use strict';
  const K = window.MsbKidGames; if (!K) return;
  const { t, esc, lang, sound, buzz, prog, award, render, verseHtml, gameHead, reduced, celebrate, coach, levelCard, starPings } = K._helpers;
  const D = () => window.MsbKidGamesData, C = () => window.MsbKidGamesCore;
  const S = () => D().SLING;
  let raf = 0;
  const stop = () => { if (raf) cancelAnimationFrame(raf); raf = 0; };

  function start() { return { view: 'pick', at: 0 }; }
  function begin(s, i) {
    const lv = S().levels[i];
    Object.assign(s, { view: 'play', at: i, targets: lv.targets.map(x => ({ ...x, down: false })), stones: 5, stone: null, aim: null, angle: 35, power: 70, won: false, lost: false, msg: '', bursts: [], fall: 0, parts: [], shake: 0, trail: [], wobble: 0, hitsThisThrow: 0, landed: false, camX: 0, freeze: 0, mood: null, record: false });
  }
  const starRow = n => `<span class="kg-stars" aria-label="${esc(t('{n} of 3 stars', '{n} de 3 estrellas', { n }))}">${[1, 2, 3].map(k => `<i class="${k <= n ? 'on' : ''}" aria-hidden="true">★</i>`).join('')}</span>`;
  function pickHtml() {
    const v = prog().get(), l = lang(), intro = S().intro;
    const lv = S().levels.map((x, i) => { const st = Number(v.best[`sling:${x.id}`]) || 0; const open = i === 0 || (v.done.sling || []).includes(S().levels[i - 1].id); return `<li><button type="button" class="card kg-pick${st ? ' done' : ''}" ${open ? `data-sl-pick="${i}"` : 'disabled'}><span class="kg-pick-icon" aria-hidden="true">${open ? '🪨' : '🔒'}</span><span><strong>${esc(t('Level {n}', 'Nivel {n}', { n: i + 1 }))}</strong><small>${esc(open ? t('{n} targets · 5 stones', '{n} blancos · 5 piedras', { n: x.targets.length }) : t('Finish level {n} first', 'Termina primero el nivel {n}', { n: i }))}</small>${st ? starRow(st) : ''}</span></button></li>`; }).join('');
    return `<blockquote class="kg-quote kg-sl-intro">“${esc(intro.text[l])}” <span class="kg-verse-ref">${esc(intro.ref[l])}</span></blockquote><p class="kg-lead">${esc(t('Pull back on the field and let go to sling a stone. Knock down every target!', 'Jala hacia atrás en el campo y suelta para lanzar una piedra. ¡Derriba todos los blancos!'))}</p><ul class="kg-picks">${lv}</ul>`;
  }
  function playHtml(s) {
    const lv = S().levels[s.at], l = lang();
    const pebbles = Array.from({ length: 5 }, (_, i) => `<i class="${i < s.stones ? 'on' : ''}"></i>`).join('');
    const top = `<div class="kg-sl-top"><span class="kg-sl-stones" role="img" aria-label="${esc(t('{n} stones left', 'Quedan {n} piedras', { n: s.stones }))}">${pebbles}</span><span class="kg-chip" aria-label="${esc(t('Targets down: {n} of {total}', 'Blancos derribados: {n} de {total}', { n: s.targets.filter(x => x.down).length, total: s.targets.length }))}">🎯 ${s.targets.filter(x => x.down).length}/${s.targets.length}</span></div>`;
    const field = `<div class="kg-sl-field"><canvas class="kg-sl-canvas" data-sl-canvas role="img" aria-label="${esc(t('Field with David on the left and targets on the right', 'Campo con David a la izquierda y los blancos a la derecha'))}"></canvas></div>`;
    if (s.won) {
      const n = C().slingStars(s.stones), last = s.at + 1 >= S().levels.length;
      return `${top}${field}${levelCard({ eyebrow: t('ALL TARGETS DOWN!', '¡TODOS LOS BLANCOS DERRIBADOS!'), title: t('Level {n} complete', 'Nivel {n} completo', { n: s.at + 1 }), stars: n, record: s.record, text: t('{n} stones to spare', 'Sobraron {n} piedras', { n: s.stones }), reward: last ? t('You beat every level, brave shepherd!', '¡Superaste todos los niveles, pastor valiente!') : t('Next level unlocked: new targets and rocks', 'Siguiente nivel abierto: nuevos blancos y rocas'), actions: `${!last ? `<button type="button" class="primary" data-sl-next>${esc(t('Next level', 'Siguiente nivel'))} →</button>` : ''}<button type="button" class="secondary" data-sl-again>${esc(t('Play again', 'Jugar otra vez'))}</button>` })}<div class="kg-ark-lesson"><span class="eyebrow">${esc(t('COURAGE', 'VALENTÍA'))}</span><p>${esc(S().lesson[l])}</p></div>${verseHtml(lv.verse, t('GOD GAVE THE VICTORY', 'DIOS DIO LA VICTORIA'), '')}`;
    }
    if (s.lost) return `${top}${field}${levelCard({ lost: true, art: '🪨', eyebrow: t('OUT OF STONES', 'SIN PIEDRAS'), title: t('So close!', '¡Casi!'), text: t('David trusted God and kept going. Pick up five new stones and try again!', 'David confió en Dios y siguió adelante. ¡Toma cinco piedras nuevas e inténtalo otra vez!'), actions: `<button type="button" class="primary" data-sl-again>${esc(t('Try again', 'Intentar otra vez'))}</button>` })}`;
    const tut = coach('sling', t('David’s Sling', 'La honda de David'), [
      { icon: '👆', text: t('Touch the field, pull back and let go.', 'Toca el campo, jala hacia atrás y suelta.') },
      { icon: '🎯', text: t('The dots show where the stone will fly. Knock down every target.', 'Los puntos muestran adónde volará la piedra. Derriba todos los blancos.') },
      { icon: '🪨', text: t('Five stones per level. Stones left over earn stars!', 'Cinco piedras por nivel. ¡Las piedras que sobran dan estrellas!') },
    ], K._ui.coachForce === 'sling');
    return `${tut}${top}${field}<p class="kg-msg" role="status" aria-live="polite" data-kg-msg>${esc(s.msg || t('Pull back and let go!', '¡Jala hacia atrás y suelta!'))}</p><div class="kg-sl-controls"><label>${esc(t('Angle', 'Ángulo'))} <input type="range" min="-10" max="80" value="${s.angle}" data-sl-angle aria-valuetext="${s.angle}°"></label><label>${esc(t('Power', 'Fuerza'))} <input type="range" min="20" max="100" value="${s.power}" data-sl-power aria-valuetext="${s.power}%"></label><button type="button" class="primary" data-sl-throw>${esc(t('Throw', 'Lanzar'))} 🪨</button></div>`;
  }

  /* ---------- Drawing: a sunny valley of Elah, drawn in layers ---------- */
  const TAU = Math.PI * 2;
  const rr = (g, x, y, w, h, r) => { g.beginPath(); if (g.roundRect) g.roundRect(x, y, w, h, r); else g.rect(x, y, w, h); };
  /* the still part of the picture is drawn once into its own canvas */
  /* two cached layers with a margin each side, so the camera can pan them at different speeds (parallax) */
  const M = 24;
  let bg = null, bgKey = '';
  function background(w, h) {
    const key = `${w}x${h}`; if (bg && bgKey === key) return bg;
    const k = w / 400, mk = c => { c.width = Math.round(w + 2 * M * k); c.height = h; return c; };
    const c = mk(document.createElement('canvas')), c2 = mk(document.createElement('canvas'));
    let g = c.getContext('2d'); if (!g) return null;
    g.setTransform(k, 0, 0, k, M * k, 0);
    const wide = (gg, y0, fill) => { gg.fillStyle = fill; gg.fillRect(-M, y0, 400 + 2 * M, 300 - y0); };
    const sky = g.createLinearGradient(0, 0, 0, 260); sky.addColorStop(0, '#5fb8f0'); sky.addColorStop(0.65, '#bfe6ff'); sky.addColorStop(1, '#fff4dc');
    g.fillStyle = sky; g.fillRect(-M, 0, 400 + 2 * M, 300);
    /* the sun with soft rays */
    const sun = g.createRadialGradient(70, 52, 4, 70, 52, 70); sun.addColorStop(0, 'rgba(255,246,200,1)'); sun.addColorStop(0.25, 'rgba(255,224,130,.9)'); sun.addColorStop(1, 'rgba(255,224,130,0)');
    g.fillStyle = sun; g.beginPath(); g.arc(70, 52, 70, 0, TAU); g.fill();
    g.fillStyle = '#ffe9a0'; g.beginPath(); g.arc(70, 52, 17, 0, TAU); g.fill();
    /* far hills with the Philistine tents */
    g.fillStyle = '#a9cfa0'; g.fillRect(-M, 196, M, 104); g.fillRect(400, 176, M, 124); g.beginPath(); g.moveTo(0, 196); g.bezierCurveTo(80, 160, 150, 170, 210, 186); g.bezierCurveTo(270, 200, 330, 158, 400, 176); g.lineTo(400, 300); g.lineTo(0, 300); g.fill();
    for (const [tx, ty, c] of [[262, 182, '#e8d4b0'], [286, 178, '#d9b98a'], [312, 172, '#e8d4b0']]) { g.fillStyle = c; g.beginPath(); g.moveTo(tx - 10, ty + 8); g.lineTo(tx, ty - 6); g.lineTo(tx + 10, ty + 8); g.closePath(); g.fill(); g.strokeStyle = 'rgba(90,60,30,.35)'; g.lineWidth = 1; g.stroke(); g.fillStyle = '#b5523b'; g.fillRect(tx - 0.5, ty - 12, 1, 6); g.beginPath(); g.moveTo(tx, ty - 12); g.lineTo(tx + 5, ty - 10); g.lineTo(tx, ty - 8); g.fill(); }
    /* the near layer: its own canvas */
    g = c2.getContext('2d'); g.setTransform(k, 0, 0, k, M * k, 0);
    /* middle hill and the brook where David found his stones */
    const mid = g.createLinearGradient(0, 200, 0, 300); mid.addColorStop(0, '#8fca6e'); mid.addColorStop(1, '#6fb052');
    g.fillStyle = mid; g.fillRect(-M, 236, M, 64); g.fillRect(400, 226, M, 74); g.beginPath(); g.moveTo(0, 236); g.quadraticCurveTo(110, 214, 210, 232); g.quadraticCurveTo(320, 250, 400, 226); g.lineTo(400, 300); g.lineTo(0, 300); g.fill();
    g.fillStyle = '#7cc7ef'; g.beginPath(); g.moveTo(0, 270); g.bezierCurveTo(90, 262, 140, 282, 230, 276); g.bezierCurveTo(300, 272, 350, 286, 400, 280); g.lineTo(400, 290); g.bezierCurveTo(340, 296, 290, 284, 230, 287); g.bezierCurveTo(140, 293, 80, 274, 0, 282); g.fill();
    g.strokeStyle = 'rgba(255,255,255,.7)'; g.lineWidth = 1.2; for (const [x0, y0] of [[40, 275], [160, 281], [300, 280]]) { g.beginPath(); g.moveTo(x0, y0); g.quadraticCurveTo(x0 + 8, y0 - 2, x0 + 16, y0); g.stroke(); }
    /* smooth stones in the brook */
    for (const [x, y] of [[112, 280], [124, 283], [200, 283], [342, 285], [354, 282]]) { g.fillStyle = '#b9b2a8'; g.beginPath(); g.ellipse(x, y, 4, 2.6, 0, 0, TAU); g.fill(); g.fillStyle = 'rgba(255,255,255,.6)'; g.beginPath(); g.ellipse(x - 1, y - 1, 1.5, 0.8, 0, 0, TAU); g.fill(); }
    /* olive trees */
    for (const [x, y, sc] of [[158, 230, 1], [228, 240, 0.8]]) { g.save(); g.translate(x, y); g.scale(sc, sc); g.fillStyle = '#7a5a3a'; g.fillRect(-2, -4, 4, 16); g.fillStyle = '#6f9a5f'; for (const [cx, cy, r] of [[-7, -10, 9], [5, -12, 10], [0, -20, 9], [-12, -16, 6], [11, -18, 6]]) { g.beginPath(); g.arc(cx, cy, r, 0, TAU); g.fill(); } g.fillStyle = 'rgba(255,255,255,.18)'; g.beginPath(); g.arc(-2, -22, 5, 0, TAU); g.fill(); g.restore(); }
    /* the near grass, tufts and flowers */
    g.fillStyle = '#7cc7ef'; g.fillRect(-M, 270, M, 20); g.fillRect(400, 280, M, 10);
    wide(g, 290, '#5fa447');
    g.strokeStyle = '#4f9139'; g.lineWidth = 1.3;
    for (let x = 4; x < 400; x += 9) { const y = 292 + (x % 3); g.beginPath(); g.moveTo(x, y + 6); g.lineTo(x - 2, y - 2); g.moveTo(x, y + 6); g.lineTo(x + 2, y - 3); g.stroke(); }
    for (const [fx, fy, c] of [[140, 252, '#ffd166'], [190, 258, '#ff9db5'], [250, 256, '#ffffff'], [98, 262, '#ff9db5'], [320, 254, '#ffd166'], [30, 262, '#ffffff']]) { g.fillStyle = c; for (let a = 0; a < 5; a += 1) { g.beginPath(); g.arc(fx + Math.cos(a / 5 * TAU) * 2.4, fy + Math.sin(a / 5 * TAU) * 2.4, 1.8, 0, TAU); g.fill(); } g.fillStyle = '#f2a53a'; g.beginPath(); g.arc(fx, fy, 1.4, 0, TAU); g.fill(); }
    bg = { back: c, front: c2 }; bgKey = key; return bg;
  }
  function clouds(g, time) {
    g.fillStyle = 'rgba(255,255,255,.92)';
    for (const [x0, y, sp, sc] of [[40, 30, 6, 1], [210, 50, 4, 0.8], [330, 22, 5, 1.1]]) {
      const x = ((x0 + time * sp) % 470) - 40;
      g.save(); g.translate(x, y); g.scale(sc, sc);
      for (const [cx, cy, r] of [[0, 0, 12], [14, -5, 14], [30, 0, 11], [15, 5, 12]]) { g.beginPath(); g.arc(cx, cy, r, 0, TAU); g.fill(); }
      g.restore();
    }
  }
  /* the giant: far back, a little silly, and he topples when every target is down */
  function giant(g, s, time) {
    const fall = s.fall || 0;
    g.save(); g.translate(352, 214); g.rotate(fall * 1.35); g.globalAlpha = 0.55 - fall * 0.2;
    const sway = s.wobble ? Math.sin(time * 30) * s.wobble * 0.08 : Math.sin(time * 1.4) * 0.02;
    g.rotate(sway);
    g.fillStyle = '#7d8794'; rr(g, -15, -112, 30, 64, 8); g.fill();
    g.fillStyle = '#9aa3ad'; rr(g, -18, -96, 36, 14, 4); g.fill();
    g.fillStyle = '#6b7480'; g.fillRect(-13, -48, 10, 46); g.fillRect(3, -48, 10, 46);
    g.fillStyle = '#e0bd98'; g.beginPath(); g.arc(0, -124, 13, 0, TAU); g.fill();
    g.fillStyle = '#b3a06a'; g.beginPath(); g.arc(0, -128, 14, Math.PI, 0); g.fill(); g.fillRect(-1.5, -146, 3, 8);
    g.fillStyle = '#3b3b3b'; g.beginPath(); g.arc(-4, -123, 1.6, 0, TAU); g.arc(4, -123, 1.6, 0, TAU); g.fill();
    g.strokeStyle = '#5a4a3a'; g.lineWidth = 3; g.beginPath(); g.moveTo(22, -130); g.lineTo(22, -10); g.stroke();
    g.fillStyle = '#c9ced6'; g.beginPath(); g.moveTo(22, -142); g.lineTo(26, -130); g.lineTo(18, -130); g.closePath(); g.fill();
    g.restore();
  }
  function drawTarget(g, tg, time) {
    const r = tg.r, bob = tg.down ? 0 : Math.sin(time * 2 + tg.x) * 0.8;
    g.save(); g.translate(tg.x, tg.y + bob);
    if (tg.sq > 0) { g.scale(1 + tg.sq * 0.35, 1 - tg.sq * 0.3); }
    if (tg.down) { const f = Math.min(1, tg.fallT || 1); g.globalAlpha = 1 - f * 0.8; g.translate(f * 10, f * 14); g.rotate(f * 1.3); }
    g.fillStyle = 'rgba(0,0,0,.12)'; g.beginPath(); g.ellipse(0, r + 6, r * 0.9, 3, 0, 0, TAU); g.fill();
    g.lineWidth = 2; g.strokeStyle = '#4a3428';
    if (tg.kind === 'jar') {
      const j = g.createLinearGradient(-r, 0, r, 0); j.addColorStop(0, '#a95a3a'); j.addColorStop(0.45, '#e09a72'); j.addColorStop(1, '#9b4f33');
      g.fillStyle = j; g.beginPath(); g.ellipse(0, 3, r * 0.9, r, 0, 0, TAU); g.fill(); g.stroke();
      g.fillStyle = '#8f4a30'; rr(g, -r * 0.45, -r - 4, r * 0.9, 7, 2); g.fill(); g.stroke();
      g.strokeStyle = 'rgba(255,240,220,.7)'; g.lineWidth = 1.5; g.beginPath(); g.moveTo(-r * 0.7, 0); g.quadraticCurveTo(0, 5, r * 0.7, 0); g.stroke();
      g.fillStyle = 'rgba(255,255,255,.35)'; g.beginPath(); g.ellipse(-r * 0.35, -2, 2, 5, 0.3, 0, TAU); g.fill();
    } else if (tg.kind === 'shield') {
      const b = g.createRadialGradient(-r * 0.3, -r * 0.3, 2, 0, 0, r); b.addColorStop(0, '#f3d98f'); b.addColorStop(1, '#a8823e');
      g.fillStyle = b; g.beginPath(); g.arc(0, 0, r, 0, TAU); g.fill(); g.stroke();
      g.strokeStyle = '#7d5f2c'; g.lineWidth = 1.5; g.beginPath(); g.arc(0, 0, r * 0.7, 0, TAU); g.stroke();
      g.fillStyle = '#7d5f2c'; g.beginPath(); g.arc(0, 0, r * 0.25, 0, TAU); g.fill();
      g.fillStyle = '#fff3c4'; for (let a = 0; a < 6; a += 1) { g.beginPath(); g.arc(Math.cos(a / 6 * TAU) * r * 0.85, Math.sin(a / 6 * TAU) * r * 0.85, 1.4, 0, TAU); g.fill(); }
    } else if (tg.kind === 'spear') {
      g.strokeStyle = '#7a5a3a'; g.lineWidth = 4; g.beginPath(); g.moveTo(0, r * 1.4); g.lineTo(0, -r * 0.6); g.stroke();
      g.strokeStyle = '#c0392b'; g.lineWidth = 3; g.beginPath(); g.moveTo(-3, -r * 0.4); g.lineTo(3, -r * 0.4); g.stroke();
      const m = g.createLinearGradient(-r * 0.4, 0, r * 0.4, 0); m.addColorStop(0, '#9aa3ad'); m.addColorStop(0.5, '#eef2f6'); m.addColorStop(1, '#8a939d');
      g.fillStyle = m; g.strokeStyle = '#4a3428'; g.lineWidth = 1.5; g.beginPath(); g.moveTo(0, -r * 1.5); g.lineTo(r * 0.45, -r * 0.5); g.lineTo(-r * 0.45, -r * 0.5); g.closePath(); g.fill(); g.stroke();
    } else {
      const h = g.createLinearGradient(0, -r, 0, 6); h.addColorStop(0, '#f1d47a'); h.addColorStop(1, '#b8902f');
      g.fillStyle = h; g.beginPath(); g.arc(0, 4, r, Math.PI, 0); g.lineTo(r, 6); g.lineTo(-r, 6); g.closePath(); g.fill(); g.stroke();
      g.fillStyle = '#e8d08a'; g.fillRect(-2, -r + 2, 4, r); g.fillStyle = '#c0392b'; rr(g, -3, -r - 6, 6, 8, 3); g.fill();
    }
    g.restore();
  }
  /* David, drawn like the squishies: round face, rosy cheeks, a happy smile */
  function david(g, s, time) {
    const P = C().SLING, aiming = !!s.aim, throwing = s.throwT > 0;
    const mood = s.won ? 'win' : s.mood ? s.mood.k : '', calm = reduced();
    const hop = (mood === 'win' || mood === 'cheer') && !calm ? -Math.abs(Math.sin(time * 9)) * 7 : 0;
    const x = P.x - 18 - (aiming ? 2 : 0), y = P.y + hop + (mood === 'sad' ? 2 : 0);
    g.fillStyle = 'rgba(0,0,0,.15)'; g.beginPath(); g.ellipse(x, y + 58, 18, 4, 0, 0, TAU); g.fill();
    /* staff */
    g.strokeStyle = '#8a6e4b'; g.lineWidth = 4; g.lineCap = 'round'; g.beginPath(); g.moveTo(x - 16, y + 56); g.quadraticCurveTo(x - 20, y + 10, x - 14, y - 10); g.quadraticCurveTo(x - 10, y - 18, x - 4, y - 12); g.stroke();
    /* tunic with a belt and the shepherd's bag */
    g.fillStyle = '#e8b64c'; g.beginPath(); g.moveTo(x - 10, y + 10); g.lineTo(x + 10, y + 10); g.lineTo(x + 14, y + 48); g.lineTo(x - 14, y + 48); g.closePath(); g.fill();
    g.fillStyle = '#8b5a2b'; g.fillRect(x - 12, y + 26, 24, 4);
    g.fillStyle = '#a0703c'; rr(g, x + 6, y + 28, 10, 10, 3); g.fill();
    g.fillStyle = '#f2c9a0'; g.fillRect(x - 8, y + 48, 5, 10); g.fillRect(x + 3, y + 48, 5, 10);
    g.fillStyle = '#7a4b2a'; rr(g, x - 9, y + 56, 7, 3, 1); g.fill(); rr(g, x + 2, y + 56, 7, 3, 1); g.fill();
    /* head */
    const bob = Math.sin(time * 3) * (reduced() ? 0 : 0.8);
    g.fillStyle = '#f5cfa6'; g.beginPath(); g.arc(x, y - 2 + bob, 12, 0, TAU); g.fill();
    g.fillStyle = '#7b4a2a'; for (const [cx, cy, r] of [[-8, -9, 5], [-2, -12, 5.5], [5, -11, 5], [10, -6, 4], [-11, -3, 3.5]]) { g.beginPath(); g.arc(x + cx, y + cy + bob, r, 0, TAU); g.fill(); }
    const blink = !calm && (time % 3.3) < 0.13;
    if (blink || mood === 'win') { g.strokeStyle = '#3a2a20'; g.lineWidth = 1.4; g.beginPath(); g.arc(x - 3.5, y + bob, 1.8, Math.PI * 1.1, Math.PI * 1.9); g.moveTo(x + 6.3, y + bob - 0.5); g.arc(x + 4.5, y + bob, 1.8, Math.PI * 1.1, Math.PI * 1.9); g.stroke(); }
    else { g.fillStyle = '#3a2a20'; g.beginPath(); g.arc(x - 3.5, y - 1 + bob, 1.6, 0, TAU); g.arc(x + 4.5, y - 1 + bob, 1.6, 0, TAU); g.fill(); g.fillStyle = '#fff'; g.beginPath(); g.arc(x - 3, y - 1.6 + bob, 0.5, 0, TAU); g.arc(x + 5, y - 1.6 + bob, 0.5, 0, TAU); g.fill(); }
    g.fillStyle = 'rgba(255,140,140,.5)'; g.beginPath(); g.ellipse(x - 7, y + 3 + bob, 2.6, 1.6, 0, 0, TAU); g.ellipse(x + 8, y + 3 + bob, 2.6, 1.6, 0, 0, TAU); g.fill();
    g.strokeStyle = '#7a3a2a'; g.lineWidth = 1.3; g.beginPath();
    if (mood === 'sad') g.arc(x + 0.5, y + 7 + bob, 2.6, 1.15 * Math.PI, 1.85 * Math.PI);
    else if (mood === 'win' || mood === 'cheer') { g.fillStyle = '#7a3a2a'; g.arc(x + 0.5, y + 3 + bob, 3.4, 0, Math.PI); g.fill(); }
    else g.arc(x + 0.5, y + 3 + bob, aiming ? 2 : 3, 0.15 * Math.PI, 0.85 * Math.PI);
    g.stroke();
    /* arm and sling: it whirls while you aim, then snaps forward; both arms go up to cheer */
    const up = mood === 'win' || mood === 'cheer';
    const hand = up ? { x: x + 13, y: y - 20 } : { x: P.x - 6, y: P.y - 4 };
    g.strokeStyle = '#f2c9a0'; g.lineWidth = 4; g.beginPath(); g.moveTo(x + 8, y + 14); g.lineTo(hand.x, hand.y); g.stroke();
    if (up) { g.beginPath(); g.moveTo(x - 8, y + 14); g.lineTo(x - 14, y - 16); g.stroke(); }
    return { hand, aiming, throwing };
  }
  function draw(cv, s, time) {
    const g = cv.getContext('2d'); if (!g) return;
    const k = cv.width / 400, P = C().SLING;
    g.setTransform(1, 0, 0, 1, 0, 0);
    const b = background(cv.width, cv.height);
    const sh = s.shake > 0 && !reduced() ? s.shake * 5 : 0;
    const ox = sh ? (Math.random() - 0.5) * sh : 0, oy = sh ? (Math.random() - 0.5) * sh : 0;
    const cam = s.camX || 0;
    /* far layer moves at 40% of the camera, clouds at 20%, the field at 100% */
    if (b) g.drawImage(b.back, (cam * 0.4 - M + ox) * k, oy * k);
    g.setTransform(k, 0, 0, k, (cam * 0.2 + ox) * k, oy * k);
    clouds(g, time);
    g.setTransform(k, 0, 0, k, (cam * 0.5 + ox) * k, oy * k);
    giant(g, s, time);
    g.setTransform(1, 0, 0, 1, 0, 0);
    if (b) g.drawImage(b.front, (cam - M + ox) * k, oy * k);
    g.setTransform(k, 0, 0, k, (cam + ox) * k, oy * k);
    for (const r of S().levels[s.at].rocks) {
      const rg = g.createLinearGradient(r.x, r.y, r.x, r.y + r.h); rg.addColorStop(0, '#b4aca2'); rg.addColorStop(1, '#7d766e');
      g.fillStyle = rg; g.strokeStyle = '#5f5a54'; g.lineWidth = 2; rr(g, r.x, r.y, r.w, r.h, 8); g.fill(); g.stroke();
      g.fillStyle = 'rgba(255,255,255,.25)'; rr(g, r.x + 4, r.y + 3, r.w * 0.5, 4, 2); g.fill();
      g.fillStyle = '#6fae55'; for (let i = 0; i < r.w; i += 7) { g.beginPath(); g.arc(r.x + i + 3, r.y + 1, 3, Math.PI, 0); g.fill(); }
    }
    for (const tg of s.targets) drawTarget(g, tg, time);
    const d = david(g, s, time);
    /* the sling pouch */
    let pouch;
    if (s.aim) {
      const len = Math.hypot(s.aim.dx, s.aim.dy) || 1, m = Math.min(1, P.maxPull / len);
      pouch = { x: P.x + s.aim.dx * m, y: P.y + s.aim.dy * m };
      /* the power ring */
      const pw = Math.min(1, len / P.maxPull);
      g.strokeStyle = `hsla(${120 - pw * 110},85%,55%,.9)`; g.lineWidth = 4; g.beginPath(); g.arc(P.x, P.y, 24, -Math.PI / 2, -Math.PI / 2 + pw * TAU); g.stroke();
      g.strokeStyle = 'rgba(255,255,255,.35)'; g.lineWidth = 1; g.beginPath(); g.arc(P.x, P.y, 24, 0, TAU); g.stroke();
      /* the path the stone will take, fading out */
      const pts = C().slingPreview(s.aim.dx, s.aim.dy);
      pts.forEach(([x, y], i) => { g.fillStyle = `rgba(255,255,255,${0.95 - i / pts.length * 0.75})`; g.beginPath(); g.arc(x, y, 3 - i / pts.length * 1.6, 0, TAU); g.fill(); });
    } else if (s.throwT > 0) {
      const a = (1 - s.throwT) * Math.PI;
      pouch = { x: d.hand.x + Math.cos(a - Math.PI / 2) * 22, y: d.hand.y + Math.sin(a - Math.PI / 2) * 22 };
    } else pouch = { x: P.x, y: P.y + 10 };
    g.strokeStyle = '#7a5a3a'; g.lineWidth = 2; g.beginPath(); g.moveTo(d.hand.x, d.hand.y); g.lineTo(pouch.x, pouch.y); g.stroke();
    g.fillStyle = '#6b4a2e'; g.beginPath(); g.ellipse(pouch.x, pouch.y, 6, 4, 0, 0, TAU); g.fill();
    if (!s.stone || !s.stone.alive) { if (s.stones > 0 && !s.won) { g.fillStyle = '#8c8680'; g.beginPath(); g.arc(pouch.x, pouch.y - 1, P.radius - 1, 0, TAU); g.fill(); } }
    /* the stone: a trail, a shadow on the ground, and a spin */
    if (s.stone && s.stone.alive) {
      for (const [i, p] of (s.trail || []).entries()) { g.fillStyle = `rgba(255,255,255,${(i + 1) / (s.trail.length + 1) * 0.5})`; g.beginPath(); g.arc(p.x, p.y, P.radius * (i + 1) / (s.trail.length + 1), 0, TAU); g.fill(); }
      const st = s.stone, sy = 286, hgt = Math.max(0, sy - st.y);
      g.fillStyle = `rgba(0,0,0,${Math.max(0.05, 0.2 - hgt / 1500)})`; g.beginPath(); g.ellipse(st.x, sy, P.radius * (1 + hgt / 200), 2, 0, 0, TAU); g.fill();
      const spd = Math.hypot(st.vx, st.vy), str = reduced() ? 0 : Math.min(0.4, spd / 1600);
      g.save(); g.translate(st.x, st.y); g.rotate(Math.atan2(st.vy, st.vx)); g.scale(1 + str, 1 - str * 0.6); g.rotate(st.t * 14);
      const sg = g.createRadialGradient(-2, -2, 1, 0, 0, P.radius); sg.addColorStop(0, '#c9c3bb'); sg.addColorStop(1, '#6e6862');
      g.fillStyle = sg; g.beginPath(); g.arc(0, 0, P.radius, 0, TAU); g.fill();
      g.strokeStyle = 'rgba(60,55,50,.6)'; g.lineWidth = 1; g.beginPath(); g.arc(0, 0, P.radius * 0.55, 0.2, 1.6); g.stroke();
      g.restore();
    }
    /* shards, sparks, dust and +1 */
    for (const q of s.parts || []) {
      const a = Math.max(0, 1 - q.age / q.life);
      g.globalAlpha = a; g.fillStyle = q.c;
      if (q.kind === 'shard') { g.save(); g.translate(q.x, q.y); g.rotate(q.rot); g.beginPath(); g.moveTo(-q.s, -q.s * 0.6); g.lineTo(q.s, 0); g.lineTo(-q.s * 0.4, q.s); g.closePath(); g.fill(); g.restore(); }
      else if (q.kind === 'spark') { g.beginPath(); g.arc(q.x, q.y, q.s * a + 0.5, 0, TAU); g.fill(); }
      else if (q.kind === 'dust') { g.beginPath(); g.arc(q.x, q.y, q.s * (1 + q.age * 3), 0, TAU); g.fill(); }
      else if (q.kind === 'pop') { g.font = `bold ${q.text.length > 3 ? 22 : 16}px system-ui, sans-serif`; g.textAlign = 'center'; g.lineWidth = 3; g.strokeStyle = 'rgba(60,40,0,.6)'; g.strokeText(q.text, q.x, q.y); g.fillText(q.text, q.x, q.y); }
      g.globalAlpha = 1;
    }
  }
  function size(cv) {
    const w = cv.parentElement.clientWidth || 340, dpr = Math.min(2, window.devicePixelRatio || 1);
    cv.style.width = `${w}px`; cv.style.height = `${w * 0.75}px`;
    cv.width = Math.round(w * dpr); cv.height = Math.round(w * 0.75 * dpr);
  }
  /* what each target sounds and feels like when it is hit */
  const HIT = {
    jar: { sound: 'crack', buzz: [12, 20, 12], colors: ['#c97b5a', '#a65f40', '#e8a07c'], shard: true },
    shield: { sound: 'clang', buzz: [25, 15, 10], colors: ['#ffe28a', '#fff6cf', '#d8b25a'] },
    spear: { sound: 'tock', buzz: 14, colors: ['#8a6e45', '#c9ced6', '#7a5a3a'], shard: true },
    helmet: { sound: 'bong', buzz: [30, 20, 15], colors: ['#ffe28a', '#fff6cf', '#c0392b'] },
  };
  function burst(s, tg) {
    const h = HIT[tg.kind] || HIT.helmet;
    sound(h.sound); buzz(h.buzz);
    s.shake = 0.35; s.wobble = 1; s.freeze = reduced() ? 0 : 0.07; tg.sq = 1; s.mood = { k: 'cheer', t: 0.9 };
    s.parts = s.parts || [];
    s.parts.push({ kind: 'pop', text: '+1', x: tg.x, y: tg.y - tg.r - 6, vx: 0, vy: -40, g: 0, age: 0, life: 0.9, c: '#ffe066' });
    if (reduced()) return;
    for (let i = 0; i < 14; i += 1) {
      const a = Math.random() * TAU, sp = 60 + Math.random() * 120;
      s.parts.push({ kind: h.shard && i % 2 ? 'shard' : 'spark', x: tg.x, y: tg.y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 60, g: 380, rot: Math.random() * 6, vr: (Math.random() - 0.5) * 14, s: 2 + Math.random() * 3, age: 0, life: 0.7 + Math.random() * 0.4, c: h.colors[i % h.colors.length] });
    }
  }
  function dust(s, x) {
    if (reduced()) return;
    s.parts = s.parts || [];
    for (let i = 0; i < 6; i += 1) s.parts.push({ kind: 'dust', x: x + (Math.random() - 0.5) * 10, y: 284, vx: (Math.random() - 0.5) * 40, vy: -10 - Math.random() * 20, g: 0, s: 2 + Math.random() * 2, age: 0, life: 0.6, c: 'rgba(170,150,120,.6)' });
  }
  function throwStone(ui, stone) {
    const s = ui.state;
    if (s.won || s.lost || s.stones <= 0 || (s.stone && s.stone.alive)) return;
    s.stones -= 1; s.stone = stone; s.aim = null; s.msg = ''; s.trail = []; s.throwT = 1; s.landed = false; s.hitsThisThrow = 0;
    sound('sling'); buzz(12);
    const pb = document.querySelector('.kg-sl-stones'); if (pb) { pb.querySelectorAll('i').forEach((el, i) => el.classList.toggle('on', i < s.stones)); pb.setAttribute('aria-label', t('{n} stones left', 'Quedan {n} piedras', { n: s.stones })); }
    loop(ui);
  }
  /* one animation loop: the stone, the scenery and the effects. It sleeps
     when nothing moves (and with reduced motion), and stops off screen. */
  function loop(ui) {
    if (raf) return;
    const s = ui.state, cv = document.querySelector('[data-sl-canvas]'); if (!cv) return;
    let last = performance.now();
    const frame = now => {
      raf = 0;
      if (!cv.isConnected || ui.state !== s) return;
      const dt = Math.min(0.04, (now - last) / 1000); last = now;
      s.time = (s.time || 0) + dt;
      const frozen = s.freeze > 0; if (frozen) s.freeze -= dt;
      if (s.mood && !s.won) { s.mood.t -= dt; if (s.mood.t <= 0) s.mood = null; }
      for (const tg of s.targets) if (tg.sq > 0) tg.sq = Math.max(0, tg.sq - dt * 5);
      const want = !reduced() && s.stone && s.stone.alive ? -Math.max(0, Math.min(16, (s.stone.x - 140) * 0.08)) : 0;
      s.camX = reduced() ? 0 : (s.camX || 0) + (want - (s.camX || 0)) * Math.min(1, dt * 3);
      if (s.stone && s.stone.alive && !frozen) {
        const hits = C().slingStep(s.stone, dt, s.targets, S().levels[s.at].rocks);
        s.trail.push({ x: s.stone.x, y: s.stone.y }); if (s.trail.length > 7) s.trail.shift();
        for (const h of hits) { s.hitsThisThrow += 1; burst(s, h); const c = document.querySelector('.kg-sl-top .kg-chip'); if (c) c.textContent = `🎯 ${s.targets.filter(x => x.down).length}/${s.targets.length}`; }
        if (!s.landed && s.stone.y > 284 && s.stone.x < 400) { s.landed = true; dust(s, s.stone.x); if (!hits.length) sound('thud'); }
      }
      for (const tg of s.targets) if (tg.down) tg.fallT = Math.min(1, (tg.fallT || 0) + dt * 2.5);
      s.throwT = Math.max(0, (s.throwT || 0) - dt * 4);
      s.shake = Math.max(0, (s.shake || 0) - dt);
      s.wobble = Math.max(0, (s.wobble || 0) - dt * 2);
      if (s.won) s.fall = Math.min(1, (s.fall || 0) + dt * 1.2);
      if (!frozen) for (const q of s.parts || []) { q.age += dt; q.x += q.vx * dt; q.y += q.vy * dt; q.vy += (q.g || 0) * dt; if (q.vr) q.rot += q.vr * dt; }
      s.parts = (s.parts || []).filter(q => q.age < q.life);
      if (s.dragging && s.aim && !reduced()) { s.whirlT = (s.whirlT || 0) + dt; if (s.whirlT > 0.36) { s.whirlT = 0; sound('whirl'); } }
      draw(cv, s, s.time);
      const flying = s.stone && s.stone.alive;
      if (s.stone && !flying && !s.stone.ended) {
        s.stone.ended = true;
        if (s.targets.every(x => x.down)) {
          s.won = true; const lv = S().levels[s.at], n = C().slingStars(s.stones);
          s.record = n > (Number(prog().get().best[`sling:${lv.id}`]) || 0);
          prog().finish('sling', lv.id); prog().best(`sling:${lv.id}`, n);
          sound('giantfall');
          setTimeout(() => { sound('fanfare'); starPings(n); if (s.record) setTimeout(() => sound('record'), 1500); buzz([20, 40, 30, 40, 60]); celebrate('gold'); render(); award(); const l = document.querySelector('.kg-ark-lesson'); if (l) l.scrollIntoView({ block: 'start', behavior: reduced() ? 'auto' : 'smooth' }); }, 900);
        } else if (s.stones <= 0) { s.lost = true; s.mood = { k: 'sad', t: 9 }; setTimeout(() => { sound('sad'); render(); }, 500); }
        else {
          const m = document.querySelector('[data-kg-msg]');
          if (m) m.textContent = s.hitsThisThrow > 1 ? t('Double hit! {n} stones left.', '¡Doble acierto! Quedan {n} piedras.', { n: s.stones }) : s.hitsThisThrow ? t('Great shot! {n} stones left.', '¡Gran tiro! Quedan {n} piedras.', { n: s.stones }) : t('So close! {n} stones left.', '¡Casi! Quedan {n} piedras.', { n: s.stones });
          if (s.hitsThisThrow > 1) { sound('combo'); s.parts.push({ kind: 'pop', text: s.hitsThisThrow > 2 ? t('Triple!', '¡Triple!') : t('Double!', '¡Doble!'), x: 250, y: 120, vx: 0, vy: -30, g: 0, age: 0, life: 1.2, c: '#ffd35a' }); }
          else if (!s.hitsThisThrow) { s.mood = { k: 'sad', t: 0.9 }; }
        }
      }
      const busy = frozen || Math.abs(s.camX || 0) > 0.2 || s.mood || (s.parts && s.parts.length) || s.throwT > 0 || s.shake > 0 || s.wobble > 0 || s.dragging || (s.won && s.fall < 1);
      if ((busy || !reduced()) && !document.hidden) raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);
  }
  function mount(screen, ui) {
    stop();
    const s = ui.state, cv = screen.querySelector('[data-sl-canvas]');
    if (!cv) return;
    size(cv); draw(cv, s, s.time || 0);
    loop(ui);
    if (s.won || s.lost) return;
    const toWorld = e => { const r = cv.getBoundingClientRect(); return { x: (e.clientX - r.left) / r.width * 400, y: (e.clientY - r.top) / r.height * 300 }; };
    let drag = null;
    cv.addEventListener('pointerdown', e => {
      if (s.stone && s.stone.alive) return;
      e.preventDefault(); drag = { id: e.pointerId, from: toWorld(e) }; s.dragging = true;
      try { cv.setPointerCapture(e.pointerId); } catch { /* ignore */ }
      sound('pick'); buzz(5);
    });
    cv.addEventListener('pointermove', e => {
      if (!drag || e.pointerId !== drag.id) return;
      const p = toWorld(e); s.aim = { dx: p.x - drag.from.x, dy: p.y - drag.from.y }; loop(ui); if (reduced()) draw(cv, s, s.time || 0);
    });
    const end = e => {
      if (!drag || e.pointerId !== drag.id) return;
      drag = null; s.dragging = false;
      const a = s.aim; s.aim = null;
      if (a && Math.hypot(a.dx, a.dy) > 12) throwStone(ui, C().slingShot(a.dx, a.dy)); else draw(cv, s, s.time || 0);
    };
    cv.addEventListener('pointerup', end);
    cv.addEventListener('pointercancel', () => { drag = null; s.dragging = false; s.aim = null; draw(cv, s, s.time || 0); });
    const showAim = () => { const a = s.angle * Math.PI / 180, len = C().SLING.maxPull * s.power / 100; s.aim = { dx: -Math.cos(a) * len, dy: Math.sin(a) * len }; draw(cv, s, s.time || 0); loop(ui); };
    screen.querySelectorAll('[data-sl-angle],[data-sl-power]').forEach(inp => inp.addEventListener('input', () => {
      if (inp.dataset.slAngle !== undefined) s.angle = +inp.value; else s.power = +inp.value;
      inp.setAttribute('aria-valuetext', inp.dataset.slAngle !== undefined ? `${inp.value}°` : `${inp.value}%`);
      if (!(s.stone && s.stone.alive)) showAim();
    }));
  }
  K._helpers.register({
    id: 'sling', icon: '🪨',
    name: { en: 'David\u2019s Sling', es: 'La honda de David' },
    blurb: { en: 'Five smooth stones and a brave heart', es: 'Cinco piedras lisas y un corazón valiente' },
    total: () => S().levels.length,
    start,
    leave: stop,
    render(ui) { return gameHead(this) + (ui.state.view === 'play' ? playHtml(ui.state) : pickHtml()); },
    mount,
    click(event, ui) {
      const s = ui.state, el = event.target;
      if (el.closest('[data-sl-throw]')) { s.aim = null; throwStone(ui, C().slingAim(s.angle, s.power / 100)); return; }
      const pick = el.closest('[data-sl-pick]'); if (pick) { begin(s, +pick.dataset.slPick); sound('start'); render(); window.scrollTo({ top: 0, behavior: 'auto' }); return; }
      if (el.closest('[data-sl-again]')) { begin(s, s.at); sound('start'); render(); window.scrollTo({ top: 0, behavior: 'auto' }); return; }
      if (el.closest('[data-sl-next]')) { begin(s, s.at + 1); sound('start'); render(); window.scrollTo({ top: 0, behavior: 'auto' }); }
    }
  });
})();
