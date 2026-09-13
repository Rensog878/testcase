import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  ALL_CROPS_ID,
  CROPS,
  cropDisplayName,
  matchCrops,
  normalizeCropText,
  resolveCrop,
  resolveCropList,
} from '../../shared/cropRegistry.js';
import { buildFarmerContext } from '../lib/farmerContext.js';

test('spellings used across the site normalize to the same key', () => {
  assert.equal(normalizeCropText('Paddy / Rice'), 'paddy rice');
  assert.equal(normalizeCropText('Paddy/Rice'), 'paddy rice');
  assert.equal(normalizeCropText('  PADDY - rice '), 'paddy rice');
});

test('aliases resolve to canonical ids', () => {
  for (const [text, id] of [
    ['Paddy / Rice', 'paddy'],
    ['Paddy/Rice', 'paddy'],
    ['Rice', 'paddy'],
    ['நெல்', 'paddy'],
    ['Corn / Maize', 'corn'],
    ['Corn', 'corn'],
    ['Maize', 'corn'],
    ['Grapes / Fruits', 'grapes'],
    ['Grapes', 'grapes'],
    ['Citrus / Fruits', 'citrus'],
    ['Tomato / Vegetables', 'tomato'],
  ]) {
    const resolved = resolveCrop(text);
    assert.equal(resolved.id, id, text);
    assert.equal(resolved.status, 'known', text);
  }
});

test('registration and product spellings of paddy now match', () => {
  const farmer = resolveCrop('Paddy / Rice').id;
  assert.equal(matchCrops([farmer], resolveCropList(['Paddy/Rice', 'Wheat'])), 'exact');
});

test('no crop: blank, missing and N/A resolve to none', () => {
  for (const value of [undefined, null, '', '   ', 'N/A', 'none']) {
    const resolved = resolveCrop(value);
    assert.equal(resolved.status, 'none', String(value));
    assert.equal(resolved.id, null, String(value));
  }
});

test('"All Crops" and its variants resolve to all', () => {
  for (const value of ['All Crops', 'all', 'All Crops (General)', 'General Crop']) {
    assert.deepEqual([resolveCrop(value).id, resolveCrop(value).status], [ALL_CROPS_ID, 'all'], value);
  }
});

test('unknown crop names become custom ids that still match each other', () => {
  const banana = resolveCrop(' Banana ');
  assert.equal(banana.status, 'custom');
  assert.equal(banana.id, 'custom:banana');
  assert.equal(banana.raw, 'Banana');
  assert.equal(matchCrops([banana.id], resolveCropList(['BANANA'])), 'exact');
  assert.equal(matchCrops([banana.id], resolveCropList(['Mango'])), 'none');
  assert.equal(resolveCrop('Vegetables').status, 'custom');
});

test('resolveCropList de-duplicates, drops blanks and accepts comma text', () => {
  assert.deepEqual(resolveCropList(['Paddy/Rice', 'Rice', 'Wheat', '', null]), ['paddy', 'wheat']);
  assert.deepEqual(resolveCropList('Cotton, Tomato'), ['cotton', 'tomato']);
  assert.deepEqual(resolveCropList(undefined), []);
});

test('matchCrops covers exact, general, none and unknown', () => {
  assert.equal(matchCrops(['paddy'], ['wheat', 'paddy']), 'exact');
  assert.equal(matchCrops(['paddy'], [ALL_CROPS_ID]), 'general');
  assert.equal(matchCrops([ALL_CROPS_ID], ['cotton']), 'general');
  assert.equal(matchCrops(['paddy'], ['cotton']), 'none');
  assert.equal(matchCrops([], ['cotton']), 'unknown');
  assert.equal(matchCrops(['paddy'], []), 'unknown');
});

test('display names use the language, then English, then the typed text', () => {
  assert.equal(cropDisplayName(resolveCrop('Paddy/Rice'), 'ta'), 'நெல்');
  assert.equal(cropDisplayName(resolveCrop('Paddy/Rice'), 'hi'), 'धान');
  assert.equal(cropDisplayName(resolveCrop('Paddy/Rice'), 'kn'), 'ಭತ್ತ');
  assert.equal(cropDisplayName(resolveCrop('Paddy/Rice'), 'te'), 'వరి');
  assert.equal(cropDisplayName(resolveCrop('Paddy/Rice'), 'ml'), 'Paddy / Rice');
  assert.equal(cropDisplayName(resolveCrop('All Crops'), 'hi'), 'सभी फसलें');
  assert.equal(resolveCrop('ಭತ್ತ').id, 'paddy', 'a crop typed in Kannada is still found');
  assert.equal(cropDisplayName(resolveCrop('All Crops'), 'ta'), 'அனைத்து பயிர்கள்');
  assert.equal(cropDisplayName(resolveCrop('Banana'), 'ta'), 'Banana');
  assert.equal(cropDisplayName(resolveCrop(''), 'en'), null);
});

test('registry entries are complete and unambiguous', () => {
  const ids = new Set();
  const owners = new Map();
  for (const crop of CROPS) {
    assert.ok(!ids.has(crop.id), `duplicate id ${crop.id}`);
    ids.add(crop.id);
    for (const lang of ['en', 'ta', 'kn', 'te', 'hi']) assert.ok(crop.names[lang], `${crop.id} needs a ${lang} name`);
    for (const text of [crop.id, ...Object.values(crop.names), ...crop.aliases]) {
      const key = normalizeCropText(text);
      assert.ok(!owners.has(key) || owners.get(key) === crop.id, `"${text}" belongs to ${owners.get(key)} and ${crop.id}`);
      owners.set(key, crop.id);
      assert.equal(resolveCrop(text).id, crop.id, text);
    }
  }
});

test('farmer context drops placeholder places and empty acreage', () => {
  const context = buildFarmerContext({ id: 'USR-1', name: ' Ravi ', crop: 'All Crops', acreage: 0, village: 'Farm Village', district: 'Karur', state: 'Tamil Nadu' });
  assert.equal(context.userId, 'USR-1');
  assert.equal(context.name, 'Ravi');
  assert.deepEqual(context.cropIds, [ALL_CROPS_ID]);
  assert.equal(context.acreage, null);
  assert.deepEqual(context.location, { village: null, district: 'Karur', state: 'Tamil Nadu' });

  const empty = buildFarmerContext(null);
  assert.equal(empty.crop.status, 'none');
  assert.deepEqual(empty.cropIds, []);
});
