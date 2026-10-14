/* Kawaii Bible squishies drawn as inline SVG (no image files, so they work
   offline). Same style for all: soft pastel body with a dark plum outline, a
   glossy highlight, big shiny eyes, blush cheeks and a small smile. The
   squeezed ">  <" eyes are hidden with a display attribute (not only CSS),
   so the picture is right when drawn as an image on a canvas too. */
(() => {
  'use strict';
  const INK = '#5b4660', EYE = '#3d2c3e';
  let uid = 0;
  let look = 'happy';
  let part = 'all', faceSpot = null;

  /* Outline trick: the same shapes drawn thick in ink first, then filled on
     top, so only the outer edge shows a line. */
  function blob(shapes, fill) {
    return `<g fill="${INK}" stroke="${INK}" stroke-width="5" stroke-linejoin="round">${shapes}</g><g fill="${fill}">${shapes}</g>`;
  }
  function face(x, y, k = 1) {
    faceSpot = { x, y, k };
    if (part === 'body') return '';
    return `<g class="sq-face" transform="translate(${x} ${y}) scale(${k})">
      <g class="sq-open"${look === 'squint' ? ' display="none"' : ''}><ellipse cx="-13" cy="0" rx="5.6" ry="6.6" fill="${EYE}"/><ellipse cx="13" cy="0" rx="5.6" ry="6.6" fill="${EYE}"/>
      <circle cx="-11" cy="-2.4" r="2.2" fill="#fff"/><circle cx="15" cy="-2.4" r="2.2" fill="#fff"/><circle cx="-14.6" cy="2.4" r="1.1" fill="#fff"/><circle cx="11.4" cy="2.4" r="1.1" fill="#fff"/></g>
      <g class="sq-shut" display="${look === 'squint' ? 'inline' : 'none'}" fill="none" stroke="${EYE}" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><path d="M-18 -4 L-10 0 L-18 4"/><path d="M18 -4 L10 0 L18 4"/></g>
      <ellipse cx="-21" cy="8" rx="5.5" ry="3.2" fill="#ff9db5" opacity=".7"/><ellipse cx="21" cy="8" rx="5.5" ry="3.2" fill="#ff9db5" opacity=".7"/>
      ${look === 'wow' ? `<ellipse class="sq-mouth" cx="0" cy="9" rx="3.6" ry="4.6" fill="${EYE}"/><ellipse cx="0" cy="10.4" rx="2" ry="1.8" fill="#ff8fa3"/>` : `<path class="sq-mouth" d="M-4.5 6.5 Q-2.2 9.5 0 6.8 Q2.2 9.5 4.5 6.5" fill="none" stroke="${EYE}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>`}</g>`;
  }
  const shine = (x, y, rx, ry, rot = -25) => `<ellipse cx="${x}" cy="${y}" rx="${rx}" ry="${ry}" transform="rotate(${rot} ${x} ${y})" fill="#fff" opacity=".55"/>`;
  const circles = list => list.map(([x, y, r]) => `<circle cx="${x}" cy="${y}" r="${r}"/>`).join('');

  const ART = {
    lamb() {
      return `<g fill="#7a6370"><rect x="44" y="92" width="9" height="16" rx="4"/><rect x="67" y="92" width="9" height="16" rx="4"/></g>
        ${blob(circles([[60, 64, 30], [36, 58, 16], [84, 58, 16], [44, 40, 15], [60, 34, 16], [76, 40, 15], [34, 78, 15], [86, 78, 15], [48, 88, 15], [72, 88, 15]]), '#fffaf2')}
        <g fill="#f3c9b5" stroke="${INK}" stroke-width="2.5"><ellipse cx="38" cy="58" rx="10" ry="5" transform="rotate(-25 38 58)"/><ellipse cx="82" cy="58" rx="10" ry="5" transform="rotate(25 82 58)"/></g>
        ${blob('<ellipse cx="60" cy="68" rx="21" ry="18"/>', '#fbe3d4')}${shine(46, 38, 9, 5)}${face(60, 66, 0.72)}`;
    },
    dove() {
      return `${blob('<path d="M18 74 L4 62 L10 84 Z"/><ellipse cx="54" cy="72" rx="36" ry="27"/><circle cx="76" cy="48" r="21"/>', '#f6f8ff')}
        <ellipse cx="46" cy="74" rx="19" ry="12" transform="rotate(-18 46 74)" fill="#dfe6fb" stroke="${INK}" stroke-width="2"/>
        <path d="M95 46 L106 50 L95 54 Z" fill="#ffb347" stroke="${INK}" stroke-width="2" stroke-linejoin="round"/>
        <path d="M102 52 Q108 62 104 72" fill="none" stroke="#6a9b4a" stroke-width="2.5" stroke-linecap="round"/>
        <g fill="#9bd36a" stroke="${INK}" stroke-width="1.6"><ellipse cx="110" cy="60" rx="6" ry="3" transform="rotate(50 110 60)"/><ellipse cx="99" cy="66" rx="6" ry="3" transform="rotate(-40 99 66)"/><ellipse cx="108" cy="72" rx="6" ry="3" transform="rotate(40 108 72)"/></g>
        ${shine(66, 34, 8, 4)}${face(76, 50, 0.6)}`;
    },
    fish() {
      return `<g fill="#8fc8f5" stroke="${INK}" stroke-width="2"><circle cx="40" cy="22" r="3.5"/><circle cx="50" cy="13" r="4.5"/><circle cx="60" cy="22" r="3.5"/></g>
        ${blob('<path d="M92 66 L116 46 Q110 66 116 88 Z"/><ellipse cx="56" cy="68" rx="44" ry="33"/>', '#a8d8ff')}
        <ellipse cx="54" cy="84" rx="30" ry="13" fill="#e2f3ff"/><path d="M96 62 Q100 68 96 74" fill="none" stroke="${INK}" stroke-width="2" stroke-linecap="round"/>
        ${shine(36, 46, 11, 5)}${face(46, 64, 0.8)}`;
    },
    lion() {
      const mane = Array.from({ length: 12 }, (_, i) => { const a = i / 12 * Math.PI * 2; return [60 + Math.cos(a) * 34, 64 + Math.sin(a) * 34, 15]; });
      return `${blob(circles(mane), '#f4a259')}${blob('<circle cx="38" cy="38" r="9"/><circle cx="82" cy="38" r="9"/><circle cx="60" cy="64" r="31"/>', '#ffd88a')}
        <ellipse cx="60" cy="80" rx="13" ry="8.5" fill="#fff4dc"/><path d="M56 74 L64 74 L60 79 Z" fill="#c26a5a" stroke="${EYE}" stroke-width="1.5" stroke-linejoin="round"/>
        ${shine(46, 44, 9, 4.5)}${face(60, 62, 0.72)}`;
    },
    star() {
      const pts = Array.from({ length: 10 }, (_, i) => { const a = -Math.PI / 2 + i * Math.PI / 5, r = i % 2 ? 22 : 46; return `${(60 + Math.cos(a) * r).toFixed(1)},${(66 + Math.sin(a) * r).toFixed(1)}`; }).join(' ');
      return `<polygon points="${pts}" fill="${INK}" stroke="${INK}" stroke-width="17" stroke-linejoin="round"/><polygon points="${pts}" fill="#ffe27a" stroke="#ffe27a" stroke-width="11" stroke-linejoin="round"/>
        ${shine(48, 44, 7, 4)}${face(60, 70, 0.68)}`;
    },
    rainbow() {
      const arc = r => `M${60 - r} 92 A ${r} ${r} 0 0 1 ${60 + r} 92`;
      const bands = [[46, '#ffadb5'], [38, '#ffcf9c'], [30, '#fff1a6'], [22, '#bdeccf'], [14, '#a9cbff']];
      return `<path d="${arc(30)}" fill="none" stroke="${INK}" stroke-width="45"/>${bands.map(([r, c]) => `<path d="${arc(r)}" fill="none" stroke="${c}" stroke-width="8.4"/>`).join('')}
        ${blob(circles([[18, 96, 12], [30, 92, 13], [24, 104, 10], [102, 96, 12], [90, 92, 13], [96, 104, 10]]), '#ffffff')}
        ${shine(34, 54, 7, 3.5, -45)}${face(60, 56, 0.5)}`;
    },
    stone() {
      return `<path d="M24 62 Q14 30 54 16 M96 62 Q106 30 66 16" fill="none" stroke="#a46a3f" stroke-width="5" stroke-linecap="round"/><circle cx="60" cy="15" r="5" fill="#a46a3f" stroke="${INK}" stroke-width="2"/>
        ${blob('<ellipse cx="60" cy="74" rx="40" ry="30" transform="rotate(-6 60 74)"/>', '#d6cde6')}
        <g fill="#b9add0"><circle cx="34" cy="80" r="2.5"/><circle cx="86" cy="66" r="2"/><circle cx="80" cy="92" r="2.6"/></g>
        ${shine(42, 56, 10, 5)}${face(60, 76, 0.78)}`;
    },
    loaves() {
      return `${blob('<path d="M16 96 Q14 46 60 42 Q106 46 104 96 Z"/>', '#f6c992')}
        <g fill="none" stroke="#d99a5b" stroke-width="3" stroke-linecap="round"><path d="M38 52 Q42 58 38 64"/><path d="M60 47 Q64 54 60 61"/><path d="M82 52 Q86 58 82 64"/></g>
        ${blob('<path d="M108 98 L118 90 L118 108 Z"/><ellipse cx="96" cy="99" rx="15" ry="9"/>', '#ffc0cb')}<circle cx="89" cy="97" r="1.8" fill="${EYE}"/>
        ${shine(34, 62, 9, 4)}${face(56, 78, 0.72)}`;
    },
    seed() {
      return `<path d="M60 44 Q58 30 60 20" fill="none" stroke="#5f9e4a" stroke-width="4" stroke-linecap="round"/>
        <g fill="#a8e6a0" stroke="${INK}" stroke-width="2.2"><ellipse cx="48" cy="24" rx="12" ry="6" transform="rotate(-25 48 24)"/><ellipse cx="72" cy="22" rx="12" ry="6" transform="rotate(25 72 22)"/></g>
        ${blob('<ellipse cx="60" cy="76" rx="30" ry="33"/>', '#ecc983')}${shine(48, 56, 8, 4.5)}${face(60, 80, 0.68)}`;
    },
    bush() {
      return `${blob('<path d="M60 4 Q80 26 72 42 Q66 52 60 52 Q54 52 48 42 Q40 26 60 4 Z"/><path d="M36 18 Q48 32 44 44 Q38 50 32 44 Q26 34 36 18 Z"/><path d="M84 18 Q96 34 88 44 Q82 50 76 44 Q72 32 84 18 Z"/>', '#ffb070')}
        <path d="M60 20 Q70 34 64 44 Q60 48 56 44 Q50 34 60 20 Z" fill="#ffe390"/>
        ${blob(circles([[60, 78, 28], [36, 82, 18], [84, 82, 18], [46, 60, 18], [74, 60, 18], [60, 94, 16]]), '#9fdc9a')}
        ${shine(40, 66, 8, 4)}${face(60, 80, 0.72)}`;
    },
    basket() {
      return `${blob('<circle cx="60" cy="46" r="21"/>', '#ffe0c7')}<path d="M52 26 Q58 20 62 26" fill="none" stroke="#a46a3f" stroke-width="3" stroke-linecap="round"/>
        ${face(60, 48, 0.52)}
        ${blob('<path d="M12 70 Q60 124 108 70 Z"/>', '#dba56b')}
        <g fill="none" stroke="#b77d45" stroke-width="2.2"><path d="M22 80 Q60 104 98 80"/><path d="M32 92 Q60 110 88 92"/><path d="M40 72 L44 102 M60 72 L60 108 M80 72 L76 102"/></g>
        ${blob('<ellipse cx="60" cy="71" rx="46" ry="8"/>', '#bfe0ff')}${shine(32, 84, 8, 3.5, -10)}`;
    },
    tree() {
      return `${blob('<rect x="50" y="66" width="20" height="44" rx="8"/>', '#c98f5e')}<path d="M56 80 Q60 86 64 80" fill="none" stroke="#a06a40" stroke-width="2"/>
        ${blob(circles([[60, 48, 28], [34, 56, 18], [86, 56, 18], [44, 30, 17], [76, 30, 17], [60, 22, 15]]), '#8fd694')}
        <g fill="#ffb3c1"><circle cx="36" cy="44" r="3"/><circle cx="86" cy="42" r="3"/><circle cx="70" cy="66" r="3"/></g>
        ${shine(44, 26, 8, 4)}${face(60, 50, 0.72)}`;
    },
    ark() {
      return `${blob('<rect x="34" y="42" width="52" height="30" rx="5"/><path d="M28 46 L60 24 L92 46 Z"/>', '#f4d6a6')}<path d="M30 46 L60 26 L90 46" fill="none" stroke="#e07a5f" stroke-width="6" stroke-linejoin="round"/>
        <g fill="#8fc8f5" stroke="${INK}" stroke-width="2"><circle cx="48" cy="56" r="5"/><circle cx="72" cy="56" r="5"/></g>
        ${blob('<path d="M8 68 L112 68 Q104 108 60 108 Q16 108 8 68 Z"/>', '#cf9562')}
        <g fill="none" stroke="#a96e3f" stroke-width="2"><path d="M14 80 Q60 86 106 80"/></g>${shine(26, 76, 8, 3, -8)}${face(60, 90, 0.72)}`;
    },
    coat() {
      const id = `sq-coat-${uid += 1}`, shape = 'M40 20 L80 20 L104 40 L94 58 L84 52 L84 108 L36 108 L36 52 L26 58 L16 40 Z';
      const stripes = ['#ffadb5', '#ffcf9c', '#fff1a6', '#bdeccf', '#a9cbff', '#d7b8ff'].map((c, i) => `<rect x="0" y="${20 + i * 15}" width="120" height="15" fill="${c}"/>`).join('');
      return `<defs><clipPath id="${id}"><path d="${shape}"/></clipPath></defs><path d="${shape}" fill="${INK}" stroke="${INK}" stroke-width="5" stroke-linejoin="round"/>
        <g clip-path="url(#${id})">${stripes}</g><path d="M50 20 Q60 32 70 20" fill="#fff8ef" stroke="${INK}" stroke-width="2"/>${shine(46, 40, 7, 4)}${face(60, 66, 0.66)}`;
    },
    /* Jacob's ladder: a soft wooden ladder up to a little cloud */
    ladder() {
      return `${blob('<rect x="28" y="16" width="12" height="98" rx="6"/><rect x="80" y="16" width="12" height="98" rx="6"/>', '#e3b57a')}
        <g fill="#d39c5c" stroke="${INK}" stroke-width="2.2"><rect x="36" y="30" width="48" height="7" rx="3.5"/><rect x="36" y="98" width="48" height="7" rx="3.5"/></g>
        ${blob(circles([[48, 14, 10], [62, 9, 12], [76, 14, 10], [40, 20, 7], [84, 20, 7]]), '#ffffff')}
        <path d="M62 2 L64 6 L68 6.5 L65 9 L66 13 L62 11 L58 13 L59 9 L56 6.5 L60 6 Z" fill="#ffe27a" stroke="${INK}" stroke-width="1.2" stroke-linejoin="round"/>
        ${blob('<rect x="24" y="48" width="72" height="42" rx="18"/>', '#f6d9a8')}${shine(36, 56, 8, 4)}${face(60, 68, 0.72)}`;
    },
    /* Elijah's raven, carrying a little loaf */
    raven() {
      return `${blob('<path d="M22 80 L4 70 L10 94 Z"/><ellipse cx="56" cy="76" rx="36" ry="28"/><circle cx="72" cy="46" r="24"/>', '#7b7f9e')}
        <ellipse cx="46" cy="80" rx="20" ry="13" transform="rotate(-15 46 80)" fill="#666a8a" stroke="${INK}" stroke-width="2"/>
        <ellipse cx="72" cy="50" rx="17" ry="14" fill="#a9adc8"/>
        <path d="M93 44 L108 50 L93 56 Z" fill="#ffb347" stroke="${INK}" stroke-width="2" stroke-linejoin="round"/>
        ${blob('<ellipse cx="108" cy="60" rx="9" ry="6"/>', '#f6c992')}<path d="M104 58 Q106 60 104 62 M110 58 Q112 60 110 62" fill="none" stroke="#d99a5b" stroke-width="1.4" stroke-linecap="round"/>
        <g fill="#7a6370"><rect x="46" y="100" width="5" height="12" rx="2.5"/><rect x="62" y="100" width="5" height="12" rx="2.5"/></g>
        ${shine(62, 30, 8, 4)}${face(72, 50, 0.56)}`;
    },
    /* Ruth's sheaf of wheat, tied with a ribbon */
    wheat() {
      const heads = [[30, 22], [44, 12], [60, 8], [76, 12], [90, 22]].map(([x, y]) => `<ellipse cx="${x}" cy="${y}" rx="7" ry="12"/>`).join('');
      return `${blob(heads, '#e9b949')}<g stroke="#c9952e" stroke-width="1.4" fill="none">${[[30, 22], [44, 12], [60, 8], [76, 12], [90, 22]].map(([x, y]) => `<path d="M${x} ${y - 8} L${x} ${y + 8} M${x - 4} ${y - 3} L${x} ${y} L${x + 4} ${y - 3} M${x - 4} ${y + 3} L${x} ${y + 6} L${x + 4} ${y + 3}"/>`).join('')}</g>
        ${blob('<path d="M30 30 Q60 20 90 30 L84 64 Q96 96 92 112 L28 112 Q24 96 36 64 Z"/>', '#f2cf72')}
        <g fill="none" stroke="#d9ac4a" stroke-width="2" stroke-linecap="round"><path d="M44 34 L46 62 M60 30 L60 62 M76 34 L74 62 M40 76 L36 108 M80 76 L84 108"/></g>
        ${blob('<rect x="32" y="60" width="56" height="12" rx="6"/>', '#e07a5f')}
        ${shine(42, 40, 6, 3)}${face(60, 90, 0.66)}`;
    },
    /* The widow's clay jar, oil still dripping */
    oil() {
      return `${blob('<path d="M42 30 L78 30 L74 44 Q104 54 100 84 Q96 110 60 110 Q24 110 20 84 Q16 54 46 44 Z"/><rect x="38" y="22" width="44" height="10" rx="5"/>', '#e8c39e')}
        <path d="M26 66 Q60 76 94 66" fill="none" stroke="#c99a6c" stroke-width="2.4" stroke-linecap="round"/>
        ${blob('<path d="M60 0 Q68 10 66 15 Q64 20 60 20 Q56 20 54 15 Q52 10 60 0 Z"/>', '#ffd166')}<ellipse cx="60" cy="25" rx="16" ry="3" fill="#ffd166" stroke="${INK}" stroke-width="1.6"/>
        ${shine(38, 60, 8, 4)}${face(60, 86, 0.72)}`;
    },
    /* The lost coin, found and shining */
    coin() {
      return `${blob('<circle cx="60" cy="64" r="44"/>', '#ffd35a')}<circle cx="60" cy="64" r="35" fill="#f7c23f" stroke="#e0a92c" stroke-width="2.4"/>
        <g fill="#fff6c4"><path d="M98 22 L100 28 L106 30 L100 32 L98 38 L96 32 L90 30 L96 28 Z"/><path d="M22 96 L23.5 100 L28 101.5 L23.5 103 L22 107 L20.5 103 L16 101.5 L20.5 100 Z"/></g>
        ${shine(42, 40, 10, 5)}${face(60, 66, 0.78)}`;
    },
    /* The Good Samaritan's donkey */
    donkey() {
      return `${blob('<ellipse cx="38" cy="22" rx="8" ry="22" transform="rotate(-18 38 22)"/><ellipse cx="82" cy="22" rx="8" ry="22" transform="rotate(18 82 22)"/>', '#a8988f')}
        <g fill="#e6b8c0"><ellipse cx="38" cy="24" rx="3.5" ry="14" transform="rotate(-18 38 24)"/><ellipse cx="82" cy="24" rx="3.5" ry="14" transform="rotate(18 82 24)"/></g>
        ${blob('<ellipse cx="60" cy="62" rx="36" ry="34"/>', '#b8a9a0')}
        <path d="M50 30 Q56 22 60 30 Q64 22 70 30" fill="#6b5a52" stroke="${INK}" stroke-width="1.8"/>
        ${blob('<ellipse cx="60" cy="92" rx="26" ry="17"/>', '#e6dcd4')}<g fill="${EYE}"><ellipse cx="51" cy="92" rx="2.6" ry="3.4"/><ellipse cx="69" cy="92" rx="2.6" ry="3.4"/></g>
        ${shine(42, 44, 8, 4)}${face(60, 62, 0.7)}`;
    },
    /* Gideon's clay pitcher with a torch inside and a trumpet */
    jar() {
      return `${blob('<path d="M60 0 Q76 18 70 32 Q66 40 60 40 Q54 40 50 32 Q44 18 60 0 Z"/>', '#ffb070')}<path d="M60 14 Q67 24 63 32 Q60 35 57 32 Q53 24 60 14 Z" fill="#ffe390"/>
        ${blob('<path d="M94 58 Q114 58 112 76 Q110 92 92 90" fill="none"/><path d="M40 36 L80 36 L76 48 Q102 60 98 86 Q94 112 60 112 Q26 112 22 86 Q18 60 44 48 Z"/>', '#c97b5a')}
        <path d="M94 58 Q112 58 110 76 Q108 90 92 88" fill="none" stroke="#c97b5a" stroke-width="5" stroke-linecap="round"/>
        <g fill="#f2c14e" stroke="${INK}" stroke-width="1.8" stroke-linejoin="round"><path d="M4 70 L22 76 L22 84 L4 90 Z"/><rect x="20" y="77" width="10" height="6" rx="2"/></g>
        <path d="M30 70 Q60 80 90 70" fill="none" stroke="#a65f40" stroke-width="2.4" stroke-linecap="round"/>
        ${shine(40, 62, 8, 4)}${face(60, 88, 0.72)}`;
    },
    /* Queen Esther's crown */
    crown() {
      const shape = 'M14 48 L30 74 L42 34 L60 66 L78 34 L90 74 L106 48 L100 104 L20 104 Z';
      return `${blob(`<path d="${shape}"/>`, '#ffd35a')}
        <g stroke="${INK}" stroke-width="2"><circle cx="14" cy="46" r="6" fill="#ff8fb8"/><circle cx="42" cy="32" r="6" fill="#8fd0ff"/><circle cx="60" cy="24" r="7" fill="#ff8fb8"/><circle cx="78" cy="32" r="6" fill="#8fd0ff"/><circle cx="106" cy="46" r="6" fill="#ff8fb8"/></g>
        <path d="M22 92 L98 92" stroke="#e0a92c" stroke-width="3" stroke-linecap="round"/>
        <g stroke="${INK}" stroke-width="1.6"><ellipse cx="34" cy="98" rx="4" ry="3" fill="#b38cff"/><ellipse cx="86" cy="98" rx="4" ry="3" fill="#b38cff"/></g>
        ${shine(30, 62, 6, 3.5)}${face(60, 80, 0.66)}`;
    },
    /* Peter's fishing boat with its net */
    boat() {
      return `<rect x="56" y="4" width="5" height="60" rx="2.5" fill="#a46a3f" stroke="${INK}" stroke-width="1.6"/>
        ${blob('<path d="M62 8 Q92 26 94 52 L62 52 Z"/>', '#fffaf2')}
        ${blob('<path d="M6 62 L114 62 Q104 104 60 104 Q16 104 6 62 Z"/>', '#c98f5e')}
        <path d="M12 74 Q60 82 108 74" fill="none" stroke="#a96e3f" stroke-width="2"/>
        <g fill="none" stroke="#8a7a6a" stroke-width="1.2"><path d="M18 64 L8 96 M26 64 L18 98 M10 74 L28 70 M8 86 L24 84"/></g>
        <g fill="#ffb3c1" stroke="${INK}" stroke-width="1.4"><ellipse cx="14" cy="92" rx="6" ry="3.5"/><ellipse cx="22" cy="80" rx="6" ry="3.5"/></g>
        <path d="M0 108 Q15 102 30 108 T60 108 T90 108 T120 108" fill="none" stroke="#8fc8f5" stroke-width="4" stroke-linecap="round"/>
        ${shine(30, 70, 8, 3, -8)}${face(64, 82, 0.7)}`;
    },
    /* The stone rolled away from the empty tomb */
    tomb() {
      const rays = Array.from({ length: 7 }, (_, i) => { const a = Math.PI + (i + 0.5) / 7 * Math.PI; return `<path d="M60 58 L${(60 + Math.cos(a) * 58).toFixed(1)} ${(58 + Math.sin(a) * 58).toFixed(1)}"/>`; }).join('');
      return `<g stroke="#ffe7a0" stroke-width="7" stroke-linecap="round" opacity=".8">${rays}</g>
        ${blob('<path d="M14 112 L14 58 Q14 18 60 18 Q106 18 106 58 L106 112 Z"/>', '#b7ad9f')}
        <path d="M34 112 L34 64 Q34 40 60 40 Q86 40 86 64 L86 112 Z" fill="#fff3c4" stroke="${INK}" stroke-width="2.2"/>
        ${blob('<circle cx="74" cy="80" r="32"/>', '#d8d2c8')}<path d="M56 64 Q74 54 92 64" fill="none" stroke="#c4bdb1" stroke-width="2.4" stroke-linecap="round"/>
        <g fill="#ff9db5" stroke="${INK}" stroke-width="1.4"><circle cx="20" cy="108" r="4"/><circle cx="28" cy="111" r="3.5"/><circle cx="110" cy="108" r="4"/></g>
        ${shine(60, 62, 8, 4)}${face(74, 84, 0.66)}`;
    },
    /* A lily of the field (from coloring) */
    lily() {
      return `<path d="M60 112 Q58 96 60 80" fill="none" stroke="#5aa35a" stroke-width="5" stroke-linecap="round"/>
        ${blob('<ellipse cx="40" cy="104" rx="16" ry="6" transform="rotate(-25 40 104)"/><ellipse cx="80" cy="104" rx="16" ry="6" transform="rotate(25 80 104)"/>', '#7cc47a')}
        ${blob('<path d="M60 14 Q74 34 70 56 Q66 70 60 72 Q54 70 50 56 Q46 34 60 14 Z"/><path d="M24 34 Q46 38 56 60 Q58 72 52 76 Q40 74 32 62 Q22 48 24 34 Z"/><path d="M96 34 Q74 38 64 60 Q62 72 68 76 Q80 74 88 62 Q98 48 96 34 Z"/>', '#ffd6e6')}
        <g fill="#ffb3cf"><path d="M60 26 Q66 42 62 60 L58 60 Q54 42 60 26 Z"/></g>
        <g fill="#f2c14e" stroke="${INK}" stroke-width="1.4"><circle cx="54" cy="70" r="3"/><circle cx="60" cy="72" r="3"/><circle cx="66" cy="70" r="3"/></g>
        ${shine(48, 40, 5, 3)}${face(60, 56, 0.55)}`;
    },
    /* "Knock, and it shall be opened": a golden key (from Questions) */
    key() {
      return `${blob('<circle cx="42" cy="50" r="30"/><rect x="62" y="42" width="48" height="16" rx="8"/><rect x="88" y="54" width="10" height="20" rx="4"/><rect x="100" y="54" width="9" height="14" rx="4"/>', '#ffd35a')}
        <circle cx="42" cy="50" r="10" fill="#fff6c4" stroke="${INK}" stroke-width="2.4"/>
        <path d="M20 32 Q30 24 40 24" fill="none" stroke="#fff6c4" stroke-width="3" stroke-linecap="round" opacity=".8"/>
        <g fill="#fff6c4"><path d="M100 18 L102 24 L108 26 L102 28 L100 34 L98 28 L92 26 L98 24 Z"/></g>
        ${face(42, 78, 0.6)}`;
    },
    /* The pearl of great price, in its shell (from Memory) */
    pearl() {
      return `${blob('<path d="M10 76 Q60 116 110 76 Q100 104 60 108 Q20 104 10 76 Z"/>', '#f6c7b4')}
        <g fill="none" stroke="#e7a58f" stroke-width="2" stroke-linecap="round"><path d="M30 86 L22 98 M48 92 L44 104 M72 92 L76 104 M90 86 L98 98"/></g>
        ${blob('<circle cx="60" cy="56" r="34"/>', '#f7f3ff')}
        <circle cx="60" cy="56" r="34" fill="none" stroke="#d9cdf2" stroke-width="3" opacity=".7"/>
        <ellipse cx="72" cy="70" rx="12" ry="6" fill="#ffe3f0" opacity=".7"/>
        ${shine(46, 38, 10, 5)}${face(60, 60, 0.7)}`;
    },
    /* Bread from heaven: a soft manna flake (from Manna Match) */
    manna() {
      return `${blob('<path d="M60 14 Q72 26 86 20 Q90 36 104 42 Q94 56 104 72 Q88 76 84 94 Q70 88 60 104 Q50 88 36 94 Q32 76 16 72 Q26 56 16 42 Q30 36 34 20 Q48 26 60 14 Z"/>', '#fffaf0')}
        <g fill="#f0e2c0"><circle cx="40" cy="44" r="3"/><circle cx="82" cy="50" r="2.5"/><circle cx="70" cy="86" r="3"/><circle cx="44" cy="80" r="2.5"/></g>
        <g fill="#cfe8ff"><path d="M14 18 L16 22 L20 24 L16 26 L14 30 L12 26 L8 24 L12 22 Z"/><path d="M106 96 L107.5 100 L112 101.5 L107.5 103 L106 107 L104.5 103 L100 101.5 L104.5 100 Z"/></g>
        ${shine(42, 34, 8, 4)}${face(60, 62, 0.72)}`;
    },
    /* A scroll of Scripture (from Word Search) */
    scroll() {
      return `${blob('<rect x="24" y="22" width="72" height="80" rx="6"/>', '#f5e6c4')}
        ${blob('<rect x="14" y="12" width="92" height="16" rx="8"/><rect x="14" y="96" width="92" height="16" rx="8"/>', '#c98f5e')}
        <g fill="#8a5a35"><circle cx="14" cy="20" r="5"/><circle cx="106" cy="20" r="5"/><circle cx="14" cy="104" r="5"/><circle cx="106" cy="104" r="5"/></g>
        <g stroke="#c9b48a" stroke-width="2.4" stroke-linecap="round"><path d="M36 38 H84 M36 46 H76"/></g>
        ${shine(36, 34, 6, 3)}${face(60, 70, 0.66)}`;
    },
    /* A ram's-horn shofar (from Who Said It?) */
    shofar() {
      return `${blob('<path d="M14 96 Q8 70 26 54 Q50 36 80 40 Q100 42 108 24 Q116 30 112 46 Q104 66 80 66 Q56 66 40 80 Q30 90 30 104 Q20 106 14 96 Z"/>', '#e8c79a')}
        <g fill="none" stroke="#c9a06a" stroke-width="2.4" stroke-linecap="round"><path d="M40 52 Q44 62 38 70 M58 44 Q62 54 58 64 M76 42 Q80 50 78 60"/></g>
        <ellipse cx="22" cy="100" rx="10" ry="7" fill="#5b4660"/>
        <g stroke="#ffd166" stroke-width="3" stroke-linecap="round" fill="none"><path d="M6 76 Q2 84 6 92"/><path d="M0 70 Q-6 84 0 98" opacity=".6"/></g>
        ${shine(70, 50, 7, 3)}${face(66, 56, 0.58)}`;
    },
    /* The two tablets of stone (from Story Order) */
    tablets() {
      return `${blob('<path d="M12 104 L12 40 Q12 18 34 18 Q56 18 56 40 L56 104 Z"/><path d="M64 104 L64 40 Q64 18 86 18 Q108 18 108 40 L108 104 Z"/>', '#cfcac2')}
        <g fill="#a8a29a"><rect x="22" y="40" width="24" height="4" rx="2"/><rect x="22" y="50" width="20" height="4" rx="2"/><rect x="74" y="40" width="24" height="4" rx="2"/><rect x="74" y="50" width="20" height="4" rx="2"/><rect x="74" y="60" width="22" height="4" rx="2"/></g>
        <g font-family="Georgia,serif" font-size="11" fill="#8f897f"><text x="28" y="36">I</text><text x="82" y="36">VI</text></g>
        ${shine(22, 30, 5, 3)}${face(60, 84, 0.66)}`;
    },
    /* Two by two: a little elephant (from Ark Builder) */
    elephant() {
      return `${blob('<ellipse cx="22" cy="54" rx="18" ry="24"/><ellipse cx="98" cy="54" rx="18" ry="24"/>', '#b9c3d6')}
        <g fill="#ffc6d4"><ellipse cx="22" cy="56" rx="10" ry="15"/><ellipse cx="98" cy="56" rx="10" ry="15"/></g>
        ${blob('<ellipse cx="60" cy="58" rx="36" ry="34"/><path d="M52 80 Q50 104 40 110 Q36 114 42 116 Q60 112 66 86 Z"/>', '#c7d0e2')}
        <g fill="#fffaf2" stroke="${INK}" stroke-width="1.6"><path d="M44 84 Q40 92 36 92 Q40 86 42 82 Z"/><path d="M76 84 Q80 92 84 92 Q80 86 78 82 Z"/></g>
        ${shine(44, 38, 8, 4)}${face(60, 58, 0.72)}`;
    },
    /* Sweeter than honey: a honeycomb (from Verse Builder) */
    honeycomb() {
      const hex = (x, y) => `<path d="M${x - 14} ${y} L${x - 7} ${y - 12} L${x + 7} ${y - 12} L${x + 14} ${y} L${x + 7} ${y + 12} L${x - 7} ${y + 12} Z"/>`;
      return `${blob(hex(60, 40) + hex(39, 52) + hex(81, 52) + hex(39, 76) + hex(81, 76) + hex(60, 64) + hex(60, 88), '#ffc94d')}
        <g fill="none" stroke="#e0a22c" stroke-width="2">${hex(39, 52)}${hex(81, 52)}${hex(39, 76)}${hex(81, 76)}${hex(60, 40)}${hex(60, 88)}</g>
        ${blob('<path d="M76 98 Q80 108 76 114 Q72 108 76 98 Z"/>', '#f5a524')}
        ${shine(52, 32, 5, 3)}${face(60, 64, 0.66)}`;
    },
    /* Hope, the anchor of the soul (from Map Journey) */
    anchor() {
      return `${blob('<circle cx="60" cy="20" r="11"/><rect x="52" y="28" width="16" height="70" rx="8"/><rect x="34" y="40" width="52" height="12" rx="6"/><path d="M14 72 Q20 108 60 110 Q100 108 106 72 L94 70 Q90 96 60 98 Q30 96 26 70 Z"/>', '#9db8d6')}
        <circle cx="60" cy="20" r="5" fill="#eaf3ff" stroke="${INK}" stroke-width="2"/>
        <g fill="#9db8d6" stroke="${INK}" stroke-width="2" stroke-linejoin="round"><path d="M8 74 L20 62 L28 76 Z"/><path d="M112 74 L100 62 L92 76 Z"/></g>
        <path d="M70 6 Q86 0 94 12" fill="none" stroke="#c98f5e" stroke-width="3" stroke-linecap="round"/>
        ${shine(56, 40, 3, 6, 0)}${face(60, 72, 0.6)}`;
    },
    /* "The LORD is my shield" (from David's Sling) */
    shield() {
      return `${blob('<path d="M60 8 Q86 18 108 18 Q108 76 60 114 Q12 76 12 18 Q34 18 60 8 Z"/>', '#7fb0e8')}
        <path d="M60 18 Q82 26 98 26 Q98 72 60 102 Q22 72 22 26 Q38 26 60 18 Z" fill="#a9cdf5" stroke="#5f8fc8" stroke-width="2"/>
        <g fill="#ffd35a" stroke="${INK}" stroke-width="1.6"><rect x="55" y="26" width="10" height="44" rx="3"/><rect x="40" y="38" width="40" height="10" rx="3"/></g>
        ${shine(34, 32, 7, 4)}${face(60, 82, 0.6)}`;
    },
    /* Elijah's chariot of fire (legendary; finish every Bible game) */
    chariot() {
      return `<g fill="#ffb347" opacity=".85"><path d="M4 70 Q14 40 30 52 Q26 30 44 36 Q48 18 62 28 Q72 12 82 30 Q100 22 98 44 Q116 44 110 66 Z"/></g>
        <g fill="#ffe08a" opacity=".9"><path d="M20 66 Q28 50 38 58 Q40 42 54 46 Q62 34 70 46 Q84 40 84 56 Q98 56 96 68 Z"/></g>
        ${blob('<path d="M18 62 L102 62 Q100 88 76 92 L36 92 Q20 88 18 62 Z"/>', '#e56b4a')}
        <path d="M24 70 L96 70" stroke="#ffd35a" stroke-width="4" stroke-linecap="round"/>
        ${blob('<circle cx="40" cy="98" r="15"/><circle cx="84" cy="98" r="15"/>', '#ffd35a')}
        <g stroke="${INK}" stroke-width="2" stroke-linecap="round"><path d="M40 86 V110 M28 98 H52 M84 86 V110 M72 98 H96"/></g>
        ${shine(34, 68, 6, 3, 0)}${face(62, 78, 0.56)}`;
    },
    /* The final squishy: a little clay oil lamp with a glowing flame. */
    lamp() {
      const g = `sq-glow-${uid += 1}`, f = `sq-flame-${uid}`;
      return `<defs><radialGradient id="${g}" cx="50%" cy="50%" r="50%"><stop offset="0" stop-color="#fff6c4" stop-opacity=".95"/><stop offset=".45" stop-color="#ffd86b" stop-opacity=".45"/><stop offset="1" stop-color="#ffc94d" stop-opacity="0"/></radialGradient>
        <radialGradient id="${f}" cx="50%" cy="70%" r="65%"><stop offset="0" stop-color="#fffbe0"/><stop offset=".5" stop-color="#ffd25a"/><stop offset="1" stop-color="#ff9a3c"/></radialGradient></defs>
        ${part === 'body' ? '' : `<circle class="sq-halo" cx="62" cy="62" r="58" fill="url(#${g})"/><circle cx="101" cy="42" r="22" fill="url(#${g})"/>`}
        ${blob('<path d="M100 18 Q114 38 108 52 Q102 62 94 54 Q88 42 100 18 Z"/>', `url(#${f})`)}
        <path d="M100 34 Q106 44 103 51 Q100 55 97 51 Q95 44 100 34 Z" fill="#fffbe6"/>
        ${blob('<path d="M84 66 L108 56 Q114 58 110 64 L92 82 Z"/><ellipse cx="56" cy="80" rx="40" ry="24"/><ellipse cx="56" cy="104" rx="18" ry="6"/>', '#f7c873')}
        <path d="M20 70 Q8 72 9 81 Q10 90 22 89" fill="none" stroke="${INK}" stroke-width="9" stroke-linecap="round"/><path d="M20 70 Q8 72 9 81 Q10 90 22 89" fill="none" stroke="#f7c873" stroke-width="4" stroke-linecap="round"/>
        <ellipse cx="56" cy="60" rx="11" ry="4" fill="#c98f4a" stroke="${INK}" stroke-width="2"/>
        <path d="M30 94 Q56 104 82 94" fill="none" stroke="#e0a959" stroke-width="2.4" stroke-linecap="round"/>
        ${shine(36, 70, 9, 4)}${face(56, 80, 0.72)}`;
    }
  };

  /* mood: 'happy' (default), 'squint' (squished: > < eyes) or 'wow' (stretched: O mouth). */
  /* part: 'all' (default), 'body' (everything but the face) or 'face' (only
     the face, at its usual spot). The play view warps the body but keeps the
     face as one stiff piece so the character stays recognizable. */
  /* A few drawings reach past the 120 x 120 picture. Each gets a small
     scale and shift (from its measured bounds) so nothing is clipped and
     there are 2 units of room on every side. [scale, dx, dy] */
  const FIT = {loaves: [1, -3, 0], coat: [0.959, 2.0, 0], ladder: [0.951, 0, 6.75], wheat: [0.959, 0, 7.75], oil: [1, 0, 4], donkey: [0.991, 0, 6.96], jar: [0.991, 0, 3.98], boat: [0.935, 3.87, 0], tomb: [0.967, 2.0, 4.9], lamp: [0.967, -1.87, 0]};
  const fitWrap = (id, body) => { const f = FIT[id]; return f ? `<g transform="translate(${f[1]} ${f[2]}) scale(${f[0]})">${body}</g>` : body; };
  function svg(id, label, mood, which) {
    const draw = ART[id];
    if (!draw) return '';
    look = mood || 'happy';
    part = which === 'body' || which === 'face' ? which : 'all';
    let body = draw();
    if (part === 'face') {
      const f = faceSpot;
      look = mood || 'happy'; part = 'all';
      body = f ? face(f.x, f.y, f.k) : '';
    }
    look = 'happy'; part = 'all';
    body = fitWrap(id, body);
    return `<svg class="sq-svg" xmlns="http://www.w3.org/2000/svg" width="120" height="120" viewBox="0 0 120 120" ${label ? `role="img" aria-label="${String(label).replace(/"/g, '&quot;')}"` : 'aria-hidden="true"'} focusable="false">${body}</svg>`;
  }

  /* Where the face sits (in the 120 x 120 picture) and its size. */
  function faceAt(id) {
    faceSpot = null;
    if (ART[id]) { part = 'body'; ART[id](); part = 'all'; }
    const f = FIT[id], p = faceSpot;
    return p && f ? { ...p, x: f[1] + p.x * f[0], y: f[2] + p.y * f[0], k: p.k * f[0] } : p;
  }

  window.MsbSquishyArt = { svg, faceAt, FIT, ids: Object.keys(ART) };
})();
