import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { setRequestLocale } from 'next-intl/server';

import type { Locale } from '@/i18n/routing';
import { Link } from '@/i18n/navigation';
import { LANDING_GROUPS, LANDING_LOCALE, LANDING_PAGES } from '@/lib/landing';
import { Breadcrumbs } from '@/components/layout/breadcrumbs';
import { EndBand } from '@/components/home/sections';

type Params = { locale: Locale };

const TITLE = 'Safari Tours in Tanzania & East Africa — Every Kind of Trip';
const DESCRIPTION =
  'Find the right safari: Serengeti, Ngorongoro and Kilimanjaro, budget or luxury, 3 to 10 days, from Arusha or Zanzibar, plus Kenya, Uganda and Rwanda.';

export function generateStaticParams() {
  return [{ locale: LANDING_LOCALE }];
}

export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
  const { locale } = await params;
  if (locale !== LANDING_LOCALE) return {};
  return {
    title: { absolute: TITLE },
    description: DESCRIPTION,
    alternates: { canonical: '/safari-tours', languages: { en: '/safari-tours', 'x-default': '/safari-tours' } },
  };
}

/** The index of every search landing page, grouped the way people plan. */
export default async function SafariToursHub({ params }: { params: Promise<Params> }) {
  const { locale } = await params;
  if (locale !== LANDING_LOCALE) notFound();
  setRequestLocale(locale);

  return (
    <>
      <div className="container-page pt-6">
        <Breadcrumbs locale={locale} items={[{ label: 'Explore Tanzania', href: '/' }, { label: 'Safari tours' }]} />
      </div>
      <div className="container-page pb-section pt-6">
        <h1 className="font-display text-4xl font-semibold sm:text-5xl">Safari tours in Tanzania and East Africa</h1>
        <p className="mt-4 max-w-2xl text-lg leading-relaxed text-muted-foreground">
          Choose the kind of trip you have in mind. Each page explains what to expect, when to go and what it
          costs, and lists the local operators who run it — so you can ask several for a quote and book directly.
        </p>

        <div className="mt-10 grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
          {LANDING_GROUPS.map((g) => {
            const pages = LANDING_PAGES.filter((p) => p.group === g.key);
            if (!pages.length) return null;
            return (
              <section key={g.key}>
                <h2 className="font-display text-xl font-semibold">{g.title}</h2>
                <ul className="mt-3 space-y-2">
                  {pages.map((p) => (
                    <li key={p.slug}>
                      <Link
                        href={{ pathname: '/safari-tours/[slug]', params: { slug: p.slug } }}
                        className="font-medium text-primary underline-offset-4 hover:underline"
                      >
                        {p.heading}
                      </Link>
                    </li>
                  ))}
                </ul>
              </section>
            );
          })}
        </div>
      </div>
      <EndBand />
    </>
  );
}
