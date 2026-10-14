/* Map Journey: follow the Exodus route or Paul's voyage on an illustrated
   parchment map. A camera follows the caravan or the ship from stop to stop,
   clouds drift above it (parallax), each stop has a little story with its
   own weather, and a right answer stamps that stop in your passport.
   Original art; reduced motion turns off the camera moves and the weather. */
(() => {
  'use strict';
  const K = window.MsbKidGames; if (!K) return;
  const { t, esc, lang, name, sound, buzz, prog, award, render, verseHtml, gameHead, reduced, celebrate, coach, levelCard, starPings, floatText } = K._helpers;
  const D = () => window.MsbKidGamesData, C = () => window.MsbKidGamesCore;
  const maps = () => D().MAPS;
  const ZOOM = 1.55, STAMP_KEY = 'msb_kg_map_stamps';

  /* the story at every stop: weather, a passport stamp and a short event */
  const STORY = {
    exodus: [
      { w: 'wind', stamp: '🌊', en: 'A strong east wind blew all night. The sea split, and God’s people walked through on dry ground!', es: '¡Un fuerte viento del este sopló toda la noche. El mar se abrió y el pueblo de Dios pasó en seco!' },
      { w: 'heat', stamp: '🪵', en: 'The water was bitter. God showed Moses a piece of wood; he threw it in, and the water turned sweet.', es: 'El agua era amarga. Dios le mostró a Moisés un árbol; lo echó al agua y el agua se volvió dulce.' },
      { w: 'clear', stamp: '🌴', en: 'Twelve springs and seventy palm trees! The tired travelers rested in the cool shade.', es: '¡Doce fuentes y setenta palmeras! Los viajeros cansados descansaron en la sombra.' },
      { w: 'dawn', stamp: '🍞', en: 'In the morning, manna covered the ground like frost: bread from heaven for everyone!', es: 'Por la mañana el maná cubría el suelo como escarcha: ¡pan del cielo para todos!' },
      { w: 'heat', stamp: '🪨', en: 'No water again. Moses struck the rock as God said, and water gushed out for all the people.', es: 'Otra vez no había agua. Moisés golpeó la roca como Dios dijo, y salió agua para todo el pueblo.' },
      { w: 'storm', stamp: '⛰️', en: 'Thunder, a thick cloud and a loud trumpet: God gave His good law on the mountain.', es: 'Truenos, una nube espesa y una trompeta fuerte: Dios dio su buena ley en el monte.' },
    ],
    paul: [
      { w: 'clear', stamp: '⚓', en: 'Paul boarded a ship for Rome, guarded by a kind centurion named Julius.', es: 'Pablo subió a un barco rumbo a Roma, cuidado por un centurión amable llamado Julio.' },
      { w: 'wind', stamp: '🤝', en: 'Julius let Paul visit his friends in Sidon, and they cared for him.', es: 'Julio dejó que Pablo visitara a sus amigos en Sidón, y ellos lo cuidaron.' },
      { w: 'wind', stamp: '🧭', en: 'The winds were against them. Paul warned the sailors that the trip would be dangerous.', es: 'Los vientos eran contrarios. Pablo avisó a los marineros que el viaje sería peligroso.' },
      { w: 'storm', stamp: '⛈️', en: 'A wild storm for many days! But an angel told Paul: no one on the ship will be lost.', es: '¡Una gran tormenta por muchos días! Pero un ángel le dijo a Pablo: nadie del barco se perderá.' },
      { w: 'rain', stamp: '🔥', en: 'Shipwrecked, but everyone was safe! The islanders lit a fire, and a snake could not hurt Paul.', es: '¡Naufragaron, pero todos se salvaron! Los isleños encendieron un fuego, y una víbora no pudo dañar a Pablo.' },
      { w: 'clear', stamp: '🏛️', en: 'At last, Rome! Paul told everyone who came to him about Jesus, boldly.', es: '¡Por fin, Roma! Pablo habló de Jesús con valor a todos los que venían a verlo.' },
    ],
    abraham: [
      { w: 'clear', stamp: '📣', en: 'God spoke to Abram in Ur: leave your home and go to the land I will show you. Abram trusted God!', es: 'Dios le habló a Abram en Ur: sal de tu tierra y ve a la tierra que te mostraré. ¡Abram confió en Dios!' },
      { w: 'wind', stamp: '🐪', en: 'Abram packed up his tents and camels. His nephew Lot came along on the long trip.', es: 'Abram recogió sus tiendas y camellos. Su sobrino Lot fue con él en el largo viaje.' },
      { w: 'heat', stamp: '🌳', en: 'At Shechem, God appeared to Abram and promised: I will give this land to your family.', es: 'En Siquem, Dios se le apareció a Abram y le prometió: daré esta tierra a tu familia.' },
      { w: 'dawn', stamp: '🪨', en: 'Near Bethel, Abram pitched his tent, built an altar and prayed to the LORD.', es: 'Cerca de Bethel, Abram puso su tienda, edificó un altar y oró a Jehová.' },
      { w: 'clear', stamp: '⛺', en: 'Abram moved his tent to the big oak trees of Mamre in Hebron, and worshipped God there.', es: 'Abram llevó su tienda a los grandes árboles de Mamre en Hebrón, y adoró a Dios allí.' },
      { w: 'dawn', stamp: '✨', en: 'One night God said: look up and count the stars! Your family will be that many.', es: 'Una noche Dios dijo: ¡mira al cielo y cuenta las estrellas! Así de grande será tu familia.' },
    ],
    jonah: [
      { w: 'clear', stamp: '🎟️', en: 'God told Jonah to go to Nineveh, but Jonah ran the other way and got on a ship at Joppa.', es: 'Dios le dijo a Jonás que fuera a Nínive, pero Jonás huyó y se subió a un barco en Jope.' },
      { w: 'storm', stamp: '⛈️', en: 'God sent a huge storm! The sailors were scared, and Jonah said: throw me into the sea.', es: '¡Dios mandó una gran tormenta! Los marineros tenían miedo, y Jonás dijo: échenme al mar.' },
      { w: 'rain', stamp: '🐋', en: 'God sent a great fish to swallow Jonah. Inside the fish, Jonah prayed to God.', es: 'Dios mandó un gran pez que se tragó a Jonás. Dentro del pez, Jonás oró a Dios.' },
      { w: 'dawn', stamp: '🏖️', en: 'God spoke to the fish, and it put Jonah out on the beach. A second chance!', es: 'Dios le habló al pez, y este dejó a Jonás en la playa. ¡Una segunda oportunidad!' },
      { w: 'heat', stamp: '🏙️', en: 'This time Jonah obeyed and went to Nineveh. The people were sorry, and God forgave them.', es: 'Esta vez Jonás obedeció y fue a Nínive. La gente se arrepintió, y Dios los perdonó.' },
      { w: 'heat', stamp: '🌿', en: 'God grew a plant to give Jonah shade, and taught him how much He loves every person.', es: 'Dios hizo crecer una planta para dar sombra a Jonás, y le enseñó cuánto ama a cada persona.' },
    ],
    ruth: [
      { w: 'wind', stamp: '🤝', en: 'Naomi was going home. Ruth hugged her and said: where you go, I will go. Your God is my God.', es: 'Noemí volvía a casa. Rut la abrazó y dijo: donde tú vayas, iré yo. Tu Dios es mi Dios.' },
      { w: 'heat', stamp: '👣', en: 'Ruth and Naomi walked the long, dusty road together, all the way to Bethlehem.', es: 'Rut y Noemí caminaron juntas el largo camino polvoriento, hasta llegar a Belén.' },
      { w: 'dawn', stamp: '🏘️', en: 'The whole town came out to see them! It was the start of the barley harvest.', es: '¡Todo el pueblo salió a verlas! Era el principio de la siega de la cebada.' },
      { w: 'clear', stamp: '🌾', en: 'Ruth gathered grain in a field. It belonged to Boaz, a kind man from Naomi’s family.', es: 'Rut recogió espigas en un campo. Era de Booz, un hombre bueno de la familia de Noemí.' },
      { w: 'clear', stamp: '🕊️', en: 'Boaz blessed Ruth: you came to trust God, like a little bird under His wings.', es: 'Booz bendijo a Rut: viniste a confiar en Dios, como un pajarito bajo sus alas.' },
      { w: 'dawn', stamp: '👶', en: 'Boaz married Ruth, and baby Obed was born. He became the grandpa of King David!', es: 'Booz se casó con Rut, y nació el bebé Obed. ¡Fue el abuelo del rey David!' },
    ],
    magi: [
      { w: 'dawn', stamp: '🌟', en: 'Far in the east, wise men saw a brand-new star. A King is born! they said.', es: 'Muy lejos en el oriente, unos magos vieron una estrella nueva. ¡Ha nacido un Rey!, dijeron.' },
      { w: 'wind', stamp: '🐫', en: 'They packed treasures on their camels and rode across the desert for many days.', es: 'Cargaron tesoros en sus camellos y cruzaron el desierto por muchos días.' },
      { w: 'clear', stamp: '🏰', en: 'In Jerusalem they asked about the King. Then the star went ahead of them again!', es: 'En Jerusalén preguntaron por el Rey. ¡Luego la estrella volvió a ir delante de ellos!' },
      { w: 'dawn', stamp: '😊', en: 'When they saw the star stop, they were so happy they could hardly stand still!', es: '¡Cuando vieron que la estrella se detuvo, se pusieron muy, muy felices!' },
      { w: 'clear', stamp: '🎁', en: 'They found little Jesus with Mary, bowed down and gave Him gold, frankincense and myrrh.', es: 'Encontraron al niño Jesús con María, se inclinaron y le dieron oro, incienso y mirra.' },
      { w: 'dawn', stamp: '💭', en: 'God warned them in a dream, so they went home by another road, safe and glad.', es: 'Dios les avisó en un sueño, y volvieron a casa por otro camino, a salvo y contentos.' },
    ],
  };
  const TRAV = { exodus: ['img/map/map-exodus.webp', 50, '🚶'], paul: ['img/map/map-paul.webp', 41, '⛵'], abraham: ['img/map/map-abraham.webp', 53, '🐪'], jonah: ['img/map/map-jonah.webp', 56, '⛵'], ruth: ['img/map/map-ruth.webp', 34, '🚶'], magi: ['img/map/map-magi.webp', 81, '🐫'] };
  const END = {
    paul: ['God kept Paul and everyone on the ship safe, all the way to Rome.', 'Dios cuidó a Pablo y a todos en el barco, hasta llegar a Roma.'],
    abraham: ['Abram trusted God and went. God kept His promise to him, step by step.', 'Abram confió en Dios y fue. Dios le cumplió su promesa, paso a paso.'],
    jonah: ['God gave Jonah a second chance, and showed His love to a whole city.', 'Dios le dio a Jonás una segunda oportunidad, y mostró su amor a toda una ciudad.'],
    ruth: ['Ruth stayed loyal to Naomi, and God took care of them both.', 'Rut fue fiel a Noemí, y Dios cuidó de las dos.'],
    magi: ['The wise men followed the star all the way to Jesus, the true King.', 'Los magos siguieron la estrella hasta llegar a Jesús, el Rey verdadero.'],
  };
  const isSea = m => m.land === 'sea' || m.land === 'jonah';
  const travEmoji = m => (TRAV[m.id] ? TRAV[m.id][2] : m.travel || '🚶');
  const travArt = m => { const a = TRAV[m.id]; return a ? `<image data-mp-fb href="${a[0]}" x="${-a[1] / 2}" y="-38" width="${a[1]}" height="40"/><text class="mp-trav-fb" y="-6" text-anchor="middle" font-size="24" style="display:none">${a[2]}</text>` : `<text class="mp-trav-fb" y="-6" text-anchor="middle" font-size="24">${travEmoji(m)}</text>`; };
  /* Missing traveler art: hide the picture and show the emoji next to it.
     The page CSP blocks inline onerror handlers, so one capturing listener
     does it for every [data-mp-fb] image (map, trip list, how-to-play). */
  if (typeof document !== 'undefined' && document.addEventListener) document.addEventListener('error', e => { const el = e.target; if (!el || !el.hasAttribute || !el.hasAttribute('data-mp-fb')) return; el.style.display = 'none'; if (el.nextElementSibling) el.nextElementSibling.style.display = ''; }, true);
  const storyOf = (m, i) => (STORY[m.id] && STORY[m.id][i]) || { w: 'clear', stamp: '⭐', en: '', es: '' };

  /* passport stamps on this phone (msb_ key: covered by Export/Restore) */
  function stamps() {
    let v = {}; try { v = JSON.parse(localStorage.getItem(STAMP_KEY) || '{}') || {}; } catch { v = {}; }
    return {
      list: id => (Array.isArray(v[id]) ? v[id].filter(n => Number.isInteger(n)) : []),
      add(id, n) { const l = this.list(id); if (l.includes(n)) return false; v[id] = [...l, n].sort((a, b) => a - b); try { localStorage.setItem(STAMP_KEY, JSON.stringify(v)); } catch { /* private */ } return true; },
    };
  }

  /* ---------- the parchment map ---------- */
  const MOUNT = (x, y, s = 1) => `<g transform="translate(${x} ${y}) scale(${s})"><path d="M-14 0L0-20L14 0Z" fill="#c9a66b" stroke="#7a5a32" stroke-width="1.2"/><path d="M0-20L4-8L-2-4L0-20Z" fill="#f4ead2"/><path d="M0-20L14 0H4Z" fill="#a9844c" opacity=".7"/></g>`;
  const PALM = (x, y) => `<g transform="translate(${x} ${y})"><path d="M0 0C1-6 1-10-1-15" stroke="#7a5a32" stroke-width="1.6" fill="none"/><path d="M-1-15C-7-17-10-14-11-11M-1-15C4-18 8-16 9-13M-1-15C-4-20-2-23 1-23M-1-15C2-20 6-21 8-19" stroke="#5f8f4e" stroke-width="2" fill="none" stroke-linecap="round"/></g>`;
  const WAVES = (x, y) => `<path d="M${x} ${y}q4-4 8 0t8 0M${x + 6} ${y + 7}q4-4 8 0t8 0" stroke="#5a86a6" stroke-width="1.1" fill="none" opacity=".6"/>`;
  const TENT = (x, y) => `<g transform="translate(${x} ${y})"><path d="M-7 0L0-9L7 0Z" fill="#f2e1b8" stroke="#7a5a32" stroke-width="1"/><path d="M0-9L0 0" stroke="#7a5a32" stroke-width=".8"/></g>`;
  const COMPASS = `<g class="mp-compass" transform="translate(356 238)"><circle r="20" fill="#f6e7c1" stroke="#7a5a32" stroke-width="1.2"/><path d="M0-17L4 0L0 17L-4 0Z" fill="#a33d2f"/><path d="M-17 0L0-4L17 0L0 4Z" fill="#7a5a32"/><circle r="2.4" fill="#f6e7c1" stroke="#7a5a32"/><text y="-21" text-anchor="middle" class="mp-tiny">N</text></g>`;
  const SEA_FRIEND = `<g class="mp-whale" transform="translate(300 236)"><path d="M0 0C6-8 22-8 28 0C22 4 6 4 0 0Z" fill="#7aa7c7" stroke="#4f7896"/><path d="M28 0L36-6L34 2L36 8Z" fill="#7aa7c7" stroke="#4f7896"/><circle cx="7" cy="-2" r="1" fill="#24394a"/><path d="M8-8C6-14 2-14 0-18M8-8C10-14 14-14 16-18" stroke="#9cc6e4" stroke-width="1.4" fill="none"/></g>`;
  const LAND = {
    exodus: () => `<rect width="400" height="280" fill="url(#mpSand)"/>
      <path d="M0 0 H400 V22 Q300 30 200 18 Q100 10 0 26 Z" fill="url(#mpSea)"/>
      <path d="M40 30 Q48 120 30 280" fill="none" stroke="#6f9fbf" stroke-width="7" stroke-linecap="round"/><path d="M40 30 Q48 120 30 280" fill="none" stroke="#9cc6e4" stroke-width="2.4" stroke-linecap="round"/>
      <path d="M96 40 Q120 60 118 110 Q150 180 230 280 L262 280 Q190 190 150 120 Q128 70 110 40 Z" fill="url(#mpSea)" stroke="#5a86a6" stroke-width="1"/>
      <path d="M330 120 Q318 190 290 280 L310 280 Q336 200 344 120 Z" fill="url(#mpSea)" stroke="#5a86a6" stroke-width="1"/>
      ${WAVES(120, 150)}${WAVES(196, 250)}${WAVES(150, 6)}${WAVES(300, 10)}
      ${MOUNT(250, 262, 1.2)}${MOUNT(276, 258, 1.5)}${MOUNT(300, 266, 1)}${MOUNT(210, 128)}${MOUNT(230, 120, 0.8)}${MOUNT(360, 90, 0.9)}
      ${PALM(146, 186)}${PALM(156, 190)}${PALM(162, 182)}${PALM(60, 120)}${TENT(70, 70)}${TENT(80, 74)}
      <g class="mp-pyr" transform="translate(66 104)"><path d="M-12 0L0-16L12 0Z" fill="#d9b874" stroke="#7a5a32"/><path d="M0-16L12 0H2Z" fill="#b8954f"/></g>
      <text x="40" y="58" class="mp-label">${esc(t('Egypt', 'Egipto'))}</text><text x="300" y="60" class="mp-label">${esc(t('Canaan', 'Canaán'))}</text><text x="180" y="166" class="mp-label small">${esc(t('Wilderness', 'Desierto'))}</text>`,
    sea: () => `<rect width="400" height="280" fill="url(#mpSea)"/>
      ${[[30, 200], [70, 140], [200, 140], [260, 220], [320, 160], [150, 250], [40, 250], [180, 100], [330, 60]].map(([x, y]) => WAVES(x, y)).join('')}
      <g fill="url(#mpSand)" stroke="#8a6a3a" stroke-width="1.1">
      <path d="M0 0 H150 Q120 30 110 60 Q100 90 120 120 Q132 140 118 150 Q96 130 84 104 Q70 76 40 60 Q20 50 0 52 Z"/>
      <path d="M96 150 Q112 146 120 156 Q110 166 96 162 Z"/>
      <path d="M150 0 H300 Q270 40 250 80 Q240 120 222 120 Q212 96 200 80 Q180 60 170 30 Z"/>
      <path d="M210 176 Q240 168 268 178 Q240 190 210 184 Z"/>
      <path d="M300 0 H400 V120 Q370 110 340 116 Q300 110 270 96 Q290 60 300 0 Z"/>
      <path d="M400 120 V280 H330 Q360 240 362 200 Q368 160 380 130 Z"/>
      <path d="M0 280 V236 Q100 222 200 240 Q280 252 330 280 Z"/></g>
      <circle cx="108" cy="178" r="4" fill="#ecd9a8" stroke="#8a6a3a"/>
      ${MOUNT(230, 70, 0.9)}${MOUNT(350, 70)}${MOUNT(60, 30, 0.8)}${PALM(380, 210)}${PALM(240, 182)}
      ${SEA_FRIEND}
      <text x="38" y="30" class="mp-label">${esc(t('Italy', 'Italia'))}</text><text x="196" y="34" class="mp-label">${esc(t('Greece', 'Grecia'))}</text><text x="160" y="268" class="mp-label">${esc(t('Africa', 'África'))}</text><text x="200" y="210" class="mp-label small">${esc(t('Great Sea', 'Mar Grande'))}</text>`,
    abraham: () => `<rect width="400" height="280" fill="url(#mpSand)"/>
      <path d="M0 0 H40 Q56 80 44 160 Q36 220 52 280 H0 Z" fill="url(#mpSea)" stroke="#5a86a6" stroke-width="1"/>
      <path d="M232 0 Q260 70 300 120 Q340 170 360 240 L380 280" fill="none" stroke="#6f9fbf" stroke-width="6" stroke-linecap="round"/><path d="M232 0 Q260 70 300 120 Q340 170 360 240 L380 280" fill="none" stroke="#9cc6e4" stroke-width="2" stroke-linecap="round"/>
      <path d="M300 0 Q330 60 352 110 Q376 170 390 230" fill="none" stroke="#6f9fbf" stroke-width="5" stroke-linecap="round"/><path d="M300 0 Q330 60 352 110 Q376 170 390 230" fill="none" stroke="#9cc6e4" stroke-width="1.8" stroke-linecap="round"/>
      ${WAVES(8, 120)}${WAVES(6, 220)}
      ${MOUNT(150, 100, 0.9)}${MOUNT(170, 96, 0.7)}${MOUNT(70, 196, 0.8)}${MOUNT(200, 200, 0.9)}
      ${PALM(320, 200)}${PALM(330, 206)}${PALM(270, 80)}${PALM(118, 176)}${TENT(84, 236)}${TENT(96, 240)}${TENT(260, 58)}
      <text x="300" y="262" class="mp-label">Ur</text><text x="70" y="40" class="mp-label">${esc(t('Canaan', 'Canaán'))}</text><text x="170" y="150" class="mp-label small">${esc(t('Desert', 'Desierto'))}</text><text x="236" y="114" class="mp-label small">${esc(t('Euphrates', 'Éufrates'))}</text>`,
    jonah: () => `<rect width="400" height="280" fill="url(#mpSea)"/>
      ${[[30, 200], [70, 140], [200, 100], [160, 240], [40, 60], [230, 220], [110, 40]].map(([x, y]) => WAVES(x, y)).join('')}
      <path d="M300 0 H400 V280 H280 Q300 244 286 212 Q306 170 310 120 Q296 60 300 0 Z" fill="url(#mpSand)" stroke="#8a6a3a" stroke-width="1.1"/>
      ${MOUNT(352, 160, 0.9)}${MOUNT(372, 150, 0.7)}${PALM(330, 100)}${PALM(376, 240)}${TENT(316, 248)}
      <g transform="translate(372 112)" fill="#d9b874" stroke="#7a5a32" stroke-width="1"><rect x="-22" y="0" width="12" height="12"/><rect x="-8" y="-6" width="14" height="18"/><rect x="8" y="2" width="12" height="10"/></g>
      <g transform="translate(150 214)"><path d="M0 0C8-12 34-12 44 0C34 8 8 8 0 0Z" fill="#6b8fb0" stroke="#3f6382"/><path d="M44 0L54-8L52 2L54 10Z" fill="#6b8fb0" stroke="#3f6382"/><circle cx="9" cy="-3" r="1.4" fill="#1d2f3d"/></g>
      <text x="80" y="110" class="mp-label">${esc(t('Great Sea', 'Mar Grande'))}</text><text x="336" y="196" class="mp-label small">${esc(t('Land', 'Tierra'))}</text>`,
    ruth: () => `<rect width="400" height="280" fill="url(#mpSand)"/>
      <rect width="400" height="280" fill="#9fbf6a" opacity=".28"/>
      <path d="M206 176 Q196 220 210 270 Q226 280 236 262 Q246 220 230 176 Q218 164 206 176 Z" fill="url(#mpSea)" stroke="#5a86a6" stroke-width="1"/>
      ${MOUNT(300, 250, 1)}${MOUNT(330, 244, 1.2)}${MOUNT(370, 252, 0.9)}${MOUNT(60, 220, 0.8)}
      ${[[60, 150], [80, 166], [110, 186], [130, 160], [50, 186]].map(([x, y]) => `<path d="M${x} ${y}v-10M${x} ${y - 10}l-3-4M${x} ${y - 10}l3-4M${x} ${y - 6}l-3-3M${x} ${y - 6}l3-3" stroke="#c9a03a" stroke-width="1.4" fill="none"/>`).join('')}
      <g transform="translate(150 90)" fill="#e7d3a3" stroke="#7a5a32" stroke-width="1"><rect x="-14" y="-8" width="10" height="10"/><rect x="0" y="-12" width="12" height="14"/><rect x="14" y="-6" width="9" height="8"/></g>
      ${PALM(270, 90)}${PALM(30, 80)}
      <text x="40" y="40" class="mp-label">${esc(t('Judah', 'Judá'))}</text><text x="176" y="268" class="mp-label small">${esc(t('Salt Sea', 'Mar Salado'))}</text>`,
    magi: () => `<rect width="400" height="280" fill="#2c3460"/>
      <rect width="400" height="280" fill="url(#mpSand)" opacity=".25"/>
      ${Array.from({ length: 40 }, (_, k) => `<circle cx="${(k * 97) % 400}" cy="${(k * 53) % 150}" r="${k % 3 ? 0.8 : 1.4}" fill="#fff8d8" opacity=".8"/>`).join('')}
      <g transform="translate(130 40)"><path d="M0-14L3-3L14 0L3 3L0 14L-3 3L-14 0L-3-3Z" fill="#ffe27a"/><circle r="4" fill="#fffbe6"/></g>
      <path d="M0 200 Q80 170 160 196 Q240 222 320 190 Q370 172 400 186 V280 H0 Z" fill="#c9a66b" opacity=".9"/>
      <path d="M0 236 Q100 214 200 240 Q300 262 400 232 V280 H0 Z" fill="#b8954f"/>
      ${PALM(150, 196)}${PALM(330, 188)}${TENT(110, 236)}
      <g transform="translate(130 110)" fill="#d9c49a" stroke="#5a4426" stroke-width="1"><rect x="-16" y="-8" width="12" height="10"/><rect x="-2" y="-14" width="14" height="16"/><path d="M-2-14L5-20L12-14Z"/></g>
      <text x="70" y="160" class="mp-label small" style="fill:#f6e7c1">${esc(t('Jerusalem', 'Jerusalén'))}</text><text x="140" y="264" class="mp-label small">${esc(t('Bethlehem', 'Belén'))}</text>`,
  };

  function weather(kind) {
    if (reduced()) return '';
    if (kind === 'storm') return `<g class="mp-wx storm"><rect width="400" height="280" fill="rgba(30,40,60,.32)"/>${Array.from({ length: 30 }, (_, k) => `<line x1="${(k * 41) % 400}" y1="${-20 - (k * 17) % 60}" x2="${(k * 41) % 400 - 8}" y2="${-4 - (k * 17) % 60}" style="--d:${(k % 7) * 0.1}s"/>`).join('')}<rect class="mp-flash" width="400" height="280"/></g>`;
    if (kind === 'rain') return `<g class="mp-wx rain"><rect width="400" height="280" fill="rgba(60,80,100,.15)"/>${Array.from({ length: 18 }, (_, k) => `<line x1="${(k * 53) % 400}" y1="${-20 - (k * 23) % 60}" x2="${(k * 53) % 400 - 4}" y2="${-8 - (k * 23) % 60}" style="--d:${(k % 6) * 0.12}s"/>`).join('')}</g>`;
    if (kind === 'wind') return `<g class="mp-wx wind">${Array.from({ length: 7 }, (_, k) => `<path d="M${-60} ${30 + k * 36}q20-8 40 0t40 0" style="--d:${k * 0.35}s"/>`).join('')}</g>`;
    if (kind === 'heat') return `<g class="mp-wx heat"><circle cx="360" cy="34" r="40" fill="url(#mpGlow)"/><rect width="400" height="280" fill="rgba(255,190,90,.10)"/></g>`;
    if (kind === 'dawn') return `<g class="mp-wx dawn"><rect width="400" height="280" fill="url(#mpDawn)"/>${Array.from({ length: 14 }, (_, k) => `<circle cx="${150 + (k * 37) % 120}" cy="${180 + (k * 19) % 60}" r="1.6" fill="#fffef6" style="--d:${(k % 5) * 0.3}s"/>`).join('')}</g>`;
    return `<g class="mp-wx clear"><path class="mp-bird" d="M0 0q4-4 8 0q4-4 8 0" transform="translate(70 70)"/><path class="mp-bird b2" d="M0 0q3-3 6 0q3-3 6 0" transform="translate(96 60)"/></g>`;
  }
  /* the camera: zoom to a point, kept inside the map */
  function cam(x, y, z = ZOOM) {
    const tx = Math.min(0, Math.max(400 - 400 * z, 200 - x * z)), ty = Math.min(0, Math.max(280 - 280 * z, 140 - y * z));
    return { tx, ty, z };
  }
  const camCss = (c, f = 1) => `transform:translate(${(c.tx * f).toFixed(1)}px,${(c.ty * f).toFixed(1)}px) scale(${c.z})`;
  function mapSvg(s) {
    const m = maps()[s.at], st = m.stops, here = st[s.stop], whole = s.done;
    const pts = st.map(p => `${p.x},${p.y}`).join(' ');
    const done = st.slice(0, s.stop + 1).map(p => `${p.x},${p.y}`).join(' ');
    const got = stamps().list(m.id);
    const dots = st.map((p, i) => { const on = got.includes(i) && (i < s.stop || s.answered || whole); return `<g class="mp-stop${on ? ' done' : ''}${i === s.stop && !whole ? ' here' : ''}" transform="translate(${p.x} ${p.y})"><circle r="${i === s.stop ? 8.5 : 6.5}"/>${on ? `<text class="mp-seal" y="3.4" text-anchor="middle">${storyOf(m, i).stamp}</text>` : `<text class="mp-num" y="3" text-anchor="middle">${i + 1}</text>`}<text x="${p.x > 300 ? -11 : 11}" y="-10" text-anchor="${p.x > 300 ? 'end' : 'start'}" class="mp-name">${esc(name(p.name))}</text></g>`; }).join('');
    const c = whole ? { tx: 0, ty: 0, z: 1 } : cam(here.x, here.y);
    const at = s.from != null && !reduced() ? st[s.from] : here;
    const wx = whole ? 'clear' : storyOf(m, s.stop).w;
    return `<div class="mp-wrap${isSea(m) ? ' sea' : ''}"><svg class="mp-map" viewBox="0 0 400 280" role="img" aria-label="${esc(t('Map: {title}, stop {n} of {total}, {stop}', 'Mapa: {title}, parada {n} de {total}, {stop}', { title: name(m.title), n: s.stop + 1, total: st.length, stop: name(here.name) }))}">
      <defs><linearGradient id="mpSand" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#f4e3b8"/><stop offset="1" stop-color="#e3c98e"/></linearGradient><linearGradient id="mpSea" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#a9cde3"/><stop offset="1" stop-color="#86b3cf"/></linearGradient><radialGradient id="mpGlow"><stop offset="0" stop-color="rgba(255,220,120,.85)"/><stop offset="1" stop-color="rgba(255,220,120,0)"/></radialGradient><linearGradient id="mpDawn" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="rgba(255,170,190,.30)"/><stop offset="1" stop-color="rgba(255,230,180,.05)"/></linearGradient><radialGradient id="mpVig" cx=".5" cy=".5" r=".75"><stop offset=".62" stop-color="rgba(120,80,30,0)"/><stop offset="1" stop-color="rgba(110,70,25,.55)"/></radialGradient><filter id="mpGrain"><feTurbulence type="fractalNoise" baseFrequency=".9" numOctaves="2" seed="4"/><feColorMatrix values="0 0 0 0 .45  0 0 0 0 .3  0 0 0 0 .12  0 0 0 .18 0"/></filter></defs>
      <g class="mp-cam" data-mp-cam style="${camCss(c)}">
        ${LAND[m.land]()}
        <polyline points="${pts}" class="mp-route"/><polyline points="${done}" class="mp-route done${s.from != null && !reduced() ? ' draw' : ''}"/>
        ${dots}
        <g class="mp-trav${s.react ? ' ' + s.react : ''}${whole ? ' win' : ''}" data-mp-trav transform="translate(${at.x} ${at.y - 2})"><g class="mp-trav-art"><ellipse cx="0" cy="1" rx="16" ry="3" fill="rgba(60,40,20,.25)"/><g class="mp-bob">${travArt(m)}</g></g>${s.react === 'yes' ? '<text class="mp-bubble" y="-30" text-anchor="middle">!</text>' : s.react === 'no' ? '<text class="mp-bubble" y="-30" text-anchor="middle">?</text>' : ''}${whole ? '<path class="mp-flag" d="M10-30V-14M10-30L20-26L10-22" stroke="#4d2f17" fill="#ffd35a"/>' : ''}</g>
      </g>
      <g class="mp-clouds" data-mp-clouds style="${camCss(c, 1.25).replace(/scale\([^)]*\)/, '')}"><g class="mp-cloud c1"><ellipse cx="80" cy="60" rx="30" ry="10"/><ellipse cx="98" cy="54" rx="18" ry="9"/></g><g class="mp-cloud c2"><ellipse cx="280" cy="200" rx="34" ry="11"/><ellipse cx="300" cy="193" rx="20" ry="9"/></g><g class="mp-cloud c3"><ellipse cx="420" cy="110" rx="26" ry="9"/></g></g>
      ${weather(wx)}
      <rect width="400" height="280" filter="url(#mpGrain)" opacity=".55" pointer-events="none"/>
      <rect width="400" height="280" fill="url(#mpVig)" pointer-events="none"/>
      ${COMPASS}
    </svg><div class="mp-fx" data-mp-fx aria-hidden="true"></div></div>`;
  }
  function passport(m, fresh) {
    const got = stamps().list(m.id);
    return `<div class="mp-passport" aria-label="${esc(t('Passport: {n} of {total} stamps', 'Pasaporte: {n} de {total} sellos', { n: got.length, total: m.stops.length }))}">${m.stops.map((p, i) => `<span class="mp-slot${got.includes(i) ? ' on' : ''}${fresh === i ? ' fresh' : ''}" title="${esc(name(p.name))}"><span aria-hidden="true">${got.includes(i) ? storyOf(m, i).stamp : '·'}</span></span>`).join('')}</div>`;
  }

  function start() { return { view: 'pick', at: 0 }; }
  function begin(s, i) { Object.assign(s, { view: 'play', at: i, stop: 0, answered: false, mistakes: 0, wrong: [], opts: null, done: false, lang: lang(), from: null, react: '', fresh: null, record: false, newStamps: 0 }); s.opts = C().stopChoices(maps()[i].stops[0], lang()); }
  const starRow = n => `<span class="kg-stars" aria-label="${esc(t('{n} of 3 stars', '{n} de 3 estrellas', { n }))}">${[1, 2, 3].map(k => `<i class="${k <= n ? 'on' : ''}" aria-hidden="true">★</i>`).join('')}</span>`;
  function pickHtml() {
    const v = prog().get();
    return `<p class="kg-lead">${esc(t('Travel with God\u2019s people. Answer at every stop to move on and collect its stamp.', 'Viaja con el pueblo de Dios. Responde en cada parada para seguir y ganar su sello.'))}</p><ul class="kg-picks mp-picks">${maps().map((m, i) => { const st = Number(v.best[`map:${m.id}`]) || 0; return `<li><button type="button" class="card kg-pick mp-pick${st ? ' done' : ''}" data-mp-pick="${i}"><span class="kg-pick-icon" aria-hidden="true">${TRAV[m.id] ? `<img class="mp-pick-art" src="${TRAV[m.id][0]}" alt="" loading="lazy" decoding="async" width="${TRAV[m.id][1]}" height="40" data-mp-fb><span class="mp-pick-fb" style="display:none">${m.icon}</span>` : m.icon}</span><span><strong>${esc(name(m.title))}</strong><small>${esc(t('{n} stops', '{n} paradas', { n: m.stops.length }))}</small>${st ? starRow(st) : ''}${passport(m)}</span></button></li>`; }).join('')}</ul>`;
  }
  const weatherName = w => ({ storm: t('Storm', 'Tormenta'), rain: t('Rain', 'Lluvia'), wind: t('Windy', 'Viento'), heat: t('Hot sun', 'Sol fuerte'), dawn: t('Morning', 'Mañana'), clear: t('Clear sky', 'Cielo claro') })[w] || '';
  const weatherIcon = w => ({ storm: '⛈️', rain: '🌧️', wind: '💨', heat: '☀️', dawn: '🌅', clear: '🌤️' })[w] || '';
  function playHtml(s) {
    const m = maps()[s.at], l = lang();
    const kui = K._ui;
    const tut = coach('map', t('Map Journey', 'Viaje en el mapa'), [
      { icon: TRAV[m.id] ? `<img class="mp-pick-art" src="${TRAV[m.id][0]}" alt="" decoding="async" data-mp-fb><span class="mp-pick-fb" style="display:none">${travEmoji(m)}</span>` : travEmoji(m), text: t('Travel stop by stop along the red route.', 'Viaja parada por parada por la ruta roja.') },
      { icon: '📜', text: t('Read what happened there, then answer the question.', 'Lee lo que pasó allí y responde la pregunta.') },
      { icon: '🔖', text: t('A right answer stamps your passport. Fewer mistakes, more stars!', 'Una respuesta correcta sella tu pasaporte. ¡Menos errores, más estrellas!') },
    ], kui.coachForce === 'map');
    if (s.done) {
      const n = C().stars(s.mistakes), all = stamps().list(m.id).length === m.stops.length;
      const msg = END[m.id] ? t(...END[m.id]) : t('God led His people every step of the way, with water, bread and His good law.', 'Dios guió a su pueblo en cada paso, con agua, pan y su buena ley.');
      const other = maps().findIndex((x, i) => i !== s.at);
      return `${mapSvg(s)}${levelCard({ eyebrow: t('JOURNEY COMPLETE!', '¡VIAJE COMPLETO!'), title: name(m.title), stars: n, record: s.record, text: msg, reward: all ? t('Passport complete: all {n} stamps!', 'Pasaporte completo: ¡los {n} sellos!', { n: m.stops.length }) : '', extra: passport(m), actions: `${other >= 0 ? `<button type="button" class="primary" data-mp-pick="${other}">${esc(name(maps()[other].title))} ${maps()[other].icon}</button>` : ''}<button type="button" class="secondary" data-mp-pick="${s.at}">${esc(t('Travel again', 'Viajar otra vez'))}</button><button type="button" class="secondary" data-mp-list>${esc(t('Pick a journey', 'Escoger un viaje'))}</button>` })}`;
    }
    const stop = m.stops[s.stop], ev = storyOf(m, s.stop);
    const opts = s.opts.map((o, i) => `<button type="button" class="mini-choice${s.answered && o.right ? ' correct' : ''}${s.wrong.includes(i) ? ' incorrect' : ''}" data-mp-opt="${i}" ${s.answered || s.wrong.includes(i) ? 'disabled' : ''}>${esc(o.text)}</button>`).join('');
    const after = s.answered ? verseHtml(stop.verse, t('RIGHT!', '¡CORRECTO!'), `<button type="button" class="primary" data-mp-go>${esc(s.stop + 1 < m.stops.length ? (isSea(m) ? t('Sail on', 'Seguir navegando') : t('Walk on', 'Seguir caminando')) + ' ' + travEmoji(m) : t('Finish the journey', 'Terminar el viaje'))}</button>`) : `<p class="kg-msg" role="status" aria-live="polite" data-kg-msg>${esc(s.wrong.length ? t('Not quite. Read the story again and try another answer!', 'Casi. ¡Lee la historia otra vez y prueba otra respuesta!') : '')}</p>`;
    const event = `<article class="mp-event${s.answered ? ' stamped' : ''}" data-mp-event><div class="mp-event-head"><span class="mp-step">${esc(t('Stop {n} of {total}', 'Parada {n} de {total}', { n: s.stop + 1, total: m.stops.length }))}</span><span class="mp-wxchip"><span aria-hidden="true">${weatherIcon(ev.w)}</span> ${esc(weatherName(ev.w))}</span></div><h2 class="mp-place">${esc(name(stop.name))}</h2><p class="mp-story">${esc(ev[l] || '')}</p><span class="mp-stampslot" aria-hidden="true">${s.answered ? `<span class="mp-stampmark">${ev.stamp}</span>` : ''}</span></article>`;
    return `${tut}<p class="kg-sub">${esc(name(m.title))}</p>${mapSvg(s)}${passport(m, s.fresh)}<div class="mp-q-area" data-mp-q>${event}<p class="kg-lead mp-q">${esc(stop.q[l])}</p><div class="mini-choices">${opts}</div>${after}</div>`;
  }

  /* the traveler goes from the last stop to this one on a gentle curve, the camera following */
  let anim = 0;
  function travel(screen, s) {
    const m = maps()[s.at], a = m.stops[s.from], b = m.stops[s.stop]; s.from = null;
    const tr = screen.querySelector('[data-mp-trav]'), camEl = screen.querySelector('[data-mp-cam]'), cl = screen.querySelector('[data-mp-clouds]');
    if (!tr || reduced()) return;
    cancelAnimationFrame(anim);
    const c0 = cam(a.x, a.y), c1 = cam(b.x, b.y), mx = (a.x + b.x) / 2 + (b.y - a.y) * 0.25, my = (a.y + b.y) / 2 - Math.abs(b.x - a.x) * 0.18 - 10;
    const T0 = performance.now(), DUR = 1500, ease = k => (k < 0.5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2);
    camEl.style.transition = 'none'; camEl.setAttribute('style', camCss(c0)); cl.setAttribute('style', camCss(c0, 1.25).replace(/scale\([^)]*\)/, ''));
    sound(isSea(m) ? 'wave' : 'steps');
    const step = now => {
      if (!tr.isConnected) return;
      const k = Math.min(1, (now - T0) / DUR), e = ease(k), u = 1 - e;
      const x = u * u * a.x + 2 * u * e * mx + e * e * b.x, y = u * u * a.y + 2 * u * e * my + e * e * b.y;
      tr.setAttribute('transform', `translate(${x.toFixed(1)} ${(y - 2).toFixed(1)})${b.x < a.x ? ' scale(-1 1)' : ''}`);
      const c = { tx: c0.tx + (c1.tx - c0.tx) * e, ty: c0.ty + (c1.ty - c0.ty) * e, z: ZOOM };
      camEl.setAttribute('style', camCss(c)); cl.setAttribute('style', camCss(c, 1.25).replace(/scale\([^)]*\)/, ''));
      if (k < 1) anim = requestAnimationFrame(step);
      else { tr.setAttribute('transform', `translate(${b.x} ${b.y - 2})`); sound('page'); if (storyOf(m, s.stop).w === 'storm') sound('thunder'); else if (isSea(m)) sound('gull'); }
    };
    anim = requestAnimationFrame(step);
  }

  K._helpers.register({
    id: 'map', icon: '🗺️',
    name: { en: 'Map Journey', es: 'Viaje en el mapa' },
    blurb: { en: 'Follow the Exodus and Paul\u2019s voyage', es: 'Sigue el Éxodo y el viaje de Pablo' },
    total: () => maps().length,
    start,
    render(ui) { const s = ui.state; if (s.view === 'play' && !s.done && s.lang !== lang()) { s.lang = lang(); s.opts = C().stopChoices(maps()[s.at].stops[s.stop], lang()); s.wrong = []; } return gameHead(this) + (s.view === 'play' ? playHtml(s) : pickHtml()); },
    mount(screen, ui) {
      const s = ui.state;
      if (s.view === 'play' && s.from != null) travel(screen, s);
      if (s.react) setTimeout(() => { s.react = ''; const tr = screen.querySelector('[data-mp-trav]'); if (tr) { tr.classList.remove('yes', 'no'); const b = tr.querySelector('.mp-bubble'); if (b) b.remove(); } }, 1100);
    },
    leave() { cancelAnimationFrame(anim); },
    click(event, ui) {
      const s = ui.state, el = event.target;
      const pick = el.closest('[data-mp-pick]'); if (pick) { begin(s, +pick.dataset.mpPick); sound('start'); render(); window.scrollTo({ top: 0, behavior: 'auto' }); return; }
      const o = el.closest('[data-mp-opt]');
      if (o && !s.answered) {
        const i = +o.dataset.mpOpt, m = maps()[s.at];
        if (s.opts[i].right) {
          s.answered = true; s.react = 'yes';
          const fresh = stamps().add(m.id, s.stop); s.fresh = fresh ? s.stop : null; if (fresh) s.newStamps += 1;
          sound('good'); setTimeout(() => sound('stamp'), 380); if (fresh) setTimeout(() => sound('coin'), 620); buzz([18, 40, 30]);
          render();
          const fx = document.querySelector('[data-mp-fx]'); floatText(fx, fresh ? t('New stamp!', '¡Nuevo sello!') : t('Stamped!', '¡Sellado!'), 50, 30, 'gold');
          const g = document.querySelector('[data-mp-go]'); if (g) { g.focus({ preventScroll: true }); g.scrollIntoView({ block: 'center', behavior: reduced() ? 'auto' : 'smooth' }); }
        } else {
          s.wrong.push(i); s.mistakes += 1; s.react = 'no'; sound('bad'); buzz([8, 30, 8]); render();
          const n = document.querySelector('[data-mp-opt]:not([disabled])'); if (n) n.focus({ preventScroll: true });
        }
        return;
      }
      if (el.closest('[data-mp-go]')) {
        const m = maps()[s.at];
        if (s.stop + 1 >= m.stops.length) {
          const n = C().stars(s.mistakes), before = Number(prog().get().best[`map:${m.id}`]) || 0;
          s.done = true; s.record = n > before; prog().finish('map', m.id); prog().best(`map:${m.id}`, n);
          sound('fanfare'); starPings(n); if (s.record) setTimeout(() => sound('record'), 1400); setTimeout(() => sound(isSea(m) ? 'bells' : 'cheer'), 900);
          celebrate('gold'); buzz([20, 40, 30, 40, 60]); render(); award(); window.scrollTo({ top: 0, behavior: 'auto' }); return;
        }
        s.from = s.stop; s.stop += 1; s.answered = false; s.wrong = []; s.fresh = null; s.react = ''; s.opts = C().stopChoices(m.stops[s.stop], lang());
        buzz(10); render();
        const map = document.querySelector('.mp-wrap'); if (map) map.scrollIntoView({ block: 'start', behavior: reduced() ? 'auto' : 'smooth' });
        return;
      }
      if (el.closest('[data-mp-list]')) { s.view = 'pick'; sound('tap'); render(); window.scrollTo({ top: 0, behavior: 'auto' }); }
    }
  });
})();
