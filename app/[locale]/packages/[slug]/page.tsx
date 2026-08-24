import type { Metadata } from 'next';
import Image from 'next/image';
import { notFound } from 'next/navigation';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { BadgeCheck, CalendarDays, Check, MessageCircle, Users, X } from 'lucide-react';

import { locales, type Locale } from '@/i18n/routing';
import { Link } from '@/i18n/navigation';
import { localeAlternates, absoluteUrl } from '@/lib/seo';
import { getPackageBySlug, getAllPackageSlugs } from '@/lib/queries/packages';
import { getDestinations } from '@/lib/queries/taxonomy';
import { formatPrice, whatsappLink } from '@/lib/format';
import { MediaPlaceholder } from '@/components/cards/media-placeholder';
import { Breadcrumbs } from '@/components/layout/breadcrumbs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { PageView } from '@/components/analytics/page-view';

type Params = { locale: Locale; slug: string };

export async function generateStaticParams() {
  const slugs = await getAllPackageSlugs();
  return locales.flatMap((locale) => slugs.map((slug) => ({ locale, slug })));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<Params>;
}): Promise<Metadata> {
  const { locale, slug } = await params;
  const pkg = await getPackageBySlug(slug, locale);
  if (!pkg) return {};

  return {
    title: pkg.seoTitle ?? pkg.title,
    description: pkg.seoDescription ?? pkg.summary ?? undefined,
    alternates: localeAlternates({ pathname: '/packages/[slug]', params: { slug } }, locale),
    openGraph: { type: 'article', title: pkg.title, description: pkg.summary ?? undefined },
  };
}

export default async function PackagePage({ params }: { params: Promise<Params> }) {
  const { locale, slug } = await params;
  setRequestLocale(locale);

  const pkg = await getPackageBySlug(slug, locale);
  if (!pkg) notFound();

  const [destinations, t, tCommon, tBusiness, tNav] = await Promise.all([
    getDestinations(locale),
    getTranslations('package'),
    getTranslations('common'),
    getTranslations('business'),
    getTranslations('nav'),
  ]);

  const pkgDestinations = destinations.filter((d) => pkg.destinationIds.includes(d.id));
  const included = pkg.inclusions.filter((i) => i.isIncluded);
  const excluded = pkg.inclusions.filter((i) => !i.isIncluded);

  const wa = pkg.business.whatsapp
    ? whatsappLink(pkg.business.whatsapp, `${tBusiness('whatsappMessage')} (${pkg.title})`)
    : null;

  // TouristTrip is the correct type for a packaged itinerary, and the offer
  // block is what produces the price in a rich result.
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'TouristTrip',
    name: pkg.title,
    description: pkg.summary ?? pkg.description ?? undefined,
    url: absoluteUrl(`/packages/${slug}`),
    provider: { '@type': 'Organization', name: pkg.business.name },
    ...(pkg.priceFrom !== null
      ? {
          offers: {
            '@type': 'Offer',
            price: pkg.priceFrom,
            priceCurrency: pkg.currency,
            availability: 'https://schema.org/InStock',
          },
        }
      : {}),
    ...(pkgDestinations.length
      ? {
          itinerary: pkgDestinations.map((d) => ({ '@type': 'Place', name: d.name })),
        }
      : {}),
  };

  return (
    <>
      <PageView locale={locale} packageId={pkg.id} />

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <section className="relative isolate -mt-[var(--header-h)] flex min-h-[min(50svh,30rem)] items-end pt-[var(--header-h)]">
        {pkg.coverImageUrl ? (
          <Image src={pkg.coverImageUrl} alt="" fill priority sizes="100vw" className="-z-10 object-cover" />
        ) : (
          <MediaPlaceholder seed={pkg.slug} className="absolute inset-0 -z-10" />
        )}
        <div className="overlay-scrim absolute inset-0 -z-10" />

        <div className="container-page pb-10 pt-16">
          {pkg.isDemo && (
            <Badge variant="demo" className="mb-4 border-white/40 bg-black/30 text-white">
              {tCommon('demoData')}
            </Badge>
          )}
          <h1 className="max-w-3xl text-4xl font-semibold text-white sm:text-5xl">
            {pkg.title}
          </h1>
          {pkg.summary && (
            <p className="mt-4 max-w-2xl text-lg text-white/85">{pkg.summary}</p>
          )}
        </div>
      </section>

      <div className="container-page pt-8">
        <Breadcrumbs
          locale={locale}
          items={[
            { label: 'Explore Tanzania', href: '/' },
            { label: tNav('directory'), href: '/directory' },
            {
              label: pkg.business.name,
              href: { pathname: '/business/[slug]', params: { slug: pkg.business.slug } },
            },
            { label: pkg.title },
          ]}
        />
      </div>

      <div className="container-page py-section">
        <div className="grid gap-12 lg:grid-cols-[1.6fr_1fr]">
          <div className="space-y-12">
            {pkg.description && (
              <section>
                <p className="text-lg leading-relaxed text-muted-foreground">
                  {pkg.description}
                </p>
              </section>
            )}

            {pkg.itinerary && (
              <section>
                <h2 className="text-2xl font-semibold">{t('itinerary')}</h2>
                <p className="mt-5 whitespace-pre-line leading-relaxed text-muted-foreground">
                  {pkg.itinerary}
                </p>
              </section>
            )}

            {/* Inclusions are the single most common source of dispute in safari
                pricing, so they get equal visual weight rather than a footnote. */}
            {pkg.inclusions.length > 0 && (
              <section className="grid gap-8 sm:grid-cols-2">
                {included.length > 0 && (
                  <div>
                    <h2 className="text-lg font-semibold">{t('included')}</h2>
                    <ul className="mt-4 space-y-2.5">
                      {included.map((i) => (
                        <li key={i.id} className="flex items-start gap-2.5 text-sm">
                          <Check className="mt-0.5 size-4 shrink-0 text-success" aria-hidden />
                          <span>{i.label}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                {excluded.length > 0 && (
                  <div>
                    <h2 className="text-lg font-semibold">{t('excluded')}</h2>
                    <ul className="mt-4 space-y-2.5">
                      {excluded.map((i) => (
                        <li
                          key={i.id}
                          className="flex items-start gap-2.5 text-sm text-muted-foreground"
                        >
                          <X className="mt-0.5 size-4 shrink-0 text-destructive" aria-hidden />
                          <span>{i.label}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </section>
            )}

            {pkgDestinations.length > 0 && (
              <section>
                <h2 className="text-2xl font-semibold">{tBusiness('destinationsServed')}</h2>
                <div className="mt-5 flex flex-wrap gap-2.5">
                  {pkgDestinations.map((d) => (
                    <Link
                      key={d.id}
                      href={{ pathname: '/destinations/[slug]', params: { slug: d.slug } }}
                      className="rounded-full border px-4 py-2 text-sm transition-colors hover:border-primary hover:bg-primary/5 hover:text-primary"
                    >
                      {d.name}
                    </Link>
                  ))}
                </div>
              </section>
            )}
          </div>

          <aside className="lg:sticky lg:top-[calc(var(--header-h)+1.5rem)] lg:self-start">
            <div className="rounded-2xl border bg-card p-6">
              {pkg.priceFrom !== null && (
                <p className="text-sm text-muted-foreground">
                  {t('from')}{' '}
                  <span className="font-display text-3xl font-semibold text-foreground">
                    {formatPrice(pkg.priceFrom, pkg.currency, locale)}
                  </span>
                  {pkg.priceUnit === 'per_person' && (
                    <span className="ml-1">{tCommon('perPerson')}</span>
                  )}
                </p>
              )}

              <dl className="mt-6 space-y-3 border-t pt-6 text-sm">
                {pkg.durationDays && (
                  <div className="flex items-center justify-between gap-4">
                    <dt className="flex items-center gap-2 text-muted-foreground">
                      <CalendarDays className="size-3.5" aria-hidden />
                      {t('duration')}
                    </dt>
                    <dd className="font-medium">
                      {pkg.durationNights
                        ? t('nights', { nights: pkg.durationNights })
                        : `${pkg.durationDays}`}
                    </dd>
                  </div>
                )}
                {pkg.maxGroupSize && (
                  <div className="flex items-center justify-between gap-4">
                    <dt className="flex items-center gap-2 text-muted-foreground">
                      <Users className="size-3.5" aria-hidden />
                      {t('groupSize')}
                    </dt>
                    <dd className="font-medium">{t('maxPeople', { count: pkg.maxGroupSize })}</dd>
                  </div>
                )}
              </dl>

              <div className="mt-6 space-y-3 border-t pt-6">
                <p className="text-xs uppercase tracking-wide text-muted-foreground">
                  {t('operator')}
                </p>
                <Link
                  href={{ pathname: '/business/[slug]', params: { slug: pkg.business.slug } }}
                  className="flex items-center gap-2 font-medium hover:text-primary"
                >
                  {pkg.business.isVerified && (
                    <BadgeCheck className="size-4 shrink-0 text-success" aria-hidden />
                  )}
                  {pkg.business.name}
                </Link>
              </div>

              <div className="mt-6 space-y-3">
                <Button asChild size="lg" className="w-full">
                  <Link href={{ pathname: '/request-quote', query: { package: pkg.slug } }}>
                    {tBusiness('requestQuote')}
                  </Link>
                </Button>
                {wa && (
                  <Button asChild variant="outline" size="lg" className="w-full">
                    <a href={wa} target="_blank" rel="noopener noreferrer">
                      <MessageCircle className="size-4" aria-hidden />
                      {tBusiness('whatsapp')}
                    </a>
                  </Button>
                )}
              </div>
            </div>
          </aside>
        </div>
      </div>
    </>
  );
}
