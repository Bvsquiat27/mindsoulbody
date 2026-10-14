/* Bible squishy trade codes.
   A code is 8 characters (shown as ABCD-EFGH): which squishy plus a random
   number, scrambled, then a 2-character keyed checksum. The checksum is a
   weighted sum modulo a prime, so any single mistyped character or any two
   swapped characters are always rejected. Everything stays on this phone:
   making a code GIVES the squishy away (it leaves the giver's shelf and can
   be won back by doing its goal again); the friend who types the code gets
   it. Every code made is kept in the sent history so it can be shown again. */
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.MsbSquishyTrade = api;
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';
  const ALPHA = '0123456789ABCDEFGHJKMNPQRSTVWXYZ';
  /* Fixed order, so codes keep working when squishies are added. Legendary
     squishies are not in the list: they cannot be traded. */
  const IDS = ['lamb', 'dove', 'fish', 'lion', 'star', 'rainbow', 'stone', 'loaves', 'seed', 'bush', 'basket', 'tree', 'ark', 'coat', 'ladder', 'raven', 'wheat', 'oil', 'coin', 'donkey', 'jar', 'crown', 'boat',
    /* won in the games (added after the first 23; index 31 and up use the
       extended slot below, so older codes read exactly as before) */
    'lily', 'key', 'pearl', 'manna', 'scroll', 'shofar', 'tablets', 'elephant', 'honeycomb', 'anchor', 'shield'];
  const LEGENDARY = ['lamp', 'tomb', 'bush', 'chariot'];
  /* 5 bits hold indexes 0-30 directly; 31 means "31 + the next 5 bits" */
  const EXT = 31;
  const KEY = 'msb_squishy_trade';
  const MASK = (1 << 30) - 1, MUL = 0x2545F4B, ADD = 0x1B873593 & MASK, SALT = 613;
  const W = [3, 7, 11, 17, 23, 29], P = 1021;
  /* inverse of MUL modulo 2^30 (Newton steps) */
  let INV = MUL; for (let i = 0; i < 5; i += 1) INV = Math.imul(INV, 2 - Math.imul(MUL, INV)); INV &= MASK;
  /* the bush stays in IDS (fixed code order) but became legendary */
  const tradable = id => IDS.includes(id) && !LEGENDARY.includes(id);
  const sum = d => d.reduce((s, v, i) => (s + W[i] * (v + 1)) % P, SALT);

  function makeCode(id, rand = Math.random) {
    const idx = IDS.indexOf(id);
    if (idx < 0) return null;
    let nonce = Math.floor(rand() * (1 << 25)) & ((1 << 25) - 1), low = idx;
    if (idx >= EXT) { low = EXT; nonce = ((nonce >>> 5) << 5) | (idx - EXT); }
    const v = ((Math.imul((low | (nonce << 5)) & MASK, MUL) & MASK) + ADD) & MASK;
    const d = []; for (let i = 5; i >= 0; i -= 1) d.push((v >>> (i * 5)) & 31);
    const c = sum(d);
    return [...d, c >> 5, c & 31].map(x => ALPHA[x]).join('');
  }
  /* Kids type codes: ignore spaces and dashes, accept lower case,
     and read O as 0 and I or L as 1. */
  function clean(text) {
    return String(text || '').toUpperCase().replace(/[\s-]/g, '').replace(/O/g, '0').replace(/[IL]/g, '1');
  }
  function readCode(text) {
    const s = clean(text);
    if (!/^[0-9A-Z]{8}$/.test(s) || [...s].some(ch => !ALPHA.includes(ch))) return { ok: false, reason: 'format' };
    const d = [...s].map(ch => ALPHA.indexOf(ch));
    const c = sum(d.slice(0, 6));
    if (d[6] !== c >> 5 || d[7] !== (c & 31)) return { ok: false, reason: 'checksum' };
    let v = 0; for (let i = 0; i < 6; i += 1) v = v * 32 + d[i];
    const raw = Math.imul((v - ADD) & MASK, INV) & MASK, idx = (raw & 31) === EXT ? EXT + ((raw >>> 5) & 31) : raw & 31;
    if (idx >= IDS.length) return { ok: false, reason: 'checksum' };
    /* a real code for a squishy that became legendary (the bush): readable,
       but it cannot be redeemed any more */
    if (!tradable(IDS[idx])) return { ok: false, reason: 'legendary', id: IDS[idx], code: s };
    return { ok: true, id: IDS[idx], nonce: raw >>> 5, code: s };
  }
  const pretty = code => (code ? `${code.slice(0, 4)}-${code.slice(4)}` : '');

  function trades(storage) {
    const blank = () => ({ sent: [], got: [] });
    /* history keeps every known squishy (old bush trades included); only new
       bush trades are blocked */
    const list = v => (Array.isArray(v) ? v.filter(x => x && typeof x.c === 'string' && /^[0-9A-Z]{8}$/.test(x.c) && IDS.includes(x.id)) : []);
    function get() {
      let v = null;
      try { v = JSON.parse(storage.getItem(KEY)); } catch { v = null; }
      if (!v || typeof v !== 'object') return blank();
      return { sent: list(v.sent).slice(-200), got: list(v.got).slice(-200) };
    }
    function save(v) { try { storage.setItem(KEY, JSON.stringify(v)); } catch { /* full or blocked */ } return v; }
    return {
      get,
      /* trading GIVES the squishy away: give(id) takes it off this phone's
         shelf (MsbSquishyCore.tradeAway), and it can be won back later by
         playing its goal again. The code is remembered so it cannot be
         redeemed on this same phone. */
      create(id, owned, rand = Math.random, date = new Date(), give = null) {
        if (!tradable(id) || !(owned || []).includes(id)) return null;
        const c = makeCode(id, rand), v = get();
        v.sent.push({ c, id, at: date.getTime() });
        save(v);
        if (typeof give === 'function') give(id);
        return c;
      },
      redeem(text, date = new Date()) {
        const r = readCode(text);
        if (!r.ok) return r;
        if (!tradable(r.id)) return { ok: false, reason: 'legendary', id: r.id };
        const v = get();
        if (v.sent.some(x => x.c === r.code)) return { ok: false, reason: 'own', id: r.id };
        if (v.got.some(x => x.c === r.code)) return { ok: false, reason: 'used', id: r.id };
        v.got.push({ c: r.code, id: r.id, at: date.getTime() });
        save(v);
        return { ok: true, id: r.id, code: r.code };
      },
      gifts() { return [...new Set(get().got.map(x => x.id))]; },
      count() { const v = get(); return v.sent.length + v.got.length; }
    };
  }
  return { ALPHA, IDS, LEGENDARY, KEY, tradable, makeCode, readCode, clean, pretty, trades };
});
