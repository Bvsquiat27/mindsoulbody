/* Ark Builder: load the animals into the ark two by two before the rain
   timer runs out. Tap an animal, then its partner. A short obedience lesson
   and a verse close each level. The timer pauses when the app is hidden. */
(() => {
  'use strict';
  const K = window.MsbKidGames; if (!K) return;
  const { t, esc, lang, name, sound, buzz, prog, award, render, verseHtml, gameHead, reduced, celebrate, animalCall, coach, levelCard, starPings, floatText } = K._helpers;
  const D = () => window.MsbKidGamesData, C = () => window.MsbKidGamesCore;
  const A = () => D().ARK;
  let timer = 0;
  const stop = () => { if (timer) clearInterval(timer); timer = 0; };

  function start() { return { view: 'pick', at: 0 }; }
  function begin(s, i) {
    const lv = A().levels[i];
    Object.assign(s, { view: 'play', at: i, deck: C().arkDeck(lv.pairs), boarded: [], sel: -1, left: lv.seconds, total: lv.seconds, won: false, lost: false, msg: '', wrong: null, fresh: null, streak: 0, lastMatch: 0, phase: 'sun', rainT: 0, noah: '', burst: null, record: false });
  }
  const starRow = n => `<span class="kg-stars" aria-label="${esc(t('{n} of 3 stars', '{n} de 3 estrellas', { n }))}">${[1, 2, 3].map(k => `<i class="${k <= n ? 'on' : ''}" aria-hidden="true">★</i>`).join('')}</span>`;
  function pickHtml() {
    const v = prog().get();
    const lv = A().levels.map((x, i) => { const st = Number(v.best[`ark:${x.id}`]) || 0; const open = i === 0 || (v.done.ark || []).includes(A().levels[i - 1].id); return `<li><button type="button" class="card kg-pick${st ? ' done' : ''}" ${open ? `data-ark-pick="${i}"` : 'disabled'}><span class="kg-pick-icon" aria-hidden="true">${open ? x.pairs.slice(0, 2).map(a => A().animals[a]).join('') : '🔒'}</span><span><strong>${esc(t('Level {n}', 'Nivel {n}', { n: i + 1 }))}</strong><small>${esc(open ? t('{p} pairs · {s} seconds', '{p} parejas · {s} segundos', { p: x.pairs.length, s: x.seconds }) : t('Finish level {n} first', 'Termina primero el nivel {n}', { n: i }))}</small>${st ? starRow(st) : ''}</span></button></li>`; }).join('');
    return `<p class="kg-lead">${esc(t('The rain is coming! Help Noah bring the animals into the ark, two by two.', '¡Ya viene la lluvia! Ayuda a Noé a meter a los animales en el arca, de dos en dos.'))}</p><ul class="kg-picks">${lv}</ul>`;
  }
  /* ---------- the scene: sky, rain, rising water and Noah's ark ---------- */
  const phaseOf = s => { const f = s.left / s.total; return s.won ? 'done' : f < 0.3 ? 'storm' : f < 0.6 ? 'grey' : 'sun'; };
  const waterY = s => (s.won ? 0 : Math.round((1 - s.left / s.total) * 26));
  const animalIndex = a => Math.max(0, Object.keys(A().animals).indexOf(a));
  /* Noah on the deck: idle breathing, a cheer on each pair, a puzzled look on a miss, and a wave at the end */
  function noahSvg(s) {
    const mood = s.won ? 'win' : s.noah || 'idle';
    return `<g class="kg-noah ${mood}" transform="translate(242 96)"><g class="kg-noah-body"><path d="M-8 16 L-6 -2 Q0 -6 6 -2 L8 16 Z" fill="#8f6bb8" stroke="#4a3466" stroke-width="1.2"/><path d="M-6 6 H6" stroke="#f2c75c" stroke-width="2"/><circle cx="0" cy="-8" r="6" fill="#f1c9a0" stroke="#7a5a32" stroke-width="1"/><path d="M-6 -6 Q0 6 6 -6 Q4 2 0 3 Q-4 2 -6 -6Z" fill="#f4f1ea" stroke="#b9b3a6" stroke-width=".6"/><path d="M-6.5 -9 Q0 -18 6.5 -9 Q3 -12 0 -12 Q-3 -12 -6.5 -9Z" fill="#e8e2d4"/><circle cx="-2.2" cy="-9" r=".9" fill="#2b1a0c"/><circle cx="2.2" cy="-9" r=".9" fill="#2b1a0c"/><g class="kg-noah-arm"><path d="M6 0 L13 -6" stroke="#8f6bb8" stroke-width="3" stroke-linecap="round"/><circle cx="13.5" cy="-6.5" r="2" fill="#f1c9a0"/></g><path d="M-9 -12 V16" stroke="#7a4b25" stroke-width="1.8" stroke-linecap="round"/></g>${mood === 'oops' ? '<text class="kg-noah-say" x="0" y="-22" text-anchor="middle">?</text>' : mood === 'cheer' ? '<text class="kg-noah-say" x="0" y="-22" text-anchor="middle">♪</text>' : ''}</g>`;
  }
  function scene(s) {
    const ph = phaseOf(s), motion = !reduced();
    const pairs = A().levels[s.at].pairs.length, cols = pairs > 6 ? 4 : 3, rows = Math.ceil(pairs / cols), ww = cols === 4 ? 23 : 26, wh = rows > 2 ? 14 : 18, gap = 6;
    const span = cols * ww + (cols - 1) * gap, x0 = 179 - span / 2, hx = x0 - 9, hw = span + 18, hy = 112 - (rows * (wh + 4) + 10);
    const wins = Array.from({ length: pairs }, (_, k) => { const a = s.boarded[k]; const x = x0 + (k % cols) * (ww + gap), y = hy + 6 + Math.floor(k / cols) * (wh + 4); return `<g${a === s.fresh && a ? ' class="kg-ark-newwin"' : ''}><rect x="${x}" y="${y}" width="${ww}" height="${wh}" rx="4" fill="${a ? '#ffe9a8' : '#3b2414'}" stroke="#5a3a20" stroke-width="2"/>${a ? `<text x="${x + ww / 2}" y="${y + wh - 4}" font-size="${wh > 15 ? 12 : 10}" text-anchor="middle">${A().animals[a]}${A().animals[a]}</text>` : ''}</g>`; }).join('');
    const noah = noahSvg(s);
    const walk = s.fresh && motion ? `<text class="kg-ark-walk" x="62" y="132" font-size="18">${A().animals[s.fresh]}${A().animals[s.fresh]}</text>` : '';
    const rain = ph === 'storm' && motion ? `<g class="kg-ark-rain">${Array.from({ length: 26 }, (_, k) => `<line x1="${(k * 37) % 360}" y1="${-10 - (k * 13) % 40}" x2="${(k * 37) % 360 - 6}" y2="${6 - (k * 13) % 40}" style="--d:${(k % 7) * 0.09}s"/>`).join('')}</g><rect class="kg-ark-flash" width="360" height="170"/>` : '';
    const rainbow = ph === 'done' ? `<g class="kg-ark-rainbow">${['#ff6b6b', '#ffb347', '#ffe066', '#7ed957', '#5ab8ff', '#a78bfa'].map((c, k) => `<path d="M20 150 A160 ${120 - k * 9} 0 0 1 340 150" fill="none" stroke="${c}" stroke-width="6" opacity=".85" transform="translate(0 ${k * 6})"/>`).join('')}</g><g class="kg-ark-dove" transform="translate(250 34)"><path d="M0 10C8 2 16 0 22 4C26-2 32-4 36-2C32 1 31 4 32 7C38 7 42 9 44 12C36 13 30 14 26 16C18 19 8 18 0 10Z" fill="#fff" stroke="#c9b48a"/><path d="M38 4C40 7 42 9 43 12" stroke="#6f9a5f" stroke-width="1.5" fill="none"/><ellipse cx="42" cy="8" rx="2.2" ry="1.1" fill="#8db47b"/></g>` : '';
    return `<svg class="kg-ark-scene phase-${ph}" viewBox="0 0 360 170" role="img" aria-label="${esc(t('Noah’s ark: {n} of {total} pairs inside', 'El arca de Noé: {n} de {total} parejas dentro', { n: s.boarded.length, total: A().levels[s.at].pairs.length }))}">
      <defs><linearGradient id="kgArkSun" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#5fb8f0"/><stop offset="1" stop-color="#cfeeff"/></linearGradient><linearGradient id="kgArkGrey" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#7d8c9a"/><stop offset="1" stop-color="#bac6cf"/></linearGradient><linearGradient id="kgArkStorm" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#2f3946"/><stop offset="1" stop-color="#5d6a77"/></linearGradient><linearGradient id="kgArkWood" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#b07a45"/><stop offset="1" stop-color="#7a4b25"/></linearGradient></defs>
      <rect class="sky sun" width="360" height="170" fill="url(#kgArkSun)"/><rect class="sky grey" width="360" height="170" fill="url(#kgArkGrey)"/><rect class="sky storm" width="360" height="170" fill="url(#kgArkStorm)"/>
      <circle class="kg-ark-sunball" cx="300" cy="32" r="16" fill="#ffe27a"/>
      ${rainbow}
      <g class="kg-ark-clouds"><g class="c1"><ellipse cx="60" cy="30" rx="26" ry="12"/><ellipse cx="80" cy="24" rx="20" ry="13"/><ellipse cx="98" cy="31" rx="18" ry="10"/></g><g class="c2"><ellipse cx="200" cy="22" rx="24" ry="11"/><ellipse cx="222" cy="17" rx="18" ry="12"/><ellipse cx="240" cy="24" rx="16" ry="9"/></g></g>
      ${rain}
      <g class="kg-ark-far"><path d="M-20 128 L30 96 L70 124 L120 90 L170 126 L230 100 L290 128 L340 94 L390 128 V170 H-20Z" fill="#9db7c9" opacity=".55"/></g>
      <g class="kg-ark-mid"><path d="M-20 132 Q60 112 120 128 T240 124 T380 120 V170 H-20Z" fill="#7cbf5f"/><g fill="#4f8f3a"><circle cx="300" cy="118" r="9"/><circle cx="310" cy="114" r="7"/><rect x="303" y="118" width="3" height="10" fill="#6b4423"/><circle cx="34" cy="120" r="8"/><rect x="33" y="122" width="3" height="9" fill="#6b4423"/></g></g>
      <path d="M0 140 Q90 126 180 138 T360 134 V170 H0Z" fill="#5fa447"/>
      <g class="kg-ark-boat-g">
        <path d="M60 134 L118 112" stroke="#8a5a35" stroke-width="5" stroke-linecap="round"/>
        <path d="M96 112 H264 L250 146 Q180 156 110 146 Z" fill="url(#kgArkWood)" stroke="#4d2f17" stroke-width="2.5"/>
        <path d="M104 122 H258 M108 132 H254" stroke="rgba(60,35,15,.45)" stroke-width="1.4"/>
        <rect x="${hx}" y="${hy}" width="${hw}" height="${112 - hy + 2}" rx="5" fill="#c08a52" stroke="#4d2f17" stroke-width="2.5"/>
        <path d="M${hx - 8} ${hy + 2} L179 ${hy - 22} L${hx + hw + 8} ${hy + 2} Z" fill="#8b5a2b" stroke="#4d2f17" stroke-width="2.5"/>
        <path d="M${hx - 2} ${hy - 2} L179 ${hy - 18} L${hx + hw + 2} ${hy - 2}" stroke="rgba(255,255,255,.18)" stroke-width="2" fill="none"/>
        ${wins}${noah}
        <rect x="104" y="96" width="12" height="18" rx="2" fill="#3b2414" stroke="#4d2f17"/>
      </g>
      ${walk}<g class="kg-ark-near"><path d="M-10 170 q8-14 12 0 q6-12 10 0 M330 170 q8-14 12 0 q6-12 10 0 M60 170 q6-10 9 0" stroke="#3f7f30" stroke-width="3" fill="#4f9a3d"/></g>
      <g class="kg-ark-water" style="transform:translateY(${26 - waterY(s)}px)"><path d="M0 150 Q30 144 60 150 T120 150 T180 150 T240 150 T300 150 T360 150 V200 H0Z" fill="rgba(70,140,210,.75)"/><path d="M0 154 Q30 149 60 154 T120 154 T180 154 T240 154 T300 154 T360 154" fill="none" stroke="rgba(255,255,255,.55)" stroke-width="1.5"/></g>
    </svg>`;
  }
  function timerHtml(s) {
    const pct = Math.max(0, Math.round(s.left / s.total * 100));
    return `<div class="kg-ark-timer" role="timer" aria-label="${esc(t('{n} seconds until the rain', '{n} segundos para la lluvia', { n: Math.ceil(s.left) }))}"><span aria-hidden="true">${pct < 30 ? '⛈️' : pct < 60 ? '🌥️' : '☀️'}</span><span class="kg-ark-bar"><i style="width:${pct}%" class="${pct < 30 ? 'low' : ''}"></i></span><b>${Math.ceil(s.left)}s</b></div>`;
  }
  function playHtml(s) {
    const lv = A().levels[s.at], l = lang();
    const pairs = lv.pairs.length, inside = s.boarded.length;
    const count = `<p class="kg-ark-count"><b>${inside}/${pairs}</b> ${esc(t('pairs in the ark', 'parejas en el arca'))}${s.streak > 1 ? ` <span class="kg-ark-streak">${esc(t('{n} in a row!', '¡{n} seguidas!', { n: s.streak }))}</span>` : ''}</p>`;
    if (s.won) {
      const n = C().arkStars(s.left, s.total), last = s.at + 1 >= A().levels.length;
      const reward = last ? t('Every animal is safe: all levels done!', 'Todos los animales a salvo: ¡niveles completos!') : t('Next level: {n} pairs and new animals', 'Siguiente nivel: {n} parejas y animales nuevos', { n: A().levels[s.at + 1].pairs.length });
      return `${scene(s)}${count}${levelCard({ eyebrow: t('ALL ABOARD!', '¡TODOS A BORDO!'), title: t('Level {n} complete', 'Nivel {n} completo', { n: s.at + 1 }), stars: n, record: s.record, text: t('{n} seconds to spare', 'Sobraron {n} segundos', { n: Math.ceil(s.left) }), reward, actions: `${!last ? `<button type="button" class="primary" data-ark-next>${esc(t('Next level', 'Siguiente nivel'))} →</button>` : ''}<button type="button" class="secondary" data-ark-again>${esc(t('Play again', 'Jugar otra vez'))}</button>` })}<div class="kg-ark-lesson"><span class="eyebrow">${esc(t('NOAH OBEYED', 'NOÉ OBEDECIÓ'))}</span><p>${esc(A().lesson[l])}</p></div>${verseHtml(lv.verse, t('GOD KEPT THEM SAFE', 'DIOS LOS CUIDÓ'), '')}`;
    }
    if (s.lost) {
      return `${scene(s)}${count}${levelCard({ lost: true, art: '🌧️', eyebrow: t('THE RAIN STARTED', 'EMPEZÓ LA LLUVIA'), title: t('So close!', '¡Casi!'), text: t('Noah got ready in time because he obeyed right away. Try again, a little quicker!', 'Noé estuvo listo a tiempo porque obedeció enseguida. ¡Inténtalo otra vez, un poco más rápido!'), actions: `<button type="button" class="primary" data-ark-again>${esc(t('Try again', 'Intentar otra vez'))}</button>` })}`;
    }
    const cards = s.deck.map((a, i) => {
      const gone = s.boarded.includes(a), leaving = gone && s.fresh === a, wrong = s.wrong && s.wrong.includes(i);
      return `<button type="button" class="kg-ark-card${gone ? ' gone' : ''}${leaving ? ' leave' : ''}${s.sel === i ? ' sel' : ''}${wrong ? ' wrong' : ''}" data-ark-card="${i}" ${gone ? 'disabled' : ''} aria-label="${esc(name(A().names[a]))}${s.sel === i ? ', ' + esc(t('picked', 'elegido')) : ''}"><span class="kg-ark-face" aria-hidden="true">${gone && !leaving ? '' : A().animals[a]}</span>${gone && !leaving ? '' : `<small aria-hidden="true">${esc(name(A().names[a]))}</small>`}</button>`;
    }).join('');
    const tut = coach('ark', t('Ark Builder', 'Llena el arca'), [
      { icon: '🐘', text: t('Tap an animal, then tap its partner.', 'Toca un animal y luego a su pareja.') },
      { icon: '⏱️', text: t('Load every pair before the rain comes.', 'Mete todas las parejas antes de que llegue la lluvia.') },
      { icon: '⭐', text: t('Quick pairs in a row make combos and more stars!', '¡Parejas rápidas seguidas hacen combos y más estrellas!') },
    ], K._ui.coachForce === 'ark');
    return `${tut}<div class="kg-ark-stage" data-ark-stage>${scene(s)}<div class="kg-ark-fx" data-ark-fx aria-hidden="true"></div></div>${timerHtml(s)}${count}<p class="kg-msg" role="status" aria-live="polite" data-kg-msg>${esc(s.msg || t('Tap an animal, then its partner.', 'Toca un animal y luego su pareja.'))}</p><div class="kg-ark-grid">${cards}</div>`;
  }
  function tick(ui) {
    const s = ui.state;
    if (!s || s.view !== 'play' || s.won || s.lost) { stop(); return; }
    if (document.hidden || document.querySelector('.kg-coach')) return;
    s.left = Math.max(0, s.left - 0.25);
    const screen = document.querySelector('.kg-screen'); if (!screen) { stop(); return; }
    if (s.left <= 0) { s.lost = true; stop(); sound('thud'); setTimeout(() => sound('sad'), 300); buzz([30, 60, 30]); render(); return; }
    const tm = screen.querySelector('.kg-ark-timer'); if (tm) tm.outerHTML = timerHtml(s);
    const ph = phaseOf(s);
    if (ph !== s.phase) {
      s.phase = ph;
      if (ph === 'storm') { sound('thunder'); buzz([40, 30, 60]); } else if (ph === 'grey') sound('rain');
      const sc = screen.querySelector('.kg-ark-scene'); if (sc) sc.outerHTML = scene(s);
    } else {
      const w = screen.querySelector('.kg-ark-water'); if (w) w.style.transform = `translateY(${26 - waterY(s)}px)`;
    }
    if (ph === 'storm') { s.rainT += 0.25; if (s.rainT >= 1.2) { s.rainT = 0; sound('rain'); } }
  }
  function mount(screen, ui) {
    const s = ui.state;
    const stage = screen.querySelector('[data-ark-stage]');
    if (stage && !reduced()) stage.addEventListener('pointermove', e => { const r = stage.getBoundingClientRect(); stage.style.setProperty('--px', ((e.clientX - r.left) / r.width - 0.5).toFixed(3)); });
    if (s.burst != null && stage && !reduced()) {
      const fx = stage.querySelector('[data-ark-fx]');
      for (let k = 0; k < 14; k += 1) { const b = document.createElement('i'); b.className = 'kg-ark-spark'; b.textContent = ['✦', '❤', '★', '✿'][k % 4]; b.style.setProperty('--a', `${k * 26}deg`); b.style.setProperty('--d', `${30 + (k % 4) * 12}px`); fx.appendChild(b); }
      if (s.streak > 1) floatText(fx, t('Combo x{n}!', '¡Combo x{n}!', { n: s.streak }), 50, 18, 'gold'); else floatText(fx, t('Two by two!', '¡De dos en dos!'), 50, 22);
      setTimeout(() => { fx.innerHTML = ''; }, 900);
    }
    s.burst = null;
    if (s.noah && !s.won) setTimeout(() => { s.noah = ''; const n = screen.querySelector('.kg-noah'); if (n) n.setAttribute('class', 'kg-noah idle'); const say = n && n.querySelector('.kg-noah-say'); if (say) say.remove(); }, 900);
    if (s.view === 'play' && !s.won && !s.lost && !timer) timer = setInterval(() => tick(ui), 250);
  }
  function tapCard(ui, i) {
    const s = ui.state, a = s.deck[i];
    if (s.won || s.lost || s.boarded.includes(a)) return;
    s.wrong = null; s.fresh = null;
    if (s.sel === i) { s.sel = -1; sound('tap'); render(); return; }
    if (s.sel < 0) { s.sel = i; animalCall(animalIndex(a)); buzz(6); s.msg = t('Now find the other {a}.', 'Ahora busca la pareja: {a}.', { a: name(A().names[a]) }); render(); focusCard(i); return; }
    const b = s.deck[s.sel];
    if (a === b) {
      const now = Date.now();
      s.streak = now - s.lastMatch < 3500 ? s.streak + 1 : 1; s.lastMatch = now;
      s.boarded.push(a); s.sel = -1; s.fresh = a; s.msg = t('Two {a} went into the ark!', '¡Dos {a} entraron al arca!', { a: name(A().names[a]) });
      animalCall(animalIndex(a)); setTimeout(() => sound('hop'), 160); setTimeout(() => sound('knock'), 520); buzz([12, 30, 18]);
      if (s.streak > 1) setTimeout(() => sound('combo'), 300);
      s.noah = 'cheer'; s.burst = i;
      if (s.boarded.length === A().levels[s.at].pairs.length) {
        s.won = true; stop();
        const lv = A().levels[s.at];
        const n = C().arkStars(s.left, s.total); s.record = n > (Number(prog().get().best[`ark:${lv.id}`]) || 0);
        prog().finish('ark', lv.id); prog().best(`ark:${lv.id}`, n);
        setTimeout(() => sound('rainbow'), 250); setTimeout(() => sound('fanfare'), 700); starPings(n); if (s.record) setTimeout(() => sound('record'), 1500); buzz([20, 40, 30, 40, 60]);
        render(); award(); celebrate('gold');
        const v = document.querySelector('.kg-ark-lesson'); if (v && v.scrollIntoView) v.scrollIntoView({ block: 'start', behavior: reduced() ? 'auto' : 'smooth' });
        return;
      }
    } else { s.noah = 'oops'; s.wrong = [s.sel, i]; s.sel = -1; s.streak = 0; s.msg = t('Those two are not a pair. Try again!', 'Esos dos no son pareja. ¡Inténtalo otra vez!'); sound('bad'); buzz([8, 30, 8]); }
    render(); focusCard(i);
  }
  function focusCard(i) { const b = document.querySelector(`[data-ark-card="${i}"]`); if (b && !b.disabled) b.focus({ preventScroll: true }); else { const n = document.querySelector('.kg-ark-card:not([disabled])'); if (n) n.focus({ preventScroll: true }); } }
  K._helpers.register({
    id: 'ark', icon: '🛶',
    name: { en: 'Ark Builder', es: 'Llena el arca' },
    blurb: { en: 'Load the animals two by two before the rain', es: 'Mete a los animales de dos en dos antes de la lluvia' },
    total: () => A().levels.length,
    start,
    leave: stop,
    render(ui) { return gameHead(this) + (ui.state.view === 'play' ? playHtml(ui.state) : pickHtml()); },
    mount,
    click(event, ui) {
      const s = ui.state, el = event.target;
      const c = el.closest('[data-ark-card]'); if (c) { tapCard(ui, +c.dataset.arkCard); return; }
      const pick = el.closest('[data-ark-pick]'); if (pick) { stop(); begin(s, +pick.dataset.arkPick); sound('start'); render(); window.scrollTo({ top: 0, behavior: 'auto' }); return; }
      if (el.closest('[data-ark-again]')) { stop(); begin(s, s.at); sound('start'); render(); window.scrollTo({ top: 0, behavior: 'auto' }); return; }
      if (el.closest('[data-ark-next]')) { stop(); begin(s, s.at + 1); sound('start'); render(); window.scrollTo({ top: 0, behavior: 'auto' }); }
    }
  });
})();
