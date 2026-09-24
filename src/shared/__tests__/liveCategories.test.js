// liveCategories (src/utils/catalogUtils.js): the category filters on the
// store list exactly the categories the live products are in.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { liveCategories } from '../../utils/catalogUtils.js';

const admin = ['Fungicide', 'Insecticide', 'Bio-Stimulant', 'Fertilizer', 'Nematicide', 'Equipments'];

test('only categories with products, in the admin order, with counts', () => {
  const products = [{ category: 'Fertilizer' }, { category: 'Bio-Stimulant' }, { category: 'Bio-Stimulant' }, { category: 'Fertilizer' }, { category: 'Bio-Stimulant' }];
  assert.deepEqual(liveCategories(products, admin), [{ name: 'Bio-Stimulant', count: 3 }, { name: 'Fertilizer', count: 2 }]);
});

test('spellings of one category merge under the admin name; unknown ones follow A-Z', () => {
  const products = [{ category: 'Fungicides' }, { category: ' fungicide ' }, { category: 'Seeds' }, { category: 'Animal Husbandry' }, { category: '' }, {}];
  assert.deepEqual(liveCategories(products, admin), [{ name: 'Fungicide', count: 2 }, { name: 'Animal Husbandry', count: 1 }, { name: 'Seeds', count: 1 }]);
});

test('no products, no categories', () => {
  assert.deepEqual(liveCategories([], admin), []);
  assert.deepEqual(liveCategories(undefined), []);
});
