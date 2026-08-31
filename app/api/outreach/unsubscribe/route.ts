import { createAdminClient } from '@/lib/supabase/admin';
import { unsubscribeTokenValid } from '@/lib/outreach/unsubscribe';

/**
 * One-click unsubscribe.
 *
 * Gmail's bulk-sender rules want a List-Unsubscribe header pointing at a URL it
 * can POST to with no human involved, and the absence of one is a spam signal
 * on every message whatever the content says. The outreach body has always
 * offered removal by reply, which is honest and which no mail client can see.
 *
 * POST is the machine path — Gmail sends it when someone clicks the
 * unsubscribe link its own interface renders. GET is the human path, for
 * somebody clicking the link in the message. Both suppress; both are
 * idempotent, because a mail client may well retry.
 *
 * Nothing here requires a session, which is the point: the recipient has no
 * account and never will. The token is what stands in for authentication, and
 * it is an HMAC of the address so it cannot be guessed or enumerated.
 */
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

async function suppress(email: string, token: string) {
  if (!email || !token) return false;
  if (!/^[^@\s]+@[^@\s]+\.[a-z]{2,}$/i.test(email)) return false;
  if (!unsubscribeTokenValid(email, token)) return false;

  const admin = createAdminClient();

  // The suppression is the promise. It is keyed by address rather than by
  // outreach row so it survives the row being deleted, and a trigger on
  // operator_outreach refuses to queue a suppressed address — so this holds
  // even if somebody later writes a new sending script in a hurry.
  await admin
    .from('outreach_suppressions')
    .upsert(
      { email: email.trim().toLowerCase(), reason: 'unsubscribed' },
      { onConflict: 'email' },
    );

  // Anything already staged for this address stops. Without this a message
  // queued this morning still goes out this afternoon, which is precisely the
  // thing the recipient just asked us not to do.
  await admin
    .from('operator_outreach')
    .update({ status: 'skipped', error: 'unsubscribed' })
    .eq('email', email.trim().toLowerCase())
    .in('status', ['draft', 'queued']);

  return true;
}

/** Gmail's one-click path. Must answer 200 quickly and say nothing useful. */
export async function POST(request: Request) {
  const url = new URL(request.url);
  await suppress(url.searchParams.get('e') ?? '', url.searchParams.get('t') ?? '');
  // 200 regardless. Telling an unauthenticated caller whether a token was valid
  // turns this into an address-checking oracle, and Gmail does not read the body.
  return new Response(null, { status: 200 });
}

/** A person clicking the link. Deserves a sentence, not a blank page. */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const ok = await suppress(
    url.searchParams.get('e') ?? '',
    url.searchParams.get('t') ?? '',
  );

  const message = ok
    ? 'You have been removed. We will not write to you again.'
    : 'That link is not valid. Reply to the message with “remove” and a person will handle it.';

  return new Response(
    `<!doctype html><html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="robots" content="noindex">
<title>Unsubscribed · Explore Tanzania</title>
<style>
 body{font-family:system-ui,sans-serif;margin:0;min-height:100svh;display:flex;
   align-items:center;justify-content:center;background:#faf9f7;color:#1c1917;padding:24px}
 main{max-width:34rem;text-align:center}
 h1{font-size:1.25rem;margin:0 0 .75rem}
 p{line-height:1.6;margin:0 0 1rem;color:#57534e}
 a{color:#c2410c}
 @media(prefers-color-scheme:dark){body{background:#1c1917;color:#fafaf9}p{color:#a8a29e}}
</style></head><body><main>
<h1>${ok ? 'Removed' : 'Link not valid'}</h1>
<p>${message}</p>
${ok ? '<p>The listing itself is still there. If you want that taken down too, reply to the email and say so.</p>' : ''}
<p><a href="https://www.exploretanzania.online">exploretanzania.online</a></p>
</main></body></html>`,
    { status: 200, headers: { 'content-type': 'text/html; charset=utf-8' } },
  );
}
