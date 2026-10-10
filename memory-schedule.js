/* How a memory verse fades. Day 1 shows every word. Each later day hides more,
   in a stable order, until day 6 leaves only blanks. */
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  root.MsbMemorySchedule = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  function tokenize(text) {
    const parts = String(text || '').match(/[A-Za-z0-9\u00C0-\u024F']+|[^A-Za-z0-9\u00C0-\u024F']+/g) || [];
    return parts.map(part => ({ text: part, word: /[A-Za-z0-9\u00C0-\u024F]/.test(part) }));
  }

  function parseDay(iso) {
    const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(iso || ''));
    if (!match) return NaN;
    return Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
  }

  function dayNumber(startedOn, today) {
    const start = parseDay(startedOn);
    const now = parseDay(today);
    if (!Number.isFinite(start) || !Number.isFinite(now)) return 1;
    const diff = Math.round((now - start) / 86400000);
    return Math.max(1, diff + 1);
  }

  function hideCount(wordCount, day) {
    const words = Math.max(0, Number(wordCount) || 0);
    const current = Math.max(1, Number(day) || 1);
    if (!words || current <= 1) return 0;
    if (current >= 6) return words;
    const fraction = [0, 0, 0.2, 0.4, 0.6, 0.8][current];
    return Math.min(words, Math.max(1, Math.round(words * fraction)));
  }

  function hashString(value) {
    let hash = 2166136261;
    const text = String(value || '');
    for (let i = 0; i < text.length; i += 1) {
      hash ^= text.charCodeAt(i);
      hash = Math.imul(hash, 16777619);
    }
    return hash >>> 0;
  }

  function hiddenWordIndexes(text, day, seed) {
    const tokens = tokenize(text);
    const words = [];
    tokens.forEach((token, index) => { if (token.word) words.push(index); });
    const count = hideCount(words.length, day);
    const order = words.slice();
    let state = hashString(seed || text);
    for (let i = order.length - 1; i > 0; i -= 1) {
      state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
      const swap = state % (i + 1);
      const held = order[i];
      order[i] = order[swap];
      order[swap] = held;
    }
    return order.slice(0, count).sort((a, b) => a - b);
  }

  function normalizeWord(value) {
    return String(value || '').trim().toLowerCase().replace(/^[^a-z0-9\u00c0-\u024f']+|[^a-z0-9\u00c0-\u024f']+$/gi, '');
  }

  function wordsMatch(expected, typed) {
    return normalizeWord(expected) === normalizeWord(typed) && normalizeWord(expected) !== '';
  }

  return { tokenize, dayNumber, hideCount, hiddenWordIndexes, normalizeWord, wordsMatch };
});
