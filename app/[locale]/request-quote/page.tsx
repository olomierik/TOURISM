import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';

import type { LocaleParams } from '@/i18n/routing';
import { localeAlternates } from '@/lib/seo';
import { getDestinations } from '@/lib/queries/taxonomy';
import { getBusinessNamesBySlugs } from '@/lib/queries/businesses';
import { MAX_CHOSEN } from '@/lib/leads/quote-types';
import { QuoteWizard, type Budget, type TripType } from '@/components/quote/quote-wizard';

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export async function generateMetadata({
  params,
}: {
  params: Promise<LocaleParams>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'quote' });

  return {
    title: t('title'),
    description: t('subtitle'),
    alternates: localeAlternates('/request-quote', locale),
    // A half-filled form is not a search result, and every step is the same
    // URL with a different query. §13 wants one canonical entry point.
    robots: { index: true, follow: true },
  };
}

const first = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);
const all = (v: string | string[] | undefined) =>
  v === undefined ? [] : Array.isArray(v) ? v : [v];

const TRIP_TYPES = new Set(['safari', 'kilimanjaro', 'zanzibar', 'safari-beach']);
const BUDGETS = new Set(['under-250', '250-450', 'over-450', 'unsure']);

/**
 * Request a quote — design.md §7.7.
 *
 * "Layout: centred column 640 px max; top bar with Back IconButton, a progress
 * indicator and a Close link to the referring page. The bottom nav is hidden."
 *
 * The page is deliberately almost empty around the form. What it replaces had
 * a breadcrumb, a 48px heading, a lead paragraph, a trust line with a shield
 * icon, and a bordered card around the form — roughly 320px of furniture above
 * the first question, on the page a visitor reaches by pressing a button that
 * already told them what this is. The form's own heading is the page's
 * heading, and the progress bar says how much is left.
 *
 * Prefill is the other half of §7.7, and it comes from four places: the
 * homepage QuoteStarter (`step=2` with the whole brief), a destination page, a
 * business page (single-operator mode), and a package page. Every one of them
 * has already asked something, and re-asking it is where people leave.
 */
export default async function RequestQuotePage({
  params,
  searchParams,
}: {
  params: Promise<LocaleParams>;
  searchParams: SearchParams;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const sp = await searchParams;

  // One `business` is a business page; several is the Saved list asking all of
  // them at once (§7.14). The cap is the server's, repeated here so the form
  // never names an operator the action will go on to drop.
  const businessSlugs = all(sp.business)
    .filter((s) => /^[a-z0-9-]{1,120}$/.test(s))
    .slice(0, MAX_CHOSEN);

  const [destinations, operators] = await Promise.all([
    getDestinations(locale, { limit: 48 }),
    getBusinessNamesBySlugs(businessSlugs),
  ]);

  // §9.3: Tanzania by default on every listing surface, this one included.
  const options = destinations
    .filter((d) => (d.countryCode ?? 'TZ').toUpperCase() === 'TZ')
    .map((d) => ({ value: d.slug, label: d.name }));

  const tripType = first(sp.tripType);
  const budget = first(sp.budget);
  const month = Number(first(sp.month));
  const year = Number(first(sp.year));
  const adults = Number(first(sp.adults));

  return (
    <main data-hide-tab-bar className="container-page py-8 sm:py-12">
      <QuoteWizard
        destinations={options}
        operators={operators}
        backHref={
          // Back to the one operator's page when that is where this started;
          // from the Saved list there is no single page to return to.
          operators.length === 1
            ? { pathname: '/business/[slug]', params: { slug: operators[0].slug } }
            : operators.length > 1
              ? '/account/favorites'
              : '/'
        }
        defaults={{
          ...(tripType && TRIP_TYPES.has(tripType) ? { tripType: tripType as TripType } : {}),
          ...(budget && BUDGETS.has(budget) ? { budget: budget as Budget } : {}),
          // Only slugs this locale actually has. A stale link should widen the
          // form, not seed it with a destination that renders as a raw slug.
          destinations: all(sp.destination).filter((s) =>
            options.some((o) => o.value === s),
          ),
          ...(month >= 1 && month <= 12 && year >= 2000 ? { month: { month, year } } : {}),
          ...(adults >= 1 && adults <= 24 ? { adults } : {}),
          ...(first(sp.message) ? { message: String(first(sp.message)) } : {}),
          ...(first(sp.interests) ? { interests: all(sp.interests) } : {}),
        }}
      />
    </main>
  );
}
