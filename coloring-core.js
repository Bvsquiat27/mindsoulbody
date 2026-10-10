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

  const api = { lineLayer, flatten, undoStack, stampPoints };
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.MsbColoringCore = api;
})(typeof self !== 'undefined' ? self : this);
