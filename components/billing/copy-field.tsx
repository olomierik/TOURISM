'use client';

import { useState } from 'react';
import { Check, Copy } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { cn } from '@/lib/utils';

/**
 * One line of bank details, with a copy button.
 *
 * An account number retyped by hand into a banking app is an account number
 * that occasionally goes somewhere else, and a payment reference retyped wrong
 * is a payment nobody can match. Copying removes both, and the confirmation
 * matters as much as the copy — without it people press the button twice and
 * still do not trust it.
 */
export function CopyField({
  label,
  value,
  mono = false,
  highlight = false,
}: {
  label: string;
  value: string;
  mono?: boolean;
  highlight?: boolean;
}) {
  const t = useTranslations('billing');
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard access is refused in some browsers and every insecure
      // context. The value is on screen and selectable either way, so the
      // button simply does not confirm rather than throwing at the reader.
      setCopied(false);
    }
  }

  return (
    <div
      className={cn(
        'flex flex-wrap items-center justify-between gap-x-4 gap-y-1 rounded-lg px-3 py-2',
        highlight && 'bg-secondary/60',
      )}
    >
      <dt className="text-sm text-muted-foreground">{label}</dt>
      <dd className="flex items-center gap-2">
        <span className={cn('text-sm', mono && 'font-mono tabular-nums', highlight && 'font-semibold')}>
          {value}
        </span>
        <button
          type="button"
          onClick={copy}
          aria-label={copied ? t('copied') : t('copyValue', { label })}
          className="rounded p-1 text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
        >
          {copied ? (
            <Check className="size-3.5 text-primary" aria-hidden />
          ) : (
            <Copy className="size-3.5" aria-hidden />
          )}
        </button>
      </dd>
    </div>
  );
}
