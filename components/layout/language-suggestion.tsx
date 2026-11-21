'use client';

import { useEffect, useState } from 'react';
import { X } from 'lucide-react';

/**
 * "Diese Seite gibt es auch auf Deutsch →", when the browser prefers a
 * language this page is translated into.
 *
 * It replaces redirecting by cookie and Accept-Language (SEO brief T3, 21 Nov
 * 2026): the URL decides the language, and the reader is offered the
 * translation rather than sent to it. A redirect had put English readers who
 * once chose German on German 404s, and gave crawlers a different page from
 * the one they asked for.
 *
 * What exists is read from the page's own hreflang links, which list only
 * real translations, so the offer is never a link to a page that is not
 * there. Dismissal is remembered per browser.
 */

const OFFER: Record<string, { text: string; dismiss: string }> = {
  en: { text: 'This page is also in English', dismiss: 'Dismiss' },
  de: { text: 'Diese Seite gibt es auch auf Deutsch', dismiss: 'Schließen' },
  fr: { text: 'Cette page existe aussi en français', dismiss: 'Fermer' },
  it: { text: 'Questa pagina è disponibile anche in italiano', dismiss: 'Chiudi' },
};

const KEY = 'et:language-suggestion-dismissed';

export function LanguageSuggestion() {
  const [offer, setOffer] = useState<{ lang: string; href: string } | null>(null);

  useEffect(() => {
    try {
      if (window.localStorage.getItem(KEY)) return;
    } catch {
      // Storage blocked: still offer; dismissal just will not persist.
    }
    const current = document.documentElement.lang.slice(0, 2).toLowerCase();
    const available = new Map(
      [...document.querySelectorAll<HTMLLinkElement>('link[rel="alternate"][hreflang]')]
        .map((l) => [l.hreflang.slice(0, 2).toLowerCase(), l.href] as const)
        .filter(([lang]) => lang !== 'x-' && OFFER[lang]),
    );
    for (const pref of navigator.languages ?? [navigator.language]) {
      const lang = pref.slice(0, 2).toLowerCase();
      if (lang === current) return; // Already reading a language they prefer.
      const href = available.get(lang);
      if (href) {
        // Read once on mount: browser language and the head's links exist
        // only in the browser, and the server render must not guess them.
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setOffer({ lang, href });
        return;
      }
    }
  }, []);

  if (!offer) return null;
  const copy = OFFER[offer.lang];

  const dismiss = () => {
    setOffer(null);
    try {
      window.localStorage.setItem(KEY, '1');
    } catch {
      // Ignore: it simply shows again next visit.
    }
  };

  return (
    <div
      lang={offer.lang}
      className="flex items-center justify-center gap-3 border-b bg-secondary px-4 py-2 text-body-sm"
    >
      <a href={offer.href} className="font-semibold text-primary hover:underline">
        {copy.text} →
      </a>
      <button
        type="button"
        onClick={dismiss}
        aria-label={copy.dismiss}
        className="rounded-pill p-1 text-muted-foreground hover:bg-background hover:text-foreground"
      >
        <X className="size-4" aria-hidden />
      </button>
    </div>
  );
}
