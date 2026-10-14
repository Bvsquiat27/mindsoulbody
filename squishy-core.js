/* Squishy game logic with no DOM, so it can be tested in Node: settings and
   progress kept on this device, the squash-and-stretch spring, the vibration
   length, the memory-card deck and the question round. */
(function (root) {
  'use strict';

  const KEYS = { sounds: 'msb_squishy_sounds', unlocked: 'msb_squishy_unlocked', stars: 'msb_squishy_stars', stats: 'msb_squishy_stats', match: 'msb_match_progress', trade: 'msb_squishy_trade', lessonSeen: 'msb_squishy_lesson_seen' };

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
    /* Open one squishy (its challenge was met). Already-open ones stay open. */
    function unlock(id) {
      if (!known(id)) return false;
      const extra = readList(storage, KEYS.unlocked).filter(known);
      if (unlocked().includes(id)) return false;
      extra.push(id);
      writeList(storage, KEYS.unlocked, [...new Set(extra)]);
      return true;
    }
    return { unlocked, isOpen, nextLocked, unlockNext, unlock, stars, addStar, total: ids.length };
  }

  /* ---------- Each squishy's own sounds, effect and secret trick ----------
     sound: which voices the game makes when you squish (press), stretch
     (the tone that follows the pull) and let go; each squishy has its own.
     fx: the little particles it gives off while you play.
     trick: a secret move tied to its Bible story, done with one gesture. */
  const KITS = {
    lamb: { sound: { squish: 'bleat', release: 'mee', tone: 'warble' }, fx: 'hearts' },
    dove: { sound: { squish: 'coo', release: 'flutter', tone: 'whistle' }, fx: 'feathers' },
    fish: { sound: { squish: 'bubbles', release: 'splash', tone: 'blub' }, fx: 'bubbles' },
    lion: { sound: { squish: 'purr', release: 'roar', tone: 'growl' }, fx: 'roar-rings' },
    star: { sound: { squish: 'bell', release: 'twinkle', tone: 'shimmer' }, fx: 'twinkles' },
    rainbow: { sound: { squish: 'chord', release: 'glissando', tone: 'glide' }, fx: 'color-trail' },
    stone: { sound: { squish: 'thud', release: 'clack', tone: 'twang' }, fx: 'dust' },
    loaves: { sound: { squish: 'dough', release: 'crust', tone: 'hum' }, fx: 'crumbs' },
    seed: { sound: { squish: 'pluck', release: 'sprout', tone: 'tremble' }, fx: 'leaves' },
    bush: { sound: { squish: 'crackle', release: 'flare', tone: 'burn' }, fx: 'embers', trick: 'i-am', gesture: 'tripleTap' },
    basket: { sound: { squish: 'slosh', release: 'drip', tone: 'wave' }, fx: 'ripples' },
    tree: { sound: { squish: 'rustle', release: 'knock', tone: 'flutter' }, fx: 'falling-leaves' },
    ark: { sound: { squish: 'creak', release: 'patter', tone: 'horn' }, fx: 'rain' },
    coat: { sound: { squish: 'swish', release: 'harp', tone: 'chorus' }, fx: 'ribbons' },
    lamp: { sound: { squish: 'crunch', release: 'crunch-tail', tone: 'none' }, fx: 'sparks', trick: 'light-room', gesture: 'hold', ms: 1500 },
    ladder: { sound: { squish: 'step', release: 'ascend', tone: 'choir' }, fx: 'halos' },
    raven: { sound: { squish: 'caw', release: 'wingbeat', tone: 'rasp' }, fx: 'dark-feathers' },
    wheat: { sound: { squish: 'sheaf', release: 'scatter', tone: 'breeze' }, fx: 'grains' },
    oil: { sound: { squish: 'glug', release: 'pour', tone: 'viscous' }, fx: 'oil-drops' },
    coin: { sound: { squish: 'clink', release: 'jingle', tone: 'spin' }, fx: 'coins' },
    donkey: { sound: { squish: 'heehaw', release: 'hoof', tone: 'bray' }, fx: 'kind-hearts' },
    jar: { sound: { squish: 'shatter', release: 'trumpet', tone: 'torch' }, fx: 'shards' },
    crown: { sound: { squish: 'jewel', release: 'royal', tone: 'regal' }, fx: 'jewels' },
    boat: { sound: { squish: 'oar', release: 'haul', tone: 'sea' }, fx: 'spray' },
    tomb: { sound: { squish: 'rumble', release: 'alleluia', tone: 'dawn' }, fx: 'sunbeams' },
    /* newer squishies, each won in one of the games */
    lily: { sound: { squish: 'petal', release: 'bloom', tone: 'meadow' }, fx: 'petals' },
    key: { sound: { squish: 'turn', release: 'unlock', tone: 'tumbler' }, fx: 'keysparks' },
    pearl: { sound: { squish: 'shimmerpop', release: 'pearlroll', tone: 'nacre' }, fx: 'pearls' },
    manna: { sound: { squish: 'flake', release: 'sprinkle', tone: 'dew' }, fx: 'manna-flakes' },
    scroll: { sound: { squish: 'unroll', release: 'rollup', tone: 'parchment' }, fx: 'letters' },
    shofar: { sound: { squish: 'blast', release: 'echo', tone: 'hornblow' }, fx: 'soundwaves' },
    tablets: { sound: { squish: 'chisel', release: 'settle', tone: 'stonehum' }, fx: 'stone-chips' },
    elephant: { sound: { squish: 'stomp', release: 'toot', tone: 'trunk' }, fx: 'puffs' },
    honeycomb: { sound: { squish: 'buzz', release: 'drizzle', tone: 'honey' }, fx: 'honey-drops' },
    anchor: { sound: { squish: 'chain', release: 'splashdown', tone: 'deep' }, fx: 'anchor-bubbles' },
    shield: { sound: { squish: 'clang', release: 'ring-out', tone: 'brass' }, fx: 'glints' },
    chariot: { sound: { squish: 'gallop', release: 'whirl', tone: 'whirlwind' }, fx: 'fire-trail' }
  };
  /* The stretch tone of each squishy: oscillator wave, base pitch and how
     far the pitch climbs with the stretch, wobble (lfo rate and depth) and
     the filter it plays through. */
  const TONES = {
    warble: { type: 'sine', base: 330, range: 380, lfo: 6, depth: 18, filter: 1600, q: 0.8 },
    whistle: { type: 'sine', base: 620, range: 700, lfo: 10, depth: 12, filter: 3200, q: 0.8 },
    blub: { type: 'square', base: 90, range: 160, lfo: 4, depth: 20, filter: 480, q: 2 },
    growl: { type: 'sawtooth', base: 70, range: 150, lfo: 30, depth: 10, filter: 620, q: 1 },
    shimmer: { type: 'sine', base: 880, range: 900, lfo: 14, depth: 25, filter: 5200, q: 0.7 },
    glide: { type: 'triangle', base: 260, range: 780, lfo: 3, depth: 30, filter: 2000, q: 0.8 },
    twang: { type: 'sawtooth', base: 110, range: 420, lfo: 0, depth: 0, filter: 1200, q: 6 },
    hum: { type: 'sine', base: 160, range: 200, lfo: 5, depth: 4, filter: 820, q: 0.8 },
    tremble: { type: 'triangle', base: 400, range: 500, lfo: 12, depth: 16, filter: 1800, q: 1 },
    burn: { type: 'sawtooth', base: 120, range: 260, lfo: 17, depth: 25, filter: 900, q: 3 },
    wave: { type: 'sine', base: 220, range: 300, lfo: 2, depth: 30, filter: 1000, q: 0.8 },
    flutter: { type: 'triangle', base: 200, range: 350, lfo: 5, depth: 9, filter: 900, q: 1.5 },
    horn: { type: 'sawtooth', base: 65, range: 110, lfo: 1.5, depth: 3, filter: 400, q: 1.2 },
    chorus: { type: 'triangle', base: 300, range: 600, lfo: 7, depth: 10, filter: 2200, q: 0.9 },
    choir: { type: 'triangle', base: 500, range: 400, lfo: 5.5, depth: 6, filter: 2500, q: 1.1 },
    rasp: { type: 'sawtooth', base: 260, range: 300, lfo: 22, depth: 8, filter: 1400, q: 4 },
    breeze: { type: 'sine', base: 180, range: 260, lfo: 0.8, depth: 40, filter: 700, q: 0.6 },
    viscous: { type: 'square', base: 140, range: 180, lfo: 3, depth: 15, filter: 350, q: 1.4 },
    spin: { type: 'square', base: 600, range: 900, lfo: 18, depth: 40, filter: 4000, q: 0.9 },
    bray: { type: 'sawtooth', base: 200, range: 300, lfo: 2.2, depth: 60, filter: 1500, q: 2 },
    torch: { type: 'sawtooth', base: 90, range: 200, lfo: 9, depth: 20, filter: 700, q: 4 },
    regal: { type: 'triangle', base: 392, range: 400, lfo: 4.5, depth: 7, filter: 3000, q: 1.2 },
    sea: { type: 'sine', base: 140, range: 220, lfo: 0.6, depth: 25, filter: 600, q: 0.7 },
    dawn: { type: 'triangle', base: 330, range: 660, lfo: 2.5, depth: 5, filter: 4000, q: 0.5 },
    meadow: { type: 'sine', base: 520, range: 520, lfo: 4, depth: 8, filter: 2600, q: 0.6 },
    tumbler: { type: 'square', base: 300, range: 500, lfo: 11, depth: 12, filter: 1800, q: 3 },
    nacre: { type: 'sine', base: 700, range: 800, lfo: 7, depth: 6, filter: 6000, q: 0.5 },
    dew: { type: 'triangle', base: 900, range: 700, lfo: 1.2, depth: 10, filter: 5000, q: 0.4 },
    parchment: { type: 'sawtooth', base: 220, range: 240, lfo: 3.5, depth: 6, filter: 1100, q: 0.9 },
    hornblow: { type: 'sawtooth', base: 150, range: 300, lfo: 5, depth: 4, filter: 1500, q: 1.6 },
    stonehum: { type: 'square', base: 80, range: 120, lfo: 2, depth: 2, filter: 300, q: 1 },
    trunk: { type: 'sawtooth', base: 180, range: 420, lfo: 6.5, depth: 30, filter: 1700, q: 2.5 },
    honey: { type: 'sine', base: 240, range: 260, lfo: 1.8, depth: 14, filter: 900, q: 0.9 },
    deep: { type: 'sine', base: 90, range: 140, lfo: 0.9, depth: 12, filter: 450, q: 0.8 },
    brass: { type: 'square', base: 330, range: 420, lfo: 8, depth: 5, filter: 2400, q: 1.8 },
    whirlwind: { type: 'sawtooth', base: 200, range: 900, lfo: 13, depth: 35, filter: 2800, q: 1.3 },
    none: null
  };
  const GESTURES = ['tap', 'doubleTap', 'tripleTap', 'fiveTaps', 'tapTop', 'hold', 'holdStill', 'flickUp', 'pullRelease', 'dragAcross', 'swipeLR', 'shake', 'rock', 'circle', 'stretchUp', 'stretchDown', 'flickDown', 'flickSide', 'swipeUD'];
  const kitFor = id => KITS[id] || null;

  /* Gesture recognizer. Feed it pointer events in squishy units (the
     squishy is 120 x 120, (0,0) its top-left corner) with times in ms;
     it answers with the gestures it saw. One finger only. */
  function gestures(opt = {}) {
    const size = opt.size || 120, TAP_MS = 260, TAP_MOVE = 10, GAP = 380;
    let cur = null, taps = [], holdSent = 0;
    function down(x, y, t) { cur = { pts: [{ x, y, t }], x0: x, y0: y, t0: t, max: 0, still: true }; holdSent = 0; return []; }
    function move(x, y, t) {
      if (!cur) return [];
      cur.pts.push({ x, y, t });
      const d = Math.hypot(x - cur.x0, y - cur.y0);
      cur.max = Math.max(cur.max, d);
      if (d > 8) cur.still = false;
      return poll(t);
    }
    /* call every frame while a finger is down: holds fire while holding */
    function poll(t) {
      if (!cur) return [];
      const ms = t - cur.t0, out = [];
      if (cur.max <= 14 && ms >= 1500 && holdSent < 1) { holdSent = 1; out.push({ type: 'hold', ms }); }
      if (cur.still && ms >= 3000 && holdSent < 2) { holdSent = 2; out.push({ type: 'holdStill', ms }); }
      return out;
    }
    function up(x, y, t) {
      if (!cur) return [];
      move(x, y, t);
      const c = cur, out = [], ms = t - c.t0, pts = c.pts;
      cur = null;
      /* taps */
      if (ms <= TAP_MS && c.max <= TAP_MOVE) {
        taps = taps.filter(k => t - k.t <= GAP * 4);
        if (taps.length && t - taps[taps.length - 1].t > GAP) taps = [];
        taps.push({ t, x, y });
        const n = taps.length;
        out.push({ type: 'tap', n, x, y });
        if (y < size * 0.3) out.push({ type: 'tapTop' });
        if (n === 2) out.push({ type: 'doubleTap' });
        if (n === 3) out.push({ type: 'tripleTap' });
        if (n === 5) { out.push({ type: 'fiveTaps' }); taps = []; }
        return out;
      }
      taps = [];
      const dx = x - c.x0, dy = y - c.y0;
      /* flick: a quick upward throw at the end */
      /* any 60-250 ms stretch right before letting go that went up fast */
      const flick = pts.some(p => { const fdt = t - p.t, fdx = x - p.x, fdy = y - p.y; return fdt >= 60 && fdt <= 250 && fdy < -22 && Math.abs(fdy) > Math.abs(fdx) * 1.3 && -fdy / fdt > 0.16; });
      if (flick || (ms < 200 && dy < -22 && Math.abs(dy) > Math.abs(dx) * 1.3)) out.push({ type: 'flickUp' });
      /* the same quick throw, downward or sideways */
      const throwTo = test => pts.some(p => { const fdt = t - p.t; return fdt >= 60 && fdt <= 250 && test(x - p.x, y - p.y, fdt); }) || (ms < 200 && test(dx, dy, Math.max(16, ms)));
      if (throwTo((fx, fy, ft) => fy > 22 && Math.abs(fy) > Math.abs(fx) * 1.3 && fy / ft > 0.16)) out.push({ type: 'flickDown' });
      if (throwTo((fx, fy, ft) => Math.abs(fx) > 22 && Math.abs(fx) > Math.abs(fy) * 1.3 && Math.abs(fx) / ft > 0.16)) out.push({ type: 'flickSide', dir: Math.sign(dx) || 1 });
      /* pulled far, then let go while still far (a slingshot) */
      if (c.max >= 55 && Math.hypot(dx, dy) >= 45) out.push({ type: 'pullRelease', dx, dy });
      /* slow pull upward */
      if (dy <= -45 && Math.abs(dx) < Math.abs(dy) * 0.7 && ms >= 350) out.push({ type: 'stretchUp' });
      if (dy >= 45 && Math.abs(dx) < Math.abs(dy) * 0.7 && ms >= 350) out.push({ type: 'stretchDown' });
      /* a long drag across */
      let len = 0, minX = Infinity, maxX = -Infinity;
      pts.forEach((p, i) => { if (i) len += Math.hypot(p.x - pts[i - 1].x, p.y - pts[i - 1].y); minX = Math.min(minX, p.x); maxX = Math.max(maxX, p.x); });
      if (maxX - minX >= 110 && len >= 160) out.push({ type: 'dragAcross', path: pts.map(p => [p.x, p.y]) });
      /* back-and-forth moves: direction changes along x */
      let turns = 0, dir = 0, ext = pts[0].x, amp = 0;
      for (const p of pts) {
        const d = p.x - ext;
        if (dir >= 0 && d < -12) { if (dir > 0) turns += 1; dir = -1; ext = p.x; }
        else if (dir <= 0 && d > 12) { if (dir < 0) turns += 1; dir = 1; ext = p.x; }
        if (dir > 0 && p.x > ext) ext = p.x;
        if (dir < 0 && p.x < ext) ext = p.x;
        amp = Math.max(amp, Math.abs(p.x - pts[0].x));
      }
      const xDom = (maxX - minX) > 2 * (Math.max(...pts.map(p => p.y)) - Math.min(...pts.map(p => p.y)));
      if (turns >= 2 && xDom && amp >= 20 && ms < 1600) out.push({ type: 'swipeLR', turns });
      if (turns >= 3 && ms <= 1500) out.push({ type: 'shake', turns });
      if (turns >= 2 && ms >= 1200 && len / ms < 0.25) out.push({ type: 'rock', turns });
      /* up-and-down: the same count along y */
      let vt = 0, vdir = 0, vext = pts[0].y, minY = Infinity, maxY = -Infinity;
      for (const p of pts) {
        const d = p.y - vext;
        if (vdir >= 0 && d < -12) { if (vdir > 0) vt += 1; vdir = -1; vext = p.y; }
        else if (vdir <= 0 && d > 12) { if (vdir < 0) vt += 1; vdir = 1; vext = p.y; }
        if (vdir > 0 && p.y > vext) vext = p.y;
        if (vdir < 0 && p.y < vext) vext = p.y;
        minY = Math.min(minY, p.y); maxY = Math.max(maxY, p.y);
      }
      if (vt >= 2 && (maxY - minY) > 2 * (maxX - minX) && maxY - minY >= 25 && ms < 2500) out.push({ type: 'swipeUD', turns: vt });
      /* circling: total turning angle around the middle of the path */
      if (pts.length >= 8) {
        const mx = pts.reduce((a, p) => a + p.x, 0) / pts.length, my = pts.reduce((a, p) => a + p.y, 0) / pts.length;
        let ang = 0, rad = 0;
        for (let i = 1; i < pts.length; i += 1) {
          const a0 = Math.atan2(pts[i - 1].y - my, pts[i - 1].x - mx), a1 = Math.atan2(pts[i].y - my, pts[i].x - mx);
          let da = a1 - a0; if (da > Math.PI) da -= 2 * Math.PI; if (da < -Math.PI) da += 2 * Math.PI;
          ang += da; rad += Math.hypot(pts[i].x - mx, pts[i].y - my);
        }
        if (Math.abs(ang) >= Math.PI * 1.7 && rad / (pts.length - 1) >= 14) out.push({ type: 'circle', turns: Math.abs(ang) / (2 * Math.PI) });
      }
      return out;
    }
    return { down, move, up, poll, get active() { return !!cur; } };
  }
  /* Does this gesture do this squishy's trick? */
  /* Only a few squishies keep a secret trick; the rest just have their own
     voice and sparkle. */
  const hasTrick = id => !!(KITS[id] && KITS[id].trick);
  function isTrick(id, g) {
    const k = KITS[id];
    if (!k || !g || g.type !== k.gesture) return false;
    if ((g.type === 'hold' || g.type === 'holdStill') && k.ms && g.ms < k.ms) return false;
    return true;
  }
  /* The hint shows the gesture after the trick was found, or after a few
     plays with that squishy (a gentle nudge). */
  const HINT_AFTER = 12;
  function trickRevealed(id, st) { return hasTrick(id) && ( (st.tricks || []).includes(id) || ((st.plays || {})[id] || 0) >= HINT_AFTER); }

  /* ---------- Unlock challenges ----------
     Each locked squishy has its own challenge, from easy to hard. Some are
     rare, and the glowing lamp is legendary. Squishies opened before this
     (by the old "win any round" rule) stay open. */
  const CHALLENGES = [
    { id: 'stone', kind: 'memoryWins', n: 1, tier: 'common' },
    { id: 'loaves', kind: 'lessons', n: 3, tier: 'common' },
    { id: 'seed', kind: 'squishes', n: 50, tier: 'common' },
    /* the burning bush is legendary: 10 perfect rounds of Bible questions */
    { id: 'bush', kind: 'perfectLegend', n: 10, tier: 'legendary' },
    { id: 'basket', kind: 'matchChapter', n: 4, tier: 'rare' },
    { id: 'tree', kind: 'memoryFast', n: 10, tier: 'common' },
    { id: 'ark', kind: 'perfectRound', n: 1, tier: 'rare' },
    { id: 'coat', kind: 'streak', n: 3, tier: 'rare' },
    { id: 'ladder', kind: 'memoryWins', n: 4, tier: 'common' },
    { id: 'raven', kind: 'lessons', n: 8, tier: 'common' },
    { id: 'wheat', kind: 'squishes', n: 300, tier: 'common' },
    { id: 'oil', kind: 'questionWins', n: 6, tier: 'common' },
    { id: 'coin', kind: 'matchChapter', n: 10, tier: 'common' },
    { id: 'donkey', kind: 'lessons', n: 12, tier: 'common' },
    { id: 'jar', kind: 'streak', n: 5, tier: 'rare' },
    { id: 'crown', kind: 'matchThreeStars', n: 5, tier: 'rare' },
    { id: 'boat', kind: 'perfectRound', n: 3, tier: 'rare' },
    { id: 'tomb', kind: 'matchChapter', n: 20, tier: 'legendary' },
    /* won in the games: coloring, Questions, Memory, Manna Match, then the
       seven Bible games (kids' games hub); the chariot needs all seven */
    { id: 'lily', kind: 'colored', n: 3, tier: 'common' },
    { id: 'key', kind: 'questionWins', n: 10, tier: 'common' },
    { id: 'pearl', kind: 'memoryWins', n: 8, tier: 'rare' },
    { id: 'manna', kind: 'matchThreeStars', n: 10, tier: 'common' },
    { id: 'scroll', kind: 'kgDone', game: 'wordsearch', n: 3, tier: 'common' },
    { id: 'shofar', kind: 'kgBest', game: 'who', n: 8, tier: 'common' },
    { id: 'tablets', kind: 'kgDone', game: 'order', n: 4, tier: 'rare' },
    { id: 'elephant', kind: 'kgDone', game: 'ark', n: 1, tier: 'common' },
    { id: 'honeycomb', kind: 'kgDone', game: 'verse', n: 3, tier: 'rare' },
    { id: 'anchor', kind: 'kgDone', game: 'map', n: 2, tier: 'rare' },
    { id: 'shield', kind: 'kgDone', game: 'sling', n: 4, tier: 'rare' },
    { id: 'chariot', kind: 'kgAll', n: 7, tier: 'legendary' },
    { id: 'lamp', kind: 'final', n: 0, tier: 'legendary' }
  ];
  /* Extra badges that do not open a squishy. */
  const EXTRA_BADGES = [
    { id: 'first-squish', kind: 'squishes', n: 1, tier: 'common' },
    { id: 'squish-200', kind: 'squishes', n: 200, tier: 'rare' },
    { id: 'all-lessons', kind: 'lessons', n: 15, tier: 'rare' },
    { id: 'match-3star', kind: 'matchThreeStars', n: 1, tier: 'common' },
    { id: 'first-trick', kind: 'tricks', n: 1, tier: 'common' },
    { id: 'trick-master', kind: 'tricks', n: 0, tier: 'legendary' },
    { id: 'friendship', kind: 'trades', n: 1, tier: 'rare' }
  ];
  const tierOf = id => (CHALLENGES.find(c => c.id === id) || {}).tier || 'common';

  /* Local calendar day, e.g. "2026-10-11" (the phone's own time zone). */
  function dayKey(date) {
    const d = date || new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }
  function dayNumber(key) { const [y, m, d] = key.split('-').map(Number); return Math.round(Date.UTC(y, m - 1, d) / 86400000); }
  /* Longest run of days in a row in a list of day keys. */
  function longestStreak(days) {
    const nums = [...new Set(days.filter(k => /^\d{4}-\d{2}-\d{2}$/.test(k)).map(dayNumber))].sort((a, b) => a - b);
    let best = 0, run = 0;
    nums.forEach((n, i) => { run = i && n === nums[i - 1] + 1 ? run + 1 : 1; best = Math.max(best, run); });
    return best;
  }

  /* Play counts kept for the challenges (one small JSON object). */
  function stats(storage) {
    const blank = () => ({ memoryWins: 0, memoryBest: 0, questionWins: 0, perfectRounds: 0, squishes: 0, days: [], bestStreak: 0, badges: {}, tricks: [], plays: {}, colored: [] });
    const nat = v => (Number.isFinite(v) && v > 0 ? Math.floor(v) : 0);
    function get() {
      let v;
      try { v = JSON.parse(storage.getItem(KEYS.stats) || '{}'); } catch { v = {}; }
      if (!v || typeof v !== 'object' || Array.isArray(v)) v = {};
      const out = blank();
      for (const k of ['memoryWins', 'memoryBest', 'questionWins', 'perfectRounds', 'squishes', 'bestStreak']) out[k] = nat(v[k]);
      out.days = Array.isArray(v.days) ? v.days.filter(k => typeof k === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(k)).slice(-30) : [];
      if (v.badges && typeof v.badges === 'object') for (const [k, d] of Object.entries(v.badges)) if (typeof d === 'string') out.badges[k] = d;
      out.tricks = Array.isArray(v.tricks) ? [...new Set(v.tricks.filter(k => typeof k === 'string' && KITS[k]))] : [];
      if (v.plays && typeof v.plays === 'object') for (const [k, n] of Object.entries(v.plays)) if (KITS[k]) out.plays[k] = nat(n);
      out.colored = Array.isArray(v.colored) ? [...new Set(v.colored.filter(k => typeof k === 'string' && /^[\w:.-]{1,60}$/.test(k)))].slice(0, 60) : [];
      return out;
    }
    function save(v) { try { storage.setItem(KEYS.stats, JSON.stringify(v)); } catch { /* full or blocked */ } return v; }
    return {
      get,
      memoryWon(moves) { const v = get(); v.memoryWins += 1; v.memoryBest = v.memoryBest ? Math.min(v.memoryBest, moves) : moves; return save(v); },
      roundDone(correct, count) { const v = get(); if (roundWon(correct, count)) v.questionWins += 1; if (count > 0 && correct === count) v.perfectRounds += 1; return save(v); },
      squished(id) { const v = get(); v.squishes += 1; if (id && KITS[id]) v.plays[id] = (v.plays[id] || 0) + 1; return save(v); },
      /* returns true the first time this squishy's trick is found */
      trickFound(id) { const v = get(); if (!KITS[id] || v.tricks.includes(id)) return false; v.tricks.push(id); save(v); return true; },
      played(date) {
        const v = get(), k = dayKey(date);
        if (!v.days.includes(k)) v.days = [...v.days, k].sort().slice(-30);
        v.bestStreak = Math.max(v.bestStreak, longestStreak(v.days));
        return save(v);
      },
      /* a coloring page saved (counted once per page) */
      colored(page) { const v = get(); if (typeof page === 'string' && /^[\w:.-]{1,60}$/.test(page) && !v.colored.includes(page)) { v.colored.push(page); save(v); } return v; },
      earn(id, date) { const v = get(); if (!v.badges[id]) { v.badges[id] = dayKey(date); save(v); return true; } return false; }
    };
  }

  /* Manna Match progress, read safely (levels won and their stars). */
  function matchStars(storage) {
    try { const v = JSON.parse(storage.getItem(KEYS.match) || '{}'); return v && v.stars && typeof v.stars === 'object' ? v.stars : {}; } catch { return {}; }
  }

  /* Kids' Bible games progress (msb_kidgames), read safely. */
  const KID_GAMES = ['wordsearch', 'order', 'who', 'verse', 'ark', 'map', 'sling'];
  function kidGames(storage) {
    try {
      const v = JSON.parse(storage.getItem('msb_kidgames') || '{}') || {};
      const done = {}, best = {};
      for (const g of KID_GAMES) { done[g] = Array.isArray(v.done && v.done[g]) ? new Set(v.done[g].filter(x => typeof x === 'string')).size : 0; best[g] = Math.max(0, Math.floor(Number(v.best && v.best[g]) || 0)); }
      return { done, best };
    } catch { return { done: {}, best: {} }; }
  }

  /* How far along a challenge is: { have, need, done }. */
  function challengeProgress(ch, ctx) {
    const st = ctx.stats, cap = (have, need) => ({ have: Math.min(have, need), need, done: have >= need });
    switch (ch.kind) {
      case 'memoryWins': return cap(st.memoryWins, ch.n);
      case 'lessons': return cap(ctx.lessons, ch.n);
      case 'squishes': return cap(st.squishes, ch.n);
      case 'questionWins': return cap(st.questionWins, ch.n);
      case 'perfectRound': case 'perfectLegend': return cap(st.perfectRounds, ch.n);
      case 'streak': return cap(Math.max(st.bestStreak, longestStreak(st.days)), ch.n);
      case 'memoryFast': { const ok = st.memoryBest > 0 && st.memoryBest <= ch.n; return { have: ok ? 1 : 0, need: 1, done: ok, best: st.memoryBest || null }; }
      case 'matchChapter': { let won = 0; for (let k = 1; k <= ch.n; k += 1) if ([1, 2, 3].includes(ctx.match[k])) won += 1; return cap(won, ch.n); }
      case 'matchThreeStars': return cap(Object.values(ctx.match).filter(s => s === 3).length, ch.n);
      case 'tricks': { const all = ctx.squishies.filter(x => hasTrick(x.id)).length; return cap(ctx.stats.tricks.filter(id => hasTrick(id) && ctx.squishies.some(x => x.id === id)).length, ch.n || all); }
      case 'trades': return cap(ctx.trades || 0, ch.n);
      case 'colored': return cap((st.colored || []).length, ch.n);
      case 'kgDone': return cap((ctx.kid && ctx.kid.done[ch.game]) || 0, ch.n);
      case 'kgBest': return cap((ctx.kid && ctx.kid.best[ch.game]) || 0, ch.n);
      case 'kgAll': return cap(KID_GAMES.filter(g => ctx.kid && ctx.kid.done[g] > 0).length, ch.n);
      case 'final': {
        /* every other squishy open, and 3 stars on any Manna Match level */
        const others = ctx.squishies.filter(x => x.id !== ch.id && x.locked);
        /* a gifted squishy counts only once its own challenge is met */
        const earned = (ctx.stats && ctx.stats.badges) || {}, gifts = ctx.gifts || [];
        const open = others.filter(x => ctx.unlocked.includes(x.id) && (!gifts.includes(x.id) || earned[x.id])).length;
        const three = Object.values(ctx.match).some(s => s === 3) ? 1 : 0;
        return cap(open + three, others.length + 1);
      }
      default: return { have: 0, need: 1, done: false };
    }
  }

  /* Everything the shelf needs: the challenge, tier and progress of each
     squishy and badge. */
  function challengeContext(storage, squishies) {
    const p = progress(storage, squishies);
    /* only a code actually redeemed on this phone counts as a trade; making a
       code is not enough. Gifted squishies are remembered so they do not
       count toward the lamp. */
    let trades = 0, gifts = [];
    try { const t = JSON.parse(storage.getItem(KEYS.trade)) || {}; const got = Array.isArray(t.got) ? t.got.filter(x => x && typeof x.id === 'string') : []; trades = got.length; gifts = [...new Set(got.map(x => x.id))]; } catch { trades = 0; gifts = []; }
    return { stats: stats(storage).get(), lessons: p.stars().length, match: matchStars(storage), unlocked: p.unlocked(), squishies, trades, gifts, kid: kidGames(storage) };
  }
  function challengeFor(id) { return CHALLENGES.find(c => c.id === id) || null; }

  /* Open every locked squishy whose challenge is met, and record new badges.
     Returns the newly opened squishy ids (the lamp last). */
  function checkUnlocks(storage, squishies, date) {
    const p = progress(storage, squishies), st = stats(storage), opened = [];
    for (const ch of CHALLENGES) {
      const ctx = challengeContext(storage, squishies);
      if (challengeProgress(ch, ctx).done) {
        st.earn(ch.id, date);
        if (p.unlock(ch.id)) opened.push(ch.id);
      }
    }
    const ctx = challengeContext(storage, squishies);
    for (const b of EXTRA_BADGES) if (challengeProgress(b, ctx).done) st.earn(b.id, date);
    return opened;
  }
  function badges(storage, squishies) {
    const ctx = challengeContext(storage, squishies), earned = ctx.stats.badges;
    return [...CHALLENGES, ...EXTRA_BADGES].map(b => ({ ...b, squishy: CHALLENGES.includes(b) ? b.id : null, earned: earned[b.id] || null, progress: challengeProgress(b, ctx) }));
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
    /* feel: soft > 1 squashes deeper, bounce > 1 springs back livelier
       (reduced motion: never softer or bouncier than the default) */
    const fe = o.feel || {}, soft = Math.max(0.5, Math.min(reduced ? 1 : 1.3, Number(fe.soft) || 1)), bounce = Math.max(0.55, Math.min(reduced ? 1 : 1.5, Number(fe.bounce) || 1));
    const cfg = { kA: 150 * (0.55 + 0.45 * bounce), kS: 760, kHold: 1400, damp: reduced ? 15 : 4.6 / bounce, kP: 1300, max: size * (reduced ? 0.45 : 0.9) * Math.min(1, 0.6 + 0.4 * soft), squash: (reduced ? 0.16 : 0.42) * soft, sigma: size * 0.34, pinchLo: reduced ? 0.8 : 0.6, pinchHi: reduced ? 1.3 : 1.7, soft, bounce };
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
  /* Each squishy's own feel: how soft it squashes (soft), how bouncy it
     springs back (bounce), and its buzz style. The Vibration API only knows
     on/off times, so "strength" is pulse length; light/medium/strong scale
     the pulses, gaps stay the same. */
  const BUZZ = {
    soft: { press: 8, hold: 6, release: [10, 90, 8] },          // gentle and slow
    heavy: { press: 32, hold: 18, release: [55, 35, 30] },      // a big stone
    quick: { press: 6, hold: 5, release: [6, 22, 6, 22, 6, 22, 6] }, // little coin buzzes
    flutter: { press: 5, hold: 4, release: [5, 14, 5, 14, 5, 14, 5] }, // wings
    splash: { press: 10, hold: 8, release: [10, 30, 22] },
    roar: { press: 18, hold: 12, release: [22, 20, 38] },
    twinkle: { press: 6, hold: 5, release: [6, 45, 6, 45, 12] },
    crumbly: { press: 8, hold: 7, release: [8, 18, 8, 18, 10] },
    thump: { press: 16, hold: 10, release: [24, 45, 14] },
    pop: { press: 7, hold: 6, release: [12] },
    warm: { press: 12, hold: 9, release: [26, 60, 18] },
    clink: { press: 9, hold: 6, release: [10, 28, 10] },
    steps: { press: 8, hold: 6, release: [8, 30, 9, 30, 10, 30, 11] },
    crunch: { press: 8, hold: 0, release: null }                 // the lamp: crackles
  };
  const FEEL = {
    lamb: { soft: 1.3, bounce: 0.6, buzz: 'soft' }, dove: { soft: 1.2, bounce: 1.1, buzz: 'flutter' },
    fish: { soft: 1.1, bounce: 1.3, buzz: 'splash' }, lion: { soft: 0.9, bounce: 1, buzz: 'roar' },
    star: { soft: 1, bounce: 1.3, buzz: 'twinkle' }, rainbow: { soft: 1.15, bounce: 1.1, buzz: 'twinkle' },
    stone: { soft: 0.55, bounce: 0.6, buzz: 'heavy' }, loaves: { soft: 1.2, bounce: 0.8, buzz: 'crumbly' },
    seed: { soft: 0.9, bounce: 1.4, buzz: 'pop' }, bush: { soft: 1, bounce: 0.9, buzz: 'warm' },
    basket: { soft: 0.85, bounce: 1, buzz: 'crumbly' }, tree: { soft: 0.8, bounce: 0.9, buzz: 'thump' },
    ark: { soft: 0.75, bounce: 0.8, buzz: 'thump' }, coat: { soft: 1.25, bounce: 0.75, buzz: 'soft' },
    ladder: { soft: 0.8, bounce: 1.2, buzz: 'steps' }, raven: { soft: 1, bounce: 1.2, buzz: 'flutter' },
    wheat: { soft: 1.1, bounce: 1, buzz: 'crumbly' }, oil: { soft: 1.3, bounce: 0.7, buzz: 'warm' },
    coin: { soft: 0.6, bounce: 1.5, buzz: 'quick' }, donkey: { soft: 1, bounce: 1.1, buzz: 'thump' },
    jar: { soft: 0.7, bounce: 1, buzz: 'clink' }, crown: { soft: 0.7, bounce: 1.25, buzz: 'twinkle' },
    boat: { soft: 1.05, bounce: 1.2, buzz: 'splash' }, tomb: { soft: 0.5, bounce: 0.55, buzz: 'heavy' },
    lamp: { soft: 1, bounce: 1, buzz: 'crunch' },
    lily: { soft: 1.25, bounce: 1.05, buzz: 'soft' }, key: { soft: 0.6, bounce: 1.35, buzz: 'clink' },
    pearl: { soft: 0.65, bounce: 1.45, buzz: 'pop' }, manna: { soft: 1.3, bounce: 0.65, buzz: 'crumbly' },
    scroll: { soft: 0.9, bounce: 0.85, buzz: 'steps' }, shofar: { soft: 0.85, bounce: 1.15, buzz: 'roar' },
    tablets: { soft: 0.5, bounce: 0.6, buzz: 'heavy' }, elephant: { soft: 1.15, bounce: 0.7, buzz: 'thump' },
    honeycomb: { soft: 1.2, bounce: 0.75, buzz: 'warm' }, anchor: { soft: 0.55, bounce: 0.65, buzz: 'splash' },
    shield: { soft: 0.6, bounce: 1.2, buzz: 'clink' }, chariot: { soft: 0.85, bounce: 1.3, buzz: 'roar' }
  };
  const feelFor = id => FEEL[id] || { soft: 1, bounce: 1, buzz: 'pop' };
  const VIBE_LEVELS = ['off', 'light', 'medium', 'strong'];
  const VIBE_SCALE = { off: 0, light: 0.5, medium: 1, strong: 1.6 };
  function vibePref(storage) {
    const KEY = 'msb_squishy_vibe';
    return {
      KEY,
      get() { try { const v = storage.getItem(KEY); return VIBE_LEVELS.includes(v) ? v : 'medium'; } catch { return 'medium'; } },
      set(v) { const next = VIBE_LEVELS.includes(v) ? v : 'medium'; try { storage.setItem(KEY, next); } catch { /* ignore */ } return next; }
    };
  }
  /* Scale any pattern by the strength: pulses (even slots) grow or shrink,
     gaps stay; every pulse 4-80 ms, the whole thing under 300 ms. */
  function scalePattern(pattern, level) {
    const k = VIBE_SCALE[level] === undefined ? 1 : VIBE_SCALE[level];
    if (!k) return 0;
    const list = Array.isArray(pattern) ? pattern : [pattern];
    let total = 0;
    const out = [];
    for (let i = 0; i < list.length; i += 1) {
      const v = i % 2 ? list[i] : Math.max(4, Math.min(80, Math.round(list[i] * k)));
      if (total + v > 300) break;
      out.push(v); total += v;
    }
    if (out.length % 2 === 0) out.pop();
    return out.length === 1 ? out[0] : out;
  }
  /* One squishy's buzz for a press, a squelchy hold step or the release.
     Reduced motion keeps only the first pulse. */
  function feelPattern(id, phase, intensity, level, reduced) {
    const f = feelFor(id), b = BUZZ[f.buzz] || BUZZ.pop, i = Math.max(0, Math.min(1, Number(intensity) || 0));
    let pat;
    if (phase === 'press') pat = b.press;
    else if (phase === 'hold') pat = f.buzz === 'crunch' ? crunchPattern(i) : Math.round(b.hold * (0.6 + 0.8 * i));
    else pat = f.buzz === 'crunch' ? crunchPattern(Math.max(0.5, i)) : b.release.map((v, k) => (k % 2 ? v : v * (0.6 + 0.8 * i)));
    if (!pat) return 0;
    if (reduced && Array.isArray(pat)) pat = pat[0];
    return scalePattern(pat, level);
  }
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

  /* The lesson card pops up by itself only the first time each squishy is
     squished (kept in an msb_ key, so it is in Export/Restore); after that
     the Learn button opens it. A squishy whose lesson star was already
     collected counts as seen. */
  function lessonSeen(storage) {
    const read = () => { try { const v = JSON.parse(storage.getItem(KEYS.lessonSeen)); return Array.isArray(v) ? v.filter(x => typeof x === 'string') : []; } catch { return []; } };
    let stars = [];
    try { const v = JSON.parse(storage.getItem(KEYS.stars)); stars = Array.isArray(v) ? v : []; } catch { stars = []; }
    return {
      has: id => read().includes(id) || stars.includes(id),
      /* true only the first time for this squishy, and remembers it */
      first(id) {
        if (!id || read().includes(id) || stars.includes(id)) return false;
        try { storage.setItem(KEYS.lessonSeen, JSON.stringify([...read(), id].slice(-100))); } catch { /* full */ }
        return true;
      }
    };
  }
  const api = { KID_GAMES, kidGames, lessonSeen, FEEL, BUZZ, feelFor, VIBE_LEVELS, VIBE_SCALE, vibePref, scalePattern, feelPattern, KITS, TONES, GESTURES, kitFor, gestures, hasTrick, isTrick, HINT_AFTER, trickRevealed, CHALLENGES, EXTRA_BADGES, tierOf, dayKey, longestStreak, stats, challengeProgress, challengeContext, challengeFor, checkUnlocks, badges, crunchPattern, crunchShape, glowLevel, softBody, mood, pulseMs, KEYS, soundPref, progress, pressDepth, springStep, atRest, pokeOffset, vibeMs, rng, shuffle, memoryDeck, isMatch, questionRound, roundWon, PASS };
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.MsbSquishyCore = api;
})(typeof self !== 'undefined' ? self : this);
