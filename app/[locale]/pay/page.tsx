import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';

import { locales, type LocaleParams } from '@/i18n/routing';
import { PaddleCheckout } from '@/components/billing/paddle-checkout';
import { paddleActiveCredentials } from '@/lib/payments/paddle';

/**
 * Paddle's default payment link.
 *
 * This page exists because Paddle has no hosted checkout of its own. A
 * transaction's `checkout.url` is this address plus `?_ptxn=<transaction id>`,
 * and Paddle expects Paddle.js to be waiting here to open the checkout. The
 * same URL is used in the emails Paddle sends customers to update a card, so
 * it has to keep working for people who arrive without a session.
 *
 * It must be set, and the domain approved, under
 * Paddle > Checkout > Checkout configuration before any transaction can be
 * created at all.
 *
 * Not in the sitemap and not indexed: it is a payment surface with no content,
 * and a `?_ptxn=` in a search result would be a stale transaction at best.
 */
export async function generateStaticParams() {
  return locales.map((locale) => ({ locale }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<LocaleParams>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'pay' });

  return {
    title: t('metaTitle'),
    robots: { index: false, follow: false },
  };
}

const first = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);

export default async function PayPage({
  params,
  searchParams,
}: {
  params: Promise<LocaleParams>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const sp = await searchParams;

  const t = await getTranslations('pay');

  // The client token now arrives from the mode in force rather than from a
  // `NEXT_PUBLIC_` variable baked in at build time, which is what makes the
  // admin toggle take effect without a rebuild. It is still handed to the
  // client component as a prop, exactly as before; the token is public by
  // design and ships in the page either way.
  const creds = await paddleActiveCredentials();

  return (
    <div className="mx-auto max-w-2xl px-4 py-16">
      <h1 className="font-display text-2xl font-semibold">{t('title')}</h1>
      <p className="mt-2 text-sm text-muted-foreground">{t('intro')}</p>

      <div className="mt-8">
        {creds ? (
          <PaddleCheckout
            token={creds.clientToken}
            environment={creds.mode === 'live' ? 'production' : 'sandbox'}
            transactionId={first(sp._ptxn) ?? null}
            locale={locale}
          />
        ) : (
          /* Same rule as the Subscribe button: an operator must never meet a
             payment page that cannot take a payment. Saying it is not live is
             the honest outcome of a missing credential. */
          <p className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
            {t('notConfigured')}
          </p>
        )}
      </div>
    </div>
  );
}
