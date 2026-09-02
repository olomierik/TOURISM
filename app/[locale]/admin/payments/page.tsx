import { getTranslations, setRequestLocale } from 'next-intl/server';
import { CreditCard, ExternalLink, Info } from 'lucide-react';

import type { LocaleParams } from '@/i18n/routing';
import { Link } from '@/i18n/navigation';
import { createClient } from '@/lib/supabase/server';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';

export const dynamic = 'force-dynamic';

/**
 * What operators have connected, and how often travellers follow it.
 *
 * The counts are referrals, not sales, and the page says so at the top rather
 * than leaving the number to be read as revenue. A referral is somebody
 * pressing pay; the transaction happens on the provider's servers under the
 * operator's own account and nothing reports back. Anyone reading this page for
 * a revenue figure needs to be told that once, where they are reading.
 *
 * Reached through the signed-in admin's own client, so the RLS policies in
 * migration 053 are what grant the read — not a service key that would have
 * shown these rows to any code that imported it by mistake.
 */
export default async function AdminPaymentsPage({
  params,
}: {
  params: Promise<LocaleParams>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const supabase = await createClient();

  const [{ data: methods }, { data: referrals }, t, tPay] = await Promise.all([
    supabase
      .from('business_payment_methods')
      .select('id, provider, checkout_url, label, is_active, created_at, businesses (name, slug)')
      .order('created_at', { ascending: false }),
    supabase
      .from('payment_referrals')
      .select('id, provider, created_at, business_id, businesses (name, slug)')
      .order('created_at', { ascending: false })
      .limit(100),
    getTranslations({ locale, namespace: 'admin.payments' }),
    getTranslations({ locale, namespace: 'dashboard.payments' }),
  ]);

  const rows = methods ?? [];
  const clicks = referrals ?? [];

  // Referrals per business, so a connected gateway nobody uses is visible as
  // such rather than hidden behind a total.
  const perBusiness = new Map<string, number>();
  for (const r of clicks) perBusiness.set(r.business_id, (perBusiness.get(r.business_id) ?? 0) + 1);

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-2xl font-semibold">{t('title')}</h1>
        <p className="mt-2 max-w-2xl text-muted-foreground">{t('subtitle')}</p>
      </header>

      <Alert>
        <Info className="size-4" aria-hidden />
        <AlertDescription>{t('notRevenue')}</AlertDescription>
      </Alert>

      <section>
        <h2 className="font-display text-lg font-semibold">
          {t('connected', { count: rows.length })}
        </h2>

        {rows.length === 0 ? (
          <p className="mt-4 rounded-xl border border-dashed p-6 text-sm text-muted-foreground">
            {t('noneConnected')}
          </p>
        ) : (
          <div className="mt-4 overflow-x-auto rounded-xl border">
            <table className="w-full text-sm">
              <thead className="bg-secondary/60 text-left">
                <tr>
                  <th className="p-3 font-medium">{t('business')}</th>
                  <th className="p-3 font-medium">{t('provider')}</th>
                  <th className="p-3 font-medium">{t('link')}</th>
                  <th className="p-3 text-right font-medium tabular-nums">{t('referrals')}</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((m) => {
                  const b = m.businesses as { name: string; slug: string } | null;
                  return (
                    <tr key={m.id} className="border-t">
                      <td className="p-3">
                        {b ? (
                          <Link
                            href={{ pathname: '/business/[slug]', params: { slug: b.slug } }}
                            className="font-medium hover:underline"
                          >
                            {b.name}
                          </Link>
                        ) : (
                          '—'
                        )}
                      </td>
                      <td className="p-3">
                        <span className="flex items-center gap-1.5">
                          <CreditCard className="size-4 text-muted-foreground" aria-hidden />
                          {tPay(`providers.${m.provider}` as 'providers.dpo')}
                          {!m.is_active && (
                            <Badge variant="secondary">{t('inactive')}</Badge>
                          )}
                        </span>
                      </td>
                      <td className="max-w-[22rem] p-3">
                        {/* The destination, in full. An admin reviewing these is
                            checking exactly one thing — where the money goes —
                            and a shortened link hides it. */}
                        <a
                          href={m.checkout_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-1 break-all text-xs text-muted-foreground hover:underline"
                        >
                          {m.checkout_url}
                          <ExternalLink className="size-3 shrink-0" aria-hidden />
                        </a>
                      </td>
                      <td className="p-3 text-right tabular-nums">
                        {perBusiness.get(
                          (m as unknown as { business_id: string }).business_id,
                        ) ?? 0}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section>
        <h2 className="font-display text-lg font-semibold">{t('recent')}</h2>
        {clicks.length === 0 ? (
          <p className="mt-4 rounded-xl border border-dashed p-6 text-sm text-muted-foreground">
            {t('noReferrals')}
          </p>
        ) : (
          <ul className="mt-4 divide-y rounded-xl border">
            {clicks.slice(0, 30).map((r) => {
              const b = r.businesses as { name: string; slug: string } | null;
              return (
                <li key={r.id} className="flex items-center justify-between gap-4 p-3 text-sm">
                  <span className="truncate">{b?.name ?? '—'}</span>
                  <span className="flex shrink-0 items-center gap-3 text-muted-foreground">
                    <span>{tPay(`providers.${r.provider}` as 'providers.dpo')}</span>
                    <time dateTime={r.created_at} className="tabular-nums">
                      {new Date(r.created_at).toLocaleDateString(locale, {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                      })}
                    </time>
                  </span>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}
