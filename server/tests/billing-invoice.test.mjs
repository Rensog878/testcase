// Counter invoices are checked and computed by the API: quantities, rates,
// discounts, a catalogue product's GST rate, GST on the discounted value, the
// date, the store and the seller's details never come from the request.
// Staff profiles take text of a sensible size only.
// Run from server/: npm test

import { test, before, after, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

Object.assign(process.env, {
  NODE_ENV: 'test',
  MONGODB_URI: '',
  OTP_HASH_SECRET: 'test-secret',
  AUTH_TOKEN_SECRET: 'test-secret',
});

const { db } = await import('../db.js');
const { default: app } = await import('../server.js');
const { signToken } = await import('../security.js');

console.log = () => {};
console.warn = () => {};
console.error = () => {};

const cashier = { id: 'U-BILL', name: 'Counter 1', role: 'billing', status: 'active', password: 'h', storeId: 'ST-1', storeCode: 'MDU', storeName: 'Madurai' };
const products = [{ id: 'P-FERT', name: 'Earth Power', gstRate: 5, hsnCode: '3101', price: 400 }];
let saved;

Object.assign(db, {
  kvGet: async () => null,
  kvSet: async (k, v) => v,
  kvGetMany: async () => new Map(),
  kvClaimSlot: async () => 0,
  kvIncrement: async () => 1,
  getUserById: async (id) => (id === cashier.id ? cashier : null),
  getProductsByIds: async (ids) => products.filter((p) => ids.includes(p.id)),
  getNextInvoiceNumber: async (code) => `SAM ${code} 1`,
  getStoreById: async () => null,
  reserveStock: async () => ({ ok: true }),
  createInvoice: async (inv) => { saved = inv; return inv; },
});

let server;
let base;
before(async () => {
  server = app.listen(0, '127.0.0.1');
  await new Promise((resolve) => server.once('listening', resolve));
  base = `http://127.0.0.1:${server.address().port}`;
});
after(() => { server.closeAllConnections(); server.close(); });
beforeEach(() => { saved = null; });

async function bill(body) {
  const res = await fetch(`${base}/api/billing/invoice`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${signToken(cashier.id, 'h')}` },
    body: JSON.stringify(body),
  });
  return { status: res.status, data: await res.json() };
}

const line = (over = {}) => ({ name: 'Hand item', qty: 1, price: 100, gstRate: 18, ...over });

test('bad quantities, rates and discounts are refused', async () => {
  for (const bad of [{ qty: 0 }, { qty: 1.5 }, { price: 0 }, { price: -5 }, { discPercent: 101 }, { discPercent: -1 }, { gstRate: 7 }]) {
    const { status } = await bill({ items: [line(bad)] });
    assert.equal(status, 400, JSON.stringify(bad));
  }
  assert.equal((await bill({ items: [] })).status, 400);
  assert.equal(saved, null);
});

test('a bill discount larger than the bill is refused', async () => {
  assert.equal((await bill({ items: [line()], discountAmount: 150 })).status, 400);
  assert.equal((await bill({ items: [line()], discountAmount: -10 })).status, 400);
});

test('a catalogue product uses its own GST rate and HSN, whatever the request says', async () => {
  const { status } = await bill({ items: [{ productId: 'P-FERT', name: 'Renamed', qty: 2, price: 400, gstRate: 28, hsnCode: '9999' }] });
  assert.equal(status, 200);
  const [item] = saved.items;
  assert.equal(item.gstRate, 5);
  assert.equal(item.hsnCode, '3101');
  assert.equal(item.name, 'Earth Power');
  assert.equal(saved.totalGst, 40); // 800 × 5%
  assert.equal(saved.grandTotal, 840);
});

test('an unknown catalogue product is refused', async () => {
  assert.equal((await bill({ items: [{ productId: 'P-GONE', qty: 1, price: 10 }] })).status, 400);
});

test('GST is charged on the discounted value, as the counter preview shows', async () => {
  // 1000 at 18%, ₹100 bill discount: taxable 900, GST 162, total 1062.
  const { status } = await bill({ items: [line({ price: 1000 })], discountAmount: 100 });
  assert.equal(status, 200);
  assert.equal(saved.taxableAmount, 900);
  assert.equal(saved.totalGst, 162);
  assert.equal(saved.grandTotal, 1062);
});

test('the request cannot set the round-off, date in the future, store or seller details', async () => {
  const future = new Date(Date.now() + 5 * 24 * 3600e3).toISOString();
  assert.equal((await bill({ items: [line()], date: future })).status, 400);

  const { status } = await bill({
    items: [line()], roundOff: -118, grandTotal: 1,
    storeId: 'ST-OTHER', storeCode: 'XXX', storeName: 'Other',
    sellerDetails: { gstin: 'FAKE' }, bankDetails: { acNo: '000' },
  });
  assert.equal(status, 200);
  assert.equal(saved.grandTotal, 118);
  assert.equal(saved.storeId, 'ST-1');
  assert.equal(saved.invoiceNo, 'SAM MDU 1');
  assert.equal(saved.sellerDetails.gstin, '33AFBFS8329C1Z6');
  assert.notEqual(saved.bankDetails.acNo, '000');
});

test('a bill entered late may carry an earlier date', async () => {
  const yesterday = new Date(Date.now() - 24 * 3600e3).toISOString();
  assert.equal((await bill({ items: [line()], date: yesterday })).status, 200);
  assert.equal(saved.date, yesterday);
});

test('staff profile fields must be text of a sensible size, the photo an image', async () => {
  const check = (data) => db.upsertStaffProfile('U-BILL', data).then(() => 'saved', (err) => err.code);
  assert.equal(await check({ bio: { $gt: '' } }), 'INVALID_STAFF_PROFILE');
  assert.equal(await check({ profilePhoto: 'javascript:alert(1)' }), 'INVALID_STAFF_PROFILE');
  assert.equal(await check({ profilePhoto: 'data:image/png;base64,' + 'A'.repeat(2_000_001) }), 'INVALID_STAFF_PROFILE');
});
