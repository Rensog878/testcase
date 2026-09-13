import { test } from 'node:test';
import assert from 'node:assert/strict';

import { SPRAY_CONFIG } from '../weather/sprayConfig.js';
import { adviseSpraying, evaluateSprayWindow, findNextSprayWindow, isDaylight, localHour } from '../weather/sprayAdvisor.js';

const HOUR = 60 * 60 * 1000;
// 13 Sep 2026, 09:00 in India (03:30 UTC).
const NINE_AM_IST = Date.UTC(2026, 8, 13, 3, 30);

// Hourly forecast from the start of `from`'s hour, good spraying weather unless overridden.
function forecast(count, overrides = {}, from = NINE_AM_IST) {
  const start = Math.floor(from / HOUR) * HOUR;
  return Array.from({ length: count }, (_, index) => ({
    time: start + index * HOUR,
    temperatureC: 29,
    humidityPct: 70,
    windKph: 6,
    gustKph: null,
    precipitationMm: 0,
    rainProbabilityPct: null,
    ...(overrides[index] || {}),
  }));
}

test('local hours are India Standard Time', () => {
  assert.equal(localHour(NINE_AM_IST), 9);
  assert.equal(isDaylight(NINE_AM_IST), true);
  assert.equal(isDaylight(Date.UTC(2026, 8, 13, 14, 0)), false); // 19:30 IST
});

test('calm, dry, mild morning is safe', () => {
  const advice = adviseSpraying(forecast(48), NINE_AM_IST);
  assert.equal(advice.verdict, 'safe');
  assert.deepEqual(advice.reasons, []);
  assert.equal(advice.nextSafeWindow, null);
});

test('rain within the rain-free hours: avoid by amount, caution for a trace', () => {
  const wet = evaluateSprayWindow(forecast(48, { 4: { precipitationMm: 0.7 }, 5: { precipitationMm: 0.6 } }), NINE_AM_IST);
  assert.equal(wet.verdict, 'avoid');
  assert.equal(wet.reasons[0].code, 'rain_expected');
  assert.equal(wet.reasons[0].value, 1.3);
  assert.equal(wet.reasons[0].at, forecast(48)[4].time);

  const trace = evaluateSprayWindow(forecast(48, { 2: { precipitationMm: 0.3 } }), NINE_AM_IST);
  assert.deepEqual([trace.verdict, trace.reasons[0].code], ['caution', 'rain_possible']);

  const afterWindow = evaluateSprayWindow(forecast(48, { 6: { precipitationMm: 5 } }), NINE_AM_IST);
  assert.equal(afterWindow.verdict, 'safe', 'rain after the rain-free hours does not count');
});

test('rain probability is used when the forecast has it', () => {
  const likely = evaluateSprayWindow(forecast(48, { 3: { rainProbabilityPct: 70 } }), NINE_AM_IST);
  assert.deepEqual([likely.verdict, likely.reasons[0].probabilityPct], ['avoid', 70]);
  const possible = evaluateSprayWindow(forecast(48, { 3: { rainProbabilityPct: 40 } }), NINE_AM_IST);
  assert.equal(possible.verdict, 'caution');
});

test('no rain data at all is not reported as dry', () => {
  const hours = forecast(48).map(hour => ({ ...hour, precipitationMm: null, rainProbabilityPct: null }));
  const result = evaluateSprayWindow(hours, NINE_AM_IST);
  assert.equal(result.verdict, 'caution');
  assert.equal(result.reasons[0].code, 'rain_unknown');
});

test('wind: strong avoids, moderate and dead calm need care, gusts avoid', () => {
  const code = overrides => evaluateSprayWindow(forecast(48, overrides), NINE_AM_IST).reasons.map(r => r.code);
  assert.deepEqual(code({ 1: { windKph: 18 } }), ['wind_strong']);
  assert.deepEqual(code({ 0: { windKph: 12 } }), ['wind_moderate']);
  assert.deepEqual(code({ 0: { windKph: 1 }, 1: { windKph: 1.5 } }), ['wind_calm']);
  assert.deepEqual(code({ 0: { gustKph: 30 } }), ['gusts_strong']);
  assert.deepEqual(code({ 0: { windKph: null }, 1: { windKph: null } }), ['wind_unknown']);
});

test('heat and dry air', () => {
  assert.deepEqual(evaluateSprayWindow(forecast(48, { 1: { temperatureC: 36 } }), NINE_AM_IST).reasons.map(r => [r.code, r.value]), [['too_hot', 36]]);
  assert.equal(evaluateSprayWindow(forecast(48, { 1: { temperatureC: 33 } }), NINE_AM_IST).verdict, 'caution');
  assert.deepEqual(evaluateSprayWindow(forecast(48, { 0: { humidityPct: 25 } }), NINE_AM_IST).reasons.map(r => r.code), ['dry_air']);
});

test('avoid reasons come before caution reasons', () => {
  const result = evaluateSprayWindow(forecast(48, { 0: { windKph: 12, temperatureC: 36 } }), NINE_AM_IST);
  assert.deepEqual(result.reasons.map(r => r.severity), ['avoid', 'caution']);
  assert.equal(result.verdict, 'avoid');
});

test('night: caution now, next window is the first safe daylight round', () => {
  const evening = Date.UTC(2026, 8, 13, 15, 0); // 20:30 IST
  const hours = forecast(48, {}, evening);
  const advice = adviseSpraying(hours, evening);
  assert.equal(advice.verdict, 'caution');
  assert.deepEqual(advice.reasons.map(r => r.code), ['dark']);
  // 06:00 IST on 14 Sep is 00:30 UTC.
  assert.equal(localHour(advice.nextSafeWindow.start), 6);
  assert.equal(advice.nextSafeWindow.end - advice.nextSafeWindow.start, SPRAY_CONFIG.sprayHours * HOUR);
});

test('rain now: the next window starts once six dry hours are ahead', () => {
  const hours = forecast(48, { 0: { precipitationMm: 2 }, 1: { precipitationMm: 2 } });
  const advice = adviseSpraying(hours, NINE_AM_IST);
  assert.equal(advice.verdict, 'avoid');
  assert.equal(advice.nextSafeWindow.start, hours[2].time);
});

test('short forecasts and no safe window are reported, not guessed', () => {
  assert.equal(evaluateSprayWindow(forecast(3), NINE_AM_IST).reasons[0].code, 'no_forecast');
  const stormy = forecast(60).map(hour => ({ ...hour, windKph: 30 }));
  assert.equal(findNextSprayWindow(stormy, NINE_AM_IST), null);
  assert.equal(adviseSpraying(stormy, NINE_AM_IST).nextSafeWindow, null);
});

test('ISO times and unsorted input are accepted', () => {
  const hours = forecast(48).map(hour => ({ ...hour, time: new Date(hour.time).toISOString() })).reverse();
  assert.equal(adviseSpraying(hours, NINE_AM_IST).verdict, 'safe');
});
