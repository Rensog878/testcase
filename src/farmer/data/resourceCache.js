// Last-good-response cache for the farmer dashboard.
//
// - Keeps each response with the time it was fetched, in memory and in
//   localStorage, so a farmer with no signal still sees their last orders.
// - Shares one request between everything asking for the same key at once.
// - Reuses a response younger than maxAgeMs instead of refetching.
//
// Keys carry the user id, and entries for anyone else are removed when the
// dashboard opens and on sign-out, so one person's orders never show for the
// next person on a shared phone. No React here; hooks subscribe to changes.

export const FARMER_CACHE_PREFIX = 'sathya_fd:';
const CACHE_VERSION = 'v1';

export function farmerCacheKey(userId, resource) {
  return `${FARMER_CACHE_PREFIX}${CACHE_VERSION}:${userId || 'anonymous'}:${resource}`;
}

function userIdOfKey(key) {
  if (!key.startsWith(FARMER_CACHE_PREFIX)) return undefined;
  return key.slice(FARMER_CACHE_PREFIX.length).split(':')[1];
}

/** localStorage when it is usable (not blocked, not private-mode-full), else null. */
export function browserStorage() {
  try {
    const storage = globalThis.localStorage;
    if (!storage) return null;
    const probe = `${FARMER_CACHE_PREFIX}probe`;
    storage.setItem(probe, '1');
    storage.removeItem(probe);
    return storage;
  } catch {
    return null;
  }
}

/** Removes cached dashboard data, optionally keeping one user's entries. */
export function clearFarmerCaches(storage = browserStorage(), { keepUserId } = {}) {
  if (!storage) return;
  try {
    const doomed = [];
    for (let index = 0; index < storage.length; index += 1) {
      const key = storage.key(index);
      if (key && key.startsWith(FARMER_CACHE_PREFIX) && (keepUserId === undefined || userIdOfKey(key) !== String(keepUserId))) {
        doomed.push(key);
      }
    }
    doomed.forEach(key => storage.removeItem(key));
  } catch {
    // Storage became unavailable; nothing left to clear.
  }
}

export function createResourceCache({ storage = null, clock = () => Date.now() } = {}) {
  const memory = new Map();
  const inFlight = new Map();
  const errors = new Map();
  const listeners = new Map();

  function notify(key) {
    listeners.get(key)?.forEach(listener => listener());
  }

  function read(key) {
    if (memory.has(key)) return memory.get(key);
    if (!storage) return null;
    try {
      const raw = storage.getItem(key);
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      if (!parsed || typeof parsed.fetchedAt !== 'number' || !('data' in parsed)) return null;
      const entry = { data: parsed.data, fetchedAt: parsed.fetchedAt };
      memory.set(key, entry);
      return entry;
    } catch {
      return null;
    }
  }

  function write(key, entry) {
    memory.set(key, entry);
    if (!storage) return;
    try {
      storage.setItem(key, JSON.stringify(entry));
    } catch {
      // Quota exceeded or storage blocked: the in-memory copy still serves this visit.
    }
  }

  function getState(key) {
    return { entry: read(key), loading: inFlight.has(key), error: errors.get(key) || null };
  }

  function subscribe(key, listener) {
    if (!listeners.has(key)) listeners.set(key, new Set());
    listeners.get(key).add(listener);
    return () => {
      const set = listeners.get(key);
      set?.delete(listener);
      if (set && !set.size) listeners.delete(key);
    };
  }

  /**
   * Resolves to { data, fetchedAt }. Uses the cached entry when it is younger
   * than maxAgeMs (unless force), otherwise runs fetcher once for all callers.
   */
  function load(key, fetcher, { maxAgeMs = 0, force = false } = {}) {
    if (!force) {
      const cached = read(key);
      if (cached && clock() - cached.fetchedAt < maxAgeMs) return Promise.resolve(cached);
    }
    if (inFlight.has(key)) return inFlight.get(key);

    const request = Promise.resolve()
      .then(fetcher)
      .then(data => {
        const entry = { data, fetchedAt: clock() };
        write(key, entry);
        errors.delete(key);
        return entry;
      })
      .catch(error => {
        errors.set(key, error);
        throw error;
      })
      .finally(() => {
        inFlight.delete(key);
        notify(key);
      });

    inFlight.set(key, request);
    notify(key);
    return request;
  }

  function clear({ keepUserId } = {}) {
    for (const key of [...memory.keys()]) {
      if (keepUserId === undefined || userIdOfKey(key) !== String(keepUserId)) {
        memory.delete(key);
        errors.delete(key);
      }
    }
    clearFarmerCaches(storage, { keepUserId });
  }

  return { read, load, getState, subscribe, clear };
}
