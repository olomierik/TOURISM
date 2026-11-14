'use client';

import { useState, useTransition } from 'react';
import { useFormatter, useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import { CalendarDays, Lock, Users, Wallet } from 'lucide-react';

import { acceptLead } from '@/lib/leads/billing';
import { updateLeadStatus } from '@/lib/dashboard/actions';
import { Link } from '@/i18n/navigation';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { formatPrice } from '@/lib/format';
import type { LeadInboxItem } from '@/lib/queries/dashboard';
import type { Locale } from '@/i18n/routing';

type InterestKey = Parameters<ReturnType<typeof useTranslations<'interests'>>>[0];

/**
 * A paid enquiry the operator has not bought yet.
 *
 * Everything an operator needs to decide is here — where, when, how many, the
 * budget, what they are interested in, what they wrote — and nothing that
 * would let them reach the traveller without buying. The message has already
 * had emails, numbers and links blanked by the database (redact_contact in
 * migration 089); this component never had them to show.
 *
 * Two actions and only two. Accept spends the price shown, which was fixed
 * when the enquiry was matched and is not recalculated here. Decline is free.
 * The status buttons on the bought card (responded, quoted, won) are absent
 * because the database refuses them on a locked lead: they would feed the
 * response rate that ranking reads.
 */
export function LockedLeadCard({ lead, locale }: { lead: LeadInboxItem; locale: Locale }) {
  const t = useTranslations('leadCredit');
  const tDash = useTranslations('dashboard');
  const tInterests = useTranslations('interests');
  const format = useFormatter();
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [declined, setDeclined] = useState(lead.status === 'declined');
  const [problem, setProblem] = useState<
    null | { kind: 'credit'; fee: number; balance: number } | { kind: 'generic' }
  >(null);

  const price = formatPrice(lead.fee, lead.feeCurrency, locale);
  const party = lead.adults + lead.children;

  function accept() {
    setProblem(null);
    startTransition(async () => {
      const r = await acceptLead(lead.id);
      if (r.ok) {
        // The traveller's details now come back from the database; a refresh
        // re-reads the inbox, and this card becomes the ordinary one.
        router.refresh();
        return;
      }
      if (r.error === 'insufficientCredit') setProblem({ kind: 'credit', fee: r.fee, balance: r.balance });
      else setProblem({ kind: 'generic' });
    });
  }

  function decline() {
    setDeclined(true);
    startTransition(() => void updateLeadStatus(lead.id, 'declined'));
  }

  if (declined) {
    return (
      <article className="rounded-2xl border bg-card p-5 opacity-70">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-mono text-xs text-muted-foreground">{lead.reference}</span>
          <Badge variant="secondary">{tDash('leadStatusDeclined')}</Badge>
        </div>
        <p className="mt-2 text-sm text-muted-foreground">{t('declinedNote')}</p>
      </article>
    );
  }

  return (
    <article className="rounded-2xl border border-primary/40 bg-primary/[0.03]">
      <div className="p-5">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-mono text-xs text-muted-foreground">{lead.reference}</span>
          <Badge>
            <Lock aria-hidden />
            {t('lockedBadge')}
          </Badge>
          <span className="ml-auto text-xs text-muted-foreground">
            {format.relativeTime(new Date(lead.sentAt))}
          </span>
        </div>

        <h3 className="mt-2 font-display text-lg font-semibold">
          {lead.destinationName ?? t('noDestination')}
        </h3>

        <p className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
          <span className="flex items-center gap-1">
            <Users className="size-3.5" aria-hidden />
            {t('party', { adults: lead.adults, children: lead.children, total: party })}
          </span>
          {lead.travelStart && (
            <span className="flex items-center gap-1">
              <CalendarDays className="size-3.5" aria-hidden />
              {lead.datesFlexible
                ? format.dateTime(new Date(lead.travelStart), { month: 'long', year: 'numeric' })
                : format.dateTime(new Date(lead.travelStart), 'long')}
            </span>
          )}
          {(lead.budgetMin !== null || lead.budgetMax !== null) && (
            <span className="flex items-center gap-1">
              <Wallet className="size-3.5" aria-hidden />
              {/* Stored by the wizard as the per-person daily band × 7. */}
              {t('budgetPerDay', {
                low: lead.budgetMin !== null ? formatPrice(Math.round(lead.budgetMin / 7), lead.budgetCurrency, locale) : '—',
                high: lead.budgetMax !== null ? formatPrice(Math.round(lead.budgetMax / 7), lead.budgetCurrency, locale) : '+',
              })}
            </span>
          )}
        </p>

        {lead.interests.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-1.5">
            {lead.interests.map((i) => (
              <Badge key={i} variant="secondary">
                {tInterests.has(i as InterestKey) ? tInterests(i as InterestKey) : i}
              </Badge>
            ))}
          </div>
        )}

        {lead.message && (
          <p className="mt-3 whitespace-pre-line rounded-lg bg-muted/60 p-3 text-sm leading-relaxed">
            {lead.message}
          </p>
        )}
      </div>

      <div className="flex flex-col gap-3 border-t px-5 py-4 sm:flex-row sm:items-center">
        <div className="min-w-0 flex-1">
          <p className="text-sm">
            {t.rich('priceLine', {
              price,
              value: formatPrice(lead.estimatedValue, lead.feeCurrency, locale),
              percent: lead.feePercent,
              b: (chunks) => <strong className="font-semibold text-foreground">{chunks}</strong>,
            })}
          </p>
          <p className="mt-0.5 text-xs text-muted-foreground">{t('unlockExplainer')}</p>
        </div>
        <div className="flex gap-2">
          <Button type="button" variant="ghost" onClick={decline} disabled={pending}>
            {t('decline')}
          </Button>
          <Button type="button" onClick={accept} loading={pending} className="max-sm:flex-1">
            {t('accept', { price })}
          </Button>
        </div>
      </div>

      {problem?.kind === 'credit' && (
        <p className="border-t bg-warning/10 px-5 py-3 text-sm" role="alert">
          {t('notEnoughCredit', {
            fee: formatPrice(problem.fee, lead.feeCurrency, locale),
            balance: formatPrice(problem.balance, lead.feeCurrency, locale),
          })}{' '}
          <Link href="/dashboard/credit" className="font-semibold text-primary underline-offset-4 hover:underline">
            {t('topUpLink')}
          </Link>
        </p>
      )}
      {problem?.kind === 'generic' && (
        <p className="border-t bg-destructive/5 px-5 py-3 text-sm" role="alert">
          {t('acceptFailed')}
        </p>
      )}
    </article>
  );
}
