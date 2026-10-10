/* Love in Scripture — short passages in the active translation, with send-a-verse. */
(() => {
  'use strict';
  const esc = value => String(value ?? '').replace(/[&<>"']/g, char => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[char]));
  const es = () => !!(window.MsbI18n && MsbI18n.lang() === 'es');
  const passages = [
    { id: 'song-come', book: 22, chapter: 2, verses: [10, 11, 12, 13, 14], ref: 'Song of Songs 2:10–14', refEs: 'Cantar de los Cantares 2:10–14', note: 'A beloved voice says, come with me. Love here is tender and unhurried.', noteEs: 'Una voz amada dice: ven conmigo. El amor aquí es tierno y sin prisa.' },
    { id: 'song-seal', book: 22, chapter: 8, verses: [6, 7], ref: 'Song of Songs 8:6–7', refEs: 'Cantar de los Cantares 8:6–7', note: 'Love, set as a seal. Many waters cannot put it out.', noteEs: 'El amor, puesto como un sello. Las muchas aguas no lo apagan.' },
    { id: 'ruth', book: 8, chapter: 1, verses: [16, 17], ref: 'Ruth 1:16–17', refEs: 'Rut 1:16–17', note: 'Where you go, I will go. A promise to stay.', noteEs: 'Donde tú fueres, iré yo. Una promesa de quedarse.' },
    { id: 'corinth', book: 46, chapter: 13, verses: [4, 5, 6, 7, 8, 13], ref: '1 Corinthians 13:4–8, 13', refEs: '1 Corintios 13:4–8, 13', note: 'Love is patient. It does not keep a list of wrongs.', noteEs: 'El amor es sufrido. No lleva la cuenta de los agravios.' },
    { id: 'john', book: 62, chapter: 4, verses: [7, 8, 9, 10, 11, 12, 16, 18, 19], ref: '1 John 4:7–12, 16, 18–19', refEs: '1 Juan 4:7–12, 16, 18–19', note: 'We love because God loved us first.', noteEs: 'Nosotros amamos porque Dios nos amó primero.' },
    { id: 'eph', book: 49, chapter: 5, verses: [25], ref: 'Ephesians 5:25', refEs: 'Efesios 5:25', note: 'Love that gives itself, as Christ loved the church.', noteEs: 'Un amor que se entrega, como Cristo amó a la iglesia.' },
    { id: 'prov', book: 20, chapter: 31, verses: [10, 11, 12, 25, 26, 28, 29, 30], ref: 'Proverbs 31:10–12, 25–30', refEs: 'Proverbios 31:10–12, 25–30', note: 'A portrait of a person whose strength and kindness are worth more than jewels.', noteEs: 'El retrato de una persona cuya fuerza y bondad valen más que las joyas.' },
    { id: 'rom', book: 45, chapter: 8, verses: [38, 39], ref: 'Romans 8:38–39', refEs: 'Romanos 8:38–39', note: 'Nothing can separate us from the love of God.', noteEs: 'Nada puede separarnos del amor de Dios.' },
    { id: 'jer', book: 24, chapter: 31, verses: [3], ref: 'Jeremiah 31:3', refEs: 'Jeremías 31:3', note: 'An everlasting love, and a kindness that does not let go.', noteEs: 'Un amor eterno, y una misericordia que no suelta.' },
    { id: 'zeph', book: 36, chapter: 3, verses: [17], ref: 'Zephaniah 3:17', refEs: 'Sofonías 3:17', note: 'God quiets us with his love.', noteEs: 'Dios nos aquieta con su amor.' },
    { id: 'isa', book: 23, chapter: 54, verses: [10], ref: 'Isaiah 54:10', refEs: 'Isaías 54:10', note: 'Mountains may move. The covenant of peace does not.', noteEs: 'Los montes pueden moverse. El pacto de paz, no.' },
    { id: 'col', book: 51, chapter: 3, verses: [14], ref: 'Colossians 3:14', refEs: 'Colosenses 3:14', note: 'Put on love, the bond that holds the rest together.', noteEs: 'Vístanse de amor, el vínculo que mantiene todo unido.' }
  ];
  const cache = new Map();

  function fileFor(item) {
    const id = String(item.book).padStart(2, '0');
    return es() && item.book <= 66 ? `bible/rvr/${id}.json` : `bible/${id}.json`;
  }

  let offline = null;
  async function offlineVerses() {
    if (!offline) offline = fetch('data/offline-verses.json').then(r => r.ok ? r.json() : {}).then(d => (d && d.verses) || {}).catch(() => ({}));
    return offline;
  }

  async function textOf(item) {
    const key = `${es() ? 'es' : 'en'}:${item.id}`;
    if (cache.has(key)) return cache.get(key);
    const saved = await offlineVerses();
    const translation = es() && item.book <= 66 ? 'rvr' : 'kjv';
    const quick = item.verses.map(verse => saved[`${item.book}:${item.chapter}:${verse}`]?.[translation] || '');
    if (quick.every(Boolean)) { const text = quick.join(' '); cache.set(key, text); return text; }
    const response = await fetch(fileFor(item));
    if (!response.ok) throw Error('That passage is not on this device yet.');
    const data = await response.json();
    const chapter = data.chapters[item.chapter - 1] || [];
    const lines = item.verses.map(verse => String(chapter[verse - 1] || '').trim()).filter(Boolean);
    const text = lines.join(' ');
    cache.set(key, text);
    return text;
  }

  function heart(card) {
    if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const node = document.createElement('span');
    node.className = 'love-heart';
    node.setAttribute('aria-hidden', 'true');
    node.textContent = '♥';
    (card || document.body).appendChild(node);
    setTimeout(() => node.remove(), 1200);
  }

  async function show(root) {
    root.innerHTML = `<button class="text-button back" data-nav="today" type="button">← Home</button><span class="eyebrow">FOR SOMEONE YOU LOVE</span><h1>Love in Scripture</h1><p class="lead">A quiet corner of passages about love. Each one is in the translation you are reading, ready to send.</p><div id="love-list"><p class="muted">Opening the passages…</p></div>`;
    const host = root.querySelector('#love-list');
    const cards = [];
    for (const item of passages) {
      let text = '';
      try { text = await textOf(item); }
      catch { text = ''; }
      const ref = es() ? item.refEs : item.ref;
      const note = es() ? item.noteEs : item.note;
      cards.push(`<article class="card love-card" data-love="${esc(item.id)}"><span class="eyebrow">${esc(ref)}</span><p class="love-text">${esc(text || (es() ? 'Este pasaje todavía no está en el dispositivo.' : 'This passage is not on this device yet.'))}</p><p class="small">${esc(note)}</p><button type="button" class="primary" data-love-send="${esc(item.id)}" ${text ? '' : 'disabled'}>Send to my person</button></article>`);
    }
    if (host) host.innerHTML = cards.join('');
    if (window.MsbI18n) MsbI18n.apply(root);
  }

  document.addEventListener('click', async event => {
    const button = event.target.closest('[data-love-send]');
    if (!button) return;
    const item = passages.find(entry => entry.id === button.dataset.loveSend);
    if (!item || !window.msbOpenVerseSend) return;
    button.disabled = true;
    try {
      const text = await textOf(item);
      const ref = es() ? item.refEs : item.ref;
      await window.msbOpenVerseSend({
        book: item.book,
        chapter: item.chapter,
        verse: item.verses[0],
        text,
        reference: ref,
        translation: es() && item.book <= 66 ? 'rvr' : 'kjv',
        onSent: () => heart(button.closest('.love-card'))
      });
    } catch (error) {
      const toast = document.getElementById('toast');
      if (toast) { toast.textContent = error.message; toast.classList.add('show'); }
    } finally {
      button.disabled = false;
    }
  });

  window.MsbLove = { show };
})();
