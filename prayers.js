/* Prayer rope and a lay prayer rule.
   Texts are Isabel Florence Hapgood's translation in Service Book of the
   Holy Orthodox-Catholic Apostolic (Greco-Russian) Church (Boston and New York:
   Houghton, Mifflin and Company, 1906). That edition is in the public domain.
   Rubrics in this file say which office each prayer is taken from. */
(() => {
  'use strict';
  const ROPE_KEY = 'msb_prayer_rope';
  const RULE_KEY = 'msb_prayer_rule';
  const esc = value => String(value ?? '').replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
  const PRAYERS = [
    {
      id:'morning',
      title:'Morning Prayers',
      blurb:'The First Hour: worship, the prayer of the hours, and the morning light.',
      blocks:[
        ['rubric','From the First Hour. Begin with the Trisagion Prayers when they are part of your rule.'],
        ['text','O come, let us worship God our King. O come, let us worship and fall down before Christ, our King and our God. O come, let us worship and fall down before the Very Christ, our King and our God.'],
        ['text','What shall we call thee, O thou who art full of grace? Heaven, for from thee shone forth the Sun of Righteousness; Paradise, for thou hast budded forth the Flower of Immortality; Virgin, for thou hast remained undefiled; Pure Mother, for thou hast held in thy holy embrace thy Son, who is God of all. Beseech thou him that he will save our souls.'],
        ['text','Order my steps in thy word, and so shall no wickedness have dominion over me. O deliver me from the wrongful dealings of men, and so shall I keep thy commandments. Show the light of thy countenance upon thy servant, and teach me thy statutes.'],
        ['text','Let my mouth be filled with thy praise, O Lord, that I may sing of thy glory and honour all the day long.'],
        ['text','Thou who, at all times, and at every hour, both in heaven and on earth, art worshipped and glorified, O Christ our God, long-suffering and plenteous in mercy and compassion; who lovest the just and showest mercy to those who are hardened in sin; who callest all men to repentance through the promise of good things to come: Do thou, the same Lord, receive also our supplications at this present time, and direct our lives according to thy commandments. Sanctify our souls; purify our bodies; set aright our minds; and deliver us from all calamity, wrath and distress. Compass us round about with thy holy Angels; that, guided and guarded by their host, we may attain unto the unity of the faith, and unto the comprehension of thine ineffable glory. For blessed art thou unto ages of ages. Amen.'],
        ['text','More honourable than the Cherubim, and beyond compare more glorious than the Seraphim, thou who without defilement barest God the Word, true Birth-giver of God, we magnify thee.'],
        ['text','O Christ, the true Light, which illumineth and sanctifieth every man who cometh into the world! Let the light of thy countenance be showed upon us, that in it we may behold the light ineffable; and guide our footsteps aright, to the keeping of thy commandments; through the intercessions of thine all-pure Mother, and of all the Saints. Amen.'],
        ['rubric','Prayer of St. Ephraim the Syrian, said with a reverence at the end of each sentence.'],
        ['text','O Lord and Master of my life, grant not unto me a spirit of slothfulness, of discouragement, of lust of power, of vain babbling.'],
        ['text','But vouchsafe unto thy servant the spirit of continence, of meekness, of patience, and of love.'],
        ['text','Yea, O Lord and King, grant that I may perceive my own transgressions, and judge not my brother. For blessed art thou unto ages of ages. Amen.'],
        ['rubric','Then twelve times: O God, cleanse thou me, a sinner. Then the whole prayer is said once more.']
      ]
    },
    {
      id:'evening',
      title:'Evening Prayers',
      blurb:'From Grand Compline: the day is past, the Creed, and the evening hymns.',
      blocks:[
        ['rubric','From the Office of Grand Compline. Begin with the Trisagion Prayers when they are part of your rule.'],
        ['text','The day is past; I thank thee, O Lord: Grant me, I entreat thee, that this evening and this night I fall into no sin; and save me, O my Saviour.'],
        ['text','The day is past; I sing praises unto thee, O Master. Grant, I entreat thee, that this evening and this night I may be without guile; and save me, O Saviour.'],
        ['text','The day is past: I hymn thee, Holy One. Grant, I entreat thee, that this evening and this night I may be assailed by no temptation; and save me, O Saviour.'],
        ['text','With songs unceasing the Bodiless Powers of the Cherubim glorify thee; the six-winged beings, the Seraphim, with voices perpetual, extol thee exceedingly. With thrice-holy songs, all the Host of the Angels laud thee. For thou art the Father before all worlds, and hast with thee thy Son, who also is from everlasting; and hast also the Spirit of Life, coequal in honour, and showest forth the Trinity Undivided. O most holy Virgin, Mother of God, and ye eye-witnesses and servants of the Word, with all the company of the Prophets and the Martyrs, who have attained unto life immortal: Pray ye zealously for us all, for all we are in dire distress; that, being delivered from the wiles of the Evil One, we may loudly sing the Angelic Song: Holy, Holy, Holy Thrice-Holy Lord, have mercy upon us, and save us. Amen.'],
        ['text','I believe in one God the Father Almighty, Maker of heaven and earth, and of all things visible and invisible: And in one Lord Jesus Christ, the only-begotten Son of God, begotten of his Father before all worlds; Light of Light, Very God of very God, begotten, not made, being of one Essence with the Father; by whom all things were made; who, for us men, and for our salvation, came down from heaven, and was incarnate by the Holy Ghost of the Virgin Mary, and was made man. And was crucified also for us under Pontius Pilate; and suffered and was buried. And the third day he rose again, according to the Scriptures. And ascended into heaven, and sitteth on the right hand of the Father. And he shall come again with glory to judge both the quick and the dead; whose kingdom shall have no end. And in the Holy Ghost, the Lord and Giver of Life, who proceedeth from the Father, who with the Father and the Son together is worshipped and glorified, who spake by the Prophets. In one Holy Catholic and Apostolic Church. I acknowledge one Baptism for the remission of sins. I look for the Resurrection of the dead, and the Life of the world to come. Amen.'],
        ['text','O all-holy Sovereign Lady, Birth-giver of God, pray for us sinners.'],
        ['text','O all ye heavenly Host of Angels and Archangels, pray for us sinners.'],
        ['text','O holy John, Prophet, and Forerunner, and Baptist of our Lord Jesus Christ, pray for us sinners.'],
        ['text','O holy, glorious Apostles, Prophets and Martyrs, and all Saints, pray for us sinners.'],
        ['text','O God, cleanse us sinners, and have mercy upon us.'],
        ['text','Lighten mine eyes, O Christ my God, that I sleep not unto death; lest mine enemy say: I have prevailed against him.'],
        ['text','Be thou the defender of my soul, O God, for I walk amid a multitude of snares. Deliver me from them and save me, O Good One: for thou lovest mankind.'],
        ['text','And since, through our manifold iniquities, we have no boldness, do thou, O Virgin Birth-giver of God, make fervent entreaty unto him who was born of thee: for the prayer of a mother availeth much unto the benignity of the Master. Despise not the petitions of sinners, O All-Pure One; for gracious and mighty to save is he who deigned to suffer for us.'],
        ['text','Thou knowest, O Lord my Creator, the sleepless vigilance of mine invisible enemies, and the frailty of my miserable flesh. Into thy hands, therefore, will I commit my spirit. Cover me with the wings of thy goodness, that I sleep not unto death; and enlighten the eyes of my spiritual understanding, that I may delight in thy divine words: and make me, in a time acceptable unto thee, to glorify thee in praise, as the only Good One, who loveth mankind.']
      ]
    },
    {
      id:'trisagion',
      title:'Trisagion Prayers',
      blurb:'The usual beginning of the Church’s prayers.',
      blocks:[
        ['rubric','The usual beginning, as printed throughout the Service Book. From Pascha until Pentecost, “O heavenly King” is left unsaid.'],
        ['text','Glory to thee, our God; glory to thee.'],
        ['text','O heavenly King, the Comforter, Spirit of Truth, who art in all places and fillest all things; Treasury of good things and Giver of life: Come and take up thine abode in us, and cleanse us from every stain; and save our souls, O Good One.'],
        ['rubric','Thrice, each time with the sign of the cross and a reverence.'],
        ['text','O Holy God, Holy Mighty, Holy Immortal One, have mercy upon us.'],
        ['text','Glory to the Father, and to the Son, and to the Holy Spirit, now, and ever, and unto ages of ages. Amen.'],
        ['text','O all-holy Trinity, have mercy upon us. O Lord, wash away our sins. O Master, pardon our transgressions. O Holy One, visit and heal our infirmities, for thy Name’s sake.'],
        ['rubric','Lord, have mercy. Thrice.'],
        ['text','Glory to the Father, and to the Son, and to the Holy Spirit, now, and ever, and unto ages of ages. Amen.'],
        ['text','Our Father, who art in heaven, Hallowed be thy Name. Thy kingdom come. Thy will be done on earth, as it is in heaven. Give us this day our daily bread. And forgive us our trespasses, as we forgive those who trespass against us. And lead us not into temptation; but deliver us from the Evil One.'],
        ['text','For thine is the kingdom, and the power, and the glory, of the Father, and of the Son, and of the Holy Spirit, now, and ever, and unto ages of ages. Amen.']
      ]
    },
    {
      id:'meals',
      title:'Prayers before and after meals',
      blurb:'The Vigil’s blessing of bread, and the thanksgiving that follows it.',
      blocks:[
        ['rubric','Before the meal. The blessing of the loaves at the All-Night Vigil, prayed over the food.'],
        ['text','O Lord Jesus Christ our God, who didst bless the five loaves and didst therewith feed the five thousand: Do thou, the same Lord, bless these loaves, wheat, wine and oil; and multiply them in this holy habitation, and in all thy world; and sanctify all the faithful who shall partake of them. For it is thou, O Christ our God, who dost bless and sanctify and nourish all things; and unto thee we ascribe glory, with thy Father which hath no beginning, and thine all-holy, good, and life-creating Spirit, now, and ever, and unto ages of ages. Amen.'],
        ['rubric','After the meal. From the close of that same blessing.'],
        ['text','Blessed be the Name of the Lord, henceforth and forever.'],
        ['text','O taste, and see, how gracious the Lord is: blessed is the man that trusteth in him. O fear the Lord, ye that are his saints; for they that fear him lack nothing.'],
        ['text','Glory to thee, O Christ our God, our sure hope; glory to thee.'],
        ['text','Through the prayers of our holy Fathers, O Lord Jesus Christ our God, have mercy upon us. Amen.']
      ]
    },
    {
      id:'communion',
      title:'Prayers before Holy Communion',
      blurb:'The prayers said immediately before receiving the Holy Mysteries.',
      blocks:[
        ['rubric','From “Prayers in preparation for the Holy Communion,” and from the Communion in the Liturgy. These are said after confession and the Church’s fast, as your priest directs.'],
        ['text','I believe, O Lord, and I confess, that thou art in very truth the Christ, the Son of the living God, who didst come into the world to save sinners, of whom I am chief. And I believe that this is, of a truth, thine all-pure Body, and that this is thine own precious Blood. Wherefore, I beseech thee, have mercy upon me, and forgive my transgressions, whether voluntary or involuntary; whether of word or of deed; whether committed with knowledge or in ignorance. And vouchsafe that I may partake without condemnation of thine all-pure Mysteries, unto the remission of my sins, and unto life eternal. Amen.'],
        ['text','Of thy Mystical Supper, O Son of God, accept me to-day as a communicant: for I will not speak of thy Mystery to thine enemies, neither, like Judas, will I give thee a kiss; but like the thief will I confess thee: Remember me, O Lord, in thy kingdom.'],
        ['text','And let not this participation in thy Holy Mysteries be unto judgment upon me, or unto condemnation, O Lord, but unto the healing of soul and body.'],
        ['rubric','A prayer of St. John of Damascus.'],
        ['text','I stand before the doors of thy temple, yet refrain not from wicked thoughts. But O Christ-God, who didst justify the publican, and didst show mercy upon the woman of Cana, and didst open the doors of Paradise to the thief, — open thou unto me also thy loving-kindness, and accept thou me, who am come and who touch thee, as thou didst accept also the woman who was a sinner, and the woman who had an issue of blood. One of them, through touching the hem of thy garment, received perfect healing; and the other, clasping thine all-pure feet, carried away the forgiveness of her sins. And let me not be consumed, all-accursed though I be, through daring to receive thy Body. But accept thou me, as thou didst accept them, and illumine my spiritual senses, consuming my sinful offences: through the prayers of Her who bore thee without seed, and of the heavenly Powers. For blessed art thou, unto ages of ages. Amen.']
      ]
    }
  ];
  const DEFAULT_RULE = PRAYERS.map(item => item.id);
  let openId = '';
  let wakeSentinel = null;
  let practiceOpen = false;

  function todayKey(){
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
  }
  function readJson(key){
    try { return JSON.parse(localStorage.getItem(key)); } catch { return null; }
  }
  function writeJson(key, value){
    try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* private mode */ }
  }
  function ropeTotal(rope){
    if (rope.preset === 'custom') {
      const n = Math.round(Number(rope.custom));
      if (n >= 1 && n <= 500) return n;
    }
    if (rope.preset === 50 || rope.preset === 100 || rope.preset === 33) return rope.preset;
    return 33;
  }
  function loadRope(){
    const saved = readJson(ROPE_KEY) || {};
    const rope = {
      preset: saved.preset === 'custom' || saved.preset === 50 || saved.preset === 100 ? saved.preset : 33,
      custom: Math.round(Number(saved.custom)) || 33,
      count: Math.max(0, Math.round(Number(saved.count)) || 0),
      ropes: Math.max(0, Math.round(Number(saved.ropes)) || 0),
      today: Math.max(0, Math.round(Number(saved.today)) || 0),
      complete: !!saved.complete,
      day: typeof saved.day === 'string' ? saved.day : ''
    };
    if (rope.day !== todayKey()) {
      rope.count = 0;
      rope.ropes = 0;
      rope.today = 0;
      rope.complete = false;
      rope.day = todayKey();
      writeJson(ROPE_KEY, rope);
    }
    if (rope.count > ropeTotal(rope)) rope.count = 0;
    return rope;
  }
  function loadRule(){
    const saved = readJson(RULE_KEY) || {};
    const included = Array.isArray(saved.included) ? saved.included.filter(id => DEFAULT_RULE.includes(id)) : DEFAULT_RULE.slice();
    const rule = {
      included: included.length ? included : [],
      day: typeof saved.day === 'string' ? saved.day : '',
      done: saved.done && typeof saved.done === 'object' ? saved.done : {}
    };
    if (!Array.isArray(saved.included)) rule.included = DEFAULT_RULE.slice();
    if (rule.day !== todayKey()) {
      rule.done = {};
      rule.day = todayKey();
      writeJson(RULE_KEY, rule);
    }
    return rule;
  }
  function knotLabel(rope){
    const total = ropeTotal(rope);
    if (rope.complete) return `${total} of ${total}. Rope complete.`;
    return `${rope.count} of ${total}.`;
  }
  function ropeHtml(){
    const rope = loadRope();
    const total = ropeTotal(rope);
    const sizes = [33, 50, 100];
    const wake = typeof navigator !== 'undefined' && navigator.wakeLock ? '<p class="rope-wake">The screen stays awake while this page is open.</p>' : '';
    return `<section class="card prayer-rope" id="prayer-rope"><span class="eyebrow">THE JESUS PRAYER</span><h2>Prayer rope</h2><p class="muted">Choose the knots, then tap once for each. A short pulse marks a knot. A stronger pulse marks a finished rope. Today’s count stays on this device.</p><div class="rope-sizes" role="group" aria-label="Knots on the rope">${sizes.map(size => `<button type="button" class="rope-size ${rope.preset===size?'active':''}" data-rope-size="${size}" aria-pressed="${rope.preset===size}">${size}</button>`).join('')}<button type="button" class="rope-size ${rope.preset==='custom'?'active':''}" data-rope-size="custom" aria-pressed="${rope.preset==='custom'}">Custom</button></div>${rope.preset==='custom'?`<label class="rope-custom">Custom knots<input id="rope-custom" type="number" min="1" max="500" inputmode="numeric" value="${esc(rope.custom)}" aria-label="Custom knot count"></label>`:''}<button type="button" class="rope-tap ${rope.complete?'rope-complete':''}" data-rope-tap aria-label="Advance one knot. ${esc(knotLabel(rope))} Lord Jesus Christ, Son of God, have mercy on me, a sinner."><span class="rope-prayer">Lord Jesus Christ, Son of God, have mercy on me, a sinner.</span><strong class="rope-count">${rope.complete?total:rope.count}<small> / ${total}</small></strong><span class="rope-hint">${rope.complete?'Rope complete. Tap to begin the next.':'Tap for the next knot'}</span></button><div class="rope-stats"><div><strong>${rope.ropes}</strong><small>${rope.ropes===1?'rope':'ropes'} completed</small></div><div><strong>${rope.today}</strong><small>knots today</small></div></div><p id="rope-live" class="visually-hidden" aria-live="polite"></p>${wake}</section>`;
  }
  function prayerBody(item){
    return item.blocks.map(([kind, text]) => kind==='rubric' ? `<p class="prayer-rubric">${esc(text)}</p>` : `<p>${esc(text)}</p>`).join('');
  }
  function ruleHtml(){
    const rule = loadRule();
    const inRule = PRAYERS.filter(item => rule.included.includes(item.id));
    const doneCount = inRule.filter(item => rule.done[item.id]).length;
    const rows = PRAYERS.map(item => {
      const included = rule.included.includes(item.id);
      const done = !!rule.done[item.id];
      const open = openId === item.id;
      return `<article class="rule-row ${included?'':'rule-off'}"><div class="rule-top"><label class="rule-include"><input type="checkbox" data-prayer-rule="${item.id}" ${included?'checked':''}><span>In my rule</span></label><label class="rule-done"><input type="checkbox" data-prayer-done="${item.id}" ${done?'checked':''} ${included?'':'disabled'}><span>Prayed today</span></label></div><h3>${esc(item.title)}</h3><p class="muted">${esc(item.blurb)}</p><button type="button" class="secondary" data-prayer-open="${item.id}" aria-expanded="${open}">${open?'Close the text':`Read ${esc(item.title)}`}</button>${open?`<div class="prayer-text" id="prayer-text-${item.id}">${prayerBody(item)}</div>`:''}</article>`;
    }).join('');
    return `<section class="card prayer-rule" id="prayer-rule"><span class="eyebrow">A DAILY RULE</span><h2>Prayer rule</h2><p class="muted">Choose which prayers belong in your rule. Check off the ones you pray today. The list clears after midnight on this device.</p><p class="rule-progress">${inRule.length?`${doneCount} of ${inRule.length} prayed today`:'Add at least one prayer to your rule.'}</p><div class="rule-list">${rows}</div><p class="prayer-source">Texts from Isabel Florence Hapgood, <cite>Service Book of the Holy Orthodox-Catholic Apostolic Church</cite> (Houghton, Mifflin and Company, 1906). That translation is in the public domain. Modern service-book translations are not used here.</p></section>`;
  }
  function html(){ return ropeHtml() + ruleHtml(); }
  function paint(){
    const rope = document.getElementById('prayer-rope');
    const rule = document.getElementById('prayer-rule');
    if (rope) rope.outerHTML = ropeHtml();
    if (rule) rule.outerHTML = ruleHtml();
  }
  function announce(message){
    const live = document.getElementById('rope-live');
    if (live) live.textContent = message;
  }
  function advance(){
    const rope = loadRope();
    const total = ropeTotal(rope);
    if (rope.complete) {
      rope.complete = false;
      rope.count = 1;
      rope.today += 1;
      if (window.haptic) window.haptic();
    } else {
      rope.count += 1;
      rope.today += 1;
      if (rope.count >= total) {
        rope.count = total;
        rope.complete = true;
        rope.ropes += 1;
        if (window.hapticStrong) window.hapticStrong();
        else if (window.haptic) window.haptic();
      } else if (window.haptic) window.haptic();
    }
    rope.day = todayKey();
    writeJson(ROPE_KEY, rope);
    paint();
    if (rope.complete) announce(`Rope complete. ${rope.ropes} ${rope.ropes===1?'rope':'ropes'} today. ${rope.today} knots today.`);
    else announce(`Knot ${rope.count} of ${total}. ${rope.today} knots today.`);
  }
  function setPreset(preset){
    const rope = loadRope();
    rope.preset = preset === 'custom' ? 'custom' : Number(preset);
    rope.count = 0;
    rope.complete = false;
    rope.day = todayKey();
    writeJson(ROPE_KEY, rope);
    paint();
    if (preset === 'custom') document.getElementById('rope-custom')?.focus();
  }
  function setCustom(value){
    const rope = loadRope();
    const n = Math.round(Number(value));
    if (!(n >= 1 && n <= 500)) return;
    rope.preset = 'custom';
    rope.custom = n;
    rope.count = 0;
    rope.complete = false;
    rope.day = todayKey();
    writeJson(ROPE_KEY, rope);
    paint();
  }
  async function acquireWake(){
    if (!practiceOpen || !navigator.wakeLock) return;
    try {
      wakeSentinel = await navigator.wakeLock.request('screen');
    } catch { wakeSentinel = null; }
  }
  async function releaseWake(){
    const sentinel = wakeSentinel;
    wakeSentinel = null;
    if (!sentinel) return;
    try { await sentinel.release(); } catch { /* already released */ }
  }
  function onShow(){ practiceOpen = true; acquireWake(); }
  function onHide(){ practiceOpen = false; releaseWake(); }
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') acquireWake();
  });
  document.addEventListener('click', event => {
    const size = event.target.closest('[data-rope-size]');
    if (size && size.closest('#prayer-rope')) { setPreset(size.dataset.ropeSize); return; }
    const tap = event.target.closest('[data-rope-tap]');
    if (tap) { advance(); return; }
    const open = event.target.closest('[data-prayer-open]');
    if (open && open.closest('#prayer-rule')) {
      openId = openId === open.dataset.prayerOpen ? '' : open.dataset.prayerOpen;
      paint();
      if (openId) document.getElementById(`prayer-text-${openId}`)?.scrollIntoView({block:'nearest'});
    }
  });
  document.addEventListener('change', event => {
    const target = event.target;
    if (!(target instanceof HTMLInputElement)) return;
    if (target.id === 'rope-custom') { setCustom(target.value); return; }
    if (target.dataset.prayerRule) {
      const rule = loadRule();
      const id = target.dataset.prayerRule;
      rule.included = target.checked ? Array.from(new Set([...rule.included, id])) : rule.included.filter(item => item !== id);
      if (!target.checked) delete rule.done[id];
      rule.day = todayKey();
      writeJson(RULE_KEY, rule);
      paint();
      return;
    }
    if (target.dataset.prayerDone) {
      const rule = loadRule();
      const id = target.dataset.prayerDone;
      if (!rule.included.includes(id)) return;
      if (target.checked) rule.done[id] = true;
      else delete rule.done[id];
      rule.day = todayKey();
      writeJson(RULE_KEY, rule);
      paint();
    }
  });
  window.MsbPrayers = { html, onShow, onHide };
})();
