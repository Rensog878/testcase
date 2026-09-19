// One WhatsApp code signs a farmer in; a number we have not seen is marked
// verified instead, and /register turns it into an account once the farmer has
// said who they are and where they farm. There is no password anywhere in this
// flow: staff keep theirs at /api/auth/login, and a customer who reaches that
// door is turned away with otpOnly. Nothing here may reveal whether a number is
// known.
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
const { default: app } = await import('../server.js');
const { hashPassword } = await import('../security.js');
const { normalizeProfileFields, DEFAULT_PROFILE_FIELDS } = await import('../../src/shared/profileFieldRules.js');

// The questions an admin has set, as the details form asks them.
const profileForm = normalizeProfileFields(DEFAULT_PROFILE_FIELDS);

// Request logs are expected here.
console.log = () => {};
console.warn = () => {};

// There is no database: the short-lived records live in a Map, and the accounts
// in another one keyed by mobile number.
const store = new Map();
const users = new Map();
let created = null;

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
  getUserByIdentifier: async (identifier) => users.get(String(identifier)) ?? null,
  getProfileFields: async () => profileForm,
  // What an admin has set as the shop's crops, grown as products are saved.
  getCatalogOptions: async () => ({ crops: ['Paddy / Rice', 'Paddy/Rice', 'Citrus / Fruits', 'Grapes / Fruits', 'Grapes', 'Potato'] }),
  deleteUsersByPhone: async (phone) => (users.delete(String(phone)) ? 1 : 0),
  getUserById: async (id) => [...users.values()].find((user) => user.id === id) ?? null,
  createUser: async (data) => {
    created = data;
    const user = { id: `USR-${users.size + 1}`, ...data, password: 'stored-hash' };
    users.set(user.phone, user);
    return user;
  },
  updateUser: async (id, updates) => {
    const user = [...users.values()].find((item) => item.id === id);
    if (!user) return null;
    Object.assign(user, updates);
    return user;
  },
});

// The code itself never leaves the server, so the test reads it out of the
// WhatsApp message the same way a farmer would read it off their phone.
let lastOtp = '';
let sendFails = false; // stands in for the provider being down
const realFetch = globalThis.fetch;
globalThis.fetch = async (url, init) => {
  if (!String(url).startsWith('https://wasender.test/')) return realFetch(url, init);
  if (sendFails) return new Response(JSON.stringify({ success: false, message: 'upstream down' }), { status: 503 });
  lastOtp = (String(init?.body || '').match(/\b\d{6}\b/) || [''])[0];
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

beforeEach(() => {
  store.clear();
  users.clear();
  created = null;
  lastOtp = '';
  sendFails = false;
});

async function post(path, body) {
  const res = await realFetch(`${base}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  return { status: res.status, data: await res.json() };
}

// Asks for a code and answers with the one that was actually sent.
async function signIn(phone = '9876543210') {
  const sent = await post('/api/auth/send-otp', { phone, purpose: 'auth' });
  assert.equal(sent.status, 200, 'the code was sent');
  return post('/api/auth/verify-otp', { phone, otp: lastOtp });
}

const farmer = (phone, extra = {}) => ({ id: 'USR-farmer', name: 'Murugan', phone, role: 'farmer', ...extra });

async function registerDetails(extra = {}) {
  const res = await realFetch(`${base}/api/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ phone: '9876543210', name: 'Murugan', crop: 'Cotton', acreage: '4', village: 'Thiruvaiyaru', district: 'Thanjavur', state: 'Tamil Nadu', ...extra }),
  });
  return { status: res.status, data: await res.json() };
}

test('a number we have not seen is verified, but no account exists until the details are given', async () => {
  const { status, data } = await signIn();

  assert.equal(status, 200);
  assert.equal(data.isNewUser, true);
  assert.equal(data.token, undefined, 'a verified number is not yet a session');
  assert.equal(created, null, 'and not yet an account');
});

test('the details finish the account and sign them in', async () => {
  await signIn();
  const { status, data } = await registerDetails();

  assert.equal(status, 200);
  assert.equal(data.user.phone, '9876543210');
  assert.equal(data.user.name, 'Murugan');
  assert.equal(data.user.role, 'farmer', 'self sign-up can only ever make a farmer');
  assert.ok(data.token, 'they are signed in the moment the account exists');
  assert.equal(created.createdBy, 'self-registered');
  assert.equal(created.crop, 'Cotton');
  assert.equal(created.village, 'Thiruvaiyaru');
  assert.ok(created.password && created.password.length >= 32, 'a random secret nobody knows, so tokens can still be revoked');
  assert.equal(data.user.password, undefined, 'the account password never goes to the browser');
});

test('the details form cannot create an account on a number that never answered a code', async () => {
  const { status, data } = await registerDetails();

  assert.equal(status, 403);
  assert.equal(data.requiresOtp, true);
  assert.equal(created, null);
});

test('a required answer left blank is refused, and the verified number stays usable', async () => {
  await signIn();
  const { status, data } = await registerDetails({ name: '' });

  assert.equal(status, 400);
  assert.equal(created, null);
  assert.ok(store.has('otp-verified:9876543210'), 'they can fix it without asking for a new code');
});

test('a verification is used up: the details cannot be sent twice', async () => {
  await signIn();
  assert.equal((await registerDetails()).status, 200);

  users.delete('9876543210'); // as if the first account had been removed
  const again = await registerDetails();
  assert.equal(again.status, 403, 'the same verification cannot make a second account');
});

test('self-registration cannot choose its own role or status', async () => {
  await signIn();
  const { status } = await registerDetails({ role: 'admin', status: 'blocked' });

  assert.equal(status, 200);
  assert.equal(created.role, 'farmer');
  assert.equal(created.status, undefined);
});

test('a number that already has an account is signed in, not asked for details again', async () => {
  users.set('9876543210', farmer('9876543210'));

  const { status, data } = await signIn();

  assert.equal(status, 200);
  assert.equal(data.isNewUser, false, 'so the sheet says "welcome back" instead of opening the form');
  assert.equal(data.user.name, 'Murugan');
  assert.ok(data.token);
  assert.equal(created, null, 'no second account on the same number');
  assert.equal(users.size, 1);
});

test('asking for a code never says whether the number is registered', async () => {
  const unknown = await post('/api/auth/send-otp', { phone: '9876543210', purpose: 'auth' });

  users.set('9000000001', farmer('9000000001'));
  const known = await post('/api/auth/send-otp', { phone: '9000000001', purpose: 'auth' });

  assert.equal(unknown.status, 200);
  assert.equal(known.status, 200, 'a registered number is not refused, which would give it away');
  assert.equal(known.data.message, unknown.data.message);
  assert.equal(known.data.alreadyRegistered, undefined);
});

test('a staff number is not signed in by a code, and no account is made on it', async () => {
  users.set('9876543210', { id: 'USR-admin', name: 'Admin', phone: '9876543210', role: 'admin' });

  const { status, data } = await signIn();

  assert.equal(status, 403);
  assert.equal(data.staffAccount, true);
  assert.equal(data.token, undefined);
  assert.equal(created, null, 'the staff account is not replaced by a farmer one');
});

test('a disabled account cannot be signed in with a code', async () => {
  users.set('9876543210', farmer('9876543210', { status: 'blocked' }));

  const { status, data } = await signIn();

  assert.equal(status, 403);
  assert.equal(data.token, undefined);
  assert.match(data.message, /disabled/i);
});

test('a wrong code verifies nothing and creates nothing', async () => {
  await post('/api/auth/send-otp', { phone: '9876543210', purpose: 'auth' });
  const wrong = String((Number(lastOtp) + 1) % 1000000).padStart(6, '0');

  const { status, data } = await post('/api/auth/verify-otp', { phone: '9876543210', otp: wrong });

  assert.equal(status, 400);
  assert.equal(data.token, undefined);
  assert.equal(created, null);
  assert.ok(!store.has('otp-verified:9876543210'), 'the number is not marked verified');
});

test('a code is single use: the second try cannot open a session', async () => {
  const first = await signIn();
  assert.equal(first.status, 200);

  const again = await post('/api/auth/verify-otp', { phone: '9876543210', otp: lastOtp });
  assert.equal(again.status, 400);
  assert.equal(again.data.token, undefined);
});

test('the password door turns a customer away and points at their code', async () => {
  // A farmer from before the change, whose old password still verifies.
  users.set('9876543210', farmer('9876543210', { password: await hashPassword('Kavya2026farm') }));

  const { status, data } = await post('/api/auth/login', { identifier: '9876543210', password: 'Kavya2026farm' });

  assert.equal(status, 403);
  assert.equal(data.otpOnly, true);
  assert.equal(data.token, undefined, 'the old password does not open a session any more');
});

test('the password door does not reveal that a number belongs to a customer', async () => {
  users.set('9876543210', farmer('9876543210', { password: await hashPassword('Kavya2026farm') }));

  const customer = await post('/api/auth/login', { identifier: '9876543210', password: 'wrong-password' });
  const unknown = await post('/api/auth/login', { identifier: '9000000002', password: 'wrong-password' });

  // The role is only checked once the password is right, so a wrong guess at a
  // customer's number looks exactly like a wrong guess at a number nobody has.
  assert.equal(customer.status, 401);
  assert.equal(customer.data.message, unknown.data.message);
  assert.equal(customer.data.otpOnly, undefined);
});

test('a customer cannot set a password through the reset flow', async () => {
  users.set('9876543210', farmer('9876543210'));

  const { status, data } = await post('/api/auth/forgot-password/send-otp', { phone: '9876543210' });

  // Answered exactly as an unregistered number is, so the reply gives nothing away.
  assert.equal(status, 200);
  assert.equal(lastOtp, '', 'no reset code is sent to a farmer');
});

test('codes that never went out do not spend the hourly allowance', async () => {
  // The provider is down. Eight tries is inside the limit of ten, but would
  // leave only two if every failure counted against it.
  sendFails = true;
  for (let attempt = 0; attempt < 8; attempt++) {
    const failed = await post('/api/auth/send-otp', { phone: '9876543210', purpose: 'auth' });
    assert.equal(failed.data.success, false, 'nothing was sent');
  }

  // It comes back. A farmer must not be locked out for the rest of the hour
  // over messages they never received.
  sendFails = false;
  const { status, data } = await signIn();
  assert.equal(status, 200);
  assert.equal(data.isNewUser, true);
});

test('the hourly limit still bites once the codes really are going out', async () => {
  for (let attempt = 0; attempt < 10; attempt++) {
    const sent = await post('/api/auth/send-otp', { phone: `98111111${String(attempt).padStart(2, '0')}`, purpose: 'auth' });
    assert.equal(sent.status, 200, `send ${attempt + 1} went out`);
  }

  const over = await post('/api/auth/send-otp', { phone: '9822222222', purpose: 'auth' });
  assert.equal(over.status, 429, 'the eleventh real send in the window is refused');
});

test('the crop choices come from the catalogue, not a second hardcoded list', async () => {
  const res = await realFetch(`${base}/api/profile-fields`);
  const { data } = await res.json();
  const crop = data.find((field) => field.id === 'crop');

  // Crops an admin added by saving a product are offered at sign-up without
  // anyone editing the form, which is what stops the two lists drifting apart.
  assert.ok(crop.options.includes('Citrus / Fruits'));
  assert.ok(crop.options.includes('Potato'));
  assert.ok(crop.options.includes('All Crops'), 'and a farmer can always say "all of them"');

  // "Paddy / Rice" and "Paddy/Rice" are the same crop typed two ways, and so
  // are "Grapes" and "Grapes / Fruits": a farmer must not be shown both.
  const head = value => value.toLowerCase().replace(/\s*\/\s*/g, '/').split('/')[0];
  const heads = crop.options.map(head);
  assert.equal(new Set(heads).size, heads.length, `one entry per crop: ${crop.options.join(', ')}`);

  // But two crops that merely share a qualifier are two crops.
  assert.ok(crop.options.includes('Citrus / Fruits'));
  assert.ok(crop.options.some(value => head(value) === 'grapes'), 'grapes survives beside citrus');
});

test('a crop an admin offers can be chosen at sign-up', async () => {
  await signIn();
  const { status } = await registerDetails({ crop: 'Potato' });

  assert.equal(status, 200);
  assert.equal(created.crop, 'Potato');
});
