import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';

import { localeMeta, type Locale } from '@/i18n/routing';
import { getPlatformMetrics, type MetricsWindow } from '@/lib/queries/metrics';

type Params = { locale: Locale };
type Search = { window?: string };

export async function generateMetadata({
  params,
}: {
  params: Promise<Params>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'admin.metricsPage' });
  return { title: t('title'), robots: { index: false, follow: false } };
}

function Tile({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <div className="rounded-xl border bg-card p-4">
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className="mt-1.5 font-display text-2xl font-semibold tabular-nums">{value}</p>
      {hint && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}

/** A proportional bar. No chart library for six numbers. */
function Bar({ value, max, label, right }: { value: number; max: number; label: string; right: string }) {
  const pct = max > 0 ? Math.round((value / max) * 100) : 0;
  return (
    <div className="space-y-1">
      <div className="flex items-baseline justify-between gap-3 text-sm">
        <span className="font-medium">{label}</span>
        <span className="tabular-nums text-muted-foreground">{right}</span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-border">
        <div className="h-full rounded-full bg-primary" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

/**
 * The investor view.
 *
 * One page that answers "is the flywheel turning": how much supply, how much
 * traffic that supply earns, how many enquiries that traffic produces, and how
 * many operators pay for those enquiries.
 *
 * The language-market table is the centrepiece and the reason the page exists.
 * The entire strategy is a bet that German, French and Italian search for East
 * Africa is thin enough to win, and views-per-page is where that shows up —
 * German has more than twice English's page count, so raw totals would flatter
 * it and prove nothing.
 */
export default async function AdminMetricsPage({
  params,
  searchParams,
}: {
  params: Promise<Params>;
  searchParams: Promise<Search>;
}) {
  const { locale } = await params;
  const { window } = await searchParams;
  setRequestLocale(locale);

  const windowDays: MetricsWindow = window === '90' ? 90 : 30;
  const m = await getPlatformMetrics(windowDays);
  const t = await getTranslations('admin.metricsPage');

  const nf = new Intl.NumberFormat(locale);
  const pct = (v: number | null) => (v === null ? '—' : `${v.toFixed(1)}%`);

  const maxLocaleViews = Math.max(1, ...m.demand.byLocale.map((l) => l.views));

  return (
    <div className="space-y-10">
      <div>
        <h1 className="font-display text-2xl font-semibold">{t('title')}</h1>
        <p className="mt-2 max-w-2xl text-muted-foreground">{t('subtitle')}</p>
        <p className="mt-3 text-sm text-muted-foreground">
          {t('windowNote', { days: m.windowDays })}
        </p>
      </div>

      {/* Supply */}
      <section className="space-y-4">
        <h2 className="font-display text-lg font-semibold">{t('supply')}</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Tile label={t('listings')} value={nf.format(m.supply.total)} />
          <Tile
            label={t('claimed')}
            value={nf.format(m.supply.claimed)}
            hint={t('unclaimedHint', { count: m.supply.unclaimed })}
          />
          <Tile label={t('pendingClaims')} value={nf.format(m.supply.pendingClaims)} />
          <Tile
            label={t('countries')}
            value={nf.format(m.supply.byCountry.length)}
            hint={m.supply.byCountry.map((c) => `${c.code} ${c.count}`).join(' · ') || undefined}
          />
        </div>
      </section>

      {/* Demand — the wedge */}
      <section className="space-y-4">
        <h2 className="font-display text-lg font-semibold">{t('demand')}</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Tile label={t('views')} value={nf.format(m.demand.views)} />
          <Tile label={t('visitors')} value={nf.format(m.demand.visitors)} />
          <Tile label={t('leads')} value={nf.format(m.conversion.leads)} />
          <Tile
            label={t('leadsPerHundred')}
            value={m.conversion.leadsPerHundredViews === null
              ? '—'
              : m.conversion.leadsPerHundredViews.toFixed(2)}
          />
        </div>

        <div className="rounded-xl border bg-card p-5">
          <h3 className="font-medium">{t('byLanguage')}</h3>
          <p className="mt-1 text-sm text-muted-foreground">{t('byLanguageHint')}</p>

          <div className="mt-5 space-y-4">
            {m.demand.byLocale.map((l) => (
              <Bar
                key={l.locale}
                label={localeMeta[l.locale].label}
                value={l.views}
                max={maxLocaleViews}
                right={
                  l.pages > 0
                    ? t('viewsPerPage', {
                        views: nf.format(l.views),
                        perPage: (l.views / l.pages).toFixed(1),
                      })
                    : nf.format(l.views)
                }
              />
            ))}
          </div>

          {m.demand.views === 0 && (
            <p className="mt-5 rounded-lg bg-secondary/50 p-3 text-sm text-muted-foreground">
              {t('noTrafficYet')}
            </p>
          )}
        </div>

        {m.demand.topReferrers.length > 0 && (
          <div className="grid gap-4 md:grid-cols-2">
            <div className="rounded-xl border bg-card p-5">
              <h3 className="font-medium">{t('referrers')}</h3>
              <ul className="mt-3 space-y-1.5 text-sm">
                {m.demand.topReferrers.map((r) => (
                  <li key={r.host} className="flex justify-between gap-3">
                    <span className="truncate">{r.host}</span>
                    <span className="tabular-nums text-muted-foreground">{nf.format(r.count)}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div className="rounded-xl border bg-card p-5">
              <h3 className="font-medium">{t('topPages')}</h3>
              <ul className="mt-3 space-y-1.5 text-sm">
                {m.demand.topPages.map((p) => (
                  <li key={p.path} className="flex justify-between gap-3">
                    <span className="truncate font-mono text-xs">{p.path}</span>
                    <span className="tabular-nums text-muted-foreground">{nf.format(p.views)}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}
      </section>

      {/* Conversion and revenue */}
      <section className="space-y-4">
        <h2 className="font-display text-lg font-semibold">{t('revenue')}</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Tile
            label={t('distributions')}
            value={nf.format(m.conversion.distributions)}
            hint={t('respondedHint', { pct: pct(m.conversion.responseRate) })}
          />
          <Tile label={t('paying')} value={nf.format(m.revenue.payingOperators)} />
          <Tile
            label={t('mrr')}
            value={`$${nf.format(m.revenue.mrrUsd)}`}
            hint={t('mrrHint')}
          />
          <Tile label={t('freeToPaid')} value={pct(m.revenue.freeToPaid)} />
        </div>
      </section>
    </div>
  );
}
