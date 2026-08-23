import { notFound } from 'next/navigation';
import { getFormatter, getTranslations, setRequestLocale } from 'next-intl/server';
import { CalendarDays, Package as PackageIcon } from 'lucide-react';

import type { LocaleParams } from '@/i18n/routing';
import { Link } from '@/i18n/navigation';
import { getMyBusiness, getMyPackages } from '@/lib/queries/dashboard';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { formatPrice } from '@/lib/format';

const STATUS_KEY = {
  draft: 'packageDraft',
  published: 'packagePublished',
  archived: 'packageArchived',
} as const;

export default async function DashboardPackagesPage({
  params,
}: {
  params: Promise<LocaleParams>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const business = await getMyBusiness(locale);
  if (!business) notFound();

  const [packages, t, format] = await Promise.all([
    getMyPackages(business.id, locale),
    getTranslations('dashboard'),
    getFormatter(),
  ]);

  if (packages.length === 0) {
    return (
      <div className="flex min-h-[40svh] flex-col items-center justify-center rounded-2xl border border-dashed p-10 text-center">
        <div className="flex size-14 items-center justify-center rounded-2xl bg-secondary">
          <PackageIcon className="size-7 text-muted-foreground" aria-hidden />
        </div>
        <h2 className="mt-6 text-xl font-semibold">{t('packagesEmpty')}</h2>
        <p className="mt-3 max-w-md text-sm leading-relaxed text-muted-foreground">
          {t('packagesEmptyBody')}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h2 className="sr-only">{t('packages')}</h2>

      {packages.map((pkg) => (
        <article
          key={pkg.id}
          className="flex flex-wrap items-start justify-between gap-4 rounded-2xl border bg-card p-5"
        >
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant={pkg.status === 'published' ? 'verified' : 'secondary'}>
                {t(STATUS_KEY[pkg.status])}
              </Badge>
              {pkg.isFeatured && <Badge variant="featured">{t('tierFeatured')}</Badge>}
            </div>

            <h3 className="mt-2 font-display text-lg font-semibold">{pkg.title}</h3>
            {pkg.summary && (
              <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{pkg.summary}</p>
            )}

            <p className="mt-2.5 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
              {pkg.durationDays && (
                <span className="flex items-center gap-1">
                  <CalendarDays className="size-3.5" aria-hidden />
                  {pkg.durationDays}
                </span>
              )}
              {pkg.priceFrom !== null && (
                <span className="font-medium text-foreground">
                  {formatPrice(pkg.priceFrom, pkg.currency, locale)}
                </span>
              )}
              <span>{format.relativeTime(new Date(pkg.updatedAt))}</span>
            </p>
          </div>

          {pkg.status === 'published' && (
            <Button asChild variant="outline" size="sm">
              <Link href={{ pathname: '/packages/[slug]', params: { slug: pkg.slug } }}>
                {t('viewPublic')}
              </Link>
            </Button>
          )}
        </article>
      ))}
    </div>
  );
}
