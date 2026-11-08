import { cache } from 'react';

import { createPublicClient } from '@/lib/supabase/public';
import type { Enums } from '@/lib/supabase/database.types';

export type TripIntent = Enums<'trip_intent'>;
export type TripActivity = Enums<'trip_activity'>;
export type OperatorRegister = Enums<'operator_register'>;

export type RegisterCheck = {
  register: OperatorRegister;
  listed: boolean;
  checkedOn: string;
  sourceUrl: string | null;
};

export type OperatorFacts = {
  intents: TripIntent[];
  activities: TripActivity[];
  /** Every register we have read for this operator, found or not found. */
  registers: RegisterCheck[];
};

const EMPTY: OperatorFacts = { intents: [], activities: [], registers: [] };

/**
 * The trip intents, activities and register checks for one listing.
 *
 * Three small reads rather than one join, because they are three independent
 * facts and a listing commonly has one of them and not the others — 2,929 of
 * our listings are stubs with no intent recorded at all.
 *
 * Register rows come back in a fixed order with the strongest first, and
 * crucially they include the ones where `listed` is false. A page that showed
 * only the memberships an operator holds would be advertising; showing the
 * registers we read and did not find them on is the part a traveller cannot
 * get anywhere else. See migration 074.
 */
export const getOperatorFacts = cache(async (businessId: string): Promise<OperatorFacts> => {
  try {
    const supabase = createPublicClient();
    const [intents, activities, registers] = await Promise.all([
      supabase.from('business_intents').select('intent').eq('business_id', businessId),
      supabase.from('business_activities').select('activity').eq('business_id', businessId),
      supabase
        .from('business_registers')
        .select('register, listed, checked_on, source_url')
        .eq('business_id', businessId),
    ]);

    const order: OperatorRegister[] = ['tato', 'tlto', 'zato', 'kinapa'];

    return {
      intents: (intents.data ?? []).map((r) => r.intent),
      activities: (activities.data ?? []).map((r) => r.activity),
      registers: (registers.data ?? [])
        .map((r) => ({
          register: r.register,
          listed: r.listed,
          checkedOn: r.checked_on,
          sourceUrl: r.source_url,
        }))
        // Listed first, then by register strength. A traveller skimming should
        // meet what the operator has before what they have not.
        .sort(
          (a, b) =>
            Number(b.listed) - Number(a.listed) ||
            order.indexOf(a.register) - order.indexOf(b.register),
        ),
    };
  } catch (err) {
    // A profile page is not worth losing over a taxonomy read.
    console.warn('getOperatorFacts:', err);
    return EMPTY;
  }
});
