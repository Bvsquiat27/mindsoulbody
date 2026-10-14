/* David's Sling: pull back and let go to sling a stone at the targets, with
   five smooth stones per level (1 Samuel 17:40). Light physics; sliders and
   a Throw button work too (keyboard and switch friendly). */
(() => {
  'use strict';
  const K = window.MsbKidGames; if (!K) return;
  const { t, esc, lang, sound, buzz, prog, award, render, verseHtml, gameHead, reduced } = K._helpers;
  const D = () => window.MsbKidGamesData, C = () => window.MsbKidGamesCore;
  const S = () => D().SLING;
  let raf = 0;
  const stop = () => { if (raf) cancelAnimationFrame(raf); raf = 0; };

  function start() { return { view: 'pick', at: 0 }; }
  function begin(s, i) {
    const lv = S().levels[i];
    Object.assign(s, { view: 'play', at: i, targets: lv.targets.map(x => ({ ...x, down: false })), stones: 5, stone: null, aim: null, angle: 35, power: 70, won: false, lost: false, msg: '', bursts: [] });
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
      const n = C().slingStars(s.stones);
      return `${top}${field}<div class="kg-ark-lesson"><span class="eyebrow">${esc(t('COURAGE', 'VALENTÍA'))}</span><p>${esc(S().lesson[l])}</p></div>${verseHtml(lv.verse, t('ALL TARGETS DOWN!', '¡TODOS LOS BLANCOS DERRIBADOS!'), `${starRow(n)}${s.at + 1 < S().levels.length ? `<button type="button" class="primary" data-sl-next>${esc(t('Next level', 'Siguiente nivel'))}</button>` : ''}<button type="button" class="secondary" data-sl-again>${esc(t('Play again', 'Jugar otra vez'))}</button>`)}`;
    }
    if (s.lost) return `${top}${field}<div class="kg-verse" role="status" aria-live="polite"><span class="eyebrow">${esc(t('OUT OF STONES', 'SIN PIEDRAS'))}</span><p>${esc(t('David trusted God and kept going. Pick up five new stones and try again!', 'David confió en Dios y siguió adelante. ¡Toma cinco piedras nuevas e inténtalo otra vez!'))}</p><div class="kg-actions"><button type="button" class="primary" data-sl-again>${esc(t('Try again', 'Intentar otra vez'))}</button></div></div>`;
    return `${top}${field}<p class="kg-msg" role="status" aria-live="polite" data-kg-msg>${esc(s.msg || t('Pull back and let go!', '¡Jala hacia atrás y suelta!'))}</p><div class="kg-sl-controls"><label>${esc(t('Angle', 'Ángulo'))} <input type="range" min="-10" max="80" value="${s.angle}" data-sl-angle aria-valuetext="${s.angle}°"></label><label>${esc(t('Power', 'Fuerza'))} <input type="range" min="20" max="100" value="${s.power}" data-sl-power aria-valuetext="${s.power}%"></label><button type="button" class="primary" data-sl-throw>${esc(t('Throw', 'Lanzar'))} 🪨</button></div>`;
  }

  /* ---------- Drawing ---------- */
  function drawTarget(g, tg) {
    g.save(); g.translate(tg.x, tg.y);
    if (tg.down) { g.globalAlpha = 0.25; g.rotate(0.9); }
    const r = tg.r;
    g.lineWidth = 2.5; g.strokeStyle = '#4a3428';
    if (tg.kind === 'jar') { g.fillStyle = '#c97b5a'; g.beginPath(); g.ellipse(0, 3, r * 0.9, r, 0, 0, Math.PI * 2); g.fill(); g.stroke(); g.fillStyle = '#a65f40'; g.fillRect(-r * 0.45, -r - 3, r * 0.9, 6); }
    else if (tg.kind === 'shield') { g.fillStyle = '#b8a07a'; g.beginPath(); g.arc(0, 0, r, 0, Math.PI * 2); g.fill(); g.stroke(); g.fillStyle = '#8a6e45'; g.beginPath(); g.arc(0, 0, r * 0.35, 0, Math.PI * 2); g.fill(); }
    else if (tg.kind === 'spear') { g.strokeStyle = '#7a5a3a'; g.lineWidth = 4; g.beginPath(); g.moveTo(0, r * 1.4); g.lineTo(0, -r * 0.6); g.stroke(); g.fillStyle = '#c9ced6'; g.strokeStyle = '#4a3428'; g.lineWidth = 2; g.beginPath(); g.moveTo(0, -r * 1.4); g.lineTo(r * 0.45, -r * 0.5); g.lineTo(-r * 0.45, -r * 0.5); g.closePath(); g.fill(); g.stroke(); }
    else { g.fillStyle = '#c9a34a'; g.beginPath(); g.arc(0, 4, r, Math.PI, 0); g.lineTo(r, 6); g.lineTo(-r, 6); g.closePath(); g.fill(); g.stroke(); g.fillStyle = '#e8d08a'; g.fillRect(-2, -r + 2, 4, r); }
    g.restore();
  }
  function draw(cv, s) {
    const g = cv.getContext('2d'); if (!g) return;
    const k = cv.width / 400;
    g.setTransform(k, 0, 0, k, 0, 0);
    const sky = g.createLinearGradient(0, 0, 0, 300); sky.addColorStop(0, '#8fd0f5'); sky.addColorStop(1, '#e7f5ff');
    g.fillStyle = sky; g.fillRect(0, 0, 400, 300);
    /* the giant, far away and friendly-looking, behind the targets */
    g.save(); g.globalAlpha = 0.35; g.fillStyle = '#6f7c88';
    g.beginPath(); g.arc(352, 40, 16, 0, Math.PI * 2); g.fill(); g.fillRect(334, 56, 36, 70); g.fillRect(338, 126, 12, 50); g.fillRect(356, 126, 12, 50); g.restore();
    g.fillStyle = '#9ccf7a'; g.beginPath(); g.moveTo(0, 250); g.quadraticCurveTo(120, 226, 220, 246); g.quadraticCurveTo(320, 262, 400, 240); g.lineTo(400, 300); g.lineTo(0, 300); g.fill();
    g.fillStyle = '#7fbf62'; g.fillRect(0, 280, 400, 20);
    /* a few flowers */
    for (const [fx, fy, c] of [[150, 262, '#ffd166'], [200, 270, '#ff9db5'], [260, 268, '#ffffff'], [110, 272, '#ff9db5']]) { g.fillStyle = c; g.beginPath(); g.arc(fx, fy, 3, 0, Math.PI * 2); g.fill(); }
    for (const r of S().levels[s.at].rocks) { g.fillStyle = '#9a948c'; g.strokeStyle = '#5f5a54'; g.lineWidth = 2; g.beginPath(); g.roundRect ? g.roundRect(r.x, r.y, r.w, r.h, 8) : g.rect(r.x, r.y, r.w, r.h); g.fill(); g.stroke(); }
    for (const tg of s.targets) drawTarget(g, tg);
    /* David */
    const P = C().SLING;
    g.fillStyle = '#8a6e4b'; g.fillRect(P.x - 30, P.y + 10, 6, 46);
    g.fillStyle = '#5b8fd6'; g.beginPath(); g.moveTo(P.x - 26, P.y + 10); g.lineTo(P.x - 10, P.y + 10); g.lineTo(P.x - 6, P.y + 46); g.lineTo(P.x - 30, P.y + 46); g.closePath(); g.fill();
    g.fillStyle = '#f2c9a0'; g.beginPath(); g.arc(P.x - 18, P.y, 10, 0, Math.PI * 2); g.fill();
    g.fillStyle = '#6b4a2e'; g.beginPath(); g.arc(P.x - 18, P.y - 4, 10, Math.PI, 0); g.fill();
    /* the sling and the aim */
    const pouch = s.aim ? { x: P.x + s.aim.dx * Math.min(1, P.maxPull / (Math.hypot(s.aim.dx, s.aim.dy) || 1)), y: P.y + s.aim.dy * Math.min(1, P.maxPull / (Math.hypot(s.aim.dx, s.aim.dy) || 1)) } : { x: P.x, y: P.y };
    g.strokeStyle = '#7a5a3a'; g.lineWidth = 2; g.beginPath(); g.moveTo(P.x - 10, P.y + 4); g.lineTo(pouch.x, pouch.y); g.stroke();
    if (s.aim) {
      g.fillStyle = 'rgba(255,255,255,.9)';
      for (const [x, y] of C().slingPreview(s.aim.dx, s.aim.dy)) { g.beginPath(); g.arc(x, y, 2.6, 0, Math.PI * 2); g.fill(); }
    }
    if (!s.stone || !s.stone.alive) { g.fillStyle = '#8c8680'; g.beginPath(); g.arc(pouch.x, pouch.y, P.radius, 0, Math.PI * 2); g.fill(); }
    if (s.stone && s.stone.alive) { g.fillStyle = '#7d7771'; g.strokeStyle = '#4e4945'; g.lineWidth = 1.5; g.beginPath(); g.arc(s.stone.x, s.stone.y, P.radius, 0, Math.PI * 2); g.fill(); g.stroke(); }
    for (const b of s.bursts) { g.globalAlpha = Math.max(0, 1 - b.age / 0.6); g.fillStyle = '#ffd35a'; for (let i = 0; i < 8; i += 1) { const a = i / 8 * Math.PI * 2; g.beginPath(); g.arc(b.x + Math.cos(a) * b.age * 70, b.y + Math.sin(a) * b.age * 70, 3, 0, Math.PI * 2); g.fill(); } g.globalAlpha = 1; }
  }
  function size(cv) {
    const w = cv.parentElement.clientWidth || 340, dpr = Math.min(2, window.devicePixelRatio || 1);
    cv.style.width = `${w}px`; cv.style.height = `${w * 0.75}px`;
    cv.width = Math.round(w * dpr); cv.height = Math.round(w * 0.75 * dpr);
  }
  function throwStone(ui, stone) {
    const s = ui.state;
    if (s.won || s.lost || s.stones <= 0 || (s.stone && s.stone.alive)) return;
    s.stones -= 1; s.stone = stone; s.aim = null; s.msg = '';
    sound('whoosh'); buzz(10);
    const pb = document.querySelector('.kg-sl-stones'); if (pb) { pb.querySelectorAll('i').forEach((el, i) => el.classList.toggle('on', i < s.stones)); pb.setAttribute('aria-label', t('{n} stones left', 'Quedan {n} piedras', { n: s.stones })); }
    fly(ui);
  }
  function fly(ui) {
    stop();
    const s = ui.state, cv = document.querySelector('[data-sl-canvas]'); if (!cv) return;
    let last = performance.now();
    const frame = now => {
      if (!cv.isConnected || ui.state !== s) { raf = 0; return; }
      const dt = Math.min(0.04, (now - last) / 1000); last = now;
      const hits = s.stone ? C().slingStep(s.stone, dt, s.targets, S().levels[s.at].rocks) : [];
      for (const h of hits) { sound('good'); buzz(25); if (!reduced()) s.bursts.push({ x: h.x, y: h.y, age: 0 }); const c = document.querySelector('.kg-sl-top .kg-chip'); if (c) c.textContent = `🎯 ${s.targets.filter(x => x.down).length}/${s.targets.length}`; }
      s.bursts.forEach(b => { b.age += dt; }); s.bursts = s.bursts.filter(b => b.age < 0.6);
      draw(cv, s);
      const flying = s.stone && s.stone.alive;
      if (!flying && s.stone && !s.stone.ended) {
        s.stone.ended = true;
        if (s.targets.every(x => x.down)) {
          s.won = true; const lv = S().levels[s.at];
          prog().finish('sling', lv.id); prog().best(`sling:${lv.id}`, C().slingStars(s.stones));
          setTimeout(() => { sound('win'); buzz([20, 40, 30]); render(); award(); const l = document.querySelector('.kg-ark-lesson'); if (l) l.scrollIntoView({ block: 'start', behavior: reduced() ? 'auto' : 'smooth' }); }, 350);
          raf = 0; return;
        }
        if (!hits.length && s.stone.x < 400 && s.stone.y < 300) sound('thud');
        if (s.stones <= 0) { s.lost = true; setTimeout(() => { sound('bad'); render(); }, 400); raf = 0; return; }
        const m = document.querySelector('[data-kg-msg]'); if (m) m.textContent = t('Good throw! {n} stones left.', '¡Buen tiro! Quedan {n} piedras.', { n: s.stones });
      }
      if (flying || s.bursts.length) raf = requestAnimationFrame(frame); else raf = 0;
    };
    raf = requestAnimationFrame(frame);
  }
  function mount(screen, ui) {
    stop();
    const s = ui.state, cv = screen.querySelector('[data-sl-canvas]');
    if (!cv) return;
    size(cv); draw(cv, s);
    if (s.won || s.lost) return;
    const toWorld = e => { const r = cv.getBoundingClientRect(); return { x: (e.clientX - r.left) / r.width * 400, y: (e.clientY - r.top) / r.height * 300 }; };
    let drag = null;
    cv.addEventListener('pointerdown', e => {
      if (s.stone && s.stone.alive) return;
      e.preventDefault(); drag = { id: e.pointerId, from: toWorld(e) };
      try { cv.setPointerCapture(e.pointerId); } catch { /* ignore */ }
      sound('pick');
    });
    cv.addEventListener('pointermove', e => {
      if (!drag || e.pointerId !== drag.id) return;
      const p = toWorld(e); s.aim = { dx: p.x - drag.from.x, dy: p.y - drag.from.y }; draw(cv, s);
    });
    const end = e => {
      if (!drag || e.pointerId !== drag.id) return;
      drag = null;
      const a = s.aim; s.aim = null;
      if (a && Math.hypot(a.dx, a.dy) > 12) throwStone(ui, C().slingShot(a.dx, a.dy)); else draw(cv, s);
    };
    cv.addEventListener('pointerup', end);
    cv.addEventListener('pointercancel', () => { drag = null; s.aim = null; draw(cv, s); });
    const showAim = () => { const a = s.angle * Math.PI / 180, len = C().SLING.maxPull * s.power / 100; s.aim = { dx: -Math.cos(a) * len, dy: Math.sin(a) * len }; draw(cv, s); };
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
      if (el.closest('[data-sl-throw]')) { throwStone(ui, C().slingAim(s.angle, s.power / 100)); return; }
      const pick = el.closest('[data-sl-pick]'); if (pick) { begin(s, +pick.dataset.slPick); sound('pick'); render(); window.scrollTo({ top: 0, behavior: 'auto' }); return; }
      if (el.closest('[data-sl-again]')) { begin(s, s.at); sound('pick'); render(); window.scrollTo({ top: 0, behavior: 'auto' }); return; }
      if (el.closest('[data-sl-next]')) { begin(s, s.at + 1); sound('pick'); render(); window.scrollTo({ top: 0, behavior: 'auto' }); }
    }
  });
})();
