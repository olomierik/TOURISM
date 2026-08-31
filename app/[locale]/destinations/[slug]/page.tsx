import type { Metadata } from 'next';
import Image from 'next/image';
import { notFound } from 'next/navigation';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { Compass, Lightbulb } from 'lucide-react';

import { locales, type Locale } from '@/i18n/routing';
import { Link } from '@/i18n/navigation';
import { localeAlternatesFromSlugs, absoluteUrl } from '@/lib/seo';
import { getDestinationBySlug, getDestinations, getCategories } from '@/lib/queries/taxonomy';
import { getBusinessesForDestination } from '@/lib/queries/businesses';
import { getPackagesForDestination } from '@/lib/queries/packages';
import { getGuides } from '@/lib/queries/guides';
import { createPublicClient } from '@/lib/supabase/public';
import { MediaPlaceholder } from '@/components/cards/media-placeholder';
import { PublicGallery } from '@/components/media/public-gallery';
import { BusinessCard } from '@/components/cards/business-card';
import { PackageCard } from '@/components/cards/package-card';
import { GuideCard } from '@/components/cards/guide-card';
import { Breadcrumbs } from '@/components/layout/breadcrumbs';
import { Section } from '@/components/layout/section';
import { Seasonality } from '@/components/destination/seasonality';
import { DestinationCosts } from '@/components/destination/costs';
import { DestinationMap } from '@/components/map/destination-map';
import { ThingsToDo } from '@/components/destination/things-to-do';
import { QuoteCta } from '@/components/home/quote-cta';
import { Badge } from '@/components/ui/badge';
import { PageView } from '@/components/analytics/page-view';
import { TrackView } from '@/components/analytics/tracked';

type Params = { locale: Locale; slug: string };

/**
 * Every destination in every locale, using that locale's own slug — so
 * /destinations/zanzibar and /de/reiseziele/sansibar are both prerendered.
 */
export async function generateStaticParams() {
  const params: Array<{ locale: string; slug: string }> = [];
  for (const locale of locales) {
    const destinations = await getDestinations(locale);
    for (const d of destinations) params.push({ locale, slug: d.slug });
  }
  return params;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<Params>;
}): Promise<Metadata> {
  const { locale, slug } = await params;
  const destination = await getDestinationBySlug(slug, locale);
  if (!destination) return {};

  return {
    title: destination.seoTitle ?? destination.name,
    description: destination.seoDescription ?? destination.summary ?? undefined,
    // Built from the destination's real per-locale slugs, not from `slug`
    // repeated across every locale — those URLs would 404.
    alternates: localeAlternatesFromSlugs(
      '/destinations/[slug]',
      destination.allSlugs,
      locale,
    ),
    openGraph: {
      type: 'article',
      title: destination.seoTitle ?? destination.name,
      description: destination.seoDescription ?? destination.summary ?? undefined,
    },
  };
}

export default async function DestinationPage({
  params,
}: {
  params: Promise<Params>;
}) {
  const { locale, slug } = await params;
  setRequestLocale(locale);

  const destination = await getDestinationBySlug(slug, locale);
  if (!destination) notFound();

  // Read through the public client so this page stays statically generated: it
  // is an SEO surface, and the cookie-bound client would opt it into dynamic
  // rendering. RLS returns exactly what an anonymous visitor may see, which is
  // what a page rendered once and served to everyone needs.
  const publicDb = createPublicClient();

  const [businesses, packages, categories, guides, gallery, t, tNav] = await Promise.all([
    getBusinessesForDestination(destination.id, locale, 6),
    getPackagesForDestination(destination.id, locale, 6),
    getCategories(locale),
    getGuides(locale, { destinationId: destination.id, limit: 3 }),
    publicDb
      .from('media')
      .select('id, public_url, caption, alt_text')
      .eq('destination_id', destination.id)
      .eq('kind', 'gallery')
      .order('sort_order'),
    getTranslations('destination'),
    getTranslations('nav'),
  ]);

  // TouristDestination markup: this is the page type Google surfaces for
  // "places to visit" queries, and the coordinates power the map card.
  //
  // containedInPlace was the literal string 'Tanzania' on every destination.
  // Correct while the site was Tanzanian; a confident falsehood on 31 of 46
  // pages once Kenya, Uganda and Rwanda went in. Structured data that asserts
  // the wrong country is worse than none — an answer engine has no way to tell
  // it is wrong, and models cache what they read.
  const place = destination.regionName
    ? {
        '@type': 'AdministrativeArea',
        name: destination.regionName,
        ...(destination.countryName
          ? { containedInPlace: { '@type': 'Country', name: destination.countryName } }
          : {}),
      }
    : destination.countryName
      ? { '@type': 'Country', name: destination.countryName }
      : null;

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'TouristDestination',
    name: destination.name,
    description: destination.summary ?? destination.description ?? undefined,
    url: absoluteUrl(`/destinations/${slug}`),
    ...(destination.coverImageUrl ? { image: destination.coverImageUrl } : {}),
    ...(destination.latitude && destination.longitude
      ? {
          geo: {
            '@type': 'GeoCoordinates',
            latitude: destination.latitude,
            longitude: destination.longitude,
          },
        }
      : {}),
    ...(place ? { containedInPlace: place } : {}),
    // Ties the page back to the publisher so a crawler assessing whether to cite
    // it can resolve who is making the claim.
    isPartOf: { '@id': absoluteUrl('/#website') },
  };

  return (
    <>
      <PageView locale={locale} destinationId={destination.id} />
      <TrackView event="destination_viewed" props={{ slug: destination.slug }} />

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      {/* Hero */}
      <section className="relative isolate -mt-[var(--header-h)] flex min-h-[min(60svh,34rem)] items-end pt-[var(--header-h)]">
        {/* The placeholder is the fallback, not the default. This page rendered
            it unconditionally and so showed a generated graphic even where an
            admin had uploaded a photograph — the only detail page in the app
            missing this branch. */}
        {destination.coverImageUrl ? (
          <Image
            src={destination.coverImageUrl}
            alt=""
            fill
            priority
            sizes="100vw"
            className="-z-10 object-cover"
          />
        ) : (
          <MediaPlaceholder seed={destination.key} className="absolute inset-0 -z-10" />
        )}
        <div className="overlay-scrim absolute inset-0 -z-10" />

        <div className="container-page pb-12 pt-16">
          <div className="max-w-3xl">
            {destination.isDemo && (
              <Badge variant="demo" className="mb-4 border-white/40 bg-black/30 text-white">
                Demo
              </Badge>
            )}
            <h1 className="text-4xl font-semibold text-white sm:text-5xl lg:text-6xl">
              {destination.name}
            </h1>
            {destination.summary && (
              <p className="mt-5 max-w-2xl text-lg leading-relaxed text-white/85">
                {destination.summary}
              </p>
            )}
          </div>
        </div>
      </section>

      <div className="container-page pt-8">
        <Breadcrumbs
          locale={locale}
          items={[
            { label: 'Explore Tanzania', href: '/' },
            { label: tNav('destinations'), href: '/destinations' },
            { label: destination.name },
          ]}
        />
      </div>

      {/* Overview + tips */}
      {(destination.description || destination.travelTips || destination.bestTime) && (
        <section className="container-page py-section">
          <div className="grid gap-12 lg:grid-cols-[1.6fr_1fr]">
            {destination.description && (
              <div>
                <h2 className="text-2xl font-semibold">{t('overview')}</h2>
                <p className="mt-5 text-lg leading-relaxed text-muted-foreground">
                  {destination.description}
                </p>
              </div>
            )}

            <aside className="space-y-5">
              {destination.bestTime && (
                <div className="rounded-2xl border bg-card p-5">
                  <h3 className="flex items-center gap-2 font-medium">
                    <Compass className="size-4 text-primary" aria-hidden />
                    {t('bestTime')}
                  </h3>
                  <p className="mt-2.5 text-sm leading-relaxed text-muted-foreground">
                    {destination.bestTime}
                  </p>
                </div>
              )}
              {destination.travelTips && (
                <div className="rounded-2xl border bg-card p-5">
                  <h3 className="flex items-center gap-2 font-medium">
                    <Lightbulb className="size-4 text-primary" aria-hidden />
                    {t('travelTips')}
                  </h3>
                  <p className="mt-2.5 text-sm leading-relaxed text-muted-foreground">
                    {destination.travelTips}
                  </p>
                </div>
              )}
            </aside>
          </div>
        </section>
      )}

      {/* Internal links into the commercial combination pages. These are the
          money URLs, and this block is the main way crawlers discover them. */}
      <section className="container-page pb-section">
        <h2 className="text-2xl font-semibold">
          {t('categoriesIn', { name: destination.name })}
        </h2>
        <div className="mt-6 flex flex-wrap gap-2.5">
          {categories.map((category) => (
            <Link
              key={category.id}
              href={{
                pathname: '/[category]/[destination]',
                params: { category: category.slug, destination: destination.slug },
              }}
              className="rounded-full border px-4 py-2 text-sm font-medium transition-colors hover:border-primary hover:bg-primary/5 hover:text-primary"
            >
              {category.name}
            </Link>
          ))}
        </div>
      </section>

      {(gallery.data?.length ?? 0) > 0 && (
        <Section title={t('photos', { name: destination.name })}>
          <PublicGallery images={gallery.data ?? []} />
        </Section>
      )}

      {businesses.length > 0 && (
        <Section
          title={t('operators', { name: destination.name })}
          viewAllHref={{ pathname: '/directory', query: { destination: slug } }}
          viewAllLabel={t('operatorsAll')}
          muted
        >
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {businesses.map((b) => (
              <BusinessCard key={b.id} business={b} />
            ))}
          </div>
        </Section>
      )}

      {packages.length > 0 && (
        <Section title={t('packages', { name: destination.name })}>
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {packages.map((p) => (
              <PackageCard key={p.id} pkg={p} locale={locale} />
            ))}
          </div>
        </Section>
      )}

      {/* Below the costs and above the month table: a reader who has decided
          the price works next wants to know where any of it actually is. */}
      <ThingsToDo
        destinationId={destination.id}
        destinationName={destination.name}
        locale={locale}
      />

      <DestinationMap
        destinationId={destination.id}
        destinationName={destination.name}
        center={
          destination.latitude !== null && destination.longitude !== null
            ? { lat: Number(destination.latitude), lng: Number(destination.longitude) }
            : null
        }
        locale={locale}
      />

      <DestinationCosts
        destinationId={destination.id}
        destinationName={destination.name}
        locale={locale}
      />

      <Seasonality
        destinationId={destination.id}
        destinationName={destination.name}
        locale={locale}
      />

      {guides.length > 0 && (
        <Section title={t('guides', { name: destination.name })} muted>
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {guides.map((g) => (
              <GuideCard key={g.id} guide={g} />
            ))}
          </div>
        </Section>
      )}

      <QuoteCta />
    </>
  );
}
