import { getFormatter, getTranslations, setRequestLocale } from 'next-intl/server';
import { BadgeCheck, ClipboardCheck } from 'lucide-react';

import type { LocaleParams } from '@/i18n/routing';
import { Link } from '@/i18n/navigation';
import { getAdminBusinesses } from '@/lib/queries/admin';
import { BusinessActions } from '@/components/admin/business-actions';
import { Badge } from '@/components/ui/badge';
import type { Enums } from '@/lib/supabase/database.types';
import { cn } from '@/lib/utils';

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

const FILTERS = ['all', 'pending', 'approved', 'rejected', 'suspended', 'draft'] as const;

const STATUS_LABEL = {
  draft: 'statusDraft',
  pending: 'statusPending',
  approved: 'statusApproved',
  rejected: 'statusRejected',
  suspended: 'statusSuspended',
} as const;

const STATUS_VARIANT = {
  draft: 'secondary',
  pending: 'default',
  approved: 'verified',
  rejected: 'demo',
  suspended: 'demo',
} as const;

export default async function AdminBusinessesPage({
  params,
  searchParams,
}: {
  params: Promise<LocaleParams>;
  searchParams: SearchParams;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const sp = await searchParams;
  const raw = Array.isArray(sp.status) ? sp.status[0] : sp.status;
  const active = FILTERS.includes(raw as (typeof FILTERS)[number])
    ? (raw as (typeof FILTERS)[number])
    : 'all';

  const [all, t, format] = await Promise.all([
    getAdminBusinesses(locale),
    getTranslations('admin'),
    getFormatter(),
  ]);

  const businesses =
    active === 'all' ? all : all.filter((b) => b.status === active);

  return (
    <div className="space-y-6">
      <nav className="flex flex-wrap gap-2" aria-label={t('businesses')}>
        {FILTERS.map((f) => {
          const count = f === 'all' ? all.length : all.filter((b) => b.status === f).length;
          return (
            <Link
              key={f}
              href={{
                pathname: '/admin/businesses',
                query: f === 'all' ? {} : { status: f },
              }}
              aria-current={f === active ? 'page' : undefined}
              className={cn(
                'rounded-full border px-4 py-1.5 text-sm transition-colors',
                f === active ? 'border-primary bg-primary/10 text-primary' : 'hover:bg-secondary',
              )}
            >
              {t(`filter${f.charAt(0).toUpperCase()}${f.slice(1)}` as 'filterAll')}
              <span className="ml-1.5 text-muted-foreground">{count}</span>
            </Link>
          );
        })}
      </nav>

      {businesses.length === 0 ? (
        <div className="flex min-h-[30svh] flex-col items-center justify-center rounded-2xl border border-dashed p-10 text-center">
          <ClipboardCheck className="size-8 text-muted-foreground" aria-hidden />
          <h2 className="mt-4 text-lg font-semibold">{t('queueEmpty')}</h2>
          <p className="mt-2 text-sm text-muted-foreground">{t('queueEmptyBody')}</p>
        </div>
      ) : (
        <ul className="space-y-3">
          {businesses.map((b) => (
            <li key={b.id} className="rounded-2xl border bg-card p-5">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant={STATUS_VARIANT[b.status]}>
                      {t(STATUS_LABEL[b.status])}
                    </Badge>
                    {b.isVerified && (
                      <Badge variant="verified">
                        <BadgeCheck className="size-3" aria-hidden />
                      </Badge>
                    )}
                    {b.isDemo && <Badge variant="demo">demo</Badge>}
                  </div>

                  <h2 className="mt-2 font-display text-lg font-semibold">
                    {b.status === 'approved' ? (
                      <Link
                        href={{ pathname: '/business/[slug]', params: { slug: b.slug } }}
                        className="hover:text-primary"
                      >
                        {b.name}
                      </Link>
                    ) : (
                      b.name
                    )}
                  </h2>

                  {b.tagline && (
                    <p className="mt-1 text-sm text-muted-foreground">{b.tagline}</p>
                  )}

                  <dl className="mt-3 flex flex-wrap gap-x-6 gap-y-1 text-sm text-muted-foreground">
                    <div className="flex gap-1.5">
                      <dt>{t('owner')}:</dt>
                      <dd>{b.ownerEmail ?? t('noOwner')}</dd>
                    </div>
                    {b.city && <dd>{b.city}</dd>}
                    {b.submittedAt && (
                      <div className="flex gap-1.5">
                        <dt>{t('submitted')}:</dt>
                        <dd>{format.relativeTime(new Date(b.submittedAt))}</dd>
                      </div>
                    )}
                  </dl>
                </div>

                <BusinessActions
                  businessId={b.id}
                  status={b.status as Enums<'business_status'>}
                  isVerified={b.isVerified}
                />
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
