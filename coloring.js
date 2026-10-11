/* Coloring book for little ones: color with a finger, like crayons.
   Original line art in img/coloring/. Two stacked canvases: the color layer
   underneath (strokes and eraser) and the line layer on top (black ink with
   the paper made transparent), so the outlines always stay visible and the
   eraser can never remove them. */
(() => {
  'use strict';
  const PAGES = ['creation', 'noah', 'stars', 'joseph', 'moses', 'david', 'daniel', 'jonah', 'nativity', 'storm', 'children', 'feeding', 'sheep', 'easter'];
  /* 28 crayons, 7 to a row: brights, pastels, skin tones and browns, grays.
     Names go through the app dictionary (i18n.js) for Spanish. */
  const COLORS = [
    ['#e53935', 'Red'], ['#d81b60', 'Magenta'], ['#f48fb1', 'Pink'], ['#ff8a65', 'Coral'], ['#fb8c00', 'Orange'], ['#f6c9a0', 'Peach'], ['#fdd835', 'Yellow'],
    ['#fff59d', 'Lemon'], ['#d4a017', 'Gold'], ['#9ccc65', 'Light green'], ['#2e7d32', 'Green'], ['#00897b', 'Teal'], ['#a8e6cf', 'Mint'], ['#4fc3f7', 'Sky blue'],
    ['#b3d9ff', 'Baby blue'], ['#1e5bd8', 'Blue'], ['#1a237e', 'Navy'], ['#8e24aa', 'Purple'], ['#c5a3e8', 'Lavender'], ['#ffdbac', 'Light tan'], ['#e0ac69', 'Tan'],
    ['#c68642', 'Caramel'], ['#8d5524', 'Chocolate'], ['#4e342e', 'Dark brown'], ['#ffffff', 'White'], ['#bdbdbd', 'Light gray'], ['#757575', 'Gray'], ['#212121', 'Black']
  ];
  /* Sparkle pens: glitter ink plus bright specks (see MsbColoringCore.sparkleStroke). */
  const GLITTERS = [['gold', 'Gold glitter'], ['silver', 'Silver glitter'], ['pink', 'Pink glitter'], ['purple', 'Purple glitter'], ['blue', 'Blue glitter'], ['rainbow', 'Rainbow glitter']];
  const SWATCH = { gold: '#d9a400', silver: '#9ea7b2', pink: '#ff4fa3', purple: '#8a3ffc', blue: '#1f7cff', rainbow: 'conic-gradient(#ff3b3b,#ffb300,#ffee33,#3ddc84,#2f8cff,#9b4dff,#ff3b3b)' };
  const SIZES = [['small', 10, 'Small', 'Chico'], ['medium', 22, 'Medium', 'Mediano'], ['big', 40, 'Big', 'Grande']];
  const W = 1200, H = 675;
  const core = () => window.MsbColoringCore;
  const es = () => !!(window.MsbI18n && MsbI18n.lang() === 'es');
  const t = (en, sp) => es() ? sp : en;
  const L = en => window.MsbI18n ? MsbI18n.t(en) : en;
  const esc = v => String(v ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const thumb = id => `img/coloring/${id}-400.webp`;
  const page = id => `img/coloring/${id}.png`;
  let session = null;
  const sprites = new Map();
  const speckSprites = new Map();

  function gridHtml(titleOf) {
    return `<section class="coloring-book" data-i18n-skip><h2>${t('Coloring book', 'Libro para colorear')}</h2><p class="muted">${t('Pick a picture, choose a color, and color it in with your finger.', 'Escoge un dibujo, elige un color y coloréalo con el dedo.')}</p><div class="coloring-grid">${PAGES.map(id => `<button type="button" class="card coloring-thumb" data-coloring-open="${id}"><img src="${thumb(id)}" width="400" height="225" alt="" loading="lazy" decoding="async"><span>${esc(titleOf(id))}</span></button>`).join('')}</div></section>`;
  }

  function screenHtml(title) {
    const dots = COLORS.map(([hex, en], i) => `<button type="button" class="coloring-dot${i === 0 ? ' active' : ''}" data-coloring-color="${hex}" style="--dot:${hex}" aria-label="${esc(L(en))}" title="${esc(L(en))}" aria-pressed="${i === 0}"></button>`).join('');
    const glitters = GLITTERS.map(([id, en]) => `<button type="button" class="coloring-dot coloring-glitter" data-coloring-glitter="${id}" style="--dot:${SWATCH[id]}" aria-label="${esc(L(en))}" title="${esc(L(en))}" aria-pressed="false"></button>`).join('');
    const sizes = SIZES.map(([id, px, en, sp]) => `<button type="button" class="coloring-tool coloring-size${id === 'medium' ? ' active' : ''}" data-coloring-size="${px}" aria-pressed="${id === 'medium'}" aria-label="${esc(t('Brush size: ' + en, 'Tamaño del pincel: ' + sp))}"><i style="--size:${Math.round(px / 2.5) + 4}px"></i>${esc(t(en, sp))}</button>`).join('');
    return `<div class="coloring-screen" data-i18n-skip><button class="text-button back" type="button" data-coloring-back>${t('← Stories', '← Historias')}</button><span class="eyebrow">${t('COLORING BOOK', 'LIBRO PARA COLOREAR')}</span><h1>${esc(title)}</h1>
      <div class="coloring-stage"><canvas class="coloring-color" width="${W}" height="${H}"></canvas><canvas class="coloring-lines" width="${W}" height="${H}" role="img" aria-label="${esc(t('Coloring page: ', 'Dibujo para colorear: ') + title)}"></canvas></div>
      <p class="coloring-status muted" aria-live="polite">${t('Loading the picture…', 'Cargando el dibujo…')}</p>
      <div class="coloring-dots" role="group" aria-label="${esc(L('Colors'))}">${dots}</div>
      <p class="coloring-sparkle-title">${esc(L('✨ Sparkle pens'))}</p>
      <div class="coloring-dots coloring-glitters" role="group" aria-label="${esc(L('Sparkle pens'))}">${glitters}</div>
      <div class="coloring-tools" role="group" aria-label="${t('Brush', 'Pincel')}">${sizes}<button type="button" class="coloring-tool" data-coloring-eraser aria-pressed="false">🧽 ${t('Eraser', 'Borrador')}</button></div>
      <div class="coloring-tools"><button type="button" class="coloring-tool" data-coloring-undo>↶ ${t('Undo', 'Deshacer')}</button><button type="button" class="coloring-tool" data-coloring-clear>${t('Clear', 'Empezar de nuevo')}</button></div>
      <div class="coloring-save-row" role="group" aria-label="${esc(L('Save'))}"><button type="button" class="primary coloring-save" data-coloring-keep>${esc(L('💾 Save to My drawings'))}</button><button type="button" class="secondary coloring-save" data-coloring-save>${esc(L('📱 Save to phone'))}</button></div>
      <div class="coloring-save-choice" data-coloring-choice hidden><p>${esc(L('This picture is already in My drawings.'))}</p><button type="button" class="primary" data-coloring-keep-mode="update">${esc(L('Update the saved drawing'))}</button><button type="button" class="secondary" data-coloring-keep-mode="new">${esc(L('Save as a new copy'))}</button><button type="button" class="text-button" data-coloring-keep-mode="cancel">${esc(L('Cancel'))}</button></div>
      <p class="coloring-save-status small" data-coloring-save-status aria-live="polite"></p></div>`;
  }

  /* A soft round crayon tip: dense in the middle, feathered edge, a little grain. */
  function sprite(hex, size) {
    const key = hex + size;
    if (sprites.has(key)) return sprites.get(key);
    const d = Math.ceil(size * 2) + 2, c = document.createElement('canvas');
    c.width = c.height = d;
    const ctx = c.getContext('2d'), r = size;
    const g = ctx.createRadialGradient(d / 2, d / 2, 0, d / 2, d / 2, r);
    g.addColorStop(0, hex); g.addColorStop(0.6, hex); g.addColorStop(1, hex + '00');
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(d / 2, d / 2, r, 0, Math.PI * 2); ctx.fill();
    const img = ctx.getImageData(0, 0, d, d);
    let seed = size * 97 + hex.length;
    for (let p = 3; p < img.data.length; p += 4) { seed = (seed * 16807) % 2147483647; if (seed % 7 === 0) img.data[p] = Math.round(img.data[p] * 0.55); }
    ctx.putImageData(img, 0, 0);
    sprites.set(key, c);
    return c;
  }

  /* A bright speck: soft glow with a hard center; stars get four thin rays. */
  function speckSprite(hex, r, star) {
    const q = Math.max(1, Math.round(r * 2) / 2), key = hex + q + (star ? '*' : '');
    if (speckSprites.has(key)) return speckSprites.get(key);
    const reach = star ? q * 2.4 : q * 1.6, d = Math.ceil(reach * 2) + 2, c = document.createElement('canvas');
    c.width = c.height = d;
    const ctx = c.getContext('2d'), m = d / 2;
    const g = ctx.createRadialGradient(m, m, 0, m, m, reach);
    g.addColorStop(0, hex); g.addColorStop(star ? 0.25 : 0.55, hex); g.addColorStop(1, hex + '00');
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(m, m, reach, 0, Math.PI * 2); ctx.fill();
    if (star) {
      ctx.fillStyle = hex;
      ctx.beginPath(); ctx.moveTo(m, m - reach); ctx.lineTo(m + q * 0.35, m); ctx.lineTo(m, m + reach); ctx.lineTo(m - q * 0.35, m); ctx.closePath(); ctx.fill();
      ctx.beginPath(); ctx.moveTo(m - reach, m); ctx.lineTo(m, m - q * 0.35); ctx.lineTo(m + reach, m); ctx.lineTo(m, m + q * 0.35); ctx.closePath(); ctx.fill();
    }
    speckSprites.set(key, c);
    return c;
  }

  function loadImage(src) {
    return new Promise((resolve, reject) => { const img = new Image(); img.onload = () => resolve(img); img.onerror = () => reject(Error('image')); img.src = src; });
  }

  async function open(root, id, title, opts = {}) {
    if (!PAGES.includes(id)) return false;
    root.innerHTML = screenHtml(title);
    const color = root.querySelector('.coloring-color'), lines = root.querySelector('.coloring-lines'), stage = root.querySelector('.coloring-stage');
    const status = root.querySelector('.coloring-status');
    const s = session = { id, root, stage, color, lines, cctx: color.getContext('2d', { willReadFrequently: true }), ready: false, hex: COLORS[0][0], size: 22, eraser: false, glitter: null, trail: null, seed: 0, undo: core().undoStack(20), last: null, pointer: null, title, drawingId: null, busy: false };
    stage.addEventListener('touchmove', e => e.preventDefault(), { passive: false });
    try {
      let img;
      try { img = await loadImage(page(id)); } catch { img = await loadImage(thumb(id)); }
      if (session !== s) return true;
      const tmp = document.createElement('canvas'); tmp.width = W; tmp.height = H;
      const tctx = tmp.getContext('2d', { willReadFrequently: true });
      tctx.fillStyle = '#ffffff'; tctx.fillRect(0, 0, W, H); tctx.drawImage(img, 0, 0, W, H);
      const layer = core().lineLayer(tctx.getImageData(0, 0, W, H).data, W, H);
      const out = tctx.createImageData(W, H); out.data.set(layer);
      lines.getContext('2d').putImageData(out, 0, 0);
      s.ready = true;
      status.textContent = t('Color with your finger. The lines stay on top.', 'Colorea con el dedo. Las líneas se quedan encima.');
      if (opts.drawingId) await loadDrawing(s, opts.drawingId, status);
    } catch {
      status.textContent = t('This picture is not on this device yet. Connect once to save it.', 'Este dibujo todavía no está en el dispositivo. Conéctate una vez para guardarlo.');
    }
    return true;
  }

  function toCanvas(s, event) {
    const rect = s.lines.getBoundingClientRect();
    return { x: (event.clientX - rect.left) * W / rect.width, y: (event.clientY - rect.top) * H / rect.height };
  }

  function stamp(s, pt) {
    const ctx = s.cctx, tip = sprite(s.eraser ? '#000000' : s.hex, s.size), d = tip.width;
    ctx.globalCompositeOperation = s.eraser ? 'destination-out' : 'source-over';
    ctx.globalAlpha = s.eraser ? 1 : 0.9;
    ctx.drawImage(tip, pt.x - d / 2, pt.y - d / 2);
    ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
  }

  /* Run sparkle operations on the color layer (under the lines, so the eraser,
     undo, clear and save treat glitter like any other color). */
  function drawOps(s, ops) {
    const ctx = s.cctx;
    for (const op of ops) {
      if (op.t === 'tip') {
        const tip = sprite(op.hex, s.size), d = tip.width;
        ctx.globalAlpha = 0.9; ctx.drawImage(tip, op.x - d / 2, op.y - d / 2);
      } else {
        const sp = speckSprite(op.hex, op.r, op.star), d = sp.width;
        ctx.globalAlpha = 1; ctx.drawImage(sp, op.x - d / 2, op.y - d / 2);
      }
    }
    ctx.globalAlpha = 1;
  }

  function strokeTo(s, pt) {
    if (s.trail) { drawOps(s, s.trail.add(pt)); return; }
    const from = s.last || pt;
    for (const p of core().stampPoints(from, pt, Math.max(1.5, s.size * 0.22))) stamp(s, p);
    s.last = pt;
  }

  function pick(s, selector, button) {
    s.root.querySelectorAll(selector).forEach(b => { const on = b === button; b.classList.toggle('active', on); b.setAttribute('aria-pressed', String(on)); });
  }

  /* The finished picture: color under the outlines on white paper. */
  function flatCanvas(s) {
    const out = document.createElement('canvas'); out.width = W; out.height = H;
    const ctx = out.getContext('2d');
    const flat = core().flatten(s.cctx.getImageData(0, 0, W, H).data, s.lines.getContext('2d').getImageData(0, 0, W, H).data);
    const img = ctx.createImageData(W, H); img.data.set(flat); ctx.putImageData(img, 0, 0);
    return out;
  }

  function toBlob(canvas, type, quality) {
    return new Promise(resolve => {
      if (!canvas.toBlob) { resolve(null); return; }
      canvas.toBlob(blob => resolve(blob || null), type, quality);
    });
  }

  /* WebP keeps the color layer small and transparent; PNG when WebP is not offered. */
  async function layerBlob(s) {
    const webp = await toBlob(s.color, 'image/webp', 0.9);
    if (webp && webp.type === 'image/webp') return webp;
    return toBlob(s.color, 'image/png');
  }

  function saveStatus(s, text) { const node = s.root.querySelector('[data-coloring-save-status]'); if (node) node.textContent = text; }

  /* Bring a saved drawing back onto the color layer so coloring can go on. */
  async function loadDrawing(s, drawingId, status) {
    try {
      const row = await window.MsbDrawings?.store()?.get(drawingId);
      if (!row || row.page !== s.id || !row.layer || session !== s) return;
      const url = URL.createObjectURL(row.layer);
      try {
        const img = await loadImage(url);
        if (session !== s) return;
        s.cctx.clearRect(0, 0, W, H); s.cctx.drawImage(img, 0, 0, W, H);
      } finally { URL.revokeObjectURL(url); }
      s.drawingId = row.id;
      status.textContent = L('Your saved drawing is back. Keep coloring!');
    } catch { /* start with a clean page */ }
  }

  async function keep(s, mode) {
    const store = window.MsbDrawings?.store();
    if (!s.ready || s.busy) return;
    if (!store) { saveStatus(s, L('Saving drawings is not available in this browser.')); return; }
    const choice = s.root.querySelector('[data-coloring-choice]');
    if (!mode && s.drawingId) { choice.hidden = false; choice.querySelector('button')?.focus(); return; }
    choice.hidden = true;
    if (mode === 'cancel') return;
    s.busy = true;
    saveStatus(s, L('Saving…'));
    try {
      const flat = flatCanvas(s);
      const small = document.createElement('canvas'); small.width = 360; small.height = 203;
      small.getContext('2d').drawImage(flat, 0, 0, 360, 203);
      const [image, layer, thumbBlob] = await Promise.all([toBlob(flat, 'image/jpeg', 0.88), layerBlob(s), toBlob(small, 'image/jpeg', 0.8)]);
      if (!image) throw Error('encode');
      const row = await store.save({ page: s.id, title: s.title, image, layer, thumb: thumbBlob }, { updateId: mode === 'update' ? s.drawingId : null });
      s.drawingId = row.id;
      saveStatus(s, mode === 'update' ? L('Updated in My drawings (on your Profile).') : L('Saved in My drawings (on your Profile).'));
      if (navigator.storage && navigator.storage.persist) navigator.storage.persist().catch(() => {});
    } catch {
      saveStatus(s, L('That did not save. Please try again.'));
    } finally { s.busy = false; }
  }

  async function save(s) {
    if (!s.ready) return;
    const blob = await toBlob(flatCanvas(s), 'image/png');
    if (!blob) return;
    if (window.MsbDrawings) { saveStatus(s, MsbDrawings.phoneMessage(await MsbDrawings.toPhone(blob, s.id, s.title))); return; }
    const url = URL.createObjectURL(blob), a = document.createElement('a');
    a.href = url; a.download = `${L('coloring')}-${s.id}.png`; document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 10000);
  }

  document.addEventListener('click', event => {
    const s = session;
    if (!s || !s.root.isConnected || !event.target.closest('.coloring-screen')) return;
    const dot = event.target.closest('[data-coloring-color]');
    if (dot) { s.hex = dot.dataset.coloringColor; s.glitter = null; s.eraser = false; pick(s, '[data-coloring-color],[data-coloring-glitter]', dot); pick(s, '[data-coloring-eraser]', null); return; }
    const glitter = event.target.closest('[data-coloring-glitter]');
    if (glitter) { s.glitter = glitter.dataset.coloringGlitter; s.eraser = false; pick(s, '[data-coloring-color],[data-coloring-glitter]', glitter); pick(s, '[data-coloring-eraser]', null); return; }
    const size = event.target.closest('[data-coloring-size]');
    if (size) { s.size = Number(size.dataset.coloringSize) || 22; pick(s, '[data-coloring-size]', size); return; }
    const eraser = event.target.closest('[data-coloring-eraser]');
    if (eraser) { s.eraser = !s.eraser; pick(s, '[data-coloring-eraser]', s.eraser ? eraser : null); return; }
    if (event.target.closest('[data-coloring-undo]')) { const prev = s.undo.pop(); if (prev) s.cctx.putImageData(prev, 0, 0); return; }
    if (event.target.closest('[data-coloring-clear]')) { s.undo.push(s.cctx.getImageData(0, 0, W, H)); s.cctx.clearRect(0, 0, W, H); return; }
    if (event.target.closest('[data-coloring-save]')) { save(s); return; }
    const mode = event.target.closest('[data-coloring-keep-mode]');
    if (mode) { keep(s, mode.dataset.coloringKeepMode); return; }
    if (event.target.closest('[data-coloring-keep]')) keep(s, null);
  });

  document.addEventListener('pointerdown', event => {
    const s = session;
    if (!s || !s.ready || s.pointer !== null || !event.target.closest('.coloring-stage') || !s.root.isConnected) return;
    event.preventDefault();
    s.pointer = event.pointerId;
    try { s.stage.setPointerCapture(event.pointerId); } catch { /* ignore */ }
    s.undo.push(s.cctx.getImageData(0, 0, W, H));
    s.last = null;
    s.trail = s.glitter && !s.eraser ? core().sparkleStroke(s.glitter, s.size, (s.seed += 1)) : null;
    strokeTo(s, toCanvas(s, event));
  });
  document.addEventListener('pointermove', event => {
    const s = session;
    if (!s || s.pointer !== event.pointerId) return;
    event.preventDefault();
    const list = event.getCoalescedEvents ? event.getCoalescedEvents() : [];
    for (const e of (list.length ? list : [event])) strokeTo(s, toCanvas(s, e));
  });
  const end = event => { const s = session; if (s && s.pointer === event.pointerId) { if (s.trail) drawOps(s, s.trail.end()); s.trail = null; s.pointer = null; s.last = null; } };
  document.addEventListener('pointerup', end);
  document.addEventListener('pointercancel', end);

  window.MsbColoring = {
    PAGES,
    gridHtml,
    open,
    close() { session = null; },
    has: id => PAGES.includes(id),
    ready: () => !!(session && session.ready)
  };
})();
