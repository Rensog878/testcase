// Refer & Earn: a friend's code at signup, the welcome discount and points
// priced by the server, rewards given back on cancel, and the referrer paid
// exactly once when the friend's order is delivered.
// Run from server/: npm test

import { test, before, after, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

Object.assign(process.env, {
  NODE_ENV: 'test',
  MONGODB_URI: '',
  OTP_HASH_SECRET: 'test-secret',
  AUTH_TOKEN_SECRET: 'test-secret',
  WASENDER_API_KEY: 'test-key',
  WASENDER_API_URL: 'https://wasender.test/api/send-message',
  WASENDER_MIN_GAP_MS: '0',
  WASENDER_GAP_JITTER_MS: '0',
  WASENDER_CHECK_NUMBERS: 'off',
});
for (let slot = 2; slot <= 10; slot++) delete process.env[`WASENDER_API_KEY_${slot}`];

const { db } = await import('../db.js');
const { default: app } = await import('../server.js');
const { signToken } = await import('../security.js');
const rules = await import('../referrals.js');
const { normalizeProfileFields, DEFAULT_PROFILE_FIELDS } = await import('../../src/shared/profileFieldRules.js');

console.log = () => {};
console.warn = () => {};
console.error = () => {};

// ---------- pure rules ----------

test('codes are SAM + 6 unambiguous characters, and typing is forgiving', () => {
  const code = rules.makeReferralCode();
  assert.match(code, /^SAM[A-HJKMNP-Z2-9]{6}$/);
  assert.equal(rules.normalizeReferralCode(` ${code.toLowerCase().slice(0, 5)}-${code.slice(5)} `), code);
  assert.equal(rules.normalizeReferralCode('SAM0O1IL2'), '', 'look-alike characters are never issued');
  assert.equal(rules.normalizeReferralCode('<script>'), '');
});

test('welcome discount needs the minimum order; points pay at most 10%', () => {
  const s = rules.REFERRAL_DEFAULTS;
  assert.equal(rules.priceRewards({ total: 499, welcome: true, settings: s }).welcomeDiscount, 0);
  const r = rules.priceRewards({ total: 1000, welcome: true, balance: 500, usePoints: true, settings: s });
  assert.deepEqual([r.welcomeDiscount, r.pointsUsed, r.payable], [50, 100, 850]);
  assert.equal(rules.priceRewards({ total: 299, balance: 500, usePoints: true, settings: s }).pointsUsed, 0, 'redeem minimum');
  assert.equal(rules.priceRewards({ total: 1000, balance: 30, usePoints: true, settings: s }).pointsUsed, 30, 'no more than the balance');
  assert.equal(rules.priceRewards({ total: 1000, welcome: true, balance: 500, usePoints: true, settings: { ...s, enabled: false } }).discount, 0);
});

test('expired points are worth nothing', () => {
  assert.equal(rules.pointsBalance({ points: 80, pointsExpireAt: '2000-01-01T00:00:00.000Z' }), 0);
  assert.equal(rules.pointsBalance({ points: 80, pointsExpireAt: '2999-01-01T00:00:00.000Z' }), 80);
  assert.equal(rules.pointsBalance({ points: 80 }), 80);
});

test('settings must be whole numbers in range', () => {
  assert.match(rules.cleanReferralSettings({ redeemMaxPercent: 90 }).error, /redeemMaxPercent/);
  assert.match(rules.cleanReferralSettings({ welcomeDiscount: 12.5 }).error, /welcomeDiscount/);
  assert.match(rules.cleanReferralSettings({ enabled: 'yes' }).error, /enabled/);
  assert.equal(rules.cleanReferralSettings({ welcomeDiscount: '75' }).settings.welcomeDiscount, 75);
});

test('same house under different spelling is the same address', () => {
  assert.ok(rules.sameAddress({ doorNo: '12/A', street: 'Main Rd', pincode: '613001' }, { doorNo: '12 a', street: 'main rd.', pincode: '613001' }));
  assert.ok(!rules.sameAddress({ doorNo: '12', street: 'Main Rd', pincode: '613001' }, { doorNo: '14', street: 'Main Rd', pincode: '613001' }));
  assert.ok(!rules.sameAddress({}, {}), 'empty addresses never match');
});

// ---------- in-memory database ----------

const kv = new Map();
let users, orders, referrals, ledger, settingsDoc, stock;

const matches = (doc, condition) => Object.entries(condition).every(([k, v]) => (v === null ? doc[k] == null : doc[k] === v));
const farmer = (id, phone, extra = {}) => ({ id, name: `Farmer ${id}`, phone, role: 'farmer', status: 'active', password: 'hash', points: 0, ...extra });

function reset() {
  kv.clear();
  users = new Map([
    ['U-ADMIN', { id: 'U-ADMIN', name: 'Admin', role: 'admin', status: 'active', password: 'hash' }],
    ['U-STAFF', { id: 'U-STAFF', name: 'Ravi', role: 'delivery', status: 'active', phone: '9000000009', password: 'hash' }],
    ['U-RAMESH', farmer('U-RAMESH', '9876500001', { name: 'Ramesh Kumar', referralCode: 'SAMABCDEF' })],
  ]);
  orders = new Map();
  referrals = new Map();
  ledger = [];
  settingsDoc = null;
  stock = new Map([['P-1', 100]]);
}

const product = { id: 'P-1', name: 'Neem Oil', price: 500, gstRate: 0, stock: 100, packSizes: ['1 L'], selectedPack: '1 L' };

Object.assign(db, {
  kvGet: async (key) => kv.get(key) ?? null,
  kvSet: async (key, value) => { kv.set(key, value); return value; },
  kvDelete: async (key) => { kv.delete(key); },
  kvGetMany: async (keys) => new Map(keys.filter((k) => kv.has(k)).map((k) => [k, kv.get(k)])),
  kvClaimSlot: async () => 0,
  kvIncrement: async () => 1,
  getCMS: async () => ({}),
  getProfileFields: async () => normalizeProfileFields(DEFAULT_PROFILE_FIELDS),
  getCatalogOptions: async () => ({ crops: ['Cotton'] }),
  getUserById: async (id) => structuredClone(users.get(id) ?? null),
  getUserByIdentifier: async (phone) => [...users.values()].find((u) => u.phone === phone && u.role === 'farmer') ?? null,
  deleteUsersByPhone: async () => 0,
  setUserSessionId: async () => {},
  updateUser: async (id, updates) => (users.has(id) ? structuredClone(Object.assign(users.get(id), updates)) : null),
  createUser: async (data) => {
    const user = { id: `U-NEW-${users.size}`, points: 0, status: 'active', ...data };
    users.set(user.id, user);
    return structuredClone(user);
  },
  getProductsByIds: async (ids) => (ids.includes('P-1') ? [structuredClone(product)] : []),
  reserveStock: async (lines) => {
    if (lines.some((l) => (stock.get(l.id) ?? 0) < l.qty)) return { ok: false };
    lines.forEach((l) => stock.set(l.id, stock.get(l.id) - l.qty));
    return { ok: true };
  },
  releaseStock: async (lines) => { lines.forEach((l) => stock.set(l.id, stock.get(l.id) + l.qty)); },
  saveCart: async () => {},
  createOrder: async (data) => {
    const id = `ORD-${orders.size + 1}`;
    const order = { id, ...data, deliveryStatus: 'Confirmed', status: 'Confirmed', createdAt: new Date().toISOString() };
    orders.set(id, order);
    return structuredClone(order);
  },
  getOrderById: async (id) => structuredClone(orders.get(id) ?? null),
  getOrdersForUser: async (userId) => structuredClone([...orders.values()].filter((o) => o.userId === userId)),
  updateOrder: async (id, updates) => (orders.has(id) ? structuredClone(Object.assign(orders.get(id), updates)) : null),
  updateOrderIf: async (id, condition, updates) => {
    const order = orders.get(id);
    if (!order) return null;
    const cancelled = order.deliveryStatus === 'Cancelled' || order.status === 'Cancelled';
    return (condition.$or ? cancelled : !cancelled) ? structuredClone(Object.assign(order, updates)) : null;
  },
  claimOrderNotification: async () => false,
  recordOrderNotification: async () => {},
  logActivity: async () => {},
  getReferralSettings: async () => settingsDoc,
  saveReferralSettings: async (s) => { settingsDoc = s; return s; },
  addPoints: async (userId, points, description, { type, orderId, expiresAt } = {}) => {
    const user = users.get(userId);
    if (!user || user.role !== 'farmer') return null;
    if (points < 0 && user.points < -points) return { error: 'INSUFFICIENT_POINTS' };
    user.points += points;
    if (expiresAt) user.pointsExpireAt = expiresAt;
    const row = { id: `PT-${ledger.length}`, userId, points, type, description, orderId, createdAt: new Date().toISOString() };
    ledger.push(row);
    return { userId, newPoints: user.points, ledger: row };
  },
  spendPoints: async (userId, points, description, orderId) => {
    const user = users.get(userId);
    if (!user || rules.pointsBalance(user) < points) return false;
    user.points -= points;
    ledger.push({ id: `PT-${ledger.length}`, userId, points: -points, type: 'spent', description, orderId });
    return true;
  },
  getPointsLedgerForUser: async (userId) => ledger.filter((l) => l.userId === userId),
  ensureReferralCode: async (userId, make) => {
    const user = users.get(userId);
    if (!user.referralCode) user.referralCode = make();
    return user.referralCode;
  },
  getFarmerByReferralCode: async (code) => structuredClone([...users.values()].find((u) => code && u.referralCode === code && u.role === 'farmer') ?? null),
  createReferral: async (r) => {
    const id = rules.referralIdFor(r.referredPhone);
    if (referrals.has(id)) return null;
    const doc = { id, status: 'Pending', pointsAwarded: 0, welcomeOrderId: null, createdAt: new Date().toISOString(), ...r };
    referrals.set(id, doc);
    return structuredClone(doc);
  },
  getReferralById: async (id) => structuredClone(referrals.get(id) ?? null),
  getReferralForReferred: async (userId) => structuredClone([...referrals.values()].find((r) => r.referredId === userId) ?? null),
  getReferralsByReferrer: async (userId) => structuredClone([...referrals.values()].filter((r) => r.referrerId === userId)),
  countRewardedReferrals: async (referrerId, since) => [...referrals.values()].filter((r) => r.referrerId === referrerId && r.status === 'Completed' && r.completedAt >= since).length,
  updateReferralIf: async (id, condition, updates) => {
    const doc = referrals.get(id);
    return doc && matches(doc, condition) ? structuredClone(Object.assign(doc, updates)) : null;
  },
});

const realFetch = globalThis.fetch;
globalThis.fetch = async (url, init) => (String(url).startsWith('https://wasender.test/')
  ? new Response(JSON.stringify({ success: true, data: { msgId: 1 } }), { status: 200 })
  : realFetch(url, init));

let server;
let base;
before(async () => {
  server = app.listen(0, '127.0.0.1');
  await new Promise((resolve) => server.once('listening', resolve));
  base = `http://127.0.0.1:${server.address().port}`;
});
after(() => { server.closeAllConnections(); server.close(); });
beforeEach(reset);

const tokenFor = (id) => signToken(id, users.get(id).password);
async function call(method, path, body, userId) {
  const res = await realFetch(`${base}${path}`, {
    method,
    headers: { 'Content-Type': 'application/json', ...(userId && { Authorization: `Bearer ${tokenFor(userId)}` }) },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  return { status: res.status, data: await res.json() };
}

const address = { customerName: 'Anil', customerPhone: '9876500002', doorNo: '7', street: 'Temple St', area: 'North', taluk: 'Kumbakonam', pincode: '612001', district: 'Thanjavur', state: 'Tamil Nadu' };
const cart = (qty) => [{ id: 'P-1', qty, selectedPack: '1 L' }];
const placeOrder = (userId, qty, extra = {}) => call('POST', '/api/orders', { ...address, items: cart(qty), ...extra }, userId);

async function signUp(phone, referralCode) {
  kv.set(`otp-verified:${phone}`, { verifiedUntil: Date.now() + 60000 });
  return call('POST', '/api/auth/register', { phone, name: 'Anil Reddy', crop: 'Cotton', acreage: '4', village: 'X', district: 'Thanjavur', state: 'Tamil Nadu', referralCode });
}

const FRIEND_REF = rules.referralIdFor('9876500002');

async function referredFriend() {
  const { data } = await signUp('9876500002', 'samabcdef');
  return data.user.id;
}

// ---------- signup ----------

test('a friend\'s code at signup links the new farmer to the referrer', async () => {
  const { status, data } = await signUp('9876500002', ' samabc-def ');
  assert.equal(status, 200);
  assert.equal(data.referral.applied, true);
  const ref = referrals.get(FRIEND_REF);
  assert.equal(ref.referrerId, 'U-RAMESH');
  assert.equal(ref.status, 'Pending');
});

test('an unknown code never blocks the signup', async () => {
  const { status, data } = await signUp('9876500002', 'SAMZZZZZZ');
  assert.equal(status, 200);
  assert.ok(data.token);
  assert.equal(data.referral.applied, false);
  assert.equal(referrals.size, 0);
});

test('checking a code shows only the friend\'s masked name', async () => {
  const ok = await call('GET', '/api/referrals/check?code=SAMABCDEF');
  assert.deepEqual([ok.data.valid, ok.data.referrerName], [true, 'Ramesh K.']);
  assert.equal(JSON.stringify(ok.data).includes('9876500001'), false, 'no phone number');
  assert.equal((await call('GET', '/api/referrals/check?code=SAMZZZZZZ')).data.valid, false);
});

// ---------- checkout ----------

test('the welcome discount applies once, on an order of at least ₹500', async () => {
  const friend = await referredFriend();
  const small = await placeOrder(friend, 0.5).catch(() => null); // invalid qty is refused anyway
  assert.notEqual(small?.status, 200);

  const first = await placeOrder(friend, 1);
  assert.equal(first.status, 200);
  assert.deepEqual([first.data.data.total, first.data.data.welcomeDiscount, first.data.data.itemsTotal], [450, 50, 500]);
  assert.equal(referrals.get(FRIEND_REF).welcomeOrderId, first.data.data.id);

  const second = await placeOrder(friend, 1);
  assert.equal(second.data.data.total, 500, 'the offer is used up');
});

test('the browser cannot ask for a discount the server did not grant', async () => {
  const friend = await referredFriend();
  const { data } = await placeOrder(friend, 1, { total: 1, discount: 499, welcomeDiscount: 499, pointsUsed: 499 });
  assert.equal(data.data.total, 450);
  assert.equal(data.data.pointsUsed, 0);
});

test('points pay up to 10% and only when the farmer asks', async () => {
  users.get('U-RAMESH').points = 300;
  const without = await placeOrder('U-RAMESH', 2);
  assert.equal(without.data.data.total, 1000);
  assert.equal(users.get('U-RAMESH').points, 300);

  const withPoints = await placeOrder('U-RAMESH', 2, { usePoints: true });
  assert.deepEqual([withPoints.data.data.total, withPoints.data.data.pointsUsed], [900, 100]);
  assert.equal(users.get('U-RAMESH').points, 200);
});

test('the checkout preview matches what the order charges', async () => {
  const friend = await referredFriend();
  const preview = await call('POST', '/api/checkout/rewards', { items: cart(2) }, friend);
  const order = await placeOrder(friend, 2);
  assert.equal(preview.data.data.payable, order.data.data.total);
});

test('expired points cannot be spent', async () => {
  Object.assign(users.get('U-RAMESH'), { points: 300, pointsExpireAt: '2000-01-01T00:00:00.000Z' });
  const { data } = await placeOrder('U-RAMESH', 2, { usePoints: true });
  assert.equal(data.data.total, 1000);
});

test('cancelling returns the points and frees the welcome offer, exactly once', async () => {
  const friend = await referredFriend();
  users.get(friend).points = 100;
  const { data } = await placeOrder(friend, 2, { usePoints: true });
  const id = data.data.id;
  assert.equal(users.get(friend).points, 0);

  const cancel = () => call('PUT', `/api/orders/${id}/status`, { status: 'Cancelled' }, 'U-ADMIN');
  await Promise.all([cancel(), cancel()]);
  assert.equal(users.get(friend).points, 100);
  assert.equal(referrals.get(FRIEND_REF).welcomeOrderId, null);

  // Re-opening takes them again.
  assert.equal((await call('PUT', `/api/orders/${id}/status`, { status: 'Confirmed' }, 'U-ADMIN')).status, 200);
  assert.equal(users.get(friend).points, 0);
  assert.equal(referrals.get(FRIEND_REF).welcomeOrderId, id);
});

// ---------- rewards on delivery ----------

test('the referrer earns points once the friend\'s order is delivered, never twice', async () => {
  const friend = await referredFriend();
  const { data } = await placeOrder(friend, 1);
  const id = data.data.id;

  const deliver = () => call('PUT', `/api/orders/${id}/status`, { status: 'Delivered' }, 'U-ADMIN');
  await deliver();
  await deliver();
  assert.equal(users.get('U-RAMESH').points, 50);
  assert.ok(users.get('U-RAMESH').pointsExpireAt > new Date().toISOString());
  assert.equal(referrals.get(FRIEND_REF).status, 'Completed');
});

test('no reward when the friend orders to the referrer\'s own address', async () => {
  await placeOrder('U-RAMESH', 1);
  const friend = await referredFriend();
  const { data } = await placeOrder(friend, 1);
  await call('PUT', `/api/orders/${data.data.id}/status`, { status: 'Delivered' }, 'U-ADMIN');
  assert.equal(referrals.get(FRIEND_REF).status, 'Rejected');
  assert.equal(users.get('U-RAMESH').points, 0);
});

test('the monthly limit stops points but still closes the referral', async () => {
  settingsDoc = { ...rules.REFERRAL_DEFAULTS, monthlyCap: 0 };
  const friend = await referredFriend();
  const { data } = await placeOrder(friend, 1);
  await call('PUT', `/api/orders/${data.data.id}/status`, { status: 'Delivered' }, 'U-ADMIN');
  assert.equal(referrals.get(FRIEND_REF).status, 'Completed');
  assert.equal(users.get('U-RAMESH').points, 0);
});

test('an admin can reverse a reward', async () => {
  const friend = await referredFriend();
  const { data } = await placeOrder(friend, 1);
  await call('PUT', `/api/orders/${data.data.id}/status`, { status: 'Delivered' }, 'U-ADMIN');
  const res = await call('POST', `/api/admin/referrals/${FRIEND_REF}/reverse`, { reason: 'fake account' }, 'U-ADMIN');
  assert.equal(res.status, 200);
  assert.equal(users.get('U-RAMESH').points, 0);
  assert.equal((await call('POST', `/api/admin/referrals/${FRIEND_REF}/reverse`, {}, 'U-ADMIN')).status, 409);
});

test('the generic order edit cannot change status or money', async () => {
  const { data } = await placeOrder('U-RAMESH', 1);
  await call('PUT', `/api/orders/${data.data.id}`, { status: 'Delivered', total: 1, notes: 'call first' }, 'U-ADMIN');
  const order = orders.get(data.data.id);
  assert.deepEqual([order.status, order.total, order.notes], ['Confirmed', 500, 'call first']);
});

// ---------- admin and farmer endpoints ----------

test('assigning points is validated on the server', async () => {
  const assign = (body) => call('POST', '/api/admin/referrals/assign-points', body, 'U-ADMIN');
  for (const points of ['abc', 1.5, 20000, 0]) {
    assert.equal((await assign({ userId: 'U-RAMESH', points })).status, 400, `points=${points}`);
  }
  assert.equal((await assign({ userId: 'U-STAFF', points: 10 })).status, 404, 'staff hold no points');
  assert.equal((await assign({ userId: 'U-RAMESH', points: -5 })).status, 400, 'cannot go below zero');
  assert.equal((await assign({ userId: 'U-RAMESH', points: 25 })).status, 200);
  assert.equal(users.get('U-RAMESH').points, 25);
  assert.equal((await call('POST', '/api/admin/referrals/assign-points', { userId: 'U-RAMESH', points: 5 }, 'U-RAMESH')).status, 403);
});

test('settings are admin-only and validated', async () => {
  assert.equal((await call('PUT', '/api/admin/referrals/settings', { welcomeDiscount: 75 }, 'U-RAMESH')).status, 403);
  assert.equal((await call('PUT', '/api/admin/referrals/settings', { redeemMaxPercent: 99 }, 'U-ADMIN')).status, 400);
  assert.equal((await call('PUT', '/api/admin/referrals/settings', { welcomeDiscount: 75 }, 'U-ADMIN')).status, 200);
  assert.equal(settingsDoc.welcomeDiscount, 75);
});

test('a farmer sees their own code and masked friends, never phone numbers', async () => {
  await referredFriend();
  const { status, data } = await call('GET', '/api/me/referrals', undefined, 'U-RAMESH');
  assert.equal(status, 200);
  assert.equal(data.data.code, 'SAMABCDEF');
  assert.equal(data.data.referrals[0].name, 'Anil R.');
  assert.equal(JSON.stringify(data).includes('9876500002'), false);
  assert.equal((await call('GET', '/api/me/referrals', undefined, 'U-STAFF')).status, 403);
});
