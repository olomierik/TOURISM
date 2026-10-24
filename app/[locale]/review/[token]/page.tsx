import type { Metadata } from 'next';
import { getFormatter, getTranslations, setRequestLocale } from 'next-intl/server';
import { BadgeCheck, Star } from 'lucide-react';

import type { Locale } from '@/i18n/routing';
import { Link } from '@/i18n/navigation';
import { getInvite } from '@/lib/reviews/invite';
import { createAdminClient } from '@/lib/supabase/admin';
import { InvitedReviewForm } from '@/components/reviews/invited-review-form';
import { Button } from '@/components/ui/button';

type Params = Promise<{ locale: Locale; token: string }>;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'reviewInvite' });
  // The link is the key: keep the page out of search and the key out of
  // Referer headers.
  return { title: t('metaTitle'), robots: { index: false, follow: false }, referrer: 'no-referrer' };
}

/**
 * Where a review invitation lands: the traveller rates the operator they
 * travelled with, without signing in. The review is marked "Verified
 * traveller" because the operator marked their enquiry won.
 */
export default async function ReviewInvitePage({ params }: { params: Params }) {
  const { locale, token } = await params;
  setRequestLocale(locale);
  const t = await getTranslations('reviewInvite');
  const format = await getFormatter();

  const invite = await getInvite(token);

  if (!invite) {
    return (
      <div className="container-page flex min-h-[50vh] max-w-xl flex-col items-center justify-center py-16 text-center">
        <Star className="size-10 text-muted-foreground" aria-hidden />
        <h1 className="mt-4 text-2xl font-semibold">{t('invalidTitle')}</h1>
        <p className="mt-2 text-muted-foreground">{t('invalidBody')}</p>
        <Button asChild className="mt-6">
          <Link href="/">{t('home')}</Link>
        </Button>
      </div>
    );
  }

  const { data: existing } = await createAdminClient()
    .from('reviews')
    .select('id')
    .eq('lead_id', invite.leadId)
    .eq('business_id', invite.business.id)
    .is('deleted_at', null)
    .limit(1)
    .maybeSingle();

  const tooEarly = invite.travelStart !== null && new Date(invite.travelStart) > new Date();

  return (
    <div className="container-page max-w-2xl py-section">
      <p className="inline-flex items-center gap-1.5 rounded-full bg-success/12 px-3 py-1 text-sm font-medium text-success">
        <BadgeCheck className="size-4" aria-hidden />
        {t('verifiedNote')}
      </p>
      <h1 className="mt-4 text-3xl font-semibold">{t('title', { business: invite.business.name })}</h1>
      <p className="mt-2 text-muted-foreground">{t('subtitle', { name: invite.traveler.name.split(/\s+/)[0] })}</p>

      <div className="mt-8">
        {existing ? (
          <div className="rounded-2xl border bg-card p-6">
            <h2 className="text-lg font-semibold">{t('alreadyTitle')}</h2>
            <p className="mt-2 text-muted-foreground">{t('alreadyBody', { business: invite.business.name })}</p>
            <Button asChild className="mt-5">
              <Link href={{ pathname: '/business/[slug]', params: { slug: invite.business.slug } }}>
                {t('seeListing')}
              </Link>
            </Button>
          </div>
        ) : tooEarly ? (
          <div className="rounded-2xl border bg-card p-6">
            <h2 className="text-lg font-semibold">{t('earlyTitle')}</h2>
            <p className="mt-2 text-muted-foreground">
              {t('earlyBody', {
                date: format.dateTime(new Date(invite.travelStart as string), { dateStyle: 'long' }),
              })}
            </p>
          </div>
        ) : (
          <InvitedReviewForm
            token={token}
            businessName={invite.business.name}
            businessSlug={invite.business.slug}
          />
        )}
      </div>
    </div>
  );
}
