import type { Metadata } from 'next';
import { notFound, permanentRedirect } from 'next/navigation';
import { getTranslations, setRequestLocale } from 'next-intl/server';

import type { Locale } from '@/i18n/routing';
import { getPathname } from '@/i18n/navigation';
import { rescueCategorySlug, rescueDestinationSlug } from '@/lib/seo/slug-rescue';
import { localeAlternatesForCombo, absoluteUrl } from '@/lib/seo';
import {
  getCategoryBySlug,
  getComboSlugs,
  getDestinationBySlug,
  getPopulatedComboPairs,
} from '@/lib/queries/taxonomy';
import { searchBusinesses } from '@/lib/queries/businesses';
import { getPackagesForDestination } from '@/lib/queries/packages';
import { BusinessCard } from '@/components/cards/business-card';
import { PackageCard } from '@/components/cards/package-card';
import { Breadcrumbs } from '@/components/layout/breadcrumbs';
import { Section } from '@/components/layout/section';
import { EndBand } from '@/components/home/sections';
import { getGuides } from '@/lib/queries/guides';
import { GuideCard } from '@/components/cards/guide-card';
import { PlanningBrief } from '@/components/destination/planning-brief';
import { ThingsToDo } from '@/components/destination/things-to-do';
import { prerenderLocales } from '@/lib/prerender';

type Params = { locale: Locale; category: string; destination: string };

/**
 * The commercial pages: "safari operators in Serengeti", "hotels in Zanzibar".
 *
 * These match how people actually search — category plus place. The grid is six
 * categories x 65 destinations, and 231 of those 390 cells have an approved
 * business in them. Only those are generated: an indexed page listing nothing is
 * a thin-content signal, and there is no reason to create one.
 *
 * The empty cells are mostly empty because of supply, not because of a missing
 * page — thirteen destinations have no approved listing at all. What was worth
 * fixing was the other direction: 1,067 approved listings were attached to no
 * destination, so they appeared on none of these pages and could not be matched
 * to an enquiry by place. scripts/seed-destinations-cities.mjs has that account.
 */
export async function generateStaticParams() {
  const params: Array<{ locale: string; category: string; destination: string }> = [];
  // Prerendered locales only; the others render on first request and cache.
  for (const locale of prerenderLocales) {
    const pairs = await getPopulatedComboPairs(locale);
    for (const pair of pairs) {
      params.push({ locale, category: pair.category, destination: pair.destination });
    }
  }
  return params;
}

async function resolve(params: Params) {
  const [category, destination] = await Promise.all([
    getCategoryBySlug(params.category, params.locale),
    getDestinationBySlug(params.destination, params.locale),
  ]);
  return category && destination ? { category, destination } : null;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<Params>;
}): Promise<Metadata> {
  const p = await params;
  const resolved = await resolve(p);
  if (!resolved) return {};

  const { category, destination } = resolved;
  const heading =
    category.comboHeading?.replace('{destination}', destination.name) ??
    `${category.name} — ${destination.name}`;

  const { total } = await searchBusinesses(p.locale, {
    categoryId: category.id,
    destinationId: destination.id,
    perPage: 1,
  });

  const t = await getTranslations({ locale: p.locale, namespace: 'directory' });

  return {
    title: heading,
    // `showing` is the on-page results counter: "4 businesses". It read as a
    // data dump in a search result — "4 businesses — Tour Guides, Ngorongoro
    // Crater." — because it was never written to be prose. A snippet is the
    // only copy most people see before deciding whether to click.
    description: t('comboMeta', {
      count: total,
      category: category.name,
      destination: destination.name,
    }),
    // Both halves of this URL are translated (/it/safari/serengeti, not
    // /it/safaris/serengeti), so alternates come from the real per-locale pairs.
    alternates: localeAlternatesForCombo(
      await getComboSlugs(category.id, destination.id),
      p.locale,
    ),
    openGraph: { type: 'website', title: heading },
  };
}

export default async function ComboPage({ params }: { params: Promise<Params> }) {
  const p = await params;
  setRequestLocale(p.locale);

  const resolved = await resolve(p);
  if (!resolved) {
    // Two slugs, either of which can belong to the wrong language — and the
    // 4xx report holds both shapes: /de/hotels/arusha (English category under
    // a German prefix) and /de/safari/parco-nazionale-murchison-falls (Italian
    // destination). Each half is rescued on its own, so a URL that is wrong in
    // one place, or in both, lands on the pair that exists.
    const [category, destination] = await Promise.all([
      rescueCategorySlug(p.category, p.locale),
      rescueDestinationSlug(p.destination, p.locale),
    ]);
    if (category || destination) {
      permanentRedirect(
        getPathname({
          href: {
            pathname: '/[category]/[destination]',
            params: {
              category: category ?? p.category,
              destination: destination ?? p.destination,
            },
          },
          locale: p.locale,
        }),
      );
    }
    notFound();
  }

  const { category, destination } = resolved;

  const [results, packages, guides, tDest, t, tNav] = await Promise.all([
    searchBusinesses(p.locale, {
      categoryId: category.id,
      destinationId: destination.id,
      perPage: 24,
    }),
    getPackagesForDestination(destination.id, p.locale, 3),
    // Guides about this destination, linked from the page that sells it. The
    // guides are what ranks; this is the link that passes a reader — and a
    // crawler — from the article to the operators (docs/seo-and-traffic.md §3).
    getGuides(p.locale, { destinationId: destination.id, limit: 3, strict: true }),
    getTranslations('destination'),
    getTranslations('directory'),
    getTranslations('nav'),
  ]);

  // A pair with no businesses should never have been generated; if the data
  // changes underneath us, 404 rather than serve an empty commercial page.
  if (results.total === 0) notFound();

  const heading =
    category.comboHeading?.replace('{destination}', destination.name) ??
    `${category.name} — ${destination.name}`;

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: heading,
    numberOfItems: results.total,
    itemListElement: results.items.slice(0, 10).map((b, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      url: absoluteUrl(`/business/${b.slug}`),
      name: b.name,
    })),
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <div className="container-page pt-10">
        <Breadcrumbs
          locale={p.locale}
          items={[
            { label: 'Explore Tanzania', href: '/' },
            { label: tNav('destinations'), href: '/destinations' },
            {
              label: destination.name,
              href: { pathname: '/destinations/[slug]', params: { slug: p.destination } },
            },
            { label: category.name },
          ]}
        />
      </div>

      <div className="container-page pb-section pt-8">
        <h1 className="text-4xl font-semibold sm:text-5xl">{heading}</h1>
        <p className="mt-4 text-lg text-muted-foreground">
          {t('showing', { count: results.total })}
          {destination.summary ? ` · ${destination.summary}` : ''}
        </p>

        <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {results.items.map((b) => (
            <BusinessCard key={b.id} business={b} />
          ))}
        </div>
      </div>

      {/* The actual things to do, above the operators. A page with this title
          should answer it before it starts selling. */}
      <ThingsToDo
        destinationId={destination.id}
        destinationName={destination.name}
        locale={p.locale}
      />

      {/*
        Cost, this month's conditions, and the best month — all from data that
        was already published on the destination page and never reached the
        pages that actually rank for "things to do in".
      */}
      <PlanningBrief
        destinationId={destination.id}
        destinationSlug={p.destination}
        destinationName={destination.name}
        locale={p.locale}
      />

      {packages.length > 0 && (
        <Section title={`${destination.name}`} muted>
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {packages.map((pkg) => (
              <PackageCard key={pkg.id} pkg={pkg} locale={p.locale} />
            ))}
          </div>
        </Section>
      )}

      {guides.length > 0 && (
        <Section title={tDest('guides', { name: destination.name })}>
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {guides.map((g) => (
              <GuideCard key={g.id} guide={g} />
            ))}
          </div>
        </Section>
      )}

      <EndBand />
    </>
  );
}
