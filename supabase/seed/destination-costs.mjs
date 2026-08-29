/**
 * Indicative costs per destination, in US dollars.
 *
 * Anchored to the figures the site already publishes in its cost guides — a
 * mid-range Tanzanian safari at US$250–450 per person per day, budget camping at
 * US$180–250, luxury at US$700–1,500+, and US$100–170 a day of that being
 * government fees every operator pays identically. Those numbers went through a
 * writing pass already; producing a second, differing set here would make the
 * site contradict itself on the one question travellers care most about.
 *
 * Everything is per person per day, all-in on the ground, excluding
 * international flights — the same basis the guides use, and the basis the
 * reader assumes unless told otherwise.
 *
 * Cities and transit towns are deliberately absent. There is no gate to pay at
 * in Kampala, and a day-rate band for a capital would be describing hotel
 * pricing while implying safari pricing. No row means the section does not
 * render, which is the honest outcome.
 *
 * `asOf: 2026` is printed on the page. Park fees are revised annually and
 * several are quoted before VAT, so a figure without a date is a liability.
 */

const TZ = 'TANAPA';
const NCAA = 'Ngorongoro Conservation Area Authority';
const KWS = 'Kenya Wildlife Service';
const UWA = 'Uganda Wildlife Authority';
const RDB = 'Rwanda Development Board';

/** budget/midrange/luxury are [low, high]; fees are per person per day. */
export const COSTS = {
  // --------------------------------------------------------------- Tanzania
  serengeti: {
    budget: [180, 250], midrange: [250, 450], luxury: [700, 1500],
    fees: [100, 170], authority: TZ,
  },
  ngorongoro: {
    budget: [190, 260], midrange: [260, 470], luxury: [700, 1500],
    fees: [110, 180], authority: NCAA,
    notable: { key: 'craterDescent', amount: 295 },
  },
  'tarangire-national-park': {
    budget: [170, 230], midrange: [230, 400], luxury: [600, 1200],
    fees: [80, 130], authority: TZ,
  },
  'lake-manyara-national-park': {
    budget: [160, 220], midrange: [220, 380], luxury: [550, 1100],
    fees: [70, 120], authority: TZ,
  },
  kilimanjaro: {
    budget: [180, 240], midrange: [240, 380], luxury: [450, 900],
    fees: [110, 160], authority: TZ,
    notable: { key: 'climbPackage', amount: 2200 },
  },
  'lake-natron-and-ol-doinyo-lengai': {
    budget: [150, 210], midrange: [210, 350], luxury: [450, 900],
    fees: [40, 70], authority: 'Ngaresero and Engaruka village councils',
  },
  nyerere: {
    budget: [200, 280], midrange: [280, 500], luxury: [700, 1500],
    fees: [90, 150], authority: TZ,
  },
  'ruaha-national-park': {
    budget: [200, 280], midrange: [280, 500], luxury: [700, 1400],
    fees: [80, 140], authority: TZ,
  },
  'mahale-mountains-national-park': {
    budget: [350, 500], midrange: [500, 900], luxury: [900, 1800],
    fees: [100, 160], authority: TZ,
    notable: { key: 'chimpPermit', amount: 80 },
  },
  zanzibar: {
    budget: [60, 110], midrange: [110, 280], luxury: [300, 900],
  },
  'pemba-island': {
    budget: [70, 120], midrange: [120, 300], luxury: [320, 800],
  },
  'mafia-island': {
    budget: [80, 130], midrange: [130, 300], luxury: [320, 800],
    fees: [23, 30], authority: 'Mafia Island Marine Park',
  },

  // ------------------------------------------------------------------ Kenya
  'maasai-mara': {
    budget: [180, 260], midrange: [260, 480], luxury: [700, 1600],
    fees: [100, 200], authority: 'Narok County and the Mara conservancies',
  },
  'amboseli-national-park': {
    budget: [160, 230], midrange: [230, 420], luxury: [600, 1200],
    fees: [60, 110], authority: KWS,
  },
  'tsavo-east-national-park': {
    budget: [140, 200], midrange: [200, 360], luxury: [500, 1000],
    fees: [52, 90], authority: KWS,
  },
  'tsavo-west-national-park': {
    budget: [140, 200], midrange: [200, 360], luxury: [500, 1000],
    fees: [52, 90], authority: KWS,
  },
  'samburu-national-reserve': {
    budget: [170, 240], midrange: [240, 440], luxury: [650, 1400],
    fees: [70, 120], authority: 'Samburu County',
  },
  'laikipia-and-ol-pejeta': {
    budget: [170, 250], midrange: [250, 460], luxury: [700, 1500],
    fees: [60, 110], authority: 'Ol Pejeta and the Laikipia conservancies',
  },
  'lake-nakuru-national-park': {
    budget: [150, 210], midrange: [210, 380], luxury: [500, 1000],
    fees: [60, 100], authority: KWS,
  },
  'lake-naivasha-and-hell-s-gate': {
    budget: [110, 170], midrange: [170, 320], luxury: [400, 800],
    fees: [26, 50], authority: KWS,
  },
  'nairobi-national-park': {
    budget: [100, 160], midrange: [160, 300], luxury: [350, 700],
    fees: [43, 70], authority: KWS,
  },
  'mount-kenya': {
    budget: [150, 220], midrange: [220, 360], luxury: [400, 800],
    fees: [52, 90], authority: KWS,
  },
  'diani-beach': {
    budget: [55, 100], midrange: [100, 250], luxury: [280, 700],
  },
  'watamu-and-malindi': {
    budget: [55, 100], midrange: [100, 240], luxury: [270, 650],
    fees: [17, 25], authority: KWS,
  },
  lamu: {
    budget: [60, 110], midrange: [110, 260], luxury: [300, 750],
  },

  // ----------------------------------------------------------------- Uganda
  'bwindi-impenetrable-national-park': {
    budget: [250, 350], midrange: [350, 600], luxury: [700, 1500],
    fees: [40, 60], authority: UWA,
    notable: { key: 'gorillaPermit', amount: 800 },
  },
  'mgahinga-gorilla-national-park': {
    budget: [240, 340], midrange: [340, 580], luxury: [650, 1300],
    fees: [40, 60], authority: UWA,
    notable: { key: 'gorillaPermit', amount: 800 },
  },
  'kibale-national-park': {
    budget: [170, 240], midrange: [240, 420], luxury: [550, 1100],
    fees: [40, 60], authority: UWA,
    notable: { key: 'chimpPermit', amount: 250 },
  },
  'queen-elizabeth-national-park': {
    budget: [150, 220], midrange: [220, 400], luxury: [550, 1100],
    fees: [40, 60], authority: UWA,
  },
  'murchison-falls-national-park': {
    budget: [150, 220], midrange: [220, 400], luxury: [550, 1100],
    fees: [40, 60], authority: UWA,
  },
  'kidepo-valley-national-park': {
    budget: [200, 300], midrange: [300, 520], luxury: [650, 1300],
    fees: [40, 60], authority: UWA,
  },
  'lake-mburo-national-park': {
    budget: [120, 180], midrange: [180, 330], luxury: [420, 850],
    fees: [40, 60], authority: UWA,
  },
  'rwenzori-mountains-national-park': {
    budget: [180, 260], midrange: [260, 420], luxury: [500, 1000],
    fees: [35, 55], authority: UWA,
    notable: { key: 'trekPackage', amount: 1300 },
  },

  // ----------------------------------------------------------------- Rwanda
  'volcanoes-national-park': {
    budget: [300, 420], midrange: [420, 750], luxury: [900, 2200],
    fees: [30, 50], authority: RDB,
    notable: { key: 'gorillaPermit', amount: 1500 },
  },
  'nyungwe-forest-national-park': {
    budget: [180, 260], midrange: [260, 460], luxury: [600, 1200],
    fees: [40, 70], authority: RDB,
    notable: { key: 'chimpPermit', amount: 150 },
  },
  'akagera-national-park': {
    budget: [160, 230], midrange: [230, 420], luxury: [600, 1300],
    fees: [50, 90], authority: 'African Parks and the RDB',
  },
};

/** Printed beside the amount, so "per vehicle" is never mistaken for per person. */
export const NOTABLE_LABELS = {
  craterDescent: {
    en: 'Ngorongoro Crater descent, per vehicle',
    de: 'Abstieg in den Ngorongoro-Krater, pro Fahrzeug',
    fr: 'Descente dans le cratère du Ngorongoro, par véhicule',
    it: 'Discesa nel cratere di Ngorongoro, per veicolo',
  },
  gorillaPermit: {
    en: 'Gorilla trekking permit, per person',
    de: 'Gorilla-Trekking-Permit, pro Person',
    fr: 'Permis de trek aux gorilles, par personne',
    it: 'Permesso per il trekking dei gorilla, a persona',
  },
  chimpPermit: {
    en: 'Chimpanzee tracking permit, per person',
    de: 'Schimpansen-Tracking-Permit, pro Person',
    fr: 'Permis de pistage des chimpanzés, par personne',
    it: 'Permesso per il tracking degli scimpanzé, a persona',
  },
  climbPackage: {
    en: 'Typical 7-day climb, per person',
    de: 'Übliche 7-Tage-Besteigung, pro Person',
    fr: 'Ascension type de 7 jours, par personne',
    it: 'Salita tipica di 7 giorni, a persona',
  },
  trekPackage: {
    en: 'Typical multi-day trek, per person',
    de: 'Übliches mehrtägiges Trekking, pro Person',
    fr: 'Trek type de plusieurs jours, par personne',
    it: 'Trekking tipico di più giorni, a persona',
  },
};

export const FEES_AS_OF = 2026;
