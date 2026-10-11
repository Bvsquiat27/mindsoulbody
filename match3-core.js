/* Bible match-3 game: the rules, with no screen code, so it can be tested.
   The board is W x H cells. Each cell holds a piece type (0..colors-1, an
   index into the level's piece list), BOMB (the Star of Bethlehem, which
   matches nothing) or EMPTY, plus a special:
     ROW / COL  "trumpet of Jericho" - clears its row / column (match of 4)
     BURST      "light" - clears the 3 x 3 around it (L or T shaped match)
     BOMB       "star of Bethlehem" - clears every piece of one kind (match of 5)
   A "stone" layer lies under the pieces (walls of Jericho, the tomb stone):
   a stone breaks when a piece on top of it is cleared.
   Boards are made from a seeded random generator, so every level starts the
   same way and the tests can replay games exactly. */
(function (root) {
  'use strict';
  const W = 8, H = 8, N = W * H;
  const EMPTY = -1, BOMB = 9;
  const SP = { NONE: 0, ROW: 1, COL: 2, BURST: 3, BOMB: 4 };
  const KEYS = { progress: 'msb_match_progress', sounds: 'msb_match_sounds' };

  /* mulberry32: small, fast, seeded */
  function rng(seed) {
    let s = seed >>> 0;
    return {
      next() { s = (s + 0x6D2B79F5) >>> 0; let t = s; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; },
      int(n) { return Math.floor(this.next() * n); },
      get state() { return s; },
      set state(v) { s = v >>> 0; }
    };
  }

  const xy = i => [i % W, Math.floor(i / W)];
  const idx = (x, y) => y * W + x;
  const adjacent = (a, b) => { const [ax, ay] = xy(a), [bx, by] = xy(b); return Math.abs(ax - bx) + Math.abs(ay - by) === 1; };
  const isPiece = (g, i) => g.t[i] >= 0 && g.t[i] < BOMB;

  function stonesFrom(layout) {
    const s = new Uint8Array(N);
    (layout || []).forEach((row, y) => { for (let x = 0; x < W; x += 1) if (row[x] === '#') s[idx(x, y)] = 1; });
    return s;
  }

  /* A new game for a level. The first board has no ready-made matches and at
     least one possible move. */
  function createGame(level, seedOverride) {
    const colors = level.pieces.length;
    let seed = (seedOverride ?? level.seed) >>> 0;
    for (let tries = 0; tries < 200; tries += 1, seed += 7919) {
      const g = { colors, pieces: level.pieces.slice(), t: new Int8Array(N), sp: new Uint8Array(N), id: new Int32Array(N), stone: stonesFrom(level.stones), r: rng(seed), nextId: 1, score: 0, movesLeft: level.moves, collected: {}, stonesStart: 0, seed };
      for (let i = 0; i < N; i += 1) {
        const [x, y] = xy(i);
        let t, guard = 0;
        do { t = g.r.int(colors); guard += 1; } while (guard < 50 && ((x >= 2 && g.t[i - 1] === t && g.t[i - 2] === t) || (y >= 2 && g.t[i - W] === t && g.t[i - 2 * W] === t)));
        g.t[i] = t; g.id[i] = g.nextId++;
      }
      g.stonesStart = g.stone.reduce((a, b) => a + b, 0);
      if (!findGroups(g).length && hasMove(g)) return g;
    }
    throw new Error('could not make a board');
  }

  function clone(g) {
    const r = rng(0); r.state = g.r.state;
    return { ...g, pieces: g.pieces.slice(), t: g.t.slice(), sp: g.sp.slice(), id: g.id.slice(), stone: g.stone.slice(), r, collected: { ...g.collected } };
  }

  /* Matches: runs of 3+ of one kind in a row or column. Runs that cross
     (L / T shapes) are one group. Each group tells which special it makes. */
  function findGroups(g, prefer) {
    const runs = [];
    for (let y = 0; y < H; y += 1) {
      let x = 0;
      while (x < W) {
        const i = idx(x, y), t = g.t[i];
        let e = x + 1;
        if (isPiece(g, i)) while (e < W && g.t[idx(e, y)] === t) e += 1;
        if (isPiece(g, i) && e - x >= 3) runs.push({ dir: 'h', cells: Array.from({ length: e - x }, (_, k) => idx(x + k, y)) });
        x = e;
      }
    }
    for (let x = 0; x < W; x += 1) {
      let y = 0;
      while (y < H) {
        const i = idx(x, y), t = g.t[i];
        let e = y + 1;
        if (isPiece(g, i)) while (e < H && g.t[idx(x, e)] === t) e += 1;
        if (isPiece(g, i) && e - y >= 3) runs.push({ dir: 'v', cells: Array.from({ length: e - y }, (_, k) => idx(x, y + k)) });
        y = e;
      }
    }
    /* join runs that share a cell */
    const parent = runs.map((_, k) => k), find = k => (parent[k] === k ? k : (parent[k] = find(parent[k])));
    const owner = new Map();
    runs.forEach((run, k) => run.cells.forEach(c => { if (owner.has(c)) parent[find(k)] = find(owner.get(c)); else owner.set(c, k); }));
    const byRoot = new Map();
    runs.forEach((run, k) => { const r = find(k); if (!byRoot.has(r)) byRoot.set(r, []); byRoot.get(r).push(run); });
    const pref = new Set(prefer || []);
    return [...byRoot.values()].map(list => {
      const cells = [...new Set(list.flatMap(r => r.cells))];
      const maxH = Math.max(0, ...list.filter(r => r.dir === 'h').map(r => r.cells.length));
      const maxV = Math.max(0, ...list.filter(r => r.dir === 'v').map(r => r.cells.length));
      let special = SP.NONE;
      if (maxH >= 5 || maxV >= 5) special = SP.BOMB;
      else if (maxH >= 3 && maxV >= 3) special = SP.BURST;
      else if (maxH === 4) special = SP.ROW;
      else if (maxV === 4) special = SP.COL;
      /* where the new special appears: the moved piece, else the corner of an
         L / T, else the middle of the longest run */
      let at = cells.find(c => pref.has(c));
      if (at === undefined && special === SP.BURST) {
        const h = new Set(list.filter(r => r.dir === 'h').flatMap(r => r.cells));
        at = list.filter(r => r.dir === 'v').flatMap(r => r.cells).find(c => h.has(c));
      }
      if (at === undefined) { const longest = list.slice().sort((a, b) => b.cells.length - a.cells.length)[0]; at = longest.cells[Math.floor(longest.cells.length / 2)]; }
      return { cells, type: g.t[cells[0]], maxH, maxV, special, at };
    });
  }

  function swapCells(g, a, b) {
    for (const arr of [g.t, g.sp, g.id]) { const v = arr[a]; arr[a] = arr[b]; arr[b] = v; }
  }

  function isValidSwap(g, a, b) {
    if (a === b || !adjacent(a, b) || g.t[a] === EMPTY || g.t[b] === EMPTY) return false;
    if (g.t[a] === BOMB || g.t[b] === BOMB) return true;
    if (g.sp[a] && g.sp[b]) return true;
    swapCells(g, a, b);
    const ok = findGroups(g).some(gr => gr.cells.includes(a) || gr.cells.includes(b));
    swapCells(g, a, b);
    return ok;
  }

  function allMoves(g) {
    const out = [];
    for (let i = 0; i < N; i += 1) {
      const [x, y] = xy(i);
      if (x + 1 < W && isValidSwap(g, i, i + 1)) out.push([i, i + 1]);
      if (y + 1 < H && isValidSwap(g, i, i + W)) out.push([i, i + W]);
    }
    return out;
  }
  function hasMove(g) {
    for (let i = 0; i < N; i += 1) {
      const [x, y] = xy(i);
      if ((x + 1 < W && isValidSwap(g, i, i + 1)) || (y + 1 < H && isValidSwap(g, i, i + W))) return true;
    }
    return false;
  }
  /* For the idle hint: the move that helps most right away. With a level it
     counts stones broken and goal pieces collected extra. */
  function hint(g, level) {
    const wantStones = !!(level && level.goals.some(x => x.kind === 'stones'));
    const want = new Set(level ? level.goals.filter(x => x.kind === 'collect').map(x => g.pieces.indexOf(x.piece)) : []);
    let best = null, bestN = -1;
    for (const [a, b] of allMoves(g)) {
      swapCells(g, a, b);
      let n = 0;
      if (g.t[a] === BOMB || g.t[b] === BOMB) {
        const other = g.t[a] === BOMB ? g.t[b] : g.t[a];
        n = 12 + (want.has(other) ? 20 : 0);
      }
      for (const gr of findGroups(g, [a, b])) {
        n += gr.cells.length + (gr.special ? 6 : 0) + (want.has(gr.type) ? 2 * gr.cells.length : 0);
        if (wantStones) n += 4 * gr.cells.filter(c => g.stone[c]).length;
      }
      if (g.sp[a] && g.sp[b]) n += 10;
      swapCells(g, a, b);
      if (n > bestN) { bestN = n; best = [a, b]; }
    }
    return best;
  }

  /* Cells a special clears when it goes off. */
  function effect(g, i, targetType) {
    const [x, y] = xy(i), out = [];
    const sp = g.sp[i];
    if (sp === SP.ROW) for (let k = 0; k < W; k += 1) out.push(idx(k, y));
    else if (sp === SP.COL) for (let k = 0; k < H; k += 1) out.push(idx(x, k));
    else if (sp === SP.BURST) { for (let dy = -1; dy <= 1; dy += 1) for (let dx = -1; dx <= 1; dx += 1) { const nx = x + dx, ny = y + dy; if (nx >= 0 && nx < W && ny >= 0 && ny < H) out.push(idx(nx, ny)); } }
    else if (sp === SP.BOMB) {
      let t = targetType;
      if (t === undefined || t === null || t < 0 || t >= BOMB) {
        /* set off by something else: the most common kind on the board */
        const count = new Array(g.colors).fill(0);
        for (let k = 0; k < N; k += 1) if (isPiece(g, k)) count[g.t[k]] += 1;
        t = count.indexOf(Math.max(...count));
      }
      out.push(i);
      for (let k = 0; k < N; k += 1) if (g.t[k] === t) out.push(k);
    }
    return out;
  }

  /* Pieces fall down to fill gaps; new ones drop in from the top. */
  function gravity(g) {
    const moves = [], added = [];
    for (let x = 0; x < W; x += 1) {
      let write = H - 1;
      for (let y = H - 1; y >= 0; y -= 1) {
        const i = idx(x, y);
        if (g.t[i] === EMPTY) continue;
        const to = idx(x, write);
        if (to !== i) { g.t[to] = g.t[i]; g.sp[to] = g.sp[i]; g.id[to] = g.id[i]; g.t[i] = EMPTY; g.sp[i] = 0; g.id[i] = 0; moves.push({ id: g.id[to], from: i, to }); }
        write -= 1;
      }
      for (let y = write, k = 1; y >= 0; y -= 1, k += 1) {
        const i = idx(x, y);
        g.t[i] = g.r.int(g.colors); g.sp[i] = 0; g.id[i] = g.nextId++;
        added.push({ id: g.id[i], to: i, t: g.t[i], fromRow: -k });
      }
    }
    return { moves, added };
  }

  /* Clear matches and specials, drop and refill, and repeat while new matches
     appear (cascades: each wave scores more). Returns the waves for animation. */
  function resolve(g, prefer, firstActs) {
    const steps = [];
    let combo = 0, acts = firstActs || [];
    for (let guard = 0; guard < 60; guard += 1) {
      const groups = findGroups(g, prefer);
      if (!groups.length && !acts.length) break;
      combo += 1;
      const clear = new Set(), spawn = [], fired = [];
      for (const gr of groups) {
        gr.cells.forEach(c => clear.add(c));
        if (gr.special) spawn.push({ i: gr.at, sp: gr.special, t: gr.special === SP.BOMB ? BOMB : gr.type });
      }
      const queue = [...acts];
      for (const c of clear) if (g.sp[c]) queue.push({ i: c });
      const done = new Set();
      while (queue.length) {
        const a = queue.shift();
        if (done.has(a.i) || !g.sp[a.i]) continue;
        done.add(a.i);
        fired.push({ i: a.i, sp: g.sp[a.i], id: g.id[a.i] });
        for (const c of effect(g, a.i, a.target)) { clear.add(c); if (g.sp[c] && !done.has(c)) queue.push({ i: c }); }
      }
      const spawnAt = new Set(spawn.map(s => s.i));
      const cleared = [];
      let pieces = 0;
      for (const c of clear) {
        if (g.t[c] === EMPTY) continue;
        const t = g.t[c];
        if (t >= 0 && t < BOMB) { const name = g.pieces[t]; g.collected[name] = (g.collected[name] || 0) + 1; }
        if (g.stone[c]) g.stone[c] = 0;
        cleared.push({ i: c, id: g.id[c], t, sp: g.sp[c] });
        pieces += 1;
        if (!spawnAt.has(c)) { g.t[c] = EMPTY; g.sp[c] = 0; g.id[c] = 0; }
      }
      const gained = pieces * 10 * combo + fired.length * 40 + spawn.length * 20;
      g.score += gained;
      const spawned = spawn.map(s => { g.t[s.i] = s.t; g.sp[s.i] = s.sp; g.id[s.i] = g.nextId++; return { i: s.i, id: g.id[s.i], t: s.t, sp: s.sp }; });
      const fall = gravity(g);
      steps.push({ combo, cleared, fired, spawned, moves: fall.moves, added: fall.added, gained, score: g.score });
      prefer = null; acts = [];
    }
    return steps;
  }

  /* Play one move. Returns null for a move that does not match (the pieces
     bounce back) or { steps, shuffled } after everything settles. */
  function play(g, a, b) {
    if (g.movesLeft <= 0 || !isValidSwap(g, a, b)) return null;
    swapCells(g, a, b);
    g.movesLeft -= 1;
    const acts = [];
    const ta = g.t[a], tb = g.t[b];
    let steps;
    if (ta === BOMB && tb === BOMB) {
      /* two stars together: the whole board */
      const all = [];
      for (let k = 0; k < N; k += 1) if (g.t[k] !== EMPTY) all.push(k);
      steps = resolveForced(g, all);
    } else {
      if (ta === BOMB) acts.push({ i: a, target: tb });
      else if (tb === BOMB) acts.push({ i: b, target: ta });
      else if (g.sp[a] && g.sp[b]) { acts.push({ i: a }); acts.push({ i: b }); }
      steps = resolve(g, [a, b], acts);
    }
    let shuffled = false;
    if (!hasMove(g)) { shuffle(g); shuffled = true; }
    return { steps, shuffled };
  }
  function resolveForced(g, cells) {
    const cleared = [];
    for (const c of cells) {
      if (g.t[c] === EMPTY) continue;
      const t = g.t[c];
      if (t >= 0 && t < BOMB) { const name = g.pieces[t]; g.collected[name] = (g.collected[name] || 0) + 1; }
      if (g.stone[c]) g.stone[c] = 0;
      cleared.push({ i: c, id: g.id[c], t, sp: g.sp[c] });
      g.t[c] = EMPTY; g.sp[c] = 0; g.id[c] = 0;
    }
    g.score += cleared.length * 20;
    const fall = gravity(g);
    return [{ combo: 1, cleared, fired: [], spawned: [], moves: fall.moves, added: fall.added, gained: cleared.length * 20, score: g.score }].concat(resolve(g, null, []));
  }

  /* No moves left on the board: mix the normal pieces (specials stay put)
     until there is a move and no ready-made match. */
  function shuffle(g) {
    const cells = [];
    for (let i = 0; i < N; i += 1) if (isPiece(g, i) && !g.sp[i]) cells.push(i);
    for (let tries = 0; tries < 100; tries += 1) {
      const types = cells.map(i => g.t[i]);
      for (let k = types.length - 1; k > 0; k -= 1) { const j = g.r.int(k + 1); [types[k], types[j]] = [types[j], types[k]]; }
      cells.forEach((i, k) => { g.t[i] = types[k]; });
      if (tries > 50) cells.forEach(i => { g.t[i] = g.r.int(g.colors); });
      if (!findGroups(g).length && hasMove(g)) return true;
    }
    return false;
  }

  /* Goals: { kind: 'score', n } | { kind: 'collect', piece, n } | { kind: 'stones' } */
  function goals(g, level) {
    return level.goals.map(goal => {
      if (goal.kind === 'score') return { ...goal, have: Math.min(g.score, goal.n), need: goal.n, done: g.score >= goal.n };
      if (goal.kind === 'collect') { const have = Math.min(goal.n, g.collected[goal.piece] || 0); return { ...goal, have, need: goal.n, done: have >= goal.n }; }
      const left = g.stone.reduce((a, b) => a + b, 0);
      return { ...goal, have: g.stonesStart - left, need: g.stonesStart, done: left === 0 };
    });
  }
  function status(g, level) {
    const list = goals(g, level);
    if (list.every(x => x.done)) return 'won';
    return g.movesLeft <= 0 ? 'lost' : 'playing';
  }
  /* When the goal is reached with moves to spare, each spare move is worth a
     little bonus. */
  /* "Sugar crush": when the goal is reached, every unused move is worth a
     big bonus, so finishing early scores high. */
  const MOVE_BONUS = 150;
  function moveBonus(g) { return Math.max(0, g.movesLeft) * MOVE_BONUS; }
  function finalScore(g) { return g.score + moveBonus(g); }
  /* Stars for a win: 2 or 3 from the final score (bonus included). A win
     with at least half the moves unused always earns at least 2 stars. */
  function stars(level, score, movesLeft) {
    let n = score >= level.stars[1] ? 3 : score >= level.stars[0] ? 2 : 1;
    if (Number.isFinite(movesLeft) && movesLeft >= Math.ceil(level.moves * 0.5)) n = Math.max(n, 2);
    return n;
  }

  /* Saved progress: which level is open, stars and best score per level. */
  function progress(storage, total) {
    const read = () => { try { const v = JSON.parse(storage.getItem(KEYS.progress) || '{}'); return v && typeof v === 'object' ? v : {}; } catch { return {}; } };
    const write = v => { try { storage.setItem(KEYS.progress, JSON.stringify(v)); } catch { /* full or blocked */ } };
    const clean = () => {
      const v = read();
      const open = Math.max(1, Math.min(total, Number.isInteger(v.open) ? v.open : 1));
      const st = {}, best = {};
      for (const [k, s] of Object.entries(v.stars || {})) if (/^\d+$/.test(k) && Number(k) >= 1 && Number(k) <= total && [1, 2, 3].includes(s)) st[k] = s;
      for (const [k, s] of Object.entries(v.best || {})) if (/^\d+$/.test(k) && Number.isFinite(s) && s >= 0) best[k] = Math.round(s);
      return { open, stars: st, best };
    };
    return {
      get: clean,
      isOpen(n) { return n <= clean().open; },
      win(n, starCount, score) {
        const v = clean();
        v.stars[n] = Math.max(v.stars[n] || 0, starCount);
        v.best[n] = Math.max(v.best[n] || 0, score);
        v.open = Math.max(v.open, Math.min(total, n + 1));
        write(v);
        return v;
      },
      totalStars() { return Object.values(clean().stars).reduce((a, b) => a + b, 0); }
    };
  }
  function soundPref(storage) {
    return {
      get() { try { return storage.getItem(KEYS.sounds) !== 'off'; } catch { return true; } },
      set(on) { try { storage.setItem(KEYS.sounds, on ? 'on' : 'off'); } catch { /* ignore */ } return !!on; }
    };
  }
  /* Vibration length for a match: a bit longer for specials and big combos, capped. */
  function buzzMs(combo, specials) { return Math.min(30, 8 + 3 * Math.max(0, combo - 1) + 8 * Math.min(2, specials || 0)); }

  const api = { W, H, N, EMPTY, BOMB, SP, KEYS, rng, xy, idx, adjacent, createGame, clone, findGroups, isValidSwap, allMoves, hasMove, hint, effect, gravity, resolve, play, shuffle, goals, status, MOVE_BONUS, moveBonus, finalScore, stars, progress, soundPref, buzzMs };
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.MsbMatchCore = api;
})(typeof self !== 'undefined' ? self : this);
