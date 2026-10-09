/* Local-day morning card selection. The day number matches moments.js pick(). */
import { MORNING } from './morning-cards.mjs';

export { MORNING };

export function localParts(ms, timeZone) {
  const format = new Intl.DateTimeFormat('en-US', {
    timeZone,
    hourCycle: 'h23',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
  const parts = {};
  for (const part of format.formatToParts(new Date(ms))) {
    if (part.type !== 'literal') parts[part.type] = part.value;
  }
  let hour = Number(parts.hour);
  if (hour === 24) hour = 0;
  return {
    year: Number(parts.year),
    month: Number(parts.month),
    day: Number(parts.day),
    hour,
    minute: Number(parts.minute),
  };
}

function ymd(parts) {
  const pad = (n) => String(n).padStart(2, '0');
  return `${parts.year}-${pad(parts.month)}-${pad(parts.day)}`;
}

export function zonedToUtc(year, month, day, hour, minute, timeZone) {
  const asUtc = Date.UTC(year, month - 1, day, hour, minute, 0);
  const offsetAt = (ms) => {
    const parts = localParts(ms, timeZone);
    return Date.UTC(parts.year, parts.month - 1, parts.day, parts.hour, parts.minute, 0) - ms;
  };
  const first = asUtc - offsetAt(asUtc);
  return asUtc - offsetAt(first);
}

export function clientDayNumber(ms, timeZone) {
  const parts = localParts(ms, timeZone);
  const start = zonedToUtc(parts.year - 1, 12, 31, 0, 0, timeZone);
  return Math.abs(Math.floor((ms - start) / 86400000));
}

export function morningCard(ms, timeZone, lang) {
  const item = MORNING[clientDayNumber(ms, timeZone) % MORNING.length];
  const spanish = lang === 'es';
  return {
    prayer: spanish ? item.prayerEs : item.prayer,
    ref: spanish ? item.refEs : item.ref,
    text: spanish ? item.textEs : item.text,
  };
}

export function pushDue(ms, row) {
  const parts = localParts(ms, row.timeZone);
  const today = ymd(parts);
  const nowMinutes = parts.hour * 60 + parts.minute;
  const target = Number(row.hour) * 60 + Number(row.minute);
  let delta = nowMinutes - target;
  let sentDate = today;
  if (delta < 0) {
    delta += 24 * 60;
    const yesterday = localParts(ms - 24 * 60 * 60 * 1000, row.timeZone);
    sentDate = ymd(yesterday);
  }
  if (delta >= 15) return { due: false, today: sentDate };
  if (row.lastSent === sentDate) return { due: false, today: sentDate };
  return { due: true, today: sentDate };
}

export function notificationBody(ms, row) {
  const card = morningCard(ms, row.timeZone, row.lang);
  const title = row.lang === 'es' ? 'Buenos días ☀️' : 'Good morning ☀️';
  return {
    title,
    body: `${card.prayer} ${card.ref}`,
    lang: row.lang === 'es' ? 'es' : 'en',
    url: './?morning=1',
  };
}
