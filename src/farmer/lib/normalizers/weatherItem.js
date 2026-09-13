// Spraying advice from GET /api/farmer/weather -> a DashboardItem.
//   avoid   -> warning (the farmer should not spray today as planned)
//   caution -> info
//   safe    -> ok

import { createDashboardItem, toTimestamp } from '../dashboardItem.js';

const SEVERITY_BY_VERDICT = { avoid: 'warning', caution: 'info', safe: 'ok' };

export function normalizeWeather(data, { now = Date.now() } = {}) {
  if (data?.status !== 'ok' || !SEVERITY_BY_VERDICT[data.spray?.verdict]) return null;
  const { spray } = data;

  return createDashboardItem({
    id: 'weather:spray',
    source: 'weather',
    kind: `weather.spray_${spray.verdict}`,
    severity: SEVERITY_BY_VERDICT[spray.verdict],
    // The advice is about spraying now.
    dueAt: now,
    occurredAt: toTimestamp(spray.evaluatedAt),
    fetchedAt: toTimestamp(data.fetchedAt),
    weatherSensitive: true,
    payload: {
      verdict: spray.verdict,
      reasons: Array.isArray(spray.reasons) ? spray.reasons : [],
      nextSafeWindow: spray.nextSafeWindow || null,
      checkedHours: spray.checkedHours,
      searchedHours: spray.searchedHours,
    },
  });
}
