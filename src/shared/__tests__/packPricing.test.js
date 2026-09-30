// Pack prices shown by the store (src/shared/packPricing.js). The expected
// numbers are what unitPriceFor() in server/server.js charges for the same
// product and pack, so a change on either side that breaks this is a price
// the customer sees but is not charged (or the other way round).

import { test } from 'node:test'
import assert from 'node:assert/strict'
import { packMrp, packPrice, packUnits } from '../packPricing.js'

test('packUnits reads grams and millilitres', () => {
  assert.equal(packUnits('500g'), 500)
  assert.equal(packUnits('1 kg'), 1000)
  assert.equal(packUnits('1.5 Litre'), 1500)
  assert.equal(packUnits('250 ml'), 250)
  assert.equal(packUnits('Standard'), 1)
  assert.equal(packUnits(undefined), 1)
})

test('a pack with its own price uses it; others scale the base price, as the server does', () => {
  const product = { price: 380, packSizes: ['500g', '1kg', '5 kg'], packagePrices: { '5 kg': '3400' } }
  assert.equal(packPrice(product, '500g', '500g'), 380)
  assert.equal(packPrice(product, '1kg', '500g'), 760)
  assert.equal(packPrice(product, '5 kg', '500g'), 3400)
  assert.equal(packPrice({ price: 199, packPrices: { '1 L': 350 } }, '1 L', '500 ml'), 350)
  assert.equal(packPrice({ price: 100 }, '', '500g'), 100)
  assert.equal(packPrice({ price: 100 }, '1kg', undefined), 100)
})

test('the MRP scales with the price unless the pack has its own', () => {
  const product = { price: 400, originalPrice: 500, packageMrps: { '5 kg': 4200 } }
  assert.equal(packMrp(product, '1kg', 800), 1000)
  assert.equal(packMrp(product, '5 kg', 3800), 4200)
  assert.equal(packMrp({ price: 400 }, '1kg', 800), 800)
})
