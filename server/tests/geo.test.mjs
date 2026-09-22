// The optional GPS point on a delivery address. Run from server/: npm test

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { cleanGeo, mapsUrl } from '../geo.js';

test('a point in India is kept, rounded, with its accuracy', () => {
  const geo = cleanGeo({ lat: '10.6583451234', lng: 77.0081239876, accuracy: 18.6 });
  assert.equal(geo.lat, 10.658345);
  assert.equal(geo.lng, 77.008124);
  assert.equal(geo.accuracy, 19);
  assert.ok(!Number.isNaN(Date.parse(geo.capturedAt)));
});

test('no point, or a broken one, is simply not kept', () => {
  for (const value of [undefined, null, '', 'x', {}, { lat: 'a', lng: 77 }, { lat: 10 }, { lat: NaN, lng: 77 }]) {
    assert.equal(cleanGeo(value), null);
  }
});

test('points outside India are refused', () => {
  assert.equal(cleanGeo({ lat: 51.5, lng: -0.12 }), null); // London
  assert.equal(cleanGeo({ lat: 0, lng: 0 }), null);
  assert.equal(cleanGeo({ lat: 13.08, lng: 120 }), null);
});

test('a missing or odd accuracy is null, a huge one is capped', () => {
  assert.equal(cleanGeo({ lat: 11, lng: 78 }).accuracy, null);
  assert.equal(cleanGeo({ lat: 11, lng: 78, accuracy: -5 }).accuracy, null);
  assert.equal(cleanGeo({ lat: 11, lng: 78, accuracy: 9e9 }).accuracy, 100000);
});

test('only the coordinates reach the stored point', () => {
  const geo = cleanGeo({ lat: 11, lng: 78, accuracy: 5, extra: '<script>' });
  assert.deepEqual(Object.keys(geo).sort(), ['accuracy', 'capturedAt', 'lat', 'lng']);
});

test('maps link', () => {
  assert.equal(mapsUrl({ lat: 10.5, lng: 77.25 }), 'https://www.google.com/maps/search/?api=1&query=10.5,77.25');
  assert.equal(mapsUrl(null), '');
});
