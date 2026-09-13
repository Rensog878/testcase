// Shaping GET /api/farmer/weather data for the dashboard.

const HOUR_MS = 60 * 60 * 1000;
const IST_OFFSET_MS = 330 * 60 * 1000;

export function toMs(value) {
  if (typeof value === 'number') return Number.isFinite(value) ? value : null;
  const time = Date.parse(value);
  return Number.isFinite(time) ? time : null;
}

export function indiaDate(timeMs) {
  return new Date(timeMs + IST_OFFSET_MS).toISOString().slice(0, 10);
}

/** Midday in India on a 'YYYY-MM-DD' date, for formatting that date's name. */
export function middayOf(date) {
  const time = Date.parse(`${date}T12:00:00+05:30`);
  return Number.isFinite(time) ? time : null;
}

/** 'today' | 'tomorrow' | null for a time or 'YYYY-MM-DD' date, in India. */
export function relativeDay(value, now) {
  const date = typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value) ? value : indiaDate(toMs(value));
  if (date === indiaDate(now)) return 'today';
  if (date === indiaDate(now + 24 * HOUR_MS)) return 'tomorrow';
  return null;
}

/** Every `every`-th hour of the forecast, up to `count` slots, times in ms. */
export function forecastSlots(hourly, { every = 3, count = 8 } = {}) {
  return (Array.isArray(hourly) ? hourly : [])
    .map(hour => ({ ...hour, time: toMs(hour.time) }))
    .filter(hour => hour.time !== null)
    .filter((_, index) => index % every === 0)
    .slice(0, count);
}

// How much the current weather should raise weather-sensitive items (priority engine factor).
const RISK_BY_VERDICT = { avoid: 1, caution: 0.5, safe: 0 };

export function weatherRisk(data) {
  if (data?.status !== 'ok') return null;
  return RISK_BY_VERDICT[data.spray?.verdict] ?? null;
}
