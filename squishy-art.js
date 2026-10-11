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
    return `<svg class="sq-svg" xmlns="http://www.w3.org/2000/svg" width="120" height="120" viewBox="0 0 120 120" ${label ? `role="img" aria-label="${String(label).replace(/"/g, '&quot;')}"` : 'aria-hidden="true"'} focusable="false">${body}</svg>`;
  }

  /* Where the face sits (in the 120 x 120 picture) and its size. */
  function faceAt(id) { faceSpot = null; if (ART[id]) { part = 'body'; ART[id](); part = 'all'; } return faceSpot; }

  window.MsbSquishyArt = { svg, faceAt, ids: Object.keys(ART) };
})();
