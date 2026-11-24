import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { ShieldCheck } from 'lucide-react';

import type { LocaleParams } from '@/i18n/routing';
import { redirect } from '@/i18n/navigation';
import { myGuideDocuments, myTourGuide } from '@/lib/tour-guides/queries';
import { PageHero } from '@/components/layout/page-hero';
import { VerificationUploads } from '@/components/tour-guides/verification-uploads';

export const metadata: Metadata = { robots: { index: false, follow: false } };

/** The verification window, for the signed-in guide only. */
export default async function VerifyGuidePage({ params }: { params: Promise<LocaleParams> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const guide = await myTourGuide();
  if (!guide) redirect({ href: '/tour-guides/join', locale });
  const t = await getTranslations('tourGuides.verify');
  const uploaded = await myGuideDocuments(guide!.businessId);

  return (
    <>
      <PageHero icon={ShieldCheck} eyebrow={guide!.name} title={t('title')} lead={t('lead')} />
      <div className="container-page max-w-3xl py-6 sm:py-10">
        {guide!.verificationStatus === 'rejected' && guide!.verificationNote && (
          <div className="mb-5 rounded-2xl border border-destructive/40 bg-destructive/5 p-4 text-body-sm">
            <p className="font-semibold">{t('rejectedTitle')}</p>
            <p className="mt-1">{guide!.verificationNote}</p>
          </div>
        )}
        <VerificationUploads
          businessId={guide!.businessId}
          guideKind={guide!.guideKind}
          uploaded={uploaded}
          status={guide!.verificationStatus}
        />
      </div>
    </>
  );
}
