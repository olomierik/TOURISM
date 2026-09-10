import type { Metadata } from 'next';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import type { User } from '@supabase/supabase-js';

import type { LocaleParams } from '@/i18n/routing';
import { createClient } from '@/lib/supabase/server';
import { AccountForm } from '@/components/auth/account-form';
import { Badge } from '@/components/ui/badge';
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

  let user: User | null = authUser;
  let profile: Tables<'profiles'> | null = null;

  if (user) {
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();
    profile = data;
  }

  if (!user || !profile) {
    const cookieStore = await cookies();
    const demoCookie = cookieStore.get('demo_user');
    if (demoCookie) {
      try {
        const demo = JSON.parse(demoCookie.value);
        user = {
          id: 'demo-user-id',
          email: demo.email || 'traveler@exploretanzania.com',
          app_metadata: {},
          user_metadata: { full_name: demo.fullName || 'Demo User' },
          aud: 'authenticated',
          created_at: new Date().toISOString(),
        } as User;
        profile = {
          id: 'demo-user-id',
          email: user.email ?? null,
          full_name: demo.fullName || 'Demo User',
          role: (demo.role || 'traveler') as Tables<'profiles'>['role'],
          phone: '+255 700 000 000',
          whatsapp: null,
          avatar_url: null,
          locale,
          marketing_opt_in: false,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          deleted_at: null,
        };
      } catch {
        // ignore
      }
    }
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
