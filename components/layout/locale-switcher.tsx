'use client';

import { useParams, useRouter as useRawRouter } from 'next/navigation';
import { useTransition } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { Globe, Check } from 'lucide-react';
import { usePathname, useRouter } from '@/i18n/navigation';
import { locales, localeMeta, type Locale } from '@/i18n/routing';

export function LocaleSwitcher() {
  const t = useTranslations('nav');
  const locale = useLocale();
  const router = useRouter();
  // The locale-aware router only accepts routes it knows at compile time. An
  // hreflang href is already a finished, localized URL, so it goes through the
  // plain router instead of being re-derived from a route name.
  const rawRouter = useRawRouter();
  const pathname = usePathname();
  const params = useParams();
  const [isPending, startTransition] = useTransition();

  function switchTo(next: Locale) {
    if (next === locale) return;
    startTransition(() => {
      // Read the destination out of the page's own hreflang links.
      //
      // next-intl can translate the path *pattern* — /destinations/[slug]
      // becomes /de/reiseziele/[slug] — but not the slug, which is a database
      // value and different in every locale. Passing the current params through
      // therefore produced a French slug under a German prefix:
      // /de/reiseziele/cratere-du-ngorongoro, a 404, on every destination,
      // guide and article whose slug is translated. Google had found 48 of
      // them; a reader switching language hit one every time.
      //
      // The correct URL for each locale is already in the document, emitted by
      // every page's generateMetadata as <link rel="alternate" hreflang>. Using
      // it means the switcher cannot disagree with what the page tells Google,
      // and it needs no plumbing between the page and this component — which
      // matters, because the header and footer are rendered by the layout, so
      // they are siblings of the page and no React context from it can reach
      // here.
      const alternate = document.querySelector<HTMLLinkElement>(
        `link[rel="alternate"][hreflang="${localeMeta[next].hrefLang}"]`,
      );

      if (alternate?.href) {
        // Same-origin only: an hreflang pointing anywhere else is not a page
        // of ours to navigate to.
        const target = new URL(alternate.href, window.location.origin);
        if (target.origin === window.location.origin) {
          rawRouter.replace(target.pathname + target.search);
          return;
        }
      }

      // No alternate for that locale. Either the page has no translated slug —
      // /directory, /trip-cost, /about, where next-intl rebuilds the path on
      // its own and the params are correct — or this content does not exist in
      // the target language at all.
      const hasSlug = Boolean(params && 'slug' in params);
      if (hasSlug) {
        // Untranslated content. The home page in the language they asked for
        // is a worse answer than the page they wanted, and a better one than a
        // 404 claiming the site is broken.
        router.replace('/', { locale: next });
        return;
      }

      router.replace(
        // @ts-expect-error -- params shape is route-dependent and only known at runtime
        { pathname, params },
        { locale: next },
      );
    });
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="gap-1.5 px-2.5"
          aria-label={t('selectLanguage')}
          disabled={isPending}
        >
          <Globe className="size-4" aria-hidden />
          <span className="text-xs font-semibold uppercase tracking-wide">
            {locale}
          </span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-40">
        {locales.map((l) => (
          <DropdownMenuItem
            key={l}
            onSelect={() => switchTo(l)}
            className="justify-between gap-3"
          >
            <span>{localeMeta[l].native}</span>
            {l === locale && <Check className="size-4 text-primary" aria-hidden />}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
