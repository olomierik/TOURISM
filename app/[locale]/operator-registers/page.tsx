import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { BadgeCheck, MinusCircle, ShieldAlert } from 'lucide-react';

import { locales, type LocaleParams } from '@/i18n/routing';
import { Link } from '@/i18n/navigation';
import { localeAlternates } from '@/lib/seo';
import { PageHero } from '@/components/layout/page-hero';
import {
  getRegisterIndex,
  PUBLISHED_REGISTERS,
  WITHHELD_REGISTERS,
  type PublishedRegister,
} from '@/lib/queries/operator-registers';

/**
 * An hour. Every view of this page reads all 1,370 published register rows and
 * groups them in application code (getRegisterIndex explains why it cannot be
 * paged in SQL), so an uncached page would repeat that per visitor. The rows
 * themselves only change when an import migration runs, which has happened
 * four times in the project's life — there is nothing here worth re-reading per
 * request, and the filter and page are both in the URL, so each variant caches
 * on its own.
 */
export const revalidate = 3600;

export async function generateStaticParams() {
  return locales.map((locale) => ({ locale }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<LocaleParams>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'operatorRegisters' });

  return {
    title: t('metaTitle'),
    description: t('metaDescription'),
    alternates: localeAlternates('/operator-registers', locale),
  };
}

const first = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);

const isRegister = (v: string | undefined): v is PublishedRegister =>
  Boolean(v) && (PUBLISHED_REGISTERS as string[]).includes(v as string);

/**
 * What the operator registers say — and what we have not checked.
 *
 * §6b of docs/bookings-and-visibility.md argues this is the strongest thing
 * this site can offer at its size: Tanzania requires a TALA licence, the
 * ministry's own operator list broke years ago, and travellers asking where to
 * verify one get no usable answer anywhere.
 *
 * What this page does NOT do is claim to be that missing register. The rows
 * behind it are second-hand — a compilation of trade-association registers,
 * carrying the compiler's check dates, with no per-row source URL — and trade
 * membership is not a government licence in any case. So the page leads with
 * the limits, publishes the count of licences we have checked ourselves even
 * though that count is zero, and then gives the one thing nobody else does:
 * which registers an operator was looked for on and **not** found on.
 *
 * An index that only listed memberships would be advertising. The absences are
 * the information.
 */
export default async function OperatorRegistersPage({
  params,
  searchParams,
}: {
  params: Promise<LocaleParams>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const sp = await searchParams;

  const t = await getTranslations('operatorRegisters');
  const registerParam = first(sp.register);
  const pageParam = Number(first(sp.page) ?? '1');

  const index = await getRegisterIndex({
    page: Number.isFinite(pageParam) ? pageParam : 1,
    register: isRegister(registerParam) ? registerParam : undefined,
  });

  const fmt = (d: string) =>
    new Date(`${d.slice(0, 10)}T00:00:00Z`).toLocaleDateString(locale, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      timeZone: 'UTC',
    });

  const hrefFor = (q: Record<string, string>) => ({
    pathname: '/operator-registers' as const,
    query: q,
  });

  return (
    <div className="pb-16">
      <PageHero eyebrow={t('eyebrow')} title={t('h1')} lead={t('intro')} icon={ShieldAlert} />

      <div className="mx-auto mt-8 max-w-3xl space-y-4 px-4">
        {/* The limits first, not in a footnote. A reader who takes one thing
            from this page should take the right one. */}
        <section className="rounded-xl border border-dashed bg-muted/40 p-5">
          <h2 className="flex items-center gap-2 font-semibold">
            <ShieldAlert className="size-4 shrink-0" aria-hidden />
            {t('limits.title')}
          </h2>
          <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
            <li>{t('limits.secondHand')}</li>
            <li>{t('limits.notALicence')}</li>
            <li>
              {t('limits.ownChecks', {
                checked: index.ownChecks,
                onFile: index.licenceNumbersOnFile,
              })}
            </li>
            <li>{t('limits.staleness')}</li>
            {WITHHELD_REGISTERS.length > 0 && <li>{t('limits.withheld')}</li>}
          </ul>
        </section>

        <section>
          <h2 className="font-display text-xl font-semibold">{t('tallyTitle')}</h2>
          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-sm">
              <caption className="sr-only">{t('tallyCaption')}</caption>
              <thead>
                <tr className="border-b text-left text-muted-foreground">
                  <th scope="col" className="py-2 pr-4 font-medium">{t('col.register')}</th>
                  <th scope="col" className="py-2 pr-4 text-right font-medium">{t('col.listed')}</th>
                  <th scope="col" className="py-2 pr-4 text-right font-medium">{t('col.absent')}</th>
                  <th scope="col" className="py-2 font-medium">{t('col.checked')}</th>
                </tr>
              </thead>
              <tbody>
                {index.tallies.map((x) => (
                  <tr key={x.register} className="border-b last:border-0">
                    <th scope="row" className="py-2 pr-4 text-left font-medium">
                      {t(`register.${x.register}`)}
                    </th>
                    <td className="py-2 pr-4 text-right tabular-nums">{x.listed.toLocaleString(locale)}</td>
                    <td className="py-2 pr-4 text-right tabular-nums text-muted-foreground">
                      {x.absent.toLocaleString(locale)}
                    </td>
                    <td className="py-2 text-muted-foreground">
                      {x.from && x.to
                        ? x.from === x.to
                          ? fmt(x.from)
                          : t('dateRange', { from: fmt(x.from), to: fmt(x.to) })
                        : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <p className="mt-3 text-xs text-muted-foreground">{t('tallyNote')}</p>
        </section>

        <section>
          <h2 className="font-display text-xl font-semibold">{t('howTitle')}</h2>
          <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{t('howBody')}</p>
        </section>
      </div>

      <div className="mx-auto mt-10 max-w-5xl px-4">
        <div className="flex flex-wrap items-center gap-2">
          <Link
            href={hrefFor({})}
            className={
              registerParam
                ? 'rounded-full border px-3 py-1 text-sm hover:bg-muted'
                : 'rounded-full border bg-foreground px-3 py-1 text-sm text-background'
            }
          >
            {t('filter.all')}
          </Link>
          {PUBLISHED_REGISTERS.map((r) => (
            <Link
              key={r}
              href={hrefFor({ register: r })}
              className={
                registerParam === r
                  ? 'rounded-full border bg-foreground px-3 py-1 text-sm text-background'
                  : 'rounded-full border px-3 py-1 text-sm hover:bg-muted'
              }
            >
              {t(`register.${r}`)}
            </Link>
          ))}
        </div>

        <p className="mt-4 text-sm text-muted-foreground">
          {t('resultCount', { total: index.total, page: index.page, pages: index.pageCount })}
        </p>

        <ul className="mt-4 divide-y rounded-xl border bg-card">
          {index.rows.map((row) => (
            <li key={row.slug} className="px-4 py-3">
              <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
                <Link
                  href={{ pathname: '/business/[slug]', params: { slug: row.slug } }}
                  className="font-medium hover:text-primary"
                >
                  {row.name}
                </Link>
                <span className="text-xs text-muted-foreground">
                  {t('checkedOn', { date: fmt(row.checkedOn) })}
                </span>
              </div>

              <div className="mt-1.5 flex flex-wrap gap-x-4 gap-y-1 text-sm">
                {row.listedOn.length > 0 && (
                  <span className="inline-flex items-center gap-1.5">
                    <BadgeCheck className="size-3.5 shrink-0 text-success" aria-hidden />
                    {t('listedOn', {
                      registers: row.listedOn.map((r) => t(`register.${r}`)).join(', '),
                    })}
                  </span>
                )}
                {row.absentFrom.length > 0 && (
                  <span className="inline-flex items-center gap-1.5 text-muted-foreground">
                    <MinusCircle className="size-3.5 shrink-0" aria-hidden />
                    {t('absentFrom', {
                      registers: row.absentFrom.map((r) => t(`register.${r}`)).join(', '),
                    })}
                  </span>
                )}
              </div>
            </li>
          ))}
        </ul>

        {index.rows.length === 0 && (
          <p className="mt-4 text-sm text-muted-foreground">{t('empty')}</p>
        )}

        {index.pageCount > 1 && (
          <nav className="mt-6 flex items-center justify-between" aria-label={t('pagination')}>
            {index.page > 1 ? (
              <Link
                href={hrefFor({
                  ...(registerParam ? { register: registerParam } : {}),
                  page: String(index.page - 1),
                })}
                className="rounded-lg border px-3 py-1.5 text-sm hover:bg-muted"
              >
                {t('prev')}
              </Link>
            ) : (
              <span />
            )}
            {index.page < index.pageCount ? (
              <Link
                href={hrefFor({
                  ...(registerParam ? { register: registerParam } : {}),
                  page: String(index.page + 1),
                })}
                className="rounded-lg border px-3 py-1.5 text-sm hover:bg-muted"
              >
                {t('next')}
              </Link>
            ) : (
              <span />
            )}
          </nav>
        )}
      </div>
    </div>
  );
}
