import { ChevronRight } from 'lucide-react';

import { Link } from '@/i18n/navigation';
import { absoluteUrl } from '@/lib/seo';
import { getPathname } from '@/i18n/navigation';
import type { Locale } from '@/i18n/routing';

// getPathname's href type is stricter than Link's (Link additionally accepts a
// loose UrlObject). Deriving from getPathname keeps both call sites happy, since
// every crumb href is passed to both.
type Href = Parameters<typeof getPathname>[0]['href'];

type Crumb = {
  label: string;
  href?: Href;
};

/**
 * Breadcrumb trail plus its BreadcrumbList JSON-LD.
 *
 * Google renders the trail in place of the raw URL in results, which measurably
 * lifts click-through on deep pages — exactly the category × destination pages
 * this site is built around. Emitting the markup here keeps it impossible for a
 * page to show a trail without also describing it to crawlers.
 */
export function Breadcrumbs({
  items,
  locale,
}: {
  items: Crumb[];
  locale: Locale;
}) {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: item.label,
      ...(item.href
        ? { item: absoluteUrl(getPathname({ href: item.href, locale })) }
        : {}),
    })),
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <nav aria-label="Breadcrumb" className="text-sm">
        <ol className="flex flex-wrap items-center gap-1.5 text-muted-foreground">
          {items.map((item, i) => (
            <li key={i} className="flex items-center gap-1.5">
              {i > 0 && <ChevronRight className="size-3.5 shrink-0" aria-hidden />}
              {item.href ? (
                <Link href={item.href} className="hover:text-foreground hover:underline">
                  {item.label}
                </Link>
              ) : (
                <span aria-current="page" className="text-foreground">
                  {item.label}
                </span>
              )}
            </li>
          ))}
        </ol>
      </nav>
    </>
  );
}
