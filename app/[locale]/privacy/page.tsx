import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';

import { locales, type LocaleParams } from '@/i18n/routing';
import { localeAlternates } from '@/lib/seo';
import { PRIVACY } from '@/lib/legal/content';
import { LegalDocumentView } from '@/components/legal/legal-document';

export async function generateStaticParams() {
  return locales.map((locale) => ({ locale }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<LocaleParams>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'pageTitles' });

  return {
    title: t('privacy'),
    description: PRIVACY.intro,
    alternates: localeAlternates('/privacy', locale),
  };
}

export default async function Page({ params }: { params: Promise<LocaleParams> }) {
  const { locale } = await params;
  setRequestLocale(locale);

  return <LegalDocumentView doc={PRIVACY} locale={locale} />;
}
