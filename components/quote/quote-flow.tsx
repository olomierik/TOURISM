'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { CheckCircle2 } from 'lucide-react';

import { Link } from '@/i18n/navigation';
import { Button } from '@/components/ui/button';
import { QuoteForm } from '@/components/quote/quote-form';
import type { QuoteState } from '@/lib/leads/actions';
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
  defaults: { destination?: string; category?: string; sourceUrl?: string };
  isSignedIn: boolean;
}) {
  const t = useTranslations('quote');
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
