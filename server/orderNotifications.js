/**
 * Customer WhatsApp notifications for orders.
 *
 * A notification never blocks or fails an order: the order is already saved
 * when this runs, and the outcome is recorded on the order
 * (notifications.orderConfirmation) so an admin can see it and resend.
 *
 * Optional settings:
 *   ORDER_WHATSAPP_MESSAGES=off   Turn order messages off (OTPs are unaffected).
 *   PUBLIC_SITE_URL               Base URL for the tracking link, e.g. https://shop.example.com
 *   ORDER_ALERT_PHONES            Staff mobiles (comma separated) told about every new order.
 */

import { db } from './db.js';
import { sendWhatsAppText, whatsAppConfigured } from './whatsapp.js';
import { buildOrderConfirmationMessage, buildDeliveryStatusMessage, buildStaffOrderAlert } from './orderMessages.js';
import { publicSiteUrl } from './publicUrl.js';

const MAX_AUTOMATIC_ATTEMPTS = 3;

export function orderWhatsAppEnabled() {
  return whatsAppConfigured()
    && String(process.env.ORDER_WHATSAPP_MESSAGES || '').toLowerCase() !== 'off';
}

function whatsAppNumber(phone) {
  const digits = String(phone || '').replace(/\D/g, '').slice(-10);
  return /^[6-9]\d{9}$/.test(digits) ? digits : null;
}

// Sends the order confirmation at most once. Safe to call from every place an
// order is finalised (checkout callback, Razorpay webhook, cash on delivery):
// the first call claims the send and the rest return 'skipped'. A failed send is
// retried by later calls, up to MAX_AUTOMATIC_ATTEMPTS. `resend` is for admins.
//
// Returns 'sent' | 'failed' | 'skipped' | 'disabled'.
export async function sendOrderConfirmation(order, { resend = false } = {}) {
  if (!order?.id) return 'skipped';
  if (!orderWhatsAppEnabled()) return 'disabled';

  const claimed = await db.claimOrderNotification(order.id, 'orderConfirmation', {
    resend,
    maxAttempts: MAX_AUTOMATIC_ATTEMPTS,
  });
  if (!claimed) return 'skipped';

  const phone = whatsAppNumber(order.customerPhone);
  if (!phone) {
    await db.recordOrderNotification(order.id, 'orderConfirmation', 'failed', 'No valid mobile number on the order');
    return 'failed';
  }

  try {
    const cms = await db.getCMS().catch(() => ({}));
    const siteUrl = publicSiteUrl();
    const text = buildOrderConfirmationMessage(order, {
      trackUrl: siteUrl ? `${siteUrl}/orders` : '',
      supportPhone: cms?.contactPhone,
    });

    const { sender } = await sendWhatsAppText(phone, text);
    await db.recordOrderNotification(order.id, 'orderConfirmation', 'sent', '', { sender });
    console.log(`📲 Order confirmation for ${order.id} sent to +91 ${phone} via ${sender}`);
    return 'sent';
  } catch (err) {
    console.error(`❌ Order confirmation for ${order.id} failed:`, err.message);
    await db.recordOrderNotification(order.id, 'orderConfirmation', 'failed', err.message).catch(() => {});
    return 'failed';
  }
}

export async function sendDeliveryStatusUpdate(order, newStatus) {
  if (!order?.id || !orderWhatsAppEnabled()) return 'disabled';
  const validStatuses = ['Dispatched', 'Out for Delivery', 'Delivered'];
  if (!validStatuses.includes(newStatus)) return 'skipped';

  const kind = `delivery_${newStatus.replace(/\s+/g, '')}`;
  const claimed = await db.claimOrderNotification(order.id, kind, { maxAttempts: 3 });
  if (!claimed) return 'skipped';

  const phone = whatsAppNumber(order.customerPhone);
  if (!phone) {
    await db.recordOrderNotification(order.id, kind, 'failed', 'No valid mobile number on order');
    return 'failed';
  }

  try {
    const cms = await db.getCMS().catch(() => ({}));
    const siteUrl = publicSiteUrl();
    const text = buildDeliveryStatusMessage(order, newStatus, {
      trackUrl: siteUrl ? `${siteUrl}/orders` : '',
      supportPhone: cms?.contactPhone,
    });
    if (!text) return 'skipped';

    const { sender } = await sendWhatsAppText(phone, text);
    await db.recordOrderNotification(order.id, kind, 'sent', '', { sender });
    console.log(`📲 Delivery status update (${newStatus}) for ${order.id} sent to +91 ${phone} via ${sender}`);
    return 'sent';
  } catch (err) {
    console.error(`❌ Delivery status update (${newStatus}) for ${order.id} failed:`, err.message);
    await db.recordOrderNotification(order.id, kind, 'failed', err.message).catch(() => {});
    return 'failed';
  }
}


function staffAlertNumbers() {
  const numbers = String(process.env.ORDER_ALERT_PHONES || '').split(',').map(whatsAppNumber).filter(Boolean);
  return [...new Set(numbers)];
}

// Tells staff about a new order, at most once per order (checkout callback and
// webhook may both call it). Does nothing unless ORDER_ALERT_PHONES is set.
// Returns 'sent' | 'failed' | 'skipped' | 'disabled'.
export async function sendStaffOrderAlert(order) {
  const numbers = staffAlertNumbers();
  if (!order?.id || !numbers.length || !orderWhatsAppEnabled()) return 'disabled';

  const claimed = await db.claimOrderNotification(order.id, 'staffAlert', { maxAttempts: MAX_AUTOMATIC_ATTEMPTS });
  if (!claimed) return 'skipped';

  const siteUrl = publicSiteUrl();
  const text = buildStaffOrderAlert(order, { adminUrl: siteUrl ? `${siteUrl}/admin/orders` : '' });
  let sent = 0;
  let lastError = '';
  for (const phone of numbers) {
    try {
      await sendWhatsAppText(phone, text);
      sent += 1;
    } catch (err) {
      lastError = err.message;
      console.error(`❌ Staff alert for ${order.id} to +91 ${phone} failed:`, err.message);
    }
  }
  const status = sent ? 'sent' : 'failed';
  await db.recordOrderNotification(order.id, 'staffAlert', status, sent ? '' : lastError).catch(() => {});
  return status;
}
