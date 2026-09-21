// A new product keeps each pack size's own price. Run from server/: npm test

import { test } from 'node:test';
import assert from 'node:assert/strict';

process.env.MONGODB_URI = '';
console.warn = () => {};
const { packPriceMap } = await import('../db.js');

test('each size keeps its own price, and only real sizes and prices', () => {
  const packs = ['500g', '1kg'];
  assert.deepEqual(packPriceMap({ '500g': 390, '1kg': '720', '5kg': 3000 }, packs), { '500g': 390, '1kg': 720 });
  assert.deepEqual(packPriceMap({ '500g': 0, '1kg': 'abc' }, packs), {});
  assert.deepEqual(packPriceMap(undefined, packs), {});
  assert.deepEqual(packPriceMap('nope', packs), {});
});
