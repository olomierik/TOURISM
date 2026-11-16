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

/** The office's own Google Maps pin, as shared by the owner (16 Nov 2026). */
export const OFFICE_MAP_URL = 'https://maps.app.goo.gl/kpeZreF6h6NVo7YH6';
