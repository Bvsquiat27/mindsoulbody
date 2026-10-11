/* Squishy game logic with no DOM, so it can be tested in Node: settings and
   progress kept on this device, the squash-and-stretch spring, the vibration
   length, the memory-card deck and the question round. */
(function (root) {
  'use strict';

  const KEYS = { sounds: 'msb_squishy_sounds', unlocked: 'msb_squishy_unlocked', stars: 'msb_squishy_stars' };

  function readList(storage, key) {
    try { const v = JSON.parse(storage.getItem(key) || '[]'); return Array.isArray(v) ? v.filter(x => typeof x === 'string') : []; } catch { return []; }
  }
  function writeList(storage, key, list) { try { storage.setItem(key, JSON.stringify(list)); } catch { /* private mode */ } }

  /* Sounds switch, on unless turned off. */
  function soundPref(storage) {
    return {
      get() { try { return storage.getItem(KEYS.sounds) !== 'off'; } catch { return true; } },
      set(on) { try { storage.setItem(KEYS.sounds, on ? 'on' : 'off'); } catch { /* ignore */ } return !!on; }
    };
  }

  /* Which squishies are open, and which lessons earned a star. Squishies that
     start open are always open; each won round opens the next locked one. */
  function progress(storage, squishies) {
    const ids = squishies.map(x => x.id);
    const known = id => ids.includes(id);
    function unlocked() {
      const extra = readList(storage, KEYS.unlocked).filter(known);
      return squishies.filter(x => !x.locked || extra.includes(x.id)).map(x => x.id);
    }
    function isOpen(id) { return unlocked().includes(id); }
    function nextLocked() { const open = unlocked(); return squishies.find(x => !open.includes(x.id)) || null; }
    function unlockNext() {
      const next = nextLocked();
      if (!next) return null;
      const extra = readList(storage, KEYS.unlocked).filter(known);
      extra.push(next.id);
      writeList(storage, KEYS.unlocked, [...new Set(extra)]);
      return next;
    }
    function stars() { return readList(storage, KEYS.stars).filter(known); }
    function addStar(id) {
      if (!known(id)) return stars();
      const list = stars();
      if (!list.includes(id)) { list.push(id); writeList(storage, KEYS.stars, list); }
      return list;
    }
    return { unlocked, isOpen, nextLocked, unlockNext, stars, addStar, total: ids.length };
  }

  /* How deep a press squashes: grows the longer you hold, like a slow-rise
     squishy, and stops at a soft limit (gentler with reduced motion). */
  function pressDepth(holdMs, reduced) {
    const max = reduced ? 0.16 : 0.42;
    return max * (1 - Math.exp(-Math.max(0, holdMs) / 650));
  }

  /* One step of the spring that drives squash and the poke offset.
     Held: follows the finger quickly. Released: slow, jiggly rise
     (reduced motion: slow rise with no jiggle). */
  function springStep(st, dt, target, held, reduced) {
    const k = held ? 220 : 38;
    const c = held ? 26 : reduced ? 2 * Math.sqrt(k) * 1.05 : 6.2;
    const h = Math.min(0.034, Math.max(0, dt));
    const out = { ...st };
    for (const [x, v, goal] of [['s', 'vs', target.s], ['dx', 'vx', target.dx], ['dy', 'vy', target.dy]]) {
      const a = -k * (out[x] - goal) - c * out[v];
      out[v] += a * h;
      out[x] += out[v] * h;
    }
    return out;
  }
  function atRest(st) { return Math.abs(st.s) < 0.002 && Math.abs(st.vs) < 0.01 && Math.abs(st.dx) < 0.3 && Math.abs(st.dy) < 0.3 && Math.abs(st.vx) < 1 && Math.abs(st.vy) < 1; }

  /* A drag pokes the squishy toward the finger, with a soft limit. */
  function pokeOffset(dx, dy, size) {
    const lim = size * 0.16, d = Math.hypot(dx, dy) || 1, k = Math.min(1, lim / d) * 0.45;
    return { dx: dx * k, dy: dy * k };
  }

  /* Vibration on release: a longer squish gives a slightly longer pulse. */
  function vibeMs(holdMs) { return Math.max(8, Math.min(30, Math.round(8 + Math.max(0, holdMs) / 60))); }

  function rng(seed) {
    let s = (seed >>> 0) || 1;
    return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
  }
  function shuffle(list, rand) {
    const a = list.slice();
    for (let i = a.length - 1; i > 0; i -= 1) { const j = Math.floor(rand() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
    return a;
  }

  /* Memory game: each squishy picture pairs with its name card. */
  function memoryDeck(ids, pairs, seed) {
    const rand = rng(seed);
    const chosen = shuffle(ids, rand).slice(0, pairs);
    return shuffle(chosen.flatMap(id => [{ id, face: 'pic' }, { id, face: 'name' }]), rand).map((card, i) => ({ ...card, n: i }));
  }
  function isMatch(a, b) { return !!a && !!b && a.n !== b.n && a.id === b.id && a.face !== b.face; }

  /* Question round: `count` questions, choices shuffled; `answer` is the index
     of the right choice after shuffling. */
  function questionRound(questions, count, seed, lang) {
    const rand = rng(seed);
    return shuffle(questions, rand).slice(0, count).map(q => {
      const order = shuffle(q.choices.en.map((_, i) => i), rand);
      return { id: q.id, q: q.q[lang], ref: q.ref[lang], choices: order.map(i => q.choices[lang][i]), answer: order.indexOf(0) };
    });
  }
  const PASS = 4;
  function roundWon(correct, count) { return correct >= Math.min(PASS, count); }

  /* ---------- Soft body ----------
     The squishy is a grid of points (n x n over its 120 x 120 picture) joined
     by springs: neighbours, diagonals and two-apart "bend" springs. Each point
     is also pulled back to its resting place, and the outer ring feels an
     inside pressure that keeps the area (the toy's "volume") about the same,
     so pressing makes the sides bulge and pulling makes it thinner.
     Touches set targets: grab-and-pull stretches the part near the finger
     (the pull has a soft maximum), a press flattens and dents it, two fingers
     squeeze or spread it. Let go and the springs wobble it back to rest. */
  function softBody(opts) {
    const o = opts || {};
    const n = o.n || 11, size = o.size || 120, reduced = !!o.reduced;
    const N = n * n, h = size / (n - 1);
    const x = new Float64Array(N), y = new Float64Array(N), vx = new Float64Array(N), vy = new Float64Array(N);
    const rx = new Float64Array(N), ry = new Float64Array(N), ox = new Float64Array(N), oy = new Float64Array(N), w = new Float64Array(N);
    const fx = new Float64Array(N), fy = new Float64Array(N);
    for (let j = 0; j < n; j += 1) for (let i = 0; i < n; i += 1) { const k = j * n + i; rx[k] = x[k] = i * h; ry[k] = y[k] = j * h; }
    const springs = [];
    const link = (a, b) => springs.push(a, b, Math.hypot(rx[a] - rx[b], ry[a] - ry[b]));
    for (let j = 0; j < n; j += 1) for (let i = 0; i < n; i += 1) {
      const k = j * n + i;
      if (i + 1 < n) link(k, k + 1);
      if (j + 1 < n) link(k, k + n);
      if (i + 1 < n && j + 1 < n) { link(k, k + n + 1); link(k + 1, k + n); }
      if (i + 2 < n) link(k, k + 2);
      if (j + 2 < n) link(k, k + 2 * n);
    }
    const ring = [];
    for (let i = 0; i < n; i += 1) ring.push(i);
    for (let j = 1; j < n; j += 1) ring.push(j * n + n - 1);
    for (let i = n - 2; i >= 0; i -= 1) ring.push((n - 1) * n + i);
    for (let j = n - 2; j > 0; j -= 1) ring.push(j * n);
    /* Springy limits: up to about 1.5x when pulled, about 0.7x when pressed,
       pinch 0.6x-1.7x (gentler with reduced motion). */
    const cfg = { kA: 150, kS: 760, kHold: 1400, damp: reduced ? 15 : 4.6, kP: 1300, max: size * (reduced ? 0.45 : 0.9), squash: reduced ? 0.16 : 0.42, sigma: size * 0.34, pinchLo: reduced ? 0.8 : 0.6, pinchHi: reduced ? 1.3 : 1.7 };
    function area() {
      let a = 0;
      for (let q = 0; q < ring.length; q += 1) { const p = ring[q], r = ring[(q + 1) % ring.length]; a += x[p] * y[r] - x[r] * y[p]; }
      return a / 2;
    }
    const A0 = area();
    const state = { mode: null, stretch: 0, squish: 0, pinch: 1, carry: 0 };
    const H = 1 / 240;

    function substep() {
      for (let k = 0; k < N; k += 1) {
        const kk = cfg.kA + cfg.kHold * w[k];
        fx[k] = kk * (rx[k] + ox[k] - x[k]) - cfg.damp * vx[k];
        fy[k] = kk * (ry[k] + oy[k] - y[k]) - cfg.damp * vy[k];
      }
      for (let s = 0; s < springs.length; s += 3) {
        const a = springs[s], b = springs[s + 1], L = springs[s + 2];
        const dx = x[b] - x[a], dy = y[b] - y[a], d = Math.hypot(dx, dy) || 1e-6, f = cfg.kS * (d - L) / d;
        const c = 0.6 * ((vx[b] - vx[a]) * dx + (vy[b] - vy[a]) * dy) / (d * d);
        fx[a] += (f + c) * dx; fy[a] += (f + c) * dy; fx[b] -= (f + c) * dx; fy[b] -= (f + c) * dy;
      }
      const A = area(), P = cfg.kP * (A0 - A) / A0 * 0.5 * Math.sign(A0);
      for (let q = 0; q < ring.length; q += 1) {
        const p = ring[q], a = ring[(q + ring.length - 1) % ring.length], b = ring[(q + 1) % ring.length];
        fx[p] += P * (y[b] - y[a]); fy[p] -= P * (x[b] - x[a]);
      }
      for (let k = 0; k < N; k += 1) { vx[k] += fx[k] * H; vy[k] += fy[k] * H; x[k] += vx[k] * H; y[k] += vy[k] * H; }
    }
    /* Advance by dt seconds in fixed small steps (stable on slow frames too). */
    function step(dt) {
      state.carry += Math.min(0.05, Math.max(0, dt));
      let guard = 0;
      while (state.carry >= H && guard < 12) { substep(); state.carry -= H; guard += 1; }
      if (guard >= 12) state.carry = 0;
    }
    const gauss = (k, ax, ay, sig) => Math.exp(-((rx[k] - ax) ** 2 + (ry[k] - ay) ** 2) / (sig * sig));
    /* Pull with a soft maximum: the farther you pull, the harder it gets. */
    function softCap(d, m) { return m * Math.tanh(d / m); }
    function grab(ax, ay, dx, dy) {
      /* full stretch from the edges; grabbing the middle pulls less, so the
         sides never fold over */
      const edge = Math.min(1, Math.max(Math.abs(ax - size / 2), Math.abs(ay - size / 2)) / (size / 2));
      const m = cfg.max * (0.4 + 0.6 * edge);
      const d = Math.hypot(dx, dy), e = d > 1e-6 ? softCap(d, m) / d : 0;
      const ex = dx * e, ey = dy * e;
      for (let k = 0; k < N; k += 1) { const g = gauss(k, ax, ay, cfg.sigma); w[k] = g; ox[k] = ex * g; oy[k] = ey * g; }
      state.mode = 'grab'; state.stretch = Math.hypot(ex, ey) / cfg.max; state.squish = 0; state.pinch = 1;
    }
    /* depth 0..1: flatten toward the bottom, bulge the sides, dent under the finger. */
    function press(ax, ay, depth) {
      const s = cfg.squash * Math.max(0, Math.min(1, depth)), cx = size / 2;
      for (let k = 0; k < N; k += 1) {
        const g = gauss(k, ax, ay, cfg.sigma * 0.9), up = (size - ry[k]) / size;
        w[k] = 0.35 + 0.65 * g;
        oy[k] = s * size * up + s * size * 0.2 * g;
        ox[k] = (rx[k] - cx) * (s / (1 - s)) * 0.6 * (0.4 + 0.6 * Math.sin(Math.PI * Math.min(1, ry[k] / size)));
      }
      state.mode = 'press'; state.squish = s / cfg.squash; state.stretch = 0; state.pinch = 1;
    }
    /* Two fingers: squeeze (scale < 1) or spread (scale > 1) along their line,
       the other way to keep the area. */
    function pinch(cx, cy, ux, uy, scale) {
      const lo = cfg.pinchLo, hi = cfg.pinchHi;
      const sc = Math.max(lo, Math.min(hi, scale)), inv = 1 / sc, len = Math.hypot(ux, uy) || 1, u = [ux / len, uy / len], v = [-u[1], u[0]];
      for (let k = 0; k < N; k += 1) {
        const px = rx[k] - cx, py = ry[k] - cy, a = px * u[0] + py * u[1], b = px * v[0] + py * v[1];
        const da = a * (sc - 1), db = b * (inv - 1);
        w[k] = 0.6; ox[k] = da * u[0] + db * v[0]; oy[k] = da * u[1] + db * v[1];
      }
      state.mode = 'pinch'; state.pinch = sc; state.stretch = Math.max(0, sc - 1) / (hi - 1); state.squish = Math.max(0, 1 - sc) / (1 - lo);
    }
    /* Let go. A fast flick passes the finger's speed to the part that was held. */
    function release(fvx, fvy) {
      const cap = size * 12, sp = Math.hypot(fvx || 0, fvy || 0), k2 = sp > cap ? cap / sp : 1;
      for (let k = 0; k < N; k += 1) { if (w[k] > 0.05 && sp) { vx[k] += fvx * k2 * w[k]; vy[k] += fvy * k2 * w[k]; } w[k] = 0; ox[k] = 0; oy[k] = 0; }
      const was = { mode: state.mode, stretch: state.stretch, squish: state.squish };
      state.mode = null; state.stretch = 0; state.squish = 0; state.pinch = 1;
      return was;
    }
    /* Resting point nearest to a spot on the deformed body (where a finger grabbed). */
    function nearest(px, py) {
      let best = 0, bd = Infinity;
      for (let k = 0; k < N; k += 1) { const d = (x[k] - px) ** 2 + (y[k] - py) ** 2; if (d < bd) { bd = d; best = k; } }
      return { x: rx[best], y: ry[best] };
    }
    /* Where a resting spot is now (bilinear inside its mesh cell). */
    function at(px, py) {
      const fx = Math.max(0, Math.min(n - 1, px / h)), fy = Math.max(0, Math.min(n - 1, py / h));
      const i = Math.min(n - 2, Math.floor(fx)), j = Math.min(n - 2, Math.floor(fy)), u = fx - i, v = fy - j, k = j * n + i;
      const lerp = (A) => (A[k] * (1 - u) + A[k + 1] * u) * (1 - v) + (A[k + n] * (1 - u) + A[k + n + 1] * u) * v;
      return { x: lerp(x), y: lerp(y) };
    }
    /* Smooth version of at(): Catmull-Rom across the grid, so a finer render
       mesh has a curved, kink-free outline instead of straight cell edges. */
    function smooth(px, py) {
      const fx = Math.max(0, Math.min(n - 1, px / h)), fy = Math.max(0, Math.min(n - 1, py / h));
      const i = Math.min(n - 2, Math.floor(fx)), j = Math.min(n - 2, Math.floor(fy)), u = fx - i, v = fy - j;
      const w = t => [((-t + 2) * t - 1) * t / 2, (((3 * t - 5) * t) * t + 2) / 2, ((-3 * t + 4) * t + 1) * t / 2, ((t - 1) * t * t) / 2];
      const wu = w(u), wv = w(v);
      let sx = 0, sy = 0;
      for (let b = 0; b < 4; b += 1) {
        const jj = j - 1 + b;
        for (let a2 = 0; a2 < 4; a2 += 1) {
          const ii = i - 1 + a2;
          /* outside the grid: extend the edge linearly so the border stays straight-ish */
          const ci = Math.max(0, Math.min(n - 1, ii)), cj = Math.max(0, Math.min(n - 1, jj));
          let X = x[cj * n + ci], Y = y[cj * n + ci];
          if (ii !== ci || jj !== cj) {
            const ki = ci + (ii < ci ? 1 : ii > ci ? -1 : 0), kj = cj + (jj < cj ? 1 : jj > cj ? -1 : 0), q = kj * n + ki, p0 = cj * n + ci;
            X = 2 * x[p0] - x[q]; Y = 2 * y[p0] - y[q];
          }
          const ww = wu[a2] * wv[b];
          sx += ww * X; sy += ww * Y;
        }
      }
      return { x: sx, y: sy };
    }
    /* The face moves as one stiff piece: it follows the body under it, with only
       a mild stretch (0.9-1.1x) and tilt (about 10 degrees at most). */
    function faceFrame(fx, fy, r) {
      const c = at(fx, fy), L = at(fx - r, fy), R = at(fx + r, fy), T = at(fx, fy - r), B = at(fx, fy + r);
      const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
      const sx = clamp(Math.hypot(R.x - L.x, R.y - L.y) / (2 * r), 0.9, 1.1), sy = clamp(Math.hypot(B.x - T.x, B.y - T.y) / (2 * r), 0.9, 1.1);
      const rot = clamp(Math.atan2(R.y - L.y, R.x - L.x), -0.18, 0.18);
      return { x: c.x, y: c.y, sx, sy, rot };
    }
    function maxOffset() { let m = 0; for (let k = 0; k < N; k += 1) m = Math.max(m, Math.hypot(x[k] - rx[k], y[k] - ry[k])); return m; }
    function energy() { let e = 0; for (let k = 0; k < N; k += 1) e += vx[k] * vx[k] + vy[k] * vy[k]; return e / N; }
    function atRest() { return !state.mode && maxOffset() < 0.25 && energy() < 0.05; }
    function settle() { for (let k = 0; k < N; k += 1) { x[k] = rx[k]; y[k] = ry[k]; vx[k] = vy[k] = 0; } }
    function bounds() {
      let a = Infinity, b = -Infinity, c = Infinity, d = -Infinity;
      for (let k = 0; k < N; k += 1) { a = Math.min(a, x[k]); b = Math.max(b, x[k]); c = Math.min(c, y[k]); d = Math.max(d, y[k]); }
      return { minX: a, maxX: b, minY: c, maxY: d };
    }
    return { n, N, size, x, y, vx, vy, rx, ry, cfg, state, A0, area, at, smooth, faceFrame, step, grab, press, pinch, release, nearest, maxOffset, energy, atRest, settle, bounds };
  }

  /* Face: squint while squished, a surprised "O" while stretched far. */
  function mood(state) {
    if (state.squish > 0.35) return 'squint';
    if (state.stretch > 0.5) return 'wow';
    return 'happy';
  }
  /* Vibration for squish/stretch strength 0..1: 6-30 ms. */
  function pulseMs(intensity) { return Math.round(6 + 24 * Math.max(0, Math.min(1, intensity))); }

  /* Crunchy vibration for the glowing squishy: a few short ticks with gaps,
     like crackles. Stronger squish/stretch = more and longer ticks; every tick
     is at most 12 ms and all ticks together stay within 30 ms. */
  function crunchPattern(intensity) {
    const i = Math.max(0, Math.min(1, Number(intensity) || 0));
    const n = i < 0.34 ? 2 : 3, tick = Math.min(10, Math.round(5 + 5 * i));
    const out = [];
    for (let k = 0; k < n; k += 1) { if (k) out.push(20); out.push(k === n - 1 ? Math.min(12, tick + 2) : tick); }
    let sum = 0;
    for (let k = 0; k < out.length; k += 2) { out[k] = Math.min(out[k], 30 - sum); sum += out[k]; }
    return out;
  }
  /* How many tiny clicks one crunch has, and over how long (ms). */
  function crunchShape(intensity) {
    const i = Math.max(0, Math.min(1, Number(intensity) || 0));
    return { clicks: Math.round(4 + 14 * i), spanMs: Math.round(70 + 110 * i), peak: Math.min(0.05, 0.018 + 0.03 * i) };
  }
  /* Glow strength 0..1: a soft pulse at rest that brightens with squish/stretch
     (reduced motion: steady, no pulse). */
  function glowLevel(intensity, tSec, reduced) {
    const i = Math.max(0, Math.min(1, Number(intensity) || 0));
    const base = reduced ? 0.45 : 0.4 + 0.1 * Math.sin((tSec || 0) * 2.4);
    return Math.min(1, base + 0.55 * i);
  }

  const api = { crunchPattern, crunchShape, glowLevel, softBody, mood, pulseMs, KEYS, soundPref, progress, pressDepth, springStep, atRest, pokeOffset, vibeMs, rng, shuffle, memoryDeck, isMatch, questionRound, roundWon, PASS };
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.MsbSquishyCore = api;
})(typeof self !== 'undefined' ? self : this);
