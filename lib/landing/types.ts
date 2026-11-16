import type { Enums } from '@/lib/supabase/database.types';

/**
 * A search landing page: one page per phrase travellers type into Google
 * ("serengeti safari tours", "budget tanzania safari", "gorilla trekking
 * rwanda"), the way the big safari marketplaces structure their sites.
 *
 * Each one is hand-written. A page per keyword with the place name swapped
 * in is a doorway page, and Google demotes a whole site for a pattern of
 * them, so every entry here says something the others do not, and the live
 * part of the page — the operators and tours — is real directory data, not
 * filler. Pages whose filters would match nobody still render their copy and
 * the quote form; they never show an empty grid.
 */
export type LandingSection = { heading: string; paragraphs?: string[]; bullets?: string[] };

export type LandingFaq = { q: string; a: string };

export type LandingFilters = {
  /** destinations.key */
  destination?: string;
  /** categories.key: safaris, hotels, activities, car-rental, tour-guides, restaurants */
  category?: string;
  /** ISO-3166 alpha-2 */
  country?: string;
  intent?: Enums<'trip_intent'>;
  activity?: Enums<'trip_activity'>;
  /** Filters for the priced tours shown on the page. */
  tours?: {
    minDays?: number;
    maxDays?: number;
    comfort?: 'budget' | 'midrange' | 'luxury';
    style?: 'private' | 'shared';
  };
};

export type LandingGroup = 'tanzania' | 'parks' | 'styles' | 'lengths' | 'from' | 'activities' | 'east-africa';

export type LandingPage = {
  slug: string;
  group: LandingGroup;
  /** The H1. */
  heading: string;
  /**
   * The search-result title, before the site name is appended. `{count}` is
   * replaced with the number of matching operators when there are two or more;
   * `metaTitleFallback` is used otherwise.
   */
  metaTitle: string;
  metaTitleFallback: string;
  metaDescription: string;
  /** The phrases this page is written to answer. Shown to nobody; used to plan and audit. */
  keywords: string[];
  /** Label on the hub page and in "related" links. */
  shortLabel: string;
  intro: string[];
  facts?: Array<{ label: string; value: string }>;
  sections: LandingSection[];
  faqs: LandingFaq[];
  filters: LandingFilters;
  /** Published guide slugs (English) to link at the foot. */
  guides?: string[];
  related: string[];
};
