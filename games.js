/* Game shows for Mind Soul & Body: Jeopardy, Who Wants to Be a Millionaire,
   and Family Feud — Bible questions, timed, solo vs PC or pass-and-play on one
   device. Fully local: question bank in data/game-bank.json, best scores in
   the msb_local_v1 store. Seats are interchangeable: a seat is either a human
   at this device or the PC driver below. */
window.BibleGames = (() => {
  const BANK_URL = 'data/game-bank.json';
  const CLOCK_TICK = 100;
  let root = null, ctx = null, bank = null, G = null;

  /* ---------- small helpers ---------- */
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const rand = n => Math.floor(Math.random() * n);
  const shuffle = a => { const x = [...a]; for (let i = x.length - 1; i > 0; i--) { const j = rand(i + 1); [x[i], x[j]] = [x[j], x[i]]; } return x; };
  const sample = (pool, n) => shuffle(pool).slice(0, n);
  const money = n => '$' + Number(n).toLocaleString('en-US');
  const clampWager = (v, max) => { const n = Math.floor(Math.abs(Number(v) || 0)); return Math.max(0, Math.min(max, n)); };
  function storeGet() { try { return JSON.parse(localStorage.getItem('msb_local_v1')) || {} } catch { return {} } }
  function bestOf(show) { const g = storeGet().gameScores; return (g && g[show]) || { best: 0, plays: 0 }; }
  function saveBest(show, score) {
    const s = storeGet(); s.gameScores = s.gameScores || {};
    const e = s.gameScores[show] || (s.gameScores[show] = { best: 0, plays: 0 });
    e.plays++; if (score > e.best) e.best = score;
    const finishedOn = window.msbBadgeLocalDay ? msbBadgeLocalDay() : '';
    if (finishedOn) {
      e.finishedOn = finishedOn;
      e.days = Array.isArray(e.days) ? e.days : [];
      if (!e.days.includes(finishedOn)) e.days.push(finishedOn);
      if (e.days.length > 400) e.days = e.days.slice(-400);
    }
    try { localStorage.setItem('msb_local_v1', JSON.stringify(s)); } catch { /* private mode */ }
    if (window.msbCelebrate) { try { msbCelebrate(); } catch { /* achievement toast is optional */ } }
    /* Online hooks: post the final score to the live room this run belongs
       to; otherwise a solo run joins the public scores. Both silent offline. */
    try {
      const social = ctx && ctx.social;
      if (social) {
        if (gxRoom && gxRoom.show === show && !gxRoom.finished) {
          gxRoom.finished = true;
          social.roomScore(gxRoom.code, score, true).then(st => { if (st) { gxRoom.state = st; renderRoomBar(); } }).catch(() => {});
        } else if (!gxRoom && gxIsSoloRun(show)) {
          social.submitScore(show, score, (G && G.runLevel) || gxSelectedLevel(show)).catch(() => {});
        }
      }
    } catch { /* offline or no social layer — the local best above still saved */ }
  }

  /* ---------- live rooms (friend vs friend) + public solo scores ---------- */
  let gxRoom = null;        // {code, show, level, state} while a room run is live
  let gxRoomTimer = null;   // polling interval id (lobby wait or in-game sync)
  let gxRoomLaunching = false;

  function gxIsSoloRun(show) {
    if (!G) return false;
    switch (show) {
      case 'jeopardy': return G.mode === 'solo';
      case 'millionaire': return true;
      case 'feud': return G.mode === 'pc';
      case 'sound': return G.mode === 'solo';
      case 'babel': return true;
      case 'defend': case 'doctrine': return true;
      default: return false;
    }
  }
  function gxRoomScore() {
    if (!G || !gxRoom) return 0;
    switch (gxRoom.show) {
      case 'jeopardy': case 'feud': case 'sound': return (G.seats && G.seats[0] ? G.seats[0].score : 0) || 0;
      case 'millionaire': return G.rung > 1 && bank ? bank.millionaire.ladder[Math.min(G.rung - 2, bank.millionaire.ladder.length - 1)] : 0;
      case 'babel': case 'defend': case 'doctrine': return G.score || 0;
      default: return 0;
    }
  }
  function roomButtons(show) {
    return `<div class="gx-online">
      <p class="small muted">Play a friend online — you both need the app open with internet. A solo finish is saved on this device and joins the public scores once you have a friend code. The public board lists names and scores only.</p>
      <div class="gx-modes">
        <button class="card gx-mode" data-gx="room-create" data-show-key="${show}"><strong>🟢 Live room vs a friend</strong><span>Open a room at the level picked above, send your friend the room code, then race live — scores update as you play and the higher score wins.</span></button>
      </div>
      <p class="gx-joinrow"><input class="text-input" data-gx-room-input placeholder="ROOM-XXXXXX" autocapitalize="characters" maxlength="12"><button class="secondary" data-gx="room-join">Join room</button><button class="secondary" data-gx="scores" data-show-key="${show}">🌍 Public scores</button></p>
      <p class="small muted" data-gx-room-status></p>
    </div>`;
  }
  function roomStatus(text) {
    const el = root && root.querySelector('[data-gx-room-status]');
    if (el) el.textContent = text || '';
  }
  function stopRoomTimer() { if (gxRoomTimer) { clearInterval(gxRoomTimer); gxRoomTimer = null; } }
  function leaveRoomQuiet() {
    stopRoomTimer();
    if (gxRoom && ctx && ctx.social) ctx.social.roomLeave(gxRoom.code).catch(() => {});
    gxRoom = null;
  }
  function roomPlayerLine(players, me) {
    return players.map(p => `<div class="gx-seat ${p.code === me ? 'active' : ''}"><span>${esc(p.name)}${p.code === me ? ' (you)' : ''}</span><strong>${p.score || 0}${p.finished ? ' ✓' : ''}</strong></div>`).join('');
  }
  function renderRoomBar() {
    if (!root || !gxRoom || !gxRoom.state) return;
    let bar = root.querySelector('#gx-roombar');
    if (!bar) { bar = document.createElement('div'); bar.id = 'gx-roombar'; root.appendChild(bar); }
    const st = gxRoom.state, me = ctx.social.identity() ? ctx.social.identity().code : '';
    const done = st.status === 'done';
    const winner = done ? st.players.slice().sort((a, b) => (b.score || 0) - (a.score || 0))[0] : null;
    bar.innerHTML = `<span class="gx-roombar-code">🟢 ${esc(st.room)}</span>${roomPlayerLine(st.players, me)}${done ? `<strong class="gx-roombar-win">${winner && winner.code === me ? '🏆 You win the room!' : `🏆 ${esc(winner ? winner.name : '')} wins the room`}</strong>` : '<span class="small muted">live scores</span>'}`;
  }
  function roomLobby() {
    if (!gxRoom) return;
    const st = gxRoom.state;
    if (!st) { setHtml(`${backBar('Live room')}<div class="loading">Opening your room…</div>`); return; }
    const me = ctx.social.identity() ? ctx.social.identity().code : '';
    const host = st.host === me;
    const cfg = { jeopardy: 'Jeopardy', millionaire: 'Millionaire', feud: 'Family Feud', sound: 'Sound It Out', babel: 'Tower of Babel', defend: 'Defend the Faith', doctrine: 'Say It Right' }[st.show] || st.show;
    setHtml(`${backBar('Live room')}
      <p class="lead">Room for <strong>${esc(cfg)} · Level ${st.level}</strong>. Send this code to your friend — they tap <em>Join room</em> on the same game's screen and type it in.</p>
      <p class="friend-code gx-roomcode">${esc(st.room)}</p>
      <div class="gx-scorebar">${roomPlayerLine(st.players, me)}</div>
      ${st.status === 'waiting' ? (host
        ? `<button class="primary" data-gx="room-start" ${st.players.length < 2 ? 'disabled' : ''}>Start the match</button><p class="small muted">${st.players.length < 2 ? 'Waiting for your friend to join…' : 'Your friend is in. Start when ready — you both play at the same time.'}</p>`
        : '<p class="lead">You are in. Waiting for the host to start…</p>')
      : st.status === 'active' ? `<button class="primary" data-gx="room-play">Play my run now</button><p class="small muted">Scores update live for everyone in the room. Highest score when all finish wins.</p>`
      : '<p class="lead">This room is finished.</p>'}
      <p><button class="secondary" data-gx="room-leave">Leave room</button></p>`);
  }
  function pollRoomLobby() {
    stopRoomTimer();
    gxRoomTimer = setInterval(async () => {
      if (!gxRoom || !root) { stopRoomTimer(); return; }
      try {
        const st = await ctx.social.roomState(gxRoom.code);
        gxRoom.state = st;
        if (G && G.show === 'room') roomLobby();
      } catch { /* a missed poll is fine — the next one retries */ }
    }, 1500);
  }
  async function roomCreate(show) {
    if (!ctx.social || !ctx.social.identity()) { roomStatus('Get your friend code first (Profile → Friends), then come back and open a room.'); return; }
    roomStatus('Opening your room…');
    try {
      const st = await ctx.social.createRoom(show, gxSelectedLevel(show));
      gxRoom = { code: st.room, show: st.show, level: st.level, state: st, finished: false };
      G = { show: 'room', timers: [], tickId: null, clockEndsAt: 0, clockTotal: 0 };
      roomLobby();
      pollRoomLobby();
    } catch (err) { roomStatus(err.message); }
  }
  async function roomJoin() {
    const input = root && root.querySelector('[data-gx-room-input]');
    const code = (input ? input.value : '').trim().toUpperCase();
    if (!code) { roomStatus('Type the room code your friend sent you first.'); return; }
    if (!ctx.social || !ctx.social.identity()) { roomStatus('Get your friend code first (Profile → Friends), then come back and join.'); return; }
    roomStatus('Joining…');
    try {
      const st = await ctx.social.joinRoom(code);
      gxRoom = { code: st.room, show: st.show, level: st.level, state: st, finished: false };
      G = { show: 'room', timers: [], tickId: null, clockEndsAt: 0, clockTotal: 0 };
      roomLobby();
      pollRoomLobby();
    } catch (err) { roomStatus(err.message); }
  }
  async function roomStartMatch() {
    try {
      const st = await ctx.social.roomStart(gxRoom.code);
      gxRoom.state = st;
      roomLobby();
    } catch (err) { if (ctx.toast) ctx.toast(err.message); }
  }
  function roomPlay() {
    if (!gxRoom) return;
    const show = gxRoom.show;
    gxLevelSel[show] = gxRoom.level;
    gxRoomLaunching = true;
    showMenu(show);
    gxRoomLaunching = false;
    if (show === 'jeopardy') jeopardyStart('solo');
    else if (show === 'millionaire') millionaireStart();
    else if (show === 'feud') feudStart('pc');
    else if (show === 'sound') soundStart('solo');
    else if (show === 'babel') babelStart();
    else faithStart();
    renderRoomBar();
    startRoomSync();
  }
  function startRoomSync() {
    stopRoomTimer();
    gxRoomTimer = setInterval(async () => {
      if (!gxRoom || !root || !G || G.show !== gxRoom.show) return;
      try {
        if (!gxRoom.finished) await ctx.social.roomScore(gxRoom.code, gxRoomScore(), false);
        const st = await ctx.social.roomState(gxRoom.code);
        gxRoom.state = st;
        renderRoomBar();
      } catch { /* silent — live sync retries every two seconds */ }
    }, 2000);
  }
  async function scoresScreen(show) {
    clearTimers();
    G = { show: 'scores', timers: [], tickId: null, clockEndsAt: 0, clockTotal: 0 };
    const title = { jeopardy: 'Jeopardy', millionaire: 'Millionaire', feud: 'Family Feud', sound: 'Sound It Out', babel: 'Tower of Babel', defend: 'Defend the Faith', doctrine: 'Say It Right' }[show] || show;
    setHtml(`${backBar('Public scores')}<div class="loading">Gathering the ${esc(title)} board…</div>`);
    try {
      const scores = await ctx.social.publicScores(show);
      const meId = ctx.social.identity() ? (ctx.social.identity().publicId || '') : '';
      const rows = scores.length ? scores.map((s, i) => {
        const mine = !!(s && s.id && meId && s.id === meId);
        return `<div class="card friend-row"><div><strong>${i + 1}. ${esc(s.name || 'Friend')}</strong>${mine ? ' <span class="friend-chip">you</span>' : ''}<br><small class="muted">Level ${s.level || 1} · ${new Date(s.ts || Date.now()).toLocaleDateString()}</small></div><strong>${show === 'millionaire' ? money(s.score) : s.score}</strong></div>`;
      }).join('') : '<p class="muted">No solo scores yet. Finish a solo run of this game and you will open the board.</p>';
      setHtml(`${backBar('Public scores')}<p class="lead">🌍 ${esc(title)} — names and scores only. Friend codes are not shown.</p>${rows}<p><button class="secondary" data-gx="show-menu" data-show="${show}">← Back to ${esc(title)}</button></p>`);
    } catch (err) {
      setHtml(`${backBar('Public scores')}<div class="empty error">${esc(err.message)} <button class="secondary" data-gx="show-menu" data-show="${show}">Back to the game</button></div>`);
    }
  }

  /* ---------- timing: one countdown + a queue of scheduled PC steps ---------- */
  function stopClock() { if (G && G.tickId) { clearInterval(G.tickId); G.tickId = null; } }
  function clearTimers() { if (!G) return; stopClock(); (G.timers || []).forEach(clearTimeout); G.timers = []; G.pcAction = null; }
  function later(fn, ms) { if (!G) return; const id = setTimeout(() => { if (G) fn(); }, ms); G.timers.push(id); }
  function paintClock() {
    if (!root || !G) return;
    const left = Math.max(0, G.clockEndsAt - Date.now());
    const fill = root.querySelector('.gx-clock-fill'), text = root.querySelector('.gx-clock-text');
    if (fill) fill.style.width = (G.clockTotal ? (left / G.clockTotal) * 100 : 0) + '%';
    if (text) text.textContent = Math.ceil(left / 1000) + 's';
    const bar = root.querySelector('.gx-clock');
    if (bar) bar.classList.toggle('gx-clock-low', left <= 5000);
  }
  function startClock(seconds, onExpire) {
    if (!G) return;
    stopClock();
    G.clockTotal = seconds * 1000;
    G.clockEndsAt = Date.now() + G.clockTotal;
    G.clockExpire = onExpire;
    paintClock();
    G.tickId = setInterval(() => {
      if (!G) return;
      paintClock();
      if (Date.now() >= G.clockEndsAt) { const fn = G.clockExpire; stopClock(); if (fn) fn(); }
    }, CLOCK_TICK);
  }
  function clockHtml(label) {
    return `<div class="gx-clock" role="timer" aria-label="${esc(label || 'Time remaining')}"><div class="gx-clock-track"><i class="gx-clock-fill"></i></div><strong class="gx-clock-text"></strong></div>`;
  }
  /* Run the pending PC step right now (used by PC turns and the test harness). */
  function flushPc() { if (G && typeof G.pcAction === 'function') { const fn = G.pcAction; G.pcAction = null; fn(); } }

  /* ---------- shared rendering ---------- */
  function setHtml(html) {
    if (!root) return;
    root.innerHTML = html;
    const target = root.querySelector('[data-gx-autofocus]');
    if (target) setTimeout(() => { try { target.focus(); } catch { /* noop */ } }, 30);
  }
  function backBar(title) {
    return `<button class="text-button" data-gx="hub">← Games</button><button class="text-button gx-snd" data-gx="sound-toggle" aria-label="${gxSoundOn ? 'Mute sound effects' : 'Unmute sound effects'}">${gxSoundOn ? '🔊' : '🔇'}</button><button class="text-button gx-snd${gxMusicOn ? '' : ' gx-snd-off'}" data-gx="music-toggle" aria-label="${gxMusicOn ? 'Turn music off' : 'Turn music on'}">🎵</button><span class="eyebrow">GAME SHOW</span><h1>${esc(title)}</h1>`;
  }
  function scoreBar(seats, activeIdx) {
    return `<div class="gx-scorebar">${seats.map((s, i) => `<div class="gx-seat ${i === activeIdx ? 'active' : ''} ${s.pc ? 'pc' : ''}"><span>${esc(s.name)}</span><strong>${s.score}</strong></div>`).join('')}</div>`;
  }
  function nameInputs(mode) {
    if (mode === '2p' || mode === 'teams') {
      return `<label class="gx-field">Player one / Team one<input data-gx-name="0" value="Player 1" maxlength="20"></label>
              <label class="gx-field">Player two / Team two<input data-gx-name="1" value="Player 2" maxlength="20"></label>`;
    }
    return `<label class="gx-field">Your name<input data-gx-name="0" value="You" maxlength="20"></label>`;
  }
  function readNames(fallbacks) {
    const out = [];
    for (let i = 0; i < 2; i++) {
      const el = root && root.querySelector(`[data-gx-name="${i}"]`);
      out.push((el && el.value.trim()) || fallbacks[i]);
    }
    return out;
  }
  function bestLine(show, format) {
    const b = bestOf(show);
    return b.plays ? `<p class="small muted">Your best here: <strong>${format(b.best)}</strong> over ${b.plays} game${b.plays === 1 ? '' : 's'} on this device.</p>` : '';
  }

  /* ================= LEVELS =================
     Five saved levels per show. Rule: beat a level and it should
     save and give you new questions. Progress lives in localStorage
     'msb_gx_progress' as { show: { unlocked: 1..5, done: [levels] } }.
     Beating a level unlocks the next one; every level deals questions the
     player has not seen at earlier levels — new boards in Jeopardy and
     Feud, fresh card slices in Sound It Out, new rung plans in Millionaire,
     unseen-first draws in Tower of Babel. */
  const GX_LEVELS = {
    /* Millionaire: level -> questions to climb (target rung) + tier per rung */
    millionaire: [
      { target: 5, seq: ['easy', 'easy', 'easy', 'easy', 'easy'] },
      { target: 8, seq: ['easy', 'easy', 'easy', 'medium', 'medium', 'medium', 'medium', 'medium'] },
      { target: 11, seq: ['easy', 'easy', 'medium', 'medium', 'medium', 'medium', 'medium', 'medium', 'hard', 'hard', 'hard'] },
      { target: 13, seq: ['medium', 'medium', 'medium', 'medium', 'hard', 'hard', 'hard', 'hard', 'hard', 'hard', 'hard', 'hard', 'hard'] },
      { target: 15, seq: ['medium', 'medium', 'hard', 'hard', 'hard', 'hard', 'hard', 'hard', 'hard', 'hard', 'hard', 'hard', 'hard', 'hard', 'hard'] },
    ],
    /* Tower of Babel: level -> pieces to catch + the brick's starting fall time */
    babel: [
      { catches: 10, fallMs: 9000 }, { catches: 12, fallMs: 8400 }, { catches: 15, fallMs: 7800 },
      { catches: 18, fallMs: 7200 }, { catches: 20, fallMs: 6600 },
    ],
    /* Defend the Faith: level -> sparring theme + right answers needed to beat it */
    defend: [
      { name: 'First Replies', pass: 5 },
      { name: 'Right Words', pass: 5 },
      { name: 'The Islamic Dilemma', pass: 5 },
      { name: 'Hard Questions', pass: 5 },
      { name: 'Master Round', pass: 6 },
    ],
    /* Say It Right: level -> wording theme + right answers needed to beat it */
    doctrine: [
      { name: 'The Words', pass: 5 },
      { name: 'One God, Three Hypostases', pass: 5 },
      { name: 'Christ in Two Natures', pass: 5 },
      { name: 'Church Words', pass: 5 },
      { name: 'Say It Clean', pass: 6 },
    ],
  };
  let gxLevelSel = {};
  function gxProgAll() { try { const p = JSON.parse(localStorage.getItem('msb_gx_progress')); return p && typeof p === 'object' ? p : {}; } catch { return {}; } }
  function gxShowProg(show) {
    const raw = gxProgAll()[show] || {};
    return {
      unlocked: Math.min(5, Math.max(1, Number(raw.unlocked) || 1)),
      done: [...new Set((Array.isArray(raw.done) ? raw.done : []).filter(n => Number.isInteger(n) && n >= 1 && n <= 5))].sort((a, b) => a - b),
    };
  }
  function gxCanPlay(show, level) { return Number.isInteger(level) && level >= 1 && level <= 5 && level <= gxShowProg(show).unlocked; }
  function gxBeatLevel(show, level) {
    if (!(level >= 1 && level <= 5)) return gxShowProg(show);
    const all = gxProgAll(); const cur = gxShowProg(show);
    const next = { unlocked: Math.min(5, Math.max(cur.unlocked, level + 1)), done: [...new Set([...cur.done, level])].sort((a, b) => a - b) };
    all[show] = next;
    try { localStorage.setItem('msb_gx_progress', JSON.stringify(all)); } catch { /* private mode */ }
    return next;
  }
  function gxDefaultLevel(show) {
    const p = gxShowProg(show);
    const open = [1, 2, 3, 4, 5].find(n => n <= p.unlocked && !p.done.includes(n));
    return open || p.unlocked;
  }
  function gxSelectedLevel(show) { return gxCanPlay(show, gxLevelSel[show]) ? gxLevelSel[show] : gxDefaultLevel(show); }
  function gxLevelNote(show, level) {
    const p = gxShowProg(show);
    const bits = {
      jeopardy: 'Each level is a fresh board — five new categories, twenty-five new clues, and its own Final Jeopardy.',
      millionaire: `Reach question ${GX_LEVELS.millionaire[level - 1].target} of the ladder and bank the money to beat this level.`,
      feud: `A two-board match — boards ${(level - 1) * 2 + 1} and ${(level - 1) * 2 + 2} of ten. Clear both boards to beat this level.`,
      sound: 'Ten cards dealt fresh from this level of the deck. Decode 7 of 10 to beat it.',
      babel: `Catch ${GX_LEVELS.babel[level - 1].catches} falling pieces before the tower reaches ten bricks.`,
      defend: `Sparring round: ${GX_LEVELS.defend[level - 1].name}. Hear the objection, say your first sentence out loud, then choose the strongest opening. Get ${GX_LEVELS.defend[level - 1].pass} right to beat the level.`,
      doctrine: `Wording round: ${GX_LEVELS.doctrine[level - 1].name}. Learn the Church term, then choose the sentence that says it cleanly. Get ${GX_LEVELS.doctrine[level - 1].pass} right to beat the level.`,
    };
    return `${bits[show] || ''}${p.done.length ? ` Beaten so far: Level ${p.done.join(', ')}.` : ''}`;
  }
  function gxLevelChips(show) {
    const p = gxShowProg(show); const sel = gxSelectedLevel(show);
    return `<div class="gx-levels gx-lvlrow" role="group" aria-label="Choose a level">${[1, 2, 3, 4, 5].map(n => {
      const locked = n > p.unlocked, beaten = p.done.includes(n);
      return `<button class="secondary gx-level${n === sel ? ' active' : ''}" data-gx="lvl-pick" data-show-key="${show}" data-level="${n}"${locked ? ' disabled' : ''}>${locked ? '🔒 ' : ''}Level ${n}${beaten ? ' ✓' : ''}</button>`;
    }).join('')}</div><p class="small muted gx-levelnote">${esc(gxLevelNote(show, sel))}</p>`;
  }
  function gxStartSolo(show) {
    /* The canonical solo entry for each game (rooms and Next Level share it).
       Two-player modes restart in the same seats the player just used. */
    if (show === 'jeopardy') jeopardyStart(G && (G.mode === '2p' || G.mode === 'pc') ? G.mode : 'solo');
    else if (show === 'millionaire') millionaireStart();
    else if (show === 'feud') feudStart(G && G.mode === 'teams' ? 'teams' : 'pc');
    else if (show === 'sound') soundStart('solo');
    else if (show === 'babel') babelStart();
    else faithStart();
  }
  function gxNextLevelButton(beaten) {
    if (!beaten || !G || !G.runLevel || G.runLevel >= 5) return '';
    return `<button class="primary" data-gx="next-level">Next level ${G.runLevel + 1} →</button>`;
  }
  function gxLevelBanner(show, level, beaten) {
    if (!beaten || !level) return '';
    return level >= 5
      ? `<p class="lead gx-leveldone">Level complete — all five levels beaten! 🏆</p>`
      : `<p class="lead gx-leveldone">Level complete — Level ${level + 1} unlocked!</p>`;
  }

  /* ================= JEOPARDY ================= */
  function jeopardyMenu() {
    const b = bestOf('jeopardy');
    setHtml(`${backBar('Jeopardy')}
      <p class="lead">Five categories, twenty-five clues, and one final wager. Answer in question form — thirty seconds on the clock once you buzz.</p>
      ${bestLine('jeopardy', v => v + ' points')}
      ${gxLevelChips('jeopardy')}
      <div class="gx-modes">
        <button class="card gx-mode" data-gx="j-mode" data-mode="solo"><strong>Solo</strong><span>You against the board. Every clue is yours to win — or lose.</span></button>
        <button class="card gx-mode" data-gx="j-mode" data-mode="pc"><strong>You vs the PC</strong><span>The PC buzzes in too, faster on the big-money clues. Beat it to the buzzer.</span></button>
        <button class="card gx-mode" data-gx="j-mode" data-mode="2p"><strong>Two players</strong><span>Pass and play on this device. Tap your side to buzz.</span></button>
      </div>
      <div class="gx-names">${nameInputs('2p')}</div>
      <p class="footnote">For two-player games, set both names above. In solo and PC games only your name is used.</p>
      ${roomButtons('jeopardy')}`);
  }
  function jeopardyStart(mode) {
    const lvl = gxSelectedLevel('jeopardy');
    if (!gxCanPlay('jeopardy', lvl)) { showMenu('jeopardy'); return; }
    setSong('jeopardy');
    const usedNames = readNames(['You', 'Player 2']);
    const seats = mode === 'solo'
      ? [{ name: usedNames[0] || 'You', pc: false, score: 0 }]
      : mode === 'pc'
        ? [{ name: usedNames[0] || 'You', pc: false, score: 0 }, { name: 'The PC', pc: true, score: 0 }]
        : [{ name: usedNames[0] || 'Player 1', pc: false, score: 0 }, { name: usedNames[1] || 'Player 2', pc: false, score: 0 }];
    G = Object.assign(G || {}, {
      show: 'jeopardy', phase: 'pick', mode, seats, control: 0,
      runLevel: lvl, fin: (lvl === 1 ? bank.jeopardyFinal : ((bank.jeopardyBoards || [])[lvl - 2] || {}).final) || bank.jeopardyFinal,
      cats: (lvl === 1 ? bank.jeopardy : ((bank.jeopardyBoards || [])[lvl - 2] || {}).categories || bank.jeopardy).map(c => ({ name: c.category, clues: c.clues.map(cl => ({ ...cl, used: false })) })),
      current: null, buzzedBy: null, tried: [], finalists: null, wagers: {}, finalAnswers: {},
    });
    jeopardyBoard();
  }
  function jeopardyBoard() {
    G.phase = 'pick'; G.current = null; G.buzzedBy = null; G.tried = [];
    const done = G.cats.every(c => c.clues.every(cl => cl.used));
    setHtml(`${backBar('Jeopardy')}${scoreBar(G.seats, G.control)}
      ${done ? `<section class="card gx-center"><h2>The board is clear.</h2><p>Time for Final Jeopardy — wager on one last clue from ${esc((G.fin || bank.jeopardyFinal).category)}.</p><button class="primary" data-gx="j-final">Play Final Jeopardy</button></section>`
        : `<p class="lead gx-turn">${G.mode === 'solo' ? 'Pick any clue on the board.' : `<strong>${esc(G.seats[G.control].name)}</strong> ${G.seats[G.control].pc ? 'is choosing a clue…' : '— pick a clue.'}`}</p>
      <div class="gx-jboard">${G.cats.map((c, ci) => `<div class="gx-jcol"><h3>${esc(c.name)}</h3>${c.clues.map((cl, ri) => `<button class="gx-jcell" data-gx="j-pick" data-cat="${ci}" data-row="${ri}" ${cl.used || (G.seats[G.control].pc) ? 'disabled' : ''}>${cl.used ? '✓' : cl.value}</button>`).join('')}</div>`).join('')}</div>`}
      ${G.feedback ? `<div class="card gx-feedback ${G.feedback.good ? 'good' : 'bad'}" role="status"><strong>${esc(G.feedback.title)}</strong><p>${esc(G.feedback.body)}</p></div>` : ''}`);
    if (!done && G.seats[G.control].pc) {
      G.pcAction = () => pcPickClue();
      later(flushPc, 900);
    }
  }
  function pcPickClue() {
    const open = [];
    G.cats.forEach((c, ci) => c.clues.forEach((cl, ri) => { if (!cl.used) open.push({ ci, ri, value: cl.value }); }));
    if (!open.length) return;
    open.sort((a, b) => b.value - a.value);
    const chosen = open[rand(Math.min(3, open.length))];
    openClue(chosen.ci, chosen.ri);
  }
  function pcBuzzChance(value) { return 0.30 + (value / 1000) * 0.55; }        /* 200 → .41 … 1000 → .85 */
  function pcRightChance(value) { return value <= 400 ? 0.85 : value <= 600 ? 0.75 : value <= 800 ? 0.65 : 0.55; }
  function openClue(ci, ri) {
    const cl = G.cats[ci].clues[ri];
    G.current = { ci, ri, ...cl }; G.phase = 'buzz'; G.buzzedBy = null; G.tried = []; G.feedback = null;
    setHtml(`${backBar('Jeopardy')}${scoreBar(G.seats, G.control)}
      <section class="card gx-clue">
        <span class="eyebrow">${esc(G.cats[ci].name)} · ${cl.value}</span>
        <h2>${esc(cl.clue)}</h2>
        ${G.mode === 'solo' ? clockHtml('Thirty seconds to answer')
          : `${clockHtml('Thirty seconds to buzz in')}<p class="lead" id="gx-buzz-status">First to buzz answers. ${G.mode === 'pc' ? 'The PC is thinking about buzzing…' : ''}</p>
             <div class="gx-buzzrow">${G.seats.map((s, i) => s.pc ? '' : `<button class="gx-buzz" data-gx="j-buzz" data-seat="${i}">${esc(s.name)} — buzz!</button>`).join('')}</div>
             <div id="gx-answer-zone"></div>`}
        ${G.mode === 'solo' ? `<div class="gx-choices">${shuffle(cl.choices).map(ch => `<button data-gx="j-answer" data-choice="${esc(ch)}">${esc(ch)}</button>`).join('')}</div>` : ''}
        <p class="small muted">${esc(cl.reference)}</p>
      </section>`);
    if (G.mode === 'solo') {
      G.answerSeat = 0;
      startClock(30, () => resolveJeopardy(null, 0, true));
    } else {
      startClock(30, () => deadClue());
      if (G.mode === 'pc' && Math.random() < pcBuzzChance(cl.value)) {
        G.pcAction = () => pcAnswerBuzz();
        later(flushPc, 700 + rand(1600));
      }
    }
  }
  function deadClue() {
    if (!G || G.phase !== 'buzz') return;
    const cl = G.current;
    cl.used = true; G.cats[cl.ci].clues[cl.ri].used = true;
    G.phase = 'reveal';
    G.feedback = { good: false, title: 'No one buzzed in.', body: `The response was: ${cl.answer} (${cl.reference})` };
    renderJeopardyFeedback(false);
    later(() => jeopardyBoard(), 1000);
  }
  function buzz(seatIdx) {
    if (!G || G.phase !== 'buzz' || G.tried.includes(seatIdx)) return;
    G.pcAction = null;
    beginAnswer(seatIdx);
  }
  function pcAnswerBuzz() {
    stopClock();
    G.buzzedBy = 1; G.phase = 'answer'; G.answerSeat = 1;
    const zone = root.querySelector('#gx-answer-zone'), status = root.querySelector('#gx-buzz-status');
    if (status) status.innerHTML = `<strong>The PC buzzed in.</strong> It is thinking…`;
    if (zone) zone.innerHTML = `<p class="lead">The PC is answering for ${G.current.value}…</p>`;
    root.querySelectorAll('.gx-buzz').forEach(b => { b.disabled = true; });
    later(() => {
      const correct = Math.random() < pcRightChance(G.current.value);
      resolveJeopardy(correct ? G.current.answer : wrongChoice(), 1, false);
    }, 1100);
  }
  function wrongChoice() {
    const others = G.current.choices.filter(c => c !== G.current.answer);
    return others[rand(others.length)];
  }
  function beginAnswer(seatIdx) {
    G.buzzedBy = seatIdx; G.phase = 'answer'; G.answerSeat = seatIdx;
    stopClock();
    const cl = G.current;
    const zone = root.querySelector('#gx-answer-zone'), status = root.querySelector('#gx-buzz-status');
    root.querySelectorAll('.gx-buzz').forEach(b => { b.disabled = true; });
    const choicesHtml = `<div class="gx-choices">${shuffle(cl.choices).map(ch => `<button data-gx="j-answer" data-choice="${esc(ch)}">${esc(ch)}</button>`).join('')}</div>`;
    if (status) status.innerHTML = `<strong>${esc(G.seats[seatIdx].name)}</strong> buzzed in — thirty seconds.`;
    if (zone) zone.innerHTML = clockHtml('Thirty seconds to answer') + choicesHtml;
    else {
      const card = root.querySelector('.gx-clue');
      if (card) card.insertAdjacentHTML('beforeend', clockHtml('Thirty seconds to answer') + choicesHtml);
    }
    startClock(30, () => resolveJeopardy(null, seatIdx, true));
  }
  function resolveJeopardy(choiceText, seatIdx, timedOut) {
    if (!G.current || G.current.used) return;
    stopClock();
    const cl = G.current, seat = G.seats[seatIdx];
    const correct = !timedOut && choiceText === cl.answer;
    sfx(correct ? 'correct' : 'wrong');
    cl.used = true; G.cats[cl.ci].clues[cl.ri].used = true;
    if (correct) {
      seat.score += cl.value; G.control = seatIdx;
      G.feedback = { good: true, title: `${seat.name} — correct! +${cl.value}`, body: `${cl.answer} (${cl.reference})` };
      later(() => jeopardyBoard(), 900);
      renderJeopardyFeedback(true);
      return;
    }
    seat.score -= cl.value;
    G.tried.push(seatIdx);
    G.feedback = { good: false, title: timedOut ? `Time! ${seat.name} loses ${cl.value}.` : `No — ${seat.name} loses ${cl.value}.`, body: `The response was: ${cl.answer} (${cl.reference})` };
    const others = G.seats.map((s, i) => i).filter(i => i !== seatIdx && !G.tried.includes(i));
    if (G.mode !== 'solo' && others.length) {
      /* one rebound: the other seat may buzz for the same clue */
      G.phase = 'buzz'; G.current.used = false; G.cats[cl.ci].clues[cl.ri].used = false;
      renderJeopardyFeedback(false, others);
      return;
    }
    later(() => jeopardyBoard(), 900);
    renderJeopardyFeedback(false);
  }
  function renderJeopardyFeedback(goodRun, reboundSeats) {
    const zone = root.querySelector('.gx-clue');
    if (!zone) return;
    zone.querySelectorAll('.gx-choices button, .gx-buzz').forEach(b => { b.disabled = true; });
    const old = zone.querySelector('.gx-feedback'); if (old) old.remove();
    const extra = reboundSeats && reboundSeats.length
      ? `<div class="gx-buzzrow">${reboundSeats.map(i => G.seats[i].pc
          ? `<p class="lead">The PC may buzz for the rebound…</p>`
          : `<button class="gx-buzz" data-gx="j-buzz" data-seat="${i}">${esc(G.seats[i].name)} — buzz for the rebound!</button>`).join('')}</div><div id="gx-answer-zone"></div>`
      : '';
    zone.insertAdjacentHTML('beforeend', `<div class="card gx-feedback ${G.feedback.good ? 'good' : 'bad'}" role="status"><strong>${esc(G.feedback.title)}</strong><p>${esc(G.feedback.body)}</p></div>${extra}`);
    if (reboundSeats && reboundSeats.length && G.seats[reboundSeats[0]].pc) {
      G.pcAction = () => pcAnswerBuzz();
      later(flushPc, 900);
    }
    if (reboundSeats && reboundSeats.length) { const st = root.querySelector('#gx-buzz-status'); if (st) st.textContent = 'Rebound — the other side may buzz.'; }
  }
  function jeopardyFinalSetup() {
    stopClock();
    const fin = G.fin || bank.jeopardyFinal;
    let finalists = G.seats.map((s, i) => i).filter(i => G.seats[i].score > 0);
    if (!finalists.length) finalists = [0]; /* solo with a rough night still gets the final */
    G.finalists = finalists; G.wagers = {}; G.finalAnswers = {};
    finalists.forEach(i => { if (G.seats[i].pc) G.wagers[i] = Math.max(0, Math.round(G.seats[i].score * (0.2 + Math.random() * 0.4))); });
    G.phase = 'final-wager';
    setHtml(`${backBar('Final Jeopardy')}${scoreBar(G.seats, -1)}
      <section class="card gx-center">
        <span class="eyebrow">THE CATEGORY IS</span>
        <h2>${esc(fin.category)}</h2>
        <p>Wager any part of your score, then answer one last clue in thirty seconds.</p>
        ${finalists.map(i => G.seats[i].pc
          ? `<p><strong>${esc(G.seats[i].name)}</strong> has placed its wager.</p>`
          : `<label class="gx-field">${esc(G.seats[i].name)} — wager (0 to ${G.seats[i].score})<input type="number" inputmode="numeric" min="0" max="${G.seats[i].score}" value="100" data-gx-wager="${i}"></label>`).join('')}
        <button class="primary" data-gx="j-final-go">Reveal the final clue</button>
      </section>`);
  }
  function jeopardyFinalClue() {
    G.finalists.forEach(i => {
      if (!G.seats[i].pc) {
        const el = root.querySelector(`[data-gx-wager="${i}"]`);
        G.wagers[i] = clampWager(el ? el.value : 0, Math.max(0, G.seats[i].score));
      }
    });
    G.phase = 'final-clue'; G.finalSeatCursor = 0;
    finalAnswerTurn();
  }
  function finalAnswerTurn() {
    const fin = G.fin || bank.jeopardyFinal;
    const pending = G.finalists.filter(i => !(i in G.finalAnswers));
    if (!pending.length) { jeopardyFinalResults(); return; }
    const seatIdx = pending[0];
    G.finalTurn = seatIdx;
    if (G.seats[seatIdx].pc) {
      setHtml(`${backBar('Final Jeopardy')}${scoreBar(G.seats, -1)}
        <section class="card gx-clue"><span class="eyebrow">FINAL · ${esc(fin.category)}</span><h2>${esc(fin.clue)}</h2><p class="lead">The PC is writing its response…</p></section>`);
      later(() => {
        G.finalAnswers[seatIdx] = Math.random() < 0.6 ? fin.answer : fin.choices.find(c => c !== fin.answer);
        finalAnswerTurn();
      }, 1000);
      return;
    }
    setHtml(`${backBar('Final Jeopardy')}${scoreBar(G.seats, seatIdx)}
      <section class="card gx-clue"><span class="eyebrow">FINAL · ${esc(fin.category)}</span><h2>${esc(fin.clue)}</h2>
      <p><strong>${esc(G.seats[seatIdx].name)}</strong>, your wager is ${G.wagers[seatIdx]}. Thirty seconds.</p>
      ${clockHtml('Thirty seconds for the final answer')}
      <div class="gx-choices">${shuffle(fin.choices).map(ch => `<button data-gx="j-final-answer" data-choice="${esc(ch)}">${esc(ch)}</button>`).join('')}</div>
      <p class="small muted">${esc(fin.reference)}</p></section>`);
    startClock(30, () => { G.finalAnswers[seatIdx] = null; finalAnswerTurn(); });
  }
  function jeopardyFinalResults() {
    stopClock();
    const fin = G.fin || bank.jeopardyFinal;
    G.finalists.forEach(i => {
      const ok = G.finalAnswers[i] === fin.answer;
      G.seats[i].score += ok ? G.wagers[i] : -G.wagers[i];
    });
    jeopardyWinner();
  }
  function jeopardyWinner() {
    G.phase = 'over';
    const best = Math.max(...G.seats.map(s => s.score));
    const winners = G.seats.filter(s => s.score === best);
    const youScore = G.seats[0].score;
    const lvl = G.runLevel || 0;
    const beat = lvl > 0 && youScore > 0;
    if (beat) { gxBeatLevel('jeopardy', lvl); sfx('win'); }
    saveBest('jeopardy', youScore);
    setHtml(`${backBar('Jeopardy')}${scoreBar(G.seats, -1)}
      <section class="card gx-center">
        <span class="eyebrow">FINAL SCORES</span>
        <h2>${winners.length > 1 ? 'A tie game!' : `${esc(winners[0].name)} ${G.seats.length > 1 ? 'wins' : '— board cleared'}!`}</h2>
        <p>${G.seats.map(s => `${esc(s.name)}: <strong>${s.score}</strong>`).join(' · ')}</p>
        <p class="muted">The final response was: ${esc((G.fin || bank.jeopardyFinal).answer)} (${esc((G.fin || bank.jeopardyFinal).reference)})</p>
        ${gxLevelBanner('jeopardy', lvl, beat)}${lvl && !beat ? `<p class="muted">Finish above zero after Final Jeopardy to beat Level ${lvl}.</p>` : ''}
        ${gxNextLevelButton(beat)}
        <button class="primary" data-gx="show-menu" data-show="jeopardy">Play again</button>
        <button class="secondary" data-gx="hub">All games</button>
      </section>`);
  }

  /* ================= MILLIONAIRE ================= */
  function millionaireMenu() {
    setHtml(`${backBar('Who Wants to Be a Millionaire')}
      <p class="lead">Fifteen questions stand between you and a million. Safe havens at questions 5 and 10. Thirty seconds a question; walk away whenever you like.</p>
      ${bestLine('millionaire', v => money(v))}
      ${gxLevelChips('millionaire')}
      <div class="gx-names">${nameInputs('solo')}</div>
      <p class="lead">Lifelines, once each: <strong>50:50</strong> · <strong>Ask a Friend</strong> · <strong>Skip the Question</strong>.</p>
      <button class="primary" data-gx="m-start">Take the hot seat</button>
      ${roomButtons('millionaire')}`);
  }
  function tierFor(rung) { return rung <= 5 ? 'easy' : rung <= 10 ? 'medium' : 'hard'; }
  function millionaireStart() {
    const lvl = gxSelectedLevel('millionaire');
    if (!gxCanPlay('millionaire', lvl)) { showMenu('millionaire'); return; }
    setSong('millionaire');
    const usedNames = readNames(['You']);
    const plan = GX_LEVELS.millionaire[lvl - 1];
    const pools = { easy: shuffle(bank.millionaire.easy), medium: shuffle(bank.millionaire.medium), hard: shuffle(bank.millionaire.hard) };
    const usedCount = { easy: 0, medium: 0, hard: 0 };
    const questions = plan.seq.map(t => pools[t][usedCount[t]++]);
    G = Object.assign(G || {}, {
      show: 'millionaire', phase: 'question', name: usedNames[0] || 'You',
      rung: 1, runLevel: lvl, targetRung: plan.target, tierSeq: plan.seq,
      questions,
      spares: { easy: pools.easy.slice(usedCount.easy), medium: pools.medium.slice(usedCount.medium), hard: pools.hard.slice(usedCount.hard) },
      lifelines: { fifty: true, friend: true, skip: true }, hidden: [], friendNote: null, locked: null,
    });
    nextMillionaireQuestion();
  }
  function currentMillionaire() {
    return G.questions[G.rung - 1];
  }
  function nextMillionaireQuestion() {
    const q = currentMillionaire();
    G.options = shuffle(q.choices); G.hidden = []; G.friendNote = null; G.locked = null; G.phase = 'question';
    renderMillionaire();
    startClock(30, () => millionaireEnd(false, true));
  }
  function guaranteedAmount() {
    const havens = bank.millionaire.safeHavens; /* rung numbers reached = safe */
    let best = 0;
    havens.forEach(h => { if (G.rung > h) best = Math.max(best, bank.millionaire.ladder[h - 1]); });
    return best;
  }
  function renderMillionaire() {
    const q = currentMillionaire();
    const ladder = bank.millionaire.ladder;
    setHtml(`${backBar('Who Wants to Be a Millionaire')}
      <div class="gx-millionaire">
        <section class="card gx-question">
          <span class="eyebrow">${G.runLevel ? `LEVEL ${G.runLevel} · ` : ''}QUESTION ${G.rung} OF ${G.targetRung || 15} · ${money(ladder[G.rung - 1])}</span>
          <h2>${esc(q.q)}</h2>
          ${clockHtml('Thirty seconds')}
          <div class="gx-choices gx-mchoices">${G.options.map((opt, i) => G.hidden.includes(i) ? `<button disabled class="gx-hidden-opt">·</button>` : `<button data-gx="m-answer" data-choice="${esc(opt)}" ${G.locked !== null ? 'disabled' : ''}><b>${'ABCD'[i]}.</b> ${esc(opt)}</button>`).join('')}</div>
          ${G.friendNote ? `<div class="gx-friend" role="status"><strong>Your friend says:</strong> “I’m going with <b>${esc(G.friendNote.text)}</b> — about ${G.friendNote.confidence}% sure.”</div>` : ''}
          ${G.locked !== null ? `<p class="lead gx-locked">${G.locked ? 'That is correct.' : 'That is not the answer we needed.'}</p>` : `
          <div class="gx-lifelines">
            <button class="secondary" data-gx="m-life" data-life="fifty" ${G.lifelines.fifty ? '' : 'disabled'}>50:50</button>
            <button class="secondary" data-gx="m-life" data-life="friend" ${G.lifelines.friend ? '' : 'disabled'}>Ask a Friend</button>
            <button class="secondary" data-gx="m-life" data-life="skip" ${G.lifelines.skip ? '' : 'disabled'}>Skip Question</button>
            <button class="secondary gx-walk" data-gx="m-walk">Walk away with ${money(G.rung > 1 ? ladder[G.rung - 2] : 0)}</button>
          </div>`}
          <p class="small muted">${esc(q.reference)}</p>
        </section>
        <aside class="gx-ladder" aria-label="Money ladder">${ladder.map((v, i) => `<div class="gx-rung ${i + 1 === G.rung ? 'now' : ''} ${i + 1 < G.rung ? 'won' : ''} ${bank.millionaire.safeHavens.includes(i + 1) ? 'haven' : ''}"><span>${i + 1}</span><strong>${money(v)}</strong></div>`).reverse().join('')}</aside>
      </div>`);
    paintClock();
  }
  function millionaireAnswer(choiceText) {
    if (G.phase !== 'question' || G.locked !== null) return;
    const q = currentMillionaire();
    G.locked = choiceText === q.answer;
    renderMillionaire();
    stopClock();
    sfx('select');
    later(() => {
      if (G.locked) {
        sfx('correct');
        if (G.rung >= (G.targetRung || 15)) { millionaireEnd(G.rung >= 15, false, true); return; }
        G.rung++;
        nextMillionaireQuestion();
      } else {
        sfx('wrong');
        millionaireEnd(false, false);
      }
    }, 700);
  }
  function millionaireLifeline(kind) {
    if (G.phase !== 'question' || G.locked !== null || !G.lifelines[kind]) return;
    const q = currentMillionaire();
    if (kind === 'fifty') {
      G.lifelines.fifty = false;
      const wrong = G.options.map((o, i) => i).filter(i => G.options[i] !== q.answer);
      G.hidden = shuffle(wrong).slice(0, 2);
    } else if (kind === 'friend') {
      G.lifelines.friend = false;
      const tier = (G.tierSeq && G.tierSeq[G.rung - 1]) || tierFor(G.rung);
      const rightChance = tier === 'easy' ? 0.9 : tier === 'medium' ? 0.75 : 0.5;
      const pickRight = Math.random() < rightChance;
      const text = pickRight ? q.answer : G.options.find(o => o !== q.answer);
      const confidence = tier === 'easy' ? 80 + rand(16) : tier === 'medium' ? 65 + rand(21) : 45 + rand(26);
      G.friendNote = { text, confidence };
    } else if (kind === 'skip') {
      G.lifelines.skip = false;
      const tier = (G.tierSeq && G.tierSeq[G.rung - 1]) || tierFor(G.rung);
      if (G.spares[tier].length) G.questions[G.rung - 1] = G.spares[tier].shift();
      nextMillionaireQuestion();
      return;
    }
    renderMillionaire();
    paintClock();
  }
  function millionaireEnd(wonAll, timedOut, levelComplete) {
    stopClock();
    G.phase = 'over';
    const ladder = bank.millionaire.ladder;
    const won = wonAll ? ladder[14] : levelComplete ? ladder[(G.targetRung || 15) - 1] : guaranteedAmount();
    saveBest('millionaire', won);
    const beat = !!levelComplete && !!G.runLevel;
    if (beat) { gxBeatLevel('millionaire', G.runLevel); sfx('win'); }
    setHtml(`${backBar('Who Wants to Be a Millionaire')}
      <section class="card gx-center">
        <span class="eyebrow">${wonAll ? 'MILLIONAIRE' : beat ? 'LEVEL COMPLETE' : timedOut ? 'TIME RAN OUT' : 'GAME OVER'}</span>
        <h2>${wonAll ? `${esc(G.name)} — you did it!` : beat ? `${esc(G.name)} banked ${money(won)}` : `You leave with ${money(won)}`}</h2>
        <p>${wonAll ? 'Fifteen questions, answered in faith and knowledge. A perfect game.' : beat ? `You reached question ${G.targetRung} of the ladder — Level ${G.runLevel} is beaten and the money is yours to keep.` : `You reached question ${G.rung}${G.runLevel ? ` of ${G.targetRung}` : ' of 15'}. The guaranteed amount is yours to keep.`}</p>
        ${gxLevelBanner('millionaire', G.runLevel, beat)}
        ${gxNextLevelButton(beat)}
        <button class="primary" data-gx="show-menu" data-show="millionaire">Play again</button>
        <button class="secondary" data-gx="hub">All games</button>
      </section>`);
  }
  function millionaireWalk() {
    if (G.phase !== 'question') return;
    stopClock();
    const ladder = bank.millionaire.ladder;
    const won = G.rung > 1 ? ladder[G.rung - 2] : 0;
    G.phase = 'over';
    saveBest('millionaire', won);
    setHtml(`${backBar('Who Wants to Be a Millionaire')}
      <section class="card gx-center">
        <span class="eyebrow">WALKED AWAY</span>
        <h2>${/^you$/i.test(String(G.name || 'You').trim()) ? `You leave with ${money(won)}` : `${esc(G.name)} leaves with ${money(won)}`}</h2>
        <p>You stopped at question ${G.rung}. The correct answer was: <strong>${esc(currentMillionaire().answer)}</strong> (${esc(currentMillionaire().reference)}).</p>
        <button class="primary" data-gx="show-menu" data-show="millionaire">Play again</button>
        <button class="secondary" data-gx="hub">All games</button>
      </section>`);
  }


  /* ================= FAMILY FEUD ================= */
  function feudMenu() {
    setHtml(`${backBar('Family Feud')}
      <p class="lead">We asked the board — well, we wrote the board: our own house rankings, made for this app. Every answer starts hidden. Type a guess: if it's up there, the board flips it over with its points. Three strikes, and the other side gets one guess to steal the pot.</p>
      ${bestLine('feud', v => v + ' points')}
      ${gxLevelChips('feud')}
      <div class="gx-modes">
        <button class="card gx-mode" data-gx="f-mode" data-mode="pc"><strong>Your team vs the PC</strong><span>Face off against the machine across this level's two boards.</span></button>
        <button class="card gx-mode" data-gx="f-mode" data-mode="teams"><strong>Two teams, one device</strong><span>Pass and play. Each team guesses on its own turns.</span></button>
      </div>
      <div class="gx-names">${nameInputs('teams')}</div>
      <p class="footnote">Team names above are used in two-team games; against the PC only your team name is used.</p>
      ${roomButtons('feud')}`);
  }
  function feudStart(mode) {
    const lvl = gxSelectedLevel('feud');
    if (!gxCanPlay('feud', lvl)) { showMenu('feud'); return; }
    setSong('feud');
    const usedNames = readNames(['Your Team', 'Team Two']);
    const seats = mode === 'pc'
      ? [{ name: usedNames[0] || 'Your Team', pc: false, score: 0 }, { name: 'PC Team', pc: true, score: 0 }]
      : [{ name: usedNames[0] || 'Team One', pc: false, score: 0 }, { name: usedNames[1] || 'Team Two', pc: false, score: 0 }];
    G = Object.assign(G || {}, {
      show: 'feud', mode, seats, round: 0, runLevel: lvl, totalRounds: 2, order: [(lvl - 1) * 2, (lvl - 1) * 2 + 1], levelBoards: [], levelDone: false, matchOver: false, clearPlay: false,
      q: null, revealed: new Set(), pot: 0, multiplier: 1, strikes: 0,
      playing: 0, faceTurn: 0, faceHits: {}, faceMissed: {}, phase: 'splash', lastEvent: '',
    });
    feudBeginRound();
  }
  function feudBeginRound() {
    G.round++;
    G.q = bank.feud[G.order[(G.round - 1) % G.order.length]];
    G.clearPlay = false;
    G.revealed = new Set(); G.pot = 0; G.strikes = 0;
    G.multiplier = G.round === 3 ? 2 : 1;
    G.faceHits = {}; G.faceMissed = {};
    G.faceTurn = (G.round - 1) % 2;
    G.faceStarter = G.faceTurn; G.faceCycles = 0;
    G.justRevealed = null; G.flashX = 0;
    G.phase = 'faceoff'; G.lastEvent = '';
    feudRender();
    feudMaybePcFaceoff();
  }
  function feudSlotsHtml(flipIdx) {
    return `<div class="gx-feud-board">${G.q.answers.map((a, i) => G.revealed.has(i)
      ? `<div class="gx-slot open${flipIdx === i ? ' flip' : ''}"><span class="gx-slot-rank">${i + 1}</span><strong>${esc(a.text)}</strong><b>${a.points * G.multiplier}</b></div>`
      : `<div class="gx-slot covered"><span class="gx-slot-rank">${i + 1}</span><strong class="gx-hidden-answer">— — —</strong><b></b></div>`).join('')}</div>`;
  }
  function feudHeader() {
    return `${backBar('Family Feud')}${scoreBar(G.seats, G.phase === 'faceoff' ? G.faceTurn : G.playing)}
      <p class="gx-roundline">Board ${G.round} of ${G.totalRounds || 3}${G.runLevel ? ` · Level ${G.runLevel}` : ''}${G.multiplier > 1 ? ' · DOUBLE POINTS' : ''} · Pot: <strong>${G.pot}</strong> · Strikes: <strong class="gx-strikes">${'✕'.repeat(G.strikes)}${'·'.repeat(Math.max(0, 3 - G.strikes))}</strong></p>`;
  }
  function feudGuessRow(label) {
    return `<div class="gx-guessrow"><input data-gx-guess data-gx-autofocus placeholder="Type your guess…" maxlength="60" aria-label="Your guess"><button class="primary" data-gx="f-guess">${esc(label || 'Guess')}</button></div>`;
  }
  function feudRender() {
    const q = G.q;
    /* One-shot flourishes: the slot flipped by the last guess, and the big X. */
    const flipIdx = G.justRevealed, flashX = G.flashX;
    G.justRevealed = null; G.flashX = 0;
    const bigX = flashX ? '<div class="gx-bigx" aria-hidden="true">✕</div>' : '';
    if (G.phase === 'faceoff') {
      const turn = G.seats[G.faceTurn];
      setHtml(`${feudHeader()}
        <section class="card gx-clue"><span class="eyebrow">FACE-OFF</span><h2>${esc(q.prompt)}</h2>
        ${feudSlotsHtml(flipIdx)}
        ${G.lastEvent ? `<p class="gx-event" role="status">${esc(G.lastEvent)}</p>` : ''}
        ${turn.pc ? `<p class="lead">The PC is making its face-off guess…</p>` : `<p class="lead"><strong>${esc(turn.name)}</strong> — name an answer on the board. Twenty seconds.</p>${clockHtml('Twenty seconds to guess')}${feudGuessRow('Guess')}`}
        </section>`);
      if (!turn.pc) startClock(20, () => feudFaceGuess(null));
      return;
    }
    if (G.phase === 'playpass') {
      const winner = G.seats[G.playing];
      setHtml(`${feudHeader()}
        <section class="card gx-clue"><span class="eyebrow">FACE-OFF WON</span><h2>${esc(q.prompt)}</h2>
        ${feudSlotsHtml(flipIdx)}
        <p class="lead"><strong>${esc(winner.name)}</strong> took the face-off. Play the board, or pass it to ${esc(G.seats[1 - G.playing].name)}?</p>
        <div class="gx-buzzrow"><button class="primary" data-gx="f-playpass" data-choice="play">Play</button><button class="secondary" data-gx="f-playpass" data-choice="pass">Pass</button></div>
        </section>`);
      return;
    }
    if (G.phase === 'play') {
      const team = G.seats[G.playing];
      setHtml(`${feudHeader()}
        <section class="card gx-clue"><span class="eyebrow">${esc(team.name).toUpperCase()} AT THE BOARD</span><h2>${esc(q.prompt)}</h2>
        ${feudSlotsHtml(flipIdx)}${bigX}
        ${G.lastEvent ? `<p class="gx-event" role="status">${esc(G.lastEvent)}</p>` : ''}
        ${team.pc ? `<p class="lead">The PC team is guessing…</p>` : `<p class="lead"><strong>${esc(team.name)}</strong> — keep naming answers. Three strikes and the other team may steal. Twenty seconds a guess.</p>${clockHtml('Twenty seconds to guess')}${feudGuessRow('Guess')}`}
        </section>`);
      if (!team.pc) startClock(20, () => feudPlayGuess(null));
      return;
    }
    if (G.phase === 'steal') {
      const stealer = G.seats[1 - G.playing];
      setHtml(`${feudHeader()}
        <section class="card gx-clue"><span class="eyebrow">THE STEAL</span><h2>${esc(q.prompt)}</h2>
        ${feudSlotsHtml(flipIdx)}${bigX}
        <p class="lead">Three strikes! <strong>${esc(stealer.name)}</strong> — one answer steals the whole pot of ${G.pot}.</p>
        ${stealer.pc ? `<p class="lead">The PC is choosing its steal…</p>` : `${clockHtml('Twenty seconds for the steal')}${feudGuessRow('Steal it')}`}
        </section>`);
      if (!stealer.pc) startClock(20, () => feudStealGuess(null));
      else { G.pcAction = () => feudPcSteal(); later(flushPc, 1000); }
      return;
    }
    if (G.phase === 'reveal') {
      setHtml(`${feudHeader()}
        <section class="card gx-clue"><span class="eyebrow">WHAT WAS LEFT</span><h2>${esc(q.prompt)}</h2>
        ${feudSlotsHtml(flipIdx)}
        <p class="lead">${esc(G.lastEvent)}</p>
        <p class="lead">Let's see what was still hiding on the board…</p>
        </section>`);
      return;
    }
    if (G.phase === 'splash' || G.phase === 'over') { feudSplash(); return; }
  }
  /* ---------- games audio: shared sfx engine + a soft generative music loop.
     WebAudio only, no audio files. Sound is garnish: everything is wrapped in
     try/catch and nothing here may ever block or break a game. Two switches
     live in the back bar: 'msb_gx_sound' gates the sound effects and
     'msb_gx_music' gates the songs; each is persisted and independent. */
  let gxAudio = null, gxNoiseBuf = null, gxMusicBus = null;
  let gxSoundOn = (() => { try { return localStorage.getItem('msb_gx_sound') !== 'off'; } catch { return true; } })();
  let gxMusicOn = (() => { try { return localStorage.getItem('msb_gx_music') !== 'off'; } catch { return true; } })();
  function gxCtx() {
    if (!gxSoundOn && !gxMusicOn) return null;
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return null;
      gxAudio = gxAudio || new AC();
      if (gxAudio.state === 'suspended') gxAudio.resume();
      return gxAudio;
    } catch { return null; }
  }
  function sfx(kind) {
    if (!gxSoundOn) return;
    const ac = gxCtx(); if (!ac) return;
    if (window.msbYieldAudio) {
      window.msbYieldAudio('game-sfx', true);
      clearTimeout(sfx.yieldTimer);
      sfx.yieldTimer = setTimeout(() => { if (window.msbYieldAudio) window.msbYieldAudio('game-sfx', false); }, 800);
    }
    try {
      const t = ac.currentTime;
      const tone = (freq, start, dur, type, vol, slideTo) => {
        const o = ac.createOscillator(), g = ac.createGain();
        o.type = type || 'sine';
        o.frequency.setValueAtTime(freq, t + start);
        if (slideTo) o.frequency.exponentialRampToValueAtTime(Math.max(20, slideTo), t + start + dur);
        g.gain.setValueAtTime(0.0001, t + start);
        g.gain.exponentialRampToValueAtTime(vol || 0.14, t + start + 0.02);
        g.gain.exponentialRampToValueAtTime(0.0001, t + start + dur);
        o.connect(g); g.connect(ac.destination);
        o.start(t + start); o.stop(t + start + dur + 0.05);
      };
      const noise = (start, dur, vol, fFrom, fTo) => {
        if (!gxNoiseBuf) {
          gxNoiseBuf = ac.createBuffer(1, Math.floor(ac.sampleRate * 0.6), ac.sampleRate);
          const d = gxNoiseBuf.getChannelData(0);
          for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
        }
        const src = ac.createBufferSource(); src.buffer = gxNoiseBuf;
        const f = ac.createBiquadFilter(); f.type = 'lowpass';
        f.frequency.setValueAtTime(fFrom, t + start);
        f.frequency.exponentialRampToValueAtTime(Math.max(40, fTo), t + start + dur);
        const g = ac.createGain();
        g.gain.setValueAtTime(vol, t + start);
        g.gain.exponentialRampToValueAtTime(0.0001, t + start + dur);
        src.connect(f); f.connect(g); g.connect(ac.destination);
        src.start(t + start); src.stop(t + start + dur + 0.05);
      };
      if (kind === 'ding') { tone(880, 0, 0.16); tone(1318, 0.08, 0.3); }
      else if (kind === 'buzz') { tone(138, 0, 0.5, 'sawtooth', 0.1); tone(104, 0, 0.5, 'square', 0.07); }
      else if (kind === 'win') { tone(660, 0, 0.14); tone(880, 0.11, 0.14); tone(1320, 0.22, 0.34); }
      else if (kind === 'correct') { tone(659, 0, 0.13, 'triangle', 0.15); tone(988, 0.09, 0.26, 'triangle', 0.15); }
      else if (kind === 'wrong') { tone(165, 0, 0.28, 'sawtooth', 0.1, 92); tone(92, 0.02, 0.32, 'square', 0.06, 61); }
      else if (kind === 'land') { tone(74, 0, 0.3, 'sine', 0.3, 38); noise(0, 0.09, 0.1, 900, 180); }
      else if (kind === 'catch') { tone(880, 0, 0.1, 'triangle', 0.11); tone(1175, 0.06, 0.11, 'triangle', 0.11); tone(1568, 0.12, 0.2, 'triangle', 0.11); }
      else if (kind === 'crash') { noise(0, 0.55, 0.3, 2600, 130); tone(216, 0, 0.55, 'sawtooth', 0.1, 52); tone(147, 0.05, 0.6, 'triangle', 0.12, 44); }
      else if (kind === 'tick') { tone(1250, 0, 0.035, 'square', 0.045); }
      else if (kind === 'select') { tone(620, 0, 0.07, 'sine', 0.1, 730); }
      else if (kind === 'flip') { tone(320, 0, 0.16, 'sine', 0.09, 940); }
      else if (kind === 'lose') { tone(392, 0, 0.16, 'triangle', 0.12); tone(311, 0.13, 0.16, 'triangle', 0.12); tone(262, 0.26, 0.2, 'triangle', 0.12); tone(196, 0.39, 0.36, 'triangle', 0.12); }
    } catch { /* sound is garnish, never a blocker */ }
  }
  /* Generative music: every game has its OWN song. WebAudio plucks only,
     no files. Each song is data (tempo, mode, chord loop, waves, density);
     setSong() crossfades between them. Starts on the first pointer inside
     games; the scheduler stops itself once the games UI has left the DOM
     (or hide() stops it directly). */
  let gxMusicTimer = null, gxMusicStep = 0, gxMusicMiss = 0, gxFadeTimer = null, gxSongKey = 'hub';
  const GX_SONGS = {
    /* hub — the calm menu loop (Am–F–C–G), as it has always been */
    hub: { bpm: 63, mode: 'aeolian', wave: 'triangle', bassWave: 'sine', density: 0.55, stepsPerChord: 8, noteLen: 1.5, vol: 0.055, bassVol: 0.10, bassEvery: 0, bassDiv: 2, octUp: 0.3, tick: false,
      chords: [[110.00, 220.00, 261.63, 329.63], [87.31, 174.61, 220.00, 261.63], [130.81, 196.00, 261.63, 329.63], [98.00, 196.00, 246.94, 293.66]] },
    /* feud — bright and bouncy show-time (C–G–Am–F) */
    feud: { bpm: 112, mode: 'major', wave: 'square', bassWave: 'triangle', density: 0.7, stepsPerChord: 4, noteLen: 0.5, vol: 0.035, bassVol: 0.09, bassEvery: 2, bassDiv: 2, octUp: 0.35, tick: false,
      chords: [[130.81, 261.63, 329.63, 392.00], [98.00, 196.00, 246.94, 293.66], [110.00, 220.00, 261.63, 329.63], [87.31, 174.61, 220.00, 261.63]] },
    /* jeopardy — thinking music: soft puzzle motif, ticking clock edge (Dm–Bb–Gm–A) */
    jeopardy: { bpm: 84, mode: 'natural minor', wave: 'sine', bassWave: 'sine', density: 0.4, stepsPerChord: 8, noteLen: 0.9, vol: 0.05, bassVol: 0.09, bassEvery: 0, bassDiv: 2, octUp: 0.15, tick: true,
      chords: [[146.83, 293.66, 349.23, 440.00], [116.54, 233.08, 293.66, 349.23], [98.00, 196.00, 233.08, 293.66], [110.00, 220.00, 277.18, 329.63]] },
    /* millionaire — tense and dramatic: slow, sparse, low pulse (Am–F–Am–E) */
    millionaire: { bpm: 52, mode: 'harmonic minor', wave: 'sine', bassWave: 'sine', density: 0.16, stepsPerChord: 16, noteLen: 3.2, vol: 0.05, bassVol: 0.13, bassEvery: 8, bassDiv: 1, octUp: 0.1, tick: false,
      chords: [[55.00, 110.00, 130.81, 164.81], [43.65, 87.31, 110.00, 130.81], [55.00, 110.00, 130.81, 164.81], [41.20, 82.41, 103.83, 164.81]] },
    /* sound — playful pentatonic bounce (C–F–G–F) */
    sound: { bpm: 124, mode: 'major pentatonic', wave: 'triangle', bassWave: 'sine', density: 0.75, stepsPerChord: 4, noteLen: 0.45, vol: 0.05, bassVol: 0.08, bassEvery: 2, bassDiv: 2, octUp: 0.5, tick: false,
      chords: [[130.81, 261.63, 329.63, 392.00], [174.61, 349.23, 440.00, 523.25], [98.00, 196.00, 246.94, 293.66], [174.61, 349.23, 440.00, 523.25]] },
    /* babel — ancient and ominous, hijaz color (E–F–C–E); thickens as the tower rises */
    babel: { bpm: 58, mode: 'phrygian dominant', wave: 'triangle', bassWave: 'sine', density: 0.3, stepsPerChord: 8, noteLen: 1.8, vol: 0.055, bassVol: 0.14, bassEvery: 4, bassDiv: 1, octUp: 0.1, tick: false,
      chords: [[82.41, 164.81, 207.65, 246.94], [87.31, 174.61, 220.00, 261.63], [65.41, 130.81, 164.81, 196.00], [82.41, 164.81, 207.65, 246.94]] },
    /* defend — steady debate music: low strings, slow questions (Dm–Bb–F–A) */
    defend: { bpm: 76, mode: 'natural minor', wave: 'sine', bassWave: 'sine', density: 0.42, stepsPerChord: 8, noteLen: 1.0, vol: 0.05, bassVol: 0.1, bassEvery: 4, bassDiv: 2, octUp: 0.12, tick: false,
      chords: [[146.83, 293.66, 349.23, 440.00], [116.54, 233.08, 293.66, 349.23], [87.31, 174.61, 220.00, 261.63], [110.00, 220.00, 277.18, 329.63]] },
    /* doctrine — clear bright wording drill (C–Am–F–G) */
    doctrine: { bpm: 104, mode: 'major', wave: 'triangle', bassWave: 'sine', density: 0.66, stepsPerChord: 4, noteLen: 0.55, vol: 0.045, bassVol: 0.085, bassEvery: 2, bassDiv: 2, octUp: 0.4, tick: false,
      chords: [[130.81, 261.63, 329.63, 392.00], [110.00, 220.00, 261.63, 329.63], [87.31, 174.61, 220.00, 261.63], [98.00, 196.00, 246.94, 293.66]] },
  };
  function gxSong() { return GX_SONGS[gxSongKey] || GX_SONGS.hub; }
  function gxStepMs() { return Math.round(30000 / gxSong().bpm); }
  function gxDensity(song) {
    let d = song.density;
    if (gxSongKey === 'babel' && G && G.show === 'babel') d = Math.min(0.85, d + (G.height || 0) * 0.035);
    return d;
  }
  function gxPluck(freq, vol, type, len) {
    try {
      if (!gxAudio || !gxMusicBus) return;
      const t = gxAudio.currentTime, dur = len || 1.5;
      const o = gxAudio.createOscillator(), g = gxAudio.createGain();
      o.type = type || 'triangle'; o.frequency.value = freq;
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(vol, t + 0.03);
      g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      o.connect(g); g.connect(gxMusicBus);
      o.start(t); o.stop(t + dur + 0.1);
    } catch { /* garnish */ }
  }
  function gxMusicTick() {
    const mounted = root && document.contains(root) && root.querySelector('[data-gx]');
    if (!mounted) { if (++gxMusicMiss >= 3) stopMusic(); return; }
    gxMusicMiss = 0;
    const song = gxSong();
    const chord = song.chords[Math.floor(gxMusicStep / song.stepsPerChord) % song.chords.length];
    const inBar = gxMusicStep % song.stepsPerChord;
    if (inBar === 0) gxPluck(chord[0] / (song.bassDiv || 2), song.bassVol, song.bassWave, song.noteLen * 1.6);
    else if (song.bassEvery && inBar % song.bassEvery === 0) gxPluck(chord[0] / (song.bassDiv || 2), song.bassVol * 0.7, song.bassWave, song.noteLen);
    const roll = Math.random();
    if (roll < gxDensity(song)) gxPluck(chord[1 + rand(chord.length - 1)] * (Math.random() < (song.octUp || 0.3) ? 2 : 1), song.vol, song.wave, song.noteLen);
    else if (song.tick && inBar % 2 === 0) gxPluck(chord[0] * 8, 0.016, 'square', 0.06);
    gxMusicStep++;
  }
  function startMusic() {
    if (!gxMusicOn || gxMusicTimer) return;
    const ac = gxCtx(); if (!ac) return;
    try {
      if (!gxMusicBus) { gxMusicBus = ac.createGain(); gxMusicBus.connect(ac.destination); }
      gxMusicBus.gain.value = 0.5;
      gxMusicMiss = 0;
      gxMusicTimer = setInterval(gxMusicTick, gxStepMs());
      if (window.msbYieldAudio) window.msbYieldAudio('game-music', true);
    } catch { /* garnish */ }
  }
  function stopMusic() {
    if (gxMusicTimer) { clearInterval(gxMusicTimer); gxMusicTimer = null; }
    if (gxFadeTimer) { clearTimeout(gxFadeTimer); gxFadeTimer = null; }
    if (window.msbYieldAudio) window.msbYieldAudio('game-music', false);
  }
  /* Switch songs: dip the music bus, restart the scheduler on the new tempo. */
  function setSong(key) {
    try {
      const next = GX_SONGS[key] ? key : 'hub';
      if (next === gxSongKey) return;
      gxSongKey = next; gxMusicStep = 0;
      if (!gxMusicTimer) return;
      clearInterval(gxMusicTimer); gxMusicTimer = null;
      const restart = () => { gxFadeTimer = null; if (gxMusicOn && gxAudio) gxMusicTimer = setInterval(gxMusicTick, gxStepMs()); };
      if (gxAudio && gxMusicBus) {
        const t = gxAudio.currentTime, g = gxMusicBus.gain;
        g.cancelScheduledValues(t); g.setValueAtTime(Math.max(0.02, g.value), t);
        g.linearRampToValueAtTime(0.02, t + 0.12);
        gxFadeTimer = setTimeout(() => { try { g.linearRampToValueAtTime(0.5, gxAudio.currentTime + 0.35); } catch { /* garnish */ } restart(); }, 140);
      } else restart();
    } catch { /* garnish */ }
  }
  function feudTopIdx() {
    let best = 0;
    G.q.answers.forEach((a, i) => { if (a.points > G.q.answers[best].points) best = i; });
    return best;
  }
  function feudNormalize(text) {
    return String(text || '').toLowerCase().replace(/[’']/g, '').replace(/[^a-z0-9 ]/g, ' ').replace(/\s+/g, ' ').trim();
  }
  function feudSingular(w) {
    if (w.length > 4 && w.endsWith('ies')) return w.slice(0, -3) + 'y';
    if (w.length > 3 && w.endsWith('es') && /(s|x|z|ch|sh)$/.test(w.slice(0, -2))) return w.slice(0, -2);
    if (w.length > 3 && w.endsWith('s') && !w.endsWith('ss') && !w.endsWith('us')) return w.slice(0, -1);
    return w;
  }
  function feudTokens(text) {
    return feudNormalize(text).split(' ').filter(t => t && t !== 'a' && t !== 'an' && t !== 'the').map(feudSingular);
  }
  function feudLev(a, b) {
    if (a === b) return 0;
    const m = a.length, n = b.length;
    if (!m) return n;
    if (!n) return m;
    let prev = [];
    for (let j = 0; j <= n; j++) prev.push(j);
    for (let i = 1; i <= m; i++) {
      const cur = [i];
      for (let j = 1; j <= n; j++) cur.push(Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1)));
      prev = cur;
    }
    return prev[n];
  }
  /* Forgiving scorer: exact > word-subset > substring > near-miss spelling. */
  function feudScore(inputTokens, targetTokens) {
    const inp = inputTokens.join(' '), tgt = targetTokens.join(' ');
    if (!inp || !tgt) return 0;
    if (inp === tgt) return 100;
    const inSet = new Set(inputTokens), tgSet = new Set(targetTokens);
    if ([...inSet].every(t => tgSet.has(t)) || [...tgSet].every(t => inSet.has(t))) return 85;
    if (inp.length >= 4 && (tgt.includes(inp) || inp.includes(tgt))) return 75;
    if (inp.length >= 4) {
      const d = feudLev(inp, tgt);
      if (d <= (tgt.length >= 8 ? 2 : 1)) return 62 - d;
    }
    return 0;
  }
  function feudMatch(text) {
    const inputTokens = feudTokens(text);
    if (!inputTokens.length) return -1;
    let bestAny = { idx: -1, score: 0 }, bestOpen = { idx: -1, score: 0 };
    G.q.answers.forEach((a, i) => {
      let s = 0;
      [a.text, ...(a.aliases || [])].forEach((t, k) => { s = Math.max(s, feudScore(inputTokens, feudTokens(t)) - (k ? 4 : 0)); });
      if (s > bestAny.score) bestAny = { idx: i, score: s };
      if (!G.revealed.has(i) && s > bestOpen.score) bestOpen = { idx: i, score: s };
    });
    if (bestOpen.score >= 55) return bestOpen.idx;
    if (bestAny.score >= 55) return bestAny.idx; /* already showing — callers call it out */
    return -1;
  }
  function feudMaybePcFaceoff() {
    if (G && G.phase === 'faceoff' && G.seats[G.faceTurn] && G.seats[G.faceTurn].pc) {
      G.pcAction = () => feudPcFaceGuess();
      later(flushPc, 900);
    }
  }
  function feudPcPickAnswer() {
    /* PC names a board answer weighted by its points, or strikes out. */
    const unrevealed = G.q.answers.map((a, i) => i).filter(i => !G.revealed.has(i));
    if (!unrevealed.length) return -1;
    const total = unrevealed.reduce((sum, i) => sum + G.q.answers[i].points, 0);
    let roll = Math.random() * total;
    for (const i of unrevealed) { roll -= G.q.answers[i].points; if (roll <= 0) return i; }
    return unrevealed[0];
  }
  function feudPcGuessIdx() {
    /* The PC "types" a real board answer with fading confidence as the board
       empties — a team running dry — or misses, and names a decoy instead. */
    const open = G.q.answers.map((a, i) => i).filter(i => !G.revealed.has(i));
    if (!open.length) return -1;
    const pHit = Math.max(0.25, 0.8 - 0.12 * G.revealed.size);
    return Math.random() < pHit ? feudPcPickAnswer() : -1;
  }
  function feudPcDecoy() {
    const pool = (G.q.decoys || []).filter(d => feudMatch(d) < 0);
    return pool.length ? pool[rand(pool.length)] : 'something not on the board';
  }
  function feudPcFaceGuess() {
    if (!G || G.phase !== 'faceoff') return;
    const hit = Math.random() < 0.85 ? feudPcPickAnswer() : -1;
    feudApplyFace(G.faceTurn, hit, hit >= 0 ? G.q.answers[hit].text : feudPcDecoy());
  }
  function feudFaceGuess(text) {
    if (!G || G.phase !== 'faceoff') return;
    if (text !== null && !String(text).trim()) return; /* an empty box is not a guess */
    stopClock();
    feudApplyFace(G.faceTurn, text === null ? -1 : feudMatch(text), text === null ? '' : text.trim());
  }
  function feudApplyFace(seat, hitIdx, shownGuess) {
    const other = 1 - seat;
    if (hitIdx >= 0 && !G.revealed.has(hitIdx)) {
      G.revealed.add(hitIdx);
      G.pot += G.q.answers[hitIdx].points * G.multiplier;
      G.faceHits[seat] = G.q.answers[hitIdx].points;
      G.justRevealed = hitIdx;
      sfx('ding');
      G.lastEvent = `${G.seats[seat].name} found “${G.q.answers[hitIdx].text}” — ${G.q.answers[hitIdx].points * G.multiplier} points.`;
      if (hitIdx === feudTopIdx()) { G.lastEvent += ' That is the number one answer!'; feudFaceWinner(seat); return; }
      if (G.faceHits[other] != null) {
        feudFaceWinner(G.faceHits[seat] > G.faceHits[other] ? seat : other);
        return;
      }
      if (G.faceMissed[other]) { feudFaceWinner(seat); return; }
      G.faceTurn = other;
    } else {
      G.lastEvent = hitIdx >= 0
        ? 'Already on the board — that counts as a miss.'
        : (shownGuess ? `${G.seats[seat].name} guessed “${shownGuess}” — not on the board.` : `${G.seats[seat].name} named nothing on the board.`);
      G.faceMissed[seat] = true;
      if (G.faceHits[other] != null) { feudFaceWinner(other); return; }
      if (G.faceMissed[other]) {
        G.faceCycles = (G.faceCycles || 0) + 1;
        if (G.faceCycles >= 2) {
          G.lastEvent += ` Neither side could crack the board, so control goes to ${G.seats[G.faceStarter].name}.`;
          feudFaceWinner(G.faceStarter);
          return;
        }
        G.faceMissed = {}; G.faceTurn = G.faceStarter; G.lastEvent += ' Both missed — guess again.';
      }
      else G.faceTurn = other;
    }
    feudRender();
    feudMaybePcFaceoff();
  }
  function feudFaceWinner(winner) {
    G.playing = winner; G.phase = 'playpass';
    if (G.seats[winner].pc) {
      G.playing = Math.random() < 0.85 ? winner : 1 - winner;
      G.lastEvent = G.playing === winner ? 'The PC chooses to play the board.' : 'The PC passes the board over.';
      G.phase = 'play'; G.strikes = 0;
      feudRender();
      feudMaybePcPlay();
    } else {
      feudRender();
    }
  }
  function feudPlayPass(choice) {
    if (choice === 'pass') G.playing = 1 - G.playing;
    G.phase = 'play'; G.strikes = 0;
    G.lastEvent = '';
    feudRender();
    feudMaybePcPlay();
  }
  function feudPlayGuess(text) {
    if (!G || G.phase !== 'play') return;
    if (text !== null && !String(text).trim()) return; /* an empty box is not a guess */
    stopClock();
    const idx = text === null ? -1 : feudMatch(text);
    if (idx >= 0 && !G.revealed.has(idx)) feudReveal(idx, `${G.seats[G.playing].name} found “${G.q.answers[idx].text}” (+${G.q.answers[idx].points * G.multiplier}).`);
    else if (idx >= 0) feudStrike(`“${String(text).trim()}” is already on the board — that costs a strike.`);
    else feudStrike(text === null ? 'Time ran out with no guess.' : `“${String(text).trim()}” is not on the board.`);
  }
  function feudReveal(idx, message) {
    G.revealed.add(idx);
    G.pot += G.q.answers[idx].points * G.multiplier;
    G.lastEvent = message;
    G.justRevealed = idx;
    sfx('ding');
    if (G.revealed.size >= G.q.answers.length) { G.clearPlay = true; feudSettle(G.playing, 'The board is cleared!'); return; }
    feudRender();
    feudMaybePcPlay();
  }
  function feudStrike(message) {
    G.strikes++;
    sfx('buzz');
    G.flashX = G.strikes;
    if (G.strikes >= 3) { if (!G.seats[G.playing].pc) sfx('lose'); G.phase = 'steal'; G.lastEvent = `${message} Three strikes!`; feudRender(); return; }
    G.lastEvent = `${message} Strike ${G.strikes} of 3.`;
    feudRender();
    feudMaybePcPlay();
  }
  function feudMaybePcPlay() {
    if (G && G.phase === 'play' && G.seats[G.playing].pc) {
      G.pcAction = () => feudPcPlayGuess();
      later(flushPc, 1100);
    }
  }
  function feudPcPlayGuess() {
    if (!G || G.phase !== 'play') return;
    const idx = feudPcGuessIdx();
    if (idx >= 0) feudReveal(idx, `The PC guessed “${G.q.answers[idx].text}” (+${G.q.answers[idx].points * G.multiplier}).`);
    else feudStrike(`The PC guessed “${feudPcDecoy()}” — not on the board.`);
  }
  function feudPcSteal() {
    if (!G || G.phase !== 'steal') return;
    const idx = Math.random() < 0.5 ? feudPcPickAnswer() : -1;
    feudApplySteal(idx, idx >= 0 ? '' : feudPcDecoy());
  }
  function feudStealGuess(text) {
    if (!G || G.phase !== 'steal') return;
    if (text !== null && !String(text).trim()) return; /* an empty box is not a guess */
    stopClock();
    feudApplySteal(text === null ? -1 : feudMatch(text), text === null ? '' : text.trim());
  }
  function feudApplySteal(idx, shownGuess) {
    const stealer = 1 - G.playing;
    if (idx >= 0 && !G.revealed.has(idx)) {
      G.revealed.add(idx);
      G.pot += G.q.answers[idx].points * G.multiplier;
      G.justRevealed = idx;
      sfx('ding');
      G.lastEvent = `The steal is good — “${G.q.answers[idx].text}” was on the board!`;
      feudSettle(stealer, G.lastEvent);
    } else if (idx >= 0) {
      if (!G.seats[stealer].pc) sfx('lose');
      G.lastEvent = `“${shownGuess}” is already showing — the steal fails.`;
      feudSettle(G.playing, G.lastEvent);
    } else {
      if (!G.seats[stealer].pc) sfx('lose');
      G.lastEvent = shownGuess ? `The steal missed — “${shownGuess}” is not up there.` : 'The steal missed.';
      feudSettle(G.playing, G.lastEvent);
    }
  }
  function feudSettle(winner, message) {
    stopClock();
    G.seats[winner].score += G.pot;
    G.roundWinner = winner;
    G.lastEvent = `${message} ${G.seats[winner].name} takes the pot of ${G.pot}.`;
    const totalRounds = G.totalRounds || 3;
    /* Level matches: a board counts as cleared only when its last hidden
       answer falls during play — not on a steal, not during the leftover
       flip-through — and, against the PC, only when your team cleared it. */
    if (G.runLevel) {
      const cleared = !!G.clearPlay && (G.mode !== 'pc' || winner === 0);
      G.levelBoards = G.levelBoards || [];
      G.levelBoards[G.round - 1] = cleared;
      G.levelDone = cleared && G.round >= totalRounds;
      G.matchOver = !cleared || G.round >= totalRounds;
      if (G.levelDone) gxBeatLevel('feud', G.runLevel);
      if (G.matchOver) { const top = Math.max(...G.seats.map(s => s.score)); saveBest('feud', top); }
    } else if (G.round >= totalRounds) {
      const top = Math.max(...G.seats.map(s => s.score));
      saveBest('feud', top);
    }
    sfx(G.runLevel && G.matchOver && !G.levelDone ? 'lose' : 'win');
    const left = G.q.answers.map((a, i) => i).filter(i => !G.revealed.has(i));
    if (left.length) {
      /* Show-style: flip whatever is left, one at a time, before the splash. */
      G.phase = 'reveal';
      G.leftToReveal = left;
      feudRender();
      later(feudRevealNext, 850);
    } else {
      G.phase = (G.matchOver || G.round >= totalRounds) ? 'over' : 'splash';
      feudSplash();
    }
  }
  function feudRevealNext() {
    if (!G || G.phase !== 'reveal') return;
    const idx = G.leftToReveal.shift();
    if (idx === undefined) {
      G.phase = (G.matchOver || G.round >= (G.totalRounds || 3)) ? 'over' : 'splash';
      feudSplash();
      return;
    }
    G.revealed.add(idx);
    G.justRevealed = idx;
    sfx('ding');
    feudRender();
    later(feudRevealNext, 700);
  }
  function feudSplash() {
    const over = G.phase === 'over';
    const lvlLine = !G.runLevel ? '' : G.levelDone ? gxLevelBanner('feud', G.runLevel, true) : over ? `<p class="muted">Clear both boards to beat Level ${G.runLevel} — a board counts when its last hidden answer falls while your team is playing it.</p>` : '';
    const top = Math.max(...G.seats.map(s => s.score));
    const champs = G.seats.filter(s => s.score === top);
    setHtml(`${feudHeader()}
      <section class="card gx-center">
        <span class="eyebrow">${over ? 'THAT IS THE GAME' : `ROUND ${G.round} COMPLETE`}</span>
        <h2>${over ? (champs.length > 1 ? 'A tie game!' : `${esc(champs[0].name)} win${G.seats.length > 1 && champs[0].pc ? 's' : ''} the Feud!`) : `${esc(G.seats[G.roundWinner].name)} take round ${G.round}`}</h2>
        <p>${esc(G.lastEvent)}</p>
        ${lvlLine}
        ${gxNextLevelButton(over && !!G.levelDone)}
        <p>${G.seats.map(s => `${esc(s.name)}: <strong>${s.score}</strong>`).join(' · ')}</p>
        ${over
          ? `<button class="primary" data-gx="show-menu" data-show="feud">Play again</button> <button class="secondary" data-gx="hub">All games</button>`
          : `<button class="primary" data-gx="f-next">Start ${G.runLevel ? 'board' : 'round'} ${G.round + 1}</button>`}
      </section>`);
  }

  /* ================= SOUND IT OUT ================= */
  const SOUND_BASE = { easy: 100, medium: 200, hard: 300 };
  function soundDeck(level) {
    const all = bank.soundItOut || [];
    if (level === 'easy') return all.filter(c => c.level === 'easy');
    if (level === 'hard') return all.filter(c => c.level === 'hard');
    return all;
  }
  /* Solo level journey — five disjoint sets of ten, so every level deals
     cards the player has not seen at earlier levels. Slices of the tiered
     bank (in bank order):
       L1 easy 1-10 · L2 easy 11-20 · L3 medium 1-10
       L4 medium 11-15 + hard 1-5 · L5 hard 6-15
     (medium 16-20 and hard 16-20 stay in the free race/party pools.) */
  function gxSoundLevelDeck(level) {
    const all = bank.soundItOut || [];
    const tier = t => all.filter(c => c.level === t);
    const e = tier('easy'), m = tier('medium'), h = tier('hard');
    const slices = [e.slice(0, 10), e.slice(10, 20), m.slice(0, 10), [...m.slice(10, 15), ...h.slice(0, 5)], h.slice(5, 15)];
    return slices[level - 1] ? [...slices[level - 1]] : [];
  }
  function soundMenu() {
    const lvl = (G && G.level) || 'mixed';
    setHtml(`${backBar('Sound It Out')}
      <p class="lead">Lines of Scripture, hidden in phonetic gibberish. Sound the card out — aloud works best — and decode the real phrase. Two or three readings is the point now: the ear gets it before the eye does.</p>
      <p class="small muted gx-levelcap">Solo journey — beaten levels save</p>
      ${gxLevelChips('sound')}
      <p class="small muted gx-levelcap">Race &amp; party — free-play difficulty</p>
      <div class="gx-levels" role="group" aria-label="Difficulty">
        ${[['easy', 'Easy'], ['mixed', 'Mixed'], ['hard', 'Hard']].map(([k, l]) => `<button class="secondary gx-level ${lvl === k ? 'active' : ''}" data-gx="s-level" data-level="${k}">${l}</button>`).join('')}
      </div>
      ${bestLine('sound', v => v + ' points')}
      <div class="gx-modes">
        <button class="card gx-mode" data-gx="s-mode" data-mode="solo"><strong>Solo decode — level run</strong><span>Ten fresh cards from the level picked above. Reveal when you're ready, score yourself honestly, and decode 7 of 10 to beat the level.</span></button>
        <button class="card gx-mode" data-gx="s-mode" data-mode="race"><strong>Race the PC</strong><span>Four phrases, one true card. Tap the real line before the PC cracks it — a wrong tap hands it the steal.</span></button>
        <button class="card gx-mode" data-gx="s-mode" data-mode="party"><strong>Party — pass and play</strong><span>One reader sounds the gibberish aloud; everyone else decodes by ear. Twelve cards, reader rotates.</span></button>
      </div>
      <div class="gx-names">${nameInputs('solo')}</div>
      <p class="footnote">Your name is used in solo and race games. Party names are set on the next screen.</p>
      ${roomButtons('sound')}`);
  }
  function soundStart(mode) {
    setSong('sound');
    const lvl = (G && G.level) || 'mixed';
    if (mode === 'party') { soundPartySetup(); return; }
    const usedNames = readNames(['You']);
    const base = { show: 'sound', level: lvl, phase: 'card', idx: 0, streak: 0, timedOut: false, timeLeft: 0 };
    if (mode === 'race') {
      G = Object.assign(G || {}, base, {
        mode: 'race', runLevel: 0,
        seats: [{ name: usedNames[0] || 'You', pc: false, score: 0 }, { name: 'The PC', pc: true, score: 0 }],
        deck: sample(soundDeck(lvl), 10),
      });
    } else {
      const slvl = gxSelectedLevel('sound');
      if (!gxCanPlay('sound', slvl)) { showMenu('sound'); return; }
      G = Object.assign(G || {}, base, {
        mode: 'solo', runLevel: slvl, decoded: 0,
        seats: [{ name: usedNames[0] || 'You', pc: false, score: 0 }],
        deck: sample(gxSoundLevelDeck(slvl), 10),
      });
    }
    soundCard();
  }
  function soundCardData() { return G.deck[G.idx]; }
  function soundCard() {
    if (!G) return;
    const c = soundCardData();
    G.phase = 'card'; G.timedOut = false;
    const eyebrow = `CARD ${G.idx + 1} OF ${G.deck.length} · ${c.level.toUpperCase()} · ${SOUND_BASE[c.level]} POINTS`;
    if (G.mode === 'party') {
      const holder = G.seats[G.holder];
      setHtml(`${backBar('Sound It Out')}${scoreBar(G.seats, G.holder)}
        <section class="card gx-clue">
          <span class="eyebrow">${eyebrow}</span>
          <p class="lead"><strong>${esc(holder.name)}</strong> — read this aloud. Everyone else decodes it by ear.</p>
          <h2 class="gx-gibberish">${esc(c.gibberish)}</h2>
          ${clockHtml('Forty-five seconds')}
          <button class="primary" data-gx="s-reveal" data-gx-autofocus>Reveal the phrase</button>
        </section>`);
      startClock(45, () => soundReveal(true));
      return;
    }
    if (G.mode === 'race') {
      const pool = (bank.soundItOut || []).filter(x => x.phrase !== c.phrase);
      const sameLevel = pool.filter(x => x.level === c.level);
      const decoyCards = sameLevel.length >= 3
        ? sample(sameLevel, 3)
        : [...sameLevel, ...sample(pool.filter(x => x.level !== c.level), 3 - sameLevel.length)];
      const decoys = decoyCards.map(x => x.phrase);
      G.options = shuffle([c.phrase, ...decoys]);
      setHtml(`${backBar('Sound It Out')}${scoreBar(G.seats, 0)}
        <section class="card gx-clue">
          <span class="eyebrow">${eyebrow}</span>
          <h2 class="gx-gibberish">${esc(c.gibberish)}</h2>
          <p class="lead">Which line of Scripture is this? Tap it before the PC decodes it.</p>
          ${clockHtml('Twenty seconds')}
          <div class="gx-choices">${G.options.map(o => `<button data-gx="s-pick" data-choice="${esc(o)}">${esc(o)}</button>`).join('')}</div>
        </section>`);
      startClock(20, () => soundPcSteal(true));
      return;
    }
    setHtml(`${backBar('Sound It Out')}${scoreBar(G.seats, 0)}
      <section class="card gx-clue">
        <span class="eyebrow">${eyebrow}</span>
        <h2 class="gx-gibberish">${esc(c.gibberish)}</h2>
        <p class="lead">Sound it out. Got it — or giving up? Reveal and score yourself honestly.</p>
        ${clockHtml('Thirty seconds')}
        <button class="primary" data-gx="s-reveal" data-gx-autofocus>Reveal the phrase</button>
      </section>`);
    startClock(30, () => soundReveal(true));
  }
  function soundReveal(timedOut) {
    if (!G || G.phase !== 'card' || G.mode === 'race') return;
    const c = soundCardData();
    G.timeLeft = timedOut ? 0 : Math.max(0, Math.ceil((G.clockEndsAt - Date.now()) / 1000));
    stopClock();
    sfx('flip');
    if (timedOut && G.mode === 'solo') G.streak = 0;
    G.phase = 'reveal'; G.timedOut = !!timedOut;
    const last = G.idx + 1 >= G.deck.length;
    let actions;
    if (G.mode === 'solo') {
      actions = G.timedOut
        ? `<p class="lead">Time's up — that one got away.</p><button class="primary" data-gx="s-next" data-gx-autofocus>${last ? 'See results' : 'Next card'}</button>`
        : `<p class="lead">Be honest now.</p><div class="gx-buzzrow"><button class="primary" data-gx="s-got" data-gx-autofocus>Got it</button><button class="secondary" data-gx="s-missed">Missed it</button></div>`;
    } else {
      actions = `<p class="lead">${G.timedOut ? 'Time! ' : ''}Who decoded it?</p>
        <div class="gx-buzzrow">${G.seats.map((s, i) => i === G.holder ? '' : `<button class="primary" data-gx="s-party-got" data-seat="${i}">${esc(s.name)}</button>`).join('')}<button class="secondary" data-gx="s-party-none">Nobody</button></div>`;
    }
    setHtml(`${backBar('Sound It Out')}${scoreBar(G.seats, G.mode === 'party' ? G.holder : 0)}
      <section class="card gx-clue">
        <span class="eyebrow">THE PHRASE WAS</span>
        <h2>“${esc(c.phrase)}”</h2>
        <p class="muted">${esc(c.ref)}</p>
        <p class="gx-gibberish-small">You read: ${esc(c.gibberish)}</p>
        ${actions}
      </section>`);
  }
  function soundSoloScore(got) {
    if (!G || G.phase !== 'reveal' || G.mode !== 'solo') return;
    if (got) G.decoded = (G.decoded || 0) + 1;
    const c = soundCardData();
    if (got) {
      const bonus = Math.min(G.streak, 5) * 10;
      G.seats[0].score += SOUND_BASE[c.level] + (G.timeLeft || 0) * 2 + bonus;
      G.streak++;
    } else {
      G.streak = 0;
    }
    soundNext();
  }
  function soundNext() {
    if (!G) return;
    G.idx++;
    if (G.idx >= G.deck.length) { soundResults(); return; }
    if (G.mode === 'party') G.holder = G.idx % G.seats.length;
    soundCard();
  }
  function soundPick(choice) {
    if (!G || G.mode !== 'race' || G.phase !== 'card') return;
    const c = soundCardData();
    if (choice === c.phrase) {
      stopClock();
      sfx('catch');
      G.seats[0].score += SOUND_BASE[c.level];
      soundRaceEnd(`${esc(G.seats[0].name)} cracked it — +${SOUND_BASE[c.level]}.`, true);
      return;
    }
    stopClock();
    G.phase = 'steal';
    setHtml(`${backBar('Sound It Out')}${scoreBar(G.seats, 0)}
      <section class="card gx-clue">
        <span class="eyebrow">CARD ${G.idx + 1} OF ${G.deck.length} · ${c.level.toUpperCase()} · ${SOUND_BASE[c.level]} POINTS</span>
        <h2 class="gx-gibberish">${esc(c.gibberish)}</h2>
        <p class="lead">Not that one. The PC is sounding it out…</p>
        <div class="gx-choices">${G.options.map(o => `<button disabled>${esc(o)}</button>`).join('')}</div>
      </section>`);
    G.pcAction = () => soundPcSteal(false);
    later(flushPc, 1300);
  }
  function soundPcSteal(fromTimeout) {
    if (!G || G.mode !== 'race' || (G.phase !== 'card' && G.phase !== 'steal')) return;
    stopClock();
    const c = soundCardData();
    const chance = c.level === 'easy' ? 0.62 : c.level === 'medium' ? 0.52 : 0.42;
    if (Math.random() < chance) {
      sfx('wrong');
      G.seats[1].score += SOUND_BASE[c.level];
      soundRaceEnd(`The PC decoded it — +${SOUND_BASE[c.level]} to the machine.`, false);
    } else {
      soundRaceEnd('The PC couldn’t crack it either. The card dies.', false);
    }
  }
  function soundRaceEnd(message, youWon) {
    const c = soundCardData();
    G.phase = 'reveal';
    const last = G.idx + 1 >= G.deck.length;
    setHtml(`${backBar('Sound It Out')}${scoreBar(G.seats, youWon ? 0 : 1)}
      <section class="card gx-clue">
        <span class="eyebrow">THE PHRASE WAS</span>
        <h2>“${esc(c.phrase)}”</h2>
        <p class="muted">${esc(c.ref)}</p>
        <p class="gx-gibberish-small">You read: ${esc(c.gibberish)}</p>
        <p class="lead">${message}</p>
        <button class="primary" data-gx="s-next" data-gx-autofocus>${last ? 'See results' : 'Next card'}</button>
      </section>`);
  }
  function soundPartySetup() {
    const lvl = (G && G.level) || 'mixed';
    G = Object.assign(G || {}, { show: 'sound', mode: 'party', level: lvl, runLevel: 0, phase: 'setup' });
    setHtml(`${backBar('Sound It Out')}
      <p class="lead">Two to four players, one device. The reader sounds the gibberish aloud — no showing the card. Twelve cards; the reader rotates every card.</p>
      <div class="gx-names">
        ${[0, 1, 2, 3].map(i => `<label class="gx-field">Player ${i + 1}${i > 1 ? ' (optional)' : ''}<input data-gx-pname="${i}" ${i < 2 ? `value="Player ${i + 1}"` : 'placeholder="Leave blank if unused"'} maxlength="20"></label>`).join('')}
      </div>
      <button class="primary" data-gx="s-party-start" data-gx-autofocus>Start the party</button>`);
  }
  function soundPartyStart() {
    if (!G) return;
    const names = [];
    for (let i = 0; i < 4; i++) {
      const el = root.querySelector(`[data-gx-pname="${i}"]`);
      const v = el ? el.value.trim() : '';
      if (v) names.push(v);
    }
    while (names.length < 2) names.push('Player ' + (names.length + 1));
    const lvl = G.level || 'mixed';
    G = Object.assign(G || {}, {
      show: 'sound', mode: 'party', level: lvl, phase: 'card', idx: 0, holder: 0, streak: 0,
      seats: names.map(n => ({ name: n, pc: false, score: 0 })),
      deck: sample(soundDeck(lvl), 12),
    });
    soundCard();
  }
  function soundPartyAward(seatIdx) {
    if (!G || G.mode !== 'party' || G.phase !== 'reveal') return;
    const c = soundCardData();
    if (seatIdx >= 0 && G.seats[seatIdx]) G.seats[seatIdx].score += SOUND_BASE[c.level];
    soundNext();
  }
  function soundResults() {
    if (!G) return;
    stopClock();
    G.phase = 'over';
    saveBest('sound', G.mode === 'party' ? Math.max(...G.seats.map(s => s.score)) : G.seats[0].score);
    const b = bestOf('sound');
    let title, blurb, extra = '';
    if (G.mode === 'solo') {
      const got = G.decoded || 0, slvl = G.runLevel || 0;
      const beat = slvl > 0 && got >= 7;
      if (beat) { gxBeatLevel('sound', slvl); sfx('win'); }
      title = `${esc(G.seats[0].name)} — ${G.seats[0].score} points`;
      blurb = `${G.deck.length} cards by ear — you decoded ${got}. Best on this device: ${b.best} over ${b.plays} game${b.plays === 1 ? '' : 's'}.`;
      extra = gxLevelBanner('sound', slvl, beat) || (slvl ? `<p class="muted">Decode 7 of ${G.deck.length} to beat Level ${slvl}.</p>` : '');
    } else {
      const top = Math.max(...G.seats.map(s => s.score));
      const champs = G.seats.filter(s => s.score === top);
      title = champs.length > 1 ? 'A tie game!' : `${esc(champs[0].name)} win${champs[0].pc || G.mode === 'party' ? 's' : ''}!`;
      blurb = G.mode === 'race' ? 'You raced the machine card for card.' : 'Twelve cards, read aloud and decoded by ear.';
    }
    setHtml(`${backBar('Sound It Out')}${scoreBar(G.seats, -1)}
      <section class="card gx-center">
        <span class="eyebrow">FINAL SCORE</span>
        <h2>${title}</h2>
        <p>${G.seats.map(s => `${esc(s.name)}: <strong>${s.score}</strong>`).join(' · ')}</p>
        <p class="muted">${blurb}</p>
        ${extra}
        ${gxNextLevelButton(G.mode === 'solo' && (G.runLevel || 0) > 0 && (G.decoded || 0) >= 7)}
        <button class="primary" data-gx="show-menu" data-show="sound">Play again</button>
        <button class="secondary" data-gx="hub">All games</button>
      </section>`);
  }

  /* ================= TOWER OF BABEL =================
     Design: no countdown bar. A brick falls slowly toward the tower;
     a right answer catches it mid-air, a wrong answer (or letting it land)
     slams it onto the wall. Ten bricks and the tower topples. */
  const BABEL_MAX = 10;
  let gxChallengesPromise = null;
  function loadChallenges() {
    if (!gxChallengesPromise) {
      gxChallengesPromise = fetch('data/study-challenges.json', { cache: 'no-store' })
        .then(res => { if (!res.ok) throw Error(`The lesson questions could not be loaded (${res.status}).`); return res.json(); })
        .catch(err => { gxChallengesPromise = null; throw err; });
    }
    return gxChallengesPromise;
  }
  /* Pure pool builder (also exercised by the offline harness): jeopardy clues
     and final + every keyed lesson question, normalized to {prompt, choices(4),
     answer, source}, deduped by prompt. Three-choice questions borrow a
     distractor from a sibling question in the same activity. */
  function babelBuildPool(bankData, chData) {
    const pool = [], seen = new Set();
    const clean = v => String(v == null ? '' : v).trim().replace(/\s+/g, ' ');
    const add = (prompt, choices, answer, source) => {
      const p = clean(prompt);
      if (!p || seen.has(p)) return;
      const a = String(answer == null ? '' : answer);
      const cs = [...new Set((choices || []).map(c => String(c)))];
      if (cs.length < 4 || !cs.includes(a)) return;
      seen.add(p);
      pool.push({ prompt: p, choices: cs.length > 4 ? [a, ...cs.filter(c => c !== a).slice(0, 3)] : cs, answer: a, source: clean(source) });
    };
    ((bankData && bankData.jeopardy) || []).forEach(cat => (cat.clues || []).forEach(cl => add(cl.clue, cl.choices, cl.answer, `${cat.category || 'Jeopardy'} · ${cl.reference || ''}`)));
    if (bankData && bankData.jeopardyFinal) { const f = bankData.jeopardyFinal; add(f.clue, f.choices, f.answer, `Final Jeopardy · ${f.reference || ''}`); }
    ((chData && chData.challenges) || []).forEach(act => {
      const qs = (act.questions || []).filter(q => q && Number.isInteger(q.correct) && Array.isArray(q.choices) && q.choices.length >= 3 && q.choices[q.correct] != null);
      const sibling = [...new Set(qs.flatMap(q => q.choices.map(c => String(c))))];
      qs.forEach(q => {
        const cs = q.choices.map(c => String(c));
        if (cs.length === 3) {
          const extra = shuffle(sibling.filter(c => !cs.includes(c)))[0];
          if (!extra) return;
          cs.push(extra);
        }
        add(q.prompt, cs, cs[q.correct], act.title || 'Study lesson');
      });
    });
    return pool;
  }
  /* Unseen-first deck assembly: questions never asked (the list persists
     across sessions) are dealt before repeats; once the whole pool has been
     seen, the seen list starts over. */
  function babelMakeDeck(pool) {
    let seenList = babelSeenLoad();
    const seenSet = new Set(seenList);
    let unseen = pool.filter(q => !seenSet.has(q.prompt));
    if (!unseen.length) { seenList = []; seenSet.clear(); unseen = pool.slice(); babelSeenSave(seenList); }
    return { deck: [...shuffle(unseen), ...shuffle(pool.filter(q => seenSet.has(q.prompt)))], seenList, seenSet };
  }
  const GX_BABEL_SEEN_KEY = 'msb_gx_babel_seen';
  function babelSeenLoad() { try { const a = JSON.parse(localStorage.getItem(GX_BABEL_SEEN_KEY)); return Array.isArray(a) ? a.filter(x => typeof x === 'string') : []; } catch { return []; } }
  function babelSeenSave(list) { try { localStorage.setItem(GX_BABEL_SEEN_KEY, JSON.stringify(list)); } catch { /* private mode */ } }
  function babelMenu() {
    setHtml(`${backBar('Tower of Babel')}
      <p class="lead">A brick is always falling toward the tower. Answer the question before it lands: right, and you catch the piece mid-air; wrong — or too slow — and the wall grows by one. Reach ten bricks and the whole tower topples.</p>
      ${bestLine('babel', v => v + ' points')}
      ${gxLevelChips('babel')}
      <div class="gx-names">${nameInputs('solo')}</div>
      <button class="primary" data-gx="b-start" data-gx-autofocus>Start building</button>
      ${roomButtons('babel')}`);
  }
  async function babelStart() {
    const lvl = gxSelectedLevel('babel');
    if (!gxCanPlay('babel', lvl)) { showMenu('babel'); return; }
    setSong('babel');
    const usedNames = readNames(['You']);
    const name = usedNames[0] || 'You';
    setHtml(`${backBar('Tower of Babel')}<div class="loading">Gathering questions…</div>`);
    try {
      const chData = await loadChallenges();
      const pool = babelBuildPool(bank, chData);
      if (pool.length < 10) { setHtml(`${backBar('Tower of Babel')}<div class="empty error">Not enough questions loaded to build a tower. <button class="secondary" data-gx="hub">Back to games</button></div>`); return; }
      const plan = GX_LEVELS.babel[lvl - 1];
      const made = babelMakeDeck(pool);
      const deck = made.deck, seenList = made.seenList, seenSet = made.seenSet;
      G = Object.assign(G || {}, {
        show: 'babel', name, score: 0, streak: 0, right: 0, height: 0,
        runLevel: lvl, catchTarget: plan.catches, victory: false,
        fallMs: plan.fallMs, pool, deck, di: 0, phase: 'fall', q: null,
        babelSeen: seenList, babelSeenSet: seenSet,
        timers: (G && G.timers) || [], tickId: null, pcAction: null,
      });
      babelQuestion();
    } catch (err) {
      setHtml(`${backBar('Tower of Babel')}<div class="empty error">${esc(err.message)} <button class="secondary" data-gx="hub">Back to games</button></div>`);
    }
  }
  function babelNextItem() {
    if (G.di >= G.deck.length) { G.deck = shuffle(G.pool); G.di = 0; }
    return G.deck[G.di++];
  }
  function babelQuestion() {
    if (!G) return;
    stopClock();
    const item = babelNextItem();
    if (G.babelSeenSet && !G.babelSeenSet.has(item.prompt)) { G.babelSeenSet.add(item.prompt); G.babelSeen.push(item.prompt); babelSeenSave(G.babelSeen); }
    const cs = shuffle(item.choices);
    G.q = { prompt: item.prompt, choices: cs, correct: cs.indexOf(item.answer), answer: item.answer, source: item.source };
    G.phase = 'fall';
    babelRender(null);
    babelStartFall();
  }
  function babelRender(fb) {
    const h = G.height;
    const danger = h >= 7;
    const bricks = Array.from({ length: h }, (_, i) => `<i class="gx-babel-brick${i % 2 ? ' gx-babel-alt' : ''}"></i>`).join('');
    const piece = fb && fb.caught
      ? '<div class="gx-babel-piece gx-babel-caught"></div>'
      : fb ? '' : '<div class="gx-babel-piece"></div>';
    const fbHtml = fb ? `<p class="lead gx-babel-fb">${esc(fb.text)}</p>` : '';
    setHtml(`${backBar('Tower of Babel')}
      <section class="card gx-babel-card">
        <div class="gx-babel-hud"><span>Score <strong>${G.score}</strong></span><span>Streak <strong>${G.streak}</strong></span>${G.runLevel ? `<span>Level ${G.runLevel} · Caught <strong>${G.right}/${G.catchTarget}</strong></span>` : ''}<span class="${danger ? 'gx-babel-danger-text' : ''}">Tower <strong>${h}/${BABEL_MAX}</strong></span></div>
        <div class="gx-babel-stage${danger ? ' gx-babel-danger' : ''}${fb && fb.slam ? ' gx-babel-shake' : ''}">
          ${piece}
          <div class="gx-babel-tower">${bricks}</div>
          <div class="gx-babel-ground"></div>
        </div>
        <span class="eyebrow">${fb ? 'THE PIECE' : 'ANSWER BEFORE IT LANDS'}</span>
        <h2>${esc(G.q.prompt)}</h2>
        ${G.q.source ? `<p class="small muted">${esc(G.q.source)}</p>` : ''}
        <div class="gx-choices gx-babel-choices">${G.q.choices.map((c, i) => `<button data-gx="b-answer" data-i="${i}" ${fb ? 'disabled' : ''} class="${fb && i === G.q.correct ? 'gx-babel-right' : fb && fb.picked === i ? 'gx-babel-wrong' : ''}">${esc(c)}</button>`).join('')}</div>
        ${fbHtml}
      </section>`);
  }
  function babelStartFall() {
    stopClock();
    G.pieceStart = Date.now();
    G.pieceDur = Math.max(4500, G.fallMs - 120 * G.height);
    G.tickId = setInterval(() => {
      if (!G || G.phase !== 'fall') { stopClock(); return; }
      const stage = root && root.querySelector('.gx-babel-stage');
      const piece = root && root.querySelector('.gx-babel-piece');
      if (!stage || !piece) return;
      const travel = Math.max(0, stage.clientHeight - 10 - G.height * 24 - 22);
      const p = Math.min(1, (Date.now() - G.pieceStart) / G.pieceDur);
      piece.style.top = (p * travel) + 'px';
      if (p >= 1) { stopClock(); babelBrick(-1); }
    }, 50);
  }
  function babelAnswer(i) {
    if (!G || G.phase !== 'fall' || !G.q) return;
    stopClock();
    if (i === G.q.correct) {
      G.streak++; G.right++;
      const bonus = G.streak >= 3 ? 25 : 0;
      G.score += 100 + bonus;
      G.fallMs = Math.max(4500, G.fallMs - 250);
      sfx('catch'); sfx('correct');
      if (G.runLevel && G.right >= G.catchTarget) {
        G.phase = 'feedback';
        babelRender({ caught: true, text: `Caught it! That's ${G.right} catches — Level ${G.runLevel} complete!` });
        later(babelVictory, 1000);
        return;
      }
      G.phase = 'feedback';
      babelRender({ caught: true, text: `Caught it! +${100 + bonus}${bonus ? ' — streak bonus included' : ''}. The piece never lands.` });
      later(babelQuestion, 800);
    } else {
      sfx('wrong');
      babelBrick(i);
    }
  }
  function babelBrick(picked) {
    if (!G) return;
    stopClock();
    G.streak = 0;
    G.height++;
    sfx('land');
    if (G.height >= BABEL_MAX) { babelTopple(); return; }
    G.phase = 'feedback';
    babelRender({
      landed: true, slam: true, picked,
      text: picked === -1
        ? `Too slow — it landed, and the wall grows. The answer was: ${G.q.answer}`
        : `Not quite — that brick slams onto the wall. The answer was: ${G.q.answer}`,
    });
    later(babelQuestion, 1400);
  }
  function babelTopple() {
    G.phase = 'topple';
    sfx('crash'); sfx('lose');
    const bricks = Array.from({ length: G.height }, (_, i) =>
      `<i class="gx-babel-brick${i % 2 ? ' gx-babel-alt' : ''}" style="--x:${(i % 2 ? 1 : -1) * (14 + i * 7)}px;--r:${(i % 3 - 1) * 38 + (i % 2 ? 12 : -9)}deg;animation-delay:${i * 45}ms"></i>`).join('');
    setHtml(`${backBar('Tower of Babel')}
      <section class="card gx-babel-card">
        <div class="gx-babel-hud"><span>Score <strong>${G.score}</strong></span><span>Tower <strong>${G.height}/${BABEL_MAX}</strong></span></div>
        <div class="gx-babel-stage gx-babel-danger gx-babel-topple">
          <div class="gx-babel-tower">${bricks}</div>
          <div class="gx-babel-ground"></div>
        </div>
        <span class="eyebrow">AND THE TOWER FELL</span>
        <h2>${esc(G.q.prompt)}</h2>
        <p class="lead">Ten bricks high — too high. The last answer was: <strong>${esc(G.q.answer)}</strong></p>
      </section>`);
    later(babelOver, 1450);
  }
  function babelVictory() {
    if (!G) return;
    stopClock();
    G.phase = 'over'; G.victory = true;
    if (G.runLevel) { gxBeatLevel('babel', G.runLevel); sfx('win'); }
    babelOver();
  }
  function babelOver() {
    if (!G) return;
    stopClock();
    G.phase = 'over';
    saveBest('babel', G.score);
    const b = bestOf('babel');
    const vic = !!G.victory;
    setHtml(`${backBar('Tower of Babel')}
      <section class="card gx-center">
        <span class="eyebrow">${vic ? `LEVEL ${G.runLevel} COMPLETE` : 'THE TOWER HAS FALLEN'}</span>
        <h2>${esc(G.name)} — ${G.score} points</h2>
        <p>${vic ? `You caught <strong>${G.right}</strong> piece${G.right === 1 ? '' : 's'} and the tower held at ${G.height} of ${BABEL_MAX} bricks.` : `You caught <strong>${G.right}</strong> piece${G.right === 1 ? '' : 's'} with right answers before the wall came down.`}</p>
        ${vic ? gxLevelBanner('babel', G.runLevel, true) : ''}
        ${vic && G.runLevel >= 5 ? `<p class="lead">👑 Babel master — all five levels beaten.</p>` : ''}
        <p class="muted">Best on this device: <strong>${b.best} points</strong> over ${b.plays} game${b.plays === 1 ? '' : 's'}.</p>
        ${gxNextLevelButton(vic)}
        <button class="primary" data-gx="show-menu" data-show="babel">Build again</button>
        <button class="secondary" data-gx="hub">All games</button>
      </section>`);
  }

  

  /* ================= DEFEND THE FAITH + SAY IT RIGHT =================
     Memory-informed apologetics games. The player wants training that makes
     them able to defend the faith out loud: hear the objection, retrieve
     the first move before seeing the explanation, then say the model
     sentence. Orthodox order throughout: Scripture and the Fathers
     first, Western scholastic framing second. Transliteration only. */
  function fq(tag, prompt, choices, answer, why, say) { return { tag, prompt, choices, answer, why, say }; }
  const DEFEND_BANK = [
    [
      fq("Trinity", "A friend says: Three Persons means three gods. What do you clarify first?", ["The three Persons share one divine essence", "The Persons are three beings joined by love", "The word Trinity is only a symbol", "Stop asking because it is a mystery"], "The three Persons share one divine essence", "Orthodox speech is one ousia and three hypostases. The unity is not teamwork; the Father, Son, and Holy Spirit are one God because the essence is one.", "We confess one God: one divine essence, three hypostases, never three gods."),
      fq("Christ", "Someone says Jesus was only a prophet. What is the strongest first question?", ["Why does He receive worship and forgive sins?", "Do you like the Sermon on the Mount?", "Which translation do you use?", "Can a prophet be called Lord in a poem?"], "Why does He receive worship and forgive sins?", "The New Testament does not leave Jesus as a mere messenger. He forgives sins, receives worship, and is confessed by Thomas as Lord and God. Start where His identity is revealed.", "If Jesus only pointed away from Himself, why does He forgive sins and accept worship?"),
      fq("Scripture", "A skeptic says the Bible was changed. What should you ask before arguing?", ["Changed when, and which manuscripts show it?", "Do you believe in God at all?", "Which church do you attend?", "Why do you hate Scripture?"], "Changed when, and which manuscripts show it?", "A corruption claim needs a time, a place, and evidence. Ancient manuscripts let us test the claim instead of trading slogans.", "Before we debate the charge, name the century and show the manuscript evidence."),
      fq("Faith and works", "A debater says Paul teaches faith alone and James contradicts him. What distinction answers first?", ["Dead profession versus living faith", "Paul wrote later than James", "Works are only for monks", "Faith means feelings"], "Dead profession versus living faith", "Paul attacks law-keeping as a rival system; James attacks empty profession. Orthodox reading: saving faith is living faith working through love and participation.", "The question is not faith or fruit; dead profession is not the living faith that saves."),
      fq("Icons", "Someone calls icons idolatry. What distinction protects the answer?", ["Latreia belongs to God alone; dulia honors the saints", "Icons are small gods", "Images absorb prayer by themselves", "The Old Testament bans every image in every place"], "Latreia belongs to God alone; dulia honors the saints", "The Church distinguishes worship from veneration. The Incarnation matters: the invisible God became visible flesh, so matter can bear witness without becoming God.", "We worship God alone; we honor the saints as friends of God, and the icon points beyond itself."),
      fq("Suffering", "An atheist asks why a good God permits evil. What is the best Orthodox opening?", ["Begin with Christ entering suffering, not escaping it", "Say evil is an illusion", "Say God needs evil to be glorious", "Free will ends the whole discussion"], "Begin with Christ entering suffering, not escaping it", "A slogan can sound cold at a hospital bed. The Christian answer begins with the crucified God who enters suffering, defeats death, and will heal creation.", "Christianity does not answer suffering from a distance; God entered it on the Cross."),
    ],
    [
      fq("Word: homoousios", "A debater says the Son is only similar to the Father. Which word answers?", ["Homoousios: of one essence with the Father", "Homoiousios: of similar essence", "Aseity: self-existence only", "Kenosis: self-emptying only"], "Homoousios: of one essence with the Father", "Nicaea chose homoousios because similar is not enough for salvation. If the Son is less than true God, He cannot unite humanity to God.", "The Son is homoousios with the Father: true God from true God, not a similar being."),
      fq("Word: hypostasis", "What is the clean distinction between ousia and hypostasis in Trinity talk?", ["Ousia names what God is; hypostasis names who each Person is", "Ousia is a mask; hypostasis is a mood", "Hypostasis is a separate essence", "Ousia means three gods"], "Ousia names what God is; hypostasis names who each Person is", "This is the grammar that prevents both polytheism and modalism. One what, three whos; one essence, three real hypostases.", "One ousia, three hypostases: that is how we speak without dividing God."),
      fq("Theotokos", "Why does the title Theotokos matter so much?", ["It guards the truth that Mary bore one divine hypostasis", "It means Mary is the source of the Trinity", "It only praises her humility", "It was invented to honor women in the fifth century"], "It guards the truth that Mary bore one divine hypostasis", "Ephesus defended Theotokos because the child born of Mary is not a separate human person joined later to God. She bore a Person, and that Person is God the Word incarnate.", "Mary is Theotokos because the One born of her is God the Word in the flesh."),
      fq("Chalcedon", "Which phrase set protects the confession of Christ?", ["Without confusion, change, division, or separation", "One nature absorbs the other", "Two persons side by side", "Humanity is only an appearance"], "Without confusion, change, division, or separation", "Chalcedon guards both truths: Christ is one hypostasis in two natures. The natures are not mixed away, and the Person is not split in two.", "One and the same Christ, in two natures, without confusion or division."),
      fq("Holy Spirit", "The talk turns to the Filioque. What distinction should come first?", ["Eternal procession versus temporal mission", "Latin versus Greek spelling", "Which pope was stronger", "Whether the Spirit is powerful"], "Eternal procession versus temporal mission", "Orthodox argument begins by asking what kind of sending is under discussion. The mission in time is not the same question as eternal origin.", "First tell me whether we mean eternal procession or the sending in time."),
      fq("Union of words", "How can Scripture say God suffered without saying the divine nature suffered by itself?", ["Communicatio idiomatum: properties are spoken of the one hypostasis", "The divine nature died apart from flesh", "The humanity was a costume", "Suffering means the essence changed"], "Communicatio idiomatum: properties are spoken of the one hypostasis", "Because the subject is one hypostasis, we can speak truly: God the Word suffered in the flesh. The suffering is real, and it is according to the human nature He made His own.", "The Word suffered in the flesh; we name the Person, not a confused nature."),
    ],
    [
      fq("Islamic dilemma", "A Muslim friend says the Quran confirms the Torah and the Gospel. What is the first dilemma horn?", ["If the Bible stands, the Quran conflicts with it on Christ", "The Quran never mentions earlier books", "Manuscripts do not matter", "Only Arabic can be studied"], "If the Bible stands, the Quran conflicts with it on Christ", "The dilemma begins with affirmation. If the earlier revelation is confirmed, then denials of the crucifixion and of Christ the Son collide with that confirmed witness.", "If the Gospel is confirmed, why does the later claim deny what the Gospel proclaims about Christ?"),
      fq("Corruption charge", "The reply comes: the Bible was corrupted after Muhammad. What evidence presses the point?", ["Major manuscripts predate Islam by centuries", "All manuscripts were copied yesterday", "The Dead Sea Scrolls are medieval", "Codex Sinaiticus was written after Muhammad"], "Major manuscripts predate Islam by centuries", "The timing matters. The Dead Sea Scrolls and early codices stand before Islam, so a late corruption theory cannot explain the text we already possess.", "Changed after Muhammad cannot work when the manuscripts are older than Muhammad."),
      fq("Son of God", "A Muslim says God cannot have a son because that sounds physical. What do you clarify?", ["Son names eternal relation, not physical offspring", "Christians mean a biological child", "Son is only a nickname for a prophet", "Father means older in age"], "Son names eternal relation, not physical offspring", "Christian language is not pagan biology. The Son is begotten eternally of the Father; the confession protects relation without turning God into flesh before the Incarnation.", "When Christians say Son, we mean eternal relation, not physical reproduction."),
      fq("False Trinity charge", "Someone claims Christians worship Father, Mary, and Jesus. What is the correction?", ["The Trinity is Father, Son, and Holy Spirit", "Mary is a fourth person", "The Spirit is only a force in that claim", "Christians worship three separate gods"], "The Trinity is Father, Son, and Holy Spirit", "Answer the actual Christian confession, not the caricature. Mary is honored as Theotokos; she is not a hypostasis of the Trinity.", "Christians confess Father, Son, and Holy Spirit; Mary is the Mother of God incarnate, not a member of the Trinity."),
      fq("Prophecy claim", "A claim is made that Muhammad is predicted in the Bible. What is the disciplined response?", ["Name the exact text and read it in context", "Accept the claim if it sounds confident", "Quote any verse with the word prophet", "Refuse to look at texts"], "Name the exact text and read it in context", "Apologetics stays honest by testing claims in context. A prediction claim rises or falls by the actual passage, not by pressure or volume.", "Show me the exact passage, and let us read the whole context together."),
      fq("Councils", "A skeptic says councils invented Christian doctrine. What is the better first answer?", ["Councils named the apostolic faith against new errors", "Councils created Christology from politics alone", "The Fathers never used Scripture", "Doctrine began in the fourth century"], "Councils named the apostolic faith against new errors", "The councils did not manufacture a new Christ. They found precise words to protect the worship and Scripture the Church already had received.", "The councils did not invent Christ; they defended the received Christ with exact words."),
    ],
    [
      fq("Problem of evil", "A philosophy student says evil is a logical contradiction in Christianity. What should you separate first?", ["A logical contradiction from an emotional protest", "Evil from goodness", "God from creation", "Pain from all moral judgment"], "A logical contradiction from an emotional protest", "The argument changes shape depending on the claim. A formal contradiction must be proven; grief and protest need pastoral truth, not a trap.", "Tell me whether you mean a strict contradiction or the cry of a wounded heart."),
      fq("Science", "Someone says evolution disproves God. What is the clean category question?", ["Does a mechanism explain away the Giver of being?", "Which fossil is your favorite?", "Can science define worship?", "Do you attend church?"], "Does a mechanism explain away the Giver of being?", "Mechanism and metaphysics are different questions. Describing how life develops does not by itself answer why being exists or why it is intelligible.", "A mechanism can describe creation; it cannot by itself remove the Creator."),
      fq("Resurrection", "A skeptic calls the Resurrection a late legend. What evidence belongs early in the reply?", ["The early confession in First Corinthians fifteen", "Medieval miracle plays", "Modern church growth", "A feeling of hope"], "The early confession in First Corinthians fifteen", "Paul hands on an early received confession naming witnesses. Legend language must face the early testimony, the empty tomb proclamation in Jerusalem, and transformed witnesses.", "Start with the early confession Paul received and delivered, not with late legend theory."),
      fq("Morality", "An atheist says we can be good without God. What distinction keeps the reply honest?", ["Knowing moral truth versus grounding moral truth", "Kindness versus church attendance", "Law versus custom", "Feelings versus family"], "Knowing moral truth versus grounding moral truth", "Christians can gladly affirm that unbelievers know and do real good. The deeper question is what makes goodness objective rather than preference.", "The issue is not whether you can know the good; it is what grounds the good you know."),
      fq("Other religions", "A friend says sincere belief makes every religion equally true. What is the gentle correction?", ["Contradictory claims cannot all be true in the same sense", "Sincerity makes evidence unnecessary", "Every path has no claims", "Truth is only temperament"], "Contradictory claims cannot all be true in the same sense", "Respect persons while testing claims. Sincerity is real, but sincerity does not erase contradiction about God, Christ, and salvation.", "I honor sincerity, but claims that contradict cannot all be true at once."),
      fq("Hard passage", "A reader brings up Judas and says the accounts contradict. What is the first careful move?", ["Ask whether different details are the same as a contradiction", "Call the reader dishonest", "Deny the texts are difficult", "Pick the shortest account"], "Ask whether different details are the same as a contradiction", "Hard passages deserve patience. Different details can trouble us, but a contradiction needs the same claim affirmed and denied in the same sense.", "A hard passage is not automatically a contradiction; show me the exact claims."),
    ],
    [
      fq("Papal claims", "A Catholic friend argues for universal immediate jurisdiction. What should be distinguished first?", ["Primacy of honor from universal jurisdiction", "Rome from every other city", "Councils from bishops", "History from all doctrine"], "Primacy of honor from universal jurisdiction", "Orthodox response does not deny honor to old Rome. The disputed claim is the later universal and immediate jurisdiction over every church.", "Honor is one claim; universal immediate jurisdiction is another, and it needs first millennium evidence."),
      fq("Oriental Orthodox", "Talk turns to miaphysite language. What misunderstanding must be avoided?", ["One united nature is not absorption of humanity", "Christ had no real humanity", "Alexandria denied Chalcedon terms only", "Nature words never matter"], "One united nature is not absorption of humanity", "Careful speech matters across old divides. Saint Cyril language protects unity without turning Christ into a mixture that erases His humanity.", "One united nature does not mean humanity vanished into divinity."),
      fq("Visible Church", "A debater says the true Church became invisible for centuries. What promise challenges that?", ["The gates of hell shall not prevail against the Church", "Every reformer restores the Church alone", "Visibility means buildings only", "Sacraments are optional symbols"], "The gates of hell shall not prevail against the Church", "The Orthodox question is historical and sacramental: where was the apostolic faith, worship, and succession through the centuries?", "Christ promised His Church would not be overcome; show me where she lived through the centuries."),
      fq("Burden of proof", "An atheist says only believers carry a burden of proof. What is the balanced reply?", ["Every truth claim carries reasons, including denial", "No one needs reasons", "Science has no assumptions", "Faith means no evidence"], "Every truth claim carries reasons, including denial", "A denial can be a claim too. The fair table asks each side to give reasons proportioned to what it asserts.", "If a claim is on the table, reasons belong on the table from every side."),
      fq("Canon", "A sola scriptura argument begins. What question exposes the canon problem?", ["Where does Scripture list its own canon?", "Which Bible app is best?", "Who bound the first codex?", "Why are margins wide?"], "Where does Scripture list its own canon?", "The canon question is unavoidable. The Church received, discerned, and handed down the books; Scripture alone cannot name its own table of contents.", "Before Scripture alone settles it, show me the inspired list of the canon."),
      fq("One sentence gospel", "Which sentence is the strongest one sentence defense of the hope in you?", ["God became man, bore the Cross, rose from the dead, and opens deified life to humanity", "Be sincere and follow your heart", "Religion is private comfort", "Ancient people liked miracles"], "God became man, bore the Cross, rose from the dead, and opens deified life to humanity", "A mature answer can be simple without being thin. Incarnation, Cross, Resurrection, and theosis hold the gospel in one breath.", "God became man, died and rose, and calls mankind into His life."),
    ],
  ];
  const DOCTRINE_BANK = [
    [
      fq("Term: ousia", "What does ousia name?", ["What a thing is: essence or being", "A temporary mask", "A feeling of awe", "A church building"], "What a thing is: essence or being", "Ousia answers the question of what. In Trinity speech, God is one ousia; in Christology, we ask what natures are united in the one hypostasis.", "Ousia tells us what; hypostasis tells us who."),
      fq("Term: hypostasis", "What does hypostasis name in Trinity speech?", ["A concrete who: Father, Son, or Holy Spirit", "A second essence", "A role played on turns", "A human opinion"], "A concrete who: Father, Son, or Holy Spirit", "Hypostasis is not a mask or a part. Each divine hypostasis is fully God, distinct by relation, never a separate god.", "The Father is not the Son, yet both are one God."),
      fq("Term: physis", "What does physis mean?", ["Nature: the kind of being something has", "A physical object only", "A rank in heaven", "A prayer rule"], "Nature: the kind of being something has", "Physis overlaps with essence in many contexts. In Christ, we confess two natures because He is truly God and truly man.", "Christ has the divine nature and our human nature, complete."),
      fq("Term: logos", "In John, who is the Logos?", ["The eternal Word who was with God and was God", "A created poem", "Only a written page", "An angel with a message"], "The eternal Word who was with God and was God", "John begins with being, relation, and creation. The Logos is not an idea about God; He is God the Son who becomes flesh.", "The Logos was with God, and the Logos was God."),
      fq("Term: Theotokos", "Theotokos means what?", ["God-bearer: she bore God the Word incarnate", "Mother of the Trinity by origin", "Queen above the Trinity", "Only a respectful nickname"], "God-bearer: she bore God the Word incarnate", "The title protects Christology. It says the One born of Mary is personally God the Word, while Mary remains a creature and mother according to the flesh.", "Mary is Theotokos because her Son is God in the flesh."),
      fq("Term: theosis", "What is theosis?", ["Participation in the divine life by grace", "Becoming God by essence", "A reward for the proud", "Escape from the body as evil"], "Participation in the divine life by grace", "Theosis is salvation as communion. We become by grace what Christ is by nature, without ceasing to be creatures.", "By grace we share the life that is God by nature."),
    ],
    [
      fq("Say it: Trinity", "Which sentence says the Trinity cleanly?", ["One essence, three hypostases", "Three essences in agreement", "One person with three masks", "Three gods in one family"], "One essence, three hypostases", "This sentence blocks polytheism and modalism at once. The Persons are distinct; the Godhead is undivided.", "One essence, three hypostases: one God, Father, Son, and Holy Spirit."),
      fq("Say it: begotten", "What does begotten, not made protect?", ["The Son is eternal and not a creature", "The Father is older in time", "The Son began at Bethlehem", "Made means respected"], "The Son is eternal and not a creature", "Begotten names eternal relation in God. Made would place the Son among creatures and break the confession of salvation.", "Begotten, not made: the Son is no creature."),
      fq("Say it: procession", "Which sentence is Orthodox for the Spirit origin?", ["The Spirit proceeds from the Father", "The Spirit is a created wind", "The Spirit proceeds from two sources in the same way", "The Spirit is only a symbol of love"], "The Spirit proceeds from the Father", "Precision matters here. The Church confesses the Father as source in the Trinity, while also proclaiming the Spirit sent through the Son in the economy.", "The Holy Spirit proceeds from the Father and is worshipped with Father and Son."),
      fq("Say it: homoousios", "What does homoousios rule out?", ["The Son is a lesser, similar being", "The Father has a body", "The Son is a mask", "The Spirit is an angel"], "The Son is a lesser, similar being", "Similar sounds close, but close is not salvation. Only true God can join humanity to God without remainder.", "The Son is of one essence with the Father, not a near copy."),
      fq("Say it: distinction", "Which sentence keeps the Persons distinct without dividing God?", ["The Father begets, the Son is begotten, the Spirit proceeds", "Each Person owns a separate essence", "The Persons take turns being God", "Distinction means disagreement"], "The Father begets, the Son is begotten, the Spirit proceeds", "Relations distinguish the hypostases. The distinction is real, eternal, and without division in essence, will, or glory.", "Distinct by relation, undivided in essence."),
      fq("Say it: mystery", "Which use of mystery is faithful?", ["Mystery names depth beyond mastery, not contradiction", "Mystery means stop thinking", "Mystery cancels evidence", "Mystery means three and one in the same sense"], "Mystery names depth beyond mastery, not contradiction", "Orthodox mystery is not a shrug. It receives revealed truth with reverence while refusing to pretend the mind has enclosed God.", "We speak truly, and we bow because God is greater than our speech."),
    ],
    [
      fq("Say it: Christ", "Which sentence is the Chalcedonian center?", ["One hypostasis in two natures", "Two hypostases in one nature", "One nature after mixture", "A man inspired like a prophet"], "One hypostasis in two natures", "Chalcedon holds unity and distinction together. Christ is one who, and He is complete in divinity and complete in humanity.", "One and the same Christ, true God and true man."),
      fq("Say it: Theotokos", "Which spoken line uses Theotokos rightly?", ["Mary bore God the Word in the flesh", "Mary created the divine nature", "Mary is mother of only a separate man", "Mary outranks the Trinity"], "Mary bore God the Word in the flesh", "The title begins from the child. Because Jesus Christ is one divine hypostasis, His mother is rightly called God-bearer.", "Theotokos protects who Jesus is."),
      fq("Say it: suffering", "Which sentence handles the Cross carefully?", ["God the Word suffered in the flesh", "The divine nature suffered apart from flesh", "Only a man suffered and God watched", "Suffering changed the essence of God"], "God the Word suffered in the flesh", "This is communicatio idiomatum in action. The Person who suffers is divine; the suffering is undergone in the human nature He assumed.", "The Impassible suffered in passible flesh, and death was trampled down."),
      fq("Say it: full humanity", "Which sentence rejects a costume Christ?", ["Christ assumed a complete human nature, including a human mind", "The Logos replaced the human mind", "Humanity was only appearance", "Flesh was sin by definition"], "Christ assumed a complete human nature, including a human mind", "What is not assumed is not healed, as Saint Gregory teaches. Christ saves humanity by truly becoming what we are, without sin.", "He became fully man so man could be fully healed."),
      fq("Say it: adverbs", "Which list belongs to Chalcedon?", ["Without confusion, change, division, separation", "With mixture, alteration, distance, rivalry", "Only symbol, shadow, story, silence", "Partly divine, partly human, partly angel"], "Without confusion, change, division, separation", "The four adverbs are fences around the mystery. They tell us what not to say so the gospel can be said rightly.", "In two natures: unconfused, unchanged, undivided, inseparable."),
      fq("Say it: communion of idioms", "Why can we say the Lord of glory was crucified?", ["Because the crucified One is one hypostasis", "Because glory is a created thing", "Because natures trade places", "Because language means anything"], "Because the crucified One is one hypostasis", "Predicate follows person. The flesh suffers and dies; the subject is God the Word incarnate, so Scripture can speak with holy boldness.", "The Lord of glory was crucified in the flesh He made His own."),
    ],
    [
      fq("Church word: latreia", "What is latreia?", ["Worship due to God alone", "Respect for elders", "Honor for saints", "Praise for angels only"], "Worship due to God alone", "Keeping latreia for God alone answers the idolatry charge before it starts. Honor can be real without becoming worship.", "Latreia is for God alone; honor is not worship."),
      fq("Church word: intercession", "Why ask saints to pray?", ["The Church is one living communion in Christ", "Saints replace Christ the Mediator", "The dead are unconscious and gone", "Prayer needs no Church"], "The Church is one living communion in Christ", "Intercession flows from communion, not competition. The saints are alive in Christ and join the prayer of the Church.", "We ask their prayers as we ask one another, because death does not exile the saints from Christ."),
      fq("Church word: baptism", "Which sentence fits infant baptism?", ["Baptism is gift and entrance into Christ, not only a public speech", "Infants must first lecture on doctrine", "Water is a bare photograph", "Baptism is magic without faith of the Church"], "Baptism is gift and entrance into Christ, not only a public speech", "The Orthodox answer begins with gift. Infants are received into the covenant life of the Church and grow into the faith that surrounds them.", "Baptism is birth into Christ, received before it is explained."),
      fq("Church word: Eucharist", "Which line refuses to shrink the Eucharist to a bare reminder?", ["This is my body calls for faith, worship, and communion", "The bread is only a visual aid", "The words of Christ are theater", "Communion separates us from the saints"], "This is my body calls for faith, worship, and communion", "The Church hears the Lord plainly and receives the gift with reverence. A bare symbol cannot carry the weight of the institution words and apostolic practice.", "We receive the gift Christ names, not a bare picture of an absent Christ."),
      fq("Church word: Tradition", "What is Holy Tradition in clean speech?", ["The life of the Holy Spirit in the Church handing down the faith", "Any old custom men prefer", "A second Bible competing with Scripture", "Permission to ignore the apostles"], "The life of the Holy Spirit in the Church handing down the faith", "Tradition is not nostalgia. It is the Church remembering Christ in Scripture, worship, councils, saints, and sacramental life.", "Tradition is the faith once delivered, alive in the Church."),
      fq("Church word: succession", "Why does apostolic succession matter?", ["It embodies historical continuity with the apostles", "It is a chain of magic hands", "It replaces repentance", "It makes history unnecessary"], "It embodies historical continuity with the apostles", "Succession is not a talisman. It is one visible sign that the faith confessed today is the faith received from the apostles.", "The Church today stands where the apostles stood, in the same faith."),
    ],
    [
      fq("Clean reply: atheist", "An atheist asks for one reason God is not a myth. Which opening is strongest?", ["Begin with being itself: why is there something intelligible at all?", "Myths feel ancient too", "Believe because fear helps", "Science is fake"], "Begin with being itself: why is there something intelligible at all?", "A mature opening chooses a real question. Contingency, intelligibility, goodness, and Christ give the conversation ground to stand on.", "Start deeper than a slogan: why does anything exist, and why can the mind know it?"),
      fq("Clean reply: Muslim friend", "Which sentence keeps friendship and truth together?", ["I honor your zeal for one God; let us test what each book says about Christ", "Your prophet is false so we are done", "All religions say the same thing", "Arabic grammar settles every claim"], "I honor your zeal for one God; let us test what each book says about Christ", "Witness can be firm without contempt. The Islamic dilemma is strongest when the texts lead and tempers stay low.", "Let us honor the one God by reading the claims about Christ carefully."),
      fq("Clean reply: Protestant friend", "Which sentence opens the faith and works debate without caricature?", ["Paul and James together reject a dead faith that does not love", "James cancels Paul", "Works buy heaven by themselves", "Faith is only agreement with facts"], "Paul and James together reject a dead faith that does not love", "This sentence refuses false war between apostles. It lets you argue for living faith with love, repentance, and participation.", "Saving faith lives, loves, repents, and bears fruit."),
      fq("Clean reply: Catholic friend", "Which sentence is firm but fair on Rome?", ["We can honor a primacy while asking for first millennium proof of universal jurisdiction", "Rome has no history", "Every council obeyed one bishop alone", "The East invented tradition yesterday"], "We can honor a primacy while asking for first millennium proof of universal jurisdiction", "Fairness strengthens an argument. Concede what can be conceded, then press the exact claim that needs evidence.", "Honor we can discuss; universal jurisdiction must be shown, not assumed."),
      fq("Clean reply: skeptic", "Which sentence invites evidence without sounding afraid?", ["Name the claim, name the standard, and let us weigh the earliest sources", "Skepticism needs no standards", "Miracles are impossible because I said so", "Feelings settle history"], "Name the claim, name the standard, and let us weigh the earliest sources", "Good apologetics welcomes a fair standard. It asks for consistency, then brings Scripture, history, and the Fathers into the light.", "Set the standard first; then the evidence can speak."),
      fq("Clean reply: one sentence", "Which final sentence best sounds like trained Orthodox witness?", ["The Word became flesh, trampled down death by death, and bestows life on those in the tombs", "Be nice and vague", "My team wins every debate", "Stop asking questions"], "The Word became flesh, trampled down death by death, and bestows life on those in the tombs", "The Paschal proclamation is doctrine with a heartbeat. It names Incarnation, death, victory, and gift in one breath.", "Christ is risen, and life reigns because God became man for us."),
    ],
  ];
  const FAITH_CFG = {
    defend: {
      title: 'Defend the Faith',
      icon: '🛡',
      intro: 'Real objections, first moves, and one sentence you can say out loud. Hear the challenge, speak before you tap, then learn why the strong reply works.',
      start: 'Start sparring',
      bank: DEFEND_BANK,
    },
    doctrine: {
      title: 'Say It Right',
      icon: '✦',
      intro: 'The Church words that keep an answer clean: ousia, hypostasis, physis, homoousios, Theotokos, theosis. Learn the term, then choose the sentence that carries it without bending it.',
      start: 'Start wording round',
      bank: DOCTRINE_BANK,
    },
  };
  function gxSpeak(text, rate) {
    try {
      const synth = window.speechSynthesis;
      if (!synth || typeof SpeechSynthesisUtterance === 'undefined' || !text) return false;
      synth.cancel();
      const u = new SpeechSynthesisUtterance(text);
      u.rate = rate || 0.92;
      const release = () => { if (synth.speaking) return; if (window.msbYieldAudio) window.msbYieldAudio('speech', false); };
      u.onend = u.onerror = release;
      if (window.msbYieldAudio) window.msbYieldAudio('speech', true);
      synth.speak(u);
      return true;
    } catch (e) { return false; }
  }
  function faithWordOf(q, show) {
    if (show !== 'doctrine' || !q || !q.tag) return null;
    const t = String(q.tag);
    const m = t.match(/(?:Term|Church word|Word):\s*(.+)$/i) || t.match(/^Say it:\s*(\S+)$/i);
    return m ? m[1].trim() : null;
  }
  function faithCfg(show) { return FAITH_CFG[show] || FAITH_CFG.defend; }
  function faithMenu() {
    const show = G && G.show;
    const cfg = faithCfg(show);
    setHtml(`${backBar(cfg.title)}
      <p class="lead">${cfg.intro}</p>
      ${bestLine(show, v => v + ' points')}
      ${gxLevelChips(show)}
      <div class="gx-modes">
        <button class="card gx-mode" data-gx="fth-start"><strong>${cfg.start}</strong><span>Six cards from the level above. Say your answer out loud before choosing; every card ends with the reason and a sentence to keep.</span></button>
      </div>
      <p class="footnote">Built from your study rule: Scripture and the Fathers first, exact terms in transliteration, and a spoken sentence at the end of every card.</p>
      ${roomButtons(show)}`);
  }
  function defendMenu() { faithMenu(); }
  function doctrineMenu() { faithMenu(); }
  function faithDeck(show, level) {
    const bank = faithCfg(show).bank[level - 1] || faithCfg(show).bank[0] || [];
    return shuffle(bank.map(q => ({ ...q, options: shuffle(q.choices.slice()) })));
  }
  function faithStart() {
    if (!G) return;
    const show = G.show;
    const lvl = gxSelectedLevel(show);
    if (!gxCanPlay(show, lvl)) { showMenu(show); return; }
    setSong(show);
    const cfg = faithCfg(show);
    G = Object.assign(G || {}, {
      show, mode: 'solo', phase: 'question', runLevel: lvl,
      plan: (GX_LEVELS[show] || [])[lvl - 1] || { name: cfg.title, pass: 5 },
      deck: faithDeck(show, lvl), idx: 0, score: 0, correct: 0, streak: 0,
      picked: null, timers: (G && G.timers) || [], tickId: null, pcAction: null,
    });
    faithRender();
  }
  function faithAnswer(choice) {
    if (!G || G.phase !== 'question' || !G.deck) return;
    const q = G.deck[G.idx];
    if (!q) return;
    G.picked = choice;
    const ok = choice === q.answer;
    if (ok) {
      G.correct++;
      G.streak++;
      G.score += 100 + Math.min(50, (G.streak - 1) * 10);
      sfx('ding');
    } else {
      G.streak = 0;
      sfx('wrong');
    }
    G.phase = 'feedback';
    faithRender();
  }
  function faithRender() {
    if (!G || !G.deck) return;
    const show = G.show, cfg = faithCfg(show), q = G.deck[G.idx];
    if (!q) { faithResults(); return; }
    const total = G.deck.length;
    const feedback = G.phase === 'feedback';
    const ok = feedback && G.picked === q.answer;
    const buttons = q.options.map(opt => {
      const cls = feedback && opt === q.answer ? ' gx-faith-right' : feedback && opt === G.picked ? ' gx-faith-wrong' : '';
      return `<button data-gx="fth-answer" data-choice="${esc(opt)}" class="${cls.trim()}" ${feedback ? 'disabled' : ''}>${esc(opt)}</button>`;
    }).join('');
    const wordTerm = faithWordOf(q, show);
    if (wordTerm) G.speakWord = wordTerm;
    setHtml(`${backBar(cfg.title)}${scoreBar([{ name: 'You', score: G.score }], -1)}
      <section class="card gx-faith-card">
        <div class="gx-faith-hud"><span>Level ${G.runLevel} · ${esc(G.plan.name)}</span><span>Card <strong>${G.idx + 1}/${total}</strong></span><span>Right <strong>${G.correct}</strong></span><span>Streak <strong>${G.streak}</strong></span></div>
        <span class="eyebrow">${esc(q.tag)}</span>
        <blockquote class="gx-faith-prompt">${esc(q.prompt)}</blockquote>
        ${wordTerm && !feedback ? `<button type="button" class="secondary gx-say-word" data-gx="say-word">🔊 Hear the word: ${esc(wordTerm)}</button>` : ''}
        ${feedback ? '' : `<p class="muted">Say your first sentence out loud, then choose the strongest opening.</p>`}
        <div class="gx-choices gx-faith-choices">${buttons}</div>
        ${feedback ? `<div class="gx-faith-feedback ${ok ? 'right' : 'wrong'}"><h3>${ok ? 'Strong reply.' : 'Not the first move.'}</h3><p>${esc(q.why)}</p><div class="gx-say"><span>Say this out loud</span><strong>${esc(q.say)}</strong></div><button type="button" class="secondary gx-say-model" data-gx="say-model">🔊 Hear the sentence</button><button class="primary" data-gx="fth-next" data-gx-autofocus>${G.idx + 1 >= total ? 'See results' : 'Next card'}</button></div>` : ''}
      </section>`);
  }
  function faithNext() {
    if (!G || !G.deck) return;
    G.idx++;
    G.picked = null;
    if (G.idx >= G.deck.length) { faithResults(); return; }
    G.phase = 'question';
    faithRender();
  }
  function faithResults() {
    if (!G || !G.deck) return;
    stopClock();
    const show = G.show, cfg = faithCfg(show), total = G.deck.length;
    const beaten = G.correct >= (G.plan.pass || total);
    G.levelBeaten = beaten;
    if (beaten) { gxBeatLevel(show, G.runLevel); sfx('win'); }
    saveBest(show, G.score);
    const b = bestOf(show);
    G.phase = 'over';
    setHtml(`${backBar(cfg.title)}
      <section class="card gx-center">
        <span class="eyebrow">LEVEL ${G.runLevel} · ${esc(G.plan.name).toUpperCase()}</span>
        <h2>${beaten ? 'You can say it clean.' : 'Keep sparring.'}</h2>
        <p>You answered <strong>${G.correct}/${total}</strong> cards correctly for <strong>${G.score}</strong> points.</p>
        ${gxLevelBanner(show, G.runLevel, !!beaten)}
        ${beaten ? '' : `<p class="muted">Get ${G.plan.pass} right to beat Level ${G.runLevel}. Replay the same level until the first sentence comes fast.</p>`}
        ${beaten && G.runLevel >= 5 ? `<p class="lead">Defender trained: all five levels beaten.</p>` : ''}
        <p class="muted">Best score on this device: <strong>${b.best} points</strong> over ${b.plays} game${b.plays === 1 ? '' : 's'}.</p>
        ${gxNextLevelButton(beaten)}
        <button class="primary" data-gx="show-menu" data-show="${show}">Play again</button>
        <button class="secondary" data-gx="hub">All games</button>
      </section>`);
  }

  /* ================= CORE ================= */
  let pendingShow = null;
  function showMenu(key) {
    clearTimers();
    if (gxRoom && !gxRoomLaunching) leaveRoomQuiet();
    setSong('hub');
    G = { show: key, timers: [], tickId: null, clockEndsAt: 0, clockTotal: 0 };
    if (key === 'jeopardy') jeopardyMenu();
    else if (key === 'millionaire') millionaireMenu();
    else if (key === 'sound') soundMenu();
    else if (key === 'babel') babelMenu();
    else if (key === 'defend') defendMenu();
    else if (key === 'doctrine') doctrineMenu();
    else feudMenu();
  }
  async function loadBank() {
    if (bank) return;
    const res = await fetch(BANK_URL, { cache: 'no-store' });
    if (!res.ok) throw Error(`The question bank could not be loaded (${res.status}).`);
    bank = await res.json();
  }
  function show(el, options) {
    root = el; ctx = options || {};
    if (el && !el._gxAudioKick) {
      el._gxAudioKick = true;
      el.addEventListener('pointerdown', () => { if (gxCtx()) startMusic(); });
    }
    const key = pendingShow || 'jeopardy';
    pendingShow = null;
    G = { show: key, timers: [], tickId: null, clockEndsAt: 0, clockTotal: 0 };
    setHtml('<div class="loading">Setting up the show…</div>');
    loadBank()
      .then(() => { if (root) showMenu(key); })
      .catch(err => { if (root) setHtml(`<div class="empty error">${esc(err.message)} <button class="secondary" data-gx="hub">Back to games</button></div>`); });
  }
  function hide() {
    stopMusic();
    stopRoomTimer();
    gxRoom = null;
    if (G) { stopClock(); (G.timers || []).forEach(clearTimeout); }
    G = null; root = null; ctx = null;
  }
  function click(e) {
    const showCard = e.target.closest && e.target.closest('[data-show]');
    if (showCard && !e.target.closest('[data-gx]')) {
      /* a show card on the Games hub: route through the app nav */
      pendingShow = showCard.dataset.show;
      if (window.nav) nav('show');
      return;
    }
    if (!root || !G || !root.contains(e.target)) return;
    const btn = e.target.closest('[data-gx]');
    if (!btn || btn.disabled) return;
    const action = btn.dataset.gx;
    if (action === 'hub') { const back = ctx && ctx.back; hide(); if (back) back(); return; }
    if (action === 'show-menu') { showMenu(btn.dataset.show); return; }
    if (action === 'sound-toggle') {
      gxSoundOn = !gxSoundOn;
      try { localStorage.setItem('msb_gx_sound', gxSoundOn ? 'on' : 'off'); } catch { /* private mode */ }
      root.querySelectorAll('[data-gx="sound-toggle"]').forEach(b => {
        b.textContent = gxSoundOn ? '🔊' : '🔇';
        b.setAttribute('aria-label', gxSoundOn ? 'Mute sound effects' : 'Unmute sound effects');
      });
      if (gxSoundOn) sfx('select');
      return;
    }
    if (action === 'music-toggle') {
      gxMusicOn = !gxMusicOn;
      try { localStorage.setItem('msb_gx_music', gxMusicOn ? 'on' : 'off'); } catch { /* private mode */ }
      root.querySelectorAll('[data-gx="music-toggle"]').forEach(b => {
        b.classList.toggle('gx-snd-off', !gxMusicOn);
        b.setAttribute('aria-label', gxMusicOn ? 'Turn music off' : 'Turn music on');
      });
      if (!gxMusicOn) stopMusic();
      else if (gxCtx()) startMusic();
      return;
    }
    if (action === 'room-create') { roomCreate(btn.dataset.showKey); return; }
    if (action === 'next-level') {
      if (!G) return;
      const show = G.show, next = (G.runLevel || 1) + 1;
      if (next > 5) return;
      if (gxRoom) leaveRoomQuiet();
      gxLevelSel[show] = next;
      gxStartSolo(show);
      return;
    }
    if (action === 'room-join') { roomJoin(); return; }
    if (action === 'room-start') { roomStartMatch(); return; }
    if (action === 'room-play') { roomPlay(); return; }
    if (action === 'room-leave') { const show = gxRoom ? gxRoom.show : null; leaveRoomQuiet(); if (show) showMenu(show); return; }
    if (action === 'scores') { scoresScreen(btn.dataset.showKey); return; }
    if (action === 'lvl-pick') {
      const sh = btn.dataset.showKey, n = Number(btn.dataset.level);
      if (gxCanPlay(sh, n)) { gxLevelSel[sh] = n; showMenu(sh); }
      return;
    }
    /* Defend the Faith + Say It Right */
    if (action === 'fth-start') { faithStart(); return; }
    if (action === 'fth-answer') { faithAnswer(btn.dataset.choice); return; }
    if (action === 'fth-next') { faithNext(); return; }
    if (action === 'say-word') { if (G && G.speakWord && !gxSpeak(G.speakWord, 0.8) && ctx && ctx.toast) ctx.toast('Voice is not available on this device.'); return; }
    if (action === 'say-model') { const q = G && G.deck && G.deck[G.idx]; if (q && q.say && !gxSpeak(q.say, 0.95) && ctx && ctx.toast) ctx.toast('Voice is not available on this device.'); return; }
    /* Tower of Babel */
    if (action === 'b-start') { babelStart(); return; }
    if (action === 'b-answer') { babelAnswer(Number(btn.dataset.i)); return; }
    /* Jeopardy */
    if (action === 'j-mode') { jeopardyStart(btn.dataset.mode); return; }
    if (action === 'j-pick') { if (G.phase === 'pick' && !G.seats[G.control].pc) { sfx('select'); openClue(Number(btn.dataset.cat), Number(btn.dataset.row)); } return; }
    if (action === 'j-buzz') { buzz(Number(btn.dataset.seat)); return; }
    if (action === 'j-answer') { if (G.phase === 'answer' || G.phase === 'buzz') resolveJeopardy(btn.dataset.choice, G.answerSeat ?? 0, false); return; }
    if (action === 'j-final') { jeopardyFinalSetup(); return; }
    if (action === 'j-final-go') { jeopardyFinalClue(); return; }
    if (action === 'j-final-answer') { stopClock(); G.finalAnswers[G.finalTurn] = btn.dataset.choice; finalAnswerTurn(); return; }
    /* Millionaire */
    if (action === 'm-start') { millionaireStart(); return; }
    if (action === 'm-answer') { millionaireAnswer(btn.dataset.choice); return; }
    if (action === 'm-life') { millionaireLifeline(btn.dataset.life); return; }
    if (action === 'm-walk') { millionaireWalk(); return; }
    /* Sound It Out */
    if (action === 's-level') { if (G) G.level = btn.dataset.level; soundMenu(); return; }
    if (action === 's-mode') { soundStart(btn.dataset.mode); return; }
    if (action === 's-party-start') { soundPartyStart(); return; }
    if (action === 's-reveal') { soundReveal(false); return; }
    if (action === 's-got') { soundSoloScore(true); return; }
    if (action === 's-missed') { soundSoloScore(false); return; }
    if (action === 's-next') { soundNext(); return; }
    if (action === 's-pick') { soundPick(btn.dataset.choice); return; }
    if (action === 's-party-got') { soundPartyAward(Number(btn.dataset.seat)); return; }
    if (action === 's-party-none') { soundPartyAward(-1); return; }
    /* Family Feud */
    if (action === 'f-mode') { feudStart(btn.dataset.mode); return; }
    if (action === 'f-playpass') { feudPlayPass(btn.dataset.choice); return; }
    if (action === 'f-next') { feudBeginRound(); return; }
    if (action === 'f-guess') {
      const input = root.querySelector('[data-gx-guess]');
      const text = input ? input.value : '';
      if (G.phase === 'faceoff') feudFaceGuess(text);
      else if (G.phase === 'play') feudPlayGuess(text);
      else if (G.phase === 'steal') feudStealGuess(text);
      return;
    }
  }
  document.addEventListener('click', click);
  document.addEventListener('keydown', e => {
    if (e.key !== 'Enter') return;
    const row = e.target.closest && e.target.closest('.gx-guessrow');
    if (!row) return;
    const btn = row.querySelector('[data-gx="f-guess"]');
    if (btn) { e.preventDefault(); btn.click(); }
  });

  return {
    show, hide, click,
    _test: {
      get G() { return G; },
      get bank() { return bank; },
      gx: { GX_LEVELS, gxProgAll, gxShowProg, gxCanPlay, gxBeatLevel, gxDefaultLevel, gxSelectedLevel, gxSoundLevelDeck, babelBuildPool, babelMakeDeck, babelSeenLoad, babelSeenSave, setBank(b) { bank = b; }, audio: { sfx, startMusic, stopMusic, musicState: () => ({ musicOn: gxMusicOn, soundOn: gxSoundOn, playing: !!gxMusicTimer }), setMusicOn(v) { gxMusicOn = !!v; }, setSoundOn(v) { gxSoundOn = !!v; } } },
      setClock(seconds) { if (G) { G.clockEndsAt = Date.now() + seconds * 1000; } },
      setG(v) { G = v; },
      faith: { DEFEND_BANK, DOCTRINE_BANK, FAITH_CFG, faithDeck, faithStart, faithAnswer, faithNext, faithResults },
      forcePc() { flushPc(); },
      finishBoard() { if (G && G.cats) { G.cats.forEach(c => c.clues.forEach(cl => { cl.used = true; })); jeopardyBoard(); } },
    },
  };
})();
