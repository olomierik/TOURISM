import type { Metadata } from 'next';
import Image from 'next/image';
import { notFound } from 'next/navigation';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import {
  BadgeCheck,
  Building2,
  Globe,
  MapPin,
  MessageCircle,
  ShieldCheck,
  Star,
  Timer,
  Users,
} from 'lucide-react';

import { locales, type Locale } from '@/i18n/routing';
import { Link } from '@/i18n/navigation';
import { localeAlternatesFromSlugs, absoluteUrl } from '@/lib/seo';
import { getBusinessBySlug, getAllBusinessSlugs, searchBusinesses } from '@/lib/queries/businesses';
import { getPackagesForBusiness } from '@/lib/queries/packages';
import { getCategories, getDestinations } from '@/lib/queries/taxonomy';
import { formatPrice, whatsappLink } from '@/lib/format';
import { MediaPlaceholder } from '@/components/cards/media-placeholder';
import { PackageCard } from '@/components/cards/package-card';
import { BusinessCard } from '@/components/cards/business-card';
import { Breadcrumbs } from '@/components/layout/breadcrumbs';
import { Section } from '@/components/layout/section';
import { PublicGallery } from '@/components/media/public-gallery';
import { ReviewList, type PublicReview } from '@/components/reviews/review-list';
import { ReviewForm } from '@/components/reviews/review-form';
import { FavoriteButton } from '@/components/quote/favorite-button';
import { createPublicClient } from '@/lib/supabase/public';
import { createClient } from '@/lib/supabase/server';
import { isFavorited } from '@/lib/leads/favorites';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { PageView } from '@/components/analytics/page-view';

type Params = { locale: Locale; slug: string };

export async function generateStaticParams() {
  // Business slugs are locale-independent, so one lookup covers every locale.
  const slugs = await getAllBusinessSlugs();
  return locales.flatMap((locale) => slugs.map((slug) => ({ locale, slug })));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<Params>;
}): Promise<Metadata> {
  const { locale, slug } = await params;
  const business = await getBusinessBySlug(slug, locale);
  if (!business) return {};

  return {
    title: business.seoTitle ?? business.name,
    description: business.seoDescription ?? business.shortDescription ?? undefined,
    alternates: localeAlternatesFromSlugs('/business/[slug]', business.allSlugs, locale),
    openGraph: {
      type: 'profile',
      title: business.name,
      description: business.shortDescription ?? undefined,
    },
  };
}

export default async function BusinessPage({ params }: { params: Promise<Params> }) {
  const { locale, slug } = await params;
  setRequestLocale(locale);

  const business = await getBusinessBySlug(slug, locale);
  if (!business) notFound();

  // Gallery and reviews read through the public client so this page stays
  // statically generated. Both are public data — RLS returns exactly what an
  // anonymous visitor may see, which is what a page rendered once and served to
  // everyone needs.
  const publicDb = createPublicClient();

  const [packages, categories, destinations, similar, gallery, reviews, t, tCommon, tNav] =
    await Promise.all([
      getPackagesForBusiness(business.id, locale),
      getCategories(locale),
      getDestinations(locale),
      searchBusinesses(locale, {
        categoryId: business.categoryIds[0],
        perPage: 4,
      }),
      publicDb
        .from('media')
        .select('id, public_url, caption, alt_text')
        .eq('business_id', business.id)
        .eq('kind', 'gallery')
        .order('sort_order'),
      publicDb
        .from('reviews')
        .select(
          'id, rating, title, body, created_at, is_verified_enquiry, owner_reply, owner_replied_at, profiles (full_name)',
        )
        .eq('business_id', business.id)
        .eq('status', 'published')
        .is('deleted_at', null)
        .order('created_at', { ascending: false })
        .limit(50),
      getTranslations('business'),
      getTranslations('common'),
      getTranslations('nav'),
    ]);

  // Only the review FORM needs to know who is looking, and it is a client
  // component, so the cookie read is confined to this one boolean rather than
  // being allowed to make the whole page dynamic.
  const viewer = await createClient()
    .then((c) => c.auth.getUser())
    .then(({ data }) => data.user)
    .catch(() => null);

  // Resolved on the server so the save control does not flicker from unsaved to
  // saved a moment after the page appears.
  const saved = viewer ? await isFavorited({ businessId: business.id }) : false;

  const businessCategories = categories.filter((c) => business.categoryIds.includes(c.id));
  const businessDestinations = destinations.filter((d) =>
    business.destinationIds.includes(d.id),
  );
  const similarBusinesses = similar.items.filter((b) => b.id !== business.id).slice(0, 3);

  const wa = business.whatsapp
    ? whatsappLink(business.whatsapp, t('whatsappMessage'))
    : null;

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'LocalBusiness',
    name: business.name,
    description: business.shortDescription ?? undefined,
    url: absoluteUrl(`/business/${slug}`),
    ...(business.logoUrl ? { logo: business.logoUrl } : {}),
    ...(business.phone ? { telephone: business.phone } : {}),
    ...(business.city
      ? { address: { '@type': 'PostalAddress', addressLocality: business.city, addressCountry: 'TZ' } }
      : {}),
    ...(business.latitude && business.longitude
      ? { geo: { '@type': 'GeoCoordinates', latitude: business.latitude, longitude: business.longitude } }
      : {}),
    // Only emit a rating when one actually exists — an aggregateRating with zero
    // reviews is a structured-data error and can cost the whole rich result.
    ...(business.ratingCount > 0
      ? {
          aggregateRating: {
            '@type': 'AggregateRating',
            ratingValue: business.ratingAvg,
            reviewCount: business.ratingCount,
          },
        }
      : {}),
  };

  return (
    <>
      <PageView locale={locale} businessId={business.id} />

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <section className="relative isolate -mt-[var(--header-h)] flex min-h-[min(46svh,26rem)] items-end pt-[var(--header-h)]">
        {business.coverImageUrl ? (
          <Image
            src={business.coverImageUrl}
            alt=""
            fill
            priority
            sizes="100vw"
            className="-z-10 object-cover"
          />
        ) : (
          <MediaPlaceholder seed={business.slug} className="absolute inset-0 -z-10" />
        )}
        <div className="overlay-scrim absolute inset-0 -z-10" />

        <div className="container-page pb-10 pt-16">
          <div className="flex flex-wrap items-center gap-2">
            {business.isVerified && (
              <Badge variant="verified" className="bg-black/40 text-white backdrop-blur-sm">
                <BadgeCheck className="size-3" aria-hidden />
                {tCommon('verified')}
              </Badge>
            )}
            {business.isDemo && (
              <Badge variant="demo" className="border-white/40 bg-black/30 text-white">
                {tCommon('demoData')}
              </Badge>
            )}
          </div>

          <h1 className="mt-4 text-4xl font-semibold text-white sm:text-5xl">
            {business.name}
          </h1>
          {business.tagline && (
            <p className="mt-3 max-w-2xl text-lg text-white/85">{business.tagline}</p>
          )}

          <div className="mt-5 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-white/80">
            {business.ratingCount > 0 && (
              <span className="flex items-center gap-1.5">
                <Star className="size-4 fill-warning text-warning" aria-hidden />
                <span className="font-medium text-white">{business.ratingAvg.toFixed(1)}</span>
                <span>({business.ratingCount})</span>
              </span>
            )}
            {business.city && (
              <span className="flex items-center gap-1.5">
                <MapPin className="size-4" aria-hidden />
                {business.city}
              </span>
            )}
            {business.avgResponseMinutes !== null && (
              <span className="flex items-center gap-1.5">
                <Timer className="size-4" aria-hidden />
                {(await getTranslations('card'))('respondsIn', {
                  hours: Math.max(1, Math.round(business.avgResponseMinutes / 60)),
                })}
              </span>
            )}
          </div>
        </div>
      </section>

      <div className="container-page pt-8">
        <Breadcrumbs
          locale={locale}
          items={[
            { label: 'Explore Tanzania', href: '/' },
            { label: tNav('directory'), href: '/directory' },
            { label: business.name },
          ]}
        />
      </div>

      <div className="container-page py-section">
        <div className="grid gap-12 lg:grid-cols-[1.6fr_1fr]">
          <div className="space-y-12">
            {business.description && (
              <section>
                <h2 className="text-2xl font-semibold">{t('about')}</h2>
                <p className="mt-5 text-lg leading-relaxed text-muted-foreground">
                  {business.description}
                </p>
              </section>
            )}

            {business.services.length > 0 && (
              <section>
                <h2 className="text-2xl font-semibold">{t('services')}</h2>
                <ul className="mt-5 divide-y rounded-2xl border">
                  {business.services.map((s) => (
                    <li key={s.id} className="flex items-start justify-between gap-4 p-4">
                      <div>
                        <p className="font-medium">{s.name}</p>
                        {s.description && (
                          <p className="mt-1 text-sm text-muted-foreground">{s.description}</p>
                        )}
                      </div>
                      {s.priceFrom !== null && (
                        <p className="shrink-0 text-sm font-medium">
                          {tCommon('from')} {formatPrice(s.priceFrom, s.currency, locale)}
                        </p>
                      )}
                    </li>
                  ))}
                </ul>
              </section>
            )}

            {businessDestinations.length > 0 && (
              <section>
                <h2 className="text-2xl font-semibold">{t('destinationsServed')}</h2>
                <div className="mt-5 flex flex-wrap gap-2.5">
                  {businessDestinations.map((d) => (
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

          {/* Contact rail — the conversion path. Sticky so the quote CTA stays
              reachable however far the visitor scrolls. */}
          <aside className="lg:sticky lg:top-[calc(var(--header-h)+1.5rem)] lg:self-start">
            <div className="rounded-2xl border bg-card p-6">
              <h2 className="text-lg font-semibold">{t('contact')}</h2>

              <div className="mt-5 space-y-3">
                <Button asChild size="lg" className="w-full">
                  <Link
                    href={{ pathname: '/request-quote', query: { business: business.slug } }}
                  >
                    {t('requestQuote')}
                  </Link>
                </Button>

                {/* The save control had been written, wired to a working action,
                    and never mounted on any page — so the whole feature was inert
                    from both ends. It belongs here, on the contact rail, because
                    saving is what someone does when they are comparing rather
                    than ready to enquire. */}
                <FavoriteButton
                  businessId={business.id}
                  initialSaved={saved}
                  showLabel
                  className="w-full"
                />

                {wa && (
                  <Button asChild variant="outline" size="lg" className="w-full">
                    {/* External link, so a plain anchor rather than the locale-aware Link */}
                    <a href={wa} target="_blank" rel="noopener noreferrer">
                      <MessageCircle className="size-4" aria-hidden />
                      {t('whatsapp')}
                    </a>
                  </Button>
                )}

                {business.website && (
                  <Button asChild variant="ghost" size="lg" className="w-full">
                    <a href={business.website} target="_blank" rel="noopener noreferrer nofollow">
                      <Globe className="size-4" aria-hidden />
                      {t('website')}
                    </a>
                  </Button>
                )}
              </div>

              <dl className="mt-6 space-y-3 border-t pt-6 text-sm">
                {business.foundedYear && (
                  <div className="flex items-center justify-between gap-4">
                    <dt className="flex items-center gap-2 text-muted-foreground">
                      <Building2 className="size-3.5" aria-hidden />
                      {t('founded')}
                    </dt>
                    <dd className="font-medium">{business.foundedYear}</dd>
                  </div>
                )}
                {business.teamSize && (
                  <div className="flex items-center justify-between gap-4">
                    <dt className="flex items-center gap-2 text-muted-foreground">
                      <Users className="size-3.5" aria-hidden />
                      {t('teamSize')}
                    </dt>
                    <dd className="font-medium">{t('people', { count: business.teamSize })}</dd>
                  </div>
                )}
                {business.licenseNumber && (
                  <div className="flex items-center justify-between gap-4">
                    <dt className="flex items-center gap-2 text-muted-foreground">
                      <ShieldCheck className="size-3.5" aria-hidden />
                      {t('license')}
                    </dt>
                    <dd className="font-medium">{business.licenseNumber}</dd>
                  </div>
                )}
                {business.responseRate !== null && (
                  <div className="flex items-center justify-between gap-4">
                    <dt className="flex items-center gap-2 text-muted-foreground">
                      <Timer className="size-3.5" aria-hidden />
                      {t('responseRate')}
                    </dt>
                    <dd className="font-medium">{business.responseRate}%</dd>
                  </div>
                )}
              </dl>

              {businessCategories.length > 0 && (
                <div className="mt-6 flex flex-wrap gap-2 border-t pt-6">
                  {businessCategories.map((c) => (
                    <Badge key={c.id} variant="secondary">
                      {c.name}
                    </Badge>
                  ))}
                </div>
              )}
            </div>
          </aside>
        </div>
      </div>

      {(gallery.data?.length ?? 0) > 0 && (
        <Section title={t('photos')}>
          <PublicGallery images={gallery.data ?? []} />
        </Section>
      )}

      {packages.length > 0 && (
        <Section title={t('packages')} muted>
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {packages.map((p) => (
              <PackageCard key={p.id} pkg={p} locale={locale} />
            ))}
          </div>
        </Section>
      )}

      <Section title={t('reviews')} muted>
        <div className="grid gap-8 lg:grid-cols-[1fr_380px]">
          <ReviewList
            reviews={(reviews.data ?? []) as unknown as PublicReview[]}
            locale={locale}
          />
          <ReviewForm businessId={business.id} signedIn={Boolean(viewer)} />
        </div>
      </Section>

      {similarBusinesses.length > 0 && (
        <Section title={t('similar')}>
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {similarBusinesses.map((b) => (
              <BusinessCard key={b.id} business={b} />
            ))}
          </div>
        </Section>
      )}
    </>
  );
}
