import { pool } from './db.mjs';
import { estimate, vehiclesFor, isStyle, STYLES } from '../lib/trip/cost.ts';
import { parseTrip, serializeTrip, MAX_STOPS } from '../lib/trip/url.ts';

/**
 * Assertions for the trip cost arithmetic.
 *
 * This suite exists because a wrong total is invisible. Nothing throws, no page
 * 500s, no test goes red — the reader simply sees a number that is 30% too high
 * and decides East Africa is out of their reach. Every check here is a specific
 * way that could happen, with fixtures rather than live data so the expected
 * numbers can be written down and compared exactly.
 */

let passed = 0;
let failed = 0;

function check(label, ok, detail = '') {
  if (ok) {
    passed += 1;
    console.log(`  PASS  ${label}${detail ? ` — ${detail}` : ''}`);
  } else {
    failed += 1;
    console.log(`  FAIL  ${label}${detail ? ` — ${detail}` : ''}`);
  }
}

/** A destination with plain day-rate bands and a park fee inside them. */
const plain = (over = {}) => ({
  currency: 'USD',
  budgetLow: 100, budgetHigh: 200,
  midrangeLow: 200, midrangeHigh: 400,
  luxuryLow: 500, luxuryHigh: 1000,
  parkFeeLow: 60, parkFeeHigh: 80,
  notableKey: null, notableAmount: null, notableBasis: null, notableNights: null,
  feesAsOf: 2026,
  ...over,
});

const leg = (name, nights, costs) => ({ destinationId: name, name, nights, costs });

console.log('\n--- Day rates multiply by nights, and nothing else ---');

{
  const e = estimate([leg('Serengeti', 4, plain())], 'midrange', 2);
  check('four nights mid-range is 4 × the band', e.perPersonLow === 800 && e.perPersonHigh === 1600,
    `${e.perPersonLow}–${e.perPersonHigh}, expected 800–1600`);
  check('group total is per person × heads', e.groupLow === 1600 && e.groupHigh === 3200,
    `${e.groupLow}–${e.groupHigh}`);
  check('nights are summed', e.nights === 4);
}

{
  const budget = estimate([leg('Serengeti', 3, plain())], 'budget', 1);
  const lux = estimate([leg('Serengeti', 3, plain())], 'luxury', 1);
  check('style selects the right band',
    budget.perPersonLow === 300 && lux.perPersonLow === 1500,
    `budget ${budget.perPersonLow}, luxury ${lux.perPersonLow}`);
}

// The single most likely arithmetic error on this site. The bands are
// documented as all-in and the fee floor is a subset of them, so adding the
// floor on top inflates every safari total by roughly a third.
console.log('\n--- Park fees are inside the day rate, never added twice ---');

{
  const e = estimate([leg('Serengeti', 4, plain())], 'midrange', 2);
  check('the floor is reported, not added', e.perPersonLow === 800,
    `total ${e.perPersonLow} would be ${800 + e.floorLow} if the floor were added`);
  check('the floor is still reported for the reader', e.floorLow === 240 && e.floorHigh === 320,
    `${e.floorLow}–${e.floorHigh} across 4 nights`);
  check('the floor never exceeds the total it sits inside', e.floorLow <= e.perPersonLow);
}

console.log('\n--- A shared fee is shared ---');

{
  const crater = plain({ notableKey: 'craterDescent', notableAmount: 300, notableBasis: 'per_vehicle' });

  const solo = estimate([leg('Ngorongoro', 1, crater)], 'midrange', 1);
  check('one traveller pays the whole vehicle fee', solo.perPersonLow === 200 + 300,
    `${solo.perPersonLow}, expected 500`);

  const four = estimate([leg('Ngorongoro', 1, crater)], 'midrange', 4);
  check('four in one vehicle split it', four.perPersonLow === 200 + 75,
    `${four.perPersonLow} per person, expected 275`);
  check('the group pays it once, not four times', four.groupLow === 4 * 200 + 300,
    `${four.groupLow}, expected 1100`);

  // Seven people do not fit in one Land Cruiser, and pretending they do
  // undercounts a real second-vehicle charge.
  const seven = estimate([leg('Ngorongoro', 1, crater)], 'midrange', 7);
  check('seven travellers need two vehicles', seven.vehicles === 2, `${seven.vehicles}`);
  check('the group pays for both', seven.groupLow === 7 * 200 + 600, `${seven.groupLow}`);
}

{
  const permit = plain({ notableKey: 'gorillaPermit', notableAmount: 800, notableBasis: 'per_person' });
  const four = estimate([leg('Bwindi', 1, permit)], 'midrange', 4);
  check('a permit is charged per head, not split', four.perPersonLow === 200 + 800,
    `${four.perPersonLow}, expected 1000`);
  check('the group pays four permits', four.groupLow === 4 * 1000, `${four.groupLow}`);
}

console.log('\n--- A climb package is the trip, not an extra ---');

{
  const climb = plain({
    notableKey: 'climbPackage', notableAmount: 2200, notableBasis: 'package_per_person',
    budgetLow: 150, budgetHigh: 250, midrangeLow: 250, midrangeHigh: 450,
  });

  const e = estimate([leg('Kilimanjaro', 7, climb)], 'midrange', 2);
  check('the package replaces the day rates', e.perPersonLow === 2200 && e.perPersonHigh === 2200,
    `${e.perPersonLow}–${e.perPersonHigh}, not ${250 * 7}–${450 * 7 + 2200}`);
  check('the leg is marked as package-priced', e.lines[0].pricedAsPackage === true);
  check('a package leg reports no separate fee floor', e.lines[0].feeFloorLow === null,
    'gate fees are already inside the package price');

  // The failure this guards: 7 nights of day rates PLUS the package.
  const wrong = 250 * 7 + 2200;
  check('the total is not day rates plus the package', e.perPersonLow !== wrong,
    `${e.perPersonLow} vs the double-counted ${wrong}`);
}

{
  // A seven-day climb on a line reading "3 nights" is two correct numbers
  // making an impossible trip. Where the package states its length, it wins.
  const climb7 = plain({
    notableKey: 'climbPackage', notableAmount: 2200,
    notableBasis: 'package_per_person', notableNights: 7,
  });
  const e = estimate([leg('Kilimanjaro', 3, climb7)], 'midrange', 2);
  check('a package with a stated length overrides the nights asked for',
    e.nights === 7 && e.lines[0].nights === 7, `${e.nights} nights, the stepper said 3`);
  check('and says which package fixed them', e.lines[0].nightsFixedBy === 7);
  check('the price is still the package', e.perPersonLow === 2200);

  // Trip length has to follow, or a two-stop trip reports a total for six
  // nights against an itinerary that needs ten.
  const two = estimate([leg('Serengeti', 3, plain()), leg('Kilimanjaro', 3, climb7)], 'midrange', 2);
  check('trip length follows the package, not the stepper', two.nights === 10,
    `${two.nights}, expected 3 + 7`);

  // And where the length genuinely varies, nothing is invented.
  const trek = plain({
    notableKey: 'trekPackage', notableAmount: 1300,
    notableBasis: 'package_per_person', notableNights: null,
  });
  const v = estimate([leg('Rwenzori', 4, trek)], 'midrange', 2);
  check('a package of unstated length keeps the nights asked for',
    v.nights === 4 && v.lines[0].nightsFixedBy === null, `${v.nights}`);
}

console.log('\n--- Missing data is named, never invented ---');

{
  const e = estimate([leg('Serengeti', 3, plain()), leg('Tanga', 2, null)], 'midrange', 2);
  check('a destination without costs is listed as missing',
    e.missing.length === 1 && e.missing[0] === 'Tanga', e.missing.join(', '));
  check('its nights still count toward the trip length', e.nights === 5, `${e.nights}`);
  check('the priced part is still totalled', e.perPersonLow === 600, `${e.perPersonLow}`);
  check('the unpriced line renders as unknown, not zero', e.lines[1].low === null);
}

{
  const none = estimate([leg('Tanga', 3, null)], 'midrange', 2);
  check('a trip with nothing priced returns null, not a $0 estimate', none === null);
}

{
  // A band can be null for one style and present for another — a destination
  // with no luxury option must not silently price as free.
  const noLux = plain({ luxuryLow: null, luxuryHigh: null });
  const e = estimate([leg('Tanga', 3, noLux), leg('Serengeti', 2, plain())], 'luxury', 2);
  check('a missing band for the chosen style is missing, not zero',
    e.missing.includes('Tanga') && e.lines[0].low === null);
  check('the rest of the trip still totals', e.perPersonLow === 1000, `${e.perPersonLow}`);
}

console.log('\n--- Guards against nonsense input ---');

{
  check('zero travellers is treated as one', estimate([leg('S', 1, plain())], 'midrange', 0).travellers === 1);
  check('fractional travellers are floored', estimate([leg('S', 1, plain())], 'midrange', 2.7).travellers === 2);
  check('negative nights do not subtract', estimate([leg('S', -3, plain())], 'midrange', 1).nights === 0);
  check('vehiclesFor rounds up', vehiclesFor(1) === 1 && vehiclesFor(6) === 1 && vehiclesFor(7) === 2);
  check('a low is never above its high',
    STYLES.every((s) => {
      const e = estimate([leg('S', 3, plain())], s, 2);
      return e.perPersonLow <= e.perPersonHigh;
    }));
  check('isStyle rejects anything else', isStyle('midrange') && !isStyle('cheap'));
}

console.log('\n--- The oldest checked-in year is the one shown ---');

{
  const e = estimate(
    [leg('A', 1, plain({ feesAsOf: 2026 })), leg('B', 1, plain({ feesAsOf: 2024 }))],
    'midrange', 1,
  );
  check('asOf is the oldest leg, not the newest', e.asOf === 2024,
    `${e.asOf} — quoting the newest would date a stale figure as current`);
}

console.log('\n--- A shared trip link survives being a link ---');

const parse = (qs) => parseTrip(new URLSearchParams(qs));

{
  const t = parse('stops=serengeti:3,ngorongoro:2&style=luxury&people=4');
  check('a well-formed link parses', t.stops.length === 2 && t.style === 'luxury' && t.travellers === 4,
    JSON.stringify(t));
  check('order is preserved', t.stops[0].slug === 'serengeti' && t.stops[1].slug === 'ngorongoro');

  const round = parse(serializeTrip(t));
  check('serialize and parse round-trip', JSON.stringify(round) === JSON.stringify(t));
}

{
  check('an empty trip serializes to nothing, not to empty params',
    serializeTrip({ stops: [], style: 'midrange', travellers: 2 }) === '');
}

// Everything below is a query string somebody could arrive with: a truncated
// paste, a hand edit, a stale link. None of it may produce a number nobody chose.
{
  check('no query at all gives a usable default',
    (() => { const t = parse(''); return t.stops.length === 0 && t.style === 'midrange' && t.travellers === 2; })());

  check('a stop with no nights is dropped, not defaulted',
    parse('stops=serengeti').stops.length === 0);
  check('a stop with unparseable nights is dropped',
    parse('stops=serengeti:abc').stops.length === 0);
  check('zero nights is not a stop', parse('stops=serengeti:0').stops.length === 0);
  check('a negative night count is dropped', parse('stops=serengeti:-4').stops.length === 0);
  check('an absurd night count is dropped', parse('stops=serengeti:9999').stops.length === 0);

  check('a valid stop survives an invalid neighbour',
    (() => { const t = parse('stops=serengeti:3,:,ngorongoro:2'); return t.stops.length === 2; })());

  check('a duplicate stop appears once',
    parse('stops=serengeti:3,serengeti:5').stops.length === 1);

  check('an unknown style falls back rather than rendering a blank band',
    parse('stops=serengeti:3&style=platinum').style === 'midrange');
  check('an absurd traveller count falls back',
    parse('stops=serengeti:3&people=9999').travellers === 2);
  check('zero travellers falls back', parse('stops=serengeti:3&people=0').travellers === 2);

  // A slug goes into a database lookup and into a URL. Bound the shape here so
  // nothing pathological gets that far.
  check('a slug with punctuation is rejected',
    parse('stops=<script>:3').stops.length === 0);
  check('a slug with a slash is rejected', parse('stops=a/b:3').stops.length === 0);
  check('an enormous slug is rejected', parse(`stops=${'a'.repeat(200)}:3`).stops.length === 0);

  const many = Array.from({ length: 40 }, (_, i) => `dest-${i}:2`).join(',');
  check('a link cannot build an unbounded trip',
    parse(`stops=${many}`).stops.length === MAX_STOPS, `${parse(`stops=${many}`).stops.length}`);
}

console.log('\n--- The live data can actually be summed ---');

const client = await pool.connect();
try {
  const { rows } = await client.query(
    `select count(*) n from destination_costs
      where notable_fee_key is not null and notable_fee_basis is null`,
  );
  check('every seeded fee says what it is charged against', Number(rows[0].n) === 0);

  const { rows: b } = await client.query(
    `select notable_fee_key, notable_fee_basis from destination_costs
      where notable_fee_key is not null group by 1, 2 order by 1`,
  );
  const map = Object.fromEntries(b.map((r) => [r.notable_fee_key, r.notable_fee_basis]));
  check('the crater descent is per vehicle', map.craterDescent === 'per_vehicle', map.craterDescent);
  check('permits are per person',
    map.gorillaPermit === 'per_person' && map.chimpPermit === 'per_person');
  check('climbs and treks are packages',
    map.climbPackage === 'package_per_person' && map.trekPackage === 'package_per_person');

  // One key seeded with two different bases would make the same fee behave
  // differently depending on which destination the reader picked.
  const { rows: split } = await client.query(
    `select count(*) n from (
       select notable_fee_key from destination_costs
        where notable_fee_key is not null
        group by notable_fee_key having count(distinct notable_fee_basis) > 1) x`,
  );
  check('no fee key is charged two different ways', Number(split[0].n) === 0);

  const { rows: pkgNights } = await client.query(
    `select notable_fee_key, notable_fee_nights from destination_costs
      where notable_fee_basis = 'package_per_person' order by 1`,
  );
  const nightsBy = Object.fromEntries(
    pkgNights.map((r) => [r.notable_fee_key, r.notable_fee_nights]),
  );
  check('the climb package states the seven days its label already claimed',
    nightsBy.climbPackage === 7, `${nightsBy.climbPackage}`);
  check('the trek package states nothing, because its length genuinely varies',
    nightsBy.trekPackage === null, `${nightsBy.trekPackage}`);

  const { rows: strayNights } = await client.query(
    `select count(*) n from destination_costs
      where notable_fee_nights is not null and notable_fee_basis <> 'package_per_person'`,
  );
  check('no per-person or per-vehicle fee carries a night count', Number(strayNights[0].n) === 0);

  // A real trip through the live data, end to end.
  const { rows: real } = await client.query(
    `select d.key, dc.* from destination_costs dc
       join destinations d on d.id = dc.destination_id
      where d.key in ('serengeti', 'ngorongoro')`,
  );
  if (real.length === 2) {
    const toLeg = (key, nights) => {
      const r = real.find((x) => x.key === key);
      return {
        destinationId: key, name: key, nights,
        costs: {
          currency: r.currency,
          budgetLow: r.budget_low, budgetHigh: r.budget_high,
          midrangeLow: r.midrange_low, midrangeHigh: r.midrange_high,
          luxuryLow: r.luxury_low, luxuryHigh: r.luxury_high,
          parkFeeLow: r.park_fee_low, parkFeeHigh: r.park_fee_high,
          notableKey: r.notable_fee_key, notableAmount: r.notable_fee_amount,
          notableBasis: r.notable_fee_basis, notableNights: r.notable_fee_nights,
          feesAsOf: r.fees_as_of,
        },
      };
    };
    const e = estimate([toLeg('serengeti', 3), toLeg('ngorongoro', 2)], 'midrange', 4);
    check('a real five-night northern circuit prices', e !== null && e.perPersonLow > 0,
      `${e.currency} ${e.perPersonLow}–${e.perPersonHigh} pp, ${e.nights} nights, ${e.vehicles} vehicle(s)`);
    check('and it lands somewhere a human would recognise',
      e.perPersonLow > 500 && e.perPersonHigh < 12000,
      `${e.perPersonLow}–${e.perPersonHigh} — outside this range means a unit error`);
    check('the floor is a real fraction of it, not most of it',
      e.floorLow > 0 && e.floorLow < e.perPersonLow,
      `floor ${e.floorLow} inside ${e.perPersonLow}`);
  } else {
    check('serengeti and ngorongoro both have costs', false, `found ${real.length}`);
  }
} finally {
  client.release();
  await pool.end();
}

console.log('\n====================================================');
console.log(`  ${passed} passed, ${failed} failed`);
console.log('====================================================\n');
process.exitCode = failed > 0 ? 1 : 0;
