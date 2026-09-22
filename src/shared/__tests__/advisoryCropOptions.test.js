// The crops the home page advisory form lists (advisoryCropOptions in
// src/utils/catalogUtils.js): the sign-up list, then the catalogue's own crops.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { advisoryCropOptions } from '../../utils/catalogUtils.js';
import { CROP_CHOICES } from '../profileFieldRules.js';

// /api/catalog-options on the live site, 2026-09-22.
const LIVE = ['Paddy / Rice', 'Wheat', 'Cotton', 'Tomato', 'Corn / Maize', 'Sugarcane', 'Citrus / Fruits', 'Grapes / Fruits', 'Potato', 'All Crops', 'wheat', 'tomato', 'Paddy/Rice', 'Corn', 'Citrus', 'Grapes', 'Coconut', 'Arecanut', 'Tapioca', 'Tubers', 'Banana'];

test('sign-up crops first, in their order, then catalogue-only crops A to Z', () => {
  assert.deepEqual(advisoryCropOptions(CROP_CHOICES, LIVE), [
    'Paddy / Rice', 'Wheat', 'Cotton', 'Tomato', 'Corn / Maize', 'Sugarcane', 'Citrus / Fruits', 'Grapes / Fruits', 'Potato',
    'Arecanut', 'Banana', 'Coconut', 'Tapioca', 'Tubers',
  ]);
});

test('each crop once, whatever the spelling; never "All Crops"', () => {
  const list = advisoryCropOptions(['Paddy / Rice', 'All Crops'], ['paddy/rice', 'PADDY / RICE', 'all crops', 'Banana', 'banana']);
  assert.deepEqual(list, ['Paddy / Rice', 'Banana']);
});

test('no catalogue yet (or it failed to load): the sign-up list alone', () => {
  assert.deepEqual(advisoryCropOptions(CROP_CHOICES, undefined), CROP_CHOICES.filter(c => c !== 'All Crops'));
  assert.deepEqual(advisoryCropOptions(CROP_CHOICES, []), CROP_CHOICES.filter(c => c !== 'All Crops'));
});

test('blank and junk entries are ignored', () => {
  assert.deepEqual(advisoryCropOptions([], ['', '   ', null, 'Coconut']), ['Coconut']);
});
