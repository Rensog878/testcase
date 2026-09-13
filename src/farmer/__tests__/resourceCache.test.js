import { test } from 'node:test';
import assert from 'node:assert/strict';

import { clearFarmerCaches, createResourceCache, farmerCacheKey } from '../data/resourceCache.js';

function memoryStorage(initial = {}) {
  const map = new Map(Object.entries(initial));
  return {
    get length() { return map.size; },
    key: index => [...map.keys()][index] ?? null,
    getItem: key => (map.has(key) ? map.get(key) : null),
    setItem: (key, value) => map.set(key, String(value)),
    removeItem: key => map.delete(key),
    keys: () => [...map.keys()],
  };
}

function manualClock(start = 1_000_000) {
  let now = start;
  return { clock: () => now, advance: ms => { now += ms; } };
}

const KEY = farmerCacheKey('USR-1', 'orders');

test('keys include the user id and resource', () => {
  assert.equal(KEY, 'sathya_fd:v1:USR-1:orders');
});

test('concurrent loads share one request', async () => {
  const cache = createResourceCache({ storage: memoryStorage() });
  let calls = 0;
  const fetcher = () => { calls += 1; return new Promise(resolve => setTimeout(() => resolve(['order']), 5)); };
  const [a, b] = await Promise.all([cache.load(KEY, fetcher), cache.load(KEY, fetcher)]);
  assert.equal(calls, 1);
  assert.deepEqual(a, b);
  assert.deepEqual(a.data, ['order']);
});

test('fresh entries are reused; old ones and forced loads refetch', async () => {
  const { clock, advance } = manualClock();
  const cache = createResourceCache({ storage: memoryStorage(), clock });
  let calls = 0;
  const fetcher = async () => { calls += 1; return calls; };

  await cache.load(KEY, fetcher, { maxAgeMs: 1000 });
  advance(500);
  assert.equal((await cache.load(KEY, fetcher, { maxAgeMs: 1000 })).data, 1);
  assert.equal(calls, 1);

  advance(600);
  assert.equal((await cache.load(KEY, fetcher, { maxAgeMs: 1000 })).data, 2);
  assert.equal((await cache.load(KEY, fetcher, { maxAgeMs: 1000, force: true })).data, 3);
});

test('entries persist across page loads with their fetch time', async () => {
  const storage = memoryStorage();
  const { clock } = manualClock(42_000);
  await createResourceCache({ storage, clock }).load(KEY, async () => ({ ok: true }));
  assert.deepEqual(createResourceCache({ storage }).read(KEY), { data: { ok: true }, fetchedAt: 42_000 });
});

test('corrupt stored entries are ignored', () => {
  const storage = memoryStorage({ [KEY]: '{not json' });
  assert.equal(createResourceCache({ storage }).read(KEY), null);
  storage.setItem(KEY, JSON.stringify({ data: 1 }));
  assert.equal(createResourceCache({ storage }).read(KEY), null);
});

test('a failed refresh keeps the last good data and records the error', async () => {
  const cache = createResourceCache({ storage: memoryStorage() });
  await cache.load(KEY, async () => ['old']);
  await assert.rejects(cache.load(KEY, async () => { throw new Error('offline'); }, { force: true }), /offline/);
  const state = cache.getState(KEY);
  assert.deepEqual(state.entry.data, ['old']);
  assert.equal(state.error.message, 'offline');
  assert.equal(state.loading, false);

  await cache.load(KEY, async () => ['new'], { force: true });
  assert.equal(cache.getState(KEY).error, null);
});

test('storage that refuses writes still serves from memory', async () => {
  const storage = memoryStorage();
  storage.setItem = () => { throw new Error('QuotaExceededError'); };
  const cache = createResourceCache({ storage });
  await cache.load(KEY, async () => 'value');
  assert.equal(cache.read(KEY).data, 'value');
});

test('subscribers hear when a request starts and when it settles', async () => {
  const cache = createResourceCache();
  const seen = [];
  const unsubscribe = cache.subscribe(KEY, () => seen.push(cache.getState(KEY).loading));
  await cache.load(KEY, async () => 1);
  unsubscribe();
  await cache.load(KEY, async () => 2, { force: true });
  assert.deepEqual(seen, [true, false]);
});

test('clearing keeps the current user and unrelated keys', async () => {
  const storage = memoryStorage({
    sathya_token: 'token',
    [farmerCacheKey('USR-2', 'orders')]: JSON.stringify({ data: 'theirs', fetchedAt: 1 }),
  });
  const cache = createResourceCache({ storage });
  await cache.load(KEY, async () => 'mine');
  cache.read(farmerCacheKey('USR-2', 'orders'));

  cache.clear({ keepUserId: 'USR-1' });
  assert.deepEqual(storage.keys().sort(), [KEY, 'sathya_token'].sort());
  assert.equal(cache.read(farmerCacheKey('USR-2', 'orders')), null);

  clearFarmerCaches(storage);
  assert.deepEqual(storage.keys(), ['sathya_token']);
});
