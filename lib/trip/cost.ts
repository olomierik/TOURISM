/**
 * The arithmetic behind the trip cost estimator.
 *
 * Deliberately a pure module with no React and no database in it, because the
 * numbers are the part that can be wrong in a way nobody notices. A layout bug
 * is visible; a double-counted park fee just produces a total that is quietly
 * 30% too high, and the reader concludes the trip is unaffordable and leaves.
 *
 * Four rules the site has already committed to on the destination pages, and
 * which this has to keep:
 *
 *   1. Park fees are INSIDE the day rate, not on top of it. The bands are
 *      described as "all-in on the ground, per person per day". The fee floor
 *      is reported separately so a reader can see what is non-negotiable, but
 *      it is never added again.
 *
 *   2. A crater descent is charged per vehicle. Four people in one car pay it
 *      once. Charging it per head is a few hundred dollars of invented cost.
 *
 *   3. A climb package is not a supplement. A seven-day Kilimanjaro climb is
 *      the whole trip — porters, gate fees, food, guide. Adding it to seven
 *      days of Kilimanjaro day rates roughly doubles a real quote, so those
 *      nights are priced by the package instead of by the band.
 *
 *   4. Everything comes out as a range. A single number is a promise, and
 *      nobody here is in a position to make one.
 */

export type Style = 'budget' | 'midrange' | 'luxury';

export const STYLES: readonly Style[] = ['budget', 'midrange', 'luxury'] as const;

export function isStyle(v: string): v is Style {
  return (STYLES as readonly string[]).includes(v);
}

export type FeeBasis = 'per_person' | 'per_vehicle' | 'package_per_person';

/** One destination's published figures, as the calculator needs them. */
export type LegCosts = {
  currency: string;
  budgetLow: number | null;
  budgetHigh: number | null;
  midrangeLow: number | null;
  midrangeHigh: number | null;
  luxuryLow: number | null;
  luxuryHigh: number | null;
  parkFeeLow: number | null;
  parkFeeHigh: number | null;
  notableKey: string | null;
  notableAmount: number | null;
  notableBasis: FeeBasis | null;
  /** Nights a package fee covers. Null where the length genuinely varies. */
  notableNights: number | null;
  feesAsOf: number;
};

export type Leg = {
  destinationId: string;
  name: string;
  nights: number;
  costs: LegCosts | null;
};

export type LineItem = {
  destinationId: string;
  name: string;
  nights: number;
  /** Null when the destination has no published bands — reported, not guessed. */
  low: number | null;
  high: number | null;
  /** A named fee that applies once for this leg, already divided where shared. */
  fee: { key: string; basis: FeeBasis; total: number } | null;
  /** Non-negotiable government portion inside the day rate, for this leg. */
  feeFloorLow: number | null;
  feeFloorHigh: number | null;
  pricedAsPackage: boolean;
  /** Set when a package fixed this leg's nights, so the UI can say why. */
  nightsFixedBy: number | null;
};

export type Estimate = {
  currency: string;
  /** Per person, for the whole trip. */
  perPersonLow: number;
  perPersonHigh: number;
  /** Everyone together. */
  groupLow: number;
  groupHigh: number;
  /** Of the per-person total, the part set by governments. */
  floorLow: number;
  floorHigh: number;
  nights: number;
  travellers: number;
  vehicles: number;
  lines: LineItem[];
  /** Destinations in the trip with no published costs. Named, never silently skipped. */
  missing: string[];
  /** The oldest "checked in" year across the legs used. */
  asOf: number | null;
};

/**
 * Vehicles needed for a group.
 *
 * Six is the working capacity of a safari Land Cruiser with everyone getting a
 * window, which is the number operators quote against. It only matters for
 * per-vehicle fees, and rounding up is the honest direction: a seventh
 * traveller genuinely does mean a second car.
 */
export const SEATS_PER_VEHICLE = 6;

export function vehiclesFor(travellers: number): number {
  return Math.max(1, Math.ceil(travellers / SEATS_PER_VEHICLE));
}

function band(costs: LegCosts, style: Style): [number | null, number | null] {
  switch (style) {
    case 'budget':
      return [costs.budgetLow, costs.budgetHigh];
    case 'midrange':
      return [costs.midrangeLow, costs.midrangeHigh];
    case 'luxury':
      return [costs.luxuryLow, costs.luxuryHigh];
  }
}

/**
 * Adds a trip up.
 *
 * Returns null rather than a zero when nothing in the trip has published
 * figures — an estimate of $0 for four nights in the Serengeti is worse than
 * declining to answer.
 */
export function estimate(
  legs: Leg[],
  style: Style,
  travellers: number,
): Estimate | null {
  const people = Math.max(1, Math.floor(travellers));
  const vehicles = vehiclesFor(people);

  const lines: LineItem[] = [];
  const missing: string[] = [];
  let perPersonLow = 0;
  let perPersonHigh = 0;
  let floorLow = 0;
  let floorHigh = 0;
  let nights = 0;
  let currency: string | null = null;
  let asOf: number | null = null;
  let priced = 0;

  for (const leg of legs) {
    const n = Math.max(0, Math.floor(leg.nights));

    if (!leg.costs) {
      missing.push(leg.name);
      nights += n;
      lines.push({
        destinationId: leg.destinationId,
        name: leg.name,
        nights: n,
        low: null,
        high: null,
        fee: null,
        feeFloorLow: null,
        feeFloorHigh: null,
        pricedAsPackage: false,
        nightsFixedBy: null,
      });
      continue;
    }

    const c = leg.costs;
    currency ??= c.currency;
    asOf = asOf === null ? c.feesAsOf : Math.min(asOf, c.feesAsOf);

    // Rule 3. A package covers the nights rather than adding to them, so the
    // day-rate band is not applied at all on a leg priced this way.
    const isPackage = c.notableBasis === 'package_per_person' && c.notableAmount !== null;

    // And where the package states its length, that length wins. A seven-day
    // climb priced at $2,200 sitting on a line that says "3 nights" is two
    // correct numbers making a trip that cannot happen — the reader either
    // budgets for a climb they have not allowed time for, or allows time and
    // never sees the cost of it.
    const fixedNights = isPackage ? c.notableNights : null;
    const legNights = fixedNights ?? n;

    const [dayLow, dayHigh] = band(c, style);
    let low: number | null = null;
    let high: number | null = null;

    if (isPackage) {
      low = c.notableAmount;
      high = c.notableAmount;
    } else if (dayLow !== null && dayHigh !== null) {
      low = dayLow * n;
      high = dayHigh * n;
    }

    nights += legNights;

    // Rules 1 and 2. The floor is reported, never re-added; per-person and
    // per-vehicle fees are supplements and go on top, with a shared fee split
    // across the heads that share it.
    let fee: LineItem['fee'] = null;
    if (!isPackage && c.notableKey && c.notableAmount !== null && c.notableBasis) {
      const total =
        c.notableBasis === 'per_vehicle'
          ? (c.notableAmount * vehicles) / people
          : c.notableAmount;
      fee = { key: c.notableKey, basis: c.notableBasis, total };
      low = (low ?? 0) + total;
      high = (high ?? 0) + total;
    }

    const fLow = isPackage || c.parkFeeLow === null ? null : c.parkFeeLow * n;
    const fHigh = isPackage || c.parkFeeHigh === null ? null : c.parkFeeHigh * n;

    if (low !== null && high !== null) {
      perPersonLow += low;
      perPersonHigh += high;
      priced += 1;
    } else {
      missing.push(leg.name);
    }
    floorLow += fLow ?? 0;
    floorHigh += fHigh ?? 0;

    lines.push({
      destinationId: leg.destinationId,
      name: leg.name,
      nights: legNights,
      low,
      high,
      fee,
      feeFloorLow: fLow,
      feeFloorHigh: fHigh,
      pricedAsPackage: isPackage,
      nightsFixedBy: fixedNights,
    });
  }

  if (priced === 0) return null;

  return {
    currency: currency ?? 'USD',
    perPersonLow: Math.round(perPersonLow),
    perPersonHigh: Math.round(perPersonHigh),
    groupLow: Math.round(perPersonLow * people),
    groupHigh: Math.round(perPersonHigh * people),
    floorLow: Math.round(floorLow),
    floorHigh: Math.round(floorHigh),
    nights,
    travellers: people,
    vehicles,
    lines,
    missing,
    asOf,
  };
}
