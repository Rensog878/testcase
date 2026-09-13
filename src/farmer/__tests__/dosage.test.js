import { test } from 'node:test';
import assert from 'node:assert/strict';

import { dosageForFarm, parseDosage, readableAmount } from '../lib/dosage.js';

test('plain per-acre amounts and ranges parse to base units', () => {
  assert.deepEqual(parseDosage('120g - 150g per Acre'), { min: 120, max: 150, unit: 'g' });
  assert.deepEqual(parseDosage('250g per Acre'), { min: 250, max: 250, unit: 'g' });
  assert.deepEqual(parseDosage('500ml per Acre'), { min: 500, max: 500, unit: 'ml' });
  assert.deepEqual(parseDosage('4 kg per acre'), { min: 4000, max: 4000, unit: 'g' });
  assert.deepEqual(parseDosage('1.5 - 2 L/acre'), { min: 1500, max: 2000, unit: 'ml' });
  assert.deepEqual(parseDosage('200 to 300 ml per acre.'), { min: 200, max: 300, unit: 'ml' });
  assert.deepEqual(parseDosage('100 g – 1 kg / acre'), { min: 100, max: 1000, unit: 'g' });
});

test('per-hectare rates are converted to per acre', () => {
  const parsed = parseDosage('2.5 kg/ha');
  assert.equal(parsed.unit, 'g');
  assert.equal(Math.round(parsed.min), 1012);
});

test('anything that is not a plain per-area rate is left alone', () => {
  for (const text of [
    '2 ml per litre of water',
    '250 per acre',
    'Spray 250g per acre twice',
    '250g per acre or as advised',
    '150g - 120g per acre',
    '1 kg - 500 ml per acre',
    '250 tablets per acre',
    '',
    null,
  ]) {
    assert.equal(parseDosage(text), null, String(text));
  }
});

test('readable amounts switch to kg and L at 1000', () => {
  assert.deepEqual(readableAmount(675, 'g'), { value: 675, unit: 'g' });
  assert.deepEqual(readableAmount(2250, 'ml'), { value: 2.25, unit: 'L' });
  assert.deepEqual(readableAmount(18000, 'g'), { value: 18, unit: 'kg' });
});

test('dose for the farm scales by acreage, or returns null', () => {
  assert.deepEqual(dosageForFarm('120g - 150g per Acre', 4.5), {
    perAcre: { min: 120, max: 150, unit: 'g' },
    acres: 4.5,
    total: { min: { value: 540, unit: 'g' }, max: { value: 675, unit: 'g' } },
  });
  assert.equal(dosageForFarm('4 kg per acre', 4.5).total.min.value, 18);
  assert.equal(dosageForFarm('2 ml per litre of water', 4.5), null);
  assert.equal(dosageForFarm('250g per acre', null), null);
  assert.equal(dosageForFarm('250g per acre', 0), null);
});
