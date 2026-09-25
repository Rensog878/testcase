// Spoken Tamil/Hindi/Kannada/Telugu -> English catalogue search
// (src/shared/voiceSearchTerms.js).

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { spokenToCatalogQuery, catalogueVocabulary } from '../voiceSearchTerms.js';

const require = createRequire(import.meta.url);
globalThis.window = globalThis.window || {};
require('../../../public/js/lang-ta.js');
const TA = globalThis.window.SB_LANG_TA.text;

const VOCAB = catalogueVocabulary([
  ['Paddy/Rice', 'Wheat', 'Cotton', 'Tomato', 'Banana', 'Coconut', 'Potato'],
  ['Blast', 'Blight', 'Rust', 'Whitefly', 'Aphids', 'Thrips', 'Stem Borer', 'Weeds'],
  ['Fungicide', 'Insecticide', 'Bio-Stimulant', 'Herbicide', 'Nematicide', 'Fertilizer'],
]);
const q = (text, lang = 'ta', pack = TA) => spokenToCatalogQuery(text, lang, pack, VOCAB);

test('a Tamil crop and disease become the English catalogue words', () => {
  // The pack's own "Rice Blast" label wins; products list "Paddy/Rice", so it matches.
  assert.deepEqual(q('நெல் குலை நோய்'), { query: 'Rice Blast', understood: true });
  assert.equal(q('பருத்தி வெள்ளை ஈ').query, 'Cotton Whitefly');
});

test('spoken forms and glued suffixes are understood', () => {
  assert.equal(q('நெல்லுக்கு மருந்து வேண்டும்').query, 'Paddy');
  assert.equal(q('தக்காளியில் கருகல் நோய்').query, 'Tomato Blight');
  assert.equal(q('மிளகாய் இலைப்பேன்').query, 'Chilli Thrips');
});

test('longest phrase wins over its first word', () => {
  assert.equal(q('தண்டுத் துளைப்பான்').query, 'Stem Borer');
  assert.equal(q('பூஞ்சைக்கொல்லி').query, 'Fungicide');
  assert.equal(q('உருளைக்கிழங்கு').query, 'Potato');
});

test('product names said in English are kept', () => {
  assert.equal(q('Gold Gel வாழை').query, 'Banana Gold Gel');
});

test('page words from the pack ("Hello") are never search terms', () => {
  assert.equal(q('வணக்கம்').query, '');
});

test('nothing recognisable -> understood false, no Tamil left in the query', () => {
  const r = q('வணக்கம் எப்படி இருக்கீங்க');
  assert.equal(r.understood, false);
  assert.equal(r.query, '');
});

test('English pages and English speech pass through', () => {
  assert.deepEqual(q('paddy blast', 'en'), { query: 'paddy blast', understood: true });
  assert.deepEqual(q('whitefly', 'ta'), { query: 'whitefly', understood: true });
});

test('Hindi, Kannada and Telugu farmer words work without a pack', () => {
  assert.equal(q('धान के लिए दवा', 'hi', {}).query, 'Paddy');
  assert.equal(q('ಹತ್ತಿ ಬಿಳಿನೊಣ', 'kn', {}).query, 'Cotton Whitefly');
  assert.equal(q('వరి కలుపు', 'te', {}).query, 'Paddy Weeds');
});
