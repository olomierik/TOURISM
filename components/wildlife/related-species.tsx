'use client';

import type { SpeciesCardData } from '@/lib/wildlife/species';
import { SpeciesCard } from '@/components/wildlife/species-card';
import { useMySightings } from '@/components/wildlife/use-my-sightings';

/**
 * The "related animals" row, with this reader's seen marks.
 *
 * A client component so the cards can be marked without the page reading the
 * session — one hook for the whole row rather than one per card, which would
 * be four queries to answer one question.
 */
export function RelatedSpecies({ species }: { species: SpeciesCardData[] }) {
  const { seenSlugs } = useMySightings();
  const seen = new Set(seenSlugs);

  return (
    <ul className="mt-6 grid grid-cols-2 gap-3 sm:gap-5 md:grid-cols-4">
      {species.map((r) => (
        <li key={r.slug}>
          <SpeciesCard species={r} seen={seen.has(r.slug)} />
        </li>
      ))}
    </ul>
  );
}
