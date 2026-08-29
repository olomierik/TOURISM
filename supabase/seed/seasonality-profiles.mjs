/**
 * Climate profiles for East African destinations.
 *
 * "When should I go?" is the highest-volume planning question in this niche and
 * the site answered it for 2 destinations out of 46. The component that renders
 * it returns null when a destination has no rows, so 44 pages were silently
 * missing their most useful section — no error, no gap in the layout, just
 * absence.
 *
 * Structured as regional profiles plus per-destination overrides rather than 552
 * hand-entered rows. Rainfall and the wet/dry rhythm are properties of a region,
 * not of a park: the Serengeti, Tarangire and Ngorongoro share one rainfall
 * curve and differ by altitude. Encoding that once means the shape is right
 * everywhere and there are 46 temperature pairs to check rather than 552.
 *
 * These are climate normals and typical patterns, not a forecast. Rainfall in
 * particular varies a great deal year to year, and East African rains have been
 * arriving less predictably than these averages suggest. The UI says so.
 *
 * Ratings are 1-5. Wildlife and weather read high-is-good; crowd_level inverts,
 * so 5 means packed.
 */

/**
 * Monthly rainfall (mm) and a weather score, January first.
 *
 * The weather score is not "is it warm" — everywhere here is warm. It is how
 * good the conditions are for the thing people come to do: dry roads, thin
 * vegetation, animals concentrated at water.
 */
export const PROFILES = {
  /** Northern Tanzania circuit. Long rains March-May, short rains November. */
  'tz-north': {
    rain: [60, 55, 110, 200, 150, 30, 10, 10, 15, 40, 105, 90],
    weather: [4, 4, 3, 2, 2, 5, 5, 5, 5, 4, 3, 4],
    loDelta: [0, 0, 0, 0, -1, -2, -2, -2, -1, 0, 0, 0],
    hiDelta: [0, 0, -1, -2, -2, -2, -3, -3, -1, 0, -1, 0],
  },

  /** Southern Tanzania. One long wet season; many camps close March-May. */
  'tz-south': {
    rain: [140, 130, 160, 130, 40, 10, 5, 5, 5, 25, 90, 160],
    weather: [2, 2, 2, 3, 4, 5, 5, 5, 5, 4, 3, 2],
    loDelta: [0, 0, 0, 0, -1, -3, -4, -3, -1, 1, 1, 0],
    hiDelta: [0, 0, -1, -1, -1, -2, -2, -1, 1, 2, 1, 0],
  },

  /** Lake Tanganyika forests. Wet October-April. */
  'tz-west': {
    rain: [130, 130, 180, 180, 70, 10, 5, 10, 30, 90, 160, 160],
    weather: [2, 2, 2, 2, 4, 5, 5, 5, 4, 3, 2, 2],
    loDelta: [0, 0, 0, 0, -1, -2, -2, -2, -1, 0, 0, 0],
    hiDelta: [0, 0, -1, -1, 0, 0, 0, 1, 2, 1, 0, 0],
  },

  /** Tanzanian coast and islands. April is the wettest month of the year. */
  'tz-coast': {
    rain: [70, 60, 140, 320, 240, 50, 40, 45, 50, 90, 200, 140],
    weather: [4, 4, 3, 1, 2, 4, 5, 5, 5, 4, 2, 3],
    loDelta: [1, 1, 1, 0, -1, -2, -2, -2, -1, 0, 1, 1],
    hiDelta: [1, 2, 1, 0, -1, -2, -2, -2, -1, 0, 1, 1],
  },

  /** Kenyan Rift and the Mara. Short rains run later than Tanzania's. */
  'ke-rift': {
    rain: [50, 50, 100, 170, 130, 40, 25, 30, 35, 70, 130, 80],
    weather: [4, 4, 3, 2, 2, 4, 4, 4, 4, 3, 2, 3],
    loDelta: [0, 0, 1, 1, 0, -2, -3, -2, -1, 0, 1, 0],
    hiDelta: [1, 2, 1, -1, -1, -2, -3, -2, 0, 1, 0, 0],
  },

  /** Northern Kenya. Hot, semi-arid, reliably dry in the middle of the year. */
  'ke-north': {
    rain: [30, 25, 70, 140, 80, 20, 15, 15, 20, 60, 120, 50],
    weather: [4, 4, 3, 2, 3, 5, 5, 5, 5, 4, 2, 4],
    loDelta: [0, 1, 1, 1, 0, -1, -2, -1, 0, 0, 0, 0],
    hiDelta: [1, 2, 2, 0, 0, -1, -2, -1, 1, 2, 0, 0],
  },

  /** Amboseli and the Tsavos. Semi-arid, with a sharp November peak. */
  'ke-tsavo': {
    rain: [40, 30, 80, 150, 60, 10, 5, 5, 10, 40, 130, 80],
    weather: [4, 4, 3, 2, 3, 5, 5, 5, 5, 4, 2, 3],
    loDelta: [0, 1, 1, 1, 0, -2, -3, -2, -1, 0, 1, 0],
    hiDelta: [1, 2, 2, 0, 0, -2, -3, -2, 0, 2, 0, 0],
  },

  /** Kenyan coast. May is the wettest month; the rest of the year is kind. */
  'ke-coast': {
    rain: [25, 20, 60, 190, 290, 110, 80, 70, 70, 90, 120, 80],
    weather: [5, 5, 4, 2, 1, 3, 4, 4, 4, 4, 3, 4],
    loDelta: [1, 1, 2, 1, 0, -1, -2, -2, -1, 0, 1, 1],
    hiDelta: [1, 2, 2, 1, -1, -2, -2, -2, -1, 0, 1, 1],
  },

  /** High equatorial mountain. Two wet seasons, two climbing windows. */
  'ke-alpine': {
    rain: [50, 40, 110, 230, 180, 50, 40, 50, 40, 120, 200, 90],
    weather: [5, 5, 3, 1, 2, 4, 4, 4, 5, 3, 2, 4],
    loDelta: [0, 0, 0, 1, 0, -1, -2, -2, -1, 0, 0, 0],
    hiDelta: [1, 1, 0, -1, -1, -1, -2, -2, 0, 0, -1, 0],
  },

  /** Uganda and the Albertine Rift. Wet March-May and September-November. */
  'ug-equatorial': {
    rain: [70, 80, 130, 180, 150, 60, 60, 90, 130, 160, 140, 100],
    weather: [4, 4, 3, 2, 2, 4, 5, 4, 3, 2, 2, 3],
    loDelta: [0, 0, 0, 0, 0, -1, -1, -1, 0, 0, 0, 0],
    hiDelta: [1, 1, 0, -1, -1, 0, 0, 0, 0, -1, -1, 0],
  },

  /** Murchison Falls. Northerly, with a long single wet season. */
  'ug-murchison': {
    rain: [30, 50, 100, 150, 160, 110, 110, 130, 140, 140, 90, 50],
    weather: [5, 4, 3, 2, 2, 3, 3, 3, 3, 3, 4, 5],
    loDelta: [0, 1, 1, 1, 0, -1, -1, -1, -1, 0, 0, 0],
    hiDelta: [2, 3, 2, 0, -1, -2, -2, -2, -1, 0, 1, 2],
  },

  /** Kidepo Valley. Semi-arid far north — its dry season is the others' wet. */
  'ug-kidepo': {
    rain: [5, 10, 40, 110, 130, 100, 130, 150, 110, 60, 25, 5],
    weather: [5, 5, 4, 3, 2, 3, 2, 2, 3, 4, 5, 5],
    loDelta: [0, 1, 1, 1, 0, -1, -1, -1, -1, 0, 0, 0],
    hiDelta: [2, 3, 2, 0, -1, -2, -2, -2, -1, 1, 2, 2],
  },

  /** Rwanda. Matches the values already hand-tuned for Volcanoes NP. */
  rw: {
    rain: [80, 90, 160, 200, 160, 25, 15, 40, 90, 180, 190, 110],
    weather: [4, 4, 2, 1, 2, 5, 5, 5, 4, 2, 2, 4],
    loDelta: [0, 0, 0, 1, 1, -1, -1, -1, 0, 0, 0, 0],
    hiDelta: [0, 1, 0, -1, -1, 0, 1, 1, 1, 0, -1, 0],
  },
};

/**
 * Default month text per profile, used where a destination has nothing more
 * specific to say. Four locales, because a German reader deciding on a month is
 * exactly the reader this site is trying to win.
 *
 * Deliberately about conditions rather than sales copy. "Long rains — lowest
 * prices" is useful; "a magical time to visit" is not.
 */
export const DEFAULT_TEXT = {
  dry: {
    en: 'Dry season — good roads, thinner bush, animals gathering at water.',
    de: 'Trockenzeit — gute Pisten, lichtere Vegetation, Tiere sammeln sich am Wasser.',
    fr: 'Saison sèche — bonnes pistes, végétation clairsemée, animaux autour des points d’eau.',
    it: 'Stagione secca — piste buone, vegetazione rada, animali raccolti alle pozze.',
  },
  peakDry: {
    en: 'Peak dry season — the best game viewing and the highest prices.',
    de: 'Höhepunkt der Trockenzeit — beste Tierbeobachtung, höchste Preise.',
    fr: 'Cœur de la saison sèche — meilleures observations, tarifs les plus élevés.',
    it: 'Piena stagione secca — avvistamenti migliori e prezzi più alti.',
  },
  shoulder: {
    en: 'Shoulder month — settled enough to travel, quieter than peak.',
    de: 'Übergangsmonat — gut bereisbar und ruhiger als die Hauptsaison.',
    fr: 'Intersaison — conditions correctes et moins de monde qu’en haute saison.',
    it: 'Mese di spalla — condizioni discrete e meno affollamento.',
  },
  shortRains: {
    en: 'Short rains — brief afternoon storms, green landscapes, fewer visitors.',
    de: 'Kurze Regenzeit — kurze Nachmittagsschauer, grüne Landschaft, weniger Besucher.',
    fr: 'Petite saison des pluies — averses brèves l’après-midi, paysages verts, peu de monde.',
    it: 'Piccole piogge — brevi rovesci pomeridiani, paesaggi verdi, pochi visitatori.',
  },
  longRains: {
    en: 'Long rains — some tracks impassable and some camps closed. Lowest prices.',
    de: 'Große Regenzeit — teils unpassierbare Pisten, einige Camps geschlossen. Niedrigste Preise.',
    fr: 'Grande saison des pluies — pistes parfois impraticables, camps fermés. Tarifs les plus bas.',
    it: 'Grandi piogge — piste a tratti impraticabili e campi chiusi. Prezzi più bassi.',
  },
  wet: {
    en: 'Wet month — expect rain most days, and lush, difficult country.',
    de: 'Regenmonat — an den meisten Tagen Regen, üppige und schwierige Landschaft.',
    fr: 'Mois humide — pluie presque quotidienne, nature luxuriante mais difficile.',
    it: 'Mese piovoso — pioggia quasi ogni giorno, natura rigogliosa ma difficile.',
  },
};

/**
 * Which default applies, decided from the profile's own rainfall and weather
 * score rather than from a per-destination list. One rule, applied everywhere,
 * so a month cannot be described as dry on one page and wet on its neighbour.
 */
export function defaultKeyFor(rain, weather) {
  if (rain >= 150) return 'longRains';
  if (rain >= 100) return 'wet';
  if (rain >= 60) return 'shortRains';
  if (weather >= 5) return 'peakDry';
  if (weather >= 4) return 'dry';
  return 'shoulder';
}
