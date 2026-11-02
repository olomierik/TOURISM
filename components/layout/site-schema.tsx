import { absoluteUrl } from '@/lib/seo';
import { locales } from '@/i18n/routing';
import { getCoveredCountries, listCountryNames } from '@/lib/queries/countries';

/**
 * Site-level structured data, emitted once from the root layout.
 *
 * Page-level schema (LocalBusiness, TouristTrip, Article) describes individual
 * things. This describes the *publisher* — and that is what an answer engine
 * uses to decide whether a source is worth citing at all. A model synthesising
 * "how much does a gorilla permit cost" needs to establish that this site is a
 * travel directory covering East Africa, not a blog that mentioned it once.
 *
 * areaServed is read from the database. It was the single country 'Tanzania',
 * which quietly told every crawler not to consider this site for the Kenyan,
 * Ugandan and Rwandan pages that now make up two thirds of the destinations.
 *
 * The SearchAction additionally makes the site eligible for a sitelinks search
 * box in Google, which is free real estate on a branded query.
 */
export async function SiteSchema() {
  // Never let schema take the page down. A missing @graph costs rich results;
  // a thrown error in the root layout costs the whole site.
  const countries = await getCoveredCountries().catch(() => []);

  const areaServed = countries.length
    ? countries.map((c) => ({ '@type': 'Country', name: c.name }))
    : undefined;

  const coverage = countries.length ? listCountryNames(countries) : 'East Africa';

  const graph = [
    {
      '@type': 'Organization',
      '@id': absoluteUrl('/#organization'),
      name: 'Explore Tanzania',
      url: absoluteUrl('/'),
      // The logo Google puts beside the result. Without it Google picks an
      // image off the page itself and gets it wrong, which is how a search for
      // this site came to show somebody else's mark. An ImageObject rather
      // than a bare URL so the dimensions are stated: Google requires a logo
      // of at least 112x112 and will skip one it cannot measure.
      logo: {
        '@type': 'ImageObject',
        '@id': absoluteUrl('/#logo'),
        url: absoluteUrl('/icon-512.png'),
        contentUrl: absoluteUrl('/icon-512.png'),
        width: 512,
        height: 512,
        caption: 'Explore Tanzania',
      },
      image: { '@id': absoluteUrl('/#logo') },
      description:
        `An East Africa tourism directory connecting travelers with verified safari operators, ` +
        `lodges, guides and transport providers across ${coverage}.`,
      ...(areaServed ? { areaServed } : {}),
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
