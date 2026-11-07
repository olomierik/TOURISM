import type { Metadata } from 'next';
import { getFormatter, getTranslations, setRequestLocale } from 'next-intl/server';
import { CalendarDays, Inbox, MapPin, Sparkles, Users, Wallet } from 'lucide-react';

import { locales, type Locale, type LocaleParams } from '@/i18n/routing';
import { Link } from '@/i18n/navigation';
import { localeAlternates } from '@/lib/seo';
import { getLeadBoard } from '@/lib/queries/lead-board';
import { PageHero } from '@/components/layout/page-hero';
import { Button } from '@/components/ui/button';

/** Ten minutes, matching the board's own cache. */
export const revalidate = 600;

export async function generateStaticParams() {
  return locales.map((locale) => ({ locale }));
}

export async function generateMetadata({ params }: { params: Promise<LocaleParams> }): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'travelRequests' });
  return {
    title: t('metaTitle'),
    description: t('metaDescription'),
    alternates: localeAlternates('/travel-requests', locale),
    // Kept out of the index while the board is short: a page of three cards
    // is exactly the thin content docs/ADSENSE-CONTENT-AUDIT.md warns about.
    // It is for operators, who arrive from the menu, outreach and the
    // dashboard, not from search. Lift this once it carries real volume.
    robots: { index: false, follow: true },
  };
}

/**
 * Real enquiries, anonymised, for the operators the site sells leads and
 * placement to. See lib/queries/lead-board.ts for what is never shown.
 */
export default async function TravelRequestsPage({ params }: { params: Promise<LocaleParams> }) {
  const { locale } = await params;
  setRequestLocale(locale);

  const [board, t, tInterests, format] = await Promise.all([
    getLeadBoard(locale as Locale),
    getTranslations('travelRequests'),
    getTranslations('interests'),
    getFormatter(),
  ]);

  const number = new Intl.NumberFormat(locale);
  const money = (n: number, currency: string) => {
    try {
      return new Intl.NumberFormat(locale, { style: 'currency', currency, maximumFractionDigits: 0 }).format(n);
    } catch {
      return `${currency} ${number.format(n)}`;
    }
  };

  const steps = [t('step1'), t('step2'), t('step3')];

  return (
    <>
      <PageHero icon={Inbox} eyebrow={t('eyebrow')} title={t('title')} lead={t('lead')} width="medium">
        <div className="flex flex-wrap gap-2">
          <Button asChild>
            <Link href={{ pathname: '/register', query: { as: 'business' } }}>{t('ctaClaim')}</Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/contact">
              <Sparkles className="size-4" aria-hidden />
              {t('ctaFeatured')}
            </Link>
          </Button>
        </div>
      </PageHero>

      <div className="container-page max-w-5xl space-y-8 py-6 sm:py-10">
        <dl className="grid max-w-md grid-cols-2 gap-3">
          <div className="rounded-xl border p-4">
            <dt className="text-xs text-muted-foreground">{t('statRecent')}</dt>
            <dd className="font-display text-2xl font-semibold tabular-nums">{number.format(board.last30Days)}</dd>
          </div>
          <div className="rounded-xl border p-4">
            <dt className="text-xs text-muted-foreground">{t('statAllTime')}</dt>
            <dd className="font-display text-2xl font-semibold tabular-nums">{number.format(board.allTime)}</dd>
          </div>
        </dl>

        {board.items.length === 0 ? (
          <p className="rounded-xl border border-dashed p-6 text-sm text-muted-foreground">{t('empty')}</p>
        ) : (
          <ul className="grid gap-3 sm:grid-cols-2">
            {board.items.map((l) => {
              const facts = [
                l.travelMonth && {
                  Icon: CalendarDays,
                  text: [
                    format.dateTime(new Date(`${l.travelMonth}-15T12:00:00Z`), { month: 'long', year: 'numeric' }),
                    l.nights ? t('nights', { count: l.nights }) : null,
                  ]
                    .filter(Boolean)
                    .join(' · '),
                },
                { Icon: Users, text: t('party', { adults: l.adults, children: l.children }) },
                (l.budgetMin !== null || l.budgetMax !== null) && {
                  Icon: Wallet,
                  text:
                    l.budgetMin !== null && l.budgetMax !== null
                      ? `${money(l.budgetMin, l.budgetCurrency)} – ${money(l.budgetMax, l.budgetCurrency)}`
                      : money((l.budgetMax ?? l.budgetMin)!, l.budgetCurrency),
                },
              ].filter(Boolean) as Array<{ Icon: typeof Users; text: string }>;

              return (
                <li key={l.key} className="flex flex-col gap-2.5 rounded-xl border bg-surface p-4">
                  <div className="flex items-start justify-between gap-3">
                    <p className="flex min-w-0 items-center gap-1.5 font-semibold">
                      <MapPin className="size-4 shrink-0 text-primary" aria-hidden />
                      <span className="truncate">
                        {[l.destinationName ?? t('anywhere'), l.categoryName].filter(Boolean).join(' · ')}
                      </span>
                    </p>
                    <span
                      className={
                        l.quality === 'strong'
                          ? 'shrink-0 rounded-xs bg-highlight px-1.5 py-0.5 text-overline font-semibold uppercase text-highlight-foreground'
                          : 'shrink-0 rounded-xs bg-muted px-1.5 py-0.5 text-overline font-semibold uppercase text-muted-foreground'
                      }
                    >
                      {t(`quality.${l.quality}`)}
                    </span>
                  </div>

                  <ul className="space-y-1 text-sm text-muted-foreground">
                    {facts.map(({ Icon, text }) => (
                      <li key={text} className="flex items-center gap-1.5">
                        <Icon className="size-3.5 shrink-0" aria-hidden />
                        {text}
                      </li>
                    ))}
                  </ul>

                  {l.interests.length > 0 && (
                    <p className="flex flex-wrap gap-1.5">
                      {l.interests.map((i) => (
                        <span key={i} className="rounded-pill border px-2 py-0.5 text-xs">
                          {tInterests(i as Parameters<typeof tInterests>[0])}
                        </span>
                      ))}
                    </p>
                  )}

                  <p className="mt-auto flex flex-wrap justify-between gap-x-3 border-t pt-2 text-xs text-muted-foreground">
                    <span>
                      {l.replied
                        ? t('replied')
                        : l.operators > 0
                          ? t('sentTo', { count: l.operators })
                          : t('waiting')}
                    </span>
                    <span>{format.relativeTime(new Date(l.createdAt))}</span>
                  </p>
                </li>
              );
            })}
          </ul>
        )}

        <section className="rounded-xl border bg-surface-muted p-5 sm:p-6">
          <h2 className="font-display text-xl font-semibold">{t('howTitle')}</h2>
          <ol className="mt-4 grid gap-3 sm:grid-cols-3">
            {steps.map((s, i) => (
              <li key={s} className="flex gap-3 text-sm">
                <span
                  className="flex size-7 shrink-0 items-center justify-center rounded-pill bg-primary text-xs font-semibold text-primary-foreground tabular-nums"
                  aria-hidden
                >
                  {i + 1}
                </span>
                <span className="pt-1">{s}</span>
              </li>
            ))}
          </ol>
          <p className="mt-4 text-xs text-muted-foreground">{t('privacy')}</p>
        </section>
      </div>
    </>
  );
}
