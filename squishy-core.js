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

  const api = { KEYS, soundPref, progress, pressDepth, springStep, atRest, pokeOffset, vibeMs, rng, shuffle, memoryDeck, isMatch, questionRound, roundWon, PASS };
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.MsbSquishyCore = api;
})(typeof self !== 'undefined' ? self : this);
