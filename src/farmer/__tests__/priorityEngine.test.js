import { test } from 'node:test';
import assert from 'node:assert/strict';

import { createDashboardItem } from '../lib/dashboardItem.js';
import { PRIORITY_CONFIG } from '../lib/priorityConfig.js';
import { PRIORITY_FACTORS, rankItems, scoreItem } from '../lib/priorityEngine.js';

const HOUR = 60 * 60 * 1000;
const NOW = Date.UTC(2026, 8, 13, 6, 0, 0);

const item = fields => createDashboardItem({ source: 'alert', severity: 'info', fetchedAt: NOW, ...fields });
const ids = ranked => ranked.map(result => result.item.id);

test('severity tiers never overlap with the default weights', () => {
  const context = { userId: 'USR-1', cropIds: ['paddy'], now: NOW, weather: { risk: 1 } };
  const bestWarning = item({
    id: 'best-warning', severity: 'warning', dueAt: NOW - HOUR, cropIds: ['paddy'], weatherSensitive: true, targetUserId: 'USR-1', occurredAt: NOW,
  });
  const worstCritical = item({ id: 'worst-critical', severity: 'critical', fetchedAt: NOW - 48 * HOUR });
  const staleWarning = item({ id: 'stale-warning', severity: 'warning', fetchedAt: NOW - 48 * HOUR });
  const bestInfo = item({
    id: 'best-info', severity: 'info', dueAt: NOW - HOUR, cropIds: ['paddy'], weatherSensitive: true, targetUserId: 'USR-1', occurredAt: NOW,
  });
  const bestOk = item({ id: 'best-ok', severity: 'ok', dueAt: NOW - HOUR, cropIds: ['paddy'], weatherSensitive: true, targetUserId: 'USR-1', occurredAt: NOW });
  const worstInfo = item({ id: 'worst-info', severity: 'info', fetchedAt: NOW - 48 * HOUR });

  assert.deepEqual(ids(rankItems([bestWarning, worstCritical], context)), ['worst-critical', 'best-warning']);
  assert.deepEqual(ids(rankItems([bestInfo, staleWarning], context)), ['stale-warning', 'best-info']);
  assert.deepEqual(ids(rankItems([bestOk, worstInfo], context)), ['worst-info', 'best-ok']);
});

test('the breakdown lists every factor and adds up to the score', () => {
  const result = scoreItem(item({ id: 'a', severity: 'warning', dueAt: NOW + 36 * HOUR, cropIds: ['paddy'] }), { cropIds: ['paddy'], now: NOW });
  assert.deepEqual(Object.keys(result.breakdown).sort(), PRIORITY_FACTORS.map(factor => factor.name).sort());
  const total = Object.values(result.breakdown).reduce((sum, part) => sum + part.points, 0);
  assert.equal(result.score, Math.round(total * 100) / 100);
  assert.equal(result.breakdown.urgency.value, 0.5);
  assert.equal(result.breakdown.cropMatch.reason, 'exact');
  assert.equal(result.breakdown.cropMatch.points, PRIORITY_CONFIG.weights.cropMatch);
});

test('crop match puts the farmer’s crop first', () => {
  const context = { cropIds: ['paddy'], now: NOW };
  const ranked = rankItems([item({ id: 'wheat', cropIds: ['wheat'] }), item({ id: 'general', cropIds: ['all'] }), item({ id: 'paddy', cropIds: ['paddy'] })], context);
  assert.deepEqual(ids(ranked), ['paddy', 'general', 'wheat']);
  assert.deepEqual(ranked.map(result => result.breakdown.cropMatch.reason), ['exact', 'general', 'none']);
});

test('a farmer with no crop gets no crop points and a stable order', () => {
  const ranked = rankItems([item({ id: 'b', cropIds: ['paddy'] }), item({ id: 'a', cropIds: ['cotton'] })], { cropIds: [], now: NOW });
  assert.deepEqual(ranked.map(result => result.breakdown.cropMatch.reason), ['unknown', 'unknown']);
  assert.ok(ranked.every(result => result.breakdown.cropMatch.points === 0));
  assert.deepEqual(ids(ranked), ['a', 'b']);
});

test('a farmer growing "All Crops" gets general credit for crop-specific items', () => {
  const result = scoreItem(item({ id: 'x', cropIds: ['cotton'] }), { cropIds: ['all'], now: NOW });
  assert.equal(result.breakdown.cropMatch.reason, 'general');
  assert.equal(result.breakdown.cropMatch.value, PRIORITY_CONFIG.cropMatchLevels.general);
});

test('ties break by due date, then most recent event, then id', () => {
  const context = { now: NOW };
  const noUrgency = { ...PRIORITY_CONFIG, weights: { ...PRIORITY_CONFIG.weights, urgency: 0, recency: 0 } };
  const items = [
    item({ id: 'c', dueAt: null, occurredAt: NOW - 5 * HOUR }),
    item({ id: 'b', dueAt: NOW + 10 * HOUR }),
    item({ id: 'a', dueAt: NOW + 20 * HOUR }),
    item({ id: 'e', dueAt: null, occurredAt: NOW - HOUR }),
    item({ id: 'd', dueAt: null, occurredAt: NOW - HOUR }),
  ];
  const expected = ['b', 'a', 'd', 'e', 'c'];
  assert.deepEqual(ids(rankItems(items, context, noUrgency)), expected);
  assert.deepEqual(ids(rankItems([...items].reverse(), context, noUrgency)), expected);
  const scores = rankItems(items, context, noUrgency).map(result => result.score);
  assert.equal(new Set(scores).size, 1, 'all five items really are tied');
});

test('stale items are flagged, lose points and rank below fresh twins', () => {
  const fresh = item({ id: 'fresh', source: 'order', severity: 'warning', fetchedAt: NOW - 10 * 60 * 1000 });
  const stale = item({ id: 'stale', source: 'order', severity: 'warning', fetchedAt: NOW - 2 * HOUR });
  const ranked = rankItems([stale, fresh], { now: NOW });
  assert.deepEqual(ids(ranked), ['fresh', 'stale']);
  assert.deepEqual(ranked.map(result => result.stale), [false, true]);
  assert.equal(ranked[1].breakdown.staleness.points, PRIORITY_CONFIG.weights.staleness);
  assert.equal(scoreItem(item({ id: 'no-time', fetchedAt: null }), { now: NOW }).stale, false);
});

test('urgency: overdue is full, beyond the horizon is zero, no due date is zero', () => {
  const urgency = dueAt => scoreItem(item({ id: 'u', dueAt }), { now: NOW }).breakdown.urgency;
  assert.equal(urgency(NOW - HOUR).value, 1);
  assert.equal(urgency(NOW + 100 * HOUR).value, 0);
  assert.equal(urgency(null).reason, 'no_due_date');
});

test('weather relevance counts only for weather-sensitive items with weather data', () => {
  const sensitive = item({ id: 'w', weatherSensitive: true });
  assert.equal(scoreItem(sensitive, { now: NOW, weather: { risk: 0.8 } }).breakdown.weatherRelevance.points, 20);
  assert.equal(scoreItem(sensitive, { now: NOW }).breakdown.weatherRelevance.reason, 'no_weather');
  assert.equal(scoreItem(item({ id: 'n' }), { now: NOW, weather: { risk: 1 } }).breakdown.weatherRelevance.points, 0);
});

test('items an admin assigned to this farmer earn the targeted points', () => {
  const mine = scoreItem(item({ id: 't', targetUserId: 'USR-1' }), { userId: 'USR-1', now: NOW });
  const theirs = scoreItem(item({ id: 't2', targetUserId: 'USR-2' }), { userId: 'USR-1', now: NOW });
  assert.equal(mine.breakdown.targeted.points, PRIORITY_CONFIG.weights.targeted);
  assert.equal(theirs.breakdown.targeted.points, 0);
});

test('a new factor plugs in through the factor list and a weight', () => {
  const seasonal = { name: 'seasonal', compute: () => ({ value: 1, reason: 'kharif' }) };
  const config = { ...PRIORITY_CONFIG, weights: { ...PRIORITY_CONFIG.weights, seasonal: 5 } };
  const base = scoreItem(item({ id: 's' }), { now: NOW });
  const extended = scoreItem(item({ id: 's' }), { now: NOW }, config, [...PRIORITY_FACTORS, seasonal]);
  assert.equal(extended.score, base.score + 5);
  assert.deepEqual(extended.breakdown.seasonal, { value: 1, weight: 5, points: 5, reason: 'kharif' });
});

test('empty input and missing context are handled', () => {
  assert.deepEqual(rankItems(undefined), []);
  assert.equal(rankItems([item({ id: 'x' })]).length, 1);
});
