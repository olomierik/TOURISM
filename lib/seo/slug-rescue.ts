import { createPublicClient } from '@/lib/supabase/public';
import { contentLocale, locales, type Locale } from '@/i18n/routing';

/**
 * Sending a slug from the wrong language to the right page.
 *
 * Public URLs here carry a translated slug — /destinations/zanzibar is
 * /de/reiseziele/sansibar — and the two halves of a URL can disagree in a way
 * nothing on the site produces but the world keeps asking for:
 *
 *   /de/reiseziele/zanzibar      the German page under the English slug
 *   /fr/destinations/arusha      a slug that is Italian in French clothing
 *   /de/safari/parco-nazionale-murchison-falls
 *   /safaris/mount-kenya-de      a locale that leaked into the slug itself
 *
 * Until now each of those was a 404, and these are not hypothetical requests.
 * Search Console on 8 November 2026 held **94 of them** as "Not found" or
 * "Blocked due to other 4xx", every one a localised route, and one of the 94 —
 * /de/reisefuehrer/tansania-safari-packliste — is a guide that had accumulated
 * rank before the German slugs changed and was then thrown away rather than
 * moved. The hreflang bug that emitted them was fixed in lib/seo.ts; the URLs
 * Google already recorded were not.
 *
 * The exposure is much larger than the 94 found so far. Across the three tables
 * with translated slugs there are 708 destination, 100 category and 92 guide
 * combinations of "ask locale A for locale B's slug", and every one of them is
 * a live 404 that any scraper, mistyped link or old share can reach.
 *
 * So a miss is not a 404 until this has had a look at it. One query, run only
 * on the path that was about to fail, asking the same table without the locale
 * filter: if some other language's row carries this slug, the entity exists and
 * the reader simply has the wrong name for it, and the answer is a 301 to the
 * name their language uses. A slug no language knows is still a 404.
 *
 * Why here and not in the proxy: middleware cannot ask the database, and the
 * mismatch is in the database rather than in the static segment map — `hotels`
 * and `attivita` are category slugs, `sansibar` is a destination slug. A
 * middleware rescue would have to hard-code what the tables already know.
 */

/**
 * Locales that can appear as a suffix on a slug.
 *
 * `/safaris/mount-kenya-de` is in the 4xx report, and the obvious reading — a
 * locale code leaking out of the URL builder — is wrong. `mount-kenya-de` was
 * the real stored German slug: the seed gave twenty-eight proper nouns one
 * slug per locale and distinguished them with the locale code, because Arusha
 * is Arusha in all four languages. Migration 082 retires them.
 *
 * Which is why this is tried *after* the exact cross-locale lookup, never
 * before it. While the suffixed slug is still in the table the lookup finds it
 * and nothing is stripped; once 082 has run, the old URL matches no locale and
 * stripping is the only way those twenty-eight keep the rank they earned.
 */
const LOCALE_SUFFIX = new RegExp(`-(${locales.join('|')})$`);

/** `mount-kenya-de` → `mount-kenya`, anything else unchanged. */
export function withoutLocaleSuffix(slug: string): string | null {
  const stripped = slug.replace(LOCALE_SUFFIX, '');
  return stripped === slug ? null : stripped;
}

/**
 * The candidates to try for a slug that did not resolve, in order.
 *
 * The bare slug is not among them — the caller has already failed on that.
 */
function candidates(slug: string): string[] {
  const out: string[] = [];
  const stripped = withoutLocaleSuffix(slug);
  if (stripped) out.push(stripped);
  // A trailing or leading separator survives some rewrites and is never part
  // of a stored slug.
  const trimmed = slug.replace(/^-+|-+$/g, '');
  if (trimmed !== slug && trimmed !== stripped) out.push(trimmed);
  return out;
}

type SlugTable =
  | 'destination_translations'
  | 'guide_translations'
  | 'category_translations';

/**
 * The slug this entity uses in `locale`, found from a slug in any other.
 *
 * Returns null when no language knows the slug, which is a genuine 404, and
 * also when the row found is the one the caller already failed on — that means
 * the entity is unpublished or inactive rather than misnamed, and redirecting
 * to the same URL would loop.
 */
async function rescue(
  table: SlugTable,
  idColumn: string,
  slug: string,
  locale: Locale,
): Promise<string | null> {
  const want = contentLocale(locale);
  const supabase = createPublicClient();

  for (const candidate of [slug, ...candidates(slug)]) {
    // Which entity owns this slug, in whichever language it belongs to? Two
    // languages can in principle share a slug for different entities, so the
    // result is only trusted when it names exactly one.
    // Aliased to `id` so the row shape is the same whichever table this is.
    // The column name is a literal from the three call sites below, never user
    // input, so it cannot be injected through the slug.
    const { data: owners, error } = await supabase
      .from(table)
      .select(`id:${idColumn}`)
      .eq('slug', candidate)
      .limit(2);

    if (error) {
      // A rescue is a courtesy on a request that was already going to 404.
      // It must never turn that 404 into a 500.
      console.warn(`[slug-rescue] ${table} lookup failed for ${candidate}: ${error.message}`);
      return null;
    }

    // The alias is not in the generated types, which describe the real columns.
    const rows = (owners ?? []) as unknown as Array<{ id: string }>;
    const ids = [...new Set(rows.map((r) => r.id))];
    if (ids.length !== 1) continue;

    const { data: right } = await supabase
      .from(table)
      .select('slug')
      .eq(idColumn, ids[0])
      .eq('locale', want)
      .maybeSingle();

    const target = right?.slug;
    if (target && target !== slug) return target;
  }

  return null;
}

/** The destination slug for `locale`, from a slug in another language. */
export function rescueDestinationSlug(slug: string, locale: Locale) {
  return rescue('destination_translations', 'destination_id', slug, locale);
}

/** The guide slug for `locale`, from a slug in another language. */
export function rescueGuideSlug(slug: string, locale: Locale) {
  return rescue('guide_translations', 'guide_id', slug, locale);
}

/** The category slug for `locale`, from a slug in another language. */
export function rescueCategorySlug(slug: string, locale: Locale) {
  return rescue('category_translations', 'category_id', slug, locale);
}
