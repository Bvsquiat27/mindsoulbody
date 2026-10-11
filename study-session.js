/* Long study session timer (for the Salted Caramel Cold Brew badge).
   Time counts only while the app is visible, you are in a study area (Bible
   reader, lessons, studies, notes, memory verses) and you touched, typed or
   scrolled within the last 2 minutes. 30 minutes with no touch at all
   starts a new session. The best session is kept on this device. */
(function (root) {
  'use strict';
  const IDLE_MS = 2 * 60 * 1000;        /* counts only if you interacted this recently */
  const NEW_SESSION_MS = 30 * 60 * 1000; /* a longer break starts a new session */
  const STEP_CAP_MS = 15 * 1000;        /* one tick never adds more than this (sleeping phone) */
  const KEY = 'msb_study_session';
  const TIERS = [{ id: 'cold-brew', minutes: 45 }, { id: 'cold-brew-venti', minutes: 120 }];
  const STUDY_SCREENS = ['bible', 'study', 'library', 'deeper', 'notes', 'memory', 'verses', 'mini', 'study-together'];
  const num = v => (Number.isFinite(Number(v)) && Number(v) > 0 ? Number(v) : 0);

  function session(saved) {
    const a = saved && saved.act, s = { ms: num(saved && saved.ms), best: num(saved && saved.best), act: typeof a === 'number' && Number.isFinite(a) ? a : null, last: null };
    s.best = Math.max(s.best, s.ms);
    return {
      /* a touch, key or scroll */
      interact(now) { if (s.act !== null && now - s.act > NEW_SESSION_MS) s.ms = 0; s.act = now; },
      /* call every few seconds; returns the tiers newly reached by the best session */
      tick(now, { visible, studying }) {
        const dt = s.last !== null ? now - s.last : 0, before = s.best;
        s.last = now;
        if (s.act !== null && now - s.act > NEW_SESSION_MS) s.ms = 0;
        if (visible && studying && s.act !== null && now - s.act <= IDLE_MS && dt > 0) s.ms += Math.min(dt, STEP_CAP_MS);
        if (s.ms > s.best) s.best = s.ms;
        return TIERS.filter(t => before < t.minutes * 60000 && s.best >= t.minutes * 60000).map(t => t.id);
      },
      /* keep a better best saved elsewhere (another tab, a restored backup) */
      merge(other) { s.best = Math.max(s.best, num(other && other.best)); },
      get ms() { return s.ms; },
      get best() { return s.best; },
      save() { return { ms: Math.round(s.ms), best: Math.round(s.best), act: s.act }; }
    };
  }
  const bestMinutes = saved => Math.floor(num(saved && saved.best) / 60000);
  function load(storage) { try { return JSON.parse(storage.getItem(KEY) || 'null') || {}; } catch { return {}; } }

  /* An iced salted caramel cold brew, drawn for this app: tilted clear cup,
     dark coffee fading up to caramel, cold foam dripping down, salt flakes,
     a domed lid and a brown straw. */
  function icon(venti) {
    const u = venti ? 'cbv' : 'cb';
    return `<svg class="cold-brew-icon" viewBox="0 0 64 64" width="1em" height="1em" aria-hidden="true" focusable="false"><defs>
<linearGradient id="${u}-coffee" x1="0" y1="1" x2="0" y2="0"><stop offset="0" stop-color="rgb(52,28,14)"/><stop offset=".45" stop-color="rgb(120,66,30)"/><stop offset=".8" stop-color="rgb(186,118,58)"/><stop offset="1" stop-color="rgb(214,160,98)"/></linearGradient>
<linearGradient id="${u}-shade" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="rgb(255,255,255)" stop-opacity=".28"/><stop offset=".35" stop-color="rgb(255,255,255)" stop-opacity="0"/><stop offset=".8" stop-color="rgb(0,0,0)" stop-opacity="0"/><stop offset="1" stop-color="rgb(0,0,0)" stop-opacity=".25"/></linearGradient>
<linearGradient id="${u}-foam" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="rgb(252,240,222)"/><stop offset="1" stop-color="rgb(232,200,156)"/></linearGradient>
<radialGradient id="${u}-lid" cx=".4" cy=".3" r=".8"><stop offset="0" stop-color="rgb(255,255,255)" stop-opacity=".85"/><stop offset=".6" stop-color="rgb(235,240,248)" stop-opacity=".45"/><stop offset="1" stop-color="rgb(200,210,225)" stop-opacity=".55"/></radialGradient>
<linearGradient id="${u}-straw" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="rgb(140,86,48)"/><stop offset=".5" stop-color="rgb(96,54,26)"/><stop offset="1" stop-color="rgb(62,34,16)"/></linearGradient>
<clipPath id="${u}-cup"><path d="M15 23 L49 23 L45 57 Q44.6 60 41.6 60 L22.4 60 Q19.4 60 19 57 Z"/></clipPath></defs>
<ellipse cx="32" cy="61" rx="15" ry="2.2" fill="rgb(0,0,0)" opacity=".18"/>
<g transform="rotate(-16 32 36)">
<rect x="35.5" y="1" width="3.6" height="24" rx="1.8" fill="url(#${u}-straw)" transform="rotate(14 37 13)"/>
<g clip-path="url(#${u}-cup)"><rect x="10" y="20" width="44" height="42" fill="url(#${u}-coffee)"/>
<path d="M12 22 H52 V31 Q49 35 46.5 31.5 Q44 37 40.5 32 Q37.5 36.5 34 32.5 Q30.5 37.5 27 32 Q24 36 21 31.5 Q18 35.5 15.5 31 Q13.5 33.5 12 31 Z" fill="url(#${u}-foam)"/>
<path d="M18 28 q3 -3 6 0 t6 0 t6 0 t6 0 t5 0" fill="none" stroke="rgb(196,124,52)" stroke-width="1.3" stroke-linecap="round" opacity=".9"/>
<g fill="rgb(255,255,255)"><rect x="21" y="25" width="1.4" height="1.4" transform="rotate(20 21.7 25.7)"/><rect x="29" y="24.2" width="1.2" height="1.2" transform="rotate(-15 29.6 24.8)"/><rect x="37.5" y="25.4" width="1.4" height="1.4" transform="rotate(35 38.2 26.1)"/><rect x="43" y="24.4" width="1.1" height="1.1"/></g>
<rect x="10" y="20" width="44" height="42" fill="url(#${u}-shade)"/>
<rect x="18.5" y="25" width="3" height="31" rx="1.5" fill="rgb(255,255,255)" opacity=".38"/></g>
<path d="M15 23 L49 23 L45 57 Q44.6 60 41.6 60 L22.4 60 Q19.4 60 19 57 Z" fill="none" stroke="rgb(255,255,255)" stroke-opacity=".55" stroke-width="1.2"/>
<path d="M14 22.5 Q14 8 32 8 Q50 8 50 22.5 Z" fill="url(#${u}-lid)" stroke="rgb(255,255,255)" stroke-opacity=".7" stroke-width=".9"/>
<path d="M19 18 Q21 11.5 28 10.5" fill="none" stroke="rgb(255,255,255)" stroke-width="2" stroke-linecap="round" opacity=".85"/>
<rect x="12" y="21" width="40" height="4" rx="2" fill="rgb(236,240,247)" stroke="rgb(190,198,212)" stroke-width=".6"/>
<rect x="14" y="21.6" width="18" height="1.2" rx=".6" fill="rgb(255,255,255)" opacity=".9"/>
${venti ? '<g transform="translate(40 40)"><circle r="7.5" fill="rgb(30,120,90)" stroke="rgb(255,255,255)" stroke-width="1.2"/><text y="3.2" text-anchor="middle" font-size="9" font-weight="900" font-family="system-ui,sans-serif" fill="rgb(255,255,255)">V</text></g>' : ''}
</g></svg>`;
  }

  /* Browser wiring: watch interactions and tick every 5 s. */
  function start(opt) {
    if (typeof window === 'undefined' || start.on) return;
    start.on = true;
    const st = session(load(localStorage));
    const poke = () => st.interact(Date.now());
    ['pointerdown', 'keydown', 'wheel', 'touchstart'].forEach(k => window.addEventListener(k, poke, { passive: true, capture: true }));
    window.addEventListener('scroll', poke, { passive: true, capture: true });
    setInterval(() => {
      const fresh = st.tick(Date.now(), { visible: document.visibilityState === 'visible', studying: STUDY_SCREENS.includes(opt.screen()) });
      st.merge(load(localStorage));
      try { localStorage.setItem(KEY, JSON.stringify(st.save())); } catch { /* full */ }
      if (fresh.length && opt.celebrate) opt.celebrate(fresh);
    }, 5000);
  }
  const api = { IDLE_MS, NEW_SESSION_MS, STEP_CAP_MS, KEY, TIERS, STUDY_SCREENS, session, bestMinutes, load, icon, start };
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.MsbStudySession = api;
})(typeof self !== 'undefined' ? self : this);
