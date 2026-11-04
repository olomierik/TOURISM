import type { Metadata } from 'next';
import Image from 'next/image';
import { notFound } from 'next/navigation';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import {
  ArrowLeft,
  Binoculars,
  Crown,
  Leaf,
  MapPin,
  Ruler,
  ShieldAlert,
  Trees,
  Volume2,
} from 'lucide-react';

import type { Locale } from '@/i18n/routing';
import { Link } from '@/i18n/navigation';
import { absoluteUrl, localeAlternates, snippet } from '@/lib/seo';
import { getPathname } from '@/i18n/navigation';
import { SPECIES, getSpecies, toCard } from '@/lib/wildlife/species';
import { placesFor } from '@/lib/wildlife/places';
import { getMySightings } from '@/lib/wildlife/sightings';
import { Breadcrumbs } from '@/components/layout/breadcrumbs';
import { Button } from '@/components/ui/button';
import { IucnBadge } from '@/components/wildlife/iucn-badge';
import { SpeciesCard } from '@/components/wildlife/species-card';
import { SightingForm } from '@/components/wildlife/sighting-form';

type Params = { locale: Locale; slug: string };

export async function generateMetadata({
  params,
}: {
  params: Promise<Params>;
}): Promise<Metadata> {
  const { locale, slug } = await params;
  const s = getSpecies(slug);
  if (!s) return { title: 'Not found', robots: { index: false } };
  const t = await getTranslations({ locale, namespace: 'wildlife' });
  const title = `${s.name} (${s.scientific}) — ${t('eyebrow')}`;
  const description = snippet(s.summary);
  return {
    title,
    description,
    alternates: localeAlternates({ pathname: '/wildlife/[slug]', params: { slug } }, locale),
    openGraph: {
      title,
      description,
      type: 'article',
      images: s.image ? [{ url: s.image.url, width: s.image.width, height: s.image.height }] : undefined,
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: s.image ? [s.image.url] : undefined,
    },
  };
}

export default async function SpeciesPage({ params }: { params: Promise<Params> }) {
  const { locale, slug } = await params;
  setRequestLocale(locale);

  const s = getSpecies(slug);
  if (!s) notFound();

  const [t, tNav, mine] = await Promise.all([
    getTranslations('wildlife'),
    getTranslations('nav'),
    getMySightings(),
  ]);

  const mineHere = mine.sightings.filter((x) => x.species_slug === s.slug);
  const seenSlugs = new Set(mine.sightings.map((x) => x.species_slug));
  const related = SPECIES.filter((x) => x.group === s.group && x.slug !== s.slug)
    .sort((a, b) => Number(b.bigFive) - Number(a.bigFive) || a.name.localeCompare(b.name))
    .slice(0, 4);

  const places = placesFor(s);

  const facts = [
    { icon: Ruler, label: t('profile.size'), value: s.size },
    { icon: Leaf, label: t('profile.diet'), value: t(`diet.${s.diet}`) },
    { icon: Trees, label: t('profile.habitat'), value: s.habitat },
    { icon: MapPin, label: t('profile.where'), value: s.where },
    { icon: Binoculars, label: t('profile.chance'), value: t(`rarity.${s.rarity}`) },
  ];

  // Structured data: the page is about one animal (a Taxon), and its photo
  // carries the Commons author and licence, which is what Google Images needs
  // to show the "Licensable" credit instead of guessing.
  const pageUrl = absoluteUrl(
    getPathname({ href: { pathname: '/wildlife/[slug]', params: { slug: s.slug } }, locale }),
  );
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'WebPage',
    '@id': pageUrl,
    url: pageUrl,
    name: `${s.name} (${s.scientific})`,
    description: snippet(s.summary),
    inLanguage: locale,
    isPartOf: { '@id': absoluteUrl('/#website') },
    about: {
      '@type': 'Taxon',
      name: s.name,
      alternateName: s.scientific,
      ...(s.image ? { image: s.image.url } : {}),
    },
    ...(s.image
      ? {
          primaryImageOfPage: {
            '@type': 'ImageObject',
            contentUrl: s.image.url,
            width: s.image.width,
            height: s.image.height,
            caption: s.name,
            creator: { '@type': 'Person', name: s.image.author },
            creditText: s.image.author,
            ...(s.image.licenseUrl ? { license: s.image.licenseUrl } : {}),
            acquireLicensePage: s.image.page,
          },
        }
      : {}),
  };

  return (
    <article>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, '\\u003c') }}
      />
      {/* Photograph with title */}
      <header className="relative isolate overflow-hidden bg-night">
        {s.image && (
          <Image
            src={s.image.url}
            alt={s.name}
            fill
            priority
            sizes="100vw"
            quality={70}
            unoptimized
            className="-z-10 object-cover"
          />
        )}
        <div
          aria-hidden
          className="absolute inset-0 -z-10 bg-gradient-to-t from-night via-night/55 to-night/10"
        />
        <div className="container-page flex min-h-[26rem] flex-col justify-end pb-10 pt-24 sm:min-h-[32rem] sm:pb-14">
          <div className="[&_a]:text-night-text/80 [&_li]:text-night-text/80 [&_span]:text-night-text/80">
            <Breadcrumbs
              locale={locale}
              items={[
                { label: 'Explore Tanzania', href: '/' },
                { label: tNav('wildlife'), href: '/wildlife' },
                { label: s.name },
              ]}
            />
          </div>
          <div className="mt-4 flex flex-wrap items-center gap-2">
            <span className="rounded-pill bg-night-text/15 px-3 py-1 text-overline font-semibold uppercase tracking-wider text-night-text backdrop-blur">
              {t(`groupOne.${s.group}`)}
            </span>
            {s.bigFive && (
              <span className="inline-flex items-center gap-1 rounded-pill bg-gold px-3 py-1 text-overline font-semibold uppercase tracking-wider text-background">
                <Crown className="size-3.5" aria-hidden />
                {t('bigFive')}
              </span>
            )}
          </div>
          <h1 className="mt-3 font-display text-[clamp(2.5rem,6vw,4.5rem)] font-semibold leading-[1] tracking-[-0.015em] text-night-text">
            {s.name}
          </h1>
          <p className="mt-2 text-body-lg italic text-night-text/80">{s.scientific}</p>
        </div>
      </header>
      {s.image && (
        <p className="container-page pt-2 text-caption text-muted-foreground">
          <a href={s.image.page} target="_blank" rel="noopener" className="hover:underline">
            {t('profile.photoCredit', { author: s.image.author, license: s.image.license })}
          </a>
        </p>
      )}

      <div className="container-page grid gap-10 py-10 lg:grid-cols-[minmax(0,1fr)_24rem] lg:gap-14 lg:py-14">
        <div className="min-w-0">
          <Link
            href="/wildlife"
            className="inline-flex items-center gap-1.5 text-body-sm font-semibold text-primary hover:underline"
          >
            <ArrowLeft className="size-4" aria-hidden />
            {t('profile.back')}
          </Link>

          <p className="mt-5 max-w-prose text-body-article text-foreground">{s.summary}</p>

          <div className="mt-6 flex items-center gap-3 rounded-lg border-l-4 border-gold bg-gold/10 px-4 py-3">
            <Binoculars className="size-5 shrink-0 text-gold" aria-hidden />
            <p className="text-body">
              <span className="font-semibold">{t('profile.tip')}: </span>
              {s.tip}
            </p>
          </div>

          <h2 className="mt-10 font-display text-heading-lg font-semibold">{t('profile.facts')}</h2>
          <dl className="mt-4 grid gap-px overflow-hidden rounded-lg border bg-border sm:grid-cols-2">
            {facts.map((f) => (
              <div key={f.label} className="flex gap-3 bg-surface p-4">
                <f.icon className="mt-0.5 size-5 shrink-0 text-gold" aria-hidden />
                <div>
                  <dt className="text-overline font-semibold uppercase tracking-wider text-muted-foreground">
                    {f.label}
                  </dt>
                  <dd className="mt-1 text-body text-foreground">{f.value}</dd>
                </div>
              </div>
            ))}
            <div className="flex gap-3 bg-surface p-4">
              <ShieldAlert className="mt-0.5 size-5 shrink-0 text-gold" aria-hidden />
              <div>
                <dt className="text-overline font-semibold uppercase tracking-wider text-muted-foreground">
                  {t('profile.status')}
                </dt>
                <dd className="mt-1.5">
                  <IucnBadge code={s.iucn} />
                </dd>
              </div>
            </div>
          </dl>

          {/*
            Where to go, as somewhere you can go.

            The facts list above already prints the parks as prose. That
            answered the question and stopped: a reader who had just decided
            they wanted to see this animal had to go back to the search box,
            and the destination pages that list operators never heard about it.
            These are the same places, read out of the same sentence, as links.

            Places the directory has no page for are printed plainly rather
            than linked — see PLACES_WITHOUT_PAGES in lib/wildlife/places.ts.
          */}
          {places.length > 0 && (
            <>
              <h2 className="mt-10 flex items-center gap-2 font-display text-heading-lg font-semibold">
                <MapPin className="size-5 text-gold" aria-hidden />
                {t('profile.whereToSee')}
              </h2>
              <p className="mt-2 max-w-prose text-body text-muted-foreground">
                {t('profile.whereToSeeIntro')}
              </p>
              <ul className="mt-4 flex flex-wrap gap-2">
                {places.map((p) =>
                  p.slug ? (
                    <li key={p.name}>
                      <Link
                        href={{ pathname: '/destinations/[slug]', params: { slug: p.slug } }}
                        className="inline-flex items-center gap-2 rounded-pill border bg-surface px-3.5 py-2 text-body-sm font-medium transition-colors hover:border-gold hover:bg-gold/10"
                      >
                        {p.name}
                        <span className="text-overline font-semibold uppercase tracking-wider text-muted-foreground">
                          {p.country}
                        </span>
                      </Link>
                    </li>
                  ) : (
                    <li
                      key={p.name}
                      className="inline-flex items-center gap-2 rounded-pill border border-dashed bg-surface-muted px-3.5 py-2 text-body-sm text-muted-foreground"
                    >
                      {p.name}
                      <span className="text-overline font-semibold uppercase tracking-wider">
                        {p.country}
                      </span>
                    </li>
                  ),
                )}
              </ul>
            </>
          )}

          <h2 className="mt-10 flex items-center gap-2 font-display text-heading-lg font-semibold">
            <Volume2 className="size-5 text-gold" aria-hidden />
            {t('profile.listen')}
          </h2>
          {s.call ? (
            <div className="mt-4 rounded-lg border bg-surface p-4">
              <audio controls preload="none" src={s.call.url} className="w-full">
                <a href={s.call.url}>{s.name}</a>
              </audio>
              <p className="mt-2 text-caption text-muted-foreground">
                <a href={s.call.page} target="_blank" rel="noopener" className="hover:underline">
                  {t('profile.soundCredit', { author: s.call.author, license: s.call.license })}
                </a>
              </p>
            </div>
          ) : (
            <p className="mt-3 text-body text-muted-foreground">{t('profile.noCall')}</p>
          )}

          <div className="mt-10 flex flex-col gap-4 rounded-xl bg-surface-muted p-6 sm:flex-row sm:items-center sm:justify-between">
            <p className="font-display text-heading-sm font-semibold">{t('profile.planTrip')}</p>
            <Button asChild className="shrink-0">
              <Link href="/request-quote">{t('profile.getQuotes')}</Link>
            </Button>
          </div>
        </div>

        {/* Diary side */}
        <aside className="lg:sticky lg:top-24 lg:self-start">
          <div className="card-surface p-5 sm:p-6">
            <h2 className="font-display text-heading-md font-semibold">{t('form.title')}</h2>
            <p className="mt-1 text-body-sm text-muted-foreground">
              {mine.user
                ? mineHere.length > 0
                  ? t('profile.seenTimes', { count: mineHere.length })
                  : t('profile.notSeen')
                : t('mySafari.signedOutBody')}
            </p>
            <div className="mt-5">
              {mine.user ? (
                <SightingForm species={{ slug: s.slug, name: s.name }} />
              ) : (
                <Button asChild className="w-full">
                  <Link
                    href={{
                      pathname: '/login',
                      query: { next: `/wildlife/${s.slug}` },
                    }}
                  >
                    {t('form.signInToLog')}
                  </Link>
                </Button>
              )}
            </div>
          </div>
        </aside>
      </div>

      {related.length > 0 && (
        <section className="border-t bg-surface-muted py-12">
          <div className="container-page">
            <h2 className="font-display text-heading-lg font-semibold">
              {t('profile.related', { group: t(`groups.${s.group}`).toLowerCase() })}
            </h2>
            <ul className="mt-6 grid grid-cols-2 gap-3 sm:gap-5 md:grid-cols-4">
              {related.map((r) => (
                <li key={r.slug}>
                  <SpeciesCard species={toCard(r)} seen={seenSlugs.has(r.slug)} />
                </li>
              ))}
            </ul>
          </div>
        </section>
      )}
    </article>
  );
}
