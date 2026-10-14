/* Ark Builder: load the animals into the ark two by two before the rain
   timer runs out. Tap an animal, then its partner. A short obedience lesson
   and a verse close each level. The timer pauses when the app is hidden. */
(() => {
  'use strict';
  const K = window.MsbKidGames; if (!K) return;
  const { t, esc, lang, name, sound, buzz, prog, award, render, verseHtml, gameHead, reduced } = K._helpers;
  const D = () => window.MsbKidGamesData, C = () => window.MsbKidGamesCore;
  const A = () => D().ARK;
  let timer = 0;
  const stop = () => { if (timer) clearInterval(timer); timer = 0; };

  function start() { return { view: 'pick', at: 0 }; }
  function begin(s, i) {
    const lv = A().levels[i];
    Object.assign(s, { view: 'play', at: i, deck: C().arkDeck(lv.pairs), boarded: [], sel: -1, left: lv.seconds, total: lv.seconds, won: false, lost: false, msg: '' });
  }
  const starRow = n => `<span class="kg-stars" aria-label="${esc(t('{n} of 3 stars', '{n} de 3 estrellas', { n }))}">${[1, 2, 3].map(k => `<i class="${k <= n ? 'on' : ''}" aria-hidden="true">★</i>`).join('')}</span>`;
  function pickHtml() {
    const v = prog().get();
    const lv = A().levels.map((x, i) => { const st = Number(v.best[`ark:${x.id}`]) || 0; const open = i === 0 || (v.done.ark || []).includes(A().levels[i - 1].id); return `<li><button type="button" class="card kg-pick${st ? ' done' : ''}" ${open ? `data-ark-pick="${i}"` : 'disabled'}><span class="kg-pick-icon" aria-hidden="true">${open ? x.pairs.slice(0, 2).map(a => A().animals[a]).join('') : '🔒'}</span><span><strong>${esc(t('Level {n}', 'Nivel {n}', { n: i + 1 }))}</strong><small>${esc(open ? t('{p} pairs · {s} seconds', '{p} parejas · {s} segundos', { p: x.pairs.length, s: x.seconds }) : t('Finish level {n} first', 'Termina primero el nivel {n}', { n: i }))}</small>${st ? starRow(st) : ''}</span></button></li>`; }).join('');
    return `<p class="kg-lead">${esc(t('The rain is coming! Help Noah bring the animals into the ark, two by two.', '¡Ya viene la lluvia! Ayuda a Noé a meter a los animales en el arca, de dos en dos.'))}</p><ul class="kg-picks">${lv}</ul>`;
  }
  function clouds(s) {
    const f = s.left / s.total;
    return `<div class="kg-ark-sky${f < 0.3 ? ' storm' : f < 0.6 ? ' grey' : ''}" aria-hidden="true"><span class="kg-ark-cloud">☁️</span><span class="kg-ark-cloud c2">☁️</span>${f < 0.3 && !reduced() ? '<span class="kg-rain"></span>' : ''}</div>`;
  }
  function timerHtml(s) {
    const pct = Math.max(0, Math.round(s.left / s.total * 100));
    return `<div class="kg-ark-timer" role="timer" aria-label="${esc(t('{n} seconds until the rain', '{n} segundos para la lluvia', { n: Math.ceil(s.left) }))}"><span aria-hidden="true">🌧️</span><span class="kg-ark-bar"><i style="width:${pct}%" class="${pct < 30 ? 'low' : ''}"></i></span><b>${Math.ceil(s.left)}s</b></div>`;
  }
  function playHtml(s) {
    const lv = A().levels[s.at], l = lang();
    const pairs = lv.pairs.length, inside = s.boarded.length;
    const ark = `<div class="kg-ark-boat" aria-label="${esc(t('In the ark: {n} of {total} pairs', 'En el arca: {n} de {total} parejas', { n: inside, total: pairs }))}"><span class="kg-ark-hull" aria-hidden="true">🛶</span><span class="kg-ark-in" aria-hidden="true">${s.boarded.map(a => A().animals[a] + A().animals[a]).join(' ')}</span><b>${inside}/${pairs}</b></div>`;
    if (s.won) {
      const n = C().arkStars(s.left, s.total);
      return `${ark}<div class="kg-ark-lesson"><span class="eyebrow">${esc(t('NOAH OBEYED', 'NOÉ OBEDECIÓ'))}</span><p>${esc(A().lesson[l])}</p></div>${verseHtml(lv.verse, t('ALL ABOARD!', '¡TODOS A BORDO!'), `${starRow(n)}${s.at + 1 < A().levels.length ? `<button type="button" class="primary" data-ark-next>${esc(t('Next level', 'Siguiente nivel'))}</button>` : ''}<button type="button" class="secondary" data-ark-again>${esc(t('Play again', 'Jugar otra vez'))}</button>`)}`;
    }
    if (s.lost) {
      return `${clouds(s)}${ark}<div class="kg-verse" role="status" aria-live="polite"><span class="eyebrow">${esc(t('THE RAIN STARTED', 'EMPEZÓ LA LLUVIA'))}</span><p>${esc(t('Noah got ready in time because he obeyed right away. Try again, a little quicker!', 'Noé estuvo listo a tiempo porque obedeció enseguida. ¡Inténtalo otra vez, un poco más rápido!'))}</p><div class="kg-actions"><button type="button" class="primary" data-ark-again>${esc(t('Try again', 'Intentar otra vez'))}</button></div></div>`;
    }
    const cards = s.deck.map((a, i) => {
      const gone = s.boarded.includes(a);
      return `<button type="button" class="kg-ark-card${gone ? ' gone' : ''}${s.sel === i ? ' sel' : ''}" data-ark-card="${i}" ${gone ? 'disabled' : ''} aria-label="${esc(name(A().names[a]))}${s.sel === i ? ', ' + esc(t('picked', 'elegido')) : ''}"><span aria-hidden="true">${gone ? '' : A().animals[a]}</span></button>`;
    }).join('');
    return `${clouds(s)}${timerHtml(s)}${ark}<p class="kg-msg" role="status" aria-live="polite" data-kg-msg>${esc(s.msg || t('Tap an animal, then its partner.', 'Toca un animal y luego su pareja.'))}</p><div class="kg-ark-grid">${cards}</div>`;
  }
  function tick(ui) {
    const s = ui.state;
    if (!s || s.view !== 'play' || s.won || s.lost) { stop(); return; }
    if (document.hidden) return;
    s.left = Math.max(0, s.left - 0.25);
    const screen = document.querySelector('.kg-screen'); if (!screen) { stop(); return; }
    if (s.left <= 0) { s.lost = true; stop(); sound('thud'); buzz([30, 60, 30]); render(); return; }
    const tm = screen.querySelector('.kg-ark-timer'); if (tm) tm.outerHTML = timerHtml(s);
    const sky = screen.querySelector('.kg-ark-sky'), next = clouds(s);
    if (sky && sky.outerHTML.split('>')[0] !== next.split('>')[0]) sky.outerHTML = next;
  }
  function mount(screen, ui) {
    const s = ui.state;
    if (s.view === 'play' && !s.won && !s.lost && !timer) timer = setInterval(() => tick(ui), 250);
  }
  function tapCard(ui, i) {
    const s = ui.state, a = s.deck[i];
    if (s.won || s.lost || s.boarded.includes(a)) return;
    if (s.sel === i) { s.sel = -1; sound('tap'); render(); return; }
    if (s.sel < 0) { s.sel = i; sound('pick'); buzz(6); s.msg = t('Now find the other {a}.', 'Ahora busca la pareja: {a}.', { a: name(A().names[a]) }); render(); focusCard(i); return; }
    const b = s.deck[s.sel];
    if (a === b) {
      s.boarded.push(a); s.sel = -1; s.msg = t('Two {a} went into the ark!', '¡Dos {a} entraron al arca!', { a: name(A().names[a]) });
      sound('good'); buzz(18);
      if (s.boarded.length === A().levels[s.at].pairs.length) {
        s.won = true; stop();
        const lv = A().levels[s.at];
        prog().finish('ark', lv.id); prog().best(`ark:${lv.id}`, C().arkStars(s.left, s.total));
        setTimeout(() => sound('win'), 200); buzz([20, 40, 30]);
        render(); award();
        const v = document.querySelector('.kg-ark-lesson'); if (v && v.scrollIntoView) v.scrollIntoView({ block: 'start', behavior: reduced() ? 'auto' : 'smooth' });
        return;
      }
    } else { s.sel = -1; s.msg = t('Those two are not a pair. Try again!', 'Esos dos no son pareja. ¡Inténtalo otra vez!'); sound('bad'); buzz(8); }
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
