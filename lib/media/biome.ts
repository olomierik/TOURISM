/**
 * What a place looks like, for listings that have no photograph of it.
 *
 * 1,190 of 2,618 approved listings — 45% — carry no cover image, and there is
 * nothing to fall back on: zero traveller photos exist site-wide and those
 * 1,190 have no rows in `media` either. So the drawing is not a stopgap until
 * real photography arrives. For nearly half the directory it *is* the image.
 *
 * The old placeholder drew one picture — sunset sky, ridge, one acacia —
 * varying only its hue, its sun position, one of three ridge paths and which
 * side the tree stood on. In a grid where half the tiles have no photo, that
 * reads as the same picture printed over and over, which is a large part of
 * why the site felt monotonous.
 *
 * This maps the 58 regions that actually hold listings onto six landscapes.
 * A Zanzibar hotel gets turquoise and a flat sea horizon; a Bwindi lodge gets
 * layered canopy in deep green; a Nairobi restaurant gets a warm-grey skyline.
 * The drawing now says something true about where the business is, which is
 * the difference between decoration and information design.
 *
 * Deliberately a lookup rather than a column: no schema change, no migration,
 * no risk to the region work this depends on. The region slug is already on
 * the card.
 */

export type Biome = 'coastal' | 'highland' | 'savanna' | 'lake' | 'forest' | 'urban';

/**
 * Region slug to landscape.
 *
 * Chosen from where the listings are rather than from a map: these 58 regions
 * are every region with at least one approved listing, and the six busiest —
 * Arusha (565), Nairobi (411), Kilimanjaro (188), Uganda West (186), Mwanza
 * (155) and Mara (124) — land in five different biomes, which is what makes
 * the variety visible on the pages people actually open.
 */
const BY_REGION: Record<string, Biome> = {
  // The ocean and the islands.
  mombasa: 'coastal',
  kwale: 'coastal',
  kilifi: 'coastal',
  'zanzibar-central-south': 'coastal',
  'mjini-magharibi': 'coastal',
  'zanzibar-north': 'coastal',
  'pemba-north': 'coastal',
  'pemba-south': 'coastal',
  tanga: 'coastal',
  pwani: 'coastal',
  mtwara: 'coastal',
  lindi: 'coastal',

  // Mountains and the cool country under them.
  arusha: 'highland',
  kilimanjaro: 'highland',
  nyeri: 'highland',
  laikipia: 'highland',
  meru: 'highland',
  'elgeyo-marakwet': 'highland',
  'tharaka-nithi': 'highland',
  embu: 'highland',
  kiambu: 'highland',
  'northern-province': 'highland', // Rwanda's volcanoes

  // Open plains and game country.
  mara: 'savanna',
  narok: 'savanna',
  simiyu: 'savanna',
  manyara: 'savanna',
  samburu: 'savanna',
  kajiado: 'savanna',
  isiolo: 'savanna',
  katavi: 'savanna',
  dodoma: 'savanna',
  singida: 'savanna',
  shinyanga: 'savanna',
  tabora: 'savanna',
  machakos: 'savanna',
  makueni: 'savanna',
  baringo: 'savanna',

  // The great lakes and the rift lakes.
  mwanza: 'lake',
  geita: 'lake',
  kagera: 'lake',
  kigoma: 'lake',
  kisumu: 'lake',
  nakuru: 'lake',
  rukwa: 'lake',

  // Montane forest and rainforest.
  western: 'forest', // Uganda: Bwindi, the Rwenzoris
  'western-province': 'forest', // Rwanda: Nyungwe
  'southern-province': 'forest',
  morogoro: 'forest', // the Udzungwas
  iringa: 'forest',
  mbeya: 'forest',
  songwe: 'forest',
  'uasin-gishu': 'forest',

  // Cities. Dar es Salaam is on the ocean, but its 102 listings are city
  // businesses and a skyline is the more honest picture of them than a beach.
  nairobi: 'urban',
  kigali: 'urban',
  central: 'urban', // Uganda: Kampala and around
  'dar-es-salaam': 'urban',
};

/**
 * Where the region is unknown — 73 listings have no coordinates, and a mixed
 * grid has no single region anyway — the category is the next best signal.
 * A car hire firm is a town business; a safari operator is not.
 */
const BY_CATEGORY: Record<string, Biome> = {
  safaris: 'savanna',
  hotels: 'highland',
  restaurants: 'urban',
  'car-rental': 'urban',
  activities: 'coastal',
  'tour-guides': 'forest',
};

/**
 * The same rule migration 057 used to build regions.slug, so a region's display
 * name resolves without the card query having to carry a second column.
 *
 * The card type holds the region NAME ('Dar es Salaam'), not the slug, and that
 * query runs on 2,618-row paths — adding a column to it to save four lines here
 * would be the wrong trade.
 */
const slugify = (name: string) =>
  name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');

/**
 * @param region the listing's administrative region, as slug or display name
 * @param categorySlug its primary category, if the caller knows it
 *
 * Falls through region, then category, then savanna — which is the right
 * default for a directory whose largest single category is safaris.
 */
export function biomeFor(region?: string | null, categorySlug?: string | null): Biome {
  if (region) {
    const key = BY_REGION[region] ? region : slugify(region);
    if (BY_REGION[key]) return BY_REGION[key];
  }
  if (categorySlug && BY_CATEGORY[categorySlug]) return BY_CATEGORY[categorySlug];
  return 'savanna';
}

/**
 * Each biome's sky, land and detail, as oklch triples.
 *
 * These are not the interface tokens and must not be: the interface is ink on
 * paper, and these are pictures. They are tuned to sit *under* the ink rather
 * than to match it — enough chroma to read as a photograph substitute at card
 * size, never enough to compete with the Flame call to action beside them.
 */
export const BIOME_PALETTE: Record<
  Biome,
  { skyTop: string; skyMid: string; skyLow: string; far: string; near: string; detail: string }
> = {
  savanna: {
    skyTop: 'oklch(0.42 0.075 62)',
    skyMid: 'oklch(0.62 0.115 70)',
    skyLow: 'oklch(0.80 0.135 82)',
    far: 'oklch(0.38 0.055 58)',
    near: 'oklch(0.24 0.040 52)',
    detail: 'oklch(0.16 0.028 48)',
  },
  coastal: {
    skyTop: 'oklch(0.52 0.090 232)',
    skyMid: 'oklch(0.72 0.095 210)',
    skyLow: 'oklch(0.86 0.070 196)',
    far: 'oklch(0.62 0.105 196)',
    near: 'oklch(0.44 0.090 205)',
    detail: 'oklch(0.26 0.045 200)',
  },
  highland: {
    skyTop: 'oklch(0.40 0.055 245)',
    skyMid: 'oklch(0.62 0.060 232)',
    skyLow: 'oklch(0.84 0.045 218)',
    far: 'oklch(0.46 0.048 200)',
    near: 'oklch(0.30 0.045 178)',
    detail: 'oklch(0.19 0.030 168)',
  },
  lake: {
    skyTop: 'oklch(0.44 0.070 250)',
    skyMid: 'oklch(0.66 0.080 236)',
    skyLow: 'oklch(0.84 0.075 214)',
    far: 'oklch(0.40 0.062 214)',
    near: 'oklch(0.30 0.058 220)',
    detail: 'oklch(0.20 0.035 214)',
  },
  forest: {
    skyTop: 'oklch(0.44 0.055 172)',
    skyMid: 'oklch(0.66 0.070 148)',
    skyLow: 'oklch(0.84 0.070 128)',
    far: 'oklch(0.42 0.080 152)',
    near: 'oklch(0.28 0.070 155)',
    detail: 'oklch(0.18 0.045 158)',
  },
  // Cool dusk, deliberately far from savanna on the wheel. The first attempt
  // ran warm grey at hue 78-86, which sits right beside savanna's 62-82 — and
  // on the page every Dar es Salaam restaurant was indistinguishable from a
  // Serengeti camp. 614 listings are urban, the second-largest biome, so it is
  // the one that most needed its own colour.
  urban: {
    skyTop: 'oklch(0.32 0.045 276)',
    skyMid: 'oklch(0.52 0.055 268)',
    skyLow: 'oklch(0.74 0.048 258)',
    far: 'oklch(0.34 0.030 262)',
    near: 'oklch(0.24 0.026 264)',
    detail: 'oklch(0.86 0.090 84)',
  },
};
