import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { BadgeCheck, Compass, LayoutDashboard, Mail, Store } from 'lucide-react';

import { locales, type LocaleParams } from '@/i18n/routing';
import { Link } from '@/i18n/navigation';
import { createClient } from '@/lib/supabase/server';
import { Button } from '@/components/ui/button';

export async function generateMetadata({
  params,
}: {
  params: Promise<LocaleParams>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'auth.welcome' });
  return {
    title: t('title'),
    // Nothing here is worth indexing and the URL is reached once, from a link
    // in an email, by one person.
    robots: { index: false, follow: false },
  };
}

export function generateStaticParams() {
  return locales.map((locale) => ({ locale }));
}

/**
 * Where a confirmed email address lands.
 *
 * Deliberately not "please sign in now". Confirming consumes a one-time token
 * through /auth/confirm, and verifying it establishes a session — the person
 * *is* signed in by the time they read this. Asking them to sign in again would
 * be asking for a password they have already proven they own, and it is the
 * step where people give up.
 *
 * So the page reads the session and offers the next real thing: the dashboard
 * for an operator, the account for a traveller. It still handles the signed-out
 * case, because a link opened in a different browser from the one that
 * requested it verifies the address without carrying a session back.
 */
export default async function WelcomePage({ params }: { params: Promise<LocaleParams> }) {
  const { locale } = await params;
  setRequestLocale(locale);

  const t = await getTranslations({ locale, namespace: 'auth.welcome' });

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const role = user
    ? ((
        await supabase.from('profiles').select('role').eq('id', user.id).single()
      ).data?.role ?? 'traveler')
    : null;

  const isOwner = role === 'business_owner';

  return (
    <div className="container-page flex min-h-[60vh] items-center py-16">
      <div className="mx-auto max-w-xl text-center">
        <div className="mx-auto flex size-16 items-center justify-center rounded-full bg-success/12">
          <BadgeCheck className="size-8 text-success" aria-hidden />
        </div>

        <h1 className="mt-6 font-display text-3xl font-semibold sm:text-4xl">{t('title')}</h1>
        <p className="mt-4 text-lg leading-relaxed text-muted-foreground">
          {user ? t('bodySignedIn') : t('bodySignedOut')}
        </p>

        <div className="mt-8 flex flex-wrap justify-center gap-3">
          {user ? (
            <>
              <Button asChild size="lg">
                <Link href={isOwner ? '/dashboard' : '/account'}>
                  {isOwner ? (
                    <LayoutDashboard className="size-4" aria-hidden />
                  ) : (
                    <Compass className="size-4" aria-hidden />
                  )}
                  {isOwner ? t('toDashboard') : t('toAccount')}
                </Link>
              </Button>
              <Button asChild size="lg" variant="outline">
                <Link href={isOwner ? '/dashboard/profile' : '/directory'}>
                  {isOwner ? (
                    <Store className="size-4" aria-hidden />
                  ) : (
                    <Compass className="size-4" aria-hidden />
                  )}
                  {isOwner ? t('completeListing') : t('browse')}
                </Link>
              </Button>
            </>
          ) : (
            <Button asChild size="lg">
              <Link href="/login">
                <Mail className="size-4" aria-hidden />
                {t('signIn')}
              </Link>
            </Button>
          )}
        </div>

        {/* Said once, quietly. An operator who confirms and stops here has a
            listing nobody can find, and this is the last moment anyone has
            their attention. */}
        {user && isOwner && (
          <p className="mt-8 rounded-xl border border-dashed p-4 text-sm text-muted-foreground">
            {t('ownerHint')}
          </p>
        )}
      </div>
    </div>
  );
}
