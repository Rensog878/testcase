import { test } from 'node:test';
import assert from 'node:assert/strict';

import { WEATHER_CACHE } from '../config.js';
import { farmPlace, geocodeFarm, pickNominatimResult } from '../geocode.js';
import { conditionFromMetSymbol, conditionFromOpenWeatherId, indiaDate, parseMetNorway, parseOpenWeather } from '../providers.js';
import { getFarmWeather, WeatherUnavailableError } from '../service.js';

const HOUR = 60 * 60 * 1000;
const NOW = Date.UTC(2026, 8, 13, 3, 30); // 09:00 in India
const SETTINGS = { provider: 'met-norway', geocoder: 'nominatim', openWeatherKey: '', userAgent: 'SathyaBio-Test/1.0' };
const FARMER = { id: 'USR-1', role: 'farmer', village: 'Thiruvaiyaru', district: 'Thanjavur', state: 'Tamil Nadu' };

// The shape MET Norway returned for Thanjavur: hourly steps, then 6-hourly, no rain probability or gusts.
function metJson({ hours = 64, sixHourly = 4, start = Math.floor(NOW / HOUR) * HOUR, rainAt = {} } = {}) {
  const timeseries = [];
  for (let i = 0; i < hours; i += 1) {
    timeseries.push({
      time: new Date(start + i * HOUR).toISOString(),
      data: {
        instant: { details: { air_temperature: 28 + (i % 5), relative_humidity: 70, wind_speed: 1.7 } },
        next_1_hours: { summary: { symbol_code: rainAt[i] ? 'rain' : 'partlycloudy_day' }, details: { precipitation_amount: rainAt[i] || 0 } },
        next_6_hours: { summary: { symbol_code: 'cloudy' }, details: { air_temperature_max: 31, air_temperature_min: 26, precipitation_amount: 0 } },
      },
    });
  }
  for (let i = 0; i < sixHourly; i += 1) {
    timeseries.push({
      time: new Date(start + hours * HOUR + i * 6 * HOUR).toISOString(),
      data: {
        instant: { details: { air_temperature: 27, relative_humidity: 80, wind_speed: 2 } },
        next_6_hours: { summary: { symbol_code: 'lightrainshowers_day' }, details: { air_temperature_max: 32, air_temperature_min: 25, precipitation_amount: 1.5 } },
      },
    });
  }
  return { properties: { meta: { updated_at: '2026-09-13T03:00:00Z' }, timeseries } };
}

const NOMINATIM_THIRUVAIYARU = [
  { name: 'Thiruvaiyaru', lat: '10.8797198', lon: '79.1039298', addresstype: 'town', address: { state: 'Tamil Nadu', state_district: 'Thanjavur' } },
];
const NOMINATIM_THANJAVUR = [
  { name: 'Thanjavur', lat: '10.6590370', lon: '79.2014278', addresstype: 'state_district', address: { state: 'Tamil Nadu', state_district: 'Thanjavur' } },
];

function memoryKv() {
  const map = new Map();
  return {
    map,
    get: async key => (map.has(key) ? structuredClone(map.get(key)) : null),
    set: async (key, value) => { map.set(key, structuredClone(value)); return value; },
  };
}

function fakeResponse(status, body, headers = {}) {
  const lower = Object.fromEntries(Object.entries(headers).map(([k, v]) => [k.toLowerCase(), v]));
  return { status, ok: status >= 200 && status < 300, headers: { get: name => lower[name.toLowerCase()] ?? null }, json: async () => body };
}

function fakeFetch(routes) {
  const calls = [];
  const impl = async (url, options = {}) => {
    calls.push({ url, headers: options.headers || {} });
    for (const [pattern, reply] of routes) {
      if (url.includes(pattern)) return typeof reply === 'function' ? reply(url, options) : reply;
    }
    throw new Error(`unexpected request ${url}`);
  };
  return { impl, calls };
}

test('MET Norway symbols and OpenWeather ids map to shared conditions', () => {
  assert.equal(conditionFromMetSymbol('partlycloudy_night'), 'partly_cloudy');
  assert.equal(conditionFromMetSymbol('heavyrainandthunder'), 'storm');
  assert.equal(conditionFromMetSymbol('lightrainshowers_day'), 'light_rain');
  assert.equal(conditionFromMetSymbol('clearsky_day'), 'clear');
  assert.equal(conditionFromMetSymbol(undefined), 'unknown');
  assert.equal(conditionFromOpenWeatherId(501), 'rain');
  assert.equal(conditionFromOpenWeatherId(211), 'storm');
  assert.equal(conditionFromOpenWeatherId(804), 'cloudy');
});

test('India dates change at 18:30 UTC', () => {
  assert.equal(indiaDate(Date.UTC(2026, 8, 13, 18, 29)), '2026-09-13');
  assert.equal(indiaDate(Date.UTC(2026, 8, 13, 18, 30)), '2026-09-14');
});

test('MET Norway: hourly steps keep null for missing probability and gusts; daily counts each span once', () => {
  const forecast = parseMetNorway(metJson({ rainAt: { 2: 0.4 } }));
  assert.equal(forecast.hourly.length, 64);
  assert.deepEqual(forecast.hourly[2], {
    time: Math.floor(NOW / HOUR) * HOUR + 2 * HOUR,
    temperatureC: 30, apparentTemperatureC: null, humidityPct: 70, windKph: 6.1, gustKph: null,
    precipitationMm: 0.4, rainProbabilityPct: null, condition: 'rain',
  });
  const today = forecast.daily.find(day => day.date === '2026-09-13');
  assert.equal(today.precipitationMm, 0.4);
  assert.equal(today.rainProbabilityPct, null);
  assert.equal(today.condition, 'rain');
  const last = forecast.daily[forecast.daily.length - 1];
  assert.ok(last.precipitationMm >= 1.5, 'six-hour steps after the hourly range are counted');
  assert.throws(() => parseMetNorway({}), /Unexpected MET Norway response/);
});

test('OpenWeather: metric units, probability as percent, absent rain is zero', () => {
  const json = {
    current: { dt: NOW / 1000, temp: 30.2, feels_like: 34, humidity: 66, wind_speed: 3, weather: [{ id: 802 }] },
    hourly: [
      { dt: NOW / 1000, temp: 30, feels_like: 34, humidity: 66, wind_speed: 3, wind_gust: 6, pop: 0.2, weather: [{ id: 802 }] },
      { dt: NOW / 1000 + 3600, temp: 31, humidity: 60, wind_speed: 4, pop: 0.75, rain: { '1h': 1.2 }, weather: [{ id: 501 }] },
    ],
    daily: [{ dt: NOW / 1000, temp: { min: 25.1, max: 33.4 }, pop: 0.8, rain: 6.25, weather: [{ id: 501 }] }],
  };
  const forecast = parseOpenWeather(json);
  assert.equal(forecast.current.windKph, 10.8);
  assert.equal(forecast.current.rainProbabilityPct, 20);
  assert.equal(forecast.hourly[0].precipitationMm, 0);
  assert.deepEqual([forecast.hourly[1].rainProbabilityPct, forecast.hourly[1].precipitationMm, forecast.hourly[1].gustKph], [75, 1.2, null]);
  assert.deepEqual(forecast.daily[0], { date: '2026-09-13', minC: 25.1, maxC: 33.4, precipitationMm: 6.3, rainProbabilityPct: 80, condition: 'rain' });
});

test('profile placeholders are not places', () => {
  assert.deepEqual(farmPlace({ village: 'Farm Village', district: ' Coimbatore ', state: 'Tamil Nadu' }), { village: null, district: 'Coimbatore', state: 'Tamil Nadu' });
});

test('a village match must be in the farmer’s district and state', () => {
  const place = { village: 'Thiruvaiyaru', district: 'Thanjavur', state: 'Tamil Nadu' };
  const elsewhere = [{ name: 'Thiruvaiyaru', lat: '11', lon: '78', address: { state: 'Tamil Nadu', state_district: 'Salem' } }];
  assert.equal(pickNominatimResult(elsewhere, place, 'village'), null);
  assert.equal(pickNominatimResult([{ ...NOMINATIM_THIRUVAIYARU[0], address: { state: 'Kerala', state_district: 'Thanjavur' } }], place, 'village'), null);
  assert.deepEqual(pickNominatimResult(NOMINATIM_THIRUVAIYARU, place, 'village'), { lat: 10.8797198, lon: 79.1039298, label: 'Thiruvaiyaru' });
  assert.equal(pickNominatimResult(NOMINATIM_THANJAVUR, { ...place, village: null }, 'district').label, 'Thanjavur');
});

test('geocoding falls back to the district, caches hits and misses, and waits for its slot', async () => {
  const kv = memoryKv();
  let slots = 0;
  const fetcher = fakeFetch([
    ['Nowhere', fakeResponse(200, [])],
    ['Thanjavur', fakeResponse(200, NOMINATIM_THANJAVUR)],
  ]);
  const place = { village: 'Nowhere', district: 'Thanjavur', state: 'Tamil Nadu' };
  const options = { settings: SETTINGS, kv, fetchImpl: fetcher.impl, cache: WEATHER_CACHE, acquireSlot: async () => { slots += 1; } };

  const first = await geocodeFarm(place, options);
  assert.deepEqual([first.status, first.precision, first.label], ['found', 'district', 'Thanjavur']);
  assert.equal(fetcher.calls.length, 2);
  assert.equal(slots, 2);
  assert.equal(fetcher.calls[0].headers['User-Agent'], 'SathyaBio-Test/1.0');

  await geocodeFarm(place, options);
  assert.equal(fetcher.calls.length, 2, 'both the miss and the hit were cached');

  assert.deepEqual(await geocodeFarm({ village: null, district: null, state: 'Tamil Nadu' }, options), { status: 'missing' });
});

test('service: ok response with advice, credits, ISO times and a shared forecast cell', async () => {
  const kv = memoryKv();
  const fetcher = fakeFetch([
    ['nominatim', fakeResponse(200, NOMINATIM_THIRUVAIYARU)],
    ['api.met.no', fakeResponse(200, metJson(), { 'Last-Modified': 'Sun, 13 Sep 2026 03:00:00 GMT', Expires: new Date(NOW + 20 * 60 * 1000).toUTCString() })],
  ]);
  const data = await getFarmWeather(FARMER, { kv, settings: SETTINGS, fetchImpl: fetcher.impl, now: NOW });

  assert.equal(data.status, 'ok');
  assert.deepEqual(data.location, { label: 'Thiruvaiyaru', village: 'Thiruvaiyaru', district: 'Thanjavur', state: 'Tamil Nadu', precision: 'village' });
  assert.ok(fetcher.calls.some(call => call.url.includes('lat=10.9&lon=79.1')), 'coordinates snap to the 0.1° grid');
  assert.equal(data.hourly.length, 24);
  assert.equal(data.hourly[0].time, new Date(Math.floor(NOW / HOUR) * HOUR).toISOString());
  assert.equal(data.current.time, data.hourly[0].time);
  assert.equal(data.daily.length, 3);
  assert.equal(data.spray.verdict, 'safe');
  assert.equal(data.spray.evaluatedAt, new Date(NOW).toISOString());
  assert.equal(data.fetchedAt, new Date(NOW).toISOString());
  assert.equal(data.stale, false);
  assert.deepEqual(data.source.credits.map(credit => credit.name), ['MET Norway', '© OpenStreetMap contributors']);
});

test('service: fresh forecasts are reused, then revalidated with If-Modified-Since', async () => {
  const kv = memoryKv();
  let metCalls = 0;
  const fetcher = fakeFetch([
    ['nominatim', fakeResponse(200, NOMINATIM_THIRUVAIYARU)],
    ['api.met.no', (url, options) => {
      metCalls += 1;
      return metCalls === 1
        ? fakeResponse(200, metJson({ rainAt: { 1: 3 } }), { 'Last-Modified': 'first', Expires: new Date(NOW + 45 * 60 * 1000).toUTCString() })
        : (assert.equal(options.headers['If-Modified-Since'], 'first'), fakeResponse(304, null, { Expires: new Date(NOW + 2 * HOUR).toUTCString() }));
    }],
  ]);
  const run = now => getFarmWeather(FARMER, { kv, settings: SETTINGS, fetchImpl: fetcher.impl, now });

  await run(NOW);
  await run(NOW + 40 * 60 * 1000);
  assert.equal(metCalls, 1, 'Expires (45 min) wins over the 30 min freshness');

  const later = await run(NOW + 50 * 60 * 1000);
  assert.equal(metCalls, 2);
  assert.equal(later.fetchedAt, new Date(NOW + 50 * 60 * 1000).toISOString());
  assert.equal(later.spray.verdict, 'avoid', 'a 304 keeps the stored forecast');
});

test('service: provider failure shows the last forecast as stale, or fails when there is none', async () => {
  const kv = memoryKv();
  const good = fakeFetch([
    ['nominatim', fakeResponse(200, NOMINATIM_THIRUVAIYARU)],
    ['api.met.no', fakeResponse(200, metJson())],
  ]);
  await getFarmWeather(FARMER, { kv, settings: SETTINGS, fetchImpl: good.impl, now: NOW });

  const down = fakeFetch([['api.met.no', fakeResponse(503, null)]]);
  const stale = await getFarmWeather(FARMER, { kv, settings: SETTINGS, fetchImpl: down.impl, now: NOW + 2 * HOUR });
  assert.equal(stale.stale, true);
  assert.equal(stale.fetchedAt, new Date(NOW).toISOString());

  await assert.rejects(
    getFarmWeather(FARMER, { kv: memoryKv(), settings: SETTINGS, fetchImpl: fakeFetch([['nominatim', fakeResponse(200, NOMINATIM_THIRUVAIYARU)], ['api.met.no', fakeResponse(500, null)]]).impl, now: NOW }),
    WeatherUnavailableError,
  );
  await assert.rejects(
    getFarmWeather(FARMER, { kv: memoryKv(), settings: SETTINGS, fetchImpl: fakeFetch([['nominatim', fakeResponse(429, null)]]).impl, now: NOW }),
    WeatherUnavailableError,
  );
});

test('service: missing and unknown places are answers, not errors', async () => {
  const noPlace = await getFarmWeather({ ...FARMER, village: 'Farm Village', district: '' }, { kv: memoryKv(), settings: SETTINGS, fetchImpl: fakeFetch([]).impl, now: NOW });
  assert.deepEqual(noPlace, { status: 'location_missing' });

  const unknown = await getFarmWeather({ ...FARMER, village: 'Nowhere', district: 'Nodistrict' }, {
    kv: memoryKv(), settings: SETTINGS, fetchImpl: fakeFetch([['nominatim', fakeResponse(200, [])]]).impl, now: NOW,
  });
  assert.deepEqual(unknown, { status: 'location_not_found', place: 'Nowhere, Nodistrict' });
});
