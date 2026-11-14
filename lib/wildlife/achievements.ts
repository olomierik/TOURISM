import type { Species, SpeciesGroup } from './types';

/**
 * Achievements, worked out from the species a traveller has seen.
 *
 * Nothing is stored: a badge is a fact about the diary, so it is recomputed
 * whenever the diary is read. Deleting a sighting can therefore take a badge
 * away again, which is the honest behaviour.
 */

export type AchievementId =
  | 'firstSighting'
  | 'bigFive'
  | 'bigCats'
  | 'species10'
  | 'species25'
  | 'species50'
  | 'mammals15'
  | 'birds15'
  | 'reptiles5'
  | 'rareFind';

export type Achievement = {
  id: AchievementId;
  current: number;
  target: number;
  done: boolean;
};

export const BIG_CATS = ['lion', 'leopard', 'cheetah'] as const;

function progress(id: AchievementId, current: number, target: number): Achievement {
  const capped = Math.min(current, target);
  return { id, current: capped, target, done: current >= target };
}

/**
 * The fields the achievement rules actually read.
 *
 * Narrower than Species on purpose. The wildlife guide now computes badges in
 * the browser — the server cannot, because knowing what you have seen means
 * reading your session, and that would make every public guide page dynamic —
 * and shipping the whole species dataset to the client a second time to get
 * four fields per animal is not worth it. The page sends this projection
 * instead.
 */
export type AchievementSpecies = Pick<Species, 'slug' | 'group' | 'bigFive' | 'rarity'>;

/** Distinct species slugs that exist in the guide. Unknown slugs are ignored. */
export function seenSpecies<T extends AchievementSpecies>(
  slugs: Iterable<string>,
  species: readonly T[],
): T[] {
  const wanted = new Set(slugs);
  return species.filter((s) => wanted.has(s.slug));
}

export function computeAchievements(
  slugs: Iterable<string>,
  species: readonly AchievementSpecies[],
): Achievement[] {
  const seen = seenSpecies(slugs, species);
  const seenSlugs = new Set(seen.map((s) => s.slug));
  const inGroup = (g: SpeciesGroup) => seen.filter((s) => s.group === g).length;

  const bigFiveTotal = species.filter((s) => s.bigFive).length;

  return [
    progress('firstSighting', seen.length, 1),
    progress('bigFive', seen.filter((s) => s.bigFive).length, bigFiveTotal),
    progress('bigCats', BIG_CATS.filter((c) => seenSlugs.has(c)).length, BIG_CATS.length),
    progress('species10', seen.length, 10),
    progress('species25', seen.length, 25),
    progress('species50', seen.length, 50),
    progress('mammals15', inGroup('mammal'), 15),
    progress('birds15', inGroup('bird'), 15),
    progress('reptiles5', inGroup('reptile'), 5),
    progress('rareFind', seen.filter((s) => s.rarity === 'rare').length, 1),
  ];
}
