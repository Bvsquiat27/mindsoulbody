/* Bible match-3 pieces: small kawaii pictures drawn as inline SVG.
   star (light), fish, grapes, loaf (bread), leaf (olive leaf), heart, and
   the Star of Bethlehem. Specials get a gold badge on top:
   row / col: the trumpet of Jericho with arrows; burst: rays of light. */
(function (root) {
  'use strict';
  const INK = '#4a3442';
  const eyes = (x1, x2, y, r = 4.2) => `<g fill="${INK}"><circle cx="${x1}" cy="${y}" r="${r}"/><circle cx="${x2}" cy="${y}" r="${r}"/></g><g fill="#fff"><circle cx="${x1 + 1.4}" cy="${y - 1.5}" r="${r * 0.38}"/><circle cx="${x2 + 1.4}" cy="${y - 1.5}" r="${r * 0.38}"/></g>`;
  const cheeks = (x1, x2, y) => `<g fill="#ff8fa8" opacity=".55"><ellipse cx="${x1}" cy="${y}" rx="4.6" ry="2.8"/><ellipse cx="${x2}" cy="${y}" rx="4.6" ry="2.8"/></g>`;
  const smile = (cx, y, w = 5) => `<path d="M${cx - w} ${y}q${w} ${w * 0.9} ${w * 2} 0" fill="none" stroke="${INK}" stroke-width="2.6" stroke-linecap="round"/>`;
  const face = (cx, y, gap = 10) => eyes(cx - gap, cx + gap, y) + cheeks(cx - gap - 6, cx + gap + 6, y + 7) + smile(cx, y + 5, 4.5);
  const shine = (x, y, rx, ry, rot = -30) => `<ellipse cx="${x}" cy="${y}" rx="${rx}" ry="${ry}" fill="#fff" opacity=".55" transform="rotate(${rot} ${x} ${y})"/>`;
  const outline = `stroke="${INK}" stroke-width="2.4" stroke-linejoin="round"`;

  const ART = {
    star: `<defs><radialGradient id="g" cx=".4" cy=".35" r=".75"><stop offset="0" stop-color="#fff6b0"/><stop offset=".6" stop-color="#ffd23f"/><stop offset="1" stop-color="#f5a623"/></radialGradient></defs>
      <path d="M50 7l12.2 25.4 27.8 3.6-20.4 19.3 5.2 27.6L50 69.6 25.2 82.9l5.2-27.6L10 36l27.8-3.6z" fill="url(#g)" ${outline}/>${shine(38, 30, 7, 3.5)}${face(50, 47, 9)}`,
    fish: `<defs><linearGradient id="g" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#8fd8ff"/><stop offset="1" stop-color="#2e8fe0"/></linearGradient></defs>
      <path d="M80 50l14-15v30z" fill="#5bb3f0" ${outline}/><ellipse cx="46" cy="50" rx="36" ry="27" fill="url(#g)" ${outline}/>
      <path d="M44 24q10 -8 20 2" fill="#5bb3f0" ${outline}/><path d="M60 40q6 10 0 20" fill="none" stroke="#1d6fb8" stroke-width="2.2" stroke-linecap="round" opacity=".6"/>${shine(30, 36, 9, 4)}${face(38, 49, 9)}`,
    grapes: `<defs><radialGradient id="g" cx=".35" cy=".3" r=".8"><stop offset="0" stop-color="#d9a6ff"/><stop offset="1" stop-color="#8a3fd1"/></radialGradient></defs>
      <path d="M50 16q2 -9 10 -10" fill="none" stroke="#7a5230" stroke-width="3.4" stroke-linecap="round"/><path d="M52 15q14 -12 26 -2q-12 8 -26 2z" fill="#6fcf5a" ${outline}/>
      <g fill="url(#g)" ${outline}><circle cx="34" cy="32" r="12"/><circle cx="58" cy="30" r="12"/><circle cx="24" cy="52" r="12"/><circle cx="76" cy="50" r="12"/><circle cx="36" cy="72" r="12"/><circle cx="64" cy="72" r="12"/><circle cx="50" cy="88" r="10"/><circle cx="50" cy="52" r="19"/></g>
      ${shine(44, 43, 6, 3)}${face(50, 53, 8)}`,
    loaf: `<defs><linearGradient id="g" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ffcf8a"/><stop offset="1" stop-color="#e08a2e"/></linearGradient></defs>
      <path d="M12 52q0 -32 38 -32t38 32v22q0 10 -10 10H22q-10 0 -10 -10z" fill="url(#g)" ${outline}/>
      <g fill="none" stroke="#b5651d" stroke-width="2.6" stroke-linecap="round" opacity=".7"><path d="M30 30l6 9"/><path d="M47 25l3 10"/><path d="M66 28l-4 10"/></g>${shine(30, 46, 8, 3.5)}${face(50, 60, 10)}`,
    leaf: `<defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#b8f07a"/><stop offset="1" stop-color="#3fae4a"/></linearGradient></defs>
      <path d="M50 94V80" stroke="#6b4a2a" stroke-width="4" stroke-linecap="round"/><path d="M50 82C16 70 14 30 50 6c36 24 34 64 0 76z" fill="url(#g)" ${outline}/>
      <path d="M50 76V22" stroke="#2e8a3a" stroke-width="2" stroke-linecap="round" opacity=".45"/>${shine(38, 30, 8, 3.5, -55)}${face(50, 50, 10)}`,
    heart: `<defs><radialGradient id="g" cx=".35" cy=".3" r=".85"><stop offset="0" stop-color="#ffc2d6"/><stop offset=".55" stop-color="#ff6f9f"/><stop offset="1" stop-color="#e83f7a"/></radialGradient></defs>
      <path d="M50 88C20 68 8 52 8 34 8 20 19 10 31 10c8 0 15 4 19 11 4 -7 11 -11 19 -11 12 0 23 10 23 24 0 18 -12 34 -42 54z" fill="url(#g)" ${outline}/>${shine(26, 28, 8, 4)}${face(50, 44, 11)}`,
    bomb: `<defs><radialGradient id="g" cx=".5" cy=".5" r=".55"><stop offset="0" stop-color="#ffffff"/><stop offset=".45" stop-color="#fff3b0"/><stop offset="1" stop-color="#ffc83d"/></radialGradient><radialGradient id="h" cx=".5" cy=".5" r=".5"><stop offset="0" stop-color="#fff7c2" stop-opacity=".95"/><stop offset="1" stop-color="#ffd84d" stop-opacity="0"/></radialGradient></defs>
      <circle cx="50" cy="50" r="48" fill="url(#h)"/>
      <path d="M50 2l7 30 28-12-16 26 29 4-29 4 16 26-28-12-7 30-7-30-28 12 16-26-29-4 29-4-16-26 28 12z" fill="url(#g)" stroke="#e0a21a" stroke-width="2" stroke-linejoin="round"/>
      ${eyes(43, 57, 48, 3.4)}${smile(50, 53, 3.5)}`
  };
  const BADGE = {
    1: `<g class="m3-badge" fill="none" stroke-linecap="round" stroke-linejoin="round"><path d="M14 92h72" stroke="#fff6c4" stroke-width="8" opacity=".9"/><path d="M14 92h72" stroke="#ffb300" stroke-width="3.5"/>
      <path d="M13 38L2 50l11 12M87 38l11 12-11 12" stroke="#fff6c4" stroke-width="9"/><path d="M13 38L2 50l11 12M87 38l11 12-11 12" stroke="#ffb300" stroke-width="4.5"/>
      <g transform="translate(70 12)"><path d="M0 0l20 -9v22z" fill="#ffd54a" stroke="#a86a00" stroke-width="1.8"/><rect x="-14" y="-1" width="15" height="6" rx="2" fill="#ffd54a" stroke="#a86a00" stroke-width="1.8"/></g></g>`,
    2: `<g class="m3-badge" fill="none" stroke-linecap="round" stroke-linejoin="round"><path d="M93 16v68" stroke="#fff6c4" stroke-width="8" opacity=".9"/><path d="M93 16v68" stroke="#ffb300" stroke-width="3.5"/>
      <path d="M38 13L50 2l12 11M38 87l12 11 12-11" stroke="#fff6c4" stroke-width="9"/><path d="M38 13L50 2l12 11M38 87l12 11 12-11" stroke="#ffb300" stroke-width="4.5"/>
      <g transform="translate(14 30) rotate(-90)"><path d="M0 0l20 -9v22z" fill="#ffd54a" stroke="#a86a00" stroke-width="1.8"/><rect x="-14" y="-1" width="15" height="6" rx="2" fill="#ffd54a" stroke="#a86a00" stroke-width="1.8"/></g></g>`,
    3: `<g class="m3-badge" fill="none" stroke-linecap="round"><circle cx="50" cy="50" r="44" stroke="#fff6c4" stroke-width="6" opacity=".85"/><circle cx="50" cy="50" r="44" stroke="#ffc400" stroke-width="2.6" stroke-dasharray="6 7"/>
      <g stroke="#ffb300" stroke-width="4"><path d="M50 0v9M50 91v9M0 50h9M91 50h9M14 14l7 7M79 79l7 7M86 14l-7 7M14 86l7 -7"/></g></g>`
  };
  const KEYS = ['star', 'fish', 'grapes', 'loaf', 'leaf', 'heart'];

  /* The picture as an SVG string; sp 1/2/3 adds the special badge. */
  function svg(name, sp) {
    const body = ART[name] || ART.star;
    const uid = `m3${name}${sp || 0}`;
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="100" height="100" aria-hidden="true">${body.replace(/id="(g|h)"/g, `id="${uid}$1"`).replace(/url\(#(g|h)\)/g, `url(#${uid}$1)`)}${BADGE[sp] || ''}</svg>`;
  }
  /* A cached data: URL, so each of the 64 cells is a plain <img>. */
  const cache = new Map();
  function uri(name, sp) {
    const k = `${name}:${sp || 0}`;
    if (!cache.has(k)) cache.set(k, 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg(name, sp)));
    return cache.get(k);
  }
  const api = { KEYS, svg, uri };
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.MsbMatchArt = api;
})(typeof self !== 'undefined' ? self : this);
