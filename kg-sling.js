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
  const POWER = { slow: { icon: '🐢', en: 'Slow!', es: '¡Lento!' }, reverse: { icon: '↩', en: 'Back up!', es: '¡Atrás!' }, bomb: { icon: '💥', en: 'Boom!', es: '¡Bum!' }, zap: { icon: '⚡', en: 'Zap! Same color gone!', es: '¡Zas! ¡Fuera ese color!' } };
  /* painted power-stone badges, drawn on the stone (img/kids, see kids-art.js) */
  const KA = () => window.MsbKidsArt;
  const POW_ART = { slow: 'sling-pow-slow', reverse: 'sling-pow-reverse', bomb: 'sling-pow-bomb', zap: 'sling-pow-zap' };
  let raf = 0;
  const stop = () => { if (raf) cancelAnimationFrame(raf); raf = 0; };

  function start() { return { view: 'pick', at: 0 }; }
  function begin(s, i) {
    ['goliath-idle', 'goliath-angry', 'goliath-hit', 'goliath-laugh', 'david', 'valley'].forEach(spr);
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
    const lv = S().levels.map((x, i) => { const st = Number(v.best[`sling:${x.id}`]) || 0; const open = i === 0 || (v.done.sling || []).includes(S().levels[i - 1].id); return `<li><button type="button" class="card kg-pick zm-pick${st ? ' done' : ''}" ${open ? `data-sl-pick="${i}"` : 'disabled'}><span class="kg-pick-icon" aria-hidden="true">${open ? KA().img(KA().spot(`sling-level|${x.id}`) || 'sling-stone', { px: 44, cls: 'kg-pick-art' }) : '🔒'}</span><span><strong>${esc(t('Level {n}', 'Nivel {n}', { n: i + 1 }))} · ${esc(x.title[l])}</strong><small>${esc(open ? t('{n} stones in the chain', '{n} piedras en la cadena', { n: x.count }) : t('Finish level {n} first', 'Termina primero el nivel {n}', { n: i }))}</small>${st ? starRow(st) : ''}</span></button></li>`; }).join('');
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
    if (s.lost) return `${head}${field}${levelCard({ lost: true, art: KA().img('sling-lost', { px: 72 }), eyebrow: t('THE STONES REACHED GOLIATH', 'LAS PIEDRAS LLEGARON A GOLIAT'), title: t('So close!', '¡Casi!'), text: t('David trusted God and kept going. Try again!', 'David confió en Dios y siguió adelante. ¡Inténtalo otra vez!'), actions: `<button type="button" class="primary" data-sl-again>${esc(t('Try again', 'Intentar otra vez'))}</button><button type="button" class="secondary" data-sl-list>${esc(t('Levels', 'Niveles'))}</button>` })}${verseHtml(lv.verse, t('A VERSE FOR COURAGE', 'UN VERSÍCULO PARA SER VALIENTE'), '')}`;
    const tut = coach('sling', t('David’s Sling', 'La honda de David'), [
      { icon: KA().img('howto-sling-aim', { px: 34 }), text: t('Tap or drag to aim. Let go to sling the stone.', 'Toca o arrastra para apuntar. Suelta para lanzar la piedra.') },
      { icon: KA().img('howto-sling-match', { px: 34 }), text: t('Make 3 or more of a color touch to pop them. Gaps that close can pop again!', 'Junta 3 o más del mismo color para reventarlas. ¡Los huecos que se cierran pueden reventar otra vez!') },
      { icon: KA().img('howto-sling-swap', { px: 34 }), text: t('Tap David or Swap to use your next stone.', 'Toca a David o Cambiar para usar tu siguiente piedra.') },
      { icon: KA().img('howto-sling-win', { px: 34 }), text: t('Clear the chain, then hit Goliath to win. Do not let the stones reach him!', 'Vacía la cadena y luego golpea a Goliat para ganar. ¡No dejes que las piedras lleguen a él!') },
    ], K._ui.coachForce === 'sling');
    const hint = s.final ? t('Now aim at Goliath and let go!', '¡Ahora apunta a Goliat y suelta!') : s.msg || t('Tap or drag to aim, let go to throw.', 'Toca o arrastra para apuntar, suelta para lanzar.');
    return `${tut}${head}${field}<div class="zm-bar"><span class="zm-hold"><span class="small">${esc(t('Now', 'Ahora'))}</span>${stoneDot(s.cur, true)}<span class="sr-only">${esc(stoneName(s.cur.c))}</span></span><button type="button" class="secondary zm-swap" data-sl-swap aria-label="${esc(t('Swap: use the {b} stone next', 'Cambiar: usar la piedra {b}', { b: stoneName(s.next.c) }))}">🔁 ${esc(t('Swap', 'Cambiar'))}</button><span class="zm-hold"><span class="small">${esc(t('Next', 'Siguiente'))}</span>${stoneDot(s.next)}</span></div><p class="kg-msg" role="status" aria-live="polite" data-kg-msg>${esc(hint)}</p>`;
  }

  /* ---------- drawing ---------- */
  const rr = (g, x, y, w, h, r) => { g.beginPath(); if (g.roundRect) g.roundRect(x, y, w, h, r); else g.rect(x, y, w, h); };
  let bg = null, bgKey = '';
  /* painted sprites (original art, precached by the service worker). There is
     no drawn fallback: the field stays hidden until every picture has loaded,
     so only the painted art is ever shown. */
  const SPRITES = ['goliath-idle', 'goliath-angry', 'goliath-hit', 'goliath-laugh', 'david', 'valley'];
  let artReady = null;
  function preloadArt() {
    if (!artReady) {
      artReady = Promise.all(SPRITES.map(name => new Promise((ok, fail) => {
        spr(name); const im = SPR[name];
        const done = () => (im.naturalWidth ? (im.decode ? im.decode().catch(() => null) : Promise.resolve()).then(ok) : fail(Error(name)));
        if (im.complete) done(); else { im.addEventListener('load', done, { once: true }); im.addEventListener('error', () => fail(Error(name)), { once: true }); }
      })).concat(Object.values(POW_ART).map(n => new Promise(ok => {
        /* power badges: wait for them too, but a missing one only leaves the stone plain */
        const im = KA().image(n); if (!im || KA().ready(im)) { ok(); return; }
        im.addEventListener('load', ok, { once: true }); im.addEventListener('error', ok, { once: true });
      })))).then(() => { bg = null; }, err => { artReady = null; for (const n of SPRITES) if (SPR[n] && !SPR[n].naturalWidth) delete SPR[n]; throw err; });
    }
    return artReady;
  }
  const artLoaded = () => SPRITES.every(n => SPR[n] && SPR[n].complete && SPR[n].naturalWidth);
  const SPR = {};
  /* Goliath's drawn height: as tall as fits above the end of the track */
  const gHeight = e => Math.max(104, Math.min(150, e.y + 2));
  const gChest = e => e.y - gHeight(e) * 0.55;
  function spr(name) {
    if (typeof Image === 'undefined') return null;
    let im = SPR[name];
    if (!im) { im = SPR[name] = new Image(); im.decoding = 'async'; im.onload = () => { bg = null; }; im.src = `img/sling/${name}.webp`; }
    return im.complete && im.naturalWidth ? im : null;
  }
  function background(w, h, path) {
    const key = `${w}x${h}:${path.name}`; if (bg && bgKey === key) return bg;
    const c = document.createElement('canvas'); c.width = w; c.height = h;
    const g = c.getContext('2d'); if (!g) return null;
    const k = w / 360; g.setTransform(k, 0, 0, k, 0, 0);
    /* the valley of Elah from above: warm grass, a brook, flowers and rocks */
    const ground = g.createLinearGradient(0, 0, 0, 480); ground.addColorStop(0, '#b9d98a'); ground.addColorStop(0.5, '#a3cc72'); ground.addColorStop(1, '#8fbf5f');
    g.fillStyle = ground; g.fillRect(0, 0, 360, 480);
    const paint = spr('valley');
    if (paint) { const sc = Math.max(360 / paint.naturalWidth, 480 / paint.naturalHeight); g.drawImage(paint, (360 - paint.naturalWidth * sc) / 2, (480 - paint.naturalHeight * sc) / 2, paint.naturalWidth * sc, paint.naturalHeight * sc); }
    /* the carved stone track */
    const line = (wd, col, dash) => { g.strokeStyle = col; g.lineWidth = wd; g.lineJoin = 'round'; g.lineCap = 'round'; g.setLineDash(dash || []); g.beginPath(); path.pts.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y))); g.stroke(); g.setLineDash([]); };
    line(38, 'rgba(40,25,10,.28)'); line(32, '#6b4a2b'); line(27, '#c49a62'); line(21, '#a87e4c'); line(8, 'rgba(255,235,200,.12)'); line(2, 'rgba(255,240,210,.5)', [6, 8]);
    /* the giant's camp: tents and a dark pit at the end of the track */
    const e = path.goliath;
    g.fillStyle = 'rgba(40,25,10,.55)'; g.beginPath(); g.ellipse(e.x, e.y + 4, 20, 10, 0, 0, TAU); g.fill();
    if (!paint) for (const [dx, dy, cl] of [[-46, -10, '#e8d4b0'], [40, -4, '#d9b98a']]) { const x = e.x + dx, y = e.y + dy; if (x < 10 || x > 350) continue; g.fillStyle = cl; g.beginPath(); g.moveTo(x - 13, y + 9); g.lineTo(x, y - 9); g.lineTo(x + 13, y + 9); g.closePath(); g.fill(); g.strokeStyle = '#8a6a3a'; g.lineWidth = 1; g.stroke(); g.strokeStyle = '#c0392b'; g.beginPath(); g.moveTo(x, y - 9); g.lineTo(x, y - 17); g.stroke(); }
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
    if (st.p) { const pa = KA().image(POW_ART[st.p]); if (KA().ready(pa)) { const d = r * 1.5; g.drawImage(pa, -d / 2, -d / 2, d, d); } }
    g.fillStyle = 'rgba(255,255,255,.6)'; g.beginPath(); g.ellipse(-r * 0.38, -r * 0.42, r * 0.3, r * 0.17, -0.6, 0, TAU); g.fill();
    g.fillStyle = 'rgba(255,255,255,.9)'; g.beginPath(); g.arc(-r * 0.5, -r * 0.5, r * 0.08, 0, TAU); g.fill();
    g.strokeStyle = 'rgba(255,255,255,.35)'; g.lineWidth = 1; g.beginPath(); g.arc(0, 0, r * 0.8, 0.3, 1.6); g.stroke();
    g.strokeStyle = c.dark; g.globalAlpha = 0.7; g.lineWidth = 1.2; g.beginPath(); g.arc(0, 0, r - 0.5, 0, TAU); g.stroke(); g.globalAlpha = 1;
    g.restore();
  }
  /* Goliath: an original, exaggerated cartoon giant. Bronze helmet with a red
     plume, bronze scale armor, red tunic, a huge beard and a long spear.
     Poses: idle, angry, hit and falling. */
  function goliath(g, s, time) {
    const e = s.path.goliath, calm = reduced();
    const pose = s.falling > 0 ? 'fall' : s.gT > 0 ? s.gpose : (s.z.head / s.path.len > 0.7 || s.final) ? 'angry' : s.lost ? 'laugh' : 'idle';
    const sc = 0.82;
    const sp = spr(`goliath-${pose === 'fall' ? 'hit' : pose}`);
    if (sp) {
      g.save(); g.translate(e.x, e.y + 8);
      if (pose === 'fall') { const f = Math.min(1, s.falling); g.translate(f * 10, 0); g.rotate(-f * 1.45); g.globalAlpha = 1 - Math.max(0, f - 0.85) * 2; }
      let sx = 0; if (!calm && pose === 'hit') sx = Math.sin(time * 70) * 3; else if (!calm && (pose === 'angry' || pose === 'laugh')) sx = Math.sin(time * 40) * 1.2;
      const breathe = calm ? 1 : 1 + Math.sin(time * 2.2) * 0.012, H = gHeight(e), W = H * sp.naturalWidth / sp.naturalHeight;
      if (pose !== 'fall') { g.fillStyle = 'rgba(0,0,0,.28)'; g.beginPath(); g.ellipse(0, 0, W * 0.38, 8, 0, 0, TAU); g.fill(); }
      g.translate(sx, 0); g.scale(1, breathe);
      if (pose === 'hit' && !calm && s.gT > 0) g.filter = 'brightness(1.5)';
      g.drawImage(sp, -W / 2, -H, W, H); g.filter = 'none';
      g.restore();
    }
    /* "Ha ha!" when the chain reaches him */
    if (s.lost) { g.font = 'bold 15px system-ui, sans-serif'; g.textAlign = 'center'; g.lineWidth = 4; g.strokeStyle = 'rgba(0,0,0,.5)'; g.fillStyle = '#fff'; const tx = Math.min(320, Math.max(40, e.x)), ty = Math.max(20, e.y - 150); g.strokeText(t('Ha ha!', '¡Ja ja!'), tx, ty); g.fillText(t('Ha ha!', '¡Ja ja!'), tx, ty); }
    /* the target ring for the final stone */
    if (s.final && !s.won && !s.falling) { const r = 34 + (calm ? 0 : Math.sin(time * 6) * 4); g.strokeStyle = 'rgba(255,211,90,.95)'; g.lineWidth = 3; g.setLineDash([6, 6]); g.beginPath(); g.arc(e.x, gChest(e), r, 0, TAU); g.stroke(); g.setLineDash([]); }
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
    const dv = spr('david');
    if (dv) {
      const H = 62, W = H * dv.naturalWidth / dv.naturalHeight, flip = Math.cos(s.aim) > 0.15 ? -1 : 1;
      g.save(); if (pose === 'sad') g.rotate(0.12); g.scale(flip, 1);
      if (pose === 'worried' && !calm) g.translate(Math.sin(time * 30) * 0.8, 0);
      g.drawImage(dv, -W / 2, 20 - H, W, H); g.restore();
      if (pose === 'worried' && !calm) { g.fillStyle = '#7ad3ff'; g.beginPath(); g.moveTo(16, -34); g.quadraticCurveTo(20, -27, 16, -25); g.quadraticCurveTo(12, -27, 16, -34); g.fill(); }
      if (!s.won && !s.lost) {
        const a = s.aim, whirl = calm ? 0 : time * 9, hx = Math.cos(a) * 20, hy = -26 + Math.sin(a) * 14;
        const px = hx + Math.cos(a + Math.sin(whirl) * 0.5) * 10, py = hy + Math.sin(a + Math.sin(whirl) * 0.5) * 10;
        g.strokeStyle = '#6b4a2b'; g.lineWidth = 1.6; g.beginPath(); g.moveTo(0, -30); g.quadraticCurveTo(hx, hy - 6, px, py); g.stroke();
        if (!s.shot) stoneArt(g, px, py, s.cur, 8, true);
        stoneArt(g, 16, 12, s.next, 5);
      }
      g.restore(); return;
    }
  }
  /* where a shot would first touch the chain, for the aim guide */
  function aimGuide(s) {
    const d = s.path.david, dx = Math.cos(s.aim), dy = Math.sin(s.aim);
    for (let k = 20; k < 620; k += 6) {
      const x = d.x + dx * k, y = d.y + dy * k;
      if (x < -10 || x > 370 || y < -10 || y > 490) return { x, y, hit: false };
      if (s.final) { const e = s.path.goliath; if (Math.hypot(x - e.x, y - gChest(e)) < 34) return { x, y, hit: true }; }
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
    zap: () => { tone(1200, { f1: 300, dur: 0.35, peak: 0.05, type: 'sawtooth' }); noise({ filter: 'highpass', f0: 2500, dur: 0.3, peak: 0.03 }); },
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
              if (s.final) { const e = s.path.goliath; if (Math.hypot(sp.x - e.x, sp.y - gChest(e)) < 36) { s.shot = null; s.gpose = 'hit'; s.gT = 0.6; s.freeze = reduced() ? 0 : 0.18; s.shake = 0.6; sound('bong'); sound('crack'); buzz([40, 30, 60]); burstAt(s, e.x, gChest(e), '#ffd35a', 22); say(s, t('Down he goes!', '¡Al suelo!'), 180, 120, '#ffd35a', 24); s.falling = 0.001; sound('giantfall'); } }
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
    if (!artLoaded()) {
      /* hide the field until the painted art is ready, then mount again */
      cv.style.visibility = 'hidden';
      const field = cv.parentElement, note = document.createElement('p');
      note.className = 'sl-art-wait'; note.setAttribute('role', 'status'); note.textContent = t('Getting the valley ready…', 'Preparando el valle…');
      note.style.cssText = 'position:absolute;inset:0;display:grid;place-items:center;margin:0;color:#5b4a2e;font-weight:600;text-align:center;padding:0 16px';
      if (field && getComputedStyle(field).position === 'static') field.style.position = 'relative';
      field && field.appendChild(note);
      preloadArt().then(() => { if (cv.isConnected && ui.state === s && s.view === 'play') { note.remove(); cv.style.visibility = ''; mount(screen, ui); } },
        () => { if (note.isConnected) note.textContent = t('The pictures could not load. Check your connection and open the level again.', 'No se pudieron cargar las imágenes. Revisa tu conexión y abre el nivel otra vez.'); });
      return;
    }
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
    id: 'sling', icon: '🪨', art: 'tile-sling',
    name: { en: 'David\u2019s Sling', es: 'La honda de David' },
    blurb: { en: 'Stop the rolling stones and face the giant', es: 'Detén las piedras y enfrenta al gigante' },
    total: () => S().levels.length,
    start,
    leave: stop,
    render(ui) { preloadArt().catch(() => null); return gameHead(this) + (ui.state.view === 'play' ? playHtml(ui.state) : pickHtml()); },
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
