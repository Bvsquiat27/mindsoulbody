/* Map Journey: follow the Exodus route or Paul's voyage on a simple map.
   At each stop answer a question; a right answer shows that stop's verse
   and the traveler moves on. */
(() => {
  'use strict';
  const K = window.MsbKidGames; if (!K) return;
  const { t, esc, lang, name, sound, buzz, prog, award, render, verseHtml, gameHead, reduced } = K._helpers;
  const D = () => window.MsbKidGamesData, C = () => window.MsbKidGamesCore;
  const maps = () => D().MAPS;

  /* Original, simplified map art (not to scale). */
  const LAND = {
    exodus: `<rect width="400" height="280" fill="#e9d29a"/>
      <path d="M0 0 H400 V22 Q300 30 200 18 Q100 10 0 26 Z" fill="#7fb7d6"/>
      <path d="M40 30 Q48 120 30 280" fill="none" stroke="#5fa1c8" stroke-width="7" stroke-linecap="round"/>
      <path d="M96 40 Q120 60 118 110 Q150 180 230 280 L262 280 Q190 190 150 120 Q128 70 110 40 Z" fill="#7fb7d6"/>
      <path d="M330 120 Q318 190 290 280 L310 280 Q336 200 344 120 Z" fill="#7fb7d6"/>
      <g fill="#cdb06d" opacity=".7"><path d="M250 250 l14 -26 l14 26 z"/><path d="M270 256 l10 -18 l10 18 z"/><path d="M200 120 l10 -16 l10 16 z"/></g>
      <g fill="#6fa86a"><circle cx="146" cy="176" r="4"/><circle cx="156" cy="178" r="4"/><circle cx="151" cy="186" r="4"/></g>
      <text x="40" y="58" class="kg-map-label">${esc(t('Egypt', 'Egipto'))}</text><text x="300" y="60" class="kg-map-label">${esc(t('Canaan', 'Canaán'))}</text>`,
    sea: `<rect width="400" height="280" fill="#7fb7d6"/>
      <path d="M0 0 H150 Q120 30 110 60 Q100 90 120 120 Q132 140 118 150 Q96 130 84 104 Q70 76 40 60 Q20 50 0 52 Z" fill="#e9d29a"/>
      <path d="M96 150 Q112 146 120 156 Q110 166 96 162 Z" fill="#e9d29a"/>
      <path d="M150 0 H300 Q270 40 250 80 Q240 120 222 120 Q212 96 200 80 Q180 60 170 30 Z" fill="#e9d29a"/>
      <path d="M210 176 Q240 168 268 178 Q240 190 210 184 Z" fill="#e9d29a"/>
      <path d="M300 0 H400 V120 Q370 110 340 116 Q300 110 270 96 Q290 60 300 0 Z" fill="#e9d29a"/>
      <path d="M400 120 V280 H330 Q360 240 362 200 Q368 160 380 130 Z" fill="#e9d29a"/>
      <path d="M0 280 V236 Q100 222 200 240 Q280 252 330 280 Z" fill="#e9d29a"/>
      <circle cx="108" cy="178" r="4" fill="#e9d29a" stroke="#b89a5a"/>
      <text x="38" y="30" class="kg-map-label">${esc(t('Italy', 'Italia'))}</text><text x="196" y="34" class="kg-map-label">${esc(t('Greece', 'Grecia'))}</text><text x="160" y="268" class="kg-map-label">${esc(t('Africa', 'África'))}</text>`
  };
  function start() { return { view: 'pick', at: 0 }; }
  function begin(s, i) { Object.assign(s, { view: 'play', at: i, stop: 0, answered: false, mistakes: 0, wrong: [], opts: null, done: false, lang: lang() }); s.opts = C().stopChoices(maps()[i].stops[0], lang()); }
  const starRow = n => `<span class="kg-stars" aria-label="${esc(t('{n} of 3 stars', '{n} de 3 estrellas', { n }))}">${[1, 2, 3].map(k => `<i class="${k <= n ? 'on' : ''}" aria-hidden="true">★</i>`).join('')}</span>`;
  function pickHtml() {
    const v = prog().get();
    return `<p class="kg-lead">${esc(t('Travel with God\u2019s people. Answer at every stop to move on.', 'Viaja con el pueblo de Dios. Responde en cada parada para seguir.'))}</p><ul class="kg-picks">${maps().map((m, i) => { const st = Number(v.best[`map:${m.id}`]) || 0; return `<li><button type="button" class="card kg-pick${st ? ' done' : ''}" data-mp-pick="${i}"><span class="kg-pick-icon" aria-hidden="true">${m.icon}</span><span><strong>${esc(name(m.title))}</strong><small>${esc(t('{n} stops', '{n} paradas', { n: m.stops.length }))}</small>${st ? starRow(st) : ''}</span></button></li>`; }).join('')}</ul>`;
  }
  function mapSvg(s) {
    const m = maps()[s.at], st = m.stops, here = st[s.stop];
    const pts = st.map(p => `${p.x},${p.y}`).join(' ');
    const done = st.slice(0, s.stop + 1).map(p => `${p.x},${p.y}`).join(' ');
    const dots = st.map((p, i) => `<g class="kg-map-stop${i < s.stop || (i === s.stop && s.answered) ? ' done' : ''}${i === s.stop ? ' here' : ''}"><circle cx="${p.x}" cy="${p.y}" r="${i === s.stop ? 9 : 6}"/><text x="${p.x + (p.x > 300 ? -10 : 10)}" y="${p.y - 10}" text-anchor="${p.x > 300 ? 'end' : 'start'}" class="kg-map-name">${esc(name(p.name))}</text></g>`).join('');
    return `<div class="kg-map-wrap"><svg class="kg-map" viewBox="0 0 400 280" role="img" aria-label="${esc(t('Map: {title}, stop {n} of {total}, {stop}', 'Mapa: {title}, parada {n} de {total}, {stop}', { title: name(m.title), n: s.stop + 1, total: st.length, stop: name(here.name) }))}">${LAND[m.land]}<polyline points="${pts}" class="kg-map-route"/><polyline points="${done}" class="kg-map-route done"/>${dots}</svg><span class="kg-map-traveler${reduced() ? '' : ' move'}" aria-hidden="true" style="left:${here.x / 4}%;top:${here.y / 2.8}%">${m.travel}</span></div>`;
  }
  function playHtml(s) {
    const m = maps()[s.at], l = lang();
    if (s.done) {
      const n = C().stars(s.mistakes);
      return `${mapSvg(s)}<div class="kg-verse" role="status" aria-live="polite"><span class="eyebrow">${esc(t('JOURNEY COMPLETE!', '¡VIAJE COMPLETO!'))}</span><p class="kg-big">${m.icon}</p>${starRow(n)}<p>${esc(m.id === 'paul' ? t('God kept Paul and everyone on the ship safe, all the way to Rome.', 'Dios cuidó a Pablo y a todos en el barco, hasta llegar a Roma.') : t('God led His people every step of the way, with water, bread and His good law.', 'Dios guió a su pueblo en cada paso, con agua, pan y su buena ley.'))}</p><div class="kg-actions"><button type="button" class="primary" data-mp-list>${esc(t('Pick a journey', 'Escoger un viaje'))}</button></div></div>`;
    }
    const stop = m.stops[s.stop];
    const opts = s.opts.map((o, i) => `<button type="button" class="mini-choice${s.answered && o.right ? ' correct' : ''}${s.wrong.includes(i) ? ' incorrect' : ''}" data-mp-opt="${i}" ${s.answered || s.wrong.includes(i) ? 'disabled' : ''}>${esc(o.text)}</button>`).join('');
    const after = s.answered ? verseHtml(stop.verse, t('RIGHT!', '¡CORRECTO!'), `<button type="button" class="primary" data-mp-go>${esc(s.stop + 1 < m.stops.length ? (m.id === 'paul' ? t('Sail on ⛵', 'Seguir navegando ⛵') : t('Walk on 🚶', 'Seguir caminando 🚶')) : t('Finish the journey', 'Terminar el viaje'))}</button>`) : `<p class="kg-msg" role="status" aria-live="polite" data-kg-msg>${esc(s.wrong.length ? t('Not quite. Try another answer!', 'Casi. ¡Prueba otra respuesta!') : '')}</p>`;
    return `<p class="kg-sub">${esc(name(m.title))} · ${esc(t('Stop {n} of {total}', 'Parada {n} de {total}', { n: s.stop + 1, total: m.stops.length }))}</p>${mapSvg(s)}<h2 class="kg-map-q"><span aria-hidden="true">📍</span> ${esc(name(stop.name))}</h2><p class="kg-lead">${esc(stop.q[l])}</p><div class="mini-choices">${opts}</div>${after}`;
  }
  K._helpers.register({
    id: 'map', icon: '🗺️',
    name: { en: 'Map Journey', es: 'Viaje en el mapa' },
    blurb: { en: 'Follow the Exodus and Paul\u2019s voyage', es: 'Sigue el Éxodo y el viaje de Pablo' },
    total: () => maps().length,
    start,
    render(ui) { const s = ui.state; if (s.view === 'play' && !s.done && s.lang !== lang()) { s.lang = lang(); s.opts = C().stopChoices(maps()[s.at].stops[s.stop], lang()); s.wrong = []; } return gameHead(this) + (s.view === 'play' ? playHtml(s) : pickHtml()); },
    /* the traveler walks/sails from the last stop to this one */
    mount(screen, ui) {
      const s = ui.state, tr = screen.querySelector('.kg-map-traveler');
      if (!tr || s.from == null) return;
      const a = maps()[s.at].stops[s.from], b = maps()[s.at].stops[s.stop]; s.from = null;
      if (reduced()) return;
      tr.style.transition = 'none'; tr.style.left = `${a.x / 4}%`; tr.style.top = `${a.y / 2.8}%`;
      void tr.offsetWidth;
      tr.style.transition = ''; tr.style.left = `${b.x / 4}%`; tr.style.top = `${b.y / 2.8}%`;
    },
    click(event, ui) {
      const s = ui.state, el = event.target;
      const pick = el.closest('[data-mp-pick]'); if (pick) { begin(s, +pick.dataset.mpPick); sound('pick'); render(); window.scrollTo({ top: 0, behavior: 'auto' }); return; }
      const o = el.closest('[data-mp-opt]');
      if (o && !s.answered) {
        const i = +o.dataset.mpOpt;
        if (s.opts[i].right) { s.answered = true; sound('good'); buzz(18); render(); const g = document.querySelector('[data-mp-go]'); if (g) { g.focus({ preventScroll: true }); g.scrollIntoView({ block: 'center', behavior: reduced() ? 'auto' : 'smooth' }); } }
        else { s.wrong.push(i); s.mistakes += 1; sound('bad'); buzz(8); render(); const n = document.querySelector('[data-mp-opt]:not([disabled])'); if (n) n.focus({ preventScroll: true }); }
        return;
      }
      if (el.closest('[data-mp-go]')) {
        const m = maps()[s.at];
        if (s.stop + 1 >= m.stops.length) { s.done = true; prog().finish('map', m.id); prog().best(`map:${m.id}`, C().stars(s.mistakes)); sound('win'); buzz([20, 40, 30]); render(); award(); window.scrollTo({ top: 0, behavior: 'auto' }); return; }
        s.from = s.stop; s.stop += 1; s.answered = false; s.wrong = []; s.opts = C().stopChoices(m.stops[s.stop], lang());
        sound('whoosh'); buzz(10); render();
        const map = document.querySelector('.kg-map-wrap'); if (map) map.scrollIntoView({ block: 'start', behavior: reduced() ? 'auto' : 'smooth' });
        return;
      }
      if (el.closest('[data-mp-list]')) { s.view = 'pick'; sound('tap'); render(); window.scrollTo({ top: 0, behavior: 'auto' }); }
    }
  });
})();
