// The crop labels the catalogue filters offer (src/utils/catalogUtils.js).
// /api/catalog-options is append-only, so the registry accumulates several
// spellings of one crop; the filter lists must show each crop once.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { cropHandle, dedupeCropLabels, isSameCrop, matchesCrop, topSelling } from '../../utils/catalogUtils.js';

test('the same crop spelled two ways is offered once, under its fuller name', () => {
  assert.deepEqual(dedupeCropLabels(['Corn / Maize', 'Corn']), ['Corn / Maize']);
  assert.deepEqual(dedupeCropLabels(['Corn', 'Corn / Maize']), ['Corn / Maize']);
  assert.deepEqual(dedupeCropLabels(['Paddy / Rice', 'Paddy/Rice']), ['Paddy / Rice']);
});

test('crops that only share a word stay apart', () => {
  assert.deepEqual(
    dedupeCropLabels(['Citrus / Fruits', 'Grapes / Fruits']),
    ['Citrus / Fruits', 'Grapes / Fruits'],
  );
  assert.deepEqual(
    dedupeCropLabels(['Potato', 'Sweet Potato / Yam']),
    ['Potato', 'Sweet Potato / Yam'],
  );
});

test('blank and repeated entries are dropped, order is kept', () => {
  assert.deepEqual(
    dedupeCropLabels(['Wheat', '', null, 'Cotton', 'Wheat', '   ']),
    ['Wheat', 'Cotton'],
  );
});

test('the label kept still selects the products the dropped one would have', () => {
  const product = { crops: ['Corn'] };
  const [kept] = dedupeCropLabels(['Corn / Maize', 'Corn']);
  assert.equal(kept, 'Corn / Maize');
  assert.ok(matchesCrop(product.crops, kept));
});

test('one crop under two names selects the same products', () => {
  assert.ok(matchesCrop(['Corn'], 'Maize'), 'a Maize filter must find a product tagged Corn');
  assert.ok(matchesCrop(['Maize'], 'Corn'), 'and the other way round');
  assert.ok(matchesCrop(['Rice'], 'Paddy'));
  assert.ok(matchesCrop(['Groundnut'], 'Peanut'));
  assert.ok(matchesCrop(['Lady Finger'], 'Okra'));
});

test('crops that are merely related stay apart', () => {
  assert.equal(matchesCrop(['Corn'], 'Tomato'), false);
  assert.equal(isSameCrop('Potato', 'Sweet Potato / Yam'), false);
  assert.equal(cropHandle('sweet potato'), 'sweet potato');
});

test('the synonyms reach the filter lists too', () => {
  assert.equal(isSameCrop('Corn / Maize', 'Maize'), true);
  assert.deepEqual(dedupeCropLabels(['Maize', 'Corn / Maize']), ['Corn / Maize']);
});

test('best sellers come back most sold first', () => {
  const products = [
    { id: 'a', unitsSold: 4 },
    { id: 'b', unitsSold: 91 },
    { id: 'c', unitsSold: 0 },
    { id: 'd', unitsSold: 37 },
  ];
  assert.deepEqual(topSelling(products, 3).map(p => p.id), ['b', 'd', 'a']);
});

test('ties are broken by rating, then reviews, so the order never wobbles', () => {
  const products = [
    { id: 'a', unitsSold: 10, rating: 4.1, reviewsCount: 90 },
    { id: 'b', unitsSold: 10, rating: 4.9, reviewsCount: 2 },
    { id: 'c', unitsSold: 10, rating: 4.1, reviewsCount: 300 },
  ];
  assert.deepEqual(topSelling(products, 3).map(p => p.id), ['b', 'c', 'a']);
});

test('before the shop has sold anything the caller keeps its own rule', () => {
  assert.equal(topSelling([{ id: 'a' }, { id: 'b', unitsSold: 0 }], 4), null);
  assert.equal(topSelling([], 4), null);
  assert.equal(topSelling(undefined, 4), null);
});

test('a broken or negative count never outranks a real one', () => {
  const products = [
    { id: 'junk', unitsSold: 'lots' },
    { id: 'negative', unitsSold: -50 },
    { id: 'real', unitsSold: 3 },
  ];
  assert.deepEqual(topSelling(products, 1).map(p => p.id), ['real']);
});
