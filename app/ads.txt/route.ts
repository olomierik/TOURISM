/**
 * ads.txt — the IAB authorized-sellers declaration.
 *
 * Serves at the domain root and tells buyers which accounts may legitimately
 * sell this site's inventory. AdSense checks for it during review and will warn
 * about "earnings at risk" without it; more practically, it is what stops
 * somebody spoofing your domain in the ad exchanges.
 *
 * Generated from NEXT_PUBLIC_ADSENSE_CLIENT_ID rather than committed as a static
 * file so the publisher ID lives in exactly one place. The ad script wants the
 * `ca-pub-…` form and ads.txt wants the bare `pub-…` form, which is a
 * transformation worth doing once here instead of maintaining two copies that
 * can drift.
 *
 * f08c47fec0942fa0 is Google's own certification authority ID — the same
 * constant on every publisher's ads.txt, not a secret.
 */
const GOOGLE_CERTIFICATION_ID = 'f08c47fec0942fa0';

export const dynamic = 'force-static';

export function GET() {
  const clientId = process.env.NEXT_PUBLIC_ADSENSE_CLIENT_ID?.trim();

  // No publisher ID configured: 404 rather than serving an empty file. An empty
  // ads.txt is a positive assertion that NOBODY is authorized to sell this
  // inventory, which is worse than having no file at all.
  if (!clientId) {
    return new Response('Not found', { status: 404 });
  }

  // AdSense hands you "ca-pub-123…" for the script tag and "pub-123…" for
  // ads.txt. Accept either in the env var and normalise here.
  const publisherId = clientId.replace(/^ca-/, '');

  const body = [
    '# Authorized digital sellers for exploretanzania.online',
    '# https://iabtechlab.com/ads-txt/',
    `google.com, ${publisherId}, DIRECT, ${GOOGLE_CERTIFICATION_ID}`,
    '',
  ].join('\n');

  return new Response(body, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'public, max-age=86400',
    },
  });
}
