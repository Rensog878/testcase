import express from 'express';
import { db } from './db.js';
import { HttpError, rateLimit, sendError, tooManyRequests } from './http.js';
import { weatherSettings } from './weather/config.js';
import { getFarmWeather, WeatherUnavailableError } from './weather/service.js';

// Mounted at /api/farmer behind requireAuth('farmer') in server.js; req.user is the farmer.
const router = express.Router();

const HOUR_MS = 60 * 60 * 1000;
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

// Forecasts and place lookups are cached in the Mongo-backed kv store, which
// survives across serverless invocations.
const kv = {
  get: key => db.kvGet(key),
  set: (key, value, ttlMs) => db.kvSet(key, value, ttlMs),
};

// Nominatim allows one request per second for the whole site, across every instance.
async function acquireNominatimSlot() {
  for (let attempt = 0; attempt < 3; attempt += 1) {
    if (!(await rateLimit('geocode-nominatim', 1, 1000))) return;
    await sleep(1000);
  }
  throw new Error('Place lookup is busy');
}

router.get('/weather', async (req, res) => {
  try {
    const wait = await rateLimit(`farmer-weather:${req.user.id}`, 60, HOUR_MS);
    if (wait) return tooManyRequests(res, wait, 'Too many weather requests. Please try again later.');

    const settings = weatherSettings();
    const data = await getFarmWeather(req.user, {
      kv,
      settings,
      acquireGeocodeSlot: settings.geocoder === 'nominatim' ? acquireNominatimSlot : undefined,
    });
    res.set('Cache-Control', 'private, no-store');
    res.json({ success: true, data });
  } catch (err) {
    if (err instanceof WeatherUnavailableError) {
      console.warn('⚠️ Weather unavailable:', err.cause?.message || err.message);
      return sendError(res, new HttpError(503, 'Weather is unavailable right now. Please try again later.', { code: 'WEATHER_UNAVAILABLE' }), 'Weather');
    }
    sendError(res, err, 'Weather');
  }
});

export default router;
