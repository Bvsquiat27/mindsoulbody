/* Coloring book for little ones: color with a finger, like crayons.
   Original line art in img/coloring/. Two stacked canvases: the color layer
   underneath (strokes and eraser) and the line layer on top (black ink with
   the paper made transparent), so the outlines always stay visible and the
   eraser can never remove them. */
(() => {
  'use strict';
  const PAGES = ['creation', 'noah', 'stars', 'joseph', 'moses', 'david', 'daniel', 'jonah', 'nativity', 'storm', 'children', 'feeding', 'sheep', 'easter'];
  const COLORS = [
    ['#e53935', 'Red', 'Rojo'], ['#fb8c00', 'Orange', 'Naranja'], ['#fdd835', 'Yellow', 'Amarillo'], ['#9ccc65', 'Light green', 'Verde claro'],
    ['#2e7d32', 'Green', 'Verde'], ['#4fc3f7', 'Sky blue', 'Celeste'], ['#1e5bd8', 'Blue', 'Azul'], ['#8e24aa', 'Purple', 'Morado'],
    ['#f48fb1', 'Pink', 'Rosado'], ['#8d5524', 'Brown', 'Café'], ['#f6c9a0', 'Peach', 'Durazno'], ['#757575', 'Gray', 'Gris']
  ];
  const SIZES = [['small', 10, 'Small', 'Chico'], ['medium', 22, 'Medium', 'Mediano'], ['big', 40, 'Big', 'Grande']];
  const W = 1200, H = 675;
  const core = () => window.MsbColoringCore;
  const es = () => !!(window.MsbI18n && MsbI18n.lang() === 'es');
  const t = (en, sp) => es() ? sp : en;
  const esc = v => String(v ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const thumb = id => `img/coloring/${id}-400.webp`;
  const page = id => `img/coloring/${id}.png`;
  let session = null;
  const sprites = new Map();

  function gridHtml(titleOf) {
    return `<section class="coloring-book" data-i18n-skip><h2>${t('Coloring book', 'Libro para colorear')}</h2><p class="muted">${t('Pick a picture, choose a color, and color it in with your finger.', 'Escoge un dibujo, elige un color y coloréalo con el dedo.')}</p><div class="coloring-grid">${PAGES.map(id => `<button type="button" class="card coloring-thumb" data-coloring-open="${id}"><img src="${thumb(id)}" width="400" height="225" alt="" loading="lazy" decoding="async"><span>${esc(titleOf(id))}</span></button>`).join('')}</div></section>`;
  }

  function screenHtml(title) {
    const dots = COLORS.map(([hex, en, sp], i) => `<button type="button" class="coloring-dot${i === 0 ? ' active' : ''}" data-coloring-color="${hex}" style="--dot:${hex}" aria-label="${esc(t(en, sp))}" aria-pressed="${i === 0}"></button>`).join('');
    const sizes = SIZES.map(([id, px, en, sp]) => `<button type="button" class="coloring-tool coloring-size${id === 'medium' ? ' active' : ''}" data-coloring-size="${px}" aria-pressed="${id === 'medium'}" aria-label="${esc(t('Brush size: ' + en, 'Tamaño del pincel: ' + sp))}"><i style="--size:${Math.round(px / 2.5) + 4}px"></i>${esc(t(en, sp))}</button>`).join('');
    return `<div class="coloring-screen" data-i18n-skip><button class="text-button back" type="button" data-coloring-back>${t('← Stories', '← Historias')}</button><span class="eyebrow">${t('COLORING BOOK', 'LIBRO PARA COLOREAR')}</span><h1>${esc(title)}</h1>
      <div class="coloring-stage"><canvas class="coloring-color" width="${W}" height="${H}"></canvas><canvas class="coloring-lines" width="${W}" height="${H}" role="img" aria-label="${esc(t('Coloring page: ', 'Dibujo para colorear: ') + title)}"></canvas></div>
      <p class="coloring-status muted" aria-live="polite">${t('Loading the picture…', 'Cargando el dibujo…')}</p>
      <div class="coloring-dots" role="group" aria-label="${t('Colors', 'Colores')}">${dots}</div>
      <div class="coloring-tools" role="group" aria-label="${t('Brush', 'Pincel')}">${sizes}<button type="button" class="coloring-tool" data-coloring-eraser aria-pressed="false">🧽 ${t('Eraser', 'Borrador')}</button></div>
      <div class="coloring-tools"><button type="button" class="coloring-tool" data-coloring-undo>↶ ${t('Undo', 'Deshacer')}</button><button type="button" class="coloring-tool" data-coloring-clear>${t('Clear', 'Empezar de nuevo')}</button><button type="button" class="primary coloring-save" data-coloring-save>${t('Save picture', 'Guardar dibujo')}</button></div></div>`;
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

  function loadImage(src) {
    return new Promise((resolve, reject) => { const img = new Image(); img.onload = () => resolve(img); img.onerror = () => reject(Error('image')); img.src = src; });
  }

  async function open(root, id, title) {
    if (!PAGES.includes(id)) return false;
    root.innerHTML = screenHtml(title);
    const color = root.querySelector('.coloring-color'), lines = root.querySelector('.coloring-lines'), stage = root.querySelector('.coloring-stage');
    const status = root.querySelector('.coloring-status');
    const s = session = { id, root, stage, color, lines, cctx: color.getContext('2d', { willReadFrequently: true }), ready: false, hex: COLORS[0][0], size: 22, eraser: false, undo: core().undoStack(20), last: null, pointer: null };
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

  function strokeTo(s, pt) {
    const from = s.last || pt;
    for (const p of core().stampPoints(from, pt, Math.max(1.5, s.size * 0.22))) stamp(s, p);
    s.last = pt;
  }

  function pick(s, selector, button) {
    s.root.querySelectorAll(selector).forEach(b => { const on = b === button; b.classList.toggle('active', on); b.setAttribute('aria-pressed', String(on)); });
  }

  function save(s) {
    const out = document.createElement('canvas'); out.width = W; out.height = H;
    const ctx = out.getContext('2d');
    const flat = core().flatten(s.cctx.getImageData(0, 0, W, H).data, s.lines.getContext('2d').getImageData(0, 0, W, H).data);
    const img = ctx.createImageData(W, H); img.data.set(flat); ctx.putImageData(img, 0, 0);
    const name = `${t('coloring', 'colorear')}-${s.id}.png`;
    const go = url => { const a = document.createElement('a'); a.href = url; a.download = name; document.body.appendChild(a); a.click(); a.remove(); };
    if (out.toBlob) out.toBlob(blob => { if (!blob) return; const url = URL.createObjectURL(blob); go(url); setTimeout(() => URL.revokeObjectURL(url), 4000); }, 'image/png');
    else go(out.toDataURL('image/png'));
  }

  document.addEventListener('click', event => {
    const s = session;
    if (!s || !s.root.isConnected || !event.target.closest('.coloring-screen')) return;
    const dot = event.target.closest('[data-coloring-color]');
    if (dot) { s.hex = dot.dataset.coloringColor; s.eraser = false; pick(s, '[data-coloring-color]', dot); pick(s, '[data-coloring-eraser]', null); return; }
    const size = event.target.closest('[data-coloring-size]');
    if (size) { s.size = Number(size.dataset.coloringSize) || 22; pick(s, '[data-coloring-size]', size); return; }
    const eraser = event.target.closest('[data-coloring-eraser]');
    if (eraser) { s.eraser = !s.eraser; pick(s, '[data-coloring-eraser]', s.eraser ? eraser : null); return; }
    if (event.target.closest('[data-coloring-undo]')) { const prev = s.undo.pop(); if (prev) s.cctx.putImageData(prev, 0, 0); return; }
    if (event.target.closest('[data-coloring-clear]')) { s.undo.push(s.cctx.getImageData(0, 0, W, H)); s.cctx.clearRect(0, 0, W, H); return; }
    if (event.target.closest('[data-coloring-save]')) save(s);
  });

  document.addEventListener('pointerdown', event => {
    const s = session;
    if (!s || !s.ready || s.pointer !== null || !event.target.closest('.coloring-stage') || !s.root.isConnected) return;
    event.preventDefault();
    s.pointer = event.pointerId;
    try { s.stage.setPointerCapture(event.pointerId); } catch { /* ignore */ }
    s.undo.push(s.cctx.getImageData(0, 0, W, H));
    s.last = null;
    strokeTo(s, toCanvas(s, event));
  });
  document.addEventListener('pointermove', event => {
    const s = session;
    if (!s || s.pointer !== event.pointerId) return;
    event.preventDefault();
    const list = event.getCoalescedEvents ? event.getCoalescedEvents() : [];
    for (const e of (list.length ? list : [event])) strokeTo(s, toCanvas(s, e));
  });
  const end = event => { const s = session; if (s && s.pointer === event.pointerId) { s.pointer = null; s.last = null; } };
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
