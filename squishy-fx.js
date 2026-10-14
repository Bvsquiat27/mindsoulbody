/* Squishy play effects, drawn on the play canvas: each squishy's own little
   particles while you squish and stretch, and its secret trick animation.
   Only drawing lives here (no sound, no input), so it stays light.
   Positions are in CSS pixels; draw functions get the device pixel ratio. */
(function (root) {
  'use strict';
  const TAU = Math.PI * 2;
  const clamp01 = v => Math.max(0, Math.min(1, v));
  const ease = t => { t = clamp01(t); return t * t * (3 - 2 * t); };
  const seg = (t, a, b) => clamp01((t - a) / (b - a));
  const RAINBOW = ['rgb(239,71,111)', 'rgb(255,146,60)', 'rgb(255,209,61)', 'rgb(98,201,105)', 'rgb(64,160,255)', 'rgb(96,104,230)', 'rgb(170,98,230)'];

  /* ---------- Particles ---------- */
  /* origin: body (anywhere on it), top (its top edge), center, finger,
     ground (just under it), above (over it). */
  const FX = {
    hearts: { shape: 'heart', colors: ['rgb(255,120,160)', 'rgb(255,80,120)', 'rgb(255,170,200)'], origin: 'top', vx: [-20, 20], vy: [-75, -40], sway: 18, life: [1.2, 1.8], size: [5, 8], rate: 7 },
    feathers: { shape: 'feather', colors: ['rgb(255,255,255)', 'rgb(230,236,245)'], origin: 'body', vx: [-30, 30], vy: [-30, 10], gravity: 18, sway: 30, spin: 2, life: [1.6, 2.4], size: [7, 11], rate: 5 },
    bubbles: { shape: 'bubble', colors: ['rgb(150,215,255)', 'rgb(200,240,255)'], origin: 'body', vx: [-12, 12], vy: [-70, -35], sway: 10, grow: 0.6, life: [1.2, 1.8], size: [3, 7], rate: 9 },
    'roar-rings': { shape: 'ring', colors: ['rgb(255,170,60)', 'rgb(255,210,120)'], origin: 'center', vx: [0, 0], vy: [0, 0], grow: 9, life: [0.7, 0.9], size: [10, 14], rate: 2.5 },
    twinkles: { shape: 'star4', colors: ['rgb(255,236,140)', 'rgb(255,255,220)'], origin: 'finger', vx: [-60, 60], vy: [-60, 60], spin: 3, life: [0.5, 0.9], size: [3, 6], rate: 18 },
    'color-trail': { shape: 'dot', colors: RAINBOW, cycle: true, origin: 'finger', vx: [-10, 10], vy: [-10, 10], life: [0.7, 1], size: [4, 6], rate: 30 },
    dust: { shape: 'puff', colors: ['rgba(190,180,165,0.8)', 'rgba(160,150,140,0.8)'], origin: 'ground', vx: [-70, 70], vy: [-25, -5], grow: 1.2, life: [0.6, 1], size: [4, 8], rate: 8 },
    crumbs: { shape: 'crumb', colors: ['rgb(222,170,100)', 'rgb(190,130,70)', 'rgb(245,210,150)'], origin: 'body', vx: [-50, 50], vy: [-90, -40], gravity: 260, spin: 6, life: [0.9, 1.3], size: [2, 4], rate: 10 },
    leaves: { shape: 'leaf', colors: ['rgb(110,200,90)', 'rgb(70,170,80)'], origin: 'top', vx: [-25, 25], vy: [-55, -30], sway: 24, spin: 2.5, life: [1.4, 2], size: [5, 8], rate: 6 },
    embers: { shape: 'ember', colors: ['rgb(255,190,60)', 'rgb(255,120,40)', 'rgb(255,230,120)'], origin: 'top', vx: [-15, 15], vy: [-90, -55], sway: 14, flicker: true, life: [0.6, 1], size: [3, 6], rate: 14 },
    ripples: { shape: 'ripple', colors: ['rgb(120,200,255)', 'rgb(180,230,255)'], origin: 'ground', vx: [-6, 6], vy: [0, 0], grow: 6, life: [0.9, 1.3], size: [6, 10], rate: 4 },
    'falling-leaves': { shape: 'leaf', colors: ['rgb(120,200,80)', 'rgb(240,200,70)', 'rgb(240,140,60)'], origin: 'above', vx: [-20, 20], vy: [25, 50], sway: 30, spin: 2, life: [1.8, 2.4], size: [5, 8], rate: 5 },
    rain: { shape: 'drop', colors: ['rgb(130,190,255)', 'rgb(170,215,255)'], origin: 'above', vx: [-8, -2], vy: [260, 340], life: [0.5, 0.7], size: [6, 10], rate: 22 },
    ribbons: { shape: 'ribbon', colors: RAINBOW, cycle: true, origin: 'orbit', vx: [0, 0], vy: [0, 0], spin: 3.5, life: [1.2, 1.6], size: [6, 9], rate: 10 },
    halos: { shape: 'halo', colors: ['rgb(255,226,120)', 'rgb(255,244,190)'], origin: 'top', vx: [-15, 15], vy: [-80, -50], sway: 10, life: [1, 1.5], size: [4, 6], rate: 6 },
    'dark-feathers': { shape: 'feather', colors: ['rgb(70,72,92)', 'rgb(100,104,130)'], origin: 'body', vx: [-35, 35], vy: [-20, 15], gravity: 30, sway: 26, spin: 2.5, life: [1.4, 2], size: [6, 10], rate: 5 },
    grains: { shape: 'grain', colors: ['rgb(233,185,73)', 'rgb(245,215,120)'], origin: 'top', vx: [-60, 60], vy: [-80, -30], gravity: 240, spin: 5, life: [0.9, 1.3], size: [3, 4], rate: 10 },
    'oil-drops': { shape: 'drop', colors: ['rgb(240,196,60)', 'rgb(255,220,110)'], origin: 'top', vx: [-20, 20], vy: [-60, -20], gravity: 300, life: [0.7, 1], size: [5, 8], rate: 8 },
    coins: { shape: 'coin', colors: ['rgb(255,211,90)', 'rgb(247,194,63)'], origin: 'body', vx: [-70, 70], vy: [-140, -80], gravity: 320, spin: 9, life: [0.9, 1.2], size: [4, 6], rate: 6 },
    'kind-hearts': { shape: 'heart', colors: ['rgb(255,190,90)', 'rgb(255,214,140)'], origin: 'center', vx: [-40, 40], vy: [-60, -30], sway: 12, life: [1, 1.4], size: [4, 6], rate: 5 },
    shards: { shape: 'crumb', colors: ['rgb(201,123,90)', 'rgb(166,95,64)'], origin: 'top', vx: [-80, 80], vy: [-120, -60], gravity: 360, spin: 8, life: [0.8, 1.1], size: [2, 4], rate: 7 },
    jewels: { shape: 'star4', colors: ['rgb(143,208,255)', 'rgb(255,143,184)', 'rgb(179,140,255)'], origin: 'body', vx: [-30, 30], vy: [-50, -20], spin: 2, life: [0.8, 1.2], size: [3, 5], rate: 9 },
    spray: { shape: 'bubble', colors: ['rgb(220,240,255)', 'rgb(180,220,250)'], origin: 'ground', vx: [-60, 60], vy: [-110, -60], gravity: 200, life: [0.6, 0.9], size: [2, 4], rate: 12 },
    sunbeams: { shape: 'ray', colors: ['rgb(255,231,160)', 'rgb(255,246,210)'], origin: 'center', vx: [0, 0], vy: [0, 0], spin: 0.4, grow: 1.5, life: [1, 1.6], size: [14, 22], rate: 4 },
    petals: { shape: 'leaf', colors: ['rgb(255,182,214)', 'rgb(255,214,230)'], origin: 'above', vx: [-25, 25], vy: [20, 45], sway: 28, spin: 2, life: [1.6, 2.2], size: [4, 7], rate: 7 },
    keysparks: { shape: 'star4', colors: ['rgb(255,200,90)', 'rgb(255,236,170)'], origin: 'center', vx: [-70, 70], vy: [-70, 50], spin: 4, life: [0.5, 0.8], size: [3, 5], rate: 10 },
    pearls: { shape: 'bubble', colors: ['rgb(250,245,255)', 'rgb(235,225,250)'], origin: 'ground', vx: [-40, 40], vy: [-90, -50], gravity: 160, life: [0.8, 1.2], size: [3, 5], rate: 8 },
    'manna-flakes': { shape: 'dot', colors: ['rgb(255,252,235)', 'rgb(240,232,210)'], origin: 'above', vx: [-12, 12], vy: [30, 60], sway: 16, life: [1.4, 2], size: [2, 4], rate: 16 },
    letters: { shape: 'grain', colors: ['rgb(120,90,60)', 'rgb(150,115,80)'], origin: 'top', vx: [-30, 30], vy: [-60, -30], sway: 12, spin: 2, life: [1, 1.4], size: [3, 4], rate: 7 },
    soundwaves: { shape: 'ring', colors: ['rgb(230,200,140)', 'rgb(250,225,170)'], origin: 'top', vx: [-30, -10], vy: [-10, 10], grow: 7, life: [0.6, 0.9], size: [6, 9], rate: 4 },
    'stone-chips': { shape: 'crumb', colors: ['rgb(200,195,185)', 'rgb(170,165,155)'], origin: 'top', vx: [-60, 60], vy: [-100, -50], gravity: 340, spin: 7, life: [0.7, 1], size: [2, 4], rate: 7 },
    puffs: { shape: 'puff', colors: ['rgba(205,210,225,0.85)', 'rgba(180,188,205,0.85)'], origin: 'ground', vx: [-80, 80], vy: [-20, -4], grow: 1.4, life: [0.6, 0.9], size: [5, 9], rate: 6 },
    'honey-drops': { shape: 'drop', colors: ['rgb(245,170,40)', 'rgb(255,200,80)'], origin: 'top', vx: [-15, 15], vy: [-40, -10], gravity: 220, life: [0.9, 1.3], size: [5, 8], rate: 6 },
    'anchor-bubbles': { shape: 'bubble', colors: ['rgb(90,160,220)', 'rgb(140,195,240)'], origin: 'ground', vx: [-10, 10], vy: [-80, -50], sway: 14, grow: 0.5, life: [1.1, 1.6], size: [3, 6], rate: 8 },
    glints: { shape: 'star4', colors: ['rgb(220,230,240)', 'rgb(255,255,255)'], origin: 'body', vx: [-10, 10], vy: [-20, 0], spin: 5, life: [0.4, 0.7], size: [3, 6], rate: 9 },
    'fire-trail': { shape: 'ember', colors: ['rgb(255,90,40)', 'rgb(255,160,60)', 'rgb(255,220,110)'], origin: 'ground', vx: [-90, -40], vy: [-60, -20], sway: 10, flicker: true, life: [0.6, 1], size: [3, 6], rate: 14 },
    /* extra (not a squishy's own): the big fish's water spout */
    fountain: { shape: 'drop', colors: ['rgb(120,190,255)', 'rgb(190,230,255)'], origin: 'top', vx: [-50, 50], vy: [-300, -200], gravity: 520, life: [0.7, 1], size: [6, 9], rate: 0.0001 },
    sparks: { shape: 'none', colors: [], origin: 'body', vx: [0, 0], vy: [0, 0], life: [0, 0], size: [0, 0], rate: 0 }
  };
  const rnd = (r, [a, b]) => a + (b - a) * r();
  /* box: { x, y, w, h } of the squishy (CSS px); finger: {x, y} or null */
  function spawn(name, box, finger, r, k) {
    const f = FX[name]; if (!f || !f.rate) return null;
    let x = box.x + box.w * (0.2 + 0.6 * r()), y = box.y + box.h * (0.2 + 0.6 * r());
    if (f.origin === 'top') y = box.y + box.h * (0.08 + 0.12 * r());
    if (f.origin === 'center') { x = box.x + box.w / 2; y = box.y + box.h * 0.45; }
    if (f.origin === 'finger' && finger) { x = finger.x; y = finger.y; }
    if (f.origin === 'ground') { x = box.x + box.w * (0.15 + 0.7 * r()); y = box.y + box.h * 1.0; }
    if (f.origin === 'above') { x = box.x + box.w * (-0.2 + 1.4 * r()); y = box.y - box.h * (0.1 + 0.3 * r()); }
    const pt = { fx: name, shape: f.shape, x, y, vx: rnd(r, f.vx), vy: rnd(r, f.vy), age: 0, life: rnd(r, f.life), size: rnd(r, f.size), rot: r() * TAU, phase: r() * TAU,
      color: f.cycle ? f.colors[(k || 0) % f.colors.length] : f.colors[Math.floor(r() * f.colors.length)] };
    if (f.origin === 'orbit') { pt.cx = box.x + box.w / 2; pt.cy = box.y + box.h / 2; pt.rad = box.w * (0.45 + 0.2 * r()); pt.ang = r() * TAU; }
    return pt;
  }
  function step(pt, dt) {
    const f = FX[pt.fx] || {};
    pt.age += dt;
    if (pt.cx !== undefined) { pt.ang += dt * (f.spin || 3); pt.x = pt.cx + Math.cos(pt.ang) * pt.rad; pt.y = pt.cy + Math.sin(pt.ang) * pt.rad * 0.55; return pt.age < pt.life; }
    pt.vy += (f.gravity || 0) * dt;
    pt.x += (pt.vx + (f.sway ? Math.sin(pt.age * 3 + pt.phase) * f.sway : 0)) * dt;
    pt.y += pt.vy * dt;
    pt.rot += (f.spin || 0) * dt;
    return pt.age < pt.life;
  }
  function heartPath(g, x, y, r) {
    g.beginPath(); g.moveTo(x, y + r * 0.9);
    g.bezierCurveTo(x - r * 1.6, y - r * 0.2, x - r * 0.7, y - r * 1.4, x, y - r * 0.5);
    g.bezierCurveTo(x + r * 0.7, y - r * 1.4, x + r * 1.6, y - r * 0.2, x, y + r * 0.9); g.closePath();
  }
  function star4(g, x, y, r) { g.beginPath(); g.moveTo(x, y - r * 2); g.quadraticCurveTo(x, y, x + r * 2, y); g.quadraticCurveTo(x, y, x, y + r * 2); g.quadraticCurveTo(x, y, x - r * 2, y); g.quadraticCurveTo(x, y, x, y - r * 2); g.closePath(); }
  function leafPath(g, r) { g.beginPath(); g.moveTo(0, -r * 1.4); g.quadraticCurveTo(r * 1.1, 0, 0, r * 1.4); g.quadraticCurveTo(-r * 1.1, 0, 0, -r * 1.4); g.closePath(); }
  function drawParticle(g, pt, dpr) {
    const u = pt.age / pt.life, f = FX[pt.fx] || {};
    let a = u < 0.15 ? u / 0.15 : 1 - Math.max(0, (u - 0.6) / 0.4);
    if (f.flicker) a *= 0.6 + 0.4 * Math.sin(pt.age * 40 + pt.phase);
    if (a <= 0) return;
    const x = pt.x * dpr, y = pt.y * dpr, r = pt.size * dpr * (1 + (f.grow || 0) * u);
    g.save(); g.globalAlpha = clamp01(a); g.fillStyle = pt.color; g.strokeStyle = pt.color; g.lineWidth = 1.6 * dpr; g.lineCap = 'round';
    switch (pt.shape) {
      case 'heart': heartPath(g, x, y, r); g.fill(); break;
      case 'feather': g.translate(x, y); g.rotate(pt.rot); g.beginPath(); g.ellipse(0, 0, r * 0.45, r * 1.3, 0, 0, TAU); g.fill(); g.strokeStyle = 'rgba(170,180,200,.8)'; g.lineWidth = 0.8 * dpr; g.beginPath(); g.moveTo(0, -r * 1.3); g.lineTo(0, r * 1.5); g.stroke(); break;
      case 'bubble': g.beginPath(); g.arc(x, y, r, 0, TAU); g.stroke(); g.fillStyle = 'rgba(255,255,255,.7)'; g.beginPath(); g.arc(x - r * 0.35, y - r * 0.35, r * 0.25, 0, TAU); g.fill(); break;
      case 'ring': g.lineWidth = 3 * dpr * (1 - u); g.beginPath(); g.arc(x, y, r, Math.PI * 1.1, Math.PI * 1.9); g.stroke(); break;
      case 'star4': g.translate(x, y); g.rotate(pt.rot); star4(g, 0, 0, r * 0.6); g.fill(); break;
      case 'dot': g.beginPath(); g.arc(x, y, r * (1 - u * 0.6), 0, TAU); g.fill(); break;
      case 'puff': g.beginPath(); g.arc(x, y, r, 0, TAU); g.fill(); break;
      case 'crumb': g.translate(x, y); g.rotate(pt.rot); g.fillRect(-r, -r * 0.7, r * 2, r * 1.4); break;
      case 'leaf': g.translate(x, y); g.rotate(pt.rot); leafPath(g, r * 0.7); g.fill(); break;
      case 'ember': g.beginPath(); g.moveTo(x, y - r * 1.8); g.quadraticCurveTo(x + r, y, x, y + r * 0.8); g.quadraticCurveTo(x - r, y, x, y - r * 1.8); g.fill(); break;
      case 'ripple': g.lineWidth = 1.8 * dpr * (1 - u); g.beginPath(); g.ellipse(x, y, r * 2, r * 0.5, 0, 0, TAU); g.stroke(); break;
      case 'drop': g.lineWidth = 2 * dpr; g.beginPath(); g.moveTo(x, y); g.lineTo(x - r * 0.15, y - r * 1.4); g.stroke(); break;
      case 'ribbon': g.lineWidth = 3 * dpr; g.beginPath(); g.arc(x, y, r, pt.rot, pt.rot + 1.6); g.stroke(); break;
      case 'halo': g.lineWidth = 2 * dpr; g.beginPath(); g.ellipse(x, y, r * 1.3, r * 0.45, 0, 0, TAU); g.stroke(); break;
      case 'grain': g.translate(x, y); g.rotate(pt.rot); g.beginPath(); g.ellipse(0, 0, r * 0.55, r, 0, 0, TAU); g.fill(); break;
      case 'coin': g.translate(x, y); g.scale(Math.abs(Math.cos(pt.rot)) + 0.15, 1); g.beginPath(); g.arc(0, 0, r, 0, TAU); g.fill(); g.strokeStyle = 'rgb(224,169,44)'; g.lineWidth = dpr; g.stroke(); break;
      case 'ray': g.translate(x, y); g.rotate(pt.rot + pt.phase); g.globalAlpha *= 0.6; g.lineWidth = 3 * dpr; g.beginPath(); g.moveTo(r * 0.8, 0); g.lineTo(r * 2, 0); g.stroke(); break;
      default: break;
    }
    g.restore();
  }

  /* ---------- Trick animations ----------
     Each trick: dur (ms); pose(t) moves the whole squishy (dx/dy as parts of
     its size, rot, sx/sy, alpha, mood of the face); over(g, t, G) draws the
     story bits. G: { cx, cy, S (size), W, H, dpr, ground, path, text, pile }
     in device pixels. With reduced motion the game shows a still version. */
  function emo(g, ch, x, y, size, a = 1, rot = 0) {
    if (a <= 0) return;
    g.save(); g.globalAlpha = clamp01(a); g.translate(x, y); if (rot) g.rotate(rot);
    g.font = `${Math.round(size)}px "Noto Color Emoji","Apple Color Emoji","Segoe UI Emoji",sans-serif`; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.fillText(ch, 0, 0); g.restore();
  }
  function glowText(g, text, x, y, size, a, color) {
    if (a <= 0) return;
    g.save(); g.globalAlpha = clamp01(a); g.font = `900 ${Math.round(size)}px system-ui,sans-serif`; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.shadowColor = color || 'rgba(255,220,120,1)'; g.shadowBlur = size * 0.6; g.fillStyle = 'rgb(255,250,220)'; g.fillText(text, x, y); g.shadowBlur = size * 0.25; g.fillText(text, x, y); g.restore();
  }
  function rainbowArc(g, cx, cy, r0, r1, from, to, a) {
    const w = (r1 - r0) / RAINBOW.length;
    g.save(); g.globalAlpha = a; g.lineCap = 'butt';
    RAINBOW.forEach((c, i) => { g.strokeStyle = c; g.lineWidth = w + 1; g.beginPath(); g.arc(cx, cy, r1 - w * (i + 0.5), from, to); g.stroke(); });
    g.restore();
  }
  function waves(g, G, t, a) {
    g.save(); g.globalAlpha = a;
    for (let k = 0; k < 3; k += 1) {
      const y = G.ground + (k - 0.5) * G.S * 0.08;
      g.strokeStyle = k === 1 ? 'rgba(120,200,255,.9)' : 'rgba(80,160,240,.75)'; g.lineWidth = G.S * 0.035; g.lineCap = 'round';
      g.beginPath();
      for (let x = 0; x <= G.W; x += G.W / 40) g[x ? 'lineTo' : 'moveTo'](x, y + Math.sin(x / G.S * 7 + t * 9 + k * 2) * G.S * 0.025);
      g.stroke();
    }
    g.restore();
  }
  const TRICKS = {
    /* The bush burns but is not burnt up, and glowing words say I AM. */
    'i-am': { dur: 3400, pose: t => ({ sx: 1 + 0.02 * Math.sin(t * 40), sy: 1 + 0.02 * Math.cos(t * 37) }),
      over(g, t, G) {
        g.save(); g.globalCompositeOperation = 'lighter';
        for (let k = 0; k < 10; k += 1) { const ang = Math.PI + (k / 9) * Math.PI, fl = 0.75 + 0.25 * Math.sin(t * 50 + k * 1.7), x = G.cx + Math.cos(ang) * G.S * 0.45, y = G.cy + Math.sin(ang) * G.S * 0.42 - G.S * 0.05, r = G.S * 0.06 * fl;
          g.fillStyle = k % 2 ? 'rgba(255,150,40,.75)' : 'rgba(255,220,90,.75)'; g.beginPath(); g.moveTo(x, y - r * 2.6); g.quadraticCurveTo(x + r * 1.2, y, x, y + r); g.quadraticCurveTo(x - r * 1.2, y, x, y - r * 2.6); g.fill(); }
        g.restore();
        glowText(g, G.text, G.cx, G.cy - G.S * 0.85, G.S * 0.24, ease(seg(t, 0.25, 0.5)) * (1 - seg(t, 0.92, 1) * 0.5));
      } },
    /* The lamp lights up the whole dark room. */
    'light-room': { dur: 3800, pose: t => ({ sx: 1 + 0.04 * Math.sin(t * 9), sy: 1 + 0.04 * Math.sin(t * 9) }),
      over(g, t, G) {
        const dark = ease(seg(t, 0, 0.2)) * (1 - ease(seg(t, 0.85, 1))), rad = G.S * (0.5 + 3 * ease(seg(t, 0.2, 0.8)));
        const grd = g.createRadialGradient(G.cx, G.cy, rad * 0.2, G.cx, G.cy, rad);
        grd.addColorStop(0, 'rgba(255,230,150,0.25)'); grd.addColorStop(0.6, 'rgba(10,8,20,0)'); grd.addColorStop(1, `rgba(5,4,15,${(0.82 * dark).toFixed(3)})`);
        g.save(); g.globalAlpha = 1; g.fillStyle = grd; g.fillRect(0, 0, G.W, G.H); g.restore();
      } }
  
  };
  /* Squishy-style drawing for story tricks: the same plum ink outline, pastel
     fills, glossy shine, shiny eyes and blush as squishy-art.js. */
  const SQ_INK = '#5b4660', SQ_EYE = '#3d2c3e';
  function sqShape(g, path, fill, lw) { g.save(); g.lineJoin = 'round'; g.beginPath(); path(); g.strokeStyle = SQ_INK; g.lineWidth = lw; g.stroke(); g.fillStyle = fill; g.fill(); g.restore(); }
  function sqShine(g, x, y, rx, ry) { g.save(); g.globalAlpha *= 0.55; g.fillStyle = '#fff'; g.beginPath(); g.ellipse(x, y, rx, ry, -0.44, 0, Math.PI * 2); g.fill(); g.restore(); }
  function sqFace(g, x, y, k, look) {
    g.save(); g.translate(x, y); g.scale(k, k);
    if (look === 'squint') { g.strokeStyle = SQ_EYE; g.lineWidth = 2.6; g.lineCap = 'round'; g.lineJoin = 'round'; g.beginPath(); g.moveTo(-18, -4); g.lineTo(-10, 0); g.lineTo(-18, 4); g.moveTo(18, -4); g.lineTo(10, 0); g.lineTo(18, 4); g.stroke(); }
    else { g.fillStyle = SQ_EYE; for (const s of [-1, 1]) { g.beginPath(); g.ellipse(13 * s, 0, 5.6, 6.6, 0, 0, Math.PI * 2); g.fill(); }
      g.fillStyle = '#fff'; for (const [a, b, r] of [[-11, -2.4, 2.2], [15, -2.4, 2.2], [-14.6, 2.4, 1.1], [11.4, 2.4, 1.1]]) { g.beginPath(); g.arc(a, b, r, 0, Math.PI * 2); g.fill(); }
      if (look === 'grump') { g.strokeStyle = SQ_EYE; g.lineWidth = 2.4; g.lineCap = 'round'; g.beginPath(); g.moveTo(-19, -12); g.lineTo(-8, -9); g.moveTo(19, -12); g.lineTo(8, -9); g.stroke(); } }
    g.fillStyle = 'rgba(255,157,181,0.7)'; for (const s of [-1, 1]) { g.beginPath(); g.ellipse(21 * s, 8, 5.5, 3.2, 0, 0, Math.PI * 2); g.fill(); }
    if (look === 'wow') { g.fillStyle = SQ_EYE; g.beginPath(); g.ellipse(0, 9, 3.6, 4.6, 0, 0, Math.PI * 2); g.fill(); g.fillStyle = '#ff8fa3'; g.beginPath(); g.ellipse(0, 10.4, 2, 1.8, 0, 0, Math.PI * 2); g.fill(); }
    else { g.strokeStyle = SQ_EYE; g.lineWidth = 2.4; g.lineCap = 'round'; g.beginPath(); if (look === 'grump') { g.moveTo(-4, 9); g.quadraticCurveTo(0, 6, 4, 9); } else { g.moveTo(-4.5, 6.5); g.quadraticCurveTo(0, 10.5, 4.5, 6.5); } g.stroke(); }
    g.restore();
  }
  function sqStone(g, x, y, r) { sqShape(g, () => g.ellipse(x, y, r * 1.15, r, 0.3, 0, Math.PI * 2), '#c9c4d6', r * 0.45); sqShine(g, x - r * 0.35, y - r * 0.35, r * 0.35, r * 0.2); }
  function sqSparkle(g, x, y, r, col, rot) { if (r <= 0) return; g.save(); g.translate(x, y); g.rotate(rot || 0); g.fillStyle = col; g.beginPath(); for (let i = 0; i < 4; i += 1) { const a = i * Math.PI / 2; g.lineTo(Math.cos(a) * r, Math.sin(a) * r); g.lineTo(Math.cos(a + Math.PI / 4) * r * 0.32, Math.sin(a + Math.PI / 4) * r * 0.32); } g.closePath(); g.fill(); g.restore(); }
  function sqPuff(g, x, y, r) { sqShape(g, () => { g.arc(x - r * 0.6, y, r * 0.7, 0, Math.PI * 2); g.moveTo(x + r * 1.2, y); g.arc(x + r * 0.6, y, r * 0.7, 0, Math.PI * 2); g.moveTo(x + r, y - r * 0.4); g.arc(x, y - r * 0.4, r, 0, Math.PI * 2); }, '#f6ead8', r * 0.18); }
  /* A round squishy Goliath (local origin: between his feet). */
  function squishyGoliath(g, u, look) {
    const lw = u * 0.022;
    sqShape(g, () => { g.ellipse(-u * 0.13, -u * 0.05, u * 0.09, u * 0.07, 0, 0, Math.PI * 2); g.moveTo(u * 0.22, -u * 0.05); g.ellipse(u * 0.13, -u * 0.05, u * 0.09, u * 0.07, 0, 0, Math.PI * 2); }, '#b89a7a', lw);
    sqShape(g, () => g.ellipse(0, -u * 0.36, u * 0.3, u * 0.3, 0, 0, Math.PI * 2), '#d9cfe6', lw);
    sqShape(g, () => { g.moveTo(-u * 0.24, -u * 0.46); g.quadraticCurveTo(0, -u * 0.52, u * 0.24, -u * 0.46); g.lineTo(u * 0.2, -u * 0.22); g.quadraticCurveTo(0, -u * 0.14, -u * 0.2, -u * 0.22); g.closePath(); }, '#f2c873', lw * 0.8);
    g.save(); g.strokeStyle = 'rgba(176,128,60,0.55)'; g.lineWidth = lw * 0.5; for (let i = 0; i < 3; i += 1) { g.beginPath(); g.arc(0, -u * (0.42 - i * 0.07), u * 0.06, 0.3, Math.PI - 0.3); g.stroke(); } g.restore();
    sqShine(g, -u * 0.16, -u * 0.5, u * 0.06, u * 0.03);
    sqShape(g, () => g.ellipse(0, -u * 0.8, u * 0.24, u * 0.22, 0, 0, Math.PI * 2), '#ffe0cc', lw);
    sqShape(g, () => { g.moveTo(-u * 0.27, -u * 0.86); g.quadraticCurveTo(-u * 0.27, -u * 1.1, 0, -u * 1.11); g.quadraticCurveTo(u * 0.27, -u * 1.1, u * 0.27, -u * 0.86); g.quadraticCurveTo(0, -u * 0.9, -u * 0.27, -u * 0.86); g.closePath(); }, '#f2c873', lw);
    sqShape(g, () => g.ellipse(0, -u * 1.16, u * 0.11, u * 0.06, 0, 0, Math.PI * 2), '#ff9db5', lw * 0.8);
    sqShine(g, -u * 0.12, -u * 1.02, u * 0.06, u * 0.025);
    sqFace(g, 0, -u * 0.76, u * 0.0062, look);
  }
  /* A small squishy David with a sling (origin: between his feet). */
  function squishyDavid(g, x, base, u, look, armUp) {
    const lw = u * 0.016;
    g.save(); g.translate(x, base);
    sqShape(g, () => { g.ellipse(-u * 0.06, -u * 0.03, u * 0.05, u * 0.035, 0, 0, Math.PI * 2); g.moveTo(u * 0.11, -u * 0.03); g.ellipse(u * 0.06, -u * 0.03, u * 0.05, u * 0.035, 0, 0, Math.PI * 2); }, '#b98a66', lw);
    sqShape(g, () => g.ellipse(0, -u * 0.17, u * 0.15, u * 0.14, 0, 0, Math.PI * 2), '#bfe3b4', lw);
    sqShape(g, () => { g.moveTo(-u * 0.13, -u * 0.22); g.lineTo(u * 0.13, -u * 0.12); g.lineTo(u * 0.12, -u * 0.09); g.lineTo(-u * 0.14, -u * 0.19); g.closePath(); }, '#c99a6a', lw * 0.7);
    if (armUp) sqShape(g, () => g.ellipse(u * 0.13, -u * 0.36, u * 0.035, u * 0.1, 0.5, 0, Math.PI * 2), '#ffe0cc', lw);
    sqShape(g, () => g.ellipse(0, -u * 0.39, u * 0.15, u * 0.14, 0, 0, Math.PI * 2), '#ffe0cc', lw);
    sqShape(g, () => { g.moveTo(-u * 0.15, -u * 0.42); g.quadraticCurveTo(-u * 0.16, -u * 0.56, 0, -u * 0.55); g.quadraticCurveTo(u * 0.16, -u * 0.56, u * 0.15, -u * 0.42); g.quadraticCurveTo(u * 0.06, -u * 0.48, -u * 0.02, -u * 0.45); g.quadraticCurveTo(-u * 0.08, -u * 0.48, -u * 0.15, -u * 0.42); g.closePath(); }, '#8a5a3c', lw);
    sqShine(g, -u * 0.07, -u * 0.5, u * 0.035, u * 0.015);
    sqFace(g, 0, -u * 0.37, u * 0.0042, look);
    g.restore();
  }
  /* Story tricks for every legendary squishy: one button plays its Bible
     moment. Reduced motion shows one calm still frame (see drawAnim). */
  const rays = (g, G, n, len, a, col, spin) => { g.save(); g.globalCompositeOperation = 'lighter'; g.translate(G.cx, G.cy); g.rotate(spin || 0); for (let k = 0; k < n; k += 1) { g.rotate(Math.PI * 2 / n); const grd = g.createLinearGradient(0, 0, len, 0); grd.addColorStop(0, col.replace('A', (0.55 * a).toFixed(3))); grd.addColorStop(1, col.replace('A', '0')); g.fillStyle = grd; g.beginPath(); g.moveTo(0, -G.S * 0.03); g.lineTo(len, -G.S * 0.12); g.lineTo(len, G.S * 0.12); g.lineTo(0, G.S * 0.03); g.fill(); } g.restore(); };
  const STORIES = {
    /* Elijah goes up by a whirlwind in a chariot of fire (2 Kings 2:11) */
    chariot: { dur: 4200, pose: t => { const up = ease(seg(t, 0.35, 0.9)); return { dy: -up * 1.6, rot: Math.sin(t * 30) * 0.06 * (1 - up), sx: 1 - up * 0.3, sy: 1 - up * 0.3, alpha: 1 - seg(t, 0.85, 1) }; },
      over(g, t, G) {
        g.save(); g.globalCompositeOperation = 'lighter';
        const a = Math.sin(Math.PI * seg(t, 0, 1));
        for (let k = 0; k < 40; k += 1) { const h = (k / 40), ang = t * 22 + k * 0.9, r = G.S * (0.25 + h * 0.5), x = G.cx + Math.cos(ang) * r, y = G.ground - h * G.S * 2.2 + Math.sin(ang) * r * 0.25 - ease(seg(t, 0.35, 0.9)) * G.S;
          g.fillStyle = k % 3 ? `rgba(255,140,40,${(0.5 * a).toFixed(3)})` : `rgba(255,230,120,${(0.6 * a).toFixed(3)})`; g.beginPath(); g.arc(x, y, G.S * 0.035 * (1 - h * 0.5), 0, Math.PI * 2); g.fill(); }
        g.restore();
        glowText(g, G.text, G.cx, G.S * 0.35, G.S * 0.16, ease(seg(t, 0.15, 0.35)) * (1 - seg(t, 0.92, 1)));
      } },
    /* The stone is rolled away and light shines out of the empty tomb */
    tomb: { dur: 4000, pose: t => { const roll = ease(seg(t, 0.15, 0.55)); return { dx: roll * 0.9, rot: roll * Math.PI * 1.2, mood: roll > 0.9 ? 'happy' : undefined }; },
      over(g, t, G) {
        const open = ease(seg(t, 0.3, 0.7));
        const grd = g.createRadialGradient(G.cx, G.cy, 0, G.cx, G.cy, G.S * 1.4); grd.addColorStop(0, `rgba(255,250,220,${(0.95 * open).toFixed(3)})`); grd.addColorStop(1, 'rgba(255,240,180,0)');
        g.save(); g.globalCompositeOperation = 'lighter'; g.fillStyle = grd; g.fillRect(0, 0, G.W, G.H); g.restore();
        rays(g, G, 12, G.S * 2 * open, open * (1 - seg(t, 0.9, 1)), 'rgba(255,240,170,A)', t * 0.6);
        glowText(g, G.text, G.cx, G.S * 0.35, G.S * 0.16, ease(seg(t, 0.5, 0.7)) * (1 - seg(t, 0.94, 1)));
      } },
    /* The commandments are carved while lightning flashes on Sinai */
    tablets: { dur: 4400, pose: t => ({ sx: 1 + 0.03 * Math.sin(t * 20) * (1 - seg(t, 0.7, 1)), sy: 1 + 0.03 * Math.sin(t * 20) * (1 - seg(t, 0.7, 1)) }),
      over(g, t, G) {
        const flash = [0.12, 0.3, 0.48].reduce((m, c) => Math.max(m, 1 - Math.abs(t - c) * 25), 0);
        if (flash > 0) { g.save(); g.fillStyle = `rgba(230,240,255,${(0.6 * flash).toFixed(3)})`; g.fillRect(0, 0, G.W, G.H); g.strokeStyle = `rgba(255,255,255,${flash.toFixed(3)})`; g.lineWidth = G.S * 0.02; g.beginPath(); let x = G.cx + G.S * 0.2, y = 0; g.moveTo(x, y); while (y < G.cy - G.S * 0.3) { x += (Math.sin(y * 13 + t * 99) * 0.5) * G.S * 0.12; y += G.S * 0.12; g.lineTo(x, y); } g.stroke(); g.restore(); }
        const carve = ease(seg(t, 0.15, 0.8)), glow = Math.sin(Math.PI * seg(t, 0.1, 1));
        g.save(); g.globalCompositeOperation = 'lighter'; g.strokeStyle = `rgba(255,220,120,${(0.85 * glow).toFixed(3)})`; g.lineWidth = G.S * 0.012; g.lineCap = 'round';
        for (let k = 0; k < 10; k += 1) { if (carve * 10 < k) break; const col = k < 5 ? -1 : 1, row = k % 5, x0 = G.cx + col * G.S * 0.2 - G.S * 0.1, y = G.cy - G.S * 0.18 + row * G.S * 0.085, w = G.S * 0.2 * Math.min(1, carve * 10 - k);
          g.beginPath(); g.moveTo(x0, y); g.lineTo(x0 + w, y); g.stroke(); }
        g.restore();
        glowText(g, G.text, G.cx, G.S * 0.35, G.S * 0.14, ease(seg(t, 0.6, 0.8)) * (1 - seg(t, 0.94, 1)));
      } },
    /* "I AM THAT I AM": the bush blazes and is not burnt up */
    bush: { dur: 3800, pose: t => ({ sx: 1 + 0.03 * Math.sin(t * 44), sy: 1 + 0.04 * Math.cos(t * 39), mood: 'happy' }),
      over(g, t, G) { TRICKS['i-am'].over(g, t, { ...G, text: '' }); rays(g, G, 8, G.S * 1.3 * ease(seg(t, 0.2, 0.6)), Math.sin(Math.PI * t), 'rgba(255,170,60,A)', -t); glowText(g, G.text, G.cx, G.cy - G.S * 0.8, Math.min(G.S * 0.14, G.W * 0.9 / Math.max(6, G.text.length) * 1.6), ease(seg(t, 0.25, 0.5)) * (1 - seg(t, 0.92, 1) * 0.5)); } },
    /* "I am the light of the world": rays reach every corner */
    lamp: { dur: 4000, pose: t => ({ sx: 1 + 0.05 * Math.sin(t * 8), sy: 1 + 0.05 * Math.sin(t * 8) }),
      over(g, t, G) { TRICKS['light-room'].over(g, t, G); rays(g, G, 16, G.S * 3 * ease(seg(t, 0.25, 0.7)), Math.sin(Math.PI * seg(t, 0.2, 1)), 'rgba(255,235,150,A)', t * 0.8); glowText(g, G.text, G.cx, G.S * 0.35, G.S * 0.15, ease(seg(t, 0.4, 0.6)) * (1 - seg(t, 0.94, 1))); } },
    /* David's sling (1 Samuel 17:49), in squishy style: a little squishy David
       whirls his sling from beside the shield, the stone streaks to the
       helmet, a sparkle pops, and a round squishy Goliath wobbles and sits
       down with a plop, dizzy stars and soft dust puffs. Everything stays inside the
       canvas at 390px (Goliath is placed from the right edge). */
    shield: { dur: 4600, pose: t => { const hop = Math.sin(Math.PI * seg(t, 0.74, 0.86)); return { dx: -0.16 * ease(seg(t, 0, 0.12)), dy: -0.12 * hop, sx: 1 + 0.04 * hop, sy: 1 - 0.03 * hop, mood: t > 0.5 && t < 0.62 ? 'wow' : 'happy' }; },
      over(g, t, G) {
        const u = G.S, base = G.ground;
        const gx = Math.min(G.cx + u * 1.0, G.W - u * 0.4), dX = Math.max(u * 0.2, G.px - u * 0.46);
        const show = ease(seg(t, 0.02, 0.14)) * (1 - seg(t, 0.95, 1));
        /* Goliath: idle sway, wobble after the hit, then plop onto his back */
        const hitT = 0.5, wob = seg(t, hitT, 0.62), plop = ease(seg(t, 0.62, 0.72)), bounce = Math.sin(Math.PI * seg(t, 0.72, 0.8)) * 0.12;
        const rotG = t < hitT ? 0.04 * Math.sin(t * 18) : wob < 1 ? 0.22 * Math.sin(wob * Math.PI * 4) * (1 - wob * 0.6) : plop * 0.2 - bounce * 0.3;
        const squash = 1 - 0.3 * plop + bounce * 0.3;
        const gMood = t < hitT ? 'grump' : t < 0.62 ? 'wow' : 'squint';
        g.save(); g.globalAlpha = show;
        g.fillStyle = 'rgba(0,0,0,0.18)'; g.beginPath(); g.ellipse(gx, base, u * (0.3 + 0.12 * plop), u * 0.04, 0, 0, Math.PI * 2); g.fill();
        g.translate(gx - plop * u * 0.04, base); g.rotate(rotG); g.scale(1 + 0.1 * plop, squash);
        squishyGoliath(g, u, gMood);
        g.restore();
        /* the stone: whirl in the sling, then a streak to the helmet */
        const hx = dX + u * 0.14, hy = base - u * 0.62;
        const whirl = seg(t, 0.12, 0.38), fly = seg(t, 0.38, hitT);
        const tx = gx - u * 0.1, ty = base - u * 0.86;
        g.save(); g.globalAlpha = show;
        if (t < 0.38) { const a = whirl * 26; const sx = hx + Math.cos(a) * u * 0.16, sy = hy - u * 0.06 + Math.sin(a) * u * 0.09;
          g.strokeStyle = SQ_INK; g.lineWidth = u * 0.012; g.lineCap = 'round'; g.beginPath(); g.moveTo(hx, hy); g.lineTo(sx, sy); g.stroke();
          if (whirl > 0) { g.globalAlpha = show * 0.35 * Math.min(1, whirl * 4); g.strokeStyle = '#fff3c4'; g.lineWidth = u * 0.02; g.beginPath(); g.ellipse(hx, hy - u * 0.06, u * 0.16, u * 0.09, 0, a - 1.6, a); g.stroke(); g.globalAlpha = show; }
          sqStone(g, sx, sy, u * 0.035); }
        if (fly > 0 && fly < 1) { const e = ease(fly), x = hx + (tx - hx) * e, y = hy + (ty - hy) * e - Math.sin(Math.PI * e) * u * 0.28;
          const grd = g.createLinearGradient(hx + (tx - hx) * Math.max(0, e - 0.25), y + u * 0.05, x, y); grd.addColorStop(0, 'rgba(255,240,190,0)'); grd.addColorStop(1, 'rgba(255,240,190,0.9)');
          g.save(); g.globalCompositeOperation = 'lighter'; g.strokeStyle = grd; g.lineWidth = u * 0.045; g.lineCap = 'round'; g.beginPath(); g.moveTo(hx + (tx - hx) * Math.max(0, e - 0.25), hy + (ty - hy) * Math.max(0, e - 0.25) - Math.sin(Math.PI * Math.max(0, e - 0.25)) * u * 0.28); g.lineTo(x, y); g.stroke(); g.restore();
          sqStone(g, x, y, u * 0.035); }
        g.restore();
        /* the sparkle where the stone lands */
        const sp = seg(t, hitT - 0.005, hitT + 0.12);
        if (sp > 0 && sp < 1) { const k = Math.sin(Math.PI * sp);
          g.save(); g.globalCompositeOperation = 'lighter'; const grd = g.createRadialGradient(tx, ty, 0, tx, ty, u * 0.35 * k); grd.addColorStop(0, `rgba(255,250,215,${(0.9 * k).toFixed(3)})`); grd.addColorStop(1, 'rgba(255,230,150,0)'); g.fillStyle = grd; g.fillRect(tx - u * 0.4, ty - u * 0.4, u * 0.8, u * 0.8); g.restore();
          sqSparkle(g, tx, ty, u * 0.16 * k, '#fff6c8', sp * 1.2); for (let i = 0; i < 5; i += 1) { const ang = i * 1.256 + 0.4, r = u * (0.12 + 0.22 * ease(sp)); sqSparkle(g, tx + Math.cos(ang) * r, ty + Math.sin(ang) * r, u * 0.045 * (1 - sp * 0.7), i % 2 ? '#ffd36e' : '#ffffff', ang); } }
        /* soft dust puffs when he lands */
        const dust = seg(t, 0.66, 0.96);
        if (dust > 0 && dust < 1) { g.save(); g.globalAlpha = 0.9 * (1 - dust) * show; for (let i = 0; i < 6; i += 1) { const side = i % 2 ? 1 : -1, d = ease(dust) * u * (0.22 + 0.09 * (i >> 1)); sqPuff(g, Math.min(G.W - u * 0.1, gx + side * (u * 0.18 + d)), base - u * (0.03 + 0.05 * (i >> 1)) - dust * u * 0.05, u * (0.05 + 0.03 * (i >> 1)) * (0.6 + dust * 0.6)); } g.restore(); }
        /* dizzy stars circle his head after the plop */
        const dz = seg(t, 0.72, 1);
        if (dz > 0) { const a0 = t * 16, cxh = gx + u * 0.12, cyh = base - u * 0.98; g.save(); g.globalAlpha = Math.min(1, dz * 5) * show; for (let i = 0; i < 3; i += 1) { const ang = a0 + i * 2.094; sqSparkle(g, cxh + Math.cos(ang) * u * 0.17, cyh + Math.sin(ang) * u * 0.05, u * 0.04, '#ffd36e', ang); } g.restore(); }
        /* squishy David in front of the shield, sling arm up */
        g.save(); g.globalAlpha = show; squishyDavid(g, dX, base, u, t < 0.38 ? 'happy' : t < 0.62 ? 'wow' : 'squint', t < 0.5); g.restore();
        glowText(g, G.text, G.cx, G.S * 0.35, Math.min(G.S * 0.15, G.W * 0.9 / Math.max(6, G.text.length) * 1.6), ease(seg(t, 0.64, 0.78)) * (1 - seg(t, 0.95, 1)));
      } },
  };
  const api = { FX, TRICKS, STORIES, spawn, step, drawParticle, emo, glowText, ease, seg };
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.MsbSquishyFx = api;
})(typeof self !== 'undefined' ? self : this);
