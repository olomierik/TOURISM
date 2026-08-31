import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { ArrowRight, MessageSquare, Store } from 'lucide-react';

import { locales, type LocaleParams } from '@/i18n/routing';
import { Link } from '@/i18n/navigation';
import { localeAlternates } from '@/lib/seo';
import { currentReferer } from '@/lib/contact/actions';
import { ContactForm } from '@/components/contact/contact-form';

export async function generateStaticParams() {
  return locales.map((locale) => ({ locale }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<LocaleParams>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'contact' });

  return {
    title: t('metaTitle'),
    description: t('metaDescription'),
    alternates: localeAlternates('/contact', locale),
  };
}

/**
 * Contact.
 *
 * The two routes above the form exist because most people who click "contact"
 * on a travel directory want something the form is a worse way of getting. A
 * traveller wants quotes, and the quote form reaches operators directly. An
 * operator wants their listing, and the claim flow verifies them in minutes.
 * Sending either of those through a general inbox adds a day and a person.
 *
 * What is left over — a wrong price on a listing, a takedown, a data request,
 * a bug — is what the form is for, and it lands in an admin inbox that someone
 * actually opens rather than in an email account nobody has configured yet.
 */
export default async function ContactPage({ params }: { params: Promise<LocaleParams> }) {
  const { locale } = await params;
  setRequestLocale(locale);

  const [t, referer] = await Promise.all([
    getTranslations({ locale, namespace: 'contact' }),
    currentReferer(),
  ]);

  const shortcuts = [
    {
      Icon: MessageSquare,
      title: t('travellerTitle'),
      body: t('travellerBody'),
      href: '/request-quote' as const,
      cta: t('travellerCta'),
    },
    {
      Icon: Store,
      title: t('operatorTitle'),
      body: t('operatorBody'),
      href: '/directory' as const,
      cta: t('operatorCta'),
    },
  ];

  return (
    <div className="container-page py-section">
      <header className="mx-auto max-w-2xl">
        <h1 className="font-display text-3xl font-semibold sm:text-4xl">{t('h1')}</h1>
        <p className="mt-5 leading-relaxed text-muted-foreground">{t('lede')}</p>
      </header>

      <div className="mx-auto mt-10 max-w-2xl space-y-8">
        <ul className="grid gap-4 sm:grid-cols-2">
          {shortcuts.map(({ Icon, title, body, href, cta }) => (
            <li key={title} className="flex flex-col rounded-xl border p-5">
              <Icon className="size-5 text-primary" aria-hidden />
              <h2 className="mt-3 font-medium">{title}</h2>
              <p className="mt-1.5 flex-1 text-sm leading-relaxed text-muted-foreground">
                {body}
              </p>
              <Link
                href={href}
                className="mt-4 flex items-center gap-1.5 text-sm font-medium text-primary hover:underline"
              >
                {cta}
                <ArrowRight className="size-3.5" aria-hidden />
              </Link>
            </li>
          ))}
        </ul>

        <div>
          <h2 className="font-display text-xl font-semibold">{t('formTitle')}</h2>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{t('formBody')}</p>
          <div className="mt-5">
            <ContactForm locale={locale} sourceUrl={referer} />
          </div>
        </div>

        <p className="text-xs leading-relaxed text-muted-foreground">{t('privacyNote')}</p>
      </div>
    </div>
  );
}
