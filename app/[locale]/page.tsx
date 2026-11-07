import { notFound } from 'next/navigation';
import { hasLocale } from 'next-intl';
import { setRequestLocale } from 'next-intl/server';
import { routing } from '@/i18n/routing';

import { Hero } from '@/components/home/hero';
import {
  EnquiryBand,
  FeaturedOperators,
  PlanWithConfidence,
  QuickCategories,
  WhereAndWhen,
} from '@/components/home/sections';
import { getHeroFrames } from '@/lib/queries/hero';
import { getDestinations, getCategoriesWithCounts } from '@/lib/queries/taxonomy';

/**
 * Home — design.md §7.1.
 *
 * Nine sections, in the spec's order, against a target of 4,500px on mobile and
 * 4,200px on desktop. The page it replaces ran twelve blocks and 6,279px.
 *
 * What left, and where it went (§7.1 "Remove from the homepage"):
 *   events list            -> /events
 *   "Find what you need near you" -> Plan menu
 *   "Put your business on the map" -> footer and /for-business
 *   newsletter             -> footer
 *   "Not sure where to start?" -> merged into the hero's QuoteStarter
 *   six-category grid      -> section 4, now gated at 25 listings
 *
 * Every one of them was a reasonable block on its own. Together they made a
 * homepage that asked a visitor to read twelve propositions before doing the
 * one thing the site is for.
 */
export default async function HomePage({
  params,
}: {
  // `string`, not `Locale`: the router hands over whatever segment the URL
  // carried, so typing it as Locale was a claim the runtime does not honour.
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;

  // The layout runs the same check, and that is not enough: a layout and its
  // page render in parallel, so the layout calling notFound() does not stop
  // this page rendering with a bogus locale — whichever finishes first decides
  // the response, and a thrown error beats a 404.
  //
  // It matters because proxy.ts deliberately excludes anything containing a
  // dot from next-intl (that exclusion is what lets static files through), so
  // a request for /sitemap_index.xml or /foo.xml lands here with
  // locale="sitemap_index.xml". That reached `new Intl.NumberFormat(locale)`
  // in BrowseByType and threw RangeError, so every such URL answered **500**
  // where it owed a 404 — and crawlers probe these paths constantly. A 5xx
  // tells Google the server is unwell and costs crawl budget the site has
  // little of; a 404 just says no.
  if (!hasLocale(routing.locales, locale)) notFound();

  setRequestLocale(locale);

  const [frames, destinations, categories] = await Promise.all([
    getHeroFrames(locale),
    getDestinations(locale, { limit: 48 }),
    getCategoriesWithCounts(locale),
  ]);

  // Every country's destinations; the fields are searchable.
  const options = destinations.map((d) => ({ value: d.slug, label: d.name }));

  // Mobile-first redesign (2026-11), in the brief's order: what the site is
  // and a search (A-E), one-tap categories (F), where to go (G), operators
  // worth contacting (H), guides (I), and the enquiry last (J), as the page's
  // closing call to action.
  //
  // Browse by type, How it works and the end band left the home page in this
  // pass: the category strip does the first in a line, the enquiry band
  // carries the three steps, and the band *is* the end-of-page call to
  // action. Their components stay in sections.tsx for the pages that use them.
  return (
    <main className="flex w-full flex-col">
      <Hero
        frames={frames}
        categories={categories.map((c) => ({ slug: c.slug, name: c.name }))}
        destinations={destinations.map((d) => ({ slug: d.slug, name: d.name }))}
      />
      <QuickCategories locale={locale} categories={categories} />
      <WhereAndWhen locale={locale} />
      {/* Boosted operators first, then any that clear §9.2 on merit. */}
      <FeaturedOperators locale={locale} />
      <PlanWithConfidence locale={locale} />
      <EnquiryBand destinations={options} />
    </main>
  );
}
