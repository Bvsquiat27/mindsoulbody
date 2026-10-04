// Recovery email for Mind Soul & Body.
// Deploy this with a verified sender in MAIL_FROM and a secret RESEND_API_KEY.
// Without both, it refuses to send and does not claim that an email went out.

const CORS = {
  'access-control-allow-origin': 'https://bvsquiat27.github.io',
  'access-control-allow-headers': 'content-type',
  'access-control-allow-methods': 'GET, POST, OPTIONS',
  'content-type': 'application/json'
};

function json(body, status) {
  return new Response(JSON.stringify(body), { status, headers: CORS });
}

function mailReady(env) {
  return !!(env && env.RESEND_API_KEY && env.MAIL_FROM);
}

export async function handleRecoveryEmail(request, env, fetchImpl = fetch) {
  if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: CORS });
  const url = new URL(request.url);
  if (url.pathname !== '/recovery-email') return json({ error: 'Not found' }, 404);
  if (!mailReady(env)) {
    return json({ ready: false, sent: false, error: 'No mailbox or sending key is configured. No recovery email was sent.' }, 503);
  }
  if (request.method === 'GET') return json({ ready: true }, 200);
  if (request.method !== 'POST') return json({ error: 'Not found' }, 404);
  let body = {};
  try { body = await request.json(); } catch { return json({ sent: false, error: 'The recovery email request was not valid.' }, 400); }
  const to = String(body.to || '').trim();
  const subject = String(body.subject || 'Your Mind Soul & Body recovery code').slice(0, 200);
  const text = String(body.text || '');
  if (!to.includes('@') || text.length < 8) return json({ sent: false, error: 'The recovery email was missing an address or a code.' }, 400);
  const res = await fetchImpl('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${env.RESEND_API_KEY}`, 'content-type': 'application/json' },
    body: JSON.stringify({ from: env.MAIL_FROM, to: [to], subject, text })
  });
  let data = {};
  try { data = await res.json(); } catch { data = {}; }
  if (!res.ok) return json({ sent: false, error: `${data.message ? data.message + '. ' : ''}No recovery email was sent.` }, 502);
  return json({ sent: true }, 200);
}

export default { fetch: (request, env) => handleRecoveryEmail(request, env) };
