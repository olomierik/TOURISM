/**
 * What a budget group trip costs per person, per day and in total.
 *
 * Rough local prices in US dollars, the ranges travellers are told to expect
 * (owner's brief, 24 Nov 2026). They are estimates for planning, shown as a
 * range, never a quote: the guide's quote is the price. The point the page
 * makes is that the guide's day is shared by the whole group, so the cost per
 * person falls as the group grows.
 *
 * No imports, so tests run it directly.
 */

export type StayKind = 'hostel' | 'homestay' | 'guesthouse';
export type Region = 'arusha' | 'moshi' | 'usambara' | 'zanzibar' | 'dar';

type Range = readonly [number, number];

export const STAY_PER_NIGHT: Record<StayKind, Range> = {
  hostel: [10, 18],
  homestay: [12, 22],
  guesthouse: [18, 30],
};

/** Three local meals a day. */
export const FOOD_PER_DAY: Range = [8, 12];

/** Daladala, bajaji and the odd hired minibus, per person per day. */
export const TRANSPORT_PER_DAY: Range = [3, 8];

/** Village, cultural-programme and site fees, per person per day. */
export const ACTIVITIES_PER_DAY: Record<Region, Range> = {
  arusha: [10, 20],
  moshi: [10, 20],
  usambara: [8, 15],
  zanzibar: [12, 25],
  dar: [8, 15],
};

/** One local guide's day, for the whole group; a second guide per 15 people. */
export const GUIDE_PER_DAY: Range = [30, 50];
export const PEOPLE_PER_GUIDE = 15;

export type Estimate = {
  guides: number;
  perPersonPerDay: Range;
  perPersonTotal: Range;
  groupTotal: Range;
  lines: Array<{ key: 'guide' | 'stay' | 'food' | 'transport' | 'activities'; perPersonPerDay: Range }>;
};

const round = (n: number) => Math.round(n);

export function estimateGroupTrip(input: {
  people: number;
  days: number;
  stay: StayKind;
  region: Region;
}): Estimate {
  const people = Math.min(200, Math.max(1, Math.round(input.people)));
  const days = Math.min(30, Math.max(1, Math.round(input.days)));
  const guides = Math.max(1, Math.ceil(people / PEOPLE_PER_GUIDE));
  const guide: Range = [(GUIDE_PER_DAY[0] * guides) / people, (GUIDE_PER_DAY[1] * guides) / people];
  // Nights are one fewer than days: the last day ends with the trip home.
  const nightsShare = Math.max(0, days - 1) / days;
  const stay: Range = [STAY_PER_NIGHT[input.stay][0] * nightsShare, STAY_PER_NIGHT[input.stay][1] * nightsShare];
  const lines: Estimate['lines'] = [
    { key: 'guide', perPersonPerDay: guide },
    { key: 'stay', perPersonPerDay: stay },
    { key: 'food', perPersonPerDay: FOOD_PER_DAY },
    { key: 'transport', perPersonPerDay: TRANSPORT_PER_DAY },
    { key: 'activities', perPersonPerDay: ACTIVITIES_PER_DAY[input.region] },
  ];
  const lo = lines.reduce((s, l) => s + l.perPersonPerDay[0], 0);
  const hi = lines.reduce((s, l) => s + l.perPersonPerDay[1], 0);
  return {
    guides,
    perPersonPerDay: [round(lo), round(hi)],
    perPersonTotal: [round(lo * days), round(hi * days)],
    groupTotal: [round(lo * days * people), round(hi * days * people)],
    lines: lines.map((l) => ({ ...l, perPersonPerDay: [round(l.perPersonPerDay[0]), round(l.perPersonPerDay[1])] as Range })),
  };
}
