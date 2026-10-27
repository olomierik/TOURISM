import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';

import type { Locale } from '@/i18n/routing';
import { getPendingClaims } from '@/lib/queries/admin';
import { ClaimsQueue, type PendingClaim } from '@/components/admin/claims-queue';

type Params = { locale: Locale };

export async function generateMetadata({
  params,
}: {
  params: Promise<Params>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'admin.claimsPage' });
  return { title: t('title'), robots: { index: false, follow: false } };
}

/**
 * The claim review queue.
 *
 * Reads through the cookie-bound client, so RLS applies — an admin sees every
 * claim, and were this page ever reached by anyone else they would see only
 * their own. The layout already gates on role; this is the second lock.
 */
export default async function AdminClaimsPage({ params }: { params: Promise<Params> }) {
  const { locale } = await params;
  setRequestLocale(locale);

  // The annotation is deliberate: it is what fails the build if the shared
  // query and the queue's own props ever drift apart.
  const claims: PendingClaim[] = await getPendingClaims();

  const t = await getTranslations('admin.claimsPage');

  return (
    <div className="space-y-5">
      <div>
        <h1 className="font-display text-2xl font-semibold">{t('title')}</h1>
        <p className="mt-2 max-w-2xl text-muted-foreground">{t('subtitle')}</p>
      </div>

      <ClaimsQueue claims={claims} locale={locale} />
    </div>
  );
}
