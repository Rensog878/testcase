// Loading / empty / error / stale decisions for dashboard data, kept out of
// components so every card behaves the same way.

const MINUTE_MS = 60 * 1000;
const HOUR_MS = 60 * MINUTE_MS;
const DAY_MS = 24 * HOUR_MS;

/** { unit: 'now'|'minutes'|'hours'|'days', count } or null when there is no timestamp. */
export function describeAge(fetchedAt, now) {
  if (typeof fetchedAt !== 'number' || !Number.isFinite(fetchedAt)) return null;
  const age = Math.max(0, now - fetchedAt);
  if (age < MINUTE_MS) return { unit: 'now', count: 0 };
  if (age < HOUR_MS) return { unit: 'minutes', count: Math.floor(age / MINUTE_MS) };
  if (age < DAY_MS) return { unit: 'hours', count: Math.floor(age / HOUR_MS) };
  return { unit: 'days', count: Math.floor(age / DAY_MS) };
}

/**
 * state:  'loading' no data yet and a request is (or is about to be) running
 *         'error'   no data and the last request failed
 *         'empty'   data arrived and holds nothing to show
 *         'ready'   data to show
 * stale:  data is shown but may be out of date
 * reason: 'offline' | 'refresh_failed' | 'source_stale' | 'old' | null
 *         source_stale: our server answered, but with an older copy because its provider failed
 */
export function resourceView({ hasData, isEmpty = false, loading = false, error = null, fetchedAt = null, now, staleAfterMs, online = true, sourceStale = false }) {
  if (!hasData) {
    return { state: error && !loading ? 'error' : 'loading', stale: false, reason: null };
  }

  const refreshFailed = Boolean(error) && !loading;
  const old = typeof fetchedAt === 'number' && now - fetchedAt > staleAfterMs;
  const reason = !online ? 'offline' : refreshFailed ? 'refresh_failed' : sourceStale ? 'source_stale' : old ? 'old' : null;

  return { state: isEmpty ? 'empty' : 'ready', stale: reason !== null, reason };
}

/**
 * One view for a section built from several sources. It shows whatever
 * arrived; if another source failed it says so ('partial') rather than hiding it.
 */
export function combineViews(views, { isEmpty = false } = {}) {
  const list = views.filter(Boolean);
  const withData = list.filter(view => view.state === 'ready' || view.state === 'empty');

  if (!withData.length) {
    const state = list.some(view => view.state === 'loading') || !list.length ? 'loading' : 'error';
    return { state, stale: false, reason: null };
  }

  const staleView = withData.find(view => view.stale);
  const failed = list.some(view => view.state === 'error');
  const reason = staleView ? staleView.reason : failed ? 'partial' : null;
  return { state: isEmpty ? 'empty' : 'ready', stale: reason !== null, reason };
}
