/* Today's Orthodox calendar for Home.
   Readings, fasting, tone, and saint NAMES come from the free orthocal.info API
   (https://orthocal.info/api/gregorian/YYYY/M/D/). The service sends
   Access-Control-Allow-Origin: * and its software is MIT licensed
   (https://github.com/brianglass/orthocal-python). Saint-life prose on that
   API is not copied here — only names and titles, with a link out.
   Passage text from the API is not shown; each reference opens this app's Bible. */
(() => {
  'use strict';
  const CACHE_KEY = 'msb_orthocal_day';
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
  function weekdayLabel(date){
    return (date || new Date()).toLocaleDateString(undefined, {weekday:'long', month:'long', day:'numeric'});
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
    const saints = Array.isArray(day.saints) ? day.saints.map(name => String(name || '').trim()).filter(Boolean) : [];
    const titles = Array.isArray(day.titles) ? day.titles.map(name => String(name || '').trim()).filter(Boolean) : [];
    return {
      summary: String(day.summary_title || titles[0] || 'This day in the Church'),
      titles,
      saints,
      tone: Number.isInteger(day.tone) ? day.tone : null,
      fast: String(day.fast_level_desc || '').trim(),
      fastNote: String(day.fast_exception_desc || '').trim(),
      rank: String(day.feast_level_description || '').trim(),
      readings,
      year: day.year,
      month: day.month,
      day: day.day
    };
  }
  function readCache(){
    try {
      const saved = JSON.parse(localStorage.getItem(CACHE_KEY));
      if (!saved || saved.date !== dateKey() || saved.calendar !== 'gregorian' || !saved.day) return null;
      return saved.day;
    } catch { return null; }
  }
  function writeCache(day){
    try { localStorage.setItem(CACHE_KEY, JSON.stringify({date:dateKey(), calendar:'gregorian', day})); } catch { /* private mode */ }
  }
  function playButton(){
    return `<button class="verse-play" data-daily-read aria-label="Open today’s verse in the Bible"><svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="m9 6 9 6-9 6z"/></svg></button>`;
  }
  function verseHtml(verse){
    const text = esc(verse && verse.text || '');
    const name = esc(verse && verse.name || '');
    return `<section class="daily-stack" id="orthodox-day"><span class="eyebrow">TODAY IN SCRIPTURE</span><h2>${text}</h2><span>${name}</span>${playButton()}</section>`;
  }
  function cardHtml(day){
    const tone = day.tone ? `Tone ${day.tone}` : 'No tone';
    const fast = [day.fast || 'Fasting not listed', day.fastNote].filter(Boolean).join(' · ');
    const titles = day.titles.filter(title => title !== day.summary);
    const saints = day.saints.length ? `<ul class="orthodox-saints">${day.saints.map(name => `<li>${esc(name)}</li>`).join('')}</ul>` : '<p class="orthodox-empty">No named saints listed for this day.</p>';
    const readings = day.readings.length ? `<div class="orthodox-readings">${day.readings.map(item => {
      const label = `${item.source}: ${item.display}`;
      if (!item.book || !item.chapter) return `<p class="orthodox-reading-plain"><span class="eyebrow">${esc(item.source)}</span> ${esc(item.display)}</p>`;
      return `<button type="button" class="secondary orthodox-reading" data-lection-book="${item.book}" data-lection-chapter="${item.chapter}" data-lection-verse="${item.verse || 1}" aria-label="Open ${esc(label)} in the Bible"><span><span class="eyebrow">${esc(item.source)}</span> ${esc(item.display)}</span><span aria-hidden="true">Open ↗</span></button>`;
    }).join('')}</div>` : '';
    const url = `https://orthocal.info/gregorian/${day.year}/${day.month}/${day.day}/`;
    return `<section class="daily-stack orthodox-day" id="orthodox-day" data-ready="1"><span class="eyebrow">TODAY IN THE CHURCH · ${esc(weekdayLabel())}</span><h2>${esc(day.summary)}</h2>${titles.length ? `<p class="orthodox-titles">${titles.map(esc).join(' · ')}</p>` : ''}<div class="orthodox-meta"><span>${esc(tone)}</span><span>${esc(fast)}</span>${day.rank ? `<span>${esc(day.rank)}</span>` : ''}</div><p class="orthodox-kicker">Saints of the day</p>${saints}<p class="orthodox-kicker">Epistle and Gospel</p>${readings}<p class="orthodox-note">Names and titles from <a href="${esc(url)}" target="_blank" rel="noopener noreferrer">Orthocal</a> (New Calendar). Full lives are on that page, not copied here. Each reading opens in this app’s Bible. Saved on this device for the rest of today.</p></section>`;
  }
  function slot(verse){
    const cached = readCache();
    if (cached) return cardHtml(cached);
    return verseHtml(verse);
  }
  let pending = 0;
  async function hydrate(){
    const host = document.getElementById('orthodox-day');
    if (!host || host.dataset.ready === '1') return;
    const generation = ++pending;
    const parts = dateParts();
    try {
      const response = await fetch(`https://orthocal.info/api/gregorian/${parts.y}/${parts.m}/${parts.day}/`);
      if (!response.ok) return;
      const data = await response.json();
      const day = slim(data);
      if (!day.summary && !day.readings.length) return;
      day.year = day.year || parts.y;
      day.month = day.month || parts.m;
      day.day = day.day || parts.day;
      writeCache(day);
      if (generation !== pending) return;
      const node = document.getElementById('orthodox-day');
      if (node && node.isConnected) node.outerHTML = cardHtml(day);
    } catch { /* leave the verse card in place */ }
  }
  window.MsbDay = { slot, hydrate, readCache };
})();
