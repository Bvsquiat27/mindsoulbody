/* Reina-Valera 1909 prints the first word (sometimes two) of each chapter in
   capitals, as a printed drop cap: "EN el principio", "Y DESPUÉS de esto".
   On a phone that reads as shouting, so the reader, the lessons and the game
   copies show it in sentence case: "En el principio", "Y después de esto".
   Proper names in the run keep their capital ("Y JACOB" -> "Y Jacob").
   Words the RV1909 prints in capitals on purpose stay as they are: the name
   JAH, the writing on the wall (MENE, TEKEL, PERES, UPHARSIN), and any run of
   capitals with no lower-case word after it (an inscription such as
   "REY DE REYES Y SEÑOR DE SEÑORES"). */
(function (root) {
  'use strict';
  const UP = 'A-ZÁÉÍÓÚÑÜÂÊÎÔÛ';
  const CAPS = new RegExp(`^[${UP}]+$`);
  const LOWER = /[a-záéíóúñüâêîôû]/;
  const KEEP = new Set(['JAH', 'MENE', 'TEKEL', 'PERES', 'UPHARSIN']);
  /* names that open a chapter in the RV1909, plus a few that might */
  const PROPER = new Set(['ABRAHAM', 'ACHAB', 'ADAM', 'ANNA', 'ATHALÍA', 'BALAAM', 'BENJAMÍN', 'BOOZ', 'CORÉ', 'CRISTO', 'DAVID', 'DIOS', 'EGIPTO', 'EZECHÎAS', 'FESTO', 'HIRAM', 'ISRAEL', 'JACOB', 'JACOBO', 'JEHOVÁ', 'JERUSALEM', 'JESÚS', 'JORAM', 'JOSAPHAT', 'JOSUÉ', 'JOSÉ', 'JOSÍAS', 'JUDAS', 'MOISÉS', 'NAAMÁN', 'NABUCODONOSOR', 'PABLO', 'PASHUR', 'PEDRO', 'ROBOAM', 'SALOMÓN', 'SAMUEL', 'SARAI', 'SAULO', 'SIMÓN', 'SIÓN']);
  const lower = w => w.toLocaleLowerCase('es');
  const title = w => w.charAt(0) + lower(w.slice(1));
  const LEAD = /^[¿¡(«“"'\s]*/;
  const TRAIL = /[,;:.!?)»”]+$/;

  /* Sentence-case a drop-cap run at the very start of text. */
  function fixStart(text) {
    if (typeof text !== 'string' || !text) return text;
    const lead = text.match(LEAD)[0];
    const rest = text.slice(lead.length);
    const parts = rest.split(' ');
    let n = 0, long = 0;
    while (n < parts.length && n < 5) {
      const core = parts[n].replace(TRAIL, '');
      if (!core || !CAPS.test(core)) break;
      if (core.length > 1) long += 1;
      n += 1;
    }
    if (!long || n > 3 || n >= parts.length) return text;
    if (!LOWER.test(parts[n])) return text;
    for (let i = 0; i < n; i += 1) {
      const core = parts[i].replace(TRAIL, '');
      if (KEEP.has(core)) return text;
    }
    const out = parts.slice();
    for (let i = 0; i < n; i += 1) {
      const core = parts[i].replace(TRAIL, ''), tail = parts[i].slice(core.length);
      let word;
      if (i === 0) word = core.length > 1 ? title(core) : core;
      else word = PROPER.has(core) ? title(core) : lower(core);
      out[i] = word + tail;
    }
    return lead + out.join(' ');
  }

  /* Same, at the start of text and after each sentence end inside it: a
     lesson passage strings several verses together, so a chapter start can
     sit mid-passage ("…el día sexto. ESTE es el libro…"). */
  function fixText(text) {
    if (typeof text !== 'string' || !text) return text;
    let out = fixStart(text);
    /* walk sentence boundaries by hand so each start is fixed once */
    const re = /[.;:!?»”]\s+/g;
    let m, result = '', last = 0;
    while ((m = re.exec(out))) {
      const at = m.index + m[0].length;
      result += out.slice(last, at);
      const next = out.slice(at);
      const fixed = fixStart(next);
      if (fixed !== next) { out = out.slice(0, at) + fixed; re.lastIndex = at; }
      last = at;
    }
    return result + out.slice(last);
  }

  const api = { fixStart, fixText, KEEP, PROPER };
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.MsbRvCase = api;
})(typeof window !== 'undefined' ? window : globalThis);
