import { getTranslations, setRequestLocale } from 'next-intl/server';
import { notFound } from 'next/navigation';
import { ShieldCheck } from 'lucide-react';

import type { LocaleParams } from '@/i18n/routing';
import { createClient } from '@/lib/supabase/server';
import { getMyBusiness } from '@/lib/queries/dashboard';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  PaymentMethodsForm,
  type SavedMethod,
} from '@/components/dashboard/payment-methods-form';
import type { Enums } from '@/lib/supabase/database.types';

/**
 * Where an operator connects their own payment gateway.
 *
 * Travellers pay the operator directly. This site never touches the money, and
 * says so on the page rather than only in a migration comment: the operator is
 * the merchant, which means they keep the fees, the settlement and — the part
 * worth being explicit about — the refunds and chargebacks.
 */
export default async function PaymentsPage({ params }: { params: Promise<LocaleParams> }) {
  const { locale } = await params;
  setRequestLocale(locale);

  const business = await getMyBusiness(locale);
  if (!business) notFound();

  const supabase = await createClient();

  const [{ data: hosts }, { data: methods }, t] = await Promise.all([
    supabase.from('payment_provider_hosts').select('provider, host').order('provider'),
    supabase
      .from('business_payment_methods')
      .select('id, provider, checkout_url, label')
      .eq('business_id', business.id)
      .order('provider'),
    getTranslations({ locale, namespace: 'dashboard.payments' }),
  ]);

  // Grouped from the same rows the trigger validates against, so the hint on
  // the form and the rule in the database cannot drift apart.
  const hostsByProvider: Record<string, string[]> = {};
  for (const row of hosts ?? []) {
    (hostsByProvider[row.provider] ??= []).push(row.host);
  }

  const providers = Object.keys(hostsByProvider) as Enums<'payment_provider'>[];

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-2xl font-semibold">{t('title')}</h1>
        <p className="mt-2 max-w-2xl text-muted-foreground">{t('subtitle')}</p>
      </header>

      {/* Said plainly and first. An operator who thinks this site holds the
          money will not chase a refund, and a traveller who is told the wrong
          thing about who they paid has a complaint nobody can answer. */}
      <Alert>
        <ShieldCheck className="size-4" aria-hidden />
        <AlertDescription>{t('directNotice')}</AlertDescription>
      </Alert>

      <PaymentMethodsForm
        providers={providers}
        hostsByProvider={hostsByProvider}
        saved={(methods ?? []) as SavedMethod[]}
      />
    </div>
  );
}
