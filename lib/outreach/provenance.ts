/**
 * Where a listing's contact address came from, derived once.
 *
 * This function existed twice — in the staging script and in the translation
 * seeder — and the two copies drifted. The staging copy was never taught about
 * OpenStreetMap, so every OSM listing fell through to the default sentence,
 * "we built the listing from public tourism licensing records", and 88 of those
 * messages were sent to real businesses. OpenStreetMap is not a licensing
 * record. The one claim in that email a recipient could check was the false one.
 *
 * The derivation reads the English description because that is where provenance
 * is actually recorded; "which import ran last" is not a property of a row.
 * Both callers now import this, so a new source is added in one place.
 *
 * Returns null rather than a guess. A caller that cannot name the register must
 * say nothing, not reach for a plausible sentence — see provenanceFor in
 * ./message.ts, and the refusal in scripts/stage-outreach.mjs.
 */
export type OutreachSource = 'kato' | 'utb' | 'gmaps' | 'osm';

export function sourceOf(description = ''): OutreachSource | null {
  // Most specific first: a KATO member's description also mentions that it was
  // compiled from public records.
  if (/Kenya Association of Tour Operators/i.test(description)) return 'kato';
  if (/Uganda Tourism Board/i.test(description)) return 'utb';
  if (/listed on Google Maps/i.test(description)) return 'gmaps';
  if (/recorded in OpenStreetMap/i.test(description)) return 'osm';
  return null;
}
