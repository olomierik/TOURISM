import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { BadgeCheck, Banknote, MessageCircle, UserPlus } from 'lucide-react';

import type { LocaleParams } from '@/i18n/routing';
import { Link, getPathname } from '@/i18n/navigation';
import { localeAlternates } from '@/lib/seo';
import { createClient } from '@/lib/supabase/server';
import { myTourGuide } from '@/lib/tour-guides/queries';
import { PageHero } from '@/components/layout/page-hero';
import { Breadcrumbs } from '@/components/layout/breadcrumbs';
import { Button } from '@/components/ui/button';
import { GuideForm } from '@/components/tour-guides/guide-form';

export async function generateMetadata({ params }: { params: Promise<LocaleParams> }): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'tourGuides' });
  return { title: t('joinMetaTitle'), description: t('joinMetaDescription'), alternates: localeAlternates('/tour-guides/join', locale) };
}

/**
 * Where a local guide joins: free, from a phone, in one form. Signed out, the
 * page says what they get and asks them to make an account first (the
 * listing, the enquiries and the verification all hang off it).
 */
export default async function JoinAsGuidePage({ params }: { params: Promise<LocaleParams> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations('tourGuides');
  const {
    data: { user },
  } = await (await createClient()).auth.getUser();
  const guide = user ? await myTourGuide() : null;
  const next = encodeURIComponent(getPathname({ href: '/tour-guides/join', locale }));

  const perks = [
    { Icon: UserPlus, key: 'perkFree' },
    { Icon: MessageCircle, key: 'perkRequests' },
    { Icon: BadgeCheck, key: 'perkVerified' },
    { Icon: Banknote, key: 'perkFee' },
  ] as const;

  return (
    <>
      <PageHero
        breadcrumbs={
          <Breadcrumbs
            locale={locale}
            items={[{ label: 'Explore Tanzania', href: '/' }, { label: t('groupTripsCrumb'), href: '/group-trips' }, { label: t('joinCrumb') }]}
          />
        }
        icon={UserPlus}
        eyebrow={t('joinEyebrow')}
        title={guide ? t('editTitle') : t('joinTitle')}
        lead={t('joinLead')}
      />
      <div className="container-page grid gap-8 py-6 sm:py-10 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <div>
          {!user ? (
            <div className="rounded-2xl border bg-card p-5">
              <p className="font-semibold">{t('signInFirst')}</p>
              <p className="mt-1 text-body-sm text-muted-foreground">{t('signInFirstBody')}</p>
              <div className="mt-4 flex flex-wrap gap-2">
                <Button asChild size="lg">
                  <a href={`${getPathname({ href: '/register', locale })}?next=${next}`}>{t('createAccount')}</a>
                </Button>
                <Button asChild size="lg" variant="outline">
                  <a href={`${getPathname({ href: '/login', locale })}?next=${next}`}>{t('signIn')}</a>
                </Button>
              </div>
            </div>
          ) : (
            <>
              {guide && (
                <div className="mb-5 flex flex-wrap items-center justify-between gap-3 rounded-2xl border bg-card p-4">
                  <p className="text-body-sm">
                    {t('statusLine', { status: t(`status.${guide.verificationStatus}`) })}
                  </p>
                  <Button asChild size="sm" variant={guide.verificationStatus === 'verified' ? 'outline' : 'primary'}>
                    <Link href="/tour-guides/verify">{t('goVerify')}</Link>
                  </Button>
                </div>
              )}
              <GuideForm guide={guide} defaultEmail={user.email} />
            </>
          )}
        </div>
        <aside className="space-y-3">
          {perks.map(({ Icon, key }) => (
            <div key={key} className="flex gap-3 rounded-2xl border bg-card p-4">
              <Icon className="size-5 shrink-0 text-primary" aria-hidden />
              <div>
                <p className="font-semibold">{t(`${key}.title`)}</p>
                <p className="text-body-sm text-muted-foreground">{t(`${key}.body`)}</p>
              </div>
            </div>
          ))}
        </aside>
      </div>
    </>
  );
}
