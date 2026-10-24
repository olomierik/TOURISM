'use client';

import { useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { CheckCircle2, MessageCircle } from 'lucide-react';

import { Link } from '@/i18n/navigation';
import { Button } from '@/components/ui/button';
import { QuoteForm } from '@/components/quote/quote-form';
import type { QuoteState } from '@/lib/leads/actions';
import { whatsappHref } from '@/lib/contact/whatsapp';
import type { CategorySummary, DestinationSummary } from '@/lib/queries/taxonomy';

/**
 * Owns the form/confirmation swap.
 *
 * The confirmation replaces the form rather than appearing beside it: once the
 * enquiry is sent there is nothing left to edit, and leaving a filled form on
 * screen invites a duplicate submission.
 */
export function QuoteFlow({
  destinations,
  categories,
  defaults,
  isSignedIn,
}: {
  destinations: DestinationSummary[];
  categories: CategorySummary[];
  defaults: {
    destination?: string;
    category?: string;
    sourceUrl?: string;
    /**
     * Seeded by the homepage trip planner. The hero asks the three questions
     * everyone can answer standing up — where, when, how many — and hands them
     * here rather than asking again. A form that re-asks what someone just typed
     * is where people leave.
     */
    travelStart?: string;
    travelEnd?: string;
    adults?: string;
    children?: string;
    interests?: string[];
    /** The itinerary, written out by the cost estimator. */
    message?: string;
  };
  isSignedIn: boolean;
}) {
  const t = useTranslations('quote');
  const locale = useLocale();
  const [result, setResult] = useState<QuoteState | null>(null);

  if (result?.reference) {
    return (
      <div className="text-center">
        <div className="mx-auto flex size-16 items-center justify-center rounded-2xl bg-success/10">
          <CheckCircle2 className="size-8 text-success" aria-hidden />
        </div>

        <h2 className="mt-8 text-3xl font-semibold">{t('successTitle')}</h2>

        <p className="mt-4 text-lg text-muted-foreground">
          {t('successMatched', { count: result.matched ?? 0 })}
        </p>

        <p className="mt-6 inline-block rounded-lg bg-muted px-4 py-2 font-mono text-sm">
          {t('successReference', { reference: result.reference })}
        </p>

        <p className="mx-auto mt-6 max-w-md leading-relaxed text-muted-foreground">
          {t('successBody')}
        </p>

        {/* WhatsApp first: many operators answer a message there before they
            open an email. Each button quotes the reference, so the operator can
            find the enquiry, and counts as a contact in their analytics. */}
        {result.whatsapp && result.whatsapp.length > 0 && (
          <div className="mx-auto mt-8 max-w-md rounded-2xl border border-success/30 bg-success/5 p-5 text-left">
            <p className="flex items-center gap-2 font-semibold">
              <MessageCircle className="size-4 text-success" aria-hidden />
              {t('whatsappTitle')}
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              {t('whatsappBody', { reference: result.reference })}
            </p>
            <ul className="mt-4 space-y-2">
              {result.whatsapp.map((op) => (
                <li key={op.businessId}>
                  <a
                    href={whatsappHref(op.businessId, 'enquiry', locale, { reference: result.reference })}
                    target="_blank"
                    rel="nofollow noopener noreferrer"
                    className="flex items-center justify-between gap-3 rounded-xl border bg-card px-4 py-2.5 text-sm font-medium transition-colors hover:border-success/50 hover:bg-success/10"
                  >
                    <span className="truncate">{op.name}</span>
                    <span className="flex shrink-0 items-center gap-1.5 text-success">
                      <MessageCircle className="size-3.5" aria-hidden />
                      {t('whatsappChat')}
                    </span>
                  </a>
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="mt-9 flex flex-wrap justify-center gap-3">
          <Button asChild size="lg">
            <Link href="/directory">{t('successBrowse')}</Link>
          </Button>
          {/* Only offered to signed-in travelers: a guest following this link
              would hit the login wall immediately after a successful action. */}
          {isSignedIn && (
            <Button asChild variant="outline" size="lg">
              <Link href="/account/enquiries">{t('successAccount')}</Link>
            </Button>
          )}
        </div>
      </div>
    );
  }

  return (
    <QuoteForm
      destinations={destinations}
      categories={categories}
      defaults={defaults}
      onSuccess={setResult}
    />
  );
}
