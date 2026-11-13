'use client';

import { useState } from 'react';

import { recordWhatsAppInvite } from '@/lib/admin/invites';
import { whatsappInviteHref } from '@/lib/outreach/whatsapp-invite';
import { WhatsAppGlyph } from '@/components/ui/whatsapp-glyph';
import { cn } from '@/lib/utils';

/**
 * "Invite on WhatsApp": opens WhatsApp with the claim invitation written.
 * Renders nothing when the listing has no number WhatsApp can reach.
 */
export function WhatsAppInviteButton({
  business,
  lastInvitedAt,
  className,
}: {
  business: {
    id: string;
    name: string;
    slug: string;
    whatsapp?: string | null;
    phone?: string | null;
    countryCode?: string | null;
  };
  /** ISO date of the last time an admin opened an invite, if any. */
  lastInvitedAt?: string | null;
  className?: string;
}) {
  const [opened, setOpened] = useState(false);
  const origin =
    process.env.NEXT_PUBLIC_SITE_URL ??
    (typeof window !== 'undefined' ? window.location.origin : '');
  const href = whatsappInviteHref(business, origin);
  if (!href) return null;

  const when = lastInvitedAt ? new Date(lastInvitedAt).toISOString().slice(0, 10) : null;

  return (
    <span className={cn('inline-flex flex-wrap items-center gap-x-2 gap-y-1', className)}>
      <a
        href={href}
        target="_blank"
        rel="noreferrer"
        onClick={() => {
          setOpened(true);
          void recordWhatsAppInvite(business.id);
        }}
        className="inline-flex h-9 items-center gap-1.5 rounded-pill border border-[#25D366]/50 bg-[#25D366]/10 px-3 text-body-sm font-semibold text-foreground transition-colors hover:bg-[#25D366]/20"
      >
        <WhatsAppGlyph className="size-4" />
        Invite on WhatsApp
      </a>
      {(opened || when) && (
        <span className="text-caption text-muted-foreground">
          {opened ? 'Invite opened just now' : `Invite opened ${when}`}
        </span>
      )}
    </span>
  );
}
