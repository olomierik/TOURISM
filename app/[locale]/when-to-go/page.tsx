import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { CalendarDays } from 'lucide-react';

import { locales, type Locale } from '@/i18n/routing';
import { Link } from '@/i18n/navigation';
import { getMonthOverview } from '@/lib/queries/taxonomy';
import { MONTH_SLUGS, monthName } from '@/lib/months';
import { Breadcrumbs } from '@/components/layout/breadcrumbs';

type Params = { locale: Locale };

/**
 * The hub for the twelve month pages.
 *
 * Exists because the nav item needs somewhere to land, and because a reader who
 * has not yet fixed their dates needs to compare months rather than pick one.
 * Each card carries that month's two strongest destinations, so the page answers
 * "which month" at a glance instead of being a list of twelve links.
 */
export async function generateStaticParams() {
  return locales.map((locale) => ({ locale }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<Params>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'whenToGo' });
  return {
    title: t('hubMetaTitle'),
    description: t('hubMetaDescription'),
    alternates: {
      canonical: '/when-to-go',
      languages: Object.fromEntries(locales.map((l) => [l, `/${l}/when-to-go`])),
    },
  };
}

export default async function WhenToGoHub({ params }: { params: Promise<Params> }) {
  const { locale } = await params;
  setRequestLocale(locale);

  const t = await getTranslations('whenToGo');

  // Twelve queries, all cached and all reading the same 552 rows the destination
  // pages already read. Cheap enough to give every month a real preview rather
  // than a bare link.
  const months = await Promise.all(
    Array.from({ length: 12 }, async (_, i) => {
      const rows = await getMonthOverview(i + 1, locale);
      return {
        month: i + 1,
        slug: MONTH_SLUGS[locale][i],
        best: rows.filter((r) => r.wildlife !== null).slice(0, 2),
      };
    }),
  );

  return (
    <div className="container-page py-10">
      <Breadcrumbs
        locale={locale}
        items={[{ label: 'Explore Tanzania', href: '/' }, { label: t('breadcrumb') }]}
      />

      <header className="mx-auto mt-8 max-w-3xl">
        <p className="flex items-center gap-2 text-sm font-medium uppercase tracking-wide text-muted-foreground">
          <CalendarDays className="size-4" aria-hidden />
          {t('eyebrow')}
        </p>
        <h1 className="mt-3 font-display text-3xl font-semibold sm:text-4xl">{t('hubH1')}</h1>
        <p className="mt-4 leading-relaxed text-muted-foreground">{t('hubIntro')}</p>
      </header>

      <ul className="mx-auto mt-10 grid max-w-5xl gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {months.map((m) => (
          <li key={m.slug}>
            <Link
              href={{ pathname: '/when-to-go/[month]', params: { month: m.slug } }}
              className="flex h-full flex-col rounded-xl border p-5 transition-colors hover:border-primary"
            >
              <span className="font-display text-lg font-semibold">
                {monthName(m.month, locale)}
              </span>
              {m.best.length > 0 && (
                <span className="mt-2 text-sm leading-relaxed text-muted-foreground">
                  {t('hubBest')}{' '}
                  <span className="text-foreground">
                    {m.best.map((b) => b.name).join(' · ')}
                  </span>
                </span>
              )}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
