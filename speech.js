/* Shared read-aloud: Spanish or English voice, speed, pause, and a screen wake lock. */
(() => {
  'use strict';
  const KEY = 'msb_speech_rate';
  const RATES = [0.8, 1, 1.2];
  let lock = null;
  let session = null;

  function rate() {
    const n = Number(localStorage.getItem(KEY));
    return RATES.includes(n) ? n : 1;
  }

  function setRate(n) {
    const next = RATES.includes(n) ? n : 1;
    try { localStorage.setItem(KEY, String(next)); } catch { /* private mode */ }
    document.querySelectorAll('[data-speech-rate]').forEach(button => {
      const on = Number(button.dataset.speechRate) === next;
      button.setAttribute('aria-pressed', on ? 'true' : 'false');
      button.classList.toggle('active', on);
    });
  }

  function wantsSpanish(lang) {
    if (lang) return String(lang).toLowerCase().startsWith('es');
    return !!(window.MsbI18n && MsbI18n.lang() === 'es');
  }

  function pickVoice(spanish) {
    const voices = window.speechSynthesis?.getVoices?.() || [];
    const langOf = voice => String(voice.lang || '').toLowerCase().replace('_', '-');
    if (spanish) {
      for (const pref of ['es-us', 'es-mx', 'es-419', 'es-es', 'es']) {
        const hit = voices.find(voice => langOf(voice).startsWith(pref));
        if (hit) return hit;
      }
      return null;
    }
    return voices.find(voice => langOf(voice).startsWith('en-us'))
      || voices.find(voice => langOf(voice).startsWith('en'))
      || null;
  }

  function supported() {
    return !!(window.speechSynthesis && typeof SpeechSynthesisUtterance === 'function');
  }

  function toast(message) {
    const text = window.MsbI18n ? MsbI18n.t(message) : message;
    const el = document.getElementById('toast');
    if (!el) return;
    el.textContent = text;
    el.classList.add('show');
    clearTimeout(toast._timer);
    toast._timer = setTimeout(() => el.classList.remove('show'), 2600);
  }

  async function wake(on) {
    if (!on) {
      const current = lock;
      lock = null;
      try { await current?.release(); } catch { /* already released */ }
      return;
    }
    if (!navigator.wakeLock?.request || lock) return;
    try { lock = await navigator.wakeLock.request('screen'); } catch { lock = null; }
  }

  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible' && session && !session.paused) wake(true);
  });

  function clearMarks() {
    document.querySelectorAll('.speech-current').forEach(el => el.classList.remove('speech-current'));
  }

  function yieldAudio(on) {
    if (!window.msbYieldAudio) return;
    try { window.msbYieldAudio('speech', on); } catch { /* ignore */ }
  }

  function finish(state) {
    if (session === state) session = null;
    wake(false);
    yieldAudio(false);
    clearMarks();
    paintPause(false);
    if (state.onDone) state.onDone();
  }

  function paintPause(paused) {
    document.querySelectorAll('[data-speech-pause], [data-bible="speak-pause"]').forEach(button => {
      button.setAttribute('aria-pressed', paused ? 'true' : 'false');
    });
  }

  function speakChunk(state) {
    const chunk = state.chunks[state.index];
    if (!chunk) { finish(state); return; }
    const utter = new SpeechSynthesisUtterance(String(chunk.text || ''));
    const spanish = wantsSpanish(state.lang);
    utter.lang = spanish ? 'es-MX' : 'en-US';
    utter.rate = rate();
    const voice = pickVoice(spanish);
    if (voice) utter.voice = voice;
    const generation = state.generation;
    utter.onend = () => {
      if (session !== state || state.generation !== generation || state.paused) return;
      state.index += 1;
      speakChunk(state);
    };
    utter.onerror = () => {
      if (session === state && state.generation === generation) finish(state);
    };
    clearMarks();
    if (chunk.el) chunk.el.classList.add('speech-current');
    if (state.onChunk) state.onChunk(chunk, state.index);
    try { window.speechSynthesis.speak(utter); }
    catch { finish(state); }
  }

  function speak(options) {
    if (!supported()) { toast('This browser cannot read aloud.'); return false; }
    stop();
    const chunks = (options.chunks || []).filter(chunk => chunk && String(chunk.text || '').trim());
    if (!chunks.length) return false;
    const state = {
      generation: 1,
      paused: false,
      index: 0,
      chunks,
      lang: options.lang || (wantsSpanish() ? 'es' : 'en'),
      onChunk: options.onChunk,
      onDone: options.onDone
    };
    session = state;
    yieldAudio(true);
    wake(true);
    paintPause(false);
    const start = () => { if (session === state) speakChunk(state); };
    const synth = window.speechSynthesis;
    if (wantsSpanish(state.lang) && !synth.getVoices().length) {
      const once = () => { synth.removeEventListener('voiceschanged', once); start(); };
      synth.addEventListener('voiceschanged', once);
      setTimeout(start, 350);
    } else start();
    return true;
  }

  function stop() {
    if (session) session.generation += 1;
    const previous = session;
    session = null;
    try { window.speechSynthesis?.cancel(); } catch { /* ignore */ }
    wake(false);
    yieldAudio(false);
    clearMarks();
    paintPause(false);
    if (previous && previous.onDone) previous.onDone();
  }

  function pause() {
    if (!session || session.paused) return;
    session.paused = true;
    session.generation += 1;
    try { window.speechSynthesis?.cancel(); } catch { /* ignore */ }
    wake(false);
    yieldAudio(false);
    paintPause(true);
  }

  function resume() {
    if (!session || !session.paused) return;
    session.paused = false;
    session.generation += 1;
    yieldAudio(true);
    wake(true);
    paintPause(false);
    speakChunk(session);
  }

  function rateHtml() {
    const current = rate();
    return `<span class="speech-rates">${RATES.map(n => `<button type="button" class="secondary speech-rate${current === n ? ' active' : ''}" data-speech-rate="${n}" aria-pressed="${current === n}">${n === 1 ? '1×' : `${n}×`}</button>`).join('')}</span>`;
  }

  document.addEventListener('click', event => {
    const rateButton = event.target.closest('[data-speech-rate]');
    if (rateButton) { setRate(Number(rateButton.dataset.speechRate)); return; }
    if (event.target.closest('[data-speech-stop]')) { stop(); return; }
    if (event.target.closest('[data-speech-pause]')) {
      if (session?.paused) resume();
      else pause();
    }
  });

  window.MsbSpeech = { speak, pause, resume, stop, rate, setRate, pickVoice, rateHtml, supported, wake, wantsSpanish };
})();
