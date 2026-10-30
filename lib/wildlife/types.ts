/**
 * The wildlife guide's vocabulary.
 *
 * Species live in a file (species.ts), not the database: the list changes when
 * someone edits the text, never at runtime, and a static list means every
 * profile page renders without a query.
 */

export type SpeciesGroup = 'mammal' | 'bird' | 'reptile';

export type Diet =
  | 'herbivore'
  | 'carnivore'
  | 'omnivore'
  | 'insectivore'
  | 'piscivore';

/** How likely a visitor is to see it on an ordinary safari in Tanzania. */
export type Rarity = 'common' | 'uncommon' | 'rare';

/** IUCN Red List category, as published. `null` when not assessed. */
export type Iucn = 'LC' | 'NT' | 'VU' | 'EN' | 'CR' | 'DD' | null;

/** A freely licensed file on Wikimedia Commons, with what its licence requires us to show. */
export type CommonsMedia = {
  url: string;
  /** The file's page on Commons — the attribution link. */
  page: string;
  author: string;
  license: string;
  licenseUrl: string | null;
};

export type CommonsImage = CommonsMedia & { width: number; height: number };

export type Species = {
  slug: string;
  name: string;
  scientific: string;
  group: SpeciesGroup;
  bigFive: boolean;
  iucn: Iucn;
  diet: Diet;
  rarity: Rarity;
  size: string;
  habitat: string;
  /** Where in Tanzania it is most often seen. */
  where: string;
  summary: string;
  tip: string;
  image: CommonsImage | null;
  call: CommonsMedia | null;
};

/** What a sighting row looks like once read back. */
export type Sighting = {
  id: string;
  species_slug: string;
  seen_on: string;
  place_name: string | null;
  lat: number | null;
  lng: number | null;
  notes: string | null;
  photo_url: string | null;
  created_at: string;
};
