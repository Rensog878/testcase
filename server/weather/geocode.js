// Farm location from the profile's village, district and state.
//
// Tries village + district + state, then district + state, and never guesses
// beyond that: a state-wide point is too far from the farm to be useful.
// Results (found and not found) are cached in the kv store, so each place is
// looked up rarely - Nominatim's policy requires this.

import { normalizePlace } from '../../src/shared/placeNames.js';
import { ProviderError } from './providers.js';

// Filled in by db.createUser when a field was left blank; not a real place.
const PLACEHOLDERS = new Set(['farm village', 'farm', 'n/a', 'na', '-', 'none']);

const clean = value => {
  const text = typeof value === 'string' ? value.trim() : '';
  return text && !PLACEHOLDERS.has(text.toLowerCase()) ? text : null;
};

const samePlace = (a, b) => {
  const left = normalizePlace(a);
  const right = normalizePlace(b);
  return Boolean(left && right) && (left === right || left.includes(right) || right.includes(left));
};

export function farmPlace(user) {
  return { village: clean(user?.village), district: clean(user?.district), state: clean(user?.state) };
}

export function placeCandidates(place) {
  const candidates = [];
  if (place.village) candidates.push({ precision: 'village', parts: [place.village, place.district, place.state].filter(Boolean) });
  if (place.district) candidates.push({ precision: 'district', parts: [place.district, place.state].filter(Boolean) });
  return candidates;
}

export function pickNominatimResult(results, place, precision) {
  const inState = (Array.isArray(results) ? results : []).filter(result => !place.state || samePlace(result.address?.state, place.state));
  const inDistrict = inState.filter(result => samePlace(result.address?.state_district || result.address?.county, place.district));
  // A village match must sit in the farmer's district when we know it, so a
  // same-named village elsewhere in the state is not taken for the farm.
  const best = precision === 'village' && place.district ? inDistrict[0] : inDistrict[0] || inState[0];
  if (!best) return null;
  const lat = Number(best.lat);
  const lon = Number(best.lon);
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) return null;
  return { lat, lon, label: best.name || best.display_name?.split(',')[0] || null };
}

export function pickOpenWeatherResult(results, place) {
  const best = (Array.isArray(results) ? results : []).find(result => result.country === 'IN' && (!place.state || samePlace(result.state, place.state)));
  return best && Number.isFinite(best.lat) && Number.isFinite(best.lon) ? { lat: best.lat, lon: best.lon, label: best.name || null } : null;
}

async function searchNominatim(parts, { userAgent, fetchImpl, timeoutMs }) {
  const params = new URLSearchParams({ q: parts.join(', '), format: 'jsonv2', countrycodes: 'in', limit: '5', addressdetails: '1' });
  const response = await fetchImpl(`https://nominatim.openstreetmap.org/search?${params}`, {
    headers: { 'User-Agent': userAgent, 'Accept-Language': 'en' },
    signal: AbortSignal.timeout(timeoutMs),
  });
  if (!response.ok) throw new ProviderError(`Nominatim responded ${response.status}`);
  return response.json();
}

async function searchOpenWeather(parts, { apiKey, fetchImpl, timeoutMs }) {
  // OpenWeather matches on the place name; the state is checked on the results.
  const params = new URLSearchParams({ q: `${parts[0]},IN`, limit: '5', appid: apiKey });
  const response = await fetchImpl(`https://api.openweathermap.org/geo/1.0/direct?${params}`, { signal: AbortSignal.timeout(timeoutMs) });
  if (!response.ok) throw new ProviderError(`OpenWeather geocoding responded ${response.status}`);
  return response.json();
}

/**
 * { status: 'found', lat, lon, label, precision } | { status: 'missing' } | { status: 'not_found', place }
 * Network failures throw and are not cached.
 */
export async function geocodeFarm(place, { settings, kv, fetchImpl, cache, acquireSlot = async () => {} }) {
  const candidates = placeCandidates(place);
  if (!candidates.length) return { status: 'missing' };

  for (const candidate of candidates) {
    const key = `geo:v1:${settings.geocoder}:${candidate.parts.map(normalizePlace).join('|')}`;
    const cached = await kv.get(key);
    if (cached?.found) return { status: 'found', ...cached.found };
    if (cached?.missing) continue;

    let match;
    if (settings.geocoder === 'openweather') {
      match = pickOpenWeatherResult(
        await searchOpenWeather(candidate.parts, { apiKey: settings.openWeatherKey, fetchImpl, timeoutMs: cache.requestTimeoutMs }),
        place,
      );
    } else {
      await acquireSlot();
      match = pickNominatimResult(
        await searchNominatim(candidate.parts, { userAgent: settings.userAgent, fetchImpl, timeoutMs: cache.requestTimeoutMs }),
        place,
        candidate.precision,
      );
    }

    if (match) {
      const found = { ...match, label: match.label || candidate.parts[0], precision: candidate.precision };
      await kv.set(key, { found }, cache.placeFoundMs);
      return { status: 'found', ...found };
    }
    await kv.set(key, { missing: true }, cache.placeMissingMs);
  }

  return { status: 'not_found', place: [place.village, place.district].filter(Boolean).join(', ') };
}
