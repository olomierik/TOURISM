import { test } from 'node:test';
import assert from 'node:assert/strict';

import { estimateGroupTrip } from '../lib/group-trips/costs.ts';
import { missingDocuments } from '../lib/tour-guides/constants.ts';

test('a bigger group pays less per person', () => {
  const four = estimateGroupTrip({ people: 4, days: 5, stay: 'hostel', region: 'arusha' });
  const twelve = estimateGroupTrip({ people: 12, days: 5, stay: 'hostel', region: 'arusha' });
  assert.ok(twelve.perPersonPerDay[0] < four.perPersonPerDay[0]);
  assert.ok(twelve.perPersonPerDay[1] < four.perPersonPerDay[1]);
});

test('large groups get a second guide', () => {
  assert.equal(estimateGroupTrip({ people: 15, days: 3, stay: 'hostel', region: 'moshi' }).guides, 1);
  assert.equal(estimateGroupTrip({ people: 16, days: 3, stay: 'hostel', region: 'moshi' }).guides, 2);
});

test('totals multiply out and stay in a budget range', () => {
  const e = estimateGroupTrip({ people: 12, days: 5, stay: 'hostel', region: 'arusha' });
  assert.ok(e.perPersonPerDay[0] >= 25 && e.perPersonPerDay[1] <= 75, JSON.stringify(e.perPersonPerDay));
  assert.ok(e.perPersonTotal[0] <= e.perPersonTotal[1]);
  assert.ok(Math.abs(e.groupTotal[0] - e.perPersonTotal[0] * 12) <= 12);
});

test('nonsense input is clamped, not thrown', () => {
  const e = estimateGroupTrip({ people: -3, days: 0, stay: 'homestay', region: 'zanzibar' });
  assert.equal(e.guides, 1);
  assert.ok(e.perPersonTotal[0] > 0);
});

test('verification needs ID, photo, and a WEO letter or passport', () => {
  assert.deepEqual(missingDocuments({}, 'community'), ['national_id', 'photo', 'weo_or_passport']);
  assert.deepEqual(missingDocuments({ national_id: true, photo: true, passport: true }, 'community'), []);
  assert.deepEqual(missingDocuments({ national_id: true, photo: true, weo_letter: true }, 'licensed'), ['licence']);
});
