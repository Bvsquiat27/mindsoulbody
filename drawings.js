/* My drawings: the Profile gallery of saved coloring pages, and "Save to phone".
   Storage is MsbDrawingsStore (IndexedDB on this device). Save to phone uses the
   Web Share API with a file when the browser offers it (Android Chrome, the
   Android app, iPhone Safari), so the picture can go to Photos or Files;
   otherwise it downloads the picture. */
(() => {
  'use strict';
  const L = en => window.MsbI18n ? MsbI18n.t(en) : en;
  const esc = v => String(v ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  let store = null;
  const urls = [];

  function getStore() {
    if (store) return store;
    if (!window.MsbDrawingsStore || !window.indexedDB) return null;
    store = MsbDrawingsStore.createStore(MsbDrawingsStore.idbBackend(window.indexedDB));
    return store;
  }

  function fileName(page, type) {
    const ext = /png/.test(type) ? 'png' : /webp/.test(type) ? 'webp' : 'jpg';
    const d = new Date();
    const stamp = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    return `${L('coloring')}-${page}-${stamp}.${ext}`;
  }

  /* Share sheet with the picture when possible, else a normal download. */
  async function toPhone(blob, page, title) {
    const name = fileName(page, blob.type);
    try {
      if (typeof File === 'function' && navigator.canShare && navigator.share) {
        const file = new File([blob], name, { type: blob.type || 'image/png' });
        if (navigator.canShare({ files: [file] })) {
          try { await navigator.share({ files: [file], title: title || name }); return 'shared'; }
          catch (err) { if (err && err.name === 'AbortError') return 'cancelled'; }
        }
      }
    } catch { /* fall back to download */ }
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = name; a.rel = 'noopener';
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 10000);
    return 'downloaded';
  }

  function phoneMessage(result) {
    if (result === 'shared') return L('Sent. Choose Save image or Photos to keep it.');
    if (result === 'downloaded') return L('Picture saved to your downloads.');
    return '';
  }

  function dateLabel(ms) {
    try { return new Date(ms).toLocaleDateString(MsbI18n && MsbI18n.lang() === 'es' ? 'es' : 'en', { year: 'numeric', month: 'short', day: 'numeric' }); }
    catch { return new Date(ms).toDateString(); }
  }

  function objectUrl(blob) { const u = URL.createObjectURL(blob); urls.push(u); return u; }
  function releaseUrls() { while (urls.length) URL.revokeObjectURL(urls.pop()); }

  function sectionHtml() {
    return `<section class="card drawings-card" id="drawings-section" data-i18n-skip aria-labelledby="drawings-title"><span class="eyebrow">${esc(L('ON THIS PHONE'))}</span><h2 id="drawings-title">${esc(L('My drawings'))}</h2><p class="muted">${esc(L('Pictures you save from the coloring book stay on this phone. They are not sent anywhere.'))}</p><div class="drawings-grid" data-drawings-grid><p class="muted">${esc(L('Loading your drawings…'))}</p></div><p class="small drawings-status" data-drawings-status aria-live="polite"></p></section>`;
  }

  async function fill(host) {
    if (!host) return;
    const grid = host.querySelector('[data-drawings-grid]');
    const s = getStore();
    if (!s) { grid.innerHTML = `<p class="muted">${esc(L('Saving drawings is not available in this browser.'))}</p>`; return; }
    let rows = [];
    try { rows = await s.list(); } catch { grid.innerHTML = `<p class="muted">${esc(L('Your drawings could not be opened.'))}</p>`; return; }
    if (!host.isConnected) return;
    releaseUrls();
    if (!rows.length) {
      grid.innerHTML = `<p class="muted">${esc(L('No drawings yet. In Stories, open the coloring book, color a page, and tap Save to My drawings.'))}</p><button type="button" class="secondary" data-nav="stories">${esc(L('Open the coloring book'))}</button>`;
      return;
    }
    grid.innerHTML = rows.map(row => `<button type="button" class="drawing-thumb" data-drawing-open="${esc(row.id)}" aria-label="${esc(row.title + ', ' + dateLabel(row.updated))}"><img src="${objectUrl(row.thumb || row.image)}" alt="" width="360" height="203" loading="lazy" decoding="async"><span class="drawing-name">${esc(row.title)}</span><span class="drawing-date">${esc(dateLabel(row.updated))}</span></button>`).join('');
  }

  function refresh() { const host = document.getElementById('drawings-section'); if (host) fill(host); }

  async function openViewer(id) {
    const s = getStore(); if (!s) return;
    const row = await s.get(id);
    if (!row || !window.msbDialogHtml) return;
    const src = objectUrl(row.image);
    window.msbDialogHtml(`<div class="drawing-viewer" data-i18n-skip data-drawing-viewer="${esc(row.id)}"><span class="eyebrow">${esc(L('My drawings'))}</span><h2 id="dialog-title">${esc(row.title)}</h2><p class="small muted">${esc(dateLabel(row.updated))}</p><img class="drawing-big" src="${src}" alt="${esc(L('Colored picture: ') + row.title)}"><div class="drawing-actions"><button type="button" class="primary" data-drawing-continue="${esc(row.id)}">${esc(L('🖍️ Keep coloring'))}</button><button type="button" class="secondary" data-drawing-phone="${esc(row.id)}">${esc(L('📱 Save to phone'))}</button><button type="button" class="secondary danger" data-drawing-delete="${esc(row.id)}">${esc(L('🗑️ Delete'))}</button></div><div class="drawing-confirm" data-drawing-confirm hidden><p>${esc(L('Delete this drawing from this phone? This cannot be undone.'))}</p><button type="button" class="primary danger" data-drawing-delete-yes="${esc(row.id)}">${esc(L('Yes, delete it'))}</button><button type="button" class="secondary" data-drawing-delete-no>${esc(L('Keep it'))}</button></div><p class="small" data-drawing-msg aria-live="polite"></p></div>`);
  }

  function viewerMsg(text) { const node = document.querySelector('[data-drawing-msg]'); if (node) node.textContent = text; }
  function sectionMsg(text) { const node = document.querySelector('[data-drawings-status]'); if (node) node.textContent = text; }

  document.addEventListener('click', async event => {
    const target = event.target;
    if (!(target instanceof Element)) return;
    const open = target.closest('[data-drawing-open]');
    if (open) { openViewer(open.dataset.drawingOpen); return; }
    const phone = target.closest('[data-drawing-phone]');
    if (phone) {
      const row = await getStore()?.get(phone.dataset.drawingPhone);
      if (row) viewerMsg(phoneMessage(await toPhone(row.image, row.page, row.title)));
      return;
    }
    const cont = target.closest('[data-drawing-continue]');
    if (cont) {
      const row = await getStore()?.get(cont.dataset.drawingContinue);
      if (!row) return;
      if (window.msbCloseDialog) window.msbCloseDialog();
      if (window.MsbStories && MsbStories.openColoring) MsbStories.openColoring(row.page, row.id);
      if (typeof window.nav === 'function') window.nav('stories');
      window.scrollTo({ top: 0, behavior: 'auto' });
      return;
    }
    const del = target.closest('[data-drawing-delete]');
    if (del) { const box = document.querySelector('[data-drawing-confirm]'); if (box) { box.hidden = false; box.querySelector('[data-drawing-delete-no]')?.focus(); } return; }
    if (target.closest('[data-drawing-delete-no]')) { const box = document.querySelector('[data-drawing-confirm]'); if (box) box.hidden = true; return; }
    const yes = target.closest('[data-drawing-delete-yes]');
    if (yes) {
      await getStore()?.remove(yes.dataset.drawingDeleteYes);
      if (window.msbCloseDialog) window.msbCloseDialog();
      refresh();
      sectionMsg(L('Drawing deleted.'));
    }
  });

  /* Backup: drawings travel in the backup file as data URLs. */
  function blobToDataUrl(blob) {
    return new Promise((resolve, reject) => { const r = new FileReader(); r.onload = () => resolve(String(r.result)); r.onerror = () => reject(r.error); r.readAsDataURL(blob); });
  }
  function dataUrlToBlob(url) {
    const [head, body] = url.split(',');
    const type = (head.match(/^data:([^;]+)/) || [])[1] || 'image/png';
    const bin = atob(body), bytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i += 1) bytes[i] = bin.charCodeAt(i);
    return new Blob([bytes], { type });
  }
  async function backupEntries() {
    const s = getStore(); if (!s) return [];
    const rows = await s.list();
    const out = [];
    for (const row of rows) {
      out.push({ id: row.id, page: row.page, title: row.title, created: row.created, updated: row.updated, image: await blobToDataUrl(row.image), layer: row.layer ? await blobToDataUrl(row.layer) : null, thumb: row.thumb ? await blobToDataUrl(row.thumb) : null });
    }
    return out;
  }
  async function restoreEntries(list) {
    const s = getStore(); if (!s || !Array.isArray(list)) return 0;
    let n = 0;
    for (const row of list) {
      if (!MsbDrawingsStore.validBackupEntry(row)) continue;
      await s.putRaw({ id: row.id, page: row.page, title: row.title, created: row.created, updated: row.updated, image: dataUrlToBlob(row.image), layer: row.layer ? dataUrlToBlob(row.layer) : null, thumb: row.thumb ? dataUrlToBlob(row.thumb) : null });
      n += 1;
    }
    return n;
  }

  window.MsbDrawings = { store: getStore, toPhone, phoneMessage, sectionHtml, fill, refresh, backupEntries, restoreEntries };
})();
