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

  return trimmed;
}
