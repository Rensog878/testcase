// GET /api/farmer/notifications (src/farmer/contracts/notifications.md) -> DashboardItems.
// A notification that repeats an item already on the dashboard (same
// sourceItemId) is skipped, so nothing shows twice.

import { createDashboardItem, SEVERITIES, toTimestamp } from '../dashboardItem.js';

export function normalizeNotifications(data, { knownItemIds = [] } = {}) {
  if (!Array.isArray(data?.items)) return [];
  const known = new Set(knownItemIds);

  return data.items
    .filter(item => item?.id && item.kind && SEVERITIES.includes(item.severity))
    .filter(item => !item.sourceItemId || !known.has(item.sourceItemId))
    .map(item => createDashboardItem({
      id: `notification:${item.id}`,
      source: 'notification',
      kind: `notification.${item.kind}`,
      severity: item.severity,
      occurredAt: toTimestamp(item.createdAt),
      fetchedAt: toTimestamp(data.fetchedAt),
      payload: {
        notificationId: item.id,
        kind: item.kind,
        params: item.params || {},
        sourceItemId: item.sourceItemId || null,
        readAt: item.readAt || null,
        delivery: item.delivery || {},
      },
    }));
}
