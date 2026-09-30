// Shared helpers for staff CSV exports, the wishlist cache and video links.

import { test } from 'node:test'
import assert from 'node:assert/strict'
import { csvCell, toCsv } from '../csv.js'
import { cacheWishlistIds, cacheWishlistItem, cachedWishlistIds, wishlistIdsFrom, wishlistVisitorId } from '../wishlist.js'
import { getYouTubeId, isHtml5Video } from '../video.js'

test('CSV cells keep commas, quotes and line breaks in their column', () => {
  assert.equal(csvCell('Raman, Karur'), '"Raman, Karur"')
  assert.equal(csvCell('He said "hi"'), '"He said ""hi"""')
  assert.equal(csvCell(1250.5), '"1250.5"')
  assert.equal(csvCell(null), '""')
  assert.equal(toCsv([['a', 'b'], [1, 'x,y']]), '"a","b"\r\n"1","x,y"')
})

test('CSV text that looks like a formula is shown, not run; numbers stay numbers', () => {
  assert.equal(csvCell('=HYPERLINK("x")'), '"\'=HYPERLINK(""x"")"')
  assert.equal(csvCell('+91 98765 43210'), '"\'+91 98765 43210"')
  assert.equal(csvCell('-120'), '"-120"')
  assert.equal(csvCell(-120), '"-120"')
})

function memoryStorage() {
  const map = new Map()
  return { getItem: k => (map.has(k) ? map.get(k) : null), setItem: (k, v) => map.set(k, String(v)) }
}

test('the wishlist cache adds, removes and replaces product ids', () => {
  const storage = memoryStorage()
  assert.deepEqual(cachedWishlistIds(storage), [])
  cacheWishlistItem('P1', true, storage)
  cacheWishlistItem('P2', true, storage)
  cacheWishlistItem('P1', true, storage)
  assert.deepEqual(cachedWishlistIds(storage), ['P2', 'P1'])
  cacheWishlistItem('P2', false, storage)
  assert.deepEqual(cachedWishlistIds(storage), ['P1'])
  cacheWishlistIds(wishlistIdsFrom([{ productId: 'P9' }, {}, null]), storage)
  assert.deepEqual(cachedWishlistIds(storage), ['P9'])
})

test('the guest wishlist id is made once and matches the server pattern', () => {
  const storage = memoryStorage()
  const id = wishlistVisitorId(storage)
  assert.match(id, /^visitor-[A-Za-z0-9-]{16,80}$/)
  assert.equal(wishlistVisitorId(storage), id)
})

test('YouTube ids and playable video files', () => {
  assert.equal(getYouTubeId('https://www.youtube.com/watch?v=dQw4w9WgXcQ&t=3'), 'dQw4w9WgXcQ')
  assert.equal(getYouTubeId('https://youtu.be/dQw4w9WgXcQ'), 'dQw4w9WgXcQ')
  assert.equal(getYouTubeId('https://example.com/video'), null)
  assert.equal(getYouTubeId(''), null)
  assert.equal(isHtml5Video('/api/upload/abc'), true)
  assert.equal(isHtml5Video('https://x.test/clip.MP4?v=2'), true)
  assert.equal(isHtml5Video('https://youtu.be/dQw4w9WgXcQ'), false)
})
