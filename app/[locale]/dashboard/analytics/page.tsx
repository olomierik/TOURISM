import { notFound } from 'next/navigation';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { BarChart3, Eye, Inbox, TrendingUp } from 'lucide-react';

import type { LocaleParams } from '@/i18n/routing';
import { Link } from '@/i18n/navigation';
import { getMyBusiness } from '@/lib/queries/dashboard';
import { getListingAnalytics } from '@/lib/queries/analytics';
import { Alert, AlertDescription } from '@/components/ui/alert';

export async function generateMetadata({ params }: { params: Promise<LocaleParams> }) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'dashboard' });
  return { title: t('analytics'), robots: { index: false, follow: false } };
}

export default async function AnalyticsPage({ params }: { params: Promise<LocaleParams> }) {
  const { locale } = await params;
  setRequestLocale(locale);

  const business = await getMyBusiness(locale);
  if (!business) notFound();

  const [stats, t] = await Promise.all([
    getListingAnalytics(business.id),
    getTranslations('dashboard.analyticsPage'),
  ]);

  const peak = Math.max(1, ...stats.daily.map(([, n]) => n));

  const tiles = [
    { label: t('views'), value: stats.views, Icon: Eye },
    { label: t('visitors'), value: stats.visitors, Icon: TrendingUp },
    { label: t('enquiries'), value: stats.enquiries, Icon: Inbox },
    { label: t('conversion'), value: stats.conversion ? `${stats.conversion}%` : '—', Icon: BarChart3 },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold">{t('title')}</h1>
        <p className="mt-2 text-sm text-muted-foreground">{t('subtitle')}</p>
      </div>

      {stats.views === 0 && (
        // Said plainly rather than rendering four zeros and leaving the owner to
        // wonder whether the page is broken or the listing is.
        <Alert>
          <AlertDescription>{t('noDataYet')}</AlertDescription>
        </Alert>
      )}

      <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {tiles.map(({ label, value, Icon }) => (
          <li key={label} className="rounded-2xl border bg-card p-5">
            <Icon className="size-5 text-muted-foreground" aria-hidden />
            <p className="mt-3 text-2xl font-semibold">{value}</p>
            <p className="mt-1 text-sm text-muted-foreground">{label}</p>
          </li>
        ))}
      </ul>

      <section className="space-y-4">
        <h2 className="text-lg font-semibold">{t('overTime')}</h2>
        {/* A plain bar row rather than a charting library: thirty numbers do not
            justify shipping one to every visitor's browser. */}
        <div className="flex h-40 items-end gap-1 rounded-2xl border bg-card p-4">
          {stats.daily.map(([day, n]) => (
            <div
              key={day}
              className="flex-1 rounded-t bg-primary/70"
              style={{ height: `${Math.max(2, (n / peak) * 100)}%` }}
              title={`${day}: ${n}`}
            />
          ))}
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-lg font-semibold">{t('referrers')}</h2>
        {stats.referrers.length === 0 ? (
          <p className="rounded-xl border border-dashed p-6 text-center text-sm text-muted-foreground">
            {t('noReferrers')}
          </p>
        ) : (
          <ul className="divide-y rounded-2xl border bg-card">
            {stats.referrers.map(([host, n]) => (
              <li key={host} className="flex items-center justify-between px-5 py-3 text-sm">
                <span>{host}</span>
                <span className="font-medium text-muted-foreground">{n}</span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <p className="text-sm text-muted-foreground">
        {t('improveHint')}{' '}
        <Link href="/dashboard/gallery" className="font-medium text-primary hover:underline">
          {t('improveLink')}
        </Link>
      </p>
    </div>
  );
}
