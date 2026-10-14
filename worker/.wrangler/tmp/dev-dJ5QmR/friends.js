var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });

// friends.mjs
var ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
var SHOWS = ["jeopardy", "millionaire", "feud", "sound", "babel", "defend", "doctrine"];
var AVATAR_MAX = 25e4;
var COVER_MAX = 15e5;
var MAX_BODY = 2e6;
var FRIEND_LIMITS = { MAX_BODY, AVATAR_MAX, COVER_MAX, REQUEST_MAX: 30 };
var NOTE_TITLE_MAX = 120;
var NOTE_BODY_MAX = 4e3;
var NOTE_BOX_MAX = 30;
var REQUEST_MAX = FRIEND_LIMITS.REQUEST_MAX;
var INBOX_FULL = "Their request inbox is full. They need to accept or decline a request before yours can be delivered.";
var OUTBOX_FULL = "Your outgoing requests are full. Cancel a request before sending another.";
var BOARD_MAX = 50;
var ROOM_TTL_SECONDS = 2 * 60 * 60;
var ROOM_MAX_PLAYERS = 4;
var BOARD_KEY = "leaderboard";
var ORIGIN = "https://bvsquiat27.github.io";
var TEXT_LIMITS = { handle: 24, city: 80, bio: 160, denomination: 40 };
var IMAGE_DATA = /^data:image\/(?:jpeg|png|webp);base64,[a-z0-9+/]+={0,2}$/i;
var IMAGE_HTTPS = /^https:\/\/[^\s"'<>]+$/i;
var PUBLIC_ID = /^[a-f0-9]{16}$/;
function allowedOrigin(request) {
  const requestOrigin = request.headers.get("origin") || "";
  return requestOrigin === ORIGIN || /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(requestOrigin) ? requestOrigin : ORIGIN;
}
__name(allowedOrigin, "allowedOrigin");
function corsHeaders(origin) {
  return {
    "access-control-allow-origin": origin,
    vary: "Origin",
    "access-control-allow-methods": "GET, POST, OPTIONS",
    "access-control-allow-headers": "content-type",
    "access-control-max-age": "86400"
  };
}
__name(corsHeaders, "corsHeaders");
function json(data, status = 200, origin = ORIGIN) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json", ...corsHeaders(origin) }
  });
}
__name(json, "json");
async function sha256hex(text) {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
}
__name(sha256hex, "sha256hex");
function timingSafeEqual(a, b) {
  const left = String(a ?? "");
  const right = String(b ?? "");
  const len = Math.max(left.length, right.length);
  let diff = left.length === right.length ? 0 : 1;
  for (let i = 0; i < len; i++) diff |= (left.charCodeAt(i) || 0) ^ (right.charCodeAt(i) || 0);
  return diff === 0;
}
__name(timingSafeEqual, "timingSafeEqual");
function randomHex(bytes) {
  const arr = new Uint8Array(bytes);
  crypto.getRandomValues(arr);
  return [...arr].map((b) => b.toString(16).padStart(2, "0")).join("");
}
__name(randomHex, "randomHex");
function newCode() {
  let out = "MSB-";
  const arr = new Uint8Array(6);
  crypto.getRandomValues(arr);
  for (const b of arr) out += ALPHABET[b % ALPHABET.length];
  return out;
}
__name(newCode, "newCode");
function newRoomCode() {
  let out = "ROOM-";
  const arr = new Uint8Array(6);
  crypto.getRandomValues(arr);
  for (const b of arr) out += ALPHABET[b % ALPHABET.length];
  return out;
}
__name(newRoomCode, "newRoomCode");
var cleanName = /* @__PURE__ */ __name((v) => String(v ?? "").trim().slice(0, 40), "cleanName");
var clip = /* @__PURE__ */ __name((v, max) => String(v ?? "").trim().slice(0, max), "clip");
var num = /* @__PURE__ */ __name((v) => {
  const n = Number(v);
  return Number.isFinite(n) && n > 0 ? n : 0;
}, "num");
var int = /* @__PURE__ */ __name((v) => Math.floor(num(v)), "int");
function cleanStats(input) {
  const src = input && typeof input === "object" ? input : {};
  const pick = /* @__PURE__ */ __name((obj) => {
    const out2 = {};
    for (const k of SHOWS) out2[k] = num(obj && obj[k]);
    return out2;
  }, "pick");
  const levelsSrc = src.levels && typeof src.levels === "object" ? src.levels : {};
  const levels = {};
  for (const k of SHOWS) levels[k] = int(levelsSrc[k]);
  const out = { bests: pick(src.bests), levels, studies: int(src.studies) };
  const reading = cleanReading(src.reading);
  if (reading) out.reading = reading;
  return out;
}
__name(cleanStats, "cleanStats");
function cleanReading(input) {
  if (!input || typeof input !== "object" || Array.isArray(input)) return null;
  const out = {};
  const book = Math.floor(num(input.book)), chapter = Math.floor(num(input.chapter));
  if (book >= 1 && book <= 78 && chapter >= 1 && chapter <= 150) {
    out.book = book;
    out.chapter = chapter;
  }
  const study = String(input.study ?? "").trim().toLowerCase();
  if (/^[a-z0-9-]{1,60}$/.test(study)) {
    out.study = study;
    const title = String(input.studyTitle ?? "").replace(/[\u0000-\u001f<>]/g, "").trim().slice(0, 120);
    if (title) out.studyTitle = title;
  }
  const total = Math.floor(num(input.total)), done = Math.floor(num(input.done));
  if (total >= 1 && total <= 500 && done >= 0 && done <= total) {
    out.done = done;
    out.total = total;
  }
  const at = Math.floor(num(input.at));
  if (at > 0) out.at = at;
  return out.book || out.study || out.total ? out : null;
}
__name(cleanReading, "cleanReading");
function cleanNoteRef(input) {
  if (!input || typeof input !== "object") return null;
  const book = Math.floor(num(input.book));
  const chapter = Math.floor(num(input.chapter));
  const verse = Math.floor(num(input.verse));
  if (book < 1 || book > 78 || chapter < 1 || chapter > 200 || verse > 999) return null;
  const label = String(input.label ?? "").trim().slice(0, 80);
  return { book, chapter, verse, label };
}
__name(cleanNoteRef, "cleanNoteRef");
function cleanStudyId(v) {
  const s = String(v ?? "").trim().toLowerCase();
  return /^[a-z0-9-]{1,60}$/.test(s) ? s : "";
}
__name(cleanStudyId, "cleanStudyId");
function publicImage(value, max) {
  const raw = String(value ?? "").trim();
  if (!raw || raw.length > max) return "";
  if (IMAGE_DATA.test(raw) || IMAGE_HTTPS.test(raw)) return raw;
  return "";
}
__name(publicImage, "publicImage");
function nestedProfile(body) {
  const profile = body && body.profile;
  return profile && typeof profile === "object" && !Array.isArray(profile) ? profile : null;
}
__name(nestedProfile, "nestedProfile");
function fieldValues(body, nested, key) {
  const values = [];
  if (body && Object.prototype.hasOwnProperty.call(body, key)) values.push(body[key]);
  if (nested && Object.prototype.hasOwnProperty.call(nested, key)) values.push(nested[key]);
  return values;
}
__name(fieldValues, "fieldValues");
function applyText(user, body, nested, key) {
  const values = fieldValues(body, nested, key);
  if (!values.length) return;
  const text = values.map((value) => clip(value, TEXT_LIMITS[key])).find(Boolean) || "";
  if (text) user[key] = text;
  else delete user[key];
}
__name(applyText, "applyText");
function applyImage(user, body, nested, storedKey, aliases, max) {
  let seen = false;
  let chosen = "";
  let oversize = false;
  for (const alias of aliases) {
    for (const value of fieldValues(body, nested, alias)) {
      seen = true;
      const raw = String(value ?? "").trim();
      if (!raw) continue;
      if (raw.length > max) {
        oversize = true;
        continue;
      }
      const img = publicImage(raw, max);
      if (img) {
        chosen = img;
        break;
      }
    }
    if (chosen) break;
  }
  if (!seen) return "";
  if (chosen) {
    user[storedKey] = chosen;
    return "";
  }
  if (oversize) {
    return storedKey === "avatar_data" ? "The profile photo was too large, so it was left unchanged. Your other profile details were saved." : "The cover photo was too large, so it was left unchanged. Your other profile details were saved.";
  }
  delete user[storedKey];
  return "";
}
__name(applyImage, "applyImage");
function applyProfile(user, body) {
  const nested = nestedProfile(body);
  for (const key of ["handle", "city", "bio", "denomination"]) applyText(user, body, nested, key);
  const warnings = [
    applyImage(user, body, nested, "avatar_data", ["avatar_data", "avatar", "avatarUrl"], AVATAR_MAX),
    applyImage(user, body, nested, "cover_data", ["cover_data", "cover", "coverUrl"], COVER_MAX)
  ].filter(Boolean);
  delete user.avatar_saint;
  if (user.profile && typeof user.profile === "object") {
    delete user.profile.avatar_saint;
    delete user.profile.secret;
    delete user.profile.secretHash;
    delete user.profile.email;
    delete user.profile.password;
    delete user.profile.friends;
    if (!Object.keys(user.profile).length) delete user.profile;
  }
  delete user.profile;
  return warnings;
}
__name(applyProfile, "applyProfile");
function hydrate(user) {
  if (!user || typeof user !== "object") return null;
  if (!Array.isArray(user.friends)) user.friends = [];
  if (!Array.isArray(user.inbox)) user.inbox = [];
  if (!Array.isArray(user.outbox)) user.outbox = [];
  if (!user.threads || typeof user.threads !== "object" || Array.isArray(user.threads)) user.threads = {};
  if (!Array.isArray(user.shared)) user.shared = [];
  if (!Array.isArray(user.requestsIn)) user.requestsIn = [];
  if (!Array.isArray(user.requestsOut)) user.requestsOut = [];
  if (!user.stats || typeof user.stats !== "object" || Array.isArray(user.stats)) user.stats = cleanStats(null);
  return user;
}
__name(hydrate, "hydrate");
function cleanRequests(list) {
  const out = [];
  const seen = /* @__PURE__ */ new Set();
  for (const item of Array.isArray(list) ? list : []) {
    const code = String(item?.code || "").trim().toUpperCase();
    if (!code || seen.has(code)) continue;
    seen.add(code);
    out.push({ code, name: cleanName(item?.name) || "Friend", ts: Number(item?.ts) || 0 });
  }
  return out;
}
__name(cleanRequests, "cleanRequests");
function withoutCode(list, code) {
  return cleanRequests(list).filter((item) => item.code !== code);
}
__name(withoutCode, "withoutCode");
function hasRequest(list, code) {
  return cleanRequests(list).some((item) => item.code === code);
}
__name(hasRequest, "hasRequest");
function linkFriends(a, b) {
  a.friends = [.../* @__PURE__ */ new Set([...a.friends || [], b.code])];
  b.friends = [.../* @__PURE__ */ new Set([...b.friends || [], a.code])];
}
__name(linkFriends, "linkFriends");
function clearRequestPair(a, b) {
  a.requestsIn = withoutCode(a.requestsIn, b.code);
  a.requestsOut = withoutCode(a.requestsOut, b.code);
  b.requestsIn = withoutCode(b.requestsIn, a.code);
  b.requestsOut = withoutCode(b.requestsOut, a.code);
}
__name(clearRequestPair, "clearRequestPair");
function validPublicId(value) {
  const id = String(value ?? "").trim().toLowerCase();
  return PUBLIC_ID.test(id) ? id : "";
}
__name(validPublicId, "validPublicId");
async function loadUser(env, code) {
  if (!code) return null;
  const raw = await env.FRIENDS.get(`user:${code}`);
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}
__name(loadUser, "loadUser");
async function saveUser(env, user) {
  user.updatedAt = Date.now();
  await env.FRIENDS.put(`user:${user.code}`, JSON.stringify(user));
}
__name(saveUser, "saveUser");
async function ensurePublicId(env, user) {
  const existing = validPublicId(user && user.publicId);
  if (existing) {
    user.publicId = existing;
    return existing;
  }
  user.publicId = randomHex(8);
  await saveUser(env, user);
  return user.publicId;
}
__name(ensurePublicId, "ensurePublicId");
async function readBody(request) {
  const text = await request.text();
  if (text.length > MAX_BODY) return { error: "Request too large", status: 413 };
  try {
    return { body: JSON.parse(text) };
  } catch {
    return { error: "Malformed JSON body", status: 400 };
  }
}
__name(readBody, "readBody");
async function loadBoard(env) {
  try {
    const raw = await env.FRIENDS.get(BOARD_KEY);
    const b = raw ? JSON.parse(raw) : {};
    return b && typeof b === "object" && !Array.isArray(b) ? b : {};
  } catch {
    return {};
  }
}
__name(loadBoard, "loadBoard");
async function loadRoom(env, code) {
  if (!code) return null;
  try {
    const raw = await env.FRIENDS.get(`room:${code}`);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}
__name(loadRoom, "loadRoom");
async function saveRoom(env, room) {
  await env.FRIENDS.put(`room:${room.room}`, JSON.stringify(room), { expirationTtl: ROOM_TTL_SECONDS });
}
__name(saveRoom, "saveRoom");
function publicRoom(room) {
  return {
    room: room.room,
    show: room.show,
    level: room.level,
    host: room.host,
    status: room.status,
    createdAt: room.createdAt,
    startedAt: room.startedAt || null,
    players: (room.players || []).map((p) => ({ code: p.code, name: p.name, score: p.score || 0, finished: !!p.finished }))
  };
}
__name(publicRoom, "publicRoom");
function publicScore(entry, id) {
  return {
    id: id || "",
    name: typeof entry.name === "string" ? entry.name : "",
    score: Number(entry.score) || 0,
    level: Number(entry.level) || 0,
    ts: Number(entry.ts) || 0
  };
}
__name(publicScore, "publicScore");
async function stampBoardId(env, code, publicId) {
  if (!code || !publicId) return;
  const board = await loadBoard(env);
  let dirty = false;
  for (const rows of Object.values(board)) {
    if (!Array.isArray(rows)) continue;
    for (const entry of rows) {
      if (!entry || typeof entry !== "object") continue;
      if (String(entry.code || "").trim().toUpperCase() !== code) continue;
      if (entry.id !== publicId) {
        entry.id = publicId;
        dirty = true;
      }
    }
  }
  if (dirty) await env.FRIENDS.put(BOARD_KEY, JSON.stringify(board));
}
__name(stampBoardId, "stampBoardId");
async function presentScoreList(env, list, limit) {
  const rows = Array.isArray(list) ? list : [];
  const out = [];
  for (const entry of rows) {
    if (!entry || typeof entry !== "object") continue;
    let id = validPublicId(entry.id);
    if (!id) {
      const code = String(entry.code || "").trim().toUpperCase();
      if (code) {
        const user = await loadUser(env, code);
        id = validPublicId(user && user.publicId);
      }
    }
    out.push(publicScore(entry, id));
    if (out.length >= limit) break;
  }
  return out;
}
__name(presentScoreList, "presentScoreList");
function friendView(me, friend) {
  const thread = (me.threads || {})[friend.code] || [];
  const unread = thread.filter((m) => m.from === friend.code && !m.read).length;
  const view = {
    code: friend.code,
    name: friend.name || "",
    stats: friend.stats || cleanStats(null),
    updatedAt: friend.updatedAt || 0,
    unread
  };
  const profile = {};
  for (const key of ["handle", "city", "bio", "denomination", "avatar_data", "cover_data"]) {
    if (typeof friend[key] === "string" && friend[key]) {
      view[key] = friend[key];
      profile[key] = friend[key];
    }
  }
  if (Object.keys(profile).length) view.profile = profile;
  const squishies = publicSquishies(friend);
  if (squishies) view.squishies = squishies;
  return view;
}
__name(friendView, "friendView");
async function authed(env, body) {
  const code = String(body?.code || "").trim().toUpperCase();
  const secret = String(body?.secret || "");
  const user = hydrate(await loadUser(env, code));
  if (!user) return { error: "Unknown friend code", status: 404 };
  const hash = secret ? await sha256hex(secret) : "";
  if (!secret || !timingSafeEqual(hash, user.secretHash || "")) {
    return { error: "Wrong account secret", status: 401 };
  }
  user.requestsIn = cleanRequests(user.requestsIn);
  user.requestsOut = cleanRequests(user.requestsOut);
  return { user };
}
__name(authed, "authed");
var VERSE_TEXT_MAX = 500;
var VERSE_NOTE_MAX = 280;
var VERSE_REF_MAX = 80;
var VERSE_BOX_MAX = 100;
var VERSE_RATE = 30;
var STUDY_QUESTION_MAX = 400;
var STUDY_ANSWER_MAX = 2e3;
var STUDY_VERSES_MAX = 6;
var STUDY_ENTRIES_MAX = 100;
var STUDY_RATE = 40;
var VERSE_READ_RATE = 200;
var STUDY_DELETE_RATE = 200;
var HOUR_MS = 60 * 60 * 1e3;
var SCORE_MAX = 1e6;
var RATE_LIMITS = {
  register: 80,
  sync: 60,
  msg: 60,
  note: 40,
  friendAdd: 40,
  shared: 20,
  scores: 60
};
function verseNumber(value, min, max) {
  if (typeof value === "boolean" || value == null) return null;
  if (typeof value === "string" && value.trim() === "") return null;
  const n = typeof value === "number" ? value : Number(value);
  if (!Number.isInteger(n) || n < min || n > max) return null;
  return n;
}
__name(verseNumber, "verseNumber");
function boundedText(value, max) {
  const raw = String(value ?? "");
  if (raw.length > max) return { error: "That text is too long" };
  return { text: raw.trim() };
}
__name(boundedText, "boundedText");
function clientIp(request) {
  const cf = request.headers.get("CF-Connecting-IP");
  if (cf) return cf.trim();
  const forwarded = request.headers.get("x-forwarded-for") || "";
  const first = forwarded.split(",")[0].trim();
  return first || "unknown";
}
__name(clientIp, "clientIp");
async function takeRate(env, key, limit) {
  const now = Date.now();
  let bucket = null;
  try {
    bucket = JSON.parse(await env.FRIENDS.get(key) || "null");
  } catch {
    bucket = null;
  }
  if (!bucket || typeof bucket.start !== "number" || now - bucket.start >= HOUR_MS) bucket = { start: now, n: 0 };
  if (bucket.n >= limit) return false;
  bucket.n += 1;
  await env.FRIENDS.put(key, JSON.stringify(bucket));
  return true;
}
__name(takeRate, "takeRate");
async function friendsBothWays(env, user, otherCode) {
  const code = String(otherCode || "").trim().toUpperCase();
  if (!code || code === user.code) return null;
  if (!(user.friends || []).includes(code)) return null;
  const other = hydrate(await loadUser(env, code));
  if (!other || !(other.friends || []).includes(user.code)) return null;
  return other;
}
__name(friendsBothWays, "friendsBothWays");
async function loadVersebox(env, code) {
  const raw = await env.FRIENDS.get(`versebox:${code}`);
  if (!raw) return [];
  try {
    const data = JSON.parse(raw);
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
}
__name(loadVersebox, "loadVersebox");
async function saveVersebox(env, code, items) {
  await env.FRIENDS.put(`versebox:${code}`, JSON.stringify(items.slice(0, VERSE_BOX_MAX)));
}
__name(saveVersebox, "saveVersebox");
function otherParty(item, code) {
  if (!item) return "";
  return item.direction === "out" ? item.to : item.from;
}
__name(otherParty, "otherParty");
function studyStorageKey(a, b) {
  const pair = [String(a || "").trim().toUpperCase(), String(b || "").trim().toUpperCase()].sort();
  return { key: `study:${pair[0]}:${pair[1]}`, editors: pair };
}
__name(studyStorageKey, "studyStorageKey");
async function loadStudy(env, a, b) {
  const { key, editors } = studyStorageKey(a, b);
  const raw = await env.FRIENDS.get(key);
  if (!raw) return { id: key, editors, entries: [], updatedAt: 0 };
  try {
    const note = JSON.parse(raw);
    if (!note || typeof note !== "object") return { id: key, editors, entries: [], updatedAt: 0 };
    note.id = key;
    note.editors = editors;
    note.entries = Array.isArray(note.entries) ? note.entries : [];
    return note;
  } catch {
    return { id: key, editors, entries: [], updatedAt: 0 };
  }
}
__name(loadStudy, "loadStudy");
function cleanStudyVerses(input) {
  if (input == null) return { verses: [] };
  if (!Array.isArray(input)) return { error: "Verse links are not valid" };
  if (input.length > STUDY_VERSES_MAX) return { error: "Too many linked verses" };
  const verses = [];
  for (const item of input) {
    if (!item || typeof item !== "object") return { error: "Verse links are not valid" };
    const book = verseNumber(item.book, 1, 78);
    const chapter = verseNumber(item.chapter, 1, 200);
    const verse = verseNumber(item.verse, 1, 200);
    if (book == null || chapter == null || verse == null) return { error: "Verse link is not valid" };
    const reference = boundedText(item.reference, VERSE_REF_MAX);
    if (reference.error) return { error: "Reference is too long" };
    verses.push({ book, chapter, verse, reference: reference.text });
  }
  return { verses };
}
__name(cleanStudyVerses, "cleanStudyVerses");
var SQUISHY_IDS = [
  "lamb",
  "dove",
  "fish",
  "lion",
  "star",
  "rainbow",
  "stone",
  "loaves",
  "seed",
  "bush",
  "basket",
  "tree",
  "ark",
  "coat",
  "ladder",
  "raven",
  "wheat",
  "oil",
  "coin",
  "donkey",
  "jar",
  "crown",
  "boat",
  "tomb",
  "lily",
  "key",
  "pearl",
  "manna",
  "scroll",
  "shofar",
  "tablets",
  "elephant",
  "honeycomb",
  "anchor",
  "shield",
  "chariot",
  "lamp"
];
var SQUISHY_STARTERS = ["lamb", "dove", "fish", "lion", "star", "rainbow"];
var SQUISHY_LEGENDARY = ["bush", "tomb", "chariot", "tablets", "lamp"];
var TRADE_RULES = {
  LEGEND_MIN: 5,
  NEED_MAX: 12,
  OFFER_MAX: 12,
  ACTIVE_MAX: 5,
  INDEX_MAX: 20,
  REQUEST_TTL_MS: 30 * 60 * 1e3,
  OPEN_TTL_MS: 30 * 60 * 1e3,
  MAX_LIFE_MS: 2 * 60 * 60 * 1e3,
  RATE_REQUEST: 30,
  RATE_MOVE: 600,
  RATE_READ: 3600,
  PENDING_MAX: 20
};
var TRADE_KV_TTL = 2 * 60 * 60;
var TRADE_ID = /^[a-f0-9]{16}$/;
var FINAL_STATES = ["done", "declined", "cancelled", "expired"];
var tradableSquishy = /* @__PURE__ */ __name((id) => SQUISHY_IDS.includes(id) && id !== "lamp" && !SQUISHY_STARTERS.includes(id), "tradableSquishy");
function cleanSquishyIds(input) {
  if (!Array.isArray(input)) return [];
  const out = [];
  for (const raw of input.slice(0, SQUISHY_IDS.length * 2)) {
    const id = typeof raw === "string" ? raw.trim().toLowerCase() : "";
    if (SQUISHY_IDS.includes(id) && !out.includes(id)) out.push(id);
  }
  return out;
}
__name(cleanSquishyIds, "cleanSquishyIds");
function squishyRecord(user) {
  const s = user.squishies && typeof user.squishies === "object" && !Array.isArray(user.squishies) ? user.squishies : {};
  return {
    ids: cleanSquishyIds(s.ids),
    public: s.public !== false,
    pending: Array.isArray(s.pending) ? s.pending.filter((p) => p && TRADE_ID.test(p.trade)).slice(-TRADE_RULES.PENDING_MAX) : [],
    updatedAt: Number(s.updatedAt) || 0
  };
}
__name(squishyRecord, "squishyRecord");
function withPending(ids, pending) {
  let out = ids.slice();
  for (const p of pending) {
    out = out.filter((id) => !cleanSquishyIds(p.give).includes(id));
    for (const id of cleanSquishyIds(p.get)) if (!out.includes(id)) out.push(id);
  }
  return out;
}
__name(withPending, "withPending");
function applySquishies(user, input) {
  if (!input || typeof input !== "object" || Array.isArray(input)) return;
  const rec = squishyRecord(user);
  if (Array.isArray(input.ids)) rec.ids = withPending(cleanSquishyIds(input.ids), rec.pending);
  if (typeof input.public === "boolean") rec.public = input.public;
  rec.updatedAt = Date.now();
  user.squishies = rec;
}
__name(applySquishies, "applySquishies");
function publicSquishies(user) {
  const rec = squishyRecord(user);
  return rec.public && rec.updatedAt ? rec.ids : null;
}
__name(publicSquishies, "publicSquishies");
async function checkOffer(env, me, raw, tradeId) {
  if (!Array.isArray(raw) || raw.length > TRADE_RULES.OFFER_MAX) return { error: "That offer is not valid", status: 400 };
  const offer = cleanSquishyIds(raw);
  if (offer.length !== raw.length) return { error: "That offer is not valid", status: 400 };
  if (offer.includes("lamp")) return { error: "The lamp can never be traded", reason: "lamp", status: 400 };
  if (offer.some((id) => !tradableSquishy(id))) return { error: "Starter squishies are not traded", reason: "starter", status: 400 };
  const owned = squishyRecord(me).ids;
  if (offer.some((id) => !owned.includes(id))) return { error: "You can only offer squishies you have", reason: "owned", status: 400 };
  const locked = await lockedElsewhere(env, me.code, tradeId);
  if (offer.some((id) => locked.has(id))) return { error: "That squishy is already in another trade", reason: "locked", status: 409 };
  return { offer };
}
__name(checkOffer, "checkOffer");
async function loadTrade(env, id) {
  if (!TRADE_ID.test(String(id || ""))) return null;
  try {
    const raw = await env.FRIENDS.get(`trade:${id}`);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}
__name(loadTrade, "loadTrade");
async function saveTrade(env, t) {
  t.updatedAt = Date.now();
  await env.FRIENDS.put(`trade:${t.id}`, JSON.stringify(t), { expirationTtl: TRADE_KV_TTL });
}
__name(saveTrade, "saveTrade");
async function loadTradeIndex(env, code) {
  try {
    const v = JSON.parse(await env.FRIENDS.get(`trades:${code}`) || "[]");
    return Array.isArray(v) ? v.filter((x) => TRADE_ID.test(x)) : [];
  } catch {
    return [];
  }
}
__name(loadTradeIndex, "loadTradeIndex");
async function addTradeIndex(env, code, id) {
  const list = [id, ...(await loadTradeIndex(env, code)).filter((x) => x !== id)].slice(0, TRADE_RULES.INDEX_MAX);
  await env.FRIENDS.put(`trades:${code}`, JSON.stringify(list), { expirationTtl: TRADE_KV_TTL });
}
__name(addTradeIndex, "addTradeIndex");
function expireIfOld(t, now = Date.now()) {
  if (t && !FINAL_STATES.includes(t.status) && now > t.expiresAt) {
    t.status = "expired";
    return true;
  }
  return false;
}
__name(expireIfOld, "expireIfOld");
var otherSide = /* @__PURE__ */ __name((t, code) => t.from === code ? t.to : t.from, "otherSide");
var isParty = /* @__PURE__ */ __name((t, code) => !!t && (t.from === code || t.to === code), "isParty");
function tradeCheck(t) {
  const [a, b] = [t.from, t.to];
  const offerA = t.offers[a] || [], offerB = t.offers[b] || [];
  const needFrom = /* @__PURE__ */ __name((owner, offer) => offer.some((id) => SQUISHY_LEGENDARY.includes(id)) ? Math.max(TRADE_RULES.LEGEND_MIN, Number(t.need[owner]) || 0) : Math.max(1, Number(t.need[owner]) || 0), "needFrom");
  const wantB = needFrom(a, offerA), wantA = needFrom(b, offerB);
  const problems = [];
  if (!offerA.length || !offerB.length) problems.push("empty");
  if (offerA.length && offerB.length < wantB) problems.push(`need:${b}:${wantB}`);
  if (offerB.length && offerA.length < wantA) problems.push(`need:${a}:${wantA}`);
  return { ok: !problems.length, problems, want: { [b]: wantB, [a]: wantA } };
}
__name(tradeCheck, "tradeCheck");
function tradeView(t, code) {
  const check = tradeCheck(t);
  return {
    id: t.id,
    status: t.status,
    from: t.from,
    to: t.to,
    names: t.names,
    me: code,
    other: otherSide(t, code),
    offers: t.offers,
    need: t.need,
    rev: t.rev,
    checks: t.checks,
    note: t.note || null,
    want: check.want,
    ready: check.ok,
    problems: check.problems,
    createdAt: t.createdAt,
    updatedAt: t.updatedAt,
    expiresAt: t.expiresAt,
    result: t.result || null
  };
}
__name(tradeView, "tradeView");
async function lockedElsewhere(env, code, exceptId) {
  const out = /* @__PURE__ */ new Set();
  for (const id of await loadTradeIndex(env, code)) {
    if (id === exceptId) continue;
    const t = await loadTrade(env, id);
    if (!t || expireIfOld(t) || FINAL_STATES.includes(t.status)) continue;
    for (const s of t.offers[code] || []) out.add(s);
  }
  return out;
}
__name(lockedElsewhere, "lockedElsewhere");
async function activeTrades(env, code) {
  const out = [];
  for (const id of await loadTradeIndex(env, code)) {
    const t = await loadTrade(env, id);
    if (t && !expireIfOld(t) && !FINAL_STATES.includes(t.status)) out.push(t);
  }
  return out;
}
__name(activeTrades, "activeTrades");
async function handleTrade(path, body, env, authedUser) {
  const a = await authedUser(env, body);
  if (a.error) return [{ error: a.error }, a.status];
  const me = a.user, now = Date.now();
  if (path === "/trade/list") {
    if (!await takeRate(env, `rate:trade-read:${me.code}`, TRADE_RULES.RATE_READ)) return [{ error: "Too many trade checks this hour" }, 429];
    const list = [];
    for (const id of await loadTradeIndex(env, me.code)) {
      const t2 = await loadTrade(env, id);
      if (!t2) continue;
      if (expireIfOld(t2, now)) await saveTrade(env, t2);
      list.push(tradeView(t2, me.code));
    }
    return [{ trades: list, pending: squishyRecord(me).pending }];
  }
  if (path === "/trade/request") {
    if (!await takeRate(env, `rate:trade:${me.code}`, TRADE_RULES.RATE_REQUEST)) return [{ error: "Too many trade requests this hour" }, 429];
    const friend = await friendsBothWays(env, me, body?.with);
    if (!friend) return [{ error: "You are not friends" }, 403];
    const mine = await activeTrades(env, me.code), theirs = await activeTrades(env, friend.code);
    const same = mine.find((t3) => isParty(t3, friend.code));
    if (same) return [{ ok: true, trade: tradeView(same, me.code), existing: true }];
    if (mine.length >= TRADE_RULES.ACTIVE_MAX) return [{ error: "You have too many open trades" }, 429];
    if (theirs.length >= TRADE_RULES.ACTIVE_MAX) return [{ error: "Your friend has too many open trades" }, 429];
    let first = [];
    if (body && Object.prototype.hasOwnProperty.call(body, "offer")) {
      const c = await checkOffer(env, me, body.offer, null);
      if (c.error) return [{ error: c.error, ...c.reason ? { reason: c.reason } : {} }, c.status];
      first = c.offer;
    }
    const t2 = {
      id: randomHex(8),
      from: me.code,
      to: friend.code,
      names: { [me.code]: me.name || "Friend", [friend.code]: friend.name || "Friend" },
      status: "requested",
      offers: { [me.code]: first, [friend.code]: [] },
      need: { [me.code]: first.some((id) => SQUISHY_LEGENDARY.includes(id)) ? TRADE_RULES.LEGEND_MIN : 0, [friend.code]: 0 },
      rev: 1,
      checks: { [me.code]: 0, [friend.code]: 0 },
      note: null,
      createdAt: now,
      updatedAt: now,
      expiresAt: now + TRADE_RULES.REQUEST_TTL_MS
    };
    await saveTrade(env, t2);
    await addTradeIndex(env, me.code, t2.id);
    await addTradeIndex(env, friend.code, t2.id);
    return [{ ok: true, trade: tradeView(t2, me.code) }];
  }
  const t = await loadTrade(env, body?.trade);
  if (!t || !isParty(t, me.code)) return [{ error: "Trade not found" }, 404];
  if (expireIfOld(t, now)) {
    await saveTrade(env, t);
    return [{ error: "This trade has expired", trade: tradeView(t, me.code) }, 410];
  }
  if (path === "/trade/state") {
    if (!await takeRate(env, `rate:trade-read:${me.code}`, TRADE_RULES.RATE_READ)) return [{ error: "Too many trade checks this hour" }, 429];
    return [{ trade: tradeView(t, me.code) }];
  }
  if (path === "/trade/ack") {
    const rec = squishyRecord(me);
    rec.pending = rec.pending.filter((p) => p.trade !== t.id);
    me.squishies = rec;
    await saveUser(env, me);
    return [{ ok: true }];
  }
  if (FINAL_STATES.includes(t.status)) return [{ error: "This trade is over", trade: tradeView(t, me.code) }, 409];
  if (!await takeRate(env, `rate:trade-move:${me.code}`, TRADE_RULES.RATE_MOVE)) return [{ error: "Too many trade moves this hour" }, 429];
  if (path === "/trade/cancel") {
    t.status = t.status === "requested" && t.to === me.code ? "declined" : "cancelled";
    t.note = { by: me.code, kind: t.status, ts: now };
    await saveTrade(env, t);
    return [{ ok: true, trade: tradeView(t, me.code) }];
  }
  if (path === "/trade/accept") {
    if (t.to !== me.code || t.status !== "requested") return [{ error: "Only your friend can open this trade" }, 409];
    t.status = "open";
    t.expiresAt = Math.min(t.createdAt + TRADE_RULES.MAX_LIFE_MS, now + TRADE_RULES.OPEN_TTL_MS);
    t.rev += 1;
    await saveTrade(env, t);
    return [{ ok: true, trade: tradeView(t, me.code) }];
  }
  let opened = false;
  if (path === "/trade/update" && t.status === "requested") {
    if (t.to === me.code) {
      opened = true;
      t.status = "open";
      t.expiresAt = Math.min(t.createdAt + TRADE_RULES.MAX_LIFE_MS, now + TRADE_RULES.OPEN_TTL_MS);
      t.rev += 1;
    } else if (body?.ask === "more") return [{ error: "The trade room is not open yet" }, 409];
  }
  if (t.status !== "open" && !(path === "/trade/update" && t.status === "requested")) return [{ error: "The trade room is not open yet" }, 409];
  const touch = /* @__PURE__ */ __name(() => {
    t.expiresAt = Math.min(t.createdAt + TRADE_RULES.MAX_LIFE_MS, now + TRADE_RULES.OPEN_TTL_MS);
  }, "touch");
  if (path === "/trade/update") {
    let changed = false;
    if (body && Object.prototype.hasOwnProperty.call(body, "offer")) {
      const c = await checkOffer(env, me, body.offer, t.id);
      if (c.error) return [{ error: c.error, ...c.reason ? { reason: c.reason } : {} }, c.status];
      const offer = c.offer;
      if (offer.join() !== (t.offers[me.code] || []).join()) {
        t.offers[me.code] = offer;
        changed = true;
      }
    }
    if (body && Object.prototype.hasOwnProperty.call(body, "need")) {
      const n = Number(body.need);
      if (!Number.isInteger(n) || n < 0 || n > TRADE_RULES.NEED_MAX) return [{ error: "That number is not valid" }, 400];
      if (n !== t.need[me.code]) {
        t.need[me.code] = n;
        changed = true;
      }
    }
    if (body?.ask === "more") {
      t.note = { by: me.code, kind: "more", ts: now };
      changed = true;
    }
    if (changed) {
      t.rev += 1;
      t.checks = { [t.from]: 0, [t.to]: 0 };
      if (body?.ask !== "more") t.note = null;
      touch();
      await saveTrade(env, t);
    } else if (opened) await saveTrade(env, t);
    return [{ ok: true, trade: tradeView(t, me.code) }];
  }
  if (path === "/trade/confirm") {
    if (Number(body?.rev) !== t.rev) return [{ error: "The board changed. Look again before you press \u2713.", reason: "changed", trade: tradeView(t, me.code) }, 409];
    const check = tradeCheck(t);
    if (!check.ok) return [{ error: "This trade is not fair yet", reason: check.problems[0], trade: tradeView(t, me.code) }, 400];
    t.checks[me.code] = t.rev;
    touch();
    const other = otherSide(t, me.code);
    if (t.checks[other] !== t.rev) {
      await saveTrade(env, t);
      return [{ ok: true, trade: tradeView(t, me.code) }];
    }
    const friend = await friendsBothWays(env, me, other);
    if (!friend) return [{ error: "You are not friends" }, 403];
    const users = { [me.code]: me, [friend.code]: friend };
    for (const code of [t.from, t.to]) {
      const owner = squishyRecord(users[code]), receiver = squishyRecord(users[otherSide(t, code)]);
      const locked = await lockedElsewhere(env, code, t.id);
      const give = t.offers[code];
      const bad = give.some((id) => !owner.ids.includes(id) || locked.has(id)) ? "owned" : give.some((id) => receiver.ids.includes(id)) ? "already" : "";
      if (bad) {
        t.checks = { [t.from]: 0, [t.to]: 0 };
        t.rev += 1;
        await saveTrade(env, t);
        return [{ error: bad === "owned" ? "A squishy on the board is not available any more" : "Your friend already has one of those squishies", reason: bad, trade: tradeView(t, me.code) }, 409];
      }
    }
    t.status = "done";
    t.result = { [t.from]: { give: t.offers[t.from], get: t.offers[t.to] }, [t.to]: { give: t.offers[t.to], get: t.offers[t.from] }, ts: now };
    await saveTrade(env, t);
    for (const code of [t.from, t.to]) {
      const u = users[code], rec = squishyRecord(u), r = t.result[code];
      rec.ids = withPending(rec.ids, [{ give: r.give, get: r.get }]);
      rec.pending = [...rec.pending, { trade: t.id, give: r.give, get: r.get, ts: now }].slice(-TRADE_RULES.PENDING_MAX);
      rec.updatedAt = now;
      u.squishies = rec;
      await saveUser(env, u);
    }
    return [{ ok: true, trade: tradeView(t, me.code) }];
  }
  return [{ error: "Not found" }, 404];
}
__name(handleTrade, "handleTrade");
async function handleFriends(request, env) {
  const origin = allowedOrigin(request);
  const reply = /* @__PURE__ */ __name((data, status = 200) => json(data, status, origin), "reply");
  try {
    const url = new URL(request.url);
    if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: corsHeaders(origin) });
    if (url.pathname === "/health" && request.method === "GET") return reply({ ok: true });
    if (url.pathname === "/recovery-email" && (request.method === "GET" || request.method === "POST")) {
      return reply({
        ready: false,
        configured: false,
        sent: false,
        error: "No mailbox or sending key is configured. No recovery email was sent."
      });
    }
    if (url.pathname === "/scores" && request.method === "GET") {
      const board = await loadBoard(env);
      const want = String(url.searchParams.get("show") || "").toLowerCase();
      if (want) {
        if (!SHOWS.includes(want)) return reply({ error: "Unknown game" }, 400);
        return reply({ show: want, scores: await presentScoreList(env, board[want], 20) });
      }
      const all = {};
      for (const s of SHOWS) all[s] = await presentScoreList(env, board[s], 10);
      return reply({ scores: all });
    }
    if (request.method !== "POST") return reply({ error: "Not found" }, 404);
    const { body, error, status } = await readBody(request);
    if (error) return reply({ error }, status);
    if (url.pathname === "/register") {
      if (!await takeRate(env, `rate:register:${clientIp(request)}`, RATE_LIMITS.register)) return reply({ error: "Too many new friend codes this hour" }, 429);
      const name = cleanName(body?.name) || "Friend";
      let code = null;
      for (let i = 0; i < 6 && !code; i++) {
        const candidate = newCode();
        if (!await env.FRIENDS.get(`user:${candidate}`)) code = candidate;
      }
      if (!code) return reply({ error: "Could not allocate a friend code" }, 500);
      const secret = randomHex(16);
      const user = {
        code,
        name,
        secretHash: await sha256hex(secret),
        publicId: randomHex(8),
        stats: cleanStats(null),
        friends: [],
        inbox: [],
        outbox: [],
        threads: {},
        shared: [],
        requestsIn: [],
        requestsOut: [],
        updatedAt: Date.now()
      };
      await env.FRIENDS.put(`user:${code}`, JSON.stringify(user));
      return reply({ code, secret, publicId: user.publicId });
    }
    if (url.pathname === "/sync") {
      const a = await authed(env, body);
      if (a.error) return reply({ error: a.error }, a.status);
      if (!await takeRate(env, `rate:sync:${a.user.code}`, RATE_LIMITS.sync)) return reply({ error: "Too many syncs this hour" }, 429);
      if (body?.name !== void 0) a.user.name = cleanName(body.name) || a.user.name;
      if (body && Object.prototype.hasOwnProperty.call(body, "stats")) a.user.stats = cleanStats(body.stats);
      const warnings = applyProfile(a.user, body || {});
      if (body && Object.prototype.hasOwnProperty.call(body, "squishies")) applySquishies(a.user, body.squishies);
      const publicId = await ensurePublicId(env, a.user);
      if (a.user.publicId !== publicId) a.user.publicId = publicId;
      await saveUser(env, a.user);
      await stampBoardId(env, a.user.code, publicId);
      const squishyPending = squishyRecord(a.user).pending;
      return reply({ ok: true, publicId, ...squishyPending.length ? { squishyPending } : {}, ...warnings.length ? { warning: warnings.join(" ") } : {} });
    }
    if (url.pathname === "/friends") {
      const a = await authed(env, body);
      if (a.error) return reply({ error: a.error }, a.status);
      const out = [];
      for (const code of a.user.friends || []) {
        const friend = hydrate(await loadUser(env, code));
        if (friend) out.push(friendView(a.user, friend));
      }
      return reply(out);
    }
    if (url.pathname === "/friend/add") {
      const a = await authed(env, body);
      if (a.error) return reply({ error: a.error }, a.status);
      if (!await takeRate(env, `rate:friend-add:${a.user.code}`, RATE_LIMITS.friendAdd)) return reply({ error: "Too many friend requests this hour" }, 429);
      const friendCode = String(body?.friendCode || "").trim().toUpperCase();
      if (!friendCode) return reply({ error: "Missing friendCode" }, 400);
      if (friendCode === a.user.code) return reply({ error: "You cannot add yourself" }, 400);
      const friend = hydrate(await loadUser(env, friendCode));
      if (!friend) return reply({ error: "No user with that friend code" }, 404);
      if ((a.user.friends || []).includes(friendCode)) return reply({ ok: true, status: "friends" });
      const theyAsked = hasRequest(a.user.requestsIn, friendCode) || hasRequest(friend.requestsOut, a.user.code);
      if (theyAsked) {
        linkFriends(a.user, friend);
        clearRequestPair(a.user, friend);
        await saveUser(env, a.user);
        await saveUser(env, friend);
        return reply({ ok: true, status: "friends" });
      }
      if (hasRequest(a.user.requestsOut, friendCode)) {
        if (!hasRequest(friend.requestsIn, a.user.code)) {
          const existing = cleanRequests(a.user.requestsOut).find((item) => item.code === friendCode);
          friend.requestsIn = [{ code: a.user.code, name: a.user.name || "Friend", ts: existing?.ts || Date.now() }, ...withoutCode(friend.requestsIn, a.user.code)];
          await saveUser(env, friend);
        }
        return reply({ ok: true, status: "pending" });
      }
      if (cleanRequests(friend.requestsIn).length >= REQUEST_MAX) return reply({ error: INBOX_FULL }, 409);
      if (cleanRequests(a.user.requestsOut).length >= REQUEST_MAX) return reply({ error: OUTBOX_FULL }, 409);
      const ts = Date.now();
      a.user.requestsOut = [{ code: friend.code, name: friend.name || "Friend", ts }, ...withoutCode(a.user.requestsOut, friend.code)];
      friend.requestsIn = [{ code: a.user.code, name: a.user.name || "Friend", ts }, ...withoutCode(friend.requestsIn, a.user.code)];
      await saveUser(env, a.user);
      await saveUser(env, friend);
      return reply({ ok: true, status: "pending" });
    }
    if (url.pathname === "/friend/requests") {
      const a = await authed(env, body);
      if (a.error) return reply({ error: a.error }, a.status);
      return reply({ incoming: cleanRequests(a.user.requestsIn), outgoing: cleanRequests(a.user.requestsOut) });
    }
    if (url.pathname === "/friend/accept") {
      const a = await authed(env, body);
      if (a.error) return reply({ error: a.error }, a.status);
      const friendCode = String(body?.friendCode || "").trim().toUpperCase();
      if (!friendCode) return reply({ error: "Missing friendCode" }, 400);
      if ((a.user.friends || []).includes(friendCode)) return reply({ ok: true, status: "friends" });
      if (!hasRequest(a.user.requestsIn, friendCode)) return reply({ error: "Request not found" }, 404);
      const friend = hydrate(await loadUser(env, friendCode));
      if (!friend) return reply({ error: "No user with that friend code" }, 404);
      linkFriends(a.user, friend);
      clearRequestPair(a.user, friend);
      await saveUser(env, a.user);
      await saveUser(env, friend);
      return reply({ ok: true, status: "friends" });
    }
    if (url.pathname === "/friend/decline") {
      const a = await authed(env, body);
      if (a.error) return reply({ error: a.error }, a.status);
      const friendCode = String(body?.friendCode || "").trim().toUpperCase();
      if (!friendCode) return reply({ error: "Missing friendCode" }, 400);
      if (!hasRequest(a.user.requestsIn, friendCode)) return reply({ error: "Request not found" }, 404);
      a.user.requestsIn = withoutCode(a.user.requestsIn, friendCode);
      await saveUser(env, a.user);
      const friend = hydrate(await loadUser(env, friendCode));
      if (friend) {
        friend.requestsOut = withoutCode(friend.requestsOut, a.user.code);
        await saveUser(env, friend);
      }
      return reply({ ok: true });
    }
    if (url.pathname === "/friend/cancel") {
      const a = await authed(env, body);
      if (a.error) return reply({ error: a.error }, a.status);
      const friendCode = String(body?.friendCode || "").trim().toUpperCase();
      if (!friendCode) return reply({ error: "Missing friendCode" }, 400);
      if (!hasRequest(a.user.requestsOut, friendCode)) return reply({ error: "Request not found" }, 404);
      a.user.requestsOut = withoutCode(a.user.requestsOut, friendCode);
      await saveUser(env, a.user);
      const friend = hydrate(await loadUser(env, friendCode));
      if (friend) {
        friend.requestsIn = withoutCode(friend.requestsIn, a.user.code);
        await saveUser(env, friend);
      }
      return reply({ ok: true });
    }
    if (url.pathname === "/friend/remove") {
      const a = await authed(env, body);
      if (a.error) return reply({ error: a.error }, a.status);
      const friendCode = String(body?.friendCode || "").trim().toUpperCase();
      if (!friendCode) return reply({ error: "Missing friendCode" }, 400);
      a.user.friends = (a.user.friends || []).filter((c) => c !== friendCode);
      a.user.requestsIn = withoutCode(a.user.requestsIn, friendCode);
      a.user.requestsOut = withoutCode(a.user.requestsOut, friendCode);
      await saveUser(env, a.user);
      const friend = hydrate(await loadUser(env, friendCode));
      if (friend) {
        friend.friends = (friend.friends || []).filter((c) => c !== a.user.code);
        friend.requestsIn = withoutCode(friend.requestsIn, a.user.code);
        friend.requestsOut = withoutCode(friend.requestsOut, a.user.code);
        await saveUser(env, friend);
      }
      return reply({ ok: true });
    }
    if (url.pathname === "/note/send") {
      const a = await authed(env, body);
      if (a.error) return reply({ error: a.error }, a.status);
      const to = String(body?.to || "").trim().toUpperCase();
      if (!to) return reply({ error: "Missing recipient code" }, 400);
      if (to === a.user.code) return reply({ error: "You cannot send a note to yourself" }, 400);
      if (!await takeRate(env, `rate:note:${a.user.code}`, RATE_LIMITS.note)) return reply({ error: "Too many notes this hour" }, 429);
      const friend = await friendsBothWays(env, a.user, to);
      if (!friend) return reply({ error: "Add that person as a friend first" }, 403);
      const text = String(body?.body ?? "").trim().slice(0, NOTE_BODY_MAX);
      if (!text) return reply({ error: "Write the note first" }, 400);
      const note = {
        id: randomHex(8),
        from: a.user.code,
        fromName: a.user.name,
        to,
        title: String(body?.title ?? "").trim().slice(0, NOTE_TITLE_MAX),
        body: text,
        studyId: cleanStudyId(body?.studyId),
        ref: cleanNoteRef(body?.ref),
        ts: Date.now(),
        read: false
      };
      friend.inbox = [note, ...friend.inbox || []].slice(0, NOTE_BOX_MAX);
      a.user.outbox = [note, ...a.user.outbox || []].slice(0, NOTE_BOX_MAX);
      await env.FRIENDS.put(`user:${friend.code}`, JSON.stringify(friend));
      await saveUser(env, a.user);
      return reply({ ok: true, id: note.id });
    }
    if (url.pathname === "/notes") {
      const a = await authed(env, body);
      if (a.error) return reply({ error: a.error }, a.status);
      return reply({ inbox: a.user.inbox || [], sent: a.user.outbox || [] });
    }
    if (url.pathname === "/note/read") {
      const a = await authed(env, body);
      if (a.error) return reply({ error: a.error }, a.status);
      const id = String(body?.id || "");
      const note = (a.user.inbox || []).find((n) => n.id === id);
      if (!note) return reply({ error: "Note not found" }, 404);
      if (!note.read) {
        note.read = true;
        await saveUser(env, a.user);
      }
      return reply({ ok: true });
    }
    if (url.pathname === "/note/delete") {
      const a = await authed(env, body);
      if (a.error) return reply({ error: a.error }, a.status);
      const id = String(body?.id || "");
      const box = body?.box === "sent" ? "outbox" : "inbox";
      const before = (a.user[box] || []).length;
      a.user[box] = (a.user[box] || []).filter((n) => n.id !== id);
      if (a.user[box].length === before) return reply({ error: "Note not found" }, 404);
      await saveUser(env, a.user);
      return reply({ ok: true });
    }
    if (url.pathname === "/scores/submit") {
      const a = await authed(env, body);
      if (a.error) return reply({ error: a.error }, a.status);
      const show = String(body?.show || "").toLowerCase();
      if (!SHOWS.includes(show)) return reply({ error: "Unknown game" }, 400);
      const score = Math.floor(num(body?.score));
      const level = Math.min(5, Math.max(1, Math.floor(num(body?.level)) || 1));
      if (score <= 0) return reply({ ok: true, skipped: true });
      if (score > SCORE_MAX) return reply({ error: "That score is too high" }, 400);
      if (!await takeRate(env, `rate:scores:${a.user.code}`, RATE_LIMITS.scores)) return reply({ error: "Too many scores this hour" }, 429);
      const publicId = await ensurePublicId(env, a.user);
      await stampBoardId(env, a.user.code, publicId);
      const board = await loadBoard(env);
      const list = Array.isArray(board[show]) ? board[show] : [];
      const mine = list.find((e) => e.code === a.user.code);
      if (!mine || score > mine.score) {
        const entry = { code: a.user.code, id: publicId, name: a.user.name, score, level, ts: Date.now() };
        const next = list.filter((e) => e.code !== a.user.code).concat(entry);
        next.sort((x, y) => y.score - x.score || x.ts - y.ts);
        board[show] = next.slice(0, BOARD_MAX);
        await env.FRIENDS.put(BOARD_KEY, JSON.stringify(board));
      } else if (mine && mine.id !== publicId) {
        mine.id = publicId;
        await env.FRIENDS.put(BOARD_KEY, JSON.stringify(board));
      }
      return reply({ ok: true });
    }
    if (url.pathname === "/room/create") {
      const a = await authed(env, body);
      if (a.error) return reply({ error: a.error }, a.status);
      const show = String(body?.show || "").toLowerCase();
      if (!SHOWS.includes(show)) return reply({ error: "Unknown game" }, 400);
      const level = Math.min(5, Math.max(1, Math.floor(num(body?.level)) || 1));
      let roomCode = null;
      for (let i = 0; i < 6 && !roomCode; i++) {
        const candidate = newRoomCode();
        if (!await env.FRIENDS.get(`room:${candidate}`)) roomCode = candidate;
      }
      if (!roomCode) return reply({ error: "Could not open a room" }, 500);
      const room = {
        room: roomCode,
        show,
        level,
        host: a.user.code,
        status: "waiting",
        createdAt: Date.now(),
        startedAt: null,
        players: [{ code: a.user.code, name: a.user.name, score: 0, finished: false, updatedAt: Date.now() }]
      };
      await saveRoom(env, room);
      return reply(publicRoom(room));
    }
    if (url.pathname === "/room/join") {
      const a = await authed(env, body);
      if (a.error) return reply({ error: a.error }, a.status);
      const roomCode = String(body?.room || "").trim().toUpperCase();
      const room = await loadRoom(env, roomCode);
      if (!room) return reply({ error: "No room with that code" }, 404);
      if (room.players.some((p) => p.code === a.user.code)) return reply(publicRoom(room));
      const host = await loadUser(env, room.host);
      const areFriends = host && ((host.friends || []).includes(a.user.code) || (a.user.friends || []).includes(host.code));
      if (!areFriends) return reply({ error: "Rooms are for friends \u2014 add the host as a friend first" }, 403);
      if (room.status !== "waiting") return reply({ error: "That room already started" }, 409);
      if (room.players.length >= ROOM_MAX_PLAYERS) return reply({ error: "That room is full" }, 409);
      room.players.push({ code: a.user.code, name: a.user.name, score: 0, finished: false, updatedAt: Date.now() });
      await saveRoom(env, room);
      return reply(publicRoom(room));
    }
    if (url.pathname === "/room/start") {
      const a = await authed(env, body);
      if (a.error) return reply({ error: a.error }, a.status);
      const room = await loadRoom(env, String(body?.room || "").trim().toUpperCase());
      if (!room) return reply({ error: "No room with that code" }, 404);
      if (room.host !== a.user.code) return reply({ error: "Only the host can start the room" }, 403);
      if (room.status !== "waiting") return reply({ error: "That room already started" }, 409);
      if (room.players.length < 2) return reply({ error: "Wait for a friend to join first" }, 400);
      room.status = "active";
      room.startedAt = Date.now();
      await saveRoom(env, room);
      return reply(publicRoom(room));
    }
    if (url.pathname === "/room/score") {
      const a = await authed(env, body);
      if (a.error) return reply({ error: a.error }, a.status);
      const room = await loadRoom(env, String(body?.room || "").trim().toUpperCase());
      if (!room) return reply({ error: "No room with that code" }, 404);
      if (room.status !== "active") return reply({ error: "That room is not active" }, 409);
      const me = room.players.find((p) => p.code === a.user.code);
      if (!me) return reply({ error: "You are not in that room" }, 403);
      me.score = Math.max(me.score || 0, Math.floor(num(body?.score)));
      if (body?.finished) {
        me.score = Math.floor(num(body?.score));
        me.finished = true;
      }
      me.updatedAt = Date.now();
      if (room.players.length > 0 && room.players.every((p) => p.finished)) room.status = "done";
      await saveRoom(env, room);
      return reply(publicRoom(room));
    }
    if (url.pathname === "/room/state") {
      const a = await authed(env, body);
      if (a.error) return reply({ error: a.error }, a.status);
      const room = await loadRoom(env, String(body?.room || "").trim().toUpperCase());
      if (!room) return reply({ error: "No room with that code" }, 404);
      if (!room.players.some((p) => p.code === a.user.code)) return reply({ error: "You are not in that room" }, 403);
      return reply(publicRoom(room));
    }
    if (url.pathname === "/room/leave") {
      const a = await authed(env, body);
      if (a.error) return reply({ error: a.error }, a.status);
      const roomCode = String(body?.room || "").trim().toUpperCase();
      const room = await loadRoom(env, roomCode);
      if (!room) return reply({ ok: true });
      room.players = room.players.filter((p) => p.code !== a.user.code);
      if (!room.players.length) {
        await env.FRIENDS.delete(`room:${roomCode}`);
        return reply({ ok: true });
      }
      if (room.host === a.user.code) room.host = room.players[0].code;
      await saveRoom(env, room);
      return reply(publicRoom(room));
    }
    if (url.pathname === "/msg/send") {
      const a = await authed(env, body);
      if (a.error) return reply({ error: a.error }, a.status);
      const to = String(body?.to || "").trim().toUpperCase();
      if (!to) return reply({ error: "Missing recipient code" }, 400);
      if (to === a.user.code) return reply({ error: "You cannot message yourself" }, 400);
      if (!await takeRate(env, `rate:msg:${a.user.code}`, RATE_LIMITS.msg)) return reply({ error: "Too many messages this hour" }, 429);
      const friend = await friendsBothWays(env, a.user, to);
      if (!friend) return reply({ error: "Add that person as a friend first" }, 403);
      const text = String(body?.body ?? "").trim().slice(0, 2e3);
      if (!text) return reply({ error: "Write the message first" }, 400);
      const msg = { id: randomHex(8), from: a.user.code, fromName: a.user.name, body: text, ts: Date.now(), read: false };
      a.user.threads = a.user.threads || {};
      friend.threads = friend.threads || {};
      a.user.threads[to] = [...a.user.threads[to] || [], msg].slice(-100);
      friend.threads[a.user.code] = [...friend.threads[a.user.code] || [], msg].slice(-100);
      await env.FRIENDS.put(`user:${friend.code}`, JSON.stringify(friend));
      await saveUser(env, a.user);
      return reply({ ok: true, id: msg.id });
    }
    if (url.pathname === "/msg/thread") {
      const a = await authed(env, body);
      if (a.error) return reply({ error: a.error }, a.status);
      const withCode = String(body?.with || "").trim().toUpperCase();
      if (!(a.user.friends || []).includes(withCode)) return reply({ error: "You are not friends anymore, so this conversation is hidden." }, 403);
      a.user.threads = a.user.threads || {};
      const thread = a.user.threads[withCode] || [];
      let changed = false;
      for (const m of thread) {
        if (m.from === withCode && !m.read) {
          m.read = true;
          changed = true;
        }
      }
      if (changed) {
        await saveUser(env, a.user);
        const friend = hydrate(await loadUser(env, withCode));
        if (friend && friend.threads && friend.threads[a.user.code]) {
          for (const m of friend.threads[a.user.code]) if (m.from === withCode) m.read = true;
          await env.FRIENDS.put(`user:${friend.code}`, JSON.stringify(friend));
        }
      }
      return reply({ with: withCode, messages: thread.slice(-60) });
    }
    if (url.pathname === "/shared/create") {
      const a = await authed(env, body);
      if (a.error) return reply({ error: a.error }, a.status);
      const to = String(body?.to || "").trim().toUpperCase();
      if (!to) return reply({ error: "Missing friend code" }, 400);
      if (to === a.user.code) return reply({ error: "Pick a friend to write with" }, 400);
      if (!await takeRate(env, `rate:shared:${a.user.code}`, RATE_LIMITS.shared)) return reply({ error: "Too many shared notes this hour" }, 429);
      const friend = await friendsBothWays(env, a.user, to);
      if (!friend) return reply({ error: "Add that person as a friend first" }, 403);
      const text = String(body?.body ?? "").trim().slice(0, NOTE_BODY_MAX);
      if (!text) return reply({ error: "Write the first line together first" }, 400);
      const id = randomHex(8);
      const note = {
        id,
        owner: a.user.code,
        ownerName: a.user.name,
        with: to,
        withName: friend.name,
        editors: [a.user.code, to],
        title: String(body?.title ?? "").trim().slice(0, NOTE_TITLE_MAX),
        body: text,
        studyId: cleanStudyId(body?.studyId),
        ref: cleanNoteRef(body?.ref),
        createdAt: Date.now(),
        updatedAt: Date.now(),
        updatedBy: a.user.code,
        updatedByName: a.user.name
      };
      await env.FRIENDS.put(`shared:${id}`, JSON.stringify(note));
      a.user.shared = [id, ...a.user.shared || []].slice(0, 30);
      friend.shared = [id, ...friend.shared || []].slice(0, 30);
      await env.FRIENDS.put(`user:${friend.code}`, JSON.stringify(friend));
      await saveUser(env, a.user);
      return reply(note);
    }
    if (url.pathname === "/shared/list") {
      const a = await authed(env, body);
      if (a.error) return reply({ error: a.error }, a.status);
      const out = [];
      for (const id of a.user.shared || []) {
        try {
          const raw = await env.FRIENDS.get(`shared:${id}`);
          if (!raw) continue;
          const note = JSON.parse(raw);
          if (!(note.editors || []).includes(a.user.code)) continue;
          out.push(note);
        } catch {
        }
      }
      out.sort((x, y) => (y.updatedAt || 0) - (x.updatedAt || 0));
      return reply({ notes: out });
    }
    if (url.pathname === "/shared/get") {
      const a = await authed(env, body);
      if (a.error) return reply({ error: a.error }, a.status);
      const id = String(body?.id || "");
      const raw = await env.FRIENDS.get(`shared:${id}`);
      if (!raw) return reply({ error: "Shared note not found" }, 404);
      const note = JSON.parse(raw);
      if (!(note.editors || []).includes(a.user.code)) return reply({ error: "That note is not shared with you" }, 403);
      return reply(note);
    }
    if (url.pathname === "/shared/update") {
      const a = await authed(env, body);
      if (a.error) return reply({ error: a.error }, a.status);
      const id = String(body?.id || "");
      const raw = await env.FRIENDS.get(`shared:${id}`);
      if (!raw) return reply({ error: "Shared note not found" }, 404);
      const note = JSON.parse(raw);
      if (!(note.editors || []).includes(a.user.code)) return reply({ error: "That note is not shared with you" }, 403);
      const text = String(body?.body ?? "").trim().slice(0, NOTE_BODY_MAX);
      if (!text) return reply({ error: "The note cannot be empty" }, 400);
      note.title = String(body?.title ?? note.title ?? "").trim().slice(0, NOTE_TITLE_MAX);
      note.body = text;
      note.updatedAt = Date.now();
      note.updatedBy = a.user.code;
      note.updatedByName = a.user.name;
      await env.FRIENDS.put(`shared:${id}`, JSON.stringify(note));
      return reply(note);
    }
    if (url.pathname === "/shared/delete") {
      const a = await authed(env, body);
      if (a.error) return reply({ error: a.error }, a.status);
      const id = String(body?.id || "");
      const raw = await env.FRIENDS.get(`shared:${id}`);
      if (!raw) return reply({ error: "Shared note not found" }, 404);
      const note = JSON.parse(raw);
      if (!(note.editors || []).includes(a.user.code)) return reply({ error: "That note is not shared with you" }, 403);
      await env.FRIENDS.delete(`shared:${id}`);
      for (const code of note.editors || []) {
        const u = hydrate(await loadUser(env, code));
        if (u) {
          u.shared = (u.shared || []).filter((x) => x !== id);
          await env.FRIENDS.put(`user:${u.code}`, JSON.stringify(u));
        }
      }
      return reply({ ok: true });
    }
    if (url.pathname === "/verse/send") {
      const a = await authed(env, body);
      if (a.error) return reply({ error: a.error }, a.status);
      const friend = await friendsBothWays(env, a.user, body?.to);
      if (!friend) return reply({ error: "You can only send a verse to an accepted friend" }, 403);
      if (!await takeRate(env, `rate:verse:${a.user.code}`, VERSE_RATE)) return reply({ error: "Too many verses this hour" }, 429);
      const text = boundedText(body?.text, VERSE_TEXT_MAX);
      if (text.error) return reply({ error: "That verse is too long" }, 400);
      if (!text.text) return reply({ error: "Missing verse text" }, 400);
      const note = boundedText(body?.note, VERSE_NOTE_MAX);
      if (note.error) return reply({ error: "That note is too long" }, 400);
      const reference = boundedText(body?.reference, VERSE_REF_MAX);
      if (reference.error) return reply({ error: "That reference is too long" }, 400);
      const book = verseNumber(body?.book, 1, 78);
      const chapter = verseNumber(body?.chapter, 1, 200);
      const verse = verseNumber(body?.verse, 1, 200);
      if (book == null || chapter == null || verse == null) return reply({ error: "That verse is not in this Bible" }, 400);
      const translation = body?.translation === "rvr" ? "rvr" : "kjv";
      const id = randomHex(8);
      const ts = Date.now();
      const base = {
        id,
        from: a.user.code,
        fromName: a.user.name || "Friend",
        to: friend.code,
        toName: friend.name || "Friend",
        book,
        chapter,
        verse,
        reference: reference.text,
        text: text.text,
        note: note.text,
        translation,
        ts
      };
      const senderBox = await loadVersebox(env, a.user.code);
      const friendBox = await loadVersebox(env, friend.code);
      senderBox.unshift({ ...base, read: true, direction: "out" });
      friendBox.unshift({ ...base, read: false, direction: "in" });
      await saveVersebox(env, a.user.code, senderBox);
      await saveVersebox(env, friend.code, friendBox);
      return reply({ ok: true, id });
    }
    if (url.pathname === "/verse/inbox" || url.pathname === "/verse/thread") {
      const a = await authed(env, body);
      if (a.error) return reply({ error: a.error }, a.status);
      const withCode = String(body?.with || "").trim().toUpperCase();
      if (url.pathname === "/verse/thread") {
        const friend = await friendsBothWays(env, a.user, withCode);
        if (!friend) return reply({ error: "You are not friends" }, 403);
      }
      const box = await loadVersebox(env, a.user.code);
      const verses = [];
      for (const item of box) {
        const other = otherParty(item, a.user.code);
        const friend = await friendsBothWays(env, a.user, other);
        if (!friend) continue;
        if (withCode && other !== withCode) continue;
        verses.push(item);
      }
      return reply({ verses });
    }
    if (url.pathname === "/verse/read") {
      const a = await authed(env, body);
      if (a.error) return reply({ error: a.error }, a.status);
      if (!await takeRate(env, `rate:verse-read:${a.user.code}`, VERSE_READ_RATE)) return reply({ error: "Too many verse reads this hour" }, 429);
      const id = String(body?.id || "");
      const box = await loadVersebox(env, a.user.code);
      const item = box.find((row) => row && row.id === id);
      if (!item) return reply({ error: "Verse not found" }, 404);
      const friend = await friendsBothWays(env, a.user, otherParty(item, a.user.code));
      if (!friend) return reply({ error: "You are not friends" }, 403);
      item.read = true;
      await saveVersebox(env, a.user.code, box);
      return reply({ ok: true });
    }
    if (url.pathname === "/study/get" || url.pathname === "/study/add" || url.pathname === "/study/delete") {
      const a = await authed(env, body);
      if (a.error) return reply({ error: a.error }, a.status);
      const friend = await friendsBothWays(env, a.user, body?.with);
      if (!friend) return reply({ error: "You are not friends" }, 403);
      const note = await loadStudy(env, a.user.code, friend.code);
      if (url.pathname === "/study/get") return reply(note);
      if (url.pathname === "/study/delete") {
        if (!await takeRate(env, `rate:study-delete:${a.user.code}`, STUDY_DELETE_RATE)) return reply({ error: "Too many study deletes this hour" }, 429);
        const entryId2 = String(body?.entryId || "");
        note.entries = (note.entries || []).filter((entry) => entry.id !== entryId2);
        note.updatedAt = Date.now();
        await env.FRIENDS.put(note.id, JSON.stringify(note));
        return reply(note);
      }
      if (!await takeRate(env, `rate:study:${a.user.code}`, STUDY_RATE)) return reply({ error: "Too many study writes this hour" }, 429);
      const question = boundedText(body?.question, STUDY_QUESTION_MAX);
      if (question.error) return reply({ error: "That question is too long" }, 400);
      if (!question.text) return reply({ error: "Write a question first" }, 400);
      const answer = boundedText(body?.answer, STUDY_ANSWER_MAX);
      if (answer.error) return reply({ error: "That answer is too long" }, 400);
      const verses = cleanStudyVerses(body?.verses);
      if (verses.error) return reply({ error: verses.error }, 400);
      const requested = String(body?.entryId || "");
      const entryId = /^[a-f0-9]{8,16}$/.test(requested) ? requested : randomHex(8);
      const now = Date.now();
      const existing = (note.entries || []).find((entry) => entry.id === entryId);
      if (existing) {
        existing.question = question.text;
        existing.answer = answer.text;
        existing.verses = verses.verses;
        existing.updatedBy = a.user.code;
        existing.updatedByName = a.user.name || "Friend";
        existing.ts = now;
      } else {
        if ((note.entries || []).length >= STUDY_ENTRIES_MAX) return reply({ error: "This notebook is full" }, 400);
        note.entries.unshift({
          id: entryId,
          question: question.text,
          answer: answer.text,
          verses: verses.verses,
          author: a.user.code,
          authorName: a.user.name || "Friend",
          updatedBy: a.user.code,
          updatedByName: a.user.name || "Friend",
          ts: now
        });
      }
      note.updatedAt = now;
      await env.FRIENDS.put(note.id, JSON.stringify(note));
      return reply(note);
    }
    if (url.pathname.startsWith("/trade/")) {
      const [data, code = 200] = await handleTrade(url.pathname, body, env, authed);
      return reply(data, code);
    }
    return reply({ error: "Not found" }, 404);
  } catch {
    return reply({ error: "Server error" }, 500);
  }
}
__name(handleFriends, "handleFriends");
var friends_default = { fetch: handleFriends };

// ../../wr/node_modules/wrangler/templates/middleware/middleware-ensure-req-body-drained.ts
var drainBody = /* @__PURE__ */ __name(async (request, env, _ctx, middlewareCtx) => {
  try {
    return await middlewareCtx.next(request, env);
  } finally {
    try {
      if (request.body !== null && !request.bodyUsed) {
        const reader = request.body.getReader();
        while (!(await reader.read()).done) {
        }
      }
    } catch (e) {
      console.error("Failed to drain the unused request body.", e);
    }
  }
}, "drainBody");
var middleware_ensure_req_body_drained_default = drainBody;

// ../../wr/node_modules/wrangler/templates/middleware/middleware-miniflare3-json-error.ts
function reduceError(e) {
  return {
    name: e?.name,
    message: e?.message ?? String(e),
    stack: e?.stack,
    cause: e?.cause === void 0 ? void 0 : reduceError(e.cause)
  };
}
__name(reduceError, "reduceError");
var jsonError = /* @__PURE__ */ __name(async (request, env, _ctx, middlewareCtx) => {
  try {
    return await middlewareCtx.next(request, env);
  } catch (e) {
    const error = reduceError(e);
    const body = JSON.stringify(error);
    const headers = {
      "Content-Type": "application/json",
      "MF-Experimental-Error-Stack": "true"
    };
    const encoded = encodeURIComponent(body);
    if (encoded.length <= 8192) {
      headers["MF-Experimental-Error-Stack-Payload"] = encoded;
    }
    return new Response(body, { status: 500, headers });
  }
}, "jsonError");
var middleware_miniflare3_json_error_default = jsonError;

// .wrangler/tmp/bundle-AAGP5D/middleware-insertion-facade.js
var __INTERNAL_WRANGLER_MIDDLEWARE__ = [
  middleware_ensure_req_body_drained_default,
  middleware_miniflare3_json_error_default
];
var middleware_insertion_facade_default = friends_default;

// ../../wr/node_modules/wrangler/templates/middleware/common.ts
var __facade_middleware__ = [];
function __facade_register__(...args) {
  __facade_middleware__.push(...args.flat());
}
__name(__facade_register__, "__facade_register__");
function __facade_invokeChain__(request, env, ctx, dispatch, middlewareChain) {
  const [head, ...tail] = middlewareChain;
  const middlewareCtx = {
    dispatch,
    next(newRequest, newEnv) {
      return __facade_invokeChain__(newRequest, newEnv, ctx, dispatch, tail);
    }
  };
  return head(request, env, ctx, middlewareCtx);
}
__name(__facade_invokeChain__, "__facade_invokeChain__");
function __facade_invoke__(request, env, ctx, dispatch, finalMiddleware) {
  return __facade_invokeChain__(request, env, ctx, dispatch, [
    ...__facade_middleware__,
    finalMiddleware
  ]);
}
__name(__facade_invoke__, "__facade_invoke__");

// .wrangler/tmp/bundle-AAGP5D/middleware-loader.entry.ts
var __Facade_ScheduledController__ = class ___Facade_ScheduledController__ {
  constructor(scheduledTime, cron, noRetry) {
    this.scheduledTime = scheduledTime;
    this.cron = cron;
    this.#noRetry = noRetry;
  }
  scheduledTime;
  cron;
  static {
    __name(this, "__Facade_ScheduledController__");
  }
  #noRetry;
  noRetry() {
    if (!(this instanceof ___Facade_ScheduledController__)) {
      throw new TypeError("Illegal invocation");
    }
    this.#noRetry();
  }
};
function wrapExportedHandler(worker) {
  if (__INTERNAL_WRANGLER_MIDDLEWARE__ === void 0 || __INTERNAL_WRANGLER_MIDDLEWARE__.length === 0) {
    return worker;
  }
  for (const middleware of __INTERNAL_WRANGLER_MIDDLEWARE__) {
    __facade_register__(middleware);
  }
  const fetchDispatcher = /* @__PURE__ */ __name(function(request, env, ctx) {
    if (worker.fetch === void 0) {
      throw new Error("Handler does not export a fetch() function.");
    }
    return worker.fetch(request, env, ctx);
  }, "fetchDispatcher");
  return {
    ...worker,
    fetch(request, env, ctx) {
      const dispatcher = /* @__PURE__ */ __name(function(type, init) {
        if (type === "scheduled" && worker.scheduled !== void 0) {
          const controller = new __Facade_ScheduledController__(
            Date.now(),
            init.cron ?? "",
            () => {
            }
          );
          return worker.scheduled(controller, env, ctx);
        }
      }, "dispatcher");
      return __facade_invoke__(request, env, ctx, dispatcher, fetchDispatcher);
    }
  };
}
__name(wrapExportedHandler, "wrapExportedHandler");
function wrapWorkerEntrypoint(klass) {
  if (__INTERNAL_WRANGLER_MIDDLEWARE__ === void 0 || __INTERNAL_WRANGLER_MIDDLEWARE__.length === 0) {
    return klass;
  }
  for (const middleware of __INTERNAL_WRANGLER_MIDDLEWARE__) {
    __facade_register__(middleware);
  }
  return class extends klass {
    #fetchDispatcher = /* @__PURE__ */ __name((request, env, ctx) => {
      this.env = env;
      this.ctx = ctx;
      if (super.fetch === void 0) {
        throw new Error("Entrypoint class does not define a fetch() function.");
      }
      return super.fetch(request);
    }, "#fetchDispatcher");
    #dispatcher = /* @__PURE__ */ __name((type, init) => {
      if (type === "scheduled" && super.scheduled !== void 0) {
        const controller = new __Facade_ScheduledController__(
          Date.now(),
          init.cron ?? "",
          () => {
          }
        );
        return super.scheduled(controller);
      }
    }, "#dispatcher");
    fetch(request) {
      return __facade_invoke__(
        request,
        this.env,
        this.ctx,
        this.#dispatcher,
        this.#fetchDispatcher
      );
    }
  };
}
__name(wrapWorkerEntrypoint, "wrapWorkerEntrypoint");
var WRAPPED_ENTRY;
if (typeof middleware_insertion_facade_default === "object") {
  WRAPPED_ENTRY = wrapExportedHandler(middleware_insertion_facade_default);
} else if (typeof middleware_insertion_facade_default === "function") {
  WRAPPED_ENTRY = wrapWorkerEntrypoint(middleware_insertion_facade_default);
}
var middleware_loader_entry_default = WRAPPED_ENTRY;
export {
  FRIEND_LIMITS,
  RATE_LIMITS,
  SQUISHY_IDS,
  SQUISHY_LEGENDARY,
  SQUISHY_STARTERS,
  TRADE_RULES,
  __INTERNAL_WRANGLER_MIDDLEWARE__,
  applySquishies,
  cleanSquishyIds,
  middleware_loader_entry_default as default,
  handleFriends,
  handleTrade,
  publicSquishies,
  tradableSquishy,
  tradeCheck
};
//# sourceMappingURL=friends.js.map
