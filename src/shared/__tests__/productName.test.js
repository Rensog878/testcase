// One product per name (src/shared/productName.js).

import { test } from 'node:test'
import assert from 'node:assert/strict'
import { duplicateNameGroups, findSameNamedProduct, productNameKey } from '../productName.js'

test('the same name however it is typed', () => {
  const key = productNameKey('Sathyam Agro Mart WeedClear 24-D')
  assert.equal(key, 'weedclear 24 d')
  for (const same of ['weedclear 24 d', 'WEEDCLEAR 24D'.replace('24D', '24 D'), '  WeedClear   24–D ', 'Sathyam Bio WeedClear 24-D', 'Sathya Bio weedclear (24-D)']) {
    assert.equal(productNameKey(same), key, same)
  }
})

test('different products stay different', () => {
  assert.notEqual(productNameKey('BlastShield 75 WP'), productNameKey('BlastShield 50 WP'))
  assert.notEqual(productNameKey('RootVigor'), productNameKey('RootVigor Gold'))
  assert.equal(productNameKey('Sathyam Agro Mart'), 'sathyam agro mart', 'the brand alone is not stripped to nothing')
  assert.equal(productNameKey(''), '')
})

test('finds the product already using a name, but not the one being edited', () => {
  const products = [{ id: 'sb-02', name: 'Sathyam Agro Mart FlyKill Ultra' }, { id: 'sb-03', name: 'BlightStop Pro' }]
  assert.equal(findSameNamedProduct(products, 'flykill ultra')?.id, 'sb-02')
  assert.equal(findSameNamedProduct(products, 'FlyKill Ultra', 'sb-02'), null, 'saving a product under its own name')
  assert.equal(findSameNamedProduct(products, 'FlyKill Max'), null)
  assert.equal(findSameNamedProduct(products, '   '), null)
})

test('lists the names used more than once', () => {
  const groups = duplicateNameGroups([
    { id: 'a', name: 'FlyKill Ultra' }, { id: 'b', name: 'Sathyam Agro Mart FlyKill Ultra' }, { id: 'c', name: 'BlightStop Pro' },
  ])
  assert.deepEqual(Object.keys(groups), ['flykill ultra'])
  assert.deepEqual(groups['flykill ultra'].map(p => p.id), ['a', 'b'])
})
