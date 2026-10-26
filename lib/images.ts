/**
 * The last gate before a URL reaches next/image.
 *
 * next/image throws on a host that is not in remotePatterns, and a throw inside
 * a server component is a 500 for the whole page. So one bad row does not
 * degrade to a missing picture — it takes the listing, the directory page it
 * appears on, and every combination page that includes it.
 *
 * 16 listings reached production with http:// covers, collected by the og:image
 * backfill from operator sites that still serve plain http. They rendered fine
 * until a rebuild, which is the worst shape a bug can have: correct in
 * production, broken on the next deploy, and blamed on the deploy.
 *
 * Allowing http upstream would be wrong twice. An http image on an https page is
 * mixed content and the browser blocks it, so the page renders imageless anyway,
 * and the optimizer would be fetching over a channel anyone on the path can
 * rewrite. The right answer is that a URL we cannot render is the same as no URL.
 */

/**
 * Google Places photo links, which are signed and expire.
 *
 * Measured 26 Oct 2026: 4,279 of this database's 4,644 `media` rows — 92% —
 * are `gps-cs-s` URLs collected when the directory was built from Google
 * Places, and every one sampled now returns 403. Not slow, not rate limited,
 * not blocked by a referer check we could satisfy: 14 of 14 failed identically
 * to the browser, to the image optimizer and to a plain server-side fetch with
 * a desktop user agent. They have expired, and nothing we can send will bring
 * them back — which also rules out the "fetch and store the originals" plan,
 * because there is no longer an original to fetch.
 *
 * So they are not images that might load. They are 4,279 guaranteed 403s, each
 * costing an optimizer round trip and leaving a broken frame exactly where
 * MediaFallback would have drawn something deliberate.
 *
 * Scoped to the path, not the host. The same tables hold `/proxy` links on
 * lh3–lh6 and `streetviewpixels-pa.googleapis.com`, and all of those still
 * serve (11 of 11 sampled), so banning the host would throw away the working
 * minority along with the dead majority.
 */
const GOOGLE_PHOTO_HOST = /^lh\d+\.googleusercontent\.com$/;

/**
 * Returns the URL if next/image can render it, otherwise null.
 *
 * Relative paths pass through — those are ours, served from the same origin.
 * Everything else must be https with a parseable host. Callers treat null the
 * way they already treat a missing image, so the failure mode is a placeholder
 * rather than a stack trace.
 */
export function safeImageUrl(url: string | null | undefined): string | null {
  if (!url) return null;

  const trimmed = url.trim();
  if (!trimmed) return null;

  // Our own assets, served from this origin.
  if (trimmed.startsWith('/')) return trimmed;

  let parsed: URL;
  try {
    parsed = new URL(trimmed);
  } catch {
    return null;
  }

  // https only. http is blocked as mixed content and rejected by remotePatterns;
  // data: and blob: are not things next/image accepts from a database row.
  if (parsed.protocol !== 'https:') return null;
  if (!parsed.hostname.includes('.')) return null;

  // Expired by construction — see above. Treated as no URL at all, which is
  // what the rest of this module already means by null.
  if (GOOGLE_PHOTO_HOST.test(parsed.hostname) && parsed.pathname.startsWith('/gps-cs-s/')) {
    return null;
  }

  return trimmed;
}
