import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';

import { locales, type LocaleParams } from '@/i18n/routing';
import { localeAlternates } from '@/lib/seo';
import { OPERATOR_TERMS } from '@/lib/legal/content';
import { LegalDocumentView } from '@/components/legal/legal-document';

/**
 * Terms for operators: the 10% rate markup, paid enquiries, credit, refunds
 * of credit and how ranking works. Published before enquiries are charged,
 * so an operator can read what they are agreeing to before it costs anything.
 */
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
    title: t('operatorTerms'),
    description: OPERATOR_TERMS.intro,
    alternates: localeAlternates('/operator-terms', locale),
  };
}

export default async function Page({ params }: { params: Promise<LocaleParams> }) {
  const { locale } = await params;
  setRequestLocale(locale);

  return <LegalDocumentView doc={OPERATOR_TERMS} locale={locale} />;
}
