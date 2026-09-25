// Store photos are requested at the width the screen needs, in AVIF/WebP
// where the browser accepts it (src/shared/responsiveImage.js).

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { photoUrl, photoSrcSet } from '../responsiveImage.js';

const HERO = 'https://images.unsplash.com/photo-1500382017468-9049fed747ef?w=1200&q=80';

test('an Unsplash URL gets the width, quality and auto format', () => {
  const url = new URL(photoUrl(HERO, 400));
  assert.equal(url.searchParams.get('w'), '400');
  assert.equal(url.searchParams.get('q'), '70');
  assert.equal(url.searchParams.get('auto'), 'format');
  assert.equal(url.pathname, '/photo-1500382017468-9049fed747ef');
});

test('a bare Unsplash URL (no query) works too', () => {
  assert.match(photoUrl('https://images.unsplash.com/photo-1', 800), /\?w=800&q=70&auto=format&fit=crop$/);
});

test('uploads and local assets are left alone', () => {
  assert.equal(photoUrl('/uploads/banner.jpg', 400), '/uploads/banner.jpg');
  assert.equal(photoUrl('https://example.com/a.jpg?w=5', 400), 'https://example.com/a.jpg?w=5');
  assert.equal(photoSrcSet('/uploads/banner.jpg'), undefined);
  assert.equal(photoUrl('', 400), '');
});

test('srcset lists each width once, smallest first', () => {
  const set = photoSrcSet(HERO);
  assert.deepEqual(set.split(', ').map(part => part.split(' ')[1]), ['400w', '800w', '1200w']);
});
