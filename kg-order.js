/* Story Order: put 5-6 picture cards (the app's story art) in Bible order.
   Drag a card by its handle, or use the up/down buttons; then check. */
(() => {
  'use strict';
  const K = window.MsbKidGames; if (!K) return;
  const { t, esc, name, sound, buzz, prog, award, render, verseHtml, gameHead, reduced, celebrate } = K._helpers;
  const D = () => window.MsbKidGamesData, C = () => window.MsbKidGamesCore;
  const sets = () => D().ORDER;
  const STORY_ART_V2 = ['creation', 'noah', 'stars', 'joseph', 'moses', 'david', 'daniel', 'jonah', 'nativity', 'storm', 'children', 'feeding', 'sheep', 'easter'];
  const pic = id => `img/stories/${STORY_ART_V2.includes(id) ? id + '-v2' : id}-512.webp`;

  function start() { return { view: 'pick', at: 0, cards: [], marks: null, tries: 0, won: false, msg: '' }; }
  function begin(s, i) { const set = sets()[i]; s.view = 'play'; s.at = i; s.cards = C().scramble(set.cards); s.marks = null; s.tries = 0; s.won = false; s.msg = ''; }
  function pickHtml() {
    const done = prog().done('order');
    return `<p class="kg-lead">${esc(t('Put the Bible pictures in the order they happened.', 'Pon los dibujos bíblicos en el orden en que pasaron.'))}</p><ul class="kg-picks">${sets().map((x, i) => `<li><button type="button" class="card kg-pick${done.includes(x.id) ? ' done' : ''}" data-or-pick="${i}"><img class="kg-pick-img" src="${pic(x.cards[0])}" alt="" width="56" height="56" loading="lazy" decoding="async"><span><strong>${esc(name(x.title))}</strong><small>${esc(done.includes(x.id) ? t('In order ✓', 'En orden ✓') : t('{n} pictures', '{n} dibujos', { n: x.cards.length }))}</small></span></button></li>`).join('')}</ul>`;
  }
  function playHtml(s) {
    const set = sets()[s.at], P = D().PICTURES, n = s.cards.length;
    const rows = s.cards.map((id, i) => {
      const mark = s.marks ? (s.marks[i] ? ' right' : ' wrong') : '';
      return `<li class="kg-or-card${mark}" data-or-card="${i}"><span class="kg-or-num" aria-hidden="true">${i + 1}</span><img src="${pic(id)}" alt="" width="64" height="64" draggable="false" decoding="async"><span class="kg-or-cap">${esc(name(P[id]))}${s.marks ? `<span class="kg-or-mark" aria-hidden="true">${s.marks[i] ? '✓' : '↕'}</span>` : ''}</span><span class="kg-or-btns">${s.won ? '' : `<button type="button" class="kg-or-move" data-or-up="${i}" ${i === 0 ? 'disabled' : ''} aria-label="${esc(t('Move {x} up', 'Subir {x}', { x: name(P[id]) }))}">▲</button><button type="button" class="kg-or-move" data-or-down="${i}" ${i === n - 1 ? 'disabled' : ''} aria-label="${esc(t('Move {x} down', 'Bajar {x}', { x: name(P[id]) }))}">▼</button>`}</span>${s.won ? '' : `<span class="kg-or-grip" data-or-grip="${i}" aria-hidden="true">⠿</span>`}</li>`;
    }).join('');
    return `<p class="kg-sub">${esc(name(set.title))}</p><p class="small muted kg-help">${esc(t('First at the top. Drag ⠿ or use ▲ ▼.', 'Lo primero arriba. Arrastra ⠿ o usa ▲ ▼.'))}</p><ol class="kg-or-list" data-or-list>${rows}</ol><p class="kg-msg" role="status" aria-live="polite" data-kg-msg>${esc(s.msg)}</p>${s.won ? verseHtml(set.verse, t('PERFECT ORDER!', '¡ORDEN PERFECTO!'), `<button type="button" class="primary" data-or-next>${esc(s.at + 1 < sets().length ? t('Next story set', 'Siguiente grupo') : t('All story sets', 'Todos los grupos'))}</button><button type="button" class="secondary" data-or-list-back>${esc(t('Pick another', 'Escoger otro'))}</button>`) : `<div class="kg-actions"><button type="button" class="primary" data-or-check>${esc(t('Check my order', 'Revisar mi orden'))}</button></div>`}`;
  }
  function check(ui) {
    const s = ui.state, set = sets()[s.at];
    s.tries += 1;
    s.marks = C().orderMarks(s.cards, set.cards);
    const right = s.marks.filter(Boolean).length;
    if (C().isOrdered(s.cards, set.cards)) {
      s.won = true; s.msg = s.tries === 1 ? t('First try! Wonderful!', '¡A la primera! ¡Muy bien!') : t('All in order!', '¡Todo en orden!');
      prog().finish('order', set.id); sound('win'); celebrate(); buzz([20, 40, 30]); render(); award();
      const v = document.querySelector('.kg-verse'); if (v && v.scrollIntoView) v.scrollIntoView({ block: 'center', behavior: reduced() ? 'auto' : 'smooth' });
      return;
    }
    s.msg = t('{n} of {total} are in the right place. Move the ↕ ones.', '{n} de {total} están en su lugar. Mueve los ↕.', { n: right, total: s.cards.length });
    sound('bad'); buzz(8); render();
  }
  function move(ui, from, to, focusSel) {
    const s = ui.state;
    if (to < 0 || to >= s.cards.length || from === to) return;
    s.cards = C().moveItem(s.cards, from, to); s.marks = null; s.msg = '';
    sound('tap'); buzz(6); render();
    if (focusSel) { const b = document.querySelector(focusSel(to)); if (b && !b.disabled) b.focus(); }
  }
  /* Drag: hold the grip and slide up or down; the card follows the finger
     and drops where it is let go. */
  function mount(screen, ui) {
    const list = screen.querySelector('[data-or-list]');
    if (!list || ui.state.won) return;
    let d = null;
    list.addEventListener('pointerdown', e => {
      const g = e.target.closest('[data-or-grip]'); if (!g) return;
      e.preventDefault();
      const li = g.closest('[data-or-card]'), r = li.getBoundingClientRect();
      d = { from: +g.dataset.orGrip, li, id: e.pointerId, y0: e.clientY, h: r.height + 8, to: +g.dataset.orGrip };
      li.classList.add('dragging');
      try { list.setPointerCapture(e.pointerId); } catch { /* ignore */ }
      sound('pick');
    });
    list.addEventListener('pointermove', e => {
      if (!d || e.pointerId !== d.id) return;
      const dy = e.clientY - d.y0;
      d.li.style.transform = `translateY(${dy}px)`;
      const n = ui.state.cards.length;
      const to = Math.max(0, Math.min(n - 1, d.from + Math.round(dy / d.h)));
      if (to !== d.to) { d.to = to; buzz(4); list.querySelectorAll('[data-or-card]').forEach(el => el.classList.toggle('drop-here', +el.dataset.orCard === to && to !== d.from)); }
    });
    const end = e => {
      if (!d || e.pointerId !== d.id) return;
      const x = d; d = null;
      x.li.style.transform = ''; x.li.classList.remove('dragging');
      if (x.to !== x.from) move(ui, x.from, x.to);
      else list.querySelectorAll('.drop-here').forEach(el => el.classList.remove('drop-here'));
    };
    list.addEventListener('pointerup', end);
    list.addEventListener('pointercancel', end);
  }
  K._helpers.register({
    id: 'order', icon: '🖼️',
    name: { en: 'Story Order', es: 'Ordena la historia' },
    blurb: { en: 'Put the Bible pictures in order', es: 'Pon los dibujos bíblicos en orden' },
    total: () => sets().length,
    start,
    render(ui) { return gameHead(this) + (ui.state.view === 'play' ? playHtml(ui.state) : pickHtml()); },
    mount,
    click(event, ui) {
      const s = ui.state, el = event.target;
      const pick = el.closest('[data-or-pick]');
      if (pick) { begin(s, +pick.dataset.orPick); sound('pick'); render(); window.scrollTo({ top: 0, behavior: 'auto' }); return; }
      const up = el.closest('[data-or-up]'); if (up) { const i = +up.dataset.orUp; move(ui, i, i - 1, k => `[data-or-up="${k}"]`); return; }
      const dn = el.closest('[data-or-down]'); if (dn) { const i = +dn.dataset.orDown; move(ui, i, i + 1, k => `[data-or-down="${k}"]`); return; }
      if (el.closest('[data-or-check]')) { check(ui); return; }
      if (el.closest('[data-or-next]')) { if (s.at + 1 < sets().length) begin(s, s.at + 1); else s.view = 'pick'; sound('pick'); render(); window.scrollTo({ top: 0, behavior: 'auto' }); return; }
      if (el.closest('[data-or-list-back]')) { s.view = 'pick'; sound('tap'); render(); window.scrollTo({ top: 0, behavior: 'auto' }); }
    }
  });
})();
