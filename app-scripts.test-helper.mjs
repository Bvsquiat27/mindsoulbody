/* Test helper: index.html as the app actually runs it. Scripts in aura.js
   MSB_DEFERRED_SCRIPTS load right after the first screen, in order; this
   splices them in before aura.js so order checks keep working. */
import { readFileSync } from 'node:fs';
export function deferredScripts() {
  const aura = readFileSync(new URL('./aura.js', import.meta.url), 'utf8');
  return JSON.parse(aura.match(/const MSB_DEFERRED_SCRIPTS=(\[[^\]]*\]);/)[1]);
}
export function appHtml() {
  const html = readFileSync(new URL('./index.html', import.meta.url), 'utf8');
  const tags = deferredScripts().map((f) => `<script src="${f}" defer></script>`).join('');
  return html.replace('<script src="aura.js"', `${tags}<script src="aura.js"`);
}
