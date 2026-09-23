// Voice typing helpers (src/shared/voiceText.js).

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { endPunctuationless, speechLang } from '../voiceText.js';

test('a spoken phrase loses the full stop the speech service adds', () => {
  assert.equal(endPunctuationless('Apple.'), 'Apple');
  assert.equal(endPunctuationless(' Coconut ? '), 'Coconut');
  assert.equal(endPunctuationless('தென்னை।'), 'தென்னை');
  assert.equal(endPunctuationless('St. Thomas Mount'), 'St. Thomas Mount', 'a dot inside is kept');
  assert.equal(endPunctuationless('Paddy / Rice'), 'Paddy / Rice');
});

test('names follow the site language; addresses and searches stay English', () => {
  assert.equal(speechLang('text', 'ta'), 'ta-IN');
  assert.equal(speechLang('text', 'en'), 'en-IN');
  assert.equal(speechLang('latin', 'ta'), 'en-IN');
});
