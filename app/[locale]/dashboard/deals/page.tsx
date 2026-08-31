import { notFound } from 'next/navigation';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { Tag } from 'lucide-react';

import type { LocaleParams } from '@/i18n/routing';
import { Link } from '@/i18n/navigation';
import { createClient } from '@/lib/supabase/server';
import { getMyBusiness } from '@/lib/queries/dashboard';
import { Button } from '@/components/ui/button';
import { DealForm } from '@/components/dashboard/deal-form';
import { EndDealButton } from '@/components/dashboard/end-deal';

/**
 * An operator's deals.
 *
 * Gated to paid plans by a database trigger rather than by hiding the page: an
 * operator on the free tier should be able to see what they would get, and a
 * page that simply is not there sells nothing. So the form renders, the
 * refusal is explained, and the upgrade link is next to it.
 */
export default async function DashboardDealsPage({
  params,
}: {
  params: Promise<LocaleParams>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const business = await getMyBusiness(locale);
  if (!business) notFound();

  const supabase = await createClient();

  const [t, plan, packages, deals] = await Promise.all([
    getTranslations('dashboard.dealsPage'),
    supabase
      .from('subscriptions')
      .select('status, subscription_plans (tier)')
      .eq('business_id', business.id)
      .eq('status', 'active')
      .maybeSingle(),
    supabase
      .from('packages')
      .select('id, price_from, currency, package_translations (locale, title)')
      .eq('business_id', business.id)
      .eq('status', 'published')
      .is('deleted_at', null),
    supabase
      .from('deals')
      .select(
        `id, deal_price, starts_at, ends_at,
         packages (price_from, currency, package_translations (locale, title)),
         deal_translations (locale, headline, terms)`,
      )
      .eq('business_id', business.id)
      .order('ends_at', { ascending: true }),
  ]);

  const tier =
    (plan.data?.subscription_plans as unknown as { tier: string } | null)?.tier ?? 'free';
  const isPaid = tier !== 'free';

  const pick = <T extends { locale: string }>(rows: T[] | undefined) =>
    (rows ?? []).find((r) => r.locale === locale) ?? (rows ?? []).find((r) => r.locale === 'en');

  const options = (packages.data ?? []).map((p) => ({
    id: p.id,
    name: pick(p.package_translations)?.title ?? '—',
    price: p.price_from === null ? null : Number(p.price_from),
    currency: p.currency,
  }));

  const dateFmt = new Intl.DateTimeFormat(locale, { dateStyle: 'medium' });
  const nowMs = new Date().getTime();

  const rows = (deals.data ?? []).map((d) => {
    const pkg = d.packages as unknown as {
      price_from: string | null;
      currency: string;
      package_translations: Array<{ locale: string; title: string }>;
    } | null;
    return {
      id: d.id,
      headline: pick(d.deal_translations)?.headline ?? '—',
      terms: pick(d.deal_translations)?.terms ?? '',
      packageName: pkg ? (pick(pkg.package_translations)?.title ?? null) : null,
      was: pkg?.price_from ? Number(pkg.price_from) : null,
      now: d.deal_price === null ? null : Number(d.deal_price),
      currency: pkg?.currency ?? 'USD',
      endsAt: d.ends_at,
      live:
        new Date(d.starts_at).getTime() <= nowMs && new Date(d.ends_at).getTime() > nowMs,
    };
  });

  const money = (n: number, currency: string) =>
    new Intl.NumberFormat(locale, { style: 'currency', currency, maximumFractionDigits: 0 }).format(n);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold">{t('title')}</h1>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground">
          {t('intro')}
        </p>
      </div>

      {!isPaid && (
        <div className="rounded-2xl border border-dashed p-6">
          <h2 className="font-medium">{t('needsPlanTitle')}</h2>
          <p className="mt-2 max-w-xl text-sm leading-relaxed text-muted-foreground">
            {t('needsPlanBody')}
          </p>
          <Button asChild className="mt-4" size="sm">
            <Link href="/dashboard/subscription">{t('seePlans')}</Link>
          </Button>
        </div>
      )}

      {rows.length > 0 && (
        <ul className="space-y-3">
          {rows.map((d) => (
            <li key={d.id} className="rounded-xl border p-5">
              <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
                <h2 className="font-display text-lg font-semibold">{d.headline}</h2>
                <span className="text-xs uppercase tracking-wide text-muted-foreground">
                  {d.live ? t('live') : t('notLive')}
                </span>
              </div>

              <p className="mt-1.5 flex flex-wrap items-center gap-x-3 text-sm text-muted-foreground">
                {d.packageName && <span>{d.packageName}</span>}
                {d.was !== null && d.now !== null && (
                  <span>
                    <span className="line-through">{money(d.was, d.currency)}</span>{' '}
                    <span className="font-medium text-foreground">
                      {money(d.now, d.currency)}
                    </span>
                  </span>
                )}
                <span>{t('until', { date: dateFmt.format(new Date(d.endsAt)) })}</span>
              </p>

              {d.terms && <p className="mt-3 text-sm leading-relaxed">{d.terms}</p>}

              <div className="mt-4">
                <EndDealButton dealId={d.id} label={t('end')} />
              </div>
            </li>
          ))}
        </ul>
      )}

      {rows.length === 0 && (
        <div className="flex flex-col items-center rounded-2xl border border-dashed p-8 text-center">
          <div className="flex size-12 items-center justify-center rounded-2xl bg-secondary">
            <Tag className="size-6 text-muted-foreground" aria-hidden />
          </div>
          <h2 className="mt-4 font-medium">{t('empty')}</h2>
          <p className="mt-2 max-w-md text-sm leading-relaxed text-muted-foreground">
            {t('emptyBody')}
          </p>
        </div>
      )}

      <DealForm packages={options} />
    </div>
  );
}
