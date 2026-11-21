'use client';

import { useState } from 'react';
import { Check, Copy } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { Button } from '@/components/ui/button';

/**
 * "Verified on" / "Listed on ExploreTanzania.online": the badge an operator
 * puts on their own website (SEO brief T12).
 *
 * It links to their listing with an ordinary, followed link, so each one is a
 * real link from a real tourism business to this site: the cheapest honest
 * way a directory earns the links its ranking depends on, and the operator
 * gets third-party presence on their own page in exchange. Offered only on a
 * live listing; a badge pointing at a page that 404s helps nobody.
 *
 * The image is /badge/<slug>.svg, drawn per listing: it says "Verified" only
 * if the listing is, and shows the rating once enough reviews stand behind
 * it. Each view is counted with the site it was on, and the operator sees
 * both here.
 */
export function ListedBadge({
  listingUrl,
  badgeBase,
  verified,
  views30,
  sites,
}: {
  listingUrl: string;
  /** /badge/<slug>.svg, absolute. */
  badgeBase: string;
  verified: boolean;
  /** Badge views in the last 30 days. */
  views30: number;
  /** Sites showing the badge, most views first. */
  sites: string[];
}) {
  const t = useTranslations('dashboard.badge');
  const [copied, setCopied] = useState(false);
  const [dark, setDark] = useState(false);

  const src = dark ? `${badgeBase}?theme=dark` : badgeBase;
  const alt = verified ? 'Verified on ExploreTanzania.online' : 'Listed on ExploreTanzania.online';
  const code = `<a href="${listingUrl}" target="_blank" rel="noopener"><img src="${src}" alt="${alt}" width="220" height="60" loading="lazy"></a>`;

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
        <div className={dark ? 'rounded-lg bg-[#0d1410] p-2' : 'rounded-lg p-2'}>
          {/* eslint-disable-next-line @next/next/no-img-element -- the exact file operators embed */}
          <img src={src} alt={alt} width={220} height={60} />
        </div>
        <div role="radiogroup" aria-label={t('style')} className="inline-flex rounded-pill border p-0.5 text-body-sm">
          {[false, true].map((d) => (
            <button
              key={String(d)}
              type="button"
              role="radio"
              aria-checked={dark === d}
              onClick={() => setDark(d)}
              className={`rounded-pill px-3 py-1 ${dark === d ? 'bg-primary text-primary-foreground' : 'text-muted-foreground'}`}
            >
              {d ? t('dark') : t('light')}
            </button>
          ))}
        </div>
        <Button type="button" variant="outline" size="md" onClick={copy}>
          {copied ? <Check className="size-4" aria-hidden /> : <Copy className="size-4" aria-hidden />}
          {copied ? t('copied') : t('copy')}
        </Button>
      </div>

      <label className="mt-4 block">
        <span className="text-caption font-semibold uppercase tracking-wide text-muted-foreground">{t('codeLabel')}</span>
        <textarea
          readOnly
          rows={3}
          value={code}
          onFocus={(e) => e.currentTarget.select()}
          className="mt-1.5 w-full resize-none rounded-lg border bg-surface-sunken p-3 font-mono text-xs leading-relaxed"
        />
      </label>

      <p className="mt-4 text-body-sm text-muted-foreground">
        {views30 > 0 ? t('views', { count: views30 }) : t('noViews')}
        {sites.length > 0 && <> {t('sites', { sites: sites.slice(0, 5).join(', ') })}</>}
      </p>
    </section>
  );
}
