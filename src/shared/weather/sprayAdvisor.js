// Rule-based spraying advice from an hourly forecast.
//
// Input hours: [{ time (ms or ISO), temperatureC, humidityPct, windKph,
// gustKph, precipitationMm, rainProbabilityPct }], one per hour. Any value may
// be null: MET Norway, for example, gives no rain probability or gusts for
// India, so rain is then judged by the expected amount.
//
// Output reasons carry codes and numbers, never words, so the dashboard can
// explain them in the farmer's language. Plain ES module: used by the server
// (server/weather/service.js) and by node:test.

import { SPRAY_CONFIG } from './sprayConfig.js';

const HOUR_MS = 60 * 60 * 1000;
const SEVERITY_RANK = { avoid: 2, caution: 1 };

const isNumber = value => typeof value === 'number' && Number.isFinite(value);
const round1 = value => Math.round(value * 10) / 10;

export function localHour(timeMs, config = SPRAY_CONFIG) {
  return new Date(timeMs + config.timeZoneOffsetMinutes * 60 * 1000).getUTCHours();
}

export function isDaylight(timeMs, config = SPRAY_CONFIG) {
  const hour = localHour(timeMs, config);
  return hour >= config.daylight.startHour && hour < config.daylight.endHour;
}

export function normalizeHours(hours) {
  return (Array.isArray(hours) ? hours : [])
    .map(hour => ({ ...hour, time: typeof hour?.time === 'number' ? hour.time : Date.parse(hour?.time) }))
    .filter(hour => Number.isFinite(hour.time))
    .sort((a, b) => a.time - b.time);
}

function hoursBetween(hours, startMs, count) {
  const end = startMs + count * HOUR_MS;
  return hours.filter(hour => hour.time >= startMs && hour.time < end);
}

const values = (hours, field) => hours.map(hour => hour[field]).filter(isNumber);

/**
 * Advice for a spray round starting at startMs.
 * Returns { verdict: 'safe' | 'caution' | 'avoid', reasons: [{ code, severity, value, at, probabilityPct? }] }.
 */
export function evaluateSprayWindow(hours, startMs, config = SPRAY_CONFIG, { checkDaylight = true } = {}) {
  const startHour = Math.floor(startMs / HOUR_MS) * HOUR_MS;
  const rainHours = hoursBetween(hours, startHour, config.rainFreeHours);
  const sprayHours = hoursBetween(hours, startHour, config.sprayHours);
  const reasons = [];

  if (rainHours.length < config.rainFreeHours || sprayHours.length < config.sprayHours) {
    return { verdict: 'caution', reasons: [{ code: 'no_forecast', severity: 'caution', value: config.rainFreeHours, at: null }] };
  }

  // Rain over the whole rain-free period.
  const probabilities = values(rainHours, 'rainProbabilityPct');
  const amounts = values(rainHours, 'precipitationMm');
  if (!probabilities.length && !amounts.length) {
    reasons.push({ code: 'rain_unknown', severity: 'caution', value: null, at: null });
  } else {
    const maxProbability = probabilities.length ? Math.max(...probabilities) : null;
    const totalMm = round1(amounts.reduce((sum, mm) => sum + mm, 0));
    const { rain } = config;
    const severity =
      (maxProbability ?? 0) >= rain.avoidProbabilityPct || totalMm >= rain.avoidTotalMm ? 'avoid'
        : (maxProbability ?? 0) >= rain.cautionProbabilityPct || totalMm >= rain.cautionTotalMm ? 'caution'
          : null;
    if (severity) {
      const firstWet = rainHours.find(hour => (hour.precipitationMm ?? 0) > 0 || (hour.rainProbabilityPct ?? 0) >= rain.cautionProbabilityPct);
      reasons.push({
        code: severity === 'avoid' ? 'rain_expected' : 'rain_possible',
        severity,
        value: totalMm,
        probabilityPct: maxProbability,
        at: firstWet ? firstWet.time : startHour,
      });
    }
  }

  // Wind during the spray round itself.
  const winds = values(sprayHours, 'windKph');
  const { wind } = config;
  if (!winds.length) {
    reasons.push({ code: 'wind_unknown', severity: 'caution', value: null, at: null });
  } else {
    const strongest = Math.max(...winds);
    if (strongest > wind.avoidKph) reasons.push({ code: 'wind_strong', severity: 'avoid', value: round1(strongest), at: null });
    else if (strongest > wind.cautionKph) reasons.push({ code: 'wind_moderate', severity: 'caution', value: round1(strongest), at: null });
    else if (strongest < wind.calmKph) reasons.push({ code: 'wind_calm', severity: 'caution', value: round1(strongest), at: null });
  }
  const gusts = values(sprayHours, 'gustKph');
  if (gusts.length && Math.max(...gusts) > wind.avoidGustKph) {
    reasons.push({ code: 'gusts_strong', severity: 'avoid', value: round1(Math.max(...gusts)), at: null });
  }

  const temperatures = values(sprayHours, 'temperatureC');
  if (temperatures.length) {
    const hottest = Math.max(...temperatures);
    if (hottest >= config.heat.avoidC) reasons.push({ code: 'too_hot', severity: 'avoid', value: round1(hottest), at: null });
    else if (hottest >= config.heat.cautionC) reasons.push({ code: 'hot', severity: 'caution', value: round1(hottest), at: null });
  }

  const humidities = values(sprayHours, 'humidityPct');
  if (humidities.length && Math.min(...humidities) < config.humidity.cautionBelowPct) {
    reasons.push({ code: 'dry_air', severity: 'caution', value: Math.round(Math.min(...humidities)), at: null });
  }

  if (checkDaylight && !isDaylight(startMs, config)) {
    reasons.push({ code: 'dark', severity: 'caution', value: null, at: null });
  }

  reasons.sort((a, b) => SEVERITY_RANK[b.severity] - SEVERITY_RANK[a.severity]);
  const verdict = reasons.some(reason => reason.severity === 'avoid') ? 'avoid' : reasons.length ? 'caution' : 'safe';
  return { verdict, reasons };
}

/** The first daylight spray round after fromMs with no reason for caution, or null. */
export function findNextSprayWindow(hours, fromMs, config = SPRAY_CONFIG) {
  const sprayMs = config.sprayHours * HOUR_MS;
  const limit = fromMs + config.searchHours * HOUR_MS;
  for (let start = Math.ceil(fromMs / HOUR_MS) * HOUR_MS; start < limit; start += HOUR_MS) {
    if (!isDaylight(start, config) || !isDaylight(start + sprayMs - 1, config)) continue;
    if (evaluateSprayWindow(hours, start, config, { checkDaylight: false }).verdict === 'safe') {
      return { start, end: start + sprayMs };
    }
  }
  return null;
}

/**
 * Advice for spraying now, plus the next good window when now is not safe.
 * Times in the result are milliseconds since the epoch.
 */
export function adviseSpraying(hours, now, config = SPRAY_CONFIG) {
  const sorted = normalizeHours(hours);
  const current = evaluateSprayWindow(sorted, now, config);
  return {
    verdict: current.verdict,
    reasons: current.reasons,
    checkedHours: config.rainFreeHours,
    searchedHours: config.searchHours,
    nextSafeWindow: current.verdict === 'safe' ? null : findNextSprayWindow(sorted, now, config),
    evaluatedAt: now,
  };
}
