/* Unlock rules for the two playful badges. The 7-day badge uses the streak
   count the app already keeps (read days and finished studies). The multitask
   badge needs one finished lesson and one finished game on the same local day. */
(function (root, factory) {
  const api = factory();
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (root) {
    root.msbBadgeLocalDay = api.msbBadgeLocalDay;
    root.msbBadgeMultitask = api.msbBadgeMultitask;
    root.msbBadgeStrong = api.msbBadgeStrong;
  }
})(typeof window !== 'undefined' ? window : globalThis, function () {
  function pad(n) { return String(n).padStart(2, '0'); }
  function msbBadgeLocalDay(input) {
    let date;
    if (input instanceof Date) date = input;
    else if (typeof input === 'number' && Number.isFinite(input)) date = new Date(input < 1e12 ? input * 1000 : input);
    else date = new Date();
    return date.getFullYear() + '-' + pad(date.getMonth() + 1) + '-' + pad(date.getDate());
  }
  function msbBadgeLessonDays(store) {
    const days = new Set();
    const data = store || {};
    for (const row of data.progress || []) {
      if (row && row.completed_at) days.add(msbBadgeLocalDay(row.completed_at));
    }
    for (const row of data.challenges || []) {
      if (row && row.finishedOn && row.kind !== 'game') days.add(String(row.finishedOn));
    }
    const extra = data.dayMarks && data.dayMarks.lessons;
    if (Array.isArray(extra)) for (const day of extra) if (day) days.add(String(day));
    return days;
  }
  function msbBadgeGameDays(store) {
    const days = new Set();
    const data = store || {};
    const scores = data.gameScores && typeof data.gameScores === 'object' ? data.gameScores : {};
    for (const entry of Object.values(scores)) {
      if (!entry || typeof entry !== 'object') continue;
      if (Array.isArray(entry.days)) for (const day of entry.days) if (day) days.add(String(day));
      if (entry.finishedOn) days.add(String(entry.finishedOn));
    }
    for (const row of data.challenges || []) {
      if (row && row.kind === 'game' && row.finishedOn) days.add(String(row.finishedOn));
    }
    const extra = data.dayMarks && data.dayMarks.games;
    if (Array.isArray(extra)) for (const day of extra) if (day) days.add(String(day));
    return days;
  }
  function msbBadgeMultitask(store) {
    const games = msbBadgeGameDays(store);
    for (const day of msbBadgeLessonDays(store)) if (games.has(day)) return true;
    return false;
  }
  function msbBadgeStrong(streak) {
    return Number(streak) >= 7;
  }
  return { msbBadgeLocalDay, msbBadgeLessonDays, msbBadgeGameDays, msbBadgeMultitask, msbBadgeStrong };
});
