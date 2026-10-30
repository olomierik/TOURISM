import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import type { User } from '@supabase/supabase-js';

import type { LocaleParams } from '@/i18n/routing';
import { createClient } from '@/lib/supabase/server';
import { AccountForm } from '@/components/auth/account-form';
import { Badge } from '@/components/ui/badge';
import { PageMasthead } from '@/components/layout/page-masthead';
import type { Tables } from '@/lib/supabase/database.types';

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
    data: { user: authUser },
  } = await supabase.auth.getUser();

  const user: User | null = authUser;
  let profile: Tables<'profiles'> | null = null;

  if (user) {
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();
    profile = data;
  }

  // The proxy already gates this route; this is defence in depth, and it also
  // narrows the type for everything below.
  if (!user || !profile) redirect('/login');

  const t = await getTranslations('auth.account');
  const roleLabel = {
    traveler: t('roleTraveler'),
    business_owner: t('roleBusinessOwner'),
    admin: t('roleAdmin'),
  }[profile.role] || t('roleTraveler');

  return (
    <>
      <PageMasthead
        containerClassName="max-w-2xl"
        title={t('title')}
        subtitle={t('subtitle')}
        meta={
          <>
            <Badge variant="secondary">{roleLabel}</Badge>
            <span className="text-sm text-muted-foreground">{user.email}</span>
          </>
        }
      />
      <div className="container-page max-w-2xl py-10 sm:py-12">
        <div className="rounded-2xl border bg-card p-5 shadow-xs sm:p-8">
          <AccountForm profile={profile} />
        </div>
      </div>
    </>
  );
}
