/* Who Said It? A Bible quote and three people; pick who said it. A streak
   meter grows with every right answer in a row; the best streak is kept. */
(() => {
  'use strict';
  const K = window.MsbKidGames; if (!K) return;
  const { t, esc, lang, name, sound, buzz, prog, award, render, gameHead, celebrate } = K._helpers;
  const D = () => window.MsbKidGamesData, C = () => window.MsbKidGamesCore;
  const ROUND = 10, METER = 10;

  function start() {
    const order = C().shuffle(D().QUOTES.map((_, i) => i)).slice(0, ROUND);
    return { order, k: 0, streak: 0, right: 0, answered: null, opts: C().choices(D().QUOTES, order[0]), newBest: false };
  }
  function meter(s) {
    const best = Number(prog().get().best.who) || 0;
    const segs = Array.from({ length: METER }, (_, i) => `<i class="${i < s.streak ? 'on' : ''}"></i>`).join('');
    return `<div class="kg-streak" role="img" aria-label="${esc(t('Streak: {n} in a row. Best: {b}', 'Racha: {n} seguidas. Mejor: {b}', { n: s.streak, b: best }))}"><span class="kg-streak-fire${s.streak >= 3 ? ' hot' : ''}" aria-hidden="true">🔥 ${s.streak}</span><span class="kg-streak-bar" aria-hidden="true">${segs}</span><span class="kg-streak-best" aria-hidden="true">${esc(t('Best {b}', 'Mejor {b}', { b: best }))}</span></div>`;
  }
  function playHtml(s) {
    const l = lang();
    if (s.k >= s.order.length) {
      return `${meter(s)}<div class="kg-verse kg-who-end" role="status" aria-live="polite"><span class="eyebrow">${esc(t('ROUND DONE', 'RONDA TERMINADA'))}</span><p class="kg-big">${s.right} / ${s.order.length}</p><p>${esc(s.newBest ? t('New best streak!', '¡Nueva mejor racha!') : s.right >= 8 ? t('You really know who said what!', '¡Sabes muy bien quién dijo qué!') : t('Every round helps you remember.', 'Cada ronda te ayuda a recordar.'))}</p><div class="kg-actions"><button type="button" class="primary" data-who-again>${esc(t('Play again', 'Jugar otra vez'))}</button></div></div>`;
    }
    const q = D().QUOTES[s.order[s.k]];
    const opts = s.opts.map(w => {
      let cls = '';
      if (s.answered) cls = w === q.who ? ' correct' : w === s.answered ? ' incorrect' : '';
      return `<button type="button" class="mini-choice kg-who-choice${cls}" data-who="${esc(w)}" ${s.answered ? 'disabled' : ''}>${esc(name(D().PEOPLE[w]))}</button>`;
    }).join('');
    const fb = s.answered ? `<div class="mini-feedback${s.answered === q.who ? '' : ' incorrect'}" role="status" aria-live="polite"><strong>${esc(s.answered === q.who ? t('Yes! {who} said it.', '¡Sí! Lo dijo {who}.', { who: name(D().PEOPLE[q.who]) }) : t('It was {who}.', 'Fue {who}.', { who: name(D().PEOPLE[q.who]) }))}</strong><p class="kg-who-verse">“${esc(q.verse.text[l])}” <span class="kg-verse-ref">${esc(q.verse.ref[l])} · ${l === 'es' ? 'RV1909' : 'KJV'}</span></p><button type="button" class="primary" data-who-next>${esc(s.k + 1 < s.order.length ? t('Next quote', 'Siguiente cita') : t('See my score', 'Ver mi puntaje'))}</button></div>` : '';
    return `${meter(s)}<p class="kg-sub">${esc(t('Quote {n} of {total}', 'Cita {n} de {total}', { n: s.k + 1, total: s.order.length }))}</p><blockquote class="kg-quote">“${esc(q.quote[l])}”</blockquote><p class="kg-lead">${esc(t('Who said it?', '¿Quién lo dijo?'))}</p><div class="mini-choices">${opts}</div>${fb}`;
  }
  K._helpers.register({
    id: 'who', icon: '💬',
    name: { en: 'Who Said It?', es: '¿Quién lo dijo?' },
    blurb: { en: 'Match each Bible quote to its speaker', es: 'Une cada cita bíblica con quien la dijo' },
    status: v => t('Best streak: {n}', 'Mejor racha: {n}', { n: Number(v.best.who) || 0 }),
    start,
    render(ui) { return gameHead(this) + playHtml(ui.state); },
    click(event, ui) {
      const s = ui.state, el = event.target;
      const b = el.closest('[data-who]');
      if (b && !s.answered) {
        const q = D().QUOTES[s.order[s.k]];
        s.answered = b.dataset.who;
        if (s.answered === q.who) {
          s.streak += 1; s.right += 1; sound('good'); buzz(s.streak >= 5 ? [15, 30, 15] : 15);
          if (prog().best('who', s.streak)) s.newBest = true;
        } else { s.streak = 0; sound('bad'); buzz(10); }
        render(); award();
        const n = document.querySelector('[data-who-next]'); if (n) n.focus();
        return;
      }
      if (el.closest('[data-who-next]')) {
        s.k += 1; s.answered = null;
        if (s.k < s.order.length) s.opts = C().choices(D().QUOTES, s.order[s.k]);
        else { prog().finish('who', 'round'); sound('win'); celebrate(); }
        if (s.k < s.order.length) sound('tap');
        render();
        /* the round is finished: badges and squishy goals (the chariot needs it) */
        if (s.k >= s.order.length) award();
        const f = document.querySelector('.kg-who-choice, [data-who-again]'); if (f) f.focus();
        return;
      }
      if (el.closest('[data-who-again]')) { ui.state = start(); sound('pick'); render(); }
    }
  });
})();
