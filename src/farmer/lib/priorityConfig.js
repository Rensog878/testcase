// Every tunable number in dashboard ranking lives here.
//
// Each factor yields a value from 0 to 1; its points are value x weight.
// Severity is weighted so its tiers never overlap. The other positive factors
// add at most 125 points and staleness takes 20, so:
//   worst critical 600 - 20 = 580  >  best warning 360 + 125 = 485
//   worst warning  360 - 20 = 340  >  best info    150 + 125 = 275
//   worst info     150 - 20 = 130  >  best ok        0 + 125 = 125
// priorityEngine.test.js checks that this still holds after edits.

const MINUTE_MS = 60 * 1000;
const HOUR_MS = 60 * MINUTE_MS;

export const PRIORITY_CONFIG = {
  weights: {
    severity: 600,
    urgency: 40,
    cropMatch: 30,
    weatherRelevance: 25,
    targeted: 20,
    recency: 10,
    staleness: -20,
  },

  severityLevels: { critical: 1, warning: 0.6, info: 0.25, ok: 0 },

  // matchCrops() results from src/shared/cropRegistry.js.
  cropMatchLevels: { exact: 1, general: 0.4, none: 0, unknown: 0 },

  // An item due this many hours from now or later earns no urgency.
  urgencyHorizonHours: 72,

  // Recency halves every this many hours after the event.
  recencyHalfLifeHours: 48,

  // Data older than this, per source, is marked stale.
  staleAfterMs: {
    order: 30 * MINUTE_MS,
    product: 24 * HOUR_MS,
    weather: 3 * HOUR_MS,
    alert: 6 * HOUR_MS,
  },
  defaultStaleAfterMs: 6 * HOUR_MS,
};

// How long each dashboard data source is reused before refetching, and when
// the UI starts saying the data may be out of date.
export const RESOURCE_POLICY = {
  profile: { maxAgeMs: 5 * MINUTE_MS, staleAfterMs: 24 * HOUR_MS },
  orders: { maxAgeMs: 2 * MINUTE_MS, staleAfterMs: PRIORITY_CONFIG.staleAfterMs.order },
  products: { maxAgeMs: 30 * MINUTE_MS, staleAfterMs: PRIORITY_CONFIG.staleAfterMs.product },
  // The server caches forecasts for 30 minutes; asking more often gains nothing.
  // Staleness is judged from the forecast's own time, not when we asked.
  weather: { maxAgeMs: 10 * MINUTE_MS, staleAfterMs: PRIORITY_CONFIG.staleAfterMs.weather },
};
