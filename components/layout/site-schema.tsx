import { absoluteUrl } from '@/lib/seo';
import { locales } from '@/i18n/routing';

/**
 * Site-level structured data, emitted once from the root layout.
 *
 * Page-level schema (LocalBusiness, TouristTrip, Article) describes individual
 * things. This describes the *publisher* — and that is what an answer engine
 * uses to decide whether a source is worth citing at all. A model synthesising
 * "how much does a Tanzania safari cost" needs to establish that this site is a
 * travel directory covering Tanzania, not a blog that mentioned it once.
 *
 * The SearchAction additionally makes the site eligible for a sitelinks search
 * box in Google, which is free real estate on a branded query.
 */
export function SiteSchema() {
  const graph = [
    {
      '@type': 'Organization',
      '@id': absoluteUrl('/#organization'),
      name: 'Explore Tanzania',
      url: absoluteUrl('/'),
      description:
        'A Tanzania-focused tourism directory connecting travelers with verified safari operators, lodges, guides and transport providers.',
      areaServed: {
        '@type': 'Country',
        name: 'Tanzania',
      },
      knowsLanguage: [...locales],
    },
    {
      '@type': 'WebSite',
      '@id': absoluteUrl('/#website'),
      url: absoluteUrl('/'),
      name: 'Explore Tanzania',
      publisher: { '@id': absoluteUrl('/#organization') },
      inLanguage: [...locales],
      potentialAction: {
        '@type': 'SearchAction',
        target: {
          '@type': 'EntryPoint',
          urlTemplate: absoluteUrl('/search?q={search_term_string}'),
        },
        'query-input': 'required name=search_term_string',
      },
    },
  ];

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{
        __html: JSON.stringify({ '@context': 'https://schema.org', '@graph': graph }),
      }}
    />
  );
}
