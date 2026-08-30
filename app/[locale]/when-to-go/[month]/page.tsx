import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { CalendarDays, CloudRain, Droplets, Sun, Users } from 'lucide-react';

import { locales, type Locale } from '@/i18n/routing';
import { Link } from '@/i18n/navigation';
import { getMonthOverview } from '@/lib/queries/taxonomy';
import { getCoveredCountries } from '@/lib/queries/countries';
import {
  MONTH_SLUGS,
  adjacentMonths,
  monthFromSlug,
  monthName,
  slugForMonth,
} from '@/lib/months';
import { Breadcrumbs } from '@/components/layout/breadcrumbs';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

type Params = { locale: Locale; month: string };

/**
 * Where to go in a given month.
 *
 * The site held 552 rows of month-by-month conditions and could only show them
 * to a reader who had already chosen a destination — which is the decision they
 * came here to make. Every competitor with a "when to go" surface gives it a
 * top-level nav item; Yellow Zebra gives it twelve pages.
 *
 * Twelve months across four locales is 48 pages, all generated from data that
 * already exists and is already translated, and each one answers a query
 * ("beste reisezeit tansania märz") that the destination pages cannot rank for.
 */
export async function generateStaticParams() {
  const params: Array<{ locale: string; month: string }> = [];
  for (const locale of locales) {
    for (const slug of MONTH_SLUGS[locale]) params.push({ locale, month: slug });
  }
  return params;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<Params>;
}): Promise<Metadata> {
  const { locale, month: slug } = await params;
  const month = monthFromSlug(slug, locale);
  if (!month) return {};

  const t = await getTranslations({ locale, namespace: 'whenToGo' });
  const name = monthName(month, locale);
  const rows = await getMonthOverview(month, locale);
  const best = rows.filter((r) => r.wildlife !== null).slice(0, 3);

  return {
    title: t('metaTitle', { month: name }),
    description: t('metaDescription', {
      month: name,
      best: best.map((b) => b.name).join(', '),
    }),
    alternates: {
      canonical: `/when-to-go/${slug}`,
      languages: Object.fromEntries(
        locales.map((l) => [l, `/${l}/when-to-go/${slugForMonth(month, l)}`]),
      ),
    },
  };
}

/** A 1-5 rating as five bars. Same visual language as the destination table. */
function Meter({ value, tone, label }: { value: number | null; tone: string; label: string }) {
  if (value === null) return <span className="text-muted-foreground">—</span>;
  return (
    <span className="flex items-center gap-0.5" title={`${label}: ${value}/5`}>
      <span className="sr-only">{`${label}: ${value} / 5`}</span>
      {Array.from({ length: 5 }, (_, i) => (
        <span
          key={i}
          aria-hidden
          className={cn('h-3.5 w-1.5 rounded-full', i < value ? tone : 'bg-border')}
        />
      ))}
    </span>
  );
}

export default async function WhenToGoPage({ params }: { params: Promise<Params> }) {
  const { locale, month: slug } = await params;
  setRequestLocale(locale);

  const month = monthFromSlug(slug, locale);
  if (!month) notFound();

  const [rows, countries, t] = await Promise.all([
    getMonthOverview(month, locale),
    getCoveredCountries(),
    getTranslations('whenToGo'),
  ]);

  if (rows.length === 0) notFound();

  const name = monthName(month, locale);
  const { prev, next } = adjacentMonths(month);

  const rated = rows.filter((r) => r.wildlife !== null);
  const best = rated.slice(0, 3);
  // Good conditions that nobody else has worked out yet — the most useful thing
  // this page can tell someone, and the reason to read past the top three.
  // Excluding what is already named above. Without this the section repeated
  // the top three verbatim and read like a rendering bug rather than a second
  // recommendation.
  const bestIds = new Set(best.map((b) => b.id));
  const quiet = rated
    .filter((r) => !bestIds.has(r.id) && (r.crowd ?? 5) <= 2 && (r.weather ?? 0) >= 4)
    .slice(0, 3);
  const countryName = new Map(countries.map((c) => [c.code, c.name]));

  return (
    <div className="container-page py-10">
      <Breadcrumbs
        locale={locale}
        items={[
          { label: 'Explore Tanzania', href: '/' },
          { label: t('breadcrumb'), href: '/destinations' },
          { label: name },
        ]}
      />

      <header className="mx-auto mt-8 max-w-3xl">
        <p className="flex items-center gap-2 text-sm font-medium uppercase tracking-wide text-muted-foreground">
          <CalendarDays className="size-4" aria-hidden />
          {t('eyebrow')}
        </p>
        <h1 className="mt-3 font-display text-3xl font-semibold sm:text-4xl">
          {t('h1', { month: name })}
        </h1>
        <p className="mt-4 leading-relaxed text-muted-foreground">
          {t('intro', { month: name, count: rows.length })}
        </p>
      </header>

      {/* The answer, before the table. Someone who reads one line should get it. */}
      {best.length > 0 && (
        <section className="mx-auto mt-10 max-w-3xl">
          <h2 className="font-display text-xl font-semibold">{t('bestTitle', { month: name })}</h2>
          <ul className="mt-4 space-y-3">
            {best.map((d) => (
              <li key={d.id} className="rounded-xl border bg-secondary/30 p-4">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <Link
                    href={{ pathname: '/destinations/[slug]', params: { slug: d.slug } }}
                    className="font-medium hover:text-primary"
                  >
                    {d.name}
                  </Link>
                  <span className="text-sm text-muted-foreground">
                    {d.countryCode ? countryName.get(d.countryCode) ?? d.countryCode : ''}
                    {d.isPeak && (
                      <Badge variant="secondary" className="ml-2">
                        {t('peak')}
                      </Badge>
                    )}
                  </span>
                </div>
                {d.highlight && (
                  <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
                    {d.highlight}
                  </p>
                )}
              </li>
            ))}
          </ul>
        </section>
      )}

      {quiet.length > 0 && (
        <section className="mx-auto mt-8 max-w-3xl rounded-xl border p-5">
          <h2 className="font-display text-lg font-semibold">{t('quietTitle')}</h2>
          <p className="mt-1 text-sm text-muted-foreground">{t('quietBody')}</p>
          <ul className="mt-3 flex flex-wrap gap-2">
            {quiet.map((d) => (
              <li key={d.id}>
                <Link
                  href={{ pathname: '/destinations/[slug]', params: { slug: d.slug } }}
                  className="inline-flex rounded-full border px-3 py-1 text-sm hover:border-primary hover:text-primary"
                >
                  {d.name}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="mx-auto mt-12 max-w-5xl">
        <h2 className="font-display text-xl font-semibold">
          {t('tableTitle', { month: name })}
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">{t('tableNote')}</p>

        <div className="mt-5 overflow-x-auto rounded-xl border">
          <table className="w-full text-sm">
            <caption className="sr-only">{t('tableCaption', { month: name })}</caption>
            <thead className="bg-muted/50 text-left">
              <tr>
                <th scope="col" className="p-3 font-medium">{t('colDestination')}</th>
                <th scope="col" className="p-3 font-medium">
                  <span className="flex items-center gap-1.5">
                    <Sun className="size-3.5" aria-hidden />
                    {t('colWildlife')}
                  </span>
                </th>
                <th scope="col" className="p-3 font-medium">
                  <span className="flex items-center gap-1.5">
                    <CloudRain className="size-3.5" aria-hidden />
                    {t('colWeather')}
                  </span>
                </th>
                <th scope="col" className="p-3 font-medium">
                  <span className="flex items-center gap-1.5">
                    <Users className="size-3.5" aria-hidden />
                    {t('colCrowds')}
                  </span>
                </th>
                <th scope="col" className="p-3 font-medium">
                  <span className="flex items-center gap-1.5">
                    <Droplets className="size-3.5" aria-hidden />
                    {t('colRain')}
                  </span>
                </th>
                <th scope="col" className="p-3 font-medium">{t('colTemp')}</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((d) => (
                <tr key={d.id} className="border-t">
                  <th scope="row" className="p-3 text-left font-normal">
                    <Link
                      href={{ pathname: '/destinations/[slug]', params: { slug: d.slug } }}
                      className="font-medium hover:text-primary"
                    >
                      {d.name}
                    </Link>
                    <span className="block text-xs text-muted-foreground">
                      {d.countryCode ? countryName.get(d.countryCode) ?? d.countryCode : ''}
                    </span>
                  </th>
                  <td className="p-3">
                    <Meter value={d.wildlife} tone="bg-success" label={t('colWildlife')} />
                  </td>
                  <td className="p-3">
                    <Meter value={d.weather} tone="bg-accent" label={t('colWeather')} />
                  </td>
                  <td className="p-3">
                    <Meter value={d.crowd} tone="bg-warning" label={t('colCrowds')} />
                  </td>
                  <td className="p-3 tabular-nums text-muted-foreground">
                    {d.rainfallMm === null ? '—' : `${d.rainfallMm} mm`}
                  </td>
                  <td className="p-3 tabular-nums text-muted-foreground">
                    {d.tempMinC === null || d.tempMaxC === null
                      ? '—'
                      : `${d.tempMinC}–${d.tempMaxC} °C`}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <p className="mt-3 text-xs leading-relaxed text-muted-foreground">
          {t('disclaimer')}
        </p>
      </section>

      <nav
        aria-label={t('otherMonths')}
        className="mx-auto mt-12 max-w-5xl border-t pt-6"
      >
        <div className="flex flex-wrap items-center justify-between gap-4">
          <Link
            href={{ pathname: '/when-to-go/[month]', params: { month: slugForMonth(prev, locale) } }}
            className="text-sm font-medium hover:text-primary"
          >
            ← {monthName(prev, locale)}
          </Link>
          <Link
            href={{ pathname: '/when-to-go/[month]', params: { month: slugForMonth(next, locale) } }}
            className="text-sm font-medium hover:text-primary"
          >
            {monthName(next, locale)} →
          </Link>
        </div>

        <ul className="mt-5 flex flex-wrap gap-2">
          {MONTH_SLUGS[locale].map((s, i) => (
            <li key={s}>
              <Link
                href={{ pathname: '/when-to-go/[month]', params: { month: s } }}
                aria-current={i + 1 === month ? 'page' : undefined}
                className={cn(
                  'inline-flex rounded-full border px-3 py-1 text-sm',
                  i + 1 === month
                    ? 'border-primary bg-primary/10 font-medium text-primary'
                    : 'hover:border-primary hover:text-primary',
                )}
              >
                {monthName(i + 1, locale)}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
    </div>
  );
}
