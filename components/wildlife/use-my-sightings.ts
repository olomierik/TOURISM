'use client';

import { useEffect, useState } from 'react';

import { createClient } from '@/lib/supabase/client';
import { useSessionUser } from '@/components/auth/use-session-user';

/**
 * The signed-in traveller's sighting slugs, read in the browser.
 *
 * The server-side twin of this (lib/wildlife/sightings.ts) is still right for
 * /account/sightings, which is a private page and dynamic either way. It is
 * wrong for the wildlife guide: reading the diary there meant a cookies() call
 * in the page, which is a Request-time API, which made all 192 guide pages
 * dynamic and uncacheable — the public species profiles that exist to be found
 * in search, re-rendered per visitor for a panel only signed-in readers see.
 *
 * `undefined` means not resolved yet. Signed out resolves to an empty list,
 * which every caller treats as "nothing seen" rather than an error — the same
 * contract the server version had.
 */
export function useMySightings(): {
  signedIn: boolean | undefined;
  /** De-duplicated, for "seen" marks and badge rules. */
  seenSlugs: string[];
  /** How many times this reader logged one species. */
  countFor: (slug: string) => number;
} {
  const user = useSessionUser();
  const userId = user?.id ?? null;

  // Keyed by the reader it was fetched for, so signing out or switching
  // accounts cannot show the previous reader's marks while the new query is
  // in flight — and so the effect never has to setState synchronously to
  // clear them, which would cascade a render.
  const [state, setState] = useState<{ userId: string | null; rows: string[] }>({
    userId: null,
    rows: [],
  });
  const rows = state.userId === userId ? state.rows : [];

  useEffect(() => {
    if (!userId) return;

    let active = true;
    // RLS scopes wildlife_sightings to the reader's own rows. Only the slug is
    // needed here; the diary page is where the dates, notes and photographs
    // are read. If the table does not exist yet (migration 070 not applied)
    // this fails quietly and the guide renders as it does for a visitor.
    createClient()
      .from('wildlife_sightings')
      .select('species_slug')
      .limit(1000)
      .then(({ data, error }) => {
        if (!active || error) return;
        setState({ userId, rows: (data ?? []).map((r) => r.species_slug as string) });
      });

    return () => {
      active = false;
    };
  }, [userId]);

  return {
    signedIn: user === undefined ? undefined : user !== null,
    seenSlugs: [...new Set(rows)],
    countFor: (slug: string) => rows.filter((r) => r === slug).length,
  };
}
