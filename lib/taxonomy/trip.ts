import type { Enums } from '@/lib/supabase/database.types';

/**
 * The two descriptive levels an operator can claim: the trip, and the things
 * they run on it. Both are closed lists, declared in migration 074 as the
 * Postgres enums `trip_intent` and `trip_activity`.
 *
 * These lived in `components/directory/intent-chips.tsx` and
 * `components/directory/activity-chips.tsx`, which are client components. The
 * dashboard's save action needs the same lists to reject a value the enum
 * would refuse, and importing a chip row into a server action would pull React
 * and next-intl into it for the sake of two string arrays. So the arrays moved
 * here and the chip rows re-export them — one list, read from one place, which
 * is the only way adding a tenth activity stays a one-line change.
 *
 * The order is the order they are offered in. It is not alphabetical and not
 * the enum's declaration order on purpose: within each list the broad things
 * an operator is likely to run come before the specialist ones, so the first
 * few chips are the ones most operators recognise as theirs.
 */
export const TRIP_INTENTS = ['safari', 'mountain', 'beach', 'combo'] as const;

export const TRIP_ACTIVITIES = [
  'walking_safaris',
  'bird_watching',
  'photography',
  'balloon',
  'day_trips',
  'cultural_tours',
  'snorkeling',
  'diving',
  'spice_tours',
] as const;

export type TripIntentValue = Enums<'trip_intent'>;
export type TripActivityValue = Enums<'trip_activity'>;

export const isTripIntent = (v: string | undefined): v is TripIntentValue =>
  Boolean(v) && (TRIP_INTENTS as readonly string[]).includes(v as string);

export const isTripActivity = (v: string | undefined): v is TripActivityValue =>
  Boolean(v) && (TRIP_ACTIVITIES as readonly string[]).includes(v as string);
