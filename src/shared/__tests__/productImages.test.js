// Photo list parsing for the admin product form (src/shared/productImages.js).

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseImageList } from '../productImages.js';

test('one path per line', () => {
  assert.deepEqual(parseImageList('/assets/a.png\n/assets/b.png\n'), ['/assets/a.png', '/assets/b.png']);
});

test('comma-separated URLs on a line still split', () => {
  assert.deepEqual(parseImageList('/a.png, /b.png\r\n/c.png'), ['/a.png', '/b.png', '/c.png']);
});

test('uploaded data: URLs stay whole', () => {
  const photo = 'data:image/png;base64,iVBORw0KGgo=';
  assert.deepEqual(parseImageList(`/assets/a.png\n${photo}\n  ${photo}  `), ['/assets/a.png', photo, photo]);
});

test('empty input gives no photos', () => {
  assert.deepEqual(parseImageList(''), []);
  assert.deepEqual(parseImageList(undefined), []);
  assert.deepEqual(parseImageList(' \n , \n'), []);
});
