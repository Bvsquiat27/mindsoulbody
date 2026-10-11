/* Saved coloring-book drawings ("My drawings"). Everything stays on this
   device in IndexedDB: the finished picture (paper + color + outlines), the
   color layer alone (so a drawing can be reopened and colored further), and
   a small thumbnail. Nothing is sent to the friends server.
   The store logic takes a small backend ({ get, put, delete, all }) so it can
   be tested in Node with an in-memory backend. */
(function (root) {
  'use strict';

  const DB_NAME = 'msb-drawings';
  const STORE = 'drawings';
  const MAX_TITLE = 120;

  function newId(now) {
    const rand = Math.random().toString(36).slice(2, 8);
    return `d${now.toString(36)}${rand}`;
  }

  function isBlobLike(value) {
    return !!value && typeof value === 'object' && typeof value.size === 'number' && typeof value.type === 'string';
  }

  function createStore(backend, options) {
    const clock = (options && options.now) || (() => Date.now());

    async function list() {
      const rows = await backend.all();
      return rows.filter(Boolean).sort((a, b) => (b.updated - a.updated) || (b.created - a.created));
    }

    /* Save a drawing. With { updateId } the existing entry keeps its id and
       creation date and gets the new picture; otherwise a new entry is made. */
    async function save(input, choice) {
      if (!input || typeof input.page !== 'string' || !input.page) throw new Error('page');
      if (!isBlobLike(input.image)) throw new Error('image');
      const now = clock();
      const updateId = choice && choice.updateId;
      const existing = updateId ? await backend.get(updateId) : null;
      const record = {
        id: existing ? existing.id : newId(now),
        page: input.page,
        title: String(input.title || input.page).slice(0, MAX_TITLE),
        created: existing ? existing.created : now,
        updated: now,
        image: input.image,
        layer: isBlobLike(input.layer) ? input.layer : null,
        thumb: isBlobLike(input.thumb) ? input.thumb : null
      };
      await backend.put(record);
      return record;
    }

    async function get(id) { return id ? (await backend.get(id)) || null : null; }
    async function remove(id) { if (id) await backend.delete(id); }

    /* Latest saved drawing of one page, used to offer "update or new copy". */
    async function latestFor(page) {
      return (await list()).find(row => row.page === page) || null;
    }

    /* Put a whole record as-is (restoring a backup). */
    async function putRaw(row) { await backend.put(row); return row; }

    return { list, save, get, remove, latestFor, putRaw };
  }

  function memoryBackend() {
    const rows = new Map();
    return {
      async get(id) { return rows.get(id) || null; },
      async put(row) { rows.set(row.id, row); },
      async delete(id) { rows.delete(id); },
      async all() { return [...rows.values()]; }
    };
  }

  function idbBackend(indexedDB) {
    let opening = null;
    function db() {
      if (!opening) {
        opening = new Promise((resolve, reject) => {
          const req = indexedDB.open(DB_NAME, 1);
          req.onupgradeneeded = () => { if (!req.result.objectStoreNames.contains(STORE)) req.result.createObjectStore(STORE, { keyPath: 'id' }); };
          req.onsuccess = () => resolve(req.result);
          req.onerror = () => { opening = null; reject(req.error || new Error('indexeddb')); };
        });
      }
      return opening;
    }
    function run(mode, work) {
      return db().then(conn => new Promise((resolve, reject) => {
        const tx = conn.transaction(STORE, mode);
        const store = tx.objectStore(STORE);
        let result;
        const req = work(store);
        if (req) req.onsuccess = () => { result = req.result; };
        tx.oncomplete = () => resolve(result);
        tx.onerror = () => reject(tx.error || new Error('indexeddb'));
        tx.onabort = () => reject(tx.error || new Error('indexeddb'));
      }));
    }
    return {
      get: id => run('readonly', s => s.get(id)).then(v => v || null),
      put: row => run('readwrite', s => s.put(row)).then(() => undefined),
      delete: id => run('readwrite', s => s.delete(id)).then(() => undefined),
      all: () => run('readonly', s => s.getAll()).then(v => v || [])
    };
  }

  /* Backup entries: pictures as data URLs, checked before anything is stored. */
  const DATA_URL = /^data:image\/(?:png|jpeg|webp);base64,[A-Za-z0-9+/]+={0,2}$/;
  function validBackupEntry(row) {
    if (!row || typeof row !== 'object') return false;
    if (typeof row.id !== 'string' || !/^[a-z0-9]{4,40}$/i.test(row.id)) return false;
    if (typeof row.page !== 'string' || !/^[a-z0-9-]{1,40}$/.test(row.page)) return false;
    if (typeof row.title !== 'string' || row.title.length > MAX_TITLE) return false;
    if (!Number.isFinite(row.created) || !Number.isFinite(row.updated)) return false;
    for (const key of ['image', 'layer', 'thumb']) {
      const v = row[key];
      if (key === 'image' ? !(typeof v === 'string' && v.length < 12000000 && DATA_URL.test(v)) : !(v == null || (typeof v === 'string' && v.length < 12000000 && DATA_URL.test(v)))) return false;
    }
    return true;
  }

  const api = { createStore, memoryBackend, idbBackend, validBackupEntry, DB_NAME, STORE };
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.MsbDrawingsStore = api;
})(typeof self !== 'undefined' ? self : this);
