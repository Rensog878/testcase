// Registration follows the admin's Profile Form Builder: required answers,
// types and choices are enforced, built-in answers go to the account and the
// admin's own questions go to user.profile. Nothing outside the form is saved.
// Run from server/: npm test

import { test, before, after, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

Object.assign(process.env, {
  NODE_ENV: 'test',
  MONGODB_URI: '',
  OTP_HASH_SECRET: 'test-secret',
  TEST_PHONE_NUMBERS: '',
  WASENDER_API_KEY: '',
});

const { db } = await import('../db.js');
const { default: app } = await import('../server.js');
const { normalizeProfileFields, DEFAULT_PROFILE_FIELDS } = await import('../../src/shared/profileFieldRules.js');

console.log = () => {};
console.warn = () => {};

const store = new Map();
let created = null;
const form = normalizeProfileFields([
  ...DEFAULT_PROFILE_FIELDS.filter((field) => field.id !== 'state'),
  { id: 'soil', title: 'Soil type', type: 'select', required: true, editable: true, options: ['Red', 'Black'] },
]);

Object.assign(db, {
  kvGet: async (key) => store.get(key) ?? null,
  kvSet: async (key, value) => { store.set(key, value); return value; },
  kvDelete: async (key) => { store.delete(key); },
  kvClaimSlot: async () => 0,
  kvIncrement: async (key, field) => {
    const value = store.get(key) || {};
    value[field] = (Number(value[field]) || 0) + 1;
    store.set(key, value);
    return value[field];
  },
  getUserByIdentifier: async () => null,
  getProfileFields: async () => form,
  createUser: async (data) => { created = data; return { id: 'USR-1', ...data, password: 'hash' }; },
  getUserById: async () => ({ id: 'USR-1', password: 'hash' }),
});

let server;
let base;
before(async () => {
  server = app.listen(0, '127.0.0.1');
  await new Promise((resolve) => server.once('listening', resolve));
  base = `http://127.0.0.1:${server.address().port}`;
});
after(() => {
  server.closeAllConnections();
  server.close();
});
beforeEach(() => {
  store.clear();
  created = null;
  store.set('otp-verified:9876543210', { verifiedUntil: Date.now() + 60_000 });
});

async function register(body) {
  const res = await fetch(`${base}/api/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ phone: '9876543210', password: 'Kavya2026farm', name: 'Murugan', ...body }),
  });
  return { status: res.status, data: await res.json() };
}

test('a required question left unanswered is refused, and the verified number stays usable', async () => {
  const { status, data } = await register({ crop: 'Cotton' });
  assert.equal(status, 400);
  assert.equal(data.fieldErrors.soil, 'Soil type is required.');
  assert.equal(created, null);
  assert.ok(store.has('otp-verified:9876543210'), 'the farmer can fix the answer without a new code');
});

test('a choice not in the list, or a bad email, is refused', async () => {
  assert.equal((await register({ soil: 'Blue' })).status, 400);
  const bad = await register({ soil: 'Red', email: 'not-an-email' });
  assert.equal(bad.status, 400);
  assert.match(bad.data.fieldErrors.email, /valid email/);
});

test('answers are split between the account and the profile; fields not in the form are ignored', async () => {
  const { status } = await register({
    soil: 'Black', crop: 'Cotton', acreage: '4', village: ' Thiruvaiyaru ', email: 'M@Farm.in',
    state: 'Kerala', role: 'admin', status: 'blocked',
  });
  assert.equal(status, 200);
  assert.equal(created.role, 'farmer');
  assert.equal(created.crop, 'Cotton');
  assert.equal(created.acreage, 4);
  assert.equal(created.village, 'Thiruvaiyaru');
  assert.equal(created.email, 'm@farm.in');
  assert.deepEqual(created.profile, { soil: 'Black' });
  assert.equal(created.state, undefined, 'state was removed from the form');
  assert.equal(created.status, undefined);
  assert.ok(!store.has('otp-verified:9876543210'), 'the verification is used up');
});
