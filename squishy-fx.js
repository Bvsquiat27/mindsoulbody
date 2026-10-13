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
    /* The lamb falls asleep, safe with the Good Shepherd. */
    sleep: { dur: 3800, pose: t => ({ dy: Math.sin(t * TAU * 2) * 0.006, sy: 1 - 0.03 * ease(t * 4), mood: 'squint' }),
      over(g, t, G) {
        for (let k = 0; k < 3; k += 1) { const u = (t * 1.6 + k / 3) % 1; emo(g, k % 2 ? '💤' : 'z', G.cx + G.S * (0.25 + u * 0.3), G.cy - G.S * (0.35 + u * 0.4), G.S * (0.1 + 0.06 * u), Math.sin(Math.PI * u)); }
        emo(g, '🌙', G.cx - G.S * 0.55, G.cy - G.S * 0.7, G.S * 0.22, ease(t * 3));
        emo(g, '🧑‍🌾', G.cx - G.S * 0.7, G.ground - G.S * 0.18, G.S * 0.3, ease(seg(t, 0.15, 0.4)));
      } },
    /* The dove flies a loop and comes back with an olive leaf. */
    olive: { dur: 2800, pose: t => { const u = ease(seg(t, 0, 0.75)); return { dx: Math.sin(u * TAU) * 0.6, dy: -(1 - Math.cos(u * TAU)) * 0.55, rot: Math.sin(u * TAU) * 0.35, sx: 0.85 + 0.15 * (1 - Math.sin(Math.PI * u)), sy: 0.85 + 0.15 * (1 - Math.sin(Math.PI * u)) }; },
      over(g, t, G) { const a = ease(seg(t, 0.5, 0.8)); emo(g, '🌿', G.px + G.S * 0.28, G.py - G.S * 0.05, G.S * 0.3, a, -0.4); } },
    /* The big fish swallows a tiny Jonah and puts him safe on the shore. */
    jonah: { dur: 3600, pose: t => { const gulp = Math.sin(Math.PI * seg(t, 0.32, 0.46)) * 0.12, wob = Math.sin(seg(t, 0.46, 0.62) * TAU * 2) * 0.06, spit = Math.sin(Math.PI * seg(t, 0.62, 0.7)) * 0.08; return { sx: 1 + gulp + spit, sy: 1 + gulp - spit, rot: wob, mood: t > 0.34 && t < 0.62 ? 'wow' : 'happy' }; },
      over(g, t, G) {
        const shoreX = G.W - G.S * 0.35;
        g.save(); g.globalAlpha = ease(seg(t, 0.55, 0.7)); g.fillStyle = 'rgb(240,210,140)'; g.beginPath(); g.ellipse(shoreX, G.ground + G.S * 0.06, G.S * 0.45, G.S * 0.13, 0, Math.PI, TAU); g.fill(); g.restore();
        if (t < 0.34) { const u = seg(t, 0, 0.32); emo(g, '🧍', G.S * 0.25 + (G.cx - G.S * 0.45 - G.S * 0.25) * u, G.ground - G.S * 0.12 - Math.abs(Math.sin(u * 20)) * G.S * 0.03, G.S * 0.2); }
        if (t >= 0.62) { const u = seg(t, 0.62, 0.8), x = G.cx + (shoreX - G.cx) * u, y = G.cy - Math.sin(Math.PI * u) * G.S * 0.6 + (G.ground - G.S * 0.12 - G.cy) * u; emo(g, t > 0.8 ? '🙌' : '🧍', x, y, G.S * 0.2, 1, (1 - u) * 6); }
        if (t > 0.62 && t < 0.85) for (let k = 0; k < 6; k += 1) { const u = seg(t, 0.62, 0.85); g.fillStyle = 'rgba(140,200,255,.85)'; g.beginPath(); g.arc(G.cx + G.S * (0.2 + k * 0.05) * u * 2, G.cy - G.S * 0.2 - Math.sin(Math.PI * u) * G.S * (0.2 + k * 0.05), G.S * 0.02, 0, TAU); g.fill(); }
        if (t > 0.82) emo(g, '❤️', shoreX, G.ground - G.S * 0.45, G.S * 0.14, ease(seg(t, 0.82, 0.92)));
      } },
    /* The lion lies down peacefully: God shut the lions' mouths. */
    'lie-down': { dur: 3200, pose: t => { const u = ease(seg(t, 0, 0.3)); return { sy: 1 - 0.2 * u, sx: 1 + 0.1 * u, dy: 0.1 * u, mood: 'squint' }; },
      over(g, t, G) {
        emo(g, '👼', G.cx, G.cy - G.S * (0.75 + 0.03 * Math.sin(t * 12)), G.S * 0.28, ease(seg(t, 0.2, 0.45)));
        for (let k = 0; k < 3; k += 1) { const u = (t * 1.3 + k / 3) % 1; emo(g, '🤍', G.cx + G.S * (k - 1) * 0.35, G.cy - G.S * (0.2 + u * 0.4), G.S * 0.1, Math.sin(Math.PI * u) * ease(seg(t, 0.3, 0.5))); }
      } },
    /* The star draws a shining path to the little manger. */
    manger: { dur: 3400, pose: t => ({ sx: 1 + 0.06 * Math.sin(t * 20), sy: 1 + 0.06 * Math.sin(t * 20) }),
      over(g, t, G) {
        const path = G.path && G.path.length > 1 ? G.path : [[G.cx, G.cy], [G.W * 0.8, G.ground]];
        const end = path[path.length - 1], n = Math.max(2, Math.floor(path.length * ease(seg(t, 0, 0.55))));
        g.save(); g.strokeStyle = 'rgba(255,226,120,.95)'; g.shadowColor = 'rgb(255,230,140)'; g.shadowBlur = 10 * G.dpr; g.lineWidth = 4 * G.dpr; g.setLineDash([2 * G.dpr, 10 * G.dpr]); g.lineCap = 'round';
        g.beginPath(); path.slice(0, n).forEach((p, i) => g[i ? 'lineTo' : 'moveTo'](p[0], p[1])); g.stroke(); g.restore();
        const a = ease(seg(t, 0.5, 0.75)), mx = Math.min(G.W - G.S * 0.25, Math.max(G.S * 0.25, end[0])), my = Math.min(G.H - G.S * 0.2, Math.max(G.S * 0.3, end[1] + G.S * 0.15));
        g.save(); g.globalAlpha = a; g.fillStyle = 'rgba(255,230,140,.25)'; g.beginPath(); g.arc(mx, my, G.S * 0.35, 0, TAU); g.fill();
        g.strokeStyle = 'rgb(150,95,45)'; g.lineWidth = 4 * G.dpr; g.beginPath(); g.moveTo(mx - G.S * 0.2, my - G.S * 0.05); g.lineTo(mx - G.S * 0.12, my + G.S * 0.12); g.lineTo(mx + G.S * 0.12, my + G.S * 0.12); g.lineTo(mx + G.S * 0.2, my - G.S * 0.05); g.stroke();
        g.beginPath(); g.moveTo(mx - G.S * 0.12, my + G.S * 0.12); g.lineTo(mx - G.S * 0.17, my + G.S * 0.2); g.moveTo(mx + G.S * 0.12, my + G.S * 0.12); g.lineTo(mx + G.S * 0.17, my + G.S * 0.2); g.stroke(); g.restore();
        emo(g, '👶', mx, my - G.S * 0.02, G.S * 0.16, a);
      } },
    /* The rainbow arcs all the way across and its colors pour down. */
    arc: { dur: 3200, pose: t => ({ dy: -0.05 * Math.sin(Math.PI * t) }),
      over(g, t, G) {
        const u = ease(seg(t, 0, 0.5));
        rainbowArc(g, G.cx, G.cy + G.S * 0.5, G.S * 0.95, G.S * 1.35, Math.PI, Math.PI + Math.PI * u, 0.9);
        for (let k = 0; k < 14; k += 1) { const v = seg(t, 0.45 + (k % 7) * 0.03, 1); if (v <= 0) continue; const ang = Math.PI + Math.PI * ((k * 0.37) % 1); g.fillStyle = RAINBOW[k % 7]; g.globalAlpha = 1 - v; g.beginPath(); g.arc(G.cx + Math.cos(ang) * G.S * 1.15, G.cy + G.S * 0.5 + Math.sin(ang) * G.S * 1.15 + v * G.S * 0.9, G.S * 0.03, 0, TAU); g.fill(); g.globalAlpha = 1; }
      } },
    /* David's stone flies off and boinks a tiny giant, then comes home. */
    sling: { dur: 3200, pose: t => {
        if (t < 0.15) { const u = ease(t / 0.15); return { dy: 0.12 * u, sx: 1.05, sy: 0.9 }; }
        if (t < 0.4) { const u = seg(t, 0.15, 0.4); return { dx: 1.8 * u * u, dy: 0.12 - 2.2 * u, rot: u * 9, sx: 1 - 0.5 * u, sy: 1 - 0.5 * u }; }
        if (t < 0.72) return { alpha: 0 };
        const u = seg(t, 0.72, 1); return { dy: (1 - ease(u)) * 1.5 - Math.sin(Math.PI * seg(u, 0.6, 1)) * 0.08, mood: 'wow' };
      },
      over(g, t, G) {
        const gx = G.W - G.S * 0.4, gy = G.S * 0.55, fall = ease(seg(t, 0.45, 0.65)), a = ease(seg(t, 0.3, 0.4)) * (1 - seg(t, 0.85, 1));
        if (a > 0) {
          g.save(); g.globalAlpha = a; g.translate(gx, gy + G.S * 0.25); g.rotate(fall * 1.4); g.translate(0, -G.S * 0.25);
          g.fillStyle = 'rgb(150,150,165)'; g.fillRect(-G.S * 0.09, -G.S * 0.02, G.S * 0.18, G.S * 0.24);
          g.fillStyle = 'rgb(240,200,160)'; g.beginPath(); g.arc(0, -G.S * 0.1, G.S * 0.09, 0, TAU); g.fill();
          g.fillStyle = 'rgb(120,120,135)'; g.beginPath(); g.arc(0, -G.S * 0.13, G.S * 0.095, Math.PI, TAU); g.fill();
          g.fillStyle = 'rgb(60,40,40)'; g.beginPath(); g.arc(-G.S * 0.03, -G.S * 0.1, G.S * 0.012, 0, TAU); g.arc(G.S * 0.03, -G.S * 0.1, G.S * 0.012, 0, TAU); g.fill();
          g.restore();
        }
        if (t > 0.38 && t < 0.46) { const u = seg(t, 0.38, 0.46); g.fillStyle = 'rgb(180,170,160)'; g.beginPath(); g.arc(G.W * (0.7 + 0.1 * u), G.S * (0.2 + 0.25 * u), G.S * 0.05, 0, TAU); g.fill(); }
        const b = Math.sin(Math.PI * seg(t, 0.45, 0.75));
        if (b > 0) { glowText(g, G.text, gx - G.S * 0.15, gy - G.S * 0.35, G.S * 0.17, b, 'rgba(255,180,80,1)'); emo(g, '💫', gx + G.S * 0.05, gy - G.S * 0.12, G.S * 0.16, b); }
      } },
    /* Loaves and fish pour down: enough for everyone, with 12 baskets left over. */
    multiply: { dur: 3400, pose: t => ({ sx: 1 + 0.05 * Math.sin(t * 30) * (1 - t), sy: 1 + 0.05 * Math.sin(t * 30) * (1 - t) }),
      over(g, t, G) {
        for (let k = 0; k < 26; k += 1) { const st = k * 0.013, u = seg(t, st, st + 0.45); if (u <= 0) continue; const x = G.W * (((k * 0.618) % 1) * 0.9 + 0.05), y = -G.S * 0.2 + (G.ground - G.S * 0.05 + G.S * 0.2) * ease(u); emo(g, k % 2 ? '🐟' : '🍞', x, y, G.S * 0.14, 1, (1 - u) * 3); }
        for (let k = 0; k < 12; k += 1) emo(g, '🧺', G.W * (0.06 + k * 0.08), G.ground + G.S * 0.12, G.S * 0.11, ease(seg(t, 0.55 + k * 0.02, 0.65 + k * 0.02)));
        glowText(g, G.text, G.cx, G.S * 0.4, G.S * 0.16, ease(seg(t, 0.5, 0.65)));
      } },
    /* The tiny seed grows into a tree, and birds come to rest in it. */
    grow: { dur: 3800, pose: t => ({ dy: -0.04 * Math.sin(Math.PI * seg(t, 0, 0.3)), mood: t > 0.6 ? 'wow' : 'happy' }),
      over(g, t, G) {
        const baseY = G.cy - G.S * 0.05, topY = baseY - G.S * 1.05 * ease(seg(t, 0.05, 0.45));
        g.save(); g.globalCompositeOperation = 'destination-over';
        g.strokeStyle = 'rgb(140,95,55)'; g.lineCap = 'round'; g.lineWidth = G.S * 0.07 * ease(seg(t, 0.05, 0.5));
        g.beginPath(); g.moveTo(G.cx, baseY); g.lineTo(G.cx, topY); g.stroke();
        const br = ease(seg(t, 0.3, 0.55)); g.lineWidth = G.S * 0.035;
        g.beginPath(); g.moveTo(G.cx, baseY - G.S * 0.65); g.lineTo(G.cx - G.S * 0.33 * br, baseY - G.S * 0.9 * br - G.S * 0.65 * (1 - br)); g.moveTo(G.cx, baseY - G.S * 0.75); g.lineTo(G.cx + G.S * 0.33 * br, baseY - G.S * 0.98 * br - G.S * 0.75 * (1 - br)); g.stroke();
        const c = ease(seg(t, 0.4, 0.7));
        [[0, -1.15, 0.36], [-0.33, -0.98, 0.27], [0.33, -1.02, 0.27], [-0.14, -1.33, 0.24], [0.19, -1.3, 0.24]].forEach(([dx, dy, r], i) => { g.fillStyle = i % 2 ? 'rgb(90,180,90)' : 'rgb(110,200,100)'; g.beginPath(); g.arc(G.cx + dx * G.S, baseY + dy * G.S * 0.95, r * G.S * c, 0, TAU); g.fill(); });
        g.restore();
        [[-0.33, -1.05, 0], [0.36, -1.1, 1], [0.05, -1.45, 2]].forEach(([dx, dy, k]) => { const u = ease(seg(t, 0.62 + k * 0.08, 0.85 + k * 0.05)), side = k % 2 ? 1 : -1; emo(g, '🐦', G.cx + dx * G.S + side * (1 - u) * G.W * 0.6, baseY + dy * G.S * 0.95 - (1 - u) * G.S * 0.4, G.S * 0.16, u > 0 ? 1 : 0, 0); });
      } },
    /* The bush burns but is not burnt up, and glowing words say I AM. */
    'i-am': { dur: 3400, pose: t => ({ sx: 1 + 0.02 * Math.sin(t * 40), sy: 1 + 0.02 * Math.cos(t * 37) }),
      over(g, t, G) {
        g.save(); g.globalCompositeOperation = 'lighter';
        for (let k = 0; k < 10; k += 1) { const ang = Math.PI + (k / 9) * Math.PI, fl = 0.75 + 0.25 * Math.sin(t * 50 + k * 1.7), x = G.cx + Math.cos(ang) * G.S * 0.45, y = G.cy + Math.sin(ang) * G.S * 0.42 - G.S * 0.05, r = G.S * 0.06 * fl;
          g.fillStyle = k % 2 ? 'rgba(255,150,40,.75)' : 'rgba(255,220,90,.75)'; g.beginPath(); g.moveTo(x, y - r * 2.6); g.quadraticCurveTo(x + r * 1.2, y, x, y + r); g.quadraticCurveTo(x - r * 1.2, y, x, y - r * 2.6); g.fill(); }
        g.restore();
        glowText(g, G.text, G.cx, G.cy - G.S * 0.85, G.S * 0.24, ease(seg(t, 0.25, 0.5)) * (1 - seg(t, 0.92, 1) * 0.5));
      } },
    /* Baby Moses floats on the river and the princess finds him. */
    river: { dur: 3800, pose: t => ({ dy: Math.sin(t * TAU * 2) * 0.04, rot: Math.sin(t * TAU * 2 + 1) * 0.07 }),
      over(g, t, G) {
        waves(g, G, t, ease(seg(t, 0, 0.15)));
        emo(g, '🌾', G.S * 0.25, G.ground - G.S * 0.2, G.S * 0.3, 1); emo(g, '🌾', G.W - G.S * 0.2, G.ground - G.S * 0.22, G.S * 0.3, 1);
        const a = ease(seg(t, 0.5, 0.68));
        emo(g, '👸', G.S * 0.32 + (1 - a) * -G.S * 0.3, G.cy - G.S * 0.35, G.S * 0.3, a);
        for (let k = 0; k < 6; k += 1) { const ang = t * 4 + k; emo(g, '✨', G.cx + Math.cos(ang) * G.S * 0.55, G.cy + Math.sin(ang) * G.S * 0.4, G.S * 0.1, a * (0.6 + 0.4 * Math.sin(t * 20 + k))); }
      } },
    /* Little Zacchaeus peeks out of the tree and climbs down happily. */
    zacchaeus: { dur: 3400, pose: t => ({ rot: Math.sin(seg(t, 0.4, 0.8) * TAU * 3) * 0.03 }),
      over(g, t, G) {
        let x = G.cx + G.S * 0.05, y = G.cy - G.S * 0.4;
        const peek = ease(seg(t, 0, 0.2));
        if (t < 0.4) y -= G.S * 0.15 * peek;
        else if (t < 0.8) { const u = seg(t, 0.4, 0.8); x = G.cx + G.S * (0.05 + 0.45 * ease(Math.min(1, u * 2))); y = G.cy - G.S * 0.55 + (G.ground - G.S * 0.1 - (G.cy - G.S * 0.55)) * ease(u) + Math.abs(Math.sin(u * 18)) * G.S * 0.02; }
        else { const u = seg(t, 0.8, 1); x = G.cx + G.S * 0.5; y = G.ground - G.S * 0.1 - Math.abs(Math.sin(u * 12)) * G.S * 0.07; }
        emo(g, t < 0.4 && Math.sin(t * 40) > 0.3 ? '👋' : '🧒', x, y, G.S * 0.2, peek);
        if (t > 0.8) emo(g, '❤️', x, y - G.S * 0.22, G.S * 0.12, ease(seg(t, 0.8, 0.9)));
      } },
    /* The animals come out two by two; rain, then a rainbow. */
    'two-by-two': { dur: 4200, pose: t => ({ rot: Math.sin(t * 20) * 0.02 * (1 - t) }),
      over(g, t, G) {
        if (t < 0.55) { g.save(); g.strokeStyle = 'rgba(150,200,255,.8)'; g.lineWidth = 2 * G.dpr; g.lineCap = 'round'; for (let k = 0; k < 40; k += 1) { const x = ((k * 97.13) % 1000) / 1000 * G.W, y = ((t * 3 + k * 0.137) % 1) * G.H; g.globalAlpha = 1 - seg(t, 0.45, 0.55); g.beginPath(); g.moveTo(x, y); g.lineTo(x - 3 * G.dpr, y + 14 * G.dpr); g.stroke(); } g.restore(); }
        rainbowArc(g, G.cx, G.ground, G.S * 1.1, G.S * 1.45, Math.PI, TAU, ease(seg(t, 0.5, 0.7)) * 0.85);
        ['🦒', '🐘', '🦁', '🐑', '🐰'].forEach((an, k) => { const u = seg(t, 0.1 + k * 0.12, 0.6 + k * 0.08); if (u <= 0) return; const x = G.cx + G.S * 0.3 + u * (G.W * 0.55), y = G.ground - G.S * 0.08 - Math.abs(Math.sin(u * 25)) * G.S * 0.02; emo(g, an, x, y, G.S * 0.15, 1 - seg(u, 0.9, 1)); emo(g, an, x - G.S * 0.14, y, G.S * 0.15, 1 - seg(u, 0.9, 1)); });
      } },
    /* Joseph's coat twirls and shows all its colors. */
    twirl: { dur: 2600, pose: t => { const u = ease(t); return { rot: u * TAU * 2, sx: 0.55 + 0.45 * Math.abs(Math.cos(u * TAU * 2)) }; },
      over(g, t, G) { for (let k = 0; k < 7; k += 1) { const ang = t * 14 + k * TAU / 7; g.strokeStyle = RAINBOW[k]; g.globalAlpha = Math.sin(Math.PI * t); g.lineWidth = 5 * G.dpr; g.beginPath(); g.arc(G.px, G.py, G.S * (0.6 + 0.05 * k), ang, ang + 0.9); g.stroke(); } g.globalAlpha = 1; } },
    /* Angels go up and down Jacob's ladder. */
    angels: { dur: 3800, pose: t => ({ dy: 0.03 * Math.sin(t * TAU * 2) }),
      over(g, t, G) {
        const a = ease(seg(t, 0, 0.2)), top = G.S * 0.1, bot = G.cy - G.S * 0.3, x0 = G.cx - G.S * 0.16, x1 = G.cx + G.S * 0.16;
        g.save(); g.globalAlpha = a; g.globalCompositeOperation = 'destination-over'; g.strokeStyle = 'rgb(227,181,122)'; g.lineWidth = G.S * 0.035; g.lineCap = 'round';
        g.beginPath(); g.moveTo(x0, bot); g.lineTo(x0, top); g.moveTo(x1, bot); g.lineTo(x1, top);
        for (let y = bot - G.S * 0.08; y > top; y -= G.S * 0.12) { g.moveTo(x0, y); g.lineTo(x1, y); }
        g.stroke(); g.restore();
        g.save(); g.globalAlpha = a * 0.5; g.fillStyle = 'rgb(255,250,225)'; g.beginPath(); g.ellipse(G.cx, top, G.S * 0.4, G.S * 0.12, 0, 0, TAU); g.fill(); g.restore();
        for (let k = 0; k < 4; k += 1) { const up = k % 2 === 0, u = (t * 1.4 + k / 4) % 1, y = up ? bot - (bot - top) * u : top + (bot - top) * u; emo(g, '👼', (up ? x0 : x1) + (up ? -1 : 1) * G.S * 0.05, y, G.S * 0.13, a * Math.sin(Math.PI * u)); }
      } },
    /* The raven flies off and brings Elijah bread and meat. */
    'bread-flight': { dur: 3800, pose: t => {
        if (t < 0.3) { const u = ease(t / 0.3); return { dx: 1.6 * u, dy: -0.9 * u, rot: 0.4 * u, sx: 1 - 0.4 * u, sy: 1 - 0.4 * u }; }
        if (t < 0.45) return { alpha: 0 };
        const u = ease(seg(t, 0.45, 0.75)); return { dx: -1.6 * (1 - u), dy: -0.9 * (1 - u), rot: -0.3 * (1 - u), sx: 0.6 + 0.4 * u, sy: 0.6 + 0.4 * u };
      },
      over(g, t, G) {
        const a = ease(seg(t, 0.4, 0.55));
        g.save(); g.globalAlpha = a; g.strokeStyle = 'rgb(120,190,255)'; g.lineWidth = G.S * 0.04; g.lineCap = 'round'; g.beginPath(); g.moveTo(G.S * 0.05, G.ground + G.S * 0.1); g.quadraticCurveTo(G.W * 0.3, G.ground - G.S * 0.02, G.W * 0.55, G.ground + G.S * 0.12); g.stroke(); g.restore();
        emo(g, '🧔', G.S * 0.35, G.ground - G.S * 0.12, G.S * 0.22, a);
        if (t > 0.45 && t < 0.78) { emo(g, '🍞', G.px + G.S * 0.4, G.py + G.S * 0.05, G.S * 0.13, 1); emo(g, '🍖', G.px + G.S * 0.5, G.py + G.S * 0.12, G.S * 0.12, 1); }
        if (t >= 0.78) { const u = ease(seg(t, 0.78, 0.92)); emo(g, '🍞', G.S * 0.55 + (G.cx - G.S * 0.15 - G.S * 0.55) * (1 - u), G.ground - G.S * 0.1 - (1 - u) * G.S * 0.4, G.S * 0.13, 1); emo(g, '🍖', G.S * 0.62, G.ground - G.S * 0.08 - (1 - u) * G.S * 0.35, G.S * 0.12, 1); emo(g, '😊', G.S * 0.35, G.ground - G.S * 0.4, G.S * 0.1, u); }
      } },
    /* Ruth gleans: grain falls and fills a basket for Naomi. */
    gleaning: { dur: 3600, pose: t => ({ rot: Math.sin(t * TAU * 3) * 0.05 * (1 - t) }),
      over(g, t, G) {
        for (let k = 0; k < 7; k += 1) emo(g, '🌾', G.S * 0.15 + k * (G.W - G.S * 0.3) / 6, G.ground - G.S * 0.05, G.S * 0.2 * ease(seg(t, k * 0.04, 0.25 + k * 0.04)), 1);
        const bx = G.W - G.S * 0.45, by = G.ground - G.S * 0.12;
        for (let k = 0; k < 14; k += 1) { const u = seg(t, 0.2 + k * 0.03, 0.45 + k * 0.03); if (u <= 0 || u >= 1) continue; g.fillStyle = 'rgb(233,185,73)'; g.beginPath(); g.ellipse(G.cx + (bx - G.cx) * u, G.cy - G.S * 0.4 + Math.sin(Math.PI * u) * -G.S * 0.3 + (by - G.cy + G.S * 0.4) * u, G.S * 0.015, G.S * 0.028, u * 6, 0, TAU); g.fill(); }
        const fill = ease(seg(t, 0.3, 0.85));
        g.save(); g.fillStyle = 'rgb(245,210,110)'; g.beginPath(); g.ellipse(bx, by - G.S * 0.05 - fill * G.S * 0.06, G.S * 0.14, G.S * 0.05 + fill * G.S * 0.04, 0, Math.PI, TAU); g.fill(); g.restore();
        emo(g, '🧺', bx, by, G.S * 0.3, 1);
        emo(g, '💛', bx, by - G.S * 0.35, G.S * 0.12, ease(seg(t, 0.85, 0.95)));
      } },
    /* The widow's oil keeps flowing until every jar is full. */
    overflow: { dur: 4200, pose: t => ({ rot: -0.35 * ease(seg(t, 0, 0.12)) * (1 - ease(seg(t, 0.9, 1))) }),
      over(g, t, G) {
        const n = 5;
        for (let k = 0; k < n; k += 1) {
          const x = G.S * 0.25 + k * (G.W - G.S * 0.5) / (n - 1), y = G.ground + G.S * 0.02, w = G.S * 0.09, h = G.S * 0.16;
          const lvl = ease(seg(t, 0.12 + k * 0.15, 0.27 + k * 0.15));
          g.save(); g.globalAlpha = ease(seg(t, 0, 0.12));
          g.fillStyle = 'rgb(232,195,158)'; g.strokeStyle = 'rgb(91,70,96)'; g.lineWidth = 2 * G.dpr;
          g.beginPath(); g.moveTo(x - w * 0.6, y - h); g.lineTo(x + w * 0.6, y - h); g.quadraticCurveTo(x + w * 1.3, y - h * 0.5, x + w, y); g.lineTo(x - w, y); g.quadraticCurveTo(x - w * 1.3, y - h * 0.5, x - w * 0.6, y - h); g.closePath(); g.fill(); g.stroke();
          g.clip(); g.fillStyle = 'rgb(255,209,102)'; g.fillRect(x - w * 1.4, y - h * lvl, w * 2.8, h * lvl); g.restore();
          const pour = seg(t, 0.12 + k * 0.15, 0.27 + k * 0.15);
          if (pour > 0 && pour < 1) { g.save(); g.strokeStyle = 'rgb(255,209,102)'; g.lineWidth = G.S * 0.025; g.lineCap = 'round'; g.beginPath(); g.moveTo(G.cx - G.S * 0.2, G.cy - G.S * 0.35); g.quadraticCurveTo(x, G.cy - G.S * 0.5, x, y - h); g.stroke(); g.restore(); }
          if (lvl >= 1) emo(g, '✨', x + w, y - h * 1.1, G.S * 0.07, 1);
        }
      } },
    /* The coin rolls away; a lamp and a broom find it, and friends celebrate. */
    found: { dur: 3800, pose: t => {
        if (t < 0.25) { const u = ease(t / 0.25); return { dx: 1.3 * u, rot: u * 6 }; }
        if (t < 0.6) return { dx: 1.3, rot: 6, alpha: 0.35 };
        const u = ease(seg(t, 0.6, 0.8)); return { dx: 1.3 * (1 - u), rot: 6 * (1 - u), sx: 1 + 0.1 * Math.sin(Math.PI * u), sy: 1 + 0.1 * Math.sin(Math.PI * u) };
      },
      over(g, t, G) {
        const s = seg(t, 0.25, 0.6);
        if (s > 0 && s < 1) { emo(g, '🪔', G.S * 0.2 + s * (G.W - G.S * 0.4), G.cy - G.S * 0.45, G.S * 0.18, 1); emo(g, '🧹', G.S * 0.1 + s * (G.W - G.S * 0.4), G.ground - G.S * 0.12, G.S * 0.22, 1, Math.sin(t * 40) * 0.4); }
        if (t > 0.7) { const u = ease(seg(t, 0.7, 0.85)); ['🎉', '👩', '👧', '👩‍🦱', '🎉'].forEach((e, k) => emo(g, e, G.S * 0.2 + k * (G.W - G.S * 0.4) / 4, G.S * 0.45 - Math.abs(Math.sin(t * 12 + k)) * G.S * 0.05, G.S * 0.18, u)); glowText(g, G.text, G.cx, G.cy - G.S * 0.75, G.S * 0.15, u); }
      } },
    /* The donkey carries the hurt man to the inn. */
    inn: { dur: 4200, pose: t => { const u = ease(seg(t, 0.45, 0.85)); return { dx: 0.9 * u, dy: -Math.abs(Math.sin(u * 20)) * 0.02 }; },
      over(g, t, G) {
        const innX = G.W - G.S * 0.25;
        emo(g, '🏠', innX, G.ground - G.S * 0.2, G.S * 0.35, ease(seg(t, 0, 0.15)));
        if (t < 0.3) emo(g, '🤕', G.S * 0.2 + ease(t / 0.3) * 0, G.ground - G.S * 0.08, G.S * 0.2, 1, -1.2);
        else if (t < 0.45) { const u = seg(t, 0.3, 0.45); emo(g, '🩹', G.cx - G.S * 0.45, G.ground - G.S * 0.35, G.S * 0.12, Math.sin(Math.PI * u)); emo(g, '🤕', G.S * 0.2 + (G.px - G.S * 0.2) * ease(u), G.ground - G.S * 0.08 - (G.ground - G.py + G.S * 0.35) * ease(u), G.S * 0.2, 1, -1.2 * (1 - u)); }
        else if (t < 0.88) emo(g, '🙂', G.px, G.py - G.S * 0.5, G.S * 0.2, 1);
        else emo(g, '😊', innX - G.S * 0.25, G.ground - G.S * 0.1, G.S * 0.2, 1);
        for (let k = 0; k < 3; k += 1) { const u = (t * 1.5 + k / 3) % 1; emo(g, '❤️', G.px + (k - 1) * G.S * 0.25, G.py - G.S * (0.55 + u * 0.3), G.S * 0.08, Math.sin(Math.PI * u) * ease(seg(t, 0.3, 0.45))); }
      } },
    /* Gideon's jar breaks, the torch blazes and the trumpets sound. */
    trumpets: { dur: 3400, pose: t => { const k = Math.sin(Math.PI * seg(t, 0.05, 0.2)); return { sx: 1 + 0.1 * k, sy: 1 - 0.08 * k, rot: Math.sin(t * 50) * 0.03 * (1 - t) }; },
      over(g, t, G) {
        const c = ease(seg(t, 0.08, 0.2));
        g.save(); g.globalAlpha = c; g.strokeStyle = 'rgb(91,70,96)'; g.lineWidth = 2.5 * G.dpr; g.lineJoin = 'round';
        g.beginPath(); g.moveTo(G.cx - G.S * 0.1, G.cy - G.S * 0.12); g.lineTo(G.cx - G.S * 0.02, G.cy); g.lineTo(G.cx - G.S * 0.1, G.cy + G.S * 0.1); g.lineTo(G.cx, G.cy + G.S * 0.2);
        g.moveTo(G.cx + G.S * 0.15, G.cy - G.S * 0.1); g.lineTo(G.cx + G.S * 0.08, G.cy + G.S * 0.02); g.lineTo(G.cx + G.S * 0.18, G.cy + G.S * 0.12); g.stroke(); g.restore();
        const fl = ease(seg(t, 0.15, 0.35));
        g.save(); g.globalCompositeOperation = 'lighter'; const gr = g.createRadialGradient(G.cx, G.cy - G.S * 0.45, 0, G.cx, G.cy - G.S * 0.45, G.S * 0.8 * fl + 1);
        gr.addColorStop(0, 'rgba(255,220,120,0.55)'); gr.addColorStop(1, 'rgba(255,160,60,0)'); g.fillStyle = gr; g.fillRect(0, 0, G.W, G.H); g.restore();
        emo(g, '🔥', G.cx, G.cy - G.S * (0.55 + 0.02 * Math.sin(t * 30)), G.S * (0.15 + 0.2 * fl), fl);
        [[-0.6, -0.3, -0.5], [0.6, -0.3, 0.5], [0, -1.0, 0]].forEach(([dx, dy, r], k) => emo(g, '🎺', G.cx + dx * G.S, G.cy + dy * G.S + Math.sin(t * 25 + k) * G.S * 0.02, G.S * 0.2, ease(seg(t, 0.3 + k * 0.08, 0.45 + k * 0.08)), r));
        glowText(g, G.text, G.cx, G.S * 0.35, G.S * 0.13, ease(seg(t, 0.55, 0.7)));
      } },
    /* Esther's crown spins up and the king holds out his golden scepter. */
    scepter: { dur: 3400, pose: t => { const u = Math.sin(Math.PI * seg(t, 0, 0.45)); return { dy: -0.45 * u, rot: TAU * ease(seg(t, 0, 0.45)), sx: 1 + 0.1 * u, sy: 1 + 0.1 * u }; },
      over(g, t, G) {
        const u = ease(seg(t, 0.4, 0.65)), ex = G.cx + G.S * 0.45, ey = G.cy - G.S * 0.05, sx = G.W + G.S * 0.1 - (G.W + G.S * 0.1 - ex) * u;
        g.save(); g.strokeStyle = 'rgb(240,190,60)'; g.lineWidth = G.S * 0.035; g.lineCap = 'round'; g.beginPath(); g.moveTo(G.W + G.S * 0.3, ey + G.S * 0.25); g.lineTo(sx, ey); g.stroke();
        g.fillStyle = 'rgb(255,211,90)'; g.strokeStyle = 'rgb(91,70,96)'; g.lineWidth = 2 * G.dpr; g.beginPath(); g.arc(sx, ey, G.S * 0.05, 0, TAU); g.fill(); g.stroke(); g.restore();
        if (t > 0.62) for (let k = 0; k < 6; k += 1) { const ang = t * 6 + k; emo(g, '✨', G.cx + Math.cos(ang) * G.S * 0.55, G.cy + Math.sin(ang) * G.S * 0.4, G.S * 0.09, ease(seg(t, 0.62, 0.75))); }
        emo(g, '👸', G.cx - G.S * 0.55, G.cy - G.S * 0.45, G.S * 0.22, ease(seg(t, 0.62, 0.8)));
      } },
    /* Peter lets down the net and it fills with fish until it nearly breaks. */
    net: { dur: 4000, pose: t => ({ dy: Math.sin(t * TAU * 2) * 0.025, rot: Math.sin(t * TAU * 2 + 1) * 0.04 }),
      over(g, t, G) {
        waves(g, G, t, 1);
        const c = ease(seg(t, 0.05, 0.3)), nx = G.cx + G.S * 0.55, ny = G.ground + G.S * 0.05, w = G.S * 0.32 * c, h = G.S * (0.25 + 0.12 * ease(seg(t, 0.5, 0.85))) * c;
        if (c > 0) {
          g.save(); g.strokeStyle = 'rgba(230,220,200,.9)'; g.lineWidth = 1.5 * G.dpr;
          g.beginPath(); g.moveTo(G.cx + G.S * 0.25, G.cy + G.S * 0.05); g.lineTo(nx - w, ny); g.moveTo(G.cx + G.S * 0.3, G.cy); g.lineTo(nx + w, ny); g.stroke();
          g.beginPath(); g.ellipse(nx, ny, w, h, 0, 0, Math.PI); g.stroke();
          for (let k = -3; k <= 3; k += 1) { g.moveTo(nx + k * w / 4, ny); g.lineTo(nx + k * w / 5, ny + h * Math.cos(k / 4)); }
          g.stroke(); g.restore();
          const n = Math.floor(14 * ease(seg(t, 0.3, 0.8)));
          for (let k = 0; k < n; k += 1) emo(g, '🐟', nx + Math.cos(k * 2.4) * w * 0.6, ny + h * (0.35 + 0.4 * ((k * 0.37) % 1)), G.S * 0.09, 1, Math.sin(t * 20 + k) * 0.4);
          if (t > 0.82) { emo(g, '💥', nx + w * 0.7, ny + h * 0.5, G.S * 0.12, Math.sin(Math.PI * seg(t, 0.82, 1))); glowText(g, G.text, G.cx, G.S * 0.35, G.S * 0.14, ease(seg(t, 0.82, 0.92))); }
        }
      } },
    /* The stone rolls away: the tomb is empty. He is risen! */
    risen: { dur: 4600, pose: t => { const u = ease(seg(t, 0.05, 0.4)); return { dx: 0.85 * u, rot: TAU * 0.6 * u, mood: t > 0.4 ? 'wow' : 'happy' }; },
      over(g, t, G) {
        const a = ease(seg(t, 0.1, 0.35)), cx = G.cx - G.S * 0.05, cy = G.cy;
        g.save(); g.globalCompositeOperation = 'destination-over';
        g.globalAlpha = a; g.fillStyle = 'rgb(255,243,196)'; g.beginPath(); g.moveTo(cx - G.S * 0.28, G.ground); g.lineTo(cx - G.S * 0.28, cy - G.S * 0.1); g.quadraticCurveTo(cx - G.S * 0.28, cy - G.S * 0.4, cx, cy - G.S * 0.4); g.quadraticCurveTo(cx + G.S * 0.28, cy - G.S * 0.4, cx + G.S * 0.28, cy - G.S * 0.1); g.lineTo(cx + G.S * 0.28, G.ground); g.closePath(); g.fill();
        g.fillStyle = 'rgb(183,173,159)'; g.beginPath(); g.moveTo(cx - G.S * 0.45, G.ground); g.lineTo(cx - G.S * 0.45, cy - G.S * 0.1); g.quadraticCurveTo(cx - G.S * 0.45, cy - G.S * 0.6, cx, cy - G.S * 0.6); g.quadraticCurveTo(cx + G.S * 0.45, cy - G.S * 0.6, cx + G.S * 0.45, cy - G.S * 0.1); g.lineTo(cx + G.S * 0.45, G.ground); g.closePath(); g.fill();
        g.restore();
        const sun = ease(seg(t, 0.35, 0.7));
        g.save(); g.globalCompositeOperation = 'lighter'; g.globalAlpha = sun * 0.8; g.strokeStyle = 'rgb(255,231,160)'; g.lineWidth = G.S * 0.03; g.lineCap = 'round';
        for (let k = 0; k < 9; k += 1) { const ang = Math.PI + (k + 0.5) / 9 * Math.PI + Math.sin(t * 3) * 0.03; g.beginPath(); g.moveTo(cx + Math.cos(ang) * G.S * 0.5, cy - G.S * 0.1 + Math.sin(ang) * G.S * 0.5); g.lineTo(cx + Math.cos(ang) * G.S * (0.7 + 0.3 * sun), cy - G.S * 0.1 + Math.sin(ang) * G.S * (0.7 + 0.3 * sun)); g.stroke(); }
        g.restore();
        emo(g, '🕊️', cx, cy - G.S * 0.2 - sun * G.S * 0.2, G.S * 0.16, ease(seg(t, 0.5, 0.65)));
        ['🌸', '🌷', '🌸'].forEach((e, k) => emo(g, e, cx + (k - 1) * G.S * 0.3, G.ground - G.S * 0.04, G.S * 0.12, ease(seg(t, 0.55 + k * 0.05, 0.7 + k * 0.05))));
        glowText(g, G.text, G.cx, G.S * 0.35, G.S * 0.16, ease(seg(t, 0.5, 0.65)));
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
  const api = { FX, TRICKS, spawn, step, drawParticle, emo, glowText, ease, seg };
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.MsbSquishyFx = api;
})(typeof self !== 'undefined' ? self : this);
