/* Generate a VAPID key pair for the friends worker.
   Run: node worker/gen-vapid.mjs
   The private key is printed once. Do not commit it and do not paste it into the repo.

   Deploy steps (from the repo root, after you replace the public key):
   1. Put the printed VAPID_PUBLIC_KEY in worker/wrangler.friends.toml under [vars].
   2. npx wrangler secret put VAPID_PRIVATE_KEY --config worker/wrangler.friends.toml
      Paste the printed private key when asked.
   3. npx wrangler secret put VAPID_SUBJECT --config worker/wrangler.friends.toml
      Use a mailto: address or https://bvsquiat27.github.io/mindsoulbody/
   4. npx wrangler deploy --config worker/wrangler.friends.toml
      The cron in that file runs every 15 minutes. Do not deploy worker/recovery-email.mjs.
*/
const pair = await crypto.subtle.generateKey({ name: 'ECDSA', namedCurve: 'P-256' }, true, ['sign']);
const publicRaw = new Uint8Array(await crypto.subtle.exportKey('raw', pair.publicKey));
const jwk = await crypto.subtle.exportKey('jwk', pair.privateKey);
const publicKey = Buffer.from(publicRaw).toString('base64url');
const privateKey = jwk.d;
console.log('VAPID_PUBLIC_KEY=' + publicKey);
console.log('VAPID_PRIVATE_KEY=' + privateKey);
console.log('Set VAPID_SUBJECT to a mailto: address or the site URL. Do not commit the private key.');
