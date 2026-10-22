# Achievement badge art

One painted badge per achievement, replacing the emoji in Profile → Achievements
and in the "Achievement unlocked" pop-up.

- Files: `img/ach/<id>-128.webp` and `img/ach/<id>-256.webp`
  (square WebP, 128×128 and 256×256 px, transparent background, shown at 40 CSS px).
- When both files for an id land:
  1. add the id to `MSB_ACH_ART` in `aura.js` and to `ACH_ART` in `sw.js`;
  2. add both files to `img/art-hashes.json` (art is never edited in place:
     repainted art gets a new id suffix or file name).
- Until then the emoji in `MSB_ACHIEVEMENTS` stays as the fallback.
