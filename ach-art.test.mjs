/* Painted achievement badges: every achievement has its art, the files are
   square transparent WebP at 128 and 256 px, and the app and the service
   worker agree on the list. */
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = (p) => readFileSync(new URL(p, import.meta.url), 'utf8');
const aura = read('./aura.js');
const sw = read('./sw.js');
const ids = [...aura.matchAll(/\{id:'([a-z0-9-]+)',icon:'/g)].map((m) => m[1]);
const list = (src, re) => [...src.match(re)[1].matchAll(/'([a-z0-9-]+)'/g)].map((m) => m[1]);

/* Width, height and alpha flag from a WebP header (VP8X, VP8L or VP8). */
function webpInfo(buf) {
  assert.equal(buf.toString('ascii', 0, 4), 'RIFF'); assert.equal(buf.toString('ascii', 8, 12), 'WEBP');
  const kind = buf.toString('ascii', 12, 16);
  if (kind === 'VP8X') return { w: 1 + buf.readUIntLE(24, 3), h: 1 + buf.readUIntLE(27, 3), alpha: !!(buf[20] & 0x10) };
  if (kind === 'VP8L') { const b = buf.readUInt32LE(21); return { w: 1 + (b & 0x3fff), h: 1 + ((b >> 14) & 0x3fff), alpha: !!((b >> 28) & 1) }; }
  return { w: buf.readUInt16LE(26) & 0x3fff, h: buf.readUInt16LE(28) & 0x3fff, alpha: false };
}

test('all 21 achievements have painted art, listed the same in aura.js and sw.js', () => {
  assert.equal(ids.length, 21);
  const app = list(aura, /const MSB_ACH_ART=new Set\((\[[^\]]*\])\)/);
  const cached = list(sw, /const ACH_ART = (\[[^\]]*\]);/);
  assert.deepEqual([...app].sort(), [...ids].sort());
  assert.deepEqual(cached, app);
});

test('each badge is a square, transparent WebP at 128 and 256 px, hashed in art-hashes.json', () => {
  const hashes = JSON.parse(read('./img/art-hashes.json'));
  for (const id of ids) for (const px of [128, 256]) {
    const path = `img/ach/${id}-${px}.webp`;
    const info = webpInfo(readFileSync(new URL(`./${path}`, import.meta.url)));
    assert.deepEqual(info, { w: px, h: px, alpha: true }, path);
    assert.ok(hashes[path], `${path} in art-hashes.json`);
  }
});

test('painted art wins over the emoji and the old cold brew drawings', () => {
  assert.match(aura, /function msbAchIcon\(a\)\{if\(a&&MSB_ACH_ART\.has\(a\.id\)\)return msbAchArt\(a\.id\);/);
  assert.ok(aura.includes('src="img/ach/${esc(id)}-128.webp" srcset="img/ach/${esc(id)}-128.webp 1x, img/ach/${esc(id)}-256.webp 3x"'));
  assert.match(sw, /\.concat\(ACH_ART\.map\(\(id\) => `\.\/img\/ach\/\$\{id\}-128\.webp`\)\)/, 'the 128s are precached for offline');
});
