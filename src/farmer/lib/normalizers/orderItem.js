// Orders from GET /api/orders -> DashboardItems.
//
// Delivery statuses come from the allowed list in server/server.js
// (PUT /api/orders/:id/status). Rules for what the farmer must act on:
//   Out for Delivery              critical  be home, keep cash ready if unpaid, share OTP only with the agent
//   past expected date, not done  warning   delayed; offer support
//   Dispatched, cash on delivery  warning   cash needed soon
//   Dispatched, paid              info
//   Pending / Assigned / Confirmed info
//   Delivered                     ok
//   Cancelled                     info

import { createDashboardItem, toTimestamp } from '../dashboardItem.js';

const STATUS_BY_TEXT = new Map([
  ['pending', 'pending'],
  ['assigned', 'assigned'],
  ['confirmed', 'confirmed'],
  ['dispatched', 'dispatched'],
  ['out for delivery', 'out_for_delivery'],
  ['delivered', 'delivered'],
  ['cancelled', 'cancelled'],
  ['canceled', 'cancelled'],
]);

const CLOSED_STATUSES = ['delivered', 'cancelled'];
const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000;

export function orderStatusId(order) {
  const text = String(order?.deliveryStatus || order?.status || '')
    .trim()
    .toLowerCase()
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ');
  // db.createOrder stores "Confirmed" when no status is given; order-status.html shows the same.
  if (!text) return 'confirmed';
  return STATUS_BY_TEXT.get(text) || 'unknown';
}

/**
 * End of the expected delivery day in India, for "YYYY-MM-DD" dates as written
 * by estimatedDeliveryDate() in server/orderMessages.js. Admins can type any
 * text into this field, so anything else is not interpreted.
 */
export function expectedDeliveryEnd(value) {
  if (typeof value !== 'string') return null;
  const match = value.trim().match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return null;
  const [year, month, day] = [Number(match[1]), Number(match[2]), Number(match[3])];
  const end = Date.UTC(year, month - 1, day, 23, 59, 59, 999) - IST_OFFSET_MS;
  const check = new Date(end + IST_OFFSET_MS);
  return check.getUTCMonth() === month - 1 && check.getUTCDate() === day ? end : null;
}

function summarizeItems(items) {
  return (Array.isArray(items) ? items : []).map(item => ({
    name: typeof item?.name === 'string' && item.name.trim() ? item.name.trim() : null,
    qty: Number(item?.qty) > 0 ? Number(item.qty) : 1,
  }));
}

export function normalizeOrder(order, { now = Date.now(), fetchedAt = null } = {}) {
  if (!order || !order.id) return null;

  const status = orderStatusId(order);
  const open = !CLOSED_STATUSES.includes(status);
  const paid = String(order.paymentStatus || '').trim().toLowerCase() === 'paid';
  const total = Number(order.total);
  const cashDue = !paid && Number.isFinite(total) && total > 0 ? total : null;
  const expectedAt = expectedDeliveryEnd(order.expectedDeliveryDate);
  const createdAt = toTimestamp(order.createdAt);

  let severity = 'info';
  let kind = 'order.processing';
  let dueAt = null;
  let occurredAt = toTimestamp(order.updatedAt) ?? createdAt;

  if (status === 'out_for_delivery') {
    severity = 'critical';
    kind = 'order.out_for_delivery';
    dueAt = now;
  } else if (open && expectedAt !== null && expectedAt < now) {
    severity = 'warning';
    kind = 'order.delayed';
    dueAt = expectedAt;
  } else if (status === 'dispatched') {
    severity = cashDue ? 'warning' : 'info';
    kind = cashDue ? 'order.dispatched_cash_due' : 'order.dispatched';
    dueAt = expectedAt;
  } else if (status === 'delivered') {
    severity = 'ok';
    kind = 'order.delivered';
    occurredAt = toTimestamp(order.deliveredAt) ?? occurredAt;
  } else if (status === 'cancelled') {
    kind = 'order.cancelled';
  } else if (status === 'unknown') {
    kind = 'order.unknown';
  } else {
    dueAt = expectedAt;
  }

  return createDashboardItem({
    id: `order:${order.id}`,
    source: 'order',
    kind,
    severity,
    cropIds: [],
    dueAt,
    occurredAt,
    fetchedAt,
    payload: {
      orderId: String(order.id),
      status,
      rawStatus: order.deliveryStatus || order.status || null,
      paid,
      cashDue,
      total: Number.isFinite(total) ? total : null,
      // Shown only while the order is still on its way.
      otp: open && order.otp ? String(order.otp) : null,
      expectedDeliveryDate: typeof order.expectedDeliveryDate === 'string' ? order.expectedDeliveryDate : null,
      expectedAt,
      createdAt,
      items: summarizeItems(order.items),
    },
  });
}

export function normalizeOrders(orders, options) {
  return (Array.isArray(orders) ? orders : []).map(order => normalizeOrder(order, options)).filter(Boolean);
}
