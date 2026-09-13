// GET /api/farmer/advisories (src/farmer/contracts/advisory-feed.md) -> DashboardItems.
// Advice outside its validity window is dropped (a cached list can outlive it).

import { createDashboardItem, toTimestamp } from '../dashboardItem.js';

const ADVISORY_SEVERITIES = ['warning', 'info'];

export function normalizeAdvisories(data, { now = Date.now() } = {}) {
  if (!Array.isArray(data?.items)) return [];

  return data.items
    .filter(advisory => advisory?.id && ADVISORY_SEVERITIES.includes(advisory.severity))
    .filter(advisory => {
      const from = toTimestamp(advisory.validFrom);
      const until = toTimestamp(advisory.validUntil);
      return (from === null || from <= now) && (until === null || now <= until);
    })
    .map(advisory => createDashboardItem({
      id: `advisory:${advisory.id}`,
      source: 'advisory',
      kind: 'advisory.post',
      severity: advisory.severity,
      cropIds: Array.isArray(advisory.cropIds) ? advisory.cropIds : [],
      dueAt: toTimestamp(advisory.validUntil),
      occurredAt: toTimestamp(advisory.publishedAt),
      fetchedAt: toTimestamp(data.fetchedAt),
      payload: {
        advisoryId: advisory.id,
        title: advisory.title,
        summary: advisory.summary,
        translated: advisory.translated !== false,
        districts: Array.isArray(advisory.districts) ? advisory.districts : [],
        seasons: Array.isArray(advisory.seasons) ? advisory.seasons : [],
        productIds: Array.isArray(advisory.productIds) ? advisory.productIds : [],
        author: advisory.author || null,
      },
    }));
}
