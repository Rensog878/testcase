// Checkout charges each product's own GST rate and refuses products taken off
// the website; an admin can remove a mistaken catalogue option that no product
// uses.
// Run from server/: npm test

import { test, before, after, beforeEach } from 'node:test';
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

console.log = () => {};
console.warn = () => {};
console.error = () => {};

const admin = { id: 'U-ADMIN', name: 'Admin', role: 'admin', status: 'active', password: 'hash' };
const farmer = { id: 'U-FARMER', name: 'Murugan', role: 'farmer', status: 'active', phone: '9876533333', password: 'hash' };
const people = new Map([admin, farmer].map((u) => [u.id, u]));

let products;
let options;
let created;
const kv = new Map();

Object.assign(db, {
  kvGet: async (key) => kv.get(key) ?? null,
  kvSet: async (key, value) => { kv.set(key, value); return value; },
  kvGetMany: async () => new Map(),
  kvClaimSlot: async () => 0,
  kvIncrement: async () => 1,
  getUserById: async (id) => people.get(id) ?? null,
  getProducts: async () => structuredClone(products),
  getProductsByIds: async (ids) => structuredClone(products.filter((p) => ids.includes(p.id))),
  reserveStock: async () => ({ ok: true }),
  releaseStock: async () => {},
  createOrder: async (order) => { created = { id: 'ORD-1', ...order }; return created; },
  saveCart: async () => [],
  getCatalogOptions: async () => structuredClone(options),
  removeCatalogOption: async (kind, value) => {
    if (!options[kind].includes(value)) return null;
    options[kind] = options[kind].filter((v) => v !== value);
    return structuredClone(options);
  },
});

let server;
let base;
const adminToken = signToken(admin.id, admin.password);
const farmerToken = signToken(farmer.id, farmer.password);

before(async () => {
  server = app.listen(0, '127.0.0.1');
  await new Promise((resolve) => server.once('listening', resolve));
  base = `http://127.0.0.1:${server.address().port}`;
});
after(() => { server.closeAllConnections(); server.close(); });

beforeEach(() => {
  kv.clear();
  created = null;
  products = [
    { id: 'P-GEL', name: 'Gold Gel', price: 450, stock: 10, gstRate: 18, packSizes: ['1kg'], crops: ['All Crops'], diseases: ['Blast'], category: 'Bio-Stimulant', online: true, visibility: 'both' },
    { id: 'P-SOIL', name: 'Earth Power', price: 400, stock: 10, gstRate: 5, packSizes: ['1kg'], crops: ['Paddy / Rice'], category: 'Fertilizer', online: true, visibility: 'both' },
    { id: 'P-SHOP', name: 'Counter Only', price: 300, stock: 10, gstRate: 18, packSizes: ['1kg'], crops: [], category: 'Fertilizer', online: false, visibility: 'offline' },
    { id: 'P-OLD', name: 'No Rate', price: 100, stock: 10, packSizes: ['1kg'], crops: [], category: 'Fertilizer', online: true },
  ];
  options = { categories: ['Bio-Stimulant', 'Fertilizer'], crops: ['All Crops', 'Paddy / Rice', 'test'], storageBatches: ['1kg'], diseases: ['Blast', 'blast'], physicalForms: ['Powder'] };
});

async function call(method, path, body, auth) {
  const res = await fetch(`${base}${path}`, {
    method,
    headers: { 'Content-Type': 'application/json', ...(auth && { Authorization: `Bearer ${auth}` }) },
    body: body && JSON.stringify(body),
  });
  return { status: res.status, data: await res.json() };
}

const address = { customerName: 'Murugan', customerPhone: '9876533333', doorNo: '1', street: 'Main Rd', area: 'Kavundampalayam', taluk: 'Coimbatore North', pincode: '641030', district: 'Coimbatore', state: 'Tamil Nadu' };
const order = (items) => call('POST', '/api/orders', { ...address, items }, farmerToken);

test('GST is charged at each product\'s own rate', async () => {
  const { status } = await order([{ id: 'P-GEL', qty: 1, selectedPack: '1kg' }, { id: 'P-SOIL', qty: 2, selectedPack: '1kg' }]);
  assert.equal(status, 200);
  // 450 × 18% = 81, 800 × 5% = 40
  assert.equal(created.subtotal, 1250);
  assert.equal(created.gst, 121);
  assert.equal(created.total, 1371);
});

test('a product with no rate is charged 18%', async () => {
  await order([{ id: 'P-OLD', qty: 3 }]);
  assert.equal(created.gst, 54);
});

test('a product taken off the website cannot be ordered online', async () => {
  const { status } = await order([{ id: 'P-SHOP', qty: 1 }]);
  assert.equal(status, 409);
  assert.equal(created, null);
});

test('an admin removes an option no product uses', async () => {
  const { status, data } = await call('DELETE', '/api/catalog-options', { kind: 'crops', value: 'test' }, adminToken);
  assert.equal(status, 200);
  assert.deepEqual(data.data.crops, ['All Crops', 'Paddy / Rice']);
});

test('an option a product uses cannot be removed', async () => {
  const { status } = await call('DELETE', '/api/catalog-options', { kind: 'crops', value: 'Paddy / Rice' }, adminToken);
  assert.equal(status, 409);
  assert.ok(options.crops.includes('Paddy / Rice'));
});

test('removal matches exactly: "blast" goes, "Blast" (in use) stays', async () => {
  assert.equal((await call('DELETE', '/api/catalog-options', { kind: 'diseases', value: 'blast' }, adminToken)).status, 200);
  assert.equal((await call('DELETE', '/api/catalog-options', { kind: 'diseases', value: 'Blast' }, adminToken)).status, 409);
  assert.deepEqual(options.diseases, ['Blast']);
});

test('only admins remove options, and only from known lists', async () => {
  assert.equal((await call('DELETE', '/api/catalog-options', { kind: 'crops', value: 'test' }, farmerToken)).status, 403);
  assert.equal((await call('DELETE', '/api/catalog-options', { kind: 'users', value: 'x' }, adminToken)).status, 400);
  assert.equal((await call('DELETE', '/api/catalog-options', { kind: 'crops', value: 'Nope' }, adminToken)).status, 404);
});
