/**
 * The closed lists a tour guide picks from, shared by the sign-up form, the
 * profile, the group trips page and the admin review. No imports, so tests
 * and server code read the same lists.
 */

export const GUIDE_KINDS = ['licensed', 'community'] as const;
export type GuideKind = (typeof GUIDE_KINDS)[number];

export const GUIDE_LANGUAGES = [
  'english', 'swahili', 'french', 'german', 'italian', 'spanish', 'portuguese', 'chinese', 'arabic', 'korean',
] as const;

export const GUIDE_SPECIALTIES = [
  'culture', 'food', 'hiking', 'town_walks', 'coffee_spice', 'volunteering', 'faith', 'education', 'wildlife_day', 'beach',
] as const;

/** Who the group trips are for (owner, 24 Nov 2026): churches, schools, backpackers. */
export const GROUP_AUDIENCES = ['church', 'school', 'backpackers'] as const;
export type GroupAudience = (typeof GROUP_AUDIENCES)[number];

/**
 * The verification window (owner, 24 Nov 2026): an ID, a photo, and either a
 * letter from the Ward Executive Officer or a passport. A licence is asked of
 * licensed guides.
 */
export const DOC_KINDS = ['national_id', 'photo', 'weo_letter', 'passport', 'licence'] as const;
export type DocKind = (typeof DOC_KINDS)[number];

export type DocSet = Partial<Record<DocKind, boolean>>;

/** What is still missing before a guide can submit for verification. */
export function missingDocuments(docs: DocSet, kind: GuideKind): Array<DocKind | 'weo_or_passport'> {
  const missing: Array<DocKind | 'weo_or_passport'> = [];
  if (!docs.national_id) missing.push('national_id');
  if (!docs.photo) missing.push('photo');
  if (!docs.weo_letter && !docs.passport) missing.push('weo_or_passport');
  if (kind === 'licensed' && !docs.licence) missing.push('licence');
  return missing;
}

export const isOneOf = <T extends readonly string[]>(list: T, v: unknown): v is T[number] =>
  typeof v === 'string' && (list as readonly string[]).includes(v);

/** Mobile money a guide can be paid deposits on (migration 100). */
export const MOBILE_MONEY = ['mpesa', 'tigopesa', 'airtelmoney', 'halopesa', 'other'] as const;
export const MOBILE_MONEY_LABEL: Record<(typeof MOBILE_MONEY)[number], string> = {
  mpesa: 'M-Pesa',
  tigopesa: 'Tigo Pesa (Mixx by Yas)',
  airtelmoney: 'Airtel Money',
  halopesa: 'HaloPesa',
  other: 'Mobile money',
};
