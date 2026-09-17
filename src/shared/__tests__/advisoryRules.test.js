// Who receives a crop advisory broadcast, and what they receive
// (src/shared/advisoryRules.js, used by the admin page and the server).

import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  ADVISORY_TEMPLATES, CROP_GROUPS, OPT_OUT_FOOTER, broadcastCounts, cropGroupKey, parseBroadcastRequest,
  renderAdvisory, selectRecipients,
} from '../advisoryRules.js';

test('free-text crop labels fold into crop groups', () => {
  assert.equal(cropGroupKey('Paddy / Rice Farmer'), 'paddy');
  assert.equal(cropGroupKey('Paddy/Rice'), 'paddy');
  assert.equal(cropGroupKey('Cotton Farmer'), 'cotton');
  assert.equal(cropGroupKey('Horticulture / Vegetables'), 'horticulture');
  assert.equal(cropGroupKey('Tomato'), 'horticulture');
  assert.equal(cropGroupKey('Sugarcane Farmer'), 'sugarcane');
  assert.equal(cropGroupKey('Mixed Crop Farmer'), 'mixed');
  assert.equal(cropGroupKey('Groundnut'), 'other');
  assert.equal(cropGroupKey(undefined), 'other');
});

test('every crop group has a starter template', () => {
  for (const group of [...CROP_GROUPS, { key: 'other' }]) assert.ok(ADVISORY_TEMPLATES[group.key], group.key);
});

const subs = [
  { id: 'a', phone: '9876543210', crop: 'Paddy / Rice Farmer', season: 'Kharif', subscribedAt: '2026-09-01' },
  { id: 'b', phone: '9876543210', crop: 'Paddy/Rice', season: 'Kharif', subscribedAt: '2026-08-01' },
  { id: 'c', phone: '9123456780', crop: 'Cotton Farmer', season: 'Rabi', subscribedAt: '2026-08-01' },
  { id: 'd', phone: '9000000001', crop: 'Paddy', season: 'Rabi', subscribedAt: '2026-08-01', status: 'Unsubscribed' },
  { id: 'e', phone: '12345', crop: 'Paddy', season: 'Kharif' },
];

test('recipients: chosen crops only, active only, valid numbers, one message per phone', () => {
  assert.deepEqual(selectRecipients(subs, { crops: ['paddy'] }).map((s) => s.id), ['a']);
  assert.deepEqual(selectRecipients(subs, { crops: ['paddy', 'cotton'] }).map((s) => s.id).sort(), ['a', 'c']);
  assert.deepEqual(selectRecipients(subs, { crops: [] }), []);
});

test('recipients: season filter is case-insensitive, empty means all seasons', () => {
  assert.deepEqual(selectRecipients(subs, { crops: ['paddy', 'cotton'], seasons: ['rabi'] }).map((s) => s.id), ['c']);
});

test('a farmer whose latest sign-up is unsubscribed gets nothing, even with an older active one', () => {
  const list = [
    { id: 'old', phone: '9876543210', crop: 'Paddy', subscribedAt: '2026-08-01' },
    { id: 'new', phone: '9876543210', crop: 'Paddy', subscribedAt: '2026-09-01', status: 'Unsubscribed' },
  ];
  assert.deepEqual(selectRecipients(list, { crops: ['paddy'] }), []);
});

test('messages are personalised and always carry the opt-out footer', () => {
  const text = renderAdvisory('Hi {name}, {crop} in {SEASON} on {acres} acres. {unknown}', {
    name: 'Murugan', crop: 'Paddy / Rice Farmer', season: 'Kharif', acreage: 4,
  });
  assert.ok(text.startsWith('Hi Murugan, Paddy / Rice in Kharif on 4 acres. {unknown}'));
  assert.ok(text.endsWith(OPT_OUT_FOOTER));
  assert.ok(renderAdvisory('Hi {name}', { name: 'Farmer Partner' }).startsWith('Hi Farmer\n'));
});

test('broadcast requests are validated and cleaned', () => {
  assert.throws(() => parseBroadcastRequest({ message: 'long enough text', crops: [] }), /at least one crop/);
  assert.throws(() => parseBroadcastRequest({ message: 'short', crops: ['paddy'] }), /at least 10/);
  assert.throws(() => parseBroadcastRequest({ message: 'x'.repeat(1501), crops: ['paddy'] }), /under 1500/);
  const parsed = parseBroadcastRequest({ message: ' Spray neem oil today \r\n', crops: ['paddy', 'paddy', 'bogus'], seasons: [' Kharif '] });
  assert.deepEqual(parsed, { title: 'Paddy / Rice advisory', message: 'Spray neem oil today', crops: ['paddy'], seasons: ['Kharif'] });
});

test('broadcast counts', () => {
  assert.deepEqual(broadcastCounts([{ status: 'sent' }, { status: 'sent' }, { status: 'queued' }, { status: 'failed' }]),
    { total: 4, queued: 1, sending: 0, sent: 2, failed: 1, skipped: 0, cancelled: 0 });
});
