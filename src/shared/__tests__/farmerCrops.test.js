import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  applyCropUpdate,
  farmerCropChoices,
  farmerCropIds,
  farmerCropLabels,
  farmerCropMatch,
  MAX_FARMER_CROPS,
  normalizeFarmerCrops,
} from '../farmerCrops.js';

test('primary first, duplicates by crop (not spelling) removed, blanks dropped', () => {
  assert.deepEqual(normalizeFarmerCrops('Paddy / Rice', ['Cotton', 'Paddy/Rice', '', 'N/A', ' Cotton ']), {
    crop: 'Paddy / Rice',
    crops: ['Paddy / Rice', 'Cotton'],
  });
  assert.deepEqual(normalizeFarmerCrops('', ['Tomato', 'Wheat']), { crop: 'Tomato', crops: ['Tomato', 'Wheat'] });
  assert.deepEqual(normalizeFarmerCrops('Banana', 'Mango, banana'), { crop: 'Banana', crops: ['Banana', 'Mango'] });
  assert.deepEqual(normalizeFarmerCrops(undefined), { crop: '', crops: [] });
});

test('"All Crops" stays only when nothing specific is listed', () => {
  assert.deepEqual(normalizeFarmerCrops('All Crops'), { crop: 'All Crops', crops: ['All Crops'] });
  assert.deepEqual(normalizeFarmerCrops('All Crops', ['Cotton']), { crop: 'Cotton', crops: ['Cotton'] });
});

test('lists are capped and labels trimmed to a safe length', () => {
  const many = Array.from({ length: 15 }, (_, i) => `Crop number ${i}`);
  assert.equal(normalizeFarmerCrops(many[0], many).crops.length, MAX_FARMER_CROPS);
  assert.equal(normalizeFarmerCrops('x'.repeat(100)).crop.length, 60);
});

test('pre-migration accounts read as a one-crop list', () => {
  assert.deepEqual(farmerCropLabels({ crop: 'Paddy / Rice' }), ['Paddy / Rice']);
  assert.deepEqual(farmerCropLabels({ primaryCrop: 'Cotton' }), ['Cotton']);
  assert.deepEqual(farmerCropLabels({ crop: 'N/A' }), []);
  assert.deepEqual(farmerCropLabels(null), []);
  assert.deepEqual(farmerCropLabels({ crop: 'Cotton', crops: ['Tomato', 'Cotton'] }), ['Cotton', 'Tomato'], 'the primary is always first');
  assert.deepEqual(farmerCropIds({ crop: 'Paddy / Rice', crops: ['Paddy / Rice', 'Corn / Maize'] }), ['paddy', 'corn']);
});

test('product matching uses every crop and every spelling', () => {
  const farmer = { crop: 'Paddy / Rice', crops: ['Paddy / Rice', 'Sugarcane'] };
  assert.equal(farmerCropMatch(farmer, ['Paddy/Rice', 'Wheat']), 'exact');
  assert.equal(farmerCropMatch(farmer, ['Sugarcane']), 'exact');
  assert.equal(farmerCropMatch(farmer, ['All Crops']), 'general');
  assert.equal(farmerCropMatch(farmer, ['Cotton']), 'none');
  assert.equal(farmerCropMatch({ crop: 'Paddy / Rice' }, ['Paddy/Rice']), 'exact', 'the bug where "Paddy / Rice" never matched "Paddy/Rice"');
  assert.equal(farmerCropMatch({ crop: 'All Crops' }, ['Cotton']), 'general');
});

test('updates keep crop and crops consistent whichever one is sent', () => {
  const existing = { crop: 'Paddy / Rice', crops: ['Paddy / Rice', 'Cotton', 'Tomato'] };

  assert.equal(applyCropUpdate(existing, { village: 'Karur' }), null);
  assert.deepEqual(applyCropUpdate(existing, { crop: 'Sugarcane' }), { crop: 'Sugarcane', crops: ['Sugarcane', 'Cotton', 'Tomato'] }, 'older forms: new primary, others kept');
  assert.deepEqual(applyCropUpdate(existing, { crop: 'Cotton' }), { crop: 'Cotton', crops: ['Cotton', 'Tomato'] }, 'the old primary is replaced, not kept as an extra');
  assert.deepEqual(applyCropUpdate(existing, { crops: ['Wheat', 'Potato'] }), { crop: 'Wheat', crops: ['Wheat', 'Potato'] });
  assert.deepEqual(applyCropUpdate(existing, { crop: 'Potato', crops: ['Wheat', 'Potato'] }), { crop: 'Potato', crops: ['Potato', 'Wheat'] });
  assert.deepEqual(applyCropUpdate({ crop: 'Cotton' }, { crop: 'Tomato' }), { crop: 'Tomato', crops: ['Tomato'] }, 'pre-migration account');
  assert.deepEqual(applyCropUpdate(existing, { crops: [] }), { crop: '', crops: [] });
});

test('picker choices come from the registry in stored (English) names', () => {
  const choices = farmerCropChoices();
  assert.ok(choices.length >= 9);
  assert.deepEqual(choices[0], { id: 'paddy', label: 'Paddy / Rice', names: { en: 'Paddy / Rice', ta: 'நெல்' } });
});
