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

  /* ---------- Ark Builder ---------- */
  const arkDeck = (pairs, rand = Math.random) => scramble(pairs.flatMap(a => [a, a]), rand);
  /* Stars by how much of the rain timer was left. */
  const arkStars = (left, total) => (left >= total * 0.45 ? 3 : left >= total * 0.2 ? 2 : 1);

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
  const count = (v, g) => (v.done[g] || []).length;
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
      { id: 'kg-ark-1', game: 'ark', icon: '🛶', name: { en: 'Two by two', es: 'De dos en dos' }, goal: { en: 'Load the ark before the rain', es: 'Llena el arca antes de la lluvia' }, test: v => count(v, 'ark') >= 1 },
      { id: 'kg-ark-all', game: 'ark', icon: '🌈', name: { en: 'Faithful like Noah', es: 'Fiel como Noé' }, goal: { en: 'Finish every Ark Builder level', es: 'Termina todos los niveles del arca' }, test: all('ark', 3) },
      { id: 'kg-who-10', game: 'who', icon: '🗣️', name: { en: 'Voice of the Bible', es: 'Voces de la Biblia' }, goal: { en: 'Get 10 in a row in Who Said It?', es: 'Acierta 10 seguidas en ¿Quién lo dijo?' }, test: v => (Number(v.best.who) || 0) >= 10 },
    ];
  }
  return { KEYS, hash, rng, shuffle, scramble, gridWord, wordSearch, lineCells, findWord, orderMarks, isOrdered, moveItem, choices, verseWords, nextFalling, wordFits, stars, arkDeck, arkStars, progress, soundPref, badgeDefs, today };
});
