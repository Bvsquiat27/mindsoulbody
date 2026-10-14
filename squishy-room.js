/* Squishy Trade Room ("Sala de intercambio"): a live board for two friends.
   Top row: your friend's ✕ / + / ✓ (shows what they did). Middle: their
   offer, then yours. Bottom row: your ✓ / + / ✕.
   The trade finishes only when both press ✓ on the same board; any change
   clears both checks (the server enforces it). A legendary needs at least 5
   squishies back, and its owner may ask for more. The lamp is never traded.
   The room is live from the first tap: the board and your squishies show at
   once, you pick any friend and send the request with your side already
   filled, and your friend's first move opens the room. The board asks the
   server for news every 1.5 s only while it is open and the page is
   visible, then stops. Text is EN/ES here (data-i18n-skip). */
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.MsbSquishyRoom = api;
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';
  const POLL_MS = 1500, LIST_MS = 6000, LEGEND_MIN = 5, NEED_MAX = 12, OFFER_MAX = 12;
  /* one list for the whole app: squishy-trade.js (loaded first) owns it */
  const TRADE = typeof module === 'object' && module.exports ? require('./squishy-trade.js') : (typeof self !== 'undefined' ? self : this).MsbSquishyTrade;
  const LEGENDARY = TRADE.LEGENDARY;
  const W = () => (typeof window !== 'undefined' ? window : {});
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
  const fmt = (s, v) => String(s).replace(/\{(\w+)\}/g, (_, k) => (v && v[k] != null ? v[k] : ''));

  /* What the board shows, from a trade as the server returns it. */
  function model(t, squishies) {
    const me = t.me, other = t.other;
    const mine = (t.offers && t.offers[me]) || [], theirs = (t.offers && t.offers[other]) || [];
    const isLegend = id => LEGENDARY.includes(id);
    const theirLegend = theirs.some(isLegend), myLegend = mine.some(isLegend);
    const wantFromMe = (t.want && t.want[me]) || 0, wantFromThem = (t.want && t.want[other]) || 0;
    const myCheck = !!(t.checks && t.checks[me] === t.rev), theirCheck = !!(t.checks && t.checks[other] === t.rev);
    const open = t.status === 'open', editable = open || t.status === 'requested';
    const short = theirs.length ? Math.max(0, wantFromMe - mine.length) : 0;
    return {
      me, other, mine, theirs, theirLegend, myLegend, wantFromMe, wantFromThem, myCheck, theirCheck, open, editable, short,
      myNeed: (t.need && t.need[me]) || 0, theirNeed: (t.need && t.need[other]) || 0,
      ready: !!t.ready, canConfirm: open && !!t.ready && !myCheck,
      theirShort: mine.length ? Math.max(0, wantFromThem - theirs.length) : 0,
      done: t.status === 'done', over: ['done', 'declined', 'cancelled', 'expired'].includes(t.status),
      known: id => squishies.some(x => x.id === id),
    };
  }

  /* squishies you can put on the board: open on this phone, not a starter, never the lamp */
  function tradableMine(storage, squishies, core) {
    const open = core.progress(storage, squishies).unlocked();
    return squishies.filter(x => x.locked && x.id !== 'lamp' && open.includes(x.id)).map(x => x.id);
  }

  /* ---------- the picture: quilt frame, dove, olive branch, cross, lilies ---------- */
  const SPARK = (x, y, r, c) => `<path d="M${x} ${y - r}L${x + r * 0.28} ${y - r * 0.28}L${x + r} ${y}L${x + r * 0.28} ${y + r * 0.28}L${x} ${y + r}L${x - r * 0.28} ${y + r * 0.28}L${x - r} ${y}L${x - r * 0.28} ${y - r * 0.28}Z" fill="${c}"/>`;
  const LILY = (x, y, s) => `<g transform="translate(${x} ${y}) scale(${s})"><path d="M0 0C-6-4-8-12-3-17C-1-12 0-8 0 0Z" fill="#fff7ef"/><path d="M0 0C6-4 8-12 3-17C1-12 0-8 0 0Z" fill="#fff7ef"/><path d="M0 0C-2-7 0-15 0-19C1-15 2-7 0 0Z" fill="#fde9d9"/><circle cx="0" cy="-3" r="1.6" fill="#f2b84b"/><path d="M0 0V9" stroke="#7aa874" stroke-width="1.6"/></g>`;
  const DOVE = `<svg class="sr-dove" viewBox="0 0 64 40" aria-hidden="true"><path d="M8 24C16 14 26 12 34 16C38 9 46 6 52 8C47 11 45 15 46 19C52 19 58 21 60 25C52 26 46 28 40 30C30 34 18 32 8 24Z" fill="#fffdf8" stroke="#c9b48a" stroke-width="1.2"/><path d="M34 16C30 20 30 25 33 28" fill="none" stroke="#c9b48a" stroke-width="1.2"/><circle cx="50" cy="12" r="1.3" fill="#5b4a3a"/><path d="M53 12L58 13L53 14Z" fill="#f2b84b"/><path d="M57 13C60 16 62 18 63 22" stroke="#6f9a5f" stroke-width="1.4" fill="none"/><ellipse cx="61" cy="17" rx="2.2" ry="1.1" fill="#8db47b" transform="rotate(40 61 17)"/><ellipse cx="62.5" cy="20.5" rx="2.2" ry="1.1" fill="#8db47b" transform="rotate(60 62.5 20.5)"/></svg>`;
  const CROSS = '<svg class="sr-cross" viewBox="0 0 16 22" aria-hidden="true"><path d="M6 1H10V7H15V11H10V21H6V11H1V7H6Z" fill="#e7c36a" stroke="#b8923f" stroke-width="1"/></svg>';
  const corners = `<svg class="sr-deco" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">${SPARK(9, 9, 2.4, '#f2c75c')}${SPARK(92, 12, 1.8, '#fff')}${SPARK(6, 52, 1.6, '#f2c75c')}${SPARK(95, 60, 2, '#f2c75c')}${SPARK(10, 92, 1.8, '#fff')}${SPARK(90, 90, 2.4, '#f2c75c')}</svg>`;
  const flowers = `<svg class="sr-flowers" viewBox="0 0 360 40" aria-hidden="true">${LILY(14, 30, 1)}${LILY(346, 30, 1)}${SPARK(40, 14, 4, '#f2c75c')}${SPARK(320, 14, 4, '#f2c75c')}</svg>`;

  /* ---------- the screen ---------- */
  const ui = { root: null, trade: null, opts: null, timer: null, listTimer: null, busy: false, msg: '', picking: false, applied: false, withCode: null, draft: [], list: [] };

  function L() { return ui.opts && ui.opts.lang === 'es'; }
  function T(en, es, v) { return fmt(L() ? es : en, v); }
  const D = () => W().MsbSquishyData, C = () => W().MsbSquishyCore, A = () => W().MsbSquishyArt;
  const nameOf = id => { const x = D() && D().SQUISHIES.find(s => s.id === id); return x ? x.name[L() ? 'es' : 'en'] : id; };

  function tile(id, mineSide, m) {
    const leg = LEGENDARY.includes(id);
    const art = A() ? A().svg(id) : '';
    const inner = `<span class="sr-art" aria-hidden="true">${art}</span><span class="sr-name">${esc(nameOf(id))}</span>${leg ? `<span class="sr-leg">${esc(T('Legendary', 'Legendario'))}</span>` : ''}`;
    if (mineSide && m.editable) return `<button type="button" class="sr-tile${leg ? ' legend' : ''}" data-sr-remove="${esc(id)}" aria-label="${esc(T('Take {name} off the board', 'Quitar {name} del tablero', { name: nameOf(id) }))}">${inner}</button>`;
    return `<div class="sr-tile${leg ? ' legend' : ''}">${inner}</div>`;
  }

  function statusLine(m, t) {
    const friend = (t.names && t.names[m.other]) || T('Your friend', 'Tu amigo');
    if (t.status === 'requested') return t.from === m.me ? T('Request sent! {name} sees your board now. You can still change your side.', '¡Solicitud enviada! {name} ya ve tu tablero. Aún puedes cambiar tu lado.', { name: friend }) : T('{name} wants to trade squishies. Pick yours below to join.', '{name} quiere cambiar squishies. Elige los tuyos abajo para unirte.', { name: friend });
    if (t.status === 'done') return T('Trade complete! Enjoy your new squishies.', '¡Cambio hecho! Disfruta tus nuevos squishies.');
    if (t.status === 'declined') return T('The trade was declined.', 'El cambio fue rechazado.');
    if (t.status === 'cancelled') return T('The trade was called off.', 'El cambio se canceló.');
    if (t.status === 'expired') return T('This room closed. You can start a new trade.', 'Esta sala se cerró. Puedes empezar otro cambio.');
    if (m.theirLegend && m.short) return T('{name} offers a legendary: add {n} more (at least {want} in all).', '{name} ofrece un legendario: añade {n} más (al menos {want} en total).', { name: friend, n: m.short, want: m.wantFromMe });
    if (m.myLegend && m.theirShort) return T('Your legendary needs {want} squishies back. {name} has {have}.', 'Tu legendario pide {want} squishies a cambio. {name} tiene {have}.', { want: m.wantFromThem, name: friend, have: m.theirs.length });
    if (t.note && t.note.kind === 'more' && t.note.by === m.other) return T('{name} asks for more squishies.', '{name} pide más squishies.', { name: friend });
    if (!m.mine.length || !m.theirs.length) return T('Both sides add at least one squishy with +.', 'Cada lado añade al menos un squishy con +.');
    if (m.myCheck && !m.theirCheck) return T('You pressed ✓. Waiting for {name}…', 'Pulsaste ✓. Esperando a {name}…', { name: friend });
    if (m.theirCheck && !m.myCheck) return T('{name} pressed ✓. Press ✓ to agree.', '{name} pulsó ✓. Pulsa ✓ para aceptar.', { name: friend });
    return T('Looks fair? Both press ✓ to swap.', '¿Te parece justo? Los dos pulsan ✓ para cambiar.');
  }

  function html() {
    const t = ui.trade, m = model(t, D().SQUISHIES);
    const friend = (t.names && t.names[m.other]) || T('Friend', 'Amigo');
    const theirRow = `<div class="sr-row sr-row-them" aria-label="${esc(T('What {name} did', 'Lo que hizo {name}', { name: friend }))}"><span class="sr-sym x${t.note && t.note.kind !== 'more' && t.note.by === m.other ? ' lit' : ''}" aria-hidden="true">✕</span><span class="sr-sym plus${t.note && t.note.kind === 'more' && t.note.by === m.other ? ' lit' : ''}" aria-hidden="true">+</span><span class="sr-sym ok${m.theirCheck ? ' lit' : ''}" role="img" aria-label="${esc(m.theirCheck ? T('{name} pressed ✓', '{name} pulsó ✓', { name: friend }) : T('{name} has not pressed ✓', '{name} no ha pulsado ✓', { name: friend }))}">✓</span></div>`;
    const half = (ids, mineSide) => `<div class="sr-half ${mineSide ? 'mine' : 'theirs'}"><span class="sr-half-label">${esc(mineSide ? T('Your offer', 'Tu oferta') : T('{name}’s offer', 'Oferta de {name}', { name: friend }))} · ${ids.length}</span><div class="sr-tiles">${ids.length ? ids.map(id => tile(id, mineSide, m)).join('') : `<span class="sr-empty">${esc(mineSide ? T('Press + to add squishies', 'Pulsa + para añadir squishies') : T('Nothing yet', 'Nada todavía'))}</span>`}</div></div>`;
    const need = m.myLegend && m.editable ? `<div class="sr-need"><span>${esc(T('I want at least', 'Pido al menos'))}</span><button type="button" class="sr-step" data-sr-need="-1" aria-label="${esc(T('Fewer', 'Menos'))}" ${Math.max(LEGEND_MIN, m.myNeed) <= LEGEND_MIN ? 'disabled' : ''}>−</button><strong data-sr-need-value>${Math.max(LEGEND_MIN, m.myNeed)}</strong><button type="button" class="sr-step" data-sr-need="1" aria-label="${esc(T('More', 'Más'))}" ${m.myNeed >= NEED_MAX ? 'disabled' : ''}>+</button></div>` : '';
    const ask = m.open ? `<button type="button" class="sr-ask" data-sr-ask>${esc(T('Ask for more', 'Pedir más'))}</button>` : '';
    const myRow = m.open
      ? `<div class="sr-row sr-row-me"><button type="button" class="sr-sym ok${m.myCheck ? ' lit' : ''}" data-sr-ok ${m.canConfirm ? '' : 'disabled'} aria-label="${esc(T('Agree to this trade', 'Aceptar este cambio'))}">✓</button><button type="button" class="sr-sym plus" data-sr-add aria-label="${esc(T('Add squishies', 'Añadir squishies'))}">+</button><button type="button" class="sr-sym x" data-sr-leave aria-label="${esc(T('Back out', 'Salir del cambio'))}">✕</button></div>`
      : t.status === 'requested' && t.to === m.me
        ? `<div class="sr-row sr-row-me"><button type="button" class="primary" data-sr-accept>${esc(T('Join the room', 'Entrar a la sala'))}</button><button type="button" class="secondary" data-sr-leave>${esc(T('No thanks', 'No, gracias'))}</button></div>`
        : t.status === 'requested' ? `<div class="sr-row sr-row-me"><button type="button" class="secondary" data-sr-leave>${esc(T('Cancel request', 'Cancelar solicitud'))}</button></div>` : '';
    const done = m.done && t.result && t.result[m.me] ? `<div class="sr-done" role="status"><strong>${esc(T('You got', 'Recibiste'))}</strong><div class="sr-tiles">${t.result[m.me].get.map(id => tile(id, false, m)).join('')}</div></div>` : '';
    const picker = m.editable ? pickerHtml(m.mine) : '';
    return `<div class="sq-room" data-i18n-skip>
      ${backBtn()}
      <div class="sr-board${m.done ? ' is-done' : ''}">
        ${corners}
        <div class="sr-oval top">${DOVE}<span>${esc(friend)}</span></div>
        <div class="sr-panel">
          ${theirRow}
          ${half(m.theirs, false)}
          ${half(m.mine, true)}
          ${need}
          ${myRow}
          ${flowers}
        </div>
        <div class="sr-oval bottom">${CROSS}<span>${esc(T('Trade Room', 'Sala de intercambio'))}</span>${CROSS}</div>
      </div>
      <p class="sr-status" role="status" aria-live="polite" data-sr-status>${esc(ui.msg || statusLine(m, t))}</p>
      ${ask}${done}${picker}${m.over ? `<p class="sr-again"><button type="button" class="primary" data-sr-new>${esc(T('Start a new trade', 'Empezar otro cambio'))}</button></p>` : ''}
      ${rulesHtml()}
    </div>`;
  }
  const rulesHtml = () => `<p class="small muted sr-rules">${esc(T('A legendary (burning bush, empty tomb, chariot, tablets) needs at least 5 squishies back. The lamp is never traded. Changing the board clears both ✓. A squishy you trade away can be won back by playing.', 'Un legendario (zarza ardiente, tumba vacía, carro, tablas) pide al menos 5 squishies a cambio. La lámpara nunca se cambia. Cambiar el tablero borra los dos ✓. Un squishy que cambias se puede volver a ganar jugando.'))}</p>`;
  const backBtn = () => (ui.opts && ui.opts.onBack ? `<button class="text-button back" type="button" data-sr-back>${esc(ui.opts.backLabel || T('← Friends', '← Amigos'))}</button>` : '');

  /* ---------- the lobby: the board right away, pick any friend, send ---------- */
  function lobbyHtml() {
    const friends = (ui.opts.friends || []).filter(f => f && f.code);
    const pick = friends.find(f => f.code === ui.withCode);
    const live = ui.list.filter(t => t && (t.status === 'requested' || t.status === 'open'));
    const rows = live.map(t => {
      const n = (t.names && t.names[t.other]) || T('Friend', 'Amigo');
      const label = t.status === 'requested' && t.to === t.me ? T('{name} wants to trade!', '¡{name} quiere cambiar!', { name: n }) : t.status === 'open' ? T('Room open with {name}', 'Sala abierta con {name}', { name: n }) : T('Waiting for {name}', 'Esperando a {name}', { name: n });
      return `<li><span>${esc(label)}</span><button type="button" class="secondary" data-sr-resume="${esc(t.id)}">${esc(T('Open', 'Abrir'))}</button></li>`;
    }).join('');
    const chips = friends.length ? `<div class="sr-friends" role="group" aria-label="${esc(T('Trade with', 'Cambiar con'))}">${friends.map(f => `<button type="button" class="sr-friend${f.code === ui.withCode ? ' on' : ''}" data-sr-friend="${esc(f.code)}" aria-pressed="${f.code === ui.withCode}">${esc(f.name || T('Friend', 'Amigo'))}</button>`).join('')}</div>`
      : `<p class="sr-nofriends">${esc(ui.opts.ready === false ? T('Get your friend code on the Friends screen to trade.', 'Consigue tu código de amigo en la pantalla de Amigos para cambiar.') : T('Add a friend to trade with.', 'Añade un amigo para cambiar.'))} ${ui.opts.onFriends ? `<button type="button" class="secondary" data-sr-friends>${esc(T('Friends', 'Amigos'))}</button>` : ''}</p>`;
    const friendName = pick ? pick.name || T('Friend', 'Amigo') : T('Choose a friend', 'Elige un amigo');
    const theirs = `<div class="sr-half theirs"><span class="sr-half-label">${esc(pick ? T('{name}’s offer', 'Oferta de {name}', { name: friendName }) : T('Your friend’s offer', 'Oferta de tu amigo'))} · 0</span><div class="sr-tiles"><span class="sr-empty">${esc(pick ? T('{name} adds theirs after your request', '{name} añade los suyos después de tu solicitud', { name: friendName }) : T('Choose a friend above', 'Elige un amigo arriba'))}</span></div></div>`;
    const mine = `<div class="sr-half mine"><span class="sr-half-label">${esc(T('Your offer', 'Tu oferta'))} · ${ui.draft.length}</span><div class="sr-tiles">${ui.draft.length ? ui.draft.map(id => tile(id, true, { editable: true })).join('') : `<span class="sr-empty">${esc(T('Tap your squishies below', 'Toca tus squishies abajo'))}</span>`}</div></div>`;
    const send = `<div class="sr-row sr-row-me"><button type="button" class="primary" data-sr-send ${pick && !ui.busy ? '' : 'disabled'}>${esc(pick ? T('Send request to {name}', 'Enviar solicitud a {name}', { name: friendName }) : T('Send request', 'Enviar solicitud'))}</button></div>`;
    return `<div class="sq-room is-lobby" data-i18n-skip>
      ${backBtn()}
      ${rows ? `<section class="sr-list sr-inbox"><ul>${rows}</ul></section>` : ''}
      ${chips}
      <div class="sr-board">
        ${corners}
        <div class="sr-oval top">${DOVE}<span>${esc(friendName)}</span></div>
        <div class="sr-panel">${theirs}${mine}${send}${flowers}</div>
        <div class="sr-oval bottom">${CROSS}<span>${esc(T('Trade Room', 'Sala de intercambio'))}</span>${CROSS}</div>
      </div>
      <p class="sr-status" role="status" aria-live="polite" data-sr-status>${esc(ui.msg || (pick ? T('Add squishies, then send. {name} sees the board at once.', 'Añade squishies y envía. {name} verá el tablero enseguida.', { name: friendName }) : T('Pick a friend and your squishies.', 'Elige un amigo y tus squishies.')))}</p>
      ${pickerHtml(ui.draft)}
      ${rulesHtml()}
    </div>`;
  }

  function pickerHtml(chosen) {
    const ids = tradableMine(ui.opts.storage, D().SQUISHIES, C());
    const body = ids.length ? ids.map(id => { const on = chosen.includes(id); return `<button type="button" class="sr-tile pick${on ? ' on' : ''}${LEGENDARY.includes(id) ? ' legend' : ''}" data-sr-pick="${esc(id)}" aria-pressed="${on}"><span class="sr-art" aria-hidden="true">${A() ? A().svg(id) : ''}</span><span class="sr-name">${esc(nameOf(id))}</span>${LEGENDARY.includes(id) ? `<span class="sr-leg">${esc(T('Legendary', 'Legendario'))}</span>` : ''}</button>`; }).join('') : `<p class="muted">${esc(T('Unlock squishies in the games to trade them.', 'Desbloquea squishies en los juegos para cambiarlos.'))}</p>`;
    return `<section class="sr-picker" data-sr-picker aria-label="${esc(T('Choose squishies to offer', 'Elige squishies para ofrecer'))}"><div class="sr-picker-head"><strong>${esc(T('Your squishies: tap to add or take off', 'Tus squishies: toca para poner o quitar'))}</strong></div><div class="sr-tiles">${body}</div></section>`;
  }


  function render() {
    if (!ui.root || !ui.opts) return;
    ui.root.innerHTML = ui.trade ? html() : lobbyHtml();
    if (ui.trade && ui.trade.status === 'done') applyDone();
  }

  /* the swap reached this phone: apply it once (the server also keeps it until acked) */
  function applyDone() {
    if (ui.applied) return;
    const t = ui.trade, r = t.result && t.result[t.me];
    if (!r) return;
    ui.applied = true;
    if (W().msbSquishyApply) W().msbSquishyApply([{ trade: t.id, give: r.give, get: r.get }]);
    if (ui.opts && ui.opts.onDone) ui.opts.onDone(t);
  }

  async function send(path, extra) {
    if (ui.busy) return;
    ui.busy = true;
    try {
      const res = await ui.opts.call(path, ui.trade ? { trade: ui.trade.id, ...(extra || {}) } : (extra || {}));
      if (res && res.trade) ui.trade = res.trade;
      ui.msg = '';
      if (path === '/trade/request' && res && res.existing && ui.draft.length && res.trade.status !== 'done') {
        const r2 = await ui.opts.call('/trade/update', { trade: res.trade.id, offer: ui.draft });
        if (r2 && r2.trade) ui.trade = r2.trade;
      }
      if (path === '/trade/request') { ui.draft = []; startPoll(); }
    } catch (e) {
      if (e && e.data && e.data.trade) ui.trade = e.data.trade;
      ui.msg = reasonText(e && e.data && e.data.reason, e && e.message);
    } finally { ui.busy = false; }
    render();
    if (ui.trade && model(ui.trade, D().SQUISHIES).over) stopPoll();
  }

  function reasonText(reason, fallback) {
    const map = {
      lamp: T('The lamp is never traded.', 'La lámpara nunca se cambia.'),
      starter: T('Everyone has the first squishies, so they are not traded.', 'Todos tienen los primeros squishies, así que no se cambian.'),
      owned: T('A squishy on the board is not available any more.', 'Un squishy del tablero ya no está disponible.'),
      locked: T('That squishy is already in another trade.', 'Ese squishy ya está en otro cambio.'),
      changed: T('The board changed. Look again, then press ✓.', 'El tablero cambió. Míralo otra vez y pulsa ✓.'),
      already: T('Your friend already has one of those squishies.', 'Tu amigo ya tiene uno de esos squishies.'),
    };
    if (reason && map[reason]) return map[reason];
    if (reason && /^need:/.test(reason)) return T('Not fair yet: a legendary needs more squishies back.', 'Aún no es justo: un legendario pide más squishies a cambio.');
    if (reason === 'empty') return T('Both sides add at least one squishy.', 'Cada lado añade al menos un squishy.');
    return fallback || T('Could not reach the Trade Room.', 'No se pudo conectar con la sala.');
  }

  /* ---------- polling: only while this board is open and visible ---------- */
  function startPoll() {
    stopPoll();
    ui.timer = setInterval(async () => {
      if (!ui.root || !ui.root.isConnected) { close(); return; }
      if (typeof document !== 'undefined' && document.hidden) return;
      if (ui.busy || !ui.trade) return;
      try {
        const res = await ui.opts.call('/trade/state', { trade: ui.trade.id });
        if (res && res.trade && (res.trade.rev !== ui.trade.rev || res.trade.status !== ui.trade.status || JSON.stringify(res.trade.checks) !== JSON.stringify(ui.trade.checks))) { ui.trade = res.trade; ui.msg = ''; render(); }
      } catch (e) { if (e && e.data && e.data.trade) { ui.trade = e.data.trade; render(); } }
      if (model(ui.trade, D().SQUISHIES).over) stopPoll();
    }, POLL_MS);
  }
  function stopPoll() { if (ui.timer) clearInterval(ui.timer); ui.timer = null; }
  /* the lobby looks for new requests every few seconds, only while it shows */
  async function readList() {
    if (!ui.opts || ui.opts.ready === false) return;
    try {
      const r = await ui.opts.call('/trade/list', {});
      const next = (r && Array.isArray(r.trades)) ? r.trades : [];
      if (r && Array.isArray(r.pending) && r.pending.length && W().msbSquishyApply) W().msbSquishyApply(r.pending);
      const sig = x => x.map(t => t.id + t.status).join();
      if (sig(next) !== sig(ui.list)) { ui.list = next; if (!ui.trade) render(); }
    } catch { /* offline: the board still works for picking */ }
  }
  function startList() {
    stopList(); readList();
    ui.listTimer = setInterval(() => {
      if (!ui.root || !ui.root.isConnected) { close(); return; }
      if (typeof document !== 'undefined' && document.hidden) return;
      if (!ui.trade) readList();
    }, LIST_MS);
  }
  function stopList() { if (ui.listTimer) clearInterval(ui.listTimer); ui.listTimer = null; }
  async function resume(id) {
    try { const r = await ui.opts.call('/trade/state', { trade: id }); if (r && r.trade) { ui.trade = r.trade; ui.applied = false; ui.msg = ''; render(); startPoll(); } }
    catch (e) { ui.msg = reasonText(e && e.data && e.data.reason, e && e.message); render(); }
  }
  function chooseFriend(code) {
    ui.withCode = code; ui.msg = '';
    const live = ui.list.find(t => t && t.other === code && (t.status === 'requested' || t.status === 'open'));
    if (live) { resume(live.id); return; }
    render();
  }

  function onClick(ev) {
    const el = ev.target.closest('button');
    if (!el || !ui.root || !ui.root.contains(el)) return;
    if (el.matches('[data-sr-back]')) { const back = ui.opts.onBack; close(); if (back) back(); return; }
    if (el.matches('[data-sr-friends]')) { const go = ui.opts.onFriends; close(); if (go) go(); return; }
    if (el.matches('[data-sr-new]')) { ui.trade = null; ui.applied = false; ui.msg = ''; stopPoll(); render(); readList(); return; }
    if (!ui.trade) {
      if (el.matches('[data-sr-friend]')) return chooseFriend(el.dataset.srFriend);
      if (el.matches('[data-sr-resume]')) return resume(el.dataset.srResume);
      if (el.matches('[data-sr-pick], [data-sr-remove]')) {
        const id = el.dataset.srPick || el.dataset.srRemove;
        ui.draft = ui.draft.includes(id) ? ui.draft.filter(x => x !== id) : ui.draft.concat(id).slice(0, OFFER_MAX);
        ui.msg = ''; render(); return;
      }
      if (el.matches('[data-sr-send]') && ui.withCode) return send('/trade/request', { with: ui.withCode, offer: ui.draft });
      return;
    }
    const t = ui.trade, m = model(t, D().SQUISHIES);
    if (el.matches('[data-sr-accept]')) return send('/trade/accept');
    if (el.matches('[data-sr-leave]')) return send('/trade/cancel');
    if (el.matches('[data-sr-ok]')) return send('/trade/confirm', { rev: t.rev });
    if (el.matches('[data-sr-ask]')) return send('/trade/update', { ask: 'more' });
    if (el.matches('[data-sr-add]')) { const p = ui.root.querySelector('[data-sr-picker]'); if (p && p.scrollIntoView) p.scrollIntoView({ block: 'center', behavior: 'auto' }); return; }
    if (!m.editable) return;
    if (el.matches('[data-sr-remove]')) return send('/trade/update', { offer: m.mine.filter(id => id !== el.dataset.srRemove) });
    if (el.matches('[data-sr-pick]')) {
      const id = el.dataset.srPick;
      const next = m.mine.includes(id) ? m.mine.filter(x => x !== id) : m.mine.concat(id).slice(0, OFFER_MAX);
      const extra = { offer: next };
      if (!m.myLegend && next.some(x => LEGENDARY.includes(x)) && m.myNeed < LEGEND_MIN) extra.need = LEGEND_MIN;
      return send('/trade/update', extra);
    }
    if (el.matches('[data-sr-need]')) {
      const n = Math.min(NEED_MAX, Math.max(LEGEND_MIN, Math.max(LEGEND_MIN, m.myNeed) + Number(el.dataset.srNeed)));
      return send('/trade/update', { need: n });
    }
  }


  /* opts: { trade?, with?, friends: [{ code, name }], ready, call(path, body) → Promise,
     storage, lang, onBack, backLabel, onFriends, onDone }
     With a trade it opens that board; otherwise the lobby shows the board at
     once, with your squishies ready to tap and every friend to choose from. */
  function open(rootEl, opts) {
    close();
    ui.opts = opts; ui.trade = opts.trade || null; ui.msg = ''; ui.picking = false; ui.applied = false; ui.draft = []; ui.list = []; ui.withCode = opts.with || null;
    attach(rootEl);
    if (ui.trade) { if (!model(ui.trade, D().SQUISHIES).over) startPoll(); }
    startList();
  }
  /* the same session into a fresh element (the squishy screen redraws itself) */
  function attach(rootEl) {
    if (ui.root && ui.root !== rootEl) ui.root.removeEventListener('click', onClick);
    ui.root = rootEl;
    rootEl.addEventListener('click', onClick);
    render();
    if (ui.opts && ui.withCode && !ui.trade && !ui.list.length) readList().then(() => { if (!ui.trade && ui.withCode) chooseFriend(ui.withCode); });
  }
  function close() {
    stopPoll(); stopList();
    if (ui.root) ui.root.removeEventListener('click', onClick);
    ui.root = null; ui.picking = false; ui.opts = null; ui.trade = null;
  }

  /* Friends screen: open requests and rooms (read once when the screen opens, never polled) */
  function listHtml(trades, lang) {
    const es = lang === 'es', tt = (en, sp, v) => fmt(es ? sp : en, v);
    const live = (Array.isArray(trades) ? trades : []).filter(t => t && (t.status === 'requested' || t.status === 'open'));
    const rows = live.map(t => {
      const friend = (t.names && t.names[t.other]) || tt('Friend', 'Amigo');
      const label = t.status === 'open' ? tt('Trade room with {name} is open', 'Sala de intercambio abierta con {name}', { name: friend })
        : t.to === t.me ? tt('{name} wants to trade squishies', '{name} quiere cambiar squishies', { name: friend }) : tt('Waiting for {name}', 'Esperando a {name}', { name: friend });
      return `<li><span>${esc(label)}</span> <button type="button" class="secondary" data-action="trade-resume" data-trade="${esc(t.id)}">${esc(t.status === 'requested' && t.to === t.me ? tt('See request', 'Ver solicitud') : tt('Open', 'Abrir'))}</button></li>`;
    }).join('');
    return `<section class="card sr-list" data-i18n-skip><span class="eyebrow">${esc(tt('SQUISHY TRADES', 'INTERCAMBIOS DE SQUISHIES'))}</span>${rows ? `<ul>${rows}</ul>` : `<p class="muted">${esc(tt('No trades right now. Open a friend and press “Trade squishies”.', 'No hay intercambios ahora. Abre un amigo y pulsa «Cambiar squishies».'))}</p>`}</section>`;
  }

  return { POLL_MS, LIST_MS, LEGEND_MIN, LEGENDARY, model, tradableMine, listHtml, open, attach, close, isOpen: () => !!ui.opts, _ui: ui };
});
