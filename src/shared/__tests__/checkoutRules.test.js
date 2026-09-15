// The basket and checkout rules shared by the floating checkout, the
// storefront and the product pages (src/hooks/checkoutRules.js).

import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  SHARED_POPUP_HASHES, STEP_HASH, cartTotals, customerDetails, detailProblems, fieldsFromAddress,
  blankAddress, initialFields, itemCount, mergeCarts, normalizeCart, orderLine, stepForHash, withItemAdded,
} from '../../hooks/checkoutRules.js';

const completeFields = {
  addressLabel: 'Farm', customerName: 'Murugan', customerPhone: '+91 98765 01234',
  doorNo: '12', street: 'Temple St', area: 'Thiruvaiyaru', taluk: 'Thanjavur', pincode: '613204', district: 'Thanjavur', state: 'Tamil Nadu',
};

test('basket lines always use qty, including lines saved with quantity', () => {
  const [line] = normalizeCart([{ id: 'p1', quantity: '3', price: '120' }]);
  assert.equal(line.qty, 3);
  assert.equal(line.price, 120);
  assert.equal('quantity' in line, false);
  assert.deepEqual(normalizeCart([{ id: 'p2', qty: 0 }, null, 'x']).map(item => item.qty), [1]);
  assert.deepEqual(normalizeCart('not an array'), []);
});

test('adding the same product in the same pack adds one; another pack is another line', () => {
  let cart = withItemAdded([], { id: 'p1', price: 100, selectedPack: '500g' });
  cart = withItemAdded(cart, { id: 'p1', price: 100, selectedPack: '500g' });
  cart = withItemAdded(cart, { id: 'p1', price: 180, selectedPack: '1kg' });
  assert.deepEqual(cart.map(item => [item.id, item._id, item.selectedPack, item.qty]), [['p1', 'p1', '500g', 2], ['p1', 'p1', '1kg', 1]]);
  assert.equal(itemCount(cart), 3);
});

test('a guest basket joins the account basket at sign-in', () => {
  const account = normalizeCart([{ id: 'p1', selectedPack: '500g', qty: 2, price: 100 }]);
  const guest = normalizeCart([{ _id: 'p1', selectedPack: '500g', qty: 1, price: 100 }, { id: 'p2', qty: 1, price: 50 }]);
  const merged = mergeCarts(account, guest);
  assert.deepEqual(merged.map(item => [item.id || item._id, item.qty]), [['p1', 3], ['p2', 1]]);
  assert.equal(account[0].qty, 2, 'the account basket passed in is not changed');
});

test('totals: GST is 18% of the subtotal, rounded, as on the server', () => {
  assert.deepEqual(cartTotals(normalizeCart([{ price: 333, qty: 1 }, { price: 10, qty: 2 }])), { subtotal: 353, gst: 64, total: 417 });
});

test('an order line carries only the product, quantity and pack - never a price', () => {
  assert.deepEqual(orderLine({ _id: 'p9', name: 'X', price: 1, qty: 2, selectedPack: '1L' }), { id: 'p9', qty: 2, selectedPack: '1L' });
  assert.deepEqual(orderLine({ id: 'p9', qty: 1 }), { id: 'p9', qty: 1, selectedPack: '' });
});

test('delivery details: the same checks as the server', () => {
  assert.deepEqual(detailProblems(completeFields), {});
  const problems = detailProblems({ ...completeFields, customerName: '  ', customerPhone: '98765', doorNo: '', pincode: '61320', state: '' });
  assert.deepEqual(problems, { customerName: 'required', customerPhone: 'phone', doorNo: 'required', pincode: 'pincode', state: 'state' });
});

test('customer details: the address field by field and as one line', () => {
  const details = customerDetails(completeFields);
  assert.equal(details.address, '12, Temple St, Thiruvaiyaru, Thanjavur, Thanjavur, Tamil Nadu, 613204');
  assert.deepEqual(details.addressDetails, { label: 'Farm', doorNo: '12', street: 'Temple St', area: 'Thiruvaiyaru', taluk: 'Thanjavur', pincode: '613204', district: 'Thanjavur', state: 'Tamil Nadu' });
  assert.equal(details.customerName, 'Murugan');
});

test('saved addresses fill the form and keep the contact details; a new one starts empty', () => {
  const user = { name: 'Murugan', phone: '9876501234', village: 'Kallakurichi', state: 'Kerala' };
  const fields = { ...initialFields(user), customerName: 'Murugan S' };
  const filled = fieldsFromAddress(fields, { label: 'Warehouse', doorNo: '4', street: 'Main Rd', area: 'A', taluk: 'T', pincode: '600001', district: 'D', state: 'Karnataka' });
  assert.equal(filled.customerName, 'Murugan S');
  assert.equal(filled.addressLabel, 'Home', 'an unknown label keeps the chosen one');
  assert.equal(filled.state, 'Karnataka');
  const blank = blankAddress(filled, user);
  assert.equal(blank.customerName, 'Murugan S');
  assert.equal(blank.doorNo, '');
  assert.equal(blank.area, 'Kallakurichi');
});

test('each step has a hash, and only those hashes are steps', () => {
  assert.equal(stepForHash('#checkout-address'), 'address');
  assert.equal(stepForHash('basket'), 'basket');
  assert.equal(stepForHash('#catalog'), null);
  assert.equal(stepForHash(''), null);
  for (const hash of Object.values(STEP_HASH)) assert.ok(SHARED_POPUP_HASHES.has(hash));
  assert.ok(SHARED_POPUP_HASHES.has('login'));
});
