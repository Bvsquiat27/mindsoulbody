/* Coloring book extras: soft sounds made on the device with Web Audio (no
   sound files, so they work offline), a light effect at the brush tip drawn
   on its own overlay canvas (never part of the saved picture), and gentle
   vibration ticks where the phone supports them (Android; iPhones have no
   Vibration API, so nothing happens there). */
(() => {
  'use strict';

  /* ---------- Sound ---------- */
  let ac = null, master = null, noiseBuf = null, scrib = null, quietTimer = 0, twinkleAt = 0;
  function audio() {
    if (ac) return ac;
    const Ctor = window.AudioContext || window.webkitAudioContext;
    if (!Ctor) return null;
    try {
      ac = new Ctor();
      master = ac.createGain(); master.gain.value = 0.55; master.connect(ac.destination);
    } catch { ac = null; }
    return ac;
  }
  function wake() { const a = audio(); if (a && a.state === 'suspended') a.resume().catch(() => {}); return a; }
  function noise(a) {
    if (noiseBuf) return noiseBuf;
    const len = Math.floor(a.sampleRate * 1.2);
    noiseBuf = a.createBuffer(1, len, a.sampleRate);
    const d = noiseBuf.getChannelData(0);
    /* Grainy noise: white noise with a little random crackle, like wax on paper. */
    for (let i = 0; i < len; i += 1) d[i] = (Math.random() * 2 - 1) * (Math.random() < 0.08 ? 1 : 0.55);
    return noiseBuf;
  }
  function scribbleStart(kind) {
    const a = wake(); if (!a) return;
    scribbleStop(true);
    try {
      const src = a.createBufferSource(); src.buffer = noise(a); src.loop = true;
      const band = a.createBiquadFilter(); band.type = 'bandpass';
      band.frequency.value = kind === 'eraser' ? 900 : kind === 'sparkle' ? 3200 : 2300; band.Q.value = 0.9;
      const high = a.createBiquadFilter(); high.type = 'highpass'; high.frequency.value = 350;
      const gain = a.createGain(); gain.gain.value = 0;
      src.connect(band); band.connect(high); high.connect(gain); gain.connect(master);
      src.start();
      scrib = { src, gain, kind };
    } catch { scrib = null; }
  }
  /* Louder with faster strokes, still soft; fades out as soon as the finger rests. */
  function scribbleMove(speed) {
    if (!scrib || !ac) return;
    const now = ac.currentTime;
    const level = Math.min(0.11, 0.025 + speed * 0.05) * (scrib.kind === 'sparkle' ? 0.6 : 1);
    scrib.gain.gain.setTargetAtTime(level, now, 0.03);
    clearTimeout(quietTimer);
    quietTimer = setTimeout(() => { if (scrib && ac) scrib.gain.gain.setTargetAtTime(0, ac.currentTime, 0.05); }, 90);
  }
  function scribbleStop(now) {
    clearTimeout(quietTimer);
    if (!scrib || !ac) { scrib = null; return; }
    const { src, gain } = scrib; scrib = null;
    try {
      gain.gain.setTargetAtTime(0, ac.currentTime, 0.04);
      src.stop(ac.currentTime + (now ? 0.02 : 0.25));
    } catch { /* already stopped */ }
  }
  function tone(freq, endFreq, peak, length, type) {
    const a = wake(); if (!a) return;
    try {
      const t = a.currentTime, osc = a.createOscillator(), gain = a.createGain();
      osc.type = type || 'sine';
      osc.frequency.setValueAtTime(freq, t);
      if (endFreq) osc.frequency.exponentialRampToValueAtTime(endFreq, t + length * 0.8);
      gain.gain.setValueAtTime(0.0001, t);
      gain.gain.exponentialRampToValueAtTime(peak, t + 0.006);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + length);
      osc.connect(gain); gain.connect(master);
      osc.start(t); osc.stop(t + length + 0.02);
    } catch { /* ignore */ }
  }
  const BELLS = [1568, 1760, 2093, 2349, 2637, 3136];
  function twinkle(force) {
    const now = performance.now();
    if (!force && now - twinkleAt < 160) return;
    twinkleAt = now;
    const f = BELLS[Math.floor(Math.random() * BELLS.length)];
    tone(f, 0, 0.035, 0.28);
    tone(f * 2, 0, 0.012, 0.18);
  }
  function pop() { tone(620, 260, 0.07, 0.09); }

  /* ---------- Tip effects ---------- */
  const reduceMotion = () => !!(window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches);
  const sprites = new Map();
  function glowSprite(hex) {
    if (sprites.has(hex)) return sprites.get(hex);
    const c = document.createElement('canvas'); c.width = c.height = 64;
    const g = c.getContext('2d'), grad = g.createRadialGradient(32, 32, 0, 32, 32, 32);
    grad.addColorStop(0, hex); grad.addColorStop(0.35, hex + 'aa'); grad.addColorStop(1, hex + '00');
    g.fillStyle = grad; g.fillRect(0, 0, 64, 64);
    sprites.set(hex, c);
    return c;
  }
  function starSprite() {
    if (sprites.has('*')) return sprites.get('*');
    const c = document.createElement('canvas'); c.width = c.height = 48;
    const g = c.getContext('2d'), m = 24;
    const grad = g.createRadialGradient(m, m, 0, m, m, 12);
    grad.addColorStop(0, 'rgba(255,255,255,1)'); grad.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = grad; g.beginPath(); g.arc(m, m, 12, 0, Math.PI * 2); g.fill();
    g.fillStyle = 'white';
    g.beginPath(); g.moveTo(m, 0); g.lineTo(m + 3, m); g.lineTo(m, 48); g.lineTo(m - 3, m); g.closePath(); g.fill();
    g.beginPath(); g.moveTo(0, m); g.lineTo(m, m - 3); g.lineTo(48, m); g.lineTo(m, m + 3); g.closePath(); g.fill();
    sprites.set('*', c);
    return c;
  }
  const RAINBOW = ['#ff8a8a', '#ffe066', '#8cf5b0', '#8cc8ff', '#d4a5ff'];
  const TINT = { gold: '#ffd54a', silver: '#e8eef5', pink: '#ff8cc6', purple: '#c49bff', blue: '#8cc8ff' };

  function overlay(canvas) {
    const ctx = canvas.getContext('2d');
    const parts = [];
    let frame = 0, spawnAt = 0, last = 0;
    function loop(now) {
      const dt = Math.min(50, now - (last || now)); last = now;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      for (let i = parts.length - 1; i >= 0; i -= 1) {
        const p = parts[i];
        p.age += dt;
        if (p.age >= p.life) { parts.splice(i, 1); continue; }
        const k = 1 - p.age / p.life;
        p.x += p.vx * dt; p.y += p.vy * dt;
        const img = p.star ? starSprite() : glowSprite(p.hex), d = p.r * 2 * (p.star ? 0.6 + 0.4 * k : 1);
        ctx.globalAlpha = p.alpha * k;
        ctx.drawImage(img, p.x - d / 2, p.y - d / 2, d, d);
      }
      ctx.globalAlpha = 1;
      frame = parts.length ? requestAnimationFrame(loop) : 0;
      if (!frame) { last = 0; ctx.clearRect(0, 0, canvas.width, canvas.height); }
    }
    function kick() { if (!frame) frame = requestAnimationFrame(loop); }
    return {
      /* pt in picture pixels; size is the brush radius in picture pixels. */
      tip(pt, kind, hex, size) {
        if (reduceMotion()) return;
        const now = performance.now();
        if (now - spawnAt < 28) return;
        spawnAt = now;
        if (parts.length > 70) parts.splice(0, parts.length - 70);
        if (kind === 'sparkle') {
          const tint = TINT[hex] || RAINBOW[Math.floor(Math.random() * RAINBOW.length)];
          for (let i = 0; i < 3; i += 1) {
            const a = Math.random() * Math.PI * 2, v = (0.05 + Math.random() * 0.12) * Math.max(1, size / 14);
            parts.push({ x: pt.x, y: pt.y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 0.02, r: size * (0.35 + Math.random() * 0.35), star: i === 0 || Math.random() < 0.4, hex: tint, alpha: 0.95, age: 0, life: 380 + Math.random() * 220 });
          }
        } else if (kind === 'crayon') {
          parts.push({ x: pt.x, y: pt.y, vx: 0, vy: 0, r: size * 1.25, star: false, hex: /^#[0-9a-f]{6}$/i.test(hex) ? hex : '#ffffff', alpha: 0.32, age: 0, life: 260 });
        } else {
          parts.push({ x: pt.x, y: pt.y, vx: 0, vy: 0, r: size * 1.1, star: false, hex: '#9ad9ff', alpha: 0.25, age: 0, life: 200 });
        }
        kick();
      },
      clear() { parts.length = 0; if (frame) cancelAnimationFrame(frame); frame = 0; last = 0; ctx.clearRect(0, 0, canvas.width, canvas.height); }
    };
  }

  /* ---------- Vibration ---------- */
  const canVibrate = () => typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function';
  function vibrate(ms) { if (!canVibrate()) return; try { navigator.vibrate(ms); } catch { /* ignore */ } }

  document.addEventListener('visibilitychange', () => { if (document.hidden) scribbleStop(true); });

  window.MsbColoringFx = {
    sound: { scribbleStart, scribbleMove, scribbleStop, twinkle, pop, wake },
    overlay,
    canVibrate,
    vibrate
  };
})();
