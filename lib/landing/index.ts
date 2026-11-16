import { tanzaniaPages } from './pages-tanzania.ts';
import { morePages } from './pages-more.ts';
import { LANDING_EXTRA, LANDING_EXTRA_FAQS } from './extra.ts';
import type { LandingGroup, LandingPage } from './types.ts';

export type { LandingPage, LandingGroup } from './types.ts';

/** Every search landing page, in hub order. */
export const LANDING_PAGES: readonly LandingPage[] = [...tanzaniaPages, ...morePages].map((p) => {
  const extra = LANDING_EXTRA[p.slug] ?? {};
  return {
    ...p,
    sections: [...p.sections, ...(extra.sections ?? [])],
    faqs: [...p.faqs, ...(extra.faqs ?? []), ...(LANDING_EXTRA_FAQS[p.slug] ?? [])],
  };
});

const BY_SLUG = new Map(LANDING_PAGES.map((p) => [p.slug, p]));

export function getLandingPage(slug: string): LandingPage | undefined {
  return BY_SLUG.get(slug);
}

/** Hub sections, in display order. */
export const LANDING_GROUPS: ReadonlyArray<{ key: LandingGroup; title: string }> = [
  { key: 'tanzania', title: 'Tanzania safaris' },
  { key: 'parks', title: 'By national park' },
  { key: 'lengths', title: 'By length' },
  { key: 'styles', title: 'By style and budget' },
  { key: 'from', title: 'By starting point' },
  { key: 'activities', title: 'Climbs, beaches and activities' },
  { key: 'east-africa', title: 'Kenya, Uganda and Rwanda' },
];

/** The handful linked from the footer on every English page. */
export const FOOTER_LANDING_SLUGS = [
  'tanzania-safari-tours',
  'serengeti-safari-tours',
  'kilimanjaro-climbing-tours',
  'zanzibar-tours',
  'budget-tanzania-safari',
  '7-day-tanzania-safari',
] as const;

/**
 * These pages are written in English only. Other locales do not serve them,
 * rather than serving English under a German URL, which Google reads as
 * duplicate content.
 */
export const LANDING_LOCALE = 'en' as const;
