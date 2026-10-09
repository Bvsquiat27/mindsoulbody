/* Reading plans, search, marks, the Psalter, and spaced review.
   Stored under msb_ keys so Profile backup already includes them. */
(() => {
  'use strict';
  const esc = value => String(value ?? '').replace(/[&<>"']/g, char => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[char]));
  const BOOK_ROWS = '1|Genesis|50;2|Exodus|40;3|Leviticus|27;4|Numbers|36;5|Deuteronomy|34;6|Joshua|24;7|Judges|21;8|Ruth|4;9|1 Samuel|31;10|2 Samuel|24;11|1 Kings|22;12|2 Kings|25;13|1 Chronicles|29;14|2 Chronicles|36;15|Ezra|10;16|Nehemiah|13;17|Esther|10;18|Job|42;19|Psalms|150;20|Proverbs|31;21|Ecclesiastes|12;22|Song of Solomon|8;23|Isaiah|66;24|Jeremiah|52;25|Lamentations|5;26|Ezekiel|48;27|Daniel|12;28|Hosea|14;29|Joel|3;30|Amos|9;31|Obadiah|1;32|Jonah|4;33|Micah|7;34|Nahum|3;35|Habakkuk|3;36|Zephaniah|3;37|Haggai|2;38|Zechariah|14;39|Malachi|4;40|Matthew|28;41|Mark|16;42|Luke|24;43|John|21;44|Acts|28;45|Romans|16;46|1 Corinthians|16;47|2 Corinthians|13;48|Galatians|6;49|Ephesians|6;50|Philippians|4;51|Colossians|4;52|1 Thessalonians|5;53|2 Thessalonians|3;54|1 Timothy|6;55|2 Timothy|4;56|Titus|3;57|Philemon|1;58|Hebrews|13;59|James|5;60|1 Peter|5;61|2 Peter|3;62|1 John|5;63|2 John|1;64|3 John|1;65|Jude|1;66|Revelation|22;67|Tobit|14;68|Judith|16;69|Wisdom of Solomon|19;70|Ecclesiasticus|51;71|Baruch|5;72|Letter of Jeremiah|1;73|Prayer of Azariah|1;74|Susanna|1;75|Bel and the Dragon|1;76|1 Maccabees|16;77|2 Maccabees|15;78|Rest of Esther|16|10';
  const BOOKS = BOOK_ROWS.split(';').map(row => {
    const [id, name, chapters, start] = row.split('|');
    return { id: Number(id), name, chapters: Number(chapters), start: Number(start || 1) };
  });
  const bookById = id => BOOKS.find(book => book.id === id);
  function chaptersOf(id){
    const book = bookById(id);
    const list = [];
    for (let chapter = book.start; chapter <= book.chapters; chapter++) list.push({ book: book.id, chapter, name: book.name });
    return list;
  }
  function spread(items, days){
    const out = Array.from({ length: days }, () => []);
    items.forEach((item, index) => out[Math.min(days - 1, Math.floor(index * days / items.length))].push(item));
    return out;
  }
  function lentDays(){
    const genesis = chaptersOf(1);
    const proverbs = chaptersOf(20);
    const isaiah = chaptersOf(23).filter(item => item.chapter >= 40 && item.chapter <= 48);
    const days = spread(genesis, 40);
    proverbs.forEach((item, index) => { if (index < 31) days[index].push(item); });
    isaiah.forEach((item, index) => days[31 + index].push(item));
    return days;
  }
  function psalmMonth(){
    const days = spread(chaptersOf(19), 31);
    chaptersOf(20).forEach((item, index) => days[index].push(item));
    return days;
  }
  const PLANS = [
    { id:'bible-year', title:'Bible in a year', blurb:'The whole Bible in this app, including the deuterocanon, spread over 365 days.', days: spread(BOOKS.flatMap(book => chaptersOf(book.id)), 365) },
    { id:'gospels-40', title:'Gospels in 40 days', blurb:'Matthew, Mark, Luke, and John in forty days.', days: spread([40, 41, 42, 43].flatMap(chaptersOf), 40) },
    { id:'psalms-month', title:'Psalms and Proverbs in a month', blurb:'The Psalms across thirty-one days, with one chapter of Proverbs each day.', days: psalmMonth() },
    { id:'great-lent', title:'Great Lent', blurb:'Forty days for the Fast: Genesis and Proverbs, then Isaiah 40–48. A home schedule, not the appointed lectionary.', days: lentDays() },
    { id:'nt-90', title:'New Testament in 90 days', blurb:'Matthew through Revelation in ninety days.', days: spread(BOOKS.filter(book => book.id >= 40 && book.id <= 66).flatMap(book => chaptersOf(book.id)), 90) }
  ];
  PLANS.forEach(plan => {
    if (plan.days.some(day => !day.length)) throw Error('A reading plan has an empty day.');
  });
  const PLAN_KEY = 'msb_reading_plans';
  let currentPlan = 'bible-year';
  let viewDay = 0;

  function readJson(key, fallback){
    try { const value = JSON.parse(localStorage.getItem(key)); return value && typeof value === 'object' ? value : fallback; }
    catch { return fallback; }
  }
  function writeJson(key, value){ try { localStorage.setItem(key, JSON.stringify(value)); } catch {} }
  function planStore(){
    const data = readJson(PLAN_KEY, { plans:{} });
    if (!data.plans || typeof data.plans !== 'object') data.plans = {};
    return data;
  }
  function planState(id){
    const row = planStore().plans[id];
    if (!row || typeof row !== 'object') return null;
    return { started: typeof row.started === 'string' ? row.started : '', done: Array.isArray(row.done) ? row.done.filter(n => Number.isInteger(n)) : [] };
  }
  function savePlan(id, row){
    const data = planStore();
    data.plans[id] = row;
    writeJson(PLAN_KEY, data);
  }
  function planById(id){ return PLANS.find(plan => plan.id === id) || PLANS[0]; }
  function resumeDay(plan, row){
    if (!row) return 0;
    const next = plan.days.findIndex((_, index) => !row.done.includes(index));
    return next < 0 ? plan.days.length - 1 : next;
  }
  function readingLabel(item){ const name = window.msbBookLabel ? msbBookLabel(item.book, item.name) : item.name; return `${name} ${item.chapter}`; }
  function esTools(){ return window.MsbI18n && MsbI18n.lang() === 'es'; }
  function readingButton(item){
    return `<button type="button" class="plan-reading" data-lection-book="${item.book}" data-lection-chapter="${item.chapter}"><span>${esc(readingLabel(item))}</span><span>${esTools() ? 'Abrir' : 'Open'}</span></button>`;
  }
  function plansHome(){
    const cards = PLANS.map(plan => {
      const row = planState(plan.id);
      const done = row ? row.done.length : 0;
      const resume = resumeDay(plan, row);
      const status = !row ? (esTools() ? `${plan.days.length} días` : `${plan.days.length} days`) : done >= plan.days.length ? (esTools() ? 'Completo' : 'Complete') : (esTools() ? `Día ${resume + 1} de ${plan.days.length}` : `Day ${resume + 1} of ${plan.days.length}`);
      const action = !row ? (esTools() ? 'Empezar' : 'Start') : done >= plan.days.length ? (esTools() ? 'Leer de nuevo' : 'Read again') : (esTools() ? 'Seguir' : 'Resume');
      return `<button type="button" class="plan-card" data-nav="plans" data-plan="${esc(plan.id)}"><span class="eyebrow">READING PLAN</span><strong>${esc(plan.title)}</strong><span>${esc(plan.blurb)}</span><span class="plan-status">${esc(status)} · ${done} ${esTools() ? (done === 1 ? 'leído' : 'leídos') : 'read'}</span><span class="tag">${action}</span></button>`;
    }).join('');
    const due = reviewDue().length;
    return `<section id="reading-plans" data-ready="1"><div class="section-head"><h2>Reading plans</h2></div><div class="plan-grid">${cards}</div><section class="card home-tools"><span class="eyebrow">FIND A PASSAGE</span><h2>Search and marks</h2><form id="home-search-form" class="search-form" role="search"><label class="visually-hidden" for="home-search">Search the Bible, lessons, and notes</label><input id="home-search" type="search" maxlength="80" placeholder="Search the Bible, lessons, and notes" autocomplete="off"><button class="primary" type="submit">Search</button></form><div class="home-tool-links"><button type="button" class="secondary" data-nav="marks">My marks</button><button type="button" class="secondary" data-nav="psalter">Psalter</button><button type="button" class="secondary" data-nav="review">Review${due ? ` · ${due}` : ''}</button></div></section></section>`;
  }
  function plansScreen(){
    const plan = planById(currentPlan);
    const row = planState(plan.id);
    const day = Math.max(0, Math.min(plan.days.length - 1, viewDay));
    const readings = plan.days[day];
    const done = row && row.done.includes(day);
    const count = row ? row.done.length : 0;
    const root = document.getElementById('screen');
    root.innerHTML = `<button type="button" class="text-button back" data-nav="today">← Home</button><span class="eyebrow">READING PLAN</span><h1>${esc(plan.title)}</h1><p class="lead">${esc(plan.blurb)}</p><p class="plan-progress">${esTools() ? `${count} de ${plan.days.length} días leídos` : `${count} of ${plan.days.length} days read`}</p><section class="card"><div class="plan-day-head"><h2>${esTools() ? `Día ${day + 1} de ${plan.days.length}` : `Day ${day + 1} of ${plan.days.length}`}</h2>${done ? `<span class="tag">${esTools() ? 'Leído' : 'Read'}</span>` : ''}</div><div class="plan-readings">${readings.map(readingButton).join('')}</div><div class="plan-actions">${row ? '' : `<button type="button" class="primary" data-plan-start="${esc(plan.id)}">Start this plan</button>`}<button type="button" class="secondary" data-plan-done="${day}" ${row ? '' : 'disabled'}>${done ? 'Mark this day unread' : 'Mark this day read'}</button><button type="button" class="secondary" data-plan-day="${day - 1}" ${day === 0 ? 'disabled' : ''}>Previous day</button><button type="button" class="secondary" data-plan-day="${day + 1}" ${day === plan.days.length - 1 ? 'disabled' : ''}>Next day</button></div></section>`;
  }
  function selectPlan(id){
    currentPlan = planById(id).id;
    viewDay = resumeDay(planById(currentPlan), planState(currentPlan));
  }
  function startPlan(id){
    const today = dayKey();
    savePlan(id, { started: today, done: [] });
    selectPlan(id);
  }
  function togglePlanDay(index){
    const plan = planById(currentPlan);
    const row = planState(plan.id) || { started: dayKey(), done: [] };
    const day = Number(index);
    if (!Number.isInteger(day) || day < 0 || day >= plan.days.length) return;
    row.done = row.done.includes(day) ? row.done.filter(item => item !== day) : row.done.concat(day);
    savePlan(plan.id, row);
    viewDay = day;
  }

  const INTERVALS = [1, 3, 7, 14];
  const REVIEW_KEY = 'msb_review';
  function dayKey(date){
    const d = date || new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }
  function addDays(n){
    const d = new Date();
    d.setHours(12, 0, 0, 0);
    d.setDate(d.getDate() + n);
    return dayKey(d);
  }
  function reviewStore(){
    const data = readJson(REVIEW_KEY, { items:{} });
    if (!data.items || typeof data.items !== 'object') data.items = {};
    return data;
  }
  function reviewDue(){
    const today = dayKey();
    return Object.values(reviewStore().items).filter(item => item && !item.graduated && item.due && item.due <= today && item.prompt);
  }
  let reviewIndex = 0;
  function miss(entry){
    if (!entry || !entry.key || !entry.prompt || !Array.isArray(entry.choices) || !Number.isInteger(entry.correct)) return;
    const data = reviewStore();
    const prev = data.items[entry.key];
    const intervalIndex = prev && !prev.graduated ? Math.min((prev.intervalIndex || 0) + 1, INTERVALS.length - 1) : 0;
    data.items[entry.key] = {
      key: entry.key,
      title: String(entry.title || 'Review').slice(0, 160),
      prompt: String(entry.prompt).slice(0, 800),
      choices: entry.choices.slice(0, 8).map(choice => String(choice).slice(0, 400)),
      correct: entry.correct,
      explanation: String(entry.explanation || '').slice(0, 800),
      intervalIndex,
      due: addDays(INTERVALS[intervalIndex]),
      graduated: false
    };
    writeJson(REVIEW_KEY, data);
  }
  function hit(key){
    const data = reviewStore();
    const item = data.items[key];
    if (!item || item.graduated) return;
    item.graduated = true;
    item.due = null;
    writeJson(REVIEW_KEY, data);
  }
  function reviewScreen(){
    const due = reviewDue();
    const root = document.getElementById('screen');
    if (!due.length){
      const upcoming = Object.values(reviewStore().items).filter(item => item && !item.graduated && item.due).sort((a, b) => a.due < b.due ? -1 : 1)[0];
      root.innerHTML = `<button type="button" class="text-button back" data-nav="today">← Home</button><span class="eyebrow">SPACED REVIEW</span><h1>Review</h1><p class="lead">Questions you missed come back after 1, 3, 7, and 14 days until you answer them right.</p><section class="card"><h2>Nothing is due today.</h2><p class="muted">${upcoming ? `Next review on ${esc(upcoming.due)}.` : 'Miss a quiz question and it will wait here for tomorrow.'}</p></section>`;
      return;
    }
    reviewIndex = Math.max(0, Math.min(due.length - 1, reviewIndex));
    const item = due[reviewIndex];
    root.innerHTML = `<button type="button" class="text-button back" data-nav="today">← Home</button><span class="eyebrow">SPACED REVIEW · ${reviewIndex + 1} OF ${due.length}</span><h1>Review</h1><p class="lead">${esc(item.title)}</p><section class="card" id="review-card"><h2>${esc(item.prompt)}</h2><div class="review-choices">${item.choices.map((choice, index) => `<button type="button" class="review-choice" data-review-choice="${index}">${esc(choice)}</button>`).join('')}</div><div id="review-feedback"></div></section>`;
  }
  function answerReview(index){
    const due = reviewDue();
    const item = due[reviewIndex];
    if (!item) return;
    const box = document.getElementById('review-feedback');
    const right = index === item.correct;
    if (right) hit(item.key);
    else miss(item);
    document.querySelectorAll('.review-choice').forEach(button => { button.disabled = true; });
    if (!box) return;
    box.innerHTML = `<div class="mini-feedback ${right ? 'correct' : 'incorrect'}" role="status"><strong>${right ? 'That’s right. This one can rest.' : 'Not yet. It will return on a later day.'}</strong>${item.explanation ? `<p>${esc(item.explanation)}</p>` : ''}<button type="button" class="primary" data-review-next>Continue</button></div>`;
  }

  const PSALTER_KEY = 'msb_psalter';
  const KATHISMA = [
    [[1,3],[4,6],[7,8]],
    [[9,10],[11,13],[14,16]],
    [[17,17],[18,20],[21,23]],
    [[24,26],[27,29],[30,31]],
    [[32,33],[34,35],[36,36]],
    [[37,39],[40,42],[43,45]],
    [[46,48],[49,50],[51,54]],
    [[55,57],[58,60],[61,63]],
    [[64,66],[67,67],[68,69]],
    [[70,71],[72,73],[74,76]],
    [[77,77],[78,80],[81,84]],
    [[85,87],[88,88],[89,90]],
    [[91,93],[94,96],[97,100]],
    [[101,101],[102,102],[103,104]],
    [[105,105],[106,106],[107,108]],
    [[109,111],[112,114],[115,117]],
    'psalm118',
    [[119,123],[124,128],[129,133]],
    [[134,136],[137,139],[140,142]],
    [[143,144],[145,147],[148,150]]
  ];
  const PSALM118 = [[1,72],[73,131],[132,176]];
  function lxxParts(n){
    if (n >= 1 && n <= 8) return [{ chapter:n, lxx:n }];
    if (n === 9) return [{ chapter:9, lxx:9 }, { chapter:10, lxx:9 }];
    if (n >= 10 && n <= 112) return [{ chapter:n + 1, lxx:n }];
    if (n === 113) return [{ chapter:114, lxx:113 }, { chapter:115, lxx:113 }];
    if (n === 114) return [{ chapter:116, verse:1, lxx:114, note:'verses 1–9' }];
    if (n === 115) return [{ chapter:116, verse:10, lxx:115, note:'verses 10–19' }];
    if (n === 116) return [{ chapter:117, lxx:116 }];
    if (n >= 117 && n <= 145) return [{ chapter:n + 1, lxx:n }];
    if (n === 146) return [{ chapter:147, verse:1, lxx:146, note:'verses 1–11' }];
    if (n === 147) return [{ chapter:147, verse:12, lxx:147, note:'verses 12–20' }];
    return [{ chapter:n, lxx:n }];
  }
  function psalmLabel(part){
    const es = window.MsbI18n && MsbI18n.lang() === 'es';
    const note = part.note ? String(part.note).replace(/^verses /, es ? 'versículos ' : 'verses ') : '';
    const kjv = note ? `${es ? 'Salmo' : 'Psalm'} ${part.chapter} (${note})` : `${es ? 'Salmo' : 'Psalm'} ${part.chapter}`;
    return `${es ? 'Septuaginta' : 'Septuagint'} ${part.lxx} · ${kjv}`;
  }
  function suggestedKathisma(){
    const now = new Date();
    const start = new Date(now.getFullYear(), 0, 0);
    const day = Math.floor((now - start) / 86400000);
    return (day % 20) + 1;
  }
  function psalterDone(){
    const data = readJson(PSALTER_KEY, { done:{} });
    return data.done && typeof data.done === 'object' ? data.done : {};
  }
  function toggleKathisma(n){
    const done = psalterDone();
    const key = String(n);
    if (done[key]) delete done[key];
    else done[key] = dayKey();
    writeJson(PSALTER_KEY, { done });
  }
  let openKathisma = 0;
  function stasisMarkup(range){
    const psalms = [];
    for (let n = range[0]; n <= range[1]; n++) psalms.push(...lxxParts(n));
    return psalms.map(part => `<button type="button" class="plan-reading" data-lection-book="19" data-lection-chapter="${part.chapter}" ${part.verse ? `data-lection-verse="${part.verse}"` : ''}><span>${esc(psalmLabel(part))}</span><span>Open</span></button>`).join('');
  }
  function psalterScreen(){
    const done = psalterDone();
    const suggested = suggestedKathisma();
    const finished = Object.keys(done).length;
    const root = document.getElementById('screen');
    const blocks = KATHISMA.map((stases, index) => {
      const n = index + 1;
      const open = openKathisma === n;
      const body = stases === 'psalm118'
        ? PSALM118.map((range, i) => { const es = window.MsbI18n && MsbI18n.lang() === 'es'; return `<div class="stasis"><p class="eyebrow">STASIS ${i + 1}</p><button type="button" class="plan-reading" data-lection-book="19" data-lection-chapter="119" data-lection-verse="${range[0]}"><span>${es ? 'Septuaginta' : 'Septuagint'} 118:${range[0]}–${range[1]} · ${es ? 'Salmo' : 'Psalm'} 119:${range[0]}–${range[1]}</span><span>Open</span></button></div>`; }).join('')
        : stases.map((range, i) => `<div class="stasis"><p class="eyebrow">STASIS ${i + 1}</p>${stasisMarkup(range)}</div>`).join('');
      return `<article class="card kathisma ${n === suggested ? 'kathisma-today' : ''}" id="kathisma-${n}"><div class="kathisma-head"><h2>Kathisma ${n}</h2>${n === suggested ? '<span class="tag">Suggested today</span>' : ''}${done[n] ? '<span class="tag">Read</span>' : ''}</div><button type="button" class="secondary" data-kathisma-open="${n}" aria-expanded="${open}">${open ? 'Hide the stases' : 'Show the stases'}</button>${open ? `<div class="stasis-list">${body}</div>` : ''}<button type="button" class="secondary" data-kathisma-done="${n}">${done[n] ? 'Mark unread' : 'Mark this kathisma read'}</button></article>`;
    }).join('');
    const es = window.MsbI18n && MsbI18n.lang() === 'es';
    root.innerHTML = `<button type="button" class="text-button back" data-nav="today">← Home</button><span class="eyebrow">THE PSALTER</span><h1>Twenty kathismata</h1><p class="lead">Each kathisma opens in this Bible. Septuagint numbers are shown beside the KJV numbering. The psalm text itself is unchanged.</p><p class="plan-progress">${es ? `${finished} de 20 catismas leídos · la sugerencia de hoy es el catisma ${suggested}` : `${finished} of 20 kathismata read · today’s suggestion is kathisma ${suggested}`}</p>${blocks}`;
  }

  let searchQuery = '';
  let searchToken = 0;
  const marksFilter = { value:'all', query:'' };
  function setQuery(value){ searchQuery = String(value || '').trim().slice(0, 80); }
  function snippet(text, query){
    const raw = String(text || '').replace(/\s+/g, ' ').trim();
    const at = raw.toLowerCase().indexOf(query.toLowerCase());
    if (at < 0) return raw.slice(0, 140);
    const start = Math.max(0, at - 40);
    return `${start ? '…' : ''}${raw.slice(start, at + query.length + 70)}${at + query.length + 70 < raw.length ? '…' : ''}`;
  }
  async function loadBook(id){
    const file = `bible/${String(id).padStart(2, '0')}.json`;
    const url = new URL(file, location.href).href;
    let response = null;
    try { response = await fetch(file); } catch { response = null; }
    if (!response || !response.ok){
      try {
        const present = await caches.keys();
        for (const name of ['msb-bible-kjv-3', 'msb-bible-kjv-2', 'msb-bible-kjv-1']) {
          if (!present.includes(name)) continue;
          const cache = await caches.open(name);
          response = await cache.match(url) || await cache.match(file);
          if (response) break;
        }
      } catch { response = null; }
    }
    if (!response || !response.ok) return null;
    return response.json();
  }
  function corpus(){
    return window.msbCorpus ? window.msbCorpus() : { studies:[], challenges:[], games:[], notes:[], verseNotes:[], highlights:[] };
  }
  function lessonHits(query){
    const hits = [];
    const q = query.toLowerCase();
    for (const item of corpus().studies || []){
      const blob = [item.title, item.reference, item.passage, item.context, item.orthodox, item.practice, ...(item.questions || [])].join(' ');
      if (blob.toLowerCase().includes(q)) hits.push({ kind:'study', id:item.id, title:item.title, detail:item.reference, text:snippet(blob, query) });
    }
    for (const item of corpus().challenges || []){
      const blob = [item.title, item.summary, ...(item.lessons || []).map(lesson => `${lesson.heading || ''} ${lesson.body || ''}`), ...(item.questions || []).map(question => question.prompt)].join(' ');
      if (blob.toLowerCase().includes(q)) hits.push({ kind:'lesson', id:item.id, title:item.title, detail:item.micro ? 'Learn one idea' : 'Lesson', text:snippet(blob, query) });
    }
    for (const item of corpus().games || []){
      const blob = [item.title, item.summary, ...(item.prompts || [])].join(' ');
      if (blob.toLowerCase().includes(q)) hits.push({ kind:'game', id:item.id, title:item.title, detail:'Game', text:snippet(blob, query) });
    }
    return hits.slice(0, 40);
  }
  function noteHits(query){
    const q = query.toLowerCase();
    const hits = [];
    for (const note of corpus().notes || []){
      if (!note || !String(note.body || '').toLowerCase().includes(q)) continue;
      hits.push({ kind:'study-note', id:note.study_id, title:'Study note', text:snippet(note.body, query) });
    }
    for (const note of corpus().verseNotes || []){
      if (!note || !String(note.body || '').toLowerCase().includes(q)) continue;
      const book = bookById(note.book_id);
      hits.push({ kind:'verse-note', book:note.book_id, chapter:note.chapter, verse:note.verse, title:`${book ? book.name : 'Verse'} ${note.chapter}:${note.verse}`, text:snippet(note.body, query) });
    }
    return hits.slice(0, 40);
  }
  async function bibleHits(query, token, onProgress){
    const q = query.toLowerCase();
    const hits = [];
    let available = 0;
    let missing = 0;
    for (const book of BOOKS){
      if (token !== searchToken) return null;
      const data = await loadBook(book.id);
      if (!data || !Array.isArray(data.chapters)){ missing++; onProgress(available, missing); continue; }
      available++;
      data.chapters.forEach((verses, index) => {
        if (!Array.isArray(verses) || hits.length >= 40) return;
        const chapter = index + 1;
        verses.forEach((text, verseIndex) => {
          if (!text || hits.length >= 40) return;
          const shown = book.id >= 67 && window.msbPlainBible ? window.msbPlainBible(text) : text;
          if (String(shown).toLowerCase().includes(q)) {
            const verse = book.id === 78 && chapter === 10 ? verseIndex + 4 : verseIndex + 1;
            hits.push({ book:book.id, name:book.name, chapter, verse, text:snippet(shown, query) });
          }
        });
      });
      onProgress(available, missing);
      if (hits.length >= 40 && available + missing === BOOKS.length) break;
    }
    return { hits, available, missing };
  }
  function hitButton(hit){
    if (hit.kind === 'study' || hit.kind === 'study-note') return `<button type="button" class="search-hit" data-lesson="${esc(hit.id)}"><strong>${esc(hit.title)}</strong><span>${esc(hit.detail || 'Note')}</span><p>${esc(hit.text)}</p></button>`;
    if (hit.kind === 'lesson' || hit.kind === 'game') return `<button type="button" class="search-hit" data-activity="${esc(hit.id)}"><strong>${esc(hit.title)}</strong><span>${esc(hit.detail)}</span><p>${esc(hit.text)}</p></button>`;
    if (hit.book) return `<button type="button" class="search-hit" data-lection-book="${hit.book}" data-lection-chapter="${hit.chapter}" data-lection-verse="${hit.verse || 1}"><strong>${esc(hit.title || `${hit.name} ${hit.chapter}:${hit.verse}`)}</strong><p>${esc(hit.text)}</p></button>`;
    return '';
  }
  function searchScreen(){
    const root = document.getElementById('screen');
    const token = ++searchToken;
    const query = searchQuery;
    root.innerHTML = `<button type="button" class="text-button back" data-nav="today">← Home</button><span class="eyebrow">SEARCH</span><h1>Search</h1><form id="search-form" class="search-form" role="search"><label class="visually-hidden" for="msb-search">Search</label><input id="msb-search" type="search" maxlength="80" value="${esc(query)}" autocomplete="off"><button class="primary" type="submit">Search</button></form><div id="search-results"><p class="muted">${query.length < 2 ? 'Type at least two letters.' : 'Searching saved books, lessons, and notes…'}</p></div>`;
    if (query.length < 2) return;
    const lessons = lessonHits(query);
    const notes = noteHits(query);
    bibleHits(query, token, (available, missing) => {
      if (token !== searchToken) return;
      const box = document.getElementById('search-results');
      if (!box) return;
      box.querySelector('[data-search-progress]')?.remove();
      const note = document.createElement('p');
      note.className = 'muted';
      note.dataset.searchProgress = '1';
      note.textContent = `Bible books searched: ${available} on this device${missing ? `, ${missing} not downloaded` : ''}.`;
      box.prepend(note);
    }).then(result => {
      if (!result || token !== searchToken) return;
      const box = document.getElementById('search-results');
      if (!box) return;
      const bible = result.hits.map(hit => hitButton({ ...hit, title:`${hit.name} ${hit.chapter}:${hit.verse}` })).join('');
      box.innerHTML = `<p class="muted">${result.available} of ${BOOKS.length} books searched${result.missing ? `. ${result.missing} are not on this device yet — download the Bible to search them offline.` : ''}</p><h2>Bible</h2>${bible || '<p class="muted">No verse matches.</p>'}<h2>Lessons</h2>${lessons.map(hitButton).join('') || '<p class="muted">No lesson matches.</p>'}<h2>Your notes</h2>${notes.map(hitButton).join('') || '<p class="muted">No note matches.</p>'}`;
    }).catch(() => {
      const box = document.getElementById('search-results');
      if (box && token === searchToken) box.innerHTML = '<p class="muted">Search could not finish.</p>';
    });
  }
  function marksRows(){
    const data = corpus();
    const q = marksFilter.query.trim().toLowerCase();
    const rows = [];
    if (marksFilter.value === 'all' || marksFilter.value === 'highlights'){
      for (const item of data.highlights || []){
        const book = bookById(item.book_id);
        const label = `${book ? (window.msbBookLabel ? msbBookLabel(book.id, book.name) : book.name) : 'Verse'} ${item.chapter}:${item.verse}`;
        if (q && !label.toLowerCase().includes(q) && !String(item.color || '').includes(q)) continue;
        rows.push({ kind:'highlight', label, book:item.book_id, chapter:item.chapter, verse:item.verse, meta:item.color || 'highlight' });
      }
    }
    if (marksFilter.value === 'all' || marksFilter.value === 'notes'){
      for (const note of data.notes || []){
        const text = String(note.body || '').trim();
        if (!text) continue;
        const study = (data.studies || []).find(item => item.id === note.study_id);
        const label = study ? study.title : 'Study note';
        if (q && !`${label} ${text}`.toLowerCase().includes(q)) continue;
        rows.push({ kind:'note', label, text, id:note.study_id, meta:'Study note' });
      }
    }
    if (marksFilter.value === 'all' || marksFilter.value === 'verses'){
      for (const note of data.verseNotes || []){
        const text = String(note.body || '').trim();
        if (!text) continue;
        const book = bookById(note.book_id);
        const bookName = book ? (window.msbBookLabel ? msbBookLabel(book.id, book.name) : book.name) : '';
        const label = `${bookName || 'Verse'} ${note.chapter}:${note.verse}`;
        if (q && !`${label} ${text}`.toLowerCase().includes(q)) continue;
        rows.push({ kind:'verse', label, text, book:note.book_id, chapter:note.chapter, verse:note.verse, meta:'Verse note' });
      }
    }
    return rows;
  }
  function marksScreen(){
    const rows = marksRows();
    const filters = [['all','All'],['highlights','Highlights'],['notes','Study notes'],['verses','Verse notes']];
    const root = document.getElementById('screen');
    root.innerHTML = `<button type="button" class="text-button back" data-nav="today">← Home</button><span class="eyebrow">ON THIS DEVICE</span><h1>My marks</h1><p class="lead">Every highlight and note on this device. They are included when you export a backup from Profile.</p><div class="marks-tools"><label class="visually-hidden" for="marks-search">Filter marks</label><input id="marks-search" type="search" maxlength="80" value="${esc(marksFilter.query)}" placeholder="Filter marks"><button type="button" class="secondary" data-marks-export>Export marks</button></div><div class="filters" role="group" aria-label="Filter marks">${filters.map(([id, label]) => `<button type="button" class="filter ${marksFilter.value === id ? 'active' : ''}" data-marks-filter="${id}" aria-pressed="${marksFilter.value === id}">${label}</button>`).join('')}</div><div class="marks-list">${rows.length ? rows.map(row => {
      if (row.kind === 'note') return `<button type="button" class="search-hit" data-lesson="${esc(row.id)}"><span class="eyebrow">${esc(row.meta)}</span><strong>${esc(row.label)}</strong><p>${esc(row.text)}</p></button>`;
      return `<button type="button" class="search-hit" data-lection-book="${row.book}" data-lection-chapter="${row.chapter}" data-lection-verse="${row.verse || 1}"><span class="eyebrow">${esc(row.meta)}</span><strong>${esc(row.label)}</strong>${row.text ? `<p>${esc(row.text)}</p>` : ''}</button>`;
    }).join('') : '<p class="muted">Nothing in this filter yet.</p>'}</div>`;
  }
  function exportMarks(){
    const data = corpus();
    const file = { app:'mind-soul-body', kind:'marks', exportedAt:new Date().toISOString(), highlights:data.highlights || [], notes:data.notes || [], verseNotes:data.verseNotes || [] };
    const blob = new Blob([JSON.stringify(file, null, 2)], { type:'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    const day = dayKey();
    a.href = url; a.download = `mindsoulbody-marks-${day}.json`;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 3000);
    if (window.msbToast) window.msbToast('Marks exported. A full backup from Profile includes them too.');
  }

  document.addEventListener('click', event => {
    const start = event.target.closest('[data-plan-start]');
    if (start){ startPlan(start.dataset.planStart); if (window.msbNav) window.msbNav('plans'); return; }
    const done = event.target.closest('[data-plan-done]');
    if (done && !done.disabled){ togglePlanDay(Number(done.dataset.planDone)); if (window.msbNav) window.msbNav('plans'); return; }
    const day = event.target.closest('[data-plan-day]');
    if (day && !day.disabled){ viewDay = Number(day.dataset.planDay); if (window.msbNav) window.msbNav('plans'); return; }
    const open = event.target.closest('[data-kathisma-open]');
    if (open){ const n = Number(open.dataset.kathismaOpen); openKathisma = openKathisma === n ? 0 : n; if (window.msbNav) window.msbNav('psalter'); return; }
    const kathisma = event.target.closest('[data-kathisma-done]');
    if (kathisma){ toggleKathisma(Number(kathisma.dataset.kathismaDone)); if (window.msbNav) window.msbNav('psalter'); return; }
    const choice = event.target.closest('[data-review-choice]');
    if (choice){ answerReview(Number(choice.dataset.reviewChoice)); return; }
    if (event.target.closest('[data-review-next]')){ if (reviewIndex >= reviewDue().length) reviewIndex = 0; if (window.msbNav) window.msbNav('review'); return; }
    const filter = event.target.closest('[data-marks-filter]');
    if (filter){ marksFilter.value = filter.dataset.marksFilter; if (window.msbNav) window.msbNav('marks'); return; }
    if (event.target.closest('[data-marks-export]')){ exportMarks(); return; }
  });
  document.addEventListener('submit', event => {
    const form = event.target;
    if (form.id !== 'home-search-form' && form.id !== 'search-form') return;
    event.preventDefault();
    const input = form.querySelector('input');
    setQuery(input ? input.value : '');
    if (window.msbNav) window.msbNav('search');
  });
  document.addEventListener('input', event => {
    if (event.target.id !== 'marks-search') return;
    marksFilter.query = event.target.value || '';
    const list = document.querySelector('.marks-list');
    if (!list || !window.msbNav) return;
    window.msbNav('marks');
    const field = document.getElementById('marks-search');
    if (field){ field.focus(); const end = field.value.length; field.setSelectionRange(end, end); }
  });

  window.MsbPlans = { select: selectPlan };
  window.MsbSearch = { setQuery };
  window.MsbReview = { miss, hit, due: reviewDue };
  window.MsbTools = {
    home: plansHome,
    screens: { plans: plansScreen, search: searchScreen, marks: marksScreen, psalter: psalterScreen, review: reviewScreen }
  };
})();
