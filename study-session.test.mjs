import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
const require = createRequire(import.meta.url);
const S = require('./study-session.js');
const read = p => readFileSync(new URL(p, import.meta.url), 'utf8');
const MIN = 60000;
const on = { visible: true, studying: true };

/* play a session: every 5 s a tick, touching every `touch` ms */
function studyFor(st, t0, ms, { touch = 30000, ...where } = {}) {
  let t = t0, lastTouch = -Infinity, fresh = [];
  for (; t <= t0 + ms; t += 5000) {
    if (touch && t - lastTouch >= touch) { st.interact(t); lastTouch = t; }
    fresh = fresh.concat(st.tick(t, { ...on, ...where }));
  }
  return { t, fresh };
}

test('active study time adds up and the 45 minute cold brew is earned once', () => {
  const st = S.session();
  const a = studyFor(st, 1e6, 44 * MIN);
  assert.ok(st.ms >= 43.9 * MIN && st.ms <= 44 * MIN);
  assert.deepEqual(a.fresh, []);
  const b = studyFor(st, a.t, 2 * MIN);
  assert.deepEqual(b.fresh, ['cold-brew']);
  const c = studyFor(st, b.t, 5 * MIN);
  assert.deepEqual(c.fresh, [], 'only once');
  const d = studyFor(st, c.t, 75 * MIN);
  assert.deepEqual(d.fresh, ['cold-brew-venti']);
  assert.equal(S.bestMinutes(st.save()) >= 120, true);
});

test('no time counts when hidden, away from study screens, or idle more than 2 minutes', () => {
  const st = S.session();
  studyFor(st, 0, 10 * MIN, { visible: false });
  assert.equal(st.ms, 0);
  studyFor(st, 20 * MIN, 10 * MIN, { studying: false });
  assert.equal(st.ms, 0);
  /* one touch, then 10 minutes of just staring: only the first 2 minutes count */
  const st2 = S.session(); st2.interact(0);
  for (let t = 0; t <= 10 * MIN; t += 5000) st2.tick(t, on);
  assert.equal(st2.ms, S.IDLE_MS);
  /* a sleeping phone (one huge gap between ticks) adds at most one step */
  const st3 = S.session(); st3.interact(0); st3.tick(0, on); st3.interact(100 * 1000); st3.tick(110 * 1000, on);
  assert.equal(st3.ms, S.STEP_CAP_MS);
});

test('a break over 30 minutes starts a new session; the best one is kept', () => {
  const st = S.session();
  const a = studyFor(st, 0, 30 * MIN);
  const best = st.ms;
  /* 31 min away without touching */
  st.tick(a.t + 31 * MIN, on);
  assert.equal(st.ms, 0);
  assert.equal(st.best, best);
  studyFor(st, a.t + 32 * MIN, 20 * MIN);
  assert.ok(st.ms < 21 * MIN && st.best === best, 'two 30-minute halves do not make 45');
  /* short breaks (under 30 min) keep the session going */
  const st2 = S.session();
  const p = studyFor(st2, 0, 30 * MIN);
  st2.tick(p.t + 20 * MIN, on);
  const q = studyFor(st2, p.t + 20 * MIN, 16 * MIN);
  assert.ok(st2.ms >= 45 * MIN); assert.ok(q.fresh.includes('cold-brew'));
});

test('saved progress survives a reload; junk is ignored', () => {
  const st = S.session(); studyFor(st, 0, 20 * MIN);
  const saved = JSON.parse(JSON.stringify(st.save()));
  const again = S.session(saved);
  assert.equal(again.ms, st.ms); assert.equal(again.best, st.best);
  /* a restored backup with a better best is never overwritten by a smaller one */
  again.merge({ best: 99 * MIN }); assert.equal(again.best, 99 * MIN); again.merge({ best: 1 }); assert.equal(again.best, 99 * MIN);
  const junk = S.session({ ms: 'x', best: -5, act: null });
  assert.equal(junk.ms, 0); assert.equal(junk.best, 0);
  const store = new Map(); const ls = { getItem: k => store.get(k) ?? null };
  assert.deepEqual(S.load(ls), {}); store.set(S.KEY, '{bad'); assert.deepEqual(S.load(ls), {});
  assert.ok(S.KEY.startsWith('msb_'), 'kept in backups (msb_ prefix)');
});

test('cold brew badges are in the achievements with their own drawn cup', () => {
  const aura = read('./aura.js'), html = read('./index.html'), sw = read('./sw.js');
  assert.match(aura, /id:'cold-brew',icon:'svg:cold-brew',name:'Salted Caramel Cold Brew',nameEs:'Cold brew de caramelo salado'/);
  assert.match(aura, /id:'cold-brew-venti',icon:'svg:cold-brew-venti',name:'Venti Salted Caramel Cold Brew'/);
  assert.match(aura, /'cold-brew':45,'cold-brew-venti':120/);
  assert.equal((aura.match(/\$\{msbAchIcon\(a\)\}/g) || []).length, 2, 'pop-up toast and the achievements list');
  assert.ok(html.includes('<script src="study-session.js" defer>') && html.indexOf('study-session.js') < html.indexOf('aura.js'));
  assert.ok(sw.includes("'./study-session.js'"));
  const svg = S.icon(false), venti = S.icon(true);
  assert.match(svg, /^<svg[^>]+viewBox="0 0 64 64"/); assert.match(svg, /aria-hidden="true"/);
  assert.ok(!/#[0-9a-f]{3,6}\b/i.test(svg.replace(/url\(#[a-z-]+\)/g, '')), 'rgb colors only');
  assert.notEqual(svg, venti); assert.match(venti, />V</);
  /* gradients get unique ids per size so both can sit on one page */
  assert.ok(!venti.includes('id="cb-'));
  for (const s of S.STUDY_SCREENS) assert.ok(aura.includes(`'${s}'`), s);
});
