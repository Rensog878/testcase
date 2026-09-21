// Online order numbers start with SAM (Sathyam Agro Mart). Run from server/: npm test

import { test } from 'node:test';
import assert from 'node:assert/strict';

process.env.MONGODB_URI = '';
console.warn = () => {};
const { newId, ORDER_ID_PREFIX } = await import('../db.js');

test('new order numbers start with SAM-ORD-', () => {
  assert.equal(ORDER_ID_PREFIX, 'SAM-ORD');
  const ids = Array.from({ length: 200 }, () => newId(ORDER_ID_PREFIX));
  for (const id of ids) assert.match(id, /^SAM-ORD-[0-9A-Z]{9,}$/);
  assert.equal(new Set(ids).size, ids.length, 'no two alike');
});
