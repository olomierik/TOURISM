import { createPublicClient } from '@/lib/supabase/public';
import { locales, type Locale } from '@/i18n/routing';
import { CONTENT_EPOCH } from '@/lib/seo';
import { hasContent } from './businesses';
import { fetchAllRows } from './paginate';

/**
 * Sitemap source data.
 *
 * Every entity is returned with the set of locales it is *actually* translated
 * into, not the four we support. That distinction is the whole point: emitting
 * an alternate for a locale with no translation advertises a URL that 404s, and
 * Google responds by discarding the entire hreflang cluster — so one missing
 * German guide would quietly cost that page its French and Italian links too.
 */

export type LocalizedEntry = {
  /** locale -> slug, containing only locales that genuinely exist. */
  slugs: Partial<Record<Locale, string>>;
  lastModified: Date;
  /**
   * Cover photograph, emitted as a sitemap image extension.
   *
   * There are over a hundred uploaded photographs on this site and no other
   * route into Google Images for them: they are rendered by next/image from a
   * Supabase storage host, so the crawler sees a rewritten URL on a page it may
   * not have fetched yet. Naming the original in the sitemap is the one place
   * that association can be stated outright.
   */
  image?: string | null;
};

/**
 * Newest real timestamp in the set, or a fixed floor.
 *
 * The floor used to be `new Date()`. Because the sitemap regenerates on every
 * revalidation, a row with no usable timestamp reported a different lastmod on
 * every crawl — a permanent "just changed" on a page that never changes. Google
 * treats an unreliable lastmod as reason to ignore lastmod across the site, so
 * the cost of that fallback was not confined to the rows that hit it.
 */
function pickLatest(dates: Array<string | null>): Date {
  const times = dates
    .filter((d): d is string => Boolean(d))
    .map((d) => new Date(d).getTime())
    .filter((n) => Number.isFinite(n));
  return times.length ? new Date(Math.max(...times)) : CONTENT_EPOCH;
}

/**
 * When each kind of content last changed, for the index pages.
 *
 * /directory has no row of its own, but it is not static either: it changes
 * exactly when a business changes. Deriving its lastmod from the newest
 * business is both accurate and useful — it tells a crawler to come back when
 * there is something new, and to stay away when there is not.
 */
export async function getContentFreshness(): Promise<{
  destinations: Date;
  businesses: Date;
  guides: Date;
  newest: Date;
}> {
  const supabase = createPublicClient();

  const [dest, biz, guide] = await Promise.all([
    supabase
      .from('destinations')
      .select('updated_at')
      .eq('is_active', true)
      .is('deleted_at', null)
      .order('updated_at', { ascending: false })
      .limit(1),
    supabase
      .from('businesses')
      .select('updated_at')
      .eq('status', 'approved')
      .is('deleted_at', null)
      .order('updated_at', { ascending: false })
      .limit(1),
    supabase
      .from('guides')
      .select('updated_at')
      .eq('status', 'published')
      .is('deleted_at', null)
      .order('updated_at', { ascending: false })
      .limit(1),
  ]);

  const destinations = pickLatest([dest.data?.[0]?.updated_at ?? null]);
  const businesses = pickLatest([biz.data?.[0]?.updated_at ?? null]);
  const guides = pickLatest([guide.data?.[0]?.updated_at ?? null]);

  const newest = new Date(
    Math.max(destinations.getTime(), businesses.getTime(), guides.getTime()),
  );

  return { destinations, businesses, guides, newest };
}

export async function getDestinationEntries(): Promise<LocalizedEntry[]> {
  const supabase = createPublicClient();
  const { data, error } = await supabase
    .from('destinations')
    .select('id, updated_at, cover_image_url, destination_translations (locale, slug, updated_at)')
    .eq('is_active', true)
    .is('deleted_at', null);

  if (error) throw new Error(`getDestinationEntries: ${error.message}`);

  return (data ?? []).map((d) => ({
    slugs: Object.fromEntries(
      d.destination_translations
        .filter((t) => locales.includes(t.locale as Locale))
        .map((t) => [t.locale, t.slug]),
    ),
    lastModified: pickLatest([
      d.updated_at,
      ...d.destination_translations.map((t) => t.updated_at),
    ]),
    image: d.cover_image_url,
  }));
}

export async function getCategoryEntries(): Promise<LocalizedEntry[]> {
  const supabase = createPublicClient();
  const { data, error } = await supabase
    .from('categories')
    .select('id, updated_at, cover_image_url, category_translations (locale, slug, updated_at)')
    .eq('is_active', true)
    .is('deleted_at', null);

  if (error) throw new Error(`getCategoryEntries: ${error.message}`);

  return (data ?? []).map((c) => ({
    slugs: Object.fromEntries(
      c.category_translations
        .filter((t) => locales.includes(t.locale as Locale))
        .map((t) => [t.locale, t.slug]),
    ),
    lastModified: pickLatest([
      c.updated_at,
      ...c.category_translations.map((t) => t.updated_at),
    ]),
    image: c.cover_image_url,
  }));
}

export async function getGuideEntries(): Promise<LocalizedEntry[]> {
  const supabase = createPublicClient();
  const { data, error } = await supabase
    .from('guides')
    .select('id, updated_at, published_at, cover_image_url, guide_translations (locale, slug, updated_at)')
    .eq('status', 'published')
    .is('deleted_at', null);

  if (error) throw new Error(`getGuideEntries: ${error.message}`);

  return (data ?? []).map((g) => ({
    slugs: Object.fromEntries(
      g.guide_translations
        .filter((t) => locales.includes(t.locale as Locale))
        .map((t) => [t.locale, t.slug]),
    ),
    lastModified: pickLatest([
      g.updated_at,
      ...g.guide_translations.map((t) => t.updated_at),
    ]),
    image: g.cover_image_url,
  }));
}

/**
 * Businesses and packages carry one slug across all locales — a trading name is
 * a proper noun — so every locale is a valid alternate as long as the entity
 * has a translation row for it.
 */
export async function getBusinessEntries(): Promise<LocalizedEntry[]> {
  const supabase = createPublicClient();
  // Paged: PostgREST caps an unpaginated select at 1,000 rows and says nothing,
  // which quietly cut 344 listings out of the sitemap.
  const data = await fetchAllRows(
    (from, to) =>
      supabase
        .from('businesses')
        .select(
          `slug, updated_at, cover_image_url,
           business_translations (locale, updated_at, tagline, short_description, description)`,
        )
        .eq('status', 'approved')
        // Listings that have something of their own to say. A claimed or
        // verified entry qualifies; so does one somebody has written a real
        // description for. What is excluded is the 2,207 that carry only the
        // importer's sentence.
        //
        // Google declined this site for its publisher network, and the reason
        // was arithmetic: 2,618 of the 2,705 URLs submitted here were listings,
        // and 84% of those were the same template with the name and address
        // swapped — a page saying, in its own words, that its details are
        // unconfirmed public map data. Submitting them was asking to be judged
        // on them.
        //
        // They are not gone. They stay in the directory, in search and in
        // near-me, where a full list is exactly what somebody wants. They are
        // simply no longer offered to a crawler as 2,207 separate destinations.
        //
        // is_stub is a stored classification rather than a text match; 059 says
        // why. Ownership and verification are checked alongside it so claiming
        // a listing puts it back in the sitemap immediately.
        .or('is_stub.eq.false,owner_id.not.is.null,is_verified.eq.true')
        .is('deleted_at', null)
        .order('slug')
        .range(from, to),
    'getBusinessEntries',
    // Each listing carries four translations with full descriptions. At a
    // thousand rows the response is 3.1MB, past the 2MB ceiling Next will
    // cache — so it fetched fresh on every regeneration. 300 keeps a page
    // comfortably under it.
    300,
  );

  return data.map((b) => ({
    slugs: Object.fromEntries(
      b.business_translations
        // Same trap as the detail page: the owner form writes a row per locale on
        // first save, so an untranslated listing has four rows and three of them
        // are empty. Advertising those puts blank pages in the sitemap.
        .filter((t) => locales.includes(t.locale as Locale) && hasContent(t))
        .map((t) => [t.locale, b.slug]),
    ),
    lastModified: pickLatest([
      b.updated_at,
      ...b.business_translations.map((t) => t.updated_at),
    ]),
    image: b.cover_image_url,
  }));
}

export async function getPackageEntries(): Promise<LocalizedEntry[]> {
  const supabase = createPublicClient();
  const { data, error } = await supabase
    .from('packages')
    .select(
      'slug, updated_at, cover_image_url, package_translations (locale, updated_at), businesses!inner (status, deleted_at)',
    )
    .eq('status', 'published')
    .eq('businesses.status', 'approved')
    .is('deleted_at', null);

  if (error) throw new Error(`getPackageEntries: ${error.message}`);

  return (data ?? []).map((p) => ({
    slugs: Object.fromEntries(
      p.package_translations
        .filter((t) => locales.includes(t.locale as Locale))
        .map((t) => [t.locale, p.slug]),
    ),
    lastModified: pickLatest([
      p.updated_at,
      ...p.package_translations.map((t) => t.updated_at),
    ]),
    image: p.cover_image_url,
  }));
}

/**
 * Category x destination combination pages, restricted to pairs that actually
 * have an approved business.
 *
 * These are the commercial pages — /safaris/serengeti and its siblings — and the
 * largest block in the sitemap. Pairs with nothing to list are excluded on
 * purpose: an indexed page showing "no results" is a thin-content signal, and
 * there are far more empty pairs than populated ones.
 */
export async function getComboEntries(): Promise<
  Array<{
    slugs: Partial<Record<Locale, { category: string; destination: string }>>;
    lastModified: Date;
  }>
> {
  const supabase = createPublicClient();

  // Slugs are needed keyed by id here, which the *Entries helpers do not expose,
  // so the taxonomy is fetched once in that shape rather than twice in two.
  const [{ data: links }, { data: catRows }, { data: destRows }] =
    await Promise.all([
      fetchAllRows(
        (from, to) =>
          supabase
            .from('business_categories')
            .select(
              'category_id, businesses!inner (status, deleted_at, updated_at, business_destinations (destination_id))',
            )
            .eq('businesses.status', 'approved')
            .is('businesses.deleted_at', null)
            .order('category_id')
            .range(from, to),
        'getComboEntries.links',
      ).then((rows) => ({ data: rows, error: null })),
      supabase
        .from('categories')
        .select('id, updated_at, category_translations (locale, slug, updated_at)')
        .eq('is_active', true)
        .is('deleted_at', null),
      supabase
        .from('destinations')
        .select('id, updated_at, destination_translations (locale, slug, updated_at)')
        .eq('is_active', true)
        .is('deleted_at', null),
    ]);

  // No error check on `links`: fetchAllRows throws on failure rather than
  // returning one, so reaching here means every page came back.

  const catById = new Map(
    (catRows ?? []).map((c) => [
      c.id,
      {
        slugs: Object.fromEntries(c.category_translations.map((t) => [t.locale, t.slug])),
        updatedAt: pickLatest([
          c.updated_at,
          ...c.category_translations.map((t) => t.updated_at),
        ]),
      },
    ]),
  );
  const destById = new Map(
    (destRows ?? []).map((d) => [
      d.id,
      {
        slugs: Object.fromEntries(d.destination_translations.map((t) => [t.locale, t.slug])),
        updatedAt: pickLatest([
          d.updated_at,
          ...d.destination_translations.map((t) => t.updated_at),
        ]),
      },
    ]),
  );

  // A combination page renders the operators serving that pair, so it changes
  // when any of them does. Previously stamped `new Date()` — and combinations
  // are the largest block in the sitemap, so that one line was enough to make
  // most of the file's lastmod values untrustworthy.
  const seen = new Map<string, Date>();
  const order: string[] = [];

  for (const row of links ?? []) {
    for (const bd of row.businesses.business_destinations) {
      const key = `${row.category_id}|${bd.destination_id}`;
      const bizChanged = pickLatest([row.businesses.updated_at ?? null]);
      const existing = seen.get(key);
      if (existing) {
        if (bizChanged > existing) seen.set(key, bizChanged);
        continue;
      }
      seen.set(key, bizChanged);
      order.push(key);
    }
  }

  const out: Array<{
    slugs: Partial<Record<Locale, { category: string; destination: string }>>;
    lastModified: Date;
  }> = [];

  for (const key of order) {
    const [categoryId, destinationId] = key.split('|');
    const cat = catById.get(categoryId);
    const dest = destById.get(destinationId);
    if (!cat || !dest) continue;

    const slugs: Partial<Record<Locale, { category: string; destination: string }>> = {};
    for (const locale of locales) {
      // A combination page only exists in a locale where BOTH halves of the
      // URL are translated.
      if (cat.slugs[locale] && dest.slugs[locale]) {
        slugs[locale] = { category: cat.slugs[locale], destination: dest.slugs[locale] };
      }
    }
    if (!Object.keys(slugs).length) continue;

    out.push({
      slugs,
      lastModified: new Date(
        Math.max(
          cat.updatedAt.getTime(),
          dest.updatedAt.getTime(),
          (seen.get(key) ?? CONTENT_EPOCH).getTime(),
        ),
      ),
    });
  }

  return out;
}
