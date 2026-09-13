import { test } from 'node:test';
import assert from 'node:assert/strict';

import { selectAttentionItems, selectCropRecommendations, selectRecentOrders } from '../lib/dashboardModel.js';
import { buildFarmerContext } from '../lib/farmerContext.js';
import { normalizeOrders } from '../lib/normalizers/orderItem.js';

const NOW = Date.UTC(2026, 8, 13, 6, 0, 0);

const PRODUCTS = [
  { id: 'wheat-only', name: 'Wheat Guard', crops: ['Wheat'], stock: 10 },
  { id: 'general', name: 'RootVigor Gold', crops: ['All Crops'], stock: 10 },
  { id: 'paddy', name: 'BlastShield 75 WP', crops: ['Paddy/Rice', 'Wheat'], stock: 10 },
  { id: 'paddy-sold-out', name: 'Sold Out Paddy', crops: ['Paddy/Rice'], stock: 0 },
  { id: 'assigned', name: 'Assigned Cotton Mix', crops: ['Cotton'], stock: 5, targetUserId: 'USR-1' },
];

test('attention keeps only critical and warning items, most urgent first', () => {
  const orders = normalizeOrders([
    { id: 'delivered', deliveryStatus: 'Delivered', createdAt: '2026-09-01T00:00:00Z' },
    { id: 'late', deliveryStatus: 'Confirmed', expectedDeliveryDate: '2026-09-10', createdAt: '2026-09-02T00:00:00Z' },
    { id: 'today', deliveryStatus: 'Out for Delivery', createdAt: '2026-09-03T00:00:00Z' },
    { id: 'processing', deliveryStatus: 'Pending', createdAt: '2026-09-04T00:00:00Z' },
  ], { now: NOW, fetchedAt: NOW });

  const attention = selectAttentionItems(orders, { cropIds: [], now: NOW });
  assert.deepEqual(attention.map(result => result.item.payload.orderId), ['today', 'late']);
});

test('recent orders are newest first and limited', () => {
  const orders = normalizeOrders(
    ['2026-09-01', '2026-09-05', '2026-09-03'].map((day, index) => ({ id: `o${index}`, createdAt: `${day}T00:00:00Z` })),
    { now: NOW },
  );
  assert.deepEqual(selectRecentOrders(orders, { limit: 2 }).map(item => item.payload.orderId), ['o1', 'o2']);
});

test('paddy farmer: exact matches, then assigned, then all-crop products; sold out and unrelated left out', () => {
  const context = buildFarmerContext({ id: 'USR-1', crop: 'Paddy / Rice' });
  const result = selectCropRecommendations(PRODUCTS, context, { now: NOW, fetchedAt: NOW, limit: 5 });
  assert.equal(result.status, 'ok');
  assert.deepEqual(result.items.map(ranked => ranked.item.payload.productId), ['paddy', 'assigned', 'general']);
});

test('several crops: products for any of them count as matches', () => {
  const context = buildFarmerContext({ id: 'USR-5', crop: 'Cotton', crops: ['Cotton', 'Paddy / Rice'] });
  assert.deepEqual(context.cropIds, ['cotton', 'paddy']);
  const result = selectCropRecommendations(PRODUCTS, context, { now: NOW, limit: 5 });
  assert.deepEqual(result.items.map(ranked => ranked.item.payload.productId), ['assigned', 'paddy', 'general']);
  assert.deepEqual(result.items.map(ranked => ranked.breakdown.cropMatch.reason), ['exact', 'exact', 'general']);
});

test('limit trims the list', () => {
  const context = buildFarmerContext({ id: 'USR-1', crop: 'Paddy / Rice' });
  assert.equal(selectCropRecommendations(PRODUCTS, context, { now: NOW, limit: 1 }).items.length, 1);
});

test('no crop on the profile asks for one instead of guessing', () => {
  assert.deepEqual(selectCropRecommendations(PRODUCTS, buildFarmerContext({ id: 'USR-9' }), { now: NOW }), { status: 'no_crop', items: [] });
});

test('unknown crop with nothing specific still gets all-crop products', () => {
  const context = buildFarmerContext({ id: 'USR-9', crop: 'Banana' });
  const result = selectCropRecommendations(PRODUCTS, context, { now: NOW });
  assert.deepEqual(result.items.map(ranked => ranked.item.payload.productId), ['general']);
});

test('nothing suitable gives none_for_crop', () => {
  const context = buildFarmerContext({ id: 'USR-9', crop: 'Banana' });
  const specificOnly = PRODUCTS.filter(product => product.id !== 'general');
  assert.deepEqual(selectCropRecommendations(specificOnly, context, { now: NOW }), { status: 'none_for_crop', items: [] });
});

test('"All Crops" farmers see crop-specific products as general matches', () => {
  const context = buildFarmerContext({ id: 'USR-9', crop: 'All Crops' });
  const result = selectCropRecommendations(PRODUCTS, context, { now: NOW, limit: 10 });
  assert.equal(result.status, 'ok');
  assert.ok(result.items.every(ranked => ranked.breakdown.cropMatch.reason === 'general'));
  assert.ok(!result.items.some(ranked => ranked.item.payload.productId === 'paddy-sold-out'));
});
