// GET /api/farmer/weather: forecast and spraying advice for the signed-in
// farmer's village.
//
// Response data (success: true):
//   { status: 'location_missing' }                    no village or district on the profile
//   { status: 'location_not_found', place }           the place could not be found on the map
//   { status: 'ok',
//     location: { label, village, district, state, precision: 'village' | 'district' },
//     current:  Hour | null,
//     hourly:   Hour[]  (next 24 hours, starting with the current hour)
//     daily:    Day[]   (today and the next two days, India dates)
//     spray:    { verdict: 'safe' | 'caution' | 'avoid', reasons: [{ code, severity, value, probabilityPct?, at }],
//                 checkedHours, searchedHours, nextSafeWindow: { start, end } | null, evaluatedAt },
//     source:   { provider, geocoder, credits: [{ name, url, licence }] },
//     fetchedAt: when the provider produced this forecast (not when this response was sent),
//     stale:     true when the provider failed and an older forecast is shown }
// Hour and Day are described in providers.js; every time is an ISO string.
// HTTP 503 with code WEATHER_UNAVAILABLE when there is no forecast at all.

import { adviseSpraying } from '../../src/shared/weather/sprayAdvisor.js';
import { SPRAY_CONFIG } from '../../src/shared/weather/sprayConfig.js';
import { ATTRIBUTION, WEATHER_CACHE, weatherSettings } from './config.js';
import { farmPlace, geocodeFarm } from './geocode.js';
import { fetchMetNorway, fetchOpenWeather, indiaDate } from './providers.js';

const HOUR_MS = 60 * 60 * 1000;

export class WeatherUnavailableError extends Error {
  constructor(message, cause) {
    super(message);
    this.cause = cause;
  }
}

const iso = time => (typeof time === 'number' && Number.isFinite(time) ? new Date(time).toISOString() : null);
const toGrid = (value, step) => Math.round(value / step) * step;

// One provider request per forecast cell at a time within this server instance.
const inFlight = new Map();

async function loadForecast({ lat, lon, settings, kv, fetchImpl, now, cache }) {
  const key = `wx:v1:${settings.provider}:${lat.toFixed(1)}:${lon.toFixed(1)}`;
  const cached = await kv.get(key);
  if (cached && now < Math.max(cached.fetchedAt + cache.freshMs, cached.expiresAt || 0)) {
    return { ...cached, stale: false };
  }
  if (inFlight.has(key)) return inFlight.get(key);

  const task = (async () => {
    try {
      const result = settings.provider === 'openweather'
        ? await fetchOpenWeather({ lat, lon, apiKey: settings.openWeatherKey, fetchImpl, timeoutMs: cache.requestTimeoutMs })
        : await fetchMetNorway({ lat, lon, userAgent: settings.userAgent, fetchImpl, previous: cached, timeoutMs: cache.requestTimeoutMs });

      const entry = result.notModified
        ? { ...cached, fetchedAt: now, expiresAt: result.expiresAt }
        : { forecast: result.forecast, fetchedAt: now, lastModified: result.lastModified, expiresAt: result.expiresAt };
      await kv.set(key, entry, cache.keepMs);
      return { ...entry, stale: false };
    } catch (error) {
      if (cached && now - cached.fetchedAt < cache.keepMs) return { ...cached, stale: true };
      throw new WeatherUnavailableError('No forecast available', error);
    }
  })().finally(() => inFlight.delete(key));

  inFlight.set(key, task);
  return task;
}

// The hour that contains `now`; OpenWeather's own "current" block while it is recent.
function currentConditions(forecast, now) {
  if (forecast.current && Math.abs(now - forecast.current.time) < 90 * 60 * 1000) return forecast.current;
  const started = forecast.hourly.filter(hour => hour.time <= now);
  return started.length ? started[started.length - 1] : forecast.hourly[0] || null;
}

const hourOut = hour => (hour ? { ...hour, time: iso(hour.time) } : null);

export async function getFarmWeather(user, {
  kv,
  settings = weatherSettings(),
  fetchImpl = fetch,
  now = Date.now(),
  cache = WEATHER_CACHE,
  sprayConfig = SPRAY_CONFIG,
  acquireGeocodeSlot,
} = {}) {
  const place = farmPlace(user);

  let located;
  try {
    located = await geocodeFarm(place, { settings, kv, fetchImpl, cache, acquireSlot: acquireGeocodeSlot });
  } catch (error) {
    throw new WeatherUnavailableError('Place lookup failed', error);
  }
  if (located.status === 'missing') return { status: 'location_missing' };
  if (located.status === 'not_found') return { status: 'location_not_found', place: located.place };

  const lat = Number(toGrid(located.lat, cache.gridDegrees).toFixed(1));
  const lon = Number(toGrid(located.lon, cache.gridDegrees).toFixed(1));
  const entry = await loadForecast({ lat, lon, settings, kv, fetchImpl, now, cache });
  const { forecast } = entry;

  const currentHour = Math.floor(now / HOUR_MS) * HOUR_MS;
  const spray = adviseSpraying(forecast.hourly, now, sprayConfig);
  const today = indiaDate(now);
  const credits = [ATTRIBUTION[settings.provider], ATTRIBUTION[settings.geocoder]]
    .filter((credit, index, list) => credit && list.indexOf(credit) === index);

  return {
    status: 'ok',
    location: { label: located.label, village: place.village, district: place.district, state: place.state, precision: located.precision },
    current: hourOut(currentConditions(forecast, now)),
    hourly: forecast.hourly.filter(hour => hour.time >= currentHour).slice(0, cache.hourlyShown).map(hourOut),
    daily: forecast.daily.filter(day => day.date >= today).slice(0, cache.dailyShown),
    spray: {
      ...spray,
      reasons: spray.reasons.map(reason => ({ ...reason, at: iso(reason.at) })),
      nextSafeWindow: spray.nextSafeWindow ? { start: iso(spray.nextSafeWindow.start), end: iso(spray.nextSafeWindow.end) } : null,
      evaluatedAt: iso(spray.evaluatedAt),
    },
    source: { provider: settings.provider, geocoder: settings.geocoder, credits },
    fetchedAt: iso(entry.fetchedAt),
    stale: entry.stale,
  };
}
