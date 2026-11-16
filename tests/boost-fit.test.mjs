import { test } from 'node:test';
import assert from 'node:assert/strict';

import { boostFitsCategory } from '../lib/queries/boost-fit.ts';

test('a featured operator with no category is shown on every tour page', () => {
  for (const page of ['safaris', 'activities', 'tour-guides']) assert.ok(boostFitsCategory([], page));
});

test('a featured safari operator is shown on activities and guides too', () => {
  assert.ok(boostFitsCategory(['safaris'], 'activities'));
  assert.ok(boostFitsCategory(['safaris'], 'tour-guides'));
});

test('a featured tour operator is not pinned above hotels, car hire or restaurants', () => {
  assert.ok(!boostFitsCategory([], 'hotels'));
  assert.ok(!boostFitsCategory(['safaris'], 'hotels'));
  assert.ok(!boostFitsCategory(['safaris'], 'restaurants'));
  assert.ok(!boostFitsCategory(['activities'], 'car-rental'));
});

test('a featured hotel stays on hotel pages', () => {
  assert.ok(boostFitsCategory(['hotels'], 'hotels'));
  assert.ok(!boostFitsCategory(['hotels'], 'safaris'));
});
