/* Today's Scripture readings for Home.
   Reading references come from the free orthocal.info API
   (https://orthocal.info/api/gregorian/YYYY/M/D/). The service sends
   Access-Control-Allow-Origin: * and its software is MIT licensed
   (https://github.com/brianglass/orthocal-python). That response also
   includes commemorations; this card keeps only the reading references.
   Passage text from the API is not shown; each reference opens this app's Bible. */
(() => {
  'use strict';
  const CACHE_KEY = 'msb_orthocal_readings';
  const OLD_CACHE_KEY = 'msb_orthocal_day';
  const CODES = {
    GEN:1,EXO:2,LEV:3,NUM:4,DEU:5,JOS:6,JDG:7,RUT:8,
    '1SA':9,'2SA':10,'1KI':11,'2KI':12,'1CH':13,'2CH':14,
    EZR:15,NEH:16,EST:17,JOB:18,PSA:19,PRO:20,ECC:21,SNG:22,
    ISA:23,JER:24,LAM:25,EZK:26,DAN:27,HOS:28,JOL:29,AMO:30,
    OBA:31,JON:32,MIC:33,NAM:34,HAB:35,ZEP:36,HAG:37,ZEC:38,MAL:39,
    MAT:40,MRK:41,LUK:42,JHN:43,ACT:44,ROM:45,'1CO':46,'2CO':47,
    GAL:48,EPH:49,PHP:50,COL:51,'1TH':52,'2TH':53,'1TI':54,'2TI':55,
    TIT:56,PHM:57,HEB:58,JAS:59,'1PE':60,'2PE':61,'1JN':62,'2JN':63,'3JN':64,
    JUD:65,REV:66,TOB:67,JDT:68,WIS:69,SIR:70,BAR:71,LJE:72,S3Y:73,SUS:74,
    BEL:75,'1MA':76,'2MA':77,ESG:78
  };
  const NAMES = {
    'genesis':1,'exodus':2,'leviticus':3,'numbers':4,'deuteronomy':5,'joshua':6,'judges':7,'ruth':8,
    '1 samuel':9,'2 samuel':10,'1 kings':11,'2 kings':12,'1 chronicles':13,'2 chronicles':14,
    'ezra':15,'nehemiah':16,'esther':17,'job':18,'psalm':19,'psalms':19,'proverbs':20,'ecclesiastes':21,
    'song of songs':22,'song of solomon':22,'isaiah':23,'jeremiah':24,'lamentations':25,'ezekiel':26,
    'daniel':27,'hosea':28,'joel':29,'amos':30,'obadiah':31,'jonah':32,'micah':33,'nahum':34,
    'habakkuk':35,'zephaniah':36,'haggai':37,'zechariah':38,'malachi':39,'matthew':40,'mark':41,
    'luke':42,'john':43,'acts':44,'romans':45,'1 corinthians':46,'2 corinthians':47,'galatians':48,
    'ephesians':49,'philippians':50,'colossians':51,'1 thessalonians':52,'2 thessalonians':53,
    '1 timothy':54,'2 timothy':55,'titus':56,'philemon':57,'hebrews':58,'james':59,'1 peter':60,
    '2 peter':61,'1 john':62,'2 john':63,'3 john':64,'jude':65,'revelation':66,'tobit':67,'judith':68,
    'wisdom':69,'wisdom of solomon':69,'sirach':70,'ecclesiasticus':70,'baruch':71,
    'letter of jeremiah':72,'prayer of azariah':73,'susanna':74,'bel and the dragon':75,
    '1 maccabees':76,'2 maccabees':77
  };
  const esc = value => String(value ?? '').replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
  function dateParts(date){
    const d = date || new Date();
    return {y:d.getFullYear(), m:d.getMonth()+1, day:d.getDate()};
  }
  function dateKey(date){
    const p = dateParts(date);
    return `${p.y}-${String(p.m).padStart(2,'0')}-${String(p.day).padStart(2,'0')}`;
  }
  function esDay(){ return window.MsbI18n && MsbI18n.lang() === 'es'; }
  function sourceLabel(source){
    const text = String(source || '');
    if (!esDay()) return text;
    if (/^epistle$/i.test(text)) return 'Epístola';
    if (/^gospel$/i.test(text)) return 'Evangelio';
    return window.MsbI18n.t(text);
  }
  function weekdayLabel(date){
    return (date || new Date()).toLocaleDateString(esDay() ? 'es' : 'en', {weekday:'long', month:'long', day:'numeric'});
  }
  function bookFromCode(code){
    const key = String(code || '').toUpperCase();
    return CODES[key] || 0;
  }
  function bookFromDisplay(display){
    const match = String(display || '').match(/^(.*?)\s+(\d+)[.:](\d+)/);
    if (!match) return null;
    const name = match[1].trim().toLowerCase().replace(/\s+/g,' ');
    const id = NAMES[name];
    if (!id) return null;
    return {book:id, chapter:Number(match[2]), verse:Number(match[3])};
  }
  function readingTarget(reading){
    const first = Array.isArray(reading.passage) ? reading.passage[0] : null;
    const fromCode = first ? bookFromCode(first.book) : 0;
    if (fromCode && first.chapter) return {book:fromCode, chapter:Number(first.chapter), verse:Number(first.verse) || 1};
    return bookFromDisplay(reading.display || reading.short_display || '');
  }
  function slim(day){
    const indices = Array.isArray(day.abbreviated_reading_indices) ? day.abbreviated_reading_indices : [];
    const all = Array.isArray(day.readings) ? day.readings : [];
    let chosen = indices.map(index => all[index]).filter(Boolean);
    if (!chosen.length) chosen = all.filter(item => /epistle|gospel/i.test(item.source || ''));
    if (!chosen.length) chosen = all.slice(0, 2);
    const readings = chosen.map(item => {
      const target = readingTarget(item);
      return {
        source: String(item.source || 'Reading'),
        display: String(item.display || item.short_display || '').trim(),
        book: target ? target.book : 0,
        chapter: target ? target.chapter : 0,
        verse: target ? target.verse : 0
      };
    }).filter(item => item.display);
    return { readings };
  }
  function readCache(){
    try {
      const saved = JSON.parse(localStorage.getItem(CACHE_KEY));
      if (!saved || saved.date !== dateKey() || saved.calendar !== 'gregorian' || !saved.day) return null;
      return saved.day;
    } catch { return null; }
  }
  function writeCache(day){
    try {
      localStorage.removeItem(OLD_CACHE_KEY);
      localStorage.setItem(CACHE_KEY, JSON.stringify({date:dateKey(), calendar:'gregorian', day}));
    } catch { /* private mode */ }
  }
  function playButton(){
    return `<button class="verse-play" data-daily-read aria-label="Open today’s verse in the Bible"><svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="m9 6 9 6-9 6z"/></svg></button>`;
  }
  function verseHtml(verse){
    const text = esc(verse && verse.text || '');
    const name = esc(verse && verse.name || '');
    return `<section class="daily-stack" id="orthodox-day"><span class="eyebrow">TODAY IN SCRIPTURE</span><h2>${text}</h2><span>${name}</span>${playButton()}</section>`;
  }
  function localizedDisplay(item){
    const display = String(item.display || '');
    if (!esDay()) return display;
    const match = display.match(/^(.*?)\s+(\d+.*)$/);
    const name = match ? match[1].trim().toLowerCase().replace(/\s+/g, ' ') : '';
    const id = item.book || NAMES[name] || 0;
    const label = id && window.msbBookLabel ? msbBookLabel(id, '') : '';
    if (label && match && NAMES[name]) return `${label} ${match[2]}`;
    if (label && item.chapter) return `${label} ${item.chapter}${item.verse ? ':' + item.verse : ''}`;
    return display;
  }
  function cardHtml(day){
    const readings = (day.readings || []).map(item => {
      const shown = sourceLabel(item.source);
      const display = localizedDisplay(item);
      const label = `${shown}: ${display}`;
      if (!item.book || !item.chapter) return `<p class="orthodox-reading-plain"><span class="eyebrow">${esc(shown)}</span> ${esc(item.display)}</p>`;
      return `<button type="button" class="secondary orthodox-reading" data-lection-book="${item.book}" data-lection-chapter="${item.chapter}" data-lection-verse="${item.verse || 1}" aria-label="${esDay() ? 'Abrir' : 'Open'} ${esc(label)} ${esDay() ? 'en la Biblia' : 'in the Bible'}"><span><span class="eyebrow">${esc(shown)}</span> ${esc(display)}</span><span aria-hidden="true">${esDay() ? 'Abrir ↗' : 'Open ↗'}</span></button>`;
    }).join('');
    if (!readings) return '';
    const eyebrow = esDay() ? `LECTURAS DE HOY · ${esc(weekdayLabel())}` : `TODAY'S READINGS · ${esc(weekdayLabel())}`;
    return `<section class="daily-stack orthodox-day" id="orthodox-day" data-ready="1"><span class="eyebrow">${eyebrow}</span><h2>${esDay() ? 'Epístola y Evangelio' : 'Epistle and Gospel'}</h2><div class="orthodox-readings">${readings}</div><p class="orthodox-note">${esDay() ? 'Cada lectura se abre en esta Biblia.' : 'Each reading opens in this Bible.'}</p></section>`;
  }
  function slot(verse){
    const cached = readCache();
    if (cached && cached.readings && cached.readings.length) return cardHtml(cached);
    return verseHtml(verse);
  }
  let pending = 0;
  async function hydrate(){
    try { localStorage.removeItem(OLD_CACHE_KEY); } catch { /* private mode */ }
    const host = document.getElementById('orthodox-day');
    if (!host || host.dataset.ready === '1') return;
    const generation = ++pending;
    const parts = dateParts();
    try {
      const response = await fetch(`https://orthocal.info/api/gregorian/${parts.y}/${parts.m}/${parts.day}/`);
      if (!response.ok) return;
      const data = await response.json();
      const day = slim(data);
      if (!day.readings.length) return;
      writeCache(day);
      if (generation !== pending) return;
      const node = document.getElementById('orthodox-day');
      if (node && node.isConnected) {
        node.outerHTML = cardHtml(day);
        const fresh = document.getElementById('orthodox-day');
        if (fresh && window.MsbI18n) MsbI18n.apply(fresh);
      }
    } catch { /* leave the verse card in place */ }
  }
  window.MsbDay = { slot, hydrate, readCache };
})();
