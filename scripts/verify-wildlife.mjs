// Badge rules for the wildlife diary (lib/wildlife/achievements.ts).
// Run: npm run verify:wildlife
import assert from 'node:assert/strict';
import { computeAchievements } from '../lib/wildlife/achievements.ts';
import { SPECIES, BIG_FIVE } from '../lib/wildlife/species.ts';
const get = (list, id) => list.find((a) => a.id === id);
assert.equal(SPECIES.length, 102);
assert.equal(BIG_FIVE.length, 5);
let a = computeAchievements([], SPECIES);
assert.equal(a.filter((x) => x.done).length, 0);
a = computeAchievements(['lion', 'lion', 'not-a-real-animal'], SPECIES);
assert.equal(get(a, 'firstSighting').done, true);
assert.equal(get(a, 'species10').current, 1);
a = computeAchievements(['african-bush-elephant','lion','leopard','black-rhinoceros','african-buffalo'], SPECIES);
assert.equal(get(a, 'bigFive').done, true);
assert.equal(get(a, 'rareFind').done, true); // black rhino is rare
assert.equal(get(a, 'bigCats').current, 2);
a = computeAchievements(SPECIES.map((s) => s.slug), SPECIES);
assert.ok(a.every((x) => x.done));
assert.ok(a.every((x) => x.current <= x.target));
console.log('all badge checks passed');
