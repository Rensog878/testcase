// The basket and checkout rules shared by the floating checkout, the
// storefront and the product pages (src/hooks/checkoutRules.js).

import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  ADDRESS_LABELS, AUTH_HASHES, REQUIRED_DETAILS, addressEmoji, SHARED_POPUP_HASHES, STEP_HASH, cartTotals, customerDetails, detailProblems, fieldsFromAddress,
  blankAddress, initialFields, itemCount, mergeCarts, normalizeCart, orderLine, stepForHash, withItemAdded,
} from '../../hooks/checkoutRules.js';

const completeFields = {
  addressLabel: 'Farm', customerName: 'Murugan', customerPhone: '+91 98765 01234', addressName: 'Selvi', addressPhone: '94430 11223',
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
  // cartTotals also returns a CGST/SGST breakdown and a discount now, so the
  // three numbers that decide what a farmer pays are asserted by name rather
  // than by the exact shape of the object.
  const totals = cartTotals(normalizeCart([{ price: 333, qty: 1 }, { price: 10, qty: 2 }]));
  assert.equal(totals.subtotal, 353);
  assert.equal(totals.gst, 64);
  assert.equal(totals.total, 417);
  assert.equal(totals.cgst + totals.sgst, totals.gst, 'CGST and SGST must add up to the GST charged');
  assert.equal(totals.igst, totals.gst);
});

test('totals: a per-item GST rate is respected, and a discount comes off the subtotal', () => {
  const mixed = cartTotals(normalizeCart([{ price: 100, qty: 1, gstRate: 5 }, { price: 100, qty: 1, gstRate: 12 }]));
  assert.equal(mixed.subtotal, 200);
  assert.equal(mixed.gst, 17);
  const discounted = cartTotals(normalizeCart([{ price: 500, qty: 1 }]), 100);
  assert.equal(discounted.discount, 100);
  assert.equal(discounted.finalSubtotal, 400);
  const capped = cartTotals(normalizeCart([{ price: 500, qty: 1 }]), 9999);
  assert.equal(capped.discount, 500, 'a discount can never exceed the basket');
  assert.equal(capped.finalSubtotal, 0);
});

test('an order line carries only the product, quantity and pack - never a price', () => {
  assert.deepEqual(orderLine({ _id: 'p9', name: 'X', price: 1, qty: 2, selectedPack: '1L' }), { id: 'p9', qty: 2, selectedPack: '1L' });
  assert.deepEqual(orderLine({ id: 'p9', qty: 1 }), { id: 'p9', qty: 1, selectedPack: '' });
});

test('delivery details: the same checks as the server', () => {
  assert.deepEqual(detailProblems(completeFields), {});
  const problems = detailProblems({ ...completeFields, doorNo: '', pincode: '61320', state: '' });
  assert.deepEqual(problems, { doorNo: 'required', pincode: 'pincode', state: 'state' });
});

test('no contact form: the account name and number, else the person at the address', () => {
  assert.deepEqual(detailProblems({ ...completeFields, customerName: '  ', customerPhone: '98765' }), {});
  const fallback = customerDetails({ ...completeFields, customerName: '', customerPhone: '' });
  assert.equal(fallback.customerName, 'Selvi');
  assert.equal(fallback.customerPhone, '94430 11223');
  const account = customerDetails(completeFields);
  assert.equal(account.customerName, 'Murugan', 'the signed-in account stays the order contact');
  assert.equal(account.customerPhone, '+91 98765 01234');
});

test('address label and number: a custom name up to 30 characters, an Indian mobile', () => {
  assert.equal(detailProblems({ ...completeFields, addressLabel: '   ' }).addressLabel, 'required');
  assert.equal(detailProblems({ ...completeFields, addressPhone: '12345 67890' }).addressPhone, 'phone', 'must start 6-9, as the server checks');
  assert.equal(detailProblems({ ...completeFields, addressPhone: '+91 94430 11223' }).addressPhone, undefined);
  const long = customerDetails({ ...completeFields, addressLabel: '  Godown near the old rice mill on the canal road  ' });
  assert.equal(long.addressDetails.label.length, 30);
  assert.equal(customerDetails({ ...completeFields, addressLabel: 'Godown' }).addressDetails.label, 'Godown');
});

test('customer details: the address field by field and as one line', () => {
  const details = customerDetails(completeFields);
  assert.equal(details.address, '12, Temple St, Thiruvaiyaru, Thanjavur, Thanjavur, Tamil Nadu, 613204');
  assert.deepEqual(details.addressDetails, { label: 'Farm', name: 'Selvi', phone: '9443011223', doorNo: '12', street: 'Temple St', area: 'Thiruvaiyaru', taluk: 'Thanjavur', pincode: '613204', district: 'Thanjavur', state: 'Tamil Nadu' });
  assert.equal(details.customerName, 'Murugan');
});

test('saved addresses fill the form and keep the contact details; a new one starts empty', () => {
  const user = { name: 'Murugan', phone: '9876501234', village: 'Kallakurichi', state: 'Kerala' };
  const fields = { ...initialFields(user), customerName: 'Murugan S' };
  const filled = fieldsFromAddress(fields, { label: 'Warehouse', doorNo: '4', street: 'Main Rd', area: 'A', taluk: 'T', pincode: '600001', district: 'D', state: 'Karnataka' });
  assert.equal(filled.customerName, 'Murugan S');
  assert.equal(filled.addressLabel, 'Warehouse', 'a custom label is kept');
  assert.equal(filled.addressName, 'Murugan S', 'an address saved without a name uses the contact name');
  assert.equal(filled.addressPhone, fields.customerPhone, 'an address saved without a number uses the contact number');
  assert.equal(fieldsFromAddress(fields, { label: 'Home', phone: '9443011223' }).addressPhone, '9443011223');
  assert.equal(filled.state, 'Karnataka');
  const blank = blankAddress(filled, user);
  assert.equal(blank.customerName, 'Murugan S');
  assert.equal(blank.doorNo, '');
  assert.equal(blank.area, 'Kallakurichi');
  assert.equal(blank.addressLabel, 'Home');
  assert.equal(blank.addressName, 'Murugan S');
  assert.equal(blank.addressPhone, filled.customerPhone);
});

test('each step has a hash, and only those hashes are steps', () => {
  assert.equal(stepForHash('#checkout-address'), 'address');
  assert.equal(stepForHash('basket'), 'basket');
  assert.equal(stepForHash('#catalog'), null);
  assert.equal(stepForHash(''), null);
  for (const hash of Object.values(STEP_HASH)) assert.ok(SHARED_POPUP_HASHES.has(hash));
  assert.ok(SHARED_POPUP_HASHES.has('login'));
  // The account card's hashes are shared popups, and never a checkout step.
  for (const hash of AUTH_HASHES) {
    assert.ok(SHARED_POPUP_HASHES.has(hash));
    assert.equal(stepForHash(hash), null);
  }
});

test('every field marked * is one the order cannot go without, and no other', () => {
  const blank = Object.fromEntries(Object.keys(completeFields).map(key => [key, '']));
  assert.deepEqual(Object.keys(detailProblems(blank)).sort(), [...REQUIRED_DETAILS].sort());
  for (const key of REQUIRED_DETAILS) {
    assert.ok(detailProblems({ ...completeFields, [key]: '' })[key], `${key} left empty must stop the order`);
  }
});

test('each address type has its own emoji, and an unknown one a pin', () => {
  assert.deepEqual(ADDRESS_LABELS.map(addressEmoji), ['🏠', '🏢', '🚜']);
  assert.equal(new Set(ADDRESS_LABELS.map(addressEmoji)).size, ADDRESS_LABELS.length);
  assert.equal(addressEmoji('Warehouse'), '📍');
  assert.equal(addressEmoji(undefined), '📍');
});

test('CGST and SGST split the GST and always add up to it', () => {
  const t = cartTotals([{ price: 680, qty: 1, gstRate: 18 }]);
  assert.equal(t.gst, 122);
  assert.equal(t.cgst + t.sgst, t.gst);
  assert.equal(t.cgst, 61);
  assert.equal(t.gstRate, 18);
  // 683 x 18% = 122.94 -> 123: an odd rupee, still adds up
  const odd = cartTotals([{ price: 683, qty: 1 }]);
  assert.equal(odd.gst, 123);
  assert.equal(odd.cgst + odd.sgst, 123);
  assert.equal(odd.total, 683 + 123);
  const mixed = cartTotals([{ price: 100, qty: 1, gstRate: 18 }, { price: 100, qty: 1, gstRate: 5 }]);
  assert.equal(mixed.gstRate, null, 'mixed rates: no single % to show');
  assert.equal(mixed.cgst + mixed.sgst, mixed.gst);
});
