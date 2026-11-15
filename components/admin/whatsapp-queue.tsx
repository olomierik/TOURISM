'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { AlertTriangle, CheckCircle2, Loader2, SkipForward, X } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { WhatsAppGlyph } from '@/components/ui/whatsapp-glyph';
import { recordWhatsAppInvite } from '@/lib/admin/invites';
import { planWhatsAppBatch, type WhatsAppTarget } from '@/lib/outreach/whatsapp-batch';
import { whatsappInviteHref } from '@/lib/outreach/whatsapp-invite';
import { DAILY_CAP } from '@/lib/outreach/batch-shared';

/**
 * Ninety WhatsApp invitations, lined up.
 *
 * WhatsApp does not let a website send a message, so this cannot be one click
 * for ninety sends. It is one click to line them up, then one tap each: the
 * button opens the chat with the invitation written and moves to the next
 * operator, so the admin alternates between "send" in WhatsApp and "next"
 * here without hunting through a list. Every chat reuses one browser tab.
 *
 * Opening a chat is recorded, as it is for the per-row button, so the same
 * operator is not lined up again tomorrow.
 */
export function WhatsAppQueue({ group, country }: { group: string; country: string }) {
  const router = useRouter();
  const [loading, setLoading] = React.useState(false);
  const [targets, setTargets] = React.useState<WhatsAppTarget[] | null>(null);
  const [index, setIndex] = React.useState(0);
  const [opened, setOpened] = React.useState(0);
  const [note, setNote] = React.useState<{ tone: 'ok' | 'bad'; text: string } | null>(null);

  const origin =
    process.env.NEXT_PUBLIC_SITE_URL ??
    (typeof window !== 'undefined' ? window.location.origin : '');

  async function start() {
    setNote(null);
    setLoading(true);
    try {
      const plan = await planWhatsAppBatch(group, country);
      if ('error' in plan) {
        setNote({ tone: 'bad', text: plan.error });
      } else if (plan.targets.length === 0) {
        setNote({
          tone: 'ok',
          text: 'Nobody left in this group with a WhatsApp number who has not been invited.',
        });
      } else {
        setTargets(plan.targets);
        setIndex(0);
        setOpened(0);
      }
    } catch {
      setNote({ tone: 'bad', text: 'The connection dropped. Try again.' });
    } finally {
      setLoading(false);
    }
  }

  function finish(count: number) {
    setTargets(null);
    setNote({ tone: 'ok', text: `${count} WhatsApp ${count === 1 ? 'chat' : 'chats'} opened.` });
    router.refresh();
  }

  function advance(didOpen: boolean) {
    if (!targets) return;
    const count = opened + (didOpen ? 1 : 0);
    setOpened(count);
    if (index + 1 >= targets.length) finish(count);
    else setIndex(index + 1);
  }

  const current = targets?.[index];
  const href = current ? whatsappInviteHref(current, origin) : null;

  return (
    <div className="space-y-3 rounded-lg border border-[#25D366]/40 bg-[#25D366]/5 p-4">
      {!targets && (
        <div className="flex flex-wrap items-center gap-3">
          <Button type="button" variant="secondary" onClick={start} disabled={loading}>
            {loading ? (
              <Loader2 className="size-4 animate-spin" aria-hidden />
            ) : (
              <WhatsAppGlyph className="size-4" />
            )}
            WhatsApp the next {DAILY_CAP}
          </Button>
          <p className="min-w-0 flex-1 text-body-sm text-muted-foreground">
            Lines up {DAILY_CAP} operators in this group who have a WhatsApp number and have
            not been invited. Each chat opens with the invitation written; you press send in
            WhatsApp, then come back for the next one.
          </p>
        </div>
      )}

      {targets && current && (
        <div className="space-y-3">
          <div className="h-2 overflow-hidden rounded-pill bg-surface-sunken">
            <div
              className="h-full bg-[#25D366] transition-[width]"
              style={{ width: `${Math.round((index / targets.length) * 100)}%` }}
            />
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <div className="min-w-0 flex-1">
              <p className="text-caption tabular-nums text-muted-foreground">
                {index + 1} of {targets.length}
              </p>
              <p className="truncate text-body font-semibold">{current.name}</p>
              <p className="text-body-sm text-muted-foreground">
                {[current.city, current.whatsapp || current.phone].filter(Boolean).join(' · ')}
              </p>
            </div>
            {href && (
              <Button asChild>
                <a
                  href={href}
                  // One named tab, reused: ninety chats must not be ninety tabs.
                  target="et-whatsapp-invite"
                  rel="noreferrer"
                  onClick={() => {
                    void recordWhatsAppInvite(current.id);
                    advance(true);
                  }}
                >
                  <WhatsAppGlyph className="size-4" />
                  Open chat &amp; next
                </a>
              </Button>
            )}
            <Button type="button" variant="secondary" onClick={() => advance(false)}>
              <SkipForward className="size-4" aria-hidden />
              Skip
            </Button>
            <Button type="button" variant="ghost" onClick={() => finish(opened)} aria-label="Stop">
              <X className="size-4" aria-hidden />
              Stop
            </Button>
          </div>
        </div>
      )}

      {note && (
        <p
          role="status"
          className={
            note.tone === 'ok'
              ? 'flex items-start gap-1.5 text-body-sm text-[var(--success-800)]'
              : 'flex items-start gap-1.5 text-body-sm text-[var(--danger-600)]'
          }
        >
          {note.tone === 'ok' ? (
            <CheckCircle2 className="mt-0.5 size-4 shrink-0" aria-hidden />
          ) : (
            <AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden />
          )}
          {note.text}
        </p>
      )}
    </div>
  );
}
