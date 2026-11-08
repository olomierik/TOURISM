'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { AlertTriangle, BadgeCheck, Check, Loader2, ShieldAlert, X } from 'lucide-react';

import { Link } from '@/i18n/navigation';
import { decideClaim } from '@/lib/admin/claims';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription } from '@/components/ui/alert';

export type PendingClaim = {
  id: string;
  createdAt: string;
  contactName: string;
  contactEmail: string;
  contactPhone: string | null;
  evidence: string | null;
  verifiedAt: string | null;
  verificationMethod: 'email' | 'domain' | 'manual' | null;
  verifiedContact: string | null;
  businessName: string;
  businessSlug: string;
  businessCity: string | null;
};

/**
 * The claim review queue.
 *
 * Approving transfers a listing — its contact details, its enquiries, its place
 * in lead routing — to the claimant, so the destructive-looking button is the
 * approve one. The warning is stated on every card rather than once at the top,
 * because a reviewer working through a queue reads the card, not the page.
 *
 * Nothing here is optimistic. A claim decision is not the kind of thing to show
 * as done before the server agrees.
 */
export function ClaimsQueue({ claims, locale }: { claims: PendingClaim[]; locale: string }) {
  const t = useTranslations('admin.claimsPage');
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [busy, setBusy] = useState<string | null>(null);
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [done, setDone] = useState(false);
  const [failed, setFailed] = useState(false);
  const [refused, setRefused] = useState(false);

  async function decide(id: string, decision: 'approved' | 'rejected') {
    setBusy(id);
    setFailed(false);
    setRefused(false);
    const result = await decideClaim(id, decision, notes[id]);
    setBusy(null);
    if (result.error === 'proofRequired') {
      // Distinct from a failure: nothing went wrong, the server declined to
      // transfer a business to somebody who never answered a code at the
      // published address without a reason on the record.
      setRefused(true);
      return;
    }
    if (result.error) {
      setFailed(true);
      return;
    }
    setDone(true);
    startTransition(() => router.refresh());
  }

  if (claims.length === 0) {
    return (
      <p className="rounded-xl border border-dashed p-10 text-center text-muted-foreground">
        {t('empty')}
      </p>
    );
  }

  return (
    <div className="space-y-5">
      {failed && (
        <Alert variant="destructive">
          <AlertTriangle className="size-4" aria-hidden />
          <AlertDescription>{t('empty')}</AlertDescription>
        </Alert>
      )}
      {refused && (
        <Alert variant="destructive">
          <ShieldAlert className="size-4" aria-hidden />
          <AlertDescription>{t('proofRequired')}</AlertDescription>
        </Alert>
      )}
      {done && !failed && (
        <Alert>
          <Check className="size-4" aria-hidden />
          <AlertDescription>{t('decided')}</AlertDescription>
        </Alert>
      )}

      <ul className="space-y-5">
        {claims.map((c) => (
          <li key={c.id} className="rounded-xl border bg-card p-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <Link
                  href={{ pathname: '/business/[slug]', params: { slug: c.businessSlug } }}
                  className="font-display text-lg font-semibold hover:text-primary"
                >
                  {c.businessName}
                </Link>
                {c.businessCity && (
                  <span className="ml-2 text-sm text-muted-foreground">{c.businessCity}</span>
                )}
              </div>
              <span className="text-sm text-muted-foreground">
                {t('filedOn')}{' '}
                {new Date(c.createdAt).toLocaleDateString(locale, {
                  year: 'numeric',
                  month: 'short',
                  day: 'numeric',
                })}
              </span>
            </div>

            <dl className="mt-4 grid gap-4 sm:grid-cols-2">
              <div>
                <dt className="text-sm font-medium text-muted-foreground">{t('contact')}</dt>
                <dd className="mt-1 text-sm">
                  {c.contactName}
                  <br />
                  <a href={`mailto:${c.contactEmail}`} className="underline">
                    {c.contactEmail}
                  </a>
                  {c.contactPhone && (
                    <>
                      <br />
                      {c.contactPhone}
                    </>
                  )}
                </dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-muted-foreground">{t('evidence')}</dt>
                <dd className="mt-1 whitespace-pre-wrap text-sm">{c.evidence}</dd>
              </div>

              {/* The one fact that decides this card, and until now the one
                  fact it did not show. A code answered at the address the
                  licensing register published proves control of that mailbox;
                  the evidence paragraph above proves only that somebody can
                  type. Stated as plainly as it can be, because a reviewer
                  working a queue reads one line and acts. */}
              <div className="sm:col-span-2">
                <dt className="text-sm font-medium text-muted-foreground">{t('proof')}</dt>
                <dd className="mt-1 text-sm">
                  {c.verifiedAt ? (
                    <span className="flex items-start gap-2 text-success">
                      <BadgeCheck className="mt-0.5 size-4 shrink-0" aria-hidden />
                      {t(`proofMethod.${c.verificationMethod ?? 'manual'}`, {
                        contact: c.verifiedContact ?? c.contactEmail,
                      })}
                    </span>
                  ) : (
                    <span className="flex items-start gap-2 text-warning-foreground">
                      <ShieldAlert className="mt-0.5 size-4 shrink-0" aria-hidden />
                      {t('proofNone')}
                    </span>
                  )}
                </dd>
              </div>
            </dl>

            <div className="mt-4 space-y-3">
              <Textarea
                rows={2}
                // A placeholder is not a label: it disappears the moment the
                // reviewer starts typing, and this box sits in a repeated queue
                // row where a visible label on every card would be noise. The
                // placeholder stays as the visual hint; the accessible name is
                // now explicit.
                // The box changes job when there is no proof: it stops being
                // an optional courtesy to the claimant and becomes the record
                // of why a business was handed over on somebody's word.
                aria-label={c.verifiedAt ? t('note') : t('noteOverride')}
                placeholder={c.verifiedAt ? t('note') : t('noteOverride')}
                value={notes[c.id] ?? ''}
                onChange={(e) => setNotes((n) => ({ ...n, [c.id]: e.target.value }))}
              />

              <p className="flex items-start gap-2 text-sm text-warning-foreground">
                <AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden />
                {t('warning')}
              </p>

              <div className="flex flex-wrap gap-2">
                <Button
                  size="sm"
                  // An unproved claim can still be approved — a published
                  // address can be a dead agency mailbox, and an admin who rang
                  // the operator knows something the database does not. It just
                  // cannot be approved silently: the reason goes in the box
                  // above, onto the claim and into the audit log. The server
                  // enforces the same rule; this only saves a round trip.
                  disabled={
                    busy === c.id || (!c.verifiedAt && (notes[c.id] ?? '').trim().length < 20)
                  }
                  onClick={() => void decide(c.id, 'approved')}
                >
                  {busy === c.id ? (
                    <Loader2 className="size-3.5 animate-spin" aria-hidden />
                  ) : (
                    <Check className="size-3.5" aria-hidden />
                  )}
                  {t('approve')}
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={busy === c.id}
                  onClick={() => void decide(c.id, 'rejected')}
                >
                  <X className="size-3.5" aria-hidden />
                  {t('reject')}
                </Button>
              </div>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
