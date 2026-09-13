import { test } from 'node:test';
import assert from 'node:assert/strict';

import { FARMER_STRINGS, formatDay, formatRupees, placeholdersOf, translate, translateCount } from '../i18n/strings.js';

test('every English string has a Tamil translation with the same placeholders', () => {
  const en = FARMER_STRINGS.en;
  const ta = FARMER_STRINGS.ta;
  assert.deepEqual(Object.keys(ta).sort(), Object.keys(en).sort());
  for (const key of Object.keys(en)) {
    assert.ok(ta[key].trim(), `${key} is blank in Tamil`);
    assert.deepEqual(placeholdersOf(ta[key]), placeholdersOf(en[key]), key);
  }
});

test('translate fills placeholders and falls back to English, then the key', () => {
  assert.equal(translate('ta', 'greeting.named', { name: 'Ravi' }), 'வணக்கம், Ravi');
  assert.equal(translate('hi', 'greeting.named', { name: 'Ravi' }), 'Vanakkam, Ravi');
  assert.equal(translate('en', 'no.such.key'), 'no.such.key');
  assert.equal(translate('en', 'orders.total', {}), 'Total {amount}');
});

test('translateCount picks singular and plural forms', () => {
  assert.equal(translateCount('en', 'farm.acres', 1), '1 acre');
  assert.equal(translateCount('en', 'farm.acres', 2.5), '2.5 acres');
  assert.equal(translateCount('ta', 'age.hours', 3), '3 மணி நேரத்திற்கு முன் புதுப்பிக்கப்பட்டது');
});

test('money and dates are formatted for India', () => {
  assert.equal(formatRupees(2773, 'en'), '₹2,773');
  assert.equal(formatRupees(2973.6, 'en'), '₹2,973.60');
  assert.equal(formatRupees(undefined, 'en'), '');
  assert.equal(formatDay(Date.UTC(2026, 8, 12, 20, 0, 0), 'en'), '13 Sept');
  assert.equal(formatDay(null, 'en'), '');
});
