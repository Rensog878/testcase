// GET /api/farmer/analytics (src/farmer/contracts/farm-analytics.md) -> DashboardItems.
// Reorder reminders due soon (or overdue) are ranked; charts belong to an analytics card.

import { createDashboardItem, toTimestamp } from '../dashboardItem.js';

const DAY_MS = 24 * 60 * 60 * 1000;

export function normalizeFarmAnalytics(data, { now = Date.now(), dueWithinDays = 14 } = {}) {
  if (!Array.isArray(data?.reorder)) return [];

  return data.reorder
    .filter(entry => entry?.productId)
    .filter(entry => {
      const due = toTimestamp(entry.nextDueAt);
      return due !== null && due - now <= dueWithinDays * DAY_MS;
    })
    .map(entry => createDashboardItem({
      id: `analytics:reorder:${entry.productId}`,
      source: 'analytics',
      kind: 'analytics.reorder_due',
      severity: 'info',
      cropIds: Array.isArray(entry.cropIds) ? entry.cropIds : [],
      dueAt: toTimestamp(entry.nextDueAt),
      occurredAt: toTimestamp(entry.lastOrderedAt),
      fetchedAt: toTimestamp(data.fetchedAt),
      payload: {
        productId: entry.productId,
        name: entry.name,
        lastOrderedAt: entry.lastOrderedAt,
        intervalDays: entry.intervalDays,
        intervalSource: entry.intervalSource,
      },
    }));
}

/** Products the farmer has bought, for the purchaseHistory ranking factor. */
export function purchasedProductIds(data) {
  return (Array.isArray(data?.topProducts) ? data.topProducts : []).map(product => product.productId).filter(Boolean);
}
