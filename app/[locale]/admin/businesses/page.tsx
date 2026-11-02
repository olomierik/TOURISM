import { getFormatter, getTranslations, setRequestLocale } from 'next-intl/server';
import { BadgeCheck, ClipboardCheck } from 'lucide-react';

import type { LocaleParams } from '@/i18n/routing';
import { Link } from '@/i18n/navigation';
import {
  getAdminBusinesses,
  getAdminBusinessCounts,
  type AdminBusinessFilter,
} from '@/lib/queries/admin';
import { Plus, Pencil } from 'lucide-react';
import { BusinessActions } from '@/components/admin/business-actions';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import type { Enums } from '@/lib/supabase/database.types';
import { cn } from '@/lib/utils';

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

const FILTERS = [
  'all',
  'unverified',
  'claimed',
  'pending',
  'approved',
  'rejected',
  'suspended',
  'draft',
] as const satisfies readonly AdminBusinessFilter[];

/** Label key per filter. The status ones are named for the status they select. */
const FILTER_LABEL: Record<AdminBusinessFilter, string> = {
  all: 'filterAll',
  unverified: 'filterUnverified',
  claimed: 'filterClaimed',
  pending: 'filterPending',
  approved: 'filterApproved',
  rejected: 'filterRejected',
  suspended: 'filterSuspended',
  draft: 'filterDraft',
};

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
  const one = (k: string) => (Array.isArray(sp[k]) ? sp[k][0] : sp[k]) ?? '';
  const raw = one('status');
  const active = FILTERS.includes(raw as (typeof FILTERS)[number])
    ? (raw as (typeof FILTERS)[number])
    : 'all';
  const q = one('q').trim();
  const page = Math.max(1, Number(one('page')) || 1);

  const [result, counts, t, format] = await Promise.all([
    getAdminBusinesses(locale, { filter: active, q, page }),
    getAdminBusinessCounts(),
    getTranslations('admin'),
    getFormatter(),
  ]);

  const businesses = result.rows;
  const pages = Math.max(1, Math.ceil(result.total / result.perPage));
  // Carried on every link so paging does not silently drop the filter or the
  // search the administrator is looking at.
  const keep = { ...(active === 'all' ? {} : { status: active }), ...(q ? { q } : {}) };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-2xl font-semibold">{t('businesses')}</h1>
        <Button asChild>
          <Link href="/admin/businesses/new">
            <Plus className="size-4" aria-hidden />
            {t('businessCreate')}
          </Link>
        </Button>
      </div>

      <nav className="flex flex-wrap gap-2" aria-label={t('businesses')}>
        {FILTERS.map((f) => {
          const count = counts[f];
          return (
            <Link
              key={f}
              href={{
                pathname: '/admin/businesses',
                query: {
                  ...(f === 'all' ? {} : { status: f }),
                  ...(q ? { q } : {}),
                },
              }}
              aria-current={f === active ? 'page' : undefined}
              className={cn(
                'rounded-full border px-4 py-1.5 text-sm transition-colors',
                f === active ? 'border-primary bg-primary/10 text-primary' : 'hover:bg-secondary',
              )}
            >
              {t(FILTER_LABEL[f] as 'filterAll')}
              <span className="ml-1.5 text-muted-foreground">{count}</span>
            </Link>
          );
        })}
      </nav>

      {/* A plain GET form: the query lands in the URL, so a filtered view can
          be bookmarked, shared, and survives the page being reloaded after an
          approval. */}
      <form action="" method="get" className="flex flex-wrap gap-2">
        {active !== 'all' && <input type="hidden" name="status" value={active} />}
        <input
          type="search"
          name="q"
          defaultValue={q}
          placeholder={t('searchPlaceholder')}
          aria-label={t('searchPlaceholder')}
          className="min-w-0 flex-1 rounded-full border bg-background px-4 py-1.5 text-sm"
        />
        <Button type="submit" variant="outline" size="sm">
          {t('searchAction')}
        </Button>
        {q && (
          <Button asChild variant="ghost" size="sm">
            <Link
              href={{
                pathname: '/admin/businesses',
                query: active === 'all' ? {} : { status: active },
              }}
            >
              {t('searchClear')}
            </Link>
          </Button>
        )}
      </form>

      <p className="text-sm text-muted-foreground">
        {t('resultCount', { shown: businesses.length, total: result.total })}
      </p>

      {businesses.length === 0 ? (
        <div className="flex min-h-[30svh] flex-col items-center justify-center rounded-2xl border border-dashed p-10 text-center">
          <ClipboardCheck className="size-8 text-muted-foreground" aria-hidden />
          <h2 className="mt-4 text-lg font-semibold">{t('queueEmpty')}</h2>
          <p className="mt-2 text-sm text-muted-foreground">{t('queueEmptyBody')}</p>
        </div>
      ) : (
        <ul className="space-y-3">
          {businesses.map((b) => (
            <li key={b.id} className="rounded-2xl border bg-card p-4">
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

                <Button asChild variant="outline" size="sm" className="mb-2">
                  <Link href={{ pathname: '/admin/businesses/[id]', params: { id: b.id } }}>
                    <Pencil className="size-3.5" aria-hidden />
                    {t('guideEditLink')}
                  </Link>
                </Button>
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

      {pages > 1 && (
        <nav className="flex items-center justify-between gap-4 pt-2" aria-label={t('pagination')}>
          <Button asChild variant="outline" size="sm" disabled={page <= 1}>
            <Link
              href={{
                pathname: '/admin/businesses',
                query: { ...keep, ...(page > 2 ? { page: page - 1 } : {}) },
              }}
              aria-disabled={page <= 1}
              className={page <= 1 ? 'pointer-events-none opacity-50' : undefined}
            >
              {t('paginationPrev')}
            </Link>
          </Button>

          <span className="text-sm text-muted-foreground">
            {t('paginationPage', { page, pages })}
          </span>

          <Button asChild variant="outline" size="sm" disabled={page >= pages}>
            <Link
              href={{
                pathname: '/admin/businesses',
                query: { ...keep, page: page + 1 },
              }}
              aria-disabled={page >= pages}
              className={page >= pages ? 'pointer-events-none opacity-50' : undefined}
            >
              {t('paginationNext')}
            </Link>
          </Button>
        </nav>
      )}
    </div>
  );
}
