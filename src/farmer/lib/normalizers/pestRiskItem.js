// GET /api/farmer/pest-risk (src/farmer/contracts/pest-disease-risk.md) -> DashboardItems.
//   high -> warning, moderate -> info, low -> not ranked

import { createDashboardItem, toTimestamp } from '../dashboardItem.js';

const SEVERITY_BY_LEVEL = { high: 'warning', moderate: 'info' };

export function normalizePestRisks(data) {
  if (data?.status !== 'ok' || !Array.isArray(data.risks)) return [];

  return data.risks
    .filter(risk => risk?.riskId && risk.cropId && SEVERITY_BY_LEVEL[risk.level])
    .map(risk => createDashboardItem({
      id: `pest:${risk.riskId}:${risk.window?.start ?? ''}`,
      source: 'pest_risk',
      kind: risk.threat?.type === 'pest' ? 'pest.pest_risk' : 'pest.disease_risk',
      severity: SEVERITY_BY_LEVEL[risk.level],
      cropIds: [risk.cropId],
      dueAt: toTimestamp(risk.window?.start),
      occurredAt: toTimestamp(data.evaluatedAt),
      fetchedAt: toTimestamp(data.weatherFetchedAt),
      weatherSensitive: true,
      payload: {
        riskId: risk.riskId,
        cropId: risk.cropId,
        threat: risk.threat,
        level: risk.level,
        score: typeof risk.score === 'number' ? Math.min(1, Math.max(0, risk.score)) : 0,
        window: risk.window,
        drivers: Array.isArray(risk.drivers) ? risk.drivers : [],
        advice: risk.advice || null,
        rule: risk.rule || null,
      },
    }));
}
