/* Bible match-3 pieces: painted watercolor pictures (img/kids, see
   kids-art.js), cut out of the cream paper so they sit on the board tiles.
   star (light), fish, grapes, loaf (bread), leaf (olive leaf), heart, and
   the Star of Bethlehem (bomb). Specials get a painted badge on top:
   row / col: the trumpets of Jericho; burst: rays of light. */
(function (root) {
  'use strict';
  const KEYS = ['star', 'fish', 'grapes', 'loaf', 'leaf', 'heart'];
  const ART = { star: 'm3-star', fish: 'm3-fish', grapes: 'm3-grapes', loaf: 'm3-loaf', leaf: 'm3-leaf', heart: 'm3-heart', bomb: 'm3-bomb' };
  const BADGE = { 1: 'm3-sp-row', 2: 'm3-sp-col', 3: 'm3-sp-burst' };
  const file = (n, px) => `img/kids/${n}-${px > 128 ? 256 : 128}.webp`;
  /* the piece picture; px is the size it is drawn at, for picking the file */
  const src = (name, px = 128) => file(ART[name] || ART.star, px);
  /* the special's badge picture (sp 1/2/3), or '' for a plain piece */
  const badge = (sp, px = 128) => (BADGE[sp] ? file(BADGE[sp], px) : '');
  /* kept for callers that want one URL per piece: the painted file */
  const uri = name => src(name);
  const files = () => [...Object.values(ART), ...Object.values(BADGE)].flatMap(n => [file(n, 128), file(n, 256)]);
  const api = { KEYS, ART, BADGE, src, badge, uri, files };
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.MsbMatchArt = api;
})(typeof self !== 'undefined' ? self : this);
