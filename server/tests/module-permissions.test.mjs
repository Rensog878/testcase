// The modules a super admin enables for a staff account are enforced by the
// API, not only by the menus: a restricted admin gets 403 outside them.
// Accounts with no list, an empty list or '*' keep full access.
// Run from server/: npm test

import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';

Object.assign(process.env, {
  NODE_ENV: 'test',
  MONGODB_URI: '',
  OTP_HASH_SECRET: 'test-secret',
  AUTH_TOKEN_SECRET: 'test-secret',
  ORDER_WHATSAPP_MESSAGES: 'off',
});

const { db } = await import('../db.js');
const { default: app } = await import('../server.js');
const { signToken } = await import('../security.js');
const { hasModule } = await import('../http.js');

console.log = () => {};
console.warn = () => {};
console.error = () => {};

const people = [
  { id: 'U-FULL', role: 'admin', status: 'active', password: 'h' },
  { id: 'U-STAR', role: 'admin', status: 'active', password: 'h', permissions: ['*'] },
  { id: 'U-ORDERS', role: 'admin', status: 'active', password: 'h', permissions: ['orders'] },
  { id: 'U-CMS', role: 'admin', status: 'active', password: 'h', permissions: ['cms', 'overview'] },
  { id: 'U-POS', role: 'billing', status: 'active', password: 'h', permissions: ['pos'] },
  { id: 'U-VAN', name: 'Ravi', role: 'delivery', status: 'active', password: 'h', permissions: ['history'] },
];
const byId = new Map(people.map((u) => [u.id, u]));
const token = (id) => signToken(id, 'h');

Object.assign(db, {
  kvGet: async () => null,
  kvSet: async (k, v) => v,
  kvGetMany: async () => new Map(),
  kvClaimSlot: async () => 0,
  kvIncrement: async () => 1,
  getUserById: async (id) => byId.get(id) ?? null,
  getOrders: async () => [{ id: 'ORD-1', assignedDeliveryBoy: 'Ravi', deliveryStatus: 'Confirmed', items: [] }],
  getOrderById: async (id) => ({ id, assignedDeliveryBoy: 'Ravi', deliveryStatus: 'Confirmed', items: [] }),
  updateOrder: async (id, u) => ({ id, ...u }),
  getCMS: async () => ({}),
  updateCMS: async (u) => u,
  getInvoices: async () => [],
  getNextInvoiceNumber: async () => 'SAM-0001',
  getStoreById: async () => null,
  getBillingInvoices: async () => [],
  getAdminStats: async () => ({}),
  getUsers: async () => [],
});

let server;
let base;
before(async () => {
  server = app.listen(0, '127.0.0.1');
  await new Promise((resolve) => server.once('listening', resolve));
  base = `http://127.0.0.1:${server.address().port}`;
});
after(() => { server.closeAllConnections(); server.close(); });

async function status(id, method, path, body) {
  const res = await fetch(`${base}${path}`, {
    method,
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token(id)}` },
    body: body && JSON.stringify(body),
  });
  return res.status;
}

test('no list, an empty list or * means every module; super admins always pass', () => {
  assert.ok(hasModule({ role: 'admin' }, 'cms'));
  assert.ok(hasModule({ role: 'admin', permissions: [] }, 'cms'));
  assert.ok(hasModule({ role: 'admin', permissions: ['*'] }, 'cms'));
  assert.ok(hasModule({ role: 'superadmin', permissions: ['orders'] }, 'cms'));
  assert.ok(!hasModule({ role: 'admin', permissions: ['orders'] }, 'cms'));
  assert.ok(hasModule({ role: 'admin', permissions: ['orders'] }, 'cms', 'orders'));
});

test('a restricted admin is refused outside their modules', async () => {
  assert.equal(await status('U-ORDERS', 'PUT', '/api/cms', { heroTitle: 'x' }), 403);
  assert.equal(await status('U-ORDERS', 'GET', '/api/admin/stats'), 403);
  assert.equal(await status('U-ORDERS', 'DELETE', '/api/products/P-1'), 403);
  assert.equal(await status('U-ORDERS', 'POST', '/api/admin/users', { phone: '9876500000' }), 403);
  assert.equal(await status('U-CMS', 'GET', '/api/orders'), 403);
  assert.equal(await status('U-CMS', 'PUT', '/api/orders/ORD-1/status', { status: 'Dispatched' }), 403);
});

test('a restricted admin keeps the modules they were given', async () => {
  assert.equal(await status('U-ORDERS', 'GET', '/api/orders'), 200);
  assert.equal(await status('U-ORDERS', 'PUT', '/api/orders/ORD-1/status', { status: 'Dispatched' }), 200);
  assert.equal(await status('U-CMS', 'PUT', '/api/cms', { heroTitle: 'x' }), 200);
  assert.equal(await status('U-CMS', 'GET', '/api/admin/stats'), 200);
});

test('the delivery-staff list is open to the Orders module too', async () => {
  assert.equal(await status('U-ORDERS', 'GET', '/api/admin/users?role=delivery'), 200);
  assert.equal(await status('U-CMS', 'GET', '/api/admin/users?role=delivery'), 403);
});

test('full-access admins are unaffected', async () => {
  for (const id of ['U-FULL', 'U-STAR']) {
    assert.equal(await status(id, 'PUT', '/api/cms', { heroTitle: 'x' }), 200, id);
    assert.equal(await status(id, 'GET', '/api/orders'), 200, id);
    assert.equal(await status(id, 'GET', '/api/admin/stats'), 200, id);
  }
});

test('billing modules bind billing staff only', async () => {
  assert.equal(await status('U-POS', 'GET', '/api/billing/invoices'), 200, 'pos may list invoices');
  assert.equal(await status('U-POS', 'GET', '/api/billing/next-invoice-no'), 200);
  assert.equal(await status('U-VAN', 'GET', '/api/billing/invoices'), 403, 'role check still applies');
});

test('delivery staff are not held to admin modules', async () => {
  assert.equal(await status('U-VAN', 'PUT', '/api/orders/ORD-1/status', { status: 'Dispatched' }), 200);
});
