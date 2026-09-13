import { test } from 'node:test';
import assert from 'node:assert/strict';

import { describeAge, resourceView } from '../lib/freshness.js';

const MINUTE = 60 * 1000;
const HOUR = 60 * MINUTE;
const NOW = Date.UTC(2026, 8, 13, 6, 0, 0);

test('describeAge picks the largest whole unit', () => {
  assert.deepEqual(describeAge(NOW - 30 * 1000, NOW), { unit: 'now', count: 0 });
  assert.deepEqual(describeAge(NOW - 5 * MINUTE, NOW), { unit: 'minutes', count: 5 });
  assert.deepEqual(describeAge(NOW - 2.5 * HOUR, NOW), { unit: 'hours', count: 2 });
  assert.deepEqual(describeAge(NOW - 50 * HOUR, NOW), { unit: 'days', count: 2 });
  assert.deepEqual(describeAge(NOW + MINUTE, NOW), { unit: 'now', count: 0 });
  assert.equal(describeAge(null, NOW), null);
});

const base = { now: NOW, staleAfterMs: HOUR };

test('without data: loading until a request fails, then error', () => {
  assert.equal(resourceView({ ...base, hasData: false }).state, 'loading');
  assert.equal(resourceView({ ...base, hasData: false, loading: true }).state, 'loading');
  assert.equal(resourceView({ ...base, hasData: false, error: new Error('x') }).state, 'error');
  assert.equal(resourceView({ ...base, hasData: false, error: new Error('x'), loading: true }).state, 'loading');
});

test('with data: ready or empty, fresh by default', () => {
  assert.deepEqual(resourceView({ ...base, hasData: true, fetchedAt: NOW }), { state: 'ready', stale: false, reason: null });
  assert.equal(resourceView({ ...base, hasData: true, isEmpty: true, fetchedAt: NOW }).state, 'empty');
});

test('stale reasons: offline beats a failed refresh, which beats age', () => {
  const old = NOW - 2 * HOUR;
  assert.deepEqual(resourceView({ ...base, hasData: true, fetchedAt: old }), { state: 'ready', stale: true, reason: 'old' });
  assert.equal(resourceView({ ...base, hasData: true, fetchedAt: old, error: new Error('x') }).reason, 'refresh_failed');
  assert.equal(resourceView({ ...base, hasData: true, fetchedAt: old, error: new Error('x'), online: false }).reason, 'offline');
  assert.equal(resourceView({ ...base, hasData: true, fetchedAt: NOW, error: new Error('x'), loading: true }).stale, false);
});
