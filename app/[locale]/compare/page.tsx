import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { BadgeCheck, Scale, Star } from 'lucide-react';

import type { LocaleParams } from '@/i18n/routing';
import { Link } from '@/i18n/navigation';
import { localeAlternates } from '@/lib/seo';
import { getBusinessCardsByIds } from '@/lib/queries/businesses';
import { getComparableBySlugs } from '@/lib/queries/compare';
import { Button } from '@/components/ui/button';
import { CompareRemove } from '@/components/compare/compare-remove';

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export async function generateMetadata({
  params,
}: {
  params: Promise<LocaleParams>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'compare' });

  return {
    title: t('metaTitle'),
    description: t('metaDescription'),
    alternates: localeAlternates('/compare', locale),
    // The content is whatever the visitor put in the URL. Nothing here is worth
    // indexing, and an indexed empty comparison is thin content.
    robots: { index: false, follow: true },
  };
}

/**
 * Two or three operators, side by side.
 *
 * The point is the rows that are usually spread across three tabs: day rate,
 * response time, whether anyone verified the listing, how many destinations
 * they actually cover. A traveller choosing between shortlisted companies is
 * comparing those, and doing it by flipping between browser tabs is where the
 * comparison stops happening.
 *
 * The comparison lives in the URL — ?ops=slug,slug — so it is shareable, which
 * matters because this is usually a decision two people make together.
 *
 * Every cell says where its number came from, and an empty cell says "not
 * published" rather than showing a dash that reads like a zero. On a page whose
 * whole job is putting numbers next to each other, a blank that looks like data
 * is the one thing that would make it worse than the tabs.
 */
export default async function ComparePage({
  params,
  searchParams,
}: {
  params: Promise<LocaleParams>;
  searchParams: SearchParams;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const sp = await searchParams;
  const raw = sp.ops;
  const slugs = (Array.isArray(raw) ? raw[0] : raw ?? '')
    .split(',')
    .map((s) => s.trim())
    .filter((s) => /^[a-z0-9-]{1,120}$/.test(s))
    .slice(0, 3);

  const t = await getTranslations({ locale, namespace: 'compare' });

  const rows = slugs.length ? await getComparableBySlugs(slugs) : [];
  const cards = rows.length ? await getBusinessCardsByIds(rows.map((r) => r.id), locale) : [];
  const cardById = new Map(cards.map((c) => [c.id, c]));

  const money = (low: number | null, high: number | null, currency: string) => {
    if (low === null && high === null) return null;
    const fmt = new Intl.NumberFormat(locale, {
      style: 'currency',
      currency,
      maximumFractionDigits: 0,
    });
    if (low !== null && high !== null && low !== high) {
      return `${fmt.format(low)} – ${fmt.format(high)}`;
    }
    return fmt.format((low ?? high) as number);
  };

  const fields = [
    {
      key: 'rate',
      label: t('rowRate'),
      note: t('rowRateNote'),
      value: (r: (typeof rows)[number]) =>
        money(r.dayRateLow, r.dayRateHigh, r.dayRateCurrency),
    },
    {
      key: 'rating',
      label: t('rowRating'),
      note: t('rowRatingNote'),
      value: (r: (typeof rows)[number]) =>
        r.reviewCount > 0 && r.ratingAvg !== null
          ? t('ratingValue', { rating: r.ratingAvg.toFixed(1), count: r.reviewCount })
          : null,
    },
    {
      key: 'response',
      label: t('rowResponse'),
      note: t('rowResponseNote'),
      value: (r: (typeof rows)[number]) =>
        r.avgResponseMinutes === null
          ? null
          : r.avgResponseMinutes < 120
            ? t('responseMinutes', { count: r.avgResponseMinutes })
            : t('responseHours', { count: Math.round(r.avgResponseMinutes / 60) }),
    },
    {
      key: 'destinations',
      label: t('rowDestinations'),
      note: t('rowDestinationsNote'),
      value: (r: (typeof rows)[number]) =>
        r.destinationCount > 0 ? t('destinationsValue', { count: r.destinationCount }) : null,
    },
    {
      key: 'packages',
      label: t('rowPackages'),
      note: t('rowPackagesNote'),
      value: (r: (typeof rows)[number]) =>
        r.packageCount > 0 ? t('packagesValue', { count: r.packageCount }) : null,
    },
    {
      key: 'founded',
      label: t('rowFounded'),
      note: t('rowFoundedNote'),
      value: (r: (typeof rows)[number]) => (r.foundedYear ? String(r.foundedYear) : null),
    },
  ];

  return (
    <div className="container-page py-section">
      <header className="mx-auto max-w-2xl">
        <h1 className="flex items-center gap-2 font-display text-3xl font-semibold sm:text-4xl">
          <Scale className="size-7 text-primary" aria-hidden />
          {t('h1')}
        </h1>
        <p className="mt-4 leading-relaxed text-muted-foreground">{t('lede')}</p>
      </header>

      {rows.length === 0 ? (
        <div className="mx-auto mt-10 max-w-2xl rounded-2xl border border-dashed p-8 text-center">
          <p className="font-medium">{t('emptyTitle')}</p>
          <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-muted-foreground">
            {t('emptyBody')}
          </p>
          <Button asChild className="mt-6">
            <Link href="/directory">{t('emptyCta')}</Link>
          </Button>
        </div>
      ) : (
        <div className="mt-10 overflow-x-auto">
          <table className="w-full min-w-[42rem] border-separate border-spacing-0">
            <caption className="sr-only">{t('caption')}</caption>
            <thead>
              <tr>
                <th scope="col" className="w-44 border-b p-3 text-left align-bottom">
                  <span className="sr-only">{t('rowLabel')}</span>
                </th>
                {rows.map((r) => {
                  const card = cardById.get(r.id);
                  return (
                    <th key={r.id} scope="col" className="border-b p-3 text-left align-bottom">
                      <Link
                        href={{ pathname: '/business/[slug]', params: { slug: r.slug } }}
                        className="font-display text-base font-semibold hover:text-primary"
                      >
                        {r.name}
                      </Link>
                      <span className="mt-1 flex flex-wrap items-center gap-2">
                        {card?.isVerified && (
                          <span className="flex items-center gap-1 text-xs text-primary">
                            <BadgeCheck className="size-3.5" aria-hidden />
                            {t('verified')}
                          </span>
                        )}
                        <CompareRemove slug={r.slug} label={t('remove', { name: r.name })} />
                      </span>
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody>
              {fields.map((field) => (
                <tr key={field.key} className="align-top">
                  <th scope="row" className="border-b p-3 text-left">
                    <span className="text-sm font-medium">{field.label}</span>
                    <span className="mt-0.5 block text-xs font-normal leading-snug text-muted-foreground">
                      {field.note}
                    </span>
                  </th>
                  {rows.map((r) => {
                    const value = field.value(r);
                    return (
                      <td key={r.id} className="border-b p-3 text-sm tabular-nums">
                        {value ?? (
                          // Never a dash. On a table of numbers a dash reads as
                          // zero, and "this operator has not published a rate"
                          // is different from "this operator is free".
                          <span className="text-xs text-muted-foreground">
                            {t('notPublished')}
                          </span>
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
              <tr>
                <th scope="row" className="p-3 text-left">
                  <span className="sr-only">{t('actions')}</span>
                </th>
                {rows.map((r) => (
                  <td key={r.id} className="p-3">
                    <Button asChild size="sm" className="w-full">
                      <Link
                        href={{
                          pathname: '/request-quote',
                          query: { business: r.slug },
                        }}
                      >
                        {t('getQuote')}
                      </Link>
                    </Button>
                  </td>
                ))}
              </tr>
            </tbody>
          </table>

          <p className="mt-6 max-w-2xl text-xs leading-relaxed text-muted-foreground">
            {t('disclaimer')}
          </p>

          {rows.length < 3 && (
            <p className="mt-3 text-sm">
              <Link href="/directory" className="font-medium text-primary hover:underline">
                {t('addAnother')}
              </Link>
            </p>
          )}

          {rows.length > 0 && (
            <div className="mt-8 flex items-center gap-2 text-sm text-muted-foreground">
              <Star className="size-4" aria-hidden />
              {t('shareHint')}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
