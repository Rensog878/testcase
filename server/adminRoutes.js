import express from 'express';
import { db, USER_ROLES } from './db.js';
import { HttpError, sendError, userInputError, clientIp, requireModule } from './http.js';
import { orderWhatsAppEnabled, sendOrderConfirmation } from './orderNotifications.js';
import { getWhatsAppSenderStatus } from './whatsapp.js';

// Every route in this file is mounted behind requireAuth('admin') in server.js,
// so req.user is always the signed-in admin.
const router = express.Router();

const USER_FIELDS = [
  'name', 'phone', 'email', 'password', 'role', 'crop', 'acreage',
  'village', 'district', 'state', 'department', 'status',
  'storeId', 'storeName', 'storeLocation', 'assignedAdminId', 'assignedAdminName', 'permissions'
];
const USER_STATUSES = ['active', 'inactive'];

// Only known user fields are accepted, so a request cannot set ids, createdBy,
// timestamps or anything else by adding it to the body.
function pickUserFields(body) {
    const picked = {};
    for (const field of USER_FIELDS) {
        if (body?.[field] !== undefined) picked[field] = body[field];
    }

    if (picked.phone !== undefined) {
        picked.phone = String(picked.phone).trim();
        if (picked.phone && !/^[6-9]\d{9}$/.test(picked.phone)) {
            throw new HttpError(400, 'Please enter a valid 10-digit mobile number.');
        }
    }
    if (picked.email !== undefined) {
        picked.email = String(picked.email).trim().toLowerCase();
        if (picked.email && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(picked.email)) {
            throw new HttpError(400, 'Please enter a valid email address.');
        }
    }
    if (picked.role !== undefined && !USER_ROLES.includes(picked.role)) {
        throw new HttpError(400, 'Unknown user role.');
    }
    if (picked.status !== undefined && !USER_STATUSES.includes(picked.status)) {
        throw new HttpError(400, 'Unknown account status.');
    }
    return picked;
}

// The super admin passes every requireAuth check, so only a super admin may
// hand that role out, change a super admin's account or set permissions.
// Without this a store admin could promote themselves through this panel.
async function guardSuperadmin(req, picked, targetId) {
    if (req.user.role === 'superadmin') return;
    if (picked.role === 'superadmin' || picked.permissions !== undefined) {
        throw new HttpError(403, 'Only the super admin can grant super admin access or permissions.');
    }
    if (targetId) {
        const target = await db.getUserById(targetId);
        if (target?.role === 'superadmin') {
            throw new HttpError(403, 'Only the super admin can change this account.');
        }
    }
}

function matchesSearch(user, search) {
    const needle = String(search).toLowerCase();
    return ['name', 'phone', 'email', 'crop', 'village', 'district', 'state'].some((key) =>
          String(user[key] || '').toLowerCase().includes(needle)
                                                                                     );
}

router.get('/users', requireModule(['users', 'orders', 'products']), async (req, res) => {
    try {
          const { role, sortBy, search } = req.query;
          // Super admin accounts are never listed: not their number, not that they exist.
          let users = (await db.getUsers()).filter(u => u.role !== 'superadmin');

      if (role && role !== 'all') {
              users = users.filter((u) => u.role === role);
      }
          if (search) {
                  users = users.filter((u) => matchesSearch(u, search));
          }

      users = users.slice();
          if (sortBy === 'name') {
                  users.sort((a, b) => String(a.name || '').localeCompare(String(b.name || '')));
          } else {
                  users.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
          }

      res.json({ success: true, data: users });
    } catch (err) {
          sendError(res, err, 'List users');
    }
});

router.post('/users', requireModule('users'), async (req, res) => {
    try {
          if (!req.body?.phone && !req.body?.email) {
                throw new HttpError(400, 'Please provide a mobile number or email address.');
          }
          const picked = pickUserFields(req.body);
          await guardSuperadmin(req, picked);
          const user = await db.createUser({ ...picked, createdBy: req.user.role });
          res.json({ success: true, user });
    } catch (err) {
          sendError(res, userInputError(err), 'Create user');
    }
});

router.put('/users/:id', requireModule('users'), async (req, res) => {
    try {
          const updates = pickUserFields(req.body);
          await guardSuperadmin(req, updates, req.params.id);

          // Stop an admin locking themselves out of the admin panel.
          if (req.params.id === req.user.id && ((updates.role && updates.role !== req.user.role) || (updates.status && updates.status !== 'active'))) {
                throw new HttpError(400, 'You cannot remove your own admin access.');
          }

          const user = await db.updateUser(req.params.id, updates);
          if (!user) {
                return res.status(404).json({ success: false, message: 'User not found' });
          }
          res.json({ success: true, user });
    } catch (err) {
          sendError(res, userInputError(err), 'Update user');
    }
});

router.delete('/users/:id', requireModule('users'), async (req, res) => {
    try {
          if (req.params.id === req.user.id) {
                throw new HttpError(400, 'You cannot delete your own account.');
          }
          await guardSuperadmin(req, {}, req.params.id);
          const ok = await db.deleteUser(req.params.id);
          if (!ok) {
                return res.status(404).json({ success: false, message: 'User not found' });
          }
          res.json({ success: true });
    } catch (err) {
          sendError(res, err, 'Delete user');
    }
});

router.get('/profile-fields', requireModule('profile-fields'), async (req, res) => {
    try {
          const fields = await db.getProfileFields();
          res.json({ success: true, data: fields });
    } catch (err) {
          sendError(res, err, 'Profile fields');
    }
});

router.put('/profile-fields', requireModule('profile-fields'), async (req, res) => {
    try {
          const fields = await db.saveProfileFields(req.body.fields || req.body);
          res.json({ success: true, data: fields });
    } catch (err) {
          sendError(res, err, 'Save profile fields');
    }
});

// Sends, or sends again, the WhatsApp order confirmation to the customer.
router.post('/orders/:id/whatsapp', requireModule('orders'), async (req, res) => {
    try {
          if (!orderWhatsAppEnabled()) {
                throw new HttpError(503, 'WhatsApp order messages are not configured on the server.');
          }
          const order = await db.getOrderById(req.params.id);
          if (!order) {
                return res.status(404).json({ success: false, message: 'Order not found' });
          }

          const status = await sendOrderConfirmation(order, { resend: true });
          if (status === 'skipped') {
                throw new HttpError(409, 'A message for this order is being sent right now. Please wait a moment.');
          }

          const notification = (await db.getOrderById(order.id))?.notifications?.orderConfirmation || null;
          if (status !== 'sent') {
                return res.status(502).json({ success: false, status, notification, message: `Could not send: ${notification?.error || 'unknown error'}` });
          }
          res.json({ success: true, status, notification, message: `Order details sent on WhatsApp to +91 ${order.customerPhone}.` });
    } catch (err) {
          sendError(res, err, 'Resend order WhatsApp');
    }
});

// Health of each WhatsApp sending number: session state, resting, sends today.
router.get('/whatsapp/senders', requireModule(['orders', 'subscribers']), async (req, res) => {
    try {
          res.json({ success: true, data: await getWhatsAppSenderStatus() });
    } catch (err) {
          sendError(res, err, 'WhatsApp sender status');
    }
});

// Which address the rate limits see for the caller, next to the raw proxy
// chain, so TRUSTED_PROXY_HOPS can be checked against the real hosting setup.
router.get('/client-ip', (req, res) => {
    res.json({
          success: true,
          ip: clientIp(req),
          forwardedFor: req.headers['x-forwarded-for'] || '',
          socket: req.socket?.remoteAddress || '',
          hops: process.env.TRUSTED_PROXY_HOPS ?? '1',
    });
});

// Live numbers for the admin dashboard cards.
router.get('/stats', requireModule('overview'), async (req, res) => {
    try {
          // superadmin never has a storeId, so this always resolves to the
          // company-wide view for them, whichever store they last opened.
          const data = await db.getAdminStats(req.user.role === 'admin' ? (req.user.storeId || '') : '');
          res.json({ success: true, data });
    } catch (err) {
          sendError(res, err, 'Admin stats');
    }
});

router.get('/wishlist-summary', requireModule(['overview', 'analytics', 'products']), async (req, res) => {
    try {
          const items = await db.getWishlists();
          const products = await db.getProducts();
          const data = products.map(product => ({
                productId: product.id,
                productName: product.name,
                wishlistCount: items.filter(item => item.productId === product.id).length
          })).filter(item => item.wishlistCount > 0).sort((a, b) => b.wishlistCount - a.wishlistCount);
          res.json({ success: true, total: items.length, data });
    } catch (err) {
          sendError(res, err, 'Wishlist summary');
    }
});

// ─────────────────────────────────────────────────────────────────────────────
// ANALYTICS  GET /api/admin/analytics?from=ISO&to=ISO&channel=online|offline|both
// Returns live aggregated KPIs, trend, top products, and regional breakdown.
// ─────────────────────────────────────────────────────────────────────────────
router.get('/analytics', requireModule('analytics'), async (req, res) => {
    try {
        // A store-scoped admin has no online data to show (one storefront,
        // not one per branch - see getAdminStats) and their offline side is
        // their own store's invoices only, not every branch's.
        const storeId = req.user.role === 'admin' ? (req.user.storeId || '') : '';
        const channel = storeId ? 'offline' : (req.query.channel || req.query.mode || 'both').toLowerCase();

        // Resolve the date window.
        const IST_OFFSET_MS = 330 * 60 * 1000;
        const DAY_MS       = 24 * 60 * 60 * 1000;
        const now          = Date.now();

        let fromMs, toMs;
        if (req.query.from && req.query.to) {
            fromMs = new Date(req.query.from).getTime();
            toMs   = new Date(req.query.to).getTime();
        } else {
            const period = req.query.period || 'month';
            const todayStartIst = Math.floor((now + IST_OFFSET_MS) / DAY_MS) * DAY_MS - IST_OFFSET_MS;
            if (period === 'day') {
                fromMs = todayStartIst;
                toMs   = todayStartIst + DAY_MS;
            } else if (period === 'week') {
                fromMs = todayStartIst - 6 * DAY_MS;
                toMs   = todayStartIst + DAY_MS;
            } else {
                // month
                const istNow = new Date(now + IST_OFFSET_MS);
                fromMs = new Date(Date.UTC(istNow.getUTCFullYear(), istNow.getUTCMonth(), 1)).getTime() - IST_OFFSET_MS;
                toMs   = new Date(Date.UTC(istNow.getUTCFullYear(), istNow.getUTCMonth() + 1, 1)).getTime() - IST_OFFSET_MS;
            }
        }

        const [allOrders, allInvoices] = await Promise.all([
            storeId ? [] : db.getOrders(),
            db.getInvoices(storeId ? { storeId } : {})
        ]);

        const onlineTx = allOrders.map(o => ({
            id:             o.id,
            date:           o.createdAt,
            timeMs:         new Date(o.createdAt).getTime(),
            customer:       o.customerName || 'Guest',
            phone:          o.customerPhone || '',
            district:       o.district || o.state || 'Online Web',
            state:          o.state || 'Tamil Nadu',
            items:          Array.isArray(o.items) ? o.items : [],
            itemSummary:    Array.isArray(o.items) ? o.items.map(i => `${i.name || '?'} x${i.qty || 1}`).join(', ') : '',
            total:          Number(o.total) || 0,
            // A cancelled order is not revenue, even if it was paid (refunded).
            isPaid:         o.paymentStatus === 'Paid' && (o.deliveryStatus || o.status) !== 'Cancelled',
            paymentStatus:  o.paymentStatus || 'Pending',
            paymentMethod:  o.paymentMethod || 'Razorpay / Online',
            deliveryStatus: o.deliveryStatus || o.status || 'Pending',
            channel:        'online',
            cashier:        'Web Store'
        }));

        const offlineTx = allInvoices.map(inv => ({
            id:             inv.id,
            date:           inv.date,
            timeMs:         new Date(inv.date).getTime(),
            customer:       inv.customerName || 'Walk-in Customer',
            phone:          inv.customerPhone || '',
            district:       'Billing Counter',
            state:          'Tamil Nadu',
            items:          Array.isArray(inv.items) ? inv.items : [],
            itemSummary:    Array.isArray(inv.items) ? inv.items.map(i => `${i.name || '?'} x${i.qty || 1}`).join(', ') : '',
            total:          Number(inv.grandTotal) || 0,
            isPaid:         String(inv.status).toUpperCase() === 'PAID',
            paymentStatus:  'Paid',
            paymentMethod:  inv.paymentMode || 'Cash',
            deliveryStatus: 'Completed (POS Counter)',
            channel:        'offline',
            cashier:        inv.cashier || 'Counter Cashier'
        }));

        const inWindow = tx => tx.timeMs >= fromMs && tx.timeMs < toMs;
        const windowOnline = onlineTx.filter(inWindow);
        const windowOffline = offlineTx.filter(inWindow);

        let selectedTx = [];
        if (channel === 'online') {
            selectedTx = windowOnline;
        } else if (channel === 'offline') {
            selectedTx = windowOffline;
        } else {
            selectedTx = [...windowOnline, ...windowOffline].sort((a, b) => b.timeMs - a.timeMs);
        }

        const paidTx = selectedTx.filter(t => t.isPaid);

        // ── KPI cards ──────────────────────────────────────────────────────
        const totalRevenue = Math.round(paidTx.reduce((s, t) => s + (Number(t.total) || 0), 0) * 100) / 100;
        const onlineRevenue = Math.round(windowOnline.filter(t => t.isPaid).reduce((s, t) => s + (Number(t.total) || 0), 0) * 100) / 100;
        const offlineRevenue = Math.round(windowOffline.filter(t => t.isPaid).reduce((s, t) => s + (Number(t.total) || 0), 0) * 100) / 100;

        const totalOrders = selectedTx.length;
        const paidOrders  = paidTx.length;
        const onlineOrdersCount = windowOnline.length;
        const offlineOrdersCount = windowOffline.length;

        // Unique customers
        const uniqueCustomers = new Set(
            selectedTx.map(t => t.phone || t.customer).filter(Boolean)
        ).size;

        // Cancelled (online only)
        const cancelled = selectedTx.filter(t => t.deliveryStatus === 'Cancelled').length;
        const returnRate = totalOrders > 0 ? ((cancelled / totalOrders) * 100).toFixed(1) : '0.0';

        // ── Revenue trend (grouped by day in the window) ─────────────────
        const dayBuckets = {};
        const dayCount = Math.max(1, Math.ceil((toMs - fromMs) / DAY_MS));
        for (let d = 0; d < dayCount; d++) {
            const dayStart = fromMs + d * DAY_MS;
            const dayEnd   = dayStart + DAY_MS;
            const dayLabel = new Date(dayStart + IST_OFFSET_MS).toISOString().slice(0, 10);
            const dayRevenue = paidTx
                .filter(t => t.timeMs >= dayStart && t.timeMs < dayEnd)
                .reduce((s, t) => s + (Number(t.total) || 0), 0);
            dayBuckets[dayLabel] = Math.round(dayRevenue * 100) / 100;
        }

        // ── Top products ───────────────────────────────────────────────────
        const productMap = {};
        for (const tx of paidTx) {
            for (const item of tx.items) {
                const name = item.name || item.productName || 'Unknown';
                if (!productMap[name]) productMap[name] = { sold: 0, revenue: 0 };
                productMap[name].sold    += Number(item.qty) || 1;
                productMap[name].revenue += (Number(item.qty) || 1) * (Number(item.price) || 0);
            }
        }
        const topProducts = Object.entries(productMap)
            .map(([name, v]) => ({ name, sold: v.sold, revenue: Math.round(v.revenue * 100) / 100 }))
            .sort((a, b) => b.revenue - a.revenue)
            .slice(0, 10);

        // ── Regional / Channel breakdown ──────────────────────────────────
        const regionMap = {};
        for (const tx of paidTx) {
            const region = tx.channel === 'offline' ? 'Counter POS' : (tx.district || tx.state || 'Online Web');
            if (!regionMap[region]) regionMap[region] = { orders: 0, revenue: 0 };
            regionMap[region].orders  += 1;
            regionMap[region].revenue += Number(tx.total) || 0;
        }
        const regions = Object.entries(regionMap)
            .map(([region, v]) => ({ region, orders: v.orders, revenue: Math.round(v.revenue * 100) / 100 }))
            .sort((a, b) => b.revenue - a.revenue)
            .slice(0, 10);

        const maxOrd = regions[0]?.orders || 1;
        regions.forEach(r => { r.share = Math.round((r.orders / maxOrd) * 100); });

        // ── Delivery / Status Mix ─────────────────────────────────────────
        const statusMap = {};
        for (const tx of selectedTx) {
            const s = tx.deliveryStatus || 'Completed';
            statusMap[s] = (statusMap[s] || 0) + 1;
        }
        const deliveryMix = Object.entries(statusMap).map(([name, value]) => ({ name, value }));

        // ── Channel Breakdown ─────────────────────────────────────────────
        const channelBreakdown = {
            online:  { count: onlineOrdersCount, revenue: onlineRevenue },
            offline: { count: offlineOrdersCount, revenue: offlineRevenue }
        };

        res.json({
            success: true,
            data: {
                channel,
                storeScoped: Boolean(storeId),
                kpi: {
                    totalRevenue,
                    onlineRevenue,
                    offlineRevenue,
                    totalOrders,
                    onlineOrders: onlineOrdersCount,
                    offlineOrders: offlineOrdersCount,
                    paidOrders,
                    uniqueCustomers,
                    returnRate,
                    cancelled
                },
                channelBreakdown,
                trend: dayBuckets,
                topProducts,
                regions,
                deliveryMix,
                // Full order & invoice list for "actual data" view
                orders: selectedTx.slice(0, 500).map(t => ({
                    id:             t.id,
                    date:           t.date,
                    customer:       t.customer,
                    phone:          t.phone,
                    district:       t.district,
                    state:          t.state,
                    items:          t.itemSummary,
                    total:          t.total,
                    paymentStatus:  t.paymentStatus,
                    paymentMethod:  t.paymentMethod,
                    deliveryStatus: t.deliveryStatus,
                    channel:        t.channel,
                    cashier:        t.cashier
                })),
            },
        });
    } catch (err) {
        sendError(res, err, 'Analytics');
    }
});

export default router;

