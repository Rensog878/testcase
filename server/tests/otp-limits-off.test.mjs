// OTP_RATE_LIMITS=off lifts the hourly caps (10 an hour per machine, 5 per
// number) so a local run can keep putting numbers through the flow. The 30-60s
// wait between codes and the cap on wrong guesses stay on, and production
// ignores the setting entirely, where each send is a paid WhatsApp message.
// Run from server/: npm test

import { test, before, after, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

Object.assign(process.env, {
  // 'test' so importing the app never opens a listener of its own. The switch
  // is gated on NODE_ENV !== 'production', so it applies here exactly as it
  // does on the local stack, which runs as 'development'.
  NODE_ENV: 'test',
  MONGODB_URI: '',
  OTP_HASH_SECRET: 'test-secret',
  TEST_PHONE_NUMBERS: '',
  OTP_RATE_LIMITS: 'off',
  WASENDER_API_KEY: 'test-key',
  WASENDER_API_URL: 'https://wasender.test/api/send-message',
  WASENDER_MIN_GAP_MS: '0',
  WASENDER_GAP_JITTER_MS: '0',
  WASENDER_CHECK_NUMBERS: 'off',
});
for (let slot = 2; slot <= 10; slot++) delete process.env[`WASENDER_API_KEY_${slot}`];

const { db } = await import('../db.js');
const { default: app } = await import('../server.js');

console.log = () => {};
console.warn = () => {};

const store = new Map();
Object.assign(db, {
  kvGet: async (key) => store.get(key) ?? null,
  kvSet: async (key, value) => { store.set(key, value); return value; },
  kvDelete: async (key) => { store.delete(key); },
  kvGetMany: async (keys) => new Map(keys.filter((key) => store.has(key)).map((key) => [key, store.get(key)])),
  kvClaimSlot: async () => 0,
  kvIncrement: async (key, field, ttlMs, { by = 1 } = {}) => {
    const value = store.get(key) || {};
    value[field] = (Number(value[field]) || 0) + by;
    store.set(key, value);
    return value[field];
  },
  getUserByIdentifier: async () => null,
});

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

async function sendOtp(phone) {
  const res = await realFetch(`${base}/api/auth/send-otp`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ phone, purpose: 'auth' }),
  });
  return { status: res.status, data: await res.json() };
}

test('the wait between two codes to one number is still enforced', async () => {
  const first = await sendOtp('9876543210');
  assert.equal(first.status, 200);

  const tooSoon = await sendOtp('9876543210');
  assert.equal(tooSoon.status, 429, 'the 30-60s wait is the control that stays');
  assert.ok(tooSoon.data.retryAfter >= 30 && tooSoon.data.retryAfter <= 60);
});

test('the hourly per-number cap is gone: past five codes, once each wait is served', async () => {
  for (let attempt = 0; attempt < 8; attempt++) {
    const { status } = await sendOtp('9876543210');
    assert.equal(status, 200, `send ${attempt + 1} was allowed`);
    // Serve the wait the server just set, the way a farmer waiting would.
    const record = store.get('otp:9876543210');
    record.lastSentAt = Date.now() - record.resendAfterMs - 1000;
  }
});

test('the hourly per-machine cap does not bite either', async () => {
  // Well past the limit of ten from one address.
  for (let attempt = 0; attempt < 15; attempt++) {
    const { status } = await sendOtp(`98765432${String(attempt).padStart(2, '0')}`);
    assert.equal(status, 200, `send ${attempt + 1} was allowed`);
  }
  assert.equal([...store.keys()].filter((key) => key.startsWith('rl:otp-')).length, 0, 'nothing is even counted');
});

test('a code still cannot simply be guessed', async () => {
  await sendOtp('9876543210');
  assert.ok(store.has('otp:9876543210'), 'a code is waiting to be answered');

  // The cap on wrong guesses is a different control and stays on: five wrong
  // answers and the code is thrown away, so a 6-digit number cannot be walked
  // through however many times the caps above are lifted.
  const guess = () => realFetch(`${base}/api/auth/verify-otp`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ phone: '9876543210', otp: '000000' }),
  }).then((res) => res.status);

  for (let attempt = 0; attempt < 5; attempt++) {
    assert.equal(await guess(), 400, `guess ${attempt + 1} refused`);
  }
  assert.ok(!store.has('otp:9876543210'), 'the code is gone after five wrong guesses');
  assert.equal(await guess(), 400, 'and there is nothing left to guess at');
});
