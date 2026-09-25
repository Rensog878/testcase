// A CMS field still at its built-in English copy gives way to the page's
// translation; anything an admin typed shows as typed (src/shared/cmsDefaults.js).

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { DEFAULT_CONTENT, preferTranslation } from '../cmsDefaults.js';

const TAMIL = 'அதிகம் வளருங்கள்';

test('untouched default + Tamil translation -> Tamil', () => {
  assert.equal(preferTranslation('heroTitle', DEFAULT_CONTENT.heroTitle, TAMIL), TAMIL);
  assert.equal(preferTranslation('categoryGridTitle', 'Shop by Category', 'வகை வாரியாக வாங்குங்கள்'), 'வகை வாரியாக வாங்குங்கள்');
});

test('English pages keep the CMS value, even at the default', () => {
  assert.equal(preferTranslation('heroTitle', DEFAULT_CONTENT.heroTitle, 'Grow More, Protect Better'), DEFAULT_CONTENT.heroTitle);
});

test('text an admin changed always wins, in every language', () => {
  assert.equal(preferTranslation('heroTitle', 'Diwali offers are live', TAMIL), 'Diwali offers are live');
});

test('no CMS value -> the translation', () => {
  assert.equal(preferTranslation('heroTitle', '', TAMIL), TAMIL);
  assert.equal(preferTranslation('heroTitle', '', 'Grow More'), 'Grow More');
});

test('a key with no built-in default is never swapped', () => {
  assert.equal(preferTranslation('someNewKey', 'Hello', TAMIL), 'Hello');
});
