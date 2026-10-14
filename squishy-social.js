/* Bible squishies with friends: the public collection on a friend's profile
   and finished Trade Room swaps applied on this phone.
   Keys (both start with msb_, so Export/Restore keeps them):
     msb_squishy_public → 'off' hides your collection from friends (on by default)
     msb_squishy_room   → { away: [ids], got: [ids], applied: [trade ids] }
   Only squishy ids are sent to the friends server: no names, no progress. */
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.MsbSquishySocial = api;
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';
  const PUBLIC_KEY = 'msb_squishy_public', ROOM_KEY = 'msb_squishy_room', UNLOCKED_KEY = 'msb_squishy_unlocked';
  const LEGENDARY_MIN = 5;
  const env = () => ({
    D: typeof window !== 'undefined' ? window.MsbSquishyData : null,
    C: typeof window !== 'undefined' ? window.MsbSquishyCore : null,
  });

  function isPublic(storage) { try { return storage.getItem(PUBLIC_KEY) !== 'off'; } catch { return true; } }
  function setPublic(storage, on) { try { storage.setItem(PUBLIC_KEY, on ? 'on' : 'off'); } catch { /* blocked */ } return !!on; }

  /* what the sync sends: the squishies open on this phone, and the toggle */
  function payload(storage, squishies, core) {
    const ids = core.progress(storage, squishies).unlocked();
    return { ids, public: isPublic(storage) };
  }

  function readJson(storage, key, fallback) { try { const v = JSON.parse(storage.getItem(key)); return v == null ? fallback : v; } catch { return fallback; } }

  /* A finished swap from the server: { trade, give, get }. Applied once per
     trade id; returns every trade id the server can forget (ack). */
  function applyPending(storage, pending, squishies, core) {
    const known = new Set(squishies.map(x => x.id)), starters = new Set(squishies.filter(x => !x.locked).map(x => x.id));
    const room = core.roomLedger(storage), done = [], newly = [];
    let open = readJson(storage, UNLOCKED_KEY, []);
    if (!Array.isArray(open)) open = [];
    for (const p of Array.isArray(pending) ? pending : []) {
      if (!p || typeof p.trade !== 'string' || !/^[a-f0-9]{16}$/.test(p.trade)) continue;
      done.push(p.trade);
      if (room.applied.includes(p.trade)) continue;
      const give = (Array.isArray(p.give) ? p.give : []).filter(id => known.has(id) && !starters.has(id) && id !== 'lamp');
      const get = (Array.isArray(p.get) ? p.get : []).filter(id => known.has(id) && !starters.has(id) && id !== 'lamp');
      open = open.filter(id => !give.includes(id));
      for (const id of get) if (!open.includes(id)) { open.push(id); newly.push(id); }
      room.away = [...new Set([...room.away.filter(id => !get.includes(id)), ...give])];
      room.got = [...new Set([...room.got.filter(id => !give.includes(id)), ...get])];
      room.applied = [...room.applied, p.trade].slice(-50);
    }
    try {
      storage.setItem(UNLOCKED_KEY, JSON.stringify(open));
      storage.setItem(ROOM_KEY, JSON.stringify(room));
    } catch { return { ack: [], got: [] }; }
    return { ack: done, got: newly };
  }

  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

  /* A friend's collection, grouped and tidy at 390px. ids: the friend's list
     (already checked by the server). */
  function gridHtml(ids, opts) {
    const { D, C } = env(), o = opts || {}, es = o.lang === 'es';
    const A = typeof window !== 'undefined' ? window.MsbSquishyArt : null;
    if (!D || !C || !Array.isArray(ids)) return '';
    const list = D.SQUISHIES.filter(x => ids.includes(x.id));
    const T = (en, sp, vars) => String(es ? sp : en).replace(/\{(\w+)\}/g, (_, k) => (vars && vars[k] != null ? vars[k] : ''));
    const head = `<span class="eyebrow">${esc(T('BIBLE SQUISHIES', 'SQUISHIES DE LA BIBLIA'))}</span><p class="muted">${esc(T('{n} of {total} squishies', '{n} de {total} squishies', { n: list.length, total: D.SQUISHIES.length }))}</p>`;
    if (!list.length) return `<section class="card friend-squishies" data-i18n-skip>${head}</section>`;
    const tiles = list.map(x => {
      const tier = C.tierOf(x.id), name = x.name[es ? 'es' : 'en'];
      const tag = x.id === 'lamp' ? `<span class="fsq-tag never">${esc(T('Never traded', 'Nunca se cambia'))}</span>`
        : tier === 'legendary' ? `<span class="fsq-tag legend">${esc(T('{n} squishies', '{n} squishies', { n: LEGENDARY_MIN }))}</span>`
        : tier === 'rare' ? `<span class="fsq-tag rare">${esc(T('Rare', 'Raro'))}</span>` : '';
      return `<li class="fsq-tile fsq-${tier}"><span class="fsq-art" aria-hidden="true">${A ? A.svg(x.id) : ''}</span><span class="fsq-name">${esc(name)}</span>${tag}</li>`;
    }).join('');
    return `<section class="card friend-squishies" data-i18n-skip>${head}<ul class="fsq-grid">${tiles}</ul><p class="small muted">${esc(T('A legendary costs at least 5 squishies in a trade. The lamp is never traded.', 'Un legendario cuesta al menos 5 squishies en un cambio. La lámpara nunca se cambia.'))}</p></section>`;
  }

  /* the Profile setting */
  function toggleHtml(storage, lang) {
    const es = lang === 'es', on = isPublic(storage);
    return `<section class="card squishy-public" data-i18n-skip><span class="eyebrow">${es ? 'MIS SQUISHIES' : 'MY SQUISHIES'}</span><label class="reading-share-row"><input type="checkbox" id="squishy-public" ${on ? 'checked' : ''}> <span>${es ? 'Mostrar mi colección de squishies a mis amigos' : 'Show my squishy collection to friends'}</span></label><p class="muted">${es ? 'Activado por defecto. Tus amigos ven qué squishies tienes, nada más.' : 'On by default. Friends see which squishies you have, nothing else.'}</p></section>`;
  }

  return { PUBLIC_KEY, ROOM_KEY, LEGENDARY_MIN, isPublic, setPublic, payload, applyPending, gridHtml, toggleHtml };
});
