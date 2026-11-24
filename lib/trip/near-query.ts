/**
 * Understands what somebody types into the Near me search box.
 *
 * "car hire near me", "hotels in Zanzibar", "restaurant arusha", "hoteli
 * karibu nami": two questions in one line, what kind of place and searched
 * from where. The answer is a category key from the directory's six and,
 * when a known place is named, that place. Anything unrecognised is ignored
 * rather than guessed at; an empty answer leaves the page as it was.
 *
 * Plain functions with no imports, so the tests run them directly.
 */

export type NearQuery = {
  /** One of the directory's category keys, or null when no kind was named. */
  categoryKey: string | null;
  /** The place named, as written in `places`, or null. */
  place: string | null;
  /** True for "near me", "nearby", "around me": search from the device. */
  nearMe: boolean;
};

/**
 * Words people use for each kind, in the languages the site speaks. Longer
 * phrases first so "car hire" wins over a stray "car".
 */
const KINDS: Array<[key: string, words: string[]]> = [
  [
    'car-rental',
    [
      'car hire', 'car rental', 'rent a car', 'rental car', 'hire car', 'car', 'cars', '4x4', 'land cruiser',
      'transfer', 'transfers', 'airport transfer', 'taxi', 'driver', 'self drive', 'self-drive', 'vehicle',
      'mietwagen', 'autovermietung', 'auto mieten', 'location de voiture', 'voiture', 'noleggio auto',
      'autonoleggio', 'kukodi gari', 'gari', 'magari', 'usafiri',
    ],
  ],
  [
    'hotels',
    [
      'hotel', 'hotels', 'lodge', 'lodges', 'camp', 'camps', 'tented camp', 'resort', 'guest house',
      'guesthouse', 'hostel', 'stay', 'stays', 'accommodation', 'accomodation', 'room', 'rooms', 'bnb',
      'b&b', 'airbnb', 'villa', 'unterkunft', 'hôtel', 'hebergement', 'hébergement', 'albergo', 'alloggio',
      'hoteli', 'malazi', 'nyumba ya wageni',
    ],
  ],
  [
    'restaurants',
    [
      'restaurant', 'restaurants', 'food', 'eat', 'eating', 'dinner', 'lunch', 'breakfast', 'cafe', 'café',
      'coffee', 'bar', 'bars', 'pizza', 'ristorante', 'essen', 'mgahawa', 'chakula', 'hoteli ya chakula',
    ],
  ],
  [
    'tour-guides',
    ['tour guide', 'tour guides', 'guide', 'guides', 'local guide', 'reiseführer', 'guida', 'kiongozi', 'mwongozaji'],
  ],
  [
    'activities',
    [
      'things to do', 'activity', 'activities', 'excursion', 'excursions', 'day trip', 'day trips', 'balloon',
      'diving', 'dive', 'snorkeling', 'snorkelling', 'boat', 'dhow', 'spice tour', 'horse riding', 'kayak',
      'aktivitäten', 'activités', 'attività', 'shughuli',
    ],
  ],
  [
    'safaris',
    [
      'safari', 'safaris', 'tour operator', 'tour operators', 'tour', 'tours', 'travel agent', 'travel agency',
      'game drive', 'gorilla', 'kilimanjaro', 'climb', 'trek', 'trekking', 'reiseveranstalter', 'voyagiste',
      'tour operatore', 'utalii', 'ziara',
    ],
  ],
];

const NEAR_ME = [
  'near me', 'nearby', 'near by', 'around me', 'close to me', 'closest', 'nearest', 'in der nähe',
  'près de moi', 'à proximité', 'vicino a me', 'qui vicino', 'karibu nami', 'karibu yangu', 'karibu',
];

function normalise(text: string): string {
  return ` ${text
    .toLowerCase()
    .normalize('NFKC')
    .replace(/[“”"'’.,!?;:()]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()} `;
}

function contains(haystack: string, phrase: string): boolean {
  return haystack.includes(` ${phrase} `);
}

export function parseNearQuery(input: string, places: readonly string[]): NearQuery {
  const text = normalise(input);
  if (text.trim() === '') return { categoryKey: null, place: null, nearMe: false };

  // The earliest-mentioned kind wins, so "hotel with a restaurant" is a hotel.
  let categoryKey: string | null = null;
  let at = Infinity;
  for (const [key, words] of KINDS) {
    for (const w of words) {
      const i = text.indexOf(` ${w} `);
      if (i !== -1 && i < at) {
        at = i;
        categoryKey = key;
      }
    }
  }

  // The longest place name that appears, so "Arusha National Park" beats
  // "Arusha" when both are on the list.
  let place: string | null = null;
  for (const p of places) {
    if (contains(text, normalise(p).trim()) && (!place || p.length > place.length)) place = p;
  }

  const nearMe = NEAR_ME.some((w) => contains(text, w));
  return { categoryKey, place, nearMe };
}
