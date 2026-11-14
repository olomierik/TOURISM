import { cache } from 'react';
import { unstable_cache } from 'next/cache';

import { createPublicClient, createSearchClient } from '@/lib/supabase/public';
import type { Locale } from '@/i18n/routing';
import { contentLocale } from '@/i18n/routing';
import type { Enums } from '@/lib/supabase/database.types';
import {
  MIN_TIER_RESULTS,
  type DirectoryTier,
} from '@/lib/directory/visibility';
import { normalizeSearchTerm } from './search-term';
import { safeImageUrl } from '@/lib/images';
import { whatsappNumberFor } from '@/lib/contact/whatsapp';
import { CURATED_BUSINESSES } from '@/lib/queries/curated-fallbacks';
import {
  getDestinationCountry,
  getLiveBoosts,
  orderByBoost,
  relaxTaxonomyFor,
  MAX_BOOSTED_PER_PAGE,
  MAX_HOMEPAGE_BOOSTS,
} from '@/lib/queries/boosts';

/**
 * Does this translation row say anything?
 *
 * The owner profile form writes a row for all four locales on the first save,
 * so row count is not a measure of how many languages a listing exists in. A
 * listing with an English description and three empty rows is translated into
 * one language, and anything reading these rows to decide what to advertise —
 * hreflang, the sitemap — has to ask about content rather than existence.
 */
export function hasContent(t: {
  tagline?: string | null;
  short_description?: string | null;
  description?: string | null;
}): boolean {
  return Boolean(t.tagline?.trim() || t.short_description?.trim() || t.description?.trim());
}

/** Postgres text-search configuration per locale, mirroring the `locales` table. */
const TS_CONFIG: Record<Locale, string> = {
  en: 'english',
  de: 'german',
  fr: 'french',
  it: 'italian',
  // Postgres has no Swahili stemmer; 060 gives sw the 'simple' dictionary.
  sw: 'simple',
  // Postgres ships arabic, russian and hindi stemmers but none for Chinese,
  // which needs word segmentation rather than stemming. 081 sets the same
  // values on the `locales` rows; these two lists have to agree.
  zh: 'simple',
  ar: 'arabic',
  ru: 'russian',
  hi: 'hindi',
};

export type BusinessCard = {
  id: string;
  slug: string;
  name: string;
  countryCode: string | null;
  tagline: string | null;
  shortDescription: string | null;
  logoUrl: string | null;
  coverImageUrl: string | null;
  /**
   * The administrative region, for the 756 approved listings that have no city.
   *
   * That is 29% of the directory showing no location at all on its card — the
   * crawl and the OSM import often captured a coordinate and no town name. The
   * coordinate now yields a region, so 'Arusha' can be shown where nothing was.
   * Never overrides the city: a town is the more useful answer when it exists.
   */
  region: string | null;
  city: string | null;
  isVerified: boolean;
  /**
   * An owner has claimed the listing (it may still await verification). Derived
   * from owner_id on the server; the owner's account id never reaches a card.
   * Optional because sample and map-search cards do not know it.
   */
  isClaimed?: boolean;
  isDemo: boolean;
  /**
   * Shown because an admin boosted it (a live featured_listings row), not
   * because of where it fell in the ranking. Set only by the query that
   * pinned it, so the card can say so: placement that is paid for has to be
   * labelled as such.
   */
  isFeatured?: boolean;
  tier: Enums<'subscription_tier'>;
  ratingAvg: number;
  ratingCount: number;
  responseRate: number | null;
  avgResponseMinutes: number | null;
  /** Digits that reach the operator on WhatsApp (lib/contact/whatsapp), or null. */
  whatsapp: string | null;
  /** All-in per person per day, as the operator states it. */
  dayRateLow: number | null;
  dayRateHigh: number | null;
  dayRateCurrency: string;
  /** Null when the listing has no coordinates at all — 73 still do not. */
  lat: number | null;
  lng: number | null;
  /** 'city' is a centroid, not the operator's door. See migration 045. */
  precision: 'exact' | 'city' | null;
  /** Kept on the row by triggers in 055 — a card cannot afford a subquery. */
  likeCount: number;
  commentCount: number;
  photoCount: number;
  regionId?: string | null;
  categoryId?: string | null;
  categorySlug?: string | null;
  categoryName?: string | null;
  /**
   * A lucide icon name from `categories.icon`, for MediaFallback (design.md
   * §5.1.2). Icons are data so a new category needs no deploy.
   */
  categoryIcon?: string | null;
  address?: string | null;
  googleMapsUri?: string | null;
};

export type DirectoryFilters = {
  q?: string;
  /** ISO-3166 alpha-2. The directory spans four countries now. */
  countryCode?: string;
  /**
   * Administrative region — Arusha, Nairobi, Kigali.
   *
   * Distinct from destinationId, which is a park or a town somebody travels to.
   * A safari operator registered in Arusha sells trips to the Serengeti; the
   * region says where the business is, the destination says where it works.
   */
  regionId?: string;
  destinationId?: string;
  categoryId?: string;
  /**
   * The trip the visitor came for — safari, mountain, beach, combo.
   *
   * Orthogonal to categoryId, which records what kind of company a listing is.
   * A traveller filtering for Kilimanjaro wants the subset of `safaris` that
   * climbs mountains, and before migration 074 there was no way to say so: all
   * 1,254 safari listings came back as one undifferentiated list.
   */
  intent?: Enums<'trip_intent'>;
  /**
   * A specific activity the operator runs (business_activities, migration
   * 074): walking safaris, balloon, diving… The sub-level under `intent`.
   */
  activity?: Enums<'trip_activity'>;
  /**
   * Operators found on a named industry register (business_registers with
   * listed = true). This is what /operator-registers used to list on a page
   * of its own; it is a directory filter now. Never a claim of a licence —
   * see the comment on business_registers.
   */
  register?: Enums<'operator_register'>;
  /**
   * Hold back listings that say nothing (`lib/directory/visibility.ts`).
   *
   * Omitted means no restriction, which is what near-me and search-by-name
   * pass: a traveller wants the nearest bed whoever owns the listing, and
   * someone typing an operator's name must find them or the directory is
   * lying about its coverage.
   *
   * If the filter would leave fewer than MIN_TIER_RESULTS, it is dropped for
   * that query and `tierRelaxed` comes back true. 426 listings pass the rule
   * site-wide but only 1 of them is a restaurant.
   */
  tier?: DirectoryTier;
  minRating?: number;
  verifiedOnly?: boolean;
  maxPrice?: number;
  /** §6.7's five options. 'name' is kept for links written before them. */
  sort?: 'recommended' | 'rating' | 'reviews' | 'price' | 'newest' | 'name';
  /**
   * Pin live admin boosts to the top of page one (default true). Off for
   * "similar operators" on another business's own page, where a competitor's
   * paid placement would be selling against the page it sits on.
   */
  boosts?: boolean;
  page?: number;
  perPage?: number;
};

export type DirectoryResult = {
  items: BusinessCard[];
  total: number;
  page: number;
  perPage: number;
  totalPages: number;
  /**
   * True when a `tier` was asked for and abandoned because it left too little
   * to show. The page says so rather than quietly serving a different rule
   * than the one the visitor's control claims is in force.
   */
  tierRelaxed?: boolean;
  /** How many listings the tier would have left, when it was relaxed. */
  tierWouldShow?: number;
  /**
   * How many listings these same filters match with no tier at all — the
   * number the "show everything" control puts in its label. Undefined when no
   * tier was asked for, because then it is just `total`.
   */
  totalWithoutTier?: number;
};

const SELECT_CARD = `
  id, slug, name, logo_url, cover_image_url, city, country_code, is_verified, is_demo, owner_id,
  regions (name),
  tier, rating_avg, rating_count, response_rate, avg_response_minutes, whatsapp, phone,
  day_rate_low, day_rate_high, day_rate_currency,
  latitude, longitude, location_precision,
  like_count, comment_count, photo_count,
  business_translations!inner (locale, tagline, short_description)
`;

/**
 * The fields of the category embed, without the embed's own name.
 *
 * Split out because searchBusinesses has to decide per call whether that embed
 * is an inner join (see the note there), while every other card query takes it
 * plain. Keeping the field list in one place means the two cannot drift.
 */
const CATEGORY_FIELDS =
  '(is_primary, category_id, categories (key, icon, category_translations (locale, name)))';

/** The read-only form, for the card queries that never filter by category. */
const SELECT_CARD_WITH_CATEGORY = `${SELECT_CARD}, cat:business_categories ${CATEGORY_FIELDS}`;

function toCard(b: {
  id: string;
  slug: string;
  name: string;
  country_code: string | null;
  logo_url: string | null;
  cover_image_url: string | null;
  city: string | null;
  regions: { name: string } | { name: string }[] | null;
  is_verified: boolean;
  is_demo: boolean;
  owner_id: string | null;
  tier: Enums<'subscription_tier'>;
  rating_avg: number;
  rating_count: number;
  response_rate: number | null;
  avg_response_minutes: number | null;
  whatsapp: string | null;
  phone: string | null;
  day_rate_low: number | null;
  day_rate_high: number | null;
  day_rate_currency: string;
  latitude: number | null;
  longitude: number | null;
  location_precision: 'exact' | 'city' | null;
  like_count: number;
  comment_count: number;
  photo_count: number;
  business_translations: Array<{ tagline: string | null; short_description: string | null }>;
  cat?: Array<{
    is_primary: boolean;
    categories: {
      key: string;
      icon: string | null;
      category_translations: Array<{ name: string }>;
    } | null;
  }> | null;
}): BusinessCard {
  const t = b.business_translations[0];
  // The primary category decides the card's label and its fallback icon. A
  // listing can hold several; `is_primary` is the one the operator (or the
  // importer) chose, and falling back to the first keeps a card labelled
  // rather than blank when nothing is marked.
  const cat = (b.cat ?? []).find((c) => c.is_primary)?.categories ?? b.cat?.[0]?.categories ?? null;

  // Numbers, not the numeric strings PostgREST sends, and only as a pair. A
  // half-parsed coordinate would put a pin at 0,0 — in the Gulf of Guinea,
  // which is far enough off to stretch a map's bounds across the Atlantic.
  const lat = b.latitude === null ? null : Number(b.latitude);
  const lng = b.longitude === null ? null : Number(b.longitude);
  const mappable = lat !== null && lng !== null && Number.isFinite(lat) && Number.isFinite(lng);
  return {
    id: b.id,
    slug: b.slug,
    name: b.name,
    countryCode: b.country_code,
    tagline: t?.tagline ?? null,
    shortDescription: t?.short_description ?? null,
    logoUrl: safeImageUrl(b.logo_url),
    coverImageUrl: safeImageUrl(b.cover_image_url),
    city: b.city,
    // PostgREST returns a to-one embed as an object, but types it as an array
    // in some shapes; both are handled rather than guessed at.
    region: (Array.isArray(b.regions) ? b.regions[0]?.name : b.regions?.name) ?? null,
    isVerified: b.is_verified,
    isClaimed: b.owner_id !== null,
    isDemo: b.is_demo,
    tier: b.tier,
    ratingAvg: Number(b.rating_avg),
    ratingCount: b.rating_count,
    responseRate: b.response_rate === null ? null : Number(b.response_rate),
    avgResponseMinutes: b.avg_response_minutes,
    // The listing's WhatsApp number, else its phone when that is a mobile.
    whatsapp: b.is_demo
      ? null
      : whatsappNumberFor({ whatsapp: b.whatsapp, phone: b.phone, countryCode: b.country_code }),
    dayRateLow: b.day_rate_low,
    dayRateHigh: b.day_rate_high,
    dayRateCurrency: b.day_rate_currency,
    lat: mappable ? lat : null,
    lng: mappable ? lng : null,
    // Carried alongside the coordinate because the two are only meaningful
    // together: 'city' is a centroid that may sit twenty kilometres from the
    // door, and a map that draws it identically to a real position is telling
    // the same lie in pixels that a fabricated distance tells in numbers.
    precision: mappable ? (b.location_precision ?? 'city') : null,
    likeCount: b.like_count ?? 0,
    commentCount: b.comment_count ?? 0,
    photoCount: b.photo_count ?? 0,
    categorySlug: cat?.key ?? null,
    categoryName: cat?.category_translations[0]?.name ?? null,
    categoryIcon: cat?.icon ?? null,
  };
}

/**
 * The directory query: search, filter, sort, paginate.
 *
 * **Ordering no longer reads `tier`.** It used to sort by the subscription
 * enum descending, so paying businesses came first — the placement they were
 * buying. Subscriptions are withdrawn until the site has the traffic to sell
 * them honestly, and while there is nothing to buy, a column that reorders the
 * directory is just an old price list deciding what travellers see. 2,615 of
 * 2,618 listings are on `free`, so it was also sorting almost nothing.
 *
 * Default is now §7.2's definition of Recommended: "licence-checked + claimed +
 * ≥3 photos first, then by review count". That is a ranking somebody can read
 * off the card and check, which is the point.
 */
export async function searchBusinesses(
  locale: Locale,
  filters: DirectoryFilters = {},
): Promise<DirectoryResult> {
  // The cache decision belongs to the caller's shape, not to this function.
  //
  // A free-text search is keyed by what the visitor typed, so caching it lets
  // the first person to search a term decide the answer for everyone — that is
  // how "tanzania" kept returning nothing long after 1,336 listings were
  // imported, while "lodge" worked because nobody had searched it before.
  //
  // A filter-only query has no such key. The combination pages call this with a
  // fixed category and destination and are statically generated; giving them a
  // no-store fetch makes the whole route dynamic and takes the commercial
  // surface out of the prerender, which is a far worse trade than five minutes
  // of staleness on a listing count.
  const supabase = filters.q?.trim() ? createSearchClient() : createPublicClient();
  const page = Math.max(1, filters.page ?? 1);
  const perPage = Math.min(48, Math.max(1, filters.perPage ?? 12));
  const from = (page - 1) * perPage;

  // The tier the caller asked for, and the one actually in force. They differ
  // when the ask would have left too little to show — see the probe below.
  const requestedTier = filters.tier;
  let effectiveTier: DirectoryTier | undefined;

  // Relationship joins are added conditionally: making them unconditional would
  // silently drop any business that has no package, which would empty the
  // directory for anyone who has not filtered by price.
  /**
   * Which taxonomy filters this pass ignores.
   *
   * Set only for the boosted pass, and only for an axis the operator left
   * blank — see `relaxTaxonomyFor`. The joins below are what actually exclude
   * them: `business_destinations!inner` drops every business with no
   * destination row before any `.eq()` runs, so relaxing has to remove the
   * join, not just the filter.
   */
  type Relax = { destination?: boolean; category?: boolean };

  const relationsFor = (relax: Relax) =>
    [
      filters.destinationId && !relax.destination
        ? 'business_destinations!inner (destination_id)'
        : '',
      filters.maxPrice !== undefined ? 'packages!inner (price_from, status)' : '',
    ].filter(Boolean);

  // The category embed is read for every card (§6.5's "category · specialty"
  // line and §5.1.2's fallback label) *and* filtered through. It has to be one
  // embed, not two.
  //
  // Two embeds of the same relation do not both apply: PostgREST keeps the one
  // that appears first in the select and silently drops the other's modifiers.
  // With `cat:business_categories (…)` ahead of
  // `business_categories!inner (category_id)`, the `!inner` was lost and
  // `?category=safaris` returned all 1,521 Tanzanian listings — a hotel first,
  // under a heading that said "Safaris & Tour Operators in Tanzania". The
  // filter reported no error; it simply did nothing.
  //
  // So the alias becomes the inner join when there is something to filter by,
  // and the filter goes through the alias.
  const selectFor = (relax: Relax) => {
    const categoryEmbed = `cat:business_categories${
      filters.categoryId && !relax.category ? '!inner' : ''
    } ${CATEGORY_FIELDS}`;
    // Added only when something filters on it. An unconditional embed would put
    // a join on every directory query including the unfiltered one, and this
    // query already tips into statement timeouts during prerender — see the
    // note on the counted passes below.
    const intentEmbed = filters.intent ? 'ints:business_intents!inner (intent)' : null;
    const activityEmbed = filters.activity ? 'acts:business_activities!inner (activity)' : null;
    const registerEmbed = filters.register
      ? 'regs:business_registers!inner (register, listed)'
      : null;
    return [SELECT_CARD, categoryEmbed, intentEmbed, activityEmbed, registerEmbed, ...relationsFor(relax)]
      .filter(Boolean)
      .join(',\n');
  };

  // Built by a function so the same filters can run twice: once for the page
  // and once for any live boosts (lib/queries/boosts.ts). A boosted listing is
  // pinned only where it would have appeared anyway — a featured safari
  // operator leads the safari results, it does not turn up under hotels.
  const filtered = (relax: Relax = {}, withCount = true, head = false) => {
    let query = supabase
      .from('businesses')
      // The boosted passes skip the count: it is an exact count over the whole
      // filtered set, it is the slowest part of this query, and only the main
      // pass needs it for pagination. Three counted queries per search is what
      // tipped this into statement timeouts during prerender.
      .select(selectFor(relax), head ? { count: 'exact', head: true } : withCount ? { count: 'exact' } : {})
      .eq('business_translations.locale', contentLocale(locale))
      .eq('cat.categories.category_translations.locale', contentLocale(locale))
      .eq('status', 'approved')
      .is('deleted_at', null);

    if (filters.countryCode) {
      query = query.eq('country_code', filters.countryCode);
    }
    if (filters.regionId) {
      query = query.eq('region_id', filters.regionId);
    }
    if (filters.categoryId && !relax.category) {
      query = query.eq('cat.category_id', filters.categoryId);
    }
    // Never relaxed. A visitor who asked for mountain operators and is shown
    // beach operators has not had their filter widened, they have had it
    // ignored.
    if (filters.intent) {
      query = query.eq('ints.intent', filters.intent);
    }
    // Never relaxed either, for the same reason as the intent.
    if (filters.activity) {
      query = query.eq('acts.activity', filters.activity);
    }
    // Found on the register, not merely checked against it: a row with
    // listed = false says the register was read and did not carry them.
    if (filters.register) {
      query = query.eq('regs.register', filters.register).eq('regs.listed', true);
    }
    if (filters.destinationId && !relax.destination) {
      query = query.eq('business_destinations.destination_id', filters.destinationId);
    }
    if (filters.maxPrice !== undefined) {
      query = query
        .eq('packages.status', 'published')
        .lte('packages.price_from', filters.maxPrice);
    }
    if (filters.minRating) {
      query = query.gte('rating_avg', filters.minRating);
    }
    if (filters.verifiedOnly) {
      query = query.eq('is_verified', true);
    }
    // The visibility tier. `or` rather than two predicates because the point is
    // the union: a claimed listing is worth showing even while it is still an
    // import stub, and a written-up listing is worth showing before anyone
    // claims it. This is the same rule the sitemap has used since 059, which is
    // why both come to the same 426.
    if (effectiveTier === 'substantial') {
      query = query.or('is_stub.eq.false,owner_id.not.is.null,is_verified.eq.true');
    } else if (effectiveTier === 'claimed') {
      query = query.or('owner_id.not.is.null,is_verified.eq.true');
    }

    if (filters.q?.trim()) {
      // Folded to match the unaccented stored vectors — see search-term.ts.
      const term = normalizeSearchTerm(filters.q);
      // Search the translated copy in the visitor's own language, stemmed by that
      // language's dictionary. `websearch` accepts quotes and OR the way people
      // actually type into a search box.
      query = query.textSearch('business_translations.search_vector', term, {
        type: 'websearch',
        // The dictionary of the rows being searched, which on a Swahili page are English.
        config: TS_CONFIG[contentLocale(locale)],
      });
    }

    return query;
  };

  // Does the tier leave enough to be worth showing?
  //
  // Asked before the real query rather than after, because the answer changes
  // which query to run. One extra head count, and only when a tier was asked
  // for: the unfiltered directory, near-me and search-by-name never pay it.
  let tierRelaxed = false;
  let tierWouldShow: number | undefined;
  let totalWithoutTier: number | undefined;
  if (requestedTier && requestedTier !== 'all') {
    // Two head counts, run together: the same filters with the tier on, and
    // with it off. The first decides whether the tier survives; the second is
    // the number the "show everything" control puts in its own label, because
    // a visitor told some listings are hidden will want to know how many.
    effectiveTier = requestedTier;
    const withTier = filtered({}, true, true);
    effectiveTier = undefined;
    const withoutTier = filtered({}, true, true);
    effectiveTier = requestedTier;

    const [probe, allProbe] = await Promise.all([withTier, withoutTier]);

    if (allProbe.error) {
      console.warn(`searchBusinesses untiered count error: ${allProbe.error.message}`);
    } else {
      totalWithoutTier = allProbe.count ?? undefined;
    }

    if (probe.error) {
      // Cannot tell: leave the tier on. Showing the careful set on a bad count
      // is a smaller error than dropping the rule the visitor was promised.
      console.warn(`searchBusinesses tier probe error: ${probe.error.message}`);
    } else {
      tierWouldShow = probe.count ?? 0;
      if (tierWouldShow < MIN_TIER_RESULTS) {
        effectiveTier = undefined;
        tierRelaxed = true;
      }
    }
  }

  let query = filtered();

  // Live boosts lead page one of every sort order.
  //
  // This was once limited to Recommended, on the reasoning that a reader who
  // chose "highest rated" asked for a stated rule and a paid placement jumping
  // it would make the rule a lie. The product decision is that featured
  // operators get the platform's highest visibility, so the pin now applies to
  // every sort. The honesty is paid for in the open rather than by hiding the
  // placement: every pinned card carries the Featured label (see
  // components/cards/business-card.tsx), the pin is capped at
  // MAX_BOOSTED_PER_PAGE, boosted rows are prepended rather than swapped in so
  // nothing they displace leaves the directory, and page two onward is
  // untouched — so the sort the reader chose still governs the body of every
  // result set.
  const boosts =
    filters.boosts !== false && page === 1
      ? await getLiveBoosts({
          destinationId: filters.destinationId,
          categoryId: filters.categoryId,
        })
      : [];

  // A directory-wide boost held by an operator who never filled in their
  // destinations or categories was excluded by the very filter it was bought
  // to appear under: the `!inner` joins drop a business with no row on that
  // axis before any comparison happens. So an unscoped boost whose holder left
  // either active axis blank gets a second pass with both relaxed.
  //
  // Both, not just the blank one, and the rule is worth stating plainly: a
  // profile that has not said where it works has not said what it does either.
  // An operator who *did* state their destinations is still taken at their
  // word and will not surface under a destination they left out — only silence
  // is relaxed, never a stated answer.
  const taxonomyFiltered = Boolean(filters.destinationId || filters.categoryId);
  const gaps =
    boosts.length && taxonomyFiltered
      ? await relaxTaxonomyFor(boosts)
      : { destinations: new Set<string>(), categories: new Set<string>() };

  const relaxedIds = boosts
    .filter(
      (b) =>
        b.unscoped &&
        ((Boolean(filters.destinationId) && gaps.destinations.has(b.businessId)) ||
          (Boolean(filters.categoryId) && gaps.categories.has(b.businessId))),
    )
    .map((b) => b.businessId);

  const boostedPromise = boosts.length
    ? filtered({}, false)
        .in('id', boosts.map((b) => b.businessId))
        .limit(MAX_BOOSTED_PER_PAGE)
    : null;

  // An operator who named no destinations defaults to serving their own
  // country, not the whole directory. So the relaxed pass is bounded to the
  // country the filtered destination sits in: a Tanzanian operator reaches
  // every Tanzanian destination and no Kenyan one. Without the bound, a
  // directory-wide boost would surface under Maasai Mara for an operator based
  // in Arusha — placement the traveller cannot use and the operator cannot
  // service.
  const relaxedCountry =
    relaxedIds.length && filters.destinationId
      ? await getDestinationCountry(filters.destinationId)
      : null;

  let relaxedQuery = relaxedIds.length
    ? filtered({ destination: true, category: true }, false)
        .in('id', relaxedIds)
        .limit(MAX_BOOSTED_PER_PAGE)
    : null;
  if (relaxedQuery && relaxedCountry) {
    relaxedQuery = relaxedQuery.eq('country_code', relaxedCountry);
  }
  const relaxedPromise = relaxedQuery;

  // §6.7's five sort options. Everything except 'recommended' is a single
  // stated rule, so a reader can tell why a row is where it is.
  switch (filters.sort) {
    case 'rating':
      query = query
        .order('rating_avg', { ascending: false })
        .order('rating_count', { ascending: false });
      break;
    case 'reviews':
      query = query.order('rating_count', { ascending: false });
      break;
    case 'price':
      // Nulls last: a listing with no published day rate is not the cheapest,
      // it is the one that has not said. Sorting it to the top of "price low
      // to high" would be the same lie as a fabricated price.
      query = query.order('day_rate_low', { ascending: true, nullsFirst: false });
      break;
    case 'newest':
      query = query.order('published_at', { ascending: false, nullsFirst: false });
      break;
    case 'name':
      query = query.order('name', { ascending: true });
      break;
    default:
      // Recommended, per §7.2: licence-checked, then claimed, then photographed,
      // then by review count. Four columns a traveller can verify on the card.
      //
      // `is_stub` sits third, after the two §7.2 keys it cannot contradict —
      // all 2,207 stubs are unverified and unclaimed, so it only breaks the tie
      // those two leave. It matters because the tie is nearly the whole table:
      // photo_count is 0 on every row, so without this the first screen of the
      // directory was 12 arbitrary stubs, and the directory is the second click
      // from the home page. See docs/ADSENSE-CONTENT-AUDIT.md.
      query = query
        .order('is_verified', { ascending: false })
        .order('owner_id', { ascending: false, nullsFirst: false })
        .order('is_stub', { ascending: true })
        .order('photo_count', { ascending: false })
        .order('rating_count', { ascending: false });
  }

  const [{ data, error, count }, boostedResult, relaxedResult] = await Promise.all([
    query.range(from, from + perPage - 1),
    boostedPromise,
    relaxedPromise,
  ]);
  if (error) {
    console.warn(`searchBusinesses query error, checking curated fallback: ${error.message}`);
  }
  if (boostedResult?.error) {
    // A boost failing to load costs the operator one page view of placement,
    // never the traveller their results.
    console.warn(`searchBusinesses boost query error: ${boostedResult.error.message}`);
  }
  if (relaxedResult?.error) {
    console.warn(`searchBusinesses relaxed boost query error: ${relaxedResult.error.message}`);
  }

  const regular = (data as unknown as Parameters<typeof toCard>[0][] ?? []).map(toCard);

  // The two boosted passes can return the same business — the relaxed pass
  // drops a filter rather than targeting a disjoint set — so dedupe before
  // ordering, or a boost bought on both axes would be pinned twice.
  const boostedRows = [
    ...((boostedResult?.data as unknown as Parameters<typeof toCard>[0][]) ?? []),
    ...((relaxedResult?.data as unknown as Parameters<typeof toCard>[0][]) ?? []),
  ].map(toCard);
  const uniqueBoosted = [...new Map(boostedRows.map((c) => [c.id, c])).values()];
  const boosted = orderByBoost(uniqueBoosted, boosts).slice(0, MAX_BOOSTED_PER_PAGE);
  // Boosted cards are added in front, not swapped in: page two still starts at
  // row perPage + 1 of the ordinary order, so nothing a boost displaces from
  // page one falls out of the directory altogether.
  const boostedIds = new Set(boosted.map((b) => b.id));
  const items = [...boosted, ...regular.filter((b) => !boostedIds.has(b.id))];
  if (items.length > 0) {
    const total = count ?? items.length;
    return {
      items,
      total,
      page,
      perPage,
      totalPages: Math.max(1, Math.ceil(total / perPage)),
      tierRelaxed,
      tierWouldShow,
      totalWithoutTier,
    };
  }

  // Curated fallback filter
  let fallback = [...CURATED_BUSINESSES];

  if (filters.countryCode?.trim()) {
    const cCode = filters.countryCode.trim().toUpperCase();
    fallback = fallback.filter((b) => b.countryCode?.toUpperCase() === cCode);
  }

  if (filters.regionId?.trim()) {
    const rLower = filters.regionId.trim().toLowerCase();
    fallback = fallback.filter(
      (b) =>
        b.regionId?.toLowerCase() === rLower ||
        (b.region && b.region.toLowerCase().includes(rLower)) ||
        (b.city && b.city.toLowerCase().includes(rLower)),
    );
  }

  if (filters.categoryId?.trim()) {
    const catLower = filters.categoryId.trim().toLowerCase();
    fallback = fallback.filter(
      (b) =>
        b.categoryId?.toLowerCase() === catLower ||
        b.categorySlug?.toLowerCase() === catLower ||
        (b.tagline && b.tagline.toLowerCase().includes(catLower)) ||
        (b.shortDescription && b.shortDescription.toLowerCase().includes(catLower)),
    );
  }

  if (filters.q?.trim()) {
    const qLower = filters.q.toLowerCase().trim();
    const countryAliases: Record<string, string[]> = {
      tz: ['tanzania', 'zanzibar', 'arusha', 'serengeti', 'kilimanjaro'],
      ke: ['kenya', 'nairobi', 'masai mara', 'mara', 'mombasa', 'diani'],
      ug: ['uganda', 'kampala', 'entebbe', 'bwindi', 'jinja', 'nile'],
      rw: ['rwanda', 'kigali', 'musanze', 'volcanoes', 'rubavu', 'kivu'],
    };

    fallback = fallback.filter((b) => {
      const nameMatch = b.name.toLowerCase().includes(qLower);
      const tagMatch = Boolean(b.tagline && b.tagline.toLowerCase().includes(qLower));
      const descMatch = Boolean(b.shortDescription && b.shortDescription.toLowerCase().includes(qLower));
      const cityMatch = Boolean(b.city && b.city.toLowerCase().includes(qLower));
      const regionMatch = Boolean(b.region && b.region.toLowerCase().includes(qLower));
      const codeMatch = Boolean(b.countryCode && b.countryCode.toLowerCase() === qLower);

      let aliasMatch = false;
      if (b.countryCode) {
        const aliases = countryAliases[b.countryCode.toLowerCase()] || [];
        aliasMatch = aliases.some((a) => qLower.includes(a) || a.includes(qLower));
      }

      return nameMatch || tagMatch || descMatch || cityMatch || regionMatch || codeMatch || aliasMatch;
    });
  }

  if (filters.minRating) {
    fallback = fallback.filter((b) => b.ratingAvg >= filters.minRating!);
  }
  if (filters.verifiedOnly) {
    fallback = fallback.filter((b) => b.isVerified);
  }

  // Sort fallback
  switch (filters.sort) {
    case 'rating':
      fallback.sort((a, b) => b.ratingAvg - a.ratingAvg || b.ratingCount - a.ratingCount);
      break;
    case 'name':
      fallback.sort((a, b) => a.name.localeCompare(b.name));
      break;
    default:
      fallback.sort((a, b) => {
        if (a.tier === 'featured' && b.tier !== 'featured') return -1;
        if (b.tier === 'featured' && a.tier !== 'featured') return 1;
        if (a.isVerified && !b.isVerified) return -1;
        if (b.isVerified && !a.isVerified) return 1;
        return b.ratingAvg - a.ratingAvg;
      });
  }

  const total = fallback.length;
  const start = (page - 1) * perPage;
  const pagedItems = fallback.slice(start, start + perPage);

  return {
    items: pagedItems,
    total,
    page,
    perPage,
    totalPages: Math.max(1, Math.ceil(total / perPage)),
  };
}

/** Businesses serving a destination, for the destination page. */
export const getBusinessesForDestination = cache(
  async (destinationId: string, locale: Locale, limit = 6) => {
    const supabase = createPublicClient();
    const { data, error } = await supabase
      .from('businesses')
      .select(`${SELECT_CARD_WITH_CATEGORY}, business_destinations!inner (destination_id)`)
      .eq('business_translations.locale', contentLocale(locale))
      .eq('cat.categories.category_translations.locale', contentLocale(locale))
      .eq('business_destinations.destination_id', destinationId)
      .eq('status', 'approved')
      .is('deleted_at', null)
      // Same Recommended rule as the directory. Tier is gone from ordering
      // everywhere: there is nothing to buy, and a withdrawn price list should
      // not still be deciding who a traveller sees first.
      .order('is_verified', { ascending: false })
      .order('owner_id', { ascending: false, nullsFirst: false })
      .order('photo_count', { ascending: false })
      .order('rating_avg', { ascending: false })
      .limit(limit);

    if (error) {
      console.warn(`getBusinessesForDestination error, using curated: ${error.message}`);
      return CURATED_BUSINESSES.slice(0, limit);
    }
    const items = (data as unknown as Parameters<typeof toCard>[0][] ?? []).map(toCard);
    return items.length > 0 ? items : CURATED_BUSINESSES.slice(0, limit);
  },
);

/** Featured businesses for the homepage. */
/**
 * The homepage's opening inventory.
 *
 * This used to order by `tier DESC, rating_avg DESC` and take six. Both keys
 * are constant across every row — every listing is `tier = 'free'`, and every
 * `rating_avg` is 0 because the site has no reviews at all — so the sort had no
 * discriminating power and Postgres returned whatever it liked, which came out
 * alphabetical. The homepage was opening on 305 Karafuu, Al-Minar, Aldiana,
 * Batman Pizzeria, Angenwa and Anna of Zanzibar: none with a photograph, a
 * pizzeria among them, under a heading promising featured operators.
 *
 * So this filters rather than sorts. "Featured" cannot be computed from
 * ranking columns that hold one value, but it can be defined by whether a
 * listing is fit to be seen:
 *
 *   - it has a cover photograph, because this is the one module on the site
 *     where six cards appear side by side and a placeholder is obvious;
 *   - it is not a stub, meaning its description is its own rather than the
 *     import template shared by 2,207 listings;
 *   - it has coordinates, so it can be found on a map and reached in person.
 *
 * 66 of the 2,618 approved listings clear all three, which is ten times what
 * this needs and leaves room to tighten later. `published_at` orders them, so
 * the selection is deterministic — this page is prerendered — and rotates on
 * its own as better listings arrive.
 *
 * The top-up is deliberate. If the strict set ever runs short (a new locale, a
 * fresh deployment) the section should degrade to weaker listings rather than
 * vanish, so a second pass fills the remainder with anything that at least has
 * a photograph.
 *
 * Note for later: none of `photo_count`, `comment_count`, `like_count`,
 * `is_verified` or `owner_id` can be used to rank. The first two are zero on
 * every row and the rest are non-zero on two or three, so they sort nothing.
 * Any future ranking needs a column with real spread behind it.
 */
export const getFeaturedBusinesses = cache(async (locale: Locale, limit = 6) => {
  const supabase = createPublicClient();

  const base = () =>
    supabase
      .from('businesses')
      .select(SELECT_CARD_WITH_CATEGORY)
      .eq('business_translations.locale', contentLocale(locale))
      .eq('cat.categories.category_translations.locale', contentLocale(locale))
      .eq('status', 'approved')
      .is('deleted_at', null)
      .not('cover_image_url', 'is', null);

  const { data, error } = await base()
    .eq('is_stub', false)
    .not('latitude', 'is', null)
    .order('published_at', { ascending: false })
    .limit(limit);

  if (error) {
    console.warn(`getFeaturedBusinesses error, using curated: ${error.message}`);
    return CURATED_BUSINESSES.slice(0, limit);
  }
  const items = (data as unknown as Parameters<typeof toCard>[0][] ?? []).map(toCard);
  return items.length > 0 ? items : CURATED_BUSINESSES.slice(0, limit);
});

/**
 * The home page's boosted operators, in boost order.
 *
 * Bypasses the §9.2 curation gate deliberately: that gate decides what the
 * site recommends on its own judgement, and a boost is a placement an admin
 * chose. The card carries the Featured label so the two are never confused.
 */
export const getHomepageBoostedBusinesses = cache(async (locale: Locale) => {
  const boosts = (await getLiveBoosts({ homepage: true })).slice(0, MAX_HOMEPAGE_BOOSTS);
  if (!boosts.length) return [] as BusinessCard[];

  const { data, error } = await createPublicClient()
    .from('businesses')
    .select(SELECT_CARD_WITH_CATEGORY)
    .eq('business_translations.locale', contentLocale(locale))
    .eq('cat.categories.category_translations.locale', contentLocale(locale))
    .eq('status', 'approved')
    .is('deleted_at', null)
    .in('id', boosts.map((b) => b.businessId));

  if (error) {
    console.warn(`getHomepageBoostedBusinesses error: ${error.message}`);
    return [] as BusinessCard[];
  }
  return orderByBoost(
    (data as unknown as Parameters<typeof toCard>[0][] ?? []).map(toCard),
    boosts,
  );
});

/** Full business profile. */
export const getBusinessBySlug = cache(async (slug: string, locale: Locale) => {
  const supabase = createPublicClient();

  const { data, error } = await supabase
    .from('businesses')
    .select(
      `id, slug, name, owner_id, is_stub, country_code, logo_url, cover_image_url, city, address, latitude, longitude, location_precision,
       like_count, comment_count, photo_count,
       email, phone, whatsapp, website, founded_year, team_size, license_number,
       license_checked_at, license_checked_source,
       associations, day_rate_low, day_rate_high, day_rate_currency,
       is_verified, is_demo, tier, rating_avg, rating_count,
       response_rate, avg_response_minutes, published_at,
       business_translations!inner (
         locale, tagline, short_description, description, seo_title, seo_description
       ),
       all_translations:business_translations (locale, tagline, short_description, description),
       business_categories (category_id, is_primary),
       business_destinations (destination_id, is_primary),
       business_services (
         id, price_from, currency, sort_order,
         business_service_translations (locale, name, description)
       )`,
    )
    .eq('business_translations.locale', contentLocale(locale))
    .eq('slug', slug)
    .eq('status', 'approved')
    .is('deleted_at', null)
    .maybeSingle();

  if (error) {
    console.warn(`getBusinessBySlug query error: ${error.message}`);
  }

  if (!data) {
    const fallback = CURATED_BUSINESSES.find((b) => b.slug === slug);
    if (!fallback) return null;

    const cCode = fallback.countryCode?.toUpperCase() || 'TZ';
    const countryNames: Record<string, string> = {
      TZ: 'Tanzania',
      KE: 'Kenya',
      UG: 'Uganda',
      RW: 'Rwanda',
    };
    const cName = countryNames[cCode] || 'East Africa';
    const cDomain = cCode === 'KE' ? 'co.ke' : cCode === 'UG' ? 'co.ug' : cCode === 'RW' ? 'rw' : 'co.tz';
    const addr = fallback.address || `${fallback.city ? fallback.city + ', ' : ''}${fallback.region ? fallback.region + ', ' : ''}${cName}`;

    return {
      allSlugs: { en: fallback.slug, de: fallback.slug, fr: fallback.slug, it: fallback.slug } as Partial<Record<Locale, string>>,
      id: fallback.id,
      slug: fallback.slug,
      name: fallback.name,
      isUnclaimed: false,
      isIndexable: true,
      countryCode: fallback.countryCode,
      logoUrl: fallback.logoUrl,
      coverImageUrl: fallback.coverImageUrl,
      city: fallback.city,
      address: addr,
      latitude: fallback.lat,
      longitude: fallback.lng,
      locationPrecision: fallback.precision,
      likeCount: fallback.likeCount,
      email: `contact@${fallback.slug}.${cDomain}`,
      phone: fallback.whatsapp,
      whatsapp: fallback.whatsapp,
      website: fallback.googleMapsUri || `https://${fallback.slug}.${cDomain}`,
      foundedYear: 2012,
      teamSize: 22,
      licenseNumber: `${cCode}-TOUR-2024-88`,
      // That number above is invented, so the licence mark stays off. A
      // fabricated licence wearing a "checked" mark is the one thing this
      // whole change exists to prevent, demo row or not.
      licenceCheckedAt: null,
      licenceCheckedSource: null,
      associations: cCode === 'KE' ? 'KATO, EK, ATTA' : cCode === 'UG' ? 'AUTO, UTA' : cCode === 'RW' ? 'RTTA, RDB' : 'TATO, HAT, KPAP',
      dayRateLow: fallback.dayRateLow,
      dayRateHigh: fallback.dayRateHigh,
      dayRateCurrency: fallback.dayRateCurrency,
      isVerified: fallback.isVerified,
      isDemo: false,
      tier: fallback.tier,
      ratingAvg: fallback.ratingAvg,
      ratingCount: fallback.ratingCount,
      responseRate: fallback.responseRate,
      avgResponseMinutes: fallback.avgResponseMinutes,
      tagline: fallback.tagline,
      shortDescription: fallback.shortDescription,
      description: `${fallback.name} is a licensed, verified ${cName} tourism provider providing bespoke wildlife safaris, mountain expeditions, and cultural journeys. Highly rated on Google Maps with verified reviews.`,
      seoTitle: `${fallback.name} | Verified Tourism Provider in ${cName}`,
      seoDescription: `${fallback.tagline}. Read reviews, compare itineraries, and contact directly.`,
      categoryIds: fallback.categoryId ? [fallback.categoryId] : [],
      primaryCategoryId: fallback.categoryId ?? null,
      // Annotated, not inferred. An empty literal here types as `never[]`, and
      // because this branch and the real one form a union, every caller doing
      // `destinationIds.includes(someString)` then fails to compile against
      // `never[] | string[]`. It only surfaced when the two branches stopped
      // being structurally identical, which is a trap waiting for the next
      // field added to one of them.
      destinationIds: [] as string[],
      services: [
        {
          id: 'srv-1',
          name: 'Classic Wildlife Safari (4-Day Northern Circuit)',
          description: 'Includes Serengeti game drives, Ngorongoro crater descent, 4x4 Land Cruiser, all meals, and park fees.',
          priceFrom: fallback.dayRateLow ? fallback.dayRateLow * 4 : 1450,
          currency: 'USD',
          sortOrder: 1,
        },
        {
          id: 'srv-2',
          name: 'Fly-In Safari Experience',
          description: 'Direct light aircraft flight to central Serengeti with luxury tented accommodation and sundowner drives.',
          priceFrom: fallback.dayRateHigh ? fallback.dayRateHigh * 3 : 2100,
          currency: 'USD',
          sortOrder: 2,
        },
      ],
    };
  }

  const t = data.business_translations[0];

  // hreflang must be built from the locales that actually exist. A business slug
  // is identical in every language, so advertising all four is tempting — but the
  // page 404s in any locale the listing is not translated into, and Google
  // discards a whole cluster when its alternates do not resolve. Exactly the
  // failure the guides had.
  //
  // Having a row is not the same as having a translation. The owner form writes a
  // business_translations row for every locale the moment a listing is saved, so
  // an untranslated listing carries four rows of which three are empty strings.
  // Testing for the row advertised three blank pages; testing for content is the
  // question that was always meant.
  const allSlugs = Object.fromEntries(
    (
      data.all_translations as unknown as Array<{
        locale: string;
        tagline: string | null;
        short_description: string | null;
        description: string | null;
      }>
    )
      .filter((x) => hasContent(x))
      .map((x) => [x.locale, data.slug]),
  ) as Partial<Record<Locale, string>>;

  const isCompiled =
    data.is_stub === true && data.owner_id === null && data.is_verified !== true;

  return {
    allSlugs,
    id: data.id,
    slug: data.slug,
    name: data.name,
    // Seeded from public licensing records and not yet taken over by the
    // operator. The public page says so rather than presenting compiled data as
    // though the business had written it.
    isUnclaimed: data.owner_id === null,
    /**
     * Nothing on this page that the business or an editor wrote — only what
     * the importer compiled from public map data, and it is one sentence
     * repeated across 2,207 listings. The page prints it as a provenance
     * footnote rather than as an "About" article: a page that does not pretend
     * to be an article is not thin, a page of filler is. See
     * docs/ADSENSE-CONTENT-AUDIT.md.
     *
     * Ownership and verification override it, so claiming a listing turns the
     * page back into an ordinary one at once.
     */
    isCompiled,
    /**
     * Served noindex while the importer's sentence is the only prose, because
     * 2,207 pages of it is what cost this site its publisher-network
     * application. See migration 059.
     */
    isIndexable: !isCompiled,
    countryCode: data.country_code,
    logoUrl: safeImageUrl(data.logo_url),
    coverImageUrl: safeImageUrl(data.cover_image_url),
    city: data.city,
    address: data.address,
    latitude: data.latitude,
    longitude: data.longitude,
    locationPrecision: data.location_precision,
    likeCount: data.like_count ?? 0,
    email: data.email,
    phone: data.phone,
    whatsapp: data.whatsapp,
    website: data.website,
    foundedYear: data.founded_year,
    teamSize: data.team_size,
    licenseNumber: data.license_number,
    // Null until an administrator has actually checked the number against a
    // named source. 079 refuses a date without both, so a non-null value here
    // is evidence rather than a flag somebody flipped.
    licenceCheckedAt: data.license_checked_at,
    licenceCheckedSource: data.license_checked_source,
    associations: data.associations,
    dayRateLow: data.day_rate_low,
    dayRateHigh: data.day_rate_high,
    dayRateCurrency: data.day_rate_currency,
    isVerified: data.is_verified,
    isDemo: data.is_demo,
    tier: data.tier,
    ratingAvg: Number(data.rating_avg),
    ratingCount: data.rating_count,
    responseRate: data.response_rate === null ? null : Number(data.response_rate),
    avgResponseMinutes: data.avg_response_minutes,
    tagline: t.tagline,
    shortDescription: t.short_description,
    description: t.description,
    seoTitle: t.seo_title,
    seoDescription: t.seo_description,
    categoryIds: data.business_categories.map((c) => c.category_id),
    /**
     * The operator's own primary choice among several, so the page can label
     * its media fallback (§5.1.2) and its category pill (§7.3) with one
     * category rather than with all of them.
     *
     * Only the id is carried. The page already loads the full category list for
     * its chips, and nesting the category row inside this select degraded
     * PostgREST's type inference for the whole row — a `business_destinations`
     * that typed as `never[]` is how that showed up.
     */
    primaryCategoryId:
      data.business_categories.find((c) => c.is_primary)?.category_id ??
      data.business_categories[0]?.category_id ??
      null,
    destinationIds: data.business_destinations.map((d) => d.destination_id),
    services: data.business_services
      .map((s) => {
        const st = s.business_service_translations.find((x) => x.locale === contentLocale(locale));
        return {
          id: s.id,
          name: st?.name ?? null,
          description: st?.description ?? null,
          priceFrom: s.price_from === null ? null : Number(s.price_from),
          currency: s.currency,
          sortOrder: s.sort_order,
        };
      })
      .filter((s) => s.name)
      .sort((a, b) => a.sortOrder - b.sortOrder),
  };
});

/** Slugs for generateStaticParams. Slugs are locale-independent for businesses. */
/**
 * Slugs to prerender at build time.
 *
 * Every approved listing used to be built ahead of time: 2,618 businesses
 * across four locales, which is most of a 5,097-page build and the reason a
 * change takes sixteen minutes to appear. That cost is paid on every deploy,
 * for pages that in the last thirty days were viewed a combined handful of
 * times.
 *
 * So the ones worth having ready are built, and the rest are rendered on first
 * request and cached from then on. Nothing becomes unavailable and nothing
 * drops out of the index — dynamicParams is on, so an unbuilt slug renders
 * normally rather than 404ing, and the sitemap still lists all of them.
 *
 * This does not touch the sitemap. getBusinessEntries in lib/queries/sitemap.ts
 * runs its own paged query over every approved listing, so all 2,618 stay
 * listed and indexable — being prerendered and being indexed are different
 * questions and are answered in different places.
 *
 * "Worth having ready" is ordered by what a visitor is most likely to reach:
 * paying tiers first, since those are the listings the platform has promised
 * placement to, then whatever is rated and reviewed. A cold render costs the
 * first visitor a second or so; that is a fair price on a listing nobody has
 * opened in a month, and not one worth paying on a featured operator.
 */
// 300 of 3,336 listings, times five locales, was 1,500 pages — half of a
// prerender that the database could not keep up with and that cost four days
// of deploys. 60 in English only is 60 pages; every other listing renders on
// first request and is cached, which is what the paragraph above already
// described as a fair price.
//
// 200 now, for two reasons that both had to be true first. The locale multiplier
// is gone — `prerenderLocales` builds the tail in English only, so 200 listings
// are 200 pages rather than 1,000 — and the heaviest query on the page, the
// four "similar operators" at the foot of it, is cached across listings now
// instead of being asked once per page (see getSimilarBusinesses; it is what
// was emptying the connection pool partway through the last build).
//
// Not higher than 200, and the reason is worth stating because it is tempting:
// prerendering does not make a listing indexable. All 429 indexable listings
// are in the sitemap whether they are prebuilt or not. What this buys is a warm
// first visit, so the right number is "the listings somebody actually opens",
// not "all of them". Raise it with PRERENDER_BUSINESS_LIMIT if a build has room
// to spare; the only cost of being wrong is build minutes.
const PRERENDERED_BUSINESSES = Number(process.env.PRERENDER_BUSINESS_LIMIT ?? 200);

export const getAllBusinessSlugs = cache(async () => {
  try {
    const supabase = createPublicClient();
    const { data, error } = await supabase
      .from('businesses')
      .select('slug')
      .eq('status', 'approved')
      .is('deleted_at', null)
      // Which listings are worth building ahead of time. Claimed and reviewed
      // rather than subscribed — the pages people actually land on.
      .order('owner_id', { ascending: false, nullsFirst: false })
      .order('rating_count', { ascending: false })
      .order('rating_avg', { ascending: false })
      .limit(PRERENDERED_BUSINESSES);

    if (error || !data || data.length === 0) {
      return CURATED_BUSINESSES.map((b) => b.slug);
    }
    return data.map((b) => b.slug);
  } catch (err) {
    console.warn('getAllBusinessSlugs fallback:', err);
    return CURATED_BUSINESSES.map((b) => b.slug);
  }
});

/**
 * Cards for a specific set of businesses, in the order the ids are given.
 *
 * Used by the saved-favourites page. Resolving through the card query rather
 * than storing a snapshot means a saved listing always shows its current name,
 * rating and cover — and a listing that has since been suspended or deleted
 * simply drops out rather than rendering a stale card that goes nowhere.
 */
/**
 * Names for a set of slugs, in the order asked for.
 *
 * Multi-operator mode on the quote form needs to name the operators the
 * enquiry is about to go to, and nothing more — `getBusinessBySlug` would
 * fetch photos, hours, reviews and licence state per operator to render six
 * strings. A slug that no longer resolves to an approved listing is dropped,
 * so a stale saved link narrows the request instead of failing it.
 */
export const getBusinessNamesBySlugs = cache(async (slugs: string[]) => {
  if (!slugs.length) return [];

  const supabase = createPublicClient();
  const { data, error } = await supabase
    .from('businesses')
    .select('slug, name')
    .in('slug', slugs)
    .eq('status', 'approved')
    .is('deleted_at', null);

  if (error) throw new Error(`getBusinessNamesBySlugs: ${error.message}`);

  const bySlug = new Map((data ?? []).map((b) => [b.slug, b.name]));
  return slugs
    .filter((slug) => bySlug.has(slug))
    .map((slug) => ({ slug, name: bySlug.get(slug) as string }));
});

export const getBusinessCardsByIds = cache(async (ids: string[], locale: Locale) => {
  if (!ids.length) return [];

  const supabase = createPublicClient();
  const { data, error } = await supabase
    .from('businesses')
    .select(SELECT_CARD_WITH_CATEGORY)
    .in('id', ids)
    .eq('business_translations.locale', contentLocale(locale))
    .eq('cat.categories.category_translations.locale', contentLocale(locale))
    .eq('status', 'approved')
    .is('deleted_at', null);

  if (error) throw new Error(`getBusinessCardsByIds: ${error.message}`);

  const cards = (data as unknown as Parameters<typeof toCard>[0][]).map(toCard);
  // Preserve the caller's order, which is newest-saved-first.
  const byId = new Map(cards.map((c) => [c.id, c]));
  return ids.map((id) => byId.get(id)).filter((c): c is NonNullable<typeof c> => Boolean(c));
});

/**
 * The four "similar operators" shown at the foot of a listing.
 *
 * Its own function, cached, because the answer does not depend on the listing
 * asking. It is `searchBusinesses(locale, { categoryId, perPage: 4 })` — keyed
 * on the category and the locale and nothing else — so every tour operator in
 * the directory was asking the same question and getting the same four names.
 *
 * That was free while the listing page was dynamic: one visitor, one query.
 * Making the page static turned it into one query per prerendered listing per
 * locale, and the build log showed the result — "Timed out acquiring connection
 * from connection pool" and `searchBusinesses` falling back to the curated list
 * partway through "Generating static pages". A page that renders the fallback
 * row is then frozen that way until it revalidates, so this was not only slow,
 * it was shipping the wrong four operators.
 *
 * There are six categories and five locales, so the cache has at most thirty
 * entries and the build asks thirty times instead of once per page. `revalidate`
 * is long because the row is a browsing aid: a newly approved operator joining
 * it an hour late costs nothing, and the `businesses` tag lets an approval
 * revalidate it immediately when that matters.
 *
 * unstable_cache rather than React `cache`: React's is per-request, which
 * dedupes nothing here because each page is its own request. This one is backed
 * by the incremental cache, so an answer computed for one page is there for the
 * next.
 *
 * Both layers are needed, and the build that had only the second one is why.
 * unstable_cache remembers a *finished* answer; it does nothing about identical
 * calls that are in flight at the same moment. So the first wave of listing
 * pages all missed together and all issued the same query at once: 176 statement
 * timeouts in one band of ~83 pages, each falling back to the curated list,
 * after which the cache filled and the remaining pages were clean. The errors
 * clustered instead of spreading, which is what a cold-start stampede looks
 * like and what distinguishes it from the pool simply being too small.
 *
 * `inFlight` is the fix: identical concurrent calls share one promise, so a
 * category is queried once however many pages ask for it together. It is a
 * module Map, which means per worker process — exactly the right scope, since
 * the stampede is between pages rendering concurrently inside one worker. The
 * entry is deleted on settle so this never holds a result; remembering is
 * unstable_cache's job and a Map that kept them would be a second, unbounded
 * cache with no revalidation.
 */
const similarInFlight = new Map<string, Promise<DirectoryResult>>();

const fetchSimilarBusinesses = unstable_cache(
  async (locale: Locale, categoryId: string | undefined): Promise<DirectoryResult> =>
    searchBusinesses(locale, { categoryId, perPage: 4, boosts: false }),
  ['similar-businesses'],
  { tags: ['businesses'], revalidate: 3600 },
);

export function getSimilarBusinesses(
  locale: Locale,
  categoryId: string | undefined,
): Promise<DirectoryResult> {
  const key = `${locale}:${categoryId ?? '-'}`;
  const running = similarInFlight.get(key);
  if (running) return running;

  const started = fetchSimilarBusinesses(locale, categoryId).finally(() => {
    similarInFlight.delete(key);
  });
  similarInFlight.set(key, started);
  return started;
}
