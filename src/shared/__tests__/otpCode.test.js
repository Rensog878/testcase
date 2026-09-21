// Reading the sign-in code out of copied WhatsApp text (src/shared/otpCode.js).

import { test } from 'node:test'
import assert from 'node:assert/strict'
import { otpFromText } from '../otpCode.js'

test('the code on its own, however it was copied', () => {
  assert.equal(otpFromText('260024'), '260024')
  assert.equal(otpFromText(' 260 024\n'), '260024')
  assert.equal(otpFromText('260-024'), '260024')
})

test('the code inside the whole message', () => {
  const message = '🌱 Sathyam Agro Mart\n\nYour code: *354857*\n\nGood for 5 minutes. Sent to +91 98765 01234.'
  assert.equal(otpFromText(message), '354857')
  assert.equal(otpFromText('Your code: 354857. Your code: 354857.'), '354857')
})

test('nothing to fill when there is no single code', () => {
  assert.equal(otpFromText(''), '')
  assert.equal(otpFromText(null), '')
  assert.equal(otpFromText('hello'), '')
  assert.equal(otpFromText('12345'), '')
  assert.equal(otpFromText('9876501234'), '', 'a mobile number is not a code')
  assert.equal(otpFromText('old 111111 new 222222'), '', 'two codes: do not guess')
})
