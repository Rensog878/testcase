// The OTP resend wait: chosen by the server per send, 30-60 whole seconds,
// and enforced by it whatever the request says.
// Run from server/: npm test

import { test, before, after, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

// Settings must be in place before the modules load (dotenv never overrides them).
Object.assign(process.env, {
  NODE_ENV: 'test',
  MONGODB_URI: '',
  OTP_HASH_SECRET: 'test-secret',
  TEST_PHONE_NUMBERS: '',
  WASENDER_API_KEY: 'test-key',
  WASENDER_API_URL: 'https://wasender.test/api/send-message',
  WASENDER_MIN_GAP_MS: '0',
  WASENDER_GAP_JITTER_MS: '0',
  WASENDER_CHECK_NUMBERS: 'off',
});
for (let slot = 2; slot <= 10; slot++) delete process.env[`WASENDER_API_KEY_${slot}`];

const { db } = await import('../db.js');
const { default: app, nextResendCooldownMs } = await import('../server.js');

// Request logs are expected here.
console.log = () => {};
console.warn = () => {};

// There is no database: the short-lived records live in a Map instead.
const store = new Map();
Object.assign(db, {
  kvGet: async (key) => store.get(key) ?? null,
  kvSet: async (key, value) => { store.set(key, value); return value; },
  kvDelete: async (key) => { store.delete(key); },
  kvGetMany: async (keys) => new Map(keys.filter((key) => store.has(key)).map((key) => [key, store.get(key)])),
  kvClaimSlot: async () => 0,
  kvIncrement: async (key, field) => {
    const value = store.get(key) || {};
    value[field] = (Number(value[field]) || 0) + 1;
    store.set(key, value);
    return value[field];
  },
  getUserByIdentifier: async () => null,
});

// WhatsApp messages are answered here; requests to the app go through.
const realFetch = globalThis.fetch;
globalThis.fetch = async (url, init) => {
  if (!String(url).startsWith('https://wasender.test/')) return realFetch(url, init);
  return new Response(JSON.stringify({ success: true, data: { msgId: 1, status: 'in_progress' } }), { status: 200 });
};

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

beforeEach(() => store.clear());

async function post(path, body) {
  const res = await realFetch(`${base}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  return { status: res.status, data: await res.json() };
}

test('each resend wait is a whole number of seconds from 30 to 60', () => {
  const seen = new Set();
  for (let i = 0; i < 5000; i++) {
    const ms = nextResendCooldownMs();
    assert.ok(ms >= 30_000 && ms <= 60_000, `${ms}ms`);
    assert.equal(ms % 1000, 0, `${ms}ms is not whole seconds`);
    seen.add(ms);
  }
  // Both ends can be picked. (Missing either in 5000 draws practically never happens.)
  assert.ok(seen.has(30_000), '30s is picked');
  assert.ok(seen.has(60_000), '60s is picked');
});

const ENDPOINTS = [
  { name: 'sign-up', path: '/api/auth/send-otp', key: (phone) => `otp:${phone}` },
  { name: 'password reset', path: '/api/auth/forgot-password/send-otp', key: (phone) => `reset-otp:${phone}` },
];

for (const { name, path, key } of ENDPOINTS) {
  test(`${name}: a second send inside the wait is refused with the seconds left`, async () => {
    const first = await post(path, { phone: '9876543210', name: 'Murugan' });
    assert.equal(first.status, 200);
    const { resendAfter } = first.data;
    assert.ok(Number.isInteger(resendAfter) && resendAfter >= 30 && resendAfter <= 60, `resendAfter ${resendAfter}`);

    // A wait sent by the client changes nothing.
    const second = await post(path, { phone: '9876543210', resendAfter: 0, retryAfter: 0, resendAfterMs: 0 });
    assert.equal(second.status, 429);
    const { retryAfter } = second.data;
    assert.ok(Number.isInteger(retryAfter) && retryAfter >= 1 && retryAfter <= 60, `retryAfter ${retryAfter}`);
    assert.ok(retryAfter <= resendAfter);
  });

  test(`${name}: the resend opens when the announced wait ends, not before`, async () => {
    const phone = '9876543211';
    const first = await post(path, { phone });
    const record = store.get(key(phone));
    const waitMs = first.data.resendAfter * 1000;

    record.lastSentAt = Date.now() - waitMs + 500;
    const early = await post(path, { phone });
    assert.equal(early.status, 429);
    assert.equal(early.data.retryAfter, 1);

    record.lastSentAt = Date.now() - waitMs;
    const onTime = await post(path, { phone });
    assert.equal(onTime.status, 200);
  });
}

test('a code saved under the old 90s limit is held no longer than 60s', async () => {
  const phone = '9876543212';
  store.set(`otp:${phone}`, { otpHash: 'x', expiresAt: Date.now() + 300_000, lastSentAt: Date.now(), resendAfterMs: 90_000, attempts: 0 });
  const res = await post('/api/auth/send-otp', { phone });
  assert.equal(res.status, 429);
  assert.ok(res.data.retryAfter >= 59 && res.data.retryAfter <= 60, `retryAfter ${res.data.retryAfter}`);
});
