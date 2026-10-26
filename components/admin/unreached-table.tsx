'use client';

import * as React from 'react';
import { useActionState } from 'react';
import { AlertTriangle, CheckCircle2, Loader2, Mail, Phone } from 'lucide-react';

import { Link } from '@/i18n/navigation';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { WhatsAppGlyph } from '@/components/ui/whatsapp-glyph';
import { sendOneOutreach, type SendOneState } from '@/lib/outreach/send-one';
import { cn } from '@/lib/utils';

export type UnreachedState =
  | 'never'
  | 'failed'
  | 'bounced'
  | 'no-address'
  | 'staged'
  | 'sent';

export type UnreachedRow = {
  id: string;
  slug: string;
  name: string;
  email: string | null;
  phone: string | null;
  whatsapp: string | null;
  countryCode: string | null;
  city: string | null;
  state: UnreachedState;
  error: string | null;
  batch: string | null;
  sentAt: string | null;
};

const TABS: { key: UnreachedState; label: string; help: string }[] = [
  { key: 'never', label: 'Never contacted', help: 'Has an address, no message staged yet.' },
  { key: 'failed', label: 'Failed', help: 'The provider rejected it. Usually a dead address.' },
  { key: 'bounced', label: 'Bounced', help: 'Accepted, then rejected by the recipient.' },
  { key: 'staged', label: 'Staged', help: 'Drafted or queued, not sent.' },
  { key: 'no-address', label: 'No address', help: 'We hold no email. Email cannot reach these.' },
  { key: 'sent', label: 'Sent', help: 'Delivered to the provider. No reply yet.' },
];

/**
 * The list, and a Send now beside each row.
 *
 * Sending one at a time is the point rather than a limitation. The bulk path is
 * two scripts with an explicit --confirm precisely so a wrong filter cannot
 * reach four hundred businesses before anyone notices; a button that sends one
 * message to one named operator, on a page showing that operator's address,
 * cannot become four hundred by accident. What it adds is the case the scripts
 * handle badly — a failure to retry, a corrected address, one operator worth
 * contacting now.
 *
 * Each row owns its own action state, so a failure reports against the row it
 * belongs to rather than as a banner that could mean any of fifty.
 */
export function UnreachedTable({
  rows,
  counts,
  filter,
  page,
  totalPages,
  total,
  country,
  dominantError,
}: {
  rows: UnreachedRow[];
  counts: Record<UnreachedState, number>;
  filter: string;
  page: number;
  totalPages: number;
  total: number;
  country: string;
  /** One error accounting for most failures — a broken setting, not bad data. */
  dominantError: { error: string; count: number } | null;
}) {
  const tab = TABS.find((t) => t.key === filter) ?? TABS[0];

  return (
    <div className="space-y-5">
      <nav className="flex flex-wrap gap-2" aria-label="Filter by state">
        {TABS.map((t) => (
          <Link
            key={t.key}
            href={{
              pathname: '/admin/outreach/unreached',
              query: { filter: t.key, ...(country ? { country } : {}) },
            }}
            aria-current={t.key === filter ? 'page' : undefined}
            className={cn(
              'inline-flex h-10 items-center gap-2 rounded-pill px-4 text-body-sm font-semibold',
              t.key === filter
                ? 'bg-primary text-primary-foreground'
                : 'border-control bg-surface text-foreground hover:bg-secondary',
            )}
          >
            {t.label}
            <span className="tabular-nums opacity-70">{counts[t.key]}</span>
          </Link>
        ))}
      </nav>

      <p className="text-body-sm text-muted-foreground">{tab.help}</p>

      {dominantError && (
        <div className="flex gap-3 rounded-lg border border-[var(--warning-800)]/30 bg-[var(--warning-50)] p-4">
          <AlertTriangle className="mt-0.5 size-5 shrink-0 text-[var(--warning-800)]" aria-hidden />
          <div className="min-w-0 text-body-sm">
            <p className="font-semibold text-[var(--warning-800)]">
              {dominantError.count} failures share one error: {dominantError.error}
            </p>
            <p className="mt-1 text-muted-foreground">
              {/^4\d\d: API key/i.test(dominantError.error)
                ? 'The sending credential is wrong, so these addresses were never actually tried. Fix RESEND_API_KEY and retry — none of them is a bad address.'
                : 'One cause, many rows. Worth fixing before retrying any of them individually.'}
            </p>
          </div>
        </div>
      )}

      {rows.length === 0 ? (
        <p className="rounded-lg border bg-surface p-8 text-center text-body text-muted-foreground">
          Nothing in this group.
        </p>
      ) : (
        <ul className="divide-y rounded-lg border bg-surface">
          {rows.map((row) => (
            <Row key={row.id} row={row} />
          ))}
        </ul>
      )}

      {totalPages > 1 && (
        <nav className="flex items-center justify-between gap-4" aria-label="Pagination">
          {page > 1 ? (
            <Button asChild variant="secondary">
              <Link
                href={{
                  pathname: '/admin/outreach/unreached',
                  query: { filter, page: String(page - 1), ...(country ? { country } : {}) },
                }}
              >
                Previous
              </Link>
            </Button>
          ) : (
            <span />
          )}
          <span className="text-body-sm tabular-nums text-muted-foreground">
            Page {page} of {totalPages} · {total} listings
          </span>
          {page < totalPages ? (
            <Button asChild variant="secondary">
              <Link
                href={{
                  pathname: '/admin/outreach/unreached',
                  query: { filter, page: String(page + 1), ...(country ? { country } : {}) },
                }}
              >
                Next
              </Link>
            </Button>
          ) : (
            <span />
          )}
        </nav>
      )}
    </div>
  );
}

function Row({ row }: { row: UnreachedRow }) {
  const [state, action, pending] = useActionState<SendOneState, FormData>(
    sendOneOutreach,
    {},
  );
  const canSend = Boolean(row.email) && row.state !== 'sent';

  return (
    <li className="flex flex-wrap items-start gap-x-4 gap-y-2 p-4">
      <div className="min-w-0 flex-1">
        <p className="flex flex-wrap items-center gap-2">
          <a
            href={`/business/${row.slug}`}
            target="_blank"
            rel="noreferrer"
            className="text-body font-semibold hover:text-primary"
          >
            {row.name}
          </a>
          {row.countryCode && row.countryCode !== 'TZ' && (
            <Badge variant="listed">{row.countryCode}</Badge>
          )}
        </p>

        <p className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-body-sm text-muted-foreground">
          {row.city && <span>{row.city}</span>}
          {row.email ? (
            <span className="inline-flex items-center gap-1.5">
              <Mail className="size-3.5" aria-hidden />
              {row.email}
            </span>
          ) : (
            <span className="font-medium text-[var(--warning-800)]">No email on file</span>
          )}
          {/* The fallback channels, shown exactly where somebody has just
              learned that email will not work. */}
          {!row.email && row.phone && (
            <a href={`tel:${row.phone}`} className="inline-flex items-center gap-1.5 hover:text-primary">
              <Phone className="size-3.5" aria-hidden />
              {row.phone}
            </a>
          )}
          {!row.email && row.whatsapp && (
            <a
              href={`https://wa.me/${row.whatsapp.replace(/\D/g, '')}`}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 hover:text-primary"
            >
              <WhatsAppGlyph className="size-3.5" />
              WhatsApp
            </a>
          )}
        </p>

        {row.error && (
          <p className="mt-1 text-body-sm text-[var(--danger-600)]">
            {row.batch ? `${row.batch}: ` : ''}
            {row.error}
          </p>
        )}

        {state.error && (
          <p className="mt-1 flex items-center gap-1.5 text-body-sm text-[var(--danger-600)]">
            <AlertTriangle className="size-3.5" aria-hidden />
            {state.error}
          </p>
        )}
        {state.done && (
          <p className="mt-1 flex items-center gap-1.5 text-body-sm text-[var(--success-800)]">
            <CheckCircle2 className="size-3.5" aria-hidden />
            {state.done}
          </p>
        )}
      </div>

      {canSend && !state.done && (
        <form action={action}>
          <input type="hidden" name="businessId" value={row.id} />
          <Button type="submit" size="sm" variant="secondary" disabled={pending}>
            {pending && <Loader2 className="size-4 animate-spin" aria-hidden />}
            {row.state === 'failed' || row.state === 'bounced' ? 'Retry' : 'Send now'}
          </Button>
        </form>
      )}
    </li>
  );
}
