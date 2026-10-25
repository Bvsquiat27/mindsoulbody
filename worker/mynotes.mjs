/* My notes: each user's devotional and study notes, readable by accepted
   friends unless the owner hides them. Stored at `mynotes:<code>`. */
export const MYNOTES_LIMITS = {
  COUNT: 200,        // notes kept per user
  TEXT: 2000,        // characters per note
  FIELD: 200,        // title / reference / key
  VERSE: 600,        // the verse line shown on the card
  TOTAL: 200000,     // bytes stored per user
  SYNC_RATE: 30,     // syncs per hour
  READ_RATE: 120,    // friend reads per hour
  HIDE_RATE: 300,    // hide-only syncs per hour: their own bucket, so hiding always works
};
const KINDS = ['devotional', 'study'];

const str = (v, max) => (typeof v === 'string' ? v.trim().slice(0, max) : '');
const num = (v, lo, hi) => (Number.isInteger(v) && v >= lo && v <= hi ? v : null);

export function cleanNotes(input) {
  if (!Array.isArray(input)) return { error: 'Notes must be a list' };
  if (input.length > MYNOTES_LIMITS.COUNT) return { error: `Up to ${MYNOTES_LIMITS.COUNT} notes can be shared` };
  const out = [];
  const seen = new Set();
  for (const n of input) {
    if (!n || typeof n !== 'object') continue;
    if (typeof n.text !== 'string') continue;
    if (n.text.length > MYNOTES_LIMITS.TEXT) return { error: 'A note is too long' };
    const text = n.text.trim();
    const kind = KINDS.includes(n.kind) ? n.kind : null;
    const key = str(n.key, MYNOTES_LIMITS.FIELD);
    if (!text || !kind || !key || seen.has(kind + ':' + key)) continue;
    seen.add(kind + ':' + key);
    out.push({
      kind, key, text,
      title: str(n.title, MYNOTES_LIMITS.FIELD),
      ref: str(n.ref, MYNOTES_LIMITS.FIELD),
      verse: str(n.verse, MYNOTES_LIMITS.VERSE),
      lang: n.lang === 'es' ? 'es' : 'en',
      book: num(n.book, 1, 78), chapter: num(n.chapter, 1, 200), v: num(n.v, 1, 200),
      ts: Number.isFinite(n.ts) && n.ts > 0 ? Math.min(Math.floor(n.ts), Date.now() + 60000) : Date.now(),
    });
  }
  out.sort((a, b) => b.ts - a.ts);
  if (JSON.stringify(out).length > MYNOTES_LIMITS.TOTAL) return { error: 'Your notes are too large to share' };
  return { notes: out };
}

/* deps: { authed, friendsBothWays, takeRate } from friends.mjs */
export async function handleMyNotes(path, body, env, deps) {
  const a = await deps.authed(env, body);
  if (a.error) return [{ error: a.error }, a.status];
  const me = a.user;
  if (path === '/mynotes/sync') {
    const hidden = body?.hidden === true;
    const bucket = hidden ? [`rate:mynotes-hide:${me.code}`, MYNOTES_LIMITS.HIDE_RATE] : [`rate:mynotes:${me.code}`, MYNOTES_LIMITS.SYNC_RATE];
    if (!(await deps.takeRate(env, bucket[0], bucket[1]))) return [{ error: 'Too many note syncs this hour' }, 429];
    let notes = [];
    if (hidden) notes = [];
    else if (body && Object.prototype.hasOwnProperty.call(body, 'notes')) {
      const c = cleanNotes(body.notes);
      if (c.error) return [{ error: c.error }, 400];
      notes = c.notes;
    } else {
      const old = await readNotes(env, me.code);
      notes = old.notes;
    }
    await env.FRIENDS.put(`mynotes:${me.code}`, JSON.stringify({ hidden, notes, updatedAt: Date.now() }));
    return [{ ok: true, count: notes.length, hidden }];
  }
  if (path === '/mynotes/friend') {
    if (!(await deps.takeRate(env, `rate:mynotes-read:${me.code}`, MYNOTES_LIMITS.READ_RATE))) return [{ error: 'Too many requests this hour' }, 429];
    const friend = await deps.friendsBothWays(env, me, body?.friend);
    if (!friend) return [{ error: 'Only friends can see these notes' }, 403];
    const rec = await readNotes(env, friend.code);
    if (rec.hidden) return [{ hidden: true, notes: [] }];
    return [{ hidden: false, notes: rec.notes }];
  }
  return [{ error: 'Not found' }, 404];
}

/* the account's own saved notes and lessons, for a phone that signed back in */
export async function readOwnState(env, code) {
  const notes = await readNotes(env, code);
  let rec = null;
  try { rec = JSON.parse((await env.FRIENDS.get(`lessons:${code}`)) || 'null'); } catch { rec = null; }
  const lessons = rec && typeof rec === 'object'
    ? { hidden: !!rec.hidden, current: rec.hidden ? null : rec.current || null, done: rec.hidden || !Array.isArray(rec.done) ? [] : rec.done }
    : { hidden: false, current: null, done: [] };
  return { notes, lessons };
}

async function readNotes(env, code) {
  try {
    const r = JSON.parse((await env.FRIENDS.get(`mynotes:${code}`)) || 'null');
    if (r && Array.isArray(r.notes)) return { hidden: !!r.hidden, notes: r.notes };
  } catch { /* fall through */ }
  return { hidden: false, notes: [] };
}

/* Lesson progress for friends: the lesson someone is on and the ones they
   finished (date and quiz score). Stored at `lessons:<code>`. On by default;
   the owner can hide it. */
export const LESSONS_LIMITS = {
  COUNT: 500,
  ID: 80,
  SYNC_RATE: 30,
  HIDE_RATE: 300,
  READ_RATE: 120,
};
const LESSON_ID = /^[a-z0-9][a-z0-9_-]*$/i;
const cleanId = (v) => (typeof v === 'string' && v.length <= LESSONS_LIMITS.ID && LESSON_ID.test(v) ? v : null);
const cleanTs = (v) => (Number.isFinite(v) && v > 0 ? Math.min(Math.floor(v), Date.now() + 60000) : null);

export function cleanLessons(input) {
  const src = input && typeof input === 'object' ? input : {};
  if (src.done !== undefined && !Array.isArray(src.done)) return { error: 'Lessons must be a list' };
  const list = src.done || [];
  if (list.length > LESSONS_LIMITS.COUNT) return { error: `Up to ${LESSONS_LIMITS.COUNT} lessons can be shared` };
  const seen = new Set(), done = [];
  for (const row of list) {
    const id = cleanId(row && row.id);
    if (!id || seen.has(id)) continue;
    seen.add(id);
    const score = Number.isInteger(row.score) && row.score >= 0 && row.score <= 100 ? row.score : null;
    done.push({ id, ts: cleanTs(row.ts), score });
  }
  done.sort((a, b) => (b.ts || 0) - (a.ts || 0));
  const curId = cleanId(src.current && src.current.id);
  const current = curId ? { id: curId, ts: cleanTs(src.current.ts) } : null;
  return { lessons: { current, done } };
}

export async function handleLessons(path, body, env, deps) {
  const a = await deps.authed(env, body);
  if (a.error) return [{ error: a.error }, a.status];
  const me = a.user;
  if (path === '/lessons/sync') {
    const hidden = body?.hidden === true;
    const bucket = hidden ? [`rate:lessons-hide:${me.code}`, LESSONS_LIMITS.HIDE_RATE] : [`rate:lessons:${me.code}`, LESSONS_LIMITS.SYNC_RATE];
    if (!(await deps.takeRate(env, bucket[0], bucket[1]))) return [{ error: 'Too many lesson syncs this hour' }, 429];
    let lessons = { current: null, done: [] };
    if (!hidden) {
      const c = cleanLessons(body?.lessons);
      if (c.error) return [{ error: c.error }, 400];
      lessons = c.lessons;
    }
    await env.FRIENDS.put(`lessons:${me.code}`, JSON.stringify({ hidden, ...lessons, updatedAt: Date.now() }));
    return [{ ok: true, count: lessons.done.length, hidden }];
  }
  if (path === '/lessons/friend') {
    if (!(await deps.takeRate(env, `rate:lessons-read:${me.code}`, LESSONS_LIMITS.READ_RATE))) return [{ error: 'Too many requests this hour' }, 429];
    const friend = await deps.friendsBothWays(env, me, body?.friend);
    if (!friend) return [{ error: 'Only friends can see this' }, 403];
    let rec = null;
    try { rec = JSON.parse((await env.FRIENDS.get(`lessons:${friend.code}`)) || 'null'); } catch { rec = null; }
    if (!rec) return [{ hidden: false, current: null, done: [] }];
    if (rec.hidden) return [{ hidden: true, current: null, done: [] }];
    return [{ hidden: false, current: rec.current || null, done: Array.isArray(rec.done) ? rec.done : [] }];
  }
  return [{ error: 'Not found' }, 404];
}
