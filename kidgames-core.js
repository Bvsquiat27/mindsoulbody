/* Logic for the kids' Bible games (ages 9+): seeded puzzles, answer checks,
   and progress kept on this device in one msb_ key (so Export/Restore keeps
   it). No DOM here; kidgames.test.mjs runs it under Node. */
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.MsbKidGamesCore = api;
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';
  const KEYS = { progress: 'msb_kidgames', sounds: 'msb_kidgames_sounds' };

  /* ---------- Seeded randomness ---------- */
  function hash(str) { let h = 2166136261; for (const ch of String(str)) { h ^= ch.codePointAt(0); h = Math.imul(h, 16777619); } return h >>> 0; }
  function rng(seed) {
    let a = (typeof seed === 'number' ? seed : hash(seed)) >>> 0;
    return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  }
  function shuffle(list, rand = Math.random) {
    const a = list.slice();
    for (let i = a.length - 1; i > 0; i -= 1) { const j = Math.floor(rand() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
    return a;
  }
  /* A shuffle that never comes out already solved (when that is possible). */
  function scramble(list, rand = Math.random) {
    if (list.length < 2) return list.slice();
    for (let i = 0; i < 20; i += 1) { const s = shuffle(list, rand); if (s.some((x, k) => x !== list[k])) return s; }
    return list.slice(1).concat(list[0]);
  }

  /* ---------- Bible Word Search ---------- */
  /* Grid letters drop accents (Á→A) but keep Ñ. */
  function gridWord(word) {
    return String(word).toUpperCase().replace(/Ñ/g, '\u0001').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/\u0001/g, 'Ñ').replace(/[^A-ZÑ]/g, '');
  }
  const DIRS = [[0, 1], [1, 0], [1, 1], [-1, 1]];
  function wordSearch(words, size, seed, lang) {
    const letters = lang === 'es' ? 'AABCDEEEFGHIIJLLMNNOOPQRRSSTUUVYZÑ' : 'AABCDEEEFGHIIJKLMNNOOPRRSSTTUVWY';
    for (let attempt = 0; attempt < 60; attempt += 1) {
      const rand = rng(hash(`${seed}|${attempt}`));
      const grid = new Array(size * size).fill('');
      const placed = [];
      const order = words.map((w, i) => ({ w, i, g: gridWord(w) })).sort((a, b) => b.g.length - a.g.length);
      let ok = true;
      for (const item of order) {
        const g = item.g;
        if (g.length > size) { ok = false; break; }
        const spots = [];
        for (const [dr, dc] of DIRS) for (let r = 0; r < size; r += 1) for (let c = 0; c < size; c += 1) {
          const er = r + dr * (g.length - 1), ec = c + dc * (g.length - 1);
          if (er < 0 || er >= size || ec < 0 || ec >= size) continue;
          let fits = true, overlap = 0;
          for (let k = 0; k < g.length; k += 1) { const ch = grid[(r + dr * k) * size + c + dc * k]; if (ch && ch !== g[k]) { fits = false; break; } if (ch) overlap += 1; }
          if (fits && overlap < g.length) spots.push([r, c, dr, dc, overlap]);
        }
        if (!spots.length) { ok = false; break; }
        const [r, c, dr, dc] = spots[Math.floor(rand() * spots.length)];
        const cells = [];
        for (let k = 0; k < g.length; k += 1) { const at = (r + dr * k) * size + c + dc * k; grid[at] = g[k]; cells.push(at); }
        placed.push({ index: item.i, word: item.w, letters: g, cells });
      }
      if (!ok) continue;
      for (let i = 0; i < grid.length; i += 1) if (!grid[i]) grid[i] = letters[Math.floor(rand() * letters.length)];
      placed.sort((a, b) => a.index - b.index);
      return { size, grid, placed };
    }
    return null;
  }
  /* Cells on a straight line (row, column or diagonal) from a to b, or null. */
  function lineCells(a, b, size) {
    const ar = Math.floor(a / size), ac = a % size, br = Math.floor(b / size), bc = b % size;
    const dr = Math.sign(br - ar), dc = Math.sign(bc - ac), n = Math.max(Math.abs(br - ar), Math.abs(bc - ac));
    if (!(ar === br || ac === bc || Math.abs(br - ar) === Math.abs(bc - ac))) return null;
    const out = [];
    for (let k = 0; k <= n; k += 1) out.push((ar + dr * k) * size + ac + dc * k);
    return out;
  }
  /* Which placed word (index into placed) these cells spell, either way round; -1 if none. */
  function findWord(puzzle, cells) {
    if (!cells || cells.length < 2) return -1;
    const key = cells.join(','), rev = cells.slice().reverse().join(',');
    return puzzle.placed.findIndex(p => { const k = p.cells.join(','); return k === key || k === rev; });
  }

  /* ---------- Story Order ---------- */
  const orderMarks = (current, answer) => current.map((x, i) => x === answer[i]);
  const isOrdered = (current, answer) => current.length === answer.length && current.every((x, i) => x === answer[i]);
  function moveItem(list, from, to) {
    const a = list.slice();
    if (from < 0 || from >= a.length || to < 0 || to >= a.length) return a;
    const [x] = a.splice(from, 1); a.splice(to, 0, x);
    return a;
  }

  /* ---------- Who Said It? ---------- */
  /* Three choices: the speaker and two others, in a mixed order. */
  function choices(quotes, i, rand = Math.random) {
    const answer = quotes[i].who;
    const others = shuffle([...new Set(quotes.map(q => q.who).filter(w => w !== answer))], rand).slice(0, 2);
    return shuffle([answer, ...others], rand);
  }

  /* ---------- Verse Builder ---------- */
  /* The verse split into the words you tap, punctuation kept on each word. */
  const verseWords = text => String(text).trim().split(/\s+/).filter(Boolean);
  /* Words that fall: the one you need next is always there; the rest are
     from later in the verse (so each one is useful soon). */
  function nextFalling(words, have, showing, rand = Math.random) {
    if (have >= words.length) return null;
    const busy = new Set(showing);
    if (!busy.has(have)) return have;
    const later = [];
    for (let i = have + 1; i < Math.min(words.length, have + 6); i += 1) if (!busy.has(i)) later.push(i);
    return later.length ? later[Math.floor(rand() * later.length)] : null;
  }
  /* Same word can appear twice in a verse: any copy of the right text counts. */
  const wordFits = (words, have, i) => i >= 0 && i < words.length && have < words.length && words[i] === words[have];
  const stars = mistakes => (mistakes <= 0 ? 3 : mistakes <= 2 ? 2 : 1);

  /* ---------- Map Journey ---------- */
  /* The stop's choices in a mixed order; the first in the data is right. */
  const stopChoices = (stop, lang, rand = Math.random) => shuffle(stop.choices[lang].map((text, i) => ({ text, right: i === 0 })), rand);

  /* ---------- David's Sling: a chain of stones rolls along a winding path
     toward Goliath. David, in the middle, slings stones into the chain;
     3 or more of a color pop, and the gap pulls the front back (chain
     reactions). Field 360 x 480, y down. Pure functions, tested. ---------- */
  const ZUMA = { W: 360, H: 480, R: 12, D: 24, shot: 620, rush: 6 };
  const ZPATHS = {
    valley: { david: [180, 262], pts: [[400, 440], [40, 440], [40, 92], [296, 92]] },
    brook: { david: [196, 262], pts: [[400, 452], [28, 452], [28, 52], [332, 52], [332, 372], [108, 372], [108, 150], [262, 150]] },
    spiral: { david: [180, 272], spiral: { cx: 180, cy: 262, r0: 196, r1: 92, a0: Math.PI / 2, turns: 1.5 } },
    hills: { david: [180, 262], wave: 9, pts: [[400, 436], [36, 436], [36, 88], [300, 88]] },
    camp: { david: [196, 258], wave: 6, pts: [[400, 456], [26, 456], [26, 48], [334, 48], [334, 376], [104, 376], [104, 146], [258, 146]] },
  };
  /* a smooth path: straight runs with rounded corners (Chaikin), optional gentle waves */
  function zumaPath(name) {
    const P = ZPATHS[name] || ZPATHS.valley;
    let pts;
    if (P.spiral) {
      const sp = P.spiral, n = 240; pts = [];
      for (let i = 0; i <= n; i += 1) { const k = i / n, a = sp.a0 + k * sp.turns * Math.PI * 2, r = sp.r0 + (sp.r1 - sp.r0) * k; pts.push([sp.cx + Math.cos(a) * r, sp.cy + Math.sin(a) * r]); }
    } else {
      pts = P.pts.map(p => p.slice());
      for (let it = 0; it < 4; it += 1) {
        const out = [pts[0]];
        for (let i = 0; i < pts.length - 1; i += 1) { const [a, b] = [pts[i], pts[i + 1]]; out.push([a[0] * 0.75 + b[0] * 0.25, a[1] * 0.75 + b[1] * 0.25], [a[0] * 0.25 + b[0] * 0.75, a[1] * 0.25 + b[1] * 0.75]); }
        out.push(pts[pts.length - 1]); pts = out;
      }
    }
    /* resample every 2 units, add waves across the path */
    const dense = [pts[0]];
    for (let i = 1; i < pts.length; i += 1) { const [a, b] = [pts[i - 1], pts[i]], L = Math.hypot(b[0] - a[0], b[1] - a[1]), n = Math.max(1, Math.ceil(L / 2)); for (let k = 1; k <= n; k += 1) dense.push([a[0] + (b[0] - a[0]) * k / n, a[1] + (b[1] - a[1]) * k / n]); }
    const cum = [0]; for (let i = 1; i < dense.length; i += 1) cum.push(cum[i - 1] + Math.hypot(dense[i][0] - dense[i - 1][0], dense[i][1] - dense[i - 1][1]));
    const base = dense.map(q => q.slice());
    if (P.wave) for (let i = 1; i < dense.length - 1; i += 1) { const [a, b] = [base[i - 1], base[i + 1]], dx = b[0] - a[0], dy = b[1] - a[1], l = Math.hypot(dx, dy) || 1, w = Math.sin(cum[i] / 46) * P.wave * Math.min(1, cum[i] / 80, (cum[cum.length - 1] - cum[i]) / 80); dense[i] = [base[i][0] - dy / l * w, base[i][1] + dx / l * w]; }
    const len2 = [0]; for (let i = 1; i < dense.length; i += 1) len2.push(len2[i - 1] + Math.hypot(dense[i][0] - dense[i - 1][0], dense[i][1] - dense[i - 1][1]));
    const total = len2[len2.length - 1];
    function at(d) {
      const x = Math.max(0, Math.min(total, d));
      let lo = 0, hi = len2.length - 1; while (hi - lo > 1) { const m = (lo + hi) >> 1; if (len2[m] <= x) lo = m; else hi = m; }
      const seg = len2[hi] - len2[lo] || 1, k = (x - len2[lo]) / seg, a = dense[lo], b = dense[hi];
      return { x: a[0] + (b[0] - a[0]) * k, y: a[1] + (b[1] - a[1]) * k, a: Math.atan2(b[1] - a[1], b[0] - a[0]) };
    }
    const end = at(total);
    return { name, len: total, at, pts: dense, david: { x: P.david[0], y: P.david[1] }, goliath: { x: end.x, y: end.y } };
  }
  /* a new level: the chain (colors mixed so short runs appear) with its power stones */
  function zumaStart(lv, rand = Math.random) {
    const balls = [];
    for (let i = 0; i < lv.count; i += 1) {
      let c = Math.floor(rand() * lv.colors);
      if (i >= 2 && balls[i - 1].c === c && balls[i - 2].c === c) c = (c + 1) % lv.colors;
      balls.push({ c, p: null, id: i });
    }
    (lv.powers || []).forEach((p, k) => { const i = Math.floor(lv.count * (0.25 + 0.5 * (k + 1) / (lv.powers.length + 1))); if (balls[i]) balls[i].p = p; });
    return { balls, head: 0, speed: lv.speed, slowT: 0, revT: 0, maxFrac: 0, nextId: lv.count, combo: 0, lost: false, cleared: false, colors: lv.colors };
  }
  function zumaPos(z, i) { return z.head - i * ZUMA.D; }
  /* move the chain; a fast roll-in at the start, slow and reverse power-ups */
  function zumaStep(z, dt, path) {
    if (z.lost || !z.balls.length) return;
    const rushTo = Math.min((z.balls.length - 1) * ZUMA.D, path.len * 0.42);
    let v = z.speed;
    if (z.head < rushTo && !z.started) v *= ZUMA.rush; else z.started = true;
    if (z.slowT > 0) { z.slowT -= dt; v *= 0.4; }
    if (z.revT > 0) { z.revT -= dt; v = -z.speed * 1.6; }
    z.head = Math.max(Math.min(z.head, (z.balls.length - 1) * ZUMA.D), z.head + v * dt);
    z.maxFrac = Math.max(z.maxFrac, z.head / path.len);
    if (z.head >= path.len) z.lost = true;
  }
  /* which ball of the chain a shot at (x, y) touches, or -1 */
  function zumaHit(z, path, x, y) {
    let best = -1, bd = ZUMA.D * 0.95;
    z.balls.forEach((b, i) => { const d = zumaPos(z, i); if (d < 0) return; const p = path.at(d), dist = Math.hypot(p.x - x, p.y - y); if (dist < bd) { bd = dist; best = i; } });
    return best;
  }
  /* put the shot into the chain next to ball i: in front of it if the shot is
     on its front side. The front of the chain is pushed forward one stone. */
  function zumaInsert(z, path, i, shot, x, y) {
    const p = path.at(zumaPos(z, i)), ahead = (x - p.x) * Math.cos(p.a) + (y - p.y) * Math.sin(p.a) > 0;
    const k = ahead ? i : i + 1;
    z.balls.splice(k, 0, { c: shot.c, p: shot.p || null, id: z.nextId++ });
    z.head += ZUMA.D;
    return k;
  }
  /* pop runs of 3+ around index k, then keep popping where the gap closes
     (chain reactions). Bombs also take 2 stones on each side. */
  function zumaResolve(z, k) {
    const events = []; let combo = 0, at = k;
    while (at >= 0 && at < z.balls.length) {
      const c = z.balls[at].c; let a = at, b = at;
      while (a > 0 && z.balls[a - 1].c === c) a -= 1;
      while (b < z.balls.length - 1 && z.balls[b + 1].c === c) b += 1;
      if (b - a + 1 < 3) break;
      combo += 1;
      let powers = z.balls.slice(a, b + 1).map(x => x.p).filter(Boolean);
      if (powers.includes('bomb')) { a = Math.max(0, a - 2); b = Math.min(z.balls.length - 1, b + 2); powers = z.balls.slice(a, b + 1).map(x => x.p).filter(Boolean); }
      const gone = z.balls.splice(a, b - a + 1);
      z.head -= gone.length * ZUMA.D;
      if (powers.includes('slow')) z.slowT = 5;
      if (powers.includes('reverse')) z.revT = 2.4;
      events.push({ count: gone.length, combo, color: c, from: a, powers, balls: gone });
      /* the gap closes: does the stone in front match the one behind? */
      if (a <= 0 || a >= z.balls.length || z.balls[a - 1].c !== z.balls[a].c) break;
      at = a;
    }
    if (!z.balls.length) z.cleared = true;
    return events;
  }
  /* the next stone David holds: a color still in the chain */
  function zumaNext(z, rand = Math.random) {
    const left = [...new Set(z.balls.map(b => b.c))];
    return { c: left.length ? left[Math.floor(rand() * left.length)] : 0 };
  }
  /* stars by how close the chain came to Goliath */
  const zumaStars = maxFrac => (maxFrac < 0.6 ? 3 : maxFrac < 0.82 ? 2 : 1);

  /* ---------- Progress (one msb_ key) ---------- */
  const today = (d = new Date()) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  const blank = () => ({ done: {}, best: {}, plays: {}, badges: {} });
  function progress(storage) {
    const read = () => {
      try {
        const v = JSON.parse(storage.getItem(KEYS.progress));
        if (!v || typeof v !== 'object') return blank();
        const b = blank();
        for (const k of Object.keys(b)) if (v[k] && typeof v[k] === 'object' && !Array.isArray(v[k])) b[k] = v[k];
        for (const k of Object.keys(b.done)) if (!Array.isArray(b.done[k])) b.done[k] = [];
        return b;
      } catch { return blank(); }
    };
    const write = v => { try { storage.setItem(KEYS.progress, JSON.stringify(v)); } catch { /* full or blocked */ } return v; };
    return {
      get: read,
      /* mark one puzzle/level of a game finished; returns true the first time */
      finish(game, id) {
        const v = read(); const list = v.done[game] || (v.done[game] = []);
        v.plays[game] = (Number(v.plays[game]) || 0) + 1;
        const first = !list.includes(id); if (first) list.push(id);
        write(v); return first;
      },
      played(game) { const v = read(); v.plays[game] = (Number(v.plays[game]) || 0) + 1; write(v); },
      /* keep the highest score; returns true when it is a new best */
      best(game, n) { const v = read(); const old = Number(v.best[game]) || 0; if (n > old) { v.best[game] = n; write(v); return true; } return false; },
      done(game) { return (read().done[game] || []).slice(); },
      /* the old Sling levels (s1-s4) became the new z1-z4: carry them over once; true when it happened */
      migrateSling() {
        const v = read(), list = v.done.sling || [];
        if (!list.some(id => /^s\d+$/.test(id))) return false;
        const out = [];
        for (const id of list) { const n = /^s(\d+)$/.exec(id); const z = n ? `z${n[1]}` : id; if (!out.includes(z)) out.push(z); }
        v.done.sling = out;
        for (const k of Object.keys(v.best)) { const m = /^sling:s(\d+)$/.exec(k); if (!m) continue; const nk = `sling:z${m[1]}`; v.best[nk] = Math.max(Number(v.best[nk]) || 0, Number(v.best[k]) || 0); delete v.best[k]; }
        write(v); return true;
      },
      /* stamp newly earned badges with today's date; returns the new ones */
      award(defs) {
        const v = read(); const fresh = [];
        for (const b of defs) if (!v.badges[b.id] && b.test(v)) { v.badges[b.id] = today(); fresh.push(b.id); }
        if (fresh.length) write(v);
        return fresh;
      }
    };
  }
  function soundPref(storage) {
    return {
      get() { try { return storage.getItem(KEYS.sounds) !== 'off'; } catch { return true; } },
      set(on) { try { storage.setItem(KEYS.sounds, on ? 'on' : 'off'); } catch { /* ignore */ } return !!on; }
    };
  }
  const count = (v, g) => (v.done[g] || []).filter(id => g !== 'sling' || /^z\d+$/.test(id)).length;
  /* Badge rules. "total" is how many puzzles/levels that game has. */
  function badgeDefs(totals = {}) {
    const all = (g, n) => v => count(v, g) >= (totals[g] || n);
    return [
      { id: 'kg-word-1', game: 'wordsearch', icon: '🔎', name: { en: 'Word finder', es: 'Buscador de palabras' }, goal: { en: 'Finish a word search', es: 'Termina una sopa de letras' }, test: v => count(v, 'wordsearch') >= 1 },
      { id: 'kg-word-all', game: 'wordsearch', icon: '📜', name: { en: 'Scroll scholar', es: 'Sabio de los rollos' }, goal: { en: 'Finish every word search', es: 'Termina todas las sopas de letras' }, test: all('wordsearch', 6) },
      { id: 'kg-order-1', game: 'order', icon: '🖼️', name: { en: 'Storyteller', es: 'Cuentacuentos' }, goal: { en: 'Put a story in order', es: 'Ordena una historia' }, test: v => count(v, 'order') >= 1 },
      { id: 'kg-order-all', game: 'order', icon: '📖', name: { en: 'Bible timeline', es: 'Línea del tiempo bíblica' }, goal: { en: 'Put every story set in order', es: 'Ordena todas las historias' }, test: all('order', 4) },
      { id: 'kg-who-5', game: 'who', icon: '💬', name: { en: 'Good listener', es: 'Buen oyente' }, goal: { en: 'Get 5 in a row in Who Said It?', es: 'Acierta 5 seguidas en ¿Quién lo dijo?' }, test: v => (Number(v.best.who) || 0) >= 5 },
      { id: 'kg-verse-1', game: 'verse', icon: '🧩', name: { en: 'Verse builder', es: 'Constructor de versículos' }, goal: { en: 'Build a memory verse', es: 'Arma un versículo para memorizar' }, test: v => count(v, 'verse') >= 1 },
      { id: 'kg-verse-all', game: 'verse', icon: '💛', name: { en: 'Hidden in my heart', es: 'Guardado en mi corazón' }, goal: { en: 'Build every memory verse', es: 'Arma todos los versículos' }, test: all('verse', 6) },
      { id: 'kg-ark-1', game: 'ark', icon: '🛶', name: { en: 'Two by two', es: 'De dos en dos' }, goal: { en: 'Load the ark before the rain', es: 'Llena el arca antes de la lluvia' }, retired: true, test: () => false },
      { id: 'kg-ark-all', game: 'ark', icon: '🌈', name: { en: 'Faithful like Noah', es: 'Fiel como Noé' }, goal: { en: 'Finish every Ark Builder level', es: 'Termina todos los niveles del arca' }, retired: true, test: () => false },
      { id: 'kg-map-1', game: 'map', icon: '🗺️', name: { en: 'Bible traveler', es: 'Viajero bíblico' }, goal: { en: 'Finish a Map Journey', es: 'Termina un viaje en el mapa' }, test: v => count(v, 'map') >= 1 },
      { id: 'kg-map-all', game: 'map', icon: '🧭', name: { en: 'Faithful explorer', es: 'Explorador fiel' }, goal: { en: 'Finish every Map Journey', es: 'Termina todos los viajes' }, test: all('map', 2) },
      { id: 'kg-sling-1', game: 'sling', icon: '🪨', name: { en: 'Brave like David', es: 'Valiente como David' }, goal: { en: 'Clear a David\u2019s Sling level', es: 'Supera un nivel de La honda de David' }, test: v => count(v, 'sling') >= 1 },
      { id: 'kg-sling-all', game: 'sling', icon: '🛡️', name: { en: 'Giant courage', es: 'Valor de gigante' }, goal: { en: 'Clear every David\u2019s Sling level', es: 'Supera todos los niveles de La honda de David' }, test: all('sling', 4) },
      { id: 'kg-who-10', game: 'who', icon: '🗣️', name: { en: 'Voice of the Bible', es: 'Voces de la Biblia' }, goal: { en: 'Get 10 in a row in Who Said It?', es: 'Acierta 10 seguidas en ¿Quién lo dijo?' }, test: v => (Number(v.best.who) || 0) >= 10 },
    ];
  }
  return { KEYS, hash, rng, shuffle, scramble, gridWord, wordSearch, lineCells, findWord, orderMarks, isOrdered, moveItem, choices, verseWords, nextFalling, wordFits, stars, stopChoices, ZUMA, zumaPath, zumaPos, zumaStart, zumaStep, zumaHit, zumaInsert, zumaResolve, zumaNext, zumaStars, progress, soundPref, badgeDefs, today };
});
