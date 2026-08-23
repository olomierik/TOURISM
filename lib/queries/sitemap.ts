import { createPublicClient } from '@/lib/supabase/public';
import { locales, type Locale } from '@/i18n/routing';

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
};

function pickLatest(dates: Array<string | null>): Date {
  const times = dates
    .filter((d): d is string => Boolean(d))
    .map((d) => new Date(d).getTime())
    .filter((n) => Number.isFinite(n));
  return times.length ? new Date(Math.max(...times)) : new Date();
}

export async function getDestinationEntries(): Promise<LocalizedEntry[]> {
  const supabase = createPublicClient();
  const { data, error } = await supabase
    .from('destinations')
    .select('id, updated_at, destination_translations (locale, slug, updated_at)')
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
  }));
}

export async function getCategoryEntries(): Promise<LocalizedEntry[]> {
  const supabase = createPublicClient();
  const { data, error } = await supabase
    .from('categories')
    .select('id, updated_at, category_translations (locale, slug, updated_at)')
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
  }));
}

export async function getGuideEntries(): Promise<LocalizedEntry[]> {
  const supabase = createPublicClient();
  const { data, error } = await supabase
    .from('guides')
    .select('id, updated_at, published_at, guide_translations (locale, slug, updated_at)')
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
  }));
}

/**
 * Businesses and packages carry one slug across all locales — a trading name is
 * a proper noun — so every locale is a valid alternate as long as the entity
 * has a translation row for it.
 */
export async function getBusinessEntries(): Promise<LocalizedEntry[]> {
  const supabase = createPublicClient();
  const { data, error } = await supabase
    .from('businesses')
    .select('slug, updated_at, business_translations (locale, updated_at)')
    .eq('status', 'approved')
    .is('deleted_at', null);

  if (error) throw new Error(`getBusinessEntries: ${error.message}`);

  return (data ?? []).map((b) => ({
    slugs: Object.fromEntries(
      b.business_translations
        .filter((t) => locales.includes(t.locale as Locale))
        .map((t) => [t.locale, b.slug]),
    ),
    lastModified: pickLatest([
      b.updated_at,
      ...b.business_translations.map((t) => t.updated_at),
    ]),
  }));
}

export async function getPackageEntries(): Promise<LocalizedEntry[]> {
  const supabase = createPublicClient();
  const { data, error } = await supabase
    .from('packages')
    .select(
      'slug, updated_at, package_translations (locale, updated_at), businesses!inner (status, deleted_at)',
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
  Array<{ slugs: Partial<Record<Locale, { category: string; destination: string }>> }>
> {
  const supabase = createPublicClient();

  // Slugs are needed keyed by id here, which the *Entries helpers do not expose,
  // so the taxonomy is fetched once in that shape rather than twice in two.
  const [{ data: links, error }, { data: catRows }, { data: destRows }] =
    await Promise.all([
      supabase
        .from('business_categories')
        .select(
          'category_id, businesses!inner (status, deleted_at, business_destinations (destination_id))',
        )
        .eq('businesses.status', 'approved')
        .is('businesses.deleted_at', null),
      supabase
        .from('categories')
        .select('id, category_translations (locale, slug)')
        .eq('is_active', true)
        .is('deleted_at', null),
      supabase
        .from('destinations')
        .select('id, destination_translations (locale, slug)')
        .eq('is_active', true)
        .is('deleted_at', null),
    ]);

  if (error) throw new Error(`getComboEntries: ${error.message}`);

  const catById = new Map(
    (catRows ?? []).map((c) => [
      c.id,
      Object.fromEntries(c.category_translations.map((t) => [t.locale, t.slug])),
    ]),
  );
  const destById = new Map(
    (destRows ?? []).map((d) => [
      d.id,
      Object.fromEntries(d.destination_translations.map((t) => [t.locale, t.slug])),
    ]),
  );

  const seen = new Set<string>();
  const out: Array<{
    slugs: Partial<Record<Locale, { category: string; destination: string }>>;
  }> = [];

  for (const row of links ?? []) {
    for (const bd of row.businesses.business_destinations) {
      const key = `${row.category_id}|${bd.destination_id}`;
      if (seen.has(key)) continue;
      seen.add(key);

      const catSlugs = catById.get(row.category_id);
      const destSlugs = destById.get(bd.destination_id);
      if (!catSlugs || !destSlugs) continue;

      const slugs: Partial<Record<Locale, { category: string; destination: string }>> = {};
      for (const locale of locales) {
        // A combination page only exists in a locale where BOTH halves of the
        // URL are translated.
        if (catSlugs[locale] && destSlugs[locale]) {
          slugs[locale] = { category: catSlugs[locale], destination: destSlugs[locale] };
        }
      }
      if (Object.keys(slugs).length) out.push({ slugs });
    }
  }

  return out;
}
