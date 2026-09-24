// Order fulfilment: an admin assigns a real delivery agent, cancelling returns
// the stock exactly once, re-opening takes it again, and staff hear about new
// orders when ORDER_ALERT_PHONES is set.
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
const { sendStaffOrderAlert } = await import('../orderNotifications.js');
const { buildStaffOrderAlert } = await import('../orderMessages.js');

console.log = () => {};
console.warn = () => {};
console.error = () => {};

const admin = { id: 'U-ADMIN', name: 'Admin', role: 'admin', status: 'active', password: 'hash' };
const agent = { id: 'U-RAVI', name: 'Ravi', role: 'delivery', status: 'active', phone: '9876511111', password: 'hash' };
const retired = { id: 'U-OLD', name: 'Old Agent', role: 'delivery', status: 'inactive', phone: '9876522222', password: 'hash' };
const farmer = { id: 'U-FARMER', name: 'Murugan', role: 'farmer', status: 'active', phone: '9876533333', password: 'hash' };
const people = new Map([admin, agent, retired, farmer].map((u) => [u.id, u]));

let orders;
let stock;
let notifications;
const kv = new Map();

const isCancelled = (o) => o.deliveryStatus === 'Cancelled' || o.status === 'Cancelled';

Object.assign(db, {
  kvGet: async (key) => kv.get(key) ?? null,
  kvSet: async (key, value) => { kv.set(key, value); return value; },
  kvGetMany: async (keys) => new Map(keys.filter((k) => kv.has(k)).map((k) => [k, kv.get(k)])),
  kvClaimSlot: async () => 0,
  kvIncrement: async () => 1,
  getUserById: async (id) => people.get(id) ?? null,
  getOrderById: async (id) => structuredClone(orders.get(id) ?? null),
  updateOrder: async (id, updates) => {
    const order = orders.get(id);
    return order ? structuredClone(Object.assign(order, updates)) : null;
  },
  // Only the two conditions the status route uses.
  updateOrderIf: async (id, condition, updates) => {
    const order = orders.get(id);
    if (!order) return null;
    const matches = condition.$or ? isCancelled(order) : !isCancelled(order);
    return matches ? structuredClone(Object.assign(order, updates)) : null;
  },
  reserveStock: async (lines) => {
    if (lines.some((l) => (stock.get(l.id) ?? 0) < l.qty)) return { ok: false };
    lines.forEach((l) => stock.set(l.id, stock.get(l.id) - l.qty));
    return { ok: true };
  },
  releaseStock: async (lines) => { lines.forEach((l) => stock.set(l.id, (stock.get(l.id) ?? 0) + l.qty)); },
  claimOrderNotification: async (id, kind) => {
    if (notifications.has(`${id}:${kind}`)) return false;
    notifications.add(`${id}:${kind}`);
    return true;
  },
  recordOrderNotification: async () => {},
  getCMS: async () => ({}),
});

let sent;
const realFetch = globalThis.fetch;
globalThis.fetch = async (url, init) => {
  if (!String(url).startsWith('https://wasender.test/')) return realFetch(url, init);
  sent.push(JSON.parse(init.body));
  return new Response(JSON.stringify({ success: true }), { status: 200 });
};

let server;
let base;
const token = signToken(admin.id, admin.password);
const agentToken = signToken(agent.id, agent.password);

before(async () => {
  server = app.listen(0, '127.0.0.1');
  await new Promise((resolve) => server.once('listening', resolve));
  base = `http://127.0.0.1:${server.address().port}`;
});
after(() => { server.closeAllConnections(); server.close(); });

beforeEach(() => {
  kv.clear();
  sent = [];
  notifications = new Set();
  delete process.env.ORDER_ALERT_PHONES;
  stock = new Map([['P-GEL', 10], ['P-CARBON', 5]]);
  orders = new Map([['ORD-1', {
    id: 'ORD-1', customerName: 'Murugan', customerPhone: '9876533333', status: 'Confirmed', deliveryStatus: 'Confirmed',
    assignedDeliveryBoy: 'Unassigned', deliveryBoyPhone: '', total: 1180, paymentMethod: 'Cash on Delivery',
    items: [{ id: 'P-GEL', name: 'Gold Gel', packSize: '1kg', qty: 2 }, { id: 'P-GEL', name: 'Gold Gel', packSize: '5kg', qty: 1 }, { id: 'P-CARBON', name: 'Black Carbon', qty: 1 }],
  }]]);
});

async function call(method, path, body, auth = token) {
  const res = await realFetch(`${base}${path}`, {
    method,
    headers: { 'Content-Type': 'application/json', ...(auth && { Authorization: `Bearer ${auth}` }) },
    body: body && JSON.stringify(body),
  });
  return { status: res.status, data: await res.json() };
}

test('an admin assigns a delivery agent; name and phone come from the account', async () => {
  const { status, data } = await call('PUT', '/api/orders/ORD-1/assign', { deliveryUserId: agent.id, assignedDeliveryBoy: 'Someone Else' });
  assert.equal(status, 200);
  assert.equal(data.data.assignedDeliveryBoy, 'Ravi');
  assert.equal(data.data.deliveryBoyPhone, '9876511111');
  assert.equal(orders.get('ORD-1').assignedDeliveryUserId, agent.id);
});

test('only active delivery accounts can be assigned', async () => {
  for (const id of [retired.id, farmer.id, 'U-NOBODY']) {
    const { status } = await call('PUT', '/api/orders/ORD-1/assign', { deliveryUserId: id });
    assert.equal(status, 400, id);
  }
  assert.equal(orders.get('ORD-1').assignedDeliveryBoy, 'Unassigned');
});

test('an empty agent un-assigns the order', async () => {
  await call('PUT', '/api/orders/ORD-1/assign', { deliveryUserId: agent.id });
  const { data } = await call('PUT', '/api/orders/ORD-1/assign', { deliveryUserId: '' });
  assert.equal(data.data.assignedDeliveryBoy, 'Unassigned');
  assert.equal(data.data.deliveryBoyPhone, '');
});

test('delivery staff cannot assign orders', async () => {
  const { status } = await call('PUT', '/api/orders/ORD-1/assign', { deliveryUserId: agent.id }, agentToken);
  assert.equal(status, 403);
});

test('cancelling returns the stock once, however often it is sent', async () => {
  const first = await call('PUT', '/api/orders/ORD-1/status', { status: 'Cancelled' });
  assert.equal(first.status, 200);
  assert.equal(stock.get('P-GEL'), 13);
  assert.equal(stock.get('P-CARBON'), 6);

  const again = await call('PUT', '/api/orders/ORD-1/status', { status: 'Cancelled' });
  assert.equal(again.status, 200);
  assert.equal(stock.get('P-GEL'), 13, 'no second return');
});

test('re-opening a cancelled order takes the stock again', async () => {
  await call('PUT', '/api/orders/ORD-1/status', { status: 'Cancelled' });
  const { status } = await call('PUT', '/api/orders/ORD-1/status', { status: 'Confirmed' });
  assert.equal(status, 200);
  assert.equal(stock.get('P-GEL'), 10);
  assert.equal(orders.get('ORD-1').deliveryStatus, 'Confirmed');
});

test('a cancelled order cannot be re-opened without the stock', async () => {
  await call('PUT', '/api/orders/ORD-1/status', { status: 'Cancelled' });
  stock.set('P-CARBON', 0);
  const { status } = await call('PUT', '/api/orders/ORD-1/status', { status: 'Confirmed' });
  assert.equal(status, 409);
  assert.equal(orders.get('ORD-1').deliveryStatus, 'Cancelled');
  assert.equal(stock.get('P-GEL'), 13, 'nothing taken');
});

test('a paid order that ran short of stock returns nothing when cancelled', async () => {
  orders.get('ORD-1').stockShortfall = true;
  await call('PUT', '/api/orders/ORD-1/status', { status: 'Cancelled' });
  assert.equal(stock.get('P-GEL'), 10);
});

test('other status changes leave stock alone', async () => {
  await call('PUT', '/api/orders/ORD-1/status', { status: 'Dispatched' });
  assert.equal(stock.get('P-GEL'), 10);
});

test('staff alerts are off unless ORDER_ALERT_PHONES is set', async () => {
  assert.equal(await sendStaffOrderAlert(orders.get('ORD-1')), 'disabled');
  assert.equal(sent.length, 0);
});

test('staff get one alert per order, on every listed number', async () => {
  process.env.ORDER_ALERT_PHONES = '98765 44444, +91 9876555555, 12345, 9876544444';
  assert.equal(await sendStaffOrderAlert(orders.get('ORD-1')), 'sent');
  assert.deepEqual(sent.map((m) => m.to.replace(/\D/g, '').slice(-10)).sort(), ['9876544444', '9876555555']);
  assert.match(sent[0].text, /ORD-1/);
  assert.equal(await sendStaffOrderAlert(orders.get('ORD-1')), 'skipped');
  assert.equal(sent.length, 2);
});

test('the staff alert lists the items and where to assign', () => {
  const text = buildStaffOrderAlert(orders.get('ORD-1'), { adminUrl: 'https://shop.example.com/admin/orders' });
  assert.match(text, /Gold Gel \(1kg\) × 2/);
  assert.match(text, /₹1,180/);
  assert.match(text, /shop\.example\.com\/admin\/orders/);
});
