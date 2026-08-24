import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { MapPin } from 'lucide-react';

import { locales, type Locale } from '@/i18n/routing';
import { Link } from '@/i18n/navigation';
import { localeAlternatesForSegment, absoluteUrl } from '@/lib/seo';
import {
  getCategories,
  getCategoryBySlug,
  getCategorySlugs,
  getDestinations,
} from '@/lib/queries/taxonomy';
import { searchBusinesses } from '@/lib/queries/businesses';
import { BusinessCard } from '@/components/cards/business-card';
import { Breadcrumbs } from '@/components/layout/breadcrumbs';
import { Section } from '@/components/layout/section';
import { QuoteCta } from '@/components/home/quote-cta';

type Params = { locale: Locale; category: string };

/**
 * Category landing page: /safaris, /hotels, /de/mietwagen.
 *
 * Sits above the category x destination combinations and targets the broader
 * query ("safari operators in Tanzania") while the combinations target the
 * specific one ("safari operators in the Serengeti"). Linking down to every
 * populated destination is what makes those deeper pages discoverable, since
 * nothing else on the site links to all 24 of them.
 */
export async function generateStaticParams() {
  const params: Array<{ locale: string; category: string }> = [];
  for (const locale of locales) {
    const categories = await getCategories(locale);
    for (const c of categories) params.push({ locale, category: c.slug });
  }
  return params;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<Params>;
}): Promise<Metadata> {
  const { locale, category: slug } = await params;
  const category = await getCategoryBySlug(slug, locale);
  if (!category) return {};

  const { total } = await searchBusinesses(locale, {
    categoryId: category.id,
    perPage: 1,
  });

  return {
    title: category.name,
    description:
      category.summary ??
      // Named the country until the directory covered four of them. The count
      // is the useful half anyway — "127 listed" tells a searcher more about
      // whether this page is worth opening than the geography does.
      `${category.name} — ${total} listed across East Africa.`,
    alternates: localeAlternatesForSegment(
      await getCategorySlugs(category.id),
      locale,
    ),
    openGraph: { type: 'website', title: category.name },
  };
}

export default async function CategoryPage({
  params,
}: {
  params: Promise<Params>;
}) {
  const { locale, category: slug } = await params;
  setRequestLocale(locale);

  const category = await getCategoryBySlug(slug, locale);
  // A slug that is not a category falls through to the combination route, which
  // 404s on its own if that is not valid either.
  if (!category) notFound();

  const [{ items, total }, destinations, tNav, tCommon] = await Promise.all([
    searchBusinesses(locale, { categoryId: category.id, perPage: 12 }),
    getDestinations(locale),
    getTranslations('nav'),
    getTranslations('common'),
  ]);

  // Only destinations that actually have a listing in this category, so the
  // internal links never lead to an empty page.
  const populated = await Promise.all(
    destinations.map(async (d) => {
      const { total: n } = await searchBusinesses(locale, {
        categoryId: category.id,
        destinationId: d.id,
        perPage: 1,
      });
      return { destination: d, count: n };
    }),
  );
  const withListings = populated.filter((p) => p.count > 0);

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: category.name,
    numberOfItems: total,
    itemListElement: items.slice(0, 10).map((b, i) => ({
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
          locale={locale}
          items={[
            { label: 'Explore Tanzania', href: '/' },
            { label: tNav('directory'), href: '/directory' },
            { label: category.name },
          ]}
        />
      </div>

      <header className="container-page pb-10 pt-8">
        <h1 className="text-4xl font-semibold sm:text-5xl">{category.name}</h1>
        {category.summary && (
          <p className="mt-4 max-w-2xl text-lg leading-relaxed text-muted-foreground">
            {category.summary}
          </p>
        )}
        <p className="mt-4 text-sm text-muted-foreground">
          {tCommon('results', { count: total })}
        </p>
      </header>

      {withListings.length > 0 && (
        <div className="container-page pb-10">
          <h2 className="sr-only">{tNav('destinations')}</h2>
          <ul className="flex flex-wrap gap-2">
            {withListings.map(({ destination, count }) => (
              <li key={destination.id}>
                <Link
                  href={{
                    pathname: '/[category]/[destination]',
                    params: { category: category.slug, destination: destination.slug },
                  }}
                  className="inline-flex items-center gap-1.5 rounded-full border px-4 py-2 text-sm transition-colors hover:border-primary hover:bg-primary/5 hover:text-primary"
                >
                  <MapPin className="size-3.5" aria-hidden />
                  {destination.name}
                  <span className="text-muted-foreground">{count}</span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}

      <Section title={category.name}>
        {items.length > 0 ? (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {items.map((b) => (
              <BusinessCard key={b.id} business={b} />
            ))}
          </div>
        ) : (
          <p className="text-muted-foreground">{tCommon('results', { count: 0 })}</p>
        )}
      </Section>

      <QuoteCta />
    </>
  );
}
