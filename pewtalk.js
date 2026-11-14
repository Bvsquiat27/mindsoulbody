/* Pew Talk: an online conversation card game about church and everyday faith.
   2 to 6 friends, each on their own phone, join one room by code or invite.
   Everyone sees the same card, answers in secret (Amen, Lord have mercy, or
   Let me pray on it), and all answers show at once when everyone has answered
   or the round timer ends, with a linked verse. The host deals the next card.
   Needs the friends worker's /pew/ routes; until /pew/hello answers, the game
   shows as coming soon. Cards: pewtalk-data.js. */
window.MsbPewTalk = (() => {
  let root = null, ctx = null, S = null, poll = null, online = null, onlineProbe = null;
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const es = () => !!(window.MsbI18n && MsbI18n.lang() === 'es');
  const t = (en, sp) => es() ? sp : en;
  const data = () => window.MsbPewTalkData || { categories: {}, cards: [] };
  const ANSWERS = [
    { id: 'amen', en: 'Amen', es: 'Amén', hintEn: 'Yes, I agree', hintEs: 'Sí, de acuerdo' },
    { id: 'mercy', en: 'Lord, have mercy', es: 'Señor, ten piedad', hintEn: 'Oh no, not that', hintEs: 'Ay no, eso no' },
    { id: 'pray', en: 'Let me pray on it', es: 'Lo voy a orar', hintEn: 'I am not sure yet', hintEs: 'Todavía no estoy seguro' },
  ];
  const answerLabel = id => { const a = ANSWERS.find(x => x.id === id); return a ? (es() ? a.es : a.en) : ''; };
  const rand = n => Math.floor(Math.random() * n);
  const shuffle = a => { const x = [...a]; for (let i = x.length - 1; i > 0; i--) { const j = rand(i + 1); [x[i], x[j]] = [x[j], x[i]]; } return x; };
  const card = id => data().cards.find(c => c.id === id) || null;
  const catLabel = id => { const c = data().categories[id]; return c ? (es() ? c[1] : c[0]) : ''; };
  const prompt = c => c ? (es() ? c.es : c.en) : '';

  /* ---------- deck: unseen cards first, remembered on this device ---------- */
  const SEEN_KEY = 'msb_pew_seen';
  function seenList() { try { const v = JSON.parse(localStorage.getItem(SEEN_KEY)); return Array.isArray(v) ? v : []; } catch { return []; } }
  function markSeen(id) { try { const v = seenList().filter(x => x !== id); v.push(id); localStorage.setItem(SEEN_KEY, JSON.stringify(v.slice(-200))); } catch { /* private mode */ } }
  function buildDeck(cat) {
    const pool = data().cards.filter(c => cat === 'all' || c.cat === cat).map(c => c.id);
    const seen = new Set(seenList());
    return [...shuffle(pool.filter(id => !seen.has(id))), ...shuffle(pool.filter(id => seen.has(id)))];
  }

  /* ---------- rendering helpers ---------- */
  function set(html) {
    if (!root) return;
    root.innerHTML = `<div class="pew" data-i18n-skip>${html}</div>`;
    const f = root.querySelector('[data-pew-focus]');
    if (f) setTimeout(() => { try { f.focus(); } catch { /* noop */ } }, 30);
  }
  const back = (to, label) => `<button class="text-button" data-pew="${to}">${esc(label)}</button>`;
  const head = () => `<span class="eyebrow">${t('CONVERSATION CARDS', 'TARJETAS PARA PLATICAR')}</span><h1>${t('Pew Talk', 'Plática de banca')}</h1>`;
  function cardHtml(c, n, total) {
    return `<article class="pew-card" aria-live="polite"><span class="pew-cat">${esc(catLabel(c.cat))}</span><p class="pew-q">${esc(prompt(c))}</p><span class="pew-count">${t('Card', 'Tarjeta')} ${n} ${t('of', 'de')} ${total}</span></article>`;
  }
  function answerButtons(action, extra) {
    return `<div class="pew-answers">${ANSWERS.map(a => `<button class="pew-answer pew-${a.id}" data-pew="${action}" data-answer="${a.id}"${extra || ''}><strong>${esc(es() ? a.es : a.en)}</strong><span>${esc(es() ? a.hintEs : a.hintEn)}</span></button>`).join('')}</div>`;
  }
  /* votes: [{name, answer}] */
  function revealHtml(c, votes) {
    const groups = ANSWERS.map(a => ({ a, names: votes.filter(v => v.answer === a.id).map(v => v.name) }));
    const answered = votes.filter(v => v.answer);
    const oneMind = answered.length > 1 && groups.some(g => g.names.length === answered.length);
    const verse = c.ref ? `<details class="pew-verse"><summary>${t('Read the verse', 'Leer el versículo')} · ${esc(es() ? c.ref.es : c.ref.en)}</summary><blockquote>${esc(es() ? c.ref.textEs : c.ref.textEn)}</blockquote><p class="small muted">${esc(es() ? `${c.ref.es} · Reina-Valera 1909` : `${c.ref.en} · KJV`)}</p></details>` : '';
    return `<section class="pew-reveal"><h2>${oneMind ? t('Of one mind', 'De un mismo sentir') : t('Here is how everyone answered', 'Así respondió cada quien')}</h2>
      <div class="pew-tally">${groups.map(g => `<div class="pew-group pew-${g.a.id}"><div class="pew-group-head"><strong>${esc(es() ? g.a.es : g.a.en)}</strong><span class="pew-num">${g.names.length}</span></div><p>${g.names.length ? g.names.map(esc).join(', ') : `<span class="muted">${t('Nobody', 'Nadie')}</span>`}</p></div>`).join('')}</div>
      ${votes.some(v => !v.answer) ? `<p class="small muted">${t('No answer this time:', 'Sin respuesta esta vez:')} ${votes.filter(v => !v.answer).map(v => esc(v.name)).join(', ')}</p>` : ''}<p class="small">${t('Take a minute: each person can share why they answered that way. Listen kindly.', 'Tómense un minuto: cada quien puede decir por qué respondió así. Escuchen con cariño.')}</p>${verse}</section>`;
  }

  /* ---------- menu: online only ---------- */
  const TIMERS = [0, 30, 60, 90];
  function menu(msg) {
    stopPoll();
    S = { view: 'menu', cat: (S && S.cat) || 'all', timer: S && S.timer !== undefined ? S.timer : 60 };
    const cats = Object.keys(data().categories);
    const count = id => data().cards.filter(c => id === 'all' || c.cat === id).length;
    const chips = ['all', ...cats].map(id => `<button type="button" class="filter ${S.cat === id ? 'active' : ''}" data-pew="cat" data-cat="${id}" aria-pressed="${S.cat === id}">${esc(id === 'all' ? t('All', 'Todas') : catLabel(id))}<span class="subject-count">${count(id)}</span></button>`).join('');
    const timers = TIMERS.map(n => `<button type="button" class="filter ${S.timer === n ? 'active' : ''}" data-pew="timer" data-n="${n}" aria-pressed="${S.timer === n}">${n ? `${n} s` : t('No timer', 'Sin reloj')}</button>`).join('');
    const id = ident();
    let body;
    if (online === null) body = `<p class="lead">${t('Checking whether online rooms are open…', 'Revisando si las salas en línea están abiertas…')}</p>`;
    else if (online === false) body = `<div class="card pew-mode pew-soon" aria-disabled="true"><span class="lesson-meta">${t('ONLINE · COMING SOON', 'EN LÍNEA · MUY PRONTO')}</span><h3>${t('Rooms are not open yet', 'Las salas todavía no están abiertas')}</h3><p>${t('Soon friends on their own phones can join one room and answer together. Check your internet if this stays here.', 'Pronto tus amigos podrán unirse desde su propio teléfono y responder juntos. Revisa tu internet si esto no cambia.')}</p></div>`;
    else if (!id) body = `<p class="lead">${t('Pew Talk rooms are for friends. Get your friend code first in Profile, then Friends.', 'Las salas de Plática de banca son para amigos. Primero obtén tu código de amigo en Perfil, luego Amigos.')}</p>`;
    else body = `<p class="subject-caption">${t('Cards', 'Tarjetas')}</p><div class="subject-filters" role="group" aria-label="${t('Choose cards', 'Elige tarjetas')}">${chips}</div>
      <p class="subject-caption">${t('Time to answer each card', 'Tiempo para responder cada tarjeta')}</p><div class="pew-count-row" role="group" aria-label="${t('Answer timer', 'Reloj para responder')}">${timers}</div>
      <button class="primary" data-pew="create">${t('Open a room', 'Abrir una sala')}</button>
      <p class="pew-joinrow"><input class="text-input" data-pew-code placeholder="${t('Room code', 'Código de sala')}" autocapitalize="characters" autocomplete="off" maxlength="9" aria-label="${t('Room code', 'Código de sala')}"><button class="secondary" data-pew="join-code">${t('Join', 'Unirme')}</button></p>
      <div data-pew-invites></div>`;
    set(`${back('games', t('← Games', '← Juegos'))}${head()}
      <p class="lead">${t('Play with friends, each on your own phone. Everyone sees the same card at the same time and answers in secret. When everyone has answered, or the timer ends, all the answers show at once. Then talk it over.', 'Juega con tus amigos, cada quien en su propio teléfono. Todos ven la misma tarjeta al mismo tiempo y responden en secreto. Cuando todos responden, o se acaba el tiempo, se muestran todas las respuestas a la vez. Luego platican.')}</p>
      <div class="pew-legend">${ANSWERS.map(a => `<span class="pew-chip pew-${a.id}"><strong>${esc(es() ? a.es : a.en)}</strong> ${esc(es() ? a.hintEs : a.hintEn)}</span>`).join('')}</div>
      ${body}<p class="small muted" role="status" data-pew-status>${esc(msg || '')}</p>
      <p class="footnote">${t('2 to 6 players. A game for laughing and talking together. There are no wrong answers, and nothing here is official teaching of any church. Bring the real questions to your pastor or priest.', 'De 2 a 6 jugadores. Un juego para reír y platicar juntos. No hay respuestas incorrectas y nada aquí es enseñanza oficial de ninguna iglesia. Lleva las preguntas de verdad a tu pastor o sacerdote.')}</p>`);
    if (online === null) probeOnline().then(() => { if (S && S.view === 'menu') menu(msg); });
    else if (online === true && id) showInvites();
  }

  function finish(rounds, oneMind) {
    stopPoll();
    set(`${back('menu', t('← Pew Talk', '← Plática de banca'))}${head()}
      <section class="pew-reveal"><h2>${t('Thanks for playing', 'Gracias por jugar')}</h2>
      <p class="lead">${rounds === 1 ? t('You talked through 1 card.', 'Platicaron 1 tarjeta.') : t(`You talked through ${rounds} cards.`, `Platicaron ${rounds} tarjetas.`)} ${rounds ? (oneMind === 1 ? t('Everyone agreed once.', 'Todos estuvieron de acuerdo una vez.') : t(`Everyone agreed ${oneMind} times.`, `Todos estuvieron de acuerdo ${oneMind} veces.`)) : ''}</p>
      <blockquote class="pew-closing">${t('Behold, how good and how pleasant it is for brethren to dwell together in unity! Psalms 133:1', '¡Mirad cuán bueno y cuán delicioso es habitar los hermanos igualmente en uno! Salmos 133:1')}</blockquote></section>
      <div class="pew-actions"><button class="primary" data-pew="menu">${t('Play again', 'Jugar otra vez')}</button><button class="secondary" data-pew="games">${t('All games', 'Todos los juegos')}</button></div>`);
  }

  /* ---------- rooms (friends worker /pew/) ---------- */
  const ident = () => (window.msbFriendsId ? msbFriendsId() : null);
  function call(path, body) {
    const id = ident();
    if (!id || !window.msbFriendsCall) return Promise.reject(Error(t('Get your friend code first (Profile, then Friends).', 'Primero obtén tu código de amigo (Perfil, luego Amigos).')));
    return msbFriendsCall(path, { code: id.code, secret: id.secret, ...(body || {}) });
  }
  function probeOnline() {
    if (online !== null) return Promise.resolve(online);
    if (!onlineProbe) {
      onlineProbe = (window.msbFriendsCall ? msbFriendsCall('/pew/hello', {}) : Promise.reject(Error('offline')))
        .then(r => { online = !!(r && r.pew === 1); }, () => { online = false; })
        .then(() => { onlineProbe = null; return online; });
    }
    return onlineProbe;
  }
  /* the server sends msLeft; the phone counts down from when it heard it, so clocks need not agree */
  let clockTick = null;
  function stampClock(st) { if (S) S.endsAt = st && st.msLeft != null ? Date.now() + st.msLeft : null; }
  function paintClock() {
    const el = root && root.querySelector('[data-pew-clock]');
    if (!el || !S || !S.endsAt) return;
    const left = Math.max(0, Math.ceil((S.endsAt - Date.now()) / 1000));
    el.textContent = left ? t(`${left} s left`, `Quedan ${left} s`) : t('Time is up', 'Se acabó el tiempo');
    el.classList.toggle('low', left <= 10);
  }
  function stopPoll() { if (poll) { clearInterval(poll); poll = null; } if (clockTick) { clearInterval(clockTick); clockTick = null; } }
  function startPoll() {
    stopPoll();
    poll = setInterval(async () => {
      if (!root || !S || !S.room) { stopPoll(); return; }
      try { const st = await call('/pew/state', { room: S.room }); if (S && S.room === st.room) { const changed = JSON.stringify(st.players) + st.phase + st.round + st.status !== JSON.stringify(S.st.players) + S.st.phase + S.st.round + S.st.status; S.st = st; stampClock(st); if (changed) renderOnline(); resendLostVote(st); } } catch (e) { if (e && e.status === 404 && S) { S.gone = true; stopPoll(); renderOnline(); } else if (e && e.status === 403 && S) rejoin(); }
    }, 1500);
    clockTick = setInterval(paintClock, 250);
  }
  /* The room lives in a plain key-value store, so two changes that land at the
     same moment (a friend joining while the host sends an invite, or two votes)
     can overwrite each other. Each phone heals itself: a player the room lost
     joins again, and a vote the room lost is sent again. */
  async function rejoin() {
    if (!S || !S.room || S.rejoining) return;
    S.rejoining = true;
    try { const st = await call('/pew/join', { room: S.room }); if (S && st && st.room === S.room) { S.st = st; stampClock(st); renderOnline(); } }
    catch (err) { if (S && S.view === 'online') { S.gone = true; S.goneMsg = err && err.message; stopPoll(); renderOnline(); } }
    finally { if (S) S.rejoining = false; }
  }
  function resendLostVote(st) {
    const id = ident(), v = S && S.voted;
    if (!id || !v || S.busy || st.status !== 'active' || st.phase !== 'vote' || v.round !== st.round) return;
    const mine = st.players.find(p => p.code === id.code);
    if (mine && !mine.answered) act('/pew/vote', { round: v.round, answer: v.answer });
  }
  async function showInvites() {
    if (!ident()) return;
    try {
      const r = await call('/pew/invites');
      const box = root && root.querySelector('[data-pew-invites]');
      if (!box || !r || !Array.isArray(r.invites) || !r.invites.length) return;
      box.innerHTML = `<h2>${t('Invitations', 'Invitaciones')}</h2>${r.invites.map(inv => `<div class="card friend-row"><div><strong>${esc(inv.fromName || t('A friend', 'Un amigo'))}</strong> <span class="small muted">${t('invited you to Pew Talk', 'te invitó a Plática de banca')}</span></div><button class="primary" data-pew="join" data-room="${esc(inv.room)}">${t('Join', 'Unirme')}</button></div>`).join('')}`;
    } catch { /* invitations are optional */ }
  }
  const status = text => { const el = root && root.querySelector('[data-pew-status]'); if (el) el.textContent = text || ''; };
  async function create() {
    status(t('Opening your room…', 'Abriendo tu sala…'));
    try { const st = await call('/pew/create', { deck: buildDeck(S.cat).slice(0, 80), timer: S.timer }); enterRoom(st); } catch (e) { status(e.message); }
  }
  async function join(code) {
    if (!code) { status(t('Type the room code first.', 'Primero escribe el código de la sala.')); return; }
    status(t('Joining…', 'Uniéndote…'));
    try { const st = await call('/pew/join', { room: code }); enterRoom(st); } catch (e) { if (S && S.view === 'menu') status(e.message); else menu(e.message); }
  }
  function enterRoom(st) {
    S = { view: 'online', cat: S ? S.cat : 'all', timer: S ? S.timer : 60, room: st.room, st, invited: [], busy: false, seen: {} };
    stampClock(st);
    renderOnline(); startPoll();
  }
  function renderOnline() {
    if (!S || S.view !== 'online') return;
    const st = S.st, id = ident(), me = id ? id.code : '';
    const host = st.host === me;
    const top = `${back('leave', t('← Leave room', '← Salir de la sala'))}${head()}`;
    if (S.gone) { set(`${top}<p class="lead">${t('This room has closed.', 'Esta sala se cerró.')}</p>${S.goneMsg ? `<p class="small muted">${esc(S.goneMsg)}</p>` : ''}<button class="primary" data-pew="menu">${t('Back to Pew Talk', 'Volver a Plática de banca')}</button>`); return; }
    const players = `<div class="pew-players">${st.players.map(p => `<span class="pew-player${p.answered && st.phase === 'vote' && st.status === 'active' ? ' done' : ''}">${esc(p.name)}${p.code === me ? ` (${t('you', 'tú')})` : ''}${p.code === st.host ? ` · ${t('host', 'anfitrión')}` : ''}${st.status === 'active' && st.phase === 'vote' ? ` · ${p.answered ? t('answered', 'respondió') : t('thinking', 'pensando')}` : ''}</span>`).join('')}</div>`;
    if (st.status === 'waiting') {
      const friends = (window.msbFriendsCached ? msbFriendsCached() : []) || [];
      const inRoom = new Set(st.players.map(p => p.code));
      const invite = host ? (friends.length ? `<h2>${t('Invite friends', 'Invita a tus amigos')}</h2><div class="pew-invite-list">${friends.filter(f => f && f.code && !inRoom.has(f.code)).map(f => `<div class="card friend-row"><strong>${esc(f.name || t('Friend', 'Amigo'))}</strong>${S.invited.includes(f.code) ? `<span class="small muted">${t('Invited', 'Invitado')}</span>` : `<button class="secondary" data-pew="invite" data-to="${esc(f.code)}">${t('Invite', 'Invitar')}</button>`}</div>`).join('') || `<p class="small muted">${t('All your friends are already here.', 'Todos tus amigos ya están aquí.')}</p>`}</div>` : `<p class="small muted">${t('Add friends in Profile, then Friends, to invite them here.', 'Agrega amigos en Perfil, luego Amigos, para invitarlos aquí.')}</p>`) : '';
      set(`${top}<p class="lead">${t('Share this room code, or invite friends below. Friends open Pew Talk in Games and type the code.', 'Comparte este código o invita a tus amigos aquí abajo. Tus amigos abren Plática de banca en Juegos y escriben el código.')}</p>
        <p class="friend-code pew-roomcode">${esc(st.room)}</p>${players}
        ${host ? `<button class="primary" data-pew="start" ${st.players.length < 2 ? 'disabled' : ''}>${t('Start the game', 'Empezar el juego')}</button><p class="small muted">${st.players.length < 2 ? t('Waiting for a friend to join…', 'Esperando a que se una un amigo…') : t('Start when everyone is in. Up to 6 players.', 'Empieza cuando todos estén. Hasta 6 jugadores.')} ${st.timer ? t(`${st.timer} seconds to answer each card.`, `${st.timer} segundos para responder cada tarjeta.`) : t('No timer: each card waits for everyone.', 'Sin reloj: cada tarjeta espera a todos.')}</p>` : `<p class="lead">${t('You are in. Waiting for the host to start…', 'Ya estás dentro. Esperando a que el anfitrión empiece…')}</p>`}
        ${invite}<p class="small muted" role="status" data-pew-status></p>`);
      return;
    }
    if (st.status === 'done') { finish(Object.keys(S.seen).length, Object.values(S.seen).filter(Boolean).length); return; }
    const c = card(st.card);
    if (!c) { set(`${top}<p class="lead">${t('This card is not in your copy of the app yet. Pull down to refresh the app.', 'Esta tarjeta todavía no está en tu app. Actualiza la app.')}</p>`); return; }
    const mine = st.players.find(p => p.code === me);
    if (st.phase === 'reveal') {
      const answered = st.players.filter(p => p.answer);
      if (!(st.round in S.seen)) { S.seen[st.round] = answered.length > 1 && answered.every(p => p.answer === answered[0].answer); markSeen(st.card); }
      set(`${top}${cardHtml(c, st.round + 1, st.total)}${revealHtml(c, st.players.map(p => ({ name: p.name, answer: p.answer })))}
        ${host ? `<div class="pew-actions"><button class="primary" data-pew="next" data-pew-focus>${st.round + 1 < st.total ? t('Next card', 'Siguiente tarjeta') : t('Finish', 'Terminar')}</button><button class="secondary" data-pew="end">${t('End game', 'Terminar juego')}</button></div>` : `<p class="small muted">${t('The host will deal the next card.', 'El anfitrión repartirá la siguiente tarjeta.')}</p>`}${players}`);
      return;
    }
    const left = st.players.filter(p => !p.answered).length;
    set(`${top}${cardHtml(c, st.round + 1, st.total)}
      ${mine && mine.answered ? `<p class="lead">${t('Your answer is in.', 'Tu respuesta ya quedó.')} ${left === 1 ? t('Waiting on 1 more…', 'Falta 1…') : t(`Waiting on ${left} more…`, `Faltan ${left}…`)}</p>` : `<p class="lead">${t('What do you say?', '¿Tú qué dices?')}</p>${answerButtons('vote')}`}
      ${S.endsAt ? `<p class="pew-clock" data-pew-clock aria-live="off"></p>` : ''}
      ${host ? `<p><button class="text-button" data-pew="reveal">${t('Show the answers now', 'Mostrar las respuestas ya')}</button></p>` : ''}${players}<p class="small muted" role="status" data-pew-status></p>`);
    paintClock();
  }
  async function act(path, body) {
    if (!S || S.busy) return;
    S.busy = true;
    try { const st = await call(path, { room: S.room, ...(body || {}) }); if (st && st.room) { S.st = st; stampClock(st); } renderOnline(); } catch (e) { status(e.message); } finally { if (S) S.busy = false; }
  }
  function leave(then) {
    stopPoll();
    if (S && S.room) call('/pew/leave', { room: S.room }).catch(() => {});
    S = { view: 'menu', cat: S ? S.cat : 'all' };
    then();
  }

  /* ---------- events ---------- */
  function click(e) {
    if (!root || !root.contains(e.target)) return;
    const b = e.target.closest('[data-pew]');
    if (!b || b.disabled) return;
    const a = b.dataset.pew;
    if (a === 'games') { const go = ctx && ctx.back; leave(() => {}); hide(); if (go) go(); return; }
    if (a === 'menu') { menu(); return; }
    if (a === 'leave') { leave(() => menu()); return; }
    if (a === 'cat') { S.cat = b.dataset.cat; menu(); return; }
    if (a === 'timer') { S.timer = Number(b.dataset.n); menu(); return; }
    if (a === 'create') { create(); return; }
    if (a === 'join-code') { const el = root.querySelector('[data-pew-code]'); join((el ? el.value : '').trim()); return; }
    if (a === 'join') { join(b.dataset.room); return; }
    if (a === 'invite') { const to = b.dataset.to; call('/pew/invite', { room: S.room, to }).then(() => { if (S && S.invited) { S.invited.push(to); renderOnline(); } }, err => status(err.message)); return; }
    if (a === 'start') { act('/pew/start'); return; }
    if (a === 'vote') { S.voted = { round: S.st.round, answer: b.dataset.answer }; act('/pew/vote', { round: S.st.round, answer: b.dataset.answer }); return; }
    if (a === 'reveal') { act('/pew/reveal'); return; }
    if (a === 'next') { act('/pew/next', { round: S.st.round }); return; }
    if (a === 'end') { act('/pew/next', { round: S.st.round, end: true }); return; }
  }
  document.addEventListener('click', click);
  document.addEventListener('keydown', e => {
    if (e.key !== 'Enter' || !root || !e.target.closest) return;
    if (e.target.closest('[data-pew-code]')) { e.preventDefault(); const b = root.querySelector('[data-pew="join-code"]'); if (b) b.click(); }
  });
  function show(el, options) { root = el; ctx = options || {}; menu(); }
  function hide() { stopPoll(); root = null; ctx = null; S = null; }
  return { show, hide, ANSWERS, _test: { get S() { return S; }, buildDeck, setOnline(v) { online = v; } } };
})();
