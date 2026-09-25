// The catalogue search box (matchesSearch in src/utils/catalogUtils.js).

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { matchesSearch } from '../../utils/catalogUtils.js';

const GOLD = { name: 'Gold Gel', description: 'Seaweed bio-stimulant', activeIngredient: 'Seaweed Extract', crops: ['All Crops'], diseases: ['Blast'], category: 'Bio-Stimulant' };
const COTTON = { name: 'FlyKill', description: 'Stops sucking pests', crops: ['Cotton', 'Chilli'], diseases: ['Whitefly', 'Thrips'], category: 'Insecticide' };

test('empty search matches everything', () => {
  assert.equal(matchesSearch(GOLD, ''), true);
  assert.equal(matchesSearch(GOLD, '   '), true);
});

test('one word matches name, ingredient, crops, pests or category', () => {
  assert.equal(matchesSearch(GOLD, 'gold'), true);
  assert.equal(matchesSearch(GOLD, 'seaweed'), true);
  assert.equal(matchesSearch(COTTON, 'whitefly'), true);
  assert.equal(matchesSearch(COTTON, 'insecticide'), true);
  assert.equal(matchesSearch(GOLD, 'whitefly'), false);
});

test('every word must match (voice search gives crop + pest)', () => {
  assert.equal(matchesSearch(COTTON, 'Cotton Whitefly'), true);
  assert.equal(matchesSearch(COTTON, 'Tomato Whitefly'), false);
  assert.equal(matchesSearch(GOLD, 'Gold Gel'), true);
});

test('an all-crops product counts for any crop word', () => {
  const crops = new Set(['paddy', 'rice', 'cotton', 'banana']);
  assert.equal(matchesSearch(GOLD, 'Rice Blast', crops), true);
  assert.equal(matchesSearch(GOLD, 'Rice Whitefly', crops), false, 'the pest must still match');
  assert.equal(matchesSearch(COTTON, 'Banana Whitefly', crops), false, 'a crop-specific product keeps its crops');
  assert.equal(matchesSearch(GOLD, 'Rice Blast'), false, 'no crop list, no widening');
});
