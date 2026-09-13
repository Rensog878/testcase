// The Phase 5 contracts (src/farmer/contracts/*.md) run as code: every
// normalizer and proposed ranking factor is exercised against the example
// responses the contracts publish, so the documents and the code cannot drift.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

import { resolveCrop } from '../../shared/cropRegistry.js';
import { normalizePlace } from '../../shared/placeNames.js';
import { createDashboardItem } from '../lib/dashboardItem.js';
import { INTEGRATION_FACTORS, PROPOSED_FACTORS, PROPOSED_PRIORITY_CONFIG } from '../lib/integrationFactors.js';
import { normalizeAdvisories } from '../lib/normalizers/advisoryItem.js';
import { normalizeFarmAnalytics, purchasedProductIds } from '../lib/normalizers/analyticsItem.js';
import { normalizeMarketPrices } from '../lib/normalizers/marketPriceItem.js';
import { normalizeNotifications } from '../lib/normalizers/notificationItem.js';
import { normalizePestRisks } from '../lib/normalizers/pestRiskItem.js';
import { rankItems, scoreItem } from '../lib/priorityEngine.js';

const example = name => JSON.parse(fs.readFileSync(new URL(`../contracts/examples/${name}.json`, import.meta.url), 'utf8'));
const NOW = Date.UTC(2026, 8, 13, 3, 30); // 09:00 on 13 Sep 2026 in India
const ids = items => items.map(item => item.id);

test('every example uses the shared envelope and freshness fields', () => {
  for (const name of ['market-prices', 'pest-risk', 'notifications', 'advisories', 'analytics']) {
    const body = example(name);
    assert.equal(body.success, true, name);
    assert.equal(typeof body.data.stale, 'boolean', name);
    assert.ok(Number.isFinite(Date.parse(body.data.fetchedAt ?? body.data.weatherFetchedAt)), `${name} has a source time`);
  }
  const preferences = example('notification-preferences').data;
  assert.equal(typeof preferences.whatsapp.optedIn, 'boolean');
  assert.deepEqual(preferences.quietHours, { start: '21:00', end: '07:00', timeZone: 'Asia/Kolkata' });
});

test('market prices: only notable moves are ranked, as information', () => {
  const data = example('market-prices').data;
  const items = normalizeMarketPrices(data);
  assert.deepEqual(ids(items), ['market:tamil nadu|thanjavur|thanjavur:paddy:2026-09-12']);
  const [item] = items;
  assert.deepEqual([item.source, item.kind, item.severity, item.dueAt], ['market', 'market.price_rise', 'info', null]);
  assert.deepEqual(item.cropIds, ['paddy']);
  assert.equal(item.occurredAt, Date.UTC(2026, 8, 12, 6, 30));
  assert.equal(item.fetchedAt, Date.parse('2026-09-12T14:05:00.000Z'));
  assert.equal(item.payload.changePct, 11.6);

  assert.equal(normalizeMarketPrices(data, { minChangePct: 1 }).length, 2, 'a smaller threshold adds Kumbakonam; no change data never counts');
  const falling = { ...data, prices: [{ ...data.prices[0], change7d: { ...data.prices[0].change7d, pct: -12 } }] };
  assert.equal(normalizeMarketPrices(falling)[0].kind, 'market.price_fall');
  assert.deepEqual(normalizeMarketPrices({ status: 'no_crop' }), []);
});

test('mandi commodity names from data.gov.in resolve through the crop registry', () => {
  // "Paddy(Common)" is the spelling data.gov.in returned on 13 Sep 2026.
  assert.equal(resolveCrop('Paddy(Common)').id, 'paddy');
  assert.equal(resolveCrop('Cotton').id, 'cotton');
  assert.equal(resolveCrop('Jowar(Sorghum)').status, 'custom');
});

test('pest risk: high is a warning, moderate is information, low is not ranked', () => {
  const data = example('pest-risk').data;
  const items = normalizePestRisks(data);
  assert.deepEqual(ids(items), ['pest:paddy.blast:2026-09-13T12:30:00.000Z', 'pest:tomato.late_blight:2026-09-14T00:30:00.000Z']);
  assert.deepEqual(items.map(item => item.severity), ['warning', 'info']);
  assert.deepEqual(items.map(item => item.kind), ['pest.disease_risk', 'pest.disease_risk']);
  assert.ok(items.every(item => item.weatherSensitive));
  assert.equal(items[0].dueAt, Date.parse('2026-09-13T12:30:00.000Z'));
  assert.equal(items[0].fetchedAt, Date.parse(data.weatherFetchedAt));

  const pest = { ...data, risks: [{ ...data.risks[0], threat: { ...data.risks[0].threat, type: 'pest' } }] };
  assert.equal(normalizePestRisks(pest)[0].kind, 'pest.pest_risk');
  assert.deepEqual(normalizePestRisks({ status: 'location_missing' }), []);
});

test('notifications: nothing is shown twice when its source item is already on the dashboard', () => {
  const data = example('notifications').data;
  assert.equal(normalizeNotifications(data).length, 3);
  const items = normalizeNotifications(data, { knownItemIds: ['weather:spray'] });
  assert.deepEqual(ids(items), ['notification:ntf_20260912_004', 'notification:ntf_20260911_002']);
  assert.equal(items[1].kind, 'notification.announcement');
  assert.equal(items[0].payload.readAt, '2026-09-12T08:15:00.000Z');
  assert.equal(items[1].payload.params.title.ta, 'செப்டம்பர் 15 அன்று கடை மூடப்பட்டிருக்கும்');
});

test('advisories: only advice inside its validity window, expiring advice carries a due date', () => {
  const data = example('advisories').data;
  const now = normalizeAdvisories(data, { now: NOW });
  assert.deepEqual(ids(now), ['advisory:adv_2026_031', 'advisory:adv_2026_028']);
  assert.equal(now[0].dueAt, Date.parse('2026-09-20T18:29:59.000Z'));
  assert.deepEqual(now.map(item => item.payload.translated), [true, false]);
  assert.deepEqual(ids(normalizeAdvisories(data, { now: Date.UTC(2026, 8, 25) })), ['advisory:adv_2026_028']);
  assert.deepEqual(normalizeAdvisories(data, { now: Date.UTC(2026, 7, 1) }), []);
});

test('farm analytics: reorder reminders due within two weeks, overdue ones too', () => {
  const data = example('analytics').data;
  assert.deepEqual(ids(normalizeFarmAnalytics(data, { now: NOW })), ['analytics:reorder:sb-01']);
  assert.deepEqual(ids(normalizeFarmAnalytics(data, { now: Date.UTC(2026, 11, 15) })), ['analytics:reorder:sb-01', 'analytics:reorder:sb-04']);
  const [reorder] = normalizeFarmAnalytics(data, { now: NOW });
  assert.deepEqual([reorder.kind, reorder.severity, reorder.dueAt], ['analytics.reorder_due', 'info', Date.parse('2026-09-17T05:00:00.000Z')]);
  assert.deepEqual(purchasedProductIds(data), ['sb-01', 'sb-04']);
});

test('each proposed factor scores its own source and nothing else', () => {
  const context = { now: NOW, cropIds: ['paddy'], location: { district: 'Thanjavur District' }, purchasedProductIds: ['sb-01'] };
  const config = PROPOSED_PRIORITY_CONFIG;
  const score = item => scoreItem(item, context, config, PROPOSED_FACTORS).breakdown;

  const [blast] = normalizePestRisks(example('pest-risk').data);
  assert.equal(score(blast).pestRisk.value, 0.82);
  assert.equal(score(blast).pestRisk.points, 28.7);

  const [move] = normalizeMarketPrices(example('market-prices').data);
  assert.ok(Math.abs(score(move).marketMove.value - 0.58) < 1e-9, 'an 11.6% move against a 20% full-points move');
  assert.equal(score(move).pestRisk.value, 0);

  const [local, statewide] = normalizeAdvisories(example('advisories').data, { now: NOW });
  assert.deepEqual([score(local).locality.value, score(statewide).locality.value], [1, 0.5]);
  assert.equal(scoreItem(local, { ...context, location: { district: 'Madurai' } }, config, PROPOSED_FACTORS).breakdown.locality.value, 0);
  assert.equal(normalizePlace(' THANJAVUR district '), 'thanjavur');

  const [unread, read] = normalizeNotifications(example('notifications').data).filter(item => item.payload.kind !== 'weather.spray_avoid').reverse();
  assert.deepEqual([score(unread).unread.value, score(read).unread.value], [1, 0]);

  const product = createDashboardItem({ id: 'product:sb-01', source: 'product', severity: 'info', payload: { productId: 'sb-01' } });
  assert.equal(score(product).purchaseHistory.value, 1);
  assert.equal(score({ ...product, payload: { productId: 'sb-99' } }).purchaseHistory.value, 0);
});

test('proposed weights keep severity tiers apart with every factor at full value', () => {
  const { weights, severityLevels } = PROPOSED_PRIORITY_CONFIG;
  const factorNames = PROPOSED_FACTORS.map(factor => factor.name).filter(name => name !== 'severity');
  const bestExtra = factorNames.reduce((sum, name) => sum + Math.max(0, weights[name] ?? 0), 0);
  const worstExtra = factorNames.reduce((sum, name) => sum + Math.min(0, weights[name] ?? 0), 0);
  assert.equal(bestExtra, 205);
  assert.equal(worstExtra, -20);

  const tier = level => weights.severity * severityLevels[level];
  for (const [higher, lower] of [['critical', 'warning'], ['warning', 'info'], ['info', 'ok']]) {
    assert.ok(tier(higher) + worstExtra > tier(lower) + bestExtra, `${higher} always outranks ${lower}`);
  }
  assert.ok(INTEGRATION_FACTORS.every(factor => weights[factor.name] > 0), 'every new factor has a weight');
});

test('with the proposed engine, a stale critical order still outranks a fresh high pest risk', () => {
  const [blast] = normalizePestRisks(example('pest-risk').data);
  const order = createDashboardItem({ id: 'order:SB-1', source: 'order', kind: 'order.out_for_delivery', severity: 'critical', dueAt: NOW, fetchedAt: NOW - 5 * 60 * 60 * 1000 });
  const ranked = rankItems([blast, order], { now: NOW, cropIds: ['paddy'], weather: { risk: 1 } }, PROPOSED_PRIORITY_CONFIG, PROPOSED_FACTORS);
  assert.deepEqual(ranked.map(result => result.item.id), ['order:SB-1', blast.id]);
  assert.equal(ranked[0].stale, true);
});
