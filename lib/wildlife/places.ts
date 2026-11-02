import type { Species } from './types';

/**
 * Turning "where you see it" into somewhere you can actually go.
 *
 * Every species profile already names the parks it is found in, as prose: a
 * line like "Tarangire, Ruaha, Serengeti, Nyerere". That text answered the
 * question and then stopped — a reader who decided they wanted to see a
 * gerenuk had to go back to the search box and start again, and the destination
 * pages that list operators for Samburu never heard about it.
 *
 * So the prose is matched against the destinations the site actually has, and
 * the places become links. Three rules keep it honest:
 *
 *  - Longest name first. "Tsavo East" must not be eaten by "Tsavo", and
 *    "Ngorongoro Crater" must not be eaten by "Ngorongoro".
 *  - A named feature resolves to the park that contains it. The Kazinga
 *    Channel is in Queen Elizabeth, the Rufiji runs through Nyerere, Jozani is
 *    on Zanzibar; a reader who wants the bird wants the place they can book.
 *  - A place with no page gets no link. Several of the best wildlife sites in
 *    the region — Katavi, Udzungwa, the Usambaras, Mabamba — have no
 *    destination page yet, and inventing a URL for them would be worse than
 *    plain text. They are listed in PLACES_WITHOUT_PAGES so the gap is a
 *    decision rather than an accident.
 *
 * Non-places pass through harmlessly: "Most parks", "lodges at night" and
 * "everywhere settled" match nothing and simply produce no links.
 */

export type PlaceCountry = 'TZ' | 'KE' | 'UG' | 'RW';

export type SpeciesPlace = {
  /** How the place is named to the reader. */
  name: string;
  /** The destination page, where the site has one. */
  slug: string | null;
  country: PlaceCountry;
};

type Pattern = SpeciesPlace & { match: RegExp };

/**
 * Ordered most specific first, because matching stops at the first hit for a
 * given destination and a shorter name would otherwise swallow a longer one.
 */
const PATTERNS: readonly Pattern[] = [
  // --- Tanzania -----------------------------------------------------------
  { name: 'Ngorongoro Crater', slug: 'ngorongoro', country: 'TZ', match: /Ngorongoro/i },
  { name: 'Serengeti National Park', slug: 'serengeti', country: 'TZ', match: /Serengeti|Seronera|Ndutu|Moru Kopjes/i },
  { name: 'Tarangire National Park', slug: 'tarangire-national-park', country: 'TZ', match: /Tarangire/i },
  { name: 'Ruaha National Park', slug: 'ruaha-national-park', country: 'TZ', match: /Ruaha/i },
  { name: 'Nyerere National Park', slug: 'nyerere-national-park', country: 'TZ', match: /Nyerere|Selous|Rufiji/i },
  { name: 'Lake Manyara National Park', slug: 'lake-manyara-national-park', country: 'TZ', match: /Manyara/i },
  { name: 'Lake Natron', slug: 'lake-natron', country: 'TZ', match: /Lake Natron/i },
  { name: 'Mahale Mountains National Park', slug: 'mahale-mountains-national-park', country: 'TZ', match: /Mahale/i },
  { name: 'Mount Kilimanjaro', slug: 'kilimanjaro', country: 'TZ', match: /Kilimanjaro/i },
  { name: 'Arusha', slug: 'arusha', country: 'TZ', match: /Arusha/i },
  { name: 'Zanzibar', slug: 'zanzibar', country: 'TZ', match: /Zanzibar|Jozani/i },
  { name: 'Pemba Island', slug: 'pemba-island', country: 'TZ', match: /Pemba/i },
  { name: 'Mafia Island', slug: 'mafia-island', country: 'TZ', match: /Mafia/i },
  { name: 'Tanga', slug: 'tanga', country: 'TZ', match: /Tanga\b/i },
  { name: 'Dar es Salaam', slug: 'dar-es-salaam', country: 'TZ', match: /Dar es Salaam/i },

  // --- Kenya --------------------------------------------------------------
  { name: 'Maasai Mara', slug: 'maasai-mara', country: 'KE', match: /Maasai Mara|Masai Mara|Mara River|\bthe Mara\b/i },
  { name: 'Amboseli National Park', slug: 'amboseli-national-park', country: 'KE', match: /Amboseli/i },
  { name: 'Samburu National Reserve', slug: 'samburu-national-reserve', country: 'KE', match: /Samburu/i },
  { name: 'Laikipia and Ol Pejeta', slug: 'laikipia', country: 'KE', match: /Laikipia|Ol Pejeta/i },
  { name: 'Tsavo East National Park', slug: 'tsavo-east-national-park', country: 'KE', match: /Tsavo East/i },
  { name: 'Tsavo West National Park', slug: 'tsavo-west-national-park', country: 'KE', match: /Tsavo West/i },
  // Plain "Tsavo" covers both parks; it resolves to the east, which is the
  // larger and the one most of these species are recorded in.
  { name: 'Tsavo', slug: 'tsavo-east-national-park', country: 'KE', match: /Tsavo/i },
  { name: 'Lake Nakuru National Park', slug: 'lake-nakuru-national-park', country: 'KE', match: /Nakuru/i },
  { name: 'Lake Naivasha', slug: 'lake-naivasha', country: 'KE', match: /Naivasha|Hell's Gate/i },
  { name: 'Mount Kenya', slug: 'mount-kenya', country: 'KE', match: /Mount Kenya/i },
  { name: 'Nairobi National Park', slug: 'nairobi-national-park', country: 'KE', match: /Nairobi/i },
  { name: 'Watamu and Malindi', slug: 'watamu', country: 'KE', match: /Watamu|Malindi/i },
  { name: 'Diani Beach', slug: 'diani-beach', country: 'KE', match: /Diani/i },
  { name: 'Mombasa', slug: 'mombasa', country: 'KE', match: /Mombasa/i },
  { name: 'Lamu', slug: 'lamu', country: 'KE', match: /Lamu/i },

  // --- Uganda -------------------------------------------------------------
  { name: 'Queen Elizabeth National Park', slug: 'queen-elizabeth-national-park', country: 'UG', match: /Queen Elizabeth|Kazinga|Maramagambo|Ishasha/i },
  { name: 'Murchison Falls National Park', slug: 'murchison-falls-national-park', country: 'UG', match: /Murchison/i },
  { name: 'Bwindi Impenetrable National Park', slug: 'bwindi-impenetrable-national-park', country: 'UG', match: /Bwindi/i },
  { name: 'Kibale National Park', slug: 'kibale-national-park', country: 'UG', match: /Kibale/i },
  { name: 'Kidepo Valley National Park', slug: 'kidepo-valley-national-park', country: 'UG', match: /Kidepo/i },
  { name: 'Mgahinga Gorilla National Park', slug: 'mgahinga-gorilla-national-park', country: 'UG', match: /Mgahinga/i },
  { name: 'Lake Mburo National Park', slug: 'lake-mburo-national-park', country: 'UG', match: /Mburo/i },
  { name: 'Rwenzori Mountains National Park', slug: 'rwenzori-mountains-national-park', country: 'UG', match: /Rwenzori/i },
  { name: 'Entebbe', slug: 'entebbe', country: 'UG', match: /Entebbe/i },
  { name: 'Kampala', slug: 'kampala', country: 'UG', match: /Kampala/i },
  { name: 'Jinja and the Source of the Nile', slug: 'jinja', country: 'UG', match: /Jinja/i },
  { name: 'Lake Bunyonyi', slug: 'lake-bunyonyi', country: 'UG', match: /Bunyonyi/i },
  { name: 'Ssese Islands', slug: 'ssese-islands', country: 'UG', match: /Ssese/i },

  // --- Rwanda -------------------------------------------------------------
  { name: 'Volcanoes National Park', slug: 'volcanoes-national-park', country: 'RW', match: /Volcanoes/i },
  { name: 'Nyungwe Forest National Park', slug: 'nyungwe-forest-national-park', country: 'RW', match: /Nyungwe/i },
  { name: 'Akagera National Park', slug: 'akagera-national-park', country: 'RW', match: /Akagera/i },
  { name: 'Kigali', slug: 'kigali', country: 'RW', match: /Kigali/i },

  // --- Named in profiles, no destination page yet -------------------------
  // Listed rather than linked. Each of these is somewhere a traveller could
  // genuinely be sent, which makes every line here a destination page the
  // directory is missing.
  { name: 'Katavi National Park', slug: null, country: 'TZ', match: /Katavi/i },
  { name: 'Mikumi National Park', slug: null, country: 'TZ', match: /Mikumi/i },
  { name: 'Udzungwa Mountains National Park', slug: null, country: 'TZ', match: /Udzungwa/i },
  { name: 'Mkomazi National Park', slug: null, country: 'TZ', match: /Mkomazi/i },
  { name: 'Gombe Stream National Park', slug: null, country: 'TZ', match: /Gombe/i },
  { name: 'Rubondo Island National Park', slug: null, country: 'TZ', match: /Rubondo/i },
  { name: 'the Usambara Mountains', slug: null, country: 'TZ', match: /Usambara/i },
  { name: 'Lake Victoria', slug: null, country: 'TZ', match: /Lake Victoria/i },
  { name: 'the Aberdare Mountains', slug: null, country: 'KE', match: /Aberdare/i },
  { name: 'Arabuko-Sokoke Forest', slug: null, country: 'KE', match: /Arabuko/i },
  { name: 'Saiwa Swamp National Park', slug: null, country: 'KE', match: /Saiwa/i },
  { name: 'Lake Baringo', slug: null, country: 'KE', match: /Baringo/i },
  { name: 'Mabamba Swamp', slug: null, country: 'UG', match: /Mabamba/i },
  { name: 'Semliki National Park', slug: null, country: 'UG', match: /Semliki/i },
  { name: 'Ziwa Rhino Sanctuary', slug: null, country: 'UG', match: /Ziwa/i },
];

/** The wildlife places named in profiles that have no destination page. */
export const PLACES_WITHOUT_PAGES: readonly SpeciesPlace[] = PATTERNS.filter(
  (p) => p.slug === null,
).map(({ name, slug, country }) => ({ name, slug, country }));

/**
 * The places a species is found in, as links where we have the page.
 *
 * Reads the profile's own `where` line, so the list can never disagree with
 * the sentence printed beside it.
 */
export function placesFor(species: Pick<Species, 'where'>): SpeciesPlace[] {
  const found: SpeciesPlace[] = [];
  const seen = new Set<string>();

  for (const p of PATTERNS) {
    if (!p.match.test(species.where)) continue;
    // One entry per destination: "Tsavo East" and "Tsavo" are the same page.
    const key = p.slug ?? p.name;
    if (seen.has(key)) continue;
    seen.add(key);
    found.push({ name: p.name, slug: p.slug, country: p.country });
  }

  return found;
}

/** Every species recorded in a given destination, for the destination's page. */
export function speciesAt<T extends Pick<Species, 'where'>>(
  species: readonly T[],
  destinationSlug: string,
): T[] {
  return species.filter((s) => placesFor(s).some((p) => p.slug === destinationSlug));
}
