'use client';

import { useState, useTransition } from 'react';
import { useFormatter, useTranslations } from 'next-intl';
import {
  CalendarDays,
  Check,
  Mail,
  MessageCircle,
  Trophy,
  Users,
  Wallet,
  X,
} from 'lucide-react';

import { updateLeadStatus, markLeadViewed } from '@/lib/dashboard/actions';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { formatPrice, whatsappLink } from '@/lib/format';
import type { LeadInboxItem } from '@/lib/queries/dashboard';
import type { Locale } from '@/i18n/routing';
import type { Enums } from '@/lib/supabase/database.types';
import { cn } from '@/lib/utils';

type InterestKey = Parameters<ReturnType<typeof useTranslations<'interests'>>>[0];

const STATUS_KEY: Record<Enums<'lead_business_status'>, string> = {
  sent: 'leadStatusSent',
  viewed: 'leadStatusViewed',
  responded: 'leadStatusResponded',
  quoted: 'leadStatusQuoted',
  won: 'leadStatusWon',
  lost: 'leadStatusLost',
  declined: 'leadStatusDeclined',
};

export function LeadCard({ lead, locale }: { lead: LeadInboxItem; locale: Locale }) {
  const t = useTranslations('dashboard');
  const tInterests = useTranslations('interests');
  const format = useFormatter();
  const [status, setStatus] = useState(lead.status);
  const [expanded, setExpanded] = useState(lead.status === 'sent');
  const [pending, startTransition] = useTransition();

  function setLeadStatus(next: Enums<'lead_business_status'>) {
    setStatus(next);
    startTransition(() => void updateLeadStatus(lead.id, next));
  }

  function onExpand() {
    const next = !expanded;
    setExpanded(next);
    // Opening a lead marks it read, but only from 'sent'. The action filters on
    // that server-side too, so re-opening a lead already quoted never resets it.
    if (next && status === 'sent') {
      setStatus('viewed');
      startTransition(() => void markLeadViewed(lead.id));
    }
  }

  const isNew = status === 'sent';
  const contactNumber = lead.whatsapp ?? lead.phone;
  // Returns null when the stored number has no digits at all, so the button is
  // gated on the resolved link rather than on the raw field being present.
  const waHref = contactNumber ? whatsappLink(contactNumber, `${lead.reference}: `) : null;

  return (
    <article
      className={cn(
        'rounded-2xl border bg-card transition-colors',
        isNew && 'border-primary/40 bg-primary/[0.03]',
      )}
    >
      <button
        type="button"
        onClick={onExpand}
        aria-expanded={expanded}
        className="flex w-full items-start justify-between gap-4 p-5 text-left"
      >
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-mono text-xs text-muted-foreground">
              {lead.reference}
            </span>
            <Badge variant={isNew ? 'default' : 'secondary'}>
              {t(STATUS_KEY[status] as 'leadStatusSent')}
            </Badge>
            {/* Quality is shown to the operator so the ranking is explicable
                rather than mysterious — they can see why a lead reached them. */}
            {lead.qualityScore >= 70 && (
              <Badge variant="verified">
                {t('leadQuality')} {lead.qualityScore}
              </Badge>
            )}
          </div>

          <h3 className="mt-2 font-display text-lg font-semibold">
            {lead.destinationName ?? lead.fullName}
          </h3>

          <p className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
            <span className="flex items-center gap-1">
              <Users className="size-3.5" aria-hidden />
              {lead.adults + lead.children}
            </span>
            {lead.travelStart && (
              <span className="flex items-center gap-1">
                <CalendarDays className="size-3.5" aria-hidden />
                {format.dateTime(new Date(lead.travelStart), 'long')}
              </span>
            )}
            {(lead.budgetMin ?? lead.budgetMax) !== null && (
              <span className="flex items-center gap-1">
                <Wallet className="size-3.5" aria-hidden />
                {formatPrice(lead.budgetMin ?? lead.budgetMax ?? 0, lead.budgetCurrency, locale)}
                {lead.budgetMax && lead.budgetMin ? '+' : ''}
              </span>
            )}
          </p>
        </div>

        <span className="shrink-0 text-xs text-muted-foreground">
          {format.relativeTime(new Date(lead.sentAt))}
        </span>
      </button>

      {expanded && (
        <div className="border-t px-5 pb-5 pt-4">
          <dl className="grid gap-4 sm:grid-cols-2">
            <div>
              <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                {t('leadFrom')}
              </dt>
              <dd className="mt-1">{lead.fullName}</dd>
              <dd className="text-sm text-muted-foreground">{lead.email}</dd>
              {contactNumber && (
                <dd className="text-sm text-muted-foreground">{contactNumber}</dd>
              )}
            </div>

            {lead.travelStart && (
              <div>
                <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  {t('leadDates')}
                </dt>
                <dd className="mt-1">
                  {format.dateTime(new Date(lead.travelStart), 'long')}
                  {lead.travelEnd &&
                    ` – ${format.dateTime(new Date(lead.travelEnd), 'long')}`}
                  {lead.datesFlexible && (
                    <span className="ml-2 text-sm text-muted-foreground">
                      ({t('leadFlexible')})
                    </span>
                  )}
                </dd>
              </div>
            )}

            {lead.interests.length > 0 && (
              <div className="sm:col-span-2">
                <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  {t('leadInterests')}
                </dt>
                <dd className="mt-1.5 flex flex-wrap gap-1.5">
                  {lead.interests.map((i) => (
                    <Badge key={i} variant="secondary">
                      {/* Interests come from a fixed key list, but a value stored
                          by an older version of the form should render as-is
                          rather than crashing the page. The cast is guarded by
                          `has`, which is exactly what it is for. */}
                      {tInterests.has(i as InterestKey) ? tInterests(i as InterestKey) : i}
                    </Badge>
                  ))}
                </dd>
              </div>
            )}

            {lead.message && (
              <div className="sm:col-span-2">
                <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  {t('leadMessage')}
                </dt>
                <dd className="mt-1.5 whitespace-pre-line rounded-lg bg-muted/60 p-4 text-sm leading-relaxed">
                  {lead.message}
                </dd>
              </div>
            )}
          </dl>

          <p className="mt-4 text-xs text-muted-foreground">
            {t('leadRank', { rank: lead.rank })}
          </p>

          <div className="mt-5 flex flex-wrap gap-2">
            {waHref && (
              <Button asChild size="sm">
                <a href={waHref} target="_blank" rel="noopener noreferrer">
                  <MessageCircle className="size-3.5" aria-hidden />
                  {t('replyWhatsapp')}
                </a>
              </Button>
            )}
            <Button asChild size="sm" variant="outline">
              <a href={`mailto:${lead.email}?subject=${encodeURIComponent(lead.reference)}`}>
                <Mail className="size-3.5" aria-hidden />
                {t('replyEmail')}
              </a>
            </Button>
          </div>

          <div className="mt-4 flex flex-wrap gap-2 border-t pt-4">
            {status !== 'responded' && status !== 'quoted' && status !== 'won' && (
              <Button
                size="sm"
                variant="ghost"
                disabled={pending}
                onClick={() => setLeadStatus('responded')}
              >
                <Check className="size-3.5" aria-hidden />
                {t('markReplied')}
              </Button>
            )}
            {status !== 'quoted' && status !== 'won' && (
              <Button
                size="sm"
                variant="ghost"
                disabled={pending}
                onClick={() => setLeadStatus('quoted')}
              >
                {t('markQuoted')}
              </Button>
            )}
            {status !== 'won' && (
              <Button
                size="sm"
                variant="ghost"
                disabled={pending}
                onClick={() => setLeadStatus('won')}
              >
                <Trophy className="size-3.5" aria-hidden />
                {t('markWon')}
              </Button>
            )}
            {status !== 'lost' && status !== 'won' && (
              <Button
                size="sm"
                variant="ghost"
                className="text-muted-foreground"
                disabled={pending}
                onClick={() => setLeadStatus('lost')}
              >
                <X className="size-3.5" aria-hidden />
                {t('markLost')}
              </Button>
            )}
          </div>
        </div>
      )}
    </article>
  );
}
