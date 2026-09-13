// Weather provider adapters. Each turns its provider's response into one
// forecast shape:
//
//   { current: Hour | null, hourly: Hour[], daily: Day[] }
//   Hour: { time (ms), temperatureC, apparentTemperatureC, humidityPct, windKph,
//           gustKph, precipitationMm, rainProbabilityPct, condition }
//   Day:  { date: 'YYYY-MM-DD' (India), minC, maxC, precipitationMm, rainProbabilityPct, condition }
//
// Missing values are null, never 0, so the advice can tell "no rain" from "unknown".

const HOUR_MS = 60 * 60 * 1000;
const IST_OFFSET_MS = 330 * 60 * 1000;

const num = value => (typeof value === 'number' && Number.isFinite(value) ? value : null);
const round1 = value => (value === null ? null : Math.round(value * 10) / 10);
const kph = metresPerSecond => (num(metresPerSecond) === null ? null : round1(metresPerSecond * 3.6));

export class ProviderError extends Error {}

export function indiaDate(timeMs) {
  return new Date(timeMs + IST_OFFSET_MS).toISOString().slice(0, 10);
}

// Worst weather last: a day's summary shows the worst of its daylight hours.
export const CONDITIONS = ['unknown', 'clear', 'partly_cloudy', 'cloudy', 'fog', 'light_rain', 'rain', 'heavy_rain', 'snow', 'storm'];

const worst = conditions => conditions.reduce((a, b) => (CONDITIONS.indexOf(b) > CONDITIONS.indexOf(a) ? b : a), 'unknown');

export function conditionFromMetSymbol(code) {
  const base = String(code || '').replace(/_(day|night|polartwilight)$/, '');
  if (!base) return 'unknown';
  if (base.includes('thunder')) return 'storm';
  if (base.includes('sleet') || base.includes('snow')) return 'snow';
  if (base.startsWith('heavyrain')) return 'heavy_rain';
  if (base.startsWith('lightrain')) return 'light_rain';
  if (base.startsWith('rain')) return 'rain';
  if (base === 'fog') return 'fog';
  if (base === 'cloudy') return 'cloudy';
  if (base === 'partlycloudy' || base === 'fair') return 'partly_cloudy';
  if (base === 'clearsky') return 'clear';
  return 'unknown';
}

// https://openweathermap.org/weather-conditions
export function conditionFromOpenWeatherId(id) {
  if (!Number.isInteger(id)) return 'unknown';
  if (id >= 200 && id < 300) return 'storm';
  if (id >= 300 && id < 400) return 'light_rain';
  if (id === 500) return 'light_rain';
  if (id >= 502 && id <= 504) return 'heavy_rain';
  if (id >= 500 && id < 600) return 'rain';
  if (id >= 600 && id < 700) return 'snow';
  if (id >= 700 && id < 800) return 'fog';
  if (id === 800) return 'clear';
  if (id === 801 || id === 802) return 'partly_cloudy';
  if (id > 802 && id < 900) return 'cloudy';
  return 'unknown';
}

// Periods: { time, hours, tmin, tmax, mm, probability, condition } covering the timeline once each.
function dailyFromPeriods(periods) {
  const days = new Map();
  for (const period of periods) {
    const date = indiaDate(period.time);
    if (!days.has(date)) days.set(date, []);
    days.get(date).push(period);
  }
  return [...days.entries()].map(([date, list]) => {
    const temps = list.flatMap(p => [p.tmin, p.tmax]).filter(v => v !== null);
    const amounts = list.map(p => p.mm).filter(v => v !== null);
    const probabilities = list.map(p => p.probability).filter(v => v !== null);
    const daytime = list.filter(p => {
      const hour = new Date(p.time + IST_OFFSET_MS).getUTCHours();
      return hour >= 6 && hour < 18;
    });
    return {
      date,
      minC: temps.length ? round1(Math.min(...temps)) : null,
      maxC: temps.length ? round1(Math.max(...temps)) : null,
      precipitationMm: amounts.length ? round1(amounts.reduce((sum, mm) => sum + mm, 0)) : null,
      rainProbabilityPct: probabilities.length ? Math.max(...probabilities) : null,
      condition: worst((daytime.length ? daytime : list).map(p => p.condition)),
    };
  });
}

/** MET Norway Locationforecast 2.0 "complete" JSON. */
export function parseMetNorway(json) {
  const series = json?.properties?.timeseries;
  if (!Array.isArray(series)) throw new ProviderError('Unexpected MET Norway response');

  const steps = series
    .map(step => ({
      time: Date.parse(step.time),
      instant: step.data?.instant?.details || {},
      next1: step.data?.next_1_hours,
      next6: step.data?.next_6_hours,
    }))
    .filter(step => Number.isFinite(step.time))
    .sort((a, b) => a.time - b.time);

  const hourly = steps
    .filter(step => step.next1)
    .map(step => ({
      time: step.time,
      temperatureC: num(step.instant.air_temperature),
      apparentTemperatureC: num(step.instant.apparent_air_temperature),
      humidityPct: num(step.instant.relative_humidity),
      windKph: kph(step.instant.wind_speed),
      gustKph: kph(step.instant.wind_speed_of_gust),
      precipitationMm: num(step.next1.details?.precipitation_amount),
      rainProbabilityPct: num(step.next1.details?.probability_of_precipitation),
      condition: conditionFromMetSymbol(step.next1.summary?.symbol_code),
    }));

  // Hourly steps for the first ~2.5 days, 6-hour steps after; count each span once.
  const periods = [];
  let coveredUntil = -Infinity;
  for (const step of steps) {
    if (step.time < coveredUntil) continue;
    const temperature = num(step.instant.air_temperature);
    if (step.next1) {
      periods.push({
        time: step.time, tmin: temperature, tmax: temperature,
        mm: num(step.next1.details?.precipitation_amount),
        probability: num(step.next1.details?.probability_of_precipitation),
        condition: conditionFromMetSymbol(step.next1.summary?.symbol_code),
      });
      coveredUntil = step.time + HOUR_MS;
    } else if (step.next6) {
      periods.push({
        time: step.time,
        tmin: num(step.next6.details?.air_temperature_min) ?? temperature,
        tmax: num(step.next6.details?.air_temperature_max) ?? temperature,
        mm: num(step.next6.details?.precipitation_amount),
        probability: num(step.next6.details?.probability_of_precipitation),
        condition: conditionFromMetSymbol(step.next6.summary?.symbol_code),
      });
      coveredUntil = step.time + 6 * HOUR_MS;
    }
  }

  return { current: null, hourly, daily: dailyFromPeriods(periods) };
}

/** OpenWeather One Call 3.0 JSON requested with units=metric. */
export function parseOpenWeather(json) {
  if (!json || !Array.isArray(json.hourly)) throw new ProviderError('Unexpected OpenWeather response');

  const hour = entry => ({
    time: entry.dt * 1000,
    temperatureC: num(entry.temp),
    apparentTemperatureC: num(entry.feels_like),
    humidityPct: num(entry.humidity),
    windKph: kph(entry.wind_speed),
    gustKph: kph(entry.wind_gust),
    // OpenWeather leaves "rain" out when none is expected.
    precipitationMm: num(entry.rain?.['1h']) ?? 0,
    rainProbabilityPct: num(entry.pop) === null ? null : Math.round(entry.pop * 100),
    condition: conditionFromOpenWeatherId(entry.weather?.[0]?.id),
  });

  const hourly = json.hourly.filter(entry => Number.isFinite(entry?.dt)).map(hour);
  const current = json.current && Number.isFinite(json.current.dt)
    ? { ...hour(json.current), rainProbabilityPct: hourly[0]?.rainProbabilityPct ?? null }
    : null;
  const daily = (Array.isArray(json.daily) ? json.daily : [])
    .filter(entry => Number.isFinite(entry?.dt))
    .map(entry => ({
      date: indiaDate(entry.dt * 1000),
      minC: round1(num(entry.temp?.min)),
      maxC: round1(num(entry.temp?.max)),
      precipitationMm: round1(num(entry.rain) ?? 0),
      rainProbabilityPct: num(entry.pop) === null ? null : Math.round(entry.pop * 100),
      condition: conditionFromOpenWeatherId(entry.weather?.[0]?.id),
    }));

  return { current, hourly, daily };
}

/**
 * MET Norway requires a descriptive User-Agent and asks clients to honour
 * Expires and send If-Modified-Since. Returns { notModified } for a 304.
 */
export async function fetchMetNorway({ lat, lon, userAgent, fetchImpl, previous, timeoutMs }) {
  const headers = { 'User-Agent': userAgent, Accept: 'application/json' };
  if (previous?.lastModified) headers['If-Modified-Since'] = previous.lastModified;
  const response = await fetchImpl(
    `https://api.met.no/weatherapi/locationforecast/2.0/complete?lat=${lat}&lon=${lon}`,
    { headers, signal: AbortSignal.timeout(timeoutMs) },
  );
  const expiresAt = Date.parse(response.headers.get('expires')) || null;
  if (response.status === 304 && previous) {
    return { notModified: true, expiresAt, lastModified: previous.lastModified };
  }
  if (!response.ok) throw new ProviderError(`MET Norway responded ${response.status}`);
  return {
    forecast: parseMetNorway(await response.json()),
    lastModified: response.headers.get('last-modified'),
    expiresAt,
  };
}

export async function fetchOpenWeather({ lat, lon, apiKey, fetchImpl, timeoutMs }) {
  const params = new URLSearchParams({ lat: String(lat), lon: String(lon), units: 'metric', exclude: 'minutely,alerts', appid: apiKey });
  const response = await fetchImpl(`https://api.openweathermap.org/data/3.0/onecall?${params}`, { signal: AbortSignal.timeout(timeoutMs) });
  if (!response.ok) throw new ProviderError(`OpenWeather responded ${response.status}`);
  return { forecast: parseOpenWeather(await response.json()), lastModified: null, expiresAt: null };
}
