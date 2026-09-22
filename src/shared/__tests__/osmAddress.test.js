// "Use my current location": OpenStreetMap address -> checkout fields
// (src/shared/osmAddress.js). The two samples are real Nominatim replies.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { addressFromOsm } from '../osmAddress.js';
import { STATES } from '../../hooks/checkoutRules.js';

test('a town address (Pollachi) fills every field it can', () => {
  const osm = { road: 'NH83', suburb: 'Jothi Nagar', town: 'Pollachi', county: 'Pollachi', state_district: 'Coimbatore', state: 'Tamil Nadu', postcode: '642001', country: 'India' };
  assert.deepEqual(addressFromOsm(osm, STATES), {
    street: 'NH83', area: 'Jothi Nagar', taluk: 'Pollachi', district: 'Coimbatore', pincode: '642001', state: 'Tamil Nadu',
  });
});

test('a city address uses the revenue district, not the city zone', () => {
  const osm = { road: 'North Coimbatore Flyover', suburb: 'Gandhipuram', city_district: 'Central Zone', city: 'Coimbatore', county: 'Coimbatore North', state_district: 'Coimbatore', state: 'Tamil Nadu', postcode: '641001' };
  const out = addressFromOsm(osm, STATES);
  assert.equal(out.district, 'Coimbatore');
  assert.equal(out.taluk, 'Coimbatore North');
  assert.equal(out.area, 'Gandhipuram');
});

test('a village is the area, and "taluk" / "District" words are dropped', () => {
  const out = addressFromOsm({ village: 'Kinathukadavu', county: 'Kinathukadavu Taluk', state_district: 'Coimbatore District', state: 'tamil nadu' }, STATES);
  assert.equal(out.area, 'Kinathukadavu');
  assert.equal(out.taluk, 'Kinathukadavu');
  assert.equal(out.district, 'Coimbatore');
  assert.equal(out.state, 'Tamil Nadu');
});

test('a state outside the list is Other; a bad PIN is left for the customer', () => {
  const out = addressFromOsm({ state: 'Punjab', postcode: '1410' }, STATES);
  assert.equal(out.state, 'Other');
  assert.equal('pincode' in out, false);
});

test('nothing found fills nothing', () => {
  assert.deepEqual(addressFromOsm(undefined, STATES), {});
  assert.deepEqual(addressFromOsm({ country: 'India' }, STATES), {});
});

test('maps link only for an order with a GPS point', async () => {
  const { gpsMapsUrl } = await import('../osmAddress.js');
  assert.equal(gpsMapsUrl({ addressDetails: { geo: { lat: 10.658, lng: 77.008 } } }), 'https://www.google.com/maps/search/?api=1&query=10.658,77.008');
  assert.equal(gpsMapsUrl({ addressDetails: {} }), '');
  assert.equal(gpsMapsUrl({ address: 'x' }), '');
  assert.equal(gpsMapsUrl(null), '');
});
