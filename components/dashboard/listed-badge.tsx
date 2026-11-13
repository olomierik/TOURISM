'use client';

import { useState } from 'react';
import { Check, Copy } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { Button } from '@/components/ui/button';

/**
 * "Listed on Explore Tanzania" — a badge an operator puts on their own website.
 *
 * It links to their listing, so each one is a real link from a real tourism
 * business to this site: the cheapest honest way a directory earns the links
 * its ranking depends on, and the operator gets a line of third-party
 * presence on their own page in exchange. Offered only on a live listing —
 * a badge pointing at a page that 404s helps nobody.
 *
 * The image is a static file (public/badges), so it costs nothing to serve
 * and cannot break if this app is redeployed.
 */
export function ListedBadge({ listingUrl, badgeUrl }: { listingUrl: string; badgeUrl: string }) {
  const t = useTranslations('dashboard.badge');
  const [copied, setCopied] = useState(false);

  const code = `<a href="${listingUrl}" target="_blank" rel="noopener"><img src="${badgeUrl}" alt="Listed on Explore Tanzania" width="200" height="60" loading="lazy"></a>`;

  async function copy() {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      // The code is on screen and selectable either way.
      setCopied(false);
    }
  }

  return (
    <section className="rounded-xl border bg-surface p-4 sm:p-5">
      <h2 className="text-heading-sm font-semibold">{t('title')}</h2>
      <p className="mt-1 text-body-sm text-muted-foreground">{t('body')}</p>
      <div className="mt-4 flex flex-wrap items-center gap-4">
        {/* eslint-disable-next-line @next/next/no-img-element -- the exact file operators embed */}
        <img src={badgeUrl} alt="Listed on Explore Tanzania" width={200} height={60} />
        <Button type="button" variant="outline" size="md" onClick={copy}>
          {copied ? <Check className="size-4" aria-hidden /> : <Copy className="size-4" aria-hidden />}
          {copied ? t('copied') : t('copy')}
        </Button>
      </div>
      <label className="mt-4 block">
        <span className="text-caption font-semibold uppercase tracking-wide text-muted-foreground">
          {t('codeLabel')}
        </span>
        <textarea
          readOnly
          rows={3}
          value={code}
          onFocus={(e) => e.currentTarget.select()}
          className="mt-1.5 w-full resize-none rounded-lg border bg-surface-sunken p-3 font-mono text-xs leading-relaxed"
        />
      </label>
    </section>
  );
}
