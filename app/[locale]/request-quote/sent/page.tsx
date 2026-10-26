import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { CheckCircle2 } from 'lucide-react';

import type { LocaleParams } from '@/i18n/routing';
import { Link } from '@/i18n/navigation';
import { Button } from '@/components/ui/button';
import { WhatsAppGlyph } from '@/components/ui/whatsapp-glyph';
import { GuideCard } from '@/components/cards/guide-card';
import { getGuides } from '@/lib/queries/guides';
import { createClient } from '@/lib/supabase/server';

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export async function generateMetadata({
  params,
}: {
  params: Promise<LocaleParams>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'quoteSent' });
  return {
    title: t('title'),
    // Never indexed: it is a per-person confirmation reached only by sending
    // something, and a search result leading here would be a page about an
    // enquiry the searcher did not make.
    robots: { index: false, follow: false },
  };
}

const first = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);

/**
 * Quote sent — design.md §7.7, "Submit and confirmation".
 *
 *   success heading `heading-xl` "Request sent"
 *   what happens next (3-step timeline with times)
 *   "Reply notifications on WhatsApp" opt-in
 *   a link to "My quotes"
 *   a suggested guide
 *
 * Its own route rather than a state swap inside the form, which is what §7.7
 * asks for and what makes three things work: the success is a URL that can be
 * measured as a conversion, a reload does not offer to resubmit the enquiry,
 * and the back button goes to the page before the form rather than to a filled
 * form that would send a duplicate.
 *
 * The timeline carries real times — within an hour, within a day — because
 * §8.2 wants numbers over adjectives, and because the single most common
 * question after sending an enquiry is "when will I hear back".
 */
export default async function QuoteSentPage({
  params,
  searchParams,
}: {
  params: Promise<LocaleParams>;
  searchParams: SearchParams;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const sp = await searchParams;
  const reference = first(sp.ref);
  const matched = Number(first(sp.matched) ?? '0') || 0;

  const [t, guides] = await Promise.all([
    getTranslations('quoteSent'),
    getGuides(locale, { limit: 1 }),
  ]);

  // Only offered to signed-in travellers: a guest following "my requests"
  // would hit the sign-in wall immediately after a successful action.
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const steps = [
    { when: t('next1'), body: t('next1Body') },
    { when: t('next2'), body: t('next2Body') },
    { when: t('next3'), body: t('next3Body') },
  ];

  return (
    <main className="container-page py-12 sm:py-16">
      <div className="mx-auto w-full max-w-[40rem]">
        <span className="flex size-14 items-center justify-center rounded-pill bg-[var(--success-50)]">
          <CheckCircle2 className="size-7 text-[var(--success-800)]" aria-hidden />
        </span>

        <h1 className="mt-5 font-display text-heading-xl">{t('title')}</h1>
        <p className="mt-2 text-body-lg text-muted-foreground">{t('matched', { count: matched })}</p>

        {reference && (
          <p className="mt-4 inline-block rounded-sm bg-surface-sunken px-3 py-1.5 font-mono text-body-sm">
            {t('reference', { reference })}
          </p>
        )}

        <h2 className="mt-10 text-heading-md font-semibold">{t('nextTitle')}</h2>
        <ol className="mt-4 space-y-4">
          {steps.map((s, i) => (
            <li key={s.when} className="flex gap-3.5">
              <span
                className="flex size-8 shrink-0 items-center justify-center rounded-pill bg-primary-subtle text-body-sm font-semibold tabular-nums text-primary"
                aria-hidden
              >
                {i + 1}
              </span>
              <span className="min-w-0">
                <span className="block text-body font-semibold">{s.when}</span>
                <span className="mt-0.5 block text-body-sm text-muted-foreground">{s.body}</span>
              </span>
            </li>
          ))}
        </ol>

        {/* §7.7's WhatsApp opt-in, stated as what it actually is. There is no
            notification service here to subscribe to — the operators reply on
            WhatsApp when a traveller messages them first — so this says that
            rather than offering a toggle that would do nothing. */}
        <div className="mt-8 flex gap-3 rounded-lg border bg-surface-muted p-4">
          <WhatsAppGlyph className="mt-0.5 size-5 shrink-0 text-[var(--success-800)]" />
          <div className="min-w-0">
            <p className="text-body font-semibold">{t('whatsappOptIn')}</p>
            <p className="mt-0.5 text-body-sm text-muted-foreground">{t('whatsappOptInBody')}</p>
          </div>
        </div>

        <div className="mt-8 flex flex-wrap gap-3">
          {user && (
            <Button asChild size="lg">
              <Link href="/account/enquiries">{t('myQuotes')}</Link>
            </Button>
          )}
          <Button asChild variant={user ? 'secondary' : 'primary'} size="lg">
            <Link href="/directory">{t('browse')}</Link>
          </Button>
        </div>

        {guides.length > 0 && (
          <section className="mt-12 border-t pt-8">
            <h2 className="mb-4 text-heading-md font-semibold">{t('guideTitle')}</h2>
            <GuideCard guide={guides[0]} />
          </section>
        )}
      </div>
    </main>
  );
}
