/* Ark Builder: load the animals into the ark two by two before the rain
   timer runs out. Tap an animal, then its partner. A short obedience lesson
   and a verse close each level. The timer pauses when the app is hidden. */
(() => {
  'use strict';
  const K = window.MsbKidGames; if (!K) return;
  const { t, esc, lang, name, sound, buzz, prog, award, render, verseHtml, gameHead, reduced, celebrate, animalCall } = K._helpers;
  const D = () => window.MsbKidGamesData, C = () => window.MsbKidGamesCore;
  const A = () => D().ARK;
  let timer = 0;
  const stop = () => { if (timer) clearInterval(timer); timer = 0; };

  function start() { return { view: 'pick', at: 0 }; }
  function begin(s, i) {
    const lv = A().levels[i];
    Object.assign(s, { view: 'play', at: i, deck: C().arkDeck(lv.pairs), boarded: [], sel: -1, left: lv.seconds, total: lv.seconds, won: false, lost: false, msg: '', wrong: null, fresh: null, streak: 0, lastMatch: 0, phase: 'sun', rainT: 0 });
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
  function scene(s) {
    const ph = phaseOf(s), motion = !reduced();
    const wins = [0, 1, 2, 3, 4, 5].map(k => { const a = s.boarded[k]; const x = 128 + (k % 3) * 34, y = k < 3 ? 70 : 92; return `<g><rect x="${x}" y="${y}" width="26" height="18" rx="4" fill="${a ? '#ffe9a8' : '#3b2414'}" stroke="#5a3a20" stroke-width="2"/>${a ? `<text x="${x + 13}" y="${y + 14}" font-size="12" text-anchor="middle">${A().animals[a]}${A().animals[a]}</text>` : ''}</g>`; }).join('');
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
      <path d="M0 132 Q60 112 120 128 T240 124 T360 120 V170 H0Z" fill="#7cbf5f"/>
      <path d="M0 140 Q90 126 180 138 T360 134 V170 H0Z" fill="#5fa447"/>
      <g class="kg-ark-boat-g">
        <path d="M60 134 L118 112" stroke="#8a5a35" stroke-width="5" stroke-linecap="round"/>
        <path d="M96 112 H264 L250 146 Q180 156 110 146 Z" fill="url(#kgArkWood)" stroke="#4d2f17" stroke-width="2.5"/>
        <path d="M104 122 H258 M108 132 H254" stroke="rgba(60,35,15,.45)" stroke-width="1.4"/>
        <rect x="118" y="62" width="122" height="52" rx="5" fill="#c08a52" stroke="#4d2f17" stroke-width="2.5"/>
        <path d="M110 64 L179 40 L248 64 Z" fill="#8b5a2b" stroke="#4d2f17" stroke-width="2.5"/>
        ${wins}
        <rect x="104" y="96" width="12" height="18" rx="2" fill="#3b2414" stroke="#4d2f17"/>
      </g>
      ${walk}
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
      const n = C().arkStars(s.left, s.total);
      return `${scene(s)}${count}<div class="kg-ark-lesson"><span class="eyebrow">${esc(t('NOAH OBEYED', 'NOÉ OBEDECIÓ'))}</span><p>${esc(A().lesson[l])}</p></div>${verseHtml(lv.verse, t('ALL ABOARD!', '¡TODOS A BORDO!'), `${starRow(n)}${s.at + 1 < A().levels.length ? `<button type="button" class="primary" data-ark-next>${esc(t('Next level', 'Siguiente nivel'))}</button>` : ''}<button type="button" class="secondary" data-ark-again>${esc(t('Play again', 'Jugar otra vez'))}</button>`)}`;
    }
    if (s.lost) {
      return `${scene(s)}${count}<div class="kg-verse" role="status" aria-live="polite"><span class="eyebrow">${esc(t('THE RAIN STARTED', 'EMPEZÓ LA LLUVIA'))}</span><p>${esc(t('Noah got ready in time because he obeyed right away. Try again, a little quicker!', 'Noé estuvo listo a tiempo porque obedeció enseguida. ¡Inténtalo otra vez, un poco más rápido!'))}</p><div class="kg-actions"><button type="button" class="primary" data-ark-again>${esc(t('Try again', 'Intentar otra vez'))}</button></div></div>`;
    }
    const cards = s.deck.map((a, i) => {
      const gone = s.boarded.includes(a), leaving = gone && s.fresh === a, wrong = s.wrong && s.wrong.includes(i);
      return `<button type="button" class="kg-ark-card${gone ? ' gone' : ''}${leaving ? ' leave' : ''}${s.sel === i ? ' sel' : ''}${wrong ? ' wrong' : ''}" data-ark-card="${i}" ${gone ? 'disabled' : ''} aria-label="${esc(name(A().names[a]))}${s.sel === i ? ', ' + esc(t('picked', 'elegido')) : ''}"><span class="kg-ark-face" aria-hidden="true">${gone && !leaving ? '' : A().animals[a]}</span>${gone && !leaving ? '' : `<small aria-hidden="true">${esc(name(A().names[a]))}</small>`}</button>`;
    }).join('');
    return `${scene(s)}${timerHtml(s)}${count}<p class="kg-msg" role="status" aria-live="polite" data-kg-msg>${esc(s.msg || t('Tap an animal, then its partner.', 'Toca un animal y luego su pareja.'))}</p><div class="kg-ark-grid">${cards}</div>`;
  }
  function tick(ui) {
    const s = ui.state;
    if (!s || s.view !== 'play' || s.won || s.lost) { stop(); return; }
    if (document.hidden) return;
    s.left = Math.max(0, s.left - 0.25);
    const screen = document.querySelector('.kg-screen'); if (!screen) { stop(); return; }
    if (s.left <= 0) { s.lost = true; stop(); sound('thud'); buzz([30, 60, 30]); render(); return; }
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
      if (s.boarded.length === A().levels[s.at].pairs.length) {
        s.won = true; stop();
        const lv = A().levels[s.at];
        prog().finish('ark', lv.id); prog().best(`ark:${lv.id}`, C().arkStars(s.left, s.total));
        setTimeout(() => sound('rainbow'), 250); setTimeout(() => sound('win'), 900); buzz([20, 40, 30, 40, 60]);
        render(); award(); celebrate();
        const v = document.querySelector('.kg-ark-lesson'); if (v && v.scrollIntoView) v.scrollIntoView({ block: 'start', behavior: reduced() ? 'auto' : 'smooth' });
        return;
      }
    } else { s.wrong = [s.sel, i]; s.sel = -1; s.streak = 0; s.msg = t('Those two are not a pair. Try again!', 'Esos dos no son pareja. ¡Inténtalo otra vez!'); sound('bad'); buzz([8, 30, 8]); }
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
      const pick = el.closest('[data-ark-pick]'); if (pick) { stop(); begin(s, +pick.dataset.arkPick); sound('pick'); render(); window.scrollTo({ top: 0, behavior: 'auto' }); return; }
      if (el.closest('[data-ark-again]')) { stop(); begin(s, s.at); sound('pick'); render(); window.scrollTo({ top: 0, behavior: 'auto' }); return; }
      if (el.closest('[data-ark-next]')) { stop(); begin(s, s.at + 1); sound('pick'); render(); window.scrollTo({ top: 0, behavior: 'auto' }); }
    }
  });
})();
