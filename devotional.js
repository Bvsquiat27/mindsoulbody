/* Morning devotional: one reading a day (KJV / RV1909), an Orthodox reflection
   and a short prayer, with an opt-in morning push reminder.
   Content: devotional-data.js. Calendar: feasts on the civil date; movable
   feasts from Orthodox Pascha. The push worker (worker/push.mjs) uses the
   same calendar, so the reminder and this screen always agree. */
(function (root, factory) {
  const api = factory(root);
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.MsbDevotional = api;
})(typeof self !== 'undefined' ? self : this, function (root) {
  'use strict';
  /* devotional-data.js (~130 KB) is not loaded at startup: it is fetched after
     the first screen, or when the devotional opens. */
  const DATA = () => root.MsbDevotionalData || (typeof require === 'function' && typeof document === 'undefined' ? require('./devotional-data.js') : { ordinary: [], feasts: [] });
  let dataLoad = null;
  function ensureData() {
    if (root.MsbDevotionalData) return Promise.resolve(root.MsbDevotionalData);
    if (!dataLoad) dataLoad = new Promise((ok, fail) => {
      const el = document.createElement('script'); el.src = 'devotional-data.js'; el.async = true;
      el.onload = () => (root.MsbDevotionalData ? ok(root.MsbDevotionalData) : fail(Error('no data')));
      el.onerror = () => { dataLoad = null; el.remove(); fail(Error('The devotional could not load. Check your connection.')); };
      document.head.appendChild(el);
    });
    return dataLoad;
  }
  const ready = () => !!root.MsbDevotionalData;
  const PUSH_KEY = 'msb_devotional_push';
  const API = 'https://mindsoulbody-api.hearthandhope.workers.dev';
  const VAPID_PUBLIC = 'BGrEYSYxakeHZiJCFXktJNmtRZRsx0mvE-WGYf7X3CFuogYNuece5P-8a4uBfgS6SuanX7kaTgr0WO4tNtd1ADQ';

  /* ---------- calendar (must match worker/push.mjs) ---------- */
  function orthodoxPascha(y) {
    const a = y % 4, b = y % 7, c = y % 19, d = (19 * c + 15) % 30, e = (2 * a + 4 * b - d + 34) % 7;
    const m = Math.floor((d + e + 114) / 31), day = ((d + e + 114) % 31) + 1;
    const t = new Date(Date.UTC(y, m - 1, day)); t.setUTCDate(t.getUTCDate() + 13);
    return t;
  }
  function forDate(y, m, d) {
    const data = DATA(), t = Date.UTC(y, m - 1, d), mmdd = `${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    const off = Math.round((t - orthodoxPascha(y).getTime()) / 86400000);
    let fixed = null;
    for (const f of data.feasts) {
      if (f.when[0] === 'P') { if (Number(f.when.slice(1)) === off) return f; }
      else if (f.when === mmdd) fixed = fixed || f;
    }
    if (fixed) return fixed;
    const n = data.ordinary.length, day = Math.floor(t / 86400000);
    return data.ordinary[((day % n) + n) % n];
  }
  const keyOf = (dt) => `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}`;
  const parseKey = (k) => { const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(k || '')); return m ? new Date(+m[1], +m[2] - 1, +m[3]) : null; };
  const forKey = (k) => { const dt = parseKey(k) || new Date(); return forDate(dt.getFullYear(), dt.getMonth() + 1, dt.getDate()); };

  /* ---------- settings ---------- */
  function readSettings(store = root.localStorage) {
    try { const v = JSON.parse(store.getItem(PUSH_KEY) || 'null'); if (v && typeof v === 'object') return { on: !!v.on, time: /^\d\d:\d\d$/.test(v.time) ? v.time : '07:00', endpoint: v.endpoint || '', auth: v.auth || '', synced: v.synced || '', reenable: !!v.reenable }; } catch { /* bad JSON */ }
    return { on: false, time: '07:00', endpoint: '', auth: '', synced: '', reenable: false };
  }
  function saveSettings(v, store = root.localStorage) { try { store.setItem(PUSH_KEY, JSON.stringify(v)); } catch { /* private mode */ } }

  /* aura.js exposes its router as window.msbNav (and the classic global nav) */
  const navFn = () => (typeof root.msbNav === 'function' ? root.msbNav : typeof root.nav === 'function' ? root.nav : null);
  /* on:true restored from a backup (or permission revoked) without a live
     permission: show it as off and ask to turn it on again */
  function reconcile(perm, store = root.localStorage) {
    const s = readSettings(store);
    if (!s.on || perm === 'granted') return s;
    const next = { ...s, on: false, endpoint: '', auth: '', synced: '', reenable: true };
    saveSettings(next, store);
    return next;
  }

  if (typeof document === 'undefined') return { reconcile, navFn, orthodoxPascha, forDate, forKey, keyOf, readSettings, saveSettings, PUSH_KEY, VAPID_PUBLIC };

  /* ---------- browser UI ---------- */
  const esc = (v) => String(v ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const es = () => !!(root.MsbI18n && root.MsbI18n.lang() === 'es');
  const tr = (en, sp) => (es() ? sp : en);
  let viewKey = '';
  const screenEl = () => document.getElementById('screen');
  function toast(msg) { const el = document.getElementById('toast'); if (!el) return; el.textContent = msg; el.classList.add('show'); clearTimeout(toast.t); toast.t = setTimeout(() => el.classList.remove('show'), 4500); }
  function niceDate(dt) { return dt.toLocaleDateString(es() ? 'es' : 'en', { weekday: 'long', month: 'long', day: 'numeric' }); }

  /* Lamentations 3:23, KJV and Reina-Valera 1909, as in bible/25.json and bible/rvr/25.json */
  function fallbackVerse() {
    return `<p class="dev-home-verse">“${esc(tr('They are new every morning: Great is thy faithfulness.', 'Nuevas son cada mañana; grande es tu fidelidad.'))}”</p><p class="muted">${esc(tr('Lamentations 3:23', 'Lamentaciones 3:23'))}</p>`;
  }
  function homeCard() {
    if (!ready()) {
      const fill = () => { const el = document.getElementById('dev-home'); if (el && el.isConnected) el.outerHTML = homeCard(); };
      /* one quiet retry, then a fixed verse so the card never sits on its placeholder */
      ensureData().then(fill).catch(() => new Promise((r) => setTimeout(r, 4000)).then(ensureData).then(fill).catch(() => {
        const el = document.getElementById('dev-home'); if (!el || !el.isConnected) return;
        el.removeAttribute('data-dev-pending'); el.setAttribute('data-dev-fallback', '');
        const p = el.querySelector('p.muted'); if (p) p.outerHTML = fallbackVerse();
      }));
      return `<section class="card dev-home" id="dev-home" data-i18n-skip data-dev-pending><span class="eyebrow">${esc(tr('MORNING DEVOTIONAL', 'DEVOCIONAL DE LA MAÑANA'))}</span><h2>${esc(tr('Today’s devotional', 'El devocional de hoy'))}</h2><p class="muted">${esc(tr('Scripture, a reflection and a short prayer.', 'Escritura, una reflexión y una oración corta.'))}</p><button type="button" class="primary" data-dev-open="${keyOf(new Date())}">${esc(tr('Read today’s devotional', 'Leer el devocional de hoy'))}</button></section>`;
    }
    const e = forKey(keyOf(new Date())), L = es() ? e.es : e.en;
    return `<section class="card dev-home" id="dev-home" data-i18n-skip><span class="eyebrow">${esc(tr('MORNING DEVOTIONAL', 'DEVOCIONAL DE LA MAÑANA'))}${L.feast ? ' · ' + esc(L.feast) : ''}</span><h2>${esc(L.title)}</h2><p class="dev-home-verse">“${esc(L.verses[0])}”</p><p class="muted">${esc(L.ref)}</p><button type="button" class="primary" data-dev-open="${keyOf(new Date())}">${esc(tr('Read today’s devotional', 'Leer el devocional de hoy'))}</button></section>`;
  }
  function show(key) {
    const el = screenEl(); if (!el) return;
    if (!ready()) {
      if (key) viewKey = key;
      el.innerHTML = `<article class="dev-page" data-i18n-skip><button type="button" class="text-button back" data-nav="today">← ${esc(tr('Home', 'Inicio'))}</button><p class="muted" role="status">${esc(tr('Opening the devotional…', 'Abriendo el devocional…'))}</p></article>`;
      ensureData().then(() => { if (document.querySelector('.dev-page')) show(viewKey); }).catch((err) => { const st = el.querySelector('[role=status]'); if (st) st.textContent = tr('The devotional could not load. Check your connection and try again.', 'No se pudo cargar el devocional. Revisa tu conexión e inténtalo otra vez.'); });
      return;
    }
    const dt = parseKey(key || viewKey) || new Date(); viewKey = keyOf(dt);
    const e = forDate(dt.getFullYear(), dt.getMonth() + 1, dt.getDate()), L = es() ? e.es : e.en, f = e.father;
    const verses = L.verses.map((v, i) => `<span class="dev-vn">${e.verse + i}</span>${esc(v)}`).join(' ');
    const today = viewKey === keyOf(new Date());
    el.innerHTML = `<article class="dev-page" data-i18n-skip lang="${es() ? 'es' : 'en'}">
      <button type="button" class="text-button back" data-nav="today">← ${esc(tr('Home', 'Inicio'))}</button>
      <header class="dev-head"><span class="eyebrow">${esc(tr('MORNING DEVOTIONAL', 'DEVOCIONAL DE LA MAÑANA'))} · ${esc(niceDate(dt))}</span>${L.feast ? `<p class="dev-feast">✦ ${esc(L.feast)}</p>` : ''}<h1>${esc(L.title)}</h1></header>
      <section class="dev-verse"><span class="eyebrow">${esc(tr('SCRIPTURE', 'ESCRITURA'))}</span><blockquote>${verses}</blockquote><p class="dev-ref">${esc(L.ref)} · ${esc(tr('KJV', 'RV1909'))}</p><button type="button" class="secondary" data-lection-book="${e.book}" data-lection-chapter="${e.chapter}" data-lection-verse="${e.verse}">${esc(tr('Open in the Bible', 'Abrir en la Biblia'))}</button></section>
      <section class="card dev-read"><span class="eyebrow">${esc(tr('REFLECTION', 'REFLEXIÓN'))}</span><p>${esc(L.reflection)}</p></section>
      ${f ? `<section class="card dev-father"><span class="eyebrow">${esc(tr('FROM THE FATHERS', 'DE LOS PADRES'))}</span><p>${esc(es() ? f.bodyEs : f.body)}</p><p class="small muted">${esc(f.author)}${f.sourceLabel ? ' · ' + esc(f.sourceLabel) : ''} · <a href="${esc(f.source)}" target="_blank" rel="noopener">${esc(tr('source', 'fuente'))}</a>${es() ? ' · traducción al español' : ''}</p></section>` : ''}
      <section class="card dev-prayer"><span class="eyebrow">${esc(tr('PRAYER', 'ORACIÓN'))}</span><p>${esc(L.prayer)}</p></section>
      <nav class="dev-days" aria-label="${esc(tr('Other days', 'Otros días'))}"><button type="button" class="secondary" data-dev-step="-1">← ${esc(tr('Yesterday', 'Ayer'))}</button>${today ? '' : `<button type="button" class="secondary" data-dev-open="${keyOf(new Date())}">${esc(tr('Today', 'Hoy'))}</button>`}<button type="button" class="secondary" data-dev-step="1">${esc(tr('Tomorrow', 'Mañana'))} →</button></nav>
      <p class="small muted dev-foot">${esc(tr('Morning reminder: turn it on in Profile.', 'Recordatorio de la mañana: actívalo en Perfil.'))} <button type="button" class="text-button" data-nav="profile">${esc(tr('Profile', 'Perfil'))}</button></p>
    </article>`;
  }
  function open(key) {
    viewKey = key || keyOf(new Date());
    const go = navFn(); if (go) go('devotional'); else show(viewKey);
  }

  /* ---------- push ---------- */
  const support = () => 'serviceWorker' in navigator && 'PushManager' in root && 'Notification' in root;
  const isIOS = () => /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  const standalone = () => (root.matchMedia && matchMedia('(display-mode: standalone)').matches) || navigator.standalone === true;
  function keyBytes(b64) { const s = b64.replace(/-/g, '+').replace(/_/g, '/'); const bin = atob(s + '==='.slice((s.length + 3) % 4)); return Uint8Array.from(bin, (c) => c.charCodeAt(0)); }
  async function call(path, body) {
    const r = await fetch(API + path, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });
    let data = {}; try { data = await r.json(); } catch { /* empty */ }
    if (!r.ok) throw Object.assign(Error(data.error || `Error ${r.status}`), { status: r.status });
    return data;
  }
  async function subscription(create) {
    const reg = await navigator.serviceWorker.ready;
    let sub = await reg.pushManager.getSubscription();
    if (!sub && create) sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: keyBytes(VAPID_PUBLIC) });
    return sub;
  }
  async function register(time) {
    const sub = await subscription(true), j = sub.toJSON();
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
    await call('/push/subscribe', { subscription: { endpoint: j.endpoint, keys: j.keys }, tz, time, lang: es() ? 'es' : 'en' });
    return { endpoint: j.endpoint, auth: j.keys.auth };
  }
  function supportNote() {
    if (support() && !(isIOS() && !standalone())) return '';
    if (isIOS()) return tr('On iPhone and iPad, reminders work only after you add this app to the Home Screen (Share → Add to Home Screen, iOS 16.4 or newer) and open it from there.', 'En iPhone y iPad, los recordatorios solo funcionan después de agregar esta app a la pantalla de inicio (Compartir → Agregar a inicio, iOS 16.4 o más reciente) y abrirla desde allí.');
    return tr('This browser cannot show reminders. Try Chrome on Android, or install the app.', 'Este navegador no puede mostrar recordatorios. Prueba Chrome en Android, o instala la app.');
  }
  function settingsHtml() {
    const s = support() ? reconcile(Notification.permission) : reconcile('unsupported'), note = supportNote(), denied = support() && Notification.permission === 'denied';
    return `<section class="card dev-settings" id="dev-settings" data-i18n-skip><div class="tap-vibration-copy"><span class="eyebrow">${esc(tr('MORNING DEVOTIONAL', 'DEVOCIONAL DE LA MAÑANA'))}</span><h2>${esc(tr('Daily reminder', 'Recordatorio diario'))}</h2><p class="muted">${esc(tr('A notification each morning with the title of the day and the first line of its verse. Tap it to open the devotional.', 'Una notificación cada mañana con el título del día y la primera línea de su versículo. Tócala para abrir el devocional.'))}</p></div>
      <button type="button" class="tap-vibration-toggle" data-dev-push-toggle role="switch" aria-checked="${s.on}" aria-label="${esc(tr('Daily reminder', 'Recordatorio diario'))}" ${note && !s.on ? 'disabled' : ''}><span class="tap-vibration-knob" aria-hidden="true"></span><span class="tap-vibration-state">${s.on ? tr('On', 'Sí') : tr('Off', 'No')}</span></button>
      <div class="dev-time-row"><label for="dev-time">${esc(tr('Time', 'Hora'))}</label><input id="dev-time" type="time" step="300" value="${esc(s.time)}" data-dev-time class="text-input"> ${s.on ? `<button type="button" class="secondary" data-dev-push-test>${esc(tr('Send a test', 'Enviar una prueba'))}</button>` : ''}</div>
      <p class="small muted" data-dev-status role="status">${esc(note || (s.reenable ? tr('Your reminder was restored, but this device has not allowed notifications yet. Turn it on again to keep getting it.', 'Tu recordatorio se restauró, pero este dispositivo todavía no ha permitido notificaciones. Actívalo otra vez para seguir recibiéndolo.') + (denied ? ' ' + tr('First allow notifications for this site in your browser settings.', 'Primero permite las notificaciones para este sitio en la configuración del navegador.') : '') : denied ? tr('Notifications are blocked for this site. Allow them in your browser settings, then try again.', 'Las notificaciones están bloqueadas para este sitio. Permítelas en la configuración del navegador y vuelve a intentarlo.') : s.reenable ? tr('Your reminder was restored, but this device has not allowed notifications yet. Turn it on again to keep getting it.', 'Tu recordatorio se restauró, pero este dispositivo todavía no ha permitido notificaciones. Actívalo otra vez para seguir recibiéndolo.') : s.on ? tr('On. Your phone’s time zone is used.', 'Activado. Se usa la zona horaria de tu teléfono.') : tr('Off by default. Nothing is sent until you turn it on.', 'Desactivado por defecto. No se envía nada hasta que lo actives.')))}</p></section>`;
  }
  function repaintSettings(msg) {
    const el = document.getElementById('dev-settings'); if (!el) return;
    el.outerHTML = settingsHtml();
    if (msg) { const st = document.querySelector('#dev-settings [data-dev-status]'); if (st) st.textContent = msg; }
  }
  let busy = false;
  function flipSwitch(t, on) {
    t.setAttribute('aria-checked', on ? 'true' : 'false'); t.setAttribute('aria-busy', 'true');
    const label = t.querySelector('.tap-vibration-state'); if (label) label.textContent = on ? tr('On', 'Sí') : tr('Off', 'No');
  }
  function failed(msg) { repaintSettings(msg); toast(msg); }
  async function turnOn() {
    const s = readSettings();
    if (supportNote()) { failed(supportNote()); return; }
    const perm = await Notification.requestPermission();
    if (perm !== 'granted') { failed(tr('Notifications were not allowed, so the reminder stays off.', 'No se permitieron las notificaciones, así que el recordatorio sigue desactivado.')); return; }
    const r = await register(s.time);
    saveSettings({ ...s, on: true, endpoint: r.endpoint, auth: r.auth, synced: keyOf(new Date()), reenable: false });
    repaintSettings(tr(`Reminder set for ${s.time} each morning.`, `Recordatorio listo para las ${s.time} cada mañana.`));
  }
  async function turnOff() {
    const s = readSettings();
    try { const sub = await subscription(false); if (s.endpoint) await call('/push/unsubscribe', { endpoint: s.endpoint, auth: s.auth }).catch(() => null); if (sub) await sub.unsubscribe(); } catch { /* still turn it off here */ }
    saveSettings({ ...s, on: false, endpoint: '', auth: '', synced: '' });
    repaintSettings(tr('Reminder off. Nothing more will be sent.', 'Recordatorio desactivado. No se enviará nada más.'));
  }
  async function guarded(fn) {
    if (busy) return; busy = true;
    try { await fn(); } catch (err) { failed(tr('Could not change the reminder: ', 'No se pudo cambiar el recordatorio: ') + (err && err.message || '')); } finally { busy = false; }
  }
  /* keep the server copy current (time zone, language, a restored backup) once a day */
  async function resync() {
    const before = readSettings(), s = support() ? reconcile(Notification.permission) : reconcile('unsupported');
    if (before.on && !s.on) { repaintSettings(); toast(tr('Your morning reminder is off on this device. Turn it on again in Profile.', 'Tu recordatorio de la mañana está desactivado en este dispositivo. Actívalo otra vez en Perfil.')); return; }
    if (!s.on || !support() || Notification.permission !== 'granted' || s.synced === keyOf(new Date())) return;
    try { const r = await register(s.time); saveSettings({ ...s, endpoint: r.endpoint, auth: r.auth, synced: keyOf(new Date()) }); } catch { /* try again next launch */ }
  }

  document.addEventListener('click', (ev) => {
    const t = ev.target.closest && ev.target.closest('[data-dev-open],[data-dev-step],[data-dev-push-toggle],[data-dev-push-test]');
    if (!t) return;
    if (t.hasAttribute('data-dev-open')) { open(t.dataset.devOpen); return; }
    if (t.hasAttribute('data-dev-step')) { const dt = parseKey(viewKey) || new Date(); dt.setDate(dt.getDate() + Number(t.dataset.devStep)); viewKey = keyOf(dt); show(viewKey); root.scrollTo({ top: 0, behavior: 'auto' }); return; }
    if (t.hasAttribute('data-dev-push-toggle')) {
      /* flip at once; ignore taps while subscribing; the saved state is repainted when done */
      if (busy || t.getAttribute('aria-busy') === 'true') return;
      const want = !readSettings().on;
      flipSwitch(t, want);
      guarded(() => (want ? turnOn() : turnOff()));
      return;
    }
    if (t.hasAttribute('data-dev-push-test')) { guarded(async () => { const s = readSettings(); await call('/push/test', { endpoint: s.endpoint, auth: s.auth }); repaintSettings(tr('Test sent. It should arrive in a few seconds.', 'Prueba enviada. Debería llegar en unos segundos.')); }); }
  });
  document.addEventListener('change', (ev) => {
    const t = ev.target.closest && ev.target.closest('[data-dev-time]'); if (!t) return;
    const time = /^\d\d:\d\d$/.test(t.value) ? t.value : '07:00', s = readSettings();
    saveSettings({ ...s, time });
    if (s.on) guarded(async () => { const r = await register(time); saveSettings({ ...readSettings(), endpoint: r.endpoint, auth: r.auth, synced: keyOf(new Date()) }); repaintSettings(tr(`Reminder moved to ${time}.`, `Recordatorio cambiado a las ${time}.`)); });
  });
  /* a tapped notification: ?devotional=YYYY-MM-DD on launch, or a message from the service worker */
  function deepLink() {
    let k = null; try { k = new URLSearchParams(location.search).get('devotional'); } catch { /* */ }
    if (!k) return;
    try { history.replaceState(null, '', location.pathname + location.hash); } catch { /* */ }
    const go = (n = 0) => { if (navFn() && document.querySelector('#screen *')) open(parseKey(k) ? k : ''); else if (n < 80) setTimeout(() => go(n + 1), 100); };
    go();
  }
  if (navigator.serviceWorker) navigator.serviceWorker.addEventListener('message', (ev) => { if (ev.data && ev.data.type === 'msb-open-devotional') open(ev.data.date); });
  const registerScreen = () => { if (root.MsbTools && root.MsbTools.screens) root.MsbTools.screens.devotional = () => show(viewKey); };
  registerScreen();
  root.addEventListener('load', () => { registerScreen(); deepLink(); setTimeout(resync, 3000); });

  return { fallbackVerse, ensureData, reconcile, navFn, orthodoxPascha, forDate, forKey, keyOf, readSettings, saveSettings, homeCard, settingsHtml, show, open, PUSH_KEY, VAPID_PUBLIC };
});
