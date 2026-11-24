import { test } from 'node:test';
import assert from 'node:assert/strict';

import { parseNearQuery } from '../lib/trip/near-query.ts';

const PLACES = ['Arusha', 'Zanzibar', 'Serengeti', 'Arusha National Park', 'Moshi'];

test('car hire near me', () => {
  assert.deepEqual(parseNearQuery('Car hire near me', PLACES), { categoryKey: 'car-rental', place: null, nearMe: true });
});

test('hotel near me', () => {
  assert.deepEqual(parseNearQuery('hotel near me', PLACES), { categoryKey: 'hotels', place: null, nearMe: true });
});

test('a kind and a place', () => {
  assert.deepEqual(parseNearQuery('Hotels in Zanzibar', PLACES), { categoryKey: 'hotels', place: 'Zanzibar', nearMe: false });
  assert.deepEqual(parseNearQuery('restaurant, moshi', PLACES), { categoryKey: 'restaurants', place: 'Moshi', nearMe: false });
});

test('the longest place wins', () => {
  assert.equal(parseNearQuery('lodges arusha national park', PLACES).place, 'Arusha National Park');
});

test('the first kind mentioned wins', () => {
  assert.equal(parseNearQuery('hotel with a restaurant', PLACES).categoryKey, 'hotels');
  assert.equal(parseNearQuery('airport transfer to my hotel', PLACES).categoryKey, 'car-rental');
});

test('other languages', () => {
  assert.equal(parseNearQuery('hoteli karibu nami', PLACES).categoryKey, 'hotels');
  assert.equal(parseNearQuery('hoteli karibu nami', PLACES).nearMe, true);
  assert.equal(parseNearQuery('Mietwagen in der Nähe', PLACES).categoryKey, 'car-rental');
  assert.equal(parseNearQuery('location de voiture près de moi', PLACES).categoryKey, 'car-rental');
});

test('nothing recognised', () => {
  assert.deepEqual(parseNearQuery('   ', PLACES), { categoryKey: null, place: null, nearMe: false });
  assert.deepEqual(parseNearQuery('xyz', PLACES), { categoryKey: null, place: null, nearMe: false });
});
