import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  normalizeReferralCode, captureReferralFromUrl, storedReferralCode, forgetReferralCode, referralShareUrl,
} from '../referralLink.js'

function fakeWindow(href) {
  const store = new Map()
  const win = {
    location: { href },
    history: { state: null, replaceState: (_s, _t, url) => { win.location.href = `https://x.test${url}` } },
    localStorage: {
      getItem: (k) => store.get(k) ?? null,
      setItem: (k, v) => store.set(k, v),
      removeItem: (k) => store.delete(k),
    },
  }
  return win
}

test('the client accepts the same codes as the server', () => {
  assert.equal(normalizeReferralCode('sam-abc def'), 'SAMABCDEF')
  assert.equal(normalizeReferralCode('SAM0O1IL2'), '')
  assert.equal(normalizeReferralCode(''), '')
})

test('?ref= is saved and removed from the address bar, other parameters stay', () => {
  const win = fakeWindow('https://x.test/products?ref=samabcdef&cat=neem#top')
  assert.equal(captureReferralFromUrl(win, 1000), 'SAMABCDEF')
  assert.equal(win.location.href, 'https://x.test/products?cat=neem#top')
  assert.equal(storedReferralCode(win, 2000), 'SAMABCDEF')
})

test('a saved code lasts 30 days and can be forgotten', () => {
  const win = fakeWindow('https://x.test/?ref=SAMABCDEF')
  captureReferralFromUrl(win, 0)
  assert.equal(storedReferralCode(win, 31 * 24 * 3600 * 1000), '')
  assert.equal(storedReferralCode(win, 29 * 24 * 3600 * 1000), 'SAMABCDEF')
  forgetReferralCode(win)
  assert.equal(storedReferralCode(win, 0), '')
})

test('a junk ref is dropped without saving', () => {
  const win = fakeWindow('https://x.test/?ref=<script>')
  assert.equal(captureReferralFromUrl(win), '')
  assert.equal(win.location.href, 'https://x.test/')
  assert.equal(storedReferralCode(win), '')
})

test('no storage (private mode) never throws', () => {
  const win = fakeWindow('https://x.test/?ref=SAMABCDEF')
  Object.defineProperty(win, 'localStorage', { get() { throw new Error('denied') } })
  assert.equal(captureReferralFromUrl(win), 'SAMABCDEF')
  assert.equal(storedReferralCode(win), '')
})

test('share link', () => {
  assert.equal(referralShareUrl('SAMABCDEF', 'https://www.sathyamagromart.com'), 'https://www.sathyamagromart.com/?ref=SAMABCDEF')
})
