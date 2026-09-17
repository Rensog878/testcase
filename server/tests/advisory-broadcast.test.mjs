// WhatsApp crop advisory broadcasts: created as a job, sent in batches,
// never twice to the same farmer, resumable and cancellable.
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

console.log = () => {};
console.warn = () => {};

const admin = { id: 'U-ADMIN', name: 'Admin', role: 'admin', status: 'active', password: 'hash' };
let subscribers;
let broadcasts;
const kv = new Map();

// An in-memory stand-in for the MongoDB methods the routes use.
Object.assign(db, {
  kvGet: async (key) => kv.get(key) ?? null,
  kvSet: async (key, value) => { kv.set(key, value); return value; },
  kvGetMany: async (keys) => new Map(keys.filter((k) => kv.has(k)).map((k) => [k, kv.get(k)])),
  kvClaimSlot: async () => 0,
  kvIncrement: async () => 1,
  getUserById: async (id) => (id === admin.id ? admin : null),
  getAdvisorySubscribers: async () => structuredClone(subscribers),
  updateAdvisorySubscriber: async (id, patch) => {
    const sub = subscribers.find((s) => s.id === id);
    return sub ? structuredClone(Object.assign(sub, patch)) : null;
  },
  setAdvisoryStatusByPhone: async (phone, status) => subscribers.filter((s) => s.phone === phone).forEach((s) => { s.status = status; }),
  createAdvisoryBroadcast: async (b) => { broadcasts.set(b.id, structuredClone(b)); return structuredClone(b); },
  getAdvisoryBroadcast: async (id) => structuredClone(broadcasts.get(id) || null),
  getAdvisoryBroadcasts: async () => [...broadcasts.values()].map(({ recipients, ...rest }) => rest),
  claimBroadcastRecipient: async (id) => {
    const b = broadcasts.get(id);
    const r = b?.status === 'sending' && b.recipients.find((x) => x.status === 'queued');
    if (!r) return null;
    Object.assign(r, { status: 'sending', claimedAt: new Date().toISOString() });
    return structuredClone(r);
  },
  setBroadcastRecipient: async (id, phone, fields) => Object.assign(broadcasts.get(id).recipients.find((r) => r.phone === phone), fields),
  failStaleBroadcastRecipients: async (id, olderThan) => broadcasts.get(id)?.recipients
    .filter((r) => r.status === 'sending' && r.claimedAt < olderThan)
    .forEach((r) => Object.assign(r, { status: 'failed', error: 'Delivery not confirmed (interrupted)' })),
  cancelAdvisoryBroadcast: async (id) => {
    const b = broadcasts.get(id);
    if (b?.status !== 'sending') return;
    b.status = 'cancelled';
    b.recipients.filter((r) => r.status === 'queued').forEach((r) => { r.status = 'cancelled'; });
  },
  updateAdvisoryBroadcast: async (id, patch) => Object.assign(broadcasts.get(id), patch),
});

let sent;
let reply;
const realFetch = globalThis.fetch;
globalThis.fetch = async (url, init) => {
  if (!String(url).startsWith('https://wasender.test/')) return realFetch(url, init);
  const body = JSON.parse(init.body);
  sent.push(body);
  const [status, json] = reply(body);
  return new Response(JSON.stringify(json), { status });
};

let server;
let base;
const token = signToken(admin.id, admin.password);

before(async () => {
  server = app.listen(0, '127.0.0.1');
  await new Promise((resolve) => server.once('listening', resolve));
  base = `http://127.0.0.1:${server.address().port}`;
});
after(() => { server.closeAllConnections(); server.close(); });

beforeEach(() => {
  kv.clear();
  sent = [];
  reply = () => [200, { success: true }];
  broadcasts = new Map();
  subscribers = [
    { id: 'adv-1', name: 'Murugan', phone: '9876500001', crop: 'Paddy / Rice Farmer', season: 'Kharif', acreage: 3, subscribedAt: '2026-09-01' },
    { id: 'adv-2', name: 'Farmer Partner', phone: '9876500002', crop: 'Paddy/Rice', season: 'Kharif', acreage: 1, subscribedAt: '2026-09-02' },
    { id: 'adv-3', name: 'Lakshmi', phone: '9876500003', crop: 'Cotton Farmer', season: 'Kharif', acreage: 5, subscribedAt: '2026-09-03' },
    { id: 'adv-4', name: 'Old sign-up', phone: '9876500001', crop: 'Paddy', season: 'Kharif', subscribedAt: '2026-08-01' },
  ];
});

async function call(method, path, body, auth = token) {
  const res = await realFetch(`${base}${path}`, {
    method,
    headers: { 'Content-Type': 'application/json', ...(auth && { Authorization: `Bearer ${auth}` }) },
    body: body && JSON.stringify(body),
  });
  return { status: res.status, data: await res.json() };
}

async function runToEnd(id) {
  let last;
  for (let i = 0; i < 20; i++) {
    last = await call('POST', `/api/advisory/broadcasts/${id}/process`);
    if (last.data.data.status !== 'sending' || last.data.paused) break;
  }
  return last;
}

test('broadcast routes are admin only', async () => {
  assert.equal((await call('POST', '/api/advisory/broadcasts', {}, '')).status, 401);
  assert.equal((await call('GET', '/api/advisory/broadcasts', null, '')).status, 401);
});

test('a paddy advisory reaches each paddy farmer once, personalised, and not the cotton farmer', async () => {
  const created = await call('POST', '/api/advisory/broadcasts', {
    title: 'Blast alert', message: 'Hello {name}, check your {crop} for blast.', crops: ['paddy'],
  });
  assert.equal(created.status, 200);
  assert.equal(created.data.data.counts.total, 2);
  assert.equal(created.data.data.recipients, undefined);

  const done = await runToEnd(created.data.data.id);
  assert.equal(done.data.data.status, 'completed');
  assert.equal(done.data.data.counts.sent, 2);

  assert.deepEqual(sent.map((m) => m.to).sort(), ['919876500001', '919876500002']);
  const murugan = sent.find((m) => m.to === '919876500001').text;
  assert.match(murugan, /^Hello Murugan, check your Paddy \/ Rice for blast\./);
  assert.match(murugan, /Reply STOP/);
  assert.match(sent.find((m) => m.to === '919876500002').text, /^Hello Farmer,/);

  assert.equal(subscribers.find((s) => s.id === 'adv-1').lastAdvisorySent, 'Blast alert');

  // Processing a finished broadcast again sends nothing more.
  await call('POST', `/api/advisory/broadcasts/${created.data.data.id}/process`);
  assert.equal(sent.length, 2);
});

test('unsubscribed farmers are left out, on every sign-up with that number', async () => {
  const off = await call('PATCH', '/api/advisory/subscribers/adv-4', { status: 'Unsubscribed' });
  assert.equal(off.status, 200);
  assert.equal(subscribers.find((s) => s.id === 'adv-1').status, 'Unsubscribed');

  const created = await call('POST', '/api/advisory/broadcasts', { message: 'Paddy tip of the week', crops: ['paddy'] });
  assert.equal(created.data.data.counts.total, 1);
  await runToEnd(created.data.data.id);
  assert.deepEqual(sent.map((m) => m.to), ['919876500002']);
});

test('bad requests are refused with a clear message', async () => {
  assert.equal((await call('POST', '/api/advisory/broadcasts', { message: 'Hello farmers!', crops: [] })).status, 400);
  const none = await call('POST', '/api/advisory/broadcasts', { message: 'Sugarcane advisory', crops: ['sugarcane'] });
  assert.equal(none.status, 400);
  assert.match(none.data.message, /No active subscribers/);
  assert.equal((await call('PATCH', '/api/advisory/subscribers/adv-1', { status: 'Deleted' })).status, 400);
});

test('a farmer who is not on WhatsApp is skipped, a refused message is failed, the rest still go', async () => {
  reply = (body) => (body.to === '919876500001' ? [422, { success: false, message: 'Invalid number' }] : [200, { success: true }]);
  const created = await call('POST', '/api/advisory/broadcasts', { message: 'Kharif advisory text', crops: ['paddy', 'cotton'] });
  const done = await runToEnd(created.data.data.id);
  assert.equal(done.data.data.status, 'completed');
  assert.deepEqual({ sent: done.data.data.counts.sent, failed: done.data.data.counts.failed }, { sent: 2, failed: 1 });
});

test('when every number is rate limited the farmer stays queued and the batch pauses', async () => {
  reply = () => [429, { success: false, message: 'Too many', retry_after: 60 }];
  const created = await call('POST', '/api/advisory/broadcasts', { message: 'Cotton advisory text', crops: ['cotton'] });
  const res = await call('POST', `/api/advisory/broadcasts/${created.data.data.id}/process`);
  assert.equal(res.data.data.status, 'sending');
  assert.ok(res.data.paused);
  assert.equal(res.data.data.counts.queued, 1);
});

test('a cancelled broadcast sends nothing further', async () => {
  const created = await call('POST', '/api/advisory/broadcasts', { message: 'Paddy advisory text', crops: ['paddy', 'cotton'] });
  const cancelled = await call('POST', `/api/advisory/broadcasts/${created.data.data.id}/cancel`);
  assert.equal(cancelled.data.data.status, 'cancelled');
  assert.equal(cancelled.data.data.counts.cancelled, 3);
  await call('POST', `/api/advisory/broadcasts/${created.data.data.id}/process`);
  assert.equal(sent.length, 0);
});

test('a STOP reply over the webhook unsubscribes every sign-up with that number, once, and START restores it', async () => {
  process.env.WASENDER_WEBHOOK_SECRET = 'hook-a, hook-b';
  const hook = (body, signature = 'hook-b') => realFetch(`${base}/api/whatsapp/webhook`, {
    method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Webhook-Signature': signature }, body: JSON.stringify(body),
  }).then(async (r) => ({ status: r.status, data: await r.json() }));
  const msg = (id, text, from = '919876500001') => ({ event: 'messages.received', data: { messages: { key: { id, fromMe: false, cleanedSenderPn: from }, messageBody: text } } });

  assert.equal((await hook(msg('1', 'STOP'), 'wrong')).status, 401);
  assert.equal(subscribers[0].status, undefined);

  const stop = await hook(msg('1', 'STOP'));
  assert.equal(stop.data.handled, true);
  assert.deepEqual(subscribers.filter((s) => s.phone === '9876500001').map((s) => s.status), ['Unsubscribed', 'Unsubscribed']);
  await new Promise((r) => setTimeout(r, 50));
  assert.equal(sent.length, 1);
  assert.match(sent[0].text, /unsubscribed/);

  assert.equal((await hook(msg('1', 'STOP'))).data.duplicate, true);
  assert.equal((await hook(msg('2', 'hello'))).data.handled, false);
  assert.equal((await hook(msg('3', 'START', '919999999999'))).data.handled, false);

  assert.equal((await hook(msg('4', 'START'))).data.handled, true);
  assert.equal(subscribers[0].status, 'Active');
  delete process.env.WASENDER_WEBHOOK_SECRET;
});
