// The floating call button's tel: link (src/shared/phoneLink.js).

import { test } from 'node:test'
import assert from 'node:assert/strict'
import { telHref } from '../phoneLink.js'

test('Indian mobile numbers dial with +91, however they were typed', () => {
  assert.equal(telHref('+91 94432 10987'), 'tel:+919443210987')
  assert.equal(telHref('94432 10987'), 'tel:+919443210987')
  assert.equal(telHref('6369879061'), 'tel:+916369879061')
  assert.equal(telHref('91-6369879061'), 'tel:+916369879061')
})

test('toll-free and landline numbers are dialled as written', () => {
  assert.equal(telHref('1800-425-9999'), 'tel:18004259999')
  assert.equal(telHref('0422 2345678'), 'tel:04222345678')
})

test('nothing to dial gives no link', () => {
  assert.equal(telHref(''), '')
  assert.equal(telHref(null), '')
  assert.equal(telHref('call us'), '')
  assert.equal(telHref('123'), '')
})
