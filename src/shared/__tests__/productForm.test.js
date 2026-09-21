// The Form filter (src/shared/productForm.js).

import { test } from 'node:test'
import assert from 'node:assert/strict'
import { PRODUCT_FORMS, formCounts, matchesForm, productForm } from '../productForm.js'

test('the client’s three forms come first', () => {
  assert.deepEqual(PRODUCT_FORMS.slice(0, 3), ['Powder', 'Pellets', 'Tablets'])
})

test('a form saved on the product wins, whatever its capitals', () => {
  assert.equal(productForm({ name: 'Nutri Flow', form: 'pellets', packSizes: ['1 Litre'] }), 'Pellets')
  assert.equal(productForm({ name: 'X', form: 'Chunks' }), '', 'unknown saved forms are ignored')
})

test('without one, the form comes from the product itself', () => {
  assert.equal(productForm({ name: 'Nutri Flow', packSizes: ['1 Litre', '5 Litres'] }), 'Liquid')
  assert.equal(productForm({ name: 'Shakthi Akshaya – Pro', packSizes: ['250ml', '500ml'] }), 'Liquid')
  assert.equal(productForm({ name: 'Gold Gel Pro – Banana', packSizes: ['1kg'] }), 'Gel')
  assert.equal(productForm({ name: 'Sarga Jelly – Drip Gel', packSizes: ['10kg'] }), 'Gel')
  assert.equal(productForm({ name: 'Shakthi Asco King – G', packSizes: ['5kg'] }), 'Granules')
  assert.equal(productForm({ name: 'Salico G', packSizes: ['5kg'] }), 'Granules')
  assert.equal(productForm({ name: 'Zinc Tablets', packSizes: ['100g'] }), 'Tablets')
  assert.equal(productForm({ name: 'Neem Cake Pellets', packSizes: ['5kg'] }), 'Pellets')
  assert.equal(productForm({ name: 'BlastShield 75 WP', packSizes: ['250g'] }), 'Powder')
  assert.equal(productForm({ name: 'Black Carbon', packSizes: ['500g'] }), '', 'nothing says: no guess')
  assert.equal(productForm(null), '')
})

test('filtering and counting', () => {
  const list = [
    { name: 'A', form: 'Powder' }, { name: 'B', form: 'Powder' }, { name: 'Nutri Flow', packSizes: ['1 Litre'] }, { name: 'Black Carbon' },
  ]
  assert.deepEqual(formCounts(list), { Powder: 2, Pellets: 0, Tablets: 0, Granules: 0, Liquid: 1, Gel: 0 })
  assert.deepEqual(list.filter(p => matchesForm(p, 'powder')).map(p => p.name), ['A', 'B'])
  assert.equal(list.filter(p => matchesForm(p, 'all')).length, 4)
  assert.equal(list.filter(p => matchesForm(p, '')).length, 4)
})
