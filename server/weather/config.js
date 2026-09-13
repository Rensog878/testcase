// Weather for the farmer dashboard: which services are called and how long
// their answers are kept.
//
// Provider: OpenWeather One Call 3.0 when OPENWEATHER_API_KEY is set,
// otherwise MET Norway (free, CC BY 4.0, commercial use allowed, no key).
// Place lookup: OpenWeather geocoding with the key, otherwise OpenStreetMap
// Nominatim (one request per second, results must be cached, attribution).
// Both MET Norway and Nominatim require a User-Agent that identifies the site;
// set WEATHER_CONTACT (an email address) to add a contact to it.

const MINUTE_MS = 60 * 1000;
const HOUR_MS = 60 * MINUTE_MS;
const DAY_MS = 24 * HOUR_MS;

export function weatherSettings(env = process.env) {
  const site = env.PUBLIC_SITE_URL || 'https://sathyambio.com';
  const contact = env.WEATHER_CONTACT ? `; ${env.WEATHER_CONTACT}` : '';
  const openWeatherKey = env.OPENWEATHER_API_KEY || '';
  return {
    provider: openWeatherKey ? 'openweather' : 'met-norway',
    geocoder: openWeatherKey ? 'openweather' : 'nominatim',
    openWeatherKey,
    userAgent: `SathyaBio-FarmerDashboard/1.0 (+${site}${contact})`,
  };
}

export const WEATHER_CACHE = {
  // A forecast is reused this long before the provider is asked again
  // (MET Norway's Expires header can push this later, never earlier).
  freshMs: 30 * MINUTE_MS,
  // The last good forecast is kept this long to show when the provider is down.
  keepMs: 24 * HOUR_MS,
  // Farms within this many degrees (about 11 km) share one forecast.
  gridDegrees: 0.1,
  placeFoundMs: 90 * DAY_MS,
  placeMissingMs: 7 * DAY_MS,
  requestTimeoutMs: 8000,
  hourlyShown: 24,
  dailyShown: 3,
};

export const ATTRIBUTION = {
  'met-norway': { name: 'MET Norway', url: 'https://api.met.no/', licence: 'CC BY 4.0' },
  openweather: { name: 'OpenWeather', url: 'https://openweathermap.org/', licence: null },
  nominatim: { name: '© OpenStreetMap contributors', url: 'https://www.openstreetmap.org/copyright', licence: 'ODbL' },
};
