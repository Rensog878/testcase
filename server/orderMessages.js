/**
 * WhatsApp message text for orders. WhatsApp renders *bold* and _italic_.
 */

const INDIA_TZ = 'Asia/Kolkata';
const DAY_MS = 24 * 60 * 60 * 1000;
const MAX_ITEM_LINES = 15;

const rupees = (value) => `₹${Number(value || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;

function formatDateTime(iso) {
  return new Intl.DateTimeFormat('en-IN', {
    timeZone: INDIA_TZ, day: 'numeric', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit',
  }).format(new Date(iso));
}

function formatDate(value) {
  // A bare YYYY-MM-DD is a calendar day in India; noon UTC keeps it on that day.
  const date = /^\d{4}-\d{2}-\d{2}$/.test(String(value)) ? new Date(`${value}T12:00:00Z`) : new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return new Intl.DateTimeFormat('en-IN', {
    timeZone: INDIA_TZ, weekday: 'short', day: 'numeric', month: 'short', year: 'numeric',
  }).format(date);
}

// The expected delivery day (YYYY-MM-DD, India time) for an order placed now.
// Override the lead time with DELIVERY_ESTIMATE_DAYS.
export function estimatedDeliveryDate(from = new Date()) {
  const days = Number(process.env.DELIVERY_ESTIMATE_DAYS) || 5;
  return new Intl.DateTimeFormat('en-CA', { timeZone: INDIA_TZ }).format(new Date(from.getTime() + days * DAY_MS));
}

export function buildOrderConfirmationMessage(order, { trackUrl = '', supportPhone = '' } = {}) {
  const firstName = String(order.customerName || '').trim().split(/\s+/)[0] || 'there';
  const items = Array.isArray(order.items) ? order.items : [];

  const itemLines = items.slice(0, MAX_ITEM_LINES).map((item) => {
    const pack = item.packSize || item.selectedPack;
    const qty = Number(item.qty) || 1;
    return `• ${item.name || 'Product'}${pack ? ` (${pack})` : ''} × ${qty} — ${rupees(Number(item.price) * qty)}`;
  });
  if (items.length > MAX_ITEM_LINES) {
    itemLines.push(`• …and ${items.length - MAX_ITEM_LINES} more item(s)`);
  }

  const payment = order.paymentStatus === 'Paid'
    ? `*Payment:* Paid online ✔${order.paymentId ? ` (Ref: ${order.paymentId})` : ''}`
    : `*Payment:* Cash on Delivery — please keep ${rupees(order.total)} ready`;

  const expected = order.stockShortfall
    ? '_Some items are being restocked. We will confirm your delivery date shortly._'
    : order.expectedDeliveryDate && formatDate(order.expectedDeliveryDate)
      ? `Expected by: *${formatDate(order.expectedDeliveryDate)}*`
      : null;

  const lines = [
    `Hi ${firstName}, your Sathyam Agro Mart order is confirmed ✅`,
    '',
    `*Order ID:* ${order.id}`,
    `*Placed on:* ${formatDateTime(order.createdAt)}`,
    '',
    '*Items*',
    ...itemLines,
    '',
    `Subtotal: ${rupees(order.subtotal)}`,
    `GST (18%): ${rupees(order.gst)}`,
    `*Total: ${rupees(order.total)}*`,
    '',
    payment,
    '',
    '*Delivery details* 🚚',
    `Address: ${order.address}`,
    expected,
    order.otp ? `Delivery OTP: *${order.otp}*` : null,
    order.otp ? '_Share this OTP only with our delivery agent when you receive your parcel._' : null,
    '',
    trackUrl ? `Track your order: ${trackUrl}` : null,
    supportPhone ? `Need help? Call or WhatsApp ${supportPhone}` : null,
    '',
    'Thank you for choosing Sathyam Agro Mart 🌿',
  ];

  return lines.filter((line) => line !== null).join('\n').replace(/\n{3,}/g, '\n\n');
}

export function buildDeliveryStatusMessage(order, newStatus, { trackUrl = '', supportPhone = '' } = {}) {
  const firstName = String(order.customerName || '').trim().split(/\s+/)[0] || 'there';
  const orderId = order.id;
  const agent = order.assignedDeliveryBoy && order.assignedDeliveryBoy !== 'Unassigned' ? order.assignedDeliveryBoy : null;
  const agentPhone = order.deliveryBoyPhone || null;

  if (newStatus === 'Delivered') {
    return [
      `Hi ${firstName}, your Sathyam Agro Mart order *${orderId}* has been delivered successfully! 🎉`,
      '',
      `Delivered on: ${formatDateTime(new Date().toISOString())}`,
      `Address: ${order.address}`,
      '',
      'Thank you for trusting Sathyam Agro Mart for your farm crop protection 🌿',
      supportPhone ? `Agronomist helpline & feedback: ${supportPhone}` : null,
    ].filter(Boolean).join('\n');
  }

  if (newStatus === 'Out for Delivery') {
    return [
      `Hi ${firstName}, your Sathyam Agro Mart order *${orderId}* is *OUT FOR DELIVERY* today! 🛵`,
      '',
      agent ? `Delivery Agent: *${agent}*${agentPhone ? ` (Ph: ${agentPhone})` : ''}` : null,
      order.paymentStatus !== 'Paid' ? `*Payment:* Cash on Delivery — please keep ${rupees(order.total)} ready` : '*Payment:* Paid online ✔',
      order.otp ? `Your Delivery OTP: *${order.otp}*` : null,
      order.otp ? '_Please verify your package and share this OTP with our delivery agent to accept delivery._' : null,
      '',
      trackUrl ? `Live tracking: ${trackUrl}` : null,
      supportPhone ? `Need help? Call ${supportPhone}` : null,
    ].filter(Boolean).join('\n');
  }

  if (newStatus === 'Dispatched') {
    const expected = order.expectedDeliveryDate && formatDate(order.expectedDeliveryDate)
      ? `Expected delivery: *${formatDate(order.expectedDeliveryDate)}*`
      : null;
    return [
      `Hi ${firstName}, your Sathyam Agro Mart order *${orderId}* has been dispatched! 📦`,
      '',
      expected,
      agent ? `Assigned Delivery Partner: *${agent}*` : null,
      `Delivery Address: ${order.address}`,
      order.otp ? `Delivery OTP: *${order.otp}* (keep this secret until parcel arrives)` : null,
      '',
      trackUrl ? `Track your order: ${trackUrl}` : null,
    ].filter(Boolean).join('\n');
  }

  return null;
}


// The short alert staff get when a new order comes in (ORDER_ALERT_PHONES).
export function buildStaffOrderAlert(order, { adminUrl = '' } = {}) {
  const items = (order.items || []).map((item) => `• ${item.name}${item.packSize ? ` (${item.packSize})` : ''} × ${item.qty}`);
  const place = [order.addressDetails?.taluk || order.addressDetails?.area, order.district || order.addressDetails?.district].filter(Boolean).join(', ');
  return [
    `🛒 New order *${order.id}* — ${rupees(order.total)} (${order.paymentMethod || 'Cash on Delivery'})`,
    `${order.customerName || 'Customer'} · ${order.customerPhone || ''}${place ? ` · ${place}` : ''}`,
    '',
    ...items,
    '',
    adminUrl ? `Assign a delivery agent: ${adminUrl}` : 'Assign a delivery agent in Admin → Orders.',
  ].join('\n');
}
