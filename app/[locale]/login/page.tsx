import type { Metadata } from 'next';
import { Suspense } from 'react';
import { getTranslations, setRequestLocale } from 'next-intl/server';

import type { LocaleParams } from '@/i18n/routing';
import { localeAlternates } from '@/lib/seo';
import { LoginForm } from '@/components/auth/login-form';
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
    title: t('login'),
    alternates: localeAlternates('/login', locale),
    // Auth pages carry no SEO value and should not appear in results.
    robots: { index: false, follow: false },
  };
}

export default async function LoginPage({
  params,
}: {
  params: Promise<LocaleParams>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const [t, providers] = await Promise.all([
    getTranslations('auth.login'),
    enabledProviders(),
  ]);

  return (
    <AuthShell title={t('title')} subtitle={t('subtitle')}>
      {/* useSearchParams needs a Suspense boundary to keep this page static. */}
      <Suspense fallback={<div className="h-96" />}>
        <SocialButtons providers={providers} />
        <LoginForm />
      </Suspense>
    </AuthShell>
  );
}
