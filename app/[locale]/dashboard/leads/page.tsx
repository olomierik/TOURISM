import { getTranslations, setRequestLocale } from 'next-intl/server';
import { Inbox } from 'lucide-react';

import type { LocaleParams } from '@/i18n/routing';
import { Link } from '@/i18n/navigation';
import { getMyLeads } from '@/lib/queries/dashboard';
import { LeadCard } from '@/components/dashboard/lead-card';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

const FILTERS = [
  { key: 'all', statuses: null },
  { key: 'new', statuses: ['sent'] },
  { key: 'open', statuses: ['sent', 'viewed', 'responded'] },
  { key: 'won', statuses: ['won'] },
] as const;

export default async function DashboardLeadsPage({
  params,
  searchParams,
}: {
  params: Promise<LocaleParams>;
  searchParams: SearchParams;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const sp = await searchParams;
  const raw = Array.isArray(sp.filter) ? sp.filter[0] : sp.filter;
  const active = FILTERS.find((f) => f.key === raw) ?? FILTERS[0];

  const t = await getTranslations('dashboard');

  // Fetched unfiltered and narrowed here: the inbox is small per business, and
  // one query keeps every tab's count available without four round trips.
  const allLeads = await getMyLeads(locale);
  const leads = active.statuses
    ? allLeads.filter((l) => (active.statuses as readonly string[]).includes(l.status))
    : allLeads;

  if (allLeads.length === 0) {
    return (
      <div className="flex min-h-[40svh] flex-col items-center justify-center rounded-2xl border border-dashed p-10 text-center">
        <div className="flex size-14 items-center justify-center rounded-2xl bg-secondary">
          <Inbox className="size-7 text-muted-foreground" aria-hidden />
        </div>
        <h2 className="mt-6 text-xl font-semibold">{t('leadsEmpty')}</h2>
        <p className="mt-3 max-w-md text-sm leading-relaxed text-muted-foreground">
          {t('leadsEmptyBody')}
        </p>
        <Button asChild className="mt-6">
          <Link href="/dashboard/packages">{t('packagesAdd')}</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <nav className="flex flex-wrap gap-2" aria-label={t('leads')}>
        {FILTERS.map((f) => {
          const count = f.statuses
            ? allLeads.filter((l) => (f.statuses as readonly string[]).includes(l.status)).length
            : allLeads.length;

          return (
            <Link
              key={f.key}
              href={{ pathname: '/dashboard/leads', query: f.key === 'all' ? {} : { filter: f.key } }}
              aria-current={f.key === active.key ? 'page' : undefined}
              className={cn(
                'rounded-full border px-4 py-1.5 text-sm transition-colors',
                f.key === active.key
                  ? 'border-primary bg-primary/10 text-primary'
                  : 'hover:bg-secondary',
              )}
            >
              {t(`filter${f.key.charAt(0).toUpperCase()}${f.key.slice(1)}` as 'filterAll')}
              <span className="ml-1.5 text-muted-foreground">{count}</span>
            </Link>
          );
        })}
      </nav>

      <div className="space-y-3">
        {leads.map((lead) => (
          <LeadCard key={lead.id} lead={lead} locale={locale} />
        ))}
      </div>
    </div>
  );
}
