import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { setRequestLocale } from 'next-intl/server';
import { ArrowRight, ChevronDown } from 'lucide-react';

import type { Locale } from '@/i18n/routing';
import { Link } from '@/i18n/navigation';
import { absoluteUrl } from '@/lib/seo';
import { LANDING_LOCALE, LANDING_PAGES, getLandingPage } from '@/lib/landing';
import { landingTitle, loadLandingData } from '@/lib/landing/data';
import { Breadcrumbs } from '@/components/layout/breadcrumbs';
import { Section } from '@/components/layout/section';
import { BusinessCard } from '@/components/cards/business-card';
import { PackageCard } from '@/components/cards/package-card';
import { GuideCard } from '@/components/cards/guide-card';
import { Button } from '@/components/ui/button';
import { EndBand } from '@/components/home/sections';

type Params = { locale: Locale; slug: string };

/**
 * One search landing page: hand-written copy for a phrase travellers search,
 * then the operators, tours and guides that match it (lib/landing).
 */
export function generateStaticParams() {
  return LANDING_PAGES.map((p) => ({ locale: LANDING_LOCALE, slug: p.slug }));
}

export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
  const { locale, slug } = await params;
  const page = getLandingPage(slug);
  if (!page || locale !== LANDING_LOCALE) return {};
  const { operators } = await loadLandingData(page, locale);
  const title = landingTitle(page, operators.total);
  const path = `/safari-tours/${page.slug}`;
  return {
    // absolute: these titles are written to length with the brand left off.
    title: { absolute: title },
    description: page.metaDescription,
    alternates: { canonical: path, languages: { en: path, 'x-default': path } },
    openGraph: { type: 'website', title, description: page.metaDescription, url: absoluteUrl(path) },
  };
}

export default async function LandingPageRoute({ params }: { params: Promise<Params> }) {
  const { locale, slug } = await params;
  const page = getLandingPage(slug);
  if (!page || locale !== LANDING_LOCALE) notFound();
  setRequestLocale(locale);

  const { destination, operators, tours, guides } = await loadLandingData(page, locale);
  const related = page.related.map(getLandingPage).filter((p) => p !== undefined);

  const faqLd = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: page.faqs.map((f) => ({
      '@type': 'Question',
      name: f.q,
      acceptedAnswer: { '@type': 'Answer', text: f.a },
    })),
  };

  const quoteHref = destination
    ? { pathname: '/request-quote' as const, query: { destination: destination.slug } }
    : ('/request-quote' as const);

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqLd) }} />

      <div className="container-page pt-6">
        <Breadcrumbs
          locale={locale}
          items={[
            { label: 'Explore Tanzania', href: '/' },
            { label: 'Safari tours', href: '/safari-tours' },
            { label: page.shortLabel },
          ]}
        />
      </div>

      <article className="container-page pb-section pt-6">
        <div className="grid gap-10 lg:grid-cols-12">
          <div className="min-w-0 lg:col-span-8">
            <h1 className="text-balance font-display text-4xl font-semibold sm:text-5xl">{page.heading}</h1>
            {page.intro.map((p, i) => (
              <p key={i} className={i === 0 ? 'mt-5 text-lg leading-relaxed' : 'mt-4 leading-relaxed text-muted-foreground'}>
                {p}
              </p>
            ))}

            <div className="mt-6 flex flex-wrap items-center gap-3">
              <Button asChild size="md">
                <Link href={quoteHref}>
                  Get free quotes
                  <ArrowRight className="size-4" aria-hidden />
                </Link>
              </Button>
              {operators.total > 0 && (
                <span className="text-body-sm text-muted-foreground">
                  {operators.total.toLocaleString('en')} matching operators listed
                </span>
              )}
            </div>

            {page.sections.map((s) => (
              <section key={s.heading} className="mt-10">
                <h2 className="font-display text-2xl font-semibold">{s.heading}</h2>
                {s.paragraphs?.map((p, i) => (
                  <p key={i} className="mt-3 leading-relaxed">
                    {p}
                  </p>
                ))}
                {s.bullets && (
                  <ul className="mt-3 list-disc space-y-1.5 pl-5 leading-relaxed">
                    {s.bullets.map((b) => (
                      <li key={b}>{b}</li>
                    ))}
                  </ul>
                )}
              </section>
            ))}
          </div>

          {page.facts && page.facts.length > 0 && (
            <aside className="lg:col-span-4">
              <dl className="rounded-lg border bg-surface p-5 lg:sticky lg:top-24">
                <p className="font-display text-lg font-semibold">At a glance</p>
                {page.facts.map((f) => (
                  <div key={f.label} className="mt-4 border-t pt-3">
                    <dt className="text-caption font-medium uppercase tracking-wide text-muted-foreground">{f.label}</dt>
                    <dd className="mt-1 text-body-sm">{f.value}</dd>
                  </div>
                ))}
              </dl>
            </aside>
          )}
        </div>
      </article>

      {operators.items.length > 0 && (
        <Section
          title={`Operators for ${page.shortLabel.toLowerCase()}`}
          viewAllHref="/directory"
          viewAllLabel="See the full directory"
          muted
        >
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {operators.items.map((b) => (
              <BusinessCard key={b.id} business={b} />
            ))}
          </div>
        </Section>
      )}

      {tours.items.length > 0 && (
        <Section title="Tours with published prices" viewAllHref="/packages" viewAllLabel="All tours">
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {tours.items.map((pkg) => (
              <PackageCard key={pkg.id} pkg={pkg} locale={locale} />
            ))}
          </div>
        </Section>
      )}

      <Section title="Questions travellers ask">
        <div className="max-w-3xl divide-y rounded-lg border bg-surface">
          {page.faqs.map((f) => (
            <details key={f.q} className="group p-4 [&_summary::-webkit-details-marker]:hidden">
              <summary className="flex cursor-pointer list-none items-start justify-between gap-4 font-semibold">
                <h3 className="text-body">{f.q}</h3>
                <ChevronDown className="mt-0.5 size-5 shrink-0 transition-transform group-open:rotate-180" aria-hidden />
              </summary>
              <p className="mt-2 leading-relaxed text-muted-foreground">{f.a}</p>
            </details>
          ))}
        </div>
      </Section>

      {guides.length > 0 && (
        <Section title="Read before you book" muted>
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {guides.slice(0, 3).map((g) => (
              <GuideCard key={g.id} guide={g} />
            ))}
          </div>
        </Section>
      )}

      {related.length > 0 && (
        <Section title="Related safaris">
          <ul className="flex flex-wrap gap-2">
            {related.map((r) => (
              <li key={r.slug}>
                <Link
                  href={{ pathname: '/safari-tours/[slug]', params: { slug: r.slug } }}
                  className="inline-flex h-10 items-center rounded-pill border bg-surface px-4 text-body-sm font-semibold hover:bg-secondary"
                >
                  {r.shortLabel}
                </Link>
              </li>
            ))}
            <li>
              <Link
                href="/safari-tours"
                className="inline-flex h-10 items-center rounded-pill px-4 text-body-sm font-semibold text-primary hover:underline"
              >
                All safari types →
              </Link>
            </li>
          </ul>
        </Section>
      )}

      <EndBand />
    </>
  );
}
