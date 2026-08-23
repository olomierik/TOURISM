import type { Metadata } from 'next';
import { Suspense } from 'react';
import { getTranslations, setRequestLocale } from 'next-intl/server';

import type { LocaleParams } from '@/i18n/routing';
import { localeAlternates } from '@/lib/seo';
import { RegisterForm } from '@/components/auth/register-form';
import { SocialButtons } from '@/components/auth/social-buttons';
import { enabledProviders } from '@/lib/auth/providers';
import { Logo } from '@/components/layout/logo';

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
    <div className="container-page flex min-h-[70svh] items-center justify-center py-section">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <Logo className="mx-auto" />
          <h1 className="mt-6 text-3xl font-semibold">{t('title')}</h1>
          <p className="mt-3 text-muted-foreground">{t('subtitle')}</p>
        </div>
        {/* SocialButtons reads searchParams for the post-login destination, so
            it needs a boundary to keep this page statically rendered. */}
        <Suspense fallback={<div className="h-28" />}>
          <SocialButtons providers={providers} />
        </Suspense>
        <RegisterForm />
      </div>
    </div>
  );
}
