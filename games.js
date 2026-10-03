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
    try { localStorage.setItem('msb_local_v1', JSON.stringify(s)); } catch { /* private mode */ }
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
     Five saved levels per show. Angel's rule: beat a level and it should
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
    /* Adam in the Garden: level -> crossing name, traffic speed, daylight per life */
    garden: [
      { name: 'Dawn in Eden', speed: 0.84, time: 85, lives: 3 },
      { name: 'Rivers of Eden', speed: 0.96, time: 80, lives: 3 },
      { name: 'Beasts of the Field', speed: 1.08, time: 76, lives: 3 },
      { name: 'Thorns and Stones', speed: 1.20, time: 72, lives: 3 },
      { name: 'The Eastern Gate', speed: 1.34, time: 68, lives: 3 },
    ],
    /* Adam & Eve Apple Maze: level -> orchard name, snake count, snake cadence, race clock + winner target */
    apple: [
      { name: 'First Orchard', snakes: 3, snakeEvery: 2, time: 120, target: 600 },
      { name: 'Fig and Vine', snakes: 4, snakeEvery: 2, time: 130, target: 750 },
      { name: 'Serpents at Noon', snakes: 4, snakeEvery: 1, time: 140, target: 900 },
      { name: 'The Walled Garden', snakes: 5, snakeEvery: 1, time: 150, target: 1050 },
      { name: 'Eden at Dusk', snakes: 5, snakeEvery: 1, time: 160, target: 1200 },
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
      garden: `Cross ${GX_LEVELS.garden[level - 1].name}: fill all five Tree Gate alcoves before the lives run out. Rivers carry you; beasts, serpents, scorpions, and rolling stones end a life.`,
      apple: `Eat every apple to clear the orchard solo; in the race, out-score your rival past ${GX_LEVELS.apple[level - 1].target} points while ${GX_LEVELS.apple[level - 1].snakes} snakes hunt the maze.`,
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
      <p class="footnote">For two-player games, set both names above. In solo and PC games only your name is used.</p>`);
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
      <button class="primary" data-gx="m-start">Take the hot seat</button>`);
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
        <h2>${esc(G.name)} leaves with ${money(won)}</h2>
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
      <p class="footnote">Team names above are used in two-team games; against the PC only your team name is used.</p>`);
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
    /* garden — airy harp-like pentatonic, morning in Eden (C–G–Am–F) */
    garden: { bpm: 96, mode: 'major pentatonic', wave: 'triangle', bassWave: 'sine', density: 0.62, stepsPerChord: 8, noteLen: 1.1, vol: 0.05, bassVol: 0.085, bassEvery: 4, bassDiv: 2, octUp: 0.42, tick: false,
      chords: [[130.81, 261.63, 329.63, 392.00], [98.00, 196.00, 293.66, 392.00], [110.00, 220.00, 261.63, 329.63], [87.31, 174.61, 261.63, 349.23]] },
    /* apple — quick playful orchard chase (C–F–C–G) */
    apple: { bpm: 132, mode: 'major pentatonic', wave: 'square', bassWave: 'sine', density: 0.8, stepsPerChord: 4, noteLen: 0.35, vol: 0.032, bassVol: 0.075, bassEvery: 2, bassDiv: 2, octUp: 0.5, tick: false,
      chords: [[130.81, 261.63, 329.63, 392.00], [174.61, 349.23, 440.00, 523.25], [130.81, 261.63, 329.63, 392.00], [98.00, 196.00, 293.66, 392.00]] },
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
    } catch { /* garnish */ }
  }
  function stopMusic() {
    if (gxMusicTimer) { clearInterval(gxMusicTimer); gxMusicTimer = null; }
    if (gxFadeTimer) { clearTimeout(gxFadeTimer); gxFadeTimer = null; }
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
      <p class="footnote">Your name is used in solo and race games. Party names are set on the next screen.</p>`);
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
        <button class="primary" data-gx="show-menu" data-show="sound">Play again</button>
        <button class="secondary" data-gx="hub">All games</button>
      </section>`);
  }

  /* ================= TOWER OF BABEL =================
     Angel's design: no countdown bar. A brick falls slowly toward the tower;
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
      <button class="primary" data-gx="b-start" data-gx-autofocus>Start building</button>`);
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
        <button class="primary" data-gx="show-menu" data-show="babel">Build again</button>
        <button class="secondary" data-gx="hub">All games</button>
      </section>`);
  }

  
  /* ================= ADAM IN THE GARDEN =================
     A crossing adventure in the spirit of the old temple-crossing games:
     guide Adam (and Eve in two-player) from the Garden Gate at the bottom
     to five Tree Gate alcoves at the top. Rivers are crossed on lily pads,
     logs, and turtles; the lower garden is patrolled by serpents,
     scorpions, rolling stones, and wild beasts. Local multiplayer on one
     device: solo, two-player versus (separate runs; high score wins), or
     co-op (one shared crossing; the guide changes hands after a lost life
     or a filled alcove). */
  const GARDEN_COLS = 9, GARDEN_ROWS = 12, GARDEN_SLOTS = [0, 2, 4, 6, 8];
  const GARDEN_ROW_DEFS = [
    { type: 'goal', label: 'Tree Gates' },
    { type: 'water', label: 'Pishon', icon: '🪷', dir: -1, speed: 0.78, width: 2, gap: 4.8, offset: 1.2 },
    { type: 'water', label: 'Gihon', icon: '🪵', dir: 1, speed: 0.62, width: 3, gap: 5.6, offset: 2.0 },
    { type: 'water', label: 'Tigris', icon: '🐢', dir: -1, speed: 0.52, width: 2, gap: 4.6, offset: 0.4 },
    { type: 'safe', label: 'Riverbank' },
    { type: 'hazard', label: 'Serpent path', icon: '🐍', dir: 1, speed: 1.02, width: 1.15, gap: 3.9, offset: 0.2 },
    { type: 'hazard', label: 'Scorpion stones', icon: '🦂', dir: -1, speed: 1.18, width: 1, gap: 3.6, offset: 2.0 },
    { type: 'hazard', label: 'Rolling stones', icon: '🪨', dir: 1, speed: 0.92, width: 1, gap: 4.1, offset: 1.0 },
    { type: 'hazard', label: 'Wild beasts', icon: '🐆', dir: -1, speed: 1.10, width: 1.2, gap: 3.8, offset: 2.5 },
    { type: 'safe', label: 'Garden path' },
    { type: 'hazard', label: 'Thorn thicket', icon: '🐍', dir: -1, speed: 0.84, width: 1, gap: 4.2, offset: 1.0 },
    { type: 'start', label: 'Garden Gate' },
  ];
  function gardenPlan(level) { return (GX_LEVELS.garden || [])[level - 1] || (GX_LEVELS.garden || [])[0] || { name: 'Dawn in Eden', speed: 1, time: 80, lives: 3 }; }
  function gardenOverlap(a, aw, b, bw) { return Math.max(0, Math.min(a + aw, b + bw) - Math.max(a, b)); }
  function gardenMakeEntities(def, level) {
    if (!def || !def.icon) return [];
    const plan = gardenPlan(level);
    const gap = Math.max(2.7, def.gap - (level - 1) * 0.16);
    const step = def.width + gap;
    const count = Math.ceil((GARDEN_COLS + def.width + step) / step) + 1;
    const speed = def.speed * plan.speed * def.dir;
    const out = [];
    for (let i = 0; i < count; i++) out.push({ x: -def.width + def.offset + i * step, w: def.width, speed, icon: def.icon, cycle: count * step });
    return out;
  }
  function gardenMakeLanes(level) { return GARDEN_ROW_DEFS.map((def, row) => ({ ...def, row, entities: gardenMakeEntities(def, level) })); }
  function gardenFruitFor(level) {
    return [
      { row: 9, col: (level + 1) % GARDEN_COLS, icon: '🍇', collected: false },
      { row: 6, col: (level * 3) % GARDEN_COLS, icon: '🍎', collected: false },
      { row: 4, col: (level * 5 + 2) % GARDEN_COLS, icon: '🍐', collected: false },
    ];
  }
  function gardenActivePlayer() {
    if (!G || !Array.isArray(G.players) || !G.players.length) return { name: 'Adam', icon: '🧔🏽' };
    return G.mode === 'coop' ? (G.players[G.controller] || G.players[0]) : (G.players[G.current] || G.players[0]);
  }
  function gardenMenu() {
    setHtml(`${backBar('Adam in the Garden')}
      <p class="lead">Cross Eden from the Garden Gate to the five Tree Gate alcoves. Ride lily pads, logs, and turtles across the rivers; dodge serpents, scorpions, rolling stones, and wild beasts below. Gather fruit for bonus points before the daylight runs out.</p>
      ${bestLine('garden', v => v + ' points')}
      ${gxLevelChips('garden')}
      <div class="gx-modes">
        <button class="card gx-mode" data-gx="g-mode" data-mode="solo"><strong>Solo — Adam</strong><span>Three lives. Fill all five alcoves to beat the level.</span></button>
        <button class="card gx-mode" data-gx="g-mode" data-mode="versus"><strong>Two players — versus</strong><span>Adam and Eve take separate runs on the same level. Highest score wins.</span></button>
        <button class="card gx-mode" data-gx="g-mode" data-mode="race"><strong>Two players — race!</strong><span>Adam and Eve on the same board at the same time — separate pads below (or WASD vs arrow keys). First to claim all five of their own Tree Gate alcoves wins.</span></button>
      </div>
      <div class="gx-names">${nameInputs('2p')}</div>
      <p class="footnote">Player one guides Adam; player two guides Eve. Same-device multiplayer — pass the phone at the turn screens. Keyboard: arrow keys or WASD.</p>`);
  }
  function gardenStart(mode) {
    const lvl = gxSelectedLevel('garden');
    if (!gxCanPlay('garden', lvl)) { showMenu('garden'); return; }
    setSong('garden');
    const names = readNames(['Adam', 'Eve']);
    const mk = (i, fallback, icon) => ({ name: names[i] || fallback, icon, score: 0 });
    const players = mode === 'solo' ? [mk(0, 'Adam', '🧔🏽')] : [mk(0, 'Adam', '🧔🏽'), mk(1, 'Eve', '👩🏽')];
    G = Object.assign(G || {}, {
      show: 'garden', mode, phase: 'pass', runLevel: lvl, plan: gardenPlan(lvl), players,
      current: 0, controller: 0, results: [], levelBeaten: false, lastEvent: '',
      timers: (G && G.timers) || [], tickId: null, pcAction: null,
    });
    if (mode === 'race') { gardenRaceSetup(); return; }
    gardenBeginRun(0);
  }
  function gardenBeginRun(index) {
    if (!G) return;
    stopClock();
    G.current = index;
    if (G.mode !== 'coop') G.controller = index;
    G.lanes = gardenMakeLanes(G.runLevel);
    G.fruit = gardenFruitFor(G.runLevel);
    G.run = {
      lives: G.mode === 'coop' ? G.plan.lives + 2 : G.plan.lives,
      score: 0, filled: Array(GARDEN_SLOTS.length).fill(false), fruitCount: 0,
      crossings: 0, completed: false,
    };
    gardenResetLife();
    G.phase = 'pass';
    gardenPassScreen();
  }
  function gardenResetLife() {
    if (!G) return;
    G.player = { x: 4, y: GARDEN_ROWS - 1 };
    G.progressRow = GARDEN_ROWS - 1;
    G.timeLeft = G.plan.time;
  }
  function gardenPassScreen() {
    if (!G || !G.run) return;
    const p = gardenActivePlayer();
    const first = G.mode === 'versus' && G.current === 1
      ? `<p class="lead">${esc(G.lastEvent || '')}</p>`
      : `<p class="lead">${esc(p.name)} guides ${p.icon} through <strong>${esc(G.plan.name)}</strong>. Fill all five Tree Gate alcoves before the lives and daylight run out.</p>`;
    setHtml(`${backBar('Adam in the Garden')}${scoreBar(gardenSeatsForBar(), G.mode === 'coop' ? G.controller : G.current)}
      <section class="card gx-center">
        <span class="eyebrow">${G.mode === 'coop' ? 'TWO PLAYERS · ONE CROSSING' : G.mode === 'versus' ? `PLAYER ${G.current + 1}'S RUN` : 'SOLO CROSSING'}</span>
        <h2>${esc(p.name)} ${p.icon} — your crossing</h2>
        ${first}
        <p class="muted">Rivers: step only on 🪷 lily pads, 🪵 logs, and 🐢 turtles. Land lanes: avoid 🐍 serpents, 🦂 scorpions, 🪨 stones, and 🐆 beasts.</p>
        <button class="primary" data-gx="g-begin" data-gx-autofocus>Begin crossing</button>
        <button class="secondary" data-gx="show-menu" data-show="garden">Change mode</button>
      </section>`);
  }
  function gardenBeginPlay() {
    if (!G || !G.run) return;
    G.phase = 'play';
    const p = gardenActivePlayer();
    G.lastEvent = `${p.name} — guide ${p.icon} to an open ✦ Tree Gate alcove.`;
    gardenRender();
    gardenStartLoop();
  }
  function gardenStartLoop() {
    if (!G) return;
    stopClock();
    G.tickId = setInterval(() => gardenTick(0.1), 100);
  }
  function gardenSeatsForBar() {
    if (!G || !Array.isArray(G.players)) return [];
    if (!G.run) return G.players;
    if (G.mode === 'coop') return G.players.map(p => ({ ...p, score: G.run.score }));
    return G.players.map((p, i) => ({ ...p, score: i === G.current ? G.run.score : (G.results[i] ? G.results[i].score : 0) }));
  }
  function gardenBoardHtml() {
    if (!G || !G.run || !G.player) return '';
    const rowPct = 100 / GARDEN_ROWS, colPct = 100 / GARDEN_COLS;
    const lanes = G.lanes.map(lane => `<div class="gx-garden-lane gx-garden-${lane.type}" style="top:${lane.row * rowPct}%;height:${rowPct}%"><span>${esc(lane.label)}</span></div>`).join('');
    const homes = Array.from({ length: GARDEN_COLS }, (_, col) => {
      const si = GARDEN_SLOTS.indexOf(col);
      if (si < 0) return `<span class="gx-garden-hedge" style="left:${col * colPct}%;width:${colPct}%">🌿</span>`;
      const filled = !!G.run.filled[si];
      return `<span class="gx-garden-home${filled ? ' filled' : ''}" style="left:${col * colPct}%;width:${colPct}%" title="Tree Gate alcove">${filled ? '🍎' : '🌳✦'}</span>`;
    }).join('');
    const entities = G.lanes.flatMap(lane => lane.entities.map(e => `<span class="gx-garden-entity gx-garden-entity-${lane.type}" style="left:${(e.x / GARDEN_COLS) * 100}%;top:${lane.row * rowPct}%;width:${(e.w / GARDEN_COLS) * 100}%;height:${rowPct}%">${esc(e.icon.repeat(Math.max(1, Math.ceil(e.w))))}</span>`)).join('');
    const fruit = G.fruit.filter(f => !f.collected).map(f => `<span class="gx-garden-fruit" style="left:${f.col * colPct}%;top:${f.row * rowPct}%;width:${colPct}%;height:${rowPct}%">${esc(f.icon)}</span>`).join('');
    const p = gardenActivePlayer();
    const player = `<span class="gx-garden-player" style="left:${(G.player.x / GARDEN_COLS) * 100}%;top:${G.player.y * rowPct}%;width:${colPct}%;height:${rowPct}%" title="${esc(p.name)}">${esc(p.icon)}</span>`;
    return `<div class="gx-garden-board" role="img" aria-label="Garden crossing board">${lanes}${homes}${entities}${fruit}${player}</div>`;
  }
  function gardenRender() {
    if (!G || !G.run || !G.player) return;
    const p = gardenActivePlayer();
    const filledCount = G.run.filled.filter(Boolean).length;
    const hearts = '♥'.repeat(Math.max(0, G.run.lives)) + '♡'.repeat(Math.max(0, (G.mode === 'coop' ? G.plan.lives + 2 : G.plan.lives) - G.run.lives));
    const actionCard = G.phase === 'between'
      ? `<div class="gx-garden-turn"><h2>${esc(G.betweenTitle || 'Take another step')}</h2><p>${esc(G.betweenText || '')}</p><button class="primary" data-gx="g-continue" data-gx-autofocus>Continue</button></div>`
      : G.phase === 'paused'
        ? `<div class="gx-garden-turn"><h2>Paused</h2><p>The garden waits.</p><button class="primary" data-gx="g-pause" data-gx-autofocus>Resume</button></div>`
        : '';
    const controls = G.phase === 'play'
      ? `<div class="gx-garden-controls" aria-label="Garden controls">
          <button data-gx="g-move" data-dir="left" aria-label="Move left">◀</button>
          <div class="gx-garden-ud"><button data-gx="g-move" data-dir="up" aria-label="Move up">▲</button><button data-gx="g-move" data-dir="down" aria-label="Move down">▼</button></div>
          <button data-gx="g-move" data-dir="right" aria-label="Move right">▶</button>
          <button class="secondary" data-gx="g-pause">Pause</button>
        </div>`
      : '';
    setHtml(`${backBar('Adam in the Garden')}${scoreBar(gardenSeatsForBar(), G.mode === 'coop' ? G.controller : G.current)}
      <section class="card gx-garden-card">
        <div class="gx-garden-hud"><span>Level ${G.runLevel} · ${esc(G.plan.name)}</span><span>${esc(p.name)} guiding ${esc(p.icon)}</span><span>Lives <strong>${hearts}</strong></span><span>Groves <strong>${filledCount}/5</strong></span><span>Daylight <strong>${Math.max(0, Math.ceil(G.timeLeft || 0))}s</strong></span><span>Fruit <strong>${G.run.fruitCount}</strong></span></div>
        ${gardenBoardHtml()}
        <p class="gx-event" role="status">${esc(G.lastEvent || 'Reach an open Tree Gate alcove.')}</p>
        ${actionCard}
        ${controls}
      </section>
      <p class="footnote">Step on lily pads, logs, and turtles to cross the rivers — they carry you with the current. If the river pulls you past the edge, the life is lost. On land, one touch from a serpent, scorpion, stone, or beast ends the life.</p>`);
  }
  function gardenCollect() {
    if (!G || !G.run || !G.player) return;
    const col = Math.max(0, Math.min(GARDEN_COLS - 1, Math.round(G.player.x)));
    const hit = G.fruit.find(f => !f.collected && f.row === G.player.y && f.col === col);
    if (!hit) return;
    hit.collected = true;
    G.run.fruitCount++;
    G.run.score += 30;
    G.lastEvent = `${hit.icon} Fruit gathered — +30.`;
    sfx('catch');
  }
  function gardenMove(dir) {
    if (!G || G.show !== 'garden' || G.phase !== 'play' || !G.player) return;
    const d = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] }[dir];
    if (!d) return;
    const nx = Math.max(0, Math.min(GARDEN_COLS - 1, G.player.x + d[0]));
    const ny = Math.max(0, Math.min(GARDEN_ROWS - 1, G.player.y + d[1]));
    if (d[1] < 0 && ny === 0) { gardenTryGoal(nx); return; }
    G.player.x = nx; G.player.y = ny;
    if (ny < G.progressRow) { G.run.score += (G.progressRow - ny) * 10; G.progressRow = ny; }
    sfx('select');
    gardenAfterMove();
  }
  function gardenAfterMove() {
    if (!G || G.phase !== 'play') return;
    gardenCollect();
    const lane = G.lanes[G.player.y];
    if (lane && lane.type === 'hazard' && lane.entities.some(e => gardenOverlap(G.player.x, 1, e.x, e.w) > 0.22)) {
      gardenDie(`${lane.icon || 'A garden danger'} caught ${gardenActivePlayer().name} on the ${lane.label.toLowerCase()}.`);
      return;
    }
    if (lane && lane.type === 'water' && !lane.entities.some(e => gardenOverlap(G.player.x, 1, e.x, e.w) > 0.32)) {
      gardenDie(`The ${lane.label} river swept ${gardenActivePlayer().name} away — step only on pads, logs, and turtles.`);
      return;
    }
    gardenRender();
  }
  function gardenTryGoal(nx) {
    if (!G || !G.run || !G.player) return;
    const col = Math.max(0, Math.min(GARDEN_COLS - 1, Math.round(nx)));
    G.player.x = col; G.player.y = 0;
    const si = GARDEN_SLOTS.indexOf(col);
    if (si < 0) { gardenDie('A thorn hedge blocked that Tree Gate. Aim for a 🌳✦ alcove.'); return; }
    if (G.run.filled[si]) { gardenDie('That Tree Gate alcove is already filled. Choose an open ✦.'); return; }
    G.run.filled[si] = true;
    G.run.crossings++;
    const bonus = 250 + Math.max(0, Math.ceil(G.timeLeft || 0)) * 2;
    G.run.score += bonus;
    sfx('ding');
    if (G.run.filled.every(Boolean)) {
      G.run.completed = true;
      G.levelBeaten = true;
      sfx('win');
      gardenEndRun();
      return;
    }
    stopClock();
    if (G.mode === 'coop') G.controller = 1 - G.controller;
    G.phase = 'between';
    G.betweenTitle = 'A Tree Gate alcove is filled!';
    G.betweenText = `+${bonus} points. ${G.run.filled.filter(Boolean).length} of 5 groves are filled.${G.mode === 'coop' ? ` Pass the guide to ${gardenActivePlayer().name}.` : ''}`;
    G.lastEvent = G.betweenText;
    gardenRender();
  }
  function gardenDie(reason) {
    if (!G || !G.run || G.phase !== 'play') return;
    stopClock();
    sfx('wrong');
    G.run.lives--;
    G.lastEvent = reason;
    if (G.run.lives > 0) {
      if (G.mode === 'coop') G.controller = 1 - G.controller;
      G.phase = 'between';
      G.betweenTitle = 'A life is lost';
      G.betweenText = `${reason} ${G.run.lives} ${G.run.lives === 1 ? 'life' : 'lives'} remain.${G.mode === 'coop' ? ` Pass the guide to ${gardenActivePlayer().name}.` : ''}`;
      gardenRender();
    } else {
      gardenEndRun();
    }
  }
  function gardenContinue() {
    if (!G || !G.run || G.phase !== 'between') return;
    gardenResetLife();
    G.phase = 'play';
    const p = gardenActivePlayer();
    G.lastEvent = `${p.name} — guide ${p.icon} to an open ✦ Tree Gate alcove.`;
    gardenRender();
    gardenStartLoop();
  }
  function gardenPauseToggle() {
    if (!G || !G.run) return;
    if (G.phase === 'play') { stopClock(); G.phase = 'paused'; G.lastEvent = 'Paused.'; gardenRender(); }
    else if (G.phase === 'paused') { G.phase = 'play'; G.lastEvent = 'Back to the crossing.'; gardenRender(); gardenStartLoop(); }
  }
  function gardenEndRun() {
    if (!G || !G.run) return;
    stopClock();
    G.phase = 'runover';
    const result = G.mode === 'coop'
      ? { name: G.players.map(p => p.name).join(' & '), icon: '🧔🏽👩🏽', score: G.run.score, fruitCount: G.run.fruitCount, crossings: G.run.crossings, completed: G.run.completed }
      : { name: gardenActivePlayer().name, icon: gardenActivePlayer().icon, score: G.run.score, fruitCount: G.run.fruitCount, crossings: G.run.crossings, completed: G.run.completed };
    if (G.mode === 'coop') G.results[0] = result;
    else G.results[G.current] = result;
    if (G.mode === 'versus' && G.current === 0) {
      const done = result;
      gardenBeginRun(1);
      G.lastEvent = `${done.name} finished with ${done.score} points and ${done.crossings} filled alcove${done.crossings === 1 ? '' : 's'}. ${G.players[1].name}, your crossing is next.`;
      gardenPassScreen();
      return;
    }
    gardenResults();
  }
  function gardenResults() {
    if (!G || !G.run) return;
    stopClock();
    G.phase = 'over';
    if (G.levelBeaten) gxBeatLevel('garden', G.runLevel);
    const results = (G.results || []).filter(Boolean);
    const bestScore = results.length ? Math.max(...results.map(r => r.score)) : G.run.score;
    saveBest('garden', bestScore);
    const b = bestOf('garden');
    let title, blurb;
    if (G.mode === 'coop') {
      title = G.run.completed ? 'The five groves are filled!' : 'The garden crossing ends';
      blurb = `${esc(G.players.map(p => p.name).join(' & '))} crossed together for ${G.run.score} points, gathered ${G.run.fruitCount} fruit, and filled ${G.run.crossings} of 5 alcoves.`;
    } else if (G.mode === 'versus' && results.length > 1) {
      const top = Math.max(...results.map(r => r.score));
      const champs = results.filter(r => r.score === top);
      title = champs.length > 1 ? 'A tie in the garden!' : `${esc(champs[0].name)} wins the garden!`;
      blurb = results.map(r => `${esc(r.icon)} ${esc(r.name)}: <strong>${r.score}</strong> points · ${r.crossings}/5 alcoves · ${r.fruitCount} fruit`).join('<br>');
    } else {
      const r = results[0] || { name: gardenActivePlayer().name, icon: gardenActivePlayer().icon, score: G.run.score, fruitCount: G.run.fruitCount, crossings: G.run.crossings, completed: G.run.completed };
      title = r.completed ? `${esc(r.name)} filled the five groves!` : `${esc(r.name)} — ${r.score} points`;
      blurb = `${esc(r.icon)} ${esc(r.name)} filled ${r.crossings} of 5 alcoves and gathered ${r.fruitCount} fruit.`;
    }
    setHtml(`${backBar('Adam in the Garden')}
      <section class="card gx-center">
        <span class="eyebrow">LEVEL ${G.runLevel} · ${esc(G.plan.name).toUpperCase()}</span>
        <h2>${title}</h2>
        <p>${blurb}</p>
        ${gxLevelBanner('garden', G.runLevel, !!G.levelBeaten)}
        ${G.levelBeaten ? '' : `<p class="muted">Fill all five Tree Gate alcoves in one run to beat Level ${G.runLevel}.</p>`}
        ${G.levelBeaten && G.runLevel >= 5 ? `<p class="lead">👑 Keeper of the Garden — all five levels beaten.</p>` : ''}
        <p class="muted">Best garden score on this device: <strong>${b.best} points</strong> over ${b.plays} game${b.plays === 1 ? '' : 's'}.</p>
        <button class="primary" data-gx="show-menu" data-show="garden">Play again</button>
        <button class="secondary" data-gx="hub">All games</button>
      </section>`);
  }

  /* ---- Garden race: Adam and Eve on one board at the same time.
     Separate alcove claims per racer (apple = Adam, pear = Eve); five
     lives each; shared fruit. First to claim all five wins; running out
     of lives hands the race to the other; the race clock settles it by
     alcoves claimed, then score. */
  function gardenRaceSetup() {
    if (!G) return;
    stopClock();
    G.lanes = gardenMakeLanes(G.runLevel);
    G.fruit = gardenFruitFor(G.runLevel).map(f => ({ ...f, takenBy: -1 }));
    G.racers = G.players.map((pl, i) => ({
      name: pl.name, icon: pl.icon, x: i === 0 ? 3 : 5, y: GARDEN_ROWS - 1,
      lives: 5, filled: Array(GARDEN_SLOTS.length).fill(false), score: 0,
      fruitCount: 0, crossings: 0, progressRow: GARDEN_ROWS - 1,
    }));
    G.timeLeft = 240;
    G.phase = 'racepass';
    G.lastEvent = '';
    gardenRacePass();
  }
  function gardenRacePass() {
    if (!G || !G.racers) return;
    const seats = G.racers.map(r => ({ name: r.name, score: 0 }));
    setHtml(`${backBar('Adam in the Garden')}${scoreBar(seats, -1)}
      <section class="card gx-center">
        <span class="eyebrow">TWO PLAYERS · SAME BOARD · SAME TIME</span>
        <h2>🧔🏽 ${esc(G.racers[0].name)} vs 👩🏽 ${esc(G.racers[1].name)}</h2>
        <p class="lead">Race to the Tree Gates! Each of you claims your own alcoves — ${esc(G.racers[0].name)} fills his with 🍎, ${esc(G.racers[1].name)} fills hers with 🍐. First to claim all five wins. Five lives each; the rivers and beasts are shared, and so is the fruit — grab it first.</p>
        <p class="muted">${esc(G.racers[0].name)}: left pad or WASD keys. ${esc(G.racers[1].name)}: right pad or arrow keys.</p>
        <button class="primary" data-gx="g-race-begin" data-gx-autofocus>Begin the race</button>
        <button class="secondary" data-gx="show-menu" data-show="garden">Change mode</button>
      </section>`);
  }
  function gardenRaceBegin() {
    if (!G || !G.racers) return;
    G.phase = 'raceplay';
    G.lastEvent = 'Race! First to claim all five Tree Gate alcoves wins.';
    gardenRaceRender();
    stopClock();
    G.tickId = setInterval(() => gardenRaceTick(0.1), 100);
  }
  function gardenRaceRespawn(r, idx) { r.x = idx === 0 ? 3 : 5; r.y = GARDEN_ROWS - 1; r.progressRow = GARDEN_ROWS - 1; }
  function gardenRaceBoardHtml() {
    if (!G || !G.racers) return '';
    const rowPct = 100 / GARDEN_ROWS, colPct = 100 / GARDEN_COLS;
    const lanes = G.lanes.map(lane => `<div class="gx-garden-lane gx-garden-${lane.type}" style="top:${lane.row * rowPct}%;height:${rowPct}%"><span>${esc(lane.label)}</span></div>`).join('');
    const homes = Array.from({ length: GARDEN_COLS }, (_, col) => {
      const si = GARDEN_SLOTS.indexOf(col);
      if (si < 0) return `<span class="gx-garden-hedge" style="left:${col * colPct}%;width:${colPct}%">🌿</span>`;
      const a = !!G.racers[0].filled[si], e = !!G.racers[1].filled[si];
      return `<span class="gx-garden-home${a || e ? ' filled' : ''}" style="left:${col * colPct}%;width:${colPct}%">${a && e ? '🍎🍐' : a ? '🍎' : e ? '🍐' : '🌳✦'}</span>`;
    }).join('');
    const entities = G.lanes.flatMap(lane => lane.entities.map(e => `<span class="gx-garden-entity gx-garden-entity-${lane.type}" style="left:${(e.x / GARDEN_COLS) * 100}%;top:${lane.row * rowPct}%;width:${(e.w / GARDEN_COLS) * 100}%;height:${rowPct}%">${esc(e.icon.repeat(Math.max(1, Math.ceil(e.w))))}</span>`)).join('');
    const fruit = G.fruit.filter(f => !f.collected).map(f => `<span class="gx-garden-fruit" style="left:${f.col * colPct}%;top:${f.row * rowPct}%;width:${colPct}%;height:${rowPct}%">${esc(f.icon)}</span>`).join('');
    const players = G.racers.map(r => `<span class="gx-garden-player" style="left:${(r.x / GARDEN_COLS) * 100}%;top:${r.y * rowPct}%;width:${colPct}%;height:${rowPct}%">${esc(r.icon)}</span>`).join('');
    return `<div class="gx-garden-board" role="img" aria-label="Garden race board">${lanes}${homes}${entities}${fruit}${players}</div>`;
  }
  function gardenRacePad(idx) {
    const r = G.racers[idx];
    return `<div class="gx-race-pad"><strong>${esc(r.icon)} ${esc(r.name)}</strong>
      <div class="gx-race-pad-grid"><span></span><button data-gx="g-race-move" data-racer="${idx}" data-dir="up" aria-label="${esc(r.name)} up">▲</button><span></span><button data-gx="g-race-move" data-racer="${idx}" data-dir="left" aria-label="${esc(r.name)} left">◀</button><button data-gx="g-race-move" data-racer="${idx}" data-dir="down" aria-label="${esc(r.name)} down">▼</button><button data-gx="g-race-move" data-racer="${idx}" data-dir="right" aria-label="${esc(r.name)} right">▶</button></div></div>`;
  }
  function gardenRaceRender() {
    if (!G || !G.racers) return;
    const seats = G.racers.map(r => ({ name: r.name, score: r.score }));
    const lines = G.racers.map(r => `<span>${esc(r.icon)} ${esc(r.name)} · Lives <strong>${'♥'.repeat(Math.max(0, r.lives))}</strong> · Groves <strong>${r.crossings}/5</strong> · Fruit <strong>${r.fruitCount}</strong></span>`).join('');
    setHtml(`${backBar('Adam in the Garden')}${scoreBar(seats, -1)}
      <section class="card gx-garden-card">
        <div class="gx-garden-hud"><span>Level ${G.runLevel} · ${esc(G.plan.name)}</span><span>Race clock <strong>${Math.max(0, Math.ceil(G.timeLeft || 0))}s</strong></span>${lines}</div>
        ${gardenRaceBoardHtml()}
        <p class="gx-event" role="status">${esc(G.lastEvent || 'Race to the Tree Gates!')}</p>
        ${G.phase === 'raceplay' ? `<div class="gx-race-pads">${gardenRacePad(0)}${gardenRacePad(1)}</div>` : ''}
      </section>
      <p class="footnote">Claim your own alcoves at the top — 🍎 for ${esc(G.racers[0].name)}, 🍐 for ${esc(G.racers[1].name)}. A filled alcove sends you back to the gate for the next one.</p>`);
  }
  function gardenRaceCollect(idx) {
    const r = G.racers[idx]; if (!r) return;
    const col = Math.max(0, Math.min(GARDEN_COLS - 1, Math.round(r.x)));
    const hit = G.fruit.find(f => !f.collected && f.row === r.y && f.col === col);
    if (!hit) return;
    hit.collected = true; hit.takenBy = idx;
    r.fruitCount++; r.score += 30;
    G.lastEvent = `${r.icon} ${r.name} grabbed the ${hit.icon} — +30.`;
    sfx('catch');
  }
  function gardenRaceMove(idx, dir) {
    if (!G || G.mode !== 'race' || G.phase !== 'raceplay' || !G.racers) return;
    const r = G.racers[idx]; if (!r) return;
    const d = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] }[dir];
    if (!d) return;
    const nx = Math.max(0, Math.min(GARDEN_COLS - 1, r.x + d[0]));
    const ny = Math.max(0, Math.min(GARDEN_ROWS - 1, r.y + d[1]));
    if (d[1] < 0 && ny === 0) { gardenRaceGoal(idx, nx); return; }
    r.x = nx; r.y = ny;
    if (ny < r.progressRow) { r.score += (r.progressRow - ny) * 10; r.progressRow = ny; }
    sfx('select');
    gardenRaceCollect(idx);
    if (G.phase === 'raceplay') gardenRaceCheck(idx, true);
  }
  function gardenRaceCheck(idx, renderAfter) {
    const r = G.racers[idx]; if (!r) return false;
    const lane = G.lanes[r.y];
    if (lane && lane.type === 'hazard' && lane.entities.some(e => gardenOverlap(r.x, 1, e.x, e.w) > 0.22)) {
      gardenRaceDie(idx, `${lane.icon || 'A garden danger'} caught ${r.name} on the ${lane.label.toLowerCase()}.`);
      return true;
    }
    if (lane && lane.type === 'water' && !lane.entities.some(e => gardenOverlap(r.x, 1, e.x, e.w) > 0.32)) {
      gardenRaceDie(idx, `The ${lane.label} river swept ${r.name} away.`);
      return true;
    }
    if (renderAfter) gardenRaceRender();
    return false;
  }
  function gardenRaceGoal(idx, nx) {
    const r = G.racers[idx]; if (!r) return;
    const col = Math.max(0, Math.min(GARDEN_COLS - 1, Math.round(nx)));
    r.x = col; r.y = 0;
    const si = GARDEN_SLOTS.indexOf(col);
    if (si < 0) { gardenRaceDie(idx, 'A thorn hedge blocked that Tree Gate.'); return; }
    if (r.filled[si]) { gardenRaceDie(idx, `${r.name} had already claimed that alcove.`); return; }
    r.filled[si] = true; r.crossings++; r.score += 250;
    sfx('ding');
    if (r.filled.every(Boolean)) { gardenRaceFinish(idx, `${r.name} claimed all five Tree Gate alcoves.`); return; }
    gardenRaceRespawn(r, idx);
    G.lastEvent = `${r.icon} ${r.name} claimed an alcove — +250, ${r.crossings}/5. Back to the gate for the next one!`;
    gardenRaceRender();
  }
  function gardenRaceDie(idx, reason) {
    if (!G || G.phase !== 'raceplay') return;
    const r = G.racers[idx]; if (!r) return;
    sfx('wrong');
    r.lives--;
    if (r.lives <= 0) { gardenRaceFinish(1 - idx, `${r.name} is out of lives.`); return; }
    gardenRaceRespawn(r, idx);
    G.lastEvent = `${reason} ${r.icon} ${r.name} has ${r.lives} ${r.lives === 1 ? 'life' : 'lives'} left.`;
    gardenRaceRender();
  }
  function gardenRaceFinish(winner, reason) {
    if (!G || !G.racers) return;
    stopClock();
    G.phase = 'raceover';
    const won = winner >= 0 ? G.racers[winner] : null;
    G.levelBeaten = !!(won && won.filled.every(Boolean));
    if (G.levelBeaten) { gxBeatLevel('garden', G.runLevel); sfx('win'); }
    saveBest('garden', Math.max(...G.racers.map(r => r.score)));
    const b = bestOf('garden');
    const stats = G.racers.map(r => `${esc(r.icon)} ${esc(r.name)}: <strong>${r.score}</strong> points · ${r.crossings}/5 alcoves · ${r.fruitCount} fruit`).join('<br>');
    setHtml(`${backBar('Adam in the Garden')}
      <section class="card gx-center">
        <span class="eyebrow">THE RACE IS RUN · LEVEL ${G.runLevel} · ${esc(G.plan.name).toUpperCase()}</span>
        <h2>${won ? `${esc(won.icon)} ${esc(won.name)} wins the race!` : 'A dead heat in the garden!'}</h2>
        <p>${esc(reason)}</p>
        <p>${stats}</p>
        ${gxLevelBanner('garden', G.runLevel, !!G.levelBeaten)}
        ${G.levelBeaten ? '' : `<p class="muted">Claim all five of your own alcoves to beat Level ${G.runLevel}.</p>`}
        <p class="muted">Best garden score on this device: <strong>${b.best} points</strong> over ${b.plays} game${b.plays === 1 ? '' : 's'}.</p>
        <button class="primary" data-gx="show-menu" data-show="garden">Play again</button>
        <button class="secondary" data-gx="hub">All games</button>
      </section>`);
  }
  function gardenRaceTick(step) {
    if (!G || G.mode !== 'race' || G.phase !== 'raceplay' || !G.racers) return;
    const dt = Number.isFinite(step) ? step : 0.1;
    G.timeLeft = (G.timeLeft || 0) - dt;
    G.lanes.forEach(lane => lane.entities.forEach(e => {
      e.x += e.speed * dt;
      if (e.speed > 0 && e.x > GARDEN_COLS) e.x -= e.cycle;
      if (e.speed < 0 && e.x + e.w < 0) e.x += e.cycle;
    }));
    for (let idx = 0; idx < 2; idx++) {
      const r = G.racers[idx];
      const lane = G.lanes[r.y];
      if (lane && lane.type === 'water') {
        const carrier = lane.entities.find(e => gardenOverlap(r.x, 1, e.x, e.w) > 0.32);
        if (!carrier) { gardenRaceDie(idx, `The ${lane.label} river swept ${r.name} away.`); if (G.phase !== 'raceplay') return; continue; }
        r.x += carrier.speed * dt;
        if (r.x + 1 <= 0 || r.x >= GARDEN_COLS) { gardenRaceDie(idx, 'The current carried the crossing beyond the garden edge.'); if (G.phase !== 'raceplay') return; continue; }
      }
      if (lane && lane.type === 'hazard' && lane.entities.some(e => gardenOverlap(r.x, 1, e.x, e.w) > 0.22)) {
        gardenRaceDie(idx, `${lane.icon || 'A garden danger'} caught ${r.name} on the ${lane.label.toLowerCase()}.`);
        if (G.phase !== 'raceplay') return;
        continue;
      }
      gardenRaceCollect(idx);
    }
    if (G.phase !== 'raceplay') return;
    if (G.timeLeft <= 0) {
      const [a, b2] = G.racers;
      const winner = a.crossings !== b2.crossings ? (a.crossings > b2.crossings ? 0 : 1) : a.score !== b2.score ? (a.score > b2.score ? 0 : 1) : -1;
      gardenRaceFinish(winner, winner < 0 ? 'The race clock ran out on equal terms.' : 'The race clock ran out.');
      return;
    }
    gardenRaceRender();
  }

  function gardenTick(step) {
    if (!G || G.show !== 'garden' || G.phase !== 'play' || !G.run || !G.player) return;
    const dt = Number.isFinite(step) ? step : 0.1;
    G.timeLeft = (G.timeLeft || 0) - dt;
    G.lanes.forEach(lane => lane.entities.forEach(e => {
      e.x += e.speed * dt;
      if (e.speed > 0 && e.x > GARDEN_COLS) e.x -= e.cycle;
      if (e.speed < 0 && e.x + e.w < 0) e.x += e.cycle;
    }));
    const lane = G.lanes[G.player.y];
    if (lane && lane.type === 'water') {
      const carrier = lane.entities.find(e => gardenOverlap(G.player.x, 1, e.x, e.w) > 0.32);
      if (!carrier) { gardenDie(`The ${lane.label} river swept ${gardenActivePlayer().name} away — step only on pads, logs, and turtles.`); return; }
      G.player.x += carrier.speed * dt;
      if (G.player.x + 1 <= 0 || G.player.x >= GARDEN_COLS) { gardenDie('The current carried the crossing beyond the garden edge.'); return; }
    }
    if (lane && lane.type === 'hazard' && lane.entities.some(e => gardenOverlap(G.player.x, 1, e.x, e.w) > 0.22)) {
      gardenDie(`${lane.icon || 'A garden danger'} caught ${gardenActivePlayer().name} on the ${lane.label.toLowerCase()}.`);
      return;
    }
    gardenCollect();
    if (G.timeLeft <= 0) { gardenDie('The daylight faded before the crossing was finished.'); return; }
    gardenRender();
  }


  /* ================= ADAM & EVE APPLE MAZE =================
     An original orchard maze chase. Adam (and Eve, racing him on the
     same board) eats apples while snakes — the garden's ghosts — hunt
     through the maze. A grape of power turns the hunt for a few
     seconds: the snakes flee and can be eaten for bonus points.
     Solo: clear the orchard. Race: shared apples, one clock, the
     higher score wins when time or apples run out — or when a rival
     loses their last life. */
  const APPLE_W = 15, APPLE_H = 11;
  const APPLE_BASE = [
    '###############',
    '#o....#......o#',
    '#.##..#..##.#.#',
    '#..#......#.#.#',
    '##.#.##.##.#.##',
    '#....#...#....#',
    '#.##..#..##.#.#',
    '#....#......#.#',
    '#.##...##...#.#',
    '#o.....P.....o#',
    '###############',
  ];
  const APPLE_DIRS = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] };
  function appleGridFor(level) {
    let grid = APPLE_BASE.map(r => r.split(''));
    const v = ((level - 1) % 3 + 3) % 3;
    if (v === 1) grid = grid.map(row => row.slice().reverse());
    if (v === 2) grid = grid.slice().reverse();
    return grid;
  }
  function applePointFor(level, pt) {
    const v = ((level - 1) % 3 + 3) % 3;
    let x = pt[0], y = pt[1];
    if (v === 1) x = APPLE_W - 1 - x;
    if (v === 2) y = APPLE_H - 1 - y;
    return [x, y];
  }
  function appleOpen(grid, x, y) { return x >= 0 && y >= 0 && x < APPLE_W && y < APPLE_H && grid[y][x] !== '#'; }
  function applePellets(grid) {
    const set = new Set(), pow = new Set();
    grid.forEach((row, y) => row.forEach((c, x) => {
      if (c === '.') set.add(x + ',' + y);
      if (c === 'o') pow.add(x + ',' + y);
    }));
    return { set, pow };
  }
  function appleFindSpawn(grid) {
    for (let y = 0; y < APPLE_H; y++) for (let x = 0; x < APPLE_W; x++) if (grid[y][x] === 'P') return [x, y];
    return [7, 9];
  }
  function appleMenu() {
    setHtml(`${backBar('Adam & Eve Apple Maze')}
      <p class="lead">Eat the apples, dodge the snakes. The 🍇 grape of power turns the hunt for a few seconds — frightened snakes flee, and eating one is worth 150. Clear the orchard solo, or race on the same board: shared apples, one clock, highest score wins.</p>
      ${bestLine('apple', v => v + ' points')}
      ${gxLevelChips('apple')}
      <div class="gx-modes">
        <button class="card gx-mode" data-gx="a-mode" data-mode="solo"><strong>Solo — Mr. Adam</strong><span>Three lives against the snakes. Eat every apple to clear the orchard and beat the level.</span></button>
        <button class="card gx-mode" data-gx="a-mode" data-mode="race"><strong>Two players — Mr. &amp; Ms. race!</strong><span>Adam and Eve in the same maze at the same time. Separate pads (or WASD vs arrow keys). Out-eat your rival before the clock or the apples run out.</span></button>
      </div>
      <div class="gx-names">${nameInputs('2p')}</div>
      <p class="footnote">Player one is Mr. Adam 🧔🏽; player two is Ms. Eve 👩🏽. The snakes 🐍 are the ghosts of the garden — they hunt the nearest eater.</p>`);
  }
  function appleStart(mode) {
    const lvl = gxSelectedLevel('apple');
    if (!gxCanPlay('apple', lvl)) { showMenu('apple'); return; }
    setSong('apple');
    const names = readNames(['Adam', 'Eve']);
    const grid = appleGridFor(lvl);
    const made = applePellets(grid);
    const plan = GX_LEVELS.apple[lvl - 1];
    const aSpawn = appleFindSpawn(grid);
    const eSpawn = applePointFor(lvl, [9, 9]);
    const mk = (name, icon, spawn) => ({ name, icon, x: spawn[0], y: spawn[1], sx: spawn[0], sy: spawn[1], dir: 'left', nextDir: 'left', lives: 3, score: 0, apples: 0, active: true });
    const players = mode === 'solo'
      ? [mk(names[0] || 'Adam', '🧔🏽', aSpawn)]
      : [mk(names[0] || 'Adam', '🧔🏽', aSpawn), mk(names[1] || 'Eve', '👩🏽', eSpawn)];
    const snakePts = [[6, 5], [7, 5], [8, 5], [7, 4], [7, 6]].slice(0, plan.snakes).map(pt => applePointFor(lvl, pt));
    const snakes = snakePts.map((pt, i) => ({ x: pt[0], y: pt[1], hx: pt[0], hy: pt[1], dir: i % 2 ? 'left' : 'right' }));
    G = Object.assign(G || {}, {
      show: 'apple', mode, phase: 'pass', runLevel: lvl, plan, grid,
      pellets: made.set, powers: made.pow, pelletsLeft: made.set.size + made.pow.size,
      players, snakes, fright: 0, tickCount: 0, timeLeft: plan.time,
      lastEvent: '', timers: (G && G.timers) || [], tickId: null, pcAction: null,
    });
    applePass();
  }
  function applePass() {
    if (!G) return;
    const seats = G.players.map(pl => ({ name: pl.name, score: 0 }));
    setHtml(`${backBar('Adam & Eve Apple Maze')}${scoreBar(seats, -1)}
      <section class="card gx-center">
        <span class="eyebrow">${G.mode === 'race' ? 'TWO PLAYERS · SAME MAZE · SAME TIME' : 'SOLO ORCHARD'} · LEVEL ${G.runLevel} · ${esc(G.plan.name).toUpperCase()}</span>
        <h2>${G.mode === 'race' ? `🧔🏽 ${esc(G.players[0].name)} vs 👩🏽 ${esc(G.players[1].name)}` : `🧔🏽 ${esc(G.players[0].name)} in the orchard`}</h2>
        <p class="lead">${G.mode === 'race' ? `Shared apples, one ${G.plan.time}-second clock. Apples 10 points, the 🍇 grape 50 — and a frightened snake 150. Highest score wins; beat ${G.plan.target} to take the level.` : `Eat every apple to clear the orchard. Three lives; the snakes get faster as the levels climb.`}</p>
        <p class="muted">${G.mode === 'race' ? `${esc(G.players[0].name)}: left pad or WASD. ${esc(G.players[1].name)}: right pad or arrow keys.` : 'Steer with the pad or WASD / arrow keys.'} Snakes 🐍 hunt the nearest eater — grab a 🍇 to turn the hunt.</p>
        <button class="primary" data-gx="a-begin" data-gx-autofocus>Into the orchard</button>
        <button class="secondary" data-gx="show-menu" data-show="apple">Change mode</button>
      </section>`);
  }
  function appleLoopStart() {
    if (!G) return;
    stopClock();
    G.tickId = setInterval(() => appleTick(), 150);
  }
  function appleBegin() {
    if (!G) return;
    G.phase = 'play';
    G.lastEvent = 'Eat! And mind the snakes.';
    appleRender();
    appleLoopStart();
  }
  function appleBoardHtml() {
    if (!G) return '';
    const cells = [];
    for (let y = 0; y < APPLE_H; y++) {
      for (let x = 0; x < APPLE_W; x++) {
        if (G.grid[y][x] === '#') { cells.push('<div class="gx-apple-cell gx-apple-wall"></div>'); continue; }
        const pl = G.players.find(pl2 => pl2.active && pl2.x === x && pl2.y === y);
        const sn = G.snakes.find(sn2 => sn2.x === x && sn2.y === y);
        let content = '', cls = 'gx-apple-cell';
        if (pl) { content = pl.icon; cls += ' gx-apple-player'; }
        else if (sn) { content = '🐍'; cls += G.fright > 0 ? ' gx-apple-snake gx-apple-fright' : ' gx-apple-snake'; }
        else if (G.powers.has(x + ',' + y)) { content = '🍇'; cls += ' gx-apple-power'; }
        else if (G.pellets.has(x + ',' + y)) { content = '<i></i>'; cls += ' gx-apple-dot'; }
        cells.push(`<div class="${cls}">${content}</div>`);
      }
    }
    return `<div class="gx-apple-board" role="img" aria-label="Orchard maze">${cells.join('')}</div>`;
  }
  function applePad(idx) {
    const pl = G.players[idx];
    return `<div class="gx-race-pad"><strong>${esc(pl.icon)} ${esc(pl.name)}</strong>
      <div class="gx-race-pad-grid"><span></span><button data-gx="a-dir" data-player="${idx}" data-dir="up" aria-label="${esc(pl.name)} up">▲</button><span></span><button data-gx="a-dir" data-player="${idx}" data-dir="left" aria-label="${esc(pl.name)} left">◀</button><button data-gx="a-dir" data-player="${idx}" data-dir="down" aria-label="${esc(pl.name)} down">▼</button><button data-gx="a-dir" data-player="${idx}" data-dir="right" aria-label="${esc(pl.name)} right">▶</button></div></div>`;
  }
  function appleRender() {
    if (!G) return;
    const seats = G.players.map(pl => ({ name: pl.name, score: pl.score }));
    const lines = G.players.map(pl => `<span>${esc(pl.icon)} ${esc(pl.name)} · Lives <strong>${'♥'.repeat(Math.max(0, pl.lives))}</strong> · Apples <strong>${pl.apples}</strong></span>`).join('');
    const between = G.phase === 'between'
      ? `<div class="gx-garden-turn"><h2>${esc(G.betweenTitle || 'Caught!')}</h2><p>${esc(G.betweenText || '')}</p><button class="primary" data-gx="a-continue" data-gx-autofocus>Back into the orchard</button></div>`
      : '';
    const pads = G.phase === 'play'
      ? (G.mode === 'race' ? `<div class="gx-race-pads">${applePad(0)}${applePad(1)}</div>` : `<div class="gx-race-pads gx-race-pads-one">${applePad(0)}</div>`)
      : '';
    setHtml(`${backBar('Adam & Eve Apple Maze')}${scoreBar(seats, -1)}
      <section class="card gx-garden-card">
        <div class="gx-garden-hud"><span>Level ${G.runLevel} · ${esc(G.plan.name)}</span><span>Apples left <strong>${G.pelletsLeft}</strong></span>${G.mode === 'race' ? `<span>Clock <strong>${Math.max(0, Math.ceil(G.timeLeft || 0))}s</strong></span>` : ''}${G.fright > 0 ? `<span>Snakes fleeing <strong>${Math.ceil(G.fright / 6.7)}s</strong></span>` : ''}${lines}</div>
        ${appleBoardHtml()}
        <p class="gx-event" role="status">${esc(G.lastEvent || 'Eat the apples. Dodge the snakes.')}</p>
        ${between}
        ${pads}
      </section>
      <p class="footnote">Apples 10 · 🍇 grape of power 50 and turns the hunt · a frightened snake 150. Three lives each.</p>`);
  }
  function appleSetDir(idx, dir) {
    if (!G || G.show !== 'apple') return;
    const pl = G.players[idx];
    if (pl && APPLE_DIRS[dir]) pl.nextDir = dir;
  }
  function appleTick() {
    if (!G || G.show !== 'apple' || G.phase !== 'play') return;
    G.tickCount++;
    for (let i = 0; i < G.players.length; i++) {
      appleStepPlayer(i);
      if (!G || G.phase !== 'play') return;
    }
    if (G.fright > 0) G.fright--;
    const every = (G.plan.snakeEvery || 2) + (G.fright > 0 ? 1 : 0);
    if (G.tickCount % every === 0) appleStepSnakes();
    if (!G || G.phase !== 'play') return;
    if (G.mode === 'race') {
      G.timeLeft = (G.timeLeft || 0) - 0.15;
      if (G.timeLeft <= 0) { appleRaceEnd('time'); return; }
    }
    appleRender();
  }
  function appleStepPlayer(idx) {
    const pl = G.players[idx];
    if (!pl || !pl.active || !G || G.phase !== 'play') return;
    const nd = APPLE_DIRS[pl.nextDir];
    if (nd && appleOpen(G.grid, pl.x + nd[0], pl.y + nd[1])) pl.dir = pl.nextDir;
    const d = APPLE_DIRS[pl.dir];
    if (d && appleOpen(G.grid, pl.x + d[0], pl.y + d[1])) { pl.x += d[0]; pl.y += d[1]; }
    appleEatAt(idx);
    if (G.phase === 'play') appleCollide(idx);
  }
  function appleEatAt(idx) {
    const pl = G.players[idx];
    if (!pl || !G) return;
    const k = pl.x + ',' + pl.y;
    if (G.powers.has(k)) {
      G.powers.delete(k); G.pelletsLeft--;
      pl.score += 50; pl.apples++;
      G.fright = 45;
      G.lastEvent = `${pl.icon} ${pl.name} ate the 🍇 grape of power — the snakes flee!`;
      sfx('ding');
    } else if (G.pellets.has(k)) {
      G.pellets.delete(k); G.pelletsLeft--;
      pl.score += 10; pl.apples++;
      sfx('select');
    }
    if (G.pelletsLeft <= 0 && G.phase === 'play') {
      if (G.mode === 'solo') appleSoloClear();
      else appleRaceEnd('apples');
    }
  }
  function appleCollide(idx) {
    if (!G || G.phase !== 'play') return;
    const pl = G.players[idx];
    if (!pl || !pl.active) return;
    const sn = G.snakes.find(sn2 => sn2.x === pl.x && sn2.y === pl.y);
    if (!sn) return;
    if (G.fright > 0) {
      pl.score += 150;
      G.lastEvent = `${pl.icon} ${pl.name} caught a fleeing snake — +150!`;
      sfx('catch');
      sn.x = sn.hx; sn.y = sn.hy;
    } else {
      applePlayerDown(idx);
    }
  }
  function appleStepSnakes() {
    if (!G) return;
    const rev = { up: 'down', down: 'up', left: 'right', right: 'left' };
    for (const sn of G.snakes) {
      const opts = Object.entries(APPLE_DIRS).filter(([, d]) => appleOpen(G.grid, sn.x + d[0], sn.y + d[1]));
      if (!opts.length) continue;
      let cand = opts.filter(([name]) => name !== rev[sn.dir]);
      if (!cand.length) cand = opts;
      const targets = G.players.filter(pl => pl.active);
      if (!targets.length) return;
      const dist = (x, y) => Math.min(...targets.map(pl => Math.abs(pl.x - x) + Math.abs(pl.y - y)));
      cand.sort((a, b) => {
        const da = dist(sn.x + a[1][0], sn.y + a[1][1]);
        const db = dist(sn.x + b[1][0], sn.y + b[1][1]);
        return G.fright > 0 ? db - da : da - db;
      });
      const pick = cand[0];
      sn.dir = pick[0];
      sn.x += pick[1][0]; sn.y += pick[1][1];
    }
    G.players.forEach((pl, i) => { if (pl.active) appleCollide(i); });
  }
  function applePlayerDown(idx) {
    if (!G) return;
    const pl = G.players[idx];
    stopClock();
    sfx('wrong');
    pl.lives--;
    if (pl.lives <= 0) {
      pl.active = false;
      if (G.mode === 'solo') {
        appleResults(`${esc(pl.icon)} ${esc(pl.name)} is out of lives`, `${esc(pl.name)} ate ${pl.apples} apples for ${pl.score} points before the snakes closed in.`, false);
      } else {
        appleRaceFinish(G.players[1 - idx], `${pl.name} is out of lives.`);
      }
      return;
    }
    G.phase = 'between';
    G.betweenTitle = `${pl.icon} ${pl.name} was caught!`;
    G.betweenText = `A snake got ${pl.name}. ${pl.lives} ${pl.lives === 1 ? 'life' : 'lives'} left — eaters and snakes return to their starts; the eaten apples stay eaten.`;
    G.lastEvent = G.betweenText;
    appleRender();
  }
  function appleContinue() {
    if (!G || G.phase !== 'between') return;
    G.players.forEach(pl => { if (pl.active) { pl.x = pl.sx; pl.y = pl.sy; pl.dir = 'left'; pl.nextDir = 'left'; } });
    G.snakes.forEach(sn => { sn.x = sn.hx; sn.y = sn.hy; });
    G.fright = 0;
    G.phase = 'play';
    G.lastEvent = 'Back into the orchard — mind the snakes.';
    appleRender();
    appleLoopStart();
  }
  function appleSoloClear() {
    if (!G) return;
    stopClock();
    G.levelBeaten = true;
    gxBeatLevel('apple', G.runLevel);
    sfx('win');
    const pl = G.players[0];
    appleResults(`${esc(pl.icon)} ${esc(pl.name)} cleared the orchard!`, `${esc(pl.name)} ate every apple for ${pl.score} points with ${pl.lives} ${pl.lives === 1 ? 'life' : 'lives'} to spare.`, true);
  }
  function appleRaceEnd(reason) {
    if (!G) return;
    const [a, b] = G.players;
    let winner = null;
    if (a.score !== b.score) winner = a.score > b.score ? a : b;
    else if (a.apples !== b.apples) winner = a.apples > b.apples ? a : b;
    appleRaceFinish(winner, reason === 'apples' ? 'Every apple in the orchard is eaten.' : 'The orchard clock ran out.');
  }
  function appleRaceFinish(winner, reason) {
    if (!G) return;
    stopClock();
    const beaten = !!(winner && winner.score >= G.plan.target);
    G.levelBeaten = beaten;
    if (beaten) { gxBeatLevel('apple', G.runLevel); sfx('win'); }
    const stats = G.players.map(pl => `${esc(pl.icon)} ${esc(pl.name)}: <strong>${pl.score}</strong> points · ${pl.apples} apples`).join('<br>');
    appleResults(
      winner ? `${esc(winner.icon)} ${esc(winner.name)} wins the apple race!` : 'A dead heat in the orchard!',
      `${esc(reason)}<br>${stats}`,
      beaten,
    );
  }
  function appleResults(title, blurb, beaten) {
    if (!G) return;
    stopClock();
    G.phase = 'over';
    saveBest('apple', Math.max(...G.players.map(pl => pl.score)));
    const b = bestOf('apple');
    setHtml(`${backBar('Adam & Eve Apple Maze')}
      <section class="card gx-center">
        <span class="eyebrow">LEVEL ${G.runLevel} · ${esc(G.plan.name).toUpperCase()}</span>
        <h2>${title}</h2>
        <p>${blurb}</p>
        ${gxLevelBanner('apple', G.runLevel, !!beaten)}
        ${beaten ? '' : `<p class="muted">${G.mode === 'race' ? `Score ${G.plan.target} or more as the winner to beat Level ${G.runLevel}.` : `Eat every apple to beat Level ${G.runLevel}.`}</p>`}
        ${beaten && G.runLevel >= 5 ? `<p class="lead">👑 Keeper of the Orchard — all five levels beaten.</p>` : ''}
        <p class="muted">Best orchard score on this device: <strong>${b.best} points</strong> over ${b.plays} game${b.plays === 1 ? '' : 's'}.</p>
        <button class="primary" data-gx="show-menu" data-show="apple">Play again</button>
        <button class="secondary" data-gx="hub">All games</button>
      </section>`);
  }

  /* ================= CORE ================= */
  let pendingShow = null;
  function showMenu(key) {
    clearTimers();
    setSong('hub');
    G = { show: key, timers: [], tickId: null, clockEndsAt: 0, clockTotal: 0 };
    if (key === 'jeopardy') jeopardyMenu();
    else if (key === 'millionaire') millionaireMenu();
    else if (key === 'sound') soundMenu();
    else if (key === 'babel') babelMenu();
    else if (key === 'garden') gardenMenu();
    else if (key === 'apple') appleMenu();
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
    if (action === 'lvl-pick') {
      const sh = btn.dataset.showKey, n = Number(btn.dataset.level);
      if (gxCanPlay(sh, n)) { gxLevelSel[sh] = n; showMenu(sh); }
      return;
    }
    /* Adam in the Garden */
    if (action === 'g-mode') { gardenStart(btn.dataset.mode); return; }
    if (action === 'g-begin') { gardenBeginPlay(); return; }
    if (action === 'g-move') { gardenMove(btn.dataset.dir); return; }
    if (action === 'g-race-begin') { gardenRaceBegin(); return; }
    if (action === 'g-race-move') { gardenRaceMove(Number(btn.dataset.racer), btn.dataset.dir); return; }
    /* Adam & Eve Apple Maze */
    if (action === 'a-mode') { appleStart(btn.dataset.mode); return; }
    if (action === 'a-begin') { appleBegin(); return; }
    if (action === 'a-dir') { appleSetDir(Number(btn.dataset.player), btn.dataset.dir); sfx('select'); return; }
    if (action === 'a-continue') { appleContinue(); return; }
    if (action === 'g-continue') { gardenContinue(); return; }
    if (action === 'g-pause') { gardenPauseToggle(); return; }
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
    if (G && G.show === 'garden' && G.phase === 'raceplay') {
      const d0 = { w: 'up', s: 'down', a: 'left', d: 'right', W: 'up', S: 'down', A: 'left', D: 'right' }[e.key];
      const d1 = { ArrowUp: 'up', ArrowDown: 'down', ArrowLeft: 'left', ArrowRight: 'right' }[e.key];
      if (d0) { e.preventDefault(); gardenRaceMove(0, d0); return; }
      if (d1) { e.preventDefault(); gardenRaceMove(1, d1); return; }
    }
    if (G && G.show === 'garden' && G.phase === 'play') {
      const dir = { ArrowUp: 'up', ArrowDown: 'down', ArrowLeft: 'left', ArrowRight: 'right', w: 'up', s: 'down', a: 'left', d: 'right', W: 'up', S: 'down', A: 'left', D: 'right' }[e.key];
      if (dir) { e.preventDefault(); gardenMove(dir); return; }
      if (e.key === ' ') { e.preventDefault(); gardenPauseToggle(); return; }
    }
    if (G && G.show === 'apple' && G.phase === 'play') {
      const d0 = { w: 'up', s: 'down', a: 'left', d: 'right', W: 'up', S: 'down', A: 'left', D: 'right' }[e.key];
      const dArrows = { ArrowUp: 'up', ArrowDown: 'down', ArrowLeft: 'left', ArrowRight: 'right' }[e.key];
      if (d0) { e.preventDefault(); appleSetDir(0, d0); return; }
      if (dArrows) { e.preventDefault(); appleSetDir(G.mode === 'race' ? 1 : 0, dArrows); return; }
    }
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
      garden: { gardenMakeLanes, gardenMakeEntities, gardenFruitFor, gardenOverlap, gardenMove, gardenTick, gardenDie, gardenTryGoal, gardenCollect, gardenActivePlayer, gardenSeatsForBar, gardenRaceSetup, gardenRaceMove, gardenRaceTick, gardenRaceGoal, gardenRaceDie, GARDEN_COLS, GARDEN_ROWS, GARDEN_SLOTS },
      apple: { APPLE_BASE, appleGridFor, appleOpen, applePellets, appleFindSpawn, appleSetDir, appleTick, appleStepSnakes, appleEatAt },
      forcePc() { flushPc(); },
      finishBoard() { if (G && G.cats) { G.cats.forEach(c => c.clues.forEach(cl => { cl.used = true; })); jeopardyBoard(); } },
    },
  };
})();
