'use client';

import { useState } from 'react';
import { Check, Share2 } from 'lucide-react';

import { Button } from '@/components/ui/button';

/** Shares a one-line summary of the diary, or copies it where sharing isn't offered. */
export function ShareListButton({
  text,
  path,
  label,
  copiedLabel,
}: {
  text: string;
  /** Public page the share points to — the guide, never the private diary. */
  path: string;
  label: string;
  copiedLabel: string;
}) {
  const [copied, setCopied] = useState(false);

  const share = async () => {
    const url = window.location.origin + path;
    try {
      if (navigator.share) {
        await navigator.share({ text, url });
        return;
      }
      await navigator.clipboard.writeText(`${text} ${url}`);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      // Dismissed share sheet: nothing to do.
    }
  };

  return (
    <Button type="button" variant="secondary" onClick={share}>
      {copied ? <Check className="size-4" aria-hidden /> : <Share2 className="size-4" aria-hidden />}
      {copied ? copiedLabel : label}
    </Button>
  );
}
