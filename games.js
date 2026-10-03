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
    return `<button class="text-button" data-gx="hub">← Games</button><span class="eyebrow">GAME SHOW</span><h1>${esc(title)}</h1>`;
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

  /* ================= JEOPARDY ================= */
  function jeopardyMenu() {
    const b = bestOf('jeopardy');
    setHtml(`${backBar('Jeopardy')}
      <p class="lead">Five categories, twenty-five clues, and one final wager. Answer in question form — thirty seconds on the clock once you buzz.</p>
      ${bestLine('jeopardy', v => v + ' points')}
      <div class="gx-modes">
        <button class="card gx-mode" data-gx="j-mode" data-mode="solo"><strong>Solo</strong><span>You against the board. Every clue is yours to win — or lose.</span></button>
        <button class="card gx-mode" data-gx="j-mode" data-mode="pc"><strong>You vs the PC</strong><span>The PC buzzes in too, faster on the big-money clues. Beat it to the buzzer.</span></button>
        <button class="card gx-mode" data-gx="j-mode" data-mode="2p"><strong>Two players</strong><span>Pass and play on this device. Tap your side to buzz.</span></button>
      </div>
      <div class="gx-names">${nameInputs('2p')}</div>
      <p class="footnote">For two-player games, set both names above. In solo and PC games only your name is used.</p>`);
  }
  function jeopardyStart(mode) {
    const usedNames = readNames(['You', 'Player 2']);
    const seats = mode === 'solo'
      ? [{ name: usedNames[0] || 'You', pc: false, score: 0 }]
      : mode === 'pc'
        ? [{ name: usedNames[0] || 'You', pc: false, score: 0 }, { name: 'The PC', pc: true, score: 0 }]
        : [{ name: usedNames[0] || 'Player 1', pc: false, score: 0 }, { name: usedNames[1] || 'Player 2', pc: false, score: 0 }];
    G = Object.assign(G || {}, {
      show: 'jeopardy', phase: 'pick', mode, seats, control: 0,
      cats: bank.jeopardy.map(c => ({ name: c.category, clues: c.clues.map(cl => ({ ...cl, used: false })) })),
      current: null, buzzedBy: null, tried: [], finalists: null, wagers: {}, finalAnswers: {},
    });
    jeopardyBoard();
  }
  function jeopardyBoard() {
    G.phase = 'pick'; G.current = null; G.buzzedBy = null; G.tried = [];
    const done = G.cats.every(c => c.clues.every(cl => cl.used));
    setHtml(`${backBar('Jeopardy')}${scoreBar(G.seats, G.control)}
      ${done ? `<section class="card gx-center"><h2>The board is clear.</h2><p>Time for Final Jeopardy — wager on one last clue from Church History.</p><button class="primary" data-gx="j-final">Play Final Jeopardy</button></section>`
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
    const fin = bank.jeopardyFinal;
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
    const fin = bank.jeopardyFinal;
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
    const fin = bank.jeopardyFinal;
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
    saveBest('jeopardy', youScore);
    setHtml(`${backBar('Jeopardy')}${scoreBar(G.seats, -1)}
      <section class="card gx-center">
        <span class="eyebrow">FINAL SCORES</span>
        <h2>${winners.length > 1 ? 'A tie game!' : `${esc(winners[0].name)} ${G.seats.length > 1 ? 'wins' : '— board cleared'}!`}</h2>
        <p>${G.seats.map(s => `${esc(s.name)}: <strong>${s.score}</strong>`).join(' · ')}</p>
        <p class="muted">The final response was: ${esc(bank.jeopardyFinal.answer)} (${esc(bank.jeopardyFinal.reference)})</p>
        <button class="primary" data-gx="show-menu" data-show="jeopardy">Play again</button>
        <button class="secondary" data-gx="hub">All games</button>
      </section>`);
  }

  /* ================= MILLIONAIRE ================= */
  function millionaireMenu() {
    setHtml(`${backBar('Who Wants to Be a Millionaire')}
      <p class="lead">Fifteen questions stand between you and a million. Safe havens at questions 5 and 10. Thirty seconds a question; walk away whenever you like.</p>
      ${bestLine('millionaire', v => money(v))}
      <div class="gx-names">${nameInputs('solo')}</div>
      <p class="lead">Lifelines, once each: <strong>50:50</strong> · <strong>Ask a Friend</strong> · <strong>Skip the Question</strong>.</p>
      <button class="primary" data-gx="m-start">Take the hot seat</button>`);
  }
  function tierFor(rung) { return rung <= 5 ? 'easy' : rung <= 10 ? 'medium' : 'hard'; }
  function millionaireStart() {
    const usedNames = readNames(['You']);
    const pools = { easy: shuffle(bank.millionaire.easy), medium: shuffle(bank.millionaire.medium), hard: shuffle(bank.millionaire.hard) };
    G = Object.assign(G || {}, {
      show: 'millionaire', phase: 'question', name: usedNames[0] || 'You',
      rung: 1,
      questions: [...pools.easy.slice(0, 5), ...pools.medium.slice(0, 5), ...pools.hard.slice(0, 5)],
      spares: { easy: pools.easy.slice(5), medium: pools.medium.slice(5), hard: pools.hard.slice(5) },
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
          <span class="eyebrow">QUESTION ${G.rung} OF 15 · ${money(ladder[G.rung - 1])}</span>
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
    later(() => {
      if (G.locked) {
        if (G.rung === 15) { millionaireEnd(true, false); return; }
        G.rung++;
        nextMillionaireQuestion();
      } else {
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
      const tier = tierFor(G.rung);
      const rightChance = tier === 'easy' ? 0.9 : tier === 'medium' ? 0.75 : 0.5;
      const pickRight = Math.random() < rightChance;
      const text = pickRight ? q.answer : G.options.find(o => o !== q.answer);
      const confidence = tier === 'easy' ? 80 + rand(16) : tier === 'medium' ? 65 + rand(21) : 45 + rand(26);
      G.friendNote = { text, confidence };
    } else if (kind === 'skip') {
      G.lifelines.skip = false;
      const tier = tierFor(G.rung);
      if (G.spares[tier].length) G.questions[G.rung - 1] = G.spares[tier].shift();
      nextMillionaireQuestion();
      return;
    }
    renderMillionaire();
    paintClock();
  }
  function millionaireEnd(wonAll, timedOut) {
    stopClock();
    G.phase = 'over';
    const ladder = bank.millionaire.ladder;
    const won = wonAll ? ladder[14] : guaranteedAmount();
    saveBest('millionaire', won);
    setHtml(`${backBar('Who Wants to Be a Millionaire')}
      <section class="card gx-center">
        <span class="eyebrow">${wonAll ? 'MILLIONAIRE' : timedOut ? 'TIME RAN OUT' : 'GAME OVER'}</span>
        <h2>${wonAll ? `${esc(G.name)} — you did it!` : `You leave with ${money(won)}`}</h2>
        <p>${wonAll ? 'Fifteen questions, answered in faith and knowledge. A perfect game.' : `You reached question ${G.rung} of 15. The guaranteed amount is yours to keep.`}</p>
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
      <p class="lead">We asked the board — well, we wrote the board: our own house rankings, made for this app. Name the answers the board holds, mind your three strikes, and watch the steal.</p>
      ${bestLine('feud', v => v + ' points')}
      <div class="gx-modes">
        <button class="card gx-mode" data-gx="f-mode" data-mode="pc"><strong>Your team vs the PC</strong><span>Face off against the machine across three rounds. Round three counts double.</span></button>
        <button class="card gx-mode" data-gx="f-mode" data-mode="teams"><strong>Two teams, one device</strong><span>Pass and play. Each team guesses on its own turns.</span></button>
      </div>
      <div class="gx-names">${nameInputs('teams')}</div>
      <p class="footnote">Team names above are used in two-team games; against the PC only your team name is used.</p>`);
  }
  function feudStart(mode) {
    const usedNames = readNames(['Your Team', 'Team Two']);
    const seats = mode === 'pc'
      ? [{ name: usedNames[0] || 'Your Team', pc: false, score: 0 }, { name: 'PC Team', pc: true, score: 0 }]
      : [{ name: usedNames[0] || 'Team One', pc: false, score: 0 }, { name: usedNames[1] || 'Team Two', pc: false, score: 0 }];
    G = Object.assign(G || {}, {
      show: 'feud', mode, seats, round: 0, order: shuffle(bank.feud.map((_, i) => i)),
      q: null, revealed: new Set(), pot: 0, multiplier: 1, strikes: 0,
      playing: 0, faceTurn: 0, faceHits: {}, faceMissed: {}, phase: 'splash', lastEvent: '',
    });
    feudBeginRound();
  }
  function feudBeginRound() {
    G.round++;
    G.q = bank.feud[G.order[(G.round - 1) % bank.feud.length]];
    G.revealed = new Set(); G.pot = 0; G.strikes = 0;
    G.multiplier = G.round === 3 ? 2 : 1;
    G.faceHits = {}; G.faceMissed = {};
    G.faceTurn = (G.round - 1) % 2;
    G.phase = 'faceoff'; G.lastEvent = '';
    feudRender();
    feudMaybePcFaceoff();
  }
  function feudSlotsHtml() {
    return `<div class="gx-feud-board">${G.q.answers.map((a, i) => G.revealed.has(i)
      ? `<div class="gx-slot open"><span class="gx-slot-rank">${i + 1}</span><strong>${esc(a.text)}</strong><b>${a.points * G.multiplier}</b></div>`
      : `<div class="gx-slot"><span class="gx-slot-rank">${i + 1}</span><strong class="gx-hidden-answer">— — —</strong><b></b></div>`).join('')}</div>`;
  }
  function feudHeader() {
    return `${backBar('Family Feud')}${scoreBar(G.seats, G.phase === 'faceoff' ? G.faceTurn : G.playing)}
      <p class="gx-roundline">Round ${G.round} of 3${G.multiplier > 1 ? ' · DOUBLE POINTS' : ''} · Pot: <strong>${G.pot}</strong> · Strikes: <strong class="gx-strikes">${'✕'.repeat(G.strikes)}${'·'.repeat(Math.max(0, 3 - G.strikes))}</strong></p>`;
  }
  function feudGuessRow(label) {
    return `<div class="gx-guessrow"><input data-gx-guess data-gx-autofocus placeholder="Type your guess…" maxlength="60" aria-label="Your guess"><button class="primary" data-gx="f-guess">${esc(label || 'Guess')}</button></div>`;
  }
  function feudRender() {
    const q = G.q;
    if (G.phase === 'faceoff') {
      const turn = G.seats[G.faceTurn];
      setHtml(`${feudHeader()}
        <section class="card gx-clue"><span class="eyebrow">FACE-OFF</span><h2>${esc(q.prompt)}</h2>
        ${feudSlotsHtml()}
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
        ${feudSlotsHtml()}
        <p class="lead"><strong>${esc(winner.name)}</strong> took the face-off. Play the board, or pass it to ${esc(G.seats[1 - G.playing].name)}?</p>
        <div class="gx-buzzrow"><button class="primary" data-gx="f-playpass" data-choice="play">Play</button><button class="secondary" data-gx="f-playpass" data-choice="pass">Pass</button></div>
        </section>`);
      return;
    }
    if (G.phase === 'play') {
      const team = G.seats[G.playing];
      setHtml(`${feudHeader()}
        <section class="card gx-clue"><span class="eyebrow">${esc(team.name).toUpperCase()} AT THE BOARD</span><h2>${esc(q.prompt)}</h2>
        ${feudSlotsHtml()}
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
        ${feudSlotsHtml()}
        <p class="lead">Three strikes! <strong>${esc(stealer.name)}</strong> — one answer steals the whole pot of ${G.pot}.</p>
        ${stealer.pc ? `<p class="lead">The PC is choosing its steal…</p>` : `${clockHtml('Twenty seconds for the steal')}${feudGuessRow('Steal it')}`}
        </section>`);
      if (!stealer.pc) startClock(20, () => feudStealGuess(null));
      else { G.pcAction = () => feudPcSteal(); later(flushPc, 1000); }
      return;
    }
    if (G.phase === 'splash' || G.phase === 'over') { feudSplash(); return; }
  }
  function feudNormalize(text) {
    return String(text || '').toLowerCase().replace(/[’']/g, '').replace(/[^a-z0-9 ]/g, ' ').replace(/\s+/g, ' ').trim();
  }
  function feudMatch(text) {
    const input = feudNormalize(text);
    if (!input) return -1;
    const targets = [];
    G.q.answers.forEach((a, i) => { targets.push([feudNormalize(a.text), i]); (a.aliases || []).forEach(al => targets.push([feudNormalize(al), i])); });
    for (const [t, i] of targets) { if (input === t) return i; }
    for (const [t, i] of targets) {
      if (input.length >= 4 && (t.includes(input) || input.includes(t))) return i;
      if ((input + 's') === t || input === (t + 's')) return i;
    }
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
  function feudPcFaceGuess() {
    if (!G || G.phase !== 'faceoff') return;
    const hit = Math.random() < 0.85 ? feudPcPickAnswer() : -1;
    feudApplyFace(G.faceTurn, hit);
  }
  function feudFaceGuess(text) {
    if (!G || G.phase !== 'faceoff') return;
    stopClock();
    feudApplyFace(G.faceTurn, text === null ? -1 : feudMatch(text));
  }
  function feudApplyFace(seat, hitIdx) {
    const other = 1 - seat;
    if (hitIdx >= 0 && !G.revealed.has(hitIdx)) {
      G.revealed.add(hitIdx);
      G.pot += G.q.answers[hitIdx].points * G.multiplier;
      G.faceHits[seat] = G.q.answers[hitIdx].points;
      G.lastEvent = `${G.seats[seat].name} found “${G.q.answers[hitIdx].text}” — ${G.q.answers[hitIdx].points} points.`;
      if (G.faceHits[other] != null) {
        feudFaceWinner(G.faceHits[seat] > G.faceHits[other] ? seat : other);
        return;
      }
      if (G.faceMissed[other]) { feudFaceWinner(seat); return; }
      G.faceTurn = other;
    } else {
      G.lastEvent = hitIdx >= 0 ? 'Already on the board — that counts as a miss.' : `${G.seats[seat].name} named nothing on the board.`;
      G.faceMissed[seat] = true;
      if (G.faceHits[other] != null) { feudFaceWinner(other); return; }
      if (G.faceMissed[other]) { G.faceMissed = {}; G.faceTurn = seat; G.lastEvent += ' Both missed — guess again.'; }
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
    stopClock();
    const idx = text === null ? -1 : feudMatch(text);
    if (idx >= 0 && !G.revealed.has(idx)) feudReveal(idx, `${G.seats[G.playing].name} found “${G.q.answers[idx].text}” (+${G.q.answers[idx].points * G.multiplier}).`);
    else feudStrike(idx >= 0 ? 'Already revealed — that costs a strike.' : 'Not on the board.');
  }
  function feudReveal(idx, message) {
    G.revealed.add(idx);
    G.pot += G.q.answers[idx].points * G.multiplier;
    G.lastEvent = message;
    if (G.revealed.size >= G.q.answers.length) { feudSettle(G.playing, 'The board is cleared!'); return; }
    feudRender();
    feudMaybePcPlay();
  }
  function feudStrike(message) {
    G.strikes++;
    G.lastEvent = `${message} Strike ${G.strikes} of 3.`;
    if (G.strikes >= 3) { G.phase = 'steal'; G.lastEvent = `${message} Three strikes!`; feudRender(); return; }
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
    const idx = Math.random() < 0.55 ? feudPcPickAnswer() : -1;
    if (idx >= 0 && !G.revealed.has(idx)) feudReveal(idx, `The PC found “${G.q.answers[idx].text}” (+${G.q.answers[idx].points * G.multiplier}).`);
    else feudStrike('The PC named nothing on the board.');
  }
  function feudPcSteal() {
    if (!G || G.phase !== 'steal') return;
    const idx = Math.random() < 0.5 ? feudPcPickAnswer() : -1;
    feudApplySteal(idx);
  }
  function feudStealGuess(text) {
    if (!G || G.phase !== 'steal') return;
    stopClock();
    feudApplySteal(text === null ? -1 : feudMatch(text));
  }
  function feudApplySteal(idx) {
    const stealer = 1 - G.playing;
    if (idx >= 0 && !G.revealed.has(idx)) {
      G.revealed.add(idx);
      G.pot += G.q.answers[idx].points * G.multiplier;
      G.lastEvent = `The steal is good — “${G.q.answers[idx].text}” was on the board!`;
      feudSettle(stealer, G.lastEvent);
    } else {
      G.lastEvent = 'The steal missed.';
      feudSettle(G.playing, G.lastEvent);
    }
  }
  function feudSettle(winner, message) {
    stopClock();
    G.seats[winner].score += G.pot;
    G.roundWinner = winner;
    G.phase = G.round >= 3 ? 'over' : 'splash';
    G.lastEvent = `${message} ${G.seats[winner].name} takes the pot of ${G.pot}.`;
    if (G.phase === 'over') {
      const top = Math.max(...G.seats.map(s => s.score));
      saveBest('feud', top);
    }
    feudSplash();
  }
  function feudSplash() {
    const over = G.phase === 'over';
    const top = Math.max(...G.seats.map(s => s.score));
    const champs = G.seats.filter(s => s.score === top);
    setHtml(`${feudHeader()}
      <section class="card gx-center">
        <span class="eyebrow">${over ? 'THAT IS THE GAME' : `ROUND ${G.round} COMPLETE`}</span>
        <h2>${over ? (champs.length > 1 ? 'A tie game!' : `${esc(champs[0].name)} win${G.seats.length > 1 && champs[0].pc ? 's' : ''} the Feud!`) : `${esc(G.seats[G.roundWinner].name)} take round ${G.round}`}</h2>
        <p>${esc(G.lastEvent)}</p>
        <p>${G.seats.map(s => `${esc(s.name)}: <strong>${s.score}</strong>`).join(' · ')}</p>
        ${over
          ? `<button class="primary" data-gx="show-menu" data-show="feud">Play again</button> <button class="secondary" data-gx="hub">All games</button>`
          : `<button class="primary" data-gx="f-next">Start round ${G.round + 1}</button>`}
      </section>
      <section class="card"><span class="eyebrow">THE BOARD, REVEALED</span>${feudSlotsAllOpen()}</section>`);
  }
  function feudSlotsAllOpen() {
    return `<div class="gx-feud-board">${G.q.answers.map((a, i) => `<div class="gx-slot open"><span class="gx-slot-rank">${i + 1}</span><strong>${esc(a.text)}</strong><b>${a.points * G.multiplier}</b></div>`).join('')}</div>`;
  }

  /* ================= SOUND IT OUT ================= */
  const SOUND_BASE = { easy: 100, medium: 200, hard: 300 };
  function soundDeck(level) {
    const all = bank.soundItOut || [];
    if (level === 'easy') return all.filter(c => c.level === 'easy');
    if (level === 'hard') return all.filter(c => c.level === 'hard');
    return all;
  }
  function soundMenu() {
    const lvl = (G && G.level) || 'mixed';
    setHtml(`${backBar('Sound It Out')}
      <p class="lead">Famous lines of Scripture, hidden in phonetic gibberish. Sound the card out — aloud works best — and decode the real phrase. Two or three readings is normal: the ear gets it before the eye does.</p>
      <div class="gx-levels" role="group" aria-label="Difficulty">
        ${[['easy', 'Easy'], ['mixed', 'Mixed'], ['hard', 'Hard']].map(([k, l]) => `<button class="secondary gx-level ${lvl === k ? 'active' : ''}" data-gx="s-level" data-level="${k}">${l}</button>`).join('')}
      </div>
      ${bestLine('sound', v => v + ' points')}
      <div class="gx-modes">
        <button class="card gx-mode" data-gx="s-mode" data-mode="solo"><strong>Solo decode</strong><span>Ten cards against the clock. Reveal when you're ready, then score yourself honestly.</span></button>
        <button class="card gx-mode" data-gx="s-mode" data-mode="race"><strong>Race the PC</strong><span>Four phrases, one true card. Tap the real line before the PC cracks it — a wrong tap hands it the steal.</span></button>
        <button class="card gx-mode" data-gx="s-mode" data-mode="party"><strong>Party — pass and play</strong><span>One reader sounds the gibberish aloud; everyone else decodes by ear. Twelve cards, reader rotates.</span></button>
      </div>
      <div class="gx-names">${nameInputs('solo')}</div>
      <p class="footnote">Your name is used in solo and race games. Party names are set on the next screen.</p>`);
  }
  function soundStart(mode) {
    const lvl = (G && G.level) || 'mixed';
    if (mode === 'party') { soundPartySetup(); return; }
    const usedNames = readNames(['You']);
    const base = { show: 'sound', level: lvl, phase: 'card', idx: 0, streak: 0, timedOut: false, timeLeft: 0 };
    if (mode === 'race') {
      G = Object.assign(G || {}, base, {
        mode: 'race',
        seats: [{ name: usedNames[0] || 'You', pc: false, score: 0 }, { name: 'The PC', pc: true, score: 0 }],
        deck: sample(soundDeck(lvl), 10),
      });
    } else {
      G = Object.assign(G || {}, base, {
        mode: 'solo',
        seats: [{ name: usedNames[0] || 'You', pc: false, score: 0 }],
        deck: sample(soundDeck(lvl), 10),
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
      const decoys = sample((bank.soundItOut || []).filter(x => x.phrase !== c.phrase), 3).map(x => x.phrase);
      G.options = shuffle([c.phrase, ...decoys]);
      setHtml(`${backBar('Sound It Out')}${scoreBar(G.seats, 0)}
        <section class="card gx-clue">
          <span class="eyebrow">${eyebrow}</span>
          <h2 class="gx-gibberish">${esc(c.gibberish)}</h2>
          <p class="lead">Which line of Scripture is this? Tap it before the PC decodes it.</p>
          ${clockHtml('Twenty-five seconds')}
          <div class="gx-choices">${G.options.map(o => `<button data-gx="s-pick" data-choice="${esc(o)}">${esc(o)}</button>`).join('')}</div>
        </section>`);
      startClock(25, () => soundPcSteal(true));
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
    const chance = c.level === 'easy' ? 0.55 : c.level === 'medium' ? 0.45 : 0.35;
    if (Math.random() < chance) {
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
    G = Object.assign(G || {}, { show: 'sound', mode: 'party', level: lvl, phase: 'setup' });
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
    let title, blurb;
    if (G.mode === 'solo') {
      title = `${esc(G.seats[0].name)} — ${G.seats[0].score} points`;
      blurb = `Ten cards decoded by ear. Best on this device: ${b.best} over ${b.plays} game${b.plays === 1 ? '' : 's'}.`;
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
        <button class="primary" data-gx="show-menu" data-show="sound">Play again</button>
        <button class="secondary" data-gx="hub">All games</button>
      </section>`);
  }

  /* ================= CORE ================= */
  let pendingShow = null;
  function showMenu(key) {
    clearTimers();
    G = { show: key, timers: [], tickId: null, clockEndsAt: 0, clockTotal: 0 };
    if (key === 'jeopardy') jeopardyMenu();
    else if (key === 'millionaire') millionaireMenu();
    else if (key === 'sound') soundMenu();
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
    const key = pendingShow || 'jeopardy';
    pendingShow = null;
    G = { show: key, timers: [], tickId: null, clockEndsAt: 0, clockTotal: 0 };
    setHtml('<div class="loading">Setting up the show…</div>');
    loadBank()
      .then(() => { if (root) showMenu(key); })
      .catch(err => { if (root) setHtml(`<div class="empty error">${esc(err.message)} <button class="secondary" data-gx="hub">Back to games</button></div>`); });
  }
  function hide() {
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
    /* Jeopardy */
    if (action === 'j-mode') { jeopardyStart(btn.dataset.mode); return; }
    if (action === 'j-pick') { if (G.phase === 'pick' && !G.seats[G.control].pc) openClue(Number(btn.dataset.cat), Number(btn.dataset.row)); return; }
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
      setClock(seconds) { if (G) { G.clockEndsAt = Date.now() + seconds * 1000; } },
      forcePc() { flushPc(); },
      finishBoard() { if (G && G.cats) { G.cats.forEach(c => c.clues.forEach(cl => { cl.used = true; })); jeopardyBoard(); } },
    },
  };
})();
