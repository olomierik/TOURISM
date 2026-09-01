import { getTranslations, setRequestLocale } from 'next-intl/server';
import { Check, Store } from 'lucide-react';

import type { LocaleParams } from '@/i18n/routing';
import { Link } from '@/i18n/navigation';
import { createClient } from '@/lib/supabase/server';
import { getMyBusiness } from '@/lib/queries/dashboard';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { cn } from '@/lib/utils';
import { BankTransferButton } from '@/components/billing/bank-transfer-button';

export async function generateMetadata({ params }: { params: Promise<LocaleParams> }) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'dashboard' });
  return { title: t('subscription'), robots: { index: false, follow: false } };
}

export default async function SubscriptionPage({ params }: { params: Promise<LocaleParams> }) {
  const { locale } = await params;
  setRequestLocale(locale);

  const t = await getTranslations('dashboard.subscriptionPage');
  const business = await getMyBusiness(locale);

  if (!business) {
    return (
      <div className="mx-auto max-w-xl text-center">
        <div className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-primary/10">
          <Store className="size-7 text-primary" aria-hidden />
        </div>
        <h2 className="mt-6 text-2xl font-semibold">{t('noBusinessTitle')}</h2>
        <Button asChild className="mt-6">
          <Link href="/dashboard">{t('noBusinessCta')}</Link>
        </Button>
      </div>
    );
  }

  const supabase = await createClient();

  const [{ data: plans }, { data: current }] = await Promise.all([
    supabase
      .from('subscription_plans')
      .select(
        `id, key, tier, price_monthly, price_yearly, currency,
         max_packages, max_gallery_images, max_services, monthly_lead_quota,
         can_be_featured, has_analytics,
         subscription_plan_translations (locale, name, description)`,
      )
      .eq('is_active', true)
      .order('price_yearly'),
    supabase
      .from('subscriptions')
      .select('plan_id, status, current_period_end')
      .eq('business_id', business.id)
      .eq('status', 'active')
      .maybeSingle(),
  ]);

  // No active subscription is the normal state for a new listing, not an error.
  const activePlanId = current?.plan_id ?? plans?.find((p) => p.key === 'free')?.id ?? null;

  // Read once here rather than in the card loop: it is an env check, and the
  // page should not be able to render a notice and a checkout button that
  // disagree with each other.


  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-2xl font-semibold">{t('title')}</h1>
        <p className="mt-2 max-w-2xl text-muted-foreground">{t('subtitle')}</p>
      </header>

      {/* Payment is a bank transfer, and the thing an operator most needs to
          know before pressing anything is that nothing happens automatically.
          A person matches the transfer against the bank statement. Saying so
          here stops the email that otherwise arrives an hour later asking why
          the plan has not upgraded. */}
      <Alert>
        <AlertDescription>{t('bankNotice')}</AlertDescription>
      </Alert>

      <ul className="grid gap-5 lg:grid-cols-3">
        {(plans ?? []).map((plan) => {
          const tr = plan.subscription_plan_translations.find((x) => x.locale === locale)
            ?? plan.subscription_plan_translations.find((x) => x.locale === 'en');
          const isCurrent = plan.id === activePlanId;

          const entitlements = [
            plan.max_gallery_images === null
              ? t('galleryUnlimited')
              : t('gallery', { count: plan.max_gallery_images }),
            plan.max_packages === null
              ? t('packagesUnlimited')
              : t('packages', { count: plan.max_packages }),
            plan.monthly_lead_quota === null
              ? t('leadsUnlimited')
              : t('leads', { count: plan.monthly_lead_quota }),
            ...(plan.can_be_featured ? [t('featured')] : []),
            ...(plan.has_analytics ? [t('analytics')] : []),
          ];

          return (
            <li
              key={plan.id}
              className={cn(
                'flex flex-col rounded-2xl border bg-card p-6',
                isCurrent && 'border-primary ring-1 ring-primary/30',
              )}
            >
              <div className="flex items-center justify-between gap-3">
                <h2 className="text-lg font-semibold">{tr?.name ?? plan.key}</h2>
                {isCurrent && <Badge>{t('currentPlan')}</Badge>}
              </div>

              <p className="mt-3 text-3xl font-semibold">
                {Number(plan.price_yearly) === 0
                  ? t('free')
                  : `${plan.currency} ${Number(plan.price_yearly).toFixed(0)}`}
                {Number(plan.price_yearly) > 0 && (
                  <span className="text-base font-normal text-muted-foreground">
                    {t('perYear')}
                  </span>
                )}
              </p>

              {/* No month-to-month comparison. It made sense when the annual
                  price was ten months of a real monthly rate; at $50 a year
                  there is no monthly alternative to compare against, and a
                  line reading "saves $0" is worse than no line. */}
              {Number(plan.price_yearly) > 0 && (
                <p className="mt-1 text-xs text-muted-foreground">{t('billedAnnually')}</p>
              )}

              {tr?.description && (
                <p className="mt-3 text-sm text-muted-foreground">{tr.description}</p>
              )}

              <ul className="mt-5 flex-1 space-y-2.5">
                {entitlements.map((e) => (
                  <li key={e} className="flex items-start gap-2.5 text-sm">
                    <Check className="mt-0.5 size-4 shrink-0 text-success" aria-hidden />
                    {e}
                  </li>
                ))}
              </ul>

              {!isCurrent && Number(plan.price_yearly) > 0 && (
                <BankTransferButton planKey={plan.key} label={t('subscribe')} />
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
