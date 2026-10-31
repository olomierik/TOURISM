import { getTranslations } from 'next-intl/server';

import { Link } from '@/i18n/navigation';
import type { Locale } from '@/i18n/routing';
import { countryName } from '@/lib/country-names';
import { cn } from '@/lib/utils';

type Href = React.ComponentProps<typeof Link>['href'];

/**
 * Country picker for listing pages (destinations, events, hidden gems, a
 * month's when-to-go list).
 *
 * Every country shows by default; the reader narrows to one with a pill. Links
 * rather than buttons so each choice keeps its own shareable URL
 * (`?country=KE`) and works before the page has hydrated.
 */
export async function CountryTabs({
  locale,
  codes,
  current,
  hrefFor,
  className,
}: {
  locale: Locale;
  /** Country codes present in the page's data. */
  codes: string[];
  /** The chosen code, or undefined for all countries. */
  current?: string;
  /** Builds the link for a code; undefined means "all countries". */
  hrefFor: (code?: string) => Href;
  className?: string;
}) {
  if (codes.length < 2) return null;
  const t = await getTranslations('directory');

  const items = [
    { code: undefined as string | undefined, label: t('anyCountry') },
    ...orderCountryCodes(codes, locale).map((code) => ({ code, label: countryName(code, locale) })),
  ];

  return (
    <nav aria-label={t('country')} className={cn('-mx-5 overflow-x-auto px-5 md:mx-0 md:px-0', className)}>
      <ul className="flex w-max gap-1.5">
        {items.map((item) => {
          const active = item.code === current;
          return (
            <li key={item.code ?? 'all'}>
              <Link
                href={hrefFor(item.code)}
                rel="nofollow"
                scroll={false}
                aria-current={active ? 'page' : undefined}
                className={cn(
                  'inline-flex h-9 items-center rounded-pill border px-3.5 text-[0.8125rem] font-semibold transition-colors',
                  active
                    ? 'border-primary bg-primary text-primary-foreground'
                    : 'bg-surface text-foreground hover:border-primary/50',
                )}
              >
                {item.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

/** Tanzania first, then the rest by their name in the reader's language. */
export function orderCountryCodes(codes: Iterable<string>, locale: Locale): string[] {
  return [...new Set([...codes].map((c) => c.toUpperCase()))].sort((a, b) => {
    if (a === 'TZ') return -1;
    if (b === 'TZ') return 1;
    return countryName(a, locale).localeCompare(countryName(b, locale), locale);
  });
}

/**
 * The `?country=` value if it names a country the page actually has,
 * otherwise undefined (all countries). A stale or mistyped link widens to
 * everything rather than showing an empty page.
 */
export function pickCountry(
  raw: string | string[] | undefined,
  available: Iterable<string>,
): string | undefined {
  const value = (Array.isArray(raw) ? raw[0] : raw)?.toUpperCase();
  if (!value) return undefined;
  return new Set([...available].map((c) => c.toUpperCase())).has(value) ? value : undefined;
}
