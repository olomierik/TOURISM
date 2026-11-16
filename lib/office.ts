/**
 * The company's office: on the About page and in the Organization structured
 * data (components/layout/site-schema.tsx), so the two never disagree.
 * Proper nouns, so the same in every language; only the labels around them
 * are translated (messages: about.office*).
 */
export const OFFICE = {
  building: 'NHC Building, Plot 3 KB 14',
  street: 'Market Street',
  ward: 'Central Ward',
  landmark: 'Amana Bank',
  poBox: '5667',
  city: 'Tanga',
  country: 'Tanzania',
  countryCode: 'TZ',
} as const;

/** A Google Maps search for the office, for the "open in maps" link. */
export const OFFICE_MAP_URL = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
  `${OFFICE.building}, ${OFFICE.street}, ${OFFICE.city}, ${OFFICE.country}`,
)}`;
