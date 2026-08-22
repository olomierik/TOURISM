import type { Metadata } from 'next';
import { Suspense } from 'react';
import { getTranslations, setRequestLocale } from 'next-intl/server';

import type { LocaleParams } from '@/i18n/routing';
import { localeAlternates } from '@/lib/seo';
import { LoginForm } from '@/components/auth/login-form';
import { Logo } from '@/components/layout/logo';

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
  const t = await getTranslations('auth.login');

  return (
    <div className="container-page flex min-h-[70svh] items-center justify-center py-section">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <Logo className="mx-auto" />
          <h1 className="mt-6 text-3xl font-semibold">{t('title')}</h1>
          <p className="mt-3 text-muted-foreground">{t('subtitle')}</p>
        </div>
        {/* useSearchParams needs a Suspense boundary to keep this page static. */}
        <Suspense fallback={<div className="h-72" />}>
          <LoginForm />
        </Suspense>
      </div>
    </div>
  );
}
