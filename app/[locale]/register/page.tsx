import type { Metadata } from 'next';
import { Suspense } from 'react';
import { getTranslations, setRequestLocale } from 'next-intl/server';

import type { LocaleParams } from '@/i18n/routing';
import { localeAlternates } from '@/lib/seo';
import { RegisterForm } from '@/components/auth/register-form';
import { SocialButtons } from '@/components/auth/social-buttons';
import { enabledProviders } from '@/lib/auth/providers';
import { AuthShell } from '@/components/auth/auth-shell';

export async function generateMetadata({
  params,
}: {
  params: Promise<LocaleParams>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'pageTitles' });
  return {
    title: t('register'),
    alternates: localeAlternates('/register', locale),
    robots: { index: false, follow: false },
  };
}

export default async function RegisterPage({
  params,
}: {
  params: Promise<LocaleParams>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const [t, providers] = await Promise.all([
    getTranslations('auth.register'),
    enabledProviders(),
  ]);

  return (
    <AuthShell title={t('title')} subtitle={t('subtitle')}>
      {/* SocialButtons reads searchParams for the post-login destination, so
          it needs a boundary to keep this page statically rendered. */}
      <Suspense fallback={<div className="h-28" />}>
        <SocialButtons providers={providers} />
      </Suspense>
      <Suspense fallback={<div className="h-96" />}>
        <RegisterForm />
      </Suspense>
    </AuthShell>
  );
}
