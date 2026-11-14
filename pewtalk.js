/* Pew Talk: a conversation card game about church and everyday faith.
   Everyone answers the same card in secret (Amen, Lord have mercy, or Let me
   pray on it), then the answers are shown together with a linked verse.
   Pass the phone: 2 to 6 players on one device, fully local.
   Online: friends on their own phones join one room by code or invite. That
   needs the friends worker's /pew/ routes; until /pew/hello answers, online
   play shows as coming soon. Cards: pewtalk-data.js. */
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
      <p class="small">${t('Take a minute: each person can share why they answered that way. Listen kindly.', 'Tómense un minuto: cada quien puede decir por qué respondió así. Escuchen con cariño.')}</p>${verse}</section>`;
  }

  /* ---------- menu ---------- */
  function menu() {
    stopPoll();
    S = { view: 'menu', cat: (S && S.cat) || 'all' };
    const cats = Object.keys(data().categories);
    const count = id => data().cards.filter(c => id === 'all' || c.cat === id).length;
    const chips = ['all', ...cats].map(id => `<button type="button" class="filter ${S.cat === id ? 'active' : ''}" data-pew="cat" data-cat="${id}" aria-pressed="${S.cat === id}">${esc(id === 'all' ? t('All', 'Todas') : catLabel(id))}<span class="subject-count">${count(id)}</span></button>`).join('');
    const onlineCard = online === true
      ? `<button class="card pew-mode" data-pew="online-menu"><span class="lesson-meta">${t('ONLINE · 2 TO 6 PHONES', 'EN LÍNEA · 2 A 6 TELÉFONOS')}</span><h3>${t('Play with friends online', 'Juega con amigos en línea')}</h3><p>${t('Open a room, invite friends or share the code, and everyone sees the same card on their own phone.', 'Abre una sala, invita a tus amigos o comparte el código, y todos ven la misma tarjeta en su propio teléfono.')}</p></button>`
      : `<div class="card pew-mode pew-soon" aria-disabled="true"><span class="lesson-meta">${t('ONLINE · COMING SOON', 'EN LÍNEA · MUY PRONTO')}</span><h3>${t('Play with friends online', 'Juega con amigos en línea')}</h3><p>${online === null ? t('Checking whether online rooms are open…', 'Revisando si las salas en línea están abiertas…') : t('Soon friends on their own phones can join one room and answer together. For now, pass one phone around.', 'Pronto tus amigos podrán unirse desde su propio teléfono y responder juntos. Por ahora, pasen un solo teléfono.')}</p></div>`;
    set(`${back('games', t('← Games', '← Juegos'))}${head()}
      <p class="lead">${t('Church life, fasting, family, friends, and everyday faith. Everyone answers the same card in secret, then you see the answers together and talk it over.', 'Vida en la iglesia, ayuno, familia, amistad y la fe de cada día. Todos responden la misma tarjeta en secreto, luego ven las respuestas juntos y platican.')}</p>
      <div class="pew-legend">${ANSWERS.map(a => `<span class="pew-chip pew-${a.id}"><strong>${esc(es() ? a.es : a.en)}</strong> ${esc(es() ? a.hintEs : a.hintEn)}</span>`).join('')}</div>
      <p class="subject-caption">${t('Cards', 'Tarjetas')}</p><div class="subject-filters" role="group" aria-label="${t('Choose cards', 'Elige tarjetas')}">${chips}</div>
      <div class="pew-modes"><button class="card pew-mode" data-pew="local-setup"><span class="lesson-meta">${t('ONE PHONE · 2 TO 6 PLAYERS', 'UN TELÉFONO · 2 A 6 JUGADORES')}</span><h3>${t('Pass the phone', 'Pasa el teléfono')}</h3><p>${t('Each player answers privately, then hands the phone to the next.', 'Cada jugador responde en privado y le pasa el teléfono al siguiente.')}</p></button>${onlineCard}</div>
      <div data-pew-invites></div>
      <p class="footnote">${t('A game for laughing and talking together. There are no wrong answers, and nothing here is a ruling of the Church. Ask your priest about the real questions.', 'Un juego para reír y platicar juntos. No hay respuestas incorrectas y nada aquí es una enseñanza oficial de la Iglesia. Pregúntale a tu sacerdote las preguntas de verdad.')}</p>`);
    if (online === null) probeOnline().then(() => { if (S && S.view === 'menu') menu(); });
    else if (online === true) showInvites();
  }

  /* ---------- pass the phone ---------- */
  function localSetup() {
    const n = (S && S.players && S.players.length) || 2;
    S = { view: 'setup', cat: S ? S.cat : 'all', n, names: (S && S.names) || [] };
    renderSetup();
  }
  function renderSetup() {
    const fields = Array.from({ length: S.n }, (_, i) => `<label class="gx-field">${t('Player', 'Jugador')} ${i + 1}<input data-pew-name="${i}" maxlength="20" value="${esc(S.names[i] || '')}" placeholder="${t('Player', 'Jugador')} ${i + 1}"${i === 0 ? ' data-pew-focus' : ''}></label>`).join('');
    set(`${back('menu', t('← Pew Talk', '← Plática de banca'))}${head()}
      <h2>${t('Who is playing?', '¿Quién va a jugar?')}</h2>
      <div class="pew-count-row" role="group" aria-label="${t('Number of players', 'Número de jugadores')}">${[2, 3, 4, 5, 6].map(k => `<button type="button" class="filter ${S.n === k ? 'active' : ''}" data-pew="count" data-n="${k}" aria-pressed="${S.n === k}">${k}</button>`).join('')}</div>
      <div class="pew-names">${fields}</div>
      <button class="primary" data-pew="local-start">${t('Deal the first card', 'Repartir la primera tarjeta')}</button>`);
  }
  function readNames() {
    S.names = Array.from({ length: S.n }, (_, i) => { const el = root.querySelector(`[data-pew-name="${i}"]`); return el ? el.value.trim().slice(0, 20) : (S.names[i] || ''); });
  }
  function localStart() {
    readNames();
    const players = S.names.map((n, i) => n || `${t('Player', 'Jugador')} ${i + 1}`);
    const deck = buildDeck(S.cat);
    if (!deck.length) return;
    S = { view: 'local', cat: S.cat, n: S.n, names: S.names, players, deck, idx: 0, turn: 0, ready: false, votes: [], rounds: 0, oneMind: 0 };
    renderLocal();
  }
  function renderLocal() {
    const c = card(S.deck[S.idx]);
    const top = `${back('menu', t('← Pew Talk', '← Plática de banca'))}${head()}${cardHtml(c, S.idx + 1, S.deck.length)}`;
    if (S.turn >= S.players.length) {
      set(`${top}${revealHtml(c, S.players.map((name, i) => ({ name, answer: S.votes[i] })))}
        <div class="pew-actions"><button class="primary" data-pew="local-next" data-pew-focus>${S.idx + 1 < S.deck.length ? t('Next card', 'Siguiente tarjeta') : t('Finish', 'Terminar')}</button><button class="secondary" data-pew="local-end">${t('End game', 'Terminar juego')}</button></div>`);
      return;
    }
    const who = esc(S.players[S.turn]);
    if (!S.ready) {
      const first = S.turn === 0;
      const line = first ? t(`Read the card out loud, then hand the phone to <strong>${who}</strong>.`, `Lean la tarjeta en voz alta y luego pásale el teléfono a <strong>${who}</strong>.`) : t(`Pass the phone to <strong>${who}</strong>.`, `Pásale el teléfono a <strong>${who}</strong>.`);
      set(`${top}<section class="pew-pass"><p class="lead">${line}</p><p class="small muted">${t('Answers stay hidden until everyone has answered.', 'Las respuestas quedan ocultas hasta que todos respondan.')}</p><button class="primary" data-pew="local-ready" data-pew-focus>${t(`I am ${who}, show my choices`, `Soy ${who}, muéstrame las opciones`)}</button></section>`);
      return;
    }
    set(`${top}<p class="lead"><strong>${who}</strong>, ${t('what do you say?', '¿tú qué dices?')}</p>${answerButtons('local-vote')}`);
  }
  function localVote(answer) {
    S.votes[S.turn] = answer; S.turn += 1; S.ready = false;
    if (S.turn >= S.players.length) {
      S.rounds += 1; markSeen(S.deck[S.idx]);
      if (S.votes.every(v => v === S.votes[0])) S.oneMind += 1;
    }
    renderLocal();
  }
  function localNext() {
    if (S.idx + 1 >= S.deck.length) { finish(S.rounds, S.oneMind); return; }
    S.idx += 1; S.turn = 0; S.votes = []; S.ready = false; renderLocal();
  }
  function finish(rounds, oneMind) {
    stopPoll();
    set(`${back('menu', t('← Pew Talk', '← Plática de banca'))}${head()}
      <section class="pew-reveal"><h2>${t('Thanks for playing', 'Gracias por jugar')}</h2>
      <p class="lead">${rounds === 1 ? t('You talked through 1 card.', 'Platicaron 1 tarjeta.') : t(`You talked through ${rounds} cards.`, `Platicaron ${rounds} tarjetas.`)} ${rounds ? (oneMind === 1 ? t('Everyone agreed once.', 'Todos estuvieron de acuerdo una vez.') : t(`Everyone agreed ${oneMind} times.`, `Todos estuvieron de acuerdo ${oneMind} veces.`)) : ''}</p>
      <blockquote class="pew-closing">${t('Behold, how good and how pleasant it is for brethren to dwell together in unity! Psalms 133:1', '¡Mirad cuán bueno y cuán delicioso es habitar los hermanos igualmente en uno! Salmos 133:1')}</blockquote></section>
      <div class="pew-actions"><button class="primary" data-pew="menu">${t('Play again', 'Jugar otra vez')}</button><button class="secondary" data-pew="games">${t('All games', 'Todos los juegos')}</button></div>`);
  }

  /* ---------- online (friends worker /pew/) ---------- */
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
  function stopPoll() { if (poll) { clearInterval(poll); poll = null; } }
  function startPoll() {
    stopPoll();
    poll = setInterval(async () => {
      if (!root || !S || !S.room) { stopPoll(); return; }
      try { const st = await call('/pew/state', { room: S.room }); if (S && S.room === st.room) { S.st = st; renderOnline(); } } catch (e) { if (e && e.status === 404 && S) { S.gone = true; stopPoll(); renderOnline(); } }
    }, 1500);
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
  function onlineMenu(msg) {
    stopPoll();
    S = { view: 'online-menu', cat: S ? S.cat : 'all' };
    const id = ident();
    set(`${back('menu', t('← Pew Talk', '← Plática de banca'))}${head()}<h2>${t('Play with friends online', 'Juega con amigos en línea')}</h2>
      ${id ? `<p class="lead">${t('Open a room and invite friends, or type the code a friend sent you. Everyone needs the app open with internet.', 'Abre una sala e invita a tus amigos, o escribe el código que te mandó un amigo. Todos necesitan la app abierta con internet.')}</p>
      <button class="primary" data-pew="create">${t('Open a room', 'Abrir una sala')}</button>
      <p class="pew-joinrow"><input class="text-input" data-pew-code placeholder="${t('Room code', 'Código de sala')}" autocapitalize="characters" autocomplete="off" maxlength="9" aria-label="${t('Room code', 'Código de sala')}"><button class="secondary" data-pew="join-code">${t('Join', 'Unirme')}</button></p>
      <div data-pew-invites></div>` : `<p class="lead">${t('Online rooms are for friends. Get your friend code first in Profile, then Friends.', 'Las salas en línea son para amigos. Primero obtén tu código de amigo en Perfil, luego Amigos.')}</p>`}
      <p class="small muted" role="status" data-pew-status>${esc(msg || '')}</p>`);
    if (id) showInvites();
  }
  const status = text => { const el = root && root.querySelector('[data-pew-status]'); if (el) el.textContent = text || ''; };
  async function create() {
    status(t('Opening your room…', 'Abriendo tu sala…'));
    try { const st = await call('/pew/create', { deck: buildDeck(S.cat).slice(0, 80) }); enterRoom(st); } catch (e) { status(e.message); }
  }
  async function join(code) {
    if (!code) { status(t('Type the room code first.', 'Primero escribe el código de la sala.')); return; }
    status(t('Joining…', 'Uniéndote…'));
    try { const st = await call('/pew/join', { room: code }); enterRoom(st); } catch (e) { if (S && S.view === 'online-menu') status(e.message); else onlineMenu(e.message); }
  }
  function enterRoom(st) {
    S = { view: 'online', cat: S ? S.cat : 'all', room: st.room, st, invited: [], busy: false, seen: {} };
    renderOnline(); startPoll();
  }
  function renderOnline() {
    if (!S || S.view !== 'online') return;
    const st = S.st, id = ident(), me = id ? id.code : '';
    const host = st.host === me;
    const top = `${back('leave', t('← Leave room', '← Salir de la sala'))}${head()}`;
    if (S.gone) { set(`${top}<p class="lead">${t('This room has closed.', 'Esta sala se cerró.')}</p><button class="primary" data-pew="menu">${t('Back to Pew Talk', 'Volver a Plática de banca')}</button>`); return; }
    const players = `<div class="pew-players">${st.players.map(p => `<span class="pew-player${p.answered && st.phase === 'vote' && st.status === 'active' ? ' done' : ''}">${esc(p.name)}${p.code === me ? ` (${t('you', 'tú')})` : ''}${p.code === st.host ? ` · ${t('host', 'anfitrión')}` : ''}${st.status === 'active' && st.phase === 'vote' ? ` · ${p.answered ? t('answered', 'respondió') : t('thinking', 'pensando')}` : ''}</span>`).join('')}</div>`;
    if (st.status === 'waiting') {
      const friends = (window.msbFriendsCached ? msbFriendsCached() : []) || [];
      const inRoom = new Set(st.players.map(p => p.code));
      const invite = host ? (friends.length ? `<h2>${t('Invite friends', 'Invita a tus amigos')}</h2><div class="pew-invite-list">${friends.filter(f => f && f.code && !inRoom.has(f.code)).map(f => `<div class="card friend-row"><strong>${esc(f.name || t('Friend', 'Amigo'))}</strong>${S.invited.includes(f.code) ? `<span class="small muted">${t('Invited', 'Invitado')}</span>` : `<button class="secondary" data-pew="invite" data-to="${esc(f.code)}">${t('Invite', 'Invitar')}</button>`}</div>`).join('') || `<p class="small muted">${t('All your friends are already here.', 'Todos tus amigos ya están aquí.')}</p>`}</div>` : `<p class="small muted">${t('Add friends in Profile, then Friends, to invite them here.', 'Agrega amigos en Perfil, luego Amigos, para invitarlos aquí.')}</p>`) : '';
      set(`${top}<p class="lead">${t('Share this room code. Friends tap Play with friends online in Pew Talk and type it in.', 'Comparte este código. Tus amigos tocan Juega con amigos en línea en Plática de banca y lo escriben.')}</p>
        <p class="friend-code pew-roomcode">${esc(st.room)}</p>${players}
        ${host ? `<button class="primary" data-pew="start" ${st.players.length < 2 ? 'disabled' : ''}>${t('Start the game', 'Empezar el juego')}</button><p class="small muted">${st.players.length < 2 ? t('Waiting for a friend to join…', 'Esperando a que se una un amigo…') : t('Start when everyone is in. Up to 6 players.', 'Empieza cuando todos estén. Hasta 6 jugadores.')}</p>` : `<p class="lead">${t('You are in. Waiting for the host to start…', 'Ya estás dentro. Esperando a que el anfitrión empiece…')}</p>`}
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
      ${host ? `<p><button class="text-button" data-pew="reveal">${t('Show the answers now', 'Mostrar las respuestas ya')}</button></p>` : ''}${players}<p class="small muted" role="status" data-pew-status></p>`);
  }
  async function act(path, body) {
    if (!S || S.busy) return;
    S.busy = true;
    try { const st = await call(path, { room: S.room, ...(body || {}) }); if (st && st.room) S.st = st; renderOnline(); } catch (e) { status(e.message); } finally { if (S) S.busy = false; }
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
    if (a === 'leave') { leave(menu); return; }
    if (a === 'cat') { S.cat = b.dataset.cat; menu(); return; }
    if (a === 'local-setup') { localSetup(); return; }
    if (a === 'count') { readNames(); S.n = Number(b.dataset.n); renderSetup(); return; }
    if (a === 'local-start') { localStart(); return; }
    if (a === 'local-ready') { S.ready = true; renderLocal(); return; }
    if (a === 'local-vote') { localVote(b.dataset.answer); return; }
    if (a === 'local-next') { localNext(); return; }
    if (a === 'local-end') { finish(S.rounds, S.oneMind); return; }
    if (a === 'online-menu') { onlineMenu(); return; }
    if (a === 'create') { create(); return; }
    if (a === 'join-code') { const el = root.querySelector('[data-pew-code]'); join((el ? el.value : '').trim()); return; }
    if (a === 'join') { join(b.dataset.room); return; }
    if (a === 'invite') { const to = b.dataset.to; call('/pew/invite', { room: S.room, to }).then(() => { if (S && S.invited) { S.invited.push(to); renderOnline(); } }, err => status(err.message)); return; }
    if (a === 'start') { act('/pew/start'); return; }
    if (a === 'vote') { act('/pew/vote', { round: S.st.round, answer: b.dataset.answer }); return; }
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
