import { test } from 'node:test';
import assert from 'node:assert/strict';

import { addLine, cartLineFor } from '../lib/cart.js';
import { selectAttentionItems, selectCropRecommendations } from '../lib/dashboardModel.js';
import { buildFarmerContext } from '../lib/farmerContext.js';
import { combineViews, resourceView } from '../lib/freshness.js';
import { normalizeOrders } from '../lib/normalizers/orderItem.js';
import { normalizeProduct } from '../lib/normalizers/productItem.js';
import { normalizeWeather } from '../lib/normalizers/weatherItem.js';
import { forecastSlots, middayOf, relativeDay, weatherRisk } from '../lib/weatherView.js';

const HOUR = 60 * 60 * 1000;
const NOW = Date.UTC(2026, 8, 13, 3, 30); // 09:00 in India

const weatherData = (verdict, reasons = []) => ({
  status: 'ok',
  spray: { verdict, reasons, checkedHours: 6, searchedHours: 48, nextSafeWindow: null, evaluatedAt: new Date(NOW).toISOString() },
  fetchedAt: new Date(NOW - 20 * 60 * 1000).toISOString(),
  stale: false,
});

test('spraying advice becomes a weather item: avoid is a warning, safe is ok', () => {
  const avoid = normalizeWeather(weatherData('avoid', [{ code: 'rain_expected', severity: 'avoid', value: 3, at: new Date(NOW + HOUR).toISOString() }]), { now: NOW });
  assert.deepEqual([avoid.id, avoid.source, avoid.kind, avoid.severity, avoid.dueAt, avoid.weatherSensitive], ['weather:spray', 'weather', 'weather.spray_avoid', 'warning', NOW, true]);
  assert.equal(avoid.fetchedAt, NOW - 20 * 60 * 1000);
  assert.equal(normalizeWeather(weatherData('caution'), { now: NOW }).severity, 'info');
  assert.equal(normalizeWeather(weatherData('safe'), { now: NOW }).severity, 'ok');
  assert.equal(normalizeWeather({ status: 'location_missing' }), null);
  assert.equal(normalizeWeather(undefined), null);
});

test('weather risk feeds the engine only when there is a forecast', () => {
  assert.equal(weatherRisk(weatherData('avoid')), 1);
  assert.equal(weatherRisk(weatherData('caution')), 0.5);
  assert.equal(weatherRisk(weatherData('safe')), 0);
  assert.equal(weatherRisk({ status: 'location_not_found' }), null);
});

test('attention ranks orders and spraying advice together; safe advice is still listed, last', () => {
  const orders = normalizeOrders([
    { id: 'today', deliveryStatus: 'Out for Delivery', createdAt: '2026-09-11T00:00:00Z' },
    { id: 'late', deliveryStatus: 'Confirmed', expectedDeliveryDate: '2026-09-10', createdAt: '2026-09-05T00:00:00Z' },
    { id: 'fine', deliveryStatus: 'Delivered', createdAt: '2026-09-01T00:00:00Z' },
  ], { now: NOW, fetchedAt: NOW });
  const context = { cropIds: ['paddy'], now: NOW };
  const onlyWeather = { alwaysInclude: item => item.source === 'weather' };

  const withAvoid = selectAttentionItems([...orders, normalizeWeather(weatherData('avoid'), { now: NOW })], context, onlyWeather);
  assert.deepEqual(withAvoid.map(r => r.item.id), ['order:today', 'weather:spray', 'order:late']);

  const withSafe = selectAttentionItems([...orders, normalizeWeather(weatherData('safe'), { now: NOW })], context, onlyWeather);
  assert.deepEqual(withSafe.map(r => r.item.id), ['order:today', 'order:late', 'weather:spray']);
});

test('recommendations carry the dose for the farm when the dosage parses', () => {
  const products = [
    { id: 'blast', name: 'BlastShield', crops: ['Paddy/Rice'], dosage: '120g - 150g per Acre', stock: 5, price: 680, packSizes: ['250g', '500g'], selectedPack: '500g' },
    { id: 'drench', name: 'RootVigor', crops: ['All Crops'], dosage: '2 ml per litre of water', stock: 5, price: 990 },
  ];
  const context = buildFarmerContext({ id: 'USR-1', crop: 'Paddy / Rice', acreage: 4.5 });
  const result = selectCropRecommendations(products, context, { now: NOW });
  assert.deepEqual(result.items[0].dose.total, { min: { value: 540, unit: 'g' }, max: { value: 675, unit: 'g' } });
  assert.equal(result.items[1].dose, null);

  const noAcreage = selectCropRecommendations(products, buildFarmerContext({ id: 'USR-1', crop: 'Paddy / Rice' }), { now: NOW });
  assert.equal(noAcreage.items[0].dose, null);
});

test('cart lines match what the storefront and checkout store, and repeat adds raise the quantity', () => {
  const payload = normalizeProduct({ id: 'sb-01', name: 'BlastShield', category: 'Fungicide', price: 680, image: './assets/p1.png', packSizes: ['250g', '500g'], selectedPack: '500g', stock: 3 }).payload;
  const line = cartLineFor(payload);
  assert.deepEqual(line, { id: 'sb-01', _id: 'sb-01', name: 'BlastShield', price: 680, category: 'Fungicide', image: './assets/p1.png', selectedPack: '500g', qty: 1 });

  const existing = [{ id: 'other', qty: 2, selectedPack: '1kg' }];
  const once = addLine(existing, line);
  const twice = addLine(once, line);
  assert.deepEqual(twice.map(item => [item.id, item.qty]), [['other', 2], ['sb-01', 2]]);
  assert.equal(existing.length, 1, 'the input is not changed');
  assert.equal(addLine(twice, { ...line, selectedPack: '250g' }).length, 3, 'another pack is another line');
  assert.deepEqual(addLine(undefined, line).map(item => item.qty), [1]);

  assert.equal(normalizeProduct({ id: 'x', image: 'data:image/png;base64,AAAA' }).payload.image, '');
  assert.equal(normalizeProduct({ id: 'y', packSizes: ['1 Litre'] }).payload.pack, '1 Litre');
});

test('forecast slots take every third hour; days are named relative to India time', () => {
  const hourly = Array.from({ length: 24 }, (_, index) => ({ time: new Date(NOW + index * HOUR).toISOString(), temperatureC: index }));
  const slots = forecastSlots(hourly);
  assert.deepEqual(slots.map(slot => slot.temperatureC), [0, 3, 6, 9, 12, 15, 18, 21]);
  assert.equal(typeof slots[0].time, 'number');

  assert.equal(relativeDay('2026-09-13', NOW), 'today');
  assert.equal(relativeDay(Date.UTC(2026, 8, 13, 19, 0), NOW), 'tomorrow'); // 00:30 on 14 Sep in India
  assert.equal(relativeDay('2026-09-15', NOW), null);
  assert.equal(middayOf('2026-09-15'), Date.UTC(2026, 8, 15, 6, 30));
});

test('a section built from two sources shows what arrived and says when part failed', () => {
  const base = { now: NOW, staleAfterMs: HOUR };
  const ready = resourceView({ ...base, hasData: true, fetchedAt: NOW });
  const loading = resourceView({ ...base, hasData: false, loading: true });
  const failed = resourceView({ ...base, hasData: false, error: new Error('x') });
  const sourceStale = resourceView({ ...base, hasData: true, fetchedAt: NOW, sourceStale: true });

  assert.deepEqual(combineViews([ready, loading]), { state: 'ready', stale: false, reason: null });
  assert.deepEqual(combineViews([ready, failed], { isEmpty: true }), { state: 'empty', stale: true, reason: 'partial' });
  assert.equal(combineViews([loading, failed]).state, 'loading');
  assert.equal(combineViews([failed, failed]).state, 'error');
  assert.equal(combineViews([ready, sourceStale]).reason, 'source_stale');
  assert.equal(sourceStale.reason, 'source_stale');
  assert.equal(resourceView({ ...base, hasData: true, fetchedAt: NOW, sourceStale: true, online: false }).reason, 'offline');
});
