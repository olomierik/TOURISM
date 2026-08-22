import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { getTranslations, setRequestLocale } from 'next-intl/server';

import type { LocaleParams } from '@/i18n/routing';
import { createClient } from '@/lib/supabase/server';
import { AccountForm } from '@/components/auth/account-form';
import { Badge } from '@/components/ui/badge';

export async function generateMetadata({
  params,
}: {
  params: Promise<LocaleParams>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'pageTitles' });
  return { title: t('account'), robots: { index: false, follow: false } };
}

export default async function AccountPage({
  params,
}: {
  params: Promise<LocaleParams>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // The proxy already gates this route; this is defence in depth, and it also
  // narrows the type for everything below.
  if (!user) redirect('/login');

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single();

  if (!profile) redirect('/login');

  const t = await getTranslations('auth.account');
  const roleLabel = {
    traveler: t('roleTraveler'),
    business_owner: t('roleBusinessOwner'),
    admin: t('roleAdmin'),
  }[profile.role];

  return (
    <div className="container-page max-w-2xl py-section">
      <div className="mb-8">
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-3xl font-semibold">{t('title')}</h1>
          <Badge variant="secondary">{roleLabel}</Badge>
        </div>
        <p className="mt-3 text-muted-foreground">{t('subtitle')}</p>
        <p className="mt-1 text-sm text-muted-foreground">{user.email}</p>
      </div>

      <AccountForm profile={profile} />
    </div>
  );
}
