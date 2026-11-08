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
/**
 * The brand's own profiles, comma-separated, from the environment.
 *
 * Only absolute http(s) URLs survive: a half-typed value in a Netlify variable
 * must not become a malformed identity claim in every page's structured data.
 */
const sameAs = (process.env.NEXT_PUBLIC_SOCIAL_PROFILES ?? '')
  .split(',')
  .map((u) => u.trim())
  .filter((u) => /^https?:\/\/\S+$/.test(u));

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
      // The profiles that are the same organisation as this one.
      //
      // This is the half of the brand fix that code can carry. `explore
      // tanzania` drew 247 impressions and 2 clicks in Search Console to 5
      // November 2026 — the site is not first for its own name, against
      // near-matches like Explore Jambo Maasai and Explore 2 Africa that own
      // no part of the exact phrase. `sameAs` is how an entity says which
      // accounts are it, and it is the conventional fix.
      //
      // Read from the environment and omitted entirely when unset, rather than
      // written here. A `sameAs` is a claim about identity: a URL guessed from
      // the brand name, or a profile that does not exist, is a false one, and
      // Google is entitled to distrust the whole node for it. There are no
      // social profiles configured for this brand anywhere in the codebase as
      // of 8 November 2026, so there is nothing truthful to put here yet —
      // set NEXT_PUBLIC_SOCIAL_PROFILES and they appear with no code change.
      ...(sameAs.length ? { sameAs } : {}),
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
