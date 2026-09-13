import express from 'express';
import { db, USER_ROLES } from './db.js';
import { HttpError, sendError, userInputError } from './http.js';
import { orderWhatsAppEnabled, sendOrderConfirmation } from './orderNotifications.js';
import { getWhatsAppSenderStatus } from './whatsapp.js';

// Every route in this file is mounted behind requireAuth('admin') in server.js,
// so req.user is always the signed-in admin.
const router = express.Router();

const USER_FIELDS = ['name', 'phone', 'email', 'password', 'role', 'crop', 'acreage', 'village', 'district', 'state', 'department', 'status'];
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

function matchesSearch(user, search) {
    const needle = String(search).toLowerCase();
    return ['name', 'phone', 'email', 'crop', 'village', 'district', 'state'].some((key) =>
          String(user[key] || '').toLowerCase().includes(needle)
                                                                                     );
}

router.get('/users', async (req, res) => {
    try {
          const { role, sortBy, search } = req.query;
          let users = await db.getUsers();

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

router.post('/users', async (req, res) => {
    try {
          if (!req.body?.phone && !req.body?.email) {
                throw new HttpError(400, 'Please provide a mobile number or email address.');
          }
          const user = await db.createUser({ ...pickUserFields(req.body), createdBy: 'admin' });
          res.json({ success: true, user });
    } catch (err) {
          sendError(res, userInputError(err), 'Create user');
    }
});

router.put('/users/:id', async (req, res) => {
    try {
          const updates = pickUserFields(req.body);

          // Stop an admin locking themselves out of the admin panel.
          if (req.params.id === req.user.id && ((updates.role && updates.role !== 'admin') || (updates.status && updates.status !== 'active'))) {
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

router.delete('/users/:id', async (req, res) => {
    try {
          if (req.params.id === req.user.id) {
                throw new HttpError(400, 'You cannot delete your own account.');
          }
          const ok = await db.deleteUser(req.params.id);
          if (!ok) {
                return res.status(404).json({ success: false, message: 'User not found' });
          }
          res.json({ success: true });
    } catch (err) {
          sendError(res, err, 'Delete user');
    }
});

router.get('/profile-fields', async (req, res) => {
    try {
          const fields = await db.getProfileFields();
          res.json({ success: true, data: fields });
    } catch (err) {
          sendError(res, err, 'Profile fields');
    }
});

router.put('/profile-fields', async (req, res) => {
    try {
          const fields = await db.saveProfileFields(req.body.fields || req.body);
          res.json({ success: true, data: fields });
    } catch (err) {
          sendError(res, err, 'Save profile fields');
    }
});

// Sends, or sends again, the WhatsApp order confirmation to the customer.
router.post('/orders/:id/whatsapp', async (req, res) => {
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
router.get('/whatsapp/senders', async (req, res) => {
    try {
          res.json({ success: true, data: await getWhatsAppSenderStatus() });
    } catch (err) {
          sendError(res, err, 'WhatsApp sender status');
    }
});

// Live numbers for the admin dashboard cards.
router.get('/stats', async (req, res) => {
    try {
          const data = await db.getAdminStats();
          res.json({ success: true, data });
    } catch (err) {
          sendError(res, err, 'Admin stats');
    }
});

router.get('/wishlist-summary', async (req, res) => {
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
// ANALYTICS  GET /api/admin/analytics?from=ISO&to=ISO
// Returns live aggregated KPIs, trend, top products, and regional breakdown.
// ─────────────────────────────────────────────────────────────────────────────
router.get('/analytics', async (req, res) => {
    try {
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

        const allOrders = await db.getOrders();
        const orders = allOrders.filter(o => {
            const t = new Date(o.createdAt).getTime();
            return t >= fromMs && t < toMs;
        });
        const paid = orders.filter(o => o.paymentStatus === 'Paid');

        // ── KPI cards ──────────────────────────────────────────────────────
        const totalRevenue = Math.round(paid.reduce((s, o) => s + (Number(o.total) || 0), 0) * 100) / 100;
        const totalOrders  = orders.length;
        const paidOrders   = paid.length;

        // Unique customers
        const uniqueCustomers = new Set(
            orders.map(o => o.customerPhone || o.userId || o.customerName)
        ).size;

        // Cancelled / return proxy (Cancelled orders)
        const cancelled      = orders.filter(o => o.deliveryStatus === 'Cancelled' || o.status === 'Cancelled').length;
        const returnRate     = totalOrders > 0 ? ((cancelled / totalOrders) * 100).toFixed(1) : '0.0';

        // ── Revenue trend (grouped by day in the window) ─────────────────
        const dayBuckets = {};
        const dayCount = Math.max(1, Math.ceil((toMs - fromMs) / DAY_MS));
        for (let d = 0; d < dayCount; d++) {
            const dayStart = fromMs + d * DAY_MS;
            const dayEnd   = dayStart + DAY_MS;
            const dayLabel = new Date(dayStart + IST_OFFSET_MS).toISOString().slice(0, 10);
            const dayRevenue = paid
                .filter(o => { const t = new Date(o.createdAt).getTime(); return t >= dayStart && t < dayEnd; })
                .reduce((s, o) => s + (Number(o.total) || 0), 0);
            dayBuckets[dayLabel] = Math.round(dayRevenue * 100) / 100;
        }

        // ── Top products ───────────────────────────────────────────────────
        const productMap = {};
        for (const order of paid) {
            const items = Array.isArray(order.items) ? order.items : [];
            for (const item of items) {
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

        // ── Regional breakdown (by district field on order) ────────────────
        const regionMap = {};
        for (const order of paid) {
            const region = order.district || order.state || 'Unknown';
            if (!regionMap[region]) regionMap[region] = { orders: 0, revenue: 0 };
            regionMap[region].orders  += 1;
            regionMap[region].revenue += Number(order.total) || 0;
        }
        const regions = Object.entries(regionMap)
            .map(([region, v]) => ({ region, orders: v.orders, revenue: Math.round(v.revenue * 100) / 100 }))
            .sort((a, b) => b.revenue - a.revenue)
            .slice(0, 10);

        // Compute share %
        const maxOrd = regions[0]?.orders || 1;
        regions.forEach(r => { r.share = Math.round((r.orders / maxOrd) * 100); });

        // ── Delivery status mix ────────────────────────────────────────────
        const statusMap = {};
        for (const order of orders) {
            const s = order.deliveryStatus || order.status || 'Pending';
            statusMap[s] = (statusMap[s] || 0) + 1;
        }
        const deliveryMix = Object.entries(statusMap).map(([name, value]) => ({ name, value }));

        res.json({
            success: true,
            data: {
                kpi: { totalRevenue, totalOrders, paidOrders, uniqueCustomers, returnRate, cancelled },
                trend: dayBuckets,
                topProducts,
                regions,
                deliveryMix,
                // Full order list for "actual data" view (limited to 500 for perf)
                orders: orders.slice(0, 500).map(o => ({
                    id:             o.id,
                    date:           o.createdAt,
                    customer:       o.customerName || 'Guest',
                    phone:          o.customerPhone || '',
                    district:       o.district || '',
                    state:          o.state || '',
                    items:          Array.isArray(o.items) ? o.items.map(i => `${i.name||'?'} x${i.qty||1}`).join(', ') : '',
                    total:          Number(o.total) || 0,
                    paymentStatus:  o.paymentStatus || '',
                    deliveryStatus: o.deliveryStatus || o.status || '',
                })),
            },
        });
    } catch (err) {
        sendError(res, err, 'Analytics');
    }
});

export default router;

