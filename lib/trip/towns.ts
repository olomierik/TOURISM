/**
 * Towns to search from on Near me.
 *
 * The destination list is parks and regions — right for "where should I go",
 * wrong for "car hire" or "a hotel tonight", which people ask about towns.
 * These are the towns travellers land in, stay in or pass through, with the
 * town centre's coordinates. Names are the English ones; the search box
 * matches them in any language because town names do not change.
 */
export const TOWNS: ReadonlyArray<{ name: string; lat: number; lng: number; country: string }> = [
  { name: 'Arusha', lat: -3.3869, lng: 36.683, country: 'TZ' },
  { name: 'Moshi', lat: -3.3348, lng: 37.3404, country: 'TZ' },
  { name: 'Zanzibar', lat: -6.1659, lng: 39.2026, country: 'TZ' },
  { name: 'Dar es Salaam', lat: -6.7924, lng: 39.2083, country: 'TZ' },
  { name: 'Karatu', lat: -3.3375, lng: 35.6713, country: 'TZ' },
  { name: 'Mwanza', lat: -2.5164, lng: 32.9175, country: 'TZ' },
  { name: 'Tanga', lat: -5.0689, lng: 39.0988, country: 'TZ' },
  { name: 'Dodoma', lat: -6.163, lng: 35.7516, country: 'TZ' },
  { name: 'Nairobi', lat: -1.2921, lng: 36.8219, country: 'KE' },
  { name: 'Mombasa', lat: -4.0435, lng: 39.6682, country: 'KE' },
  { name: 'Diani', lat: -4.3167, lng: 39.5667, country: 'KE' },
  { name: 'Nakuru', lat: -0.3031, lng: 36.08, country: 'KE' },
  { name: 'Kisumu', lat: -0.0917, lng: 34.768, country: 'KE' },
  { name: 'Kampala', lat: 0.3476, lng: 32.5825, country: 'UG' },
  { name: 'Entebbe', lat: 0.0512, lng: 32.4637, country: 'UG' },
  { name: 'Jinja', lat: 0.4479, lng: 33.2026, country: 'UG' },
  { name: 'Kigali', lat: -1.9441, lng: 30.0619, country: 'RW' },
  { name: 'Musanze', lat: -1.4998, lng: 29.6347, country: 'RW' },
];

/** The towns offered as one-tap chips, in the order people arrive. */
export const QUICK_TOWNS = ['Arusha', 'Moshi', 'Zanzibar', 'Dar es Salaam', 'Nairobi', 'Mombasa', 'Kampala', 'Kigali'];
