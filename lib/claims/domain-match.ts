/**
 * Proving a claim by the domain the listing already publishes.
 *
 * The email-code route only reaches listings whose register published a contact
 * address — 403 of 1,335, and almost all of them Kenyan, because KATO's register
 * carries emails and Google Maps does not. 831 listings publish a website
 * instead. Someone signed in as sales@wildfrontiers.co.tz claiming the listing
 * whose website is wildfrontiers.co.tz already holds a mailbox on that domain,
 * and Supabase confirmed that address at sign-up. There is nothing left to send.
 *
 * The whole proof rests on the domain being the operator's own, so the work here
 * is in refusing the ones that are not: a Facebook page, a Wix subdomain and a
 * Gmail address are all things a stranger can hold. A match against those proves
 * only that two people use the same free service.
 */

/**
 * Hosts where a subdomain or an address belongs to a user, not to the site
 * operator. A listing whose "website" is one of these publishes no domain of
 * its own, so there is nothing here to match against.
 */
const SHARED_HOSTS = new Set([
  // Free mail
  'gmail.com', 'googlemail.com', 'yahoo.com', 'yahoo.co.uk', 'ymail.com',
  'hotmail.com', 'hotmail.co.uk', 'outlook.com', 'live.com', 'msn.com',
  'aol.com', 'icloud.com', 'me.com', 'mac.com', 'gmx.com', 'gmx.de',
  'web.de', 'mail.com', 'protonmail.com', 'proton.me', 'zoho.com',
  'yandex.com', 'yandex.ru', 'mail.ru', 'inbox.com', 'fastmail.com',
  // Regional free mail seen in East African registers
  'rocketmail.com', 'ymail.co.uk', 'africaonline.co.tz', 'raha.com',
  // Social and page hosts
  'facebook.com', 'fb.com', 'm.facebook.com', 'instagram.com', 'twitter.com',
  'x.com', 'linkedin.com', 'tiktok.com', 'youtube.com', 'wa.me', 'whatsapp.com',
  // Site builders and shared hosting, where the subdomain is the user's
  'wixsite.com', 'wix.com', 'weebly.com', 'squarespace.com', 'wordpress.com',
  'blogspot.com', 'sites.google.com', 'google.com', 'business.site',
  'godaddysites.com', 'webnode.com', 'jimdosite.com', 'strikingly.com',
  'carrd.co', 'netlify.app', 'vercel.app', 'github.io', 'pages.dev',
  'myshopify.com', 'square.site', 'wordpress.org',
  // Directories and OTAs — a listing there is not a domain the operator owns
  'tripadvisor.com', 'booking.com', 'airbnb.com', 'safaribookings.com',
  'expedia.com', 'agoda.com', 'hotels.com', 'viator.com', 'getyourguide.com',
]);

/**
 * The registrable domain, lowercased, with any `www.` removed.
 *
 * Deliberately not a public-suffix parser. Comparing full hostnames minus `www`
 * is stricter than comparing registrable domains: it declines a match between
 * `mail.example.co.tz` and `example.co.tz` that a suffix list would allow. For a
 * signal that grants ownership, refusing a true match costs a claimant one form
 * field; accepting a false one costs someone their listing.
 */
export function hostOf(input: string | null | undefined): string | null {
  if (!input) return null;
  const raw = input.trim();
  if (!raw) return null;

  let host: string;
  try {
    host = new URL(raw.includes('://') ? raw : `https://${raw}`).hostname;
  } catch {
    return null;
  }

  host = host.toLowerCase().replace(/^www\./, '');

  // A bare label ("localhost", a typo) is not a domain anyone can hold.
  if (!host.includes('.')) return null;
  return host;
}

/** The part of an email address after the `@`, normalised the same way. */
export function emailHost(email: string | null | undefined): string | null {
  if (!email?.includes('@')) return null;
  return hostOf(email.split('@').pop());
}

/**
 * Whether a domain is one the operator can be said to own.
 *
 * Checks the host itself and its parent, so `pages.dev` catches
 * `someone.pages.dev` and `sites.google.com` catches a Google Sites page.
 */
export function isSharedHost(host: string | null): boolean {
  if (!host) return true;
  if (SHARED_HOSTS.has(host)) return true;

  const parts = host.split('.');
  for (let i = 1; i < parts.length - 1; i += 1) {
    if (SHARED_HOSTS.has(parts.slice(i).join('.'))) return true;
  }
  return false;
}

/**
 * Does this signed-in address prove control of the listing's published domain?
 *
 * Both sides must be the same host, and that host must be one a business can
 * own. `false` is not an accusation — it is the ordinary case for the 60% of
 * listings with no website and for every operator using a Gmail address.
 */
export function domainMatches(
  websiteOrEmail: string | null | undefined,
  userEmail: string | null | undefined,
): boolean {
  const listing = hostOf(websiteOrEmail) ?? emailHost(websiteOrEmail);
  const user = emailHost(userEmail);
  if (!listing || !user) return false;
  if (isSharedHost(listing) || isSharedHost(user)) return false;
  return listing === user;
}
