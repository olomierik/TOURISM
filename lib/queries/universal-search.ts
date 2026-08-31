import { createSearchClient } from '@/lib/supabase/public';
import { searchBusinesses } from '@/lib/queries/businesses';
import { detectCountryIntent } from '@/lib/search/country-intent';
import type { Locale } from '@/i18n/routing';

/**
 * Search across everything, not just the directory.
 *
 * /directory searches businesses, which was the whole site when it was written.
 * It is not any more: there are destinations with month-by-month conditions and
 * cost bands, guides, attractions, events and hidden gems, and none of it was
 * reachable by typing its name. Someone searching "Ruaha" got a list of
 * companies and no way to reach the page that says what a day there costs.
 *
 * Deliberately several small queries rather than one clever one. The reference
 * tables hold about 140 rows between them, so an ilike per table returns in
 * milliseconds and stays legible; a materialised search view would be faster in
 * a way nobody could measure and harder to reason about when a result is
 * missing.
 *
 * Country intent is reused from the directory rather than reimplemented: typing
 * "tanzania" should narrow, not match six Kenyan operators with Tanzania in
 * their name, and that logic already exists and has assertions on it.
 */

export type SearchHit = {
  kind: 'destination' | 'guide' | 'attraction' | 'event' | 'gem';
  title: string;
  subtitle: string | null;
  slug: string;
  /** For attractions and gems, the destination page they live on. */
  parentSlug?: string;
};

export type UniversalResults = {
  /** What was actually searched after country intent was stripped. */
  term: string;
  countryCode: string | null;
  reference: SearchHit[];
  operators: Awaited<ReturnType<typeof searchBusinesses>>;
};

const MAX_PER_KIND = 6;

export async function universalSearch(
  rawQuery: string,
  locale: Locale,
): Promise<UniversalResults> {
  const trimmed = rawQuery.trim().slice(0, 120);

  // Null when nothing in the query named a country, which is the common case.
  const intent = detectCountryIntent(trimmed);
  // If the whole query was a country name, search everything in that country
  // rather than for the empty string.
  const term = intent?.rest.trim() || trimmed;
  const countryCode = intent?.code ?? null;

  const supabase = createSearchClient();
  const like = `%${term.replace(/[%_]/g, (c) => `\\${c}`)}%`;

  const [destinations, guides, attractions, events, gems, operators] = await Promise.all([
    supabase
      .from('destination_translations')
      .select('name, slug, summary, locale')
      .eq('locale', locale)
      .ilike('name', like)
      .limit(MAX_PER_KIND),
    supabase
      .from('guide_translations')
      .select('title, slug, excerpt, locale')
      .eq('locale', locale)
      .ilike('title', like)
      .limit(MAX_PER_KIND),
    supabase
      .from('attraction_translations')
      .select(
        'name, slug, summary, locale, attractions (destinations (destination_translations (locale, slug)))',
      )
      .eq('locale', locale)
      .ilike('name', like)
      .limit(MAX_PER_KIND),
    supabase
      .from('event_translations')
      .select('name, slug, summary, locale')
      .eq('locale', locale)
      .ilike('name', like)
      .limit(MAX_PER_KIND),
    supabase
      .from('hidden_gem_translations')
      .select(
        'pitch, locale, hidden_gems (destinations!hidden_gems_destination_id_fkey (destination_translations (locale, name, slug)))',
      )
      .eq('locale', locale)
      .ilike('pitch', like)
      .limit(MAX_PER_KIND),
    searchBusinesses(locale, {
      q: term,
      countryCode: countryCode ?? undefined,
      perPage: 12,
    }),
  ]);

  const reference: SearchHit[] = [];

  for (const d of destinations.data ?? []) {
    reference.push({ kind: 'destination', title: d.name, subtitle: d.summary, slug: d.slug });
  }
  for (const g of guides.data ?? []) {
    reference.push({ kind: 'guide', title: g.title, subtitle: g.excerpt, slug: g.slug });
  }
  for (const a of attractions.data ?? []) {
    const parent = (
      a.attractions as unknown as {
        destinations: {
          destination_translations: Array<{ locale: string; slug: string }>;
        } | null;
      } | null
    )?.destinations?.destination_translations;
    const p = parent?.find((x) => x.locale === locale) ?? parent?.[0];
    // An attraction with no reachable destination page has nowhere to link to,
    // so it is dropped rather than rendered as a dead result.
    if (!p) continue;
    reference.push({
      kind: 'attraction',
      title: a.name,
      subtitle: a.summary,
      slug: a.slug,
      parentSlug: p.slug,
    });
  }
  for (const e of events.data ?? []) {
    reference.push({ kind: 'event', title: e.name, subtitle: e.summary, slug: e.slug });
  }
  for (const g of gems.data ?? []) {
    const dest = (
      g.hidden_gems as unknown as {
        destinations: {
          destination_translations: Array<{ locale: string; name: string; slug: string }>;
        } | null;
      } | null
    )?.destinations?.destination_translations;
    const d = dest?.find((x) => x.locale === locale) ?? dest?.[0];
    if (!d) continue;
    reference.push({ kind: 'gem', title: d.name, subtitle: g.pitch, slug: d.slug });
  }

  return { term, countryCode, reference, operators };
}
