'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Check, Share2 } from 'lucide-react';

import { Button } from '@/components/ui/button';

/**
 * Share, beside Save at the top of a listing, as on Tripadvisor and
 * GetYourGuide. A traveller rarely books alone: the listing is sent to whoever
 * they are travelling with before anyone enquires.
 *
 * The phone's own share sheet where there is one (WhatsApp is the reason this
 * matters in East Africa), otherwise the link is copied.
 */
export function ShareButton({ title }: { title: string }) {
  const t = useTranslations('business');
  const [copied, setCopied] = useState(false);

  async function onClick() {
    const url = window.location.href;
    if (navigator.share) {
      try {
        await navigator.share({ title, url });
        return;
      } catch (err) {
        // Closing the sheet is a choice, not a failure: nothing to copy.
        if ((err as Error).name === 'AbortError') return;
      }
    }
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // No clipboard either (an old browser, or a page not served over https):
      // the address bar still has the link.
    }
  }

  return (
    <Button type="button" variant="outline" onClick={onClick} aria-live="polite">
      {copied ? <Check className="size-4" aria-hidden /> : <Share2 className="size-4" aria-hidden />}
      {copied ? t('linkCopied') : t('share')}
    </Button>
  );
}
