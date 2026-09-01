import { notFound } from 'next/navigation';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { AlertTriangle, Building2, Copy, MessageCircle } from 'lucide-react';

import type { Locale } from '@/i18n/routing';
import { Link } from '@/i18n/navigation';
import { createClient } from '@/lib/supabase/server';
import { BANK_DETAILS, CONTACT_DETAILS, whatsappLink } from '@/lib/billing/bank';
import { CopyField } from '@/components/billing/copy-field';

type Params = Promise<{ locale: Locale; reference: string }>;

/**
 * How to pay, and what happens next.
 *
 * A bank transfer is not a checkout. Nothing here confirms anything — the money
 * arrives in a statement, an admin matches the reference against it, and the
 * plan is granted by hand. Saying that plainly is the whole job of this page:
 * an operator who transfers $490 and then watches their dashboard for an
 * instant upgrade will email in an hour thinking it failed.
 *
 * The reference is the part that must not be got wrong, so it is rendered
 * copyable and repeated in the instructions rather than mentioned once.
 */
export default async function PayPage({ params }: { params: Params }) {
  const { locale, reference } = await params;
  setRequestLocale(locale);

  const supabase = await createClient();

  // RLS restricts payments to the owning business or an admin, so a reference
  // guessed by a stranger resolves to nothing rather than to somebody else's
  // invoice.
  const { data: payment } = await supabase
    .from('payments')
    .select(
      `id, amount, currency, status, provider_ref, created_at,
       subscription_plans (key, price_yearly,
         subscription_plan_translations (locale, name))`,
    )
    .eq('provider_ref', reference)
    .maybeSingle();

  if (!payment) notFound();

  const t = await getTranslations({ locale, namespace: 'billing' });

  const plan = payment.subscription_plans as unknown as {
    key: string;
    subscription_plan_translations: Array<{ locale: string; name: string }>;
  } | null;
  const planName =
    plan?.subscription_plan_translations.find((x) => x.locale === locale)?.name ??
    plan?.subscription_plan_translations.find((x) => x.locale === 'en')?.name ??
    plan?.key ??
    '—';

  const money = new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: payment.currency,
    maximumFractionDigits: 0,
  }).format(Number(payment.amount));

  const settled = payment.status === 'succeeded';

  return (
    <div className="max-w-2xl space-y-8">
      <div>
        <h1 className="text-2xl font-semibold">{t('payTitle', { plan: planName })}</h1>
        <p className="mt-2 leading-relaxed text-muted-foreground">
          {settled ? t('payAlreadyPaid') : t('payIntro', { amount: money })}
        </p>
      </div>

      {!settled && (
        <>
          <div className="rounded-2xl border p-6">
            <h2 className="flex items-center gap-2 font-medium">
              <Building2 className="size-5 text-primary" aria-hidden />
              {t('bankTitle')}
            </h2>

            <dl className="mt-4 space-y-3">
              <CopyField label={t('bankName')} value={BANK_DETAILS.bankName} />
              <CopyField label={t('accountName')} value={BANK_DETAILS.accountName} />
              <CopyField label={t('accountNumber')} value={BANK_DETAILS.accountNumber} mono />
              <CopyField label={t('amount')} value={money} mono />
              {/* The one an admin matches against the statement. Without it a
                  transfer for $490 could be any operator on the site. */}
              <CopyField
                label={t('reference')}
                value={payment.provider_ref ?? reference}
                mono
                highlight
              />
            </dl>

            <p className="mt-5 flex gap-2 rounded-lg bg-secondary/50 p-3 text-sm leading-relaxed">
              <Copy className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden />
              <span>{t('referenceHint', { reference: payment.provider_ref ?? reference })}</span>
            </p>
          </div>

          <div className="rounded-2xl border p-6">
            <h2 className="font-medium">{t('nextTitle')}</h2>
            <ol className="mt-3 ml-5 list-decimal space-y-2 text-sm leading-relaxed marker:text-muted-foreground">
              <li>{t('next1')}</li>
              <li>{t('next2', { reference: payment.provider_ref ?? reference })}</li>
              <li>{t('next3')}</li>
              <li>{t('next4')}</li>
            </ol>

            <p className="mt-4 text-sm">
              <a
                href={whatsappLink(
                  `Hello, I have paid for the ${planName} plan. My reference is ${payment.provider_ref ?? reference}.`,
                )}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 font-medium text-primary hover:underline"
              >
                <MessageCircle className="size-4" aria-hidden />
                {t('tellUsWhatsApp', { phone: CONTACT_DETAILS.phoneDisplay })}
              </a>
            </p>
          </div>

          {/* Published account details can be quoted by anybody. Saying this
              once, here, costs nothing and is the only warning an operator
              would have. */}
          <p className="flex gap-2 rounded-lg border border-dashed p-4 text-sm leading-relaxed">
            <AlertTriangle className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden />
            <span>{t('fraudWarning', { account: BANK_DETAILS.accountNumber })}</span>
          </p>
        </>
      )}

      <p className="text-sm">
        <Link href="/dashboard/subscription" className="text-primary hover:underline">
          {t('backToPlans')}
        </Link>
      </p>
    </div>
  );
}
