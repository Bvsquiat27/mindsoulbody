/* Coloring book helpers: the line layer and the undo stack.
   Pure functions so they can be tested in Node and used in the browser. */
(function (root) {
  'use strict';

  /* Turn RGBA line art into the top layer: dark pixels become opaque black,
     paper becomes fully transparent. Anti-aliased gray edges keep a
     proportional alpha so the outline stays smooth, never a white halo. */
  function lineLayer(rgba, width, height, cutoff) {
    const paper = cutoff == null ? 235 : cutoff;
    const out = new Uint8ClampedArray(width * height * 4);
    for (let p = 0; p < out.length; p += 4) {
      const lum = 0.299 * rgba[p] + 0.587 * rgba[p + 1] + 0.114 * rgba[p + 2];
      if (rgba[p + 3] < 128 || lum >= paper) continue;
      const alpha = lum <= 90 ? 255 : Math.round(255 * (paper - lum) / (paper - 90));
      out[p + 3] = alpha; // r, g, b stay 0: black ink
    }
    return out;
  }

  /* Flatten paper + color + lines into one RGBA image (what Save writes).
     Color and lines are straight-alpha RGBA of the same size. */
  function flatten(color, lines) {
    const out = new Uint8ClampedArray(color.length);
    for (let p = 0; p < out.length; p += 4) {
      const ca = color[p + 3] / 255;
      let r = 255 * (1 - ca) + color[p] * ca;
      let g = 255 * (1 - ca) + color[p + 1] * ca;
      let b = 255 * (1 - ca) + color[p + 2] * ca;
      const la = lines[p + 3] / 255;
      r = r * (1 - la) + lines[p] * la;
      g = g * (1 - la) + lines[p + 1] * la;
      b = b * (1 - la) + lines[p + 2] * la;
      out[p] = Math.round(r); out[p + 1] = Math.round(g); out[p + 2] = Math.round(b); out[p + 3] = 255;
    }
    return out;
  }

  /* Undo stack of snapshots, oldest dropped past `limit`. */
  function undoStack(limit) {
    const max = limit || 20;
    const items = [];
    return {
      push(snapshot) { items.push(snapshot); if (items.length > max) items.shift(); return items.length; },
      pop() { return items.pop() || null; },
      clear() { items.length = 0; },
      get size() { return items.length; }
    };
  }

  /* Points along a stroke segment, spaced so round stamps overlap smoothly. */
  function stampPoints(from, to, spacing) {
    const step = Math.max(0.5, spacing || 2);
    const dx = to.x - from.x, dy = to.y - from.y;
    const n = Math.max(1, Math.ceil(Math.hypot(dx, dy) / step));
    const pts = [];
    for (let i = 1; i <= n; i += 1) pts.push({ x: from.x + dx * i / n, y: from.y + dy * i / n });
    return pts;
  }

  /* Small seeded random generator (mulberry32): the same stroke seed and the
     same finger path always give the same glitter. */
  function rng(seed) {
    let a = (seed >>> 0) || 1;
    return () => {
      a = (a + 0x6D2B79F5) >>> 0;
      let t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function hslHex(h, s, l) {
    const k = n => (n + h / 30) % 12, a = s * Math.min(l, 1 - l);
    const f = n => Math.round(255 * (l - a * Math.max(-1, Math.min(k(n) - 3, 9 - k(n), 1))));
    return '#' + [f(0), f(8), f(4)].map(v => v.toString(16).padStart(2, '0')).join('');
  }

  /* Glitter pens: [base ink, light speck tint]. Rainbow has no fixed base. */
  const GLITTER = {
    gold: ['#d9a400', '#fff2a8'],
    silver: ['#9ea7b2', '#ffffff'],
    pink: ['#ff4fa3', '#ffd6ec'],
    purple: ['#8a3ffc', '#eadcff'],
    blue: ['#1f7cff', '#d6e9ff'],
    rainbow: [null, null]
  };

  /* Rainbow hue walks along the stroke; snapped to 15 degree steps so the
     browser can reuse a small set of brush tips. */
  function rainbowHue(distance) { return (Math.round(((distance * 0.6) % 360) / 15) * 15) % 360; }

  /* A sparkle stroke turns finger points into draw operations:
     'tip'   a soft glitter-ink stamp (same spacing as the crayon),
     'speck' a tiny bright dot or star.
     Specks are held back until the stroke has moved on by about two brush
     widths, so the following ink stamps do not paint over them; end()
     returns the ones still waiting. */
  function sparkleStroke(glitter, size, seed) {
    const pen = GLITTER[glitter] ? glitter : 'gold';
    const [base, light] = GLITTER[pen];
    const rand = rng(seed);
    const spacing = Math.max(1.5, size * 0.22);
    /* very fine pens are plain glitter ink: specks would be wider than the line */
    const perStamp = size < 5 ? 0 : 0.0028 * size * size;
    const pending = [];
    let last = null, distance = 0;
    function specks(p) {
      const n = Math.floor(perStamp) + (rand() < perStamp % 1 ? 1 : 0);
      for (let i = 0; i < n; i += 1) {
        const star = rand() < 0.16;
        const r = Math.min(star ? Math.min(5 + rand() * 4, Math.max(2.5, size * 0.3)) : Math.min(1.8 + rand() * 2.4, Math.max(1.2, size * 0.2)), size * 0.8 / (star ? 2.4 : 1.6));
        /* keep the whole glow inside the ink, so a same-size eraser pass removes it */
        const angle = rand() * Math.PI * 2, reach = Math.max(0, size * 0.8 - r * (star ? 2.4 : 1.6)) * Math.sqrt(rand());
        const hue = rainbowHue(distance + 40 + rand() * 120);
        const tint = base ? light : hslHex(hue, 1, 0.86);
        pending.push({
          t: 'speck',
          x: p.x + Math.cos(angle) * reach,
          y: p.y + Math.sin(angle) * reach,
          r,
          star,
          hex: rand() < 0.62 ? '#ffffff' : tint,
          due: distance + size * 2.2
        });
      }
    }
    return {
      glitter: pen,
      add(pt) {
        const ops = [];
        const pts = last ? stampPoints(last, pt, spacing) : [pt];
        for (const p of pts) {
          if (last) distance += Math.hypot(p.x - last.x, p.y - last.y);
          last = p;
          ops.push({ t: 'tip', x: p.x, y: p.y, hex: base || hslHex(rainbowHue(distance), 0.9, 0.55) });
          specks(p);
        }
        while (pending.length && pending[0].due <= distance) ops.push(pending.shift());
        return ops;
      },
      end() { last = null; return pending.splice(0); }
    };
  }

  /* Plain software painter for the same operations (used by the tests, and a
     reference for what the canvas draws): 'tip' is a disc of ink at 90%,
     'speck' a solid bright disc, 'erase' clears a disc to transparent. */
  function paintOps(rgba, width, height, ops, size) {
    for (const op of ops) {
      const r = op.t === 'tip' || op.t === 'erase' ? size : op.r;
      const alpha = op.t === 'tip' ? 0.9 : 1;
      const hex = op.hex || '#000000';
      const cr = parseInt(hex.slice(1, 3), 16), cg = parseInt(hex.slice(3, 5), 16), cb = parseInt(hex.slice(5, 7), 16);
      const x0 = Math.max(0, Math.floor(op.x - r)), x1 = Math.min(width - 1, Math.ceil(op.x + r));
      const y0 = Math.max(0, Math.floor(op.y - r)), y1 = Math.min(height - 1, Math.ceil(op.y + r));
      for (let y = y0; y <= y1; y += 1) for (let x = x0; x <= x1; x += 1) {
        if (Math.hypot(x + 0.5 - op.x, y + 0.5 - op.y) > r) continue;
        const p = (y * width + x) * 4;
        if (op.t === 'erase') { rgba[p] = rgba[p + 1] = rgba[p + 2] = rgba[p + 3] = 0; continue; }
        const da = rgba[p + 3] / 255, oa = alpha + da * (1 - alpha);
        rgba[p] = Math.round((cr * alpha + rgba[p] * da * (1 - alpha)) / oa);
        rgba[p + 1] = Math.round((cg * alpha + rgba[p + 1] * da * (1 - alpha)) / oa);
        rgba[p + 2] = Math.round((cb * alpha + rgba[p + 2] * da * (1 - alpha)) / oa);
        rgba[p + 3] = Math.round(oa * 255);
      }
    }
    return rgba;
  }

  /* Zoom and pan of the picture. The view is a CSS transform on the stage
     content: translate(tx, ty) scale(scale), origin top-left, in stage pixels
     (w x h). At scale 1 the picture fits the stage exactly. */
  const MAX_ZOOM = 4;
  function clampView(view, w, h, max) {
    const scale = Math.min(max || MAX_ZOOM, Math.max(1, Number(view.scale) || 1));
    const minX = w - w * scale, minY = h - h * scale;
    return { scale, tx: Math.min(0, Math.max(minX, Number(view.tx) || 0)), ty: Math.min(0, Math.max(minY, Number(view.ty) || 0)) };
  }
  /* Stage point (px, py), e.g. a finger, to picture pixels (W x H). */
  function toPicture(px, py, view, w, h, W, H) {
    return { x: (px - view.tx) / view.scale * W / w, y: (py - view.ty) / view.scale * H / h };
  }
  /* Zoom by a factor while the stage point (cx, cy) stays under the finger. */
  function zoomAt(view, factor, cx, cy, w, h, max) {
    const scale = Math.min(max || MAX_ZOOM, Math.max(1, view.scale * factor));
    const k = scale / view.scale;
    return clampView({ scale, tx: cx - (cx - view.tx) * k, ty: cy - (cy - view.ty) * k }, w, h, max);
  }
  /* Two-finger pinch and pan: the picture point first under the midpoint of
     the fingers follows the midpoint, scaled by the change in finger spread. */
  function pinchView(start, a0, b0, a1, b1, w, h, max) {
    const d0 = Math.hypot(b0.x - a0.x, b0.y - a0.y) || 1, d1 = Math.hypot(b1.x - a1.x, b1.y - a1.y) || 1;
    const scale = Math.min(max || MAX_ZOOM, Math.max(1, start.scale * d1 / d0));
    const m0 = { x: (a0.x + b0.x) / 2, y: (a0.y + b0.y) / 2 }, m1 = { x: (a1.x + b1.x) / 2, y: (a1.y + b1.y) / 2 };
    const cx = (m0.x - start.tx) / start.scale, cy = (m0.y - start.ty) / start.scale;
    return clampView({ scale, tx: m1.x - cx * scale, ty: m1.y - cy * scale }, w, h, max);
  }
  function panView(view, dx, dy, w, h, max) {
    return clampView({ scale: view.scale, tx: view.tx + dx, ty: view.ty + dy }, w, h, max);
  }
  /* Brush size in picture pixels so the brush feels the same on screen at any zoom. */
  function brushAt(size, scale) { return Math.max(2, Math.round(size / Math.max(1, scale || 1))); }

  /* Coloring-screen switches (sounds, vibration), on unless turned off; remembered. */
  const PREF_KEYS = { sounds: 'msb_coloring_sounds', vibration: 'msb_coloring_vibration' };
  function prefs(storage) {
    return {
      get(name) { try { return storage.getItem(PREF_KEYS[name]) !== 'off'; } catch { return true; } },
      set(name, on) { try { storage.setItem(PREF_KEYS[name], on ? 'on' : 'off'); } catch { /* private mode */ } return !!on; }
    };
  }
  /* Gentle drawing ticks: at most one per `every` ms, and only after the finger
     has really moved (`minMove` stage pixels) since the last tick. */
  function tickGate(every, minMove) {
    let at = -Infinity, moved = 0;
    return {
      move(dist, now) { moved += dist; if (now - at >= every && moved >= (minMove || 0)) { at = now; moved = 0; return true; } return false; },
      reset() { at = -Infinity; moved = 0; }
    };
  }

  /* Pen sizes, very fine to very big: brush radius in picture pixels (the
     picture is 1200 wide). The same sizes serve crayons, sparkle pens and the eraser. */
  const BRUSH_SIZES = [['xfine', 2, 'Very fine'], ['fine', 5, 'Fine'], ['small', 10, 'Small'], ['medium', 22, 'Medium'], ['large', 30, 'Large'], ['big', 38, 'Big'], ['huge', 48, 'Huge']];
  const DEFAULT_BRUSH = 22;
  /* Diameter in CSS pixels of the line a size draws on a stage this wide at fit
     (and, since the brush keeps its on-screen size, at any zoom). */
  function sizeDot(size, stageWidth, pictureWidth) {
    return Math.max(2, Math.round(size * 2 * stageWidth / (pictureWidth || 1200) * 2) / 2);
  }

  const api = { BRUSH_SIZES, DEFAULT_BRUSH, sizeDot, lineLayer, flatten, undoStack, stampPoints, rng, hslHex, GLITTER, rainbowHue, sparkleStroke, paintOps, MAX_ZOOM, clampView, toPicture, zoomAt, pinchView, panView, brushAt, PREF_KEYS, prefs, tickGate };
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.MsbColoringCore = api;
})(typeof self !== 'undefined' ? self : this);
