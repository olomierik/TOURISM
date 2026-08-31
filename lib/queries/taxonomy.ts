import { cache } from 'react';

import type { LegCosts } from '@/lib/trip/cost';
import { createPublicClient } from '@/lib/supabase/public';
import { locales, type Locale } from '@/i18n/routing';
import { safeImageUrl } from '@/lib/images';
import { highlightRank } from '@/lib/months';

/**
 * Destination and category reads.
 *
 * Each function is wrapped in React's `cache` so a page that needs the same
 * destination in its metadata, its breadcrumb and its body hits the database
 * once per request rather than three times.
 *
 * Translations are joined with `!inner` throughout: a row whose translation for
 * the requested locale is missing must not render with an empty name, it must
 * simply not appear.
 */

export type DestinationSummary = {
  id: string;
  key: string;
  slug: string;
  name: string;
  summary: string | null;
  coverImageUrl: string | null;
  isFeatured: boolean;
  isDemo: boolean;
};

export const getDestinations = cache(
  async (locale: Locale, opts: { featuredOnly?: boolean; limit?: number } = {}) => {
    const supabase = createPublicClient();

    let query = supabase
      .from('destinations')
      .select(
        `id, key, cover_image_url, is_featured, is_demo, sort_order,
         destination_translations!inner (locale, name, slug, summary)`,
      )
      .eq('destination_translations.locale', locale)
      .eq('is_active', true)
      .is('deleted_at', null)
      .order('sort_order', { ascending: true });

    if (opts.featuredOnly) query = query.eq('is_featured', true);
    if (opts.limit) query = query.limit(opts.limit);

    const { data, error } = await query;
    if (error) throw new Error(`getDestinations: ${error.message}`);

    return (data ?? []).map(
      (d): DestinationSummary => ({
        id: d.id,
        key: d.key,
        slug: d.destination_translations[0].slug,
        name: d.destination_translations[0].name,
        summary: d.destination_translations[0].summary,
        coverImageUrl: safeImageUrl(d.cover_image_url),
        isFeatured: d.is_featured,
        isDemo: d.is_demo,
      }),
    );
  },
);

export const getDestinationBySlug = cache(async (slug: string, locale: Locale) => {
  const supabase = createPublicClient();

  const { data, error } = await supabase
    .from('destinations')
    .select(
      `id, key, latitude, longitude, cover_image_url, is_demo, country_code,
       countries (code, name),
       regions (name),
       destination_translations!inner (
         locale, name, slug, summary, description, travel_tips, best_time,
         seo_title, seo_description
       ),
       all_translations:destination_translations (locale, slug)`,
    )
    .eq('destination_translations.locale', locale)
    .eq('destination_translations.slug', slug)
    .eq('is_active', true)
    .is('deleted_at', null)
    .maybeSingle();

  if (error) throw new Error(`getDestinationBySlug: ${error.message}`);
  if (!data) return null;

  const t = data.destination_translations[0];

  // Every locale this destination is actually translated into, keyed by locale.
  // hreflang must be built from these rather than from `slug`: the German page
  // is /de/reiseziele/sansibar, not /de/reiseziele/zanzibar, and advertising the
  // latter makes Google discard the whole cluster.
  const allSlugs = Object.fromEntries(
    data.all_translations.map((x) => [x.locale, x.slug]),
  ) as Partial<Record<Locale, string>>;

  // The country is what TouristDestination markup hangs on. It used to be the
  // string 'Tanzania' written into the page, which was true for every row that
  // existed at the time and false for two thirds of them a month later.
  const country = data.countries as unknown as { code: string; name: string } | null;
  const region = data.regions as unknown as { name: string } | null;

  return {
    id: data.id,
    key: data.key,
    allSlugs,
    latitude: data.latitude,
    longitude: data.longitude,
    coverImageUrl: safeImageUrl(data.cover_image_url),
    isDemo: data.is_demo,
    countryCode: country?.code ?? data.country_code ?? null,
    countryName: country?.name ?? null,
    regionName: region?.name ?? null,
    name: t.name,
    slug: t.slug,
    summary: t.summary,
    description: t.description,
    travelTips: t.travel_tips,
    bestTime: t.best_time,
    seoTitle: t.seo_title,
    seoDescription: t.seo_description,
  };
});

export type CategorySummary = {
  id: string;
  key: string;
  slug: string;
  name: string;
  nameSingular: string | null;
  summary: string | null;
  comboHeading: string | null;
  icon: string | null;
};

export const getCategories = cache(async (locale: Locale) => {
  const supabase = createPublicClient();

  const { data, error } = await supabase
    .from('categories')
    .select(
      `id, key, icon, sort_order,
       category_translations!inner (locale, name, name_singular, slug, summary, combo_heading)`,
    )
    .eq('category_translations.locale', locale)
    .eq('is_active', true)
    .is('deleted_at', null)
    .order('sort_order', { ascending: true });

  if (error) throw new Error(`getCategories: ${error.message}`);

  return (data ?? []).map(
    (c): CategorySummary => ({
      id: c.id,
      key: c.key,
      slug: c.category_translations[0].slug,
      name: c.category_translations[0].name,
      nameSingular: c.category_translations[0].name_singular,
      summary: c.category_translations[0].summary,
      comboHeading: c.category_translations[0].combo_heading,
      icon: c.icon,
    }),
  );
});

export const getCategoryBySlug = cache(async (slug: string, locale: Locale) => {
  const categories = await getCategories(locale);
  return categories.find((c) => c.slug === slug) ?? null;
});

/**
 * Month-by-month conditions for a destination.
 *
 * Powers the seasonality widget. Returns an empty array when a destination has
 * no data rather than throwing, so the widget can simply not render.
 */
export const getSeasonality = cache(async (destinationId: string, locale: Locale) => {
  const supabase = createPublicClient();

  const { data, error } = await supabase
    .from('destination_seasonality')
    .select(
      `month, wildlife_rating, weather_rating, crowd_level, rainfall_mm,
       temp_min_c, temp_max_c, is_peak_season, highlight_key,
       destination_seasonality_translations (locale, highlight, note)`,
    )
    .eq('destination_id', destinationId)
    .order('month', { ascending: true });

  if (error) throw new Error(`getSeasonality: ${error.message}`);

  return (data ?? []).map((m) => {
    const tr = m.destination_seasonality_translations.find((t) => t.locale === locale);
    return {
      month: m.month,
      wildlife: m.wildlife_rating,
      weather: m.weather_rating,
      crowd: m.crowd_level,
      rainfallMm: m.rainfall_mm,
      tempMinC: m.temp_min_c,
      tempMaxC: m.temp_max_c,
      isPeak: m.is_peak_season,
      highlightKey: m.highlight_key,
      highlight: tr?.highlight ?? null,
      note: tr?.note ?? null,
    };
  });
});

/**
 * Indicative day-rate bands and published park fees.
 *
 * Returns null where a destination has no row, which is the deliberate outcome
 * for cities and transit towns: a band for Kampala would be describing hotel
 * pricing while a reader on a safari directory reads it as safari pricing.
 */
export const getDestinationCosts = cache(async (destinationId: string) => {
  const supabase = createPublicClient();

  const { data, error } = await supabase
    .from('destination_costs')
    .select(
      `currency, budget_low, budget_high, midrange_low, midrange_high,
       luxury_low, luxury_high, park_fee_low, park_fee_high,
       notable_fee_key, notable_fee_amount, authority, fees_as_of`,
    )
    .eq('destination_id', destinationId)
    .maybeSingle();

  if (error) throw new Error(`getDestinationCosts: ${error.message}`);
  if (!data) return null;

  return {
    currency: data.currency,
    bands: [
      { key: 'budget' as const, low: data.budget_low, high: data.budget_high },
      { key: 'midrange' as const, low: data.midrange_low, high: data.midrange_high },
      { key: 'luxury' as const, low: data.luxury_low, high: data.luxury_high },
    ].filter((b) => b.low !== null && b.high !== null),
    parkFeeLow: data.park_fee_low,
    parkFeeHigh: data.park_fee_high,
    notableKey: data.notable_fee_key,
    notableAmount: data.notable_fee_amount,
    authority: data.authority,
    feesAsOf: data.fees_as_of,
  };
});

/**
 * Every destination's conditions for one month, best first.
 *
 * The inverse of the destination page's seasonality table: that answers "what is
 * the Serengeti like in March", this answers "where should I go in March", which
 * is the question people actually arrive with and the one the site could not
 * answer at all.
 *
 * Ranked by wildlife then weather, with crowd level as the tiebreak so that
 * between two equally good places the quieter one leads. Destinations with no
 * wildlife rating — cities, transit towns — sort last rather than being dropped:
 * a reader planning March still needs to know Zanzibar is drowning that month.
 */
export const getMonthOverview = cache(async (month: number, locale: Locale) => {
  const supabase = createPublicClient();

  const { data, error } = await supabase
    .from('destination_seasonality')
    .select(
      `month, wildlife_rating, weather_rating, crowd_level, rainfall_mm,
       temp_min_c, temp_max_c, is_peak_season, highlight_key,
       destination_seasonality_translations (locale, highlight),
       destinations!inner (
         id, key, country_code, is_active, deleted_at, cover_image_url,
         destination_translations (locale, name, slug)
       )`,
    )
    .eq('month', month)
    .eq('destinations.is_active', true)
    .is('destinations.deleted_at', null);

  if (error) throw new Error(`getMonthOverview: ${error.message}`);

  const rows = (data ?? [])
    .map((m) => {
      const d = m.destinations as unknown as {
        id: string;
        country_code: string | null;
        cover_image_url: string | null;
        destination_translations: Array<{ locale: string; name: string; slug: string }>;
      };
      // Same fallback rule the package cards use: the reader's language when it
      // exists, English otherwise. A destination missing one translation should
      // lose a word, not disappear from the month it is best in.
      const names = d.destination_translations ?? [];
      const t = names.find((x) => x.locale === locale) ?? names.find((x) => x.locale === 'en');
      if (!t) return null;

      const hl = m.destination_seasonality_translations ?? [];
      const h = hl.find((x) => x.locale === locale) ?? hl.find((x) => x.locale === 'en');

      return {
        id: d.id,
        name: t.name,
        slug: t.slug,
        countryCode: d.country_code,
        coverImageUrl: safeImageUrl(d.cover_image_url),
        wildlife: m.wildlife_rating,
        weather: m.weather_rating,
        crowd: m.crowd_level,
        rainfallMm: m.rainfall_mm,
        tempMinC: m.temp_min_c,
        tempMaxC: m.temp_max_c,
        isPeak: m.is_peak_season,
        highlightKey: m.highlight_key,
        highlight: h?.highlight ?? null,
      };
    })
    .filter((r): r is NonNullable<typeof r> => r !== null);

  rows.sort((a, b) => {
    // Nulls last: a city has no game-viewing score and should not outrank a park.
    if ((a.wildlife ?? -1) !== (b.wildlife ?? -1)) return (b.wildlife ?? -1) - (a.wildlife ?? -1);

    // Then what the month's note actually says: a seasonal event outranks a
    // year-round quality, which outranks silence, which outranks a warning.
    //
    // Treating "has a note" as one binary was not enough. It put the Serengeti
    // and Mara river crossings — the most recognised wildlife event on the
    // continent — behind three parks that are equally good in July and merely
    // quieter, because crowds broke the tie and iconic places are busy in their
    // own month. See highlightRank in lib/months.ts.
    const aRank = highlightRank(a.highlightKey);
    const bRank = highlightRank(b.highlightKey);
    if (aRank !== bRank) return bRank - aRank;

    if ((a.weather ?? -1) !== (b.weather ?? -1)) return (b.weather ?? -1) - (a.weather ?? -1);
    return (a.crowd ?? 9) - (b.crowd ?? 9);
  });

  return rows;
});

/**
 * Businesses near a destination, with coordinates, for the map.
 *
 * A separate query rather than widening BusinessCard: the card is fetched on
 * every directory page for 1,336 rows and does not need latitude, and the map
 * needs nothing the card carries beyond a name and a slug.
 *
 * Capped, because a map with four hundred pins is a smear rather than a map,
 * and every pin is a DOM node the browser has to keep.
 */
export const getMapPins = cache(
  async (destinationId: string, locale: Locale, limit = 60) => {
    const supabase = createPublicClient();

    const { data, error } = await supabase
      .from('businesses')
      .select(
        `id, slug, name, latitude, longitude, is_verified,
         business_destinations!inner (destination_id),
         business_translations!inner (locale, tagline)`,
      )
      .eq('business_destinations.destination_id', destinationId)
      .eq('business_translations.locale', locale)
      .eq('status', 'approved')
      .is('deleted_at', null)
      .not('latitude', 'is', null)
      .not('longitude', 'is', null)
      .order('is_verified', { ascending: false })
      .limit(limit);

    if (error) throw new Error(`getMapPins: ${error.message}`);

    return (data ?? [])
      .map((b) => ({
        id: b.id,
        slug: b.slug,
        name: b.name,
        lat: Number(b.latitude),
        lng: Number(b.longitude),
        isVerified: b.is_verified,
        tagline:
          (b.business_translations as unknown as Array<{ tagline: string | null }>)[0]
            ?.tagline ?? null,
      }))
      // A row whose coordinates did not parse would place a pin at 0,0 — in the
      // Gulf of Guinea, and far enough off to stretch the map's bounds across
      // the Atlantic.
      .filter((b) => Number.isFinite(b.lat) && Number.isFinite(b.lng));
  },
);

/**
 * Things to do at a destination.
 *
 * Falls back to English when a locale has no copy, the same rule the package
 * cards use: an operator or an editor writes a thing once, and hiding it from
 * three of the four markets to avoid showing an English sentence is the wrong
 * trade on a site whose whole thesis is those markets.
 */
export const getAttractions = cache(async (destinationId: string, locale: Locale) => {
  const supabase = createPublicClient();

  const { data, error } = await supabase
    .from('attractions')
    .select(
      `id, key, kind, latitude, longitude, is_free, typical_minutes, sort_order,
       attraction_translations (locale, name, slug, summary, tip)`,
    )
    .eq('destination_id', destinationId)
    .eq('is_active', true)
    .order('sort_order', { ascending: true });

  if (error) throw new Error(`getAttractions: ${error.message}`);

  return (data ?? [])
    .map((a) => {
      const all = a.attraction_translations ?? [];
      const t = all.find((x) => x.locale === locale) ?? all.find((x) => x.locale === 'en');
      if (!t) return null;

      return {
        id: a.id,
        key: a.key,
        kind: a.kind,
        name: t.name,
        slug: t.slug,
        summary: t.summary,
        tip: t.tip,
        isFree: a.is_free,
        typicalMinutes: a.typical_minutes,
        lat: a.latitude === null ? null : Number(a.latitude),
        lng: a.longitude === null ? null : Number(a.longitude),
      };
    })
    .filter((a): a is NonNullable<typeof a> => a !== null);
});

export type EventCard = {
  id: string;
  key: string;
  kind: string;
  name: string;
  slug: string;
  summary: string | null;
  advice: string | null;
  typicalMonth: number | null;
  nextStart: string | null;
  nextEnd: string | null;
  countryCode: string | null;
  website: string | null;
  destination: { name: string; slug: string } | null;
};

/**
 * Events, ordered by the month they habitually fall in.
 *
 * Not by next_start: almost none of them have confirmed dates, because
 * organisers announce a few months out and the seeder refuses to guess. Sorting
 * on a mostly-null column would put the two events that happen to be confirmed
 * at the top and scatter the rest.
 */
export const getEvents = cache(async (locale: Locale) => {
  const supabase = createPublicClient();

  const { data, error } = await supabase
    .from('events')
    .select(
      `id, key, kind, typical_month, next_start, next_end, country_code, website,
       event_translations (locale, name, slug, summary, advice),
       destinations (destination_translations (locale, name, slug))`,
    )
    .eq('is_active', true)
    .order('typical_month', { ascending: true });

  if (error) throw new Error(`getEvents: ${error.message}`);

  return (data ?? [])
    .map((e): EventCard | null => {
      const all = e.event_translations ?? [];
      const t = all.find((x) => x.locale === locale) ?? all.find((x) => x.locale === 'en');
      if (!t) return null;

      const dt =
        (e.destinations as unknown as {
          destination_translations: Array<{ locale: string; name: string; slug: string }>;
        } | null)?.destination_translations ?? [];
      const d = dt.find((x) => x.locale === locale) ?? dt.find((x) => x.locale === 'en');

      return {
        id: e.id,
        key: e.key,
        kind: e.kind,
        name: t.name,
        slug: t.slug,
        summary: t.summary,
        advice: t.advice,
        typicalMonth: e.typical_month,
        nextStart: e.next_start,
        nextEnd: e.next_end,
        countryCode: e.country_code,
        website: e.website,
        destination: d ? { name: d.name, slug: d.slug } : null,
      };
    })
    .filter((e): e is EventCard => e !== null);
});

export type CostableDestination = {
  id: string;
  name: string;
  slug: string;
  countryCode: string | null;
  costs: LegCosts;
};

/**
 * Every destination with published cost figures, for the trip estimator.
 *
 * Only the ones that have figures. A picker listing all 46 destinations when 36
 * can be priced would let a reader build a five-stop trip and get back an
 * estimate covering two of them — the tool would look broken rather than
 * incomplete, and they would not know which.
 */
export const getCostableDestinations = cache(async (locale: Locale) => {
  const supabase = createPublicClient();

  const { data, error } = await supabase
    .from('destination_costs')
    .select(
      `currency, budget_low, budget_high, midrange_low, midrange_high,
       luxury_low, luxury_high, park_fee_low, park_fee_high,
       notable_fee_key, notable_fee_amount, notable_fee_basis, notable_fee_nights,
       fees_as_of,
       destinations!inner (id, country_code, is_active, deleted_at,
         destination_translations (locale, name, slug))`,
    )
    .eq('destinations.is_active', true)
    .is('destinations.deleted_at', null);

  if (error) throw new Error(`getCostableDestinations: ${error.message}`);

  return (data ?? [])
    .map((row): CostableDestination | null => {
      const d = row.destinations as unknown as {
        id: string;
        country_code: string | null;
        destination_translations: Array<{ locale: string; name: string; slug: string }>;
      } | null;
      if (!d) return null;

      const all = d.destination_translations ?? [];
      const t = all.find((x) => x.locale === locale) ?? all.find((x) => x.locale === 'en');
      if (!t) return null;

      return {
        id: d.id,
        name: t.name,
        slug: t.slug,
        countryCode: d.country_code,
        costs: {
          currency: row.currency,
          budgetLow: row.budget_low,
          budgetHigh: row.budget_high,
          midrangeLow: row.midrange_low,
          midrangeHigh: row.midrange_high,
          luxuryLow: row.luxury_low,
          luxuryHigh: row.luxury_high,
          parkFeeLow: row.park_fee_low,
          parkFeeHigh: row.park_fee_high,
          notableKey: row.notable_fee_key,
          notableAmount: row.notable_fee_amount,
          notableBasis: row.notable_fee_basis as LegCosts['notableBasis'],
          notableNights: row.notable_fee_nights,
          feesAsOf: row.fees_as_of,
        },
      };
    })
    .filter((d): d is CostableDestination => d !== null)
    .sort((a, b) => a.name.localeCompare(b.name, locale));
});

export type HiddenGem = {
  id: string;
  pitch: string;
  tradeOff: string;
  destination: {
    name: string;
    slug: string;
    countryCode: string | null;
    coverImageUrl: string | null;
  };
  insteadOf: { name: string; slug: string } | null;
};

/**
 * Under-visited destinations, each pitched against a famous one.
 *
 * The table embeds `destinations` twice — once as the gem, once as the place it
 * is offered instead of — so both embeds are disambiguated by foreign key name.
 * PostgREST cannot guess which relationship is meant when a table references
 * another twice, and the error it returns when you let it try is unhelpful.
 *
 * A gem whose destination has no translation in any locale is dropped rather
 * than rendered nameless, and one whose `instead_of` cannot be resolved falls
 * back to standing alone — the pitch and the trade-off are still worth reading
 * without the comparison.
 */
export const getHiddenGems = cache(async (locale: Locale) => {
  const supabase = createPublicClient();

  const { data, error } = await supabase
    .from('hidden_gems')
    .select(
      `id, sort_order,
       hidden_gem_translations (locale, pitch, trade_off),
       gem:destinations!hidden_gems_destination_id_fkey (
         country_code, cover_image_url,
         destination_translations (locale, name, slug)),
       alt:destinations!hidden_gems_instead_of_id_fkey (
         destination_translations (locale, name, slug))`,
    )
    .eq('is_active', true)
    .order('sort_order', { ascending: true });

  if (error) throw new Error(`getHiddenGems: ${error.message}`);

  type Embedded = {
    country_code?: string | null;
    cover_image_url?: string | null;
    destination_translations: Array<{ locale: string; name: string; slug: string }>;
  } | null;

  const pick = <T extends { locale: string }>(rows: T[] | undefined) =>
    (rows ?? []).find((r) => r.locale === locale) ?? (rows ?? []).find((r) => r.locale === 'en');

  return (data ?? [])
    .map((g): HiddenGem | null => {
      const t = pick(g.hidden_gem_translations);
      if (!t) return null;

      const gem = g.gem as unknown as Embedded;
      const d = pick(gem?.destination_translations);
      if (!d) return null;

      const alt = g.alt as unknown as Embedded;
      const a = pick(alt?.destination_translations);

      return {
        id: g.id,
        pitch: t.pitch,
        tradeOff: t.trade_off,
        destination: {
          name: d.name,
          slug: d.slug,
          countryCode: gem?.country_code ?? null,
          coverImageUrl: gem?.cover_image_url ?? null,
        },
        insteadOf: a ? { name: a.name, slug: a.slug } : null,
      };
    })
    .filter((g): g is HiddenGem => g !== null);
});

/**
 * The gems offered as alternatives to one particular destination.
 *
 * This is the half that does the work. The hub page is a page; this is a block
 * on Serengeti pointing at Ruaha and Nyerere, which is where a reader who is
 * already interested actually is, and which is the only inbound link some of
 * these destinations have ever had.
 */
export const getAlternativesTo = cache(async (destinationId: string, locale: Locale) => {
  const all = await getHiddenGems(locale);
  const supabase = createPublicClient();

  const { data, error } = await supabase
    .from('hidden_gems')
    .select('id')
    .eq('is_active', true)
    .eq('instead_of_id', destinationId);

  if (error) throw new Error(`getAlternativesTo: ${error.message}`);

  const ids = new Set((data ?? []).map((r) => r.id));
  return all.filter((g) => ids.has(g.id));
});

/**
 * Every (category, destination) pair that has at least one approved business.
 *
 * Drives generateStaticParams for the commercial combination pages. Pairs with
 * no businesses are deliberately excluded: an indexed page listing nothing is
 * a thin-content signal, and there is no reason to generate it.
 */
export const getPopulatedComboPairs = cache(async (locale: Locale) => {
  const supabase = createPublicClient();

  const { data, error } = await supabase
    .from('business_categories')
    .select(
      `category_id,
       businesses!inner (id, status, deleted_at,
         business_destinations!inner (destination_id))`,
    )
    .eq('businesses.status', 'approved')
    .is('businesses.deleted_at', null);

  if (error) throw new Error(`getPopulatedComboPairs: ${error.message}`);

  const [categories, destinations] = await Promise.all([
    getCategories(locale),
    getDestinations(locale),
  ]);

  const categoryById = new Map(categories.map((c) => [c.id, c]));
  const destinationById = new Map(destinations.map((d) => [d.id, d]));

  const pairs = new Set<string>();
  for (const row of data ?? []) {
    const category = categoryById.get(row.category_id);
    if (!category) continue;
    for (const bd of row.businesses.business_destinations) {
      const destination = destinationById.get(bd.destination_id);
      if (!destination) continue;
      pairs.add(`${category.slug}|${destination.slug}`);
    }
  }

  return [...pairs].map((p) => {
    const [category, destination] = p.split('|');
    return { category, destination };
  });
});

/**
 * Per-locale slug pairs for one category x destination combination.
 *
 * The commercial URLs are /{category}/{destination} and BOTH halves are
 * translated — /safaris/serengeti in English is /it/safari/serengeti in Italian.
 * Building hreflang from the current locale's pair advertises URLs that 404, so
 * the real slugs are resolved for every locale here.
 *
 * A locale is included only when both halves exist in it, because a combination
 * page cannot be addressed with half a URL.
 */
export const getComboSlugs = cache(
  async (categoryId: string, destinationId: string) => {
    const supabase = createPublicClient();

    const [{ data: cat }, { data: dest }] = await Promise.all([
      supabase
        .from('category_translations')
        .select('locale, slug')
        .eq('category_id', categoryId),
      supabase
        .from('destination_translations')
        .select('locale, slug')
        .eq('destination_id', destinationId),
    ]);

    const catBy = Object.fromEntries(
      (cat ?? []).map((x) => [x.locale, x.slug]),
    ) as Partial<Record<Locale, string>>;
    const destBy = Object.fromEntries(
      (dest ?? []).map((x) => [x.locale, x.slug]),
    ) as Partial<Record<Locale, string>>;

    const out: Partial<Record<Locale, { category: string; destination: string }>> = {};
    for (const l of locales) {
      const c = catBy[l];
      const d = destBy[l];
      if (c && d) out[l] = { category: c, destination: d };
    }
    return out;
  },
);

/** Per-locale slugs for one category, for hreflang on the category landing page. */
export const getCategorySlugs = cache(async (categoryId: string) => {
  const supabase = createPublicClient();
  const { data } = await supabase
    .from('category_translations')
    .select('locale, slug')
    .eq('category_id', categoryId);

  return Object.fromEntries(
    (data ?? [])
      .filter((x) => locales.includes(x.locale as Locale))
      .map((x) => [x.locale, x.slug]),
  ) as Partial<Record<Locale, string>>;
});
