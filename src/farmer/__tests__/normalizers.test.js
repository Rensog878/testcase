import { test } from 'node:test';
import assert from 'node:assert/strict';

import { expectedDeliveryEnd, normalizeOrder, normalizeOrders, orderStatusId } from '../lib/normalizers/orderItem.js';
import { normalizeProduct } from '../lib/normalizers/productItem.js';

// 13 Sep 2026, 11:30 in India.
const NOW = Date.UTC(2026, 8, 13, 6, 0, 0);

const order = fields => ({
  id: 'SB-ORD-1',
  items: [{ name: 'BlastShield 75 WP', qty: 2 }, { name: 'RootVigor Gold', qty: 1 }],
  total: 2773,
  paymentStatus: 'Pending',
  deliveryStatus: 'Confirmed',
  otp: '4829',
  createdAt: '2026-09-10T10:00:00.000Z',
  ...fields,
});

test('out for delivery and unpaid: act today, cash needed, OTP shown', () => {
  const item = normalizeOrder(order({ deliveryStatus: 'Out for Delivery' }), { now: NOW, fetchedAt: NOW });
  assert.equal(item.id, 'order:SB-ORD-1');
  assert.equal(item.severity, 'critical');
  assert.equal(item.kind, 'order.out_for_delivery');
  assert.equal(item.dueAt, NOW);
  assert.equal(item.payload.cashDue, 2773);
  assert.equal(item.payload.otp, '4829');
  assert.deepEqual(item.payload.items, [{ name: 'BlastShield 75 WP', qty: 2 }, { name: 'RootVigor Gold', qty: 1 }]);
});

test('out for delivery and paid online: no cash due', () => {
  const item = normalizeOrder(order({ deliveryStatus: 'Out for Delivery', paymentStatus: 'Paid' }), { now: NOW });
  assert.equal(item.severity, 'critical');
  assert.equal(item.payload.cashDue, null);
  assert.equal(item.payload.paid, true);
});

test('past the expected date and not delivered: delayed warning', () => {
  const item = normalizeOrder(order({ expectedDeliveryDate: '2026-09-12' }), { now: NOW });
  assert.equal(item.severity, 'warning');
  assert.equal(item.kind, 'order.delayed');
  assert.equal(item.dueAt, expectedDeliveryEnd('2026-09-12'));
});

test('the expected day itself is not late yet', () => {
  const item = normalizeOrder(order({ expectedDeliveryDate: '2026-09-13' }), { now: NOW });
  assert.equal(item.kind, 'order.processing');
  assert.equal(item.severity, 'info');
});

test('dispatched: warning when cash is due, info when paid', () => {
  assert.equal(normalizeOrder(order({ deliveryStatus: 'Dispatched' }), { now: NOW }).kind, 'order.dispatched_cash_due');
  assert.equal(normalizeOrder(order({ deliveryStatus: 'Dispatched' }), { now: NOW }).severity, 'warning');
  const paid = normalizeOrder(order({ deliveryStatus: 'Dispatched', paymentStatus: 'Paid' }), { now: NOW });
  assert.deepEqual([paid.kind, paid.severity], ['order.dispatched', 'info']);
});

test('delivered and cancelled orders need nothing and hide the OTP', () => {
  const delivered = normalizeOrder(order({ deliveryStatus: 'Delivered', deliveredAt: '2026-09-12T08:00:00.000Z', expectedDeliveryDate: '2026-09-01' }), { now: NOW });
  assert.deepEqual([delivered.severity, delivered.kind, delivered.payload.otp], ['ok', 'order.delivered', null]);
  assert.equal(delivered.occurredAt, Date.parse('2026-09-12T08:00:00.000Z'));

  const cancelled = normalizeOrder(order({ deliveryStatus: 'Cancelled', expectedDeliveryDate: '2026-09-01' }), { now: NOW });
  assert.deepEqual([cancelled.severity, cancelled.kind, cancelled.payload.otp], ['info', 'order.cancelled', null]);
});

test('status comes from deliveryStatus, then status, defaulting to Confirmed', () => {
  assert.equal(orderStatusId({ status: 'Out for Delivery' }), 'out_for_delivery');
  assert.equal(orderStatusId({ deliveryStatus: 'out_for_delivery' }), 'out_for_delivery');
  assert.equal(orderStatusId({}), 'confirmed');
  assert.equal(orderStatusId({ deliveryStatus: 'On hold' }), 'unknown');
  assert.equal(normalizeOrder(order({ deliveryStatus: 'On hold' }), { now: NOW }).kind, 'order.unknown');
});

test('expected delivery dates are read only in the server’s YYYY-MM-DD form', () => {
  assert.equal(expectedDeliveryEnd('2026-09-13'), Date.UTC(2026, 8, 13, 18, 29, 59, 999));
  assert.equal(expectedDeliveryEnd('2026-02-30'), null);
  assert.equal(expectedDeliveryEnd('Tomorrow evening'), null);
  assert.equal(expectedDeliveryEnd(undefined), null);
});

test('orders without an id are skipped', () => {
  assert.equal(normalizeOrder({ total: 10 }), null);
  assert.equal(normalizeOrders([order({}), null, { total: 1 }], { now: NOW }).length, 1);
  assert.deepEqual(normalizeOrders(undefined), []);
});

test('product crops resolve through the registry', () => {
  const item = normalizeProduct({
    id: 'sb-01', name: 'BlastShield 75 WP', crops: ['Paddy/Rice', 'Wheat', 'Corn'], diseases: ['Blast', ' Rust '],
    dosage: '120g - 150g per Acre', stock: 420, price: 680, targetUserId: 'USR-1001',
  }, { fetchedAt: NOW });
  assert.deepEqual(item.cropIds, ['paddy', 'wheat', 'corn']);
  assert.deepEqual(item.payload.targets, ['Blast', 'Rust']);
  assert.equal(item.payload.dosageText, '120g - 150g per Acre');
  assert.equal(item.targetUserId, 'USR-1001');
  assert.equal(item.fetchedAt, NOW);
});

test('product stock, general catalog targeting and missing ids', () => {
  assert.equal(normalizeProduct({ id: 'a', stock: 0 }).payload.inStock, false);
  assert.equal(normalizeProduct({ id: 'b' }).payload.inStock, true);
  assert.equal(normalizeProduct({ id: 'c', targetUserId: 'all' }).targetUserId, null);
  assert.deepEqual(normalizeProduct({ id: 'd', crops: ['All Crops'] }).cropIds, ['all']);
  assert.equal(normalizeProduct({ name: 'no id' }), null);
  assert.equal(normalizeProduct({ _id: 'mongo-id' }).payload.productId, 'mongo-id');
});
